import { categorizeDynamicTag } from './deepPromptMode.js';
import { recordFluxConvertTrace, notifyFluxOobActivity } from './oobChannel.js';

export const PROMPTING_STYLES = Object.freeze({
    DANBOORU: 'danbooru',
    FLUX: 'flux',
    HYBRID_PERCHANCE: 'hybrid_perchance',
    CUSTOM: 'custom'
});

export const DEFAULT_CUSTOM_OOB_PROMPT_INSTRUCTIONS = [
    'Rewrite these image tags into 2-3 vivid natural-language sentences for an AI image generator:',
    '{{TAGS}}',
    '',
    'Rules:',
    '- Preserve EVERY physical trait (hair, eyes, species, frame), outfit item, pose/expression, setting, and lighting.',
    '- If two subjects are interacting in the scene, prefix their spatial positions with LEFT: and RIGHT: lines first to prevent attribute bleed; omit LEFT:/RIGHT: for solo shots.',
    '- Describe character identity first, then clothing, pose/expression, background, and lighting/atmosphere.',
    '- Write natural English prose. NO underscores, NO comma-separated tag dumps, NO invented objects, NO XML/markdown.',
    '- Return ONLY JSON: {"prompt": "..."}'
].join('\n');

export const PROMPTING_STYLE_OPTIONS = Object.freeze([
    {
        id: PROMPTING_STYLES.DANBOORU,
        label: 'Danbooru Tags',
        badge: 'SD / SDXL / PONY',
        description: 'Best for SD1.5, SDXL, Illustrious, Pony, NoobAI, and anime tag-trained LoRAs. Keeps comma-separated booru tags.'
    },
    {
        id: PROMPTING_STYLES.FLUX,
        label: 'Flux / Natural Language',
        badge: 'FLUX / CHROMA',
        description: 'Best for pure FLUX, Chroma, HiDream, SANA, Lumina 2, and Qwen-Image. Converts tags into flowing natural prose.'
    },
    {
        id: PROMPTING_STYLES.HYBRID_PERCHANCE,
        label: 'Natural Language/Danbooru',
        badge: 'PERCHANCE HYBRID',
        description: 'Default for Perchance Cloud. Front-loads FLUX natural-language prose (with LEFT:/RIGHT: two-subject split) and appends unweighted Danbooru anchor tags underneath.'
    },
    {
        id: PROMPTING_STYLES.CUSTOM,
        label: 'Custom',
        badge: 'CUSTOM OOB DIRECTOR',
        description: 'Customize the exact instructions sent to the OOB Director when rewriting image prompts. (Warning: can break image prompting if misconfigured.)'
    }
]);

const VALID_STYLES = new Set([
    PROMPTING_STYLES.DANBOORU,
    PROMPTING_STYLES.FLUX,
    PROMPTING_STYLES.HYBRID_PERCHANCE,
    PROMPTING_STYLES.CUSTOM
]);

export const normalizePromptingStyle = (style) => (
    VALID_STYLES.has(style) ? style : PROMPTING_STYLES.DANBOORU
);

export const isOobProsePromptingStyle = (style) => (
    style === PROMPTING_STYLES.FLUX ||
    style === PROMPTING_STYLES.HYBRID_PERCHANCE ||
    style === PROMPTING_STYLES.CUSTOM
);

/**
 * Resolve prompting style for a model key.
 * Explicit user overrides always win; otherwise Perchance defaults to
 * Natural Language/Danbooru Hybrid ('hybrid_perchance') while all other models
 * default to Danbooru Tags.
 * @param {Record<string, string>|null|undefined} prefs
 * @param {string} [modelKey]
 * @returns {'danbooru'|'flux'|'hybrid_perchance'|'custom'}
 */
export const getPromptingStyleForModel = (prefs, modelKey) => {
    const key = modelKey || 'auto';
    const stored = (prefs && typeof prefs === 'object') ? prefs[key] : null;
    if (VALID_STYLES.has(stored)) {
        return stored;
    }
    if (String(key).toLowerCase().includes('perchance')) {
        return PROMPTING_STYLES.HYBRID_PERCHANCE;
    }
    return PROMPTING_STYLES.DANBOORU;
};

/**
 * Strip SD1.5/SDXL numeric parenthesis weights from a comma-separated Danbooru tag string
 * (e.g. `(crimson eyes:1.4)` -> `crimson eyes`, `((masterpiece))` -> `masterpiece`)
 * while keeping the comma-separated tag list intact for Hybrid Perchance anchoring.
 * @param {string} scrubbedDanbooruTags
 * @returns {string}
 */
