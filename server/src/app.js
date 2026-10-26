import express from "express";
import helmet from "helmet";
import session from "express-session";
import MongoStore from "connect-mongo";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import * as M from "./models.js";
const root = process.env.VERCEL
  ? process.cwd()
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fail = (status, message) => Object.assign(new Error(message), { status });
const safeLink = (v) => !v || /^https?:\/\//i.test(v);
const asset = (v) =>
  !v || /^(assets\/img\/|uploads\/projects\/)[a-zA-Z0-9_.-]+$/.test(v);
const clean = (p) => {
  const { _id, password_hash, session_version, ...rest } = p;
  return rest;
};
const number = (v) => {
  if (!/^\d+$/.test(String(v))) throw fail(400, "Invalid ID.");
  return Number(v);
};
export function createApp({
  mongoUrl,
  secret,
  store,
  production = false,
  mongoUploads = process.env.UPLOAD_STORAGE === "mongodb" ||
    process.env.VERCEL === "1",
} = {}) {
  if (!secret || secret.length < 32)
    throw Error("SESSION_SECRET must contain at least 32 characters.");
  const app = express();
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          upgradeInsecureRequests: production ? [] : null,
        },
      },
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  const sessionStore =
    store ||
    MongoStore.create({ mongoUrl, mongoOptions: {maxPoolSize: 5}, collectionName: "sessions", ttl: 1800 });
  app.locals.sessionStore = sessionStore;
  app.use(
    session({
      name: "optictopus.sid",
      secret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      store: sessionStore,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: production,
        maxAge: 1800000,
      },
    }),
  );
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 250,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
      (!req.session.csrf || req.get("X-CSRF-Token") !== req.session.csrf)
    )
      return next(fail(403, "Session expired. Refresh the page and retry."));
    next();
  });
  const admin = async (req, res, next) => {
    const a =
      req.session.adminId &&
      (await M.Admin.findOne({ id: req.session.adminId }));
    if (!a || a.session_version !== req.session.version)
      throw fail(401, "Please sign in.");
    req.admin = a;
    next();
  };
  function visitor(req, res) {
    const cookies = Object.fromEntries(
      (req.headers.cookie || "").split(";").map((x) => x.trim().split("=")),
    );
    let token = cookies.optictopus_visitor;
    const valid =
      token &&
      /^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(token) &&
      token.split(".")[1] ===
        crypto
          .createHmac("sha256", secret)
          .update(token.split(".")[0])
          .digest("hex");
    if (!valid) {
      const raw = crypto.randomBytes(32).toString("hex");
      token =
        raw +
        "." +
        crypto.createHmac("sha256", secret).update(raw).digest("hex");
      res.cookie("optictopus_visitor", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: production,
        maxAge: 31536000000,
      });
    }
    return crypto
      .createHash("sha256")
      .update(token.split(".")[0])
      .digest("hex");
  }
  async function decorate(p, s, hash, privateView = false) {
    const [likes, ratings, views, liked, mine, category] = await Promise.all([
      M.Like.countDocuments({ project_id: p.id }),
      M.Rating.find({ project_id: p.id }).lean(),
      M.View.countDocuments({ project_id: p.id }),
      M.Like.exists({ project_id: p.id, visitor_hash: hash }),
      M.Rating.findOne({ project_id: p.id, visitor_hash: hash }).lean(),
      M.Category.findOne({ id: p.category_id }).lean(),
    ]);
    const flags = Object.fromEntries(
      M.overrides.map((k) => [
        k,
        M.flag(
          p,
          s,
          k,
          k === "allow_likes"
            ? "enable_likes"
            : k === "allow_ratings"
              ? "enable_ratings"
              : k,
        ),
      ]),
    );
    return {
      ...clean(p),
      category_name: category?.name || "Uncategorized",
      flags,
      liked: !!liked,
      rating: mine?.stars || 0,
      likes_count: privateView || flags.show_likes ? likes : null,
      ratings_count:
        privateView || flags.show_rating_count ? ratings.length : null,
      average_rating:
        privateView || flags.show_rating
          ? ratings.reduce((a, r) => a + r.stars, 0) / (ratings.length || 1)
          : null,
      views_count: privateView || flags.show_views ? views : null,
    };
  }
  app.get("/api/session", (req, res) => {
    req.session.csrf ||= crypto.randomBytes(32).toString("hex");
    res.json({
      csrf: req.session.csrf,
      authenticated: !!req.session.adminId,
      username: req.session.username,
    });
  });
  const authLimit = rateLimit({
    windowMs: 900000,
    limit: 15,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });
  app.post("/api/login", authLimit, async (req, res) => {
    const { username, password } = req.body;
    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      password.length > 200
    )
      throw fail(400, "Enter username and password.");
    const a = await M.Admin.findOne({ username });
    if (
      !a ||
      !(await bcrypt.compare(
        password,
        a.password_hash.replace(/^\$2y\$/, "$2b$"),
      ))
    )
      throw fail(401, "Incorrect username or password.");
    await new Promise((ok, no) =>
      req.session.regenerate((e) => (e ? no(e) : ok())),
    );
    req.session.adminId = a.id;
    req.session.username = a.username;
    req.session.version = a.session_version;
    req.session.csrf = crypto.randomBytes(32).toString("hex");
    a.last_login_at = new Date();
    await a.save();
    res.json({ csrf: req.session.csrf, username: a.username });
  });
  app.post("/api/logout", (req, res, next) =>
    req.session.destroy((e) => {
      if (e) return next(e);
      res.clearCookie("optictopus.sid");
      res.json({ ok: true });
    }),
  );
  app.get("/api/site", async (req, res) =>
    res.json({
      settings: await M.settings(),
      visits: await M.Visit.countDocuments(),
      socials: (await M.Social.find().lean()).map(clean),
      categories: (
        await M.Category.find().sort({ sort_order: 1, name: 1 }).lean()
      ).map(clean),
    }),
  );
  app.get("/api/projects", async (req, res) => {
    const s = await M.settings(),
      h = visitor(req, res);
    const p = await M.Project.find(M.publicFilter)
      .sort({ is_featured: -1, sort_order: 1, published_at: -1 })
      .lean();
    res.json(await Promise.all(p.map((x) => decorate(x, s, h))));
  });
  app.get("/api/projects/:slug", async (req, res) => {
    const p = await M.Project.findOne({
      ...M.publicFilter,
      slug: req.params.slug,
    }).lean();
    if (!p) throw fail(404, "Project not found.");
    res.json({
      ...(await decorate(p, await M.settings(), visitor(req, res))),
      images: (
        await M.Image.find({ project_id: p.id })
          .sort({ sort_order: 1, id: 1 })
          .lean()
      ).map(clean),
    });
  });
  app.post(
    "/api/projects/:id/reaction",
    rateLimit({ windowMs: 60000, limit: 35 }),
    async (req, res) => {
      const id = number(req.params.id),
        p = await M.Project.findOne({ ...M.publicFilter, id }).lean();
      if (!p) throw fail(404, "Project not found.");
      const s = await M.settings(),
        hash = visitor(req, res),
        filter = { project_id: id, visitor_hash: hash };
      if (req.body.action === "like") {
        if (!M.flag(p, s, "allow_likes", "enable_likes"))
          throw fail(403, "Likes are disabled.");
        if (typeof req.body.liked !== "boolean")
          throw fail(422, "Choose a like state.");
        if (req.body.liked)
          await M.Like.updateOne(
            filter,
            {
              $setOnInsert: {
                ...filter,
                id: await M.nextId("project_likes"),
                created_at: new Date(),
              },
            },
            { upsert: true },
          );
        else await M.Like.deleteOne(filter);
      } else if (req.body.action === "rate") {
        if (!M.flag(p, s, "allow_ratings", "enable_ratings"))
          throw fail(403, "Ratings are disabled.");
        const stars = req.body.stars;
        if (!Number.isInteger(stars) || stars < 1 || stars > 5)
          throw fail(422, "Choose 1 to 5 stars.");
        await M.Rating.updateOne(
          filter,
          {
            $set: { stars, updated_at: new Date() },
            $setOnInsert: {
              ...filter,
              id: await M.nextId("project_ratings"),
              created_at: new Date(),
            },
          },
          { upsert: true },
        );
      } else throw fail(400, "Unknown reaction.");
      res.json(await decorate(p, s, hash));
    },
  );
  app.post("/api/consent", (req, res) => {
    if (!["granted", "denied"].includes(req.body.consent))
      throw fail(400, "Invalid consent.");
    req.session.consent = req.body.consent;
    res.json({ ok: true });
  });
  app.post(
    "/api/track",
    rateLimit({ windowMs: 60000, limit: 30 }),
    async (req, res) => {
      const s = await M.settings();
      if (s.analytics_enabled !== "1" || req.session.consent !== "granted")
        throw fail(403, "Analytics need consent.");
      const ua = (req.get("user-agent") || "").slice(0, 500);
      if (!ua || /bot|crawler|spider|headless|lighthouse|preview/i.test(ua))
        return res.status(202).json({ ok: true, excluded: true });
      const page = req.body.page;
      if (!["home", "project"].includes(page)) throw fail(400, "Invalid page.");
      const id = page === "project" ? number(req.body.project_id) : null;
      if (id && !(await M.Project.exists({ ...M.publicFilter, id })))
        throw fail(404, "Project not found.");
      const hash = visitor(req, res),
        now = new Date();
      await M.Visitor.updateOne(
        { visitor_hash: hash },
        {
          $set: { last_seen: now },
          $setOnInsert: { first_seen: now, consented_at: now },
        },
        { upsert: true },
      );
      const filter = { visitor_hash: hash, page_type: page, project_id: id };
      if (
        !(await M.Visit.exists({
          ...filter,
          visited_at: { $gt: new Date(Date.now() - 30000) },
        }))
      ) {
        const device_type = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua)
          ? "Tablet"
          : /Mobile|iPhone|Android/i.test(ua)
            ? "Mobile"
            : "Desktop";
        const device_model =
          ua.match(/\b(SM-[A-Z0-9]+|Pixel [\w ]{1,12})/i)?.[1] ||
          "Unknown Device";
        const device_brand = /SM-/.test(device_model)
          ? "Samsung"
          : /Pixel/.test(device_model)
            ? "Google"
            : /iPhone|iPad/.test(ua)
              ? "Apple"
              : "Unknown";
        const os_name =
          [
            ["Windows", "Windows"],
            ["iPhone|iPad", "iOS / iPadOS"],
            ["Android", "Android"],
            ["Mac", "macOS"],
            ["Linux", "Linux"],
          ].find(([p]) => new RegExp(p, "i").test(ua))?.[1] || "Unknown";
        const browser_name =
          [
            ["Edg/", "Edge"],
            ["OPR/", "Opera"],
            ["Firefox/", "Firefox"],
            ["Chrome/", "Chrome"],
            ["Safari/", "Safari"],
          ].find(([p]) => new RegExp(p).test(ua))?.[1] || "Unknown";
        const country =
          process.env.TRUST_CLOUDFLARE === "1" &&
          /^[A-Z]{2}$/.test(req.get("cf-ipcountry") || "")
            ? req.get("cf-ipcountry")
            : "Unknown";
        await M.Visit.create({
          ...filter,
          id: await M.nextId("website_visits"),
          device_type,
          device_model,
          device_brand,
          os_name,
          browser_name,
          country,
          region: "Unknown",
          city: "Unknown",
          visited_at: now,
        });
      }
      if (
        id &&
        !(await M.View.exists({
          project_id: id,
          visitor_hash: hash,
          viewed_at: { $gt: new Date(Date.now() - 1800000) },
        }))
      )
        await M.View.create({
          id: await M.nextId("project_views"),
          project_id: id,
          visitor_hash: hash,
          viewed_at: now,
        });
      const cutoff = new Date(
        Date.now() -
          Math.max(7, Math.min(730, Number(s.retention_days) || 365)) *
            86400000,
      );
      await Promise.all([
        M.Visit.deleteMany({ visited_at: { $lt: cutoff } }),
        M.View.deleteMany({ viewed_at: { $lt: cutoff } }),
        M.Visitor.deleteMany({ last_seen: { $lt: cutoff } }),
      ]);
      res.json({ ok: true });
    },
  );
  app.use("/api/admin", admin);
  app.get("/api/admin/projects", async (req, res) => {
    const s = await M.settings();
    res.json(
      await Promise.all(
        (await M.Project.find().sort({ sort_order: 1, id: -1 }).lean()).map(
          (p) => decorate(p, s, "", true),
        ),
      ),
    );
  });
  app.get("/api/admin/projects/:id", async (req, res) => {
    const p = await M.Project.findOne({ id: number(req.params.id) }).lean();
    if (!p) throw fail(404, "Project not found.");
    res.json({
      ...(await decorate(p, await M.settings(), "", true)),
      images: (
        await M.Image.find({ project_id: p.id })
          .sort({ sort_order: 1, id: 1 })
          .lean()
      ).map(clean),
    });
  });
  async function projectInput(body) {
    const fields = [
      "category_id",
      "title",
      "slug",
      "summary",
      "description",
      "technologies",
      "features",
      "live_url",
      "github_url",
      "cover_image",
      "development_status",
      "publication",
      "is_hidden",
      "is_featured",
      "sort_order",
      ...M.overrides,
    ];
    const d = Object.fromEntries(
      fields.filter((k) => Object.hasOwn(body, k)).map((k) => [k, body[k]]),
    );
    for (const k of [
      "title",
      "slug",
      "summary",
      "description",
      "technologies",
      "features",
      "live_url",
      "github_url",
      "cover_image",
      "development_status",
      "publication",
    ])
      if (d[k] != null && typeof d[k] !== "string")
        throw fail(422, `${k} must be text.`);
    if (!d.title?.trim()) throw fail(422, "Title is required.");
    d.title = d.title.trim();
    d.slug = (d.slug || d.title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!d.slug) throw fail(422, "Enter a valid slug.");
    if (!safeLink(d.live_url) || !safeLink(d.github_url))
      throw fail(422, "Links must start with http:// or https://.");
    if (!asset(d.cover_image))
      throw fail(422, "Select an uploaded cover image.");
    d.category_id = d.category_id ? number(d.category_id) : null;
    if (d.category_id && !(await M.Category.exists({ id: d.category_id })))
      throw fail(422, "Category not found.");
    for (const k of ["is_hidden", "is_featured"])
      if (![0, 1].includes(d[k])) throw fail(422, `${k} must be 0 or 1.`);
    for (const k of M.overrides)
      if (d[k] != null && ![0, 1].includes(d[k]))
        throw fail(422, `Invalid ${k}.`);
    if (!Number.isInteger(d.sort_order))
      throw fail(422, "Order must be an integer.");
    return d;
  }
  app.post("/api/admin/projects", async (req, res) => {
    const d = await projectInput(req.body);
    const p = await M.Project.create({
      ...d,
      id: await M.nextId("projects"),
      created_at: new Date(),
      updated_at: new Date(),
      published_at: d.publication === "published" ? new Date() : null,
    });
    res.status(201).json(clean(p.toObject()));
  });
  app.put("/api/admin/projects/:id", async (req, res) => {
    const p = await M.Project.findOne({ id: number(req.params.id) });
    if (!p) throw fail(404, "Project not found.");
    Object.assign(p, await projectInput(req.body), { updated_at: new Date() });
    if (p.publication === "published" && !p.published_at)
      p.published_at = new Date();
    await p.save();
    res.json(clean(p.toObject()));
  });
  app.patch("/api/admin/projects/:id/state", async (req, res) => {
    const p = await M.Project.findOne({ id: number(req.params.id) });
    if (!p) throw fail(404, "Project not found.");
    switch (req.body.action) {
      case "hide":
        p.is_hidden = 1;
        break;
      case "show":
        p.is_hidden = 0;
        break;
      case "publish":
        p.publication = p.publication === "published" ? "draft" : "published";
        if (p.publication === "published" && !p.published_at)
          p.published_at = new Date();
        break;
      case "up":
      case "down": {
        const ordered = await M.Project.find({ deleted_at: null }).sort({
          sort_order: 1,
          id: -1,
        });
        const i = ordered.findIndex((x) => x.id === p.id),
          j = req.body.action === "up" ? i - 1 : i + 1;
        if (j >= 0 && j < ordered.length) {
          [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
          await M.Project.bulkWrite(
            ordered.map((x, index) => ({
              updateOne: {
                filter: { id: x.id },
                update: { $set: { sort_order: index } },
              },
            })),
          );
          p.sort_order = j;
        }
        break;
      }
      case "delete":
        p.deleted_at = new Date();
        break;
      case "restore":
        p.deleted_at = null;
        break;
      default:
        throw fail(400, "Unknown action.");
    }
    await p.save();
    res.json({ ok: true });
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: (mongoUploads ? 3 : 8) * 1024 * 1024, files: 1 },
  });
  app.post("/api/admin/upload", upload.single("image"), async (req, res) => {
    if (!req.file) throw fail(422, "Choose an image.");
    const type = await fileTypeFromBuffer(req.file.buffer);
    if (!type || !["image/jpeg", "image/png", "image/webp"].includes(type.mime))
      throw fail(422, "Only JPEG, PNG and WebP images are accepted.");
    const name = crypto.randomUUID() + "." + type.ext;
    if (mongoUploads) {
      await M.Media.create({
        path: "uploads/projects/" + name,
        contentType: type.mime,
        bytes: req.file.buffer,
        created_at: new Date(),
      });
    } else {
      await mkdir(path.join(root, "server/uploads/projects"), {
        recursive: true,
      });
      await writeFile(
        path.join(root, "server/uploads/projects", name),
        req.file.buffer,
      );
    }
    res.json({ path: "uploads/projects/" + name });
  });
  app.post("/api/admin/projects/:id/images", async (req, res) => {
    const id = number(req.params.id);
    if (!(await M.Project.exists({ id })))
      throw fail(404, "Project not found.");
    if (
      typeof req.body.image_path !== "string" ||
      !req.body.image_path ||
      !asset(req.body.image_path)
    )
      throw fail(422, "Invalid image path.");
    const row = await M.Image.create({
      id: await M.nextId("project_images"),
      project_id: id,
      image_path: req.body.image_path,
      caption: String(req.body.caption || "").slice(0, 255),
      sort_order: Number(req.body.sort_order) || 0,
    });
    res.status(201).json(clean(row.toObject()));
  });
  app.put("/api/admin/images/:id", async (req, res) => {
    await M.Image.updateOne(
      { id: number(req.params.id) },
      {
        $set: {
          caption: String(req.body.caption || "").slice(0, 255),
          sort_order: Number(req.body.sort_order) || 0,
        },
      },
    );
    res.json({ ok: true });
  });
  app.delete("/api/admin/images/:id", async (req, res) => {
    await M.Image.deleteOne({ id: number(req.params.id) });
    res.json({ ok: true });
  });
  app.post("/api/admin/categories", async (req, res) => {
    const name = String(req.body.name || "")
      .trim()
      .slice(0, 100);
    if (!name) throw fail(422, "Category name required.");
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const row = await M.Category.create({
      id: await M.nextId("categories"),
      name,
      slug,
      sort_order: Number(req.body.sort_order) || 0,
    });
    res.status(201).json(clean(row.toObject()));
  });
  app.put("/api/admin/categories/:id", async (req, res) => {
    const name = String(req.body.name || "")
      .trim()
      .slice(0, 100);
    if (!name) throw fail(422, "Name required.");
    await M.Category.updateOne(
      { id: number(req.params.id) },
      {
        $set: {
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          sort_order: Number(req.body.sort_order) || 0,
        },
      },
    );
    res.json({ ok: true });
  });
  app.delete("/api/admin/categories/:id", async (req, res) => {
    const id = number(req.params.id);
    await M.Project.updateMany(
      { category_id: id },
      { $set: { category_id: null } },
    );
    await M.Category.deleteOne({ id });
    res.json({ ok: true });
  });
  app.put("/api/admin/settings", async (req, res) => {
    const current = await M.settings(),
      d = req.body.settings;
    if (!d || typeof d !== "object" || Array.isArray(d))
      throw fail(422, "Invalid settings.");
    const rows = Object.entries(d).filter(([k]) => Object.hasOwn(current, k));
    for (const [k, v] of rows) {
      if (typeof v !== "string" || v.length > 20000)
        throw fail(422, "Invalid setting value.");
      if (["section_gallery", "section_testimonials"].includes(k) && !["0", "1"].includes(v))
        throw fail(422, "Invalid section visibility.");
      if (["gallery_items", "testimonial_items"].includes(k)) {
        let items;
        try { items = JSON.parse(v); } catch { throw fail(422, "Invalid section content."); }
        if (!Array.isArray(items) || items.length > 30) throw fail(422, "Use up to 30 items per section.");
        for (const item of items) {
          if (!item || typeof item !== "object" || Array.isArray(item)) throw fail(422, "Invalid section item.");
          const fields = k === "gallery_items" ? ["image", "caption"] : ["name", "role", "quote"];
          if (Object.keys(item).some(key => !fields.includes(key)) || fields.some(key => typeof item[key] !== "string" || item[key].length > (key === "quote" ? 1500 : 500)))
            throw fail(422, "Invalid section fields.");
          if (k === "gallery_items" && (!item.image || !asset(item.image))) throw fail(422, "Upload a valid gallery image.");
          if (k === "testimonial_items" && (!item.name.trim() || !item.quote.trim())) throw fail(422, "Testimonials need a name and quote.");
        }
      }
      if (k.endsWith("_image") && !asset(v))
        throw fail(422, "Invalid image path.");
      if (k === "accent_color" && !/^#[a-f0-9]{6}$/i.test(v))
        throw fail(422, "Invalid accent color.");
      if (k === "site_name" && (!v.trim() || v.length > 120))
        throw fail(422, "Website name is required (up to 120 characters).");
      if (k === "contact_email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
        throw fail(422, "Invalid email.");
      if (k === "retention_days" && (!/^\d+$/.test(v) || +v < 7 || +v > 730))
        throw fail(422, "Retention must be 7–730 days.");
    }
    const socials = Array.isArray(req.body.socials) ? req.body.socials : [];
    for (const x of socials) {
      if (
        ![
          "facebook",
          "instagram",
          "telegram",
          "gmail",
          "whatsapp",
          "tiktok",
        ].includes(x.platform) ||
        typeof x.link !== "string" ||
        x.link.length > 500
      )
        throw fail(422, "Invalid social link.");
      if (
        x.link &&
        (x.platform === "gmail"
          ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.link)
          : !safeLink(x.link))
      )
        throw fail(
          422,
          "Use an email for Gmail and HTTP(S) URLs for other profiles.",
        );
    }
    for (const [key, value] of rows)
      await M.Setting.updateOne({ key }, { $set: { value } }, { upsert: true });
    for (const x of socials)
      await M.Social.updateOne(
        { platform: x.platform },
        { $set: { link: x.link, enabled: x.enabled ? 1 : 0 } },
        { upsert: true },
      );
    res.json({ ok: true });
  });
  app.put("/api/admin/password", async (req, res) => {
    const { current, password, repeat } = req.body;
    if (
      typeof current !== "string" ||
      typeof password !== "string" ||
      password.length < 12 ||
      Buffer.byteLength(password) > 72 ||
      password !== repeat ||
      password === current
    )
      throw fail(
        422,
        "Use a different password of 12–72 bytes and matching confirmation.",
      );
    if (
      !(await bcrypt.compare(
        current,
        req.admin.password_hash.replace(/^\$2y\$/, "$2b$"),
      ))
    )
      throw fail(422, "Current password is incorrect.");
    req.admin.password_hash = await bcrypt.hash(password, 12);
    req.admin.session_version += 1;
    await req.admin.save();
    req.session.version = req.admin.session_version;
    res.json({ ok: true });
  });
  app.get("/api/admin/engagement", async (req, res) => {
    const projects = await M.Project.find().lean();
    const titles = Object.fromEntries(projects.map((p) => [p.id, p.title]));
    const likes = await M.Like.find()
        .sort({ created_at: -1 })
        .limit(200)
        .lean(),
      ratings = await M.Rating.find()
        .sort({ updated_at: -1 })
        .limit(200)
        .lean();
    const format = (x) => ({
      ...clean(x),
      visitor_hash: x.visitor_hash.slice(0, 12),
      title: titles[x.project_id] || "Deleted project",
    });
    res.json({
      likes: likes.map(format),
      ratings: ratings.map(format),
      distribution: await M.Rating.aggregate([
        { $group: { _id: "$stars", total: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]),
    });
  });
  app.delete("/api/admin/engagement/:kind/:id", async (req, res) => {
    const Model = { likes: M.Like, ratings: M.Rating }[req.params.kind];
    if (!Model) throw fail(400, "Invalid kind.");
    await Model.deleteOne({ id: number(req.params.id) });
    res.json({ ok: true });
  });
  app.get("/api/admin/analytics", async (req, res) => {
    const f = {};
    if (req.query.device) f.device_type = String(req.query.device);
    if (req.query.country) f.country = String(req.query.country);
    if (req.query.project_id) f.project_id = number(req.query.project_id);
    const from = req.query.from
        ? new Date(req.query.from + "T00:00:00Z")
        : null,
      to = req.query.to ? new Date(req.query.to + "T23:59:59.999Z") : null;
    if ((from && isNaN(from)) || (to && isNaN(to)))
      throw fail(400, "Invalid date.");
    if (from && to && from > to)
      throw fail(400, "Start date must precede end date.");
    if (from || to)
      f.visited_at = {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: to } : {}),
      };
    if (req.query.download === "csv") {
      const titles = Object.fromEntries(
        (await M.Project.find().select("id title").lean()).map((p) => [
          p.id,
          p.title,
        ]),
      );
      res.type("text/csv").attachment("optictopus-analytics.csv");
      const cell = (v) =>
        '"' +
        String(v ?? "")
          .replace(/^[=+@-]/, "'$&")
          .replaceAll('"', '""') +
        '"';
      res.write(
        [
          "Date (UTC)",
          "Page type",
          "Project",
          "Device",
          "Brand",
          "Model",
          "OS",
          "Browser",
          "Country",
          "Region",
          "City",
        ]
          .map(cell)
          .join(",") + "\r\n",
      );
      for await (const v of M.Visit.find(f)
        .sort({ visited_at: -1 })
        .limit(250000)
        .lean()
        .cursor())
        res.write(
          [
            v.visited_at.toISOString(),
            v.page_type,
            titles[v.project_id] || "",
            v.device_type,
            v.device_brand,
            v.device_model,
            v.os_name,
            v.browser_name,
            v.country,
            v.region,
            v.city,
          ]
            .map(cell)
            .join(",") + "\r\n",
        );
      return res.end();
    }
    const group = (field) =>
      M.Visit.aggregate([
        { $match: f },
        { $group: { _id: "$" + field, total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]);
    const [
      total,
      unique,
      visits,
      devices,
      browsers,
      countries,
      models,
      daily,
      projects,
    ] = await Promise.all([
      M.Visit.countDocuments(f),
      M.Visit.distinct("visitor_hash", f),
      M.Visit.find(f).sort({ visited_at: -1 }).limit(200).lean(),
      group("device_type"),
      group("browser_name"),
      group("country"),
      group("device_model"),
      M.Visit.aggregate([
        { $match: f },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$visited_at" } },
            total: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      M.Project.find().select("id title").lean(),
    ]);
    const viewFilter = {
      ...(f.project_id ? { project_id: f.project_id } : {}),
      ...(f.visited_at ? { viewed_at: f.visited_at } : {}),
    };
    const [
      detailViews,
      detailUnique,
      oses,
      brands,
      deviceOptions,
      countryOptions,
      distribution,
      audience,
    ] = await Promise.all([
      M.View.countDocuments(viewFilter),
      M.View.distinct("visitor_hash", viewFilter),
      group("os_name"),
      group("device_brand"),
      M.Visit.distinct("device_type"),
      M.Visit.distinct("country"),
      M.Rating.aggregate([
        { $match: f.project_id ? { project_id: f.project_id } : {} },
        { $group: { _id: "$stars", total: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]),
      M.View.aggregate([
        { $match: viewFilter },
        {
          $group: {
            _id: "$project_id",
            total: { $sum: 1 },
            browsers: { $addToSet: "$visitor_hash" },
          },
        },
        { $sort: { total: -1 } },
      ]),
    ]);
    const projectStats = await Promise.all(
      projects.map(async (p) => ({
        id: p.id,
        title: p.title,
        likes: await M.Like.countDocuments({ project_id: p.id }),
        ratings: await M.Rating.countDocuments({ project_id: p.id }),
        average:
          (
            await M.Rating.aggregate([
              { $match: { project_id: p.id } },
              { $group: { _id: null, average: { $avg: "$stars" } } },
            ])
          )[0]?.average || 0,
      })),
    );
    res.json({
      detailViews,
      detailUnique: detailUnique.length,
      oses,
      brands,
      deviceOptions,
      countryOptions,
      distribution,
      projectStats,
      audience: audience.map((x) => ({
        title: projects.find((p) => p.id === x._id)?.title || "Unknown",
        id: x._id,
        total: x.total,
        unique: x.browsers.length,
      })),
      total,
      unique: unique.length,
      visits: visits.map((x) => ({
        ...clean(x),
        visitor_hash: x.visitor_hash.slice(0, 12),
      })),
      devices,
      browsers,
      countries,
      models,
      daily,
      projects: projects.map(clean),
    });
  });
  app.get("/sitemap.xml", async (req, res) => {
    const origin = process.env.PUBLIC_URL || "http://localhost:5000",
      projects = await M.Project.find(M.publicFilter).select("slug").lean();
    const esc = (s) =>
      s.replace(
        /[<>&"']/g,
        (c) =>
          ({
            "<": "&lt;",
            ">": "&gt;",
            "&": "&amp;",
            '"': "&quot;",
            "'": "&apos;",
          })[c],
      );
    res
      .type("application/xml")
      .send(
        '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
          ["/", "/privacy", ...projects.map((p) => "/project/" + p.slug)]
            .map(
              (p) =>
                "<url><loc>" +
                esc(origin.replace(/\/$/, "") + p) +
                "</loc></url>",
            )
            .join("") +
          "</urlset>",
      );
  });
  app.get("/robots.txt", (req, res) =>
    res.type("text").send("User-agent: *\nAllow: /\nDisallow: /admin\n"),
  );
  app.use("/api", (req, res) =>
    res.status(404).json({ message: "Endpoint not found." }),
  );
  app.get("/uploads/projects/:name", async (req, res, next) => {
    if (!/^[a-zA-Z0-9_.-]+$/.test(req.params.name)) return res.sendStatus(404);
    const media = await M.Media.findOne({
      path: "uploads/projects/" + req.params.name,
    });
    if (!media) return next();
    res
      .set("Cache-Control", "public, max-age=86400")
      .type(media.contentType)
      .send(media.bytes);
  });
  app.use(
    "/uploads",
    express.static(path.join(root, "server/uploads"), { dotfiles: "deny" }),
  );
  app.use("/uploads", (req, res) => res.sendStatus(404));
  app.get(["/index.php", "/privacy.php", "/project.php"], (req, res) =>
    res.redirect(
      301,
      req.path === "/project.php"
        ? "/project/" + encodeURIComponent(req.query.slug || "")
        : req.path === "/privacy.php"
          ? "/privacy"
          : "/",
    ),
  );
  app.get(/^\/admin\/.*\.php$/, (req, res) => {
    const file = req.path.split("/").at(-1).replace(".php", "");
    const names = {
      index: "",
      "project-edit": req.query.id
        ? "projects/" + encodeURIComponent(req.query.id)
        : "projects/new",
      "project-preview": "preview/" + encodeURIComponent(req.query.id || ""),
      "project-analytics":
        "analytics?project_id=" + encodeURIComponent(req.query.id || ""),
      setup: "login",
    };
    res.redirect(301, "/admin/" + (names[file] ?? file));
  });
  app.use(express.static(path.join(root, "client/dist"), { index: false }));
  app.get("/{*splat}", async (req, res) => {
    const s = await M.settings(),
      escape = (v) =>
        String(v || "").replace(
          /[<>&"']/g,
          (c) =>
            ({
              "<": "&lt;",
              ">": "&gt;",
              "&": "&amp;",
              '"': "&quot;",
              "'": "&apos;",
            })[c],
        );
    let title = s.site_name || "OPTICTOPUS",
      description = s.site_description || "",
      image = s.logo_image,
      status = 200;
    if (req.path.startsWith("/project/")) {
      const slug = req.path.slice("/project/".length);
      const p = await M.Project.findOne({ ...M.publicFilter, slug }).lean();
      if (p) {
        title = p.title + " — " + title;
        description = p.summary;
        image = p.cover_image;
      } else {
        title = "Project not found";
        status = 404;
      }
    } else if (req.path === "/privacy") title = "Privacy — " + title;
    const base = (process.env.PUBLIC_URL || "http://localhost:5000").replace(
      /\/$/,
      "",
    );
    let html = await readFile(
      path.join(root, "client/dist/index.html"),
      "utf8",
    );
    html = html
      .replace(/<title>.*?<\/title>/, "<title>" + escape(title) + "</title>")
      .replace(
        /<meta name="description"[^>]*>/,
        '<meta name="description" content="' + escape(description) + '">',
      );
    const meta =
      '<meta name="keywords" content="' +
      escape(s.seo_keywords) +
      '"><meta property="og:type" content="website"><meta property="og:title" content="' +
      escape(title) +
      '"><meta property="og:description" content="' +
      escape(description) +
      '"><meta property="og:url" content="' +
      escape(base + req.path) +
      '"><link rel="canonical" href="' +
      escape(base + req.path) +
      '">' +
      (asset(image) && image
        ? '<meta property="og:image" content="' +
          escape(base + "/" + image) +
          '">'
        : "");
    res
      .status(status)
      .type("html")
      .send(html.replace("</head>", meta + "</head>"));
  });
  app.use((e, req, res, next) => {
    const status =
      e.status ||
      (e.code === 11000
        ? 409
        : e.name === "ValidationError" || e.name === "CastError"
          ? 422
          : e instanceof multer.MulterError
            ? 422
            : 500);
    if (status === 500) console.error(e);
    res.status(status).json({
      message:
        e.code === 11000
          ? "That slug or value is already in use."
          : status === 500
            ? "Server error. Please retry."
            : e.message,
    });
  });
  return app;
}
