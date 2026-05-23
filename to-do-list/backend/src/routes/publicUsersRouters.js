import express from "express";
import adminViewModel from "../viewmodels/adminViewModel.js";

const router = express.Router();

const errorHandler = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req, res, next);
    return result;
  } catch (error) {
    console.error("Unexpected error (public users):", error.message);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
  }
};

// Public users endpoint for development / fallback usage
// GET /public/users
router.get(
  "/users",
  errorHandler(async (req, res) => {
    const result = await adminViewModel.getUsers(req.query);
    // Normalize to simple shape for public consumption
    return res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
      meta: result.meta || result.data?.pagination || {},
    });
  }),
);

export default router;
