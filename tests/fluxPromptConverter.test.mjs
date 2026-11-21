import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    PROMPTING_STYLES,
    PROMPTING_STYLE_OPTIONS,
    DEFAULT_CUSTOM_OOB_PROMPT_INSTRUCTIONS,
    getPromptingStyleForModel,
    isOobProsePromptingStyle,
    stripTagWeights,
    composeHybridPerchancePrompt,
    buildCustomOobAsk,
    isAlreadyNaturalProse,
    buildDeterministicFluxPrompt,
    convertPromptToFluxProse
} from '../src/utils/fluxPromptConverter.js';
import { getDeepPromptPrefsForModel } from '../src/utils/deepPromptMode.js';

test('PROMPTING_STYLE_OPTIONS exposes Danbooru Tags, Flux / Natural Language, Natural Language/Danbooru, and Custom', () => {
    assert.equal(PROMPTING_STYLE_OPTIONS.length, 4);
    assert.equal(PROMPTING_STYLE_OPTIONS[0].id, PROMPTING_STYLES.DANBOORU);
    assert.equal(PROMPTING_STYLE_OPTIONS[1].id, PROMPTING_STYLES.FLUX);
    assert.equal(PROMPTING_STYLE_OPTIONS[2].id, PROMPTING_STYLES.HYBRID_PERCHANCE);
    assert.equal(PROMPTING_STYLE_OPTIONS[3].id, PROMPTING_STYLES.CUSTOM);
    assert.ok(PROMPTING_STYLE_OPTIONS[0].description.includes('SDXL'));
    assert.ok(PROMPTING_STYLE_OPTIONS[1].description.includes('FLUX'));
    assert.ok(PROMPTING_STYLE_OPTIONS[2].description.includes('Perchance'));
    assert.ok(PROMPTING_STYLE_OPTIONS[3].description.includes('OOB Director'));
});

test('getPromptingStyleForModel defaults globally to danbooru, defaults Perchance to hybrid_perchance, and respects overrides', () => {
    assert.equal(getPromptingStyleForModel({}, 'auto'), PROMPTING_STYLES.DANBOORU);
    assert.equal(getPromptingStyleForModel({}, 'sdxl-anime-v1'), PROMPTING_STYLES.DANBOORU);
    assert.equal(getPromptingStyleForModel({}, 'perchance-cloud'), PROMPTING_STYLES.HYBRID_PERCHANCE);

    // Explicit overrides win
    assert.equal(getPromptingStyleForModel({ 'perchance-cloud': 'danbooru' }, 'perchance-cloud'), PROMPTING_STYLES.DANBOORU);
    assert.equal(getPromptingStyleForModel({ 'perchance-cloud': 'flux' }, 'perchance-cloud'), PROMPTING_STYLES.FLUX);
    assert.equal(getPromptingStyleForModel({ 'auto': 'custom' }, 'auto'), PROMPTING_STYLES.CUSTOM);
    assert.equal(isOobProsePromptingStyle(PROMPTING_STYLES.DANBOORU), false);
    assert.equal(isOobProsePromptingStyle(PROMPTING_STYLES.FLUX), true);
    assert.equal(isOobProsePromptingStyle(PROMPTING_STYLES.HYBRID_PERCHANCE), true);
    assert.equal(isOobProsePromptingStyle(PROMPTING_STYLES.CUSTOM), true);
});

test('getDeepPromptPrefsForModel enables 256-token budget by default for perchance-cloud while keeping others fail-closed', () => {
    const perchanceDefaults = getDeepPromptPrefsForModel({}, 'perchance-cloud');
    assert.equal(perchanceDefaults.enabled, true);
    assert.equal(perchanceDefaults.budget, 256);

    const otherDefaults = getDeepPromptPrefsForModel({}, 'auto');
    assert.equal(otherDefaults.enabled, false);
    assert.equal(otherDefaults.budget, 256);

    // Explicit user disable for Perchance still wins
    const disabledPerchance = getDeepPromptPrefsForModel({ 'perchance-cloud': { enabled: false, budget: 128 } }, 'perchance-cloud');
    assert.equal(disabledPerchance.enabled, false);
    assert.equal(disabledPerchance.budget, 128);
});

test('buildDeterministicFluxPrompt strips weight wrappers, groups facets, and formats clean English prose', () => {
    const tags = '1girl, (silver_hair:1.2), crimson_eyes, black gothic dress, choker, sitting on bench, smiling, neon street, night, rim lighting';
    const prose = buildDeterministicFluxPrompt(tags);
    assert.ok(prose.includes('silver hair'));
    assert.ok(prose.includes('crimson eyes'));
    assert.ok(prose.includes('wearing black gothic dress'));
    assert.ok(prose.includes('Set in neon street'));
    assert.ok(!prose.includes('_'));
    assert.ok(!prose.includes(':1.2'));
});

