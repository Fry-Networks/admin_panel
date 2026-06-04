import { refreshAllActiveEvents } from './refreshLeaderboard';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes
let intervalId: ReturnType<typeof setInterval> | null = null;

export function startAutoRefresh(): void {
  if (intervalId) return; // Already running
  console.log(
    '[autoRefresh] Starting event leaderboard auto-refresh scheduler'
  );
  intervalId = setInterval(async () => {
    try {
      await refreshAllActiveEvents();
    } catch (err) {
      console.error('[autoRefresh] cycle error:', err);
    }
  }, CHECK_INTERVAL_MS);
  // Run once immediately on startup
  refreshAllActiveEvents().catch((err) =>
    console.error('[autoRefresh] initial run error:', err)
  );
}

export function stopAutoRefresh(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[autoRefresh] Stopped');
  }
}