export const stripTagWeights = (scrubbedDanbooruTags) => {
    const raw = String(scrubbedDanbooruTags || '').trim();
    if (!raw) return '';
    return raw
        .split(',')
        .map((part) => {
            let t = String(part || '').trim();
            t = t.replace(/^[({[]+/, '').replace(/[)}\]]+$/, '');
            t = t.replace(/:\s*\d+(?:\.\d+)?\s*$/, '');
            t = t.replace(/^[({[]+/, '').replace(/[)}\]]+$/, '');
            return t.replace(/\s+/g, ' ').trim();
        })
        .filter(Boolean)
        .join(', ');
};

/**
 * Compose the two-stage Natural Language/Danbooru Hybrid (Perchance) prompt:
 * front-loaded natural-language prose on top, blank line, unweighted Danbooru tags underneath.
 * @param {string} fluxNaturalLanguageProse
 * @param {string} scrubbedDanbooruTags
 * @returns {string}
 */
export const composeHybridPerchancePrompt = (fluxNaturalLanguageProse, scrubbedDanbooruTags) => {
    const prose = String(fluxNaturalLanguageProse || '').trim();
    const cleanedTags = stripTagWeights(scrubbedDanbooruTags);
    if (!prose) return cleanedTags;
    if (!cleanedTags) return prose;
    if (prose.includes('\n\n') && prose.endsWith(cleanedTags)) return prose;
    return `${prose}\n\n${cleanedTags}`;
};

/**
 * Build the OOB Director ask from user-supplied custom instructions, interpolating {{TAGS}}
 * (or appending the tags if the user omitted the placeholder) and guaranteeing JSON output instruction.
 * @param {string} rawTags
 * @param {string} [customInstructions]
 * @returns {string}
 */
export const buildCustomOobAsk = (rawTags, customInstructions) => {
    const tpl = String(customInstructions || '').trim() || DEFAULT_CUSTOM_OOB_PROMPT_INSTRUCTIONS;
    const hasPlaceholder = /\{\{\s*(?:TAGS|PROMPT)\s*\}\}|\{\s*(?:tags|prompt)\s*\}/i.test(tpl);
    let body = hasPlaceholder
        ? tpl.replace(/\{\{\s*(?:TAGS|PROMPT)\s*\}\}|\{\s*(?:tags|prompt)\s*\}/gi, rawTags)
        : `${tpl}\n\nImage Tags:\n${rawTags}`;
    if (!/return\s+only\s+json/i.test(body)) {
        body += '\n\nReturn ONLY JSON: {"prompt": "..."}';
    }
    return body;
};

const stripTagWeightSyntax = (raw) => {
    let t = String(raw || '').trim();
    // Remove outer emphasis wrappers like ((masterpiece)) or (crimson eyes:1.2)
    t = t.replace(/^[({[]+/, '').replace(/[)}\]]+$/, '');
    t = t.replace(/:\s*\d+(?:\.\d+)?\s*$/, '');
    t = t.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    return t;
};

const SUBJECT_HINT = /\b(1girl|1boy|solo|girl|boy|woman|man|lady|fox|cat|wolf|elf|demon|angel|kemonomimi|neko|kitsune|hair|eyes|skin|chest|breasts|bust|petite|slender|curvy|tall|short|ears|tail|horns|wings|fangs|freckles|glasses|ponytail|twintails|braid|bangs|ahoge)\b/i;
const QUALITY_STYLE_HINT = /\b(masterpiece|best quality|highres|high quality|anime|illustration|digital painting|photorealistic|cinematic|detailed|4k|8k|cel shaded|watercolor)\b/i;
const POSE_PRIORITY_HINT = /^(sitting|standing|lying|kneeling|leaning|crouching|walking|running|jumping|smiling|grinning|blushing|winking|looking|gazing|holding|hugging|crossed arms|hand on|hands on)\b/i;
const DEEP_LIGHT_HINT = /\b(lighting|light|backlight|glow|sunlight|moonlight|shadow|bokeh|dutch angle|close-up|wide shot|from above|from below|atmosphere|mood|night|sunset|dawn|dusk|rain|snow)\b/i;
const ENV_PRIORITY_HINT = /\b(street|alley|room|bedroom|classroom|cafe|shrine|forest|beach|rooftop|city|park|garden|library|office|kitchen|bathroom|balcony|hallway|indoors|outdoors|background|courtyard|temple)\b/i;

/**
 * Detect whether a prompt is already written in natural prose so we never
 * double-convert or distort already-natural prompts.
 * @param {string} prompt
 * @returns {boolean}
 */
export const isAlreadyNaturalProse = (prompt) => {
    const s = String(prompt || '').trim();
    if (!s) return false;
    const parts = s.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length <= 2 && s.split(/\s+/).length >= 8) return true;
    const hasSentencePunct = /[.!?]\s+[A-Z]/.test(s) || /[.!?]$/.test(s);
    const avgWordsPerComma = s.split(/\s+/).length / Math.max(1, parts.length);
    return hasSentencePunct && avgWordsPerComma >= 5;
};

