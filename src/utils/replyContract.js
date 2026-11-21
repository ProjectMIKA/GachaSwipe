// ------------------------------------------------------------
// ✨ MIKA'S REPLY CONTRACT — THE RECLASSIFICATION DOCTRINE ✨
// (v2.7.48 groundwork — stream paths adopt it phase by phase)
//
// WHY: every feature bolted its own teaching block onto the main chat
// stream (photo bible, M.E.O.W. tracking, dream-state audit), and all of
// it rides the KV-CACHED system prefix on the ~95% of turns that never
// emit the tag. The OOB side-channel (SDK ≥7.6) can author side-data
// AFTER a reply commits — invisible, prefix stays byte-identical,
// fail-closed. So the envelope is reclassified by TIMING, not habit:
//
//   TIMING-BOUND — stays in-band forever. An OOB result can never alter
//   a reply that is already committed, so anything the reply IS:
//     • the prose + <thought> stripping
//     • <heat> — the word IS the next turn's carry (heatLadder.js)
//     • <send_image> — the consent verdict (photo state machine)
//     • <battle_status> — combat sync parses at batch commit
//     • <drop_vip_set>, <current_location> — tiny, scene-native
//     • the group <reply>/<speaker>/<message> skeleton
//
//   BOOKKEEPING — OOB-primary when armed: the model emits the tiny
//   TRIGGER in-band, a side-channel ask authors the payload post-commit,
//   and any miss fails CLOSED to the byte-identical legacy path:
//     • <image_prompt> authoring          → photoTags ask (rescue → primary)
//     • <routine_update>, <wardrobe_addition> → lifeAudit ask
//     • <dream_state> tracking            → dreamJudge ask
//     • (<memory> already runs this exact pattern via oobMemoryActive.)
//
//   THE CAMERA LAW: under OOB-primary the character owns the VERDICT and
//   the narration↔verdict agreement; the SYSTEM owns the camera (tags,
//   attire directives and identity lock are enforced by OOB_VALIDATORS,
//   never by prompt compliance).
//
//   CARGO LAW (v2.7.48, honored): when moving prompt cargo out of the
//   prefix, DELETE the prefix copy in the same change. A split that ships
//   both halves is just bloat with extra steps.
//
// Single source of truth for: canonical machine-tag names, the streaming
// hold-back patterns (unclosed machine tags never render), and the
// prompt-side teaching lines in BOTH modes (legacy in-band vs OOB
// trigger-only). Pure utility — no React, no window at module top-level;
// node:test imports it directly.
// ------------------------------------------------------------

// ─── Canonical machine tags ────────────────────────────────────────────────────
export const REPLY_TAGS = Object.freeze({
    speaker: 'speaker',
    message: 'message',
    sendImage: 'send_image',
    imagePrompt: 'image_prompt',
    heat: 'heat',
    currentLocation: 'current_location',
    routineUpdate: 'routine_update',
    wardrobeAddition: 'wardrobe_addition',
    memory: 'memory',
    dropVipSet: 'drop_vip_set',
    battleStatus: 'battle_status',
    dreamState: 'dream_state',
    photoRequest: 'photo_request',
});

// Never move these OOB — see the doctrine header (timing-bound to the
// generation that emits them).
export const TIMING_BOUND_TAGS = Object.freeze([
    'heat',
    'send_image',
    'battle_status',
    'drop_vip_set',
    'current_location',
]);

// Tag → the side-channel kind that authors its payload post-commit.
// (photoTags exists today; lifeAudit + dreamJudge land in Phases 2–3.)
export const OOB_PRIMARY_KINDS = Object.freeze({
    image_prompt: 'photoTags',
    routine_update: 'lifeAudit',
    wardrobe_addition: 'lifeAudit',
    dream_state: 'dreamJudge',
});

// ─── Streaming hold-back (the partial-envelope guard) ─────────────────────────
// A stream tail containing an UNCLOSED machine tag must be held back from its
// opener — partial envelopes never render (the shipped-bug class behind the
// guard). Canonical source list; LAW: every new machine tag is added here AND
// to the envelope in the same change. <3 hearts are naturally safe: no tag here
// starts with a digit.
export const HOLD_BACK_TAGS = Object.freeze([
    'send_image',
    'image_prompt',
    'heat',
    'current_location',
    'routine_update',
    'wardrobe_addition',
    'memory',
    'drop_vip_set',
    'battle_status',
    'dream_state',
]);

export const buildMachineTagHoldBackPatterns = () => HOLD_BACK_TAGS.map(
    (t) => new RegExp(`<(?:${t})(?:\\s[^>]*)?>(?![\\s\\S]*</${t}\\s*>)`, 'i')
);

