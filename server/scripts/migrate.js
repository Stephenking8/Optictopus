import "dotenv/config";
import mongoose from "mongoose";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { models, syncCounter } from "../src/models.js";
export async function migrate() {
  const data = JSON.parse(
    await readFile(new URL("../data/legacy.json", import.meta.url), "utf8"),
  );
  const report = {};
  for (const [name, rows] of Object.entries(data)) {
    const Model = models[name];
    await Model.init();
    const key =
      name === "settings"
        ? "key"
        : name === "social_links"
          ? "platform"
          : name === "visitors"
            ? "visitor_hash"
            : name === "rate_limits"
              ? "key_hash"
              : "id";
    for (const row of rows) {
      const doc = { ...row };
      for (const [k, v] of Object.entries(doc)) {
        if (v && /(?:_at|_seen)$/.test(k))
          doc[k] = new Date(v.replace(" ", "T") + "Z");
      }
      await Model.updateOne(
        { [key]: doc[key] },
        { $setOnInsert: doc },
        { upsert: true },
      );
    }
    if (key === "id")
      await syncCounter(name, Math.max(0, ...rows.map((x) => x.id)));
    report[name] = rows.length;
  }
  return report;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/optictopus",
    );
    console.log("Imported (existing records unchanged):", await migrate());
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
