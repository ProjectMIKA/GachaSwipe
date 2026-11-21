// ✨ M.I.K.A. DYNAMIC EXPLICIT ANATOMY MODULATOR (v2.5.50 — extracted & sharpened) ✨
// Dynamically scrubs rogue explicit anatomy tags from clothed scenes and swipe cards to prevent
// Cronenberg mutations, and contextually appends explicit anatomical tags ONLY when the scene
// justifies them (same philosophy as the smart clothing engine — face shots never get footwear):
// 1. Decoupled feature toggle is ENABLED (enableExplicitAnatomy !== false).
// 2. Explicit mode is NUDE (2) or EXTREME (3) — NEVER for SFW (0) or TEASE (1)!
// 3. For swipe cards, ALL naked and genital tags are strictly purged.
// 4. If Strict Image Censor is ENABLED (selectable in SFW and Tease), explicit genital and naked tokens are shredded.
// 5. If Strict Image Censor is OFF, SFW (0) and Tease (1) are purely instruction-based without tag scrubbing!
// 6. When nude/topless in Nude/Extreme, modulates according to gender and scene exposure:
//    nude/bottomless  -> 'pussy' (never the clothed 'cameltoe' tag),
//    spread/exposed   -> 'pussy, anus' (the diffuser needs both tokens for a justified reveal),
//    clothed + tight  -> 'cameltoe' only when a cameltoe signal actually exists.
// ✨ v2.5.50 UNDRESS-CONTEXT FIX ✨: the undress state is detected from the prompt tags + live
// chat context ONLY — a character card that merely says "pale skin" can no longer force every
// photo into anatomy-injection mode, and "cleavage" no longer implies exposed nipples.

// ✨ MOVED FROM App.jsx (single source of truth — imported back by the main builder) ✨
export const MIKA_NUDE_REQ_RE = /\b(?:nude|naked|topless|bottomless|undressed|undressing|bare\s+skin|strip(?:ped|ping)?)\b/i;
export const MIKA_TEASE_TAG_RE = /\b(?:revealing|cleavage|bare shoulders|navel|midriff|crop top|unbuttoned|lingerie|bra|panties|underwear|see-through|swimsuit|bikini|upskirt|pantyshot|thighhighs|exposed skin)\b/i;
export const MIKA_CLOTHING_TAG_RE = /\b(?:dress|skirt|shirt|blouse|uniform|jacket|coat|hoodie|sweater|cardigan|vest|pants|jeans|shorts|apron|kimono|yukata|robe|gown|suit|pajamas|pantyhose|socks|shoes|boots|heels|sandals|sneakers|gloves|scarf|clothes|clothing|outfit|wear|wearing|dressed|corset|maid|leotard|bodysuit|cape|cloak|armor|tunic|sarong|tank top|crop top|sleeveless|undergarments|panties|bra|lingerie|underwear|bikini|swimsuit)\b/i;

const EXPLICIT_GENITAL_RE = /\b(?:penis|dick|cock|futa|futanari|gutanari|phallus|testicles|ballsack|erection|erect penis|huge penis|small penis|pussy|vagina|cameltoe|clitoris|anus|anal)\b/i;
const EXPLICIT_NAKED_RE = /\b(?:nude|naked|topless|bottomless|nipples?|sex|cum|ahegao|uncensored)\b/i;

// ✨ v2.5.50 SCENE-EXPOSURE DETECTORS ✨ — matched against prompt tags + live chat context only.
const ANATOMY_TOPLESS_RE = /\b(?:topless|exposed\s+breasts|bare\s+breasts|breasts\s+out|tits\s+out|bra\s+only|no\s+bra|braless|shirt\s+off|top\s+off)\b/i;
const ANATOMY_BOTTOMLESS_RE = /\b(?:bottomless|exposed\s+panties|panties\s+only|underwear\s+only|spread\s+legs|legs\s+spread|skirt\s+lift|lifting\s+skirt|panty\s*shot|upskirt|no\s+panties|pussy|vagina|cameltoe)\b/i;
const ANATOMY_SPREAD_RE = /\b(?:spread\s+legs|legs\s+spread|legs\s+up|spread\s+(?:pussy|anus|vagina)|pussy\s+drop|crotch(?:less)?|all\s+fours|doggystyle|doggy\s+style|missionary|from\s+behind|from\s+below|panty\s*shot|upskirt|skirt\s+lift|lifting\s+skirt|exposed\s+(?:pussy|vagina|crotch|anus)|wide\s+open)\b/i;
const ANATOMY_CAMELTOE_RE = /\b(?:cameltoe|camel\s+toe|tight\s+(?:pants|leggings|shorts|jeans|swimsuit|bodysuit))\b/i;
const ANATOMY_EXTREME_RE = /\b(?:sex|creampie|penetration|oral|fellatio|cunnilingus|cum|masturbat\w*|doggystyle|all\s+fours)\b/i;
const ANATOMY_NUDE_EXTRA_RE = /\b(?:in\s+the\s+buff|fully\s+exposed|no\s+clothes|clothes\s+off|birthday\s+suit)\b/i;

