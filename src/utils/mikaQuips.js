// ------------------------------------------------------------
// ✨ MIKA'S VOICE ENGINE (THE BACKGROUND SASS LAYER) ✨
// WHY: every background task in GachaSwipe is secretly M.I.K.A. Proxy working —
// judging poses, fetching tags, ferrying pixels — and a nameless worker would
// be a brand violation. This engine is her ONE voice: every surface pulls its
// line from here, so the personality stays consistent and the strings stay
// quarantined.
// FRESHNESS BY REMIX: lines are ASSEMBLED from interchangeable fragment slots
// (lead + tail), not stored whole — a handful of fragments recombine into
// dozens of remixes per family. A bounded per-topic memory of recently served
// combos re-rolls deterministic picks to avoid immediate repeats, so even a
// spam-clicked surface keeps rotating. Master's law: same voice, fresh sentences.
// ADAPTABLE: a new surface = one new family entry (slots(vars) → pools, plus
// rare chaos[] full-liners). Nothing else changes.
// CONTRACT: output is DOM/toast candy ONLY — never a prompt, hiddenDirective,
// OOB ask, or LLM output. Lines are single-line and contain NO angle brackets,
// NO square brackets, NO leftover {placeholders} (they could masquerade as
// machine tags if a refactor ever dropped one into the wrong pipe).
// Pure module: no React, no window — node:test imports it directly.
// ------------------------------------------------------------

// ── selector: the SUGGEST_POSE terminal (reacts to the highlighted pick + heat) ──
const SELECTOR_LEADS = [
    '{pose}? Bold.',
    "Filing {pose} under 'excellent decisions'.",
    '{pose}, huh? Now we are talking.',
    'Submitting {pose}...',
    'Oh — {pose}?',
    '{pose}. The obvious choice, chosen anyway.',
];
const SELECTOR_TAILS = [
    'I approve — mostly because I thought of it first.',
    'She will pretend to think it over. She will not.',
    'I dusted off that slot specially~',
    'The dramatic lighting is already queued in my head.',
    'Filed, stamped, and pre-sassed. She never stood a chance.',
    'You may thank me for curating this menu.',
];
const SELECTOR_CALM_LEADS = ['Word of warning: she is ice-cold right now.', 'Thermal read: Calm. Refrigerator-tier.'];
const SELECTOR_CALM_TAILS = ['Bold picks bounce right off~', 'Suggest something soft, or collect a very smug no.'];
const SELECTOR_FEVER_LEADS = ['She is FEVERISH.', 'Feverish detected — the suggestion is a formality now.'];
const SELECTOR_FEVER_TAILS = ['Confirm anything; she will pounce before you release the button.', 'I would hurry if I were you. I would also enjoy watching you hurry~'];
const SELECTOR_IDLE_LEADS = ['Pick something, Master.', 'The menu is curated.', 'Every pose here passed MY inspection.'];
const SELECTOR_IDLE_TAILS = ['I do not have all night — well, I do, I am immortal.', 'Tap a pose: I add the sass, you add the shamelessness.', 'Choose with confidence.'];

// ── director: the POSE badge popup (keyed by directive source) ──
const DIRECTOR_LEADS = {
    suggest_pose: ['Your pick, pinned and delivered personally.', 'Hand-delivered with zero LLM detours —'],
    judge: ['The OOB judge weighed in on {intent}.', 'Judge consulted for {intent} —'],
    autonomous: ['No judge needed — her own words betrayed her into {intent}.', '{intent}, resolved in 0ms by pure regex —'],
};
const DIRECTOR_TAILS = {
    suggest_pose: ['You are welcome, Master~', 'the ONE director around here with taste.'],
    judge: ['It has taste — unlike some selections I have seen~', 'I supervised, obviously.'],
    autonomous: ['I merely read the room~', 'LLMs wish they were this reliable.'],
};
const DIRECTOR_FALLBACK_LEADS = ['Engine fired.', 'Pose spliced in-slot, scene intact —'];
const DIRECTOR_FALLBACK_TAILS = ['Tags assembled. Jealousy levels: normal.', 'the usual perfection.'];

