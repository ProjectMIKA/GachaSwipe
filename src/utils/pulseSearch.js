// ------------------------------------------------------------
// ✨ MIKA'S PULSE_SEARCH ENGINE ✨
// WHY: PULSE_SEARCH lets the user type a raw desire into the GachaFans
// Hub and synthesizes the ONE creator whose entire page IS that
// fantasy. Both hostile edges stay fail-closed (Platform Law #2):
//   1. The user's query rides INSIDE an XML-directed LLM prompt —
//      sanitizeSearchQuery strips the injection surface (angle
//      brackets, bracket directives, newlines) before it ships.
//   2. The LLM reply flows straight toward the economy + image
//      pipeline — validatePulseCreatorPayload enforces the strict XML
//      envelope; a non-conforming or refused reply = null/ABSENT =
//      the cheeky NO_MATCH state. Never fail-open, never render
//      garbage tags into the diffuser.
// Pure module: no React, no window — node:test imports it directly.
// ------------------------------------------------------------

export const PULSE_QUERY_MAX_LENGTH = 120;

export const PULSE_TIER_NAMES = ['Free Teaser', 'Fan Tier', 'Super Fan', 'VIP Tier'];

const stripInjectionSurface = (str) => String(str)
    .replace(/[<>[\]]/g, '')
    .replace(/[\r\n\t]+/g, ' ');

export function sanitizeSearchQuery(raw) {
    if (!raw || typeof raw !== 'string') return { ok: false, query: '' };
    const query = stripInjectionSurface(raw).replace(/\s+/g, ' ').trim().slice(0, PULSE_QUERY_MAX_LENGTH);
    if (!query) return { ok: false, query: '' };
    return { ok: true, query };
}

const cleanLine = (str, max) => (str ? stripInjectionSurface(str).replace(/\s+/g, ' ').trim().slice(0, max) : '');

const clampTagList = (str, max) => (str
    ? str.split(',')
        .map(t => stripInjectionSurface(t).trim())
        .filter(Boolean)
        .slice(0, max)
        .join(', ')
    : '');

const extractTag = (rawText, tag) => {
    const m = rawText.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
    return m ? m[1].trim() : '';
};

/**
 * Strict fail-closed gate for the PULSE_MATCH director's reply.
 * @returns {{refusal: boolean, card: object|null}|null}
 *   { refusal: true, card: null } — the model declined the fantasy (NO_MATCH state)
 *   { refusal: false, card }      — a discovery-card-shaped creator payload
 *   null                          — malformed envelope = ABSENT = error/retry path
 */
export function validatePulseCreatorPayload(rawText) {
    if (!rawText || typeof rawText !== 'string') return null;

    const refusal = extractTag(rawText, 'refusal').trim().toLowerCase();
    if (refusal === 'true' || refusal === '1') return { refusal: true, card: null };

    const name = cleanLine(extractTag(rawText, 'name'), 40);
    const tagline = cleanLine(extractTag(rawText, 'tagline'), 160);
    const creatorVibe = cleanLine(extractTag(rawText, 'creator_vibe'), 40);
    const coreAppearance = cleanLine(extractTag(rawText, 'core_appearance'), 240);
    const dynamicStyle = cleanLine(extractTag(rawText, 'dynamic_style'), 160);
    const searchWink = cleanLine(extractTag(rawText, 'search_wink'), 180);
    // SCENE LAW: clamp 6 — the director's mandated environment/setting tag must
    // survive alongside the outfit/pose content tags (never evicted, never fatal:
    // a missing scene tag still degrades gracefully, matching the Page Director's
    // tolerant filter(Boolean) join — fail-closed applies to STRUCTURE, not vibes).
    const tierTags = PULSE_TIER_NAMES.map((_, i) => clampTagList(extractTag(rawText, `tier${i + 1}_tags`), 6));

    // Fail-closed contract: an identity-less or content-less creator is NOT a creator.
    if (!name || !tagline || !coreAppearance || tierTags.some(t => !t)) return null;

    return {
        refusal: false,
        card: {
            name,
            tagline,
            creator_vibe: creatorVibe || 'Content Creator',
            core_appearance: coreAppearance,
            dynamic_style: dynamicStyle || 'looking at viewer',
            tiers: PULSE_TIER_NAMES.map((tier_name, i) => ({ tier_name, tags: tierTags[i] })),
            search_wink: searchWink,
        },
    };
}

