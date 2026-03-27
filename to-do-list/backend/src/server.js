import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import tasksRouters from "./routes/tasksRouters.js";
import authRouters from "./routes/authRouters.js";
import profileRouters from "./routes/profileRouters.js";
import adminRouters from "./routes/adminRouters.js";
import authMiddleware from "./middleware/authMiddleware.js";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 5001;

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Public routes
app.use("/api/v1/auth", authRouters);

// Protected routes
app.use("/api/v1/profile", authMiddleware, profileRouters);
app.use("/api/v1/tasks", authMiddleware, tasksRouters);
app.use("/api/v1/admin", authMiddleware, adminRouters);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`server listen port http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.log("Kết nối MongoDB thất bại:", error);
    process.exit(1);
  });
