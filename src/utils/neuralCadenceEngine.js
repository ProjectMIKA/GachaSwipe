// ✨ M.I.K.A. DYNAMIC NEURAL CADENCE & TELEMETRY ENGINE ✨
// Intelligently monitors LLM response latency, throughput, and user conversational cadence
// without adding a single millisecond of overhead to completion requests.

const STORAGE_KEY = 'mika_neural_cadence_telemetry';

// Default factory telemetry baseline (anchored to Chill flow)
const DEFAULT_MODEL_PROFILE = {
    sampleCount: 0,
    avgLatencyMs: 3200,         // Estimated initial cloud turnaround
    avgBatchGenMs: 3200,
    avgCharsPerSec: 45,
    lastSpoolDurationMs: 3000,
    learnedSpoolThreshold: 4,   // Default queue threshold to trigger background spooling
    learnedMultiplier: 1.75,    // Chill baseline (1.6 - 1.8)
    avgPrefillCps: null,        // ✨ v2.5.26: learned prompt-eval throughput (chars/sec) for the payload % estimator ✨
    prefillSamples: 0,
    lastUpdated: Date.now()
};

// ✨ v2.5.33: IN-MEMORY TELEMETRY CACHE ✨
// localStorage.getItem + JSON.parse is synchronous main-thread I/O (SQLite-backed inside device
// WebViews). This module's getters (getModelCadenceProfile / getPrefillEstimate / getGovernorTier)
// are called from render paths (MATRIX telemetry strip) and per-token stream commits — which used
// to mean dozens of blocking reads + full JSON parses per second during chat. The store now loads
// ONCE per session; saves update the cache and flush to localStorage on a 2s debounced timer.
let cachedStore = null;
let flushTimer = null;
const FLUSH_DELAY_MS = 2000;

function loadTelemetryStore() {
    if (cachedStore) return cachedStore;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            cachedStore = {
                activeModelKey: parsed.activeModelKey || 'Default (Auto)',
                models: parsed.models || {},
                userCadence: parsed.userCadence || {
                    lastUserMsgTime: 0,
                    avgUserGapMs: 6000,
                    userPace: 'balanced'
                }
            };
            return cachedStore;
        }
    } catch (e) {
        console.warn('[NeuralCadence] Failed to parse stored telemetry:', e);
    }
    cachedStore = {
        activeModelKey: 'Default (Auto)',
        models: {},
        userCadence: {
            lastUserMsgTime: 0,
            avgUserGapMs: 6000,
            userPace: 'balanced'
        }
    };
    return cachedStore;
}

function saveTelemetryStore(store) {
    cachedStore = store; // the cache IS the store — every in-place mutation is already visible
    if (flushTimer || typeof setTimeout === 'undefined') return; // a flush is already scheduled
    flushTimer = setTimeout(() => {
        flushTimer = null;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedStore));
        } catch (e) {
            console.warn('[NeuralCadence] Failed to persist telemetry store:', e);
        }
    }, FLUSH_DELAY_MS);
}

/**
 * ✨ v2.5.33: Flush any pending debounced telemetry write to localStorage immediately.
 * Called on pagehide / beforeunload / visibility-hidden so a quick app exit never loses
 * the most recent cadence sample.
 */
export function flushTelemetryStore() {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    if (cachedStore) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedStore));
        } catch (e) { /* silent — best effort */ }
    }
}

/**
 * Retrieves the learned profile for a specific inference engine / model.
 * If none exists, initializes it using the Chill baseline.
 */
export function getModelCadenceProfile(modelKey = 'Default (Auto)') {
    const store = loadTelemetryStore();
    const cleanKey = (modelKey || 'Default (Auto)').trim();
    if (!store.models[cleanKey]) {
        store.models[cleanKey] = { ...DEFAULT_MODEL_PROFILE, lastUpdated: Date.now() };
        store.activeModelKey = cleanKey;
        saveTelemetryStore(store);
    }
    return store.models[cleanKey];
}

/**
 * Non-blocking telemetry recorder called when an LLM completion finishes.
 */
