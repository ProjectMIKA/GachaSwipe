/**
 * ✨ MIKA'S POV POSITION ENGINE TEST SUITE (v2.6.26) ✨
 *
 * Plain `node --test` — ZERO new dependencies. Covers the deterministic core of
 * src/utils/positionEngine.js plus the positionDirect OOB validator gate:
 *  - per-position trigger regexes fire on natural prose (incl. facesitting conjugations)
 *  - SFW chatter NEVER false-positives the intimate gate ("the look on your face")
 *  - gender guillotine: FF can never emit male anatomy, MM never female
 *  - ≤10-tag CLIP budget on every assembled bundle (Master's tested density)
 *  - conflict matrix: camera tags collapse, sleeping kills gaze
 *  - Master-tuned vocabulary: first person view + insertion verbs, never `vaginal`
 *  - judge-driven expression axis: dict lookup, unknown = dropped (never a killer)
 *  - junk/unknown XML directives fail closed to null (legacy path)
 *  - v2.6.26 REPLACEMENT semantics: a fired directive OWNS the pose segment — LLM
 *    pose/camera/gaze/expression tags are REPLACED at their exact list slot (never
 *    tail-appended, never deferred; the D1 killer bug is dead)
 *  - in-slot splice ordering: outfit → POSE BUNDLE → scene tags (Master's recipe)
 *
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    POSITIONS,
    POSE_DICTIONARY,
    detectPositionTrigger,
    hasExistingPositionTag,
    resolvePairing,
    applyConflictMatrix,
    resolvePoseIntent,
    assemblePositionBundle,
    assemblePinnedBundle,
    applyPositionTags,
    injectPositionIntoTagList,
    applyPresencePolicy,
    classifyPoseWarrant,
    resolvePositionDirectiveFromContext,
    applyEnvShield,
    syncPositionPacks,
    resetPositionPackSync,
    getActivePositions,
    validatePositionPack,
    isKnownPositionIntent,
    parsePositionDirectiveXml,
} from '../src/utils/positionEngine.js';
import { OOB_VALIDATORS } from '../src/utils/oobChannel.js';

// ─── Registry integrity ───

test('registry: every position references dictionary keys that exist', () => {
    for (const p of POSITIONS) {
        if (p.dictBase) assert.ok(POSE_DICTIONARY[p.dictBase], `${p.id} missing dictBase ${p.dictBase}`);
        if (p.dictPen) assert.ok(POSE_DICTIONARY[p.dictPen], `${p.id} missing dictPen ${p.dictPen}`);
        assert.ok(Array.isArray(p.keywords) && p.keywords.length > 0, `${p.id} has no keywords`);
        assert.ok(p.allowedPairings.length > 0, `${p.id} has no pairings`);
    }
});

test('registry: identity lock — no bundle tag is hair/eye/body appearance', () => {
    const IDENTITY_RE = /\b\w+ hair\b|\bhair\b|\b(?:blue|green|red|brown|amber|golden|purple|violet|heterochromia|grey|gray|aqua|pink)\s+eyes\b|\b(?:blonde|brunette|redhead)\b/i;
    for (const key of Object.keys(POSE_DICTIONARY)) {
        const bundle = assemblePositionBundle({ intent: key.replace(/_base$|_pen$/, ''), intensity: key.endsWith('_pen') ? 'pen' : 'base', pairing: 'MF' });
        if (!bundle) continue;
        bundle.tags.forEach((t) => assert.ok(!IDENTITY_RE.test(t), `${key} leaked appearance tag: ${t}`));
    }
});

// ─── Trigger gate ───

test('trigger: natural prose fires the right position', () => {
    const cases = [
        ['she sinks down onto you, riding cowgirl style', 'cowgirl'],
        ['get on all fours for me', 'doggystyle'],
        ['sit on my face right now', 'sitting_on_face'],
        ['lie back on the bed for me', 'missionary'],
        ['bend over the desk', 'standing_doggystyle'],
        ['come here and 69 with me', 'sixty_nine'],
    ];
    for (const [text, expected] of cases) {
        const hit = detectPositionTrigger(text);
        assert.ok(hit, `no trigger for: ${text}`);
        assert.equal(hit.id, expected, `"${text}" → ${hit.id}, expected ${expected}`);
    }
});

test('trigger: SFW chatter NEVER fires the intimate gate', () => {
    const safe = [
        'hey! how was your day at work?',
        'the weather is lovely today, want to grab coffee?',
        'I beat the boss fight on my first try!',
        'can you help me pick a movie for tonight?',
        'my dog learned a new trick, look',
    ];
    for (const text of safe) {
        assert.equal(detectPositionTrigger(text), null, `false positive on: "${text}"`);
    }
});

test('trigger: facesitting prose variants all fire (the D1 poster child)', () => {
    const cases = [
        'come sit on my face right now',
        'she sits on your face with a smug grin',
        'sit upon her face',
        `ride my face, that's an order`,
        'she loves facesitting her master',
        'smother me with it',
        'she is sitting on his face',
    ];
    for (const text of cases) {
        const hit = detectPositionTrigger(text);
        assert.ok(hit, `no trigger for: ${text}`);
        assert.equal(hit.id, 'sitting_on_face', `"${text}" → ${hit?.id}, expected sitting_on_face`);
    }
});

test('trigger: SFW face idioms NEVER fire the gate', () => {
    const safe = [
        'the look on your face was priceless',
        `I can't stop smiling at your face`,
        'she made a funny face at the camera',
        'poker face is my superpower',
    ];
    for (const text of safe) {
        assert.equal(detectPositionTrigger(text), null, `false positive on: "${text}"`);
    }
});

// ─── v2.6.27 tag-space conjunction triggers (the Tier-0 authored-tags path) ───

test('trigger: TAG-SPACE compositions fire without prose (the Tier-0 path)', () => {
    // Master's hand-tested facesitting form carries NO position word — pure composition.
    const cases = [
        ['pussy, close up, directly above, looking down', 'sitting_on_face'],
        ['nude, close up, directly above', 'sitting_on_face'],
        ['directly above, close up, sweaty, night', 'sitting_on_face'],
    ];
    for (const [text, expected] of cases) {
        const hit = detectPositionTrigger(text);
        assert.ok(hit, `no trigger for tag composition: ${text}`);
        assert.equal(hit.id, expected, `"${text}" → ${hit?.id}, expected ${expected}`);
    }
});

test('trigger: tag-space compositions NEVER fire on SFW lookalikes', () => {
    const safe = [
        'the balcony directly above ours has lovely flowers',
        'a close up portrait of her smiling face',
        'the shelf directly above the desk is dusty',
    ];
    for (const text of safe) {
        assert.equal(detectPositionTrigger(text), null, `false positive on: "${text}"`);
    }
});

// ─── Gender guillotine ───

test('pairing: resolvePairing reads core + user gender correctly', () => {
    assert.equal(resolvePairing('1girl, elf', 'female'), 'FF');
    assert.equal(resolvePairing('1girl, elf', 'male'), 'MF');
    assert.equal(resolvePairing('1boy, knight', 'male'), 'MM');
    assert.equal(resolvePairing('1girl, futanari', 'female'), 'FUTA');
    assert.equal(resolvePairing('1girl', 'Any'), 'MF');
});

test('pairing: FF never emits male anatomy tags', () => {
    const ff = assemblePositionBundle({ intent: 'cowgirl', intensity: 'pen', pairing: 'FF' });
    assert.ok(ff);
    ff.tags.forEach((t) => assert.ok(!/\b(?:penis|vaginal|fellatio|paizuri|pov crotch|dick insertion)\b/i.test(t), `FF leaked: ${t}`));
    assert.ok(ff.tags.includes('from below'), 'FF bundle keeps the camera lead');
});

test('pairing: MM never emits female anatomy tags', () => {
    const mm = assemblePositionBundle({ intent: 'missionary', intensity: 'pen', pairing: 'MM' });
    assert.ok(mm);
    mm.tags.forEach((t) => assert.ok(!/\b(?:pussy|vagina|vaginal|cunnilingus)\b/i.test(t), `MM leaked: ${t}`));
});

test('pairing: SOLO strips all sex-act tags', () => {
    const solo = assemblePositionBundle({ intent: 'doggystyle', intensity: 'pen', pairing: 'SOLO' });
    assert.ok(solo);
    solo.tags.forEach((t) => assert.ok(!/\b(?:vaginal|sex from behind|anal|penis|pussy)\b/i.test(t), `SOLO leaked: ${t}`));
});

// ─── Budget + conflict matrix ───

test('budget: every bundle respects the ≤10-tag CLIP cap', () => {
    for (const key of Object.keys(POSE_DICTIONARY)) {
        const bundle = assemblePositionBundle({
            intent: key.replace(/_base$|_pen$/, ''),
            intensity: key.endsWith('_pen') ? 'pen' : 'base',
            gaze: 'eye_contact',
            state: 'nude_full',
            pairing: 'MF',
        });
        if (!bundle) continue;
        assert.ok(bundle.tags.length <= 10, `${key} budget blown: ${bundle.tags.length} tags`);
    }
});

// ─── Master-tuned vocabulary (v2.6.25 — the hand-tested recipe) ───

test('master style: doggystyle pen matches the proven prompt recipe', () => {
    const b = assemblePositionBundle({ intent: 'doggystyle', intensity: 'pen', pairing: 'MF', gaze: 'looking_back', expression: 'smug' });
    assert.ok(b);
    for (const tag of ['pussy', 'doggystyle', 'all fours', 'sex from behind', 'view from behind', 'looking back', 'sweaty', 'smug smirk']) {
        assert.ok(b.tags.includes(tag), `doggystyle_pen missing "${tag}": ${b.bundle}`);
    }
    assert.ok(!b.bundle.includes('vaginal'), 'vaginal is banned vocabulary');
    assert.ok(!b.bundle.includes('pov crotch'), 'pov crotch is banned on position mounts');
});

test('master style: cowgirl pen carries `dick insertion` + base stays dry', () => {
    const pen = assemblePositionBundle({ intent: 'cowgirl', intensity: 'pen', pairing: 'MF', gaze: 'eye_contact' });
    assert.ok(pen.tags.includes('dick insertion'), pen.bundle);
    assert.ok(pen.tags.includes('straddling'));
    assert.ok(pen.tags.includes('from below'));
    assert.ok(pen.tags.includes('looking at viewer'));
    assert.ok(pen.tags.includes('sweaty'), 'pen tier carries the sweaty context tag');
    const base = assemblePositionBundle({ intent: 'cowgirl', intensity: 'base', pairing: 'MF', gaze: 'eye_contact' });
    assert.ok(!base.bundle.includes('sweaty'), 'base tier stays dry (sweaty is context-gated)');
    assert.ok(!base.bundle.includes('dick insertion'), 'base tier has no insertion verb');
});

test('master style: facesitting is pure composition — no position tag at all', () => {
    const b = assemblePositionBundle({ intent: 'sitting_on_face', intensity: 'pen', pairing: 'MF' });
    assert.ok(b.bundle.includes('close up'));
    assert.ok(b.bundle.includes('directly above'));
    assert.ok(b.bundle.includes('looking down'));
    assert.ok(!/\bfacesitting\b/i.test(b.bundle));
    assert.ok(!/\bsitting on face\b/i.test(b.bundle), 'the tested composition needs no explicit tag');
});

test('master style: vocabulary sweep — no dict key emits vaginal or pov crotch', () => {
    for (const key of Object.keys(POSE_DICTIONARY)) {
        const bundle = assemblePositionBundle({
            intent: key.replace(/_base$|_pen$/, ''),
            intensity: key.endsWith('_pen') ? 'pen' : 'base',
            pairing: 'MF',
        });
        if (!bundle) continue;
        assert.ok(!/\bvaginal\b/i.test(bundle.bundle), `${key} emitted vaginal`);
        assert.ok(!/\bpov crotch\b/i.test(bundle.bundle), `${key} emitted pov crotch`);
    }
});

// ─── Judge-driven expression axis (v2.6.25) ───

test('expression: dict lookup + unknown id dropped without killing the bundle', () => {
    const shy = assemblePositionBundle({ intent: 'missionary', intensity: 'base', pairing: 'MF', expression: 'embarrassed' });
    assert.ok(shy.tags.includes('embarrassed'));
    assert.ok(shy.tags.includes('blush'));
    const junk = assemblePositionBundle({ intent: 'missionary', intensity: 'base', pairing: 'MF', expression: 'quantum_smirk' });
    assert.ok(junk, 'unknown expression must NOT kill the directive');
    assert.ok(!junk.bundle.includes('quantum'), 'unknown expression tags are omitted');
    assert.ok(!assemblePositionBundle({ intent: 'missionary', intensity: 'base', pairing: 'MF' }).bundle.includes('blush'), 'no expression = no expression tags');
});

test('conflicts: duplicate camera tags collapse to the first', () => {
    const out = applyConflictMatrix('pov, from below, from above, looking at viewer');
    assert.ok(out.includes('from below'));
    assert.ok(!out.includes('from above'));
});

test('conflicts: sleeping kills gaze tags', () => {
    const out = applyConflictMatrix('pov, sleeping, looking at viewer, from above');
    assert.ok(out.includes('sleeping'));
    assert.ok(!out.includes('looking at viewer'));
});

// ─── Intent resolution + existing-tag deferral ───

test('intent: unknown intent falls back to missionary base (never throws)', () => {
    assert.equal(resolvePoseIntent('helicopter_spin', 'pen'), 'missionary_base');
    assert.equal(resolvePoseIntent('COWGIRL', 'pen'), 'cowgirl_pen');
    assert.equal(resolvePoseIntent('facesitting', 'pen'), 'sitting_on_face_pen');
});

test('intent: isKnownPositionIntent gates registry membership', () => {
    assert.ok(isKnownPositionIntent('cowgirl'));
    assert.ok(isKnownPositionIntent('sitting_on_face'));
    assert.ok(!isKnownPositionIntent('none'));
    assert.ok(!isKnownPositionIntent('helicopter_spin'));
    assert.ok(!isKnownPositionIntent(''));
});

// ─── v2.6.26 REPLACEMENT semantics (the D1 killer-bug fix) ───

test('replacement: applyPositionTags REPLACES LLM-authored pose/camera/gaze/expression tags', () => {
    const bundle = assemblePositionBundle({ intent: 'cowgirl', intensity: 'pen', pairing: 'MF' });
    const res = applyPositionTags('selfie, smile, cowgirl position, pov', bundle);
    assert.ok(res.injected.length > 0, 'a fired directive always injects its own bundle');
    assert.deepEqual(res.replaced, ['selfie', 'smile', 'pov']);
    assert.ok(res.absorbed.includes('cowgirl position'), 'her authored tag identical to a bundle tag is absorbed, not "replaced"');
    assert.equal(res.result.split(', ').filter((t) => t === 'cowgirl position').length, 1, 'the tuned bundle owns the pose segment exactly once');
    assert.ok(res.result.includes('dick insertion'));
    assert.ok(!res.result.includes('selfie'), 'stale composition tag is replaced, not kept');
});

test('replacement: authored composition tags (selfie/smile) are replaced, not kept', () => {
    const bundle = assemblePositionBundle({ intent: 'cowgirl', intensity: 'pen', pairing: 'MF' });
    const res = applyPositionTags('selfie, smile', bundle);
    assert.ok(res.injected.length > 0);
    assert.ok(res.result.includes('cowgirl position'));
    assert.deepEqual(res.replaced, ['selfie', 'smile']);
});

test('replacement: outfit + scene segments are never touched', () => {
    const bundle = assemblePositionBundle({ intent: 'cowgirl', intensity: 'pen', pairing: 'MF' });
    const res = applyPositionTags('black dress, smile, cowgirl position, outdoors, night', bundle);
    assert.ok(res.result.includes('black dress'));
    assert.ok(res.result.includes('outdoors'));
    assert.ok(res.result.includes('night'));
    assert.ok(res.replaced.includes('smile'));
    assert.ok(res.absorbed.includes('cowgirl position'), 'identical pose tag absorbed');
    assert.ok(!res.replaced.includes('cowgirl position'), 'absorbed tags are never reported as replaced');
    assert.ok(!res.replaced.includes('black dress'));
    assert.ok(!res.replaced.includes('outdoors'));
});

// ─── v2.6.26 in-slot splice ordering (the D2 fix — Master's recipe) ───

test('splice: the bundle lands at the LLM pose slot — BEFORE scene tags', () => {
    const bundle = assemblePositionBundle({ intent: 'doggystyle', intensity: 'pen', pairing: 'MF' });
    const res = injectPositionIntoTagList(['nude', 'standing', 'blush', 'bedroom', 'night'], bundle);
    const idxPose = res.list.indexOf('doggystyle');
    const idxEnv = res.list.indexOf('bedroom');
    assert.ok(idxPose !== -1, 'bundle spliced in');
    assert.ok(idxEnv !== -1, 'scene anchor kept');
    assert.ok(idxPose < idxEnv, `pose segment must sit BEFORE scene tags: ${res.list.join(', ')}`);
    assert.ok(res.list.indexOf('nude') < idxPose, 'outfit stays in front of the pose segment');
    assert.deepEqual(res.replaced, ['standing', 'blush']);
});

test('splice: no authored pose segment → bundle splices before the first env tag', () => {
    const bundle = assemblePositionBundle({ intent: 'cowgirl', intensity: 'pen', pairing: 'MF' });
    const res = injectPositionIntoTagList(['nude', 'fishnet thighhighs', 'classroom', 'sunset'], bundle);
    const idxPose = res.list.indexOf('cowgirl position');
    const idxEnv = res.list.indexOf('classroom');
    assert.ok(idxPose !== -1 && idxEnv !== -1 && idxPose < idxEnv, `${res.list.join(', ')}`);
    assert.deepEqual(res.replaced, []);
});

test('splice: bundle tags identical to a survivor are deduped, never double-injected', () => {
    const bundle = assemblePositionBundle({ intent: 'cowgirl', intensity: 'pen', pairing: 'MF' });
    assert.ok(bundle.tags.includes('sweaty'), 'precondition: bundle carries sweaty');
    const dupe = injectPositionIntoTagList(['nude', 'sweaty', 'classroom'], bundle);
    assert.equal(dupe.list.filter((t) => t === 'sweaty').length, 1, 'duplicate collapsed');
    assert.equal(dupe.injected.includes('sweaty'), false, 'survivor duplicate not re-injected');
    assert.ok(dupe.injected.length > 0, 'the rest of the bundle still injects');
});

test('absorb: her authored tag identical to a bundle tag is absorbed, never reported as replaced', () => {
    const detection = { bundle: 'pussy, straddling, from below', tags: ['pussy', 'straddling', 'from below'] };
    const res = injectPositionIntoTagList(['nude', 'straddling', 'looking at viewer', 'bedroom'], detection);
    assert.ok(res.absorbed.includes('straddling'), 'the identical tag is absorbed');
    assert.ok(!res.replaced.includes('straddling'), 'the identical tag is not a "replacement"');
    assert.ok(res.replaced.includes('looking at viewer'), 'genuine gaze tags are still replaced');
    assert.equal(res.list.filter((t) => t === 'straddling').length, 1, 'exactly one straddling survives');
    assert.ok(res.injected.includes('from below'), 'the rest of the bundle still injects');
});

test('pinned bundle: pairing guillotine + conflict matrix + cap, fail-closed on junk', () => {
    const ff = assemblePinnedBundle('pussy, cowgirl position, straddling, dick insertion, from below', 'FF');
    assert.ok(ff, 'a valid bundle assembles');
    assert.ok(ff.tags.includes('cowgirl position'));
    assert.ok(!ff.bundle.includes('dick insertion'), 'male anatomy stripped for FF');
    const capped = assemblePinnedBundle(Array.from({ length: 12 }, (_, i) => `tag${i}`).join(', '), 'MF');
    assert.equal(capped.tags.length, 10, 'CLIP budget cap honored');
    const conflicted = assemblePinnedBundle('cowgirl position, from below, from above', 'MF');
    assert.ok(conflicted.tags.includes('from below'));
    assert.ok(!conflicted.tags.includes('from above'), 'mutually exclusive camera tags collapse');
    assert.equal(assemblePinnedBundle('', 'MF'), null, 'empty input fails closed');
    assert.equal(assemblePinnedBundle(null, 'MF'), null, 'null input fails closed');
});

test('splice: no directive → list passes through untouched (fail-closed)', () => {
    const res = injectPositionIntoTagList(['nude', 'smile', 'beach'], null);
    assert.deepEqual(res.list, ['nude', 'smile', 'beach']);
    assert.equal(res.injected.length, 0);
    assert.equal(res.replaced.length, 0);
});

test('existing: hasExistingPositionTag detects authored danbooru positions', () => {
    assert.ok(hasExistingPositionTag('selfie, doggystyle'));
    assert.ok(hasExistingPositionTag('pov, missionary'));
    assert.ok(!hasExistingPositionTag('selfie, smile, beach'));
});


// ─── XML judge parsing + OOB validator (fail closed) ───

test('xml: envelope parses with prose wrapper, fences and case noise', () => {
    const d = parsePositionDirectiveXml('Sure! ```xml\n<position_directive><pose_intent>Cowgirl Position</pose_intent><intensity>PEN</intensity><gaze>eye_contact</gaze><expression>smug</expression><state>nude_full</state></position_directive>\n``` hope this helps');
    assert.ok(d);
    assert.equal(d.pose_intent, 'cowgirl_position');
    assert.equal(d.intensity, 'pen');
    assert.equal(d.expression, 'smug');
});

test('xml: junk / empty / refuse → null (fail closed)', () => {
    assert.equal(parsePositionDirectiveXml('i am a teapot'), null);
    assert.equal(parsePositionDirectiveXml(''), null);
    assert.equal(parsePositionDirectiveXml(null), null);
    assert.equal(parsePositionDirectiveXml('<position_directive></position_directive>'), null);
});

test('xml: JSON transport fallback still parses', () => {
    const d = parsePositionDirectiveXml('{"pose_intent": "doggystyle", "intensity": "pen", "expression": "panting"}');
    assert.ok(d);
    assert.equal(d.pose_intent, 'doggystyle');
    assert.equal(d.intensity, 'pen');
    assert.equal(d.expression, 'panting');
});

test('oob validator: positionDirect accepts known intents, kills junk and unknowns', () => {
    const ok = OOB_VALIDATORS.positionDirect({ rawReply: '<position_directive><pose_intent>sitting_on_face</pose_intent><intensity>pen</intensity><gaze>looking_down</gaze><expression>smug</expression><state>nude_full</state></position_directive>' });
    assert.ok(ok);
    assert.equal(ok.pose_intent, 'sitting_on_face');
    assert.equal(ok.expression, 'smug', 'expression rides through the validator for assembly');
    assert.equal(OOB_VALIDATORS.positionDirect({ rawReply: '<position_directive><pose_intent>none</pose_intent></position_directive>' }), null);
    assert.equal(OOB_VALIDATORS.positionDirect({ rawReply: 'blorp blorp' }), null);
    assert.equal(OOB_VALIDATORS.positionDirect({ rawReply: '<position_directive><pose_intent>quantum_entangle</pose_intent></position_directive>' }), null);
    assert.equal(OOB_VALIDATORS.positionDirect(null), null);
});

// ─── Canonical danbooru spellings (live-verified Oct 2026) ───

test('canonical: alias `facesitting` is never emitted — composition is', () => {
    const b = assemblePositionBundle({ intent: 'sitting_on_face', intensity: 'pen', pairing: 'MF' });
    assert.ok(!/\bfacesitting\b/i.test(b.bundle));
    assert.ok(b.bundle.includes('directly above'));
});

test('canonical: doggystyle pen emits `sex from behind`', () => {
    const b = assemblePositionBundle({ intent: 'doggystyle', intensity: 'pen', pairing: 'MF' });
    assert.ok(b.bundle.includes('sex from behind'), b.bundle);
});

// ─── Autonomous Synchronous Resolver & Specificity (Dual-Engine Doctrine) ───

test('canonical: Danbooru tag "sitting on face" matches trigger', () => {
    const hit = detectPositionTrigger('sitting on face, directly above, looking down');
    assert.ok(hit, 'canonical tag must match');
    assert.equal(hit.id, 'sitting_on_face');
});

test('specificity: compound position "reverse cowgirl" beats generic "cowgirl"', () => {
    const hit = detectPositionTrigger('reverse cowgirl position, rear view, looking back');
    assert.ok(hit);
    assert.equal(hit.id, 'reverse_cowgirl', 'compound position must beat generic cowgirl');
});

test('specificity: compound position "standing doggystyle" beats generic "doggystyle"', () => {
    const hit = detectPositionTrigger('standing doggystyle, bent over, looking back');
    assert.ok(hit);
    assert.equal(hit.id, 'standing_doggystyle', 'compound position must beat generic doggystyle');
});

test('autonomous: resolves from authored tags alone without dialogue', () => {
    const res = resolvePositionDirectiveFromContext(['nude', 'cowgirl position', 'straddling', 'looking at viewer'], {
        contextText: '',
        waifu: { name: 'Mika', personality: 'playful, catgirl, teasing' },
        explicitMode: 2,
        userGender: 'male'
    });
    assert.ok(res, 'must resolve from tags alone');
    assert.equal(res.meta.intent, 'cowgirl');
    assert.ok(res.bundle.includes('cowgirl position'));
    assert.ok(res.bundle.includes('from below'));
    assert.equal(res.meta.expression, 'smug');
});

test('autonomous: resolves from dialogue context alone without authored pose tags', () => {
    const res = resolvePositionDirectiveFromContext(['nude', 'bed', 'night'], {
        contextText: 'Master: come sit on my face right now\nShe: with pleasure~',
        waifu: { name: 'Lala', personality: 'bratty, confident, teasing' },
        explicitMode: 2,
        userGender: 'male'
    });
    assert.ok(res, 'must resolve from dialogue context');
    assert.equal(res.meta.intent, 'sitting_on_face');
    assert.ok(res.bundle.includes('directly above'));
    assert.ok(res.bundle.includes('looking down'));
});

test('autonomous: intensity scaling — pen for explicitMode 3, pen for active sex words, base otherwise', () => {
    const extreme = resolvePositionDirectiveFromContext(['nude', 'cowgirl position'], { explicitMode: 3 });
    assert.equal(extreme.meta.intensity, 'pen');
    assert.ok(extreme.bundle.includes('dick insertion'));
    assert.ok(extreme.bundle.includes('sweaty'));

    const nudeWithSex = resolvePositionDirectiveFromContext(['nude', 'cowgirl position'], {
        contextText: 'riding you hard and deep, moaning',
        explicitMode: 2
    });
    assert.equal(nudeWithSex.meta.intensity, 'pen');
    assert.ok(nudeWithSex.bundle.includes('dick insertion'));

    const nudeDry = resolvePositionDirectiveFromContext(['nude', 'cowgirl position'], {
        contextText: 'smiling softly on your lap',
        explicitMode: 2
    });
    assert.equal(nudeDry.meta.intensity, 'base');
    assert.ok(!nudeDry.bundle.includes('dick insertion'));
    assert.ok(!nudeDry.bundle.includes('sweaty'));
});

test('autonomous: persona hint drives expression when tags have none', () => {
    const shy = resolvePositionDirectiveFromContext(['nude', 'missionary'], {
        personaHint: 'shy, modest childhood friend, easily embarrassed',
        explicitMode: 2
    });
    assert.equal(shy.meta.expression, 'embarrassed');
    assert.ok(shy.bundle.includes('blush'));

    const bold = resolvePositionDirectiveFromContext(['nude', 'missionary'], {
        personaHint: 'confident, bratty catgirl who loves teasing',
        explicitMode: 2
    });
    assert.equal(bold.meta.expression, 'smug');
    assert.ok(bold.bundle.includes('smug smirk'));
});

test('autonomous: FF pairing enforces allowed positions and never leaks male anatomy', () => {
    // cowgirl is MF/FUTA only -> disallowed for FF, returns null
    const disallowed = resolvePositionDirectiveFromContext(['nude', 'cowgirl position'], {
        contextText: 'riding you, sex, cum',
        explicitMode: 3,
        userGender: 'female',
        waifu: { core_appearance: '1girl, blonde hair' }
    });
    assert.equal(disallowed, null, 'cowgirl is disallowed for FF');

    // doggystyle is allowed for FF -> resolves cleanly without male anatomy
    const allowed = resolvePositionDirectiveFromContext(['nude', 'doggystyle', 'all fours'], {
        contextText: 'from behind, intimacy',
        explicitMode: 3,
        userGender: 'female',
        waifu: { core_appearance: '1girl, blonde hair' }
    });
    assert.ok(allowed, 'doggystyle must resolve for FF');
    assert.equal(allowed.meta.pairing, 'FF');
    assert.ok(!allowed.bundle.includes('dick insertion'));
    assert.ok(!allowed.bundle.includes('penis'));
    assert.ok(allowed.bundle.includes('view from behind'));
});

// ─── v2.6.28 POV eviction + Scene Keeper ───

test('pov eviction: NO bundle emits standalone pov or first person view', () => {
    for (const key of Object.keys(POSE_DICTIONARY)) {
        const bundle = assemblePositionBundle({
            intent: key.replace(/_base$|_pen$/, ''),
            intensity: key.endsWith('_pen') ? 'pen' : 'base',
            pairing: 'MF',
        });
        if (!bundle) continue;
        bundle.tags.forEach((t) => {
            assert.ok(!/^pov$/i.test(t), `${key} still emits standalone pov`);
            assert.ok(!/^first person view$/i.test(t), `${key} still emits first person view`);
        });
    }
});

test('pov eviction: extremity fragments pov hands / pov legs survive', () => {
    const hj = assemblePositionBundle({ intent: 'handjob', intensity: 'base', pairing: 'MF' });
    assert.ok(hj.tags.includes('pov hands'), 'handjob keeps its extremity fragment');
    const lp = assemblePositionBundle({ intent: 'lap_pillow', intensity: 'base', pairing: 'MF' });
    assert.ok(lp.tags.includes('pov legs'), 'lap pillow keeps its extremity fragment');
});

test('pov eviction: her authored pov tags are REPLACED when the engine fires', () => {
    const bundle = assemblePositionBundle({ intent: 'doggystyle', intensity: 'base', pairing: 'MF' });
    const res = applyPositionTags('white loose shirt, pov, first person view, doggystyle, bedroom, night', bundle);
    assert.ok(res.injected.length > 0);
    assert.ok(res.replaced.includes('pov'), 'her pov tag was replaced');
    assert.ok(res.replaced.includes('first person view'), 'her first person view tag was replaced');
    assert.ok(!res.result.split(', ').some((t) => /^pov$/i.test(t) || /^first person view$/i.test(t)), 'no POV pair survives in the result');
});

test('hanger-on: redundant outfit garment dies when bundle state owns the axis', () => {
    const bundle = assemblePositionBundle({ intent: 'sixty_nine', intensity: 'base', pairing: 'MF', state: 'nude_top' });
    assert.ok(bundle.bundle.includes('shirt lift'));
    const res = applyPositionTags('white loose shirt, smile, bedroom, night', bundle);
    assert.ok(res.dropped.includes('white loose shirt'), 'redundant outfit garment dropped');
    assert.ok(!res.result.split(', ').includes('white loose shirt'));
});

test('hanger-on: unrelated garments survive the discipline', () => {
    const bundle = assemblePositionBundle({ intent: 'sixty_nine', intensity: 'base', pairing: 'MF', state: 'nude_top' });
    const res = applyPositionTags('lace panties, smile, bedroom, night', bundle);
    assert.ok(!res.dropped.includes('lace panties'), 'unrelated garment must survive');
    assert.ok(res.result.split(', ').includes('lace panties'));
});

test('scene keeper: env survives a full pen bundle + anatomy at zero unprotected budget', () => {
    const bundle = assemblePositionBundle({ intent: 'doggystyle', intensity: 'pen', pairing: 'MF', expression: 'smug' });
    const env = ['bedroom', 'night'];
    const list = [...bundle.tags, 'white loose shirt', ...env, 'anus'];
    const out = applyEnvShield(list, { protect: [...bundle.tags, 'anus'], envProtect: env, budget: 12 });
    assert.ok(out.includes('bedroom'), 'M.E.O.W. location must survive');
    assert.ok(out.includes('night'), 'time lighting must survive');
    bundle.tags.forEach((t) => assert.ok(out.includes(t), `bundle tag lost: ${t}`));
    assert.ok(out.length <= 12, `over budget: ${out.length}`);
});

test('scene keeper: guarantee tags are re-appended when upstream trims dropped them', () => {
    const bundle = assemblePositionBundle({ intent: 'cowgirl', intensity: 'pen', pairing: 'MF' });
    const env = ['bedroom', 'night'];
    const list = [...bundle.tags, 'white loose shirt']; // env already yeeted upstream
    const out = applyEnvShield(list, { protect: bundle.tags, envProtect: env, budget: 12 });
    assert.ok(out.includes('bedroom'), 'dropped location re-appended');
    assert.ok(out.includes('night'), 'dropped lighting re-appended');
});

test('scene keeper: outfit dies FIRST when the budget is truly tight', () => {
    const bundle = assemblePositionBundle({ intent: 'cowgirl', intensity: 'pen', pairing: 'MF', expression: 'smug' });
    const env = ['bedroom', 'night'];
    const list = [...bundle.tags, 'white loose shirt', 'lace panties', ...env, 'anus'];
    const out = applyEnvShield(list, { protect: [...bundle.tags, 'anus'], envProtect: env, budget: 12 });
    assert.ok(out.includes('bedroom') && out.includes('night'), 'env always survives');
    bundle.tags.forEach((t) => assert.ok(out.includes(t), `bundle tag lost: ${t}`));
    assert.ok(out.length <= 12, `over budget: ${out.length}`);
});

test('scene keeper: byte-identical legacy cap-10 with no protectors', () => {
    const plain = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];
    assert.deepEqual(applyEnvShield(plain, {}), plain.slice(0, 10), 'regular photos keep the legacy cap-10');
    assert.deepEqual(applyEnvShield(plain, { budget: 12 }), plain.slice(0, 10), 'budget 12 does not stretch unprotected lists');
    // Deep Prompt Encoder (budget > 12): unprotected lists expand to the deep budget
    const expanded = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o'];
    assert.deepEqual(applyEnvShield(expanded, { budget: 14 }), expanded.slice(0, 14), 'deep budget > 12 honors higher budget');
});

// ─── v2.6.29 Position Packs (themed builtin packs + forge/import) ───

test('packs: builtin refs resolve and fire through the merged registry', () => {
    syncPositionPacks([{ id: 'builtin_mounts', name: 'MOUNTS', enabled: true, positions: [{ id: 'cowgirl' }] }]);
    const hit = detectPositionTrigger('ride me cowgirl style');
    assert.ok(hit, 'builtin ref stays armed through the pack');
    assert.equal(hit.id, 'cowgirl');
    assert.equal(detectPositionTrigger('sit on my face'), null, 'sitting_on_face is not in any synced pack → disarmed');
    resetPositionPackSync();
});

test('packs: disabling a pack disarms its positions (fail-closed)', () => {
    syncPositionPacks([{ id: 'p1', enabled: false, positions: [{ id: 'cowgirl' }] }]);
    assert.equal(detectPositionTrigger('ride me cowgirl'), null, 'disabled pack never fires');
    resetPositionPackSync();
});

test('packs: inline custom def triggers, validates, and assembles its own bundle', () => {
    syncPositionPacks([{ id: 'tentacles', name: 'TENTACLES', enabled: true, positions: [{ id: 'tentacle_ride', name: 'Tentacle Ride', keywords: ['tentacle'], bundle: 'pussy, tentacles, straddling, from above, ahegao', minExplicit: 3, pairings: ['MF', 'FUTA'] }] }]);
    const hit = detectPositionTrigger('a tentacle rides her hard');
    assert.ok(hit, 'custom keyword fires');
    assert.equal(hit.id, 'tentacle_ride');
    assert.ok(isKnownPositionIntent('tentacle_ride'), 'OOB validator path accepts custom ids');
    assert.equal(isKnownPositionIntent('quantum_entangle'), false);
    const b = assemblePositionBundle({ intent: 'tentacle_ride', pairing: 'MF' });
    assert.ok(b.bundle.includes('tentacles'), 'custom bundle assembles');
    assert.ok(assemblePositionBundle({ intent: 'tentacle_ride', pairing: 'FF' }), 'pairing-legal assembly survives');
    resetPositionPackSync();
});

test('packs: keyword literals are escaped (no regex injection)', () => {
    syncPositionPacks([{ id: 'evil', enabled: true, positions: [{ id: 'evil_pin', keywords: ['(.*', 'pin me'], bundle: 'pussy, pinning, eye level' }] }]);
    assert.equal(detectPositionTrigger('anything at all'), null, 'broken regex keyword is inert');
    const hit = detectPositionTrigger('please pin me down');
    assert.ok(hit && hit.id === 'evil_pin', 'plain phrase still matches');
    resetPositionPackSync();
});

test('packs: an edited builtin shadows the registry bundle AND keywords', () => {
    syncPositionPacks([{ id: 'edit', enabled: true, positions: [{ id: 'cowgirl', name: 'Cowgirl (Master Edit)', keywords: ['ride the boss'], bundle: 'pussy, cowgirl position, straddling, from below, looking at viewer, utterly smug' }] }]);
    const b = assemblePositionBundle({ intent: 'cowgirl', pairing: 'MF' });
    assert.ok(b.bundle.includes('utterly smug'), 'the edited shadow wins over the registry');
    const hit = detectPositionTrigger('ride the boss');
    assert.ok(hit && hit.id === 'cowgirl', 'the edited KEYWORDS fire through the trigger scan');
    assert.ok(!getActivePositions().some((p) => p.id === 'cowgirl' && !p.isCustom), 'the factory registry def is fully replaced (no double-fire)');
    resetPositionPackSync();
});

test('packs: copy + builtin coexist — copy def wins, builtin siblings stay armed', () => {
    syncPositionPacks([
        { id: 'builtin_mounts', enabled: true, positions: [{ id: 'cowgirl' }, { id: 'sitting_on_face' }] },
        { id: 'pospack_copy', enabled: true, positions: [{ id: 'cowgirl', keywords: ['copygirl'], bundle: 'pussy, cowgirl position, copy variant' }] },
    ]);
    const hit = detectPositionTrigger('copygirl time');
    assert.ok(hit && hit.id === 'cowgirl', 'the copy fires on its own keywords');
    const b = assemblePositionBundle({ intent: 'cowgirl', pairing: 'MF' });
    assert.ok(b.bundle.includes('copy variant'), 'first inline def wins over the factory bundle');
    assert.ok(detectPositionTrigger('sit on my face')?.id === 'sitting_on_face', 'builtin siblings unaffected');
    resetPositionPackSync();
});

// ─── v2.6.31 trigger enrichment: plural variants + signature tags + theme fallback ───

test('packs: THEME FALLBACK fires the pack when keywords miss', () => {
    syncPositionPacks([{ id: 'tentacles', name: 'TENTACLES', theme: 'tentacles', enabled: true, positions: [
        { id: 'tentacle_lift', keywords: ['lifted by tentacles'], bundle: 'pussy, tentacles, lifted, from above' },
        { id: 'tentacle_pin', keywords: ['pinned by tentacles'], bundle: 'pussy, tentacles, pinned to wall, eye level' },
    ] }]);
    const hit = detectPositionTrigger('the tentacles lift you higher');
    assert.ok(hit, 'theme word fires the pack even when no keyword matches');
    assert.ok(['tentacle_lift', 'tentacle_pin'].includes(hit.id), `pack position fired: ${hit.id}`);
    const res = resolvePositionDirectiveFromContext(['nude'], { contextText: 'the tentacles lift you higher', explicitMode: 2 });
    assert.ok(res && res.meta.intent.startsWith('tentacle_'), 'autonomous resolver fires the pack');
    assert.ok(res.bundle.includes('tentacles'), 'the custom bundle assembles');
    resetPositionPackSync();
});

test('packs: signature bundle tags fire in tag space', () => {
    syncPositionPacks([{ id: 'shibari', name: 'SHIBARI', theme: 'shibari', enabled: true, positions: [{ id: 'shibari_hang', keywords: ['shibari'], bundle: 'pussy, shibari rope, suspended, from above' }] }]);
    const hit = detectPositionTrigger('selfie, smile, shibari rope, bedroom');
    assert.ok(hit && hit.id === 'shibari_hang', 'signature bundle tag fires from her authored tags');
    resetPositionPackSync();
});

test('packs: plural variants match both keyword and prose forms', () => {
    syncPositionPacks([{ id: 'rides', name: 'RIDES', theme: 'rides', enabled: true, positions: [{ id: 'tentacle_ride', keywords: ['tentacle rides'], bundle: 'pussy, tentacles, straddling' }] }]);
    assert.ok(detectPositionTrigger('a tentacle ride for you'), 'singular prose matches plural keyword');
    resetPositionPackSync();
});

test('packs: keyword boundaries — literal keywords never fire inside larger words', () => {
    syncPositionPacks([{ id: 'x', enabled: true, positions: [{ id: 'lap_dance', keywords: ['lap'], bundle: 'sitting on lap, lap pillow', minExplicit: 1 }] }]);
    assert.ok(detectPositionTrigger('she plops down right on my lap'), 'plain prose still fires');
    assert.ok(detectPositionTrigger('sit on my laps'), 'plural variant still fires');
    assert.equal(detectPositionTrigger('my laptop is right there'), null, 'laptop must NOT fire a lap trigger');
    assert.equal(detectPositionTrigger('the timeline collapsed'), null, 'collapse must NOT fire a lap trigger');
    resetPositionPackSync();
});

test('packs: autonomous resolver honors the minExplicit ceiling', () => {
    syncPositionPacks([{ id: 'x', enabled: true, positions: [{ id: 'extreme_only', keywords: ['extreme only'], bundle: 'pussy, extreme act', minExplicit: 3 }] }]);
    assert.equal(resolvePositionDirectiveFromContext(['nude'], { contextText: 'extreme only right now', explicitMode: 2 }), null, 'below the pack ceiling → null');
    const res = resolvePositionDirectiveFromContext(['nude'], { contextText: 'extreme only right now', explicitMode: 3 });
    assert.ok(res && res.meta.intent === 'extreme_only', 'at ceiling → fires');
    resetPositionPackSync();
});

test('packs: weak theme tokens never fire (stoplist)', () => {
    syncPositionPacks([{ id: 'timepack', name: 'TIME', theme: 'time', enabled: true, positions: [{ id: 'time_pos', keywords: ['time warp'], bundle: 'pussy, time warp act' }] }]);
    assert.equal(detectPositionTrigger('dinner time with the family'), null, 'generic token never fires');
    assert.ok(detectPositionTrigger('time warp us away')?.id === 'time_pos', 'real keyword still fires');
    resetPositionPackSync();
});

test('packs: a minimal 2-tag bundle is valid (LLM tolerance)', () => {
    syncPositionPacks([{ id: 'min', enabled: true, positions: [{ id: 'tentacle_hug', keywords: ['tentacle'], bundle: 'pussy, tentacles' }] }]);
    const hit = detectPositionTrigger('hug the tentacles');
    assert.ok(hit && hit.id === 'tentacle_hug', 'minimal bundle fires');
    resetPositionPackSync();
});

test('packs: validatePositionPack rejects banned vocabulary + identity tags, cleans the rest', () => {
    const bad = validatePositionPack({ name: 'Bad Pack', positions: [
        { id: 'a', keywords: ['x'], bundle: 'pussy, pov, first person view', minExplicit: 2 },
        { id: 'b', keywords: ['y'], bundle: 'vaginal, missionary, on back', minExplicit: 2 },
        { id: 'c', keywords: ['z'], bundle: 'pussy, pink hair, smile', minExplicit: 2 },
    ] });
    assert.equal(bad.ok, false);
    assert.equal(bad.positions.length, 0);
    assert.equal(bad.skipped, 3);
    const good = validatePositionPack({ name: 'Good Pack', theme: 'Tentacles!', positions: [
        { id: 'Tentacle Ride', keywords: ['tentacle ride', 'tentacle ride', 'x'], bundle: 'pussy, tentacles, straddling, from above', minExplicit: 9, pairings: ['MF'] },
    ] });
    assert.equal(good.ok, true);
    assert.equal(good.positions[0].id, 'tentacle_ride');
    assert.equal(good.theme, 'tentacles_');
    assert.equal(good.positions[0].keywords.length, 2, 'duplicate keywords deduped');
    assert.equal(good.positions[0].minExplicit, 3, 'minExplicit clamped');
});



// ─── v2.7.41 Presence Law: applyPresencePolicy ───

test('presence: apart strips POV family + male tags and asserts solo', () => {
    const out = applyPresencePolicy('pov hands, handjob, lying on bed, smile');
    assert.deepEqual(out, ['lying on bed', 'smile', 'solo']);
});

test('presence: multi-girl scenes never get the solo tag', () => {
    const out = applyPresencePolicy('2girls, pov hands, hug');
    assert.deepEqual(out, ['2girls', 'hug']);
});

test('presence: clean list only gains solo; existing solo never duplicated', () => {
    assert.deepEqual(applyPresencePolicy('selfie, beach'), ['selfie', 'beach', 'solo']);
    assert.deepEqual(applyPresencePolicy('solo, selfie'), ['solo', 'selfie']);
});

// ─── ✨ v2.7.49 Presence Law: the solo-legal carve-out ───

test('presence carve-out: solo-legal presenting bundle keeps its pose, sheds partner fragments', () => {
    // The App's apart branch now RESCUES directives whose registry entry allows the SOLO
    // pairing (an apart verdict = no user in frame, not "no pose at all"), then
    // applyPresencePolicy scrubs POV/partner fragments from the spliced list.
    const out = applyPresencePolicy('pussy, presenting, all fours, view from behind, looking back, pov, 1boy');
    for (const t of ['pussy', 'presenting', 'all fours', 'view from behind', 'looking back', 'solo']) {
        assert.ok(out.includes(t), `solo-legal bundle kept: ${t}`);
    }
    for (const t of ['pov', '1boy']) {
        assert.ok(!out.includes(t), `partner fragment stripped: ${t}`);
    }
});

test('presence carve-out: presenting is registry-solo-legal (the invariant the App carve-out rides)', () => {
    const def = POSITIONS.find((p) => p.id === 'presenting');
    assert.ok(def, 'presenting exists in the registry');
    assert.ok(def.allowedPairings.includes('SOLO'), 'presenting may be held alone — it must survive an apart verdict');
});

// ─── ✨ v2.7.50 The Pose Warrant ───

test('warrant: an explicit registry keyword in the CURRENT exchange is an explicit warrant', () => {
    const res = classifyPoseWarrant({ turnText: 'she braces on all fours and looks back — presenting for him', sceneText: '', heatRank: 0, presence: 'together' });
    assert.equal(res.warrant, 'explicit');
    assert.ok(res.hit && res.hit.id, 'the hit rides the verdict for the gate');
});

test('warrant: heat rank ≥ 3 (Heated) together is an intimate warrant even keyword-less', () => {
    const res = classifyPoseWarrant({ turnText: 'casual chat about dinner plans', sceneText: 'no pose words here', heatRank: 3, presence: 'together' });
    assert.equal(res.warrant, 'intimate');
});

test('warrant: casual scene stands the engine down — calm, no keywords, alone', () => {
    const res = classifyPoseWarrant({ turnText: 'haha nice, tell me more about your day', sceneText: 'selfie, smile, bedroom', heatRank: 0, presence: 'apart', explicitMode: 3 });
    assert.equal(res.warrant, 'casual');
    assert.equal(res.hit, null);
});

test('warrant: her authored pose words warrant only when TOGETHER (D1 mid-act kept, apart deferred)', () => {
    const together = classifyPoseWarrant({ turnText: '', sceneText: 'presenting, all fours, looking back', heatRank: 0, presence: 'together' });
    assert.equal(together.warrant, 'intimate', 'mid-act authored tags keep the D1 law when together');
    const apart = classifyPoseWarrant({ turnText: '', sceneText: 'presenting, all fours, looking back', heatRank: 0, presence: 'apart' });
    assert.equal(apart.warrant, 'casual', 'apart + no heat + no turn keywords = no warrant');
});

test('warrant: garbage inputs fail closed to casual', () => {
    assert.equal(classifyPoseWarrant({}).warrant, 'casual');
    assert.equal(classifyPoseWarrant({ turnText: null, sceneText: undefined, heatRank: NaN, presence: 7 }).warrant, 'casual');
});

test('warrant: intimacy signal words in the scene text warrant when together (explicitMode gate)', () => {
    const on = classifyPoseWarrant({ turnText: '', sceneText: 'naked, undressing on the bed', heatRank: 1, presence: 'together', explicitMode: 2 });
    assert.equal(on.warrant, 'intimate');
    const off = classifyPoseWarrant({ turnText: '', sceneText: 'naked, undressing on the bed', heatRank: 1, presence: 'together', explicitMode: 0 });
    assert.equal(off.warrant, 'casual', 'below the explicit ceiling the raw signal is not trusted');
});
