import express from "express";
import profileViewModel, {
  ProfileViewModelError,
} from "../viewmodels/profileViewModel.js";

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
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error.message,
      },
    });
  }
};

router.get(
  "/:id",
  errorHandler(async (req, res) => {
    const result = await profileViewModel.getAuditLogById(
      req.user?.id || req.userId,
      req.params.id,
    );

    return res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

router.delete(
  "/user/:userId",
  errorHandler(async (req, res) => {
    const result = await profileViewModel.deleteAuditLogsByUserWithFilters(
      req.user,
      req.params.userId,
      req.query,
    );

    return res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  }),
);

router.delete(
  "/:id",
  errorHandler(async (req, res) => {
    const result = await profileViewModel.deleteAuditLogById(
      req.user?.id || req.userId,
      req.params.id,
    );

    return res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      message: result.message,
    });
  }),
);

export default router;