const filterAnatomyTokens = (str, filterFn) => {
    if (!str) return '';
    return str
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0 && filterFn(t))
        .join(', ');
};
/**
 * ✨ MIKA'S DYNAMIC EXPLICIT ANATOMY MODULATOR ✨
 * @param {string|string[]} tagsOrPrompt - dynamic tag string/array (pre- or post-budget)
 * @param {object|string} waifuOrCore    - waifu card (gender detect) or a core_appearance string
 * @param {object} options
 *   - explicitMode, dynamicExplicit, enableImageCensor, enableExplicitAnatomy (decoupled toggle)
 *   - isSwipeCard: strict purge path for swipe/preview cards
 *   - contextText: live scene context (recent chat + raw prompt) — drives undress detection
 *   - returnInjected: when true returns { result, injected } so callers can protect the
 *     appended anatomy tags from downstream prompt budget slicing.
 */
export const modulateExplicitAnatomyTags = (tagsOrPrompt, waifuOrCore, options = {}) => {
    const inputIsArray = Array.isArray(tagsOrPrompt);
    const wrapResult = (result, injected) => options.returnInjected
        ? { result: result, injected: injected || [] }
        : result;

    let tagStr = inputIsArray ? tagsOrPrompt.join(', ') : String(tagsOrPrompt || '');

    const state = (typeof stateRef !== 'undefined' && stateRef?.current) ? stateRef.current : {};

    const expMode = options.explicitMode !== undefined
        ? options.explicitMode
        : (state.explicitMode !== undefined
            ? state.explicitMode
            : 0);

    const isDynamicExp = options.dynamicExplicit !== undefined
        ? options.dynamicExplicit
        : (state.dynamicExplicit !== undefined
            ? state.dynamicExplicit
            : true);

    // 1. Swipe Cards: initial card generation never has rogue genital tokens (and naked tokens only if SFW/Tease)
    if (options.isSwipeCard) {
        const shouldFilterNaked = expMode < 2;
        let cleanedStr = filterAnatomyTokens(tagStr, t => !EXPLICIT_GENITAL_RE.test(t) && (!shouldFilterNaked || !EXPLICIT_NAKED_RE.test(t)));
        if (!isDynamicExp) {
            let tokens = cleanedStr.split(',').map(s => s.trim()).filter(Boolean);
            if (expMode >= 2) {
                // Baseline NUDE: strip non-nude clothes and ensure nude
                tokens = tokens.filter(t => !MIKA_CLOTHING_TAG_RE.test(t) || MIKA_NUDE_REQ_RE.test(t));
                if (!tokens.some(t => MIKA_NUDE_REQ_RE.test(t))) tokens.unshift('nude');
            } else if (expMode === 1) {
                // Baseline TEASE: ensure teasing tags
                if (!tokens.some(t => MIKA_TEASE_TAG_RE.test(t))) tokens.unshift('revealing outfit', 'cleavage');
            }
            cleanedStr = tokens.join(', ');
        }
        const result = inputIsArray ? cleanedStr.split(',').map(s => s.trim()).filter(Boolean) : cleanedStr;
        return wrapResult(result);
    }

    // Strict Image Censor: active strictly when enabled AND in SFW (0) or Tease (1)
    const isImageCensorActive = Boolean(options.enableImageCensor !== undefined
        ? options.enableImageCensor
        : (state.enableImageCensor ?? false)) && expMode <= 1;

    if (isImageCensorActive) {
        const cleanedStr = filterAnatomyTokens(tagStr, t => !EXPLICIT_GENITAL_RE.test(t) && !EXPLICIT_NAKED_RE.test(t));
        const result = inputIsArray ? cleanedStr.split(',').map(s => s.trim()).filter(Boolean) : cleanedStr;
        return wrapResult(result);
    }

    // Decoupled feature toggle check: if disabled, bypass explicit anatomy injection
    const isAnatomyEnabled = options.enableExplicitAnatomy !== undefined
        ? options.enableExplicitAnatomy
        : (state.enableExplicitAnatomy !== undefined
            ? state.enableExplicitAnatomy
            : true);

    // SFW (0) and TEASE (1): do NOT inject explicit anatomy tokens.
    // If strict censor is OFF, do NOT scrub (natural instruction-based prompting)!
    if (expMode < 2 || !isAnatomyEnabled) {
        return wrapResult(tagsOrPrompt);
    }

    // Gender & anatomy detection: Futanari vs Male vs Female (card identity — safe to read lore)
    const coreStr = (typeof waifuOrCore === 'string'
        ? waifuOrCore
        : [
            waifuOrCore?.core_appearance || '',
            waifuOrCore?.description || '',
            waifuOrCore?.gender || '',
            Array.isArray(waifuOrCore?.tags) ? waifuOrCore.tags.join(' ') : (waifuOrCore?.tags || '')
        ].join(' ')).toLowerCase();

    const isFuta = /\b(?:futa|futanari|dickgirl|shemale|intersex|hermaphrodite)\b/i.test(coreStr);
    const isMale = !isFuta && /\b(?:1boy|male|boy|man)\b/i.test(coreStr);
    const isFemale = !isFuta && !isMale;

    // ✨ v2.5.50: undress state reads the SCENE (prompt tags + live chat context) only —
    // never the character's static appearance/personality lore ("pale skin" ≠ nude).
    const undressContext = [tagStr, options.contextText || ''].join(' ').toLowerCase();

    const isNude = (!isDynamicExp && expMode >= 2)
        || MIKA_NUDE_REQ_RE.test(undressContext)
        || ANATOMY_NUDE_EXTRA_RE.test(undressContext);
    const isTopless = isNude || ANATOMY_TOPLESS_RE.test(undressContext);
    const isBottomless = isNude || ANATOMY_BOTTOMLESS_RE.test(undressContext);
    const isSpread = ANATOMY_SPREAD_RE.test(undressContext);
    const isExtremeAction = expMode === 3 || ANATOMY_EXTREME_RE.test(undressContext);
    const isGenitalsExposed = isBottomless || isNude;
    // Justified full reveal: spread/exposed-crotch framing or an explicit act in scene.
    const isAnusJustified = isGenitalsExposed && (isSpread || isExtremeAction);
    // 'cameltoe' is a CLOTHED tag (visible through tight fabric) — only valid while dressed.
    const wantsCameltoe = !isGenitalsExposed && ANATOMY_CAMELTOE_RE.test(undressContext);

    const injectedTokens = [];

    if (isFuta) {
        // Futanari / Dickgirl modulation (breasts + penis / futanari)
        if (isTopless && !/\bnipples?\b/i.test(tagStr)) {
            injectedTokens.push('nipples');
        }
        if (!/\b(?:futa|futanari)\b/i.test(tagStr)) {
            injectedTokens.push('futanari');
        }
        if (isGenitalsExposed && !/\b(?:penis|dick|cock|phallus)\b/i.test(tagStr)) {
            injectedTokens.push(isExtremeAction ? 'erect penis' : 'penis');
        }
        if (isAnusJustified && !/\banus\b/i.test(tagStr)) {
            injectedTokens.push('anus');
        }
    } else if (isFemale) {
        // Female modulation
        if (isTopless && !/\bnipples?\b/i.test(tagStr)) {
            injectedTokens.push('nipples');
        }
        if (isGenitalsExposed && !/\b(?:pussy|vagina|cameltoe)\b/i.test(tagStr)) {
            // Nude/bottomless scene → the real anatomical tag (NOT the clothed 'cameltoe').
            injectedTokens.push('pussy');
        }
        if (isAnusJustified && !/\banus\b/i.test(tagStr)) {
            // Justified reveal (spread legs / exposed crotch / explicit act) → both tokens.
            injectedTokens.push('anus');
        }
        if (injectedTokens.length === 0 && wantsCameltoe && !/\b(?:pussy|vagina|cameltoe)\b/i.test(tagStr)) {
            // Clothed tease with an explicit cameltoe signal → the tight-fabric tag.
            injectedTokens.push('cameltoe');
        }
    } else {
        // Male modulation
        if (isGenitalsExposed && !/\b(?:penis|dick|cock|phallus)\b/i.test(tagStr)) {
            injectedTokens.push(isExtremeAction ? 'erect penis' : 'penis');
        }
    }

    if (injectedTokens.length === 0) {
        return wrapResult(tagsOrPrompt);
    }

    if (inputIsArray) {
        return wrapResult([...tagsOrPrompt, ...injectedTokens], injectedTokens);
    } else {
        const result = tagStr ? `${tagStr}, ${injectedTokens.join(', ')}` : injectedTokens.join(', ');
        return wrapResult(result, injectedTokens);
    }
};