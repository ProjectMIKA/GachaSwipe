/**
 * ✨ MIKA'S DEEP PROMPT ENCODER ✨
 *
 * Some diffusion architectures carry text encoders that read past CLIP's hard 77-token
 * ceiling (FLUX/SD3/SANA/PixArt = T5-XXL, Lumina 2 = Gemma, HiDream = Llama, Qwen-Image).
 * Everything else — including every "Turbo/Lightning/Hyper/LCM" step-distilled SD/SDXL
 * model — is CLIP-capped at 77 tokens per pass, and hosts silently truncate the tail of
 * an over-budget prompt.
 *
 * Risk asymmetry doctrine (fail-closed):
 *   - False negative (budget stays legacy on a long-encoder model) = wasted headroom. Free.
 *   - False positive (expanded budget on a CLIP model) = silent tail truncation on every
 *     photo, behavior unversioned and unknown. Never guess it.
 * Therefore: the extended budget is ALWAYS off by default, activation is manual per model,
 * and the name classifier is ADVISORY ONLY — it may inform, never act.
 *
 * Pure functions only — no React, no SDK, no state.
 */

// Architecture families with a known non-CLIP (or >77-context) text encoder.
export const LONG_ENCODER_HINTS = /flux|schnell|perchance|sd3(?:\.5)?|sana|pixart|lumina[ _-]?2|qwen[ _-]?image|hidream|chroma|auraflow|hunyuan/i;

// Step-distillation vocabulary: these are ADD/LCM distills of CLIP-77 bases. "Turbo"
// means fewer inference steps, NOT a bigger encoder — the single most common detection
// mistake (SD-Turbo, SDXL-Turbo, DreamShaper Turbo, Juggernaut XL Turbo are all CLIP-77).
export const STEP_DISTILL_HINTS = /turbo|lightning|hyper|lcm|distill/i;

/**
 * Classify a model by its id/name. Long-encoder architecture wins over distillation
 * hints ("FLUX.1 Turbo" would still be T5-class). Anything unrecognized is 'unknown'
 * — and unknown means the 77-token legacy world.
 * @param {string} id
 * @param {string} [name]
 * @returns {'long_encoder'|'step_distilled'|'unknown'}
 */
export const classifyImageModel = (id, name) => {
    const haystack = `${id || ''} ${name || ''}`;
    if (!haystack.trim()) return 'unknown';
    if (LONG_ENCODER_HINTS.test(haystack)) return 'long_encoder';
    if (STEP_DISTILL_HINTS.test(haystack)) return 'step_distilled';
    return 'unknown';
};

// The selectable token-budget tiers (CLIP chunk-1 + encoder headroom).
export const DEEP_PROMPT_TIERS = [77, 128, 256, 512];
export const DEFAULT_DEEP_PROMPT_BUDGET = 256;
export const DEEP_PROMPT_AUTO_KEY = 'auto'; // 'Default (Auto)' has no model id — the host picks, we can't sniff

// ✨ THE TIER → TAG-CEILING TABLE (single source of truth) ✨
// The 77 tier reproduces today's hardcoded ceilings EXACTLY (prefix slice(0,10),
// core 8, dynamic 12, outfit 3, pose 4, env 4) — that is the byte-identical legacy
// path. Every higher tier raises the ceilings in proportion to its token headroom,
// calibrated so the worst-case tag count still fits the tier (conservative estimator,
// see estimatePromptTokens). Category ceilings become upper bounds; the tier is the
// token dedication the user asked for.
// `deep` = the scene-enrichment slot (camera/lighting/ambience/mood tags authored by
// the OOB side-channel deep pass). 0 at the 77 tier = feature OFF = legacy bytes.
const BUDGET_TABLE = {
    77: { prefix: 10, core: 8, dynamic: 12, outfit: 3, pose: 4, env: 4, deep: 0 },
    128: { prefix: 12, core: 10, dynamic: 16, outfit: 4, pose: 6, env: 6, deep: 5 },
    256: { prefix: 14, core: 12, dynamic: 22, outfit: 5, pose: 8, env: 8, deep: 8 },
    512: { prefix: 16, core: 16, dynamic: 30, outfit: 6, pose: 10, env: 10, deep: 12 },
};

// The sections a user may custom-allocate in the ADVANCED_ALLOCATION mixer.
export const DEEP_ALLOC_SECTIONS = ['prefix', 'core', 'dynamic', 'outfit', 'pose', 'env', 'deep'];

// ✨ v2.7.32 THE OPEN LEDGER — the mixer's VISIBLE rows: `dynamic` (the auto join cap) is
// deliberately hidden — it's infrastructure (the governor-managed assembler ceiling),
// never a user spend choice. Engine paths still consume DEEP_ALLOC_SECTIONS (back-compat:
// stored allocs may carry a `dynamic` value, still clamped + governed).
export const DEEP_MIXER_SECTIONS = ['prefix', 'core', 'outfit', 'pose', 'env', 'deep'];

// ✨ ALLOC ECONOMY ✨ — the four CONTENT sections share one spendable tag pool: the tier's
// natural budget, spendable FREELY (a single section may take the entire pool). The only
// law is zero-sum: the family sum may never exceed the tier's pool — the tier is the
// encoder budget (depth doctrine), inflation is structurally impossible. prefix/core stay
// OUT of the economy (identity + separate assembly channel; identity may never be sold
// to buy outfit tags).
export const DEEP_ECONOMY_SECTIONS = ['outfit', 'pose', 'env', 'deep'];
const DEEP_ECONOMY_HARD_MULT = 2; // the `dynamic` join cap's own steppable ceiling (2× table)

// The identity floor: core_appearance slots ARE the girl — no allocation may strip
// her identity below legacy density. Everything else may go to 0 by user choice.
const LEGACY_CORE_FLOOR = 8;

// ✨ SCENE ENRICHMENT MODES ✨ — who authors the extra scene tags at deep tiers:
//   'smart' = OOB side-channel deep pass first (scene-aware LLM tags), curated pools
//             only top up the remaining headroom. THE DEFAULT — richer, per-scene.
//   'pools' = v2.7.27 behavior — deterministic curated pools only, no OOB deep ask.
//   'off'   = no scene enrichment at all; only the main outfit/pose/env tags.
export const SCENE_ENRICHMENT_MODES = ['off', 'pools', 'smart'];
export const normalizeSceneMode = (mode) => (SCENE_ENRICHMENT_MODES.includes(mode) ? mode : 'smart');

/**
 * Snap a requested budget to the largest known tier ≤ requested. Below the smallest
 * tier (or garbage input) falls back to the default tier — never invent a tier.
 * @param {number} tokenBudget
 * @returns {number} a valid tier from DEEP_PROMPT_TIERS
 */
export const normalizeDeepPromptBudget = (tokenBudget) => {
    const n = Number(tokenBudget);
    if (!Number.isFinite(n)) return DEFAULT_DEEP_PROMPT_BUDGET;
    const valid = DEEP_PROMPT_TIERS.filter((t) => t <= n);
    return valid.length > 0 ? Math.max(...valid) : DEEP_PROMPT_TIERS[0];
};

// ✨ v2.7.51 THE OPEN TIER ✨ — custom token budgets. The four known tiers are the tested
// anchors; anything between/beyond them derives a tier ROW (piecewise-linear interpolation
// between bracketing anchors, slope extrapolation past 512) so the whole economy — mixer
// ledger, steppers, caps, presets, the DYNAMIC director, guidance bands — speaks custom
// natively. Doctrine stays intact: a custom budget is HEADROOM, not a prompt-padder — the
// director still spends only what the scene earns (zero-sum law, no inflation).
export const DEEP_PROMPT_MAX_BUDGET = 2048; // beyond this, tag counts explode and every host disagrees — hard cap

/**
 * Sanitize a token budget for PERSISTENCE: garbage → default; below 77 → the legacy floor;
 * above the cap → the cap. Unlike normalizeDeepPromptBudget, a custom value SURVIVES
 * (that is the whole point of the Open Tier).
 * @param {number} tokenBudget
 * @returns {number}
 */
export const resolveDeepTierBudget = (tokenBudget) => {
    const n = Math.floor(Number(tokenBudget));
    if (!Number.isFinite(n)) return DEFAULT_DEEP_PROMPT_BUDGET;
    if (n < DEEP_PROMPT_TIERS[0]) return DEEP_PROMPT_TIERS[0];
    return Math.min(n, DEEP_PROMPT_MAX_BUDGET);
};

// Piecewise-linear row builder over the known anchor tiers.
const lerpAnchorRow = (loRow, hiRow, t) => {
    const row = {};
    for (const k of DEEP_ALLOC_SECTIONS) row[k] = Math.round(loRow[k] + (hiRow[k] - loRow[k]) * t);
    return row;
};

const deriveCustomTierRow = (budget) => {
    const tiers = DEEP_PROMPT_TIERS;
    for (let i = 0; i < tiers.length - 1; i++) {
        const lo = tiers[i];
        const hi = tiers[i + 1];
        if (budget >= lo && budget <= hi) {
            return lerpAnchorRow(BUDGET_TABLE[lo], BUDGET_TABLE[hi], (budget - lo) / (hi - lo));
        }
    }
    // Past the last anchor: extrapolate on the final bracket's slope, then hold the floors.
    const lo = tiers[tiers.length - 2];
    const hi = tiers[tiers.length - 1];
    const row = {};
    for (const k of DEEP_ALLOC_SECTIONS) {
        row[k] = Math.round(BUDGET_TABLE[hi][k] + ((BUDGET_TABLE[hi][k] - BUDGET_TABLE[lo][k]) / (hi - lo)) * (budget - hi));
    }
    row.prefix = Math.max(row.prefix, BUDGET_TABLE[hi].prefix); // donors only ever grow past 512
    row.core = Math.max(row.core, LEGACY_CORE_FLOOR); // identity floor holds at any tier
    for (const k of DEEP_MIXER_SECTIONS) {
        if (k !== 'prefix' && k !== 'core') row[k] = Math.max(1, row[k]); // every content section stays alive
    }
    return row;
};

