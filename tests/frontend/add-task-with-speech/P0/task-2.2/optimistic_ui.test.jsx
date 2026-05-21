import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import VoiceMicButton from '../../../../../to-do-list/frontend/src/components/VoiceMicButton.jsx';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as voiceApi from '@/services/voiceApi';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

// Mock hooks
vi.mock('@/hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: vi.fn(),
}));

vi.mock('@/services/voiceApi', () => ({
  createVoiceDraft: vi.fn(),
}));

describe('Optimistic UI State Machine', () => {
  let mockOnTranscript;

  beforeEach(() => {
    vi.clearAllMocks();
    useVoiceRecorder.mockImplementation(({ onTranscript }) => {
      mockOnTranscript = onTranscript;
      return {
        state: 'IDLE',
        startRecording: vi.fn(),
        stopRecording: vi.fn(),
      };
    });
  });

  it('should trigger onDraftReady with ENRICHING state immediately after transcript', async () => {
    const onDraftReady = vi.fn();
    voiceApi.createVoiceDraft.mockReturnValue(new Promise(() => {})); // Never resolves to keep in ENRICHING

    render(<VoiceMicButton onDraftReady={onDraftReady} />);
    
    await act(async () => {
      await mockOnTranscript('nhắc tôi đi họp');
    });

    expect(onDraftReady).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'nhắc tôi đi họp' }),
      'nhắc tôi đi họp',
      'ENRICHING'
    );
  });

  it('should trigger onDraftReady with PREVIEW state after AI enrichment succeeds', async () => {
    const onDraftReady = vi.fn();
    const enrichedData = { title: 'Họp Team', tags: ['work'] };
    voiceApi.createVoiceDraft.mockResolvedValue(enrichedData);

    render(<VoiceMicButton onDraftReady={onDraftReady} />);
    
    await act(async () => {
      await mockOnTranscript('đi họp');
    });

    await waitFor(() => {
      expect(onDraftReady).toHaveBeenLastCalledWith(
        expect.objectContaining({ title: 'Họp Team', tags: ['work'] }),
        'đi họp',
        'PREVIEW'
      );
    });
  });

  it('should fallback to PREVIEW state even if AI enrichment fails', async () => {
    const onDraftReady = vi.fn();
    voiceApi.createVoiceDraft.mockRejectedValue(new Error('AI Busy'));

    render(<VoiceMicButton onDraftReady={onDraftReady} />);
    
    await act(async () => {
      await mockOnTranscript('đi họp');
    });

    await waitFor(() => {
      expect(onDraftReady).toHaveBeenLastCalledWith(
        expect.objectContaining({ title: 'đi họp' }),
        'đi họp',
        'PREVIEW'
      );
    });
  });
});
