// ✨ MIKA'S SCENE BUILDER — THE SET DRESSER (v2.7.37) ✨
// WHY: deep-mode prompts were filling the env/deep slots with context-ADJACENT tag salad —
// the LLM (and the deterministic pools) picked random plausible tags to fill the budget
// instead of describing ONE coherent place. This engine treats the scene as a persisted
// SET: an OOB 'sceneBuild' pass authors a single connected location (venue → props →
// weather → lighting → atmosphere → palette) in the background, it is CACHED by scene
// identity, and every subsequent image in the SAME place + daypart reuses the dressed set
// (Master's law: "if the scene doesn't change, the scene tags can be reused").
// PURE module: no React, no window at top level — node:test-able (tests/sceneBuilder.test.mjs).
// Fail-closed doctrine: no fresh cache = the legacy env path, byte-identical.

/**
 * Bucket a Date into the four scene dayparts. The daypart is HALF the scene identity —
 * a bedroom at night and the same bedroom at noon are different sets.
 * @param {Date|number} [date]
 * @returns {'morning'|'afternoon'|'evening'|'night'}
 */
export const daypartBucket = (date) => {
    const h = (date instanceof Date ? date : new Date(date || Date.now())).getHours();
    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 22) return 'evening';
    return 'night';
};

/**
 * Normalize a place string for keying: lowercase, collapsed whitespace, trimmed.
 * @param {string} place
 * @returns {string}
 */
