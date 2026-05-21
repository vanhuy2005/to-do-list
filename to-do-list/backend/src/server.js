import "./config/env.js";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import tasksRouters from "./routes/tasksRouters.js";
import voiceTaskRouters from "./routes/voiceTaskRouters.js";
import sttRouters from "./routes/sttRouter.js";
import authRouters from "./routes/authRouters.js";
import profileRouters from "./routes/profileRouters.js";
import auditLogsRouters from "./routes/auditLogsRouters.js";
import adminRouters from "./routes/adminRouters.js";
import authMiddleware from "./middleware/authMiddleware.js";
import connectDB from "./config/db.js";
import initCronJobs from "./cron/cronJobs.js";

process.on('unhandledRejection', (reason, promise) => {
  console.error({
    event: 'unhandled_rejection',
    reason: reason instanceof Error
      ? { message: reason.message, code: reason.code, name: reason.name }
      : String(reason),
    timestamp: new Date().toISOString(),
  });
});

process.on('uncaughtException', (err) => {
  console.error({
    event: 'uncaught_exception',
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });
  process.exit(1);
});

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  if (process.env.NODE_ENV !== "development") {
    console.error(
      "CRITICAL: Missing JWT_SECRET or JWT_REFRESH_SECRET in environment",
    );
    process.exit(1);
  }
}

const PORT = process.env.PORT || 5001;


const allowedOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
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
app.use("/api/v1/voice-task", authMiddleware, voiceTaskRouters);
app.use("/api/v1/voice/stt", authMiddleware, sttRouters);
app.use("/api/v1/admin", authMiddleware, adminRouters);
app.use("/api/v1/audit-logs", authMiddleware, auditLogsRouters);

connectDB()
  .then(() => {
    initCronJobs();

    app.listen(PORT, () => {
      console.log(`server listen port http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.log("Kết nối MongoDB thất bại:", error);
    process.exit(1);
  });