/**
 * THE tier resolver: known budgets → the exact anchor row (byte-identical); custom
 * budgets → a deterministic derived row. Everything downstream consumes this pair.
 * @param {number} tokenBudget
 * @returns {{tier: number, table: {prefix: number, core: number, dynamic: number, outfit: number, pose: number, env: number, deep: number}}}
 */
export const resolveDeepTierRow = (tokenBudget) => {
    const tier = resolveDeepTierBudget(tokenBudget);
    if (BUDGET_TABLE[tier]) return { tier, table: BUDGET_TABLE[tier] };
    return { tier, table: deriveCustomTierRow(tier) };
};

/**
 * Resolve the tag ceilings for a token tier. Unknown values snap to a valid tier.
 * An optional alloc override (user's ADVANCED_ALLOCATION mixer values) is clamped
 * fail-closed against the tier table — the app owns the token economy, so a custom
 * allocation can never exceed what the tier's encoder budget can actually chew.
 * ✨ DYNAMIC DIRECTOR: with NO stored alloc + scene text + a deep tier, the allocation is
 * computed PER IMAGE by resolveDynamicAlloc (the director spends the pool per scene).
 * Authoring guidance (KV-cached sysPrompts) must NEVER pass sceneText — the ask stays
 * the static default split; only the build-time budgets breathe.
 * @param {number} tokenBudget
 * @param {{prefix?: number, core?: number, dynamic?: number, outfit?: number, pose?: number, env?: number, deep?: number}|null} [allocOverride]
 * @param {string} [sceneText] — the assembled tag/prose text for THIS image (dynamic mode only)
 * @param {{outfit?: number, pose?: number, env?: number, deep?: number}|null} [skewHint] — validated+clamped OOB photoTags scene-classification (dynamic mode only; a custom alloc outranks it)
 * @param {number} [prefixCount] — LIVE prefix tag count (dynamic mode only): the freed donor tags (table.prefix − count) fund the director's pool and the reported `prefix` shows the live count, so the ledger can never double-count reserved-but-unused tags
 * @param {Record<string, number>|null} [styleSkew] — ✨ v2.7.52 Director's Chair — the style multipliers (dynamic mode only)
 * @returns {{prefix: number, core: number, dynamic: number, outfit: number, pose: number, env: number, deep: number, tier: number}}
 */
export const resolveImageBudgets = (tokenBudget, allocOverride, sceneText, skewHint, prefixCount, styleSkew) => {
    const { tier, table } = resolveDeepTierRow(tokenBudget);
    const custom = normalizeDeepAlloc(tier, allocOverride);
    // ✨ DYNAMIC DIRECTOR PATH — absence of a stored alloc IS dynamic mode (the default).
    const dynAlloc = (!custom && typeof sceneText === 'string' && sceneText.trim().length > 0 && tier > 77)
        ? resolveDynamicAlloc(tier, sceneText, skewHint, livePrefixFreed(table, prefixCount), styleSkew)
        : null;
    const budgets = custom ? custom : (dynAlloc ? { ...table, ...dynAlloc } : { ...table });
    // ✨ v2.7.49 FULL LEDGER — dynamic path reports the LIVE prefix count: reserved table
    // tags the user's prefix doesn't actually carry were the "phantom unspent" in the mixer.
    if (dynAlloc && Number.isFinite(prefixCount)) {
        budgets.prefix = Math.max(0, Math.min(Math.floor(prefixCount), table.prefix));
    }
    // ✨ AUTO JOIN-GOVERNOR (custom + dynamic paths) — the dynamic cap FOLLOWS the family:
    // a deliberate fat spend can never be tail-trimmed by a stale join value. Pristine
    // table path keeps the table join cap (byte-identical default).
    if (custom || dynAlloc) {
        const familySum = DEEP_ECONOMY_SECTIONS.reduce((s, k) => s + budgets[k], 0);
        if (familySum > budgets.dynamic) {
            budgets.dynamic = Math.min(familySum, table.dynamic * DEEP_ECONOMY_HARD_MULT);
        }
    }
    return { ...budgets, tier };
};

/**
 * The tier's spendable tag pool: the sum of the four content-section defaults.
 * Freed tags are transferable, never inflatable — this is the zero-sum budget.
 * @param {number} tokenBudget
 * @returns {number}
 */
export const deepEconomyPool = (tokenBudget) => {
    const { table } = resolveDeepTierRow(tokenBudget);
    return DEEP_ECONOMY_SECTIONS.reduce((s, k) => s + table[k], 0);
};

/**
 * ✨ v2.7.32 THE OPEN LEDGER ✨ — the tier's GRAND total budget: prefix + core + the
 * content pool. Prefix and core consume real encoder tokens, so the one honest budget
 * number counts them. Defaults sum to this exactly (zero-sum law at grand scope).
 * 77→29, 128→43, 256→55, 512→70.
 * @param {number} tokenBudget
 * @returns {number}
 */
export const deepEconomyTotal = (tokenBudget) => {
    const { table: t } = resolveDeepTierRow(tokenBudget);
    return t.prefix + t.core + DEEP_ECONOMY_SECTIONS.reduce((s, k) => s + t[k], 0);
};

/**
 * SHRINK-ONLY DONORS: prefix/core may be LOWERED to fund content sections (their freed
 * tags flow into the effective family pool) but may never grow past their table values —
 * identity prose and the user's prefix curation are protected (donors, not spenders).
 * @param {object} table — the tier table row
 * @param {object} out — an allocation (prefix/core already clamped ≤ table)
 * @returns {number} the content family's effective pool = base pool + donor freed tags
 */
const effectiveFamilyPool = (table, out) => {
    const base = DEEP_ECONOMY_SECTIONS.reduce((s, k) => s + table[k], 0);
    // ✨ v2.7.52 NET DONORS — prefix/core are budgetable both ways now: lowering FREES tags
    // into the content family, raising RESERVES encoder tokens and shrinks the pool (the
    // user budgeting a fat LocalDream host prefix, for example). Net, not clamped — the
    // honest ledger. Floor 0 keeps the family fail-closed when donors over-reserve.
    const donorDelta = (table.prefix - out.prefix) + (table.core - out.core);
    return Math.max(0, base + donorDelta);
};

// ✨ THE DYNAMIC DIRECTOR ✨ — per-image intelligent allocation. When no custom allocation
// is stored (the DEFAULT), the director reads the scene being assembled and skews the
// spend: a beach walk buys environment, a close-up selfie buys outfit texture and camera
// depth, a dance sequence buys pose. Pure keyword signals + largest-remainder
// apportionment — deterministic, testable, and its no-signal output IS the table (the
// fixed point), so an unreadable scene renders byte-identical defaults.
// KV LAW: this runs ONLY at prompt-build time. The authoring asks (sysPrompt guidance,
// OOB_ASKS counts) stay frozen on the default split — per-image variance in a cached
// system prompt would bust the KV prefix cache every turn.
const SCENE_SIGNAL_LEXICON = [
    { id: 'portrait', re: /close-?up|selfie|portrait|headshot|upper body|looking at viewer|face shot|focus on (?:her |the )?face|eyes closed|winking/i },
    { id: 'active', re: /running|dancing|jump|fighting|combat|swimming|stretching|yoga|workout|exercise|training|chasing|sparring|cheering|spinning|skating|cycling|action|kneeling|squatting|crouching|leaping|pouncing|bending|bent over|arching|arched back|posing|pose\b|posture|stance|handstand|cartwheel|acrobatic|leaning|reaching|tiptoes|on all fours|from behind|over[- ]the[- ]shoulder|looking back|hands? on hips?|arms? up|arms? behind|peace sign|leg lift|split\b|flexing|twisting|cowboy shot|full body|foreshortening|pov\b/i },
    { id: 'outdoor', re: /beach|park|forest|street|city|rooftop|garden|mountain|pool|ocean|sea\b|river|lake|outdoor|sky|rain|snow|sunset|sunrise|field|meadow|market|festival|fireworks|nature/i },
    { id: 'indoor', re: /bedroom|living room|kitchen|bathroom|onsen|hot spring|bath\b|office|classroom|caf[eé]|library|indoor|couch|sofa|desk|restaurant|hotel|elevator|gym\b|dojo|studio|club\b|ballroom/i },
    { id: 'fashion', re: /dress|gown|lingerie|swimsuit|bikini|uniform|cosplay|costume|armor|jewelry|heels|stockings|thighhighs|corset|cloak|cape|outfit|wardrobe|fitting room|runway|trying on|ootd|maid|kimono|yukata|cheongsam|bunny suit|fishnets|pantyhose|garters/i },
    { id: 'scenic', re: /wide shot|panorama|landscape|cityscape|skyline|scenic|vista|horizon|countryside|seascape|mountain range|aerial view/i },
    { id: 'atmosphere', re: /night\b|moonlight|neon|candlelight|starry|fog\b|mist\b|aurora|firelight|lantern|twilight|dusk|dawn|glow\b|shadows?\b/i },
    { id: 'intimate', re: /kiss|embrace|entwined|caress|hug|cuddling|holding hands|straddl|lap pillow|whisper|sprawled|reclining|undress|stripping|lifting skirt|skirt lift|shirt lift|pulling down|unbutton|touching|groping|riding|cowgirl|missionary|doggy|spooning|pinned|mounted|spreading|on top of|between legs|aroused|ahegao|panting|flustered|seductive|teasing/i },
    { id: 'nude', re: /\b(?:nude|naked|completely undressed|bare skin|nothing on|topless|bottomless)\b/i },
];