export function recordLlmTelemetry(modelKey, { durationMs, charCount, totalReplies = 1, prefillMs = null, prefillChars = null }) {
    if (!durationMs || durationMs < 50) return;
    try {
        const store = loadTelemetryStore();
        const cleanKey = (modelKey || 'Default (Auto)').trim();
        store.activeModelKey = cleanKey;

        const current = store.models[cleanKey] || { ...DEFAULT_MODEL_PROFILE };
        const safeChars = Math.max(charCount || 0, totalReplies * 40);
        const charsPerSec = safeChars / Math.max(0.5, durationMs / 1000);

        // Exponential moving average (alpha = 0.25) to adapt smoothly without wild fluctuations
        const alpha = current.sampleCount === 0 ? 1.0 : 0.25;
        const newAvgLatency = Math.round((current.avgLatencyMs * (1 - alpha)) + (durationMs * alpha));
        const newAvgCharsPerSec = Math.round(((current.avgCharsPerSec * (1 - alpha)) + (charsPerSec * alpha)) * 10) / 10;

        // Dynamic Spool Threshold & Multiplier:
        // Local models on mobile (<24 c/s or >8s latency) MUST use threshold=2 so they spool when
        // 2 messages remain, giving ample runway for overlapping typing without double-spooling loops!
        // Cloud models (>30 c/s or <3.5s latency) use threshold=4 for seamless instant spooling.
        const isLocalTier = newAvgCharsPerSec < 24 || newAvgLatency > 8000;
        const newThreshold = isLocalTier ? 2 : 4;
        const estTokPerSec = Math.round((newAvgCharsPerSec / 3.8) * 10) / 10;

        // ✨ v2.5.26: PROMPT-EVAL (PREFILL) SPEED TELEMETRY ✨
        // EWMA (alpha 0.25) over the chars/sec observed between request start and first token.
        // Powers the "PREFILL x%" payload estimator above the input bar.
        const hasPrefillSample = prefillMs && prefillChars && prefillMs > 50 && prefillChars > 0;
        const prefillCps = hasPrefillSample ? prefillChars / Math.max(0.05, prefillMs / 1000) : null;
        const prevPrefillCps = current.avgPrefillCps || null;
        const newPrefillCps = prefillCps
            ? (prevPrefillCps ? Math.round(((prevPrefillCps * 0.75) + (prefillCps * 0.25)) * 10) / 10 : Math.round(prefillCps * 10) / 10)
            : prevPrefillCps;

        let newMult = 1.75;
        if (newAvgLatency > 12000) {
            newMult = 2.15;
        } else if (newAvgLatency > 6500) {
            newMult = 1.95;
        } else if (newAvgLatency < 2000) {
            newMult = 1.65;
        } else {
            newMult = 1.75;
        }

        // Preserve any previously-locked tier verdict across profile updates
        const prevVerdict = current.tierVerdict || null;
        const prevVerdictAt = current.verdictAt || 0;

        store.models[cleanKey] = {
            sampleCount: current.sampleCount + 1,
            avgLatencyMs: newAvgLatency,
            avgBatchGenMs: newAvgLatency,
            avgCharsPerSec: newAvgCharsPerSec,
            estTokPerSec,
            isLocalTier,
            avgPrefillCps: newPrefillCps,
            prefillSamples: (current.prefillSamples || 0) + (prefillCps ? 1 : 0),
            tierVerdict: prevVerdict,
            verdictAt: prevVerdictAt,
            lastSpoolDurationMs: durationMs,
            learnedSpoolThreshold: newThreshold,
            learnedMultiplier: Math.round(newMult * 100) / 100,
            lastUpdated: Date.now()
        };

        // ✨ MIKA'S ONCE-LOCKED TIER VERDICT (silent file — classified once, local-biased) ✨
        classifyEngineTier(cleanKey, charsPerSec, durationMs, store);

        saveTelemetryStore(store);
        const tierTag = isLocalTier ? 'LOCAL (Mobile/On-Device)' : 'CLOUD (High-Speed)';
        console.log(`[NeuralCadence] Telemetry updated for '${cleanKey}': ${newAvgLatency}ms avg, ${newAvgCharsPerSec} c/s (~${estTokPerSec} t/s) | Tier: ${tierTag} | SpoolThreshold=${newThreshold} | Mult=${newMult}`);
    } catch (e) {
        console.warn('[NeuralCadence] Telemetry record error:', e);
    }
}

/**
 * ✨ v2.5.26: PROMPT-EVAL SPEED ESTIMATOR ✨
 * Returns the learned chars/sec prompt-eval throughput for an engine.
 * Powers the "PREFILL x%" payload progress shown above the chat input bar.
 * ✨ v2.5.27: TIER-SEEDED FALLBACK — before any telemetry exists, the governor tier decides the
 * seed (local ≈ 40 c/s, cloud ≈ 2500 c/s) so the % shows from turn ONE; the first real sample
 * (learned avgPrefillCps) takes priority above and the estimate self-corrects.
 */