test('isAlreadyNaturalProse distinguishes natural sentences from Danbooru tag lists', () => {
    assert.equal(isAlreadyNaturalProse('1girl, silver hair, red eyes, school uniform, classroom, warm sunlight'), false);
    assert.equal(isAlreadyNaturalProse('A young woman with silver hair and crimson eyes sits by a sunlit classroom window wearing a dark blazer.'), true);
});

test('convertPromptToFluxProse uses OOB LLM rewrite when valid and fails closed to deterministic fallback', async () => {
    const sampleTags = '1girl, fox ears, silver hair, red kimono, smiling, shrine courtyard, lantern light';

    // 1. Valid OOB JSON response
    const mockSdkValid = {
        contextual: {
            sendOutOfBandMessage: async () => ({
                prompt: 'A cheerful anime fox-girl with silver hair and fox ears wears a crimson kimono, smiling warmly in a shrine courtyard lit by glowing lanterns.'
            })
        }
    };
    const converted = await convertPromptToFluxProse(sampleTags, { sdk: mockSdkValid, tokenBudget: 256 });
    assert.ok(converted.includes('fox-girl'));
    assert.ok(converted.includes('crimson kimono'));

    // 2. OOB throws -> deterministic fallback
    const mockSdkFail = {
        contextual: {
            sendOutOfBandMessage: async () => {
                throw new Error('OOB busy');
            }
        }
    };
    const fallback = await convertPromptToFluxProse(sampleTags, { sdk: mockSdkFail, tokenBudget: 256 });
    assert.ok(fallback.includes('fox ears'));
    assert.ok(fallback.includes('red kimono'));

    // 3. Already natural prose skips OOB entirely
    let called = false;
    const mockSdkSpy = {
        contextual: {
            sendOutOfBandMessage: async () => {
                called = true;
                return { prompt: 'should not be called' };
            }
        }
    };
    const alreadyProse = 'A silver-haired fox girl in a red kimono smiles under warm lantern light at a shrine.';
    const untouched = await convertPromptToFluxProse(alreadyProse, { sdk: mockSdkSpy });
    assert.equal(called, false);
    assert.equal(untouched, alreadyProse);

    // 4. Fires onFluxConvertStart and onFluxConvertEnd lifecycle hooks for MIKA Proxy / silent console telemetry
    let startPayload = null;
    let endPayload = null;
    await convertPromptToFluxProse(sampleTags, {
        sdk: mockSdkValid,
        tokenBudget: 256,
        onFluxConvertStart: (p) => { startPayload = p; },
        onFluxConvertEnd: (p) => { endPayload = p; },
    });
    assert.ok(startPayload && startPayload.prompt === sampleTags);
    assert.equal(startPayload.tokenBudget, 256);
    assert.ok(endPayload && endPayload.ok === true);
    assert.equal(endPayload.fallbackUsed, false);

    // 5. Natural Language/Danbooru Hybrid (hybrid_perchance) appends unweighted Danbooru tags after blank line
    const weightedTags = '1girl, (silver hair:1.4), ((amber eyes)), black choker, smug smile, neon lighting';
    const hybridOut = await convertPromptToFluxProse(weightedTags, {
        sdk: mockSdkValid,
        tokenBudget: 256,
        style: PROMPTING_STYLES.HYBRID_PERCHANCE,
    });
    const hybridParts = hybridOut.split('\n\n');
    assert.equal(hybridParts.length, 2);
    assert.ok(hybridParts[0].includes('fox-girl'));
    assert.equal(hybridParts[1], '1girl, silver hair, amber eyes, black choker, smug smile, neon lighting');
    assert.equal(stripTagWeights(weightedTags), '1girl, silver hair, amber eyes, black choker, smug smile, neon lighting');
    assert.equal(composeHybridPerchancePrompt('Prose top.', weightedTags), 'Prose top.\n\n1girl, silver hair, amber eyes, black choker, smug smile, neon lighting');

    // 6. Custom OOB Director mode injects custom instructions and {{TAGS}} into the OOB ask
    let capturedAsk = '';
    const mockSdkCustom = {
        contextual: {
            sendOutOfBandMessage: async (askText) => {
                capturedAsk = askText;
                return { prompt: 'Custom director cinematic prose output for the diffuser.' };
            }
        }
    };
    const customOut = await convertPromptToFluxProse(sampleTags, {
        sdk: mockSdkCustom,
        style: PROMPTING_STYLES.CUSTOM,
        customInstructions: 'DIRECTIVE: Turn {{TAGS}} into noir detective prose.',
    });
    assert.ok(capturedAsk.includes('DIRECTIVE: Turn ' + sampleTags + ' into noir detective prose.'));
    assert.ok(capturedAsk.includes('Return ONLY JSON'));
    assert.equal(customOut, 'Custom director cinematic prose output for the diffuser.');
    assert.ok(DEFAULT_CUSTOM_OOB_PROMPT_INSTRUCTIONS.includes('{{TAGS}}'));
    assert.ok(buildCustomOobAsk('1girl, smile', '').includes('1girl, smile'));
});
