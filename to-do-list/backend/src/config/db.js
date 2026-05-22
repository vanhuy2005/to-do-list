import mongoose from "mongoose";
import User from "../models/User.js";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING);
        console.log("Kết nối MongoDB thành công");

        // Backfill Migration
        try {
            const defaultNotificationPreferences = {
              emailOverdue: true,
              emailDigest: true,
              digestHour: 8,
              timezone: "Asia/Ho_Chi_Minh",
              unsubscribedAt: null,
            };

            // 1. Local users: add "local" to providers if passwordHash exists
            await User.updateMany(
              { passwordHash: { $exists: true, $ne: null } },
              { $addToSet: { providers: "local" } }
            );

            // 2. Google and GitHub users: add to providers from Better Auth accounts
            const db = mongoose.connection.db;
            const accountsCollection = db.collection("better_auth_accounts");
            if (accountsCollection) {
              const googleAccounts = await accountsCollection.find({ providerId: "google" }).toArray();
              for (const account of googleAccounts) {
                await User.findByIdAndUpdate(account.userId, {
                  $addToSet: { providers: "google" }
                });
              }
              const githubAccounts = await accountsCollection.find({ providerId: "github" }).toArray();
              for (const account of githubAccounts) {
                await User.findByIdAndUpdate(account.userId, {
                  $addToSet: { providers: "github" }
                });
              }
            }

            // 3. Defaults: initialize empty notification preferences
            await User.updateMany(
              { notificationPreferences: { $exists: false } },
              { $set: { notificationPreferences: defaultNotificationPreferences } }
            );

            console.log("Di chuyển dữ liệu (backfill) hoàn thành ✓");
        } catch (migrationError) {
            console.warn("Lỗi khi chạy backfill migration:", migrationError.message);
        }
    } catch (error) {
        console.error("Kết nối MongoDB thất bại:", error);
        process.exit(1);
    }
};

export default connectDB;