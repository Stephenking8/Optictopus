import { chromium } from "playwright";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import assert from "node:assert/strict";
import { createApp } from "../server/src/app.js";
import { migrate } from "../server/scripts/migrate.js";
import { Admin } from "../server/src/models.js";
const mongo = await MongoMemoryServer.create({
  instance: { args: ["--nounixsocket"] },
});
await mongoose.connect(mongo.getUri());
await migrate();
await Admin.create({
  id: 99,
  username: "browser-test",
  password_hash: await bcrypt.hash("Browser-Only-Password-2026", 4),
});
const app = createApp({
  mongoUrl: mongo.getUri(),
  secret: "browser-only-secret-with-more-than-32-characters",
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
  assert.equal(await page.locator("[data-mascot] svg").count(), 1);
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
    .fill("Browser-Only-Password-2026");
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
