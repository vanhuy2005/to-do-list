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
        speechState.startListening({
          language: "vi-VN",
          continuous: true,
          interimResults: true,
        });
        forceUpdate({});
      },
      stopRecording: () => {
        speechState.listening = false;
        speechState.stopListening();
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("VoiceMicButton", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  beforeEach(() => {
    if (globalThis.navigator) {
      Object.defineProperty(globalThis.navigator, 'maxTouchPoints', { value: 0, configurable: true });
      Object.defineProperty(globalThis.navigator, 'msMaxTouchPoints', { value: 0, configurable: true });
    }
    if (globalThis.window) {
      delete globalThis.window.ontouchstart;
    }

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

    expect(onDraftReady).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: "Gui bao cao" }),
      "nhac minh gui bao cao",
      "PREVIEW"
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
        expect(onDraftReady).toHaveBeenLastCalledWith(
          expect.objectContaining({
            description: "Sprint 3 summary",
            status: "doing",
          }),
          "dang viet bao cao sprint 3",
          "PREVIEW"
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

  // ── Error: AI enrichment failed ─────────────────────────────────────────

  it("falls back to minimal draft when AI enrichment fails (e.g. 429)", async () => {
    taskService.createVoiceDraft.mockRejectedValue(new Error("Rate limit / System busy"));

    const onDraftReady = vi.fn();
    const { rerender } = render(<VoiceMicButton onDraftReady={onDraftReady} />);

    fireEvent.click(screen.getByRole("button", { name: /bat dau ghi am/i }));
    speechState.transcript = "gui email cho sep";
    fireEvent.click(screen.getByRole("button", { name: /dang nghe/i }));
    rerender(<VoiceMicButton onDraftReady={onDraftReady} />);

    await waitFor(
      () => {
        expect(onDraftReady).toHaveBeenLastCalledWith(
          expect.objectContaining({ title: "gui email cho sep" }),
          "gui email cho sep",
          "PREVIEW"
        );
      },
      { timeout: 2500 }
    );
  });
});
