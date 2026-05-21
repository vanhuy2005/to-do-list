import "../config/env.js";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import { syncLegacyCredentialAccount } from "../services/betterAuthService.js";

async function run() {
  await connectDB();

  const users = await User.find({
    passwordHash: { $ne: null },
  }).select("_id email passwordHash status");

  let migratedCount = 0;

  for (const user of users) {
    try {
      const migrated = await syncLegacyCredentialAccount(user);
      if (migrated) {
        migratedCount += 1;
      }
    } catch (error) {
      console.error(
        `[BetterAuth backfill] Failed for ${user.email}: ${error.message}`,
      );
    }
  }

  console.log(
    `[BetterAuth backfill] Completed. Credential accounts synced: ${migratedCount}`,
  );

  await mongoose.connection.close();
}

run().catch(async (error) => {
  console.error("[BetterAuth backfill] Fatal error:", error);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
