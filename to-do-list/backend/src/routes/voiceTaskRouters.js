import express from "express";
import { extractIntent } from "../services/intentService.js";
import { voiceRateLimit } from "../middleware/voiceRateLimit.js";
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.post("/", voiceRateLimit, async (req, res) => {
  const { text } = req.body || {};
  const requestId = uuidv4();

  if (!text || typeof text !== "string") {
    return res.status(400).json({
      success: false,
      error: { code: "MISSING_TEXT", message: "Thiếu nội dung giọng nói" },
    });
  }

  const sanitizedText = text.trim();
  if (sanitizedText.length < 3) {
    return res.status(400).json({
      success: false,
      error: { code: "VOICE_TOO_SHORT", message: "Nội dung quá ngắn" },
    });
  }

  try {
    // Gọi Intent Service - Đây là trung tâm của pipeline mới
    const enrichedTask = await extractIntent({
      transcript: sanitizedText,
      requestId,
    });

    return res.status(200).json({
      success: true,
      data: {
        ...enrichedTask,
        rawTranscript: sanitizedText,
        source: "voice",
        request_id: requestId,
        is_fallback: enrichedTask.confidence < 0.3,
      },
    });
  } catch (err) {
    console.error("[VoiceTask Error]", {
      request_id: requestId,
      message: err.message,
      stack: err.stack
    });

    // Xử lý các lỗi đặc thù từ Governor hoặc AI
    if (err.code === 'QUEUE_TIMEOUT') {
      return res.status(503).json({
        success: false,
        error: {
          code: "SERVICE_BUSY",
          message: "Hệ thống đang xử lý quá nhiều yêu cầu, vui lòng thử lại sau.",
        },
      });
    }

    // Lớp intentService đã có fallback cho AI failure, nên nếu lỗi ném ra đây 
    // thường là lỗi nghiêm trọng hơn (ví dụ: Zod validation fail trên cả fallback)
    return res.status(500).json({
      success: false,
      error: {
        code: "VOICE_TASK_ERROR",
        message: "Không thể xử lý yêu cầu. Vui lòng thử lại.",
      },
    });
  }
});

export default router;
