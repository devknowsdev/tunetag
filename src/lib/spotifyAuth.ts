// PKCE OAuth helpers for Spotify — no external libraries.
// All crypto via the Web Crypto API (available in all modern browsers).

const CLIENT_ID = '9f5cd6650d1843ca8b9829aacaa31d4f';
const REDIRECT_URI = window.location.origin + '/callback';
const SCOPES =
  'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state';

const VERIFIER_KEY = 'spotify_code_verifier';
const TOKEN_KEY = 'spotify_access_token';
const EXPIRY_KEY = 'spotify_token_expiry';

// Characters allowed in a PKCE code verifier per RFC 7636 §4.1
const VERIFIER_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

export function generateCodeVerifier(): string {
  const array = new Uint8Array(128);
  crypto.getRandomValues(array);
  // Map each byte into the allowed set via modulo.
  // VERIFIER_CHARS.length = 66; modulo bias is negligible for this use case.
  return Array.from(
    array,
    (byte) => VERIFIER_CHARS[byte % VERIFIER_CHARS.length]
  ).join('');
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  // SHA-256 always produces exactly 32 bytes — safe to spread into String.fromCharCode
  const hashBuffer: ArrayBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  const base64 = btoa(String.fromCharCode(...hashArray));
  // Convert standard base64 → base64url: no padding, URL-safe chars
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function initiateSpotifyLogin(): Promise<void> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);

  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function handleSpotifyCallback(): Promise<boolean> {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (!code) return false;

  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) return false;

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });

  let response: Response;
  try {
    response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch {
    return false;
  }

  if (!response.ok) return false;

  const data: unknown = await response.json();

  // Type-narrow the JSON response — strict mode forbids implicit any
  if (
    typeof data !== 'object' ||
    data === null ||
    !('access_token' in data) ||
    !('expires_in' in data) ||
    typeof (data as Record<string, unknown>)['access_token'] !== 'string' ||
    typeof (data as Record<string, unknown>)['expires_in'] !== 'number'
  ) {
    return false;
  }

  const typed = data as { access_token: string; expires_in: number };
  sessionStorage.setItem(TOKEN_KEY, typed.access_token);
  sessionStorage.setItem(
    EXPIRY_KEY,
    String(Date.now() + typed.expires_in * 1000)
  );

  // Strip ?code= from URL without triggering a page reload
  window.history.replaceState({}, document.title, window.location.pathname);

  return true;
}

export function getStoredToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiryRaw = sessionStorage.getItem(EXPIRY_KEY);

  if (!token || !expiryRaw) return null;

  const expiry = parseInt(expiryRaw, 10);
  if (isNaN(expiry) || Date.now() >= expiry) return null;

  return token;
}
