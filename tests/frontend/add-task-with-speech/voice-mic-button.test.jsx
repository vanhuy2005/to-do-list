import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import VoiceMicButton from "@/components/VoiceMicButton";
import taskService from "@/services/taskService";

// ─── Mock: react-speech-recognition ──────────────────────────────────────────

const speechState = vi.hoisted(() => ({
  listening: false,
  transcript: "",
  finalTranscript: "",
  resetTranscript: vi.fn(),
  startListening: vi.fn(),
  stopListening: vi.fn(),
  abortListening: vi.fn(),
}));

speechState.resetTranscript.mockImplementation(() => {
  speechState.transcript = "";
  speechState.finalTranscript = "";
});

speechState.startListening.mockImplementation(() => {
  speechState.listening = true;
});

speechState.stopListening.mockImplementation(() => {
  speechState.listening = false;
});

vi.mock("react-speech-recognition", () => ({
  default: {
    startListening: speechState.startListening,
    stopListening: speechState.stopListening,
    abortListening: speechState.abortListening,
  },
  useSpeechRecognition: () => ({
    transcript: speechState.transcript,
    finalTranscript: speechState.finalTranscript,
    listening: speechState.listening,
    resetTranscript: speechState.resetTranscript,
    browserSupportsSpeechRecognition: true,
    isMicrophoneAvailable: true,
  }),
}));

// ─── Mock: taskService ────────────────────────────────────────────────────────

vi.mock("@/services/taskService", () => ({
  default: {
    createVoiceDraft: vi.fn(),
  },
}));

vi.mock("@/services/voiceApi", () => ({
  createVoiceDraft: async (text) => {
    const { default: taskService } = await import("@/services/taskService");
    const res = await taskService.createVoiceDraft({
      text,
      timestamp: new Date().toISOString(),
    });
    return res.data || res;
  }
}));