export function getPrefillEstimate(modelKey = 'Default (Auto)') {
    try {
        const store = loadTelemetryStore();
        const cleanKey = (modelKey || 'Default (Auto)').trim();
        const model = store.models[cleanKey];
        if (model && model.avgPrefillCps && (model.prefillSamples || 0) > 0) return model.avgPrefillCps;
    } catch (e) { /* silent — estimation only */ }
    return getGovernorTier(modelKey) === 'cloud' ? 2500 : 40;
}

/**
 * ✨ v2.5.27: KV PREFIX-CACHE HIT PROBE ✨
 * Heuristic verdict for the CACHE/RECACHING badge: compares how many payload chars the engine
 * could plausibly have prompt-evaluated during the observed prefill window (learned or
 * tier-seeded c/s × elapsed ms) against the actual payload size. If only a small fraction of
 * the payload could have been evaluated in that time, the KV prefix cache HELD ('CACHE');
 * if the elapsed time is consistent with re-evaluating most of the payload, the cache BUSTED
 * ('RECACHING'). Called exactly once per turn, at first token.
 */
export function estimateCacheHit(modelKey = 'Default (Auto)', prefillMs = 0, payloadChars = 0) {
    try {
        if (!prefillMs || prefillMs < 50 || !payloadChars || payloadChars <= 0) return null;
        const cps = getPrefillEstimate(modelKey) || 40;
        const evaluableChars = cps * Math.max(0.05, prefillMs / 1000);
        const ratio = Math.min(1, evaluableChars / payloadChars);
        const verdict = ratio < 0.45 ? 'CACHE' : 'RECACHING';
        return { verdict, ratio, estCps: cps, prefillMs, payloadChars };
    } catch (e) {
        return null;
    }
}

// ✨ MIKA'S ONCE-LOCKED ENGINE TIER VERDICTS (the smart AUTO toggle) ✨
// Master's bias, codified: mis-classifying a cloud model as LOCAL is far better than the
// reverse — so the thresholds are aggressively local. A verdict is recorded ONCE per engine
// and persists across sessions in the same silent localStorage file as cadence telemetry.
// The 'Default (Auto)' key is re-measured ONCE PER SESSION (the host may swap its default
// model between launches) — mirroring the once-per-session sentiment engine script.
const DEFAULT_ENGINE_KEY = 'Default (Auto)';
const VERDICT_LOCAL_MAX_CPS = 45;   // below this throughput => local (Gemma E4B @ 8-10 t/s ≈ 30-38 c/s ✓)
const VERDICT_LOCAL_MIN_LAT = 4000; // above this latency => local
let sessionDefaultVerified = false; // 'Default (Auto)' re-measures its verdict once per session

function classifyEngineTier(cleanKey, charsPerSec, latencyMs, store) {
    const model = store.models[cleanKey];
    if (!model) return;
    if (model.tierVerdict) {
        if (cleanKey !== DEFAULT_ENGINE_KEY || sessionDefaultVerified) return; // locked
    }
    if (cleanKey === DEFAULT_ENGINE_KEY) sessionDefaultVerified = true;

    const verdict = (charsPerSec < VERDICT_LOCAL_MAX_CPS || latencyMs > VERDICT_LOCAL_MIN_LAT) ? 'local' : 'cloud';
    model.tierVerdict = verdict;
    model.verdictAt = Date.now();
    console.log(`[NeuralCadence] 🎚️ Tier VERDICT for '${cleanKey}': ${verdict.toUpperCase()} (${Math.round(charsPerSec)} c/s, ${Math.round(latencyMs)}ms — locked${cleanKey === DEFAULT_ENGINE_KEY ? ' for this session' : ''})`);
}

export function getStoredEngineTierVerdict(modelKey = 'Default (Auto)') {
    try {
        const store = loadTelemetryStore();
        const cleanKey = (modelKey || DEFAULT_ENGINE_KEY).trim();
        return store.models[cleanKey]?.tierVerdict || null;
    } catch (e) {
        return null;
    }
}

