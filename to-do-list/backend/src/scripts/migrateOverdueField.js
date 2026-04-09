/**
 * Migration Script: explicitOverdue → isOverdue + overdueAt
 *
 * Chạy 1 lần duy nhất:
 *   node src/scripts/migrateOverdueField.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../config/db.js";

dotenv.config();

async function migrate() {
  await connectDB();
  const db = mongoose.connection.db;
  const collection = db.collection("tasks");

  // 1. Rename explicitOverdue → isOverdue
  const renameResult = await collection.updateMany(
    { explicitOverdue: { $exists: true } },
    [
      { $set: { isOverdue: "$explicitOverdue" } },
      { $unset: "explicitOverdue" },
    ],
  );
  console.log(
    `[1/2] Renamed explicitOverdue → isOverdue: ${renameResult.modifiedCount} docs`,
  );

  // 2. Evaluate existing overdue tasks
  const now = new Date();
  const overdueResult = await collection.updateMany(
    {
      dueDate: { $ne: null, $lt: now },
      status: { $ne: "done" },
      deletedAt: null,
      isOverdue: { $ne: true },
    },
    { $set: { isOverdue: true, overdueAt: now } },
  );
  console.log(
    `[2/2] Marked existing overdue tasks: ${overdueResult.modifiedCount} docs`,
  );

  console.log("Migration completed successfully!");
  process.exit(0);
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