/**
 * Deterministic zero-latency fallback converter that turns Danbooru tag lists into
 * clean, grammatical natural-language prose grouped by identity, outfit, pose, and scene.
 * @param {string} tagPrompt
 * @returns {string}
 */
export const buildDeterministicFluxPrompt = (tagPrompt) => {
    const raw = String(tagPrompt || '').trim();
    if (!raw) return '';
    if (isAlreadyNaturalProse(raw)) return raw;

    const seen = new Set();
    const cleaned = [];
    for (const part of raw.split(',')) {
        const tag = stripTagWeightSyntax(part);
        if (!tag) continue;
        const low = tag.toLowerCase();
        if (seen.has(low)) continue;
        seen.add(low);
        cleaned.push(tag);
    }
    if (cleaned.length === 0) return raw;

    const buckets = {
        style: [],
        subject: [],
        outfit: [],
        pose: [],
        env: [],
        deep: []
    };

    for (const tag of cleaned) {
        if (QUALITY_STYLE_HINT.test(tag)) {
            buckets.style.push(tag);
            continue;
        }
        if (POSE_PRIORITY_HINT.test(tag)) {
            buckets.pose.push(tag);
            continue;
        }
        if (ENV_PRIORITY_HINT.test(tag)) {
            buckets.env.push(tag);
            continue;
        }
        if (DEEP_LIGHT_HINT.test(tag)) {
            buckets.deep.push(tag);
            continue;
        }
        const cat = categorizeDynamicTag(tag);
        if (cat === 'outfit' || cat === 'pose' || cat === 'env' || cat === 'deep') {
            buckets[cat].push(tag);
        } else if (SUBJECT_HINT.test(tag) || buckets.subject.length < 5) {
            buckets.subject.push(tag);
        } else {
            buckets.pose.push(tag);
        }
    }

    const sentences = [];
    const leadParts = [];
    if (buckets.subject.length > 0) {
        leadParts.push(`A highly detailed anime-style scene featuring ${buckets.subject.join(', ')}`);
    } else {
        leadParts.push('A highly detailed anime-style scene');
    }
    if (buckets.outfit.length > 0) {
        leadParts.push(`wearing ${buckets.outfit.join(', ')}`);
    }
    if (buckets.pose.length > 0) {
        leadParts.push(buckets.pose.join(', '));
    }
    sentences.push(`${leadParts.join(', ')}.`);

    const sceneParts = [];
    if (buckets.env.length > 0) {
        sceneParts.push(`Set in ${buckets.env.join(', ')}`);
    }
    if (buckets.deep.length > 0) {
        sceneParts.push(sceneParts.length > 0
            ? `with ${buckets.deep.join(', ')}`
            : `Composed with ${buckets.deep.join(', ')}`);
    }
    if (buckets.style.length > 0 && buckets.style.length <= 4) {
        sceneParts.push(`rendered in ${buckets.style.join(', ')}`);
    }
    if (sceneParts.length > 0) {
        sentences.push(`${sceneParts.join(', ')}.`);
    }

    return sentences.join(' ').replace(/\s+/g, ' ').trim();
};

/**
 * Hybrid FLUX / Natural Language / Perchance Hybrid / Custom OOB Director converter:
 * Uses a fast OOB Director LLM pass (preserving all identity/outfit/pose/scene traits)
 * regardless of user OOB toggles when Flux, Natural Language/Danbooru Hybrid, or Custom
 * is selected, and fails closed to `buildDeterministicFluxPrompt` if OOB is unavailable,
 * times out, or returns malformed text.
 * When `style === 'hybrid_perchance'`, programmatically appends the unweighted Danbooru
 * tags underneath the natural-language prose (`[Prose]\n\n[Tags]`) with zero extra LLM calls.
 * @param {string} tagPrompt
 * @param {{ sdk?: any, tokenBudget?: number, timeoutMs?: number, style?: string, customInstructions?: string, onFluxConvertStart?: Function, onFluxConvertEnd?: Function }} [opts]
 * @returns {Promise<string>}
 */