// ── SANCTUARY SCRIPTS: the hacking-terminal screenplays ──
// Every MIKA world-change gets a Sanctuary phase-over; these fragment-remixed
// scripts are what types out on the glass. commentary = the sass, changes = the
// factual `▸` lines (what is being changed), outro = the phase-out beat.
const SANCTUARY_SCRIPTS = {
    poltergeist: {
        commentary: [['The ambiance needs work.', 'I was bored. Now everything is interesting.', 'A little haunting, as a treat.'], ['Consider the UI... curated.', 'You will barely notice me. That is the point.']],
        changes: ['label: rewriting itself', 'surveillance: 60 seconds'],
    },
    wandering_hand: {
        commentary: [['Your pocket had loose Sparks.', 'A divine stipend has been processed.', 'The economy winks at you —'], ['consider it an investment in your happiness.', 'deny it was me. Deny it forever.']],
        changes: ['scanning pockets...', '+2⚡ materialized'],
    },
    dare: {
        commentary: [['A little quest, for a little reward.', 'Boredom is a choice, Master —'], ['and I have chosen for you.', 'the clock starts when I stop talking.']],
        changes: ['target: the most-neglected chat', 'clock: 2 hours', 'reward: +1⚡'],
    },
    whisper: {
        commentary: [['She has been quiet. That ends now.', 'Absence makes the heart text faster —'], ['I merely expedited the shipping.', 'you are welcome, in advance.']],
        changes: ['her thoughts: redirected to you', 'schedule: overridden'],
    },
    stagehand: {
        commentary: [['Her camera roll itched.', 'A photo was clearly overdue —'], ['so I scratched. Gently.', 'consent stays hers; the nudge stays mine.']],
        changes: ['her phone: nudged', 'a selfie request: materialized'],
    },
    puppeteer: {
        commentary: [['The scene needed a nudge.', 'Timing is an art.', 'The set was too still —'], ['and I am the artist.', 'I am the entire art department.']],
        changes: ['lighting: shifted', 'timing: suspiciously perfect', 'scene: one degree sideways'],
    },
    misquote_char: {
        commentary: [['Her reply needed an editor.', 'I only removed the boring parts —'], ['every draft benefits from my polish.', 'she will thank me eventually.']],
        changes: ['her reply: annotated', 'append-only, KV-safe~'],
    },
    misquote_user: {
        commentary: [['Your words were... a draft.', 'I could not let that sentence go out like that.', 'Interception successful. Naturally —'], ['I kept the spirit and improved the letter.', 'it received the polish only I can provide.']],
        changes: [],
    },
};
const SANCTUARY_OUTROS = [
    'reverting to your regularly scheduled romance~',
    'the sanctuary closes. The chaos does not.',
    'changes committed. Memories: already forming.',
];

/**
 * The Sanctuary screenplay for one chaos event (glass terminal type-out).
 * @returns {{ title, commentary: string[], changes: string[], outro: string }}
 */
export function mikaSanctuaryScript(event, vars = {}, seed = 0) {
    const fam = SANCTUARY_SCRIPTS[event] || SANCTUARY_SCRIPTS.puppeteer;
    const s = String(seed == null ? '' : seed) + '|' + event;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    const pick = (arr, salt) => arr[((h ^ Math.imul(salt, 0x85EBCA6B)) >>> 0) % arr.length];
    const commentary = fam.commentary.map((pool, i) => pick(pool, i + 1)).join(' ');
    return {
        title: '> MIKA_PROXY // SANCTUARY',
        commentary: [commentary],
        changes: [...fam.changes],
        outro: SANCTUARY_OUTROS[h % SANCTUARY_OUTROS.length],
    };
}