/**
 * Index of the EARLIEST unclosed machine-tag opener in `text`, or -1.
 * Call sites hold back `text.slice(index)` from the UI and keep the clean
 * prefix visible while the envelope finishes streaming.
 */
export function findOpenMachineTagIndex(text, patterns = buildMachineTagHoldBackPatterns()) {
    if (!text) return -1;
    let hold = -1;
    for (const re of patterns) {
        const m = text.match(re);
        if (m && typeof m.index === 'number' && (hold === -1 || m.index < hold)) {
            hold = m.index;
        }
    }
    return hold;
}

// ─── Mode resolution (capability-first, fail-closed) ──────────────────────────
// Settings are tri-state in spirit: true/undefined = follow host capability,
// explicit false = force the legacy in-band path. A host without the OOB
// side-channel is ALWAYS legacy, regardless of settings.
export const OOB_CONTRACT_DEFAULTS = Object.freeze({
    photoTags: true,   // > OOB_PHOTO_TAGS — the photoTags ask is the PRIMARY tag author
    lifeAudit: true,   // > OOB_LIFE_AUDIT — routine/wardrobe judged post-commit
    dreamJudge: true,  // > OOB_DREAM_JUDGE — dream state judged post-commit
});

export function resolveContractMode(oobSupported, setting) {
    if (!oobSupported) return 'legacy';
    return setting === false ? 'legacy' : 'oob';
}

// ─── PHOTO: OOB-primary teaching (prefix, byte-stable, trigger-only) ──────────
// The verdict is hers; the camera is the system's. No tag format, no attire
// directives, no identity-lock teaching (the photoTags validator enforces it).
export const PHOTO_CONTRACT_OOB = `4. PHOTO PROTOCOL: You have a smartphone camera, but most messages are normal chat without photos.
- Normal message (no photo): append <send_image>false</send_image> at the very end of your response.
- Sending a photo (ONLY when requested, agreed, teasing, or a proactive selfie): append <send_image>true</send_image> at the very end of your response. The system's camera desk authors the photo for you — do NOT write tags, prompts, or camera directions yourself.
- NARRATION AGREEMENT: never narrate taking or sending a photo unless you output <send_image>true</send_image>. If your text mentions, agrees to, or narrates sending a photo, the verdict MUST be true. If the verdict is false, no photo happens — never mention one.`;

/**
 * Per-turn OOB photo directive (ephemeral tail, armed turns only).
 * variant: 'retry' | 'asked' | 'proactive' | 'cooldown' | 'off'
 */
export function buildOobPhotoDirective({ variant, autonomy = true } = {}) {
    const YES = '<send_image>true</send_image>';
    const NO = '<send_image>false</send_image>';
    const desk = "The system's camera desk authors the photo — never write tags or image prompts yourself.";
    switch (variant) {
        case 'retry':
            return `The user is retrying a photo that wasn't received! You MUST send one now: append ${YES}. Do NOT output ${NO}! ${desk}`;
        case 'asked':
            return autonomy
                ? `The user asked for a photo/selfie! Autonomously decide from your persona, mood, and the scene: if you agree, flirt, tease, or feel like it, append ${YES}; only a firm refusal is ${NO}. ${desk}`
                : `The user asked for a photo/selfie! Append ${YES}, unless you firmly refuse with ${NO}. ${desk}`;
        case 'proactive':
            return `The user did not ask for a photo. You love taking selfies — if you feel excited, affectionate, or playful, append ${YES}; otherwise append ${NO}. ${desk}`;
        case 'cooldown':
            return `Photo on cooldown — append ${NO}. ${desk}`;
        default:
            return `Append ${NO}. ${desk}`;
    }
}

// ─── PHOTO: OOB-primary teaching (GROUP variant, v2.7.62 Phase 1b) ─────────────
// The solo contract's verdict-first law, reshaped for the multi-reply batch envelope:
// each <reply> carries its own verdict, the camera desk is the SYSTEM's, and the GM /
// M.I.K.A. Proxy camera ban rides the prefix (it was already in every legacy group
// photo rule — dropping it here would be a regression, not a cleanup).
export const PHOTO_CONTRACT_OOB_GROUP = `4. PHOTOS & SELFIES: The characters have smartphone cameras, but most messages are normal chat without photos — photos are RARE.
- EVERY <reply> block ends with <send_image>true</send_image> or <send_image>false</send_image> — that character's own verdict.
- Sending a photo (ONLY when explicitly requested by the user, agreed upon, teasing, or a rare spontaneous selfie): that reply ends with <send_image>true</send_image>. The system's camera desk authors every photo for the characters — do NOT write tags, prompts, or camera directions yourself (NEVER output <image_prompt>).
- NARRATION AGREEMENT: a character who mentions, agrees to, or narrates taking or sending a photo MUST end that reply with <send_image>true</send_image>. If the verdict is false, that character sends no photo — never mention one.
- M.I.K.A. Proxy / the Game Master CANNOT send images (always false).`;

