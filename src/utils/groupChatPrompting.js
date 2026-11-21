// ✨ M.I.K.A. MODULAR GROUP CHAT PROMPTING & STYLE OVERRIDE ENGINE ✨
import { sectionRpLongContent } from '../components/RoleplayRenderer.jsx';
import { extractBracketDirectives } from './hallucinationScrubber.js';
import { getNarrationStyleLabel, getNarrationAsteriskRule } from './narrationStyle.js';

/**
 * Generates all modular prompt rules, XML schemas, and style override directives
 * for the group chat LLM engine based on the active style mode and recent chat history.
 */
export function getGroupStyleDirectives({ styleMode = 'dynamic_sms', recentHistory = [], meowFields = '', banterCountOverride = null, narrationPerson = 'first', photoGuidance = null, photoContractMode = 'legacy' }) {
    const isSMS = styleMode === 'dynamic_sms' || styleMode === 'long_sms';
    const isLong = styleMode === 'long_sms' || styleMode === 'long_rp';
    const isLongRP = styleMode === 'long_rp';
    const isDynamicRP = styleMode === 'dynamic_rp';
    const isDynamicSMS = styleMode === 'dynamic_sms';
    const isLongSMS = styleMode === 'long_sms';

    // ✨ DEEP PROMPT ENCODER — tier-aware photo example counts + depth menus.
    // Absent guidance = the exact legacy example strings (deep-OFF is byte-identical).
    // ✨ v2.7.62 OOB-PHOTO PRIMARY (group Phase 1b): armed hosts swap the in-band
    // authoring example for a trigger-only one — the camera desk owns the tags, so the
    // exemplar must not teach tag structure at all (CARGO LAW: tier counts ride the
    // OOB photoTags ask's guidance slots instead of the KV-cached prefix).
    const oobPhotoContract = photoContractMode === 'oob';
    const g = photoGuidance || { outfit: '1-3', pose: '1-4', env: '1-3', outfitMenu: '', poseMenu: '', envMenu: '' };
    const groupPhotoExample = oobPhotoContract
        ? `<!-- If sending photo: <send_image>true</send_image> — the system's camera desk authors the photo; do NOT write <image_prompt> tags yourself -->`
        : `<!-- If sending photo: <send_image>true</send_image><image_prompt><outfit>${g.outfit} clothing tags${g.outfitMenu}</outfit><pose_and_expression>${g.pose} pose/action tags${g.poseMenu}</pose_and_expression><environment>${g.env} setting tags${g.envMenu}</environment></image_prompt> -->`;

    // 1. SYSTEM PROMPT STYLE RULE (Rule #1 in sysPrompt)
    let groupStyleRule = "";
    if (isDynamicSMS) {
        groupStyleRule = `1. SMS_STYLE (DYNAMIC / SHORT): Casual, snappy texting.
- LENGTH: Very short replies (1-2 sentences maximum, strictly under 25 words total per message) in a SINGLE TEXT BLOCK. Strict single-message bubble.
- RESTRICTIONS: Absolutely NO paragraphs, NO line breaks, NO asterisks, and NO roleplay actions/narration. You MUST use proper punctuation (.,?!). Capitalization does not matter.
- FORMAT OVERRIDE: If previous messages in the chat history contain roleplay asterisks, narration, or long text, you MUST IGNORE that previous formatting completely! Output ONLY short, clean text bubbles.`;
    } else if (isLongSMS) {
        groupStyleRule = `1. SMS_STYLE (LONG): Casual texting with fuller, descriptive detail.
- LENGTH: Longer SMS replies (multiple sentences permitted) in a SINGLE COHESIVE TEXT BLOCK. Keep it as one text bubble—DO NOT split or section into multiple paragraphs.
- RESTRICTIONS: Absolutely NO multiple paragraphs, NO line breaks, NO asterisks, and NO roleplay actions/narration. You MUST use proper punctuation (.,?!). Capitalization does not matter.
- FORMAT OVERRIDE: Disregard any roleplay asterisks or multi-paragraph sectioning from previous messages. Output ONLY a single cohesive text block.`;
    } else if (isDynamicRP) {
        groupStyleRule = `1. ROLEPLAY_STYLE (DYNAMIC): ${getNarrationStyleLabel(narrationPerson)} fast-paced roleplay in a SINGLE COMPACT PARAGRAPH.
- LENGTH: VERY SHORT (Strictly 1-2 short sentences maximum, strictly under 30 words total per message). Fast-paced group flow.
- STRUCTURE: Combine *brief action* and spoken dialogue in the SAME single paragraph (e.g. *smiles softly and waves* Hey there, good to see you!). ${getNarrationAsteriskRule(narrationPerson)} DO NOT use quotation marks for speech.
- RESTRICTIONS: Absolutely NO multi-paragraph responses, NO blank lines, NO separate paragraphs, and NO lengthy narration. Keep it snappy so the group conversation moves quickly!
- FORMAT OVERRIDE: If previous messages in the chat history contain long, multi-paragraph, or essay-style roleplay, you MUST IGNORE their formatting completely! Do not copy previous message lengths. Strictly generate short, single-paragraph replies (1-2 sentences max).`;
    } else {
        // long_rp
        groupStyleRule = `1. ROLEPLAY_STYLE (LONG RP): ${getNarrationStyleLabel(narrationPerson)} immersive roleplay with rich scene depth, physical mannerisms, and spoken dialogue. ${getNarrationAsteriskRule(narrationPerson)} DO NOT use quotation marks for speech.
[MANDATORY MULTI-PARAGRAPH FORMATTING EXCEPTION]: RP Long is the ONLY mode that allows and enforces multi-paragraph formatting! Each character's <message> MUST be structured into 2 or more distinct paragraphs separated by a blank line (double line break / Enter twice) to make reading effortless:
- Paragraph 1: Atmospheric narration, scene setting, and initial physical actions (*inside asterisks*).
- Paragraph 2+: A natural roleplay mixture of spoken dialogue and physical interactions/reactions (*inside asterisks*), divided into clean, readable paragraphs.
- NEVER output a single continuous wall of text or single-spaced block! Separate distinct paragraphs with an empty line. Punctuate cleanly (.,?!).
- FORMAT OVERRIDE: Even if previous messages in the chat history were short SMS texts or 1-sentence dynamic RP, you MUST IGNORE that short formatting and expand into full, rich multi-paragraph roleplay!`;
    }

    // 2. XML FORMAT EXEMPLAR (Rule #9 in sysPrompt)
    let xmlFormatExample = "";
    if (isDynamicSMS) {
        xmlFormatExample = `<reply>
  <speaker>Exact Name</speaker>
  <message>
Hey! Are you guys ready yet?
  </message>
  ${groupPhotoExample}
  <send_image>false</send_image>
  <image_prompt></image_prompt>
${meowFields}
</reply>
<reply>
  <speaker>Other Character</speaker>
  <message>
[Replying to Exact Name: "Hey! Are you guys ready yet?"] Almost done, give me five minutes!
  </message>
  <send_image>false</send_image>
  <image_prompt></image_prompt>
${meowFields}
</reply>`;
    } else if (isLongSMS) {
        xmlFormatExample = `<reply>
  <speaker>Exact Name</speaker>
  <message>
Yeah I just got back from the store with the supplies. Traffic was pretty terrible on the bridge but I managed to grab everything on our list so we should be completely ready for tonight.
  </message>
  ${groupPhotoExample}
  <send_image>false</send_image>
  <image_prompt></image_prompt>
${meowFields}
</reply>
<reply>
  <speaker>Other Character</speaker>
  <message>
[Replying to Exact Name: "Yeah I just got back..."] That's awesome, thanks for grabbing all of that! Let me know once you've unpacked and we can start setting things up.
  </message>
  <send_image>false</send_image>
  <image_prompt></image_prompt>
${meowFields}
</reply>`;
    } else if (isDynamicRP) {
        xmlFormatExample = `<reply>
  <speaker>Exact Name</speaker>
  <message>
*Tilts head with a curious smile, glancing over.* What are you up to over there?
  </message>
  ${groupPhotoExample}
  <send_image>false</send_image>
  <image_prompt></image_prompt>
${meowFields}
</reply>
<reply>
  <speaker>Other Character</speaker>
  <message>
[Replying to Exact Name: "What are you up to over there?"] *Chuckles softly and shrugs.* Just sorting through my bag, nothing too crazy!
  </message>
  <send_image>false</send_image>
  <image_prompt></image_prompt>
${meowFields}
</reply>`;
    } else {
        // long_rp
        xmlFormatExample = `<reply>
  <speaker>Exact Name</speaker>
  <message>
*Detailed physical actions, environment description, and body language setting the scene.*

Spoken dialogue here, *leans against the wall thoughtfully,* continuing the conversation with natural banter.

Further spoken reactions *smiles faintly* as the scene develops.
  </message>
  ${groupPhotoExample}
  <send_image>false</send_image>
  <image_prompt></image_prompt>
${meowFields}
</reply>
<reply>
  <speaker>Other Character</speaker>
  <message>
[Replying to Exact Name: "Spoken dialogue here..."] *Character physical reaction, movement, or environmental interaction.*

Spoken dialogue continuing the banter and responding to the scene, *chuckles softly* with follow-up thoughts.
  </message>
  <send_image>false</send_image>
  <image_prompt></image_prompt>
${meowFields}
</reply>`;
    }

    // ✨ v2.7.62 OOB-PHOTO PRIMARY: armed hosts strip the schema-mandated empty
    // <image_prompt></image_prompt> line from ALL exemplar replies. That empty tag was
    // both the forgery vector (matched-empty ≠ absent) and a direct contradiction of
    // the camera-desk contract — dutiful models copied it onto every reply. Legacy
    // mode never runs this pass: the exemplars stay byte-identical to v2.7.61.
    if (oobPhotoContract) {
        xmlFormatExample = xmlFormatExample.replace(/^[ \t]*<image_prompt><\/image_prompt>\r?\n/gm, '');
    }

    // 3. RECENCY-WEIGHTED STYLE & FORMAT OVERRIDE DIRECTIVE (Appended to userPayload right before GENERATE)
    let formatOverrideDirective = "";
    if (isDynamicRP) {
        formatOverrideDirective = `\n[CRITICAL FORMATTING OVERRIDE - DYNAMIC RP ACTIVE]:
⚠️ MANDATORY FORMAT DIRECTIVE - IGNORE PREVIOUS FORMATTING!
- CHAT MODE: The group chat is strictly in DYNAMIC RP mode.
- IGNORE PAST MESSAGES: If previous messages in the chat log above contain long roleplay, multiple paragraphs, or essay-like descriptions (such as from RP Long), you MUST COMPLETELY IGNORE AND DISREGARD that formatting!
- DO NOT match or mirror the length, verbosity, or paragraph count of previous messages! That was an older format.
- STRICT RULES FOR YOUR NEW REPLIES:
  1. LENGTH LIMIT: MAXIMUM 1 TO 2 SHORT SENTENCES per character (strictly under 30 words total).
  2. SINGLE PARAGRAPH ONLY: Exactly ONE compact line combining *brief action* with spoken speech.
  3. ABSOLUTELY NO MULTI-PARAGRAPHS: Do NOT output blank lines, do NOT split into multiple paragraphs.
  4. NO QUOTATION MARKS: Spoken dialogue is bare text, NOT enclosed in quotation marks.
- REQUIRED FORMAT TEMPLATE:
  <message>*brief action* Spoken words here.</message>
- CRITICAL ANTI-PATTERN WARNING: Do NOT write long paragraphs, do NOT write descriptive essays, and do NOT copy previous long messages. Write ONLY 1-2 short sentences!`;
    } else if (isDynamicSMS) {
        formatOverrideDirective = `\n[CRITICAL FORMATTING OVERRIDE - DYNAMIC SMS ACTIVE]:
⚠️ MANDATORY FORMAT DIRECTIVE - IGNORE PREVIOUS FORMATTING!
- CHAT MODE: The group chat is strictly in DYNAMIC SMS (SHORT) mode.
- IGNORE PAST MESSAGES: Disregard any roleplay asterisks (*...*), narration, or multiple paragraphs in the chat log above! The user has switched to texting.
- DO NOT match previous roleplay formatting or long messages!
- STRICT RULES FOR YOUR NEW REPLIES:
  1. LENGTH LIMIT: MAXIMUM 1 TO 2 SHORT SENTENCES per character (strictly under 25 words total).
  2. FORMAT: Pure single-bubble text message.
  3. RESTRICTIONS: Absolutely NO asterisks, NO actions, NO narration, NO blank lines.
- REQUIRED FORMAT TEMPLATE:
  <message>Hey, did you see the announcement?</message>`;
    } else if (isLongSMS) {
        formatOverrideDirective = `\n[CRITICAL FORMATTING OVERRIDE - LONG SMS ACTIVE]:
⚠️ MANDATORY FORMAT DIRECTIVE - IGNORE PREVIOUS FORMATTING!
- CHAT MODE: The group chat is strictly in LONG SMS mode.
- IGNORE PAST MESSAGES: Disregard any roleplay asterisks (*...*) or multi-paragraph formatting from the chat log above!
- STRICT RULES FOR YOUR NEW REPLIES:
  1. FORMAT: A single cohesive text block (multiple sentences allowed in one bubble).
  2. RESTRICTIONS: Absolutely NO asterisks, NO roleplay actions, NO blank lines, NO multiple paragraphs.
- REQUIRED FORMAT TEMPLATE:
  <message>I just got back and have everything prepared. Let me know when you are ready to get started.</message>`;
    } else {
        // long_rp
        formatOverrideDirective = `\n[CRITICAL FORMATTING OVERRIDE - RP LONG ACTIVE]:
⚠️ MANDATORY FORMAT DIRECTIVE - IGNORE PREVIOUS FORMATTING!
- CHAT MODE: The group chat is strictly in RP LONG (MULTI-PARAGRAPH) mode.
- IGNORE PAST MESSAGES: If previous messages in the chat log were short single-line texts or brief dynamic banter, DO NOT copy that brevity! You MUST expand into detailed roleplay.
- STRICT RULES FOR YOUR NEW REPLIES:
  1. FORMAT: MULTI-PARAGRAPH (The ONLY mode with multiple paragraphs!). Every character's <message> MUST contain 2 or more distinct paragraphs separated by a blank line (\\n\\n).
  2. PARAGRAPH 1: Atmospheric narration, scene setting, and physical actions inside *asterisks*.
  3. PARAGRAPH 2+: Spoken dialogue mixed with inline physical reactions.
  4. PROHIBITED: NEVER output a single continuous wall of text or single-spaced block!`;
    }

    // 4. HISTORY CONTENT SANITIZER (Normalizes previous messages in combinedHistory)
    const cleanHistoryContent = (rawContent = '') => {
        let text = (rawContent || '').replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
        if (isLongRP) {
            // Keep newlines intact so RP Long retains multi-paragraph context
            return text;
        } else if (isSMS) {
            // SMS modes: Flatten newlines and strip asterisks
            return text.replace(/[\r\n]+/g, ' ').replace(/\*[^*]*\*/g, '').replace(/[ \t]{2,}/g, ' ').trim();
        } else {
            // Dynamic RP: Flatten newlines into single spaces so past multi-paragraphs don't present blank-line templates
            return text.replace(/[\r\n]+/g, ' ').replace(/[ \t]{2,}/g, ' ').trim();
        }
    };

    const banterCount = banterCountOverride || (isLong ? "2-4" : "3-6");

    return {
        isSMS,
        isLong,
        isLongRP,
        isDynamicRP,
        isDynamicSMS,
        isLongSMS,
        groupStyleRule,
        xmlFormatExample,
        formatOverrideDirective,
        cleanHistoryContent,
        banterCount
    };
}

