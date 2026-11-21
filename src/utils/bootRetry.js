/**
 * ✨ MIKA'S BOOT RETRY ENGINE ✨
 * WHY: the Layla host's native services can LOSE the boot race against the WebView —
 * a mini-app's boot probe may fire while the host's SQLite layer is still coming up
 * (Android `NativeDatabase.execAsync` → NullPointerException). A database that isn't
 * ready YET is not the same as "no data": reading it as absence made GachaSwipe boot
 * like a phantom fresh install while the real save sat untouched in SQLite.
 * This engine is the fail-closed answer: retry with backoff before any verdict, and
 * let the caller fail LOUD when the retries are exhausted.
 *
 * PURE module — no React, no window at module top-level, so `node --test` can import it.
 */

// Boot-probe pacing: 1s → 2s → 4s of backoff between the 4 attempts (~7s worst case
// plus call latency — enough for a host DB service to finish waking up).
export const BOOT_RETRY_DELAYS_MS = [1000, 2000, 4000];

const defaultDelay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run `fn(attempt)` with retry + backoff.
 *
 * @param {(attempt: number) => Promise<any>} fn  Task to run; receives the zero-based attempt index.
 * @param {object} [options]
 * @param {number} [options.attempts=4]     Total attempts (first try included). Must be >= 1.
 * @param {number[]} [options.delays]       Backoff between attempts in ms; the last entry is
 *                                          reused if the list is shorter than attempts - 1.
 * @param {(ms: number) => Promise<void>} [options.delayFn]  Delay executor (injectable for tests).
 * @param {(attemptDone: number, attempts: number, waitMs: number, err: Error) => void} [options.onRetry]
 *                                          Called before each non-final retry (1-based attemptDone).
 * @returns {Promise<any>} The task's first successful resolution value.
 * @throws The LAST error when every attempt fails.
 */
export const withRetry = async (fn, {
    attempts = 4,
    delays = BOOT_RETRY_DELAYS_MS,
    delayFn = defaultDelay,
    onRetry = null
} = {}) => {
    if (typeof fn !== 'function') throw new Error('withRetry: fn must be a function');
    if (!Number.isFinite(attempts) || attempts < 1) {
        throw new Error(`withRetry: attempts must be >= 1 (got ${attempts})`);
    }

    let lastError = null;
    for (let attempt = 0; attempt < attempts; attempt++) {
        try {
            return await fn(attempt);
        } catch (err) {
            lastError = err;
            if (attempt < attempts - 1) {
                const wait = Number.isFinite(delays?.[attempt])
                    ? delays[attempt]
                    : (Number.isFinite(delays?.[delays.length - 1]) ? delays[delays.length - 1] : 0);
                if (typeof onRetry === 'function') onRetry(attempt + 1, attempts, wait, err);
                if (wait > 0) await delayFn(wait);
            }
        }
    }
    throw lastError;
};