export async function convertPromptToFluxProse(tagPrompt, {
    sdk = null,
    tokenBudget = 256,
    timeoutMs = 25000,
    style = PROMPTING_STYLES.FLUX,
    customInstructions = '',
    onFluxConvertStart = null,
    onFluxConvertEnd = null,
} = {}) {
    const raw = String(tagPrompt || '').trim();
    if (!raw) return '';
    const isHybrid = style === PROMPTING_STYLES.HYBRID_PERCHANCE;
    const isCustom = style === PROMPTING_STYLES.CUSTOM;

    if (isAlreadyNaturalProse(raw)) {
        return raw;
    }

    const finalizeOutput = (proseText) => (
        isHybrid ? composeHybridPerchancePrompt(proseText, raw) : proseText
    );

    const startedAt = Date.now();
    try {
        if (typeof onFluxConvertStart === 'function') {
            onFluxConvertStart({ prompt: raw, tokenBudget, style });
        }
    } catch { /* never let UI hook break conversion */ }

    const baseFallback = buildDeterministicFluxPrompt(raw);
    const fallback = finalizeOutput(baseFallback);
    const oobFn = sdk?.contextual?.sendOutOfBandMessage;
    if (typeof oobFn !== 'function') {
        const latencyMs = Date.now() - startedAt;
        recordFluxConvertTrace({ ok: false, latencyMs, ask: raw, reply: fallback, tokenBudget, style, error: 'unsupported' });
        try {
            if (typeof onFluxConvertEnd === 'function') {
                onFluxConvertEnd({ ok: false, latencyMs, fallbackUsed: true, prompt: fallback, style });
            }
        } catch { /* ignore */ }
        return fallback;
    }

    const sentenceTarget = (Number(tokenBudget) || 256) >= 256
        ? '2-3 vivid natural-language sentences'
        : '1-2 concise natural-language sentences';

    const ask = isCustom
        ? buildCustomOobAsk(raw, customInstructions)
        : [
            `Rewrite these image tags into ${sentenceTarget} for a FLUX / natural-language image generator:`,
            raw,
            '',
            'Rules:',
            '- Preserve EVERY physical trait (hair, eyes, species, frame), outfit item, pose/expression, setting, and lighting.',
            '- If two subjects are interacting in the scene, prefix their spatial positions with LEFT: and RIGHT: lines first to prevent attribute bleed, followed by front-loaded camera/pose/lighting prose. Omit LEFT:/RIGHT: for solo shots.',
            '- Describe character identity first, then clothing, pose/expression, background, and lighting/atmosphere.',
            '- Write natural English prose. NO underscores, NO comma-separated tag dumps, NO invented objects, NO XML/markdown.',
            '- Return ONLY JSON: {"prompt": "..."}'
        ].join('\n');

    notifyFluxOobActivity('start');
    try {
        let timedOut = false;
        const res = await Promise.race([
            oobFn.call(sdk.contextual, ask, {
                jsonSchema: {
                    type: 'object',
                    properties: {
                        prompt: { type: 'string' }
                    },
                    required: ['prompt']
                }
            }),
            new Promise((resolve) => setTimeout(() => { timedOut = true; resolve(null); }, timeoutMs))
        ]);

        const latencyMs = Date.now() - startedAt;
        let candidate = '';
        if (typeof res === 'string') {
            const trimmed = res.trim();
            if (trimmed.startsWith('{')) {
                try { candidate = String(JSON.parse(trimmed)?.prompt || ''); } catch { candidate = ''; }
            } else {
                candidate = trimmed;
            }
        } else if (res && typeof res === 'object' && typeof res.prompt === 'string') {
            candidate = res.prompt;
        }

        candidate = candidate.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
        if (!candidate || candidate.length < 12 || /<[^>]+>/.test(candidate)) {
            const errReason = timedOut ? 'timeout' : 'invalid_reply';
            recordFluxConvertTrace({ ok: false, latencyMs, ask, reply: fallback, tokenBudget, style, error: errReason });
            notifyFluxOobActivity('fail');
            try {
                if (typeof onFluxConvertEnd === 'function') {
                    onFluxConvertEnd({ ok: false, latencyMs, fallbackUsed: true, prompt: fallback, style });
                }
            } catch { /* ignore */ }
            return fallback;
        }
        const finalOut = finalizeOutput(candidate);
        recordFluxConvertTrace({ ok: true, latencyMs, ask, reply: finalOut, tokenBudget, style });
        notifyFluxOobActivity('success');
        try {
            if (typeof onFluxConvertEnd === 'function') {
                onFluxConvertEnd({ ok: true, latencyMs, fallbackUsed: false, prompt: finalOut, style });
            }
        } catch { /* ignore */ }
        return finalOut;
    } catch (err) {
        const latencyMs = Date.now() - startedAt;
        recordFluxConvertTrace({ ok: false, latencyMs, ask, reply: fallback, tokenBudget, style, error: err?.message || 'error' });
        notifyFluxOobActivity('fail');
        try {
            if (typeof onFluxConvertEnd === 'function') {
                onFluxConvertEnd({ ok: false, latencyMs, fallbackUsed: true, prompt: fallback, style });
            }
        } catch { /* ignore */ }
        return fallback;
    }
}
