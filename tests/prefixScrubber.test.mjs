/**
 * ✨ MIKA'S PREFIX-ANCHORED SCRUBBER TEST SUITE ✨
 *
 * Plain `node --test` — ZERO new dependencies.
 * Covers `normalizeTagKey` + `purgePrefixDuplicates` from src/utils/hallucinationScrubber.js:
 * the pre-budget purge that stops authored image-prompt tags from duplicating the prefix
 * (and, in LocalDream scrubber-mode, the mirrored host prefix). Exact-normalized-match
 * semantics ONLY — containment would shred legitimate tags.
 *
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTagKey, purgePrefixDuplicates } from '../src/utils/hallucinationScrubber.js';

test('prefixScrub: normalizeTagKey lowercases, underscores become spaces, whitespace collapses', () => {
    assert.equal(normalizeTagKey('Best_Quality'), 'best quality');
    assert.equal(normalizeTagKey('  BEST   quality  '), 'best quality');
    assert.equal(normalizeTagKey('very_aesthetic'), 'very aesthetic');
    assert.equal(normalizeTagKey('multiple___underscores__here'), 'multiple underscores here');
});

test('prefixScrub: normalizeTagKey is junk-safe', () => {
    assert.equal(normalizeTagKey(null), '');
    assert.equal(normalizeTagKey(undefined), '');
    assert.equal(normalizeTagKey(42), '');
    assert.equal(normalizeTagKey({ tag: 'x' }), '');
    assert.equal(normalizeTagKey(''), '');
});

test('prefixScrub: exact duplicates are purged, order preserved', () => {
    const out = purgePrefixDuplicates(
        ['masterpiece', '1girl', 'best quality', 'smile'],
        ['masterpiece', 'best quality']
    );
    assert.deepEqual(out, ['1girl', 'smile']);
});

test('prefixScrub: case and underscore variants are caught', () => {
    const out = purgePrefixDuplicates(
        ['Best_Quality', 'Masterpiece', 'smile'],
        ['best quality', 'masterpiece']
    );
    assert.deepEqual(out, ['smile']);
});

test('prefixScrub: containment does NOT match — exact semantics only', () => {
    const out = purgePrefixDuplicates(
        ['blue archive', 'quality', 'best quality ever', 'smile'],
        ['blue', 'quality']
    );
    // 'quality' is an exact match → purged. 'blue archive' ≠ 'blue', 'best quality ever' ≠ 'quality'.
    assert.deepEqual(out, ['blue archive', 'best quality ever', 'smile']);
});

test('prefixScrub: empty or missing prefix is a passthrough', () => {
    const tags = ['masterpiece', 'smile'];
    assert.deepEqual(purgePrefixDuplicates(tags, []), tags);
    assert.deepEqual(purgePrefixDuplicates(tags, null), tags);
    assert.deepEqual(purgePrefixDuplicates(tags, ['  ', '']), tags);
});

test('prefixScrub: junk inputs never throw', () => {
    assert.deepEqual(purgePrefixDuplicates(null, ['x']), []);
    assert.deepEqual(purgePrefixDuplicates(undefined, ['x']), []);
    assert.deepEqual(purgePrefixDuplicates('not an array', ['x']), []);
    assert.deepEqual(purgePrefixDuplicates(['ok', 42, null, 'fine'], ['x']), ['ok', 'fine']);
    assert.deepEqual(purgePrefixDuplicates(['ok'], 'not an array'), ['ok']);
});
