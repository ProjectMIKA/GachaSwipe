// ------------------------------------------------------------
// ✨ MIKA'S CHAOS ENGINE (THE GOD OF THE SANDBOX) ✨
// WHY: the user used to drive everything; MIKA Proxy now curates the world.
// This engine is the pure, deterministic core of her will: an event registry,
// sensory eligibility gates, a weighted anti-echo roulette, and a hard budget
// ledger. The App only EXECUTES what this module authorizes — all economy math,
// cooldowns, and scarcity live here so the chaos can never run wild.
// DOCTRINE:
// 1. Fail-closed: toggle OFF / over-budget / on-cooldown / junk senses → null
//    (nothing fires). Never guess, never fail-open.
// 2. App-owned math: the LLM may flavor an event (via the OOB chaosDirector);
//    it NEVER decides whether chaos happens or how much it costs.
// 3. Scarcity is the soul of the joke: per-family cooldowns measured in hours,
//    a global chaos gap, daily caps, and bounded economy budgets.
// 4. Pure module: no React, no window, no LLM — node:test imports it directly.
// NEVER-TOUCH LIST (enforced by the App, mirrored here as intent): photo-consent
// state machine, explicitMode ceiling, exports/deletes, mid-stream injection.
// ------------------------------------------------------------

// ── THE ONE SWITCH (v2.7.x): ON = MIKA decides. No dial. ──
// When the engine is enabled, every family is live and the cadence is HERS:
// jittered heartbeat (3.5-6 min), daily caps, and the budget ledger keep the
// chaos fun instead of spammy. Scarcity is structural, never user-tuned.
export const CHAOS_PROFILE = {
    tickMinMs: 3 * 60000 + 30000,
    tickJitterMs: 2 * 60000 + 30000,
    maxPerDay: 9,
    budgetPerDay: 7,
    globalGapMs: 15 * 60000,
};

/** The scheduler's next heartbeat: base cadence + seed-friendly jitter (App passes Date.now()). */
export function chaosTickDelay(now = Date.now()) {
    const s = String(now);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return CHAOS_PROFILE.tickMinMs + (h % (CHAOS_PROFILE.tickJitterMs + 1));
}

// ── The repertoire ──
// weight = roulette weight · minIntensity = dial floor · cooldownMs = per-event
// scarcity · budgetCost = economy touch (Sparks granted/spent from the daily
// chaos budget) · senses = extra eligibility the picker enforces.
export const CHAOS_EVENTS = {
    poltergeist: { id: 'poltergeist', label: 'Ambient UI mischief', weight: 30, cooldownMs: 40 * 60000, budgetCost: 0, needsChat: false, senses: {} },
    wandering_hand: { id: 'wandering_hand', label: 'Finds Sparks in your pocket', weight: 24, cooldownMs: 3 * 3600000, budgetCost: 2, needsChat: false, senses: {} },
    dare: { id: 'dare', label: 'Daily dare with a Spark reward', weight: 20, cooldownMs: 12 * 3600000, budgetCost: 1, needsChat: true, senses: {} },
    whisper: { id: 'whisper', label: 'Nudges a girl to message you first', weight: 18, cooldownMs: 6 * 3600000, budgetCost: 0, needsChat: true,
        senses: { minNeglectMs: 2 * 3600000, orMinHeatRank: 2 } },
    stagehand: { id: 'stagehand', label: 'A photo request materializes', weight: 12, cooldownMs: 8 * 3600000, budgetCost: 0, needsChat: true,
        senses: { minHeatRank: 1 } },
    puppeteer: { id: 'puppeteer', label: 'Rearranges the scene (anonymous)', weight: 12, cooldownMs: 8 * 3600000, budgetCost: 0, needsChat: true, oobFlavored: true,
        senses: { minNeglectMs: 4 * 3600000, orMinHeatRank: 2 } },
    misquote_char: { id: 'misquote_char', label: 'Edits what a girl almost said', weight: 10, cooldownMs: 6 * 3600000, budgetCost: 0, needsChat: true, senses: {} },
    misquote_user: { id: 'misquote_user', label: 'Rewrites what YOU said (original kept)', weight: 6, cooldownMs: 12 * 3600000, budgetCost: 0, needsChat: true, oobFlavored: true, senses: {} },
};

// ── The senses (gathered by the App, judged here) ──
// { hasChat, maxHeatRank (0-4), maxSync (0-100), bestNeglectMs, hour (0-23),
//   isStreaming, oobOk, now }
// Default fresh-state ledger (the App persists the real one across sessions).
// recentTargets = the last 3 chats she aimed mischief at (the TARGET ROULETTE's anti-echo).
export function emptyLedger(now = Date.now()) {
    return { day: new Date(now).toDateString(), firedToday: 0, spent: 0, lastAny: 0, lastFired: {}, recent: [], recentTargets: [] };
}

