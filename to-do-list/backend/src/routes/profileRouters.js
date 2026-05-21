import express from "express";
import profileViewModel, { ProfileViewModelError } from "../viewmodels/profileViewModel.js";
import { imageUploadMiddleware, validateImageBuffer } from "../middleware/imageUpload.js";
import { avatarRateLimit, unsubscribeRateLimit } from "../middleware/rateLimiters.js";

const router = express.Router();

const errorHandler = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req, res, next);
    return result;
  } catch (error) {
    if (error instanceof ProfileViewModelError) {
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
        message: error.message,
      },
    });
  }
};

// GET /profile - lấy thông tin profile
router.get(
  "/",
  errorHandler(async (req, res) => {
    const result = await profileViewModel.getProfile(req.user?.id || req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  })
);

// PUT /profile - cập nhật profile
router.put(
  "/",
  errorHandler(async (req, res) => {
    const result = await profileViewModel.updateProfile(
      req.user?.id || req.userId,
      req.body
    );
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  })
);

// GET /profile/sessions - lấy danh sách sessions
router.get(
  "/sessions",
  errorHandler(async (req, res) => {
    const result = await profileViewModel.getSessions(
      req.user?.id || req.userId
    );
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  })
);

// DELETE /profile/sessions/:id - xóa session cụ thể
router.delete(
  "/sessions/:id",
  errorHandler(async (req, res) => {
    const result = await profileViewModel.deleteSession(
      req.params.id,
      req.user?.id || req.userId
    );
    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
    });
  })
);


router.get(
  "/audit-logs",
  errorHandler(async (req, res) => {
    const result = await profileViewModel.getAuditLogs(
      req.user?.id || req.userId,
      req.query,
    );
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

router.delete(
  "/:id",
  errorHandler(async (req, res) => {
    const result = await profileViewModel.deleteAuditLogs(
      req.user?.id || req.userId,
      req.query,
    );
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  }),
);

// POST /profile/avatar - Tải lên avatar
router.post(
  "/avatar",
  avatarRateLimit,
  imageUploadMiddleware,
  validateImageBuffer,
  errorHandler(async (req, res) => {
    const result = await profileViewModel.uploadAvatar(
      req.user?.id || req.userId,
      req.file.buffer
    );
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  })
);

// DELETE /profile/avatar - Xóa avatar
router.delete(
  "/avatar",
  avatarRateLimit,
  errorHandler(async (req, res) => {
    const result = await profileViewModel.deleteAvatar(req.user?.id || req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
    });
  })
);

// GET /profile/notifications/preferences - Lấy cấu hình thông báo
router.get(
  "/notifications/preferences",
  errorHandler(async (req, res) => {
    const result = await profileViewModel.getNotificationPreferences(req.user?.id || req.userId);
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  })
);

// PUT /profile/notifications/preferences - Cập nhật cấu hình thông báo
router.put(
  "/notifications/preferences",
  errorHandler(async (req, res) => {
    const result = await profileViewModel.updateNotificationPreferences(
      req.user?.id || req.userId,
      req.body
    );
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  })
);

// GET /profile/notifications/history - Lấy lịch sử thông báo
router.get(
  "/notifications/history",
  errorHandler(async (req, res) => {
    const result = await profileViewModel.getNotificationHistory(
      req.user?.id || req.userId,
      req.query
    );
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  })
);

// Public Unsubscribe Router (bypasses authMiddleware)
export const publicProfileRouter = express.Router();

publicProfileRouter.post(
  "/notifications/unsubscribe",
  unsubscribeRateLimit,
  errorHandler(async (req, res) => {
    const { userId, token } = req.query;
    const result = await profileViewModel.unsubscribe(userId, token);
    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
    });
  })
);

export default router;
