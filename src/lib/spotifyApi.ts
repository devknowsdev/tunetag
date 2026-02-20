// Simple fetch wrappers for the Spotify Web API.
// No React dependency — called from components or hooks directly.

const API_BASE = 'https://api.spotify.com/v1';

export async function transferPlayback(
  deviceId: string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/me/player`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ device_ids: [deviceId], play: false }),
  });

  // Spotify returns 204 No Content on success
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`transferPlayback failed: ${response.status} ${text}`);
  }
}

export async function playTrack(
  spotifyId: string,
  deviceId: string,
  token: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [`spotify:track:${spotifyId}`] }),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`playTrack failed: ${response.status} ${text}`);
  }
}