vi.mock("@/hooks/useVoiceRecorder", () => ({
  useVoiceRecorder: (callbacks) => {
    const [, forceUpdate] = React.useState({});
    const state = speechState.listening ? "RECORDING" : "IDLE";

    return {
      state,
      startRecording: () => {
        speechState.listening = true;
        forceUpdate({});
      },
      stopRecording: () => {
        speechState.listening = false;
        forceUpdate({});
        const text = speechState.finalTranscript || speechState.transcript;
        const trimmed = (text || "").trim();
        if (trimmed.length < 3) {
          callbacks.onError(new Error("khong nghe ro"));
        } else {
          callbacks.onTranscript(trimmed);
        }
      },
    };
  }
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a 429 Axios-style error with optional Retry-After header. */
const make429Error = (retryAfter = 5, message = "He thong ban") => {
  const error = new Error("Request failed with status code 429");
  error.response = {
    status: 429,
    headers: { "retry-after": String(retryAfter) },
    data: {
      success: false,
      error: { code: "AI_RATE_LIMIT", message },
    },
  };
  return error;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("VoiceMicButton", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  beforeEach(() => {
    speechState.listening = false;
    speechState.transcript = "";
    speechState.finalTranscript = "";
    taskService.createVoiceDraft.mockReset();
    speechState.resetTranscript.mockClear();
    speechState.startListening.mockClear();
    speechState.stopListening.mockClear();
  });

  // ── Happy path ──────────────────────────────────────────────────────────

  it("starts on first desktop click and processes on second click", async () => {
    taskService.createVoiceDraft.mockResolvedValue({
      data: {
        title: "Gui bao cao",
        priority: "medium",
        status: null,
        confidence: 0.8,
      },
    });

    const onDraftReady = vi.fn();
    const { rerender } = render(<VoiceMicButton onDraftReady={onDraftReady} />);

    fireEvent.click(screen.getByRole("button", { name: /bat dau ghi am/i }));
    rerender(<VoiceMicButton onDraftReady={onDraftReady} />);

    expect(speechState.startListening).toHaveBeenCalledWith({
      language: "vi-VN",
      continuous: true,
      interimResults: true,
    });

    speechState.transcript = "nhac minh gui bao cao";

    fireEvent.click(screen.getByRole("button", { name: /dang nghe/i }));
    rerender(<VoiceMicButton onDraftReady={onDraftReady} />);

    await waitFor(
      () => {
        expect(taskService.createVoiceDraft).toHaveBeenCalledWith({
          text: "nhac minh gui bao cao",
          timestamp: expect.any(String),
        });
      },
      { timeout: 2500 },
    );

    expect(onDraftReady).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Gui bao cao" }),
      "nhac minh gui bao cao",
    );
  });

  it("passes through description and status from AI draft", async () => {
    taskService.createVoiceDraft.mockResolvedValue({
      data: {
        title: "Viet bao cao",
        description: "Sprint 3 summary",
        status: "doing",
        priority: "high",
        confidence: 0.9,
      },
    });

    const onDraftReady = vi.fn();
    const { rerender } = render(<VoiceMicButton onDraftReady={onDraftReady} />);

    fireEvent.click(screen.getByRole("button", { name: /bat dau ghi am/i }));
    speechState.transcript = "dang viet bao cao sprint 3";
    fireEvent.click(screen.getByRole("button", { name: /dang nghe/i }));
    rerender(<VoiceMicButton onDraftReady={onDraftReady} />);

    await waitFor(
      () => {
        expect(onDraftReady).toHaveBeenCalledWith(
          expect.objectContaining({
            description: "Sprint 3 summary",
            status: "doing",
          }),
          "dang viet bao cao sprint 3",
        );
      },
      { timeout: 2500 },
    );
  });

  // ── Error: transcript too short ─────────────────────────────────────────

  it("shows error when transcript is too short", async () => {
    const onDraftReady = vi.fn();
    const { rerender } = render(<VoiceMicButton onDraftReady={onDraftReady} />);

    fireEvent.click(screen.getByRole("button", { name: /bat dau ghi am/i }));
    rerender(<VoiceMicButton onDraftReady={onDraftReady} />);

    fireEvent.click(screen.getByRole("button", { name: /dang nghe/i }));
    rerender(<VoiceMicButton onDraftReady={onDraftReady} />);

    expect(
      await screen.findByText(/khong nghe ro/i, {}, { timeout: 2500 }),
    ).toBeInTheDocument();
  });

  it("shows retry countdown when receiving a 429 response", async () => {
    // Use real timers — inject a short SETTLE_MS by mocking the service to
    // reject immediately so we only wait the settle timeout (1100ms max).
    taskService.createVoiceDraft.mockRejectedValue(make429Error(5));

    const onDraftReady = vi.fn();
    const { rerender } = render(<VoiceMicButton onDraftReady={onDraftReady} />);

    fireEvent.click(screen.getByRole("button", { name: /bat dau ghi am/i }));
    speechState.transcript = "gui email cho sep";
    fireEvent.click(screen.getByRole("button", { name: /dang nghe/i }));
    rerender(<VoiceMicButton onDraftReady={onDraftReady} />);

    // Countdown text should appear after settle (1000ms) + async processing
    expect(
      await screen.findByText(/tu dong thu lai/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  }, 10000);

  it("auto-retries after countdown and succeeds on second attempt", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // First call → 429, second call → success
    taskService.createVoiceDraft
      .mockRejectedValueOnce(make429Error(2))
      .mockResolvedValueOnce({
        data: { title: "Gui email", priority: "medium", confidence: 0.8 },
      });

    const onDraftReady = vi.fn();
    const { rerender } = render(<VoiceMicButton onDraftReady={onDraftReady} />);

    fireEvent.click(screen.getByRole("button", { name: /bat dau ghi am/i }));
    speechState.transcript = "gui email cho sep";
    fireEvent.click(screen.getByRole("button", { name: /dang nghe/i }));
    rerender(<VoiceMicButton onDraftReady={onDraftReady} />);

    // advance settle + async rejection handling
    await vi.advanceTimersByTimeAsync(1200);
    // advance countdown (2s) + a little margin
    await vi.advanceTimersByTimeAsync(2200);

    await waitFor(
      () => {
        expect(taskService.createVoiceDraft).toHaveBeenCalledTimes(2);
      },
      { timeout: 1000 },
    );
  }, 15000);


  // ── Late final transcript ────────────────────────────────────────────────

  it("uses late final transcript when it arrives after stop", async () => {
    taskService.createVoiceDraft.mockResolvedValue({
      data: { title: "Mua sua", priority: "medium", confidence: 0.8 },
    });

    const onDraftReady = vi.fn();
    const { rerender } = render(<VoiceMicButton onDraftReady={onDraftReady} />);

    fireEvent.click(screen.getByRole("button", { name: /bat dau ghi am/i }));
    rerender(<VoiceMicButton onDraftReady={onDraftReady} />);

    fireEvent.click(screen.getByRole("button", { name: /dang nghe/i }));
    rerender(<VoiceMicButton onDraftReady={onDraftReady} />);

    speechState.finalTranscript = "mua sua chieu nay";
    rerender(<VoiceMicButton onDraftReady={onDraftReady} />);

    await waitFor(
      () => {
        expect(taskService.createVoiceDraft).toHaveBeenCalledWith({
          text: "mua sua chieu nay",
          timestamp: expect.any(String),
        });
      },
      { timeout: 2500 },
    );

    expect(onDraftReady).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Mua sua" }),
      "mua sua chieu nay",
    );
  });
});
