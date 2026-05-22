#!/usr/bin/env node

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env.development") });

// Import User model
import User from "../src/models/User.js";

const ADMIN_CONFIG = {
  email: "admin@example.com",
  password: "00000000",
  displayName: "Admin",
  role: "admin",
  status: "active",
  providers: ["local"],
};

async function seedAdminUser() {
  try {
    console.log("🔄 Connecting to MongoDB...");

    const mongoUri =
      process.env.MONGODB_CONNECTIONSTRING ||
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/todo-list";
    await mongoose.connect(mongoUri);

    console.log("✅ Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: ADMIN_CONFIG.email });
    if (existingAdmin) {
      console.log("⚠️  Admin user already exists!");
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Status: ${existingAdmin.status}`);

      // Option to update password
      if (process.argv.includes("--reset")) {
        console.log("🔄 Resetting admin password...");
        const hashedPassword = await bcrypt.hash(ADMIN_CONFIG.password, 10);
        existingAdmin.passwordHash = hashedPassword;
        existingAdmin.role = ADMIN_CONFIG.role;
        existingAdmin.status = ADMIN_CONFIG.status;
        await existingAdmin.save();
        console.log("✅ Admin password and status reset successfully!");
      }

      await mongoose.disconnect();
      process.exit(0);
    }

    // Hash password
    console.log("🔐 Hashing password...");
    const hashedPassword = await bcrypt.hash(ADMIN_CONFIG.password, 10);

    // Create admin user
    console.log("👤 Creating admin user...");
    const adminUser = new User({
      email: ADMIN_CONFIG.email,
      passwordHash: hashedPassword,
      displayName: ADMIN_CONFIG.displayName,
      role: ADMIN_CONFIG.role,
      status: ADMIN_CONFIG.status,
      providers: ADMIN_CONFIG.providers,
      emailVerified: true,
      avatarUrl: null,
      preferredLanguage: "vi",
      themePreference: "light",
      notificationPreferences: {
        emailOverdue: true,
        emailDigest: true,
        digestHour: 8,
        timezone: "Asia/Ho_Chi_Minh",
      },
    });

    await adminUser.save();

    console.log("\n✅ Admin user created successfully!\n");
    console.log("📋 Admin Account Details:");
    console.log("─".repeat(50));
    console.log(`Email:        ${ADMIN_CONFIG.email}`);
    console.log(`Password:     ${ADMIN_CONFIG.password}`);
    console.log(`Display Name: ${ADMIN_CONFIG.displayName}`);
    console.log(`Role:         ${ADMIN_CONFIG.role}`);
    console.log(`User ID:      ${adminUser._id}`);
    console.log("─".repeat(50));
    console.log("\n⚠️  IMPORTANT:");
    console.log(
      "   1. Change the admin password immediately after first login",
    );
    console.log("   2. Use strong password in production");
    console.log("   3. Never commit this password to version control\n");

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding admin user:");
    console.error(error.message);

    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the seed
seedAdminUser();
