import express from "express";
import authViewModel, {
  applyBetterAuthHeaders,
  AuthViewModelError,
} from "../viewmodels/authViewModel.js";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getOAuthErrorURL,
  toBetterAuthHeaders,
} from "../services/betterAuthService.js";

const router = express.Router();

const clearLegacyRefreshCookie = (res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
};

const buildOAuthErrorRedirectURL = (errorCode) => {
  const code = encodeURIComponent(errorCode || "oauth_failed");
  return `${getOAuthErrorURL()}&code=${code}`;
};

const errorHandler = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req, res, next);
    return result;
  } catch (error) {
    if (error instanceof AuthViewModelError) {
      if (error.meta?.headers) {
        applyBetterAuthHeaders(res, error.meta.headers);
      }

      if (req.path === "/google") {
        return res.redirect(302, buildOAuthErrorRedirectURL(error.errorCode));
      }

      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
        },
      });
    }

    console.error("Unexpected error:", error.message);

    if (req.path === "/google") {
      return res.redirect(302, buildOAuthErrorRedirectURL("oauth_failed"));
    }

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
  }
};

router.post(
  "/register",
  errorHandler(async (req, res) => {
    const result = await authViewModel.register(
      req.body,
      toBetterAuthHeaders(req),
    );

    applyBetterAuthHeaders(res, result.headers);

    res
      .status(result.statusCode)
      .cookie("refreshToken", result.refreshToken || "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge:
          (parseInt(process.env.REFRESH_TOKEN_EXPIRY, 10) || 7) *
          24 *
          60 *
          60 *
          1000,
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
    const result = await authViewModel.login(
      req.body,
      toBetterAuthHeaders(req),
    );

    applyBetterAuthHeaders(res, result.headers);

    res
      .status(result.statusCode)
      .cookie("refreshToken", result.refreshToken || "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge:
          (parseInt(process.env.REFRESH_TOKEN_EXPIRY, 10) || 7) * 24 * 60 * 60 * 1000,
      })
      .json({
        success: result.success,
        data: result.data,
        message: result.message,
      });
  }),
);

router.get(
  "/session",
  errorHandler(async (req, res) => {
    const result = await authViewModel.getSession({
      headers: toBetterAuthHeaders(req),
    });

    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

router.get(
  "/google",
  errorHandler(async (req, res) => {
    const result = await authViewModel.startGoogleOAuth(
      toBetterAuthHeaders(req),
      req.query.token,
    );

    applyBetterAuthHeaders(res, result.headers);

    if (result.data?.url) {
      return res.redirect(result.statusCode, result.data.url);
    }

    return res.status(result.statusCode).json({
      success: true,
      data: result.data,
    });
  }),
);

router.post(
  "/refresh",
  errorHandler(async (req, res) => {
    const result = await authViewModel.refresh({
      refreshToken: req.cookies.refreshToken,
      headers: toBetterAuthHeaders(req),
    });

    res.status(result.statusCode).json({
      success: result.success,
      data: result.data,
    });
  }),
);

router.post(
  "/logout",
  authMiddleware,
  errorHandler(async (req, res) => {
    const result = await authViewModel.logout({
      userId: req.user?.id,
      headers: toBetterAuthHeaders(req),
    });

    clearLegacyRefreshCookie(res);
    applyBetterAuthHeaders(res, result.headers);

    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
    });
  }),
);

export default router;