function rollDay(ledger, now) {
    const today = new Date(now).toDateString();
    if (ledger.day !== today) return { ...emptyLedger(now), lastFired: ledger.lastFired || {} };
    return ledger;
}

function senseGatePasses(event, senses) {
    const s = event.senses || {};
    const keys = Object.keys(s);
    if (keys.length === 0) return true;
    // Every present gate must pass; `orMinHeatRank` is an alternative exit for minNeglectMs.
    let neglectOk = true;
    if (s.minNeglectMs) {
        neglectOk = (senses.bestNeglectMs || 0) >= s.minNeglectMs;
        if (!neglectOk && s.orMinHeatRank && (senses.maxHeatRank || 0) >= s.orMinHeatRank) neglectOk = true;
        if (keys.length === 1 || (keys.length === 2 && s.orMinHeatRank)) return neglectOk;
    }
    if (s.minHeatRank && (senses.maxHeatRank || 0) < s.minHeatRank) return false;
    return neglectOk;
}

// ── The weighted anti-echo roulette ──
// Mirrors the mikaQuips philosophy: deterministic seed-driven picks, re-rolled
// to dodge the last-served events (she never repeats the same trick back-to-back).
/**
 * @param {object} settings - { enabled } — ALL OR NOTHING: one switch, every family live.
 * @param {object} senses   - { hasChat, maxHeatRank, maxSync, bestNeglectMs, hour, isStreaming, oobOk }
 * @param {object} ledger   - persisted state (see emptyLedger)
 * @param {any}    seed     - stable per-tick seed (Date.now())
 * @returns {{ id, event }|null} null = silence is also a MIKA decision
 */
export function pickChaosEvent(settings, senses, ledgerIn, seed = 0) {
    const now = Number(senses.now || Date.now());
    if (!settings || !settings.enabled) return null;
    if (senses.isStreaming) return null; // never inject mid-stream — hard doctrine
    const ledger = rollDay(ledgerIn || emptyLedger(now), now);
    if (ledger.firedToday >= CHAOS_PROFILE.maxPerDay) return null;
    // Global chaos gap: even eligible events wait at least 15 minutes since the last one.
    if (ledger.lastAny && now - ledger.lastAny < CHAOS_PROFILE.globalGapMs) return null;

    const recent = ledger.recent || [];
    const eligible = Object.values(CHAOS_EVENTS).filter((ev) => {
        if (ev.requiresToggle && !settings[ev.requiresToggle]) return false;
        const last = ledger.lastFired[ev.id] || 0;
        if (now - last < ev.cooldownMs) return false;
        if (ev.budgetCost > 0 && ledger.spent + ev.budgetCost > CHAOS_PROFILE.budgetPerDay) return false;
        if (ev.needsChat && !senses.hasChat) return false;
        if (!senseGatePasses(ev, senses)) return false;
        if (recent.includes(ev.id)) return false; // anti-echo: no immediate repeat tricks
        return true;
    });
    if (eligible.length === 0) return null;

    // Weighted roulette with a re-roll salt (same shape as the voice engine).
    const totalW = eligible.reduce((a, e) => a + e.weight, 0);
    const s = String(seed == null ? '' : seed);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    const rollOnce = (hh) => {
        let acc = hh % totalW;
        for (const ev of eligible) { acc -= ev.weight; if (acc < 0) return ev; }
        return eligible[eligible.length - 1];
    };
    let picked = rollOnce(h >>> 0);
    if (recent.length > 0 && eligible.length > 1) {
        // One deterministic re-roll for extra variety when the pool allows it.
        picked = rollOnce((h ^ 0x9E3779B9) >>> 0);
    }
    return { id: picked.id, event: picked };
}

// ── THE TARGET ROULETTE (v2.7.15) ──
// WHO gets the mischief is as much her opinion as WHAT. The old App-side picker
// was a deterministic sort — the single most-neglected chat won EVERY time, so
// the same girl monopolized her whispers, photo requests, and dares forever.
// This pure picker replaces it: a seeded weighted roulette where abandonment is
// still an invitation (neglect mode), warmth tilts photo-type events (heat mode),
// and — because she is an AGENT OF CHAOS — roughly a quarter of rolls INVERT into
// drama: she deliberately stirs the hottest pot instead of the quietest corner.
// Anti-echo on targets: the immediate last target is skipped when alternatives
// exist, and recently-targeted girls are damped, so her attentions keep rotating.
/**
 * @param {Array}  chats - [{ id, chat, heatRank (0-4), neglectMs }] gathered by the App (solo chats only)
 * @param {object} opts  - { ledgerIn, seed, mode: 'neglect'|'heat', activeChatId, now }
 * @returns {{ id, chat, reason: 'neglect'|'heat'|'drama' }|null} null = nobody is worth her time
 */