/**
 * Classify raw scene text into allocation STRENGTHS: hit counts capped at 2 (a passing
 * mention = 1, a scene built around the signal = 2). Empty/garbage text → no signals
 * (the director abstains and the table default stands). Pure + deterministic.
 * @param {string} sceneText
 * @returns {Record<string, number>} e.g. { portrait: 2, outdoor: 1 } — absent key = signal not fired
 */
export const classifySceneSignals = (sceneText) => {
    const text = (typeof sceneText === 'string') ? sceneText.toLowerCase() : '';
    if (!text.trim()) return {};
    const signals = {};
    for (const { id, re } of SCENE_SIGNAL_LEXICON) {
        const hits = text.match(new RegExp(re.source, 'gi'));
        if (hits && hits.length > 0) signals[id] = Math.min(2, hits.length);
    }
    return signals;
};

// Signal → weight multipliers, applied to the table proportions (exponent = hit strength).
// The table IS the fixed point: no signal fired = byte-identical default split.
const SCENE_SIGNAL_SKEW = {
    portrait: { outfit: 1.5, pose: 1.0, env: 0.5, deep: 1.35 },    // face forward: wardrobe texture + camera depth, less scene
    active: { outfit: 0.95, pose: 1.85, env: 0.85, deep: 0.95 },   // pose/action-heavy: pose gets the lion's share of the budget
    outdoor: { outfit: 0.95, pose: 1.0, env: 1.8, deep: 1.2 },     // the world is the subject
    indoor: { outfit: 1.05, pose: 1.05, env: 1.1, deep: 1.2 },     // intimate settings lean on ambience + staging
    fashion: { outfit: 1.65, pose: 0.95, env: 0.9, deep: 1.0 },    // the wardrobe IS the scene
    scenic: { outfit: 0.85, pose: 0.85, env: 1.75, deep: 1.25 },   // environment-heavy: the frame is the subject
    atmosphere: { outfit: 0.95, pose: 1.0, env: 1.1, deep: 1.6 },  // lighting/ambience quality carries the mood
    intimate: { outfit: 0.9, pose: 1.7, env: 0.8, deep: 1.15 },    // pose-heavy: body staging & expression carry the frame
    nude: { outfit: 0.35, pose: 1.65, env: 0.9, deep: 1.2 },       // undressed: minimal outfit tags needed, shift budget to pose + scene
};

/**
 * Largest-remainder apportionment: split `pool` across `keys` proportional to `weights`,
 * summing EXACTLY to the pool. Deterministic — fractional ties resolve by section order.
 * @param {number} pool
 * @param {string[]} keys
 * @param {Record<string, number>} weights
 * @returns {Record<string, number>}
 */
export const apportionPool = (pool, keys, weights) => {
    const total = keys.reduce((s, k) => s + (weights[k] || 0), 0) || 1;
    const raw = {};
    const out = {};
    for (const k of keys) { raw[k] = (pool * (weights[k] || 0)) / total; out[k] = Math.floor(raw[k]); }
    let left = pool - keys.reduce((s, k) => s + out[k], 0);
    const order = keys
        .map((k) => ({ frac: raw[k] - out[k], idx: keys.indexOf(k), k }))
        .sort((a, b) => (b.frac - a.frac) || (a.idx - b.idx));
    for (let i = 0; i < left && i < order.length; i++) out[order[i].k] += 1;
    return out;
};

/**
 * ✨ THE DIRECTOR'S LEDGER ✨ — compute a per-image allocation of the tier pool from the
 * scene text. Weights start at the table proportions (the apportionment fixed point —
 * no signals = the table, exactly), then each fired signal skews them. Floors keep every
 * section alive (≥ 1) at deep tiers; tier 77 always returns the table verbatim (legacy
 * bytes law — the director sleeps at the legacy tier).
 * @param {number} tokenBudget
 * @param {string} sceneText
 * @param {{outfit?: number, pose?: number, env?: number, deep?: number}|null} [skewHint] — validated+clamped OOB scene classification
 * @param {number} [bonusPool] — freed shrink-only donor tags (live prefix below the tier table) added to the spendable pool
 * @param {Record<string, number>|null} [styleSkew] — ✨ v2.7.52 Director's Chair — the ALLOC_PRESETS style multipliers applied on top of scene signals
 * @returns {{outfit: number, pose: number, env: number, deep: number}}
 */
export const resolveDynamicAlloc = (tokenBudget, sceneText, skewHint, bonusPool = 0, styleSkew = null) => {
    const { tier, table } = resolveDeepTierRow(tokenBudget);
    if (tier <= 77) return { outfit: table.outfit, pose: table.pose, env: table.env, deep: table.deep }; // legacy bytes — the director sleeps (bonus ignored)
    // ✨ v2.7.49 DONOR-AWARE POOL ✨ — freed shrink-only donor tags (live prefix count below
    // the tier table) widen the spendable pool. Zero-sum law holds: the tier total never
    // inflates, the money just moves to where the pixels are. Garbage/negative clamps to 0.
    const bonus = Math.max(0, Math.floor(Number(bonusPool) || 0));
    const pool = DEEP_ECONOMY_SECTIONS.reduce((s, k) => s + table[k], 0) + bonus;
    const signals = classifySceneSignals(sceneText);
    // If the scene is explicitly nude/undressed, suppress accidental fashion boosts so
    // unused wardrobe budget shifts cleanly into pose and scene depth.
    if (signals.nude > 0 && signals.fashion > 0) delete signals.fashion;
    const weights = {};
    for (const k of DEEP_ECONOMY_SECTIONS) {
        let w = table[k] || 1;
        for (const id of Object.keys(signals)) {
            const strength = signals[id] || 0;
            if (strength > 0 && SCENE_SIGNAL_SKEW[id]) w *= Math.pow(SCENE_SIGNAL_SKEW[id][k] ?? 1, strength);
        }
        // OOB skew hint (photoTags piggyback): the side-channel LLM classifies the scene in
        // the same pass that authors tags — zero extra latency. Caller validates + clamps to
        // [0.5, 2]; a non-finite number here is ignored (fail-closed: keywords stand).
        if (skewHint && Number.isFinite(skewHint[k])) w *= Math.min(2, Math.max(0.5, skewHint[k]));
        // ✨ Director's Chair — the style skew rides LAST: it tilts the scene-driven weights
        // (clamped to sane [0.25, 4] so no style can zero or explode a channel).
        if (styleSkew && Number.isFinite(styleSkew[k])) w *= Math.min(4, Math.max(0.25, styleSkew[k]));
        weights[k] = w;
    }
    const alloc = apportionPool(pool, DEEP_ECONOMY_SECTIONS, weights);
    // liveness floors — every content section stays ≥ 1 so no signal combo can zero a
    // channel; over-spend (impossible with these skews) is trimmed from the fattest.
    for (const k of DEEP_ECONOMY_SECTIONS) if (alloc[k] < 1) alloc[k] = 1;
    let sum = DEEP_ECONOMY_SECTIONS.reduce((s, k) => s + alloc[k], 0);
    while (sum > pool) {
        let victim = DEEP_ECONOMY_SECTIONS[0];
        for (const k of DEEP_ECONOMY_SECTIONS) if (alloc[k] > alloc[victim]) victim = k;
        if (alloc[victim] <= 1) break; // fail-closed guard
        alloc[victim] -= 1;
        sum -= 1;
    }
    return alloc;
};

/**
 * ✨ v2.7.49 THE FULL LEDGER — the director's no-signal DEFAULT as a concrete allocation ✨
 * A live prefix usually carries fewer tags than the tier table reserves, so the default
 * DYNAMIC split left those freed tags permanently unspent in the mixer. This is the
 * exact allocation the director computes over the FULL pool (base economy + freed
 * prefix): table proportions via apportionPool, summing EXACTLY to the grand total.
 * The mixer uses it as its display baseline when no custom alloc is stored, so the
 * ledger reads FULL out of the box and matches what real builds actually spend.
 * @param {number} tokenBudget
 * @param {number} [prefixCount] — live prefix tag count (default = the tier table value)
 * @returns {{outfit: number, pose: number, env: number, deep: number}}
 */
export const resolveDefaultFullSpendAlloc = (tokenBudget, prefixCount) => {
    const { tier, table } = resolveDeepTierRow(tokenBudget);
    const livePrefix = Number.isFinite(prefixCount) ? Math.max(0, Math.min(Math.floor(prefixCount), table.prefix)) : table.prefix;
    const freed = table.prefix - livePrefix;
    // ✨ v2.7.52 — tier 77 keeps the table ECONOMY (legacy bytes law governs real builds) but
    // the mixer DISPLAYS the live prefix count so the ledger never lies about reserved tags.
    if (tier <= 77 || freed <= 0) return { ...table, prefix: tier <= 77 ? livePrefix : table.prefix, tier };
    const split = resolveDynamicAlloc(tier, '', null, freed); // no signals = table proportions over the FULL pool
    const familySum = DEEP_ECONOMY_SECTIONS.reduce((s, k) => s + split[k], 0);
    // full row; the join cap follows the family EXACTLY like resolveImageBudgets' governor,
    // so the mixer's view and a real no-signal build resolve byte-identically.
    return { ...table, prefix: livePrefix, ...split, dynamic: Math.min(familySum, table.dynamic * DEEP_ECONOMY_HARD_MULT), tier };
};


/**
 * ✨ v2.7.49 FULL LEDGER ✨ — freed shrink-only donor tags: how many reserved prefix tags
 * the LIVE prefix config doesn't carry. Clamp + floor, garbage = 0 (fail-closed: no bonus).
 * @param {object} table — the tier table row
 * @param {number} [prefixCount] — live prefix tag count
 * @returns {number}
 */
