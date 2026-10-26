import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import bcrypt from "bcryptjs";
import { createApp } from "../server/src/app.js";
import { migrate } from "../server/scripts/migrate.js";
import * as M from "../server/src/models.js";
let mongo, app, guest, admin, csrf, adminCsrf;
const password = "Integration-Test-Password-2026";
before(async () => {
  mongo = await MongoMemoryServer.create({
    instance: { args: ["--nounixsocket"] },
  });
  await mongoose.connect(mongo.getUri());
  await migrate();
  app = createApp({
    mongoUrl: mongo.getUri(),
    secret: "integration-only-secret-with-more-than-32-characters",
  });
  guest = request.agent(app);
  admin = request.agent(app);
  csrf = (await guest.get("/api/session")).body.csrf;
  await M.Admin.create({
    id: 99,
    username: "testadmin",
    password_hash: await bcrypt.hash(password, 4),
    created_at: new Date(),
  });
  adminCsrf = (await admin.get("/api/session")).body.csrf;
  const login = await admin
    .post("/api/login")
    .set("X-CSRF-Token", adminCsrf)
    .send({ username: "testadmin", password });
  assert.equal(login.status, 200);
  adminCsrf = login.body.csrf;
});
after(async () => {
  await app?.locals.sessionStore.close();
  await mongoose.disconnect();
  await mongo?.stop();
});
const post = (client, url, body, token = csrf) =>
  client
    .post("/api" + url)
    .set("X-CSRF-Token", token)
    .send(body);
