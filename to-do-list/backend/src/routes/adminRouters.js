import express from "express";
import adminViewModel, {
  AdminViewModelError,
} from "../viewmodels/adminViewModel.js";
import {
  requirePermission,
  requireRole,
} from "../middleware/authMiddleware.js";

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

// GET /admin/dashboard - dashboard tổng quan
router.get(
  "/dashboard",
  requireRole("admin"),
  requirePermission("analytics:read"),
  errorHandler(async (req, res) => {
    const result = await adminViewModel.getDashboard(req.query);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

// GET /admin/users - danh sách users
router.get(
  "/users",
  requireRole("admin"),
  requirePermission("users:read"),
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
  requireRole("admin"),
  requirePermission("users:update"),
  errorHandler(async (req, res) => {
    const result = await adminViewModel.updateUser(req.params.id, req.body);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

// DELETE /admin/users/:id - xóa user (soft delete)
router.delete(
  "/users/:id",
  requireRole("admin"),
  requirePermission("users:delete"),
  errorHandler(async (req, res) => {
    const adminId = req.user?.id || req.userId;
    const result = await adminViewModel.softDeleteUser(req.params.id, adminId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  }),
);

// POST /admin/users/:id/restore - khôi phục user từ thùng rác
router.post(
  "/users/:id/restore",
  requireRole("admin"),
  requirePermission("users:update"),
  errorHandler(async (req, res) => {
    const adminId = req.user?.id || req.userId;
    const result = await adminViewModel.restoreUser(req.params.id, adminId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  }),
);

// POST /admin/users/:id/disable - vô hiệu hóa user
router.post(
  "/users/:id/disable",
  requireRole("admin"),
  requirePermission("users:disable"),
  errorHandler(async (req, res) => {
    const adminId = req.user?.id || req.userId;
    const result = await adminViewModel.disableUser(req.params.id, adminId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  }),
);

// POST /admin/users/:id/enable - kích hoạt lại user
router.post(
  "/users/:id/enable",
  requireRole("admin"),
  requirePermission("users:enable"),
  errorHandler(async (req, res) => {
    const adminId = req.user?.id || req.userId;
    const result = await adminViewModel.enableUser(req.params.id, adminId);
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
  requireRole("admin"),
  requirePermission("moderation:read"),
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
  requireRole("admin"),
  requirePermission("users:disable"),
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
  requireRole("admin"),
  requirePermission("trash:read"),
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
  requireRole("admin"),
  requirePermission("moderation:read"),
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
  requireRole("admin"),
  requirePermission("analytics:read"),
  errorHandler(async (req, res) => {
    const result = await adminViewModel.getAnalytics(req.query);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

// GET /admin/audit-logs - nhật ký kiểm toán
router.get(
  "/audit-logs",
  requireRole("admin"),
  requirePermission("audit-logs:read:any"),
  errorHandler(async (req, res) => {
    const result = await adminViewModel.getAuditLogs(req.query);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

export default router;