const livePrefixFreed = (table, prefixCount) => {
    if (!Number.isFinite(prefixCount)) return 0;
    return Math.max(0, table.prefix - Math.max(0, Math.floor(prefixCount)));
};

/**
 * ✨ ALLOCATION MIXER (fail-closed clamp + zero-sum economy) ✨ — validate + clamp a
 * user's custom per-section allocation. Economy sections (outfit/pose/env/deep) may
 * spend FREELY up to the entire EFFECTIVE pool (base + donor freed tags — lowering
 * prefix/core funds the content family); prefix/core are SHRINK-ONLY DONORS (clamp at
 * their table values, core floored at the legacy density of 8); `dynamic` (hidden from
 * the mixer, back-compat) clamps at 2×. Garbage (null/array/no-numeric-fields) → null =
 * dynamic mode (the director allocates). Partial objects: numeric keys override, the
 * rest keep defaults.
 * ✨ ALLOC ECONOMY trim: the four content sections may never sum above the effective
 * pool — the trim is DETERMINISTIC (largest overshoot above table default first, ties by
 * section order), trim victims are ALWAYS LLM sections (the user's prefix/core values
 * are never auto-cut), and defaults alone always sum to the pool exactly, so the trim
 * can only ever cut deliberate overspends, never a default.
 * @param {number} tokenBudget
 * @param {object|null|undefined} alloc
 * @returns {object|null}
 */
export const normalizeDeepAlloc = (tokenBudget, alloc) => {
    const { tier, table } = resolveDeepTierRow(tokenBudget);
    if (!alloc || typeof alloc !== 'object' || Array.isArray(alloc)) return null;
    const out = {};
    let sawNumber = false;
    for (const k of DEEP_ALLOC_SECTIONS) {
        const raw = Number(alloc[k]);
        if (Number.isFinite(raw)) {
            sawNumber = true;
            const floor = (k === 'core') ? Math.min(LEGACY_CORE_FLOOR, table[k]) : 0;
            // ✨ v2.7.52 NET DONORS — prefix/core may RESERVE above the table too (budgeting a
            // fat host prefix); the effective family pool shrinks net. Cap 2× table.
            const max = (k === 'prefix' || k === 'core') ? table[k] * DEEP_ECONOMY_HARD_MULT
                : (k === 'dynamic' ? table[k] * DEEP_ECONOMY_HARD_MULT : effectiveFamilyPool(table, out));
            out[k] = Math.max(floor, Math.min(Math.floor(raw), max));
        } else {
            out[k] = table[k];
        }
    }
    if (!sawNumber) return null;
    enforceDeepEconomy(table, out);
    return out;
};

// Deterministic zero-sum trim: cut the LLM section furthest ABOVE its table default, one
// tag at a time, until the family fits the EFFECTIVE pool (base + donor freed tags).
// Defaults sum to the base pool exactly, so a defaults-only allocation never trims
// (legacy behavior untouched); prefix/core are never trim victims (donor law).
const enforceDeepEconomy = (table, out) => {
    const effective = effectiveFamilyPool(table, out);
    let sum = DEEP_ECONOMY_SECTIONS.reduce((s, k) => s + out[k], 0);
    while (sum > effective) {
        let victim = null;
        let worst = 0;
        for (const k of DEEP_ECONOMY_SECTIONS) {
            const over = out[k] - table[k];
            if (over > worst) { worst = over; victim = k; } // strict > = ties resolve by section order
        }
        if (!victim) {
            // ✨ v2.7.52 NET DONORS — reserved donors can shrink the pool BELOW the defaults;
            // when nothing is above its default, trim deterministically from the LARGEST
            // section (never below 1 — the liveness floor).
            for (const k of DEEP_ECONOMY_SECTIONS) {
                if (out[k] > 1 && (!victim || out[k] > out[victim])) victim = k;
            }
            if (!victim) break; // everything floored — fail-closed guard
        }
        out[victim] -= 1;
        sum -= 1;
    }
};

/**
 * ✨ LIVE STEPPER CAPS ✨ — the honest per-section {min, max} for the mixer UI. Economy
 * sections are FREE-FORM within the EFFECTIVE pool: a section's cap is (base pool +
 * donor freed tags) minus whatever the other three hold — lower a sibling (or lower
 * prefix/core: shrink-only donors) and this cap grows live. prefix/core cap at their
 * table values (donors may never grow); `dynamic` (hidden) keeps its 2× back-compat cap.
 * @param {number} tokenBudget
 * @param {object|null|undefined} alloc — the user's stored custom allocation (if any)
 * @returns {Record<string, {min: number, max: number}>}
 */
export const getDeepAllocCaps = (tokenBudget, alloc) => {
    const { tier, table } = resolveDeepTierRow(tokenBudget);
    const norm = normalizeDeepAlloc(tier, alloc) || { ...table };
    const effective = effectiveFamilyPool(table, norm);
    const caps = {};
    for (const k of DEEP_ALLOC_SECTIONS) {
        const floor = (k === 'core') ? Math.min(LEGACY_CORE_FLOOR, table[k]) : 0;
        if (DEEP_ECONOMY_SECTIONS.includes(k)) {
            const othersSum = DEEP_ECONOMY_SECTIONS.reduce((s, x) => s + (x === k ? 0 : norm[x]), 0);
            caps[k] = { min: 0, max: Math.max(norm[k], effective - othersSum) };
        } else if (k === 'dynamic') {
            caps[k] = { min: 0, max: table[k] * DEEP_ECONOMY_HARD_MULT };
        } else {
            // ✨ v2.7.52 NET DONORS — prefix/core are budgetable both ways (raise = reserve
            // encoder tokens and shrink the content pool; lower = free tags). Cap 2× table;
            // core keeps the identity floor.
            caps[k] = { min: floor, max: table[k] * DEEP_ECONOMY_HARD_MULT };
        }
    }
    return caps;
};

// ✨ v2.7.52 THE DIRECTOR'S CHAIR ✨ — presets are no longer frozen allocation snapshots:
// they are STYLE SKEWS the DYNAMIC director applies on top of scene signals. The director
// always spends the pool per scene; the style just tilts its taste (CINEMATIC leans
// camera/light/atmosphere, FASHION wardrobe, SCENIC environment). DYNAMIC (skew: null)
// is the pure scene-driven default — the recommended pick. MINIMAL is retired.
export const ALLOC_PRESETS = {
    dynamic: { label: 'DYNAMIC', desc: 'the director decides, fully scene-driven — recommended', skew: null },
    cinematic: { label: 'CINEMATIC', desc: 'the director leans cinematic: camera, light, atmosphere', skew: { outfit: 0.8, pose: 0.85, env: 1.35, deep: 1.5 } },
    fashion: { label: 'FASHION', desc: 'the director leans wardrobe-first', skew: { outfit: 1.8, pose: 1.1, env: 0.7, deep: 0.9 } },
    scenic: { label: 'SCENIC', desc: 'the director leans environment-first', skew: { outfit: 0.7, pose: 0.9, env: 1.8, deep: 1.3 } },
};

/**
 * Normalize a stored style id to a valid key (unknown/garbage → 'dynamic').
 * @param {string} style
 * @returns {string}
 */
export const normalizeAllocStyle = (style) => (ALLOC_PRESETS[style] ? style : 'dynamic');

/**
 * The multipliers a style applies to the director's weights (null = pure dynamic).
 * @param {string} style
 * @returns {Record<string, number>|null}
 */
export const resolveAllocStyleSkew = (style) => ALLOC_PRESETS[normalizeAllocStyle(style)].skew;

/**
 * Resolve a preset into a concrete allocation + scene mode for a tier.
 *   dynamic   → alloc: undefined — absence IS dynamic mode (per-image director).
 *   cinematic → the tier table frozen into a static snapshot (locks the balanced split).
 *   shares    → pool shares via largest-remainder; at tier 77 `deep` stays closed and
 *               the spend redistributes across outfit/pose/env (legacy bytes law).
 * @param {string} presetId — an ALLOC_PRESETS key
 * @param {number} tokenBudget
 * @returns {{alloc: object|undefined, sceneMode: string}|null}
 */
export const resolveAllocPreset = (presetId, tokenBudget) => {
    const preset = ALLOC_PRESETS[presetId];
    if (!preset) return null;
    // ✨ v2.7.52 Director's Chair — every style resolves to alloc: undefined: the director
    // spends the pool per scene, skewed by the style. A stored `alloc` now exists ONLY when
    // the user seizes manual control in the ADVANCED_ALLOCATION menu (the override).
    return { alloc: undefined, sceneMode: preset.sceneMode || 'smart' };
};

// Per-model activation memory: { [modelId | 'auto']: { enabled: boolean, budget: number } }

/**
 * Read the stored prefs for a model key, defaulting to OFF + default tier.
 * Never returns null — callers shouldn't have to guard. Custom allocations are
 * re-clamped at read time, so a tier switch can never leave stale over-ceiling values.
 * @param {Record<string, {enabled?: boolean, budget?: number, alloc?: object, sceneMode?: string}>|null|undefined} prefs
 * @param {string} modelKey
 */
export const getDeepPromptPrefsForModel = (prefs, modelKey) => {
    const key = modelKey || DEEP_PROMPT_AUTO_KEY;
    const entry = (prefs && typeof prefs === 'object') ? prefs[key] : null;
    if (!entry || typeof entry !== 'object') {
        const isPerchance = String(key).toLowerCase().includes('perchance');
        return { enabled: isPerchance, budget: DEFAULT_DEEP_PROMPT_BUDGET, sceneMode: 'smart', style: 'dynamic' };
    }
    return {
        enabled: entry.enabled === true,
        budget: resolveDeepTierBudget(entry.budget), // ✨ v2.7.51 Open Tier — custom budgets SURVIVE persistence
        alloc: normalizeDeepAlloc(entry.budget, entry.alloc) || undefined,
        sceneMode: normalizeSceneMode(entry.sceneMode),
        style: normalizeAllocStyle(entry.style), // ✨ v2.7.52 Director's Chair — the style id (dynamic default)
    };
};

