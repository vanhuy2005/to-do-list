import express from "express";
import profileViewModel, { ProfileViewModelError } from "../viewmodels/profileViewModel.js";

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

export default router;
