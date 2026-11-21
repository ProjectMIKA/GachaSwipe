// ✨ M.I.K.A. NARRATION PERSON ENGINE (v2.5.50) ✨
// Community request (Gu◎Changge): let users pick the voice of *asterisk* roleplay actions —
// FIRST person ("I smirk and lean closer") or THIRD person ("Neya smirks and leans closer"),
// narrated as if an external storyteller (the gacha swipe narrator) describes the scene.
// Spoken dialogue ALWAYS stays in the character's natural first-person voice; only the
// *asterisk* narration swaps person. Single source of truth for every RP format directive
// (1-on-1 main builder, sparks engine, card first-message, group styles, dream reactions)
// so the wording can never drift apart between prompt builders again.

export const RP_NARRATION_FIRST = 'first';
export const RP_NARRATION_THIRD = 'third';

const isThird = (person) => person === RP_NARRATION_THIRD;

// ✨ [STYLE DIRECTIVE: ...] title + mode-card label ✨
export function getNarrationPersonTitle(person = RP_NARRATION_FIRST) {
    return isThird(person) ? 'THIRD-PERSON NARRATOR ROLEPLAY MODE' : 'FIRST-PERSON ROLEPLAY MODE';
}

// ✨ Scene/persona intro line ("You are X, in an interactive ... roleplay scene with Y") ✨
export function getNarrationSceneLine(person = RP_NARRATION_FIRST, speakerName = '', activeUserName = '') {
    const name = speakerName || 'the character';
    const user = activeUserName || 'the user';
    return isThird(person)
        ? `You are ${name}, in an interactive roleplay scene with ${user}, where *asterisk* actions are narrated in third person by an external storyteller.`
        : `You are ${name}, in an interactive first-person roleplay scene with ${user}.`;
}

// ✨ Short style lead for group style rules ("First-person fast-paced roleplay...") ✨
export function getNarrationStyleLabel(person = RP_NARRATION_FIRST) {
    return isThird(person) ? 'Third-person narrator' : 'First-person';
}

// ✨ The *asterisk* sentence used by group style rules ✨
export function getNarrationAsteriskRule(person = RP_NARRATION_FIRST) {
    return isThird(person)
        ? 'Use *asterisks* for actions and descriptions written in third person as an external narrator — refer to the acting character by their own name, never "I" inside asterisks. Anything NOT inside *asterisks* is that character\'s spoken dialogue (which stays first-person).'
        : 'Use *asterisks* for actions and descriptions. Anything NOT inside *asterisks* is spoken dialogue.';
}

// ✨ Per-context *asterisk* format clause ✨
// contexts:
//  - 'chat'           1-on-1 sparks engine rule 2 (full ROLEPLAY FORMAT sentence)
//  - 'chat_directive' the "- Format:" line inside the main builder's [STYLE DIRECTIVE: ...]
//  - 'first_msg'      card generation immersive first-message rule
//  - 'first_msg_short' card generation rp_short first-message rule
//  - 'dream'          dream wake-up reaction rule 3 (long variant wording)
//  - 'dream_short'    dream wake-up reaction rule 3 (short variant wording)
export function getNarrationFormatClause(person, speakerName, context = 'chat') {
    const p = person || RP_NARRATION_FIRST;
    const name = speakerName || 'the character';
    switch (context) {
        case 'chat':
            return isThird(p)
                ? `Write *asterisk* actions in third person as an external narrator describing yourself by name (e.g. *${name} leans closer*), never "I" inside asterisks. Bare text without asterisks is spoken dialogue (it keeps your natural first-person voice). DO NOT use quotation marks for speech.`
                : `Speak in first-person. Use *asterisks* for physical actions, expressions, and body language. Bare text without asterisks is spoken dialogue. DO NOT use quotation marks for speech.`;
        case 'chat_directive':
            return isThird(p)
                ? `Third-person narrator roleplay. Write *asterisk* actions in THIRD PERSON as if an external narrator is describing the scene, referring to yourself by name (e.g. *${name} crosses her arms and smirks*), never as "I". Spoken dialogue is bare text without quotation marks.`
                : `First-person roleplay. Spoken dialogue is bare text without quotation marks. Physical actions and expressions MUST be enclosed in *asterisks*.`;
        case 'first_msg':
            return isThird(p)
                ? `[FIRST_MSG: Third-person narrator roleplay. *Asterisk* actions are written in THIRD PERSON as an external narrator describing the scene, referring to the character by name (e.g. *${name} waves shyly*), never as "I". Spoken dialogue stays natural first-person speech. NO quotes for speech.]`
                : `[FIRST_MSG: 1st-person immersive roleplay. Use *asterisks* for actions and descriptions. NO quotes for speech.]`;
        case 'first_msg_short':
            return isThird(p)
                ? `[FIRST_MSG: Third-person narrator roleplay in a single, snappy paragraph (1-2 sentences). *Asterisk* actions are written in third person by name (e.g. *${name} waves*); spoken dialogue stays first-person. NO quotes for speech. Absolutely NO multi-paragraph essays.]`
                : `[FIRST_MSG: 1st-person roleplay in a single, snappy paragraph (1-2 sentences). Combine *brief action* and spoken dialogue. NO quotes for speech. Absolutely NO multi-paragraph essays.]`;
        case 'dream':
            return isThird(p)
                ? `3. Use *asterisks* for physical actions written in third person as an external narrator (e.g. *${name} hugs you tightly*), bare text without quotation marks for spoken dialogue.`
                : `3. Use *asterisks* for physical actions and expressions, bare text without quotation marks for spoken dialogue.`;
        case 'dream_short':
            return isThird(p)
                ? `3. Use *asterisks* for physical actions written in third person as an external narrator (e.g. *${name} hugs you tightly*), bare text without quotes for dialogue.`
                : `3. Use *asterisks* for physical actions and expressions, bare text without quotes for dialogue.`;
        default:
            return getNarrationFormatClause(p, speakerName, 'chat');
    }
}