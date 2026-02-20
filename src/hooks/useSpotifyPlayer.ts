// React hook that loads the Spotify Web Playback SDK and manages player state.
// Follows the useTimer.ts pattern: useRef for stable/non-rendering state,
// useState for rendered values, useCallback for stable callbacks, useEffect for cleanup.

import { useRef, useState, useCallback, useEffect } from 'react';

export interface UseSpotifyPlayerReturn {
  isReady: boolean;
  deviceId: string | null;
  isPlaying: boolean;
  position: number;          // ms
  duration: number;          // ms
  volume: number;            // 0–1
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (v: number) => Promise<void>;
  currentTrackName: string | null;
  currentArtistName: string | null;
}

export function useSpotifyPlayer(token: string | null): UseSpotifyPlayerReturn {
  // ── Stable refs — mutations do not trigger re-renders ──────────────────────
  const playerRef = useRef<SpotifyPlayer | null>(null);
  // ReturnType<typeof setInterval> is portable: number in browsers, NodeJS.Timer in Node.
  // Matches the exact pattern used in useTimer.ts.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sdkInjectedRef = useRef<boolean>(false);
  const playerCreatedRef = useRef<boolean>(false); // guard: create player only once

  // ── Rendered state ─────────────────────────────────────────────────────────
  const [isReady, setIsReady] = useState<boolean>(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [position, setPosition] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [currentTrackName, setCurrentTrackName] = useState<string | null>(null);
  const [currentArtistName, setCurrentArtistName] = useState<string | null>(null);

  // ── Position polling ───────────────────────────────────────────────────────
  // player_state_changed fires on play/pause/seek but NOT continuously during
  // playback — we need the 1s interval to drive the live position counter.

  const stopPolling = useCallback((): void => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback((): void => {
    if (intervalRef.current !== null) return; // already running

    intervalRef.current = setInterval((): void => {
      const player = playerRef.current;
      if (!player) return;

      player.getCurrentState()
        .then((state: SpotifyWebPlaybackState | null): void => {
          if (!state) {
            setIsPlaying(false);
            return;
          }
          setIsPlaying(!state.paused);
          setPosition(state.position);
          setDuration(state.duration);
          setCurrentTrackName(state.track_window.current_track.name);
          const firstArtist = state.track_window.current_track.artists[0];
          setCurrentArtistName(firstArtist?.name ?? null);
        })
        .catch((): void => {
          // Player disconnected or errored — do not crash the interval
        });
    }, 1000);
  }, [stopPolling]);

  // ── createPlayer ───────────────────────────────────────────────────────────
  // Extracted so it can be called from either onSpotifyWebPlaybackSDKReady
  // (token already available) or the token-watch effect (SDK already ready).
  // The playerCreatedRef guard ensures it only ever runs once.
  const createPlayer = useCallback((accessToken: string): void => {
    if (playerCreatedRef.current) return;
    playerCreatedRef.current = true;

    const player = new window.Spotify.Player({
      name: 'BeatPulse Annotator',
      volume: 0.8,
      getOAuthToken: (cb: (token: string) => void): void => {
        // Always use the latest token snapshot via closure over the ref below.
        // Not calling cb (expired) is preferable to calling with a stale token.
        if (accessToken) cb(accessToken);
      },
    });

    playerRef.current = player;

    player.addListener('ready', (event: SpotifyReadyEvent): void => {
      setDeviceId(event.device_id);
      setIsReady(true);
      startPolling();
    });

    player.addListener('not_ready', (_event: SpotifyReadyEvent): void => {
      setIsReady(false);
      stopPolling();
    });

    player.addListener(
      'player_state_changed',
      (state: SpotifyWebPlaybackState | null): void => {
        if (!state) return;
        setIsPlaying(!state.paused);
        setPosition(state.position);
        setDuration(state.duration);
        setCurrentTrackName(state.track_window.current_track.name);
        const firstArtist = state.track_window.current_track.artists[0];
        setCurrentArtistName(firstArtist?.name ?? null);
      }
    );

    player.addListener('initialization_error', (err: SpotifyPlayerError): void => {
      console.error('[SpotifyPlayer] initialization_error:', err.message);
    });

    player.addListener('authentication_error', (err: SpotifyPlayerError): void => {
      console.error('[SpotifyPlayer] authentication_error:', err.message);
    });

    player.addListener('account_error', (err: SpotifyPlayerError): void => {
      console.error('[SpotifyPlayer] account_error:', err.message);
    });

    player.connect().catch((err: unknown): void => {
      console.error('[SpotifyPlayer] connect failed:', err);
    });
  }, [startPolling, stopPolling]);

  // ── SDK script injection ───────────────────────────────────────────────────
  useEffect((): (() => void) => {
    if (sdkInjectedRef.current) return (): void => { /* already initialised */ };
    sdkInjectedRef.current = true;

    // The callback MUST be assigned before the script tag is injected.
    // If the SDK script is cached, the browser can fire onSpotifyWebPlaybackSDKReady
    // synchronously during appendChild — the race window is real.
    window.onSpotifyWebPlaybackSDKReady = (): void => {
      console.log('[SpotifyPlayer] onSpotifyWebPlaybackSDKReady fired');
      window.__spotifySDKReady = true;

      // Token may or may not be available yet. If it is, create the player
      // immediately. If not, the token-watch effect below will do it once the
      // token arrives.
      const currentToken = token;
      if (currentToken) {
        createPlayer(currentToken);
      } else {
        console.warn('[SpotifyPlayer] onSpotifyWebPlaybackSDKReady: no token yet, waiting for token-watch effect');
      }
    };

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    script.onload = (): void => {
      console.log('[SpotifyPlayer] SDK script onload fired');
    };
    document.body.appendChild(script);

    return (): void => {
      stopPolling();
      const player = playerRef.current;
      if (player) {
        player.disconnect();
        playerRef.current = null;
      }
      setIsReady(false);
      setDeviceId(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Token-watch effect ─────────────────────────────────────────────────────
  // Handles the race where the SDK callback fired before the token was available.
  // When token transitions from null to a real value, and the SDK is already
  // ready but no player has been created yet, create the player now.
  useEffect((): void => {
    if (!token) return;
    if (!window.__spotifySDKReady) return;
    if (playerCreatedRef.current) return;
    console.log('[SpotifyPlayer] Token-watch effect: SDK ready and token now available, creating player');
    createPlayer(token);
  }, [token, createPlayer]);

  // ── Player control callbacks ───────────────────────────────────────────────

  const play = useCallback(async (): Promise<void> => {
    await playerRef.current?.resume();
  }, []);

  const pause = useCallback(async (): Promise<void> => {
    await playerRef.current?.pause();
  }, []);

  const seek = useCallback(async (positionMs: number): Promise<void> => {
    await playerRef.current?.seek(positionMs);
  }, []);

  const setVolume = useCallback(async (v: number): Promise<void> => {
    const player = playerRef.current;
    if (!player) return;
    await player.setVolume(v);
    setVolumeState(v);
  }, []);

  return {
    isReady,
    deviceId,
    isPlaying,
    position,
    duration,
    volume,
    play,
    pause,
    seek,
    setVolume,
    currentTrackName,
    currentArtistName,
  };
}