export const normalizePlaceKey = (place) => String(place || '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * The scene identity key: WHO + WHERE + WHICH DAYPART. Deliberately chat-agnostic — the
 * same place is the same set regardless of which conversation the photo arrives in.
 * @param {{waifuId?: string, place?: string, daypart?: string}} parts
 * @returns {string}
 */
export const sceneFingerprint = ({ waifuId, place, daypart } = {}) => {
    const who = normalizePlaceKey(waifuId) || '~';
    const where = normalizePlaceKey(place) || '~';
    return `${who}:${where}:${daypart || 'unknown'}`;
};

/**
 * Cache freshness gate. TTL default 20 minutes — long enough to dress a whole scene
 * visit, short enough that a lingering set never outlives a location change + daypart
 * rollover (both of which change the key anyway; TTL is the safety net).
 * @param {{at?: number}|null} entry
 * @param {number} [now]
 * @param {number} [ttlMs]
 * @returns {boolean}
 */
export const isSceneFresh = (entry, now = Date.now(), ttlMs = 20 * 60 * 1000) => {
    if (!entry || !Number.isFinite(entry.at)) return false;
    return (now - entry.at) >= 0 && (now - entry.at) < ttlMs;
};

// ✨ v2.7.39 THE INDOOR TIME LAW ✨ — context-honesty: if it isn't visible in the
// image, it must not be prompted. An enclosed venue has no sky, so its photos can
// never justify time-of-day or weather tags (a bedroom at 11pm shows lamp light,
// not "night"). Curated lexicon; UNKNOWN venues fail OPEN (keep legacy behavior —
// we only strip when we're confident the place is enclosed).
export const INDOOR_VENUE_RE = /\b(?:bedroom|bed\b|kitchen|bathroom|bathtub|shower|toilet|cafe|cafeteria|restaurant|bar\b|diner|pub|tavern|inn\b|office|cubicle|meeting room|classroom|lecture hall|library|bookstore|store|shop\b|mall|boutique|supermarket|convenience store|gym\b|dojo|arcade|nightclub|club\b|hotel|motel|lobby|elevator|hallway|corridor|attic|basement|garage|warehouse|laboratory|lab\b|hospital|clinic|pharmacy|church|cathedral|shrine|temple|castle|mansion|apartment|condo|loft|dormitory|dorm\b|living room|dining room|study\b|den\b|nursery|closet|pantry|locker room|bathhouse|onsen|indoor pool|greenhouse|studio\b|cabin|igloo|tent\b|cave\b|subway|metro|train|tram|bus\b|car interior|taxi|airport terminal|station interior)\b/i;

// ✨ OPEN-AIR VETO ✨ — "rooftop cafe" is NOT indoor (the sky is right there): explicit
// open-air vocabulary beats the indoor lexicon on the WHOLE tag list, so compound
// venues like a rooftop/bar/terrace variant of an enclosed word stay honest.
export const OUTDOOR_VENUE_RE = /\b(?:rooftop|roof top|balcony|terrace|patio|veranda|courtyard|garden|backyard|yard\b|outdoor|open air|open-air|poolside|beach|seaside|boardwalk|pier\b|ferris wheel|amusement park|theme park|street\b|alley|plaza|square|market stall)\b/i;

/**
 * Does any of these venue/env tags name an ENCLOSED space? Fail-open: unknown
 * venues are treated as outdoors (legacy time/weather behavior stands).
 * Precedence: ANY open-air tag vetoes the whole list (rooftop cafe → outdoor).
 * @param {string[]|string} tags
 * @returns {boolean}
 */
export const isIndoorVenue = (tags) => {
    const list = Array.isArray(tags)
        ? tags
        : String(tags || '').split(',');
    const normalized = list.map((t) => String(t || '').trim().toLowerCase()).filter(Boolean);
    if (normalized.some((t) => OUTDOOR_VENUE_RE.test(t))) return false;
    return normalized.some((t) => INDOOR_VENUE_RE.test(t));
};

/**
 * ✨ v2.7.40 PLACE HONESTY ✨ — last-resort place extraction from dialogue text.
 * WHY: the set dresser's ask said "an unspecified location" whenever every
 * authoritative tier (dream > tabletop > context > schedule > live place) came
 * back empty — but the recent exchange usually NAMES the venue. This scans the
 * text with the SAME curated venue lexicons that power the indoor law, so
 * extraction and honesty stay one vocabulary. Returns the LAST match (most
 * recent mention), normalized; null when nothing venue-shaped exists.
 * Pure + fail-closed: no match = no place = the ask keeps its fallback.
 * @param {string} text
 * @returns {string|null}
 */
export const extractPlaceFromText = (text) => {
    const src = String(text || '');
    if (!src) return null;
    let last = null;
    for (const re of [INDOOR_VENUE_RE, OUTDOOR_VENUE_RE]) {
        const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
        let m;
        while ((m = global.exec(src)) !== null) {
            const phrase = String(m[0] || '').trim();
            if (phrase) last = phrase;
        }
    }
    return last ? normalizePlaceKey(last) : null;
};

/**
 * Merge the dressed set into the env category: the authored VENUE leads (it is the
 * ground truth of the setting), the LLM's own env tags follow (deduped — in-band intent
 * still colors the set), then the set's remaining parts fill to the cap in reading
 * order: props → weather → time → lighting → atmosphere → palette.
 * v2.7.39: when the venue is INDOOR, the set's time and weather parts are skipped
 * entirely (context-honesty — no sky visible indoors), belt-and-suspenders on top of
 * the ask-side rule and the validator's indoor zeroing.
 * @param {string[]} existingEnvTags
 * @param {{venue?: string[], props?: string[], time?: string[], weather?: string[], lighting?: string[], atmosphere?: string[], palette?: string[]}|null} scene
 * @param {number} envCap
 * @returns {string[]}
 */
export const mergeSceneIntoEnv = (existingEnvTags, scene, envCap) => {
    const cap = (Number.isFinite(envCap) && envCap > 0) ? Math.floor(envCap) : 0;
    if (!cap || !scene || !Array.isArray(scene.venue) || scene.venue.length === 0) {
        return (Array.isArray(existingEnvTags) ? existingEnvTags : []).slice(0, Math.max(0, cap));
    }
    const existing = (Array.isArray(existingEnvTags) ? existingEnvTags : [])
        .map((t) => String(t || '').trim()).filter(Boolean);
    const indoor = isIndoorVenue(scene.venue);
    const out = [];
    const seen = new Set();
    const push = (t) => {
        const low = String(t || '').toLowerCase().trim();
        if (!low || seen.has(low) || out.length >= cap) return;
        seen.add(low);
        out.push(String(t || '').trim());
    };
    scene.venue.forEach(push);
    existing.forEach(push);
    const rest = [
        ...(Array.isArray(scene.props) ? scene.props : []),
        ...(!indoor && Array.isArray(scene.weather) ? scene.weather : []),
        ...(!indoor && Array.isArray(scene.time) ? scene.time : []),
        ...(Array.isArray(scene.lighting) ? scene.lighting : []),
        ...(Array.isArray(scene.atmosphere) ? scene.atmosphere : []),
        ...(Array.isArray(scene.palette) ? scene.palette : []),
    ];
    rest.forEach(push);
    return out;
};

/**
 * The set's mood strip — lighting + atmosphere + palette — for the deep-slot synergy:
 * when a fresh dressed set exists, these ride the deep budget AFTER the LLM's own deep
 * tags (LLM leads, the set fills the remaining headroom instead of random pools).
 * @param {{lighting?: string[], atmosphere?: string[], palette?: string[]}|null} scene
 * @returns {string[]}
 */
export const sceneAtmosphereTags = (scene) => {
    if (!scene) return [];
    return [
        ...(Array.isArray(scene.lighting) ? scene.lighting : []),
        ...(Array.isArray(scene.atmosphere) ? scene.atmosphere : []),
        ...(Array.isArray(scene.palette) ? scene.palette : []),
    ].map((t) => String(t || '').trim()).filter(Boolean);
};
