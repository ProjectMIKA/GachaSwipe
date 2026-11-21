/**
 * ✨ MIKA'S HALLUCINATION SCRUBBER & DIRECTIVE DECODER ✨
 *
 * Local/small models love inventing their own "save this to memory" protocols that completely
 * ignore our XML instructions: [Memory: ...], {Memory: ...}, <Memory: ...>, ((Remember: ...)),
 * [[Memory: ...]], **Memory:** ..., *Memory: ...* or bare "Memory: ..." lines. Anything that is
 * NOT regular prose, quoted speech, or asterisk roleplay gets deciphered here and routed to the
 * engine it was meant for (long-term memory, live location, wardrobe, routine, VIP drop, photo
 * tags) instead of leaking raw into the chat bubble.
 *
 * Pure functions only — no React, no SDK, no state.
 */

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ─── DIRECTIVE LABEL DICTIONARY ───
// Canonical snake_case keys. Every underscore also matches spaces / hyphens / case variants.
const MEMORY_KEYS = [
    'memory', 'memories', 'new_memory', 'new_memories', 'memory_update', 'update_memory',
    'memory_log', 'saved_memory', 'save_memory', 'remember', 'remember_this', 'memorize',
    'mental_note', 'note_to_self', 'long_term_memory', 'longterm_memory', 'core_memory',
    'permanent_memory', 'important', 'fact', 'facts'
];
const LOCATION_KEYS = ['location', 'current_location', 'location_update', 'update_location'];
const WARDROBE_KEYS = ['wardrobe', 'wardrobe_addition', 'wardrobe_update', 'new_outfit', 'outfit', 'outfit_update', 'clothing', 'clothes'];
const ROUTINE_KEYS = ['routine', 'routine_update', 'life_event', 'schedule', 'schedule_update', 'update_schedule'];
const VIP_KEYS = ['drop_vip', 'drop_vip_set', 'vip_drop', 'vip_set_drop'];
const IMAGE_KEYS = ['image', 'image_prompt', 'image_tags', 'image_request', 'photo', 'photo_prompt', 'photo_request', 'pic', 'picture', 'selfie', 'img', 'danbooru', 'danbooru_tags', 'tags', 'prompt'];

const ALL_KEYS = [...MEMORY_KEYS, ...LOCATION_KEYS, ...WARDROBE_KEYS, ...ROUTINE_KEYS, ...VIP_KEYS, ...IMAGE_KEYS];

const CATEGORY_BY_KEY = new Map();
MEMORY_KEYS.forEach(k => CATEGORY_BY_KEY.set(k, 'memory'));
LOCATION_KEYS.forEach(k => CATEGORY_BY_KEY.set(k, 'location'));
WARDROBE_KEYS.forEach(k => CATEGORY_BY_KEY.set(k, 'wardrobe'));
ROUTINE_KEYS.forEach(k => CATEGORY_BY_KEY.set(k, 'routine'));
VIP_KEYS.forEach(k => CATEGORY_BY_KEY.set(k, 'vip'));
IMAGE_KEYS.forEach(k => CATEGORY_BY_KEY.set(k, 'image'));

// 'note to self' / 'note_to_self' / 'Note-To-Self' all collapse onto the same key.
const buildLabelAlt = (keys) => keys
    .map(k => k.split('_').map(escapeRe).join('[\\s_-]+'))
    .join('|');

const LABEL_ALT = buildLabelAlt(ALL_KEYS);

