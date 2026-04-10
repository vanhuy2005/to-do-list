import express from "express";
import aiViewModel, { AIViewModelError } from "../viewmodels/aiViewModel.js";

const router = express.Router();

const errorHandler = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req, res, next);
    return result;
  } catch (error) {
    if (error instanceof AIViewModelError) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
        },
      });
    }

    console.error("Unexpected AI error:", error.message);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
  }
};

// POST /ai - assistant for in-scope to-do support only
router.post(
  "/",
  errorHandler(async (req, res) => {
    const result = await aiViewModel.askAssistant({
      userId: req.user?.id || req.userId,
      message: req.body?.message,
      tasks: req.body?.tasks,
    });

    return res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

export default router;
