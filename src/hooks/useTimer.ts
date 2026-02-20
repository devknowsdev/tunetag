import { useRef, useState, useCallback, useEffect } from 'react';

export interface UseTimerReturn {
  elapsedSeconds: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  setSeconds: (n: number) => void;
}

export function useTimer(
  onTick?: (seconds: number) => void
): UseTimerReturn {
  // Use a ref for the "live" elapsed count so interval ticks don't cause
  // extra re-renders. State is synced once per second for display.
  const elapsedRef = useRef<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    setIsRunning(true);
    clearTick();
    intervalRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsedSeconds(elapsedRef.current);
      onTick?.(elapsedRef.current);
    }, 1000);
  }, [clearTick, onTick]);

  const pause = useCallback(() => {
    setIsRunning(false);
    clearTick();
  }, [clearTick]);

  const reset = useCallback(() => {
    clearTick();
    elapsedRef.current = 0;
    setElapsedSeconds(0);
    setIsRunning(false);
  }, [clearTick]);

  // Restore elapsed seconds from persisted state
  const setSeconds = useCallback((n: number) => {
    elapsedRef.current = n;
    setElapsedSeconds(n);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTick();
  }, [clearTick]);

  return { elapsedSeconds, isRunning, start, pause, reset, setSeconds };
}
