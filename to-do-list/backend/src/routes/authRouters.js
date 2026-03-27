import express from "express";
import authViewModel, {
  AuthViewModelError,
} from "../viewmodels/authViewModel.js";

const router = express.Router();

const errorHandler = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req, res, next);
    return result;
  } catch (error) {
    if (error instanceof AuthViewModelError) {
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

router.post(
  "/register",
  errorHandler(async (req, res) => {
    const result = await authViewModel.register(req.body);
    res
      .status(result.statusCode)
      .cookie("refreshToken", req.body.refreshToken || "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        success: result.success,
        data: result.data,
        message: result.message,
      });
  }),
);

router.post(
  "/login",
  errorHandler(async (req, res) => {
    const result = await authViewModel.login(req.body);
   
    res
      .status(result.statusCode)
      .cookie("refreshToken", req.body.refreshToken || "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        success: result.success,
        data: result.data,
        message: result.message,
      });
  }),
);

router.post(
  "/refresh",
  errorHandler(async (req, res) => {
    const result = await authViewModel.refresh({
      refreshToken: req.cookies.refreshToken,
    });
    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

router.post(
  "/logout",
  errorHandler(async (req, res) => {
    const result = await authViewModel.logout({
      userId: req.user?.id,
    });
    res.status(result.statusCode).clearCookie("refreshToken").json({
      success: result.success,
      message: result.message,
    });
  }),
);

export default router;
