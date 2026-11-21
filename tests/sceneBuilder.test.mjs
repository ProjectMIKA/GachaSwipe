/**
 * ✨ MIKA'S SCENE BUILDER TEST SUITE — THE SET DRESSER (v2.7.37) ✨
 *
 * Plain `node --test` — ZERO new dependencies. Covers the pure scene engine
 * (src/utils/sceneBuilder.js: daypart bucketing, scene fingerprint, TTL freshness,
 * env merge order/caps, atmosphere strip) AND the fail-closed sceneBuild validator
 * from oobChannel.js — a non-conforming set-dresser reply MUST become null so the
 * legacy env path stands (never guess, never fail-open).
 *
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    daypartBucket,
    sceneFingerprint,
    isSceneFresh,
    mergeSceneIntoEnv,
    sceneAtmosphereTags,
    isIndoorVenue,
    extractPlaceFromText
} from '../src/utils/sceneBuilder.js';
import { OOB_VALIDATORS, OOB_ASKS } from '../src/utils/oobChannel.js';

const at = (h, m = 0) => new Date(2026, 9, 22, h, m, 0);

// ─── daypartBucket ───
test('daypartBucket: buckets the four scene dayparts', () => {
    assert.equal(daypartBucket(at(5)), 'morning');
    assert.equal(daypartBucket(at(6, 30)), 'morning');
    assert.equal(daypartBucket(at(11, 59)), 'morning');
    assert.equal(daypartBucket(at(12)), 'afternoon');
    assert.equal(daypartBucket(at(16, 59)), 'afternoon');
    assert.equal(daypartBucket(at(17)), 'evening');
    assert.equal(daypartBucket(at(21, 59)), 'evening');
    assert.equal(daypartBucket(at(22)), 'night');
    assert.equal(daypartBucket(at(23, 30)), 'night');
    assert.equal(daypartBucket(at(0)), 'night');
    assert.equal(daypartBucket(at(3)), 'night');
});
test('daypartBucket: accepts epoch millis and defaults to now', () => {
    assert.equal(daypartBucket(at(9).getTime()), 'morning');
    assert.ok(['morning', 'afternoon', 'evening', 'night'].includes(daypartBucket()));
});

// ─── sceneFingerprint ───
test('sceneFingerprint: stable, normalized, daypart-sensitive', () => {
    const a = sceneFingerprint({ waifuId: 'nyx', place: '  Rooftop Cafe ', daypart: 'night' });
    const b = sceneFingerprint({ waifuId: 'nyx', place: 'rooftop cafe', daypart: 'night' });
    assert.equal(a, b);
    assert.notEqual(b, sceneFingerprint({ waifuId: 'nyx', place: 'rooftop cafe', daypart: 'morning' }));
    assert.notEqual(b, sceneFingerprint({ waifuId: 'luna', place: 'rooftop cafe', daypart: 'night' }));
});
test('sceneFingerprint: empty parts collapse to ~', () => {
    assert.equal(sceneFingerprint({}), '~:~:unknown');
});

// ─── isSceneFresh ───
test('isSceneFresh: TTL window honored, fail-closed outside', () => {
    const now = Date.now();
    assert.equal(isSceneFresh(null, now), false);
    assert.equal(isSceneFresh({ at: now }, now + 1000), true);
    assert.equal(isSceneFresh({ at: now }, now + 19 * 60 * 1000), true);
    assert.equal(isSceneFresh({ at: now }, now + 20 * 60 * 1000), false);
    assert.equal(isSceneFresh({ at: now + 5000 }, now), false); // future clock skew = not fresh
    assert.equal(isSceneFresh({}, now), false);
});

// ─── mergeSceneIntoEnv ───
test('mergeSceneIntoEnv: venue leads, existing env follows, set fills to cap', () => {
    const scene = {
        venue: ['rooftop cafe'],
        props: ['railing', 'small table'],
        time: ['night'],
        weather: [],
        lighting: ['neon city glow'],
        atmosphere: ['breeze'],
        palette: ['cool palette']
    };
    const merged = mergeSceneIntoEnv(['city skyline', 'rooftop cafe'], scene, 6);
    assert.deepEqual(merged, ['rooftop cafe', 'city skyline', 'railing', 'small table', 'night', 'neon city glow']);
});
test('mergeSceneIntoEnv: cap zero or missing venue = fail-closed passthrough', () => {
    assert.deepEqual(mergeSceneIntoEnv(['park', 'sunset'], null, 4), ['park', 'sunset']);
    assert.deepEqual(mergeSceneIntoEnv(['park'], { venue: [], props: ['bench'] }, 4), ['park']);
    assert.deepEqual(mergeSceneIntoEnv(['park', 'sunset', 'trees', 'path', 'extra'], { venue: ['beach'] }, 4), ['beach', 'park', 'sunset', 'trees']);
});

// ─── sceneAtmosphereTags ───
test('sceneAtmosphereTags: lighting → atmosphere → palette strip; null-safe', () => {
    assert.deepEqual(
        sceneAtmosphereTags({ lighting: ['candlelight'], atmosphere: ['cozy'], palette: ['warm palette'] }),
        ['candlelight', 'cozy', 'warm palette']
    );
    assert.deepEqual(sceneAtmosphereTags(null), []);
});

// ─── OOB_VALIDATORS.sceneBuild (fail-closed set dressing) ───
test('sceneBuild validator: conforms a full good payload', () => {
    const v = OOB_VALIDATORS.sceneBuild({
        venue: 'rooftop cafe, city skyline',
        props: 'railing, small table',
        time_of_day: 'night',
        weather: 'clear sky',
        lighting: 'neon city glow',
        atmosphere: 'quiet breeze',
        palette: 'cool palette'
    });
    assert.ok(v);
    assert.deepEqual(v.venue, ['rooftop cafe', 'city skyline']);
    assert.deepEqual(v.lighting, ['neon city glow']);
    assert.ok(v.flat.includes('rooftop cafe'));
});
test('sceneBuild validator: null venue / junk / non-object = null (absent set)', () => {
    assert.equal(OOB_VALIDATORS.sceneBuild({ venue: '', lighting: 'dim lighting', atmosphere: 'calm' }), null);
    assert.equal(OOB_VALIDATORS.sceneBuild({ lighting: 'dim lighting', atmosphere: 'calm' }), null);
    assert.equal(OOB_VALIDATORS.sceneBuild(null), null);
    assert.equal(OOB_VALIDATORS.sceneBuild('rooftop'), null);
});
test('sceneBuild validator: per-part caps enforced', () => {
    const v = OOB_VALIDATORS.sceneBuild({
        venue: 'rooftop cafe, city skyline, urban district, extra tower',
        props: 'railing, table, chair, lamp, plant, umbrella',
        lighting: 'neon glow, rim lighting, bokeh, lens flare',
        atmosphere: 'calm, breezy, quiet, still'
    });
    assert.ok(v);
    assert.equal(v.venue.length, 3);
    assert.equal(v.props.length, 4);
    assert.equal(v.lighting.length, 3);
    assert.equal(v.atmosphere.length, 3);
});

// ─── v2.7.39 THE INDOOR TIME LAW (context-honesty: no sky visible → no time/weather tags) ───
test('isIndoorVenue: recognized enclosed venues', () => {
    assert.equal(isIndoorVenue(['bedroom']), true);
    assert.equal(isIndoorVenue(['cafe', 'wooden table']), true);
    assert.equal(isIndoorVenue(['her apartment']), true);
    assert.equal(isIndoorVenue(['office']), true);
    assert.equal(isIndoorVenue(['japanese bathhouse']), true);
    assert.equal(isIndoorVenue(['train']), true);
    assert.equal(isIndoorVenue('living room'), true); // comma-string form
    assert.equal(isIndoorVenue(['onsen']), true);
});
test('isIndoorVenue: open-air veto — compound venues with visible sky are NOT indoor', () => {
    assert.equal(isIndoorVenue(['rooftop cafe']), false, 'the sky is right there');
    assert.equal(isIndoorVenue(['beach bar']), false);
    assert.equal(isIndoorVenue(['garden cafe']), false);
    assert.equal(isIndoorVenue(['rooftop', 'cafe']), false, 'veto wins across the whole tag list');
    assert.equal(isIndoorVenue(['outdoor pool']), false);
});
test('isIndoorVenue: open-air venues and empty/unknown fail OPEN (not indoor)', () => {
    assert.equal(isIndoorVenue(['beach']), false);
    assert.equal(isIndoorVenue(['rooftop']), false);
    assert.equal(isIndoorVenue(['city street']), false);
    assert.equal(isIndoorVenue(['park']), false);
    assert.equal(isIndoorVenue(['mountain trail']), false);
    assert.equal(isIndoorVenue([]), false);
    assert.equal(isIndoorVenue(['']), false);
    assert.equal(isIndoorVenue(['somewhere unspecified']), false);
});
test('mergeSceneIntoEnv: indoor venue drops the set time+weather parts (honesty law)', () => {
    const scene = {
        venue: ['bedroom'],
        props: ['messy bed', 'desk'],
        time: ['night'],
        weather: ['rain'],
        lighting: ['warm lamp light'],
        atmosphere: ['cozy'],
        palette: ['warm palette']
    };
    const out = mergeSceneIntoEnv(['pillow'], scene, 8);
    assert.ok(out.includes('bedroom'));
    assert.ok(!out.includes('night'), 'indoor set must not carry a time tag');
    assert.ok(!out.includes('rain'), 'indoor set must not carry weather');
    assert.ok(out.includes('warm lamp light'), 'indoor lighting stays — it IS visible');
});
test('mergeSceneIntoEnv: outdoor venue keeps time+weather parts', () => {
    const scene = {
        venue: ['beach'],
        time: ['sunset'],
        weather: ['clear sky']
    };
    const out = mergeSceneIntoEnv([], scene, 6);
    assert.ok(out.includes('sunset'));
    assert.ok(out.includes('clear sky'));
});
test('sceneBuild validator: indoor venue zeroes time_of_day + weather even if emitted', () => {
    const v = OOB_VALIDATORS.sceneBuild({
        venue: 'bedroom',
        props: 'messy bed, desk',
        time_of_day: 'night',
        weather: 'rain',
        lighting: 'warm lamp light',
        atmosphere: 'cozy'
    });
    assert.ok(v);
    assert.deepEqual(v.time, [], 'indoor venue → time zeroed');
    assert.deepEqual(v.weather, [], 'indoor venue → weather zeroed');
    assert.ok(!v.flat.includes('night'));
    assert.ok(!v.flat.includes('rain'));
    assert.ok(v.flat.includes('warm lamp light'));
});
test('sceneBuild validator: outdoor venue keeps time_of_day', () => {
    const v = OOB_VALIDATORS.sceneBuild({
        venue: 'beach',
        time_of_day: 'sunset',
        lighting: 'golden hour light',
        atmosphere: 'breezy'
    });
    assert.ok(v);
    assert.deepEqual(v.time, ['sunset']);
    assert.ok(v.flat.includes('sunset'));
});

// ─── v2.7.40 PLACE HONESTY (extractPlaceFromText — the dresser's last-resort tier) ───
test('extractPlaceFromText: pulls a named venue from dialogue (the "unspecified location" cure)', () => {
    assert.equal(extractPlaceFromText('She laughs and pulls you into her bedroom, shutting the door.'), 'bedroom');
    assert.equal(extractPlaceFromText('They wander down to the beach as the sun dips low.'), 'beach');
});
test('extractPlaceFromText: returns the LAST mention (most recent place wins)', () => {
    assert.equal(extractPlaceFromText('They started in the kitchen but ended up on the rooftop.'), 'rooftop');
});
test('extractPlaceFromText: fail-closed — no venue-shaped text yields null, never a guess', () => {
    assert.equal(extractPlaceFromText('They talk about feelings and nothing else happens here.'), null);
    assert.equal(extractPlaceFromText(''), null);
    assert.equal(extractPlaceFromText(null), null);
});
test('extractPlaceFromText: output is normalized for the scene fingerprint key', () => {
    assert.equal(extractPlaceFromText('the   Bedroom '), 'bedroom');
    const keyed = sceneFingerprint({ waifuId: 'nyx', place: extractPlaceFromText('back in her bedroom'), daypart: 'night' });
    assert.equal(keyed, 'nyx:bedroom:night', 'extracted place keys identically to an authoritative place string');
});

// ─── v2.7.54 SET DRESSER MEOW GROUNDING (scheduleHint — optional, byte-identical when absent) ───
test('sceneBuild ask: scheduleHint adds the M.E.O.W. routine line', () => {
    const withHint = OOB_ASKS.sceneBuild({
        charName: 'Nova', place: 'arcade', daypart: 'night', recentExcerpt: 'she resets the machines',
        envBudget: 4, deepBudget: 0,
        scheduleHint: 'Working the night shift at the arcade'
    });
    assert.ok(withHint.message.includes('Her M.E.O.W. routine right now: "Working the night shift at the arcade"'));
    assert.ok(withHint.message.includes('arcade'));
});
test('sceneBuild ask: NO scheduleHint = byte-identical legacy ask', () => {
    const legacyArgs = { charName: 'Nova', place: '', daypart: '', recentExcerpt: 'hi', envBudget: 4, deepBudget: 0 };
    const before = OOB_ASKS.sceneBuild({ ...legacyArgs }).message;
    const after = OOB_ASKS.sceneBuild({ ...legacyArgs, scheduleHint: '' }).message;
    assert.equal(after, before);
    assert.ok(before.includes('an unspecified location'));
    assert.ok(!before.includes('M.E.O.W.'));
});
test('sceneBuild ask: oversized scheduleHint is clipped (160c cap)', () => {
    const ask = OOB_ASKS.sceneBuild({ charName: 'N', place: 'cafe', scheduleHint: 'x'.repeat(400) });
    const line = ask.message.split('\n').find((l) => l.includes('M.E.O.W. routine'));
    assert.ok(line.includes('x'.repeat(160)));
    assert.ok(!line.includes('x'.repeat(161)), 'hint clipped to 160 chars');
});