/**
 * The ONE resolver every call site should use: null when deep mode is OFF (legacy
 * path), otherwise the clamped budgets (tier table merged with any custom alloc)
 * plus the scene-enrichment mode for the fill engine and OOB asks. With no stored
 * alloc, an optional sceneText engages the Dynamic Director (per-image allocation).
 * KV LAW: never pass sceneText from KV-cached sysPrompt guidance builders — only from
 * prompt-assembly sites where per-image variance is safe.
 * @param {{enabled?: boolean, budget?: number, alloc?: object, sceneMode?: string}|null} prefs — a single model's prefs (getDeepPromptPrefsForModel output)
 * @param {string} [sceneText] — the assembled tag/prose text for THIS image (dynamic mode only)
 * @param {{outfit?: number, pose?: number, env?: number, deep?: number}|null} [skewHint] — validated+clamped OOB photoTags scene classification (dynamic mode only)
 * @param {number} [prefixCount] — live prefix tag count (dynamic mode only; feeds the freed-donor pool)
 * @param {Record<string, number>|null} [styleSkew] — the style multipliers (dynamic mode only)
 * @returns {object|null}
 */
export const resolveActiveDeepBudgets = (prefs, sceneText, skewHint, prefixCount, styleSkew) => {
    if (!prefs || prefs.enabled !== true) return null;
    return { ...resolveImageBudgets(prefs.budget, prefs.alloc, sceneText, skewHint, prefixCount, styleSkew), sceneMode: normalizeSceneMode(prefs.sceneMode) };
};

// ✨ TIER-AWARE AUTHORING GUIDANCE ✨ — the deep menus teach the LLM HOW to decompose
// each slot into orthogonal visual sub-facets (wardrobe layers, body staging + camera,
// scene props + lighting) instead of bloating prompts with synonyms or stock filler.
// At the 77 tier every count string and menu is byte-identical to the legacy contract,
// so deep-OFF prompts never change by a single byte.
const OUTFIT_DEPTH_MENU = ', add wardrobe depth (core garments, fabric/texture, footwear/legwear, outerwear/accessories — only items worn in this scene, no duplicate clothing synonyms)';
const CAMERA_DEPTH_MENU = ', include camera angle and composition (posture, specific hand/limb placement, gaze/micro-expression, and framing like dutch angle, from above, over-the-shoulder, looking back — no redundant pose synonyms)';
const AMBIENCE_DEPTH_MENU = ', include lighting quality and ambience (specific venue, background props/surfaces, light source like rim lighting, golden hour backlight, neon glow, dappled sunlight, and weather/time of day)';
const LEGACY_GUIDANCE = Object.freeze({ outfit: '1-3', pose: '1-4', env: '1-3', outfitMenu: '', poseMenu: '', envMenu: '' });

// ✨ MODULAR TIER PROFILES ✨ — structured sub-facet decomposition rules that REPLACE the
// legacy brevity mandate. Instead of saying "just add more tags" (which causes synonym
// spam or copy-pasted example tags), these instruct the LLM to decompose each category
// into distinct visual sub-facets grounded in the scene and scaled to the section budget.
const PROFILE_RULES_128 = [
    'IMAGE DEPTH: the encoder reads past the old limit — decompose each image slot into distinct visual facets up to its tag budget (never pad with synonyms or unrelated stock examples).',
    'OUTFIT DEPTH: decompose across (1) primary garments, (2) footwear & legwear/hosiery, (3) outerwear or scene-fitting accessories/jewelry.',
    'POSE DEPTH: decompose across (1) full-body posture, (2) specific hand/arm placement, (3) facial expression & gaze direction, (4) camera angle (e.g. dutch angle, from above, over-the-shoulder, looking back).',
    'ENVIRONMENT DEPTH: decompose across (1) specific venue/location, (2) key background prop or surface, (3) lighting quality & atmosphere (e.g. rim lighting, golden hour backlight, volumetric fog, neon glow, dappled sunlight, weather).',
    'STILL discrete lowercase Danbooru tags — no sentences, no prose, NO physical appearance tags (identity lock).',
];
const PROFILE_RULES_256 = [
    'IMAGE DEPTH DIRECTIVE: the text encoder reads far past the old limit — honor each slot\'s tag budget by decomposing the scene into orthogonal visual facets (NEVER repeat synonyms or copy-paste example tags that contradict the scene).',
    'OUTFIT DEPTH: break wardrobe into distinct facets — (1) core top/bottom/dress, (2) fabric/material/fit (silk, sheer, wet, oversized, open jacket), (3) footwear & hosiery/legwear, (4) accessories/jewelry/eyewear that fit the scene.',
    'POSE DEPTH: stage the whole body across distinct facets — (1) primary posture & weight distribution, (2) left/right hand & arm interaction, (3) leg/torso orientation, (4) camera angle & shot framing (e.g. dutch angle, from above, from below, over-the-shoulder, looking back, foreshortening).',
    'EXPRESSION DEPTH: pair specific micro-expressions with eye direction — e.g. averted gaze, half-closed eyes, blush, parted lips, subtle smirk, furrowed brow.',
    'ENVIRONMENT DEPTH: ground the setting across distinct facets — (1) specific venue architecture, (2) nearby furniture/props/surfaces, (3) time of day, weather & season, (4) directional light & atmosphere (e.g. rim lighting, golden hour backlight, volumetric fog, neon signage glow, dappled sunlight).',
    'STILL discrete lowercase Danbooru tags — no sentences, no prose, NO physical appearance tags (identity lock).',
];
const PROFILE_RULES_512 = [
    ...PROFILE_RULES_256,
    'COMPOSITION DEPTH: layer spatial depth across foreground elements, midground subject framing, and background vista/scenery.',
    'MOOD DEPTH: anchor color palette and atmospheric tone that match the narrative moment — e.g. warm colors, muted colors, vivid colors, chiaroscuro, dark ambient.',
];

/**
 * Build the per-section tag-count guidance + depth menus for the active tier.
 * @param {{tier?: number, deep?: number, sceneMode?: string}|null} [budgets] — resolveImageBudgets() output; null/77 = legacy contract
 * @returns {{outfit: string, pose: string, env: string, outfitMenu: string, poseMenu: string, envMenu: string, deepAsk: object|null, profileRules: string[]}}
 */
export const buildDeepTagGuidance = (budgets) => {
    const tier = (budgets && budgets.tier) || 77;
    const deepAsk = buildDeepAsk(tier, (budgets && budgets.deep) || 0, (budgets && budgets.sceneMode) || 'smart');
    if (tier <= 77) return { ...LEGACY_GUIDANCE, deepAsk: null, profileRules: [] };
    // ✨ ALLOC-AWARE ASKS ✨ — the mixer is the AUTHORING contract: ask ranges derive from the
    // RESOLVED per-section budgets (user alloc / preset / director table), so a fat outfit
    // allocation actually invites the LLM to author up to it, while a custom low/zero budget
    // is strictly honored. Absent budgets fall back to the tier TABLE value (historical band).
    const bandMin = tier <= 128
        ? { outfit: 2, pose: 2, env: 2 }
        : (tier <= 256 ? { outfit: 2, pose: 3, env: 3 } : { outfit: 3, pose: 5, env: 5 });
    const { table } = resolveDeepTierRow(tier);
    const fmt = (min, max) => (max > min ? `${min}-${max}` : `${max}`);
    const maxOf = (v, fallbackMax) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallbackMax);
    const outfitMax = maxOf(budgets && budgets.outfit, table.outfit);
    const poseMax = maxOf(budgets && budgets.pose, table.pose);
    const envMax = maxOf(budgets && budgets.env, table.env);
    return {
        outfit: fmt(Math.min(bandMin.outfit, outfitMax), outfitMax),
        pose: fmt(Math.min(bandMin.pose, poseMax), poseMax),
        env: fmt(Math.min(bandMin.env, envMax), envMax),
        outfitMenu: OUTFIT_DEPTH_MENU, poseMenu: CAMERA_DEPTH_MENU, envMenu: AMBIENCE_DEPTH_MENU,
        deepAsk,
        profileRules: tier <= 128 ? PROFILE_RULES_128 : (tier <= 256 ? PROFILE_RULES_256 : PROFILE_RULES_512),
    };
};

/**
 * ✨ OOB DEEP ASK ✨ — the per-group tag counts the side-channel deep pass may author
 * (camera / lighting / ambience / mood), derived from the tier's `deep` slot. Only
 * exists in 'smart' scene mode — 'pools' and 'off' never ask the LLM for deep tags.
 * Uses largest-remainder apportionment so camera + lighting + ambience + mood ALWAYS
 * sums to exactly `Math.floor(deepCap)` — even when the user sets a custom `deep` of 1 or 2.
 */
const buildDeepAsk = (tier, deepCap, sceneMode) => {
    const cap = Number.isFinite(deepCap) ? Math.floor(deepCap) : 0;
    if (tier <= 77 || cap <= 0 || sceneMode === 'off' || sceneMode === 'pools') return null;
    const weights = tier >= 512
        ? { camera: 0.3, lighting: 0.3, ambience: 0.2, mood: 0.2 }
        : { camera: 0.35, lighting: 0.35, ambience: 0.3, mood: 0 };
    const split = apportionPool(cap, ['camera', 'lighting', 'ambience', 'mood'], weights);
    return {
        camera: split.camera || 0,
        lighting: split.lighting || 0,
        ambience: split.ambience || 0,
        mood: tier >= 512 ? (split.mood || 0) : 0,
    };
};

