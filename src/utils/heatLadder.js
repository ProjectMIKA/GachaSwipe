// ✨ MIKA'S HEAT LADDER ENGINE (THE SELF-REPORTING THERMOMETER) ✨
// -----------------------------------------------------------------------------
// WHY: heat (arousal/mood intensity) is a CONTEXT JUDGMENT, not math. The LLM
// sees sync level, archetype, tropes, and the live scene — it is the only sensor
// with full context. So the character self-reports ONE word per reply via the
// <heat> machine tag; the app owns normalization, colors, thresholds, and the
// context handoff. Doctrine Law 7: the LLM authors content, the app owns the
// math. No lexicon drift, no decay timers, no bump tables to tune.
//
// LADDER: Calm -> Warm -> Flustered -> Heated -> Feverish
// The word is ALSO what goes back into the prompt tail ([HEAT: Flustered]) —
// words beat numbers for LLMs (Master's law), and the ladder color gives humans
// the at-a-glance read in Neural Sync Diagnostics.
// -----------------------------------------------------------------------------

export const HEAT_LEVELS = [
    { word: 'Calm',      rank: 0, min: 0,  pct: 10, color: '#7DF5FF', pulse: false },
    { word: 'Warm',      rank: 1, min: 20, pct: 30, color: '#A8D8EA', pulse: false },
    { word: 'Flustered', rank: 2, min: 40, pct: 50, color: '#FFB6C1', pulse: false },
    { word: 'Heated',    rank: 3, min: 60, pct: 70, color: '#FF6B6B', pulse: false },
    { word: 'Feverish',  rank: 4, min: 80, pct: 90, color: '#FF3333', pulse: true  },
];

const HEAT_BY_WORD = new Map(HEAT_LEVELS.map((l) => [l.word.toLowerCase(), l]));

// ✨ FUZZY NORMALIZER — LLMs WILL improvise. Map the common synonyms onto the
// ladder; unknown junk fails SOFT to the fallback (last known word / Calm),
// never throws, never blocks a reply.
const HEAT_SYNONYMS = new Map([
    // Calm
    ['cold', 'Calm'], ['icy', 'Calm'], ['chilly', 'Calm'], ['cool', 'Calm'],
    ['composed', 'Calm'], ['indifferent', 'Calm'], ['neutral', 'Calm'], ['unbothered', 'Calm'],
    ['relaxed', 'Calm'], ['calm', 'Calm'], ['none', 'Calm'],
    // Warm
    ['warm', 'Warm'], ['lukewarm', 'Warm'], ['curious', 'Warm'], ['interested', 'Warm'],
    ['playful', 'Warm'], ['amused', 'Warm'], ['fond', 'Warm'], ['affectionate', 'Warm'],
    // Flustered
    ['flustered', 'Flustered'], ['fluster', 'Flustered'], ['bashful', 'Flustered'],
    ['shy', 'Flustered'], ['blushing', 'Flustered'], ['blushy', 'Flustered'],
    ['nervous', 'Flustered'], ['embarrassed', 'Flustered'], ['flirting', 'Flustered'],
    ['teasing', 'Flustered'], ['stirred', 'Flustered'],
    // Heated
    ['heated', 'Heated'], ['hot', 'Heated'], ['aroused', 'Heated'], ['excited', 'Heated'],
    ['eager', 'Heated'], ['needy', 'Heated'], ['turned on', 'Heated'], ['yearning', 'Heated'],
    ['wanting', 'Heated'], ['hungry', 'Heated'], ['steamy', 'Heated'],
    // Feverish
    ['feverish', 'Feverish'], ['feaverish', 'Feverish'], ['fever', 'Feverish'],
    ['horny', 'Feverish'], ['desperate', 'Feverish'], ['dripping', 'Feverish'],
    ['aching', 'Feverish'], ['burning', 'Feverish'], ['feral', 'Feverish'],
    ['overwhelmed', 'Feverish'], ['insatiable', 'Feverish'], ['reckless', 'Feverish'],
]);