/**
 * Chassis roulette for PULSE_SEARCH — the Discovery Tuner's active theme packs
 * shape the creator's world while the typed desire shapes her soul. Mirrors
 * generateDiscoveryCards' availability rules (filter → enabled → enabled) and
 * the character pipeline's material sampling (quirks / degen_quirks / axes).
 * Pure: copies arrays before shuffling — the main pipeline's in-place sort()
 * on state arrays is a known wart we deliberately do NOT replicate.
 *
 * @returns {{themeLabel:string, archetype:string, hybridArchetype:string, quirks:string, degen:string, axes:string}|null}
 *   null when no theme packs are available (caller runs a chassis-less search).
 */
export function samplePulseChassis(themes, themeFilter, allowHybrids) {
    if (!themes || typeof themes !== 'object') return null;
    let available = Array.isArray(themeFilter) && themeFilter.length > 0
        ? Object.values(themes).filter(t => t && themeFilter.includes(t.id))
        : Object.values(themes).filter(t => t && t.enabled);
    if (available.length === 0) available = Object.values(themes).filter(t => t && t.enabled);
    if (available.length === 0) return null;

    const chassisTheme = available[Math.floor(Math.random() * available.length)];
    const validButtons = (chassisTheme.buttons || []).filter(b => b && String(b).toLowerCase() !== 'surprise me');
    const archetype = validButtons.length > 0 ? validButtons[Math.floor(Math.random() * validButtons.length)] : '';

    let hybridArchetype = '';
    if (allowHybrids && available.length > 1) {
        const others = available.filter(t => t.id !== chassisTheme.id);
        const secondTheme = others[Math.floor(Math.random() * others.length)];
        const secondButtons = ((secondTheme && secondTheme.buttons) || []).filter(b => b && String(b).toLowerCase() !== 'surprise me');
        if (secondButtons.length > 0) hybridArchetype = secondButtons[Math.floor(Math.random() * secondButtons.length)];
    }

    const shuffle = (arr) => [...(arr || [])].sort(() => 0.5 - Math.random());
    return {
        themeLabel: chassisTheme.label || 'Anime',
        archetype,
        hybridArchetype,
        quirks: shuffle(chassisTheme.quirks).slice(0, 6).join(', '),
        degen: shuffle(chassisTheme.degen_quirks).slice(0, 5).join(', '),
        axes: shuffle(chassisTheme.axes).slice(0, 3).map(a => (a && a.neg && a.pos) ? `${a.neg} vs ${a.pos}` : '').filter(Boolean).join(', '),
    };
}

/**
 * Origin steering for PULSE_SEARCH-created creators: when a card carries a
 * searchQuery, the downstream fetish-theme consumers get a directive pinning
 * the theme to the user's typed desire. Returns '' for normal characters so
 * their prompt templates stay BYTE-IDENTICAL (the general fetish prompting
 * system is never touched). The query is re-sanitized on read-back — never
 * trust stored strings (defense-in-depth).
 *
 * @param {string} rawQuery - the card's stored searchQuery
 * @param {string} rawWink - the card's stored search_wink (voice reference)
 * @param {'page'|'profile'} surface - 'page' = Premium Page Director (theme_concept
 *   IS the desire), 'profile' = profile completion (weave into her core identity)
 * @returns {string} '' or a "\n\nPULSE_MATCH_ORIGIN: ..." prompt block
 */
export function buildPulseOriginContext(rawQuery, rawWink, surface) {
    const { ok, query } = sanitizeSearchQuery(rawQuery);
    if (!ok) return '';
    const wink = sanitizeSearchQuery(rawWink).query;
    const voice = wink ? ` Her voice, for tone reference: "${wink}"` : '';
    if (surface === 'profile') {
        return `\n\nPULSE_MATCH_ORIGIN: This creator was synthesized by the desire engine from the user's search: "${query}". Weave this desire into her core identity — <description>, <personality>, <scenario>, <quirks> and <likes> must all serve this fantasy. It is not a side interest; it is her essence.${voice}`;
    }
    return `\n\nPULSE_MATCH_ORIGIN: This creator was synthesized by the desire engine for a user who searched: "${query}". The <theme_concept> IS this desire — name the theme after it and build all 4 tiers as its faithful escalation.${voice}`;
}