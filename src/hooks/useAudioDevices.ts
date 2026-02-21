// useAudioDevices — enumerates available microphone inputs and persists the
// user's selection to localStorage so it survives page reloads.
//
// NOTE: navigator.mediaDevices.enumerateDevices() only returns device *labels*
// once microphone permission has been granted by the browser. The permission
// pre-flight in startRecording() (PhaseListening.tsx) ensures that has happened
// before this hook is ever used to show a device picker.
//
// NOTE: Chrome's Web Speech API does not reliably honour a specific deviceId —
// it tends to use the system default regardless of what getUserMedia opens.
// We still pass the deviceId as best-effort, but users may need to change their
// system default input in macOS Sound settings for a guaranteed switch.

import { useState, useEffect } from 'react';

export const MIC_DEVICE_KEY = 'tunetag_mic_device';

export interface UseAudioDevicesReturn {
  /** All available audio input devices. Empty until permission is granted. */
  devices: MediaDeviceInfo[];
  /** The currently selected deviceId, or '' for system default. */
  selectedDeviceId: string;
  /** Persist a new device selection. */
  setSelectedDeviceId: (id: string) => void;
}

export function useAudioDevices(): UseAudioDevicesReturn {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceIdState] = useState<string>(
    () => localStorage.getItem(MIC_DEVICE_KEY) ?? ''
  );

  async function refresh() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === 'audioinput'));
    } catch {
      // Permission not yet granted or API unavailable — ignore silently.
    }
  }

  useEffect(() => {
    refresh();
    navigator.mediaDevices.addEventListener('devicechange', refresh);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', refresh);
    };
  }, []);

  function setSelectedDeviceId(id: string) {
    localStorage.setItem(MIC_DEVICE_KEY, id);
    setSelectedDeviceIdState(id);
  }

  return { devices, selectedDeviceId, setSelectedDeviceId };
}