// ✨ MIKA'S LAZY CAMERA — THE SPLIT PHOTO PROTOCOL (v2.7.45) ✨
// WHY: the full authoring bible (tier counts + depth menus + depth profile rules) rode
// the KV-CACHED system prefix on EVERY chat turn — ~700 tokens of dead weight on turns
// where nobody took a photo, plus a second full copy echoed in every historical turn's
// request payload. The split contract: the system prefix keeps a lean byte-stable
// CAMERA RULES block; THIS suffix rides the per-turn ephemeral photo directive ONLY on
// turns where a photo is actually possible (retry / user-asked / proactive window).
// Tier 77 or deep-OFF returns '' — legacy prompts stay byte-identical to the byte.
export const buildPhotoAuthoringSuffix = (tokenBudget, guidance) => {
    const tier = resolveDeepTierBudget(tokenBudget); // ✨ v2.7.51 Open Tier — custom tiers name themselves in the ask
    if (tier <= 77) return '';
    const g = guidance || buildDeepTagGuidance(resolveImageBudgets(tier));
    const rules = Array.isArray(g.profileRules) ? g.profileRules : [];
    return ` [IMAGE AUTHORING — tier ${tier}: when a photo is sent, build <image_prompt><outfit>${g.outfit} clothing tags${g.outfitMenu}</outfit><pose_and_expression>${g.pose} pose, action, expression, and selfie tags${g.poseMenu}</pose_and_expression><environment>${g.env} background and lighting tags${g.envMenu}</environment></image_prompt> — fill each slot to its budget.${rules.map((r) => ' '+ r).join('')}]`;
};
/**
 * ✨ CONSERVATIVE CLIP TOKEN ESTIMATOR ✨
 * Heuristic that errs HIGH so the UI promise ("~N tokens") never undersells the real
 * tokenizer: each word costs ceil(words * 1.7) BPE tokens (single-word tags round up
 * to 2), plus 1 token per comma separator. The host's real tokenizer always decides,
 * but a high estimate means we never promise more than the encoder can chew.
 * @param {string[]} tags
 * @returns {number} estimated CLIP token count (≥ 0)
 */
export const estimatePromptTokens = (tags) => {
    if (!Array.isArray(tags) || tags.length === 0) return 0;
    let total = 0;
    for (const raw of tags) {
        const tag = String(raw || '').trim();
        if (!tag) continue;
        const words = tag.split(/\s+/).filter(Boolean).length;
        total += Math.ceil(words * 1.7) + 1; // +1 for the comma separator
    }
    return total;
};

// ✨ DEEP FILL POOLS ✨ — app-curated, identity-safe, scene-only Danbooru tags. The LLM
// authors intent; the app owns the token economy (platform law #7). Pool order = priority:
// camera/composition first, then lighting, then ambience, then mood (512 only).
// Explicit-safety: every entry is scene/camera/lighting vocabulary — zero anatomy — so all
// explicit modes can take them. Bloat-screen: no entry equals a bloatBans string exactly
// ('detailed background' ≠ 'detailed'; 'depth of field' is deliberately ABSENT — it's banned).
const FILL_POOLS = [
    ['dynamic angle', 'dutch angle', 'from above', 'from below', 'over-the-shoulder shot', 'looking back', 'wide shot', 'close-up', 'foreshortening', 'cinematic composition', 'front view', 'three-quarter view'],
    ['cinematic lighting', 'rim lighting', 'volumetric lighting', 'golden hour lighting', 'soft lighting', 'backlighting', 'dappled sunlight', 'neon lighting', 'god rays', 'lens flare', 'dark ambient', 'moody lighting'],
    ['detailed background', 'blurry background', 'scenery', 'gradient background', 'light particles', 'floating particles', 'night sky', 'city lights', 'starry sky', 'clouds', 'rain', 'snowing', 'cherry blossoms', 'falling leaves', 'fireflies', 'steam'],
    ['warm colors', 'muted colors', 'cool colors', 'vivid colors', 'pastel colors', 'dark colors', 'contrasting colors'],
];

// ✨ FILL EXCLUSIVE GROUPS ✨ — tags within one group describe mutually exclusive
// scene facts (one weather, one shot framing, one camera elevation, one lighting time/mood,
// one background focus, one sky state, one color palette).
// Rule: ONE member per group per prompt — an existing tag from that group blocks
// the rest, and the fill takes at most one new member per group.
const FILL_EXCLUSIVE_GROUPS = [
    ['rain', 'snowing', 'cherry blossoms', 'falling leaves', 'fireflies', 'steam'],
    ['wide shot', 'close-up', 'front view', 'three-quarter view', 'over-the-shoulder shot', 'from above', 'from below', 'dutch angle', 'dynamic angle', 'foreshortening', 'portrait', 'upper body focus', 'cowboy shot', 'selfie', 'cinematic composition', 'looking back'],
    ['warm colors', 'muted colors', 'cool colors', 'vivid colors', 'pastel colors', 'dark colors', 'contrasting colors'],
    ['detailed background', 'blurry background', 'gradient background'],
    ['golden hour lighting', 'dappled sunlight', 'neon lighting', 'dark ambient', 'god rays', 'rim lighting', 'volumetric lighting', 'cinematic lighting', 'soft lighting', 'backlighting', 'moody lighting'],
    ['night sky', 'starry sky', 'clouds'],
];
const fillTagGroup = (tag) => {
    for (let g = 0; g < FILL_EXCLUSIVE_GROUPS.length; g++) {
        if (FILL_EXCLUSIVE_GROUPS[g].includes(tag)) return g;
    }
    return -1;
};

// Tags that require an outdoor/open-sky setting — blocked when existing tags indicate an indoor room.
const OUTDOOR_ONLY_FILL_TAGS = new Set([
    'dappled sunlight', 'god rays', 'night sky', 'starry sky', 'clouds',
    'rain', 'snowing', 'cherry blossoms', 'falling leaves', 'fireflies', 'city lights',
]);
const DAYLIGHT_ONLY_FILL_TAGS = new Set(['golden hour lighting', 'dappled sunlight', 'god rays']);
const NIGHT_ONLY_FILL_TAGS = new Set(['night sky', 'starry sky', 'fireflies', 'neon lighting', 'city lights']);
const INDOOR_CUE_RE = /\b(indoors|bedroom|bathroom|kitchen|classroom|office|living room|hallway|corridor|elevator|shower|bathtub|bed|couch|sofa|desk|inside|room|tavern|library|gym|locker room|cafe|restaurant|bar)\b/i;
const NIGHT_CUE_RE = /\b(night|midnight|moonlight|starry|darkness|late night|evening)\b/i;
const DAY_CUE_RE = /\b(day|daylight|morning|noon|afternoon|sunlight|sunny|golden hour)\b/i;

// Cheap deterministic string hash — varies fill selection per character so cards don't
// all receive the identical stack.
const hashSeed = (str) => {
    let h = 2166136261;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
};

/**
 * ✨ TARGET-FILL ENGINE ✨ — tops up the scene (`deep`) category toward its allocation budget
 * without exceeding ~90% of the tier's token ceiling. Legacy (77) or sceneMode 'off'
 * = [] — fill is a deep-only concept. Honors `budgets.deepRemaining` (when OOB/in-band
 * `<deep>` tags already filled part of the `deep` slot) or `budgets.deep` (custom/dynamic
 * scene budget), so setting `deep: 0` or filling `deep` via Smart OOB never pads the prompt
 * with random stock tags. Picks round-robin across active pools for balanced camera/lighting/
 * ambience coverage and filters out indoor/day-night contradictions.
 * @param {{tier?: number, deep?: number, deepRemaining?: number, sceneMode?: string}|null} budgets
 * @param {string[]} existingTags — the already-assembled prompt tags
 * @param {string} [seed] — variation seed (e.g. the character's core string)
 * @returns {string[]} tags to append
 */