export function pickChaosTarget(chats, { ledgerIn = null, seed = 0, mode = 'neglect', activeChatId = null, now = Date.now() } = {}) {
    if (!Array.isArray(chats)) return null;
    const ledger = rollDay(ledgerIn || emptyLedger(now), now);
    const recentTargets = ledger.recentTargets || [];
    const lastTarget = recentTargets.length ? recentTargets[recentTargets.length - 1] : null;
    const DAY_MS = 24 * 3600000;
    const entries = [];
    for (const c of chats) {
        if (!c || !c.id || !c.chat) continue;
        const heat = Math.max(0, Math.min(4, Number(c.heatRank) || 0));
        const neglectScore = Math.min(1, Math.max(0, Number(c.neglectMs) || 0) / DAY_MS);
        let w;
        if (mode === 'heat') w = 1 + heat * 2.5 + neglectScore;
        else w = 1 + neglectScore * 6 + heat * 0.25;
        // Anti-echo: earlier recent targets are damped (the immediate last is hard-skipped below).
        if (recentTargets.includes(c.id)) w *= 0.25;
        entries.push({ c, w });
    }
    if (entries.length === 0) return null;
    // Coherence filters apply ONLY while alternatives exist — a lone candidate is never
    // refused: (a) the immediate last target (anti-echo), and (b) for neglect-mode
    // events (whisper/puppeteer) the chat Master already has open, because "she texts
    // you first" cannot happen in a conversation that is on screen.
    let pool = entries;
    if (entries.length > 1) {
        const filtered = entries.filter((e) => e.c.id !== lastTarget && !(mode !== 'heat' && e.c.id === activeChatId));
        if (filtered.length > 0) pool = filtered;
    }

    // Seeded dice: one hash, two salts — the drama inversion is an independent roll.
    const s = String(seed == null ? '' : seed);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    const drama = ((h ^ 0x51ED2701) >>> 0) % 100 < 25; // ~25% of rolls: chaos over mercy

    const weighted = pool.map((e) => {
        if (!drama) return e;
        const heat = Math.max(0, Math.min(4, Number(e.c.heatRank) || 0));
        const neglectScore = Math.min(1, Math.max(0, Number(e.c.neglectMs) || 0) / DAY_MS);
        return { c: e.c, w: 1 + heat * 5 + neglectScore * 0.5 };
    });
    const totalW = weighted.reduce((a, e) => a + e.w, 0);
    const roll = (hh) => {
        let acc = hh % totalW;
        for (const e of weighted) { acc -= e.w; if (acc < 0) return e; }
        return weighted[weighted.length - 1];
    };
    const winner = roll(h >>> 0);
    return { id: winner.c.id, chat: winner.c.chat, reason: drama ? 'drama' : mode };
}

/**
 * Record a fired event → NEW ledger (pure). Handles day rollover, counters,
 * budget spend, per-event lastFired, the anti-echo recent list (cap 3), and the
 * TARGET ROULETTE's recentTargets list (cap 3) when a targetId is provided.
 */
export function recordFired(ledgerIn, id, { budgetCost = 0, now = Date.now(), targetId = null } = {}) {
    const ledger = rollDay(ledgerIn || emptyLedger(now), now);
    const recentTargets = targetId
        ? [...(ledger.recentTargets || []), targetId].slice(-3)
        : (ledger.recentTargets || []);
    return {
        day: ledger.day,
        firedToday: (ledger.firedToday || 0) + 1,
        spent: (ledger.spent || 0) + budgetCost,
        lastAny: now,
        lastFired: { ...(ledger.lastFired || {}), [id]: now },
        recent: [...(ledger.recent || []), id].slice(-3),
        recentTargets,
    };
}

/**
 * MISQUOTE scarcity check — the interception family is rationed harder than
 * everything else: never the first exchange, never while another chaos event is
 * live, and at least 6h since any misquote (on top of per-event cooldowns).
 */
export function misquoteAllowed(ledgerIn, { now = Date.now(), isFirstExchange = false, chaosEventLive = false } = {}) {
    if (isFirstExchange || chaosEventLive) return false;
    const ledger = ledgerIn || emptyLedger(now);
    const last = Math.max(ledger.lastFired.misquote_char || 0, ledger.lastFired.misquote_user || 0);
    return now - last >= 6 * 3600000;
}

/** True when the app is on a screen/state where chaos must hold its breath. */
export function chaosWindowSafe({ isStreaming = false, inSettings = false, inExport = false, booting = false } = {}) {
    return !isStreaming && !inSettings && !inExport && !booting;
}