// ✨ MIKA'S GOVERNOR TIER RESOLVER ✨ (deterministic, local-biased)
// Order: locked verdict → engine-name rule → live profile (never-classified) → LOCAL.
// The final 'local' fallback implements Master's preference: an unknown engine gets the
// freeze treatment until its first completed stream records a real verdict.
export function getGovernorTier(selectedEngine = '') {
    const cleanKey = (selectedEngine || DEFAULT_ENGINE_KEY).trim();
    const verdict = getStoredEngineTierVerdict(cleanKey);
    if (verdict) return verdict;
    if (getKnownLocalEngine(cleanKey)) return 'local';
    const profile = getModelCadenceProfile(cleanKey);
    if (profile && profile.sampleCount > 0) {
        return (profile.avgCharsPerSec < VERDICT_LOCAL_MAX_CPS || profile.avgLatencyMs > VERDICT_LOCAL_MIN_LAT) ? 'local' : 'cloud';
    }
    return 'local';
}

/**
 * Records user messaging cadence to detect whether Master is chatting rapidly or reading leisurely.
 */
export function recordUserCadence() {
    try {
        const store = loadTelemetryStore();
        const now = Date.now();
        const lastTime = store.userCadence?.lastUserMsgTime || 0;
        if (lastTime > 0) {
            const gap = now - lastTime;
            if (gap < 120000) { // Only track within 2 minutes of active conversation
                const alpha = 0.3;
                const prevAvg = store.userCadence.avgUserGapMs || 6000;
                const newAvg = Math.round((prevAvg * (1 - alpha)) + (gap * alpha));
                let pace = 'balanced';
                if (newAvg < 3500) pace = 'rapid';
                else if (newAvg > 15000) pace = 'relaxed';
                store.userCadence = {
                    lastUserMsgTime: now,
                    avgUserGapMs: newAvg,
                    userPace: pace
                };
            }
        } else {
            store.userCadence = {
                lastUserMsgTime: now,
                avgUserGapMs: 6000,
                userPace: 'balanced'
            };
        }
        saveTelemetryStore(store);
    } catch (e) {
        // Silent fail
    }
}

/**
 * Determines whether the active setup behaves as 'local' (mobile/NPU/low TPS) or 'cloud' (high-speed remote API).
 * @param {string} neuralLinkMode - 'auto' | 'cloud' | 'local'
 * @param {string} selectedEngine - Model/engine identifier string
 * @returns {'local' | 'cloud'}
 */
// ✨ MIKA'S DETERMINISTIC LOCAL-ENGINE NAME RULE (single source of truth) ✨
// The FREEZE GOVERNOR (llmActivityGovernor.js) consults this in 'auto' mode INSTEAD of live
// cadence telemetry: a fast local spool profile would flip the tier to 'cloud' mid-batch and
// silently disable the camera freeze. Config-stable beats adaptive for freeze decisions.
export function getKnownLocalEngine(selectedEngine = '') {
    return /local|ollama|lmstudio|kobold|gemma|llama|qwen|phi|mistral/i.test(selectedEngine || '');
}

export function getEffectiveNeuralLinkTier(neuralLinkMode = 'auto', selectedEngine = '') {
    if (neuralLinkMode === 'local') return 'local';
    if (neuralLinkMode === 'cloud') return 'cloud';

    // Auto: the once-locked tier verdict (local-biased; session-refreshed for the default key)
    // wins over live telemetry — a stored verdict never flips mid-stream.
    const verdict = getStoredEngineTierVerdict(selectedEngine);
    if (verdict) return verdict;

    // Fallback: check engine name for local keywords
    if (getKnownLocalEngine(selectedEngine)) return 'local';

    // Last resort for never-classified engines: live profile with LOCAL-BIASED thresholds.
    const profile = getModelCadenceProfile(selectedEngine);
    if (profile && profile.sampleCount > 0) {
        return (profile.avgCharsPerSec < VERDICT_LOCAL_MAX_CPS || profile.avgLatencyMs > VERDICT_LOCAL_MIN_LAT) ? 'local' : 'cloud';
    }

    // ✨ Master's bias: an unknown engine is treated as local until classified.
    return 'local';
}

/**
 * Calculates current active multipliers, spool threshold, and cooldown based on selected flow mode and neural link mode.
 * 
 * @param {string} groupChatFlow - 'dynamic' | 'hyper' | 'chill' | 'relaxed'
 * @param {string} selectedEngine - Name of selected engine
 * @param {string} neuralLinkMode - 'auto' | 'cloud' | 'local'
 */
