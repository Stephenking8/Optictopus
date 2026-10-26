import mongoose from "mongoose";
const { Schema } = mongoose;
function model(name, fields, indexes = []) {
  const schema = new Schema(fields, { versionKey: false, collection: name });
  for (const [keys, opts] of indexes) schema.index(keys, opts);
  return mongoose.model(name, schema);
}
const id = { type: Number, required: true, unique: true };
export const Admin = model("admins", {
  id,
  username: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  created_at: Date,
  last_login_at: Date,
  session_version: { type: Number, default: 0 },
});
export const Category = model("categories", {
  id,
  name: { type: String, required: true },
  slug: { type: String, unique: true },
  sort_order: { type: Number, default: 0 },
});
export const overrides = [
  "show_views",
  "show_likes",
  "show_rating",
  "show_rating_count",
  "allow_likes",
  "allow_ratings",
];
export const Project = model("projects", {
  id,
  category_id: Number,
  title: { type: String, required: true, maxLength: 160 },
  slug: { type: String, required: true, unique: true },
  summary: { type: String, maxLength: 500, default: "" },
  description: String,
  technologies: String,
  features: String,
  live_url: String,
  github_url: String,
  cover_image: String,
  development_status: {
    type: String,
    enum: ["completed", "ongoing", "upcoming"],
    default: "ongoing",
  },
  publication: { type: String, enum: ["draft", "published"], default: "draft" },
  is_hidden: { type: Number, default: 0 },
  is_featured: { type: Number, default: 0 },
  sort_order: { type: Number, default: 0 },
  ...Object.fromEntries(
    overrides.map((k) => [
      k,
      { type: Number, enum: [0, 1, null], default: null },
    ]),
  ),
  published_at: Date,
  created_at: Date,
  updated_at: Date,
  deleted_at: { type: Date, default: null },
});
export const Image = model("project_images", {
  id,
  project_id: { type: Number, index: true },
  image_path: String,
  caption: String,
  sort_order: Number,
});
const pair = [[{ project_id: 1, visitor_hash: 1 }, { unique: true }]];
export const Like = model(
  "project_likes",
  { id, project_id: Number, visitor_hash: String, created_at: Date },
  pair,
);
export const Rating = model(
  "project_ratings",
  {
    id,
    project_id: Number,
    visitor_hash: String,
    stars: { type: Number, min: 1, max: 5 },
    created_at: Date,
    updated_at: Date,
  },
  pair,
);
export const View = model(
  "project_views",
  { id, project_id: Number, visitor_hash: String, viewed_at: Date },
  [[{ project_id: 1, visitor_hash: 1, viewed_at: -1 }, {}]],
);
export const Setting = model("settings", {
  key: { type: String, unique: true },
  value: String,
});
export const Social = model("social_links", {
  platform: { type: String, unique: true },
  link: String,
  enabled: Number,
});
export const Visitor = model("visitors", {
  visitor_hash: { type: String, unique: true },
  first_seen: Date,
  last_seen: Date,
  consented_at: Date,
});
export const Visit = model(
  "website_visits",
  {
    id,
    visitor_hash: String,
    page_type: String,
    project_id: Number,
    device_type: String,
    device_brand: String,
    device_model: String,
    os_name: String,
    browser_name: String,
    country: String,
    region: String,
    city: String,
    visited_at: Date,
  },
  [[{ visitor_hash: 1, page_type: 1, project_id: 1, visited_at: -1 }, {}]],
);
export const LegacyLimit = model("legacy_rate_limits", {
  key_hash: { type: String, unique: true },
  window_start: Number,
  attempts: Number,
});
const Counter = model("counters", {
  name: { type: String, unique: true },
  seq: Number,
});
export async function nextId(name) {
  return (
    await Counter.findOneAndUpdate(
      { name },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    )
  ).seq;
}
export async function syncCounter(name, seq) {
  await Counter.updateOne({ name }, { $max: { seq } }, { upsert: true });
}
export const models = {
  admins: Admin,
  categories: Category,
  projects: Project,
  project_images: Image,
  project_likes: Like,
  project_ratings: Rating,
  project_views: View,
  settings: Setting,
  social_links: Social,
  visitors: Visitor,
  website_visits: Visit,
  rate_limits: LegacyLimit,
};
export async function settings() {
  return Object.fromEntries(
    (await Setting.find().lean()).map((x) => [x.key, x.value]),
  );
}
export const publicFilter = {
  publication: "published",
  is_hidden: 0,
  deleted_at: null,
};
export const flag = (p, s, k, g = k) =>
  p[k] == null ? s[g] === "1" : p[k] === 1;

// Small portfolio images remain durable across serverless redeployments.
export const Media = model("media", {
  path: { type: String, required: true, unique: true },
  contentType: { type: String, required: true },
  bytes: { type: Buffer, required: true },
  created_at: Date,
});
