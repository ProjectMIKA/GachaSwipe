/**
 * ✨ MIKA'S PHOTO CONSENT ENGINE (v2.7.61 — the group verdict-first fix) ✨
 *
 * ONE shared, PURE decision brain for "does this reply ship a photo?" — consumed by the
 * 1-on-1 commit, the group live scan, and the group completion parse. Before this module
 * the three call sites carried three hand-copied verdict trees, and the group's two copies
 * were FAIL-OPEN: a dutiful `<send_image>false</send_image>` was OR'd into the narration
 * heuristics instead of consulted, so in RP-style groups every asterisk narration carrying
 * a device word + an action word ("*takes her phone out of her pocket*") spawned a photo
 * the model had explicitly declined — the image-with-every-message bug (Platform Law #2,
 * fail-closed, applies to the camera too).
 *
 * THE VERDICT LAW: an explicit <send_image>false</send_image> outranks loose camera-action
 * narration. Only real evidence overrides a refusal — explicit <image_prompt> tags the
 * model actually authored, or a hard delivery confirmation ("here's the pic", "sending it
 * now") — and a genuine verbal refusal still wins over everything. An explicit true
 * verdict sends unless the character genuinely refused in prose. A MISSING verdict
 * (drifting models) falls back to the legacy narration heuristics — the only branch where
 * narration alone can summon the camera, now behind word-boundary-locked regexes so
 * "picnic", "let me take a look", and "sending hugs" no longer match.
 *
 * Pure JS — no React, no window at module top-level. Tested in tests/photoConsent.test.mjs.
 */

// v2.7.62: imports the bracket-directive decoder for the group extractor below —
// hallucinationScrubber.js is pure (same doctrine), no cycle.
import { extractBracketDirectives } from './hallucinationScrubber.js';

// ─── Shared vocabularies (word-boundary locked — substring ghosts die here) ──────
const PHOTO_NOUN = String.raw`(?:\bpics?(?:tures?)?\b|\bphotos?\b|\bimages?\b|\bselfies?\b|\bsnapshots?\b)`;
const CAMERA_DEVICE = String.raw`(?:\bshutters?\b|\bcameras?\b|\bphones?\b|\bselfies?\b|\bphotos?\b|\bpics?(?:tures?)?\b|\bsnapshots?\b)`;
const CAMERA_ACTION = String.raw`(?:\bclicks?\b|\bsnaps?\b|\btakes?\b|\btaking\b|\bsnapping\b|\bholds?\b|\bholding\b|\bpoints?\b|\bpointing\b|\baims?\b|\baiming\b|\bpositions?\b|\bposing\b|\bflashes?\b|\bflashing\b|\bsends?\b|\bsending\b|\battaches?\b|\battaching\b|\battached\b)`;

