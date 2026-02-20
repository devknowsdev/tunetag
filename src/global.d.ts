// Ambient declarations for the Spotify Web Playback SDK.
// export {} makes this a module so `declare global` correctly augments Window.
// All Spotify types live inside declare global so they are visible project-wide.
export {};

declare global {
  interface SpotifyPlayerInit {
    name: string;
    getOAuthToken: (cb: (token: string) => void) => void;
    volume?: number;
  }

  interface SpotifyWebPlaybackState {
    paused: boolean;
    position: number;
    duration: number;
    track_window: {
      current_track: {
        name: string;
        artists: Array<{ name: string }>;
      };
    };
  }

  interface SpotifyPlayerError {
    message: string;
  }

  interface SpotifyReadyEvent {
    device_id: string;
  }

  interface SpotifyPlayer {
    connect(): Promise<boolean>;
    disconnect(): void;
    addListener(event: 'ready', cb: (event: SpotifyReadyEvent) => void): void;
    addListener(event: 'not_ready', cb: (event: SpotifyReadyEvent) => void): void;
    addListener(event: 'player_state_changed', cb: (state: SpotifyWebPlaybackState | null) => void): void;
    addListener(event: 'initialization_error', cb: (err: SpotifyPlayerError) => void): void;
    addListener(event: 'authentication_error', cb: (err: SpotifyPlayerError) => void): void;
    addListener(event: 'account_error', cb: (err: SpotifyPlayerError) => void): void;
    removeListener(event: string, cb?: (...args: unknown[]) => void): void;
    getCurrentState(): Promise<SpotifyWebPlaybackState | null>;
    setVolume(volume: number): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    seek(positionMs: number): Promise<void>;
  }

  interface SpotifyNamespace {
    Player: new (init: SpotifyPlayerInit) => SpotifyPlayer;
  }

  interface Window {
    Spotify: SpotifyNamespace;
    onSpotifyWebPlaybackSDKReady: () => void;
    __spotifySDKReady: boolean;
  }
}