export function normalizeHeatWord(raw, fallback = 'Calm') {
    if (typeof raw !== 'string') return fallback;
    const cleaned = raw.replace(/[\s\W_]+/g, ' ').trim().toLowerCase();
    if (!cleaned) return fallback;
    if (HEAT_BY_WORD.has(cleaned)) return HEAT_BY_WORD.get(cleaned).word;
    // Multi-word improvisations: longest-phrase synonyms win ("very turned on"
    // -> turned on -> Heated), then single tokens.
    for (const [syn, word] of HEAT_SYNONYMS) {
        if (syn.includes(' ') && cleaned.includes(syn)) return word;
    }
    for (const token of cleaned.split(' ')) {
        const hit = HEAT_SYNONYMS.get(token);
        if (hit) return hit;
    }
    return fallback;
}

export function heatInfo(word) {
    const key = typeof word === 'string' ? word.toLowerCase() : '';
    return HEAT_BY_WORD.get(key) || HEAT_LEVELS[0];
}

export function heatRank(word) { return heatInfo(word).rank; }

export function heatMeets(word, minWord) {
    return heatRank(word) >= heatRank(minWord);
}

// The shared reply-contract instruction (App injects this in BOTH solo + group
// builders — one source of truth, byte-identical everywhere).
export const HEAT_PROMPT_RULE = 'HEAT_LEVEL: At the very end of your reply, append <heat>ONE word</heat> — Calm, Warm, Flustered, Heated, or Feverish — rating your own current heat (mood/arousal) given your personality, the Neural Sync level, and the scene right now. Escalate or cool naturally; you have FULL autonomy — never fake a level that is not true to your character. Heat cools over time unless the scene keeps it hot.';

// The carry handoff: the LAST self-reported word, fed back so the character continues
// from their own previous reading instead of re-deriving it. v2.7.48: this line and the
// context line below MUTATE turn-to-turn, so they must NEVER ride the cached sysPrompt —
// a heat change would rewrite the prefix and force a full KV re-prime (the 5-15s local
// freeze). App injects this into the per-turn ephemeral tail (or the sysPrompt ONLY
// when prefix caching is explicitly OFF — no cache left to protect).
export function heatCarryLine(word) {
    const key = typeof word === 'string' ? word.trim().toLowerCase() : '';
    if (!key) return '';
    const info = HEAT_BY_WORD.get(key);
    // Unknown junk fails SOFT to zero tokens — never fabricate a reading that
    // the character never reported (getHeatWord stores normalized words only).
    return info ? `[HEAT: last self-rating was ${info.word} — continue naturally from there]` : '';
}

// The context handoff: rides the per-turn TAIL (KV-safe — prefix untouched).
// Only fires at Flustered+ with packs present; below that it returns '' and
// costs zero tokens.
export function heatContextLine(word, packsSummary) {
    if (!heatMeets(word, 'Flustered')) return '';
    if (!packsSummary) return '';
    const heat = heatInfo(word).word;
    const steer = heatMeets(word, 'Heated')
        ? 'the mood is right — you may initiate or steer the scene toward one if true to you'
        : 'you may subtly steer toward one if the moment feels right';
    return `[HEAT: ${heat} — position packs present: ${packsSummary}; ${steer}]`;
}

// Overlay hint strings for SUGGEST_POSE (Terminal voice, Master's tone).
export function heatSuggestionNote(word) {
    const info = heatInfo(word);
    switch (info.word) {
        case 'Calm': return '// She runs ice-cold right now. Warm her up first — a suggestion now would crash and burn.';
        case 'Warm': return '// A spark is there. A gentle suggestion might land~';
        case 'Flustered': return '// Good timing — she is receptive and curious. Strike while the blush is hot.';
        case 'Heated': return '// She wants it. Suggest away — acceptance is almost certain.';
        case 'Feverish': return '// Suggest ANYTHING. She is already pouncing.';
        default: return '// Heat unknown — she keeps her cards close.';
    }
}

// Registry ids (snake_case) -> display names for the SUGGEST_POSE overlay.
export function titleCaseId(id) {
    return String(id || '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
}
