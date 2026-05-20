import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Input:  audioBuffer (Buffer), mimeType (string), requestId (string)
 * Output: { transcript: string, language: string, duration_ms: number }
 * Throws: STTError với code 'GROQ_TIMEOUT' | 'GROQ_REJECTED' | 'EMPTY_TRANSCRIPT'
 */
export async function transcribeAudio({ audioBuffer, mimeType, requestId }) {
  const startAt = Date.now();

  // Lấy extension từ mimeType (ví dụ: audio/webm -> webm)
  const extension = mimeType?.split('/')[1]?.split(';')[0] || 'webm';
  const audioFile = new File([audioBuffer], `audio_${requestId}.${extension}`, {
    type: mimeType || 'audio/webm',
  });

  let response;
  try {
    response = await Promise.race([
      groq.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-large-v3',
        response_format: 'verbose_json', // trả về language + duration
        language: undefined,             // auto-detect: tiếng Việt & Anh đều ok
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new STTError('Groq timeout', 'GROQ_TIMEOUT')), 15_000)
      ),
    ]);
  } catch (err) {
    if (err instanceof STTError) throw err;
    throw new STTError(`Groq rejected: ${err.message}`, 'GROQ_REJECTED');
  }

  const transcript = response.text?.trim();
  if (!transcript) {
    throw new STTError('Empty transcript returned by Whisper', 'EMPTY_TRANSCRIPT');
  }

  console.info({
    event: 'stt.complete',
    request_id: requestId,
    detected_language: response.language,
    duration_ms: Date.now() - startAt,
    transcript_chars: transcript.length,
  });

  return {
    transcript,
    language: response.language ?? 'unknown',
    duration_ms: Date.now() - startAt,
  };
}

export class STTError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = 'STTError';
  }
}
