/**
 * ✨ MIKA'S VOICE ENGINE TEST SUITE ✨
 *
 * Plain `node --test` — ZERO new dependencies. Covers the sass-layer contract:
 *  - every family serves non-empty single-line quips for every documented varset
 *  - machine-tag safety: NO angle brackets, square brackets, braces or newlines
 *  - interpolation never leaks {placeholders}
 *  - determinism per seed (after memory reset) + anti-echo freshness
 *  - unknown topics fail soft to the fallback family
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mikaQuip, mikaSanctuaryScript, MIKA_TOPICS, __resetQuipMemory, mikaDisplayName, MIKA_NICKNAMES } from '../src/utils/mikaQuips.js';

const VARSETS = {
    selector: [
        { pose: 'Cowgirl', heat: '' },
        { pose: 'Shibari Suspension', heat: 'Feverish' },
        { pose: '', heat: 'Calm' },
        { pose: '', heat: '' },
        { pose: 'Missionary', heat: 'Warm' },
    ],
    director: [
        { source: 'suggest_pose', intent: 'cowgirl' },
        { source: 'judge', intent: 'sitting_on_face' },
        { source: 'autonomous', intent: 'sixty_nine' },
        { source: 'weird_source', intent: '' },
        {},
    ],
    rescue: [{}, {}],
    guarantee: [{}, {}],
    imageReport: [{}, {}],
    scanner: [{}, {}],
    chaos: [{ event: 'wandering_hand' }, { event: 'puppeteer' }, {}],
    poked: [{ count: 3 }, { count: 8 }, { count: 12 }, {}],
    misquote: [{ direction: 'char' }, { direction: 'user' }, {}],
    ambient: [{}, {}],
    dragged: [{}, {}],
    pet: [{ count: 0 }, { count: 2 }, { count: 4 }, { count: 7 }],
    bite: [{}, {}],
    sated: [{}, {}],
    drop: [{}, {}],
    climb: [{}, {}],
    swipeRoast: [{ name: 'Nyx', trope: 'yandere' }, { name: 'Seraphina', trope: 'tsundere' }, {}],
    chatWatch: [{ name: 'Nyx', heat: 'Feverish' }, { name: 'Seraphina', heat: 'Calm' }, { name: 'Aria', heat: 'Warm' }, {}],
    matrixTease: [{}, {}],
    matrixPhase4: [{}, {}],
    matrixBoss: [{}, {}],
    fluxConvert: [{}, {}],
};

test('mikaQuip: every family serves non-empty single-line quips for every varset', () => {
    __resetQuipMemory();
    for (const topic of MIKA_TOPICS) {
        VARSETS[topic].forEach((vars, i) => {
            const line = mikaQuip(topic, vars, i + 1);
            assert.ok(typeof line === 'string' && line.length >= 4, `${topic}: quip too short: "${line}"`);
            assert.ok(!line.includes('\n'), `${topic}: single line only: "${line}"`);
            for (const bad of ['<', '>', '[', ']', '{', '}']) {
                assert.ok(!line.includes(bad), `${topic}: machine-tag surface "${bad}" leaked: "${line}"`);
            }
        });
    }
});

test('mikaQuip: deterministic per seed after memory reset', () => {
    __resetQuipMemory();
    const a = mikaQuip('director', { source: 'judge', intent: 'cowgirl' }, 42);
    __resetQuipMemory();
    const b = mikaQuip('director', { source: 'judge', intent: 'cowgirl' }, 42);
    assert.equal(a, b, 'same seed + fresh memory = same quip');
});

test('mikaQuip: freshness — roaming seeds remix instead of repeating', () => {
    __resetQuipMemory();
    const seen = new Set();
    let repeats = 0;
    let immediateRepeats = 0;
    let last = '';
    for (let i = 0; i < 24; i++) {
        const line = mikaQuip('selector', { pose: 'Cowgirl', heat: '' }, 1000 + i);
        if (seen.has(line)) repeats += 1;
        if (line === last) immediateRepeats += 1;
        seen.add(line);
        last = line;
    }
    assert.ok(seen.size >= 16, `remix pool too samey: ${seen.size} unique in 24 serves`);
    assert.ok(repeats <= 9, `repeats too frequent: ${repeats}/24 (expected ~8 by birthday math on a 36-combo pool)`);
    assert.ok(immediateRepeats <= 1, `back-to-back repeats: ${immediateRepeats}`);
});

test('mikaQuip: interpolation never leaks placeholders', () => {
    __resetQuipMemory();
    for (let i = 0; i < 10; i++) {
        assert.ok(!mikaQuip('selector', { pose: 'Suspension', heat: '' }, 500 + i).includes('{'));
        assert.ok(!mikaQuip('director', { source: 'judge', intent: 'sixty_nine' }, 500 + i).includes('{'));
    }
});

test('mikaQuip: heat hijacks serve the Calm/Feverish reserve pools', () => {
    __resetQuipMemory();
    const calm = mikaQuip('selector', { pose: 'Cowgirl', heat: 'Calm' }, 7);
    assert.ok(/calm|ice-cold|fridge|smug no/i.test(calm), `calm flavor expected: ${calm}`);
    const fever = mikaQuip('selector', { pose: 'Cowgirl', heat: 'Feverish' }, 7);
    assert.ok(/feverish|pounce|formality|hurry/i.test(fever), `feverish flavor expected: ${fever}`);
});

test('mikaQuip: unknown topic fails soft to the fallback family', () => {
    const line = mikaQuip('no_such_family', { pose: 'x' }, 1);
    assert.ok(typeof line === 'string' && line.length > 5);
    assert.ok(!line.includes('{'));
});

test('mikaSanctuaryScript: every event yields a well-formed, machine-tag-safe screenplay', () => {
    const events = ['poltergeist', 'wandering_hand', 'dare', 'whisper', 'stagehand', 'puppeteer', 'misquote_char', 'misquote_user'];
    for (const ev of events) {
        const s = mikaSanctuaryScript(ev, {}, ev.length * 13 + 1);
        assert.ok(s.title.includes('SANCTUARY'), `${ev}: sanctuary title expected`);
        assert.ok(s.commentary.length >= 1 && s.commentary.every(l => l.length > 8), `${ev}: commentary too thin`);
        if (ev !== 'misquote_user') assert.ok(s.changes.length >= 1, `${ev}: at least one change line expected`);
        assert.ok(s.outro.length > 8, `${ev}: outro too thin`);
        [...s.commentary, ...s.changes, s.outro].forEach((l) => {
            for (const bad of ['<', '>', '[', ']', '{', '}']) {
                assert.ok(!l.includes(bad), `${ev}: machine-tag surface "${bad}" leaked: "${l}"`);
            }
        });
    }
    const unknown = mikaSanctuaryScript('no_such_event', {}, 1);
    assert.ok(unknown.commentary.length >= 1 && unknown.changes.length >= 1, 'unknown event fails soft to a valid script');
});

// ─── v2.7.56 THE FLARED NAME + THE SUMMON (the chibi's @-menu identity) ───

test('mikaDisplayName: flared name re-rolls and always carries a nickname', () => {
    const a = mikaDisplayName();
    const b = mikaDisplayName();
    assert.ok(a.startsWith('MIKA // '), 'format: MIKA // <nick>');
    assert.ok(b.startsWith('MIKA // '));
    const nickA = a.slice('MIKA // '.length);
    assert.ok(MIKA_NICKNAMES.includes(nickA), 'the nickname comes from the curated list');
    // across many draws both names land (randomization is real, not degenerate)
    const draws = new Set(Array.from({ length: 40 }, () => mikaDisplayName()));
    assert.ok(draws.size >= 2, 're-randomizes across draws');
});

