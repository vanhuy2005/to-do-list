/* eslint-disable react-refresh/only-export-components */
import { useState, useCallback, useRef, useMemo } from 'react';
import { MicIcon, AudioLinesIcon, Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { createVoiceDraft } from '@/services/voiceApi';

export const UI_STATES = {
  IDLE: 'IDLE',
  RECORDING: 'RECORDING',
  TRANSCRIBING: 'TRANSCRIBING',
  ENRICHING: 'ENRICHING',
  PREVIEW: 'PREVIEW',
  ERROR: 'ERROR',
};

const INITIAL_DRAFT = {
  title: '',
  description: '',
  dueDate: null,
  priority: 'medium',
  tags: [],
  confidence: null,
};

export default function VoiceMicButton({ onDraftReady, disabled = false }) {
  const [uiState, setUiState] = useState(UI_STATES.IDLE);
  const [error, setError] = useState(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const localDraftRef = useRef(INITIAL_DRAFT);

  // Detect if it's a touch device for "Hold-to-Talk" logic
  const isTouchDevice = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
  }, []);

  const handleTranscript = useCallback((transcript) => {
    setInterimTranscript(''); // Clear interim
    const optimisticDraft = { ...INITIAL_DRAFT, title: transcript };
    localDraftRef.current = optimisticDraft;
    onDraftReady?.(optimisticDraft, transcript, UI_STATES.ENRICHING);
    setUiState(UI_STATES.ENRICHING);

    // Perform the async AI enrichment in the background so we don't block
    (async () => {
      try {
        const enriched = await createVoiceDraft(transcript);
        const finalDraft = { ...optimisticDraft, ...enriched };
        localDraftRef.current = finalDraft;
        onDraftReady?.(finalDraft, transcript, UI_STATES.PREVIEW);
        setUiState(UI_STATES.IDLE);
      } catch (err) {
        console.warn('AI enrichment failed, showing minimal draft:', err.message);
        onDraftReady?.(optimisticDraft, transcript, UI_STATES.PREVIEW);
        setUiState(UI_STATES.IDLE);
      }
    })();
  }, [onDraftReady]);

  const recorderCallbacks = useMemo(() => ({
    onTranscript: handleTranscript,
    onInterimTranscript: (text) => setInterimTranscript(text),
    onError: (err) => {
      setError(err.message);
      setUiState(UI_STATES.ERROR);
    }
  }), [handleTranscript]);

  const { state: recorderState, startRecording, stopRecording } = useVoiceRecorder(recorderCallbacks);

  const displayState = uiState === UI_STATES.ENRICHING ? UI_STATES.ENRICHING : recorderState;

  // --- Handlers ---

  const handleActionStart = useCallback(() => {
    if (disabled || displayState === 'TRANSCRIBING' || displayState === 'ENRICHING') return;
    setError(null);
    setInterimTranscript('');
    startRecording();
  }, [disabled, displayState, startRecording]);

  const handleActionEnd = useCallback(() => {
    if (recorderState === 'RECORDING') {
      stopRecording();
    }
  }, [recorderState, stopRecording]);

  const handleClick = () => {
    if (!isTouchDevice) {
      if (recorderState === 'RECORDING') {
        stopRecording();
      } else {
        handleActionStart();
      }
    }
  };

  const statusText = displayState === 'RECORDING' 
    ? (isTouchDevice ? "Thả để gửi" : "Đang nghe... nhấn để dừng") 
    : displayState === 'TRANSCRIBING'
    ? "Đang chuyển âm..."
    : displayState === 'ENRICHING'
    ? "AI đang xử lý..."
    : (isTouchDevice ? "Giữ để nói" : "Nhấn để nói");

  return (
    <div className="relative flex items-center gap-3">
      {/* Real-time Preview Bubble */}
      {displayState === 'RECORDING' && interimTranscript && (
        <div className="absolute bottom-full left-0 mb-4 w-64 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="relative rounded-2xl bg-primary p-3 comic-border comic-shadow">
            <p className="text-xs font-black text-white italic line-clamp-3">
              "{interimTranscript}..."
            </p>
            {/* Bubble Arrow */}
            <div className="absolute -bottom-2 left-6 size-4 rotate-45 bg-primary border-r-4 border-b-4 border-border" />
          </div>
        </div>
      )}

      <Button
        type="button"
        size="icon-lg"
        aria-label={displayState === 'RECORDING' ? "dang nghe" : "bat dau ghi am"}
        disabled={disabled || displayState === 'TRANSCRIBING' || displayState === 'ENRICHING'}
        onClick={handleClick}
        onTouchStart={isTouchDevice ? handleActionStart : undefined}
        onTouchEnd={isTouchDevice ? handleActionEnd : undefined}
        onTouchCancel={isTouchDevice ? handleActionEnd : undefined}
        className={cn(
          "relative size-16 rounded-2xl transition-all duration-300",
          "comic-border comic-shadow comic-shadow-hover",
          displayState === 'RECORDING' && "scale-110 bg-primary ring-8 ring-primary/20",
          "active:scale-95 transition-transform"
        )}
      >
        {displayState === 'TRANSCRIBING' || displayState === 'ENRICHING' ? (
          <Loader2Icon className="size-7 animate-spin text-white" />
        ) : displayState === 'RECORDING' ? (
          <div className="voice-wave">
            <span className="voice-wave-bar bg-white" />
            <span className="voice-wave-bar bg-white" />
            <span className="voice-wave-bar bg-white" />
            <span className="voice-wave-bar bg-white" />
          </div>
        ) : (
          <MicIcon className="size-7 text-white" />
        )}
        
        {displayState === 'RECORDING' && (
          <div className="absolute -inset-1 rounded-2xl border-2 border-primary animate-ping opacity-50" />
        )}
      </Button>

      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Voice Intelligence</p>
        <p className={cn(
          "text-xs font-bold uppercase",
          displayState === 'RECORDING' ? "text-primary" : "text-foreground"
        )}>
          {statusText}
        </p>
      </div>

      {error && <p className="text-[10px] text-destructive font-black uppercase max-w-[100px] leading-tight">{error}</p>}
    </div>
  );
}
