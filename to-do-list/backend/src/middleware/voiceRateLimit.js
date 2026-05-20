import "../config/env.js";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const windowMs = toNumber(process.env.VOICE_RATE_LIMIT_WINDOW_MS, 60 * 1000);
const max = toNumber(process.env.VOICE_RATE_LIMIT_MAX, 60);

const rateLimitPayload = {
  success: false,
  error: {
    code: "VOICE_RATE_LIMIT",
    message: "Quá nhiều yêu cầu. Vui lòng chờ một lúc rồi thử lại.",
  },
};

export const voiceRateLimit = rateLimit({
  windowMs,
  max,
  keyGenerator: (req) => req.user?.id?.toString() || ipKeyGenerator(req),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.set("Retry-After", String(Math.ceil(windowMs / 1000)));
    res.status(429).json(rateLimitPayload);
  },
});
