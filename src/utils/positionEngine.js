// ✨ M.I.K.A. POV POSITION ENGINE (v2.6.28 — dual-engine cascade + env-reserved shield) ✨
// Context-aware intimate-scene director for first-person POV photo prompts.
// Doctrine:
// 1. LLM authors INTENT (XML <position_directive>); the APP owns tag math (this registry).
// 2. Fail-closed: unknown intent / junk XML / SFW mode / toggle OFF = null = legacy path.
// 3. KV-cache safe: pure JS, zero LLM calls here. The OOB judge lives in oobChannel.js.
// 4. Identity lock: bundles contain ZERO hair/eye/body tags by construction.
// 5. Expandable: adding a position = appending ONE object to POSITIONS. Nothing else touched.
// 6. Canonical danbooru spellings verified live (Oct 2026):
//    - `facesitting` is ALIASED -> emit `sitting on face` (never `facesitting`).
//    - `doggystyle` implicates `sex from behind`; `cowgirl position` implicates `straddling`;
//      `reverse cowgirl position` implicates `straddling`; `upright straddle` implicates
//      `straddling`; `squatting cowgirl position` implicates `squatting`;
//      `standing doggystyle` implicates `sex from behind` + `standing sex`.
//    - `fellatio`/`cunnilingus` implicate `oral`; `paizuri` aliases tit_fuck/titfuck/titjob;
//      `handjob` aliases hand_job/tekoki; `bent over` = standing ~90deg (not all fours).
//    - Camera family: pov hands / pov legs (extremity fragments — KEPT) plus the camera
//      set from below / from above / from behind / view from behind / directly above /
//      eye level (mutually exclusive — first wins).
//    - v2.6.28: the generic `pov` + `first person view` pair is BANNED from bundles —
//      ~5 CLIP tokens × ~70 bundles for information the camera tags already carry.
// 7. MASTER-TUNED VOCABULARY (v2.6.25, POV-pair evicted v2.6.28): every bundle follows
//    the hand-tested recipe `[pussy], <position core>, [<sex verb>], <camera>, <gaze>`
//    with sex verbs `dick insertion` (frontal mounts) / `sex from behind` (rear entry) /
//    `anal`. NEVER `vaginal`, NEVER `pov crotch` on position mounts. `sweaty` is CONTEXT-
//    gated: pen tier only (mid-act intimacy justifies it). Expression is JUDGE-driven via
//    <expression> → POSITION_EXPRESSION_DICT, never baked — a shy wallflower must not be
//    forced smug.
// 8. THE ENGINE OWNS THE POSE SEGMENT (v2.6.26 — the D1 killer-bug fix): the old
//    defer-to-LLM gate (`hasExistingPositionTag`) matched pose words the character's own
//    <image_prompt> ALWAYS carries in explicit scenes, so the engine deferred on exactly
//    the photos it targets — silently, every time. When a directive fires, LLM-authored
//    pose/camera/gaze/expression tags are REPLACED in their exact list slot by the bundle
//    (see injectPositionIntoTagList). Outfit and scene segments are never touched.
// 9. DUAL-ENGINE CASCADE (v2.6.27): Tier 0 — her AUTHORED <image_prompt> tags are the
//    primary intent signal (tag-space conjunction triggers: `close up` + `directly above`
//    ⇒ sitting_on_face, the pure-composition form Master hand-tested which carries NO
//    position word at all). Tier 1 — prose regex over recent chat. Tier 2 — the OOB
//    judge, demoted to ENHANCER: when it is absent (host < 7.6, timeout, cooldown, junk
//    XML) the sync resolver still delivers a verdict at consume time. Zero added prompt
//    context at any tier — the intelligence was already paid for.
// 10. THE SCENE KEEPER (v2.6.28): a fired bundle pays RENT to the scene — applyEnvShield
//     reserves guaranteed seats for M.E.O.W. location + time-of-day lighting (cap 3) and
//     caps the protected bundle+anatomy at 8; unprotected tags (outfit, her env) fill the
//     remainder and die FIRST. With nothing protected the shield is byte-identical to the
//     legacy cap-10 filter — regular photos never drift.
import { sanitizeLlmImageTags } from './hallucinationScrubber.js';
// --- Pose dictionary: intent -> token-optimized danbooru bundle (<=10 tags) ---
// `_base` = pre-act composition (dry); `_pen` = explicit tier (+ insertion verb + sweaty).
// v2.6.28: NO generic `pov` / `first person view` — the camera tags carry the framing.
export const POSE_DICTIONARY = {
    cowgirl_base: 'pussy, cowgirl position, straddling, from below, looking at viewer',
    cowgirl_pen: 'pussy, cowgirl position, straddling, dick insertion, from below, looking at viewer, sweaty',
    reverse_cowgirl_base: 'pussy, reverse cowgirl position, rear view, looking back',
    reverse_cowgirl_pen: 'pussy, reverse cowgirl position, rear view, dick insertion, from below, looking back, sweaty',
    squatting_cowgirl_base: 'pussy, squatting cowgirl position, squatting, from below, looking at viewer',
    squatting_cowgirl_pen: 'pussy, squatting cowgirl position, squatting, dick insertion, from below, looking at viewer, sweaty',
    reverse_squatting_cowgirl_base: 'pussy, reverse squatting cowgirl position, squatting, rear view, looking back',
    reverse_squatting_cowgirl_pen: 'pussy, reverse squatting cowgirl position, squatting, sex from behind, view from behind, looking back, sweaty',
    upright_straddle_base: 'pussy, upright straddle, embracing, from below, looking at viewer',
    upright_straddle_pen: 'pussy, upright straddle, embracing, dick insertion, from below, sweaty',
    reverse_upright_straddle_base: 'pussy, reverse upright straddle, rear view, looking back',
    reverse_upright_straddle_pen: 'pussy, reverse upright straddle, sex from behind, view from behind, looking back, sweaty',
    amazon_position_base: 'pussy, amazon position, sitting on top, from below, looking at viewer',
    amazon_position_pen: 'pussy, amazon position, dick insertion, from below, looking at viewer, sweaty',
    sitting_on_face_base: 'pussy, close up, directly above, looking down',
    sitting_on_face_pen: 'pussy, close up, directly above, looking down, sweaty',
    lap_straddle_base: 'pussy, sitting on lap, straddling, eye level, looking at viewer',
    lap_straddle_pen: 'pussy, sitting on lap, straddling, dick insertion, eye level, sweaty',
    missionary_base: 'pussy, missionary, on back, spread legs, from above',
    missionary_pen: 'pussy, missionary, dick insertion, on back, spread legs, from above, sweaty',
    mating_press_base: 'pussy, mating press, on back, legs up, from above',
    mating_press_pen: 'pussy, mating press, dick insertion, legs over head, on back, from above, sweaty',
    anvil_position_base: 'pussy, anvil position, on back, legs up, from above',
    anvil_position_pen: 'pussy, anvil position, dick insertion, legs up, on back, from above, sweaty',
    folded_piledriver_base: 'pussy, folded, knees to chest, on back, from above',
    folded_piledriver_pen: 'pussy, piledriver, dick insertion, legs over head, on back, from above, sweaty',
    legs_up_base: 'pussy, missionary, legs up, on back, from above',
    doggystyle_base: 'pussy, doggystyle, all fours, view from behind, looking back',
    doggystyle_pen: 'pussy, doggystyle, all fours, sex from behind, view from behind, looking back, sweaty',
    standing_doggystyle_base: 'pussy, standing doggystyle, bent over, view from behind, looking back',
    standing_doggystyle_pen: 'pussy, standing doggystyle, bent over, sex from behind, view from behind, looking back, sweaty',
    bent_over_base: 'bent over, rear view, looking back',
    prone_bone_base: 'pussy, prone bone, on stomach, view from behind',
    prone_bone_pen: 'pussy, prone bone, sex from behind, on stomach, view from behind, sweaty',
    top_down_bottom_up_base: 'pussy, top-down bottom-up, all fours, view from behind',
    presenting_base: 'pussy, presenting, all fours, view from behind, looking back',
    standing_sex_base: 'standing sex, pinned to wall, eye level',
    standing_sex_pen: 'standing sex, dick insertion, pinned to wall, eye level, sweaty',
    standing_missionary_base: 'standing missionary, eye level, looking at viewer',
    standing_missionary_pen: 'standing missionary, dick insertion, eye level, sweaty',
    suspended_congress_base: 'suspended congress, straddling, eye level',
    suspended_congress_pen: 'suspended congress, straddling, dick insertion, eye level, sweaty',
    reverse_suspended_congress_base: 'reverse suspended congress, view from behind',
    reverse_suspended_congress_pen: 'reverse suspended congress, sex from behind, view from behind, sweaty',
    carried_base: 'carrying, straddling, eye level',
    fellatio_base: 'fellatio, from above, looking up at viewer',
    deepthroat_pen: 'deepthroat, fellatio, from above, looking up at viewer, sweaty',
    irrumatio_pen: 'irrumatio, fellatio, from above, looking up at viewer, sweaty',
    cunnilingus_base: 'cunnilingus, on back, from above, looking down',
    paizuri_base: 'paizuri, from above, looking up at viewer',
    sixty_nine_base: '69, from below, looking up',
    handjob_base: 'pov hands, handjob, close up, from above',
    fingering_base: 'pov hands, fingering, spread legs, from above',
    footjob_base: 'footjob, barefoot, from above',
    thighjob_base: 'thighjob, from above',
    chest_grab_base: 'pov hands, grabbing breasts, close up, from above',
    spooning_base: 'spooning, lying on side, view from behind',
    spooning_pen: 'pussy, spooning, sex from behind, lying on side, view from behind, sweaty',
    facing_cuddle_base: 'lying on side, embracing, eye level, looking at viewer',
    leg_lock_side_base: 'lying on side, leg lock, eye level',
    anal_doggy_pen: 'doggystyle, anal, all fours, view from behind, looking back, sweaty',
    anal_cowgirl_pen: 'cowgirl position, anal, straddling, from below, looking at viewer, sweaty',
    anal_missionary_pen: 'missionary, anal, on back, from above, sweaty',
    anal_standing_pen: 'standing sex, anal, pinned to wall, eye level, sweaty',
    cleavage_lean_base: 'leaning forward, cleavage, looking at viewer, eye level',
    knees_up_base: 'knees up, looking at viewer, eye level',
    skirt_lift_base: 'pov hands, skirt lift, looking at viewer, eye level',
    butt_view_base: 'ass, bent over, view from behind, looking back',
    crossed_legs_tease_base: 'crossed legs, looking at viewer, eye level',
    embrace_front_base: 'embracing, eye level, looking at viewer',
    kiss_imminent_base: 'almost kissing, eye level, closed eyes',
    lap_pillow_base: 'pov legs, lap pillow, from above, looking down',
};

