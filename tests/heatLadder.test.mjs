// ✨ MIKA'S HEAT LADDER TESTS ✨ — pure doctrine: normalization never throws,
// thresholds are strict, the context line costs zero tokens below Flustered.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    HEAT_LEVELS, HEAT_PROMPT_RULE, normalizeHeatWord, heatInfo, heatRank,
    heatMeets, heatContextLine, heatCarryLine, heatSuggestionNote, titleCaseId,
} from '../src/utils/heatLadder.js';

test('ladder: five ordered levels with colors, Feverish alone pulses', () => {
    assert.equal(HEAT_LEVELS.length, 5);
    assert.deepEqual(HEAT_LEVELS.map((l) => l.word), ['Calm', 'Warm', 'Flustered', 'Heated', 'Feverish']);
    for (let i = 0; i < HEAT_LEVELS.length; i++) {
        assert.equal(HEAT_LEVELS[i].rank, i);
        assert.match(HEAT_LEVELS[i].color, /^#[0-9A-F]{6}$/i);
    }
    assert.equal(HEAT_LEVELS.filter((l) => l.pulse).length, 1);
    assert.ok(HEAT_LEVELS.find((l) => l.pulse).word === 'Feverish');
});

test('normalize: exact words, any case, punctuation junk', () => {
    for (const l of HEAT_LEVELS) {
        assert.equal(normalizeHeatWord(l.word.toUpperCase()), l.word);
        assert.equal(normalizeHeatWord(` ${l.word}!! `), l.word);
    }
});

test('normalize: LLM improvisations map onto the ladder (incl. feaverish)', () => {
    assert.equal(normalizeHeatWord('feaverish'), 'Feverish'); // Master's spelling survives
    assert.equal(normalizeHeatWord('horny'), 'Feverish');
    assert.equal(normalizeHeatWord('dripping'), 'Feverish');
    assert.equal(normalizeHeatWord('very hot!!'), 'Heated');
    assert.equal(normalizeHeatWord('turned on'), 'Heated');
    assert.equal(normalizeHeatWord('blushing'), 'Flustered');
    assert.equal(normalizeHeatWord('ice cold'), 'Calm');
    assert.equal(normalizeHeatWord('curious'), 'Warm');
});

test('normalize: junk fails SOFT to fallback, never throws', () => {
    assert.equal(normalizeHeatWord('banana'), 'Calm');
    assert.equal(normalizeHeatWord('banana', 'Heated'), 'Heated');
    assert.equal(normalizeHeatWord('', 'Flustered'), 'Flustered');
    assert.equal(normalizeHeatWord(null, 'Warm'), 'Warm');
    assert.equal(normalizeHeatWord(undefined), 'Calm');
});

test('heatInfo/heatRank: unknown -> Calm (rank 0), order is strict', () => {
    assert.equal(heatInfo('nonsense').word, 'Calm');
    assert.equal(heatRank('Feverish') > heatRank('Heated'), true);
    assert.equal(heatMeets('Flustered', 'Flustered'), true);
    assert.equal(heatMeets('Warm', 'Flustered'), false);
    assert.equal(heatMeets('Feverish', 'Heated'), true);
    assert.equal(heatMeets('Calm', 'Calm'), true);
});

test('heatContextLine: zero tokens below Flustered or without packs', () => {
    assert.equal(heatContextLine('Calm', 'Tentacle Horizons'), '');
    assert.equal(heatContextLine('Warm', 'Tentacle Horizons'), '');
    assert.equal(heatContextLine('Heated', ''), '');
});

test('heatContextLine: steer at Flustered, initiate at Heated+', () => {
    const fl = heatContextLine('Flustered', 'Tentacle Horizons (lift/pin)');
    assert.ok(fl.startsWith('[HEAT: Flustered —'));
    assert.ok(fl.includes('subtly steer'));
    const ht = heatContextLine('Heated', 'Tentacle Horizons');
    assert.ok(ht.startsWith('[HEAT: Heated —'));
    assert.ok(ht.includes('the mood is right'));
    assert.ok(heatContextLine('Feverish', 'X').includes('initiate'));
});

// ─── v2.7.48 HEAT CARRY (tail-only, KV-safe — the word must never ride the sysPrompt) ───

test('heatCarryLine: empty word costs zero tokens, valid words carry the exact ladder phrasing', () => {
    assert.equal(heatCarryLine(null), '');
    assert.equal(heatCarryLine(''), '');
    assert.equal(heatCarryLine(undefined), '');
    assert.equal(heatCarryLine('Warm'), '[HEAT: last self-rating was Warm — continue naturally from there]');
    assert.ok(heatCarryLine('Flustered').startsWith('[HEAT: last self-rating was Flustered — continue naturally from there]'));
});

test('heatCarryLine: casing/whitespace is coerced onto the ladder, junk fails soft to zero tokens', () => {
    assert.equal(heatCarryLine('feverish'), '[HEAT: last self-rating was Feverish — continue naturally from there]');
    assert.equal(heatCarryLine('  heated '), '[HEAT: last self-rating was Heated — continue naturally from there]');
    assert.equal(heatCarryLine('banana'), '');
});

test('heatSuggestionNote: distinct non-empty hint per level', () => {
    const notes = HEAT_LEVELS.map((l) => heatSuggestionNote(l.word));
    for (const n of notes) { assert.ok(typeof n === 'string' && n.length > 10); }
    assert.equal(new Set(notes).size, 5);
});

test('titleCaseId: registry ids become display names', () => {
    assert.equal(titleCaseId('sitting_on_face'), 'Sitting On Face');
    assert.equal(titleCaseId('tentacle_lift'), 'Tentacle Lift');
    assert.equal(titleCaseId(''), '');
    assert.equal(titleCaseId(null), '');
});

test('HEAT_PROMPT_RULE: names all five words + the <heat> tag + autonomy', () => {
    for (const l of HEAT_LEVELS) assert.ok(HEAT_PROMPT_RULE.includes(l.word));
    assert.ok(HEAT_PROMPT_RULE.includes('<heat>'));
    assert.ok(HEAT_PROMPT_RULE.includes('FULL autonomy'));
});
