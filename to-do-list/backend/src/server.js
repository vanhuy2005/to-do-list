import "./config/env.js";
import fs from "fs";
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
import { toNodeHandler } from "better-auth/node";
import authViewModel, { AuthViewModelError } from "./viewmodels/authViewModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, "../dist/client");
const frontendBuildPath = path.resolve(__dirname, "../../frontend/dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");
const frontendAssetsPath = path.join(frontendDistPath, "assets");

function ensureFrontendBuild() {
  if (fs.existsSync(frontendIndexPath) && fs.existsSync(frontendAssetsPath)) {
    return;
  }

  if (!fs.existsSync(frontendBuildPath)) {
    console.warn(
      `[server] Frontend build not found at ${frontendBuildPath}; skipping asset copy.`,
    );
    return;
  }

  fs.mkdirSync(path.dirname(frontendDistPath), { recursive: true });
  fs.cpSync(frontendBuildPath, frontendDistPath, { recursive: true });
  console.log(
    `[server] Copied frontend build from ${frontendBuildPath} to ${frontendDistPath}`,
  );
}

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

ensureFrontendBuild();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(null, false);
    },
    credentials: true,
  }),
);

// Compatibility wrapper: expose /api/v1/auth/core/session with the legacy app payload shape.
// Must be placed before the catch-all to prevent it from matching standard Better Auth session endpoint.
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

// Better Auth routes must be mounted before express.json() to prevent stream consumption issues.
let betterAuthNodeHandler = null;

const getBetterAuthNodeHandler = () => {
  if (!betterAuthNodeHandler) {
    betterAuthNodeHandler = toNodeHandler(getBetterAuth());
  }
  return betterAuthNodeHandler;
};

app.all("/api/v1/auth/core/*", (req, res, next) => {
  return getBetterAuthNodeHandler()(req, res, next);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(frontendDistPath));

// Public routes
app.use("/api/v1/auth", authRouters);
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