// --- State dictionary (exposure tiers) ---
export const POSITION_STATE_DICT = {
    nude_full: 'nude, completely nude',
    nude_top: 'no bra, shirt lift',
    nude_bottom: 'panties aside, lower body',
    underwear: 'underwear, bra',
    disheveled: 'shirt lift, panties aside',
    wet: 'wet clothes, wet hair',
};

// --- Gaze dictionary (1-2 tags max) ---
export const POSITION_GAZE_DICT = {
    eye_contact: 'looking at viewer',
    looking_back: 'looking back',
    looking_up: 'looking up at viewer',
    looking_down: 'looking down',
    shy: 'looking away, blush',
    closed: 'eyes closed',
    intense: 'looking at viewer, blush',
};

// --- Expression dictionary (v2.6.25 — judge-driven, character-archetype aware) ---
// Master's ruling: expression ownership belongs to the JUDGE (it sees her persona hint),
// never baked into position bundles — a shy wallflower must not be forced smug.
// Fail-closed per-field: an unknown/absent expression never kills the directive; the
// bundle just ships without expression tags. `ahegao` is pen-tier judge etiquette.
export const POSITION_EXPRESSION_DICT = {
    smug: 'smug smirk',
    smile: 'smile',
    grin: 'grin',
    embarrassed: 'embarrassed, blush',
    dazed: 'half-closed eyes, open mouth',
    panting: 'panting',
    ahegao: 'ahegao',
};



// --- Expandable registry: ONE object per position. Keywords drive the sync gate. ---
// allowedPairings: MF (hetero default), FF (girl on girl), MM, FUTA, SOLO.
// minExplicit: 0 = SFW-safe tease/intimate, 2 = NUDE/EXTREME only, 3 = EXTREME only.
// v2.6.27 tag-space conjunctions: keywords also run over her AUTHORED tag strings, so
// positions whose Master-tested form carries no position word (facesitting = pure
// composition `pussy, close up, directly above, looking down`) use tight two-tag
// conjunction regexes (bounded 80-char gap) — high precision, SFW lookalikes stay null.
export const POSITIONS = [
    { id: 'sitting_on_face', dictBase: 'sitting_on_face_base', dictPen: 'sitting_on_face_pen', minExplicit: 2, allowedPairings: ['MF', 'FF', 'FUTA', 'SOLO'], keywords: [/facesit/i, /\bface\s*sitting\b/i, /(?:sitting|sits?)\s+(?:on|upon)\s+(?:(?:your|my|his|her|their)\s+)?face/i, /ride\s+(?:(?:your|my|his|her|their)\s+)?face/i, /smother/i, /\bsitting\s+on\s+face\b/i, /\bdirectly\s+above\b[\s\S]{0,80}\b(?:close\s*up|pussy|looking\s+down)\b/i, /\b(?:close\s*up|pussy|looking\s+down)\b[\s\S]{0,80}\bdirectly\s+above\b/i] },
    { id: 'reverse_squatting_cowgirl', dictBase: 'reverse_squatting_cowgirl_base', dictPen: 'reverse_squatting_cowgirl_pen', minExplicit: 2, allowedPairings: ['MF', 'FUTA'], keywords: [/reverse\s+squat(?:ting)?\s+cowgirl/i] },
    { id: 'squatting_cowgirl', dictBase: 'squatting_cowgirl_base', dictPen: 'squatting_cowgirl_pen', minExplicit: 2, allowedPairings: ['MF', 'FUTA'], keywords: [/squat(?:ting)?\s+cowgirl/i, /spider\s+cowgirl/i, /squat\s+on\s+(?:me|you|it)/i, /m\s*legs?\s+.*ride/i] },
    { id: 'reverse_cowgirl', dictBase: 'reverse_cowgirl_base', dictPen: 'reverse_cowgirl_pen', minExplicit: 2, allowedPairings: ['MF', 'FUTA'], keywords: [/reverse\s+cowgirl/i, /turn\s+around\s+and\s+ride/i, /back\s+to\s+me.*ride/i] },
    { id: 'cowgirl', dictBase: 'cowgirl_base', dictPen: 'cowgirl_pen', minExplicit: 2, allowedPairings: ['MF', 'FUTA'], keywords: [/cowgirl/i, /ride\s+(?:me|you|him|her|them)/i, /straddl/i, /on\s+top\s+of\s+me/i, /bounce\s+on/i, /riding\s+(?:on\s+)?(?:me|you|him|her|them)?/i] },
    { id: 'reverse_upright_straddle', dictBase: 'reverse_upright_straddle_base', dictPen: 'reverse_upright_straddle_pen', minExplicit: 2, allowedPairings: ['MF', 'FUTA'], keywords: [/reverse\s+upright\s+straddle/i] },
    { id: 'upright_straddle', dictBase: 'upright_straddle_base', dictPen: 'upright_straddle_pen', minExplicit: 2, allowedPairings: ['MF', 'FF', 'FUTA'], keywords: [/upright\s+straddle/i, /lotus\s+blossom/i, /lotus\s+position/i, /lap\s+straddle/i, /sit\s+on\s+my\s+lap/i, /face\s*to\s*face.*straddle/i] },
    { id: 'amazon_position', dictBase: 'amazon_position_base', dictPen: 'amazon_position_pen', minExplicit: 2, allowedPairings: ['MF', 'FF', 'FUTA'], keywords: [/amazon\s+position/i, /reverse\s+piledriver/i, /femdom\s+ride/i] },
    { id: 'standing_missionary', dictBase: 'standing_missionary_base', dictPen: 'standing_missionary_pen', minExplicit: 2, allowedPairings: ['MF', 'FUTA'], keywords: [/standing\s+missionary/i] },
    { id: 'missionary', dictBase: 'missionary_base', dictPen: 'missionary_pen', minExplicit: 2, allowedPairings: ['MF', 'FF', 'MM', 'FUTA'], keywords: [/missionary/i, /on\s+(?:your\s+)?back/i, /lie\s+back/i, /lay\s+back/i, /between\s+(?:your|my)\s+legs/i, /\bon\s+back\b/i] },
    { id: 'mating_press', dictBase: 'mating_press_base', dictPen: 'mating_press_pen', minExplicit: 2, allowedPairings: ['MF', 'FUTA'], keywords: [/mating\s+press/i, /breeding\s+press/i, /press\s+(?:you|her|him)\s+down/i, /hold\s+.*legs?\s+up/i, /legs\s+over\s+head/i] },
    { id: 'anvil_position', dictBase: 'anvil_position_base', dictPen: 'anvil_position_pen', minExplicit: 2, allowedPairings: ['MF', 'FUTA'], keywords: [/anvil/i, /anvil\s+position/i] },
    { id: 'folded_piledriver', dictBase: 'folded_piledriver_base', dictPen: 'folded_piledriver_pen', minExplicit: 2, allowedPairings: ['MF', 'FUTA'], keywords: [/piledriver/i, /folded/i, /knees\s+to\s+chest/i, /legs?\s+over\s+(?:head|shoulders)/i] },
    { id: 'standing_doggystyle', dictBase: 'standing_doggystyle_base', dictPen: 'standing_doggystyle_pen', minExplicit: 2, allowedPairings: ['MF', 'FUTA'], keywords: [/standing\s+doggy/i, /standing\s+doggystyle/i, /bent\s+over\s+(?:the\s+)?(?:desk|table|bed|couch|wall|counter)/i, /bend\s+over/i, /brace\s+against\s+the\s+wall/i] },
    { id: 'doggystyle', dictBase: 'doggystyle_base', dictPen: 'doggystyle_pen', minExplicit: 2, allowedPairings: ['MF', 'FF', 'MM', 'FUTA'], keywords: [/doggystyle/i, /doggy\s*style/i, /on\s+all\s+fours/i, /\ball\s+fours\b/i, /from\s+behind/i, /behind\s+me/i, /sex\s+from\s+behind/i] },
    { id: 'bent_over', dictBase: 'bent_over_base', dictPen: null, minExplicit: 1, allowedPairings: ['MF', 'FF', 'MM', 'FUTA', 'SOLO'], keywords: [/bent\s+over/i] },
    { id: 'prone_bone', dictBase: 'prone_bone_base', dictPen: 'prone_bone_pen', minExplicit: 2, allowedPairings: ['MF', 'FUTA'], keywords: [/prone\s*bone/i, /flat\s+on\s+(?:your|my)\s+stomach/i, /\bon\s+stomach\b/i] },
    { id: 'top_down_bottom_up', dictBase: 'top_down_bottom_up_base', dictPen: null, minExplicit: 2, allowedPairings: ['MF', 'FUTA'], keywords: [/top[\s-]*down\s+bottom[\s-]*up/i] },
    { id: 'presenting', dictBase: 'presenting_base', dictPen: null, minExplicit: 2, allowedPairings: ['MF', 'FF', 'FUTA', 'SOLO'], keywords: [/presenting/i, /present\s+(?:yourself|herself|himself)/i] },
];