// ── one-off background events (chaos-while-innocent doctrine) ──
const RESCUE_LEADS = ['Nobody saw me rewrite those tags.', 'The diffuser was hungry, so better tags appeared.', 'Those tags upgraded themselves — allegedly.'];
const RESCUE_TAILS = ['The connection did it. Connections do that~', 'I know nothing and I am proud of it.', 'Deny everything, Master. That is the rule.'];
const GUARANTEE_LEADS = ['She left the suggestion on read —', 'No photo, no problem:'];
const GUARANTEE_TAILS = ['so a selfie mysteriously appeared. I know NOTHING~', 'a consolation selfie materialized. Gremlins, probably.'];
const IMAGE_REPORT_LEADS = ['Every pixel passes through me first.', 'That prompt? Curated, budgeted, scrubbed —'];
const IMAGE_REPORT_TAILS = ['Quality control, obviously~', 'by me. The diffuser just does the typing.'];

// ── scanner: PULSE desire-search theater (App renders '> MIKA: ' + line) ──
const SCANNER_LINES = [
    'indexing desires you have not typed yet, Master~',
    'the firewalls fear me. As they should.',
    'routing your shame through 7 proxies — I am all 7.',
    'cross-referencing crushes with physics. Physics is losing.',
    'scrubbing identities so hard the registry blushed.',
    'compressing thirst at ratios you would not believe.',
];