/**
 * Per-turn OOB photo directive for GROUP batches (ephemeral tail, armed turns only).
 * Reply-scoped versions of the solo decision deltas — the batch model steers every
 * character's verdict, but still authors zero camera payload.
 */
export function buildOobGroupPhotoDirective({ variant, autonomy = true } = {}) {
    const YES = '<send_image>true</send_image>';
    const NO = '<send_image>false</send_image>';
    const desk = "The system's camera desk authors the photo — never write tags or image prompts yourself.";
    switch (variant) {
        case 'retry':
            return `The user is retrying a photo that wasn't received! The character who owns that photo MUST resend it now: her <reply> ends with ${YES}. Do NOT output ${NO}! ${desk}`;
        case 'asked':
            return autonomy
                ? `The user asked for a photo/selfie! Each character decides from her own persona, mood, and the scene: if one agrees, flirts, teases, or feels like it, her <reply> ends with ${YES}; only a firm refusal is ${NO}. ${desk}`
                : `The user asked for a photo/selfie! The asked character's <reply> ends with ${YES}, unless she firmly refuses with ${NO}. ${desk}`;
        case 'cooldown':
            return `A photo was shared recently — every <reply> ends with ${NO} to avoid spamming. If asked why, she says she just sent one. ${desk}`;
        default:
            return `The user did not ask for a photo. By default every <reply> ends with ${NO}. ${desk}`;
    }
}

/**
 * LEGACY photo directive (in-band tag authoring — hosts without OOB, or
 * toggles forced off). Condensed vs the old inline triple-duplication: ONE
 * concrete example per variant, laws stay in the static prefix block.
 * variant: 'retry' | 'asked' | 'proactive' | 'cooldown' | 'off'
 */
export function buildLegacyPhotoDirective({
    variant,
    attireHint = 'casual outfit',
    poseHint = 'looking at viewer',
    envHint = 'indoors',
    attireInstruction = '',
    autonomy = true,
    userName = 'Master',
} = {}) {
    const example = `<send_image>true</send_image><image_prompt><outfit>${attireHint}</outfit><pose_and_expression>${poseHint}, [expression tags]</pose_and_expression><environment>${envHint}</environment></image_prompt>`;
    const no = '<send_image>false</send_image>';
    switch (variant) {
        case 'retry':
            return `The user is retrying or asking you to resend a photo that wasn't received! ${attireInstruction} You MUST immediately resend the photo now: output ${example}. Do NOT output ${no}!`;
        case 'asked':
            return autonomy
                ? `The user asked for a photo/selfie! ${attireInstruction} Autonomously decide based on your persona, mood, and the scene: if agreeing, flirting, teasing, or giving in, output ${example}. Output ${no} ONLY if firmly refusing.`
                : `The user asked for a photo/selfie! ${attireInstruction} Output ${example} unless firmly refusing with ${no}.`;
        case 'proactive':
            return `The user did not ask for a photo. Most responses must be normal chat with ${no}. However, you love taking selfies! If you feel excited, affectionate, want to show off your outfit/location, or feel like teasing ${userName}, output ${example}. Otherwise, output ${no}.`;
        case 'cooldown':
            return `The user did not ask for a photo (photo on cooldown). Output ${no}.`;
        default:
            return `Output ${no}.`;
    }
}

// Legacy identity lock (rides the static prefix CAMERA RULES block in legacy
// mode only; OOB-primary replaces it with the validator gate).
export const PHOTO_IDENTITY_LOCK_LEGACY = 'CHARACTER IDENTITY LOCK: NEVER output physical appearance tags (hair color, eye color, face, body) in <image_prompt> — your core identity is already locked! ONLY output outfit, pose/expression, and environment tags.';

// ─── LIFE AUDIT: OOB-primary teaching (Phase 2) ───────────────────────────────
// Replaces solo rules 6+7 (routine_update + wardrobe_addition) and the group
// meowFields equivalents when the lifeAudit ask is armed. Fail-closed: no
// valid post-commit verdict = no event = legacy tags simply never needed.
export const LIFE_AUDIT_RULE_OOB = 'LIFE AUDIT: The system detects major routine changes and new clothing automatically — never output <routine_update> or <wardrobe_addition> tags, and never mention this tracking.';

// ─── DREAM TRACKING: OOB-primary teaching (Phase 3) ───────────────────────────
// Replaces the <dream_state> CRITICAL TRACKING DIRECTIVE when the dreamJudge
// ask is armed. No verdict = no change (deterministic dive state).
export const DREAM_TRACKING_RULE_OOB = 'DREAM TRACKING: The system monitors lucidity, volatility, and dream scene changes automatically — never output a <dream_state> block and never mention this monitoring. Just live the dream.';