// Cheap pre-scan so plain prose pays (almost) nothing.
const DIRECTIVE_PROBE = /[\[\{<【（《(]|\*{1,2}[ \t]*[A-Za-z][A-Za-z_\- ]{0,50}:|(?:^|\n)[ \t]*(?:[-•>]+[ \t]*)?\*{0,2}[A-Za-z][A-Za-z_\- ]{0,50}:|sent a photo depicting/i;

// Wrapped forms: [X: ...] [[X: ...]] {X: ...} {{X: ...}} (X: ...) ((X: ...)) 【X: ...】 《X: ...》 <X: ...> <<X: ...>>
// The mandatory colon/hyphen after the label keeps proper XML (<memory>...</memory>) untouched.
const BRACKET_DIRECTIVE_REGEX = new RegExp(
    '(\\[\\[|\\[|\\{\\{|\\{|\\(\\(|\\(|【|《|<<|<)' +
    '[ \\t]*((?:' + LABEL_ALT + ')(?:s)?)(?![a-zA-Z])[ \\t]*' +
    '[:\\-]\\s*' +
    '([\\s\\S]*?)' +
    '(\\]\\]|\\]|\\}\\}|\\}|\\)\\)|\\)|】|》|>>|>)',
    'gi'
);

// Markdown-bold form: **Memory:** payload (payload = same line)
const BOLD_DIRECTIVE_REGEX = new RegExp(
    '\\*\\*[ \\t]*((?:' + LABEL_ALT + ')(?:s)?)(?![a-zA-Z])[ \\t]*[:\\-][ \\t]*\\*\\*[ \\t]*([^\\n]*)',
    'gi'
);

// Asterisk form: *Memory: payload* — the label must OPEN the asterisk block so roleplay prose is spared.
const ASTERISK_DIRECTIVE_REGEX = new RegExp(
    '\\*[ \\t]*((?:' + LABEL_ALT + ')(?:s)?)(?![a-zA-Z])[ \\t]*[:\\-][ \\t]*([^*\\n]{0,240}?)\\s*\\*',
    'gi'
);

// Bare line form: "Memory: payload" (optionally -/•/> list-marked). The label must start the line.
const LINE_DIRECTIVE_REGEX = new RegExp(
    '(?:^|\\n)[ \\t]*(?:[-•>]+[ \\t]+)?((?:' + LABEL_ALT + ')(?:s)?)(?![a-zA-Z])[ \\t]*:[ \\t]*([^\\n]+)',
    'gi'
);

// Payloads that carry no information.
const NOISE_PAYLOAD_REGEX = /^(?:none|null|nil|n\/?a|undefined|false|true|yes|no|[-–—_*=.\s]+)$/i;

const classifyDirectiveLabel = (rawLabel) => {
    const key = String(rawLabel || '').toLowerCase().replace(/[\s\-]+/g, '_').replace(/[^a-z_]/g, '').replace(/_+$/, '');
    if (CATEGORY_BY_KEY.has(key)) return CATEGORY_BY_KEY.get(key);
    if (key.endsWith('s') && CATEGORY_BY_KEY.has(key.slice(0, -1))) return CATEGORY_BY_KEY.get(key.slice(0, -1));
    return null;
};

const cleanPayload = (payload) => {
    let p = String(payload || '').trim();
    if (!p) return '';
    p = p.replace(/^[\s"'`]+/, '').replace(/[\s"'`]+$/, '').trim();
    p = p.replace(/^[\]\}>)】》\s]+/, '').replace(/[\[\{<(《【\s]+$/, '').trim();
    if (!p || NOISE_PAYLOAD_REGEX.test(p)) return '';
    return p;
};

/**
 * Deciphers every hallucinated directive in one pass.
 * Order matters: wrapped → bold → asterisk → bare lines (each pass cleans for the next).
 * NOTE: image/location/wardrobe buckets are SALVAGED (not dropped) — the photo pipeline merges
 * them back into the tag pool, so drift-form-but-compliant content like "Location: rooftop cafe"
 * or "Outfit: red dress, smile" still reaches the diffuser as tags.
 * @param {string} text
 * @returns {{clean: string, memory: string, location: string, wardrobe: string, routine: string, vip: string, imageTags: string}}
 */
export function extractBracketDirectives(text) {
    const result = { clean: text || '', memory: '', location: '', wardrobe: '', routine: '', vip: '', imageTags: '' };
    if (!text || !DIRECTIVE_PROBE.test(text)) return result;

    let work = String(text);
    const absorb = (category, rawPayload) => {
        // VIP payloads are boolean signals — 'true'/'false' ARE the message, keep them!
        const p = (category === 'vip' && /^(?:true|false)\s*$/i.test(String(rawPayload || '').trim()))
            ? String(rawPayload).trim().toLowerCase()
            : cleanPayload(rawPayload);
        if (!p) return;
        if (category === 'memory') result.memory += p + '\n';
        else if (category === 'location') result.location += p + '\n';
        else if (category === 'wardrobe') result.wardrobe += p + '\n';
        else if (category === 'routine') result.routine += p + '\n';
        else if (category === 'vip') result.vip += p + '\n';
        else if (category === 'image') result.imageTags += p + '\n';
    };

    // 0. System_Event image receipt echo & "sent a photo depicting" hallucinations:
    // e.g. <System_Event> The character sent a photo depicting: tags </System_Event>
    // or: The character sent a photo depicting: tags </System.Event>
    // or: <System.Event> ... </System.Event>
    const SYSTEM_EVENT_DIRECTIVE_REGEX = /(?:<[\\/]?System[._\s-]Event[^>]*>)?\s*(?:The character\s+)?sent a photo depicting:\s*([\s\S]*?)(?:<\/(?:System[._\s-]Event|[a-zA-Z0-9_.-]+)>|(?:\r?\n){2,}|$)/gi;
    work = work.replace(SYSTEM_EVENT_DIRECTIVE_REGEX, (match, payload) => {
        absorb('image', payload);
        return '';
    });
    work = work.replace(/<System[._\s-]Event\b[^>]*>[\s\S]*?<\/System[._\s-]Event\s*>/gi, '');
    work = work.replace(/<System[._\s-]Event\b[^>]*>[\s\S]*$/gi, '');
    work = work.replace(/<\/?System[._\s-]Event[^>]*>/gi, '');

    // 1. Wrapped forms — [Memory: x], {Remember: x}, <Memory: x>, ((Note to self: x)), 【...】, <<...>>
    work = work.replace(BRACKET_DIRECTIVE_REGEX, (match, opener, label, payload) => {
        const category = classifyDirectiveLabel(label);
        if (!category) return match;
        absorb(category, payload);
        return '';
    });

    // 2. Markdown-bold form — **Memory:** payload
    work = work.replace(BOLD_DIRECTIVE_REGEX, (match, label, payload) => {
        const category = classifyDirectiveLabel(label);
        if (!category) return match;
        absorb(category, payload);
        return '';
    });

    // 3. Asterisk-labeled form — *Memory: payload* (label opens the block; roleplay prose is spared)
    work = work.replace(ASTERISK_DIRECTIVE_REGEX, (match, label, payload) => {
        const category = classifyDirectiveLabel(label);
        if (!category) return match;
        absorb(category, payload);
        return '';
    });

    // 4. Bare line-start form — "Memory: payload" / "- Remember: payload"
    work = work.replace(LINE_DIRECTIVE_REGEX, (match, label, payload) => {
        const category = classifyDirectiveLabel(label);
        if (!category) return match;
        absorb(category, payload);
        return '';
    });

    result.imageTags = result.imageTags.replace(/\n/g, ', ').replace(/,\s*,/g, ',').replace(/,\s*$/, '').trim();
    result.clean = work;
    return result;
}

/**
 * Best-effort photo-tag deciphering when the model skipped <image_prompt> entirely:
 * [Image: ...], {Photo: ...}, <Tags: ...>, **Tags:** ..., "Image prompt: ..." lines, etc.
 * @param {string} text
 * @returns {string} comma-separated raw tag payload ('' when nothing decipherable)
 */
export function extractLooseImageTags(text) {
    if (!text) return '';
    const hits = extractBracketDirectives(text);
    return (hits.imageTags || '').trim();
}

// ─── ✨ MIKA'S LLM TAG QUALITY GATE ✨ ───
// Memory-directive junk, filler words and prose never belong in a diffusion prompt.
const MEMORY_JUNK_TAG_REGEX = /\b(?:memor(?:y|ies|ize|ized|izing)|remember(?:s|ing)?|note[\s_-]*to[\s_-]*self|mental[\s_-]*note|save[\s_-]*this|long[\s_-]*term[\s_-]*memory|as\s+an\s+ai)\b/i;

const FILLER_TAGS = new Set(['the', 'a', 'an', 'and', 'or', 'is', 'are', 'was', 'were', 'with', 'of', 'in', 'on', 'at', 'to', 'for', 'my', 'your', 'her', 'his', 'their', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'we', 'she', 'he', 'they', 'it', 'be', 'been', 'am', 'me', 'him', 'them', 'as', 'by', 'wait', 'oh', 'ooh', 'oof', 'hmm', 'huh', 'uh', 'um', 'yeah', 'yep', 'nah', 'ok', 'okay', 'well', 'just', 'really', 'very', 'so', 'too', 'also', 'now', 'then', 'here', 'there', 'when', 'what', 'who', 'why', 'how', 'which', 'because', 'but', 'if', 'not', 'never', 'always', 'maybe', 'please', 'thanks', 'thank', 'sorry', 'hey', 'hi', 'hello', 'lol', 'lmao', 'omg', 'wow', 'oops', 'anyway', 'anyways', 'btw', 'like', 'gonna', 'wanna', 'lets', 'let']);

const isConfidentDanbooruTag = (norm) => {
    if (/^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(norm.replace(/\s+/g, '_'))) return true; // snake_case danbooru
    return /^[a-z0-9]+(?:\s+[a-z0-9]+){0,3}$/.test(norm); // 1-4 plain lowercase words
};

/**
 * Normalizes an LLM-produced image tag blob and strips everything that is not plausibly a
 * Danbooru tag: markdown fences, XML remnants, bracket directives ([Memory: ...]), label
 * prefixes, memory-junk tokens, filler words, and full prose sentences.
 * ✨ v2.5.43 COMPLIANCE-FIRST CONTRACT: pieces already matching the brief-danbooru contract
 * (≤6 words, lowercase, snake_case-friendly, no sentence punctuation, no labels) pass through
 * UNTOUCHED — only deduped. The corrective shredding below only engages on drift pieces.
 * @param {string} raw
 * @returns {{tags: string[], confidentCount: number, clean: string}}
 */
export function sanitizeLlmImageTags(raw) {
    const empty = { tags: [], confidentCount: 0, clean: '' };
    if (!raw || typeof raw !== 'string') return empty;

    let work = raw
        .replace(/```[\w]*\n?/g, '')
        .replace(/```/g, '')
        .replace(/<[^>]+>/g, ' ');
    const scrubbed = extractBracketDirectives(work);
    work = scrubbed.clean;
    // ✨ v2.5.43 MID-LINE LABEL SWEEP: "smile, Location: rooftop cafe" — the label sits mid-string
    // after a comma, where the line-start decoder can't see it. Location/outfit/wardrobe/clothing
    // labels are unambiguous drift-form: strip the label, keep the payload as tags.
    work = work.replace(/(?:^|[,;\n])\s*(?:current_location|location|wardrobe|outfit|clothing|clothes)\s*:\s*/gi, ', ');
    // Salvaged [Image: ...] / {Photo: ...} / **Tags:** payloads ARE tag material — merge them back in!
    // ✨ v2.5.43 DRIFT-FORM FIX: labeled location/wardrobe payloads ("Location: rooftop cafe",
    // "Outfit: red dress, smile") are drift-FORM but compliant-CONTENT — merge them back too so the
    // photo pipeline's category detection can use them instead of dropping them into the void!
    if (scrubbed.imageTags) work = `${work}, ${scrubbed.imageTags}`;
    if (scrubbed.location) work = `${work}, ${scrubbed.location.replace(/\n/g, ', ')}`;
    if (scrubbed.wardrobe) work = `${work}, ${scrubbed.wardrobe.replace(/\n/g, ', ')}`;
    work = work
        .replace(/^\s*(?:danbooru\s*)?tags?\s*[:\-]\s*/i, '')
        .replace(/^\s*(?:image|photo)[\s_-]*prompt\s*[:\-]\s*/i, '')
        .replace(/^\s*(?:image|photo)[\s_-]*tags?\s*[:\-]\s*/i, '')
        .replace(/^\s*prompt\s*[:\-]\s*/i, '');

    const pieces = work.split(/[\n,]+/);
    const seen = new Set();
    const tags = [];
    let confidentCount = 0;

    for (const piece of pieces) {
        let t = piece.trim();
        if (!t) continue;
        t = t.replace(/^[-*•>]+\s*/, '');
        t = t.replace(/^["'`]+/, '').replace(/["'`]+$/, '').trim();
        t = t.replace(/[\s.!?;:]+$/, '').trim();
        if (!t || NOISE_PAYLOAD_REGEX.test(t)) continue;
        if (MEMORY_JUNK_TAG_REGEX.test(t)) continue;      // "memory", "remember to...", etc.
        if (/[.!?;:]/.test(t)) continue;                  // internal sentence punctuation → prose
        const words = t.split(/\s+/).filter(Boolean);
        if (words.length > 6) continue;                   // long prose fragment
        const norm = t.toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
        if (!norm || FILLER_TAGS.has(norm)) continue;
        if (seen.has(norm)) continue;
        seen.add(norm);
        tags.push(norm);
        if (isConfidentDanbooruTag(norm)) confidentCount++;
    }

    return { tags, confidentCount, clean: tags.join(', ') };
}

/**
 * ✨ MIKA'S PREFIX-ANCHORED TAG SCRUBBER (pure, node:test-able) ✨
 * The prefix SHIPS FIRST in every assembled prompt, so an authored tag that duplicates it is
 * pure waste: a burned budget slot AND a repeated CLIP token. These helpers purge authored
 * core/dynamic/fill tags against the shipped (or mirrored) prefix list BEFORE budgeting, so
 * the freed slots refill with real content. LOCALDREAM SCRUBBER-MODE: with the LocalDream
 * prefix ON, the app ships NO prefix (the host injects its own, unreadable from the app) —
 * the GLOBAL_POSITIVE_PREFIX textarea then acts as the scrubber list instead of shipping.
 */

/**
 * Normalized dedup key: lowercase, underscores → spaces, whitespace collapsed, trimmed.
 * Intentionally EXACT-match semantics — containment matching would shred legitimate tags
 * ('quality' in the prefix must not kill 'best quality ever' in the authored tags).
 */
export function normalizeTagKey(tag) {
    if (!tag || typeof tag !== 'string') return '';
    return tag.toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Order-preserving purge: drop every tag whose normalized key matches a prefix tag.
 * Junk-safe: null/junk inputs yield sane results, never throws.
 *
 * @param {string[]} tags - authored candidate tags (core / dynamic / fill)
 * @param {string[]} prefixTags - the prefix list to dedupe against (shipped prefix, or the
 *                                user's mirrored list in LocalDream scrubber-mode)
 * @returns {string[]} the surviving tags, original order preserved
 */
export function purgePrefixDuplicates(tags, prefixTags) {
    if (!Array.isArray(tags)) return [];
    const cleanTags = tags.filter(t => typeof t === 'string' && t.length > 0);
    if (!Array.isArray(prefixTags) || prefixTags.length === 0) return cleanTags;
    const prefixKeys = new Set(prefixTags.map(normalizeTagKey).filter(Boolean));
    if (prefixKeys.size === 0) return cleanTags;
    return cleanTags.filter(t => !prefixKeys.has(normalizeTagKey(t)));
}
