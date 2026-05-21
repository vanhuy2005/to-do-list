import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { transcribeAudio } from '../services/sttService.js';

const router = express.Router();

// Giới hạn: 25MB, chỉ accept audio/*
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) return cb(null, true);
    cb(new Error('Only audio files are accepted'));
  },
});

// POST /api/v1/voice/stt
router.post('/', upload.single('audio'), async (req, res) => {
  const requestId = uuidv4();

  if (!req.file) {
    return res.status(400).json({ error: 'No audio file received', code: 'NO_AUDIO' });
  }

  try {
    const result = await transcribeAudio({
      audioBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
      requestId,
    });
    return res.json({ request_id: requestId, ...result });
  } catch (err) {
    const statusMap = {
      GROQ_TIMEOUT: 504,
      GROQ_REJECTED: 502,
      EMPTY_TRANSCRIPT: 422,
    };
    return res.status(statusMap[err.code] ?? 500).json({
      error: err.message,
      code: err.code,
      request_id: requestId,
    });
  }
});

export default router;
