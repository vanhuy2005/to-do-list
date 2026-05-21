import { useState, useRef, useCallback } from 'react';
import api from '@/lib/axios';

const SUPPORTED_MIME = typeof MediaRecorder !== 'undefined' 
  ? [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ].find(type => MediaRecorder.isTypeSupported(type))
  : null;

const MAX_DURATION_MS = 60_000;

// Browser SpeechRecognition for Real-time UI Preview
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function useVoiceRecorder({ onTranscript, onError, onInterimTranscript }) {
  const [state, setState] = useState('IDLE'); // IDLE | RECORDING | TRANSCRIBING
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timeoutRef = useRef(null);
  const recognitionRef = useRef(null);
  const startTimeRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      startTimeRef.current = Date.now();

      chunksRef.current = [];
      const recorder = new MediaRecorder(streamRef.current, {
        mimeType: SUPPORTED_MIME,
        audioBitsPerSecond: 64_000,
      });

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        clearTimeout(timeoutRef.current);
        const duration = Date.now() - (startTimeRef.current || 0);
        
        setState('TRANSCRIBING');

        const audioBlob = new Blob(chunksRef.current, { type: SUPPORTED_MIME });
        
        try {
          // Bảo vệ: Nếu audio quá ngắn hoặc rỗng
          if (audioBlob.size < 100 || duration < 500) {
             throw new Error('Nội dung quá ngắn, vui lòng nói lâu hơn.');
          }

          // Gửi audio lên server để lấy STT chất lượng cao (Whisper)
          const transcript = await sendToSTT(audioBlob);
          onTranscript(transcript);
        } catch (err) {
          onError(err);
        } finally {
          setState('IDLE');
          startTimeRef.current = null;
        }
      };

      // --- Setup Browser Recognition for real-time preview ---
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'vi-VN';

        recognition.onresult = (event) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            interimTranscript += event.results[i][0].transcript;
          }
          // Callback để UI hiển thị chữ ngay lập tức
          onInterimTranscript?.(interimTranscript);
        };

        recognition.onerror = (event) => {
          console.warn('Browser SpeechRecognition error:', event.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setState('RECORDING');

      timeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, MAX_DURATION_MS);
    } catch (err) {
      console.error('STT Error:', err);
      onError(new Error('Microphone access denied or unavailable'));
      setState('IDLE');
    }
  }, [onTranscript, onError, onInterimTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  return { state, startRecording, stopRecording };
}

async function sendToSTT(audioBlob) {
  const formData = new FormData();
  
  // Lấy extension chuẩn từ MIME type
  const extension = SUPPORTED_MIME?.split(';')[0]?.split('/')[1] || 'webm';
  formData.append('audio', audioBlob, `recording.${extension}`);

  try {
    const response = await api.post('/voice/stt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 20_000,
    });

    // Axios interceptor đã unwrap response.data, nên response ở đây là body
    const transcript = response?.transcript;

    if (typeof transcript !== 'string' || !transcript.trim()) {
      throw new Error('Không thể nhận diện được giọng nói. Vui lòng thử lại.');
    }

    return transcript.trim();
  } catch (err) {
    // Ưu tiên message thân thiện nếu có lỗi từ logic ném ra
    const errorMessage = err.response?.data?.error || err.message;
    console.error('sendToSTT error:', errorMessage);
    throw err;
  }
}
