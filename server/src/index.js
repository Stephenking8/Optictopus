import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app.js";
const mongoUrl =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/optictopus";
await mongoose.connect(mongoUrl);
const app = createApp({
  mongoUrl,
  secret: process.env.SESSION_SECRET,
  production: process.env.NODE_ENV === "production",
});
const server = app.listen(Number(process.env.PORT) || 5000, () =>
  console.log("OPTICTOPUS running on port " + (process.env.PORT || 5000)),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    }),
  );