// Verbal refusals vs concessions (legacy-exact: "no way" vs "ok fine" — a concession
// rescues a refusal, so a tsundere "no way... fine, here" is NOT a genuine refusal).
export const PHOTO_VERBAL_REFUSAL_RE = /\b(?:no\s+(?:way|chance|pics?|photos?|selfies?)|not\s+(?:gonna|going\s+to|taking|sending)|won'?t\s+(?:take|send)|can'?t\s+(?:take|send)|refuse\b|never\b|in\s+your\s+dreams|as\s+if)\b/i;
export const PHOTO_VERBAL_CONCESSION_RE = /\b(?:ok\s*fine|okay\s*fine|\.\.\.fine|just\s+this\s+once|just\s+for\s+you|you\s+win|if\s+you\s+insist|sending!|retries?\s+sending|here\s+(?:you\s+go|it\s+is|'s\s+the\s+(?:pic|photo|selfie)))\b/i;

// Asterisk-narrated camera action ("*holds up her phone and snaps a selfie*") — device
// word and action word in EITHER order inside one asterisk block (single-line, matching
// the historical regex: no dotAll). Word boundaries kill substring ghosts ("picnic").
export const PHOTO_CAMERA_ASTERISK_RE = new RegExp(
    `(?:\\*.*?${CAMERA_DEVICE}.*?${CAMERA_ACTION}.*?\\*)|(?:\\*.*?${CAMERA_ACTION}.*?${CAMERA_DEVICE}.*?\\*)`,
    'i',
);

// Non-asterisk camera phrases — historically gated on !genuineRefusal at the solo site;
// that gate is preserved inside decideSendsPhoto.
export const PHOTO_CAMERA_PLAIN_RE = /(?:shutter\s*clicks?|camera\s*clicks?|positions?\s*phone|holding\s*(?:up\s*)?phone)/i;

// Hard delivery confirmations — "here's the pic", "sending it now", "let me take another
// one". v2.7.61 tightening: the photo noun is REQUIRED in the "sending/sent/attaching"
// families (bare "sending hugs" used to match), and the retry family must land on a real
// object ("let me take a look" used to match because every trailing group was optional).
export const PHOTO_SEND_CONFIRMATION_RE = new RegExp(`(?:${[
    `here(?:'s| is)\\s+(?:the|my|a|an|another|one|this)?\\s*${PHOTO_NOUN}`,
    `here\\s+(?:you\\s+go|it\\s+is)`,
    `attaching\\s+(?:the|a|my|another)?\\s*${PHOTO_NOUN}`,
    `sent\\s+(?:you\\s+)?(?:a|the|another|it)?\\s*${PHOTO_NOUN}`,
    `sending\\s+(?:you\\s+)?(?:a|the|it|another|one|my|this)?\\s*${PHOTO_NOUN}`,
    `sending\\s*(?:it\\s+)?(?:now|again|over|!|right\\s+now)`,
    `(?:try|trying|retrying|let\\s+me)\\s+(?:to\\s+)?(?:send(?:ing)?|resend|re-send|take)\\s+(?:it\\s+)?(?:again|another\\s+(?:one|pics?|photos?|selfies?)|one|${PHOTO_NOUN})`,
    `(?:re-?sending|re-?send)\\s*(?:it|now|again)?`,
    `take\\s+another\\s+(?:one|pics?|photos?|selfies?)`,
    `check\\s+(?:out\\s+)?this\\s+${PHOTO_NOUN}`,
].join('|')})`, 'i');

/**
 * Verbal refusal vs concession analyzer. `genuine = refusal && !concession`.
 */
export function decideGenuineRefusal(text) {
    const t = String(text || '');
    const refusal = PHOTO_VERBAL_REFUSAL_RE.test(t);
    const concession = PHOTO_VERBAL_CONCESSION_RE.test(t);
    return { refusal, concession, genuine: refusal && !concession };
}

/**
 * THE shared verdict-first photo gate (1-on-1 commit, group live scan, group completion).
 * Returns `{ send, reason, narrationTriggered, explicitTags }` and NEVER throws.
 *
 *   - `sendImageVerdict`: the extracted <send_image> tag CONTENT ('true' | 'false' | '' when absent)
 *   - `messageText`: the reply text the refusal/confirmation/narration regexes scan
 *   - `imagePromptText`: extracted <image_prompt> content ('' when absent; >2 chars = explicit)
 *   - `userAskedForPhoto`: isPhotoRequestMessage() on the user's last message
 *   - `userAskedForVip`: solo-only VIP plug guard (groups pass false via default)
 *   - `selfieAutonomy`: the > SELFIE_AUTONOMY toggle (group now respects it, 1-on-1 parity)
 *   - `cameraDenied`: GM / SYSTEM / M.I.K.A. Proxy speakers — never a camera, fail-closed
 */
export function decideSendsPhoto({
    sendImageVerdict = '',
    messageText = '',
    imagePromptText = '',
    userAskedForPhoto = false,
    userAskedForVip = false,
    selfieAutonomy = true,
    cameraDenied = false,
} = {}) {
    if (cameraDenied) return { send: false, reason: 'camera_denied', narrationTriggered: false, explicitTags: false };
    const verdict = String(sendImageVerdict || '').trim();
    const aiAgreedXML = /^(?:true|yes|1)\b/i.test(verdict);
    const aiRefusedXML = /^(?:false|no|0)\b/i.test(verdict);
    const hasExplicitImagePrompt = Boolean(imagePromptText && String(imagePromptText).trim().length > 2);
    const { genuine: isGenuineRefusal, concession: isConcession } = decideGenuineRefusal(messageText);
    const asteriskAction = PHOTO_CAMERA_ASTERISK_RE.test(messageText);
    const plainAction = PHOTO_CAMERA_PLAIN_RE.test(messageText);
    const aiActionTakingPhoto = asteriskAction || (plainAction && !isGenuineRefusal);
    const aiSendingConfirmation = PHOTO_SEND_CONFIRMATION_RE.test(messageText);
    const narrationTriggered = aiSendingConfirmation || asteriskAction || plainAction;

    let send = false;
    let reason = 'silent';
    if (aiRefusedXML) {
        // ✨ THE VERDICT LAW: explicit false outranks loose camera-action narration. Only
        // authored tags or a hard delivery confirmation override (comply/typo rescue), and
        // a genuine verbal refusal still wins. The old solo tree ALSO let asterisk camera
        // narration override a false verdict — that term is dead: it was the fail-open
        // screw behind the group's image-with-every-message bug.
        send = (hasExplicitImagePrompt || aiSendingConfirmation) && !isGenuineRefusal;
        reason = send ? 'refused_overridden' : 'verdict_refused';
    } else if (aiAgreedXML) {
        // Explicit true: send unless the character genuinely refused in prose.
        send = !isGenuineRefusal || isConcession || aiActionTakingPhoto || hasExplicitImagePrompt;
        reason = send ? 'verdict_true' : 'verdict_true_refused_in_prose';
    } else if (selfieAutonomy) {
        // No verdict at all (drifting models): legacy heuristics — the only branch where
        // narration alone can summon the camera.
        send = hasExplicitImagePrompt || aiSendingConfirmation || aiActionTakingPhoto || (userAskedForPhoto && !isGenuineRefusal);
        reason = send ? 'heuristic' : 'silent';
    } else {
        // Selfie autonomy OFF: she only photographs when asked (and not for VIP plugs) or
        // when she concretely offered. 1-on-1 legacy behavior, verbatim.
        const aiOfferedPhoto = aiAgreedXML || hasExplicitImagePrompt || aiSendingConfirmation || (aiActionTakingPhoto && !isGenuineRefusal);
        send = (userAskedForPhoto && !userAskedForVip && !isGenuineRefusal) || aiOfferedPhoto;
        reason = send ? 'asked_or_offered' : 'silent';
    }
    return { send, reason, narrationTriggered, explicitTags: hasExplicitImagePrompt };
}

// ─── THE EMPTY TAG LAW (v2.7.62 — the group extractor forgery fix) ─────────────
// The group XML schema historically mandated an EMPTY <image_prompt></image_prompt>
// on every reply (all 8 exemplars taught it), so dutiful models emitted it constantly.
// The old App.jsx extractor treated "matched but empty" the same as "no match at all"
// and fell through to the unterminated-tail salvage — which then captured everything
// after the opener (e.g. "</image_prompt>\n<heat>Warm</heat>") as "tags". That garbage
// passed the length>2 checks, forged hasExplicitImagePrompt on nearly EVERY reply, and
// behind the v2.7.61 verdict law turned explicit <send_image>false</send_image>
// refusals into "refused_overridden" photo sends — the images-on-every-message bug's
// second screw. LAW: a MATCHED CLOSED tag is the reply's FINAL answer — empty means
// "no tags" — and the salvage chain (unterminated tail, bracket directives) may ONLY
// run when no closed tag exists at all. Under the v2.7.62 OOB-primary contract the
// model stops authoring tags entirely, but habit drift still emits the empty tag —
// this law is load-bearing in BOTH modes.
const GROUP_PROMPT_TAG_NAMES = 'image_prompt|image-prompt|photo_prompt|image_tags|image_url|prompt|image|pic|img';
const GROUP_PROMPT_CLOSED_RE = new RegExp(`<(?:${GROUP_PROMPT_TAG_NAMES})\\b[^>]*>([\\s\\S]*?)</(?:${GROUP_PROMPT_TAG_NAMES})\\s*>`, 'i');
const GROUP_PROMPT_OPEN_TAIL_RE = new RegExp(`<(?:${GROUP_PROMPT_TAG_NAMES})\\b[^>]*>([\\s\\S]*)$`, 'i');
const GROUP_BOOLEAN_ALIAS_RE = /^(?:true|false|yes|no|[01])\s*$/i;

export function extractGroupImagePrompt(block) {
    const raw = String(block || '');
    const closedMatch = raw.match(GROUP_PROMPT_CLOSED_RE);
    let rawImgPrompt = '';
    if (closedMatch) {
        // A closed tag — even an empty one — is final. No salvage past it.
        rawImgPrompt = (closedMatch[1] || '').trim();
    } else {
        // Drift rescue, gated on NO closed tag: streaming-cut unterminated tail first,
        // then bracket directives ([Image: ...], {Photo: ...}, "Tags: ..." lines).
        rawImgPrompt = (raw.match(GROUP_PROMPT_OPEN_TAIL_RE)?.[1] || '').trim();
        if (!rawImgPrompt) {
            rawImgPrompt = extractBracketDirectives(raw).imageTags.trim();
        }
    }
    // Boolean-only alias (<image>true</image>) carries no tags.
    if (GROUP_BOOLEAN_ALIAS_RE.test(rawImgPrompt)) rawImgPrompt = '';
    return rawImgPrompt
        ? rawImgPrompt.replace(/```[\w]*\n?/g, '').replace(/```/g, '').replace(/^(?:tags|prompt|image\s*prompt):\s*/i, '').replace(/[\r\n]+/g, ', ').replace(/,\s*,/g, ',').trim()
        : '';
}


