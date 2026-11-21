/**
 * ✨ PROJECT M.I.K.A. SENTIMENT ENGINE TEST SUITE ✨
 *
 * Plain `node --test` — ZERO new dependencies (mirrors pulseSearch.test.mjs & chaosEngine.test.mjs).
 * Comprehensive coverage for src/utils/sentimentEngine.js:
 *   - classifySentiment: Lexicon scoring, intensifier multipliers, emoji detection,
 *     sub-emotion ratios, clamping, boundary & fail-closed values.
 *   - getArchetypes: Tag parsing, psychological archetype categorization, case-insensitivity,
 *     multi-archetype blends, and fail-closed STANDARD fallback.
 *   - getSyncTier: Affection score boundaries (tiers 0 to 7), label/badge metadata,
 *     and extreme value clamping.
 *   - detectSentimentEngine & getEffectiveSentiment: Layla probe fallback, in-memory caching,
 *     and seamless fail-safe evaluation.
 *
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    classifySentiment,
    getArchetypes,
    getSyncTier,
    detectSentimentEngine,
    getEffectiveSentiment
} from '../src/utils/sentimentEngine.js';

// ─── 1. classifySentiment: Boundary values & Fail-Closed Guardrails ───

test('classifySentiment: empty, null, or undefined input fails closed to all zero scores', () => {
    const emptyResult = classifySentiment('');
    const nullResult = classifySentiment(null);
    const undefinedResult = classifySentiment(undefined);

    const EXPECTED_ZERO_KEYS = [
        'joy', 'admiration', 'approval', 'amusement',
        'love', 'caring', 'desire',
        'anger', 'annoyance', 'disapproval',
        'disgust',
        'sadness', 'disappointment'
    ];

    for (const key of EXPECTED_ZERO_KEYS) {
        assert.equal(emptyResult[key], 0, `empty input key '${key}' should be 0`);
        assert.equal(nullResult[key], 0, `null input key '${key}' should be 0`);
        assert.equal(undefinedResult[key], 0, `undefined input key '${key}' should be 0`);
    }
});

test('classifySentiment: non-string junk inputs fail closed without throwing', () => {
    assert.doesNotThrow(() => classifySentiment(12345));
    assert.doesNotThrow(() => classifySentiment({ text: 'cute' }));
    assert.doesNotThrow(() => classifySentiment(['awesome', 'great']));
    assert.doesNotThrow(() => classifySentiment(true));

    const numResult = classifySentiment(12345);
    assert.equal(numResult.joy, 0);
    assert.equal(numResult.love, 0);

    const objResult = classifySentiment({ text: 'cute' });
    assert.equal(objResult.joy, 0);
});

test('classifySentiment: neutral text with no emotional lexicon returns zeroes', () => {
    const res = classifySentiment('the quick brown fox jumps over the lazy dog');
    assert.equal(res.joy, 0);
    assert.equal(res.love, 0);
    assert.equal(res.anger, 0);
    assert.equal(res.disgust, 0);
    assert.equal(res.sadness, 0);
});

// ─── 2. classifySentiment: Lexicon Scoring & Primary Emotions ───

test('classifySentiment: detects JOY lexicon words accurately', () => {
    const res = classifySentiment('You are amazing and wonderful, thank you so much');
    assert.ok(res.joy > 0.4, `expected high joy, got ${res.joy}`);
    assert.equal(res.anger, 0);
    assert.equal(res.disgust, 0);
});

test('classifySentiment: detects LOVE lexicon words accurately', () => {
    const res = classifySentiment('I adore you my darling waifu, let me cuddle and cherish you');
    assert.ok(res.love > 0.5, `expected high love, got ${res.love}`);
    assert.equal(res.anger, 0);
    assert.equal(res.disgust, 0);
});

test('classifySentiment: detects ANGER lexicon words accurately', () => {
    const res = classifySentiment('I hate this stupid useless idiot baka, shut up and go away');
    assert.ok(res.anger > 0.5, `expected high anger, got ${res.anger}`);
    assert.equal(res.joy, 0);
    assert.equal(res.love, 0);
});

test('classifySentiment: detects DISGUST lexicon words accurately', () => {
    const res = classifySentiment('gross disgusting ew yuck creep weirdo cringe stay away');
    assert.ok(res.disgust > 0.5, `expected high disgust, got ${res.disgust}`);
    assert.equal(res.love, 0);
});

test('classifySentiment: detects SADNESS lexicon words accurately', () => {
    const res = classifySentiment('I feel sad and depressed, crying alone heartbroken and hurt');
    assert.ok(res.sadness > 0.5, `expected high sadness, got ${res.sadness}`);
    assert.equal(res.joy, 0);
});

// ─── 3. classifySentiment: Sub-emotion Proportionality Contracts ───

test('classifySentiment: sub-emotions maintain strict proportional scaling laws', () => {
    const res = classifySentiment('I love and cherish this cute amazing sweet companion');
    assert.ok(res.joy > 0);
    assert.ok(res.love > 0);

    // Joy family ratios
    assert.ok(Math.abs(res.admiration - res.joy * 0.85) < 1e-9);
    assert.ok(Math.abs(res.approval - res.joy * 0.75) < 1e-9);
    assert.ok(Math.abs(res.amusement - res.joy * 0.65) < 1e-9);

    // Love family ratios
    assert.ok(Math.abs(res.caring - res.love * 0.85) < 1e-9);
    assert.ok(Math.abs(res.desire - res.love * 0.75) < 1e-9);

    const angry = classifySentiment('hate you idiot');
    assert.ok(angry.anger > 0);
    assert.ok(Math.abs(angry.annoyance - angry.anger * 0.85) < 1e-9);
    assert.ok(Math.abs(angry.disapproval - angry.anger * 0.75) < 1e-9);

    const sad = classifySentiment('sad crying lonely');
    assert.ok(sad.sadness > 0);
    assert.ok(Math.abs(sad.disappointment - sad.sadness * 0.8) < 1e-9);
});

// ─── 4. classifySentiment: Intensifiers and Punctuation Multipliers ───

test('classifySentiment: intensifiers (!! exclamation marks) boost emotional magnitude for same word count', () => {
    const baseline = classifySentiment('I adore the companion');
    const intensified = classifySentiment('I adore the companion!!');

    assert.ok(
        intensified.love > baseline.love,
        `intensified (${intensified.love}) should be > baseline (${baseline.love})`
    );

    const angryBase = classifySentiment('I hate that person');
    const angryIntense = classifySentiment('I hate that person!!');
    assert.ok(
        angryIntense.anger > angryBase.anger,
        `intensified anger (${angryIntense.anger}) should be > baseline (${angryBase.anger})`
    );
});

// ─── 5. classifySentiment: Emoji Sentiment Extraction ───

test('classifySentiment: emotional emojis enhance scores', () => {
    const withHeart = classifySentiment('hello darling ❤️✨');
    const withoutHeart = classifySentiment('hello darling');
    assert.ok(withHeart.love > withoutHeart.love, 'heart emoji should increase love score');
    assert.ok(withHeart.joy > withoutHeart.joy, 'sparkle emoji should increase joy score');

    const withAngerEmoji = classifySentiment('shut up 💢😡');
    const withoutAngerEmoji = classifySentiment('shut up');
    assert.ok(withAngerEmoji.anger > withoutAngerEmoji.anger, 'angry emoji should increase anger score');
    assert.ok(withAngerEmoji.disgust > withoutAngerEmoji.disgust, 'angry emoji should increase disgust score');

    const withTearEmoji = classifySentiment('sorry 😭💔');
    assert.ok(withTearEmoji.sadness > 0, 'tear emoji should trigger sadness score');
});

// ─── 6. classifySentiment: Score Clamping & Long Input Resilience ───

test('classifySentiment: extreme inputs clamp cleanly at 1.0 ceiling', () => {
    const extreme = classifySentiment('love adore cherish darling waifu '.repeat(50) + '❤️'.repeat(20));
    assert.equal(extreme.love, 1.0);
    assert.ok(extreme.joy <= 1.0);
    assert.ok(extreme.caring <= 1.0);

    const extremeAnger = classifySentiment('hate angry idiot stupid dumb baka '.repeat(50) + '😡'.repeat(20));
    assert.equal(extremeAnger.anger, 1.0);
    assert.ok(extremeAnger.annoyance <= 1.0);
});

test('classifySentiment: handles very long inputs (10k+ characters) without stalling', () => {
    const largeText = 'nice cute wonderful '.repeat(600);
    const start = Date.now();
    const res = classifySentiment(largeText);
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 100, `evaluation should be fast, took ${elapsed}ms`);
    assert.ok(res.joy > 0);
    assert.ok(res.joy <= 1.0);
});

// ─── 7. getArchetypes: Tag Mapping & Psychological Categorization ───

test('getArchetypes: returns STANDARD when tags are absent or empty', () => {
    assert.deepEqual(getArchetypes(), ['STANDARD']);
    assert.deepEqual(getArchetypes([]), ['STANDARD']);
    assert.deepEqual(getArchetypes(null), ['STANDARD']);
    assert.deepEqual(getArchetypes(['unrelated', 'adventurer', 'elf']), ['STANDARD']);
});

test('getArchetypes: maps specific tags to canonical archetypes', () => {
    assert.ok(getArchetypes(['yandere']).includes('YANDERE'));
    assert.ok(getArchetypes(['obsessive']).includes('YANDERE'));
    assert.ok(getArchetypes(['clingy']).includes('YANDERE'));

    assert.ok(getArchetypes(['tsundere']).includes('TSUNDERE'));
    assert.ok(getArchetypes(['delinquent', 'brat']).includes('TSUNDERE'));

    assert.ok(getArchetypes(['dominant', 'mommy']).includes('DOMINANT'));
    assert.ok(getArchetypes(['sadist']).includes('DOMINANT'));

    assert.ok(getArchetypes(['submissive', 'maid']).includes('SUBMISSIVE'));
    assert.ok(getArchetypes(['pet', 'obedient']).includes('SUBMISSIVE'));

    assert.ok(getArchetypes(['kuudere', 'stoic']).includes('KUUDERE'));
    assert.ok(getArchetypes(['cold', 'emotionless']).includes('KUUDERE'));

    assert.ok(getArchetypes(['dandere', 'shy']).includes('DANDERE'));
    assert.ok(getArchetypes(['timid', 'anxious']).includes('DANDERE'));
});

test('getArchetypes: supports case-insensitivity and multi-archetype blends', () => {
    const blend = getArchetypes(['Tsundere', 'MAID', 'Obsessive']);
    assert.ok(blend.includes('TSUNDERE'));
    assert.ok(blend.includes('SUBMISSIVE'));
    assert.ok(blend.includes('YANDERE'));
    assert.equal(blend.includes('STANDARD'), false);
});

test('getArchetypes: safely handles dirty/mixed-type arrays without throwing', () => {
    assert.doesNotThrow(() => getArchetypes([null, 42, undefined, { tag: 'brat' }]));
    const res = getArchetypes([null, 42, 'TSUNDERE']);
    assert.ok(res.includes('TSUNDERE'));
});

// ─── 8. getSyncTier: Boundaries & Synchronization Tiers ───

test('getSyncTier: returns correct tier, metadata, and badges across all boundary ranges', () => {
    // Tier 7: SOULBOUND (>= 90)
    const t7 = getSyncTier(90);
    assert.equal(t7.tier, 7);
    assert.equal(t7.label, 'SOULBOUND');
    assert.equal(t7.icon, '💖');
    assert.equal(getSyncTier(100).tier, 7);
    assert.equal(getSyncTier(150).tier, 7);

    // Tier 6: DEVOTED (70 <= aff < 90)
    const t6 = getSyncTier(70);
    assert.equal(t6.tier, 6);
    assert.equal(t6.label, 'DEVOTED');
    assert.equal(getSyncTier(89.9).tier, 6);

    // Tier 5: CLOSE BOND (40 <= aff < 70)
    const t5 = getSyncTier(40);
    assert.equal(t5.tier, 5);
    assert.equal(t5.label, 'CLOSE BOND');
    assert.equal(getSyncTier(69).tier, 5);

    // Tier 4: RAPPORT (15 <= aff < 40)
    const t4 = getSyncTier(15);
    assert.equal(t4.tier, 4);
    assert.equal(t4.label, 'RAPPORT');
    assert.equal(getSyncTier(39).tier, 4);

    // Tier 3: NEUTRAL (-15 < aff < 15)
    const t3 = getSyncTier(0);
    assert.equal(t3.tier, 3);
    assert.equal(t3.label, 'NEUTRAL');
    assert.equal(getSyncTier(14).tier, 3);
    assert.equal(getSyncTier(-14).tier, 3);
    assert.equal(getSyncTier().tier, 3); // default parameter aff = 0

    // Tier 2: SKEPTICAL (-40 < aff <= -15)
    const t2 = getSyncTier(-15);
    assert.equal(t2.tier, 2);
    assert.equal(t2.label, 'SKEPTICAL');
    assert.equal(getSyncTier(-39).tier, 2);

    // Tier 1: HOSTILE (-80 < aff <= -40)
    const t1 = getSyncTier(-40);
    assert.equal(t1.tier, 1);
    assert.equal(t1.label, 'HOSTILE');
    assert.equal(getSyncTier(-79).tier, 1);

    // Tier 0: NEMESIS (aff <= -80)
    const t0 = getSyncTier(-80);
    assert.equal(t0.tier, 0);
    assert.equal(t0.label, 'NEMESIS');
    assert.equal(t0.icon, '☠️');
    assert.equal(getSyncTier(-100).tier, 0);
    assert.equal(getSyncTier(-999).tier, 0);
});

// ─── 9. detectSentimentEngine & getEffectiveSentiment: Resilience & Fallbacks ───

test('detectSentimentEngine: falls back cleanly to custom engine when Layla is absent or invalid', async () => {
    const engineNull = await detectSentimentEngine(null);
    assert.equal(engineNull, 'custom');

    const engineEmpty = await detectSentimentEngine({});
    assert.equal(engineEmpty, 'custom');

    const engineNoClassifier = await detectSentimentEngine({ classifier: null });
    assert.equal(engineNoClassifier, 'custom');
});

test('getEffectiveSentiment: seamlessly resolves sentiment without throwing when Layla is absent', async () => {
    const sentiment = await getEffectiveSentiment(null, 'You are sweet and amazing ❤️');
    assert.ok(sentiment);
    assert.ok(sentiment.joy > 0);
    assert.ok(sentiment.love > 0);
    assert.equal(sentiment.anger, 0);
});

test('getEffectiveSentiment: handles native Layla errors fail-safe and returns fallback scores', async () => {
    const failingLayla = {
        classifier: {
            getSentiment: async () => {
                throw new Error('Mini-app connection lost');
            }
        }
    };

    const sentiment = await getEffectiveSentiment(failingLayla, 'I love this wonderful companion!');
    assert.ok(sentiment);
    assert.ok(sentiment.love > 0);
    assert.ok(sentiment.joy > 0);
});
