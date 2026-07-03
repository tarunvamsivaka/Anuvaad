/**
 * useMultiplayer.ts
 *
 * FIX-17 (P1-09): Multiplayer collaboration is a planned feature — not yet
 * implemented on the backend. The previous version imported yjs and y-websocket
 * (2 large packages, ~350kB) that were never consumed by any component.
 *
 * This stub preserves the public API so the feature can be re-enabled later
 * by restoring the real implementation when:
 *   1. A production-ready Yjs WebSocket server is deployed.
 *   2. NEXT_PUBLIC_YJS_WEBSOCKET_URL is configured.
 *   3. yjs and y-websocket are added back to package.json.
 *
 * Until then, this hook is a no-op that always returns `status: 'disconnected'`.
 */

export function useMultiplayer() {
  return {
    doc: null,
    provider: null,
    awareness: null,
    status: 'disconnected' as const,
  };
}
