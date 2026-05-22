import "./config/env.js";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import tasksRouters from "./routes/tasksRouters.js";
import voiceTaskRouters from "./routes/voiceTaskRouters.js";
import sttRouters from "./routes/sttRouter.js";
import authRouters from "./routes/authRouters.js";
import profileRouters, {
  publicProfileRouter,
} from "./routes/profileRouters.js";
import auditLogsRouters from "./routes/auditLogsRouters.js";
import adminRouters from "./routes/adminRouters.js";
import projectsRouters from "./routes/projectsRouters.js";
import authMiddleware, { requireRole } from "./middleware/authMiddleware.js";
import connectDB from "./config/db.js";
import initCronJobs from "./cron/cronJobs.js";
import { getBetterAuth } from "./services/betterAuthService.js";
import { toBetterAuthHeaders } from "./services/betterAuthService.js";
import authViewModel, { AuthViewModelError } from "./viewmodels/authViewModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, "../dist/client");
const frontendIndexPath = path.join(frontendDistPath, "index.html");

process.on("unhandledRejection", (reason, promise) => {
  console.error({
    event: "unhandled_rejection",
    reason:
      reason instanceof Error
        ? { message: reason.message, code: reason.code, name: reason.name }
        : String(reason),
    timestamp: new Date().toISOString(),
  });
});

process.on("uncaughtException", (err) => {
  console.error({
    event: "uncaught_exception",
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
app.use(express.static(frontendDistPath));

// Public routes
app.use("/api/v1/auth", authRouters);
// Compatibility wrapper: expose /api/v1/auth/core/session with the legacy app payload shape.
app.get("/api/v1/auth/core/session", async (req, res) => {
  try {
    const result = await authViewModel.getSession({
      headers: toBetterAuthHeaders(req),
    });

    return res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  } catch (err) {
    if (err instanceof AuthViewModelError) {
      return res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.errorCode,
          message: err.message,
        },
      });
    }

    console.error("/auth/core/session proxy error:", err);

    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
});
app.use("/api/v1/auth/core", async (req, res, next) => {
  try {
    const mod = await import("better-auth/node");
    const toNodeHandler = mod.toNodeHandler;
    return toNodeHandler(getBetterAuth())(req, res, next);
  } catch (err) {
    console.warn("[server] better-auth not installed or failed to load; /api/v1/auth/core disabled");
    res.status(501).json({ message: "Better Auth integration not available" });
  }
});
app.use("/api/v1/profile", publicProfileRouter);

// Protected routes
app.use("/api/v1/profile", authMiddleware, requireRole("user"), profileRouters);
app.use("/api/v1/tasks", authMiddleware, requireRole("user"), tasksRouters);
app.use("/api/v1/voice-task", authMiddleware, voiceTaskRouters);
app.use("/api/v1/voice/stt", authMiddleware, sttRouters);
app.use("/api/v1/admin", authMiddleware, adminRouters);
app.use(
  "/api/v1/audit-logs",
  authMiddleware,
  requireRole("user"),
  auditLogsRouters,
);
app.use(
  "/api/v1/projects",
  authMiddleware,
  requireRole("user"),
  projectsRouters,
);

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    res.status(404).json({ message: "Not Found" });
    return;
  }

  res.sendFile(frontendIndexPath, (error) => {
    if (error) {
      next(error);
    }
  });
});

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