/**
 * ✨ MIKA'S NAKED DANBOORU-LINE SHREDDER ✨
 * Small local models frequently skip the <image_prompt> wrapper and just append a bare,
 * comma-separated Danbooru tag line ("selfie, making pouty face, cheek_brushing_shoulder, sleepy_eyes").
 * Detects a trailing run of tag-shaped lines and vaporizes the whole block.
 * Conservative by design: prose with sentence punctuation, capitalization or emoji is never touched.
 */
export function scrubNakedTagLines(text) {
    if (!text || text.indexOf(',') === -1) return text;
    const isStrictTag = /^[a-z0-9]+(?:_[a-z0-9]+)+$/;
    const isTagShapedLine = (line) => {
        const t = line.trim();
        if (!t || t.length > 160) return false;
        if (/^(?:image\s*prompt|tags?|prompt)\s*[:\-]/i.test(t)) return true;
        if (/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u.test(t)) return false;
        if (/[.!?"'()[\]{}]/.test(t.replace(/_/g, ''))) return false;
        return t === t.toLowerCase();
    };
    const isNakedTagBlock = (blockText) => {
        const segs = blockText.split(',').map(s => s.trim()).filter(Boolean);
        if (segs.length < 2) return false;
        if (/^(?:image\s*prompt|tags?|prompt)\s*[:\-]/i.test(blockText)) return true;
        if (segs.some(s => isStrictTag.test(s)) && segs.length >= 3) return true;
        if (/^selfie\b/i.test(blockText) && segs.some(s => s.split(/\s+/).length >= 2 || isStrictTag.test(s))) return true;
        return false;
    };
    const lines = text.split('\n');
    let start = lines.length;
    while (start > 0 && (lines.length - start) < 4 && isTagShapedLine(lines[start - 1])) start--;
    if (start >= lines.length) return text;
    const block = lines.slice(start).join(' ').replace(/,\s*$/, '');
    if (isNakedTagBlock(block)) return lines.slice(0, start).join('\n').replace(/[ \t]+$/, '');
    return text;
}

/**
 * Sanitizes and formats LLM output messages before insertion into the playback queue.
 */
export function sanitizeGroupMessageContent(rawContent, styleMode) {
    if (!rawContent) return "";
    let content = rawContent.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');

    // Scrub image prompts and rogue XML tags before formatting (attribute-tolerant + alias wrappers)
    const mikaImgNames = 'image_prompt|image-prompt|photo_prompt|image_tags|image_url|image|pic|img|photo';
    content = content.replace(new RegExp(`<(?:${mikaImgNames})\\b[^>]*>[\\s\\S]*?(?:<\\/(?:${mikaImgNames})\\s*>|$)`, 'gi'), '');
    content = content.replace(/<photo_request\b[^>]*>[\s\S]*?(?:<\/photo_request\s*>|$)/gi, '');
    content = content.replace(/<image_request\b[^>]*>[\s\S]*?(?:<\/image_request\s*>|$)/gi, '');
    content = content.replace(/<outfit\b[^>]*>[\s\S]*?(?:<\/outfit\s*>|$)/gi, '');
    content = content.replace(/<pose_and_expression\b[^>]*>[\s\S]*?(?:<\/pose_and_expression\s*>|$)/gi, '');
    content = content.replace(/<environment\b[^>]*>[\s\S]*?(?:<\/environment\s*>|$)/gi, '');
    content = content.replace(/<\/?(?!3\b)[a-zA-Z0-9_]+(?:\s+[^>]*)?>/gi, '');
    // ✨ MIKA'S BRACKET DIRECTIVE DECODER ✨ — [Memory: ...]/[Location: ...]/bold/line hallucinations
    // are deciphered and stripped from the visible bubble (group parity with the 1-on-1 commits).
    content = extractBracketDirectives(content).clean;
    // ✨ MIKA'S NAKED DANBOORU-LINE SHREDDER ✨ — bare unwrapped tag lines from drifting models
    content = scrubNakedTagLines(content);

    if (styleMode === 'long_rp') {
        // RP Long Exception: Section actions and dialogue into clean double-spaced paragraphs
        return sectionRpLongContent(content);
    } else if (styleMode === 'long_sms') {
        // Long SMS: Single cohesive text block. Flatten line breaks and remove rogue asterisks
        return content.replace(/[\r\n]+/g, ' ').replace(/\*[^*]*\*/g, '').replace(/[ \t]{2,}/g, ' ').trim();
    } else if (styleMode === 'dynamic_rp') {
        // Dynamic RP: Single compact paragraph. Flatten rogue newlines so action and speech stay together in one paragraph
        let clean = content.replace(/[\r\n]+/g, ' ').replace(/[ \t]{2,}/g, ' ').trim();
        // Remove accidental wrapping quotes if the model mimicked quote-wrapped dialogue
        clean = clean.replace(/^"([^"]+)"$/, '$1').trim();
        return clean;
    } else {
        // Dynamic SMS: Snappy single-bubble chatter. Flatten newlines and strip asterisks
        return content.replace(/[\r\n]+/g, ' ').replace(/\*[^*]*\*/g, '').replace(/[ \t]{2,}/g, ' ').trim();
    }
}