POSITIONS.push(...[
    { id: 'reverse_suspended_congress', dictBase: 'reverse_suspended_congress_base', dictPen: 'reverse_suspended_congress_pen', minExplicit: 2, allowedPairings: ['MF', 'FUTA'], keywords: [/reverse\s+suspended/i, /full\s+nelson/i] },
    { id: 'suspended_congress', dictBase: 'suspended_congress_base', dictPen: 'suspended_congress_pen', minExplicit: 2, allowedPairings: ['MF', 'FUTA'], keywords: [/suspended\s+congress/i, /stand\s+and\s+carry/i, /lifted\s+.*midair/i] },
    { id: 'standing_sex', dictBase: 'standing_sex_base', dictPen: 'standing_sex_pen', minExplicit: 2, allowedPairings: ['MF', 'FF', 'MM', 'FUTA'], keywords: [/standing\s+sex/i, /pinned\s+to\s+the\s+wall/i, /against\s+the\s+wall/i, /lift\s+me\s+up/i, /carry\s+me/i] },
    { id: 'fellatio', dictBase: 'fellatio_base', dictPen: 'deepthroat_pen', minExplicit: 2, allowedPairings: ['MF', 'MM', 'FUTA'], keywords: [/blow\s*job/i, /fellatio/i, /suck\s+me/i, /deepthroat/i, /on\s+your\s+knees/i, /kneel\s+.*suck/i, /\boral\s+sex\b/i] },
    { id: 'cunnilingus', dictBase: 'cunnilingus_base', dictPen: null, minExplicit: 2, allowedPairings: ['MF', 'FF', 'FUTA'], keywords: [/cunnilingus/i, /eat\s+me\s+out/i, /lick\s+(?:me|my|your|her)/i, /pussy\s*lick/i, /between\s+my\s+thighs/i] },
    { id: 'paizuri', dictBase: 'paizuri_base', dictPen: null, minExplicit: 2, allowedPairings: ['MF', 'FUTA'], keywords: [/paizuri/i, /tit\s*(?:fuck|job)/i, /between\s+(?:your|her)\s+(?:breasts|tits|boobs)/i, /breast\s+smother/i] },
    { id: 'sixty_nine', dictBase: 'sixty_nine_base', dictPen: null, minExplicit: 2, allowedPairings: ['MF', 'FF', 'MM', 'FUTA'], keywords: [/\b69\b/, /sixty[\s-]*nine/i] },
    { id: 'handjob', dictBase: 'handjob_base', dictPen: null, minExplicit: 2, allowedPairings: ['MF', 'MM', 'FUTA'], keywords: [/hand\s*job/i, /handjob/i, /stroke\s+me/i, /jerk\s+me/i] },
    { id: 'fingering', dictBase: 'fingering_base', dictPen: null, minExplicit: 2, allowedPairings: ['MF', 'FF', 'FUTA'], keywords: [/fingering/i, /finger\s+(?:me|her|you)/i] },
    { id: 'spooning', dictBase: 'spooning_base', dictPen: 'spooning_pen', minExplicit: 1, allowedPairings: ['MF', 'FF', 'MM', 'FUTA'], keywords: [/spoon(?:ing)?/i, /cuddle\s+from\s+behind/i, /lying\s+on\s+(?:your|my)\s+side/i, /\blying\s+on\s+side\b/i] },
    { id: 'anal_doggy', dictBase: 'anal_doggy_pen', dictPen: 'anal_doggy_pen', minExplicit: 3, allowedPairings: ['MF', 'MM', 'FUTA'], keywords: [/anal\s+doggy/i, /anal\s+from\s+behind/i, /\banal\b.*(?:doggy|all\s+fours|from\s+behind)/i] },
    { id: 'cleavage_lean', dictBase: 'cleavage_lean_base', dictPen: null, minExplicit: 0, allowedPairings: ['MF', 'FF', 'MM', 'FUTA', 'SOLO'], keywords: [/lean\s+forward/i, /look\s+down\s+my\s+shirt/i] },
    { id: 'skirt_lift', dictBase: 'skirt_lift_base', dictPen: null, minExplicit: 0, allowedPairings: ['MF', 'FF', 'FUTA', 'SOLO'], keywords: [/skirt\s+lift/i, /lift\s+my\s+skirt/i, /upskirt/i, /panty\s*shot/i] },
    { id: 'embrace_front', dictBase: 'embrace_front_base', dictPen: null, minExplicit: 0, allowedPairings: ['MF', 'FF', 'MM', 'FUTA', 'SOLO'], keywords: [/hold\s+me/i, /embrace/i, /hug\s+me/i] },
    { id: 'lap_pillow', dictBase: 'lap_pillow_base', dictPen: null, minExplicit: 0, allowedPairings: ['MF', 'FF', 'MM', 'FUTA', 'SOLO'], keywords: [/lap\s+pillow/i, /head\s+in\s+.*lap/i, /rest\s+.*lap/i] },
]);

export const POSITION_ID_SET = new Set(POSITIONS.map((p) => p.id));
export const POSITION_FALLBACK_ID = 'missionary';

// --- ✨ v2.6.29 POSITION PACKS: themed packs merged into the active registry ✨ ---
// Packs arrive from App (settings state) already filtered to ENABLED. Each pack position is
// either a full inline def (forge / import / user-edited) or a `{ id }` reference to the
// static POSITIONS registry (builtin packs). Inline defs SHADOW the static registry for
// their id and BEAT refs regardless of pack order (an explicit authored copy refines the
// factory def — save-as-new never overwrites the built-in, it supersedes it). With no sync
// call (fresh boot before load, all tests) the active registry is every builtin — legacy
// behavior, zero drift.
const ACTIVE_PACKS = { synced: false, defs: new Map(), activeIds: new Set(), themeMap: new Map() };

// Weak-token filter: generic words never become theme/signature triggers (a pack themed
// 'time' must not fire on "dinner time"). Distinctive = 4+ chars + not on the stoplist.
const WEAK_TOKEN_RE = /^(?:the|a|an|and|or|of|in|on|at|to|for|with|from|by|my|your|his|her|me|you|him|them|up|down|out|play|time|position|positions|pose|poses|pack|style|theme|scene|sex|sexy|fun|new|custom|forged|variant|variants|variation|variations|love|make|let|get|got|big|small|soft|hard|deep|wild|hot)$/i;
function distinctiveTokens(text) {
    return String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 4 && !WEAK_TOKEN_RE.test(t));
}
// Signature bundle tags: the position-specific tags of a custom bundle (generic anatomy /
// camera / gaze / state words excluded) — they double as tag-space triggers.
const SIGNATURE_STOP_RE = /^(?:pov|pov hands|pov legs|pov crotch|first person view|pussy|vagina|penis|anus|nude|naked|completely nude|topless|bottomless|smile|blush|blushing|embarrassed|sweaty|ahegao|closed eyes|eyes closed|open mouth|parted lips|tongue out|looking at viewer|looking back|looking down|looking up|looking up at viewer|looking away|on back|on stomach|on side|all fours|kneeling|kneel|standing|sitting|lying|straddling|spread legs|leg lock|embracing|eye level|close up|close-up|from below|from above|from behind|view from behind|rear view|sex|anal)$/i;
function signatureBundleTags(bundle) {
    return String(bundle || '').split(',').map((t) => t.trim()).filter((t) => {
        if (t.length < 4 || SIGNATURE_STOP_RE.test(t)) return false;
        const words = t.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
        return words.length > 0 && !words.some((w) => WEAK_TOKEN_RE.test(w));
    });
}
// Plural-tolerant variant of a literal keyword: every word may carry an optional trailing
// 's' ("tentacles" matches "tentacle" and vice versa). Author regex snippets return null.
// Plural-tolerant variant of a literal keyword: every word may carry an optional
// trailing 's' ("tentacles" matches "tentacle" and vice versa), \b-anchored so a
// variant cannot fire inside larger words (lap ≠ laptop). Author regex snippets
// return null.
function pluralVariant(kw) {
    const s = String(kw || '').trim();
    if (!s || /[\\^$.*+?()[\]{}|]/.test(s)) return null;
    const words = s.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const lead = /^[\w]/.test(words[0]) ? '\\b' : '';
    const trail = /[\w]$/.test(words[words.length - 1]) ? '\\b' : '';
    const pattern = lead + words.map((w) => (/s$/i.test(w) ? w + '?' : w + 's?')).join('\\s+') + trail;
    try { return new RegExp(pattern, 'i'); } catch { return null; }
}