export const buildDeepFillTags = (budgets, existingTags, seed = '') => {
    const tier = (budgets && budgets.tier) || 77;
    const sceneMode = (budgets && budgets.sceneMode) || 'smart';
    if (tier <= 77 || sceneMode === 'off') return [];
    const { table } = resolveDeepTierRow(tier);
    const maxFillTags = Number.isFinite(budgets?.deepRemaining)
        ? Math.max(0, Math.floor(budgets.deepRemaining))
        : (Number.isFinite(budgets?.deep) ? Math.max(0, Math.floor(budgets.deep)) : table.deep);
    if (maxFillTags <= 0) return [];

    const poolCount = tier <= 128 ? 2 : (tier <= 256 ? 3 : FILL_POOLS.length);
    const targetTokens = Math.round(tier * 0.9);
    const seedHash = hashSeed(seed);

    const all = (Array.isArray(existingTags) ? existingTags : [])
        .map((t) => String(t || '').toLowerCase().trim())
        .filter(Boolean);
    const joinedExisting = all.join(', ');
    const isSelfie = all.some(t => /\bselfie\b/i.test(t));
    const hasCameraFraming = all.some(t => CAMERA_FRAMING_RE.test(t));
    const isIndoor = INDOOR_CUE_RE.test(joinedExisting) && !/\b(outdoors|outside|balcony|window|patio|rooftop|garden)\b/i.test(joinedExisting);
    const isNight = NIGHT_CUE_RE.test(joinedExisting);
    const isDay = DAY_CUE_RE.test(joinedExisting) && !isNight;

    const seen = new Set(all);
    const takenGroups = new Set();
    for (const t of all) {
        const g = fillTagGroup(t);
        if (g >= 0) takenGroups.add(g);
        if (/\b(?:lighting|sunlight|moonlight|dimly lit|backlighting|soft light|candlelight|god rays|rim light)\b/i.test(t)) takenGroups.add(4);
        if (/\b(?:colors|palette|tones)\b/i.test(t)) takenGroups.add(2);
        if (/\b(?:background|scenery|landscape)\b/i.test(t)) takenGroups.add(3);
        if (/\b(?:sky|clouds|cloudy)\b/i.test(t)) takenGroups.add(5);
        if (/\b(?:rain|snow|blossoms|leaves|fireflies|steam)\b/i.test(t)) takenGroups.add(0);
    }
    let tokens = estimatePromptTokens(all);
    const out = [];

    const SELFIE_CONFLICT_SHOTS = new Set([
        'wide shot', 'over-the-shoulder shot', 'from below', 'foreshortening',
        'looking back', 'dynamic angle', 'dutch angle'
    ]);

    // Round-robin pass across active pools so a capped `deep` budget gets balanced
    // camera + lighting + ambience rather than burning all slots on pool 0.
    const cursors = new Array(poolCount).fill(0);
    let progressed = true;
    while (out.length < maxFillTags && tokens < targetTokens && progressed) {
        progressed = false;
        for (let p = 0; p < poolCount && out.length < maxFillTags && tokens < targetTokens; p++) {
            // Pool 0 is camera framing: if the prompt already established camera framing, skip pool 0
            // so we never stack multiple camera angles (e.g. wide shot + close-up + dutch angle).
            if (p === 0 && (hasCameraFraming || takenGroups.has(1))) continue;

            const pool = FILL_POOLS[p];
            const offset = (seedHash + p * 7) % pool.length;
            while (cursors[p] < pool.length) {
                const idx = cursors[p]++;
                const tag = pool[(idx + offset) % pool.length];
                if (seen.has(tag)) continue;
                if (isSelfie && SELFIE_CONFLICT_SHOTS.has(tag)) continue;
                if (isIndoor && OUTDOOR_ONLY_FILL_TAGS.has(tag)) continue;
                if (isNight && DAYLIGHT_ONLY_FILL_TAGS.has(tag)) continue;
                if (isDay && NIGHT_ONLY_FILL_TAGS.has(tag)) continue;
                const g = fillTagGroup(tag);
                if (g >= 0 && takenGroups.has(g)) continue;
                const tagTokens = estimatePromptTokens([tag]);
                if (tokens + tagTokens > targetTokens) continue;
                if (g >= 0) takenGroups.add(g);
                seen.add(tag);
                out.push(tag);
                tokens += tagTokens;
                progressed = true;
                break;
            }
        }
    }
    return out;
};

// ─── ✨ CANONICAL TAG ORDERING (Layla Conversational Images Reference) ✨ ───
// Universal Danbooru prompt order:
// [Global Prefix] -> [Core Identity] -> [Outfit] -> [Pose & Camera Framing] -> [Environment & Setting] -> [Lighting & Atmosphere / Mood]

export const CAMERA_FRAMING_RE = /\b(?:pov|first person view|pov hands|pov legs|pov crotch|from below|from above|from behind|view from behind|directly above|eye level|close up|close-up|upper body(?: focus)?|cowboy shot|portrait|dutch angle|wide shot|full body|selfie|front view|three-quarter view|over-the-shoulder shot|looking back|dynamic angle|foreshortening|cinematic angle|cinematic composition|low angle|high angle|profile|straight-on)\b/i;

export const LIGHTING_ATMOSPHERE_RE = /\b(?:lighting|sunlight|sunshine|sunbeams|moonlight|starlight|candlelight|firelight|lamplight|dim lighting|dimly lit|backlighting|rim (?:light|lighting)|soft (?:light|lighting)|volumetric lighting|cinematic lighting|golden hour(?: lighting)?|neon (?:lights?|lighting)|god rays|lens flare|dappled sunlight|dappled light|dark ambient|moody lighting|ambient light|morning light|afternoon light|sunset|sunrise|dusk|dawn|midnight|night|dark|shadows?|light particles|floating particles|particles|dust motes|sparkles|glow|mist|fog|haze|steam|smoke|rain|snow|snowing|clouds|cloudy|cherry blossoms|falling leaves|petals|fireflies|city lights|bokeh|detailed background|blurry background|gradient background|scenery|warm (?:colors|tones|palette)|cool (?:colors|tones|palette)|pastel (?:colors|tones|palette)|vivid (?:colors|tones|palette)|muted (?:colors|tones|palette)|dark (?:colors|tones|palette)|contrasting colors)\b/i;

export const OUTFIT_TAG_RE = /\b(?:dress|skirt|shirt|blouse|uniform|bikini|swimsuit|lingerie|underwear|undergarments|panties|bra|jacket|coat|hoodie|sweater|cardigan|vest|pants|jeans|shorts|apron|kimono|yukata|robe|gown|suit|pajamas|pantyhose|stockings|thighhighs|socks|shoes|boots|heels|sandals|sneakers|gloves|scarf|hat|cap|clothes|clothing|outfit|wear|wearing|dressed|undressed|nude|naked|topless|bottomless|corset|maid|leotard|bodysuit|choker|ribbon|bow|cape|cloak|armor|tunic|sarong|tank top|crop top|sleeveless|collar|bare shoulders|bare chest|bare skin|navel|cleavage|pantyshot|upskirt|thong|garter|slippers|loafers|barefoot)\b/i;

export const ENVIRONMENT_LOCATION_RE = /\b(?:bedroom|bed|kitchen|bathroom|cafe|cafeteria|restaurant|bar|office|cubicle|classroom|school|campus|library|store|shop|mall|street|alley|alleyway|sidewalk|pavement|downtown|city|town|park|beach|ocean|sea|lake|river|pool|onsen|bathhouse|gym|dojo|train|station|platform|bus|car|taxi|subway|metro|tram|ferry|forest|woods|mountain|garden|rooftop|balcony|window|doorway|hallway|corridor|stairs|attic|basement|hospital|clinic|church|shrine|temple|castle|tavern|inn|dungeon|field|farm|dock|harbor|bridge|tunnel|cave|desert|island|indoors|outdoors|inside|outside|marketplace|market|plaza|courtyard|boardwalk|pier|crosswalk|intersection|arcade|nightclub|club|pub|diner|storefront|hot spring|meadow|couch|sofa|table|chair|desk|counter|bench|wall|floor|door|patio|balcony)\b/i;

export const POSE_ACTION_RE = /\b(?:selfie|looking at viewer|looking away|looking back|looking up|looking down|sitting|standing|kneeling|crouching|lying|laying|walking|running|leaning|posing|smile|smiling|smirk|frown|pout|pouty|pouting|blush|blushing|wink|winking|laughing|crying|peace sign|victory sign|waving|arms up|head tilt|chin up|salute|shushing|holding|hugging|stretching|yawning|sleeping|dancing|jumping|open mouth|closed eyes|half-closed eyes|parted lips|eye contact|contrapposto|crossed legs|knees together|hands on hips|hand on hip|hand in hair|hands clasped|arms crossed|arms behind head|hand on own cheek|hand up to mouth|finger to lips|one hand on chest|hand reaching out|arms relaxed|resting chin|shoulder shrug|adjusting clothes|arched back|straddling|doggystyle|missionary|cowgirl|ahegao|spread legs|presenting|nipples?|anus|cameltoe|futanari|erection|erect penis|cum(?:shot|drip)?|pussy juice|pussy|penis|sex|areolae?|clitoris|testicles)\b/i;

/**
 * Classify a dynamic Danbooru tag into its canonical category.
 * Priority order:
 *   1. Camera framing -> 'pose' (so camera angles sit with pose/framing)
 *   2. Lighting / Atmosphere / Palette -> 'lighting'
 *   3. Outfit / Attire -> 'outfit'
 *   4. Environment / Setting / Props -> 'env'
 *   5. Pose / Action / Expression -> 'pose'
 *   6. Everything else -> 'other'
 */
export const categorizeDynamicTag = (t) => {
    const tag = String(t || '').trim().toLowerCase();
    if (!tag) return 'other';
    if (CAMERA_FRAMING_RE.test(tag)) return 'pose';
    if (LIGHTING_ATMOSPHERE_RE.test(tag)) return 'lighting';
    if (OUTFIT_TAG_RE.test(tag)) return 'outfit';
    if (ENVIRONMENT_LOCATION_RE.test(tag)) return 'env';
    if (POSE_ACTION_RE.test(tag)) return 'pose';
    return 'other';
};

/**
 * ✨ v2.7.37 ANATOMY IN-SLOT ✨ — explicitAnatomyModulator APPENDS its injected top-up
 * tokens to the tail of the dynamic list; the env shield then locks them at that tail
 * slot, so 'nipples/anus/pussy/...' rode the very END of the prompt instead of the pose
 * section. This re-seats them: strip the tail injections, then splice them AFTER the
 * last pose tag (anatomy is subject-body content — Master's ruling), falling back to
 * after the last outfit tag, then before the first env/lighting tag, then the head.
 * PURE: mirrors orderDynamicPromptTags' input tolerance (array or comma string).
 */