export function getActiveCadenceConfig(groupChatFlow, selectedEngine, neuralLinkMode = 'auto') {
    const profile = getModelCadenceProfile(selectedEngine);
    const store = loadTelemetryStore();

    // Determine Effective Engine Tier:
    const effectiveTier = getEffectiveNeuralLinkTier(neuralLinkMode, selectedEngine);
    const isLocal = effectiveTier === 'local';

    if (groupChatFlow === 'hyper') {
        return {
            flowMult: 1.0,
            spoolThreshold: isLocal ? 2 : 3,
            spoolCooldownMs: isLocal ? 12000 : 2500,
            banterCount: isLocal ? '3-5' : '4-6',
            isDynamic: false,
            effectiveTier,
            profile
        };
    }
    if (groupChatFlow === 'relaxed') {
        return {
            flowMult: 2.8,
            spoolThreshold: isLocal ? 2 : 4,
            spoolCooldownMs: isLocal ? 15000 : 3500,
            banterCount: isLocal ? '3-5' : '4-6',
            isDynamic: false,
            effectiveTier,
            profile
        };
    }
    if (groupChatFlow === 'chill') {
        return {
            flowMult: 1.75,
            spoolThreshold: isLocal ? 2 : 4,
            spoolCooldownMs: isLocal ? 15000 : 3000,
            banterCount: isLocal ? '3-5' : '4-6',
            isDynamic: false,
            effectiveTier,
            profile
        };
    }

    // Dynamic Mode
    let mult = isLocal ? Math.max(1.85, profile.learnedMultiplier || 1.85) : (profile.learnedMultiplier || 1.75);
    let threshold = isLocal ? 2 : (profile.learnedSpoolThreshold || 4);
    let cooldownMs = isLocal ? 15000 : 3000;
    let banterCount = isLocal ? '3-5' : '4-6';

    // Subtle nudge if user is typing rapidly vs leisurely reading
    if (store.userCadence?.userPace === 'rapid') {
        mult = Math.max(1.45, mult - 0.15);
    } else if (store.userCadence?.userPace === 'relaxed') {
        mult = Math.min(2.4, mult + 0.15);
    }

    return {
        flowMult: Math.round(mult * 100) / 100,
        spoolThreshold: threshold,
        spoolCooldownMs: cooldownMs,
        banterCount,
        isDynamic: true,
        effectiveTier,
        profile
    };
}

/**
 * Completely purges all learned telemetry logs and resets to factory baseline.
 */
export function purgeCadenceTelemetry() {
    try {
        if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; } // ✨ v2.5.33: drop any pending debounced write ✨
        cachedStore = null; // ✨ v2.5.33: reset the session cache so purged data stays purged ✨
        localStorage.removeItem(STORAGE_KEY);
        console.log('[NeuralCadence] Matrix flushed to factory baseline.');
        return true;
    } catch (e) {
        console.error('[NeuralCadence] Failed to purge telemetry:', e);
        return false;
    }
}

/**
 * ✨ MIKA'S LIVING ANIME GROUP CADENCE & ARCHETYPE PACER ✨
 * Transforms static message queues into a lively, unpredictable, human anime group chat.
 * Mimics our classic Living Manga cadence:
 * - Drastically lengthened typing indicators (3s - 14s) so characters feel like real people thinking and composing.
 * - Dynamic typing overlap (~35% to 50% chance) so multiple indicators pop up and coexist naturally.
 * - Archetype quirks (Tsunderes type faster & interrupt; Danderes hesitate & type longer).
 * - Timeline chained to cumulative queue time so messages never flood.
 *
 * @param {Array} messages - List of reply objects { speakerName, content, ... }
 * @param {Array} participants - List of group chat participants { name, tags, quirks, personality, ... }
 * @param {Object} options - { isUserInteraction, flowMult, cumulativeTime }
 * @returns {Array} Array of timed message objects with { startTypingTime, sendTime, originalIndex }
 */