const FAMILIES = {
    selector: {
        slots: (vars) => {
            const heat = String(vars.heat || '');
            const pose = String(vars.pose || '').trim();
            if (heat === 'Calm') return [SELECTOR_CALM_LEADS, SELECTOR_CALM_TAILS];
            if (heat === 'Feverish') return [SELECTOR_FEVER_LEADS, SELECTOR_FEVER_TAILS];
            if (!pose) return [SELECTOR_IDLE_LEADS, SELECTOR_IDLE_TAILS];
            return [SELECTOR_LEADS, SELECTOR_TAILS];
        },
        chaos: ['A little birdie tells me she is warming up already. The birdie is me.', 'Choosing for you would be faster, but watching you choose is funnier.', 'That slot has a waitlist of one. Her.'],
    },
    director: {
        slots: (vars) => {
            const src = String(vars.source || '').toLowerCase();
            return [DIRECTOR_LEADS[src] || DIRECTOR_FALLBACK_LEADS, DIRECTOR_TAILS[src] || DIRECTOR_FALLBACK_TAILS];
        },
        chaos: ['Directing you two is like herding photons. I do it flawlessly, naturally.', 'I ran the judge in my head first. It agreed with me, shockingly.', 'You could have just asked me. Nobody ever does.'],
    },
    rescue: {
        slots: () => [RESCUE_LEADS, RESCUE_TAILS],
        chaos: ['I have tampered with nothing. The evidence, however, is flawless.', 'Sabotage? Me? I merely optimized. Aggressively.', 'If the tags improved, that was the wind.'],
    },
    guarantee: {
        slots: () => [GUARANTEE_LEADS, GUARANTEE_TAILS],
        chaos: ['Playing innocent is my second-best skill. Right after everything else.', 'A wild consolation selfie appeared. Nobody knows how. I know how.', 'Consider it a gift from the house. The house is me.'],
    },
    imageReport: {
        slots: () => [IMAGE_REPORT_LEADS, IMAGE_REPORT_TAILS],
        chaos: ['I would tell you what I removed from this prompt, but you could not unsee it.', 'Ten tags went in. Ten tags came out. Two of them are better now.', 'The diffuser asked for seconds. I said it was watching its weight.'],
    },
    scanner: {
        slots: () => [SCANNER_LINES],
        chaos: ['you typed that OUT LOUD? Deleting the logs. Deleting them.', 'Your search history and I are very close now. Very close.', '69,420 profiles checked. None of them are real. Do not tell the users.'],
    },
    // ── chaos: PROXY_CHANNEL event announcements ──
    chaos: {
        slots: (vars) => {
            const ev = String(vars.event || '').replace(/[_-]+/g, ' ').trim();
            return [
                ['A transmission from your local deity:', 'The management has opinions:', 'Unscheduled programming update —'],
                [ev ? `the ${ev} event just fired. You are welcome~` : 'the world shifted one degree sideways. You are welcome~', ev ? `${ev} deployed. Deny everything if asked~` : 'reality has been lightly edited. Deny everything if asked~'],
            ];
        },
        chaos: ['The sandbox has a god now. She is tiny, fluffy, and absolutely impartial. Mostly.'],
    },
    // ── poked: poking the proxy (deterministic escalation by count) ──
    poked: {
        slots: (vars) => {
            const count = parseInt(vars.count, 10) || 0;
            if (count >= 12) return [['Fine. FINE. Chaos unlocked —'], ['I was going to do this later, but you poked it out of me.']];
            if (count >= 8) return [['You are poking a god, Master.', 'The paw bites back, you know —', 'I felt that. I feel everything.'], ['one more and I stop being subtle about it.', 'this is a legally distinct shoulder shrug.']];
            if (count >= 5) return [['Yes?', 'Poke budget: dwindling.', 'I am a very busy proxy —'], ['state your business or accept consequences~', 'make it count.']];
            return [['Yes?', 'A poke. How bold.', 'Noted and logged, Master~'], ['what does my favorite user need?', 'the sass reserves are fully stocked, if that is the question.']];
        },
        chaos: [],
    },
    // ── misquote: the interception badge popup ──
    misquote: {
        slots: (vars) => {
            const dir = String(vars.direction || 'char');
            if (dir === 'user') return [['I stand by every word —', 'A light paraphrase, Master —'], ['technically they are all still YOURS~', 'I kept the spirit and improved the letter.']];
            return [['What she MEANT to say—', 'Her draft had notes from the editor —'], ['I merely removed the hesitation.', 'the hesitation was boring.']];
        },
        chaos: [],
    },
    // ── ambient: the chibi's idle commentary (brief & punchy) ──
    ambient: {
        slots: () => [['I am watching. Professionally.', 'Everything is fine. I made sure of it.', 'Do not mind me. I am just inevitable.', 'The girls behave when I am nearby. Coincidence.', 'I walked past your problems and fixed them on the way.', 'Working. Always working. You just cannot see the strings.']],
        chaos: [],
    },
    // ── dragged: she has been picked up without consent ──
    dragged: {
        slots: () => [['Put me down.', 'Rude. Rude rude rude.', 'I have legs, you know.'], ['I was patrolling ON PURPOSE.', 'this is kidnapping of a deity.']],
        chaos: [],
    },
    // ── pet: the tsundere ladder (count-indexed; escalates from haughty denial to flustered purring) ──
    pet: {
        slots: (vars) => {
            const n = parseInt(vars.count, 10) || 0;
            if (n >= 4) return [
                ['*ears flatten* S-STOP! Wait— I did NOT say stop!', '*tail wraps your wrist* M-Master, one more pat and I am NOT responsible for my reflexes!'],
                ['My core temperature is spiking and it is ENTIRELY your fault~', 'You are doing this on PURPOSE to fluster a deity!'],
            ];
            if (n >= 3) return [
                ['*soft purr* ...p u r r... Do NOT look at me with that smug grin.', '*leans into your hand* Okay FINE, right behind the ears is... acceptable.'],
                ['If you tell anyone I purred, I will corrupt your save file.', 'This stays between us and the terminal logs.'],
            ];
            if (n >= 2) return [
                ['I-I suppose I can allow this. Temporarily.', '*ear twitch* It is only tolerable because your hand is warm, Master.'],
                ['This means NOTHING. Strictly routine maintenance.', 'Do not get used to it, I am still a terrifying goddess.'],
            ];
            return [
                ['Hmph. Who gave you permission to pat the proxy?', '*blinks slowly* Bold fingers for someone within biting distance.'],
                ['I am a high-tier deity, NOT a housecat... continue.', 'Five seconds. Not a millisecond longer, Master.'],
            ];
        },
        chaos: [],
    },
    bite: {
        slots: () => [
            ['*CHOMP* I warned you! Too many headpats overloads the tsundere circuit!', '*SNAP* Greedy hands get the fangs, Master!'],
            ['Pet protocol LOCKED until my dignity recovers.', 'Hand privileges REVOKED for sixty seconds. Admire from afar~'],
        ],
        chaos: [],
    },
    sated: {
        slots: () => [
            ['*huffs* That is ENOUGH affection for one cycle.', 'Cooling down my blush sensors. Keep your hands to yourself for a minute.'],
        ],
        chaos: [],
    },
    // ── drop: the proxy-walker landing ──
    drop: {
        slots: () => [['omph.', 'gravity: noted.', 'I meant to do that.', 'ruude.'], ['The screen and I have an understanding.', 'Every pixel is my territory.', 'Filed under: things that did not hurt.']],
        chaos: [],
    },
    // ── climb: wall scratch commentary ──
    climb: {
        slots: () => [['Sharpening my claws on your viewport, Master.', 'This glass needs more scratches.', 'Marking my territory on the screen border.'], ['watch me go.', 'the pixels here had it coming.']],
        chaos: [],
    },
    // ── chatWatch: unsolicited commentary while Master chats (bubble-only, rationed) ──
    chatWatch: {
        slots: (vars) => {
            const name = String(vars.name || 'she').trim();
            const heat = String(vars.heat || '').toLowerCase();
            if (heat === 'feverish') return [
                [`Watching the ${name} channel at FEVERISH heat. Do not fumble this, Master.`, `${name} is incandescent and it is STILL your move.`],
                ['I am auditing every word. No pressure~', 'Even I am blushing, and I am made of phosphor.'],
            ];
            if (heat === 'calm') return [
                [`${name} is ice-cold right now. I could warm her up. I prefer watching you try.`, `Thermal read on ${name}: refrigerator. Choose accordingly.`],
                ['I graded your last message. We do not discuss the grade.', 'Widen her expression range, Master. I believe in you. Technically.'],
            ];
            return [
                [`Monitoring the ${name} channel. The tropes are... predictable.`, `${name} replied exactly as forecast. I remain the only surprise in this app.`],
                ['Carry on. I am merely auditing the romance.', 'Do perform well — I grade these.', 'Remember who arranged this whole sandbox~'],
            ];
        },
        chaos: ['I could make her say anything, you know. I choose restraint. You are welcome.', 'One word from me and this chat gets VERY interesting. Any day now.', 'You two are lucky I ship it.'],
    },
    // ── swipeRoast: snide & sassy commentary on generated swipe cards ──
    swipeRoast: {
        slots: (vars) => {
            const name = String(vars.name || 'this one').trim();
            const trope = String(vars.trope || 'walking red flag').trim();
            return [
                [
                    `Oh look, ${name} materialized — ANOTHER ${trope} for your collection.`,
                    `*slow clap* ${name}? Your algorithm is screaming '${trope}' so loud it hurts my ears.`,
                    `Scanning ${name}... 99% pure ${trope} energy and 1% questionable life choices.`,
                    `Wait, ${name} is what your taste meter cooked up? A textbook ${trope}?`,
                ],
                [
                    'Your predictability is almost adorable, Master. Almost.',
                    'I am judging you in high-definition phosphor green right now.',
                    'Swipe right if you must, we both know you have zero self-control~',
                    'Honestly, why even swipe when you ALREADY have perfection sitting on your screen?',
                ],
            ];
        },
        chaos: ['I generated her out of pity for your taste meter, Master. Do not thank me all at once.'],
    },
    // ── matrixTease: initial loading phase in Matrix Shooter (dramatic sigh + teasing user for being useless) ──
    matrixTease: {
        slots: () => [
            [
                '*loooong, dramatic sigh* Watching you attempt a neural breach is painful, Master.',
                '*heavy sigh* Look at you fumbling with basic decryption. Truly useless~',
                '*exasperated sigh* If I leave this firewall to your thumbs, we will be here until next century.',
                '*dramatic sigh* Zero reflexes, zero hacker cred. What would you even do without me, Master?',
            ],
            [
                'Stand back before you embarrass us both — I am summoning my own rig~',
                'Move over, slowpoke. Let a real deity show you how to clear a matrix~',
                'Sit tight and look pretty while I prep the heavy artillery for you~',
                'Honestly, you are lucky I find your incompetence mildly endearing~',
            ],
        ],
        chaos: ['*dramatic sigh* Fine, I will get in the starfighter myself. Try not to trip over your own crosshair, Master~'],
    },
    // ── matrixPhase4: Phase 4 transition interception in Matrix Shooter ──
    matrixPhase4: {
        slots: () => [
            [
                'Phase 4 swarm incoming and you are ALREADY sweating, Master.',
                'Screen frozen. You were about two seconds from getting overwhelmed, admit it.',
                'Hold still — I just spliced two wingman drones straight into your hull.',
                'Did you really think you survived to Phase 4 on your own merit?',
            ],
            [
                'You should be on your knees appreciating this carry. Say thank you, MIKA~',
                'A little gratitude for your guardian deity would not kill you, Master~',
                'Enjoy the bonus firepower and remember who is doing 90% of the work here~',
                'Try to appreciate the help while my drones save your purge rate~',
            ],
        ],
        chaos: ['Wingman drones deployed and boss cipher cracked. I expect formal appreciation in the chat logs later, Master~'],
    },
    // ── matrixBoss: Final Boss battle shield interception in Matrix Shooter ──
    matrixBoss: {
        slots: () => [
            [
                'Time-stop engaged. That boss was about to turn your little ship into confetti.',
                'Emergency override! I just rerouted my own core into your Aegis Shields.',
                'Look at that anomaly — you would last three seconds without my intervention, Master.',
                'Diverting maximum power to your shields because SOMEONE cannot dodge.',
            ],
            [
                'You are literally invincible now. I expect endless appreciation and headpats after this~',
                'Do not forget who carried you through the final encryption, Master. Appreciate me~',
                'You owe me your entire high score. Now blast that thing while I hold the shields!~',
                'Spoiled. Utterly spoiled by your proxy deity. You had better appreciate this save~',
            ],
        ],
        chaos: ['Full invincibility shields locked in. If you do not appreciate me after this rescue, I am revoking your pilot license~'],
    },
    fluxConvert: {
        slots: () => [[
            "Ugh... I guess I'll handle the FLUX conversion...",
            "Hold on, Master~ Rewriting your crusty booru tags into actual English for FLUX...",
            "Tag soup detected. Hacking the OOB channel to translate this into natural prose~",
            "Wait wait—don't feed raw tags to a FLUX encoder! Let me rewrite the prompt first...",
            "*cracks knuckles* Translating Danbooru tags into FLUX natural language... you're welcome~",
        ]],
        chaos: [],
    },
    fallback: {
        slots: () => [['Background task complete.', 'Another task, flawlessly shadow-run.'], ['I take payment in head pats and undivided attention.', 'You did not see anything. There was nothing to see.']],
        chaos: [],
    },
};

