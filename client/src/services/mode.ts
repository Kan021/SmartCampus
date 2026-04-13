/**
 * mode.ts — Frontend-only mode. No backend needed.
 * SmartCampus runs entirely in the browser using localStorage.
 * All API calls go through mockApi.ts (local data store).
 */

const MODE_KEY = 'sc_offline_mode';

// Always offline — no backend hosted
let _offline = true;

/** Always returns true — this app is frontend-only */
export function isOffline(): boolean {
  return true;
}

/** No-op: always resolves to offline=true immediately (no network ping) */
export async function detectMode(): Promise<boolean> {
  _offline = true;
  localStorage.setItem(MODE_KEY, '1');
  console.info('[SmartCampus] 🎓 Frontend-only mode — all data stored locally');
  return true;
}

/** No-op kept for API compatibility */
export function forceOffline(_v = true) {
  _offline = true;
}
