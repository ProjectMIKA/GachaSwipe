import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    COMPACTION_THRESHOLD,
    COMPACTION_KEEP,
    COMPACTION_RETRY_DISTANCE,
    COMPACTION_EXCERPT_CAP,
    shouldCompact,
    buildCompactionExcerpt,
} from '../src/utils/sessionCompactor.js';

// ─── ✨ MIKA'S SESSION COMPACTOR — the fail-closed window-density gate ✨ ───

test('shouldCompact: unseeded / small / gated sessions never compact', () => {
    assert.equal(shouldCompact(100, undefined), false, 'no session entry = not seeded = ABSENT');
    assert.equal(shouldCompact(100, {}), false, 'no startIndex = not seeded');
    const seeded = { startIndex: 0 };
    assert.equal(shouldCompact(COMPACTION_THRESHOLD - 1, seeded), false, 'below threshold');
    assert.equal(shouldCompact(COMPACTION_THRESHOLD, seeded), true, 'at threshold');
});

test('shouldCompact: in-flight passes and retry cadence gate re-fires', () => {
    const inFlight = { startIndex: 0, compaction: { atCount: 40, inFlight: true } };
    assert.equal(shouldCompact(60, inFlight), false, 'never double-fire a live pass');
    const justTried = { startIndex: 0, compaction: { atCount: 40, inFlight: false } };
    assert.equal(shouldCompact(40 + COMPACTION_RETRY_DISTANCE - 1, justTried), false, 'too soon after an attempt');
    assert.equal(shouldCompact(40 + COMPACTION_RETRY_DISTANCE, justTried), true, 'retry allowed at the distance');
    // an OLD attempt (many messages ago) does not block
    const old = { startIndex: 0, compaction: { atCount: 5, inFlight: false } };
    assert.equal(shouldCompact(COMPACTION_THRESHOLD, old), true);
});

test('buildCompactionExcerpt: window slicing, speaker tags, per-line and total caps', () => {
    const msgs = [
        { role: 'user', content: '  hello\n  there  ' },
        { speakerName: 'Etna', content: 'Kneel, peasant! '.repeat(20) }, // >160 chars → clamped per line
        { role: 'user', content: 'ok' },
        { type: 'photo', content: '' }, // empty content line filtered
    ];
    const out = buildCompactionExcerpt(msgs, 0, 4, 'Etna', 'Master');
    assert.ok(out.startsWith('Master: hello there'), 'user lines tag the user, whitespace collapsed');
    assert.ok(out.includes('Etna: Kneel, peasant!'), 'non-user lines tag the speaker');
    const longLine = out.split('\n').find((l) => l.startsWith('Etna:'));
    assert.ok(longLine.length <= 'Etna: '.length + 160, 'per-line clamp at 160 chars of content');
    // total cap: 40 heavy lines → suffix kept, never beyond the cap
    const flood = Array.from({ length: 40 }, (_, i) => ({ role: 'user', content: `msg ${String(i).padStart(3, '0')} ${'x'.repeat(200)}` }));
    const flooded = buildCompactionExcerpt(flood, 0, 40, 'Etna', 'Master');
    assert.ok(flooded.length <= COMPACTION_EXCERPT_CAP, 'total excerpt respects the cap');
    assert.ok(flooded.includes('msg 039'), 'suffix kept — the most recent context wins');
    assert.ok(!flooded.includes('msg 000'), 'oldest lines fall off first');
    // garbage args fail soft
    assert.equal(buildCompactionExcerpt(null, 0, 5, 'E', 'M'), '');
    assert.equal(buildCompactionExcerpt(msgs, 10, 2, 'E', 'M'), '', 'inverted window clamps to empty');
});

test('COMPACTION_KEEP stays below the threshold (a compaction always shrinks the live window)', () => {
    assert.ok(COMPACTION_KEEP < COMPACTION_THRESHOLD);
});