test("SQL import is complete and rerunnable without duplicates", async () => {
  const report = await migrate();
  assert.equal(report.projects, 7);
  assert.equal(await M.Project.countDocuments(), 7);
  assert.equal(await M.Image.countDocuments(), 9);
  assert.equal(await M.Visit.countDocuments(), 91);
  assert.equal(await M.Like.countDocuments(), 8);
  assert.equal(await M.Rating.countDocuments(), 9);
  assert.equal(await M.Social.countDocuments(), 6);
  assert.equal(await M.LegacyLimit.countDocuments(), 24);
  const original = await M.Admin.findOne({ id: 1 });
  assert.match(original.password_hash, /^\$2y\$/);
  assert.ok((await M.Project.findOne()).created_at instanceof Date);
});
test("public data excludes draft/trash and private account data", async () => {
  const r = await guest.get("/api/projects");
  assert.equal(r.status, 200);
  assert.ok(r.body.length);
  assert.ok(
    r.body.every(
      (p) => p.publication === "published" && !p.is_hidden && !p.deleted_at,
    ),
  );
  assert.ok(!JSON.stringify(r.body).includes("password_hash"));
  const p = r.body[0],
    detail = await guest.get("/api/projects/" + p.slug);
  assert.equal(detail.status, 200);
  assert.ok(Array.isArray(detail.body.images));
  assert.equal((await guest.get("/api/admin/projects")).status, 401);
});
test("CSRF required and admin auth rejects wrong passwords", async () => {
  assert.equal(
    (await guest.post("/api/login").send({ username: "testadmin", password }))
      .status,
    403,
  );
  assert.equal(
    (await post(guest, "/login", { username: "testadmin", password: "wrong" }))
      .status,
    401,
  );
});
test("likes are idempotent and ratings validate/update instead of duplicating", async () => {
  const p = (await guest.get("/api/projects")).body[0],
    base = await M.Like.countDocuments({ project_id: p.id });
  for (let n = 0; n < 2; n++)
    assert.equal(
      (
        await post(guest, `/projects/${p.id}/reaction`, {
          action: "like",
          liked: true,
        })
      ).status,
      200,
    );
  assert.equal(await M.Like.countDocuments({ project_id: p.id }), base + 1);
  assert.equal(
    (
      await post(guest, `/projects/${p.id}/reaction`, {
        action: "rate",
        stars: 6,
      })
    ).status,
    422,
  );
  const votes = await M.Rating.countDocuments({ project_id: p.id });
  for (const stars of [2, 5])
    assert.equal(
      (
        await post(guest, `/projects/${p.id}/reaction`, {
          action: "rate",
          stars,
        })
      ).status,
      200,
    );
  assert.equal(await M.Rating.countDocuments({ project_id: p.id }), votes + 1);
  await post(guest, `/projects/${p.id}/reaction`, {
    action: "like",
    liked: false,
  });
  assert.equal(await M.Like.countDocuments({ project_id: p.id }), base);
});
test("project CRUD, preview, hidden guards, restore and visibility masking", async () => {
  const body = {
    title: "Test MERN project",
    slug: "test-mern",
    summary: "Test summary",
    development_status: "completed",
    publication: "draft",
    is_hidden: 0,
    is_featured: 0,
    sort_order: 0,
    category_id: 1,
  };
  const created = await post(admin, "/admin/projects", body, adminCsrf);
  assert.equal(created.status, 201);
  const id = created.body.id;
  assert.ok(id > 7);
  assert.equal((await guest.get("/api/projects/test-mern")).status, 404);
  assert.equal((await admin.get("/api/admin/projects/" + id)).status, 200);
  let r = await admin
    .put("/api/admin/projects/" + id)
    .set("X-CSRF-Token", adminCsrf)
    .send({
      ...body,
      publication: "published",
      show_likes: 0,
      show_rating: 0,
      show_rating_count: 0,
      show_views: 0,
    });
  assert.equal(r.status, 200);
  r = await guest.get("/api/projects/test-mern");
  assert.equal(r.status, 200);
  assert.equal(r.body.likes_count, null);
  assert.equal(r.body.average_rating, null);
  for (const action of ["hide", "show", "delete", "restore"]) {
    assert.equal(
      (
        await admin
          .patch("/api/admin/projects/" + id + "/state")
          .set("X-CSRF-Token", adminCsrf)
          .send({ action })
      ).status,
      200,
    );
    assert.equal(
      (await guest.get("/api/projects/test-mern")).status,
      ["hide", "delete"].includes(action) ? 404 : 200,
    );
  }
  assert.equal(
    (
      await admin
        .put("/api/admin/projects/" + id)
        .set("X-CSRF-Token", adminCsrf)
        .send({ ...body, live_url: "javascript:alert(1)" })
    ).status,
    422,
  );
});
test("upload validates file bytes; gallery and category CRUD work", async () => {
  let r = await admin
    .post("/api/admin/upload")
    .set("X-CSRF-Token", adminCsrf)
    .attach("image", Buffer.from("<?php echo 1;"), {
      filename: "bad.png",
      contentType: "image/png",
    });
  assert.equal(r.status, 422);
  r = await admin
    .post("/api/admin/upload")
    .set("X-CSRF-Token", adminCsrf)
    .attach(
      "image",
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA5sAAAAASUVORK5CYII=",
        "base64",
      ),
      { filename: "pixel.png", contentType: "image/png" },
    );
  assert.equal(r.status, 200);
  assert.match(r.body.path, /^uploads\/projects\//);
  const img = await post(
    admin,
    "/admin/projects/4/images",
    { image_path: r.body.path, caption: "Test" },
    adminCsrf,
  );
  assert.equal(img.status, 201);
  assert.equal(
    (
      await admin
        .delete("/api/admin/images/" + img.body.id)
        .set("X-CSRF-Token", adminCsrf)
    ).status,
    200,
  );
  r = await post(
    admin,
    "/admin/categories",
    { name: "MERN category" },
    adminCsrf,
  );
  assert.equal(r.status, 201);
  assert.equal(
    (
      await admin
        .delete("/api/admin/categories/" + r.body.id)
        .set("X-CSRF-Token", adminCsrf)
    ).status,
    200,
  );
});
test("analytics require consent; deduplication and CSV filters work", async () => {
  assert.equal((await post(guest, "/track", { page: "home" })).status, 403);
  await post(guest, "/consent", { consent: "granted" });
  const count = await M.Visit.countDocuments();
  for (let n = 0; n < 2; n++) {
    const r = await post(guest, "/track", { page: "home" }).set(
      "User-Agent",
      "Mozilla/5.0 Chrome/131.0 Windows",
    );
    assert.equal(r.status, 200);
  }
  assert.equal(await M.Visit.countDocuments(), count + 1);
  const report = await admin.get("/api/admin/analytics?device=Desktop");
  assert.equal(report.status, 200);
  assert.ok(report.body.visits.every((v) => v.device_type === "Desktop"));
  const csv = await admin.get(
    "/api/admin/analytics?download=csv&device=Desktop",
  );
  assert.equal(csv.status, 200);
  assert.match(csv.headers["content-type"], /text\/csv/);
  assert.match(csv.text, /Date \(UTC\)/);
  await post(guest, "/consent", { consent: "denied" });
  assert.equal((await post(guest, "/track", { page: "home" })).status, 403);
});
test("settings persist and reject unsafe asset paths", async () => {
  assert.equal(
    (
      await admin
        .put("/api/admin/settings")
        .set("X-CSRF-Token", adminCsrf)
        .send({ settings: { logo_image: "../../private" } })
    ).status,
    422,
  );
  assert.equal(
    (
      await admin
        .put("/api/admin/settings")
        .set("X-CSRF-Token", adminCsrf)
        .send({ settings: { hero_title: "Test headline" }, socials: [] })
    ).status,
    200,
  );
  assert.equal(
    (await guest.get("/api/site")).body.settings.hero_title,
    "Test headline",
  );
});
test("password update works and logout invalidates current session", async () => {
  let r = await admin
    .put("/api/admin/password")
    .set("X-CSRF-Token", adminCsrf)
    .send({
      current: password,
      password: "Another-Strong-Password-2026",
      repeat: "Another-Strong-Password-2026",
    });
  assert.equal(r.status, 200);
  assert.equal((await admin.get("/api/admin/projects")).status, 200);
  await post(admin, "/logout", {}, adminCsrf);
  assert.equal((await admin.get("/api/admin/projects")).status, 401);
});
