import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Admin, nextId } from "../src/models.js";
// Environment-only password avoids writing credentials to shell command history.
try {
  const username = process.env.ADMIN_USERNAME,
    password = process.env.ADMIN_PASSWORD;
  if (
    !username ||
    !password ||
    password.length < 12 ||
    Buffer.byteLength(password) > 72
  )
    throw Error(
      "Set ADMIN_USERNAME and ADMIN_PASSWORD (12–72 bytes) in server/.env first.",
    );
  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/optictopus",
  );
  const old = await Admin.findOne({ username });
  if (old) {
    old.password_hash = await bcrypt.hash(password, 12);
    old.session_version += 1;
    await old.save();
  } else
    await Admin.create({
      id: await nextId("admins"),
      username,
      password_hash: await bcrypt.hash(password, 12),
      created_at: new Date(),
    });
  console.log(
    "Administrator saved. Remove ADMIN_PASSWORD from .env after setup.",
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