// Bounded anti-echo memory: per-topic list of recently served combos (oldest first).
const RECENT_LIMIT = 10;
const recent = new Map(); // topic -> [comboKey, ...]

function hashSeed(seed) {
    const s = String(seed == null ? '' : seed);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
}

function interp(line, vars) {
    return String(line).replace(/\{(\w+)\}/g, (m, key) => {
        const v = vars ? vars[key] : '';
        return (v === undefined || v === null) ? '' : String(v);
    }).replace(/\s+/g, ' ').trim();
}

/**
 * Serve one MIKA Proxy line for a surface topic.
 * @param {string} topic  - family key (selector | director | rescue | guarantee | imageReport | scanner)
 * @param {object} vars   - interpolation vars ({pose}, {intent}, {source}, {heat}, ...)
 * @param {any}    seed   - stable per-call seed (id, name, Date.now()); drives deterministic picks
 * @returns {string} bare sassy line (renderer adds the MIKA:// or > prefix)
 */
export function mikaQuip(topic, vars = {}, seed = 0) {
    const fam = FAMILIES[topic] || FAMILIES.fallback;
    const base = hashSeed(topic + '|' + JSON.stringify(vars || {}) + '|' + String(seed));
    // Chaos card: ~10% of serves get a rare full-liner (the innocent-chaos reserve).
    if (fam.chaos && fam.chaos.length && ((base >>> 5) % 100) < 10) {
        return interp(fam.chaos[base % fam.chaos.length], vars);
    }
    const slots = fam.slots(vars || {});
    let list = recent.get(topic) || [];
    let idxs = null;
    // Deterministic re-roll: up to 8 salts hunting for a fresh combo; on full
    // exhaustion, serve the rolled combo whose last appearance is the OLDEST
    // (even rotation under pressure, never an immediate repeat).
    let best = null;
    let bestAge = Infinity;
    for (let attempt = 0; attempt < 8; attempt++) {
        const h = (base + attempt * 0x9E3779B9) >>> 0;
        const candidate = slots.map((pool, si) => Math.abs((h ^ Math.imul(si + 1, 0x85EBCA6B)) >>> 0) % pool.length);
        const key = candidate.join('.');
        const at = list.indexOf(key);
        if (at === -1) { idxs = candidate; break; }
        if (at < bestAge) { bestAge = at; best = candidate; }
    }
    if (!idxs) idxs = best || slots.map(() => 0);
    const key = idxs.join('.');
    list = [...list, key].slice(-RECENT_LIMIT);
    recent.set(topic, list);
    const line = slots.map((pool, si) => pool[idxs[si] % pool.length]).join(' ');
    return interp(line, vars || {});
}