function escapeKeywordLiteral(kw) {
    // ✨ WORD-BOUNDARY HARDENING (v2.7.x audit fix): the escaped literal gains \b
    // anchors when it starts/ends with a word character — a forge keyword 'lap'
    // must never fire inside 'laptop' or 'collapse'. Metachar-anchored author
    // regexes pass through compileKeyword untouched (they own their boundaries).
    const body = String(kw || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+').trim();
    const lead = /^[\w]/.test(body) ? '\\b' : '';
    const trail = /[\w]$/.test(body) ? '\\b' : '';
    return lead + body + trail;
}

// Keywords authored as plain phrases are matched as escaped literals with flexible
// whitespace; author-provided regex snippets (metachars present) compile as-is — bad
// regexes fall back to the escaped literal instead of throwing.
function compileKeyword(kw) {
    const s = String(kw || '').trim();
    if (s.length < 2 || s.length > 64) return null;
    if (/[\\^$.*+?()[\]{}|]/.test(s)) {
        try { return new RegExp(s, 'i'); } catch { /* bad regex → escaped literal */ }
    }
    return new RegExp(escapeKeywordLiteral(s), 'i');
}

function normalizeInlinePosition(raw) {
    const id = String(raw?.id || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (!/^[a-z][a-z0-9_]{1,39}$/.test(id)) return null;
    const keywords = (Array.isArray(raw?.keywords) ? raw.keywords : []).map(compileKeyword).filter(Boolean);
    if (keywords.length === 0) return null;
    const tags = String(raw?.bundle || '').split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length < 2 || tags.length > 10) return null;
    const PAIRINGS = ['MF', 'FF', 'MM', 'FUTA', 'SOLO'];
    const allowedPairings = (Array.isArray(raw?.allowedPairings) ? raw.allowedPairings : Array.isArray(raw?.pairings) ? raw.pairings : ['MF'])
        .map((p) => String(p).toUpperCase()).filter((p) => PAIRINGS.includes(p));
    if (allowedPairings.length === 0) allowedPairings.push('MF');
    const minExplicit = Math.max(0, Math.min(3, parseInt(raw?.minExplicit, 10) || 0));
    return {
        id,
        name: String(raw?.name || id).trim().slice(0, 48) || id,
        keywords,
        bundle: tags.join(', '),
        allowedPairings,
        minExplicit,
        isCustom: true,
    };
}

// Called by App whenever the persisted packs / enabled flags change. Pass the ENABLED packs.
// Precedence: an INLINE def always beats a `{ id }` ref for the same position (an explicit
// authored copy refines the factory def, regardless of pack order); among competing inline
// defs the FIRST pack wins. Refs never block an inline def.
// ✨ v2.6.31 trigger enrichment: every custom def's keyword scan gains plural-tolerant
// variants + signature bundle tags, and each pack records its theme tokens for the
// stage-B fallback in detectPositionTrigger (theme word → pack's first position).
export function syncPositionPacks(packs) {
    const defs = new Map();
    const activeIds = new Set();
    const themeMap = new Map(); // packId -> { res: [theme token regexes], firstId }
    for (const pack of (Array.isArray(packs) ? packs : [])) {
        if (!pack || pack.enabled === false) continue;
        const meta = { res: distinctiveTokens((pack.theme || '') + ' ' + (pack.name || '')).map((t) => new RegExp('\\b' + t + '\\b', 'i')), firstId: null };
        themeMap.set(pack.id, meta);
        for (const raw of (Array.isArray(pack.positions) ? pack.positions : [])) {
            let defId = null;
            if (raw && (raw.bundle || raw.keywords)) {
                const def = normalizeInlinePosition(raw);
                if (!def) { console.warn('[POSITION] > pack def skipped (failed gates):', JSON.stringify(raw), 'in pack', pack.id); continue; }
                if (defs.has(def.id)) continue; // first inline def wins
                for (const kw of (Array.isArray(raw.keywords) ? raw.keywords : [])) {
                    const v = pluralVariant(kw);
                    if (v) def.keywords.push(v);
                }
                for (const tag of signatureBundleTags(def.bundle)) {
                    def.keywords.push(new RegExp(escapeKeywordLiteral(tag), 'i'));
                }
                defs.set(def.id, def);
                defId = def.id;
            } else if (raw && raw.id) {
                if (!POSITIONS.some((p) => p.id === raw.id)) continue;
                defId = raw.id;
            }
            activeIds.add(defId);
            if (!meta.firstId) meta.firstId = defId;
        }
    }
    ACTIVE_PACKS.defs = defs;
    ACTIVE_PACKS.activeIds = activeIds;
    ACTIVE_PACKS.themeMap = themeMap;
    ACTIVE_PACKS.synced = true;
    return { active: activeIds.size, custom: [...defs.keys()].filter((id) => !POSITION_ID_SET.has(id)).length };
}

export function resetPositionPackSync() {
    ACTIVE_PACKS.synced = false;
    ACTIVE_PACKS.defs = new Map();
    ACTIVE_PACKS.activeIds = new Set();
    ACTIVE_PACKS.themeMap = new Map();
}

// The merged registry every lookup consumes. Inline defs (forge / import / user edits of a
// builtin) take precedence over static registry entries for their id — INCLUDING their
// trigger keywords (defs are iterated FIRST below, so an edited builtin's edited keywords
// fire, never the factory ones). Resolved `{ id }` refs keep the static registry def.
// First pack wins on duplicate ids.
export function getActivePositions() {
    if (!ACTIVE_PACKS.synced) return POSITIONS;
    const active = [];
    const seen = new Set();
    for (const d of ACTIVE_PACKS.defs.values()) {
        if (!ACTIVE_PACKS.activeIds.has(d.id) || seen.has(d.id)) continue;
        seen.add(d.id);
        active.push(d);
    }
    for (const p of POSITIONS) {
        if (seen.has(p.id) || !ACTIVE_PACKS.activeIds.has(p.id)) continue;
        seen.add(p.id);
        active.push(p);
    }
    return active;
}

function getActiveOverridePosition(intent) {
    if (!ACTIVE_PACKS.synced) return null;
    return ACTIVE_PACKS.defs.get(normalizePositionIntent(intent)) || null;
}

// Fail-closed pack validation for forge saves + imports. Invalid positions are SKIPPED
// (reported), never half-imported; a pack whose every position fails is rejected outright.
export function validatePositionPack(pack) {
    const errors = [];
    const name = String(pack?.name || '').trim().slice(0, 40);
    if (!name) errors.push('pack name missing');
    const theme = (String(pack?.theme || 'custom').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_').slice(0, 24)) || 'custom';
    const rawPositions = Array.isArray(pack?.positions) ? pack.positions : [];
    if (rawPositions.length === 0) errors.push('pack has no positions');
    const positions = [];
    const seen = new Set();
    let skipped = 0;
    const IDENTITY_RE = /\b\w+ hair\b|\bhair\b|\b(?:blue|green|red|brown|amber|golden|purple|violet|heterochromia|grey|gray|aqua|pink)\s+eyes\b|\b(?:blonde|brunette|redhead)\b/i;
    for (const raw of rawPositions) {
        const why = [];
        let id = String(raw?.id || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
        if (!/^[a-z][a-z0-9_]{1,39}$/.test(id)) id = `p_${id.replace(/[^a-z0-9_]/g, '')}`.slice(0, 40);
        if (!/^[a-z][a-z0-9_]{1,39}$/.test(id)) why.push('bad id');
        if (seen.has(id)) why.push('duplicate id in pack');
        const keywords = [...new Set((Array.isArray(raw?.keywords) ? raw.keywords : []).map((k) => String(k || '').trim()).filter(Boolean).map((k) => k.toLowerCase()))];
        if (keywords.length === 0) why.push('no keywords');
        if (keywords.length > 8) why.push('too many keywords (max 8)');
        if (keywords.some((k) => k.length > 64)) why.push('keyword too long (max 64)');
        const tags = String(raw?.bundle || '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
        if (tags.length < 2) why.push('bundle needs 2+ tags');
        if (tags.length > 10) why.push('bundle over the 10-tag cap');
        if (tags.some((t) => /^(?:pov|first person view)$/.test(t))) why.push('pov / first person view is banned');
        if (tags.some((t) => /\b(?:vaginal|pov crotch)\b/.test(t))) why.push('banned vocabulary (vaginal / pov crotch)');
        if (tags.some((t) => IDENTITY_RE.test(t))) why.push('identity-lock tag (hair/eyes)');
        if (why.length === 0) {
            seen.add(id);
            const P = ['MF', 'FF', 'MM', 'FUTA', 'SOLO'];
            const allowedPairings = (Array.isArray(raw?.allowedPairings) ? raw.allowedPairings : Array.isArray(raw?.pairings) ? raw.pairings : ['MF'])
                .map((p) => String(p).toUpperCase()).filter((p) => P.includes(p));
            positions.push({
                id,
                name: String(raw?.name || id).trim().slice(0, 48) || id,
                keywords,
                bundle: tags.join(', '),
                minExplicit: Math.max(0, Math.min(3, parseInt(raw?.minExplicit, 10) || 0)),
                allowedPairings: allowedPairings.length ? allowedPairings : ['MF'],
                isCustom: true,
            });
        } else skipped += 1;
    }
    if (positions.length === 0 && rawPositions.length > 0) errors.push('every position failed validation');
    return { ok: errors.length === 0 && positions.length > 0, errors, positions, theme, name, skipped };
}

// Common-name aliases → canonical registry ids (local LLMs ignore id lists more often
// than they honor them; normalize BEFORE validation so `facesitting` ≠ junk).
export const POSITION_ALIASES = {
    facesitting: 'sitting_on_face',
    face_sitting: 'sitting_on_face',
    doggy: 'doggystyle',
    doggy_style: 'doggystyle',
    doggystyle_position: 'doggystyle',
    cowgirl_position: 'cowgirl',
    cowgirl_style: 'cowgirl',
    sixty_nine: 'sixty_nine',
    '69': 'sixty_nine',
    blowjob: 'fellatio',
    blow_job: 'fellatio',
    eating_out: 'cunnilingus',
    pussy_licking: 'cunnilingus',
    titfuck: 'paizuri',
    tit_job: 'paizuri',
    tit_fuck: 'paizuri',
    lotus: 'upright_straddle',
    lotus_position: 'upright_straddle',
    full_nelson: 'reverse_suspended_congress',
    stand_and_carry: 'suspended_congress',
};

export function normalizePositionIntent(intent) {
    const raw = String(intent || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (!raw) return '';
    if (POSITION_ID_SET.has(raw)) return raw;
    if (ACTIVE_PACKS.synced && ACTIVE_PACKS.activeIds.has(raw)) return raw;
    const base = raw.replace(/_pen$|_base$/, '');
    if (POSITION_ID_SET.has(base)) return base;
    if (ACTIVE_PACKS.synced && ACTIVE_PACKS.activeIds.has(base)) return base;
    return POSITION_ALIASES[raw] || POSITION_ALIASES[base] || raw;
}


// --- Pairing resolution (gender-aware, no sneaky appendages) ---
// waifu side: core_appearance (1girl/1boy/androgynous + futa|futanari detect,
// same signals as explicitAnatomyModulator). user side: customUserProfile.gender.
// Unknown user gender = least-restrictive MF (fail-open ONLY toward fewer strips).
export function resolvePairing(waifuOrCore, userGender) {
    const coreStr = String(
        typeof waifuOrCore === 'string'
            ? waifuOrCore
            : [
                waifuOrCore?.core_appearance || '',
                waifuOrCore?.description || '',
                waifuOrCore?.gender || '',
                Array.isArray(waifuOrCore?.tags) ? waifuOrCore.tags.join(' ') : (waifuOrCore?.tags || ''),
            ].join(' ')
    ).toLowerCase();
    const ug = String(userGender || '').toLowerCase();
    const waifuIsFuta = /\b(?:futa|futanari|dickgirl|shemale|intersex|hermaphrodite)\b/i.test(coreStr);
    const waifuIsMale = !waifuIsFuta && /\b(?:1boy|male|boy|man)\b/i.test(coreStr);
    const userIsFemale = /\b(?:female|girl|woman)\b/i.test(ug) && !/\bmale\b/i.test(ug);
    const userIsMale = /\b(?:male|boy|man)\b/i.test(ug) && !userIsFemale;
    if (waifuIsFuta) return 'FUTA';
    if (/\bandrogynous\b/i.test(coreStr)) return 'MF';
    if (!waifuIsMale && userIsFemale) return 'FF';
    if (waifuIsMale && userIsMale) return 'MM';
    return 'MF';
}

// --- Gender guillotine: strip pairing-illegal anatomy tags. Fail-closed. ---
const MALE_ANATOMY_RE = /\b(?:penis|dick|cock|phallus|bulge|paizuri|fellatio|deepthroat|irrumatio|handjob|footjob|thighjob|vaginal)\b/i;
const FEMALE_ANATOMY_RE = /\b(?:pussy|vagina|vaginal|cunnilingus)\b/i;

export function filterByPairing(tags, pairing) {
    if (!tags) return '';
    const list = String(tags).split(',').map((t) => t.trim()).filter(Boolean);
    let out = list;
    if (pairing === 'FF') {
        // Girl-on-girl: no appendage may sneak in. Penile + pen-variant tags die.
        out = out.filter((t) => !MALE_ANATOMY_RE.test(t));
        out = out.map((t) => (/^pov crotch$/i.test(t) ? 'pov' : t));
    } else if (pairing === 'MM') {
        out = out.filter((t) => !FEMALE_ANATOMY_RE.test(t));
    } else if (pairing === 'SOLO') {
        out = out.filter((t) => !MALE_ANATOMY_RE.test(t) && !FEMALE_ANATOMY_RE.test(t) && !/\b(?:sex from behind|anal)\b/i.test(t));
    }
    return out.join(', ');
}

// --- Conflict matrix: mutually-exclusive camera tags, sleeping kills gaze ---
const CAMERA_TAGS = ['from below', 'from above', 'from behind', 'view from behind', 'directly above', 'eye level'];

export function applyConflictMatrix(tags) {
    const list = String(tags || '').split(',').map((t) => t.trim()).filter(Boolean);
    let keptCamera = null;
    const deduped = [];
    const seen = new Set();
    list.forEach((t) => {
        const l = t.toLowerCase();
        if (seen.has(l)) return;
        if (CAMERA_TAGS.includes(l)) {
            if (!keptCamera) { keptCamera = l; deduped.push(t); }
        } else { deduped.push(t); }
        seen.add(l);
    });
    let out = deduped;
    if (out.some((t) => /\bsleeping\b/i.test(t))) {
        out = out.filter((t) => !/\b(?:looking at viewer|looking back|ahegao)\b/i.test(t));
    }
    const hasRearView = out.some((t) => /rear view/i.test(t));
    const hasLookingBack = out.some((t) => /^looking back$/i.test(t));
    const hasLookingAtViewer = out.some((t) => /^looking at viewer$/i.test(t));
    if (hasLookingBack && hasLookingAtViewer && !hasRearView) {
        out = out.filter((t) => !/^looking at viewer$/i.test(t));
    }
    return out.join(', ');
}

// --- ✨ SUGGESTION PIN BUNDLE ASSEMBLER (v2.7.x) ✨ ---
// A SUGGEST_POSE selection carries its EXACT bundle from the menu row — the user's
// explicit choice outranks the judge, so it rides app-owned state, never prose.
// This runs the raw bundle string through the same hygiene as every dict bundle:
// pairing guillotine → conflict matrix → scrubber → 10-tag CLIP cap. Pure and
// fail-closed: junk in → null out (the pin dissolves, the cascade takes over).
export function assemblePinnedBundle(rawBundle, pairing = 'MF') {
    const raw = String(rawBundle || '').trim();
    if (raw.length < 2) return null;
    let bundle = filterByPairing(raw, pairing);
    bundle = applyConflictMatrix(bundle);
    bundle = sanitizeLlmImageTags(bundle).clean;
    const tags = bundle.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 10);
    if (tags.length === 0) return null;
    return { bundle: tags.join(', '), tags };
}

// --- Intent resolution: alias-normalize + intensity gate + registry + safe fallback ---
export function resolvePoseIntent(intent, intensity) {
    const raw = normalizePositionIntent(intent);
    if (!raw) return `${POSITION_FALLBACK_ID}_base`;
    const penKey = `${raw}_pen`;
    const baseKey = /_base$/.test(raw) ? raw : `${raw}_base`;
    if (intensity === 'pen' && POSE_DICTIONARY[penKey]) return penKey;
    if (POSE_DICTIONARY[raw]) return raw;
    if (POSE_DICTIONARY[baseKey]) return baseKey;
    const reg = POSITIONS.find((p) => p.id === raw);
    if (reg) {
        if (intensity === 'pen' && reg.dictPen && POSE_DICTIONARY[reg.dictPen]) return reg.dictPen;
        if (reg.dictBase && POSE_DICTIONARY[reg.dictBase]) return reg.dictBase;
    }
    return `${POSITION_FALLBACK_ID}_base`;
}

// --- Sync regex gate: cheap flexible trigger. { id, confidence } | null ---
export function detectPositionTrigger(contextText) {
    const text = String(contextText || '');
    if (!text || text.length < 4) return null;
    let best = null;
    for (const pos of getActivePositions()) {
        let hits = 0;
        for (const re of pos.keywords) {
            try { if (re.test(text)) hits += 1; } catch { /* bad regex never blocks */ }
        }
        if (hits > 0) {
            // Compound / specific positions get a specificity bonus so e.g. "reverse cowgirl" beats generic "cowgirl"
            const specificity = (pos.id.split('_').length - 1) * 0.05;
            const score = (hits >= 2 ? 0.9 : 0.65) + specificity;
            if (!best || score > best.confidence) best = { id: pos.id, confidence: score, hits };
        }
    }
    // ✨ v2.6.31 Stage B — theme resolution: a pack's THEME word present but no keyword
    // matched → fire the pack's first position. Deterministic and theme-tolerant: any
    // position in the right pack is thematically correct, so LLM keyword inconsistency
    // can't silence a pack. Weak/generic tokens are stoplisted at sync time.
    if (!best && ACTIVE_PACKS.synced) {
        let bestPack = null;
        for (const meta of ACTIVE_PACKS.themeMap.values()) {
            if (!ACTIVE_PACKS.activeIds.has(meta.firstId)) continue;
            let hits = 0;
            for (const re of meta.res) {
                try { if (re.test(text)) hits += 1; } catch { /* inert */ }
            }
            if (hits > 0 && (!bestPack || hits > bestPack.hits)) bestPack = { meta, hits };
        }
        if (bestPack) best = { id: bestPack.meta.firstId, confidence: 0.5 + 0.05 * Math.min(3, bestPack.hits - 1), hits: bestPack.hits, theme: true };
    }
    return best;
}

// --- ✨ v2.7.50 THE POSE WARRANT ✨ — the mood gate that decides whether the pose engine
// may speak at all. Doctrine: the pose engine is a PRIVILEGE OF THE MOOD, not a permanent
// possession — explicit request or genuine heat warrants it; casual scenes belong to her
// and the camera desk. PURE + deterministic; node:test-able.
//   'explicit' — a registry keyword (confidence ≥ 0.6, non-theme) appears in the CURRENT
//                exchange (turnText). The engine fires and owns the pose segment.
//   'intimate' — the scene is actually hot: heat rank ≥ POSE_WARRANT_INTIMACY_HEAT_RANK,
//                or live intimacy signals in the scene text while TOGETHER, or her authored
//                pose keywords in a together scene (D1 law preserved mid-act, deferred apart).
//   'casual'   — everything else. The engine stands down; staged directives decay; the
//                autonomous resolver stays dark. Her pose + the OOB Director win untouched.
// Presence-weighted: 'apart' denies the together-scene intimacy paths (an 'apart' verdict
// means no user in frame — flirting alone in her room is NOT a warrant).
export const POSE_WARRANT_INTIMACY_HEAT_RANK = 3; // heatLadder 'Heated' (Calm0 Warm1 Flustered2 Heated3 Feverish4) — Master's tuning knob
const WARRANT_INTIMACY_SIGNAL_RE = /\b(?:sex|dick|penis|insertion|penetrat\w*|cum|fuck\w*|pussy|moan\w*|thrust\w*|taking it|inside me|inside her|anal|naked|nude|undress\w*|stripping|making out|making love)\b/i;
export function classifyPoseWarrant({ turnText = '', sceneText = '', heatRank = -1, presence = '', explicitMode = 0 } = {}) {
    const turnHit = detectPositionTrigger(turnText);
    if (turnHit && turnHit.confidence >= 0.6) return { warrant: 'explicit', hit: turnHit };
    const together = presence !== 'apart';
    const hot = Number.isFinite(heatRank) && heatRank >= POSE_WARRANT_INTIMACY_HEAT_RANK;
    const sceneTextStr = String(sceneText || '');
    const sceneIntimate = WARRANT_INTIMACY_SIGNAL_RE.test(sceneTextStr);
    const sceneHit = detectPositionTrigger(sceneTextStr);
    if (together && (hot || (sceneIntimate && (explicitMode >= 2 || hot)) || !!sceneHit)) {
        return { warrant: 'intimate', hit: sceneHit || turnHit || null };
    }
    return { warrant: 'casual', hit: null };
}

// --- Autonomous context resolver: sync fail-safe director (zero LLM calls) ---
// Evaluates candidate tags (dynamicString / promptStr) + dialogue context.
// Resolves intent, intensity, pairing, expression, and gaze, then returns
// { bundle, tags, dictKey, meta } or null.
export function resolvePositionDirectiveFromContext(tagListOrString, { contextText = '', waifu = null, explicitMode = 2, userGender = '', personaHint = '', pairing = '' } = {}) {
    const rawTags = Array.isArray(tagListOrString) ? tagListOrString.join(', ') : String(tagListOrString || '');
    const text = [rawTags, contextText].filter(Boolean).join(' ');
    if (!text || text.length < 4) return null;

    const hit = detectPositionTrigger(text);
    if (!hit) return null;

    const intent = hit.id;
    const finalPairing = pairing || resolvePairing(waifu, userGender);
    const posDef = getActivePositions().find((p) => p.id === intent);
    if (posDef && posDef.allowedPairings && !posDef.allowedPairings.includes(finalPairing)) {
        return null; // pairing disallowed (e.g. male anatomy in FF)
    }
    if (posDef && typeof posDef.minExplicit === 'number' && posDef.minExplicit > explicitMode) {
        return null; // pack ceiling above the current explicit mode (consistent with the OOB path)
    }

    // Intensity gate: explicitMode >= 3 = pen; explicitMode >= 2 = pen if active intimacy words exist, else base
    let intensity = 'base';
    if (explicitMode >= 3) {
        intensity = 'pen';
    } else if (explicitMode >= 2) {
        const hasPenSignal = /\b(?:sex|dick|penis|insertion|penetrat\w*|cum|fuck\w*|pussy|deep|moan\w*|harder|thrust\w*|taking it|inside\w*|sweaty|anal)\b/i.test(text);
        if (hasPenSignal && posDef && posDef.dictPen) {
            intensity = 'pen';
        }
    }

    // Expression extraction (tags → persona hint → smug default)
    let expression = '';
    const exprMatch = text.match(/\b(smug|smirk|embarrassed|blush|blushing|smile|smiling|grin|grinning|panting|ahegao|dazed)\b/i);
    if (exprMatch) {
        const rawExpr = exprMatch[1].toLowerCase();
        if (rawExpr.includes('smug') || rawExpr.includes('smirk')) expression = 'smug';
        else if (rawExpr.includes('embarrass') || rawExpr.includes('blush')) expression = 'embarrassed';
        else if (rawExpr.includes('grin')) expression = 'grin';
        else if (rawExpr.includes('smile')) expression = 'smile';
        else if (rawExpr.includes('pant')) expression = 'panting';
        else if (rawExpr.includes('ahegao') && intensity === 'pen') expression = 'ahegao';
        else if (rawExpr.includes('dazed')) expression = 'dazed';
    }
    if (!expression) {
        const persona = String(personaHint || waifu?.personality || waifu?.description || '').toLowerCase();
        if (/(smug|brat|catgirl|tease|sassy|confident|bold)/i.test(persona)) expression = 'smug';
        else if (/(shy|timid|modest|demure|innocent|tsundere)/i.test(persona)) expression = 'embarrassed';
        else if (/(cheerful|sweet|gentle|warm)/i.test(persona)) expression = 'smile';
        else if (/(horny|slut|lust|pervert)/i.test(persona)) expression = (intensity === 'pen' ? 'panting' : 'smug');
        else expression = 'smug';
    }

    // Gaze extraction
    let gaze = '';
    const gazeMatch = text.match(/\b(looking back|looking up at viewer|looking up|looking down|eyes closed|closed eyes|shy)\b/i);
    if (gazeMatch) {
        const rawGaze = gazeMatch[1].toLowerCase();
        if (rawGaze.includes('back')) gaze = 'looking_back';
        else if (rawGaze.includes('up')) gaze = 'looking_up';
        else if (rawGaze.includes('down')) gaze = 'looking_down';
        else if (rawGaze.includes('closed')) gaze = 'closed';
        else if (rawGaze.includes('shy')) gaze = 'shy';
    }

    const bundleObj = assemblePositionBundle({
        intent,
        intensity,
        gaze,
        expression,
        pairing: finalPairing,
    });
    if (!bundleObj) return null;

    return {
        bundle: bundleObj.bundle,
        tags: bundleObj.tags,
        dictKey: bundleObj.dictKey,
        meta: {
            intent,
            intensity,
            pairing: finalPairing,
            expression,
        },
    };
}

// --- Existing position-tag detector: never fight the LLM ---
const EXISTING_POSITION_RE = /\b(?:missionary|mating press|doggystyle|cowgirl position|reverse cowgirl position|squatting cowgirl position|upright straddle|amazon position|sitting on face|facesitting|prone bone|spooning|standing sex|standing doggystyle|suspended congress|reverse suspended congress|fellatio|cunnilingus|paizuri|handjob|piledriver|anvil position|bent over|presenting|leg lock|full nelson)\b/i;

export function hasExistingPositionTag(dynamicString) {
    return EXISTING_POSITION_RE.test(String(dynamicString || ''));
}

// --- XML parsing: tolerant <position_directive> envelope (XML primary, JSON fallback) ---
export function parsePositionDirectiveXml(raw) {
    if (!raw || typeof raw !== 'string') return null;
    let work = String(raw).trim();
    work = work.replace(/<(?:think|thought|channel)[^>]*>[\s\S]*?<\/(?:think|thought|channel)>/gi, ' ');
    // Fences usually WRAP the envelope (```xml <position_directive>...```) — extract their
    // content instead of deleting it (deleting swallowed valid envelopes in early tests).
    const fence = work.match(/```(?:xml)?\s*([\s\S]*?)```/i);
    if (fence) work = fence[1].trim();
    const block = work.match(/<position_directive>([\s\S]*?)<\/position_directive>/i)?.[1] || work;
    const grab = (tag) => (block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i')) || [])[1] || '';
    const pose_intent = grab('pose_intent').replace(/["*<>]/g, '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    let intensity = grab('intensity').replace(/["*<>]/g, '').trim().toLowerCase();
    if (!['base', 'pen'].includes(intensity)) intensity = 'base';
    const gaze = grab('gaze').replace(/[<>"*]/g, '').trim().toLowerCase().slice(0, 40);
    const expression = grab('expression').replace(/[<>"*]/g, '').trim().toLowerCase().replace(/[\s-]+/g, '_').slice(0, 40);
    const state = grab('state').replace(/[<>"*]/g, '').trim().toLowerCase().replace(/[\s-]+/g, '_').slice(0, 40);
    if (!pose_intent) {
        // JSON fallback transport: {"pose_intent":"cowgirl","intensity":"pen"}
        try {
            const start = work.indexOf('{');
            const end = work.lastIndexOf('}');
            if (start !== -1 && end > start) {
                const obj = JSON.parse(work.slice(start, end + 1));
                const pi = String(obj.pose_intent || obj.Pose_Intent || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
                if (pi) {
                    const ii = String(obj.intensity || obj.Intensity || 'base').toLowerCase();
                    const ex = String(obj.expression || obj.Expression || '').toLowerCase().replace(/[\s-]+/g, '_').slice(0, 40);
                    return { pose_intent: pi, intensity: ['base', 'pen'].includes(ii) ? ii : 'base', gaze: String(obj.gaze || obj.Gaze || '').toLowerCase().slice(0, 40), expression: ex, state: String(obj.state || obj.State || '').toLowerCase().replace(/[\s-]+/g, '_').slice(0, 40) };
                }
            }
        } catch { /* fall through to null */ }
        return null;
    }
    return { pose_intent, intensity, gaze, expression, state };
}

// --- Registry gate for the OOB validator: is this intent known (alias-aware)? ---
export function isKnownPositionIntent(intent) {
    if (!intent) return false;
    const raw = normalizePositionIntent(intent);
    if (ACTIVE_PACKS.synced) return ACTIVE_PACKS.activeIds.has(raw);
    if (POSITION_ID_SET.has(raw)) return true;
    if (POSE_DICTIONARY[raw]) return true;
    if (POSE_DICTIONARY[`${raw}_base`] || POSE_DICTIONARY[`${raw}_pen`]) return true;
    return false;
}

// --- Full assembly: dict + expression/state/gaze + pairing filter + conflicts + budget ---
// ✨ v2.7.33 POSE-BUDGET DENSITY ✨ — `maxTags` (from the deep-mode pose allocation) may
// RAISE the classic 10-tag CLIP ceiling when the user paid for a fatter pose section; it
// can never lower it (10 stays the floor — Master's tested density is non-negotiable).
export function assemblePositionBundle({ intent, intensity = 'base', gaze = '', state = '', expression = '', pairing = 'MF', maxTags = 10 } = {}) {
    // ✨ v2.6.29: an active pack def (custom, or a user-EDITED builtin shadow) wins first —
    // its bundle is authored by the pack and only rides the pairing/conflict/budget gates.
    const override = getActiveOverridePosition(intent);
    let dictKey = '';
    let bundle = '';
    if (override) {
        dictKey = override.id;
        bundle = override.bundle;
    } else {
        dictKey = resolvePoseIntent(intent, intensity);
        bundle = POSE_DICTIONARY[dictKey] || POSE_DICTIONARY[`${POSITION_FALLBACK_ID}_base`];
    }
    const extras = [];
    // Expression rides FIRST in the extras queue — under the 10-tag budget it must
    // outlive state/gaze padding (it is the only axis the dict cannot self-supply).
    if (expression && POSITION_EXPRESSION_DICT[expression]) extras.push(POSITION_EXPRESSION_DICT[expression]);
    if (state && POSITION_STATE_DICT[state]) extras.push(POSITION_STATE_DICT[state]);
    else if (state) {
        const cleanState = sanitizeLlmImageTags(String(state)).clean;
        if (cleanState) extras.push(cleanState.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 2).join(', '));
    }
    if (gaze) {
        const gazeKey = String(gaze).toLowerCase().replace(/[\s-]+/g, '_');
        if (POSITION_GAZE_DICT[gazeKey]) extras.push(POSITION_GAZE_DICT[gazeKey]);
        else {
            const cleanGaze = sanitizeLlmImageTags(String(gaze)).clean;
            if (cleanGaze) extras.push(cleanGaze.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 2).join(', '));
        }
    }
    if (extras.length) bundle = `${bundle}, ${extras.filter(Boolean).join(', ')}`;
    bundle = filterByPairing(bundle, pairing);
    bundle = applyConflictMatrix(bundle);
    bundle = sanitizeLlmImageTags(bundle).clean;
    // <=10-tag CLIP budget (Master's tested density); POV + position lead so they
    // survive the tail-trim. maxTags may only RAISE it (v2.7.33 pose-budget density).
    const tags = bundle.split(',').map((t) => t.trim()).filter(Boolean)
        .slice(0, Number.isFinite(maxTags) && maxTags > 10 ? Math.floor(maxTags) : 10);
    if (tags.length === 0) return null;
    return { bundle: tags.join(', '), tags, dictKey };
}

// --- Segment classifiers (v2.6.26): what belongs to the pose/camera/gaze/expression ---
// When a directive fires the engine OWNS this segment of the dynamic tag list; the LLM's
// versions of these tags are REPLACED. Outfit and scene (env) segments are untouchable.
const SEGMENT_POSE_RE = /\b(?:missionary|mating press|breeding press|doggystyle|doggy style|cowgirl|reverse cowgirl|squatting cowgirl|upright straddle|amazon position|sitting on face|facesitting|prone bone|spooning|standing sex|standing doggystyle|standing missionary|suspended congress|reverse suspended congress|fellatio|deepthroat|irrumatio|cunnilingus|paizuri|handjob|fingering|footjob|thighjob|piledriver|folded|anvil position|bent over|presenting|top-down bottom-up|leg lock|full nelson|sixty nine|69|straddling|straddle|all fours|on back|on stomach|lying on side|lying|on knees|kneeling|squatting|sitting|standing|leaning forward|spread legs|legs up|legs over head|knees to chest|knees up|carrying|sitting on lap|sitting on top|lap pillow|skirt lift|almost kissing|embracing|embrace|hugging|selfie|posing|arched back|stretching)\b/i;
const SEGMENT_CAMERA_RE = /\b(?:pov|first person view|pov hands|pov legs|pov crotch|from below|from above|from behind|view from behind|directly above|eye level|close up|close-up|upper body|cowboy shot|portrait|dutch angle|wide shot|full body|selfie)\b/i;
const SEGMENT_GAZE_RE = /\b(?:looking at viewer|looking at you|looking back|looking up at viewer|looking up|looking down|looking away|looking ahead|looking to the side|looking afar|eyes closed|closed eyes|half-closed eyes|glancing|gaze|eye contact)\b/i;
const SEGMENT_EXPRESSION_RE = /\b(?:smug|smirk|smile|grin|laughing|giggle|blush|blushing|embarrassed|panting|ahegao|open mouth|parted lips|tongue|tongue out|seductive smile|seductive|dazed|half-closed eyes|smug smirk|naughty face)\b/i;
// Scene anchor: first tag from here marks where the env segment starts — the bundle
// splices in just BEFORE it when the LLM authored no pose segment of its own.
const SEGMENT_ENV_ANCHOR_RE = /\b(?:outdoors|indoors|night|day|dusk|dawn|sunset|sunrise|moonlight|sunlight|golden hour|afternoon|morning|evening|midnight|blue sky|sky|cloud|rain|snow|wind|bedroom|bathroom|kitchen|classroom|library|office|gym|locker room|shower|bathtub|onsen|bathhouse|hot spring|hotel|cafe|restaurant|store|mall|shop|street|alley|city|town|rooftop|balcony|park|garden|forest|mountain|beach|pool|ocean|sea|lake|river|water|grass|sand|field|couch|desk|table|counter|chair|window|wall|floor|door|bed)\b/i;
const isSegmentOwnedTag = (t) => SEGMENT_POSE_RE.test(t) || SEGMENT_CAMERA_RE.test(t) || SEGMENT_GAZE_RE.test(t) || SEGMENT_EXPRESSION_RE.test(t);

// --- v2.6.26 TRUE IN-PLACE SLOT INJECTION ---
// Master's reference recipe: the pose segment (position core → verb → camera →
// gaze) sits BETWEEN outfit and scene tags — never tail-appended. The old graft appended
// the bundle AFTER env tags, and buildImagePrompt's shield then moved protected tags to
// the tail, so POV tags landed DEAD LAST where CLIP chunk-1 attention is weakest.
// This splicer: (1) strips LLM-authored pose/camera/gaze/expression tags (REPLACED, not
// deferred), (2) dedupes the bundle against the survivors, (3) splices the bundle at the
// exact slot the LLM's own pose segment occupied — or just before the first env tag when
// the LLM authored none. Pure: no React, no window; node:test-able.
// Returns { list, injected, replaced }.
export function injectPositionIntoTagList(tagList, detection) {
    const input = (Array.isArray(tagList) ? tagList.join(',') : String(tagList || ''))
        .split(',').map((t) => t.trim()).filter(Boolean);
    if (!detection || !detection.bundle) return { list: input, injected: [], replaced: [], dropped: [], absorbed: [] };
    const marked = []; // null = segment tag (replaced/absorbed) or redundant garment (dropped)
    const replaced = [];
    const dropped = [];
    const absorbed = [];
    let spliceAt = -1;
    // ✨ v2.6.28 HANGER-ON DISCIPLINE ✨ — a state tag in the bundle makes her matching
    // outfit tag redundant (shirt lift + white loose shirt, panties aside + lace panties,
    // no bra + bra): the bundle owns the garment axis, the outfit survivor dies — one
    // freed dynamic slot for the scene, deterministic instead of budget-luck.
    const bundleText = String(detection.bundle).toLowerCase();
    const CLOTH_STATE_FAMILIES = [
        { state: /shirt lift/, garment: /\b(?:shirt|blouse|camisole|tank top)\b/ },
        { state: /panties aside/, garment: /\bpanties\b/ },
        { state: /\bno bra\b/, garment: /\bbra\b/ },
    ];
    const deadGarments = CLOTH_STATE_FAMILIES
        .filter((f) => f.state.test(bundleText))
        .map((f) => f.garment);
    const bundleTags = detection.tags || String(detection.bundle).split(',').map((t) => t.trim()).filter(Boolean);
    const bundleSet = new Set(bundleTags.map((t) => t.toLowerCase()));
    input.forEach((t, idx) => {
        if (isSegmentOwnedTag(t)) {
            // ✨ SCENE ABSORB ✨ — her authored tag BYTE-IDENTICAL to a bundle tag is a no-op,
            // not a replacement: marked null so the bundle re-adds it in dict order, and the
            // telemetry stops reporting "replaced" for tags that never actually changed.
            if (bundleSet.has(t.toLowerCase())) { absorbed.push(t); }
            else { replaced.push(t); }
            if (spliceAt === -1) spliceAt = idx;
            marked.push(null);
        } else if (deadGarments.some((re) => re.test(t.toLowerCase()))) {
            dropped.push(t);
            marked.push(null);
        } else {
            marked.push(t);
        }
    });
    const survivors = marked.filter(Boolean);
    const seen = new Set(survivors.map((t) => t.toLowerCase()));
    const injected = [];
    bundleTags.forEach((t) => {
        const l = t.toLowerCase();
        if (!seen.has(l)) { seen.add(l); injected.push(t); }
    });
    if (injected.length === 0) return { list: survivors, injected: [], replaced, dropped, absorbed };
    if (spliceAt === -1) {
        const envIdx = marked.findIndex((t) => t && SEGMENT_ENV_ANCHOR_RE.test(t));
        spliceAt = envIdx === -1 ? marked.length : envIdx;
    }
    // spliceAt indexes `marked` (original slots); map to survivor-space.
    const keptBefore = marked.slice(0, spliceAt).filter(Boolean).length;
    const list = [...survivors];
    list.splice(Math.min(keptBefore, list.length), 0, ...injected);
    return { list, injected, replaced, dropped, absorbed };
}

// --- Graft helper (v2.6.26 REPLACEMENT semantics): string-level wrapper. ---
// Old behavior appended the bundle to the string tail AND deferred whenever the LLM had
// authored any position tag — which in explicit scenes was ALWAYS (her own
// <image_prompt> carries pose words), so the engine never fired on its target photos
// (the D1 killer bug). New behavior: the engine OWNS the pose segment — LLM pose tags
// are REPLACED at their exact slot by Master's tuned bundle.
export function applyPositionTags(dynamicString, detection) {
    const res = injectPositionIntoTagList(String(dynamicString || ''), detection);
    return { result: res.list.join(', '), injected: res.injected, replaced: res.replaced, dropped: res.dropped || [], absorbed: res.absorbed || [] };
}

// ✨ v2.7.41 PRESENCE LAW ✨ — an 'apart' scene (she's texting/calling/sending a photo
// from her OWN location) must never imply the user's physical co-location: POV-camera
// fragments, male-presence tags, and insertion verbs are stripped from the list and `solo`
// is asserted — UNLESS a multi-girl tag shows a group scene (apart from the USER is not
// alone in-frame). PURE + deterministic; runs on every consumePositionDirective return.
export function applyPresencePolicy(tagListOrString) {
    const list = (Array.isArray(tagListOrString) ? tagListOrString.join(',') : String(tagListOrString || ''))
        .split(',').map((t) => t.trim()).filter(Boolean);
    const PRESENCE_STRIP_RE = /^(?:pov|pov hands|pov legs|pov crotch|first person view|1boy|1male|male focus|male hands|his hands|handjob|penis|vaginal|anal)$/i;
    const MULTI_GIRL_RE = /^(?:[2-9]\+?girls?|multiple girls|two girls|three girls)$/i;
    const isMulti = list.some((t) => MULTI_GIRL_RE.test(t));
    const stripped = list.filter((t) => !PRESENCE_STRIP_RE.test(t));
    if (!isMulti && !stripped.some((t) => t.toLowerCase() === 'solo')) stripped.push('solo');
    return stripped;
}

// --- ✨ v2.6.28 THE SCENE KEEPER: two-tier order-preserving budget shield ✨ ---
// Tier P: protected tags (the position bundle + anatomy top-ups) keep their exact slot,
//         hard-capped at 8 — the dict leads, so state/gaze extras die first when tight.
// Tier E: envProtect (M.E.O.W. location + time-of-day lighting) owns GUARANTEED seats
//         (cap 3) and is re-appended if upstream budget trims dropped it — the scene can
//         never be evicted again (the v2.6.26 shield let a ≤10-tag bundle + anatomy crowd
//         the budget to zero and the environment died silently at the trim).
// Tier U: everything else (outfit, her env) fills the remainder and dies FIRST
//         (Master's ruling: outfit survivor → state extra → expression last).
// With NO protectors (every regular photo path) this is byte-identical to the legacy
// cap-10 shield. Pure: no React, no window; node:test-able.
export function applyEnvShield(tags, { protect = [], envProtect = [], budget = 12 } = {}) {
    const norm = (t) => String(t || '').trim().toLowerCase();
    let list = (Array.isArray(tags) ? tags : String(tags || '').split(',')).map((t) => String(t).trim()).filter(Boolean);
    const protectSet = new Set((Array.isArray(protect) ? protect : []).map(norm).filter(Boolean));
    const envList = (Array.isArray(envProtect) ? envProtect : []).map((t) => String(t).trim()).filter(Boolean);
    // Re-append guarantee tags the upstream budget trims dropped (they ride the env tier).
    const inList = new Set(list.map(norm));
    envList.forEach((t) => { if (!inList.has(norm(t))) list.push(t); });
    const envSet = new Set(envList.map(norm));
    const hasProtection = protectSet.size > 0 || envSet.size > 0;
    // Legacy byte-identical cap (10) when nothing is protected at the legacy 12-tag budget;
    // when the position pipeline is active OR when Deep Prompt Encoder raises budget > 12,
    // honor the caller's full budget so expanded outfit/pose/env/deep allocations are never truncated to 10!
    const isDeepBudget = budget > 12;
    const shieldBudget = (hasProtection || isDeepBudget) ? Math.max(1, budget) : Math.min(10, Math.max(1, budget));
    const PROTECTED_CAP = isDeepBudget ? Math.max(8, protectSet.size) : 8;
    const ENV_CAP = isDeepBudget ? Math.max(3, envSet.size) : 3;
    const unprotectedBudget = Math.max(0, shieldBudget - Math.min(protectSet.size, PROTECTED_CAP) - Math.min(envSet.size, ENV_CAP));
    let protectedTaken = 0;
    let envTaken = 0;
    let unprotectedTaken = 0;
    return list.filter((t) => {
        const l = norm(t);
        if (protectSet.has(l)) {
            if (protectedTaken >= PROTECTED_CAP) return false;
            protectedTaken += 1;
            return true;
        }
        if (envSet.has(l)) {
            if (envTaken >= ENV_CAP) return false;
            envTaken += 1;
            return true;
        }
        if (unprotectedTaken < unprotectedBudget) { unprotectedTaken += 1; return true; }
        return false;
    });
}
