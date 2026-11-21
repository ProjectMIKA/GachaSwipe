/**
 * ✨ MIKA'S SESSION COMPACTOR ✨
 *
 * WHY: solo + group sessions grow append-only (the KV law — byte-stable prefix, host owns
 * rolling overflow), but on hosts/providers that report no cache hits every turn pays full
 * prefill on the ENTIRE payload — and every frozen ephemTail (stale CURRENT STATUS lines,
 * old photo directives) rides inside that payload forever. The compactor bounds the DENSITY
 * of the window: once a session grows past the threshold, the oldest half is summarized
 * into ONE brief memory (riding the exact same memory storage Master already loves) and
 * the session anchor reseeds — stale turns AND their tails leave every future payload at
 * the next turn boundary. One deliberate cache re-prime per compaction; fail-closed
 * everywhere (OOB unavailable/junk = no compaction, window keeps growing, retry cadence).
 *
 * Pure functions only — no React, no SDK, no state.
 */

// Compact once the LIVE window (messages past the session anchor) reaches this size.
export const COMPACTION_THRESHOLD = 36;
// Recent messages always kept verbatim after a compaction.
export const COMPACTION_KEEP = 18;
// After a failed/attempted pass, wait this many new messages before retrying.
export const COMPACTION_RETRY_DISTANCE = 5;
// The summarize ask's dialogue excerpt ceiling (chars).
export const COMPACTION_EXCERPT_CAP = 2400;

/**
 * Should this session compact RIGHT NOW?
 * @param {number} messageCount — current history length
 * @param {{startIndex?: number, compaction?: {atCount?: number, inFlight?: boolean}}|undefined} session — the session-map entry
 * @returns {boolean}
 */
export const shouldCompact = (messageCount, session) => {
    if (!session || !Number.isFinite(session.startIndex)) return false; // not seeded yet
    const live = messageCount - session.startIndex;
    if (!Number.isFinite(live) || live < COMPACTION_THRESHOLD) return false;
    const c = session.compaction;
    if (c && c.inFlight) return false; // a pass is already running — never double-fire
    if (c && Number.isFinite(c.atCount) && (messageCount - c.atCount) < COMPACTION_RETRY_DISTANCE) return false;
    return true;
};

/**
 * Render the doomed window (messages [from, to)) into the summarize ask's dialogue excerpt.
 * Speaker-tagged, per-line clamped, total capped at COMPACTION_EXCERPT_CAP (suffix kept —
 * the most recent context wins).
 * @param {Array<{role?: string, speakerName?: string, content?: string}>|null|undefined} messages
 * @param {number} from — inclusive start (usually the session anchor)
 * @param {number} to — exclusive end (usually messageCount - COMPACTION_KEEP)
 * @param {string} charName — display name for non-user speakers
 * @param {string} userName — display name for user messages
 * @returns {string}
 */
export const buildCompactionExcerpt = (messages, from, to, charName, userName) => {
    const list = Array.isArray(messages) ? messages : [];
    const safeFrom = Math.max(0, Math.floor(from) || 0);
    const safeTo = Math.min(list.length, Math.max(safeFrom, Math.floor(to) || 0));
    const speaker = (m) => (m && m.role === 'user')
        ? String(userName || 'User')
        : String((m && m.speakerName) || charName || 'Character');
    const body = list.slice(safeFrom, safeTo)
        .map((m) => `${speaker(m)}: ${String((m && m.content) || '').replace(/\s+/g, ' ').trim().slice(0, 160)}`)
        .filter((line) => line.length > 2)
        .join('\n')
        .slice(-COMPACTION_EXCERPT_CAP);
    return body;
};
