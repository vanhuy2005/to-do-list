import "../config/env.js";
import mongoose from "mongoose";
import Project from "../models/Project.js";
import crypto from "crypto";

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

async function run() {
  const uri =
    process.env.MONGODB_CONNECTIONSTRING ||
    process.env.MONGO_URI ||
    "mongodb://localhost:27017/todoapp";
  
  console.log("Connecting to", uri);
  
  try {
    await mongoose.connect(uri);
    console.log("Connected successfully. Starting migration...");

    const projects = await Project.find({});
    console.log(`Found ${projects.length} projects to check.`);

    let modifiedCount = 0;

    for (const project of projects) {
      let isChanged = false;

      // 1. Backfill project emoji and status
      if (!project.emoji) {
        project.emoji = "📝";
        isChanged = true;
      }
      if (!project.status) {
        project.status = "active";
        isChanged = true;
      }

      // 2. Backfill share link hashes
      if (project.shareLinks && project.shareLinks.length > 0) {
        for (const link of project.shareLinks) {
          // If tokenHash is missing but we have legacy plaintext token, hash it
          if (!link.tokenHash && link.token) {
            link.tokenHash = hashToken(link.token);
            isChanged = true;
            console.log(`Hashed plaintext token for project: ${project.name} (${project._id})`);
          } else if (!link.tokenHash) {
            // Generate a fallback if somehow both are missing
            const secureToken = crypto.randomBytes(32).toString("hex");
            link.tokenHash = hashToken(secureToken);
            isChanged = true;
            console.log(`Generated and hashed a fallback token for project: ${project.name} (${project._id})`);
          }

          if (link.usedCount === undefined || link.usedCount === null) {
            link.usedCount = 0;
            isChanged = true;
          }
          if (link.isRevoked === undefined || link.isRevoked === null) {
            link.isRevoked = false;
            isChanged = true;
          }
        }
      }

      if (isChanged) {
        await project.save();
        modifiedCount++;
      }
    }

    console.log(`Migration complete. Hashed/Backfilled ${modifiedCount} projects.`);
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database.");
    process.exit(0);
  }
}

run();
