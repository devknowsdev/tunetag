import { useState, useRef, useEffect } from 'react';
import { useAudioRecorder, useDictation } from './index';
import { INITIAL_DICTATION } from '../components/DictationOverlay';
import type { DictationState } from '../components/DictationOverlay';

interface UseDictationFlowOptions {
  onComplete: (transcript: string, timestamp: string, wasRunning: boolean) => void;
  onRecordingReady: (blob: Blob, mimeType: string, timestamp: string, transcript: string) => void;
  onOpenRecordingsPanel: () => void;
}

export function useDictationFlow({
  onComplete,
  onRecordingReady,
  onOpenRecordingsPanel,
}: UseDictationFlowOptions) {
  const [state, setState] = useState<DictationState>(INITIAL_DICTATION);
  const capturedTsRef = useRef('');

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const dictation = useDictation();

  const recorder = useAudioRecorder({
    onRecordingReady: (blob, mimeType) => {
      setState((p) => ({ ...p, status: 'finalizing' }));
      onRecordingReady(blob, mimeType, capturedTsRef.current, dictation.finalTranscript);
      setState((p) => ({ ...p, status: 'audio_saved' }));
      setTimeout(() => {
        setState(INITIAL_DICTATION);
        dictation.reset();
        onOpenRecordingsPanel();
      }, 2000);
    },
  });

  // Expose mic stream for MicLevelMeter
  const micStreamRef = useRef<MediaStream | null>(null);
  useEffect(() => { micStreamRef.current = recorder.micStream; }, [recorder.micStream]);

  // Mirror speech error into state
  useEffect(() => {
    if (dictation.error) {
      setState((p) => ({ ...p, status: 'error', error: dictation.error ?? undefined }));
    }
  }, [dictation.error]);

  // Mirror live transcript into state
  useEffect(() => {
    setState((p) =>
      p.status === 'recording'
        ? { ...p, transcript: dictation.liveTranscript, noSpeechHint: dictation.noSpeechHint }
        : p
    );
  }, [dictation.liveTranscript, dictation.noSpeechHint]);

  function begin(capturedTimestamp: string, capturedWasRunning: boolean) {
    setState({ ...INITIAL_DICTATION, status: 'awaiting_manual_pause', capturedTimestamp, capturedWasRunning });
    dictation.reset();
  }

  async function startRecording() {
    if (!isSupported) {
      setState((p) => ({ ...p, status: 'error', error: 'Speech recognition not supported. Use Chrome or Edge.' }));
      return;
    }

    capturedTsRef.current = state.capturedTimestamp;

    const savedDeviceId = localStorage.getItem('tunetag_mic_device') ?? '';
    const audioConstraint: MediaTrackConstraints | boolean = savedDeviceId
      ? { deviceId: { exact: savedDeviceId } }
      : true;

    const result = await recorder.startRecording(audioConstraint);
    if ('error' in result) {
      if (savedDeviceId) localStorage.removeItem('tunetag_mic_device');
      setState((p) => ({ ...p, status: 'error', error: result.error }));
      return;
    }

    dictation.startDictation(result.stream);
    setState((p) => ({ ...p, status: 'recording', transcript: '', noSpeechHint: false }));
  }

  function stopRecording() {
    dictation.stopDictation();
    recorder.stopRecording();
  }

  function accept() {
    const { capturedTimestamp, capturedWasRunning } = state;
    onComplete(dictation.finalTranscript || state.transcript, capturedTimestamp, capturedWasRunning);
    setState(INITIAL_DICTATION);
    dictation.reset();
  }

  function cancel() {
    dictation.stopDictation();
    recorder.cancelRecording();
    setState(INITIAL_DICTATION);
    dictation.reset();
  }

  return { state, isSupported, begin, startRecording, stopRecording, accept, cancel, micStreamRef };
}
