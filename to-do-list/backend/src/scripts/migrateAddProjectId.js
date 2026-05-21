import "../config/env.js";
import mongoose from "mongoose";
import Task from "../models/Task.js";

async function run() {
  const uri =
    process.env.MONGODB_CONNECTIONSTRING ||
    process.env.MONGO_URI ||
    "mongodb://localhost:27017/todoapp";
  console.log("Connecting to", uri);
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    const res = await Task.updateMany(
      { projectId: { $exists: false } },
      { $set: { projectId: null } },
    );

    console.log(
      "Migration complete. Matched:",
      res.matchedCount,
      "Modified:",
      res.modifiedCount,
    );
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
