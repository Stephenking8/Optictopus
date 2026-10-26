import { randomBytes } from "node:crypto";
import { chromium } from "playwright";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import assert from "node:assert/strict";
import { createApp } from "../server/src/app.js";
import { migrate } from "../server/scripts/migrate.js";
import { Admin } from "../server/src/models.js";
const browserPassword = randomBytes(24).toString("hex");
const mongo = await MongoMemoryServer.create({
  instance: { args: ["--nounixsocket"] },
});
await mongoose.connect(mongo.getUri());
await migrate();
await Admin.create({
  id: 99,
  username: "browser-test",
  password_hash: await bcrypt.hash(browserPassword, 4),
});
const app = createApp({
  mongoUrl: mongo.getUri(),
  secret: randomBytes(32).toString("hex"),
});
const server = app.listen(0);
await new Promise((r) => server.once("listening", r));
const base = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page
    .getByRole("heading", { name: "See beyond. Build beyond." })
    .waitFor();
  await page.locator(".project-card").first().waitFor();
  assert.equal(await page.locator("[data-mascot] canvas").count(), 1);
  const mascot = page.locator('[data-mascot] canvas');
  const box = await mascot.boundingBox();
  const initialDots = await mascot.screenshot();
  await page.mouse.move(box.x + box.width * .65, box.y + box.height * .4);
  await page.locator('[data-mascot]').click();
  assert.notDeepEqual(await mascot.screenshot(), initialDots, 'dots react to pointer and tap');
  assert.equal(await page.locator('[data-mascot]').getAttribute('data-expression'), 'happy');
  await page.locator('[data-mascot]').click();
  assert.equal(await page.locator('[data-mascot]').getAttribute('data-expression'), 'playful');
  await page.locator('[data-mascot]').click();
  await page.locator('[data-mascot]').click();
  assert.equal(await page.locator('[data-mascot]').getAttribute('data-expression'), 'angry');
  await page.waitForTimeout(3200);
  assert.equal(await page.locator('[data-mascot]').getAttribute('data-expression'), 'neutral');
  assert.equal(await page.locator('.mascot-hint').count(), 0);
  assert.equal(await page.locator('header .site-visits').count(), 1);
  assert.equal(await page.locator('.project-image .status-badge').count(), 0);
  assert.ok(await page.locator('.project-body .eyebrow + .status-badge').count() > 0);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  const stillDots = await mascot.screenshot();
  await page.waitForTimeout(100);
  assert.deepEqual(await mascot.screenshot(), stillDots, 'reduced motion stops animation');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  assert.match(await page.locator('.site-visits').innerText(), /91\s+site visits/);
  await page.getByRole("button", { name: "Decline", exact: true }).click();
  if (process.env.REVIEW_SCREENSHOTS)
    await page.screenshot({
      path: process.env.REVIEW_SCREENSHOTS + "/home-review.png",
      fullPage: true,
    });
  await page.getByLabel("Search projects").fill("nonexistent-project");
  await page.getByRole("heading", { name: "No projects found" }).waitFor();
  await page.getByLabel("Search projects").fill("");
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  await page
    .locator(".project-card")
    .first()
    .getByRole("link", { name: "View project" })
    .click();
  await page.locator(".detail-cover img").waitFor();
  await page.getByLabel("Toggle heart reaction").click();
  await page.getByText("Thanks for the love!").waitFor();
  await page.getByLabel("Rate 5 stars", { exact: true }).click();
  await page.getByText("Rating saved.").waitFor();
  await page.goto(base + "/admin/login");
  await page.getByLabel("Username", { exact: true }).fill("browser-test");
  await page
    .getByLabel("Password", { exact: true })
    .fill(browserPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page
    .getByRole("heading", { name: "Your portfolio, at a glance." })
    .waitFor();
  for (const [route, heading] of [
    ["projects", "Your projects."],
    ["categories", "Categories."],
    ["analytics", "Visitor insights."],
    ["engagement", "Likes & ratings."],
    ["settings", "Website settings."],
    ["security", "Account security."],
  ]) {
    await page.goto(base + "/admin/" + route);
    await page.getByRole("heading", { name: heading, exact: true }).waitFor();
    await page
      .getByText("Loading…", { exact: true })
      .waitFor({ state: "hidden" });
  }
  await page.goto(base + "/admin/settings");
  await page.getByLabel("Section gallery", {exact:true}).check();
  await page.getByLabel("Section testimonials", {exact:true}).check();
  await page.getByLabel("Add gallery image", {exact:true}).setInputFiles({name:"gallery.png",mimeType:"image/png",buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3foAAAAASUVORK5CYII=","base64")});
  await page.getByLabel("Caption",{exact:true}).fill("Gallery test image");
  await page.getByRole("button",{name:"Add testimonial",exact:true}).click();
  await page.getByLabel("Name",{exact:true}).fill("Browser test reviewer");
  await page.getByLabel("Role or company",{exact:true}).fill("Test only");
  await page.getByLabel("Testimonial",{exact:true}).fill("A review used only by automated tests.");
  await page.getByRole("button",{name:"Save website settings →",exact:true}).click();
  await page.getByText("Website settings saved.",{exact:true}).waitFor();
  await page.goto(base);
  await page.locator('#gallery').getByText("Gallery test image").waitFor();
  await page.locator('#testimonials').getByText("Browser test reviewer").waitFor();
  await page.goto(base + "/admin/settings");
  await page.getByLabel("Section gallery",{exact:true}).uncheck();
  await page.getByRole("button",{name:"Save website settings →",exact:true}).click();
  await page.getByText("Website settings saved.",{exact:true}).waitFor();
  await page.goto(base);
  await page.locator('#testimonials').waitFor();
  assert.equal(await page.locator('#gallery').count(),0);
  assert.equal(await page.locator('[data-mascot]').evaluate(el=>getComputedStyle(el).webkitTapHighlightColor),'rgba(0, 0, 0, 0)');
  await page.goto(base + "/admin/projects/new");
  await page
    .getByLabel("Title", { exact: true })
    .fill("Browser-created project");
  await page
    .getByLabel("Summary", { exact: true })
    .fill("Verified through React.");
  await page.getByRole("button", { name: "Save project" }).click();
  await page.getByRole("heading", { name: "Edit project." }).waitFor();
  await page
    .locator("label")
    .filter({ hasText: /^Publication/ })
    .locator("select")
    .selectOption("published");
  await page.getByRole("button", { name: "Save project" }).click();
  await page.getByText("Project saved.", { exact: true }).waitFor();
  await page.goto(base + "/admin/projects");
  await page
    .getByRole("link", { name: "Browser-created project", exact: true })
    .waitFor();
  await page.goto(base + "/admin/analytics");
  await page.getByRole("heading", { name: "Visitor insights." }).waitFor();
  await page
    .getByText("Loading…", { exact: true })
    .waitFor({ state: "hidden" });
  if (process.env.REVIEW_SCREENSHOTS)
    await page.screenshot({
      path: process.env.REVIEW_SCREENSHOTS + "/admin-review.png",
      fullPage: true,
    });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page
    .getByRole("heading", { name: "See beyond. Build beyond." })
    .waitFor();
  await page.getByLabel("Toggle navigation", { exact: true }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Projects", exact: true })
    .waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Mobile page overflows horizontally",
  );
  if (process.env.REVIEW_SCREENSHOTS)
    await page.screenshot({
      path: process.env.REVIEW_SCREENSHOTS + "/mobile-review.png",
      fullPage: true,
    });
  await page.goto(base + "/admin");
  await page
    .getByRole("heading", { name: "Your portfolio, at a glance." })
    .waitFor();
  await page.getByLabel("Toggle admin navigation").click();
  await page.getByRole("button", { name: "Log out" }).click();
  await page.getByRole("heading", { name: "Welcome back." }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Browser smoke passed: desktop/mobile, filters, theme, mascot, reactions, admin pages, React create/publish and logout.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
  await app.locals.sessionStore.close();
  await mongoose.disconnect();
  await mongo.stop();
}