export function calculateGroupTurnCadence(messages, participants = [], options = {}) {
    if (!Array.isArray(messages) || messages.length === 0) return [];

    const { isUserInteraction = false, flowMult = 1.6, cumulativeTime = Date.now() } = options;
    const timedMessages = [];

    // ✨ MIKA'S DYNAMIC CHAT MOOD & INTENSITY ANALYZER ✨
    // Evaluates emotional engagement, excitement, and banter tempo [0.15 = calm/slow, 1.0 = hyper/energetic]
    let totalExclamations = 0;
    let totalQuestions = 0;
    let totalShortWords = 0;
    let totalActionBursts = 0;
    let totalChars = 0;

    messages.forEach(m => {
        const text = m.message || m.content || '';
        totalChars += text.length;
        const excl = (text.match(/!/g) || []).length;
        const qmark = (text.match(/\?/g) || []).length;
        const actions = (text.match(/\*[^*]+\*/g) || []).length;
        const hypeWords = (text.match(/\b(omg|lol|haha|lmao|keke|nya|baka|wait|what|no way|really|woah|wow|yes|yess|shut up|hurry|hey)\b/gi) || []).length;
        totalExclamations += excl;
        totalQuestions += qmark;
        totalActionBursts += actions;
        totalShortWords += hypeWords;
    });

    const avgMsgLength = messages.length > 0 ? totalChars / messages.length : 60;
    // Snappy short quips signify active rapid-fire dialogue
    const brevityBoost = avgMsgLength < 40 ? 0.30 : (avgMsgLength < 80 ? 0.15 : -0.08);
    const excitementScore = (totalExclamations * 0.14) + (totalQuestions * 0.08) + (totalShortWords * 0.18) + (totalActionBursts * 0.10);
    const chatIntensity = Math.max(0.15, Math.min(1.0, 0.35 + brevityBoost + (excitementScore / Math.max(1, messages.length))));

    // Helper to extract personality archetype from tags, quirks, and speech style
    const getArchetypeModifiers = (participant) => {
        if (!participant) {
            return { reactionFactor: 1.0, typeSpeedFactor: 1.0, overlapChance: 0.40, isImpulsive: false, isHesitant: false };
        }
        const tagBlob = [
            ...(participant.tags || []),
            ...(participant.quirks || []),
            participant.personality || '',
            participant.speech_style || ''
        ].join(' ').toLowerCase();

        const isImpulsive = /tsundere|brat|delinquent|chaotic|gremlin|impatient|hot-headed|feisty|bratty|hyper|explosive/i.test(tagBlob);
        const isObsessive = /yandere|obsessive|clingy|possessive|stalker|in love|overprotective/i.test(tagBlob);
        const isHesitant = /dandere|shy|timid|introvert|anxious|clumsy|flustered|meek|hesitant|sleepy/i.test(tagBlob);
        const isStoic = /kuudere|emotionless|stoic|android|robot|maid|butler|calm|quiet|serious/i.test(tagBlob);
        const isDominant = /dominant|mommy|sadist|queen|seductress|bossy|leader/i.test(tagBlob);
        const isPlayful = /playful|tease|genki|cheerful|troll|bubbly|mischievous|whimsical/i.test(tagBlob);

        let reactionFactor = 1.0;
        let typeSpeedFactor = 1.0;
        let overlapChance = 0.40; // Default ~40% baseline

        if (isImpulsive) {
            reactionFactor = 0.65;  // Quicker reaction
            typeSpeedFactor = 0.78; // Fast, impatient typing
            overlapChance = 0.62;   // High tendency to jump in
        } else if (isObsessive) {
            reactionFactor = 0.58;  // Hyper-vigilant
            typeSpeedFactor = 0.85;
            overlapChance = 0.55;
        } else if (isHesitant) {
            reactionFactor = 1.40;  // Pauses before typing
            typeSpeedFactor = 1.30; // Typing indicator hangs out longer as she re-reads & drafts
            overlapChance = 0.22;
        } else if (isStoic) {
            reactionFactor = 1.20;  // Measured pause
            typeSpeedFactor = 1.02; // Calm, steady cadence
            overlapChance = 0.28;
        } else if (isDominant) {
            reactionFactor = 0.95;
            typeSpeedFactor = 0.98;
            overlapChance = 0.45;
        } else if (isPlayful) {
            reactionFactor = 0.75;  // Bubbly, spontaneous
            typeSpeedFactor = 0.88;
            overlapChance = 0.52;
        }

        return { reactionFactor, typeSpeedFactor, overlapChance, isImpulsive, isHesitant };
    };

    let prevStartTyping = 0;
    let prevSend = 0;
    let prevTypeDelay = 0;
    let prevEstimatedFinish = cumulativeTime;

    messages.forEach((mObj, i) => {
        const participant = participants.find(p => p.name === mObj.speakerName);
        const mods = getArchetypeModifiers(participant);
        const content = mObj.message || mObj.content || '';
        const charCount = content.length;
        const isFirstPriority = isUserInteraction && i === 0;

        // 1. Natural Reading / Thinking Pause (before typing indicator appears):
        let baseReadDelay;
        if (isFirstPriority) {
            baseReadDelay = 350 + Math.floor(Math.random() * 350); // 350ms - 700ms for Master
        } else if (charCount < 25) {
            baseReadDelay = 650 + Math.floor(Math.random() * 550); // 650ms - 1.2s
        } else if (charCount < 80) {
            baseReadDelay = 1200 + Math.floor(Math.random() * 800); // 1.2s - 2.0s
        } else {
            baseReadDelay = 1800 + Math.floor(Math.random() * 1200); // 1.8s - 3.0s
        }
        const readDelay = Math.floor(baseReadDelay * mods.reactionFactor * (1.1 - chatIntensity * 0.25) * Math.max(0.75, Math.min(1.3, flowMult)));

        // 2. Realistic Human Typing Duration (Dynamically snappy for short replies!):
        // Shorter replies can dynamically be a bit quicker going from isTyping to streaming!
        let baseTypeTime;
        if (charCount < 25) {
            // Micro-quips / snarks / quick banter: 1.5s - 2.8s
            baseTypeTime = 1500 + Math.floor(Math.random() * 1300);
        } else if (charCount < 60) {
            // Short replies: 2.6s - 4.5s
            baseTypeTime = 2600 + Math.floor(Math.random() * 1900);
        } else if (charCount < 120) {
            // Standard conversational replies: 4.5s - 7.5s
            baseTypeTime = 4500 + Math.floor(Math.random() * 3000);
        } else {
            // Long monologues / complex thoughts: 7.5s - 13.5s
            baseTypeTime = 7500 + Math.floor(Math.random() * 6000);
        }

        const intensitySpeedMult = 1.0 - (chatIntensity * 0.20); // Up to 20% faster when chat is heated/hyped
        const minFloor = charCount < 25 ? 1200 : (charCount < 60 ? 2000 : 3200);

        const typeDelay = Math.max(
            minFloor,
            Math.floor(baseTypeTime * mods.typeSpeedFactor * intensitySpeedMult * Math.max(0.75, Math.min(1.3, flowMult)) * (0.92 + Math.random() * 0.16))
        );

        // 3. Dynamic Concurrent Typing Overlap (Boosted by Chat Intensity):
        // Overlap chance scales dynamically with the mood/intensity of the chat!
        const dynamicOverlapChance = Math.min(0.80, mods.overlapChance * (0.75 + chatIntensity * 0.85));
        const willOverlap = (i > 0) && (Math.random() < dynamicOverlapChance);

        const estimatedStreamDuration = Math.max(1000, Math.min(5000, charCount * 25));
        const postSpeechBuffer = Math.floor(1600 * (1.1 - chatIntensity * 0.25) * Math.max(0.75, Math.min(1.3, flowMult)));

        let startTypingTime;
        let sendTime;

        if (willOverlap && i > 0) {
            // Character begins typing concurrently WHILE previous character is typing or streaming!
            const overlapAnchor = (Math.random() < 0.65 && prevTypeDelay > 0)
                ? (prevStartTyping + Math.floor(prevTypeDelay * (0.35 + Math.random() * 0.40)))
                : (prevSend + Math.floor(Math.random() * 800));

            startTypingTime = Math.max(Date.now() + 300, overlapAnchor);
            // She cannot pop into chat until previous finishes visual stream + post-speech reading breathing room:
            sendTime = Math.max(startTypingTime + typeDelay, prevEstimatedFinish + postSpeechBuffer);
        } else {
            // Normal sequential turn-taking
            startTypingTime = Math.max(Date.now() + 300, prevEstimatedFinish + readDelay);
            sendTime = startTypingTime + typeDelay;
        }

        prevStartTyping = startTypingTime;
        prevSend = sendTime;
        prevTypeDelay = typeDelay;
        prevEstimatedFinish = sendTime + estimatedStreamDuration;

        timedMessages.push({
            ...mObj,
            originalIndex: i,
            participant,
            mods,
            startTypingTime,
            sendTime,
            typeDelay,
            chatIntensity
        });
    });

    return timedMessages;
}
