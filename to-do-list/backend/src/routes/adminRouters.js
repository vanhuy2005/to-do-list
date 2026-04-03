import express from "express";
import adminViewModel, {
  AdminViewModelError,
} from "../viewmodels/adminViewModel.js";

const router = express.Router();

const errorHandler = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req, res, next);
    return result;
  } catch (error) {
    if (error instanceof AdminViewModelError) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
        },
      });
    }
    console.error("Unexpected error:", error.message);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
  }
};

// Middleware kiểm tra admin
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Chỉ admin có quyền truy cập",
      },
    });
  }
  next();
};

// GET /admin/users - danh sách users
router.get(
  "/users",
  requireAdmin,
  errorHandler(async (req, res) => {
    const result = await adminViewModel.getUsers(req.query);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

// PUT /admin/users/:id - cập nhật user
router.put(
  "/users/:id",
  requireAdmin,
  errorHandler(async (req, res) => {
    const result = await adminViewModel.updateUser(req.params.id, req.body);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

// DELETE /admin/users/:id - xóa user
router.delete(
  "/users/:id",
  requireAdmin,
  errorHandler(async (req, res) => {
    const result = await adminViewModel.deleteUserOffline(req.params.id);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  }),
);
// GET /admin/moderation - kiểm duyệt users không hoạt động
router.get(
  "/moderation",
  requireAdmin,
  errorHandler(async (req, res) => {
    const result = await adminViewModel.getModeration(req.query);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

// PUT /admin/moderation/:id/disable - vô hiệu hóa user
router.put(
  "/moderation/:id/disable",
  requireAdmin,
  errorHandler(async (req, res) => {
    const result = await adminViewModel.disableInactiveUser(req.params.id);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  }),
);

// GET /admin/trash - thùng rác tài khoản
router.get(
  "/trash",
  requireAdmin,
  errorHandler(async (req, res) => {
    const result = await adminViewModel.getTrash(req.query);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

// GET /admin/tasks - tasks cho kiểm duyệt
router.get(
  "/tasks",
  requireAdmin,
  errorHandler(async (req, res) => {
    const result = await adminViewModel.getTasksForModeration(req.query);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

// GET /admin/analytics - phân tích
router.get(
  "/analytics",
  requireAdmin,
  errorHandler(async (req, res) => {
    const result = await adminViewModel.getAnalytics();
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

// GET /admin/audit-logs - nhật ký kiểm toán
router.get(
  "/audit-logs",
  requireAdmin,
  errorHandler(async (req, res) => {
    const result = await adminViewModel.getAuditLogs(req.query);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

export default router;
