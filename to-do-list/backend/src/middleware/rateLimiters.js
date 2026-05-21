import rateLimit from "express-rate-limit";

// Rate limiter for user avatar upload & delete actions: Max 10 requests per 1 hour per user
export const avatarRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
  validate: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Bạn đã vượt quá giới hạn 10 lần tải/xóa ảnh đại diện trong 1 giờ. Vui lòng thử lại sau.",
    },
  },
});

// Rate limiter for public unsubscribe endpoint: Max 5 requests per 1 minute per IP
export const unsubscribeRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Quá nhiều yêu cầu hủy đăng ký từ địa chỉ IP này. Vui lòng thử lại sau 1 phút.",
    },
  },
});