export const spliceAnatomyIntoPose = (list, injected) => {
    const src = (Array.isArray(list) ? list : String(list || '').split(','))
        .map((t) => String(t || '').trim()).filter(Boolean);
    const inj = (Array.isArray(injected) ? injected : String(injected || '').split(','))
        .map((t) => String(t || '').trim()).filter(Boolean);
    if (src.length === 0 || inj.length === 0) return src;

    const injSet = new Set(inj.map((t) => t.toLowerCase()));
    const stripped = src.filter((t) => !injSet.has(t.toLowerCase()));

    const present = new Set(stripped.map((t) => t.toLowerCase()));
    const toSeat = inj.filter((t) => !present.has(t.toLowerCase()));
    if (toSeat.length === 0) return stripped;

    let lastPose = -1;
    let lastOutfit = -1;
    let firstEnvOrLight = -1;
    stripped.forEach((t, i) => {
        const cat = categorizeDynamicTag(t);
        if (cat === 'pose') lastPose = i;
        else if (cat === 'outfit') lastOutfit = i;
        else if (firstEnvOrLight < 0 && (cat === 'env' || cat === 'lighting')) firstEnvOrLight = i;
    });
    let at;
    if (lastPose >= 0) at = lastPose + 1;
    else if (lastOutfit >= 0) at = lastOutfit + 1;
    else if (firstEnvOrLight >= 0) at = firstEnvOrLight;
    else at = 0;
    return [...stripped.slice(0, at), ...toSeat, ...stripped.slice(at)];
};

/**
 * Re-orders dynamic prompt tags to strictly honor the Layla conversational images contract:
 * [Outfit] -> [Pose & Camera Framing] -> [Other] -> [Environment & Setting] -> [Lighting & Atmosphere / Mood]
 * Deduplicates tags case-insensitively and preserves relative order within each category.
 */
export const orderDynamicPromptTags = (tags) => {
    const list = (Array.isArray(tags) ? tags : String(tags || '').split(','))
        .map(t => String(t || '').trim())
        .filter(Boolean);
    if (list.length <= 1) return list;

    const outfit = [];
    const pose = [];
    const env = [];
    const lighting = [];
    const other = [];

    const seen = new Set();
    for (const tag of list) {
        const lower = tag.toLowerCase();
        if (seen.has(lower)) continue;
        seen.add(lower);

        const cat = categorizeDynamicTag(lower);
        if (cat === 'outfit') outfit.push(tag);
        else if (cat === 'pose') pose.push(tag);
        else if (cat === 'env') env.push(tag);
        else if (cat === 'lighting') lighting.push(tag);
        else other.push(tag);
    }

    return [...outfit, ...pose, ...other, ...env, ...lighting];
};

/**
 * ✨ ORTHOGONAL POSE FILL DIMENSIONS ✨ — curated, identity-safe pose-staging vocabulary
 * organized into mutually exclusive physical dimensions so topping up a pose budget
 * never stacks conflicting body mechanics (e.g., `arms crossed` + `arms behind head` +
 * `leaning forward` + `leaning back` + `standing on tiptoes` while sitting).
 */
const POSE_FILL_DIMENSIONS = [
    // 0: head / neck orientation
    { id: 'head', tags: ['head tilt', 'chin up', 'looking back', 'over shoulder glance'] },
    // 1: gaze / eye engagement
    { id: 'gaze', tags: ['looking at viewer', 'sideways glance', 'half-closed eyes', 'eye contact'] },
    // 2: micro-expression
    { id: 'expression', tags: ['parted lips', 'subtle smile', 'soft expression', 'confident smile'] },
    // 3: torso / spine inclination (mutually exclusive: never lean forward AND lean back)
    { id: 'torso', tags: ['leaning forward', 'leaning back', 'arched back', 'slight torso twist'] },
    // 4: primary arm / hand staging (mutually exclusive: one primary arm configuration)
    { id: 'arms', tags: ['hand on hip', 'hand in hair', 'hands clasped', 'arm behind back', 'arms crossed', 'arms behind head', 'hand on own cheek', 'hand up to mouth', 'finger to lips', 'one hand on chest', 'hand reaching out', 'arms relaxed at sides', 'hands behind head', 'stretching arms above head'] },
    // 5: secondary gesture / shoulder detail
    { id: 'gesture', tags: ['shoulder shrug', 'peace sign', 'waving', 'adjusting clothes', 'resting chin on hand'] },
    // 6: standing / lower-body stance (blocked when sitting/lying/kneeling)
    { id: 'stance', standingOnly: true, tags: ['weight on one leg', 'standing on tiptoes', 'hands on hips', 'hand on wall', 'contrapposto'] },
    // 7: seated / kneeling / reclined lower-body staging (only when non-standing)
    { id: 'seated', nonStandingOnly: true, tags: ['hands on knees', 'crossed legs', 'knees together', 'legs folded'] },
    // 8: camera / body angle framing
    { id: 'framing', tags: ['three-quarter view', 'upper body focus', 'cowboy shot', 'dynamic pose'] },
];

const NON_STANDING_POSE_RE = /\b(sit|sitting|seated|chair|couch|sofa|bed|kneel|kneeling|all fours|lying|laying|on back|on stomach|on side|reclining|lounging|crouching|squatting|straddling|lap)\b/i;

/**
 * Top up the pose category toward its budget from orthogonal pose dimensions. Dedupes against
 * the already-assembled pose tags, respects posture compatibility (never adds standing tags to
 * sitting/lying scenes or conflicting arm/torso positions), varies selection by seed, and never
 * exceeds the budget. Legacy tiers (77) and non-positive budgets → [] (byte-identical legacy prompts).
 * @param {number} poseBudget — the resolved pose budget for this image
 * @param {string[]} poseTags — the budgeted pose tags already in the prompt
 * @param {string} [seed] — variation seed (e.g. the character's core string)
 * @param {string} [sceneText] — optional scene context for posture compatibility
 * @returns {string[]} tags to append
 */
export const buildPoseFillTags = (poseBudget, poseTags, seed = '', sceneText = '') => {
    const budget = (Number.isFinite(poseBudget) && poseBudget > 0) ? Math.floor(poseBudget) : 0;
    if (budget < 1) return [];
    const existing = (Array.isArray(poseTags) ? poseTags : [])
        .map((t) => String(t || '').toLowerCase().trim())
        .filter(Boolean);
    const room = budget - existing.length;
    if (room < 1) return [];
    const seen = new Set(existing);
    const contextStr = `${existing.join(', ')} ${String(sceneText || '')}`.toLowerCase();
    const isNonStanding = NON_STANDING_POSE_RE.test(contextStr);

    // Detect which dimensions are already satisfied by existing tags so we fill missing facets first
    const satisfiedDims = new Set();
    for (const dim of POSE_FILL_DIMENSIONS) {
        if (dim.tags.some((t) => seen.has(t))) satisfiedDims.add(dim.id);
    }

    const seedHash = hashSeed(seed);
    const out = [];
    const dimOrder = POSE_FILL_DIMENSIONS.filter((dim) => {
        if (dim.standingOnly && isNonStanding) return false;
        if (dim.nonStandingOnly && !isNonStanding) return false;
        return true;
    });

    // Pass 1: pick at most 1 tag from each unsatisfied orthogonal dimension (varied by seed)
    const dimCount = dimOrder.length;
    const dimOffset = dimCount > 0 ? (seedHash % dimCount) : 0;
    for (let d = 0; d < dimCount && out.length < room; d++) {
        const dim = dimOrder[(d + dimOffset) % dimCount];
        if (satisfiedDims.has(dim.id)) continue;
        const tagOffset = (seedHash + d * 5) % dim.tags.length;
        for (let i = 0; i < dim.tags.length; i++) {
            const tag = dim.tags[(i + tagOffset) % dim.tags.length];
            if (seen.has(tag)) continue;
            seen.add(tag);
            satisfiedDims.add(dim.id);
            out.push(tag);
            break;
        }
    }

    // Pass 2: if a very large custom pose budget (e.g. 12+) still has room, cycle compatible
    // non-conflicting secondary dimensions (head/gaze/expression/gesture/framing) without
    // ever duplicating torso or primary arm locks.
    const multiAllowed = new Set(['head', 'gaze', 'expression', 'gesture', 'framing']);
    for (let d = 0; d < dimCount && out.length < room; d++) {
        const dim = dimOrder[(d + dimOffset) % dimCount];
        if (!multiAllowed.has(dim.id)) continue;
        const tagOffset = (seedHash + d * 11) % dim.tags.length;
        for (let i = 0; i < dim.tags.length && out.length < room; i++) {
            const tag = dim.tags[(i + tagOffset) % dim.tags.length];
            if (seen.has(tag)) continue;
            seen.add(tag);
            out.push(tag);
        }
    }
    return out;
};

/**
 * ✨ SUMMON DEPTH DIRECTIVE ✨ — the OVERRULE paragraph appended to character-generation
 * system prompts (gacha summon, card import, GachaFans/pulse molds). The summon templates
 * hardcode "(1-3 tags)" per slot and the result is FROZEN into the card, so deep mode must
 * overrule the mold at authoring time. Legacy = '' (byte-identical prompt).
 * @param {{tier?: number}|null} budgets
 * @returns {string}
 */
export const buildSummonDepthDirective = (budgets) => {
    const tier = (budgets && budgets.tier) || 77;
    if (tier <= 77) return '';
    const g = buildDeepTagGuidance(budgets);
    return `\n[IMAGE_DEPTH_OVERRIDE (the image encoder reads ${tier} tokens): wherever the image template shows a small tag count, author the tier counts instead — outfit ${g.outfit} tags, pose/expression ${g.pose} tags, environment ${g.env} tags. Decompose each slot into distinct visual facets grounded in the character's theme (never pad with synonyms): layered wardrobe detail (core garments, fabric/texture, footwear, hosiery, accessories, jewelry, outerwear), full-body staging with camera work (posture, hand placement, micro-expression, dutch angle, from above, over-the-shoulder, looking back), and grounded scenery (venue architecture, props, weather, lighting quality: rim lighting, golden hour backlight, volumetric fog, neon signage glow). STILL discrete lowercase Danbooru tags — no sentences, no prose, NO physical appearance tags beyond the dedicated identity slots.]`;
};
