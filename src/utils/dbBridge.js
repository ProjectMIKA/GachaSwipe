/**
 * ✨ MIKA'S DB BRIDGE VITAL SIGNS (v2.7.94) ✨
 * WHY: the Layla host's native SQLite bridge (Android `NativeDatabase.execAsync`)
 * can reject calls with a bare NullPointerException — at boot (the Boot Doctor
 * already gates that race) but ALSO mid-session, when the host's DB service dies
 * under the running app. Seen live in the r/layla_ai bug report: GachaSwipe
 * v2.7.93 on Layla v7.8.0-direct — every save_session and every DATA_MANAGEMENT
 * export read bounced with the NPE, and the zip exporter swallowed the diagnosis
 * behind "My circuits overloaded! Nyaa!".
 *
 * This module is the fail-closed classifier: recognize the "bridge is dead or
 * rebooting" error class and turn it into honest, actionable guidance for the
 * save alert and the export alert instead of a bare stack line.
 *
 * PURE module — no React, no window at module top-level, so `node --test` can import it.
 */

// The host wraps native exceptions in its generic API-rejection wrapper. Match the
// classes we have actually seen in the wild — nothing speculative, nothing broad
// enough to misclassify ordinary SQL syntax errors as bridge death.
const BRIDGE_DEAD_PATTERN = /NullPointerException|has been rejected|Layla API message|Database bridge unavailable/i;

/**
 * True when the error looks like the host DB bridge being dead/rebooting
 * (NPE / bridge rejection class), false for anything else.
 * @param {unknown} err  An Error, a string, or anything throwable.
 * @returns {boolean}
 */
export const isBridgeDeadError = (err) => {
    if (!err) return false;
    let text = '';
    try {
        text = typeof err === 'string' ? err : (err.message || String(err));
    } catch {
        return false;
    }
    return BRIDGE_DEAD_PATTERN.test(text);
};

/**
 * The actionable recovery guidance shown when a bridge-death error is detected.
 * Kept as an exported constant so the alert copy stays single-sourced.
 */
export const BRIDGE_RECOVERY_HINT = 'The host database bridge looks offline. Fully close Layla (swipe it away) and reopen — the boot probe will re-arm the bridge — then retry. If it keeps failing, run the Database Doctor or update Layla.';

/**
 * Human-facing one-liner for save/export error alerts: the raw message, plus the
 * recovery hint ONLY when the error is classified as bridge death.
 * @param {unknown} err
 * @returns {string}
 */
export const describeSaveError = (err) => {
    let message = 'Unknown error';
    try {
        message = (err && err.message) ? err.message : String(err);
    } catch {
        message = 'Unknown error';
    }
    return isBridgeDeadError(err) ? `${message} — ${BRIDGE_RECOVERY_HINT}` : message;
};
