import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../config/db.js";

dotenv.config();

async function migrate() {
  await connectDB();
  console.log("Kết nối cơ sở dữ liệu thành công. Bắt đầu di chuyển cấu hình thông báo...");
  
  const db = mongoose.connection.db;
  const collection = db.collection("users");

  const result = await collection.updateMany(
    { notificationPreferences: { $exists: false } },
    {
      $set: {
        avatarPublicId: null,
        notificationPreferences: {
          emailOverdue: true,
          emailDigest: true,
          digestHour: 8,
          timezone: "Asia/Ho_Chi_Minh",
          unsubscribedAt: null,
        },
      },
    }
  );

  console.log(`Di chuyển hoàn tất: Đã cập nhật ${result.modifiedCount} tài khoản người dùng với cấu hình thông báo mặc định.`);
  process.exit(0);
}

migrate().catch((error) => {
  console.error("Di chuyển thất bại:", error);
  process.exit(1);
});
