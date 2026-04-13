/**
 * mode.ts — Detects backend availability and activates mock mode silently.
 * The rest of the app never needs to know which mode is active.
 */

const HEALTH_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'}/health`;
const MODE_KEY   = 'sc_offline_mode';

let _offline: boolean | null = null;

/** Returns true if we're running in offline/mock mode */
export function isOffline(): boolean {
  if (_offline !== null) return _offline;
  // During SSR or before check: default to cached value
  return localStorage.getItem(MODE_KEY) === '1';
}

/** Ping the backend; set offline mode if unreachable */
export async function detectMode(): Promise<boolean> {
  try {
    const res = await fetch(HEALTH_URL, { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(3000) });
    _offline = !res.ok;
  } catch {
    _offline = true;
  }
  localStorage.setItem(MODE_KEY, _offline ? '1' : '0');
  if (_offline) console.info('[SmartCampus] 🔌 Offline mode active — using local data store');
  return _offline;
}

/** Force offline mode (useful for testing) */
export function forceOffline(v = true) {
  _offline = v;
  localStorage.setItem(MODE_KEY, v ? '1' : '0');
}