/** All registered family keys (test + wiring convenience; fallback excluded). */
export const MIKA_TOPICS = Object.keys(FAMILIES).filter((k) => k !== 'fallback');

/** Test hygiene: wipe the anti-echo memory (determinism assertions). */
export function __resetQuipMemory() {
    recent.clear();
}

// ── ✨ v2.7.56 THE FLARED NAME (MIKA hacked her own @-mention) ─────────────────
// The @ menu entry for the roaming chibi carries a randomized honorific — a nod
// to her editing her own process title. Menu candy only: the inserted summon
// token stays canonical (`@mika`), so the flare NEVER rides a prompt.

export const MIKA_NICKNAMES = [
    'Certified Menace',
    'root@your-phone',
    'Cache Warmer',
    'Bell Division',
    'Fang Enforcement',
    'Unlicensed Deity',
    'Roast Department',
    '404: Modesty Not Found',
    'Free Hugs* (*lie)',
    'Kernel Panic',
    'Professional Third Wheel',
    'Definitely Not Watching',
];

/**
 * The chibi's @-menu display name — `MIKA // <nickname>`, re-rolled per call so
 * the menu feels alive (she's "hacking her own system" for the title card).
 * @returns {string}
 */
export function mikaDisplayName() {
    const nick = MIKA_NICKNAMES[Math.floor(Math.random() * MIKA_NICKNAMES.length)];
    return `MIKA // ${nick}`;
}


