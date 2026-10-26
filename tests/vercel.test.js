import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import bcrypt from "bcryptjs";
import { createApp } from "../server/src/app.js";
import { Admin, Media } from "../server/src/models.js";
test("serverless image upload persists in MongoDB across app recreation", async () => {
  const mongo = await MongoMemoryServer.create({
    instance: { args: ["--nounixsocket"] },
  });
  let first, second;
  try {
    await mongoose.connect(mongo.getUri());
    await Admin.create({
      id: 1,
      username: "test",
      password_hash: await bcrypt.hash("Test-Only-Password-2026", 4),
    });
    const options = {
      mongoUrl: mongo.getUri(),
      secret: "test-only-session-secret-longer-than-32-chars",
      mongoUploads: true,
    };
    first = createApp(options);
    const agent = request.agent(first);
    let csrf = (await agent.get("/api/session")).body.csrf;
    const login = await agent
      .post("/api/login")
      .set("X-CSRF-Token", csrf)
      .send({ username: "test", password: "Test-Only-Password-2026" });
    assert.equal(login.status, 200);
    csrf = login.body.csrf;
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA5sAAAAASUVORK5CYII=",
      "base64",
    );
    const upload = await agent
      .post("/api/admin/upload")
      .set("X-CSRF-Token", csrf)
      .attach("image", png, {
        filename: "pixel.png",
        contentType: "image/png",
      });
    assert.equal(upload.status, 200);
    assert.equal(await Media.countDocuments(), 1);
    second = createApp(options);
    const get = await request(second).get("/" + upload.body.path);
    assert.equal(get.status, 200);
    assert.match(get.headers["content-type"], /image\/png/);
    assert.deepEqual(get.body, png);
    const tooLarge = await agent
      .post("/api/admin/upload")
      .set("X-CSRF-Token", csrf)
      .attach("image", Buffer.alloc(3 * 1024 * 1024 + 1), {
        filename: "large.png",
        contentType: "image/png",
      });
    assert.equal(tooLarge.status, 422);
  } finally {
    await first?.locals.sessionStore.close();
    await second?.locals.sessionStore.close();
    await mongoose.disconnect();
    await mongo.stop();
  }
});
