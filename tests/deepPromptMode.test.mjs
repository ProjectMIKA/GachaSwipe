import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    classifyImageModel,
    DEEP_PROMPT_TIERS,
    DEEP_PROMPT_MAX_BUDGET,
    DEFAULT_DEEP_PROMPT_BUDGET,
    normalizeDeepPromptBudget,
    resolveDeepTierRow,
    resolveDeepTierBudget,
    resolveImageBudgets,
    resolveActiveDeepBudgets,
    getDeepPromptPrefsForModel,
    normalizeDeepAlloc,
    classifySceneSignals,
    resolveDynamicAlloc,
    resolveDefaultFullSpendAlloc,
    deepEconomyTotal,
    DEEP_MIXER_SECTIONS,
    resolveAllocPreset,
    ALLOC_PRESETS,
    DEEP_ALLOC_SECTIONS,
    DEEP_ECONOMY_SECTIONS,
    getDeepAllocCaps,
    deepEconomyPool,
    SCENE_ENRICHMENT_MODES,
    normalizeAllocStyle,
    resolveAllocStyleSkew,
    estimatePromptTokens,
    buildDeepTagGuidance,
    buildDeepFillTags,
    buildSummonDepthDirective,
    buildPhotoAuthoringSuffix,
    buildPoseFillTags,
    orderDynamicPromptTags,
    categorizeDynamicTag,
    spliceAnatomyIntoPose,
} from '../src/utils/deepPromptMode.js';

// ─── ✨ MIKA'S DEEP PROMPT ENCODER — the fail-closed budget gate ✨ ───

test('classifyImageModel: long-encoder architectures are recognized', () => {
    assert.equal(classifyImageModel('flux.1-schnell'), 'long_encoder');
    assert.equal(classifyImageModel('model-x', 'FLUX.1 dev'), 'long_encoder');
    assert.equal(classifyImageModel('sd3.5-large'), 'long_encoder');
    assert.equal(classifyImageModel('sana-turbo', 'SANA'), 'long_encoder'); // architecture beats distill hints
    assert.equal(classifyImageModel('pixart-sigma'), 'long_encoder');
    assert.equal(classifyImageModel('lumina_2'), 'long_encoder');
    assert.equal(classifyImageModel('qwen-image-2b'), 'long_encoder');
    assert.equal(classifyImageModel('hidream-i1'), 'long_encoder');
    assert.equal(classifyImageModel('chroma-v1'), 'long_encoder');
});

test('classifyImageModel: turbo means step-distilled CLIP, never long encoder', () => {
    assert.equal(classifyImageModel('sd-turbo'), 'step_distilled');
    assert.equal(classifyImageModel('sdxl-turbo'), 'step_distilled');
    assert.equal(classifyImageModel('dreamshaper-turbo', 'DreamShaper Turbo'), 'step_distilled');
    assert.equal(classifyImageModel('juggernaut-xl-turbo'), 'step_distilled');
    assert.equal(classifyImageModel('animagine-lightning'), 'step_distilled');
    assert.equal(classifyImageModel('pony-hyper-lcm'), 'step_distilled');
});

test('classifyImageModel: unknown and garbage inputs stay unknown', () => {
    assert.equal(classifyImageModel('anything-v3'), 'unknown');
    assert.equal(classifyImageModel('some-community-anime-model'), 'unknown');
    assert.equal(classifyImageModel(''), 'unknown');
    assert.equal(classifyImageModel(null), 'unknown');
    assert.equal(classifyImageModel(undefined, undefined), 'unknown');
});

test('resolveImageBudgets: 77 tier reproduces the legacy hardcoded ceilings byte-identically', () => {
    const b = resolveImageBudgets(77);
    assert.equal(b.prefix, 10);
    assert.equal(b.core, 8);
    assert.equal(b.dynamic, 12);
    assert.equal(b.outfit, 3);
    assert.equal(b.pose, 4);
    assert.equal(b.env, 4);
    assert.equal(b.deep, 0); // scene enrichment slot is CLOSED at legacy tier = legacy bytes
    assert.equal(b.tier, 77);
});

test('resolveImageBudgets: higher tiers raise ceilings monotonically', () => {
    let prev = resolveImageBudgets(77);
    for (const tier of [128, 256, 512]) {
        const b = resolveImageBudgets(tier);
        for (const k of ['prefix', 'core', 'dynamic', 'outfit', 'pose', 'env', 'deep']) {
            assert.ok(b[k] > prev[k], `tier ${tier}: ${k} ${b[k]} must exceed legacy ${prev[k]}`);
        }
        prev = b;
    }
});

test('normalizeDeepPromptBudget: snaps down to a valid tier, never invents one', () => {
    assert.deepEqual(DEEP_PROMPT_TIERS, [77, 128, 256, 512]);
    assert.equal(normalizeDeepPromptBudget(100), 77);
    assert.equal(normalizeDeepPromptBudget(200), 128);
    assert.equal(normalizeDeepPromptBudget(300), 256);
    assert.equal(normalizeDeepPromptBudget(9999), 512);
    assert.equal(normalizeDeepPromptBudget(77), 77);
    assert.equal(normalizeDeepPromptBudget(NaN), DEFAULT_DEEP_PROMPT_BUDGET);
    assert.equal(normalizeDeepPromptBudget(undefined), DEFAULT_DEEP_PROMPT_BUDGET);
    assert.ok(DEEP_PROMPT_TIERS.includes(normalizeDeepPromptBudget(0)));
});

test('getDeepPromptPrefsForModel: defaults to OFF, never null, keys per model', () => {
    assert.deepEqual(getDeepPromptPrefsForModel(null, 'm1'), { enabled: false, budget: DEFAULT_DEEP_PROMPT_BUDGET, sceneMode: 'smart', style: 'dynamic' });
    assert.deepEqual(getDeepPromptPrefsForModel({}, 'm1'), { enabled: false, budget: DEFAULT_DEEP_PROMPT_BUDGET, sceneMode: 'smart', style: 'dynamic' });
    assert.deepEqual(getDeepPromptPrefsForModel(undefined, ''), { enabled: false, budget: DEFAULT_DEEP_PROMPT_BUDGET, sceneMode: 'smart', style: 'dynamic' });

    const prefs = { m1: { enabled: true, budget: 256 }, m2: { enabled: true, budget: 999 } };
    assert.equal(getDeepPromptPrefsForModel(prefs, 'm1').enabled, true);
    assert.equal(getDeepPromptPrefsForModel(prefs, 'm1').budget, 256);
    assert.equal(getDeepPromptPrefsForModel(prefs, 'm2').budget, 999); // ✨ v2.7.51 Open Tier — custom budgets SURVIVE (derived row); clamped only at the 2048 cap
    // Enabling one model never leaks into another (per-model memory).
    assert.equal(getDeepPromptPrefsForModel(prefs, 'm3').enabled, false);
});

test('estimatePromptTokens: errs HIGH (≥ words + separators) and scales with length', () => {
    assert.equal(estimatePromptTokens([]), 0);
    assert.equal(estimatePromptTokens(null), 0);
    assert.equal(estimatePromptTokens(['', '  ']), 0);

    const one = estimatePromptTokens(['smile']);
    assert.ok(one >= 2, 'single word + comma must estimate at least 2');

    const short = estimatePromptTokens(['smile', 'sitting']);
    const long = estimatePromptTokens(['looking at viewer', 'dynamic angle from above', 'silver hair, red eyes']);
    assert.ok(long > short, 'longer prompts must estimate higher');

    // Never undersell the real tokenizer: estimate ≥ words + commas, always.
    const tags = ['silver hair', 'red eyes', 'cat ears', 'looking at viewer'];
    const words = tags.join(' ').split(/\s+/).length;
    assert.ok(estimatePromptTokens(tags) >= words + tags.length);
});

// ─── buildDeepTagGuidance (tier-aware authoring asks) ───

test('buildDeepTagGuidance: legacy/null returns the EXACT legacy contract strings', () => {
    const LEGACY = { outfit: '1-3', pose: '1-4', env: '1-3', outfitMenu: '', poseMenu: '', envMenu: '', deepAsk: null, profileRules: [] };
    for (const input of [null, undefined, { tier: 77 }]) {
        assert.deepEqual(buildDeepTagGuidance(input), LEGACY);
    }
});

test('buildDeepTagGuidance: counts grow monotonically with tier; menus only past legacy', () => {
    const upper = (range) => parseInt(String(range).split('-')[1], 10);
    let prev = buildDeepTagGuidance({ tier: 77 });
    assert.equal(prev.outfitMenu, '');
    for (const tier of [128, 256, 512]) {
        const g = buildDeepTagGuidance({ tier });
        for (const k of ['outfit', 'pose', 'env']) {
            assert.ok(upper(g[k]) > upper(prev[k]), `tier ${tier}: ${k} upper bound must exceed legacy tier`);
        }
        assert.ok(g.outfitMenu.length > 0, `tier ${tier}: outfit depth menu present`);
        assert.ok(g.poseMenu.length > 0, `tier ${tier}: camera depth menu present`);
        assert.ok(g.envMenu.length > 0, `tier ${tier}: ambience depth menu present`);
        prev = g;
    }
    // Identity lock never leaks into the menus — the gate + prompt rules own that.
    assert.ok(!buildDeepTagGuidance({ tier: 512 }).outfitMenu.match(/hair|eye color|body/i));
});

// ─── Modular tier profiles (profileRules) ───

test('buildDeepTagGuidance: legacy profileRules empty, deeper tiers carry richer rule arrays', () => {
    assert.deepEqual(buildDeepTagGuidance(null).profileRules, []);
    assert.deepEqual(buildDeepTagGuidance({ tier: 77 }).profileRules, []);
    const r128 = buildDeepTagGuidance({ tier: 128 }).profileRules;
    const r256 = buildDeepTagGuidance({ tier: 256 }).profileRules;
    const r512 = buildDeepTagGuidance({ tier: 512 }).profileRules;
    assert.ok(r128.length > 0 && r256.length > r128.length && r512.length > r256.length, 'rule arrays grow with tier');
    // Every profile restates the compliance floor somewhere.
    for (const rules of [r128, r256, r512]) {
        assert.ok(rules.some((r) => r.includes('NO physical appearance tags')), 'identity lock restated');
    }
});

// ─── buildDeepFillTags (the target-fill engine) ───

test('buildDeepFillTags: legacy = no fill, ever', () => {
    assert.deepEqual(buildDeepFillTags(null, ['smile']), []);
    assert.deepEqual(buildDeepFillTags({ tier: 77 }, ['smile']), []);
});

test('buildDeepFillTags: converges toward ~90% of tier without exceeding it', () => {
    const existing = ['silver hair', 'smile', 'school uniform', 'looking at viewer'];
    for (const tier of [128, 256, 512]) {
        const budgets = resolveImageBudgets(tier);
        const fill = buildDeepFillTags(budgets, existing, 'seed-char');
        const finalEstimate = estimatePromptTokens([...existing, ...fill]);
        assert.ok(finalEstimate <= Math.round(tier * 0.9), `tier ${tier}: fill must not exceed the target (got ${finalEstimate})`);
        assert.ok(fill.length > 0, `tier ${tier}: fill must add something`);
        // 128/256 use 2/3 pools (no color-palette pool); 512 may use all 4.
        const maxPool = tier <= 128 ? 2 : (tier <= 256 ? 3 : 4);
        const poolTags = new Set([
            'dynamic angle', 'dutch angle', 'from above', 'from below', 'over-the-shoulder shot', 'looking back', 'wide shot', 'close-up', 'foreshortening', 'cinematic composition', 'front view', 'three-quarter view',
            'cinematic lighting', 'rim lighting', 'volumetric lighting', 'golden hour lighting', 'soft lighting', 'backlighting', 'dappled sunlight', 'neon lighting', 'god rays', 'lens flare', 'dark ambient', 'moody lighting',
            'detailed background', 'blurry background', 'scenery', 'gradient background', 'light particles', 'floating particles', 'night sky', 'city lights', 'starry sky', 'clouds', 'rain', 'snowing', 'cherry blossoms', 'falling leaves', 'fireflies', 'steam',
        ]);
        const palettePool = new Set(['warm colors', 'muted colors', 'cool colors', 'vivid colors', 'pastel colors', 'dark colors', 'contrasting colors']);
        for (const tag of fill) {
            if (palettePool.has(tag)) assert.ok(maxPool === 4, `palette tag only legal at 512, got ${tag} at tier ${tier}`);
        }
    }
});

test('buildDeepFillTags: dedupes against existing, seeds vary, never emits anatomy or bloat', () => {
    const existing = ['cinematic lighting', 'rim lighting', 'volumetric lighting', 'golden hour lighting', 'soft lighting', 'backlighting', 'dappled sunlight', 'neon lighting', 'god rays', 'lens flare', 'dynamic angle', 'dutch angle', 'from above', 'from below', 'over-the-shoulder shot', 'looking back', 'wide shot', 'close-up', 'foreshortening', 'cinematic composition', 'front view', 'three-quarter view', 'silver hair', 'smile'];
    const budgets = resolveImageBudgets(256);
    const fill = buildDeepFillTags(budgets, existing, 'x');
    for (const tag of fill) {
        assert.ok(!existing.includes(tag), `no duplicates: ${tag}`);
        assert.ok(!/nude|naked|penis|breasts|nipples|pussy|sex/.test(tag), `no anatomy: ${tag}`);
        assert.ok(!['detailed', 'depth of field', 'masterpiece', 'best quality', 'highres', 'high quality', 'extremely detailed', 'photorealistic', 'aesthetic'].includes(tag), `no bloat: ${tag}`);
    }
    // Seeded determinism: same seed = same fill; different seeds vary the stack.
    const a = buildDeepFillTags(budgets, ['smile'], 'charA');
    const b = buildDeepFillTags(budgets, ['smile'], 'charB');
    assert.deepEqual(a, buildDeepFillTags(budgets, ['smile'], 'charA'), 'same seed is deterministic');
    assert.ok(JSON.stringify(a) !== JSON.stringify(b), 'different seeds vary the fill');
});

// ─── buildSummonDepthDirective (the mold overrule) ───

test('buildSummonDepthDirective: legacy = empty string, deep = override paragraph with tier facts', () => {
    assert.equal(buildSummonDepthDirective(null), '');
    assert.equal(buildSummonDepthDirective({ tier: 77 }), '');
    const d = buildSummonDepthDirective({ tier: 256 });
    assert.ok(d.includes('IMAGE_DEPTH_OVERRIDE'), 'override marker present');
    assert.ok(d.includes('reads 256 tokens'), 'tier stated');
    assert.ok(d.includes('outfit 2-5 tags') && d.includes('pose/expression 3-8 tags') && d.includes('environment 3-8 tags'), 'tier counts restated');
    assert.ok(d.includes('NO physical appearance tags'), 'identity lock restated');
});

// ─── v2.7.29 ADVANCED_ALLOCATION MIXER + SCENE ENRICHMENT ───

test('normalizeDeepAlloc: free-form pool-bounded clamps (donors 2×, dynamic 2×), core floored at the identity lock', () => {
    const a = normalizeDeepAlloc(256, { prefix: 99, core: 99, dynamic: 99, outfit: 99, pose: 99, env: 99, deep: 99 });
    // ✨ v2.7.52 NET DONORS — donors clamp at 2× table (28/24); the 16 reserved prefix tags
    // shrink the effective pool to 15, and the deterministic trim converges the family there.
    assert.equal(a.prefix, 28, 'prefix reserves up to 2× table');
    assert.equal(a.core, 24, 'core reserves up to 2× table');
    assert.equal(a.dynamic, 44, 'join cap keeps its 2× back-compat clamp');
    const family = DEEP_ECONOMY_SECTIONS.reduce((s, k) => s + a[k], 0);
    // the all-99 stress alloc reserves 26 donor tags (prefix 28, core 24) → the net pool is
    // 29 − 14 − 12 = 3, but every content section keeps its ≥1 liveness floor: the family
    // bottoms out at 4 (one per section) — floors beat the pool, fail-closed by design.
    assert.equal(family, 4, 'family bottoms out at the four liveness floors (1 per section)');
    // the identity floor: core may never drop below legacy density
    assert.equal(normalizeDeepAlloc(256, { core: 0 }).core, 8);
    assert.equal(normalizeDeepAlloc(512, { core: 1 }).core, 8);
});

test('normalizeDeepAlloc: garbage is null; partial objects keep tier defaults for other keys', () => {
    assert.equal(normalizeDeepAlloc(256, null), null);
    assert.equal(normalizeDeepAlloc(256, 'fashion'), null);
    assert.equal(normalizeDeepAlloc(256, [1, 2]), null);
    assert.equal(normalizeDeepAlloc(256, {}), null); // no numeric fields = nothing to override
    const partial = normalizeDeepAlloc(256, { env: 2 });
    assert.equal(partial.env, 2);
    assert.equal(partial.outfit, 5); // tier default fills the rest
});

test('resolveImageBudgets: custom alloc merges (clamped); garbage alloc ignored; tier switch re-clamps', () => {
    const b = resolveImageBudgets(256, { env: 1 });
    assert.equal(b.env, 1);
    assert.equal(b.outfit, 5);
    assert.equal(b.tier, 256);
    assert.equal(resolveImageBudgets(256, 'junk').env, 8);
    // a fat 512-tier alloc re-clamps to the 128 ceilings the moment the user drops tier
    const reclamped = resolveImageBudgets(128, { outfit: 6, pose: 10, env: 10, deep: 12 });
    assert.equal(reclamped.outfit, 4);
    assert.equal(reclamped.pose, 6);
    assert.equal(reclamped.env, 6);
    assert.equal(reclamped.deep, 5);
});

test('resolveAllocPreset: every style resolves dynamic (alloc undefined); junk id fails closed', () => {
    assert.equal(resolveAllocPreset('nope', 256), null);
    for (const id of Object.keys(ALLOC_PRESETS)) {
        const r = resolveAllocPreset(id, 256);
        assert.ok(r, `style ${id} resolves`);
        assert.equal(r.alloc, undefined, `style ${id} = director mode (no stored alloc — v2.7.52 Director's Chair)`);
    }
    assert.equal(resolveAllocPreset('minimal', 256), null, 'MINIMAL is retired');
});

test("DIRECTOR'S CHAIR: styles skew the director — cinematic buys camera/light, scene drives the rest", () => {
    const beach = 'wide shot of the beach at sunset, ocean waves, golden hour';
    const dynamic = resolveDynamicAlloc(256, beach);
    const cinematic = resolveDynamicAlloc(256, beach, null, 0, resolveAllocStyleSkew('cinematic'));
    assert.deepEqual(resolveDynamicAlloc(256, beach, null, 0, null), dynamic, 'null skew = pure dynamic');
    assert.ok(cinematic.env + cinematic.deep > dynamic.env + dynamic.deep, `cinematic leans scene depth (${cinematic.env}+${cinematic.deep} > ${dynamic.env}+${dynamic.deep})`);
    const familySum = DEEP_ECONOMY_SECTIONS.reduce((s, k) => s + cinematic[k], 0);
    assert.equal(familySum, deepEconomyPool(256), 'skewed split stays zero-sum');
    // clamps: no style can explode a channel
    const hot = resolveDynamicAlloc(256, beach, null, 0, { outfit: 99, pose: 0.001, env: 99, deep: 99 });
    assert.ok(hot.outfit <= deepEconomyPool(256), 'clamped weights keep the pool law');
});

test("DIRECTOR'S CHAIR: normalizeAllocStyle + prefs persistence", () => {
    assert.equal(normalizeAllocStyle('cinematic'), 'cinematic');
    assert.equal(normalizeAllocStyle('minimal'), 'dynamic', 'retired styles fall back to dynamic');
    assert.equal(normalizeAllocStyle(undefined), 'dynamic');
    assert.equal(resolveAllocStyleSkew('junk'), null, 'dynamic = no skew');
    const prefs = { m1: { enabled: true, budget: 256, style: 'scenic' } };
    assert.equal(getDeepPromptPrefsForModel(prefs, 'm1').style, 'scenic');
    assert.equal(getDeepPromptPrefsForModel({}, 'm1').style, 'dynamic', 'default style is dynamic');
});

test("DIRECTOR'S CHAIR: net donors — raising prefix/core reserves and shrinks the content pool", () => {
    // budget a fat LocalDream host prefix: prefix 10 → 20 at tier 256 (table prefix = 14)
    const reserved = normalizeDeepAlloc(256, { prefix: 20, core: 12, outfit: 5, pose: 8, env: 8, deep: 8 });
    assert.equal(reserved.prefix, 20, 'prefix may reserve above the table (2× cap)');
    const family = DEEP_ECONOMY_SECTIONS.reduce((s, k) => s + reserved[k], 0);
    // table: prefix14 core12 pool29. reserved prefix20 = -6, core12 = +0 → effective 23.
    assert.ok(family <= 23, `family (${family}) fits the net pool (29 - 6 reserved)`);
    // lowering donors still frees: prefix 14→4 frees 10 → pool 39; the four 10s trim to sum 39
    const freed = normalizeDeepAlloc(256, { prefix: 4, core: 12, outfit: 10, pose: 10, env: 10, deep: 10 });
    assert.equal(freed.prefix, 4);
    assert.equal(DEEP_ECONOMY_SECTIONS.reduce((s, k) => s + freed[k], 0), 39, '29 + 10 freed = 39 pool; family fits exactly');
    // core identity floor holds even when lowered
    const floored = normalizeDeepAlloc(256, { core: 3 });
    assert.equal(floored.core, 8, 'core floor is sacred');
});
test('resolveActiveDeepBudgets: OFF = null; ON carries clamped alloc + scene mode (smart default)', () => {
    assert.equal(resolveActiveDeepBudgets(null), null);
    assert.equal(resolveActiveDeepBudgets({ enabled: false, budget: 256 }), null);
    const on = resolveActiveDeepBudgets({ enabled: true, budget: 256 });
    assert.equal(on.tier, 256);
    assert.equal(on.sceneMode, 'smart');
    assert.equal(on.deep, 8);
    const custom = resolveActiveDeepBudgets({ enabled: true, budget: 256, alloc: { env: 2 }, sceneMode: 'pools' });
    assert.equal(custom.env, 2);
    assert.equal(custom.sceneMode, 'pools');
});

test('getDeepPromptPrefsForModel: alloc + sceneMode persist and normalize fail-closed', () => {
    const p = getDeepPromptPrefsForModel({ 'flux-dev': { enabled: true, budget: 512, alloc: { deep: 99 }, sceneMode: 'pools' } }, 'flux-dev');
    assert.equal(p.enabled, true);
    assert.equal(p.alloc.deep, 12); // clamped at read time — a tier switch can never leave stale over-ceiling values
    assert.equal(p.sceneMode, 'pools');
    const legacy = getDeepPromptPrefsForModel({ x: { enabled: true, budget: 128 } }, 'x');
    assert.equal(legacy.alloc, undefined); // no alloc = tier table = v2.7.27 behavior untouched
    assert.equal(legacy.sceneMode, 'smart');
    assert.equal(getDeepPromptPrefsForModel(null, 'x').sceneMode, 'smart');
});

test('buildDeepTagGuidance: deepAsk exists only in smart mode at deep tiers; counts fit the deep slot', () => {
    assert.equal(buildDeepTagGuidance(null).deepAsk, null);
    assert.equal(buildDeepTagGuidance(resolveImageBudgets(77)).deepAsk, null);
    const smart = buildDeepTagGuidance(resolveActiveDeepBudgets({ enabled: true, budget: 256 }));
    assert.ok(smart.deepAsk, 'smart 256 carries a deep ask');
    assert.ok(smart.deepAsk.camera >= 1 && smart.deepAsk.lighting >= 1 && smart.deepAsk.ambience >= 1);
    assert.equal(smart.deepAsk.mood, 0); // mood only unlocks at 512
    assert.ok(smart.deepAsk.camera + smart.deepAsk.lighting + smart.deepAsk.ambience <= 8, 'counts fit the 256 deep slot');
    const s512 = buildDeepTagGuidance(resolveActiveDeepBudgets({ enabled: true, budget: 512 }));
    assert.ok(s512.deepAsk.mood >= 1, '512 unlocks mood');
    assert.ok(s512.deepAsk.camera + s512.deepAsk.lighting + s512.deepAsk.ambience + s512.deepAsk.mood <= 12, 'counts fit the 512 deep slot');
    assert.equal(buildDeepTagGuidance(resolveActiveDeepBudgets({ enabled: true, budget: 256, sceneMode: 'pools' })).deepAsk, null);
    assert.equal(buildDeepTagGuidance(resolveActiveDeepBudgets({ enabled: true, budget: 256, sceneMode: 'off' })).deepAsk, null);
});

test('buildDeepFillTags: sceneMode off = [] (77-tier no-op); pools and smart both fill', () => {
    assert.deepEqual(buildDeepFillTags({ tier: 256, sceneMode: 'off' }, ['smile'], 'x'), []);
    assert.deepEqual(buildDeepFillTags({ tier: 77, sceneMode: 'smart' }, ['smile'], 'x'), []);
    assert.ok(buildDeepFillTags({ tier: 256, sceneMode: 'pools' }, ['smile'], 'x').length > 0);
    assert.ok(buildDeepFillTags({ tier: 256, sceneMode: 'smart' }, ['smile'], 'x').length > 0);
});

test('buildDeepFillTags: exclusive groups — one weather, one shot type, one palette; no contradictions', () => {
    // an existing weather tag blocks the entire weather group
    for (const t of buildDeepFillTags({ tier: 512 }, ['rain', 'smile'], 'x')) {
        assert.ok(!['snowing', 'cherry blossoms', 'falling leaves', 'fireflies', 'steam'].includes(t), `rain + ${t} would contradict`);
    }
    // an existing shot type blocks the other shot types
    for (const t of buildDeepFillTags({ tier: 512 }, ['wide shot', 'smile'], 'x')) {
        assert.ok(!['close-up', 'front view', 'three-quarter view'].includes(t), `wide shot + ${t} would contradict`);
    }
    // within any single fill at most one member of each exclusive group ever appears
    const weather = ['rain', 'snowing', 'cherry blossoms', 'falling leaves', 'fireflies', 'steam'];
    const shots = ['wide shot', 'close-up', 'front view', 'three-quarter view'];
    const palette = ['warm colors', 'muted colors', 'cool colors', 'vivid colors', 'pastel colors', 'dark colors', 'contrasting colors'];
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
        const fill = buildDeepFillTags({ tier: 512 }, ['smile'], seed);
        assert.ok(fill.filter((t) => weather.includes(t)).length <= 1, `seed ${seed}: multiple weather tags`);
        assert.ok(fill.filter((t) => shots.includes(t)).length <= 1, `seed ${seed}: multiple shot-type tags`);
        assert.ok(fill.filter((t) => palette.includes(t)).length <= 1, `seed ${seed}: multiple palette tags`);
    }
});

// ─── v2.7.30 ✨ ALLOC ECONOMY — the spendable zero-sum tag budget ───

test('deepEconomyPool: the spendable family pool per tier', () => {
    assert.equal(deepEconomyPool(77), 11);   // 3+4+4+0
    assert.equal(deepEconomyPool(128), 21);  // 4+6+6+5
    assert.equal(deepEconomyPool(256), 29);  // 5+8+8+8
    assert.equal(deepEconomyPool(512), 38);  // 6+10+10+12
    assert.equal(deepEconomyPool(9999), deepEconomyPool(DEEP_PROMPT_MAX_BUDGET)); // ✨ v2.7.51 Open Tier — clamps to the cap row (derived), never inflates past it
});

test('ALLOC ECONOMY: freed tags TRANSFER — lowering env lets outfit spend them', () => {
    const a = normalizeDeepAlloc(256, { env: 2, outfit: 10 });
    assert.equal(a.outfit, 10, 'outfit received the freed env tags (free-form — only the pool law)');
    assert.equal(a.env, 2);
    assert.equal(a.pose, 8);
    assert.equal(a.deep, 8); // untouched defaults
    assert.equal(a.outfit + a.pose + a.env + a.deep, 28, 'family sum stays within the pool (29)');
});

test('ALLOC ECONOMY: zero-sum — inflating without freeing gets trimmed deterministically', () => {
    // every family section maxed at its hard cap: family 58 → trimmed to the pool; the
    // lone smallest overshoot (outfit +5) falls back to its default last
    const a = normalizeDeepAlloc(256, { outfit: 99, pose: 99, env: 99, deep: 99, dynamic: 99 });
    assert.equal(a.outfit + a.pose + a.env + a.deep, 29, 'family sum = pool exactly');
    assert.deepEqual([a.outfit, a.pose, a.env, a.deep], [5, 8, 8, 8], 'trim converges to the defaults');
    assert.equal(a.dynamic, 44, 'dynamic clamps to 2× table (22→44) but sits outside the economy');
    assert.equal(a.prefix, 14);
    assert.equal(a.core, 12, 'caged sections untouched');
});

test('ALLOC ECONOMY: defaults never trim; a lone inflated section falls back to pool-fit', () => {
    // outfit 10 with nothing freed elsewhere: family 34 → outfit trimmed back to 5
    const a = normalizeDeepAlloc(256, { outfit: 10 });
    assert.equal(a.outfit, 5);
    // deep 24 alone at 512: family 50 → deep trimmed to 38 − 26 = 12
    const b = normalizeDeepAlloc(512, { deep: 24 });
    assert.equal(b.deep, 12);
    assert.equal(b.outfit + b.pose + b.env + b.deep, 38);
});

test('ALLOC ECONOMY: auto join-governor — dynamic follows the family; defaults untouched', () => {
    // a custom transfer raises the join cap so transferred tags are never tail-trimmed
    const x = resolveImageBudgets(256, { env: 2, outfit: 10 });
    assert.equal(x.outfit, 10);
    assert.equal(x.dynamic, 28, 'dynamic = family sum 28 (≤ 2×22)');
    // no custom alloc = pristine table join cap (default deep-ON behavior byte-identical)
    assert.equal(resolveImageBudgets(256).dynamic, 22);
    // the governor never exceeds 2× table dynamic
    const y = resolveImageBudgets(256, { dynamic: 44, outfit: 10, pose: 16, env: 16, deep: 16 });
    assert.equal(y.dynamic, 44, 'family trims to 29 < 44 → dynamic keeps the user value');
    assert.equal(y.outfit + y.pose + y.env + y.deep, 29);
});

test('getDeepAllocCaps: steppers stop exactly where the zero-sum pool does', () => {
    // no alloc: zero headroom — no section can grow beyond its default
    const pristine = getDeepAllocCaps(256, null);
    assert.equal(pristine.outfit.max, 5);
    assert.equal(pristine.env.max, 8);
    assert.equal(pristine.dynamic.max, 44);
    assert.equal(pristine.prefix.max, 28, '✨ v2.7.52 NET DONORS — 2× table reserve cap');
    assert.equal(pristine.core.min, 8);
    assert.equal(pristine.outfit.min, 0);
    // 6 freed env tags → outfit's cap grows to pool minus siblings (29 − 18 = 11)
    const freed = getDeepAllocCaps(256, { env: 2 });
    assert.equal(freed.outfit.max, 11);
    assert.equal(freed.env.max, 8, 'env itself: pool − siblings (29 − 21)');
    // near-full pool (sum 28 of 29): every section can grow by at most 1
    const full = getDeepAllocCaps(256, { outfit: 10, pose: 8, env: 2, deep: 8 });
    assert.equal(full.outfit.max, 11);
    assert.equal(full.pose.max, 9);
    assert.equal(full.deep.max, 9);
});

test('ALLOC ECONOMY: 77-tier and tier-switch stay fail-closed', () => {
    // 77 tier: deep slot 0, pool 11 — an alloc can still shape outfit/pose/env within cage
    const a = resolveImageBudgets(77, { env: 1, outfit: 6 });
    assert.equal(a.env, 1);
    assert.equal(a.outfit, 6, 'outfit hard cap 2×3 = 6');
    assert.equal(a.outfit + a.pose + a.env + a.deep, 11, 'family = pool');
    assert.equal(a.dynamic, 12, 'family 11 < dynamic 12 → governor never fires');
    // a fat 512-tier alloc re-clamps AND re-trims when the user drops to 128
    const reclamped = resolveImageBudgets(128, { outfit: 6, pose: 10, env: 10, deep: 12 });
    assert.equal(reclamped.outfit + reclamped.pose + reclamped.env + reclamped.deep, 21, 'family = 128 pool');
    assert.ok(reclamped.outfit <= 8 && reclamped.pose <= 12 && reclamped.env <= 12 && reclamped.deep <= 10, 'within 2× hard caps');
});

test('ALLOC ECONOMY: every preset stays legal — family sum ≤ pool, sections ≤ table', () => {
    for (const tier of DEEP_PROMPT_TIERS) {
        for (const id of Object.keys(ALLOC_PRESETS)) {
            const r = resolveAllocPreset(id, tier);
            if (!r.alloc) continue; // dynamic = the director
            const budgets = resolveImageBudgets(tier, r.alloc);
            const familySum = DEEP_ECONOMY_SECTIONS.reduce((s, k) => s + budgets[k], 0);
            assert.ok(familySum <= deepEconomyPool(tier), `${id} @${tier}: family ${familySum} ≤ pool`);
        }
    }
});

// ─── v2.7.31 ✨ THE OPEN WALLET — free-form pool + the Dynamic Director ───

test('DYNAMIC DIRECTOR: classifySceneSignals returns hit-count STRENGTHS (capped at 2); garbage abstains', () => {
    // v2.7.33 contract: counts, not booleans — a passing mention = 1, a scene built around the signal = 2
    assert.equal(classifySceneSignals('close-up selfie, looking at viewer, smile').portrait, 2);
    assert.equal(classifySceneSignals('selfie in class').portrait, 1);
    assert.equal(classifySceneSignals('dancing at the beach, sunset, running').active, 2);
    assert.equal(classifySceneSignals('dancing at the beach, sunset, running').outdoor, 2);
    assert.equal(classifySceneSignals('sitting on the couch in the living room').indoor, 2);
    assert.equal(classifySceneSignals('fitting room, trying on a dress and uniform').fashion, 2);
    assert.equal(classifySceneSignals('wide shot of the cityscape skyline, scenic vista').scenic, 2);
    assert.equal(classifySceneSignals('night, moonlight, starry sky').atmosphere, 2);
    assert.equal(classifySceneSignals('cuddling and holding hands, a gentle kiss').intimate, 2);
    assert.deepEqual(classifySceneSignals(''), {});
    assert.deepEqual(classifySceneSignals(null), {});
    assert.deepEqual(classifySceneSignals('zzz qqq vvv'), {}); // absent key = signal not fired
});

test('DYNAMIC DIRECTOR: the no-signal fixed point = the tier table, byte-identical', () => {
    for (const tier of DEEP_PROMPT_TIERS) {
        const table = resolveImageBudgets(tier); // pristine table row
        const fixed = resolveDynamicAlloc(tier, 'zzz qqq vvv');
        assert.deepEqual(fixed, { outfit: table.outfit, pose: table.pose, env: table.env, deep: table.deep }, `tier ${tier} fixed point`);
    }
    // tier 77 ignores scene text entirely (legacy bytes law — the director sleeps there)
    assert.deepEqual(resolveDynamicAlloc(77, 'selfie beach dancing running'), { outfit: 3, pose: 4, env: 4, deep: 0 });
});

test('DYNAMIC DIRECTOR: skews follow the scene and always sum to the pool exactly', () => {
    const p = resolveDynamicAlloc(256, 'close-up selfie, looking at viewer, upper body');
    assert.equal(p.outfit + p.pose + p.env + p.deep, 29);
    assert.ok(p.outfit > 5, 'portrait buys outfit texture');
    assert.ok(p.env < 8, 'portrait sells scene');
    assert.ok(p.deep > 8, 'portrait buys camera depth');
    const o = resolveDynamicAlloc(256, 'walking along the beach at sunset, ocean, waves');
    assert.equal(o.outfit + o.pose + o.env + o.deep, 29);
    assert.ok(o.env > 8, 'outdoor buys environment');
    const a = resolveDynamicAlloc(512, 'dancing, jumping, cheering at the festival');
    assert.equal(a.outfit + a.pose + a.env + a.deep, 38);
    assert.ok(a.pose > 10, 'active buys pose');
    // determinism: same scene, same ledger, every time
    assert.deepEqual(resolveDynamicAlloc(256, 'close-up selfie'), resolveDynamicAlloc(256, 'close-up selfie'));
});

test('DYNAMIC DIRECTOR: resolveImageBudgets engages it only with scene text at deep tiers', () => {
    // no scene text = pristine table (KV-safe default for cached guidance)
    assert.equal(resolveImageBudgets(256).outfit, 5);
    // scene text + no stored alloc = the director + the join-governor rides along
    const dyn = resolveImageBudgets(256, null, 'selfie, close-up, looking at viewer');
    assert.ok(dyn.outfit > 5);
    assert.equal(dyn.tier, 256);
    assert.equal(dyn.dynamic, 29, 'family 29 > table join 22 → governor raises the join cap');
    // tier 77 ignores scene text (legacy bytes)
    assert.equal(resolveImageBudgets(77, null, 'selfie beach dancing').outfit, 3);
    // a stored custom alloc outranks the director (but still obeys the zero-sum pool)
    assert.equal(resolveImageBudgets(256, { env: 2, outfit: 9 }, 'selfie close-up').outfit, 9);
});

test('OPEN WALLET: free-form spend — one section may take the whole pool', () => {
    const a = normalizeDeepAlloc(256, { outfit: 20, pose: 4, env: 5, deep: 0 });
    assert.equal(a.outfit, 20, 'no per-section cap — only the pool law (past the old 2× table ceiling)');
    assert.equal(a.outfit + a.pose + a.env + a.deep, 29);
    const caps = getDeepAllocCaps(256, { env: 2 });
    assert.equal(caps.outfit.max, 11, 'cap = pool minus siblings');
});

test('OPEN WALLET → DIRECTOR STYLES (v2.7.52): every style is director mode; the skew is the flavor', () => {
    // All presets resolve to alloc: undefined — the director owns the pool. The flavor now
    // lives in the style skew (tested in the Director's Chair block above).
    for (const id of ['dynamic', 'cinematic', 'fashion', 'scenic']) {
        assert.equal(resolveAllocPreset(id, 256).alloc, undefined, `${id} = director mode`);
        assert.equal(resolveAllocPreset(id, 77).alloc, undefined, `${id} at 77 = director mode`);
    }
});

// ─── v2.7.32 ✨ THE OPEN LEDGER — grand-total budget + shrink-only donors ───

test('OPEN LEDGER: grand totals per tier (prefix + core + pool; defaults sum exactly)', () => {
    assert.equal(deepEconomyTotal(77), 29);
    assert.equal(deepEconomyTotal(128), 43);
    assert.equal(deepEconomyTotal(256), 55);
    assert.equal(deepEconomyTotal(512), 70);
    // defaults spend the grand total exactly — the zero-sum law at grand scope
    const b = resolveImageBudgets(256);
    assert.equal(b.prefix + b.core + b.outfit + b.pose + b.env + b.deep, 55);
});

test('OPEN LEDGER: shrink-only donors — lowering prefix/core funds the content family', () => {
    // prefix 14→9 frees 5: outfit's live cap grows 5 → 10 (effective 34 − siblings 24)
    const caps = getDeepAllocCaps(256, { prefix: 9 });
    assert.equal(caps.outfit.max, 10, 'donor-freed tags raise the content ceiling');
    assert.equal(caps.prefix.max, 28, '✨ v2.7.52 NET DONORS — donors may also RESERVE (2× table cap)');
    assert.equal(caps.core.max, 24, '✨ v2.7.52 NET DONORS — 2× table reserve cap');
    // a deliberate spend of the donation converges to the effective pool exactly
    const a = normalizeDeepAlloc(256, { prefix: 9, outfit: 12 });
    assert.equal(a.outfit, 10, 'overspend above the effective pool is trimmed back');
    assert.equal(a.prefix, 9);
    assert.equal(a.outfit + a.pose + a.env + a.deep, 34, 'family = base 29 + freed 5');
    assert.equal(a.prefix + a.core + a.outfit + a.pose + a.env + a.deep, 55, 'grand total law holds');
    // core donor: 12→8 frees 4 → env can reach 12 (33 − 21)
    const c = normalizeDeepAlloc(256, { core: 8, env: 99 });
    assert.equal(c.env, 12);
    assert.equal(c.core, 8, 'core never drops below the identity floor 8');
});

test('OPEN LEDGER: donors are never trim victims — only LLM sections get cut', () => {
    // prefix 0 frees 14 → outfit clamps at 43, trim converges family to 43, prefix stays 0
    const a = normalizeDeepAlloc(256, { prefix: 0, outfit: 99 });
    assert.equal(a.prefix, 0);
    assert.equal(a.outfit, 19, '43 effective − 24 siblings');
    assert.equal(a.outfit + a.pose + a.env + a.deep, 43);
    assert.equal(a.prefix + a.core + a.outfit + a.pose + a.env + a.deep, 55);
});

test('OPEN LEDGER: mixer rows hide the join cap; stored dynamic values stay clamped', () => {
    assert.ok(!DEEP_MIXER_SECTIONS.includes('dynamic'), 'the auto join cap is not a user spend choice');
    assert.equal(DEEP_MIXER_SECTIONS.length, 6);
    for (const k of DEEP_MIXER_SECTIONS) assert.ok(DEEP_ALLOC_SECTIONS.includes(k), `mixer row ${k} is a real alloc section`);
    // back-compat: pre-v2.7.32 stored allocs may carry a dynamic value — still clamped + governed
    const a = normalizeDeepAlloc(256, { dynamic: 30 });
    assert.equal(a.dynamic, 30);
    assert.equal(normalizeDeepAlloc(256, { dynamic: 99 }).dynamic, 44);
});

test('OPEN LEDGER: every preset stays legal at grand scope', () => {
    for (const tier of DEEP_PROMPT_TIERS) {
        const grand = deepEconomyTotal(tier);
        for (const id of Object.keys(ALLOC_PRESETS)) {
            const r = resolveAllocPreset(id, tier);
            if (!r.alloc) continue; // dynamic = the director
            const spent = r.alloc.prefix + r.alloc.core + DEEP_ECONOMY_SECTIONS.reduce((s, k) => s + r.alloc[k], 0);
            assert.ok(spent <= grand, `${id} @${tier}: grand ${spent} ≤ ${grand}`);
        }
    }
});

// ─── v2.7.33 ✨ THE HONEST ASK — alloc-aware asks + the Sharper Director + pose fill ───

test('HONEST ASK: guidance ranges derive from the user alloc; table = historical bands', () => {
    // A fat paid outfit allocation (20 outfit, donors trimmed to fund it, family = pool 29)
    const fat = resolveImageBudgets(256, { outfit: 20, pose: 3, env: 3, deep: 3 });
    const g = buildDeepTagGuidance(fat);
    assert.equal(g.outfit, '2-20', 'the ask invites the full paid allocation');
    assert.equal(g.pose, '3', 'undersized donor sections collapse to a bare count');
    assert.equal(g.env, '3', 'env donor collapses too');
    // Pristine table (no alloc) = byte-identical v2.7.31 bands
    const table = buildDeepTagGuidance(resolveImageBudgets(256));
    assert.equal(table.outfit, '2-5');
    assert.equal(table.pose, '3-8');
    assert.equal(table.env, '3-8');
    // Legacy stays the exact frozen contract
    assert.equal(buildDeepTagGuidance(resolveImageBudgets(77)).outfit, '1-3');
});

test('HONEST ASK: guidance tracks each tier\'s table when budgets ride the defaults', () => {
    for (const tier of [128, 256, 512]) {
        const g = buildDeepTagGuidance(resolveImageBudgets(tier));
        const bands = { 128: ['2-4', '2-6', '2-6'], 256: ['2-5', '3-8', '3-8'], 512: ['3-6', '5-10', '5-10'] }[tier];
        assert.deepEqual([g.outfit, g.pose, g.env], bands, `tier ${tier} default ask = the historical band`);
    }
});

test('SHARPER DIRECTOR: the four v2.7.33 signals skew their owning section upward', () => {
    const table = resolveDynamicAlloc(256, 'zzz qqq vvv');
    assert.ok(resolveDynamicAlloc(256, 'lingerie fashion show, trying on a new dress, jewelry').outfit > table.outfit, 'fashion lifts outfit');
    assert.ok(resolveDynamicAlloc(256, 'wide shot of the cityscape skyline, scenic panorama vista').env > table.env, 'scenic lifts env');
    assert.ok(resolveDynamicAlloc(256, 'night, moonlight, candlelight glow').deep > table.deep, 'atmosphere lifts deep');
    assert.ok(resolveDynamicAlloc(256, 'kissing, embracing, holding hands under the blankets').pose > table.pose, 'intimate lifts pose');
});

test('SHARPER DIRECTOR: hit-count strength — a scene built around the signal leans harder', () => {
    const weak = resolveDynamicAlloc(256, 'beach');
    const strong = resolveDynamicAlloc(256, 'beach, ocean waves, seaside sunset');
    assert.ok(strong.env > weak.env, 'multi-hit outdoor out-leans a passing mention');
    assert.ok(strong.env > table256().env, 'multi-hit beats the table too');
});
const table256 = () => resolveDynamicAlloc(256, 'zzz qqq vvv');

test('SHARPER DIRECTOR: every new-signal allocation still sums to the pool exactly', () => {
    const pool = deepEconomyPool(256);
    for (const scene of [
        'lingerie fashion show, new dress, jewelry',
        'wide shot of the cityscape skyline, scenic panorama',
        'night, moonlight, starry sky, candlelight',
        'kissing, embrace, holding hands, cuddling',
        'night beach fashion show, wide shot, kissing',
    ]) {
        const a = resolveDynamicAlloc(256, scene);
        const sum = DEEP_ECONOMY_SECTIONS.reduce((s, k) => s + a[k], 0);
        assert.equal(sum, pool, `"${scene}" sums exactly to the pool`);
        for (const k of DEEP_ECONOMY_SECTIONS) assert.ok(a[k] >= 1, `liveness floor holds on ${k}`);
    }
});

test('OOB SKEW HINT: validated hint overrides keywords; clamped; silent at 77 and under custom alloc', () => {
    // No keywords at all — the hint alone steers
    const hinted = resolveDynamicAlloc(256, 'zzz qqq vvv', { outfit: 2, pose: 0.5 });
    assert.ok(hinted.outfit > 5 && hinted.pose < 8, 'hint steers past the table split');
    // Over-range hint = clamped to the same result as the cap itself
    assert.deepEqual(resolveDynamicAlloc(256, 'zzz qqq vvv', { outfit: 99 }), resolveDynamicAlloc(256, 'zzz qqq vvv', { outfit: 2 }));
    // Legacy tier: verbatim table, hint ignored (legacy bytes law)
    assert.deepEqual(resolveDynamicAlloc(77, 'beach beach beach', { outfit: 2 }), { outfit: 3, pose: 4, env: 4, deep: 0 });
    // Custom alloc outranks the hint end-to-end
    const custom = resolveImageBudgets(256, { outfit: 12, pose: 5, env: 4, deep: 8 }, 'beach beach', { outfit: 0.1 });
    assert.equal(custom.outfit, 12, 'a stored alloc wins over any hint');
});

test('POSE FILL: tops the pose category to its budget, dedupes, varies by seed, legacy frozen', () => {
    assert.deepEqual(buildPoseFillTags(0, []), [], 'zero budget = no fill');
    assert.deepEqual(buildPoseFillTags(4, ['standing', 'smile', 'waving', 'sitting'], 'seed'), [], 'a full authored category never fills');
    const part = buildPoseFillTags(4, ['standing', 'smile'], 'seed');
    assert.equal(part.length, 2, 'partial authoring fills the remaining room (append-only contract)');
    const combined = ['standing', 'smile'].concat(part);
    assert.equal(combined.length, 4, 'caller-concat lands exactly on the budget');
    const filled = buildPoseFillTags(10, ['standing', 'smile'], 'nyx');
    assert.equal(filled.length, 8, 'fills the remaining room to the budget (append-only)');
    assert.equal(['standing', 'smile'].concat(filled).length, 10, 'concat lands exactly on the budget');
    const a = buildPoseFillTags(6, [], 'luna');
    const b = buildPoseFillTags(6, [], 'omega');
    assert.ok(JSON.stringify(a) !== JSON.stringify(b), 'seed varies the selection');
    const dedupe = buildPoseFillTags(8, ['hand on hip'], 'nyx');
    assert.ok(!dedupe.slice(1).includes('hand on hip'), 'never duplicates an authored tag');
    assert.ok(dedupe.length <= 8, 'never exceeds the budget');
});

test('DYNAMIC DIRECTOR: pose-heavy scenes skew budget heavily to pose', () => {
    const table = resolveDynamicAlloc(256, 'neutral scene without signals');
    const martialArts = resolveDynamicAlloc(256, 'martial arts fight, kick, backflip, punching, dynamic action');
    assert.ok(martialArts.pose > table.pose, `action scene lifts pose: got ${martialArts.pose} vs table ${table.pose}`);
    assert.ok(martialArts.pose >= 11, `pose gets lion share of the 29-tag pool: got ${martialArts.pose}`);
    assert.equal(martialArts.outfit + martialArts.pose + martialArts.env + martialArts.deep, 29, 'pool sum preserved');
});

test('DYNAMIC DIRECTOR: nude scenes suppress fashion and shift wardrobe allocation to pose + scene', () => {
    const nudeWithFashionWord = resolveDynamicAlloc(256, 'lingerie fashion show, completely nude, naked in bed, unbuttoned, stripping');
    const pureFashion = resolveDynamicAlloc(256, 'lingerie fashion show, trying on a new dress');
    assert.ok(nudeWithFashionWord.outfit < pureFashion.outfit, 'nude suppresses fashion boost on outfit');
    assert.ok(nudeWithFashionWord.pose > pureFashion.pose, 'nude shifts tokens to pose');
    assert.equal(nudeWithFashionWord.outfit + nudeWithFashionWord.pose + nudeWithFashionWord.env + nudeWithFashionWord.deep, 29);
});

test('buildDeepAsk: small deep caps sum exactly to cap without overflowing', () => {
    for (const cap of [1, 2, 3, 5, 8, 12]) {
        const g = buildDeepTagGuidance({ tier: 256, deep: cap });
        assert.ok(g.deepAsk, `deepAsk present for cap ${cap}`);
        const sum = (g.deepAsk.camera || 0) + (g.deepAsk.lighting || 0) + (g.deepAsk.ambience || 0) + (g.deepAsk.mood || 0);
        assert.equal(sum, cap, `cap ${cap} must sum exactly to ${cap} (got ${sum})`);
    }
});

test('buildDeepTagGuidance: honors custom zero budgets with "0" string', () => {
    const gZeroOutfit = buildDeepTagGuidance({ tier: 256, outfit: 0, pose: 12, env: 10, deep: 7 });
    assert.equal(gZeroOutfit.outfit, '0', 'zero outfit budget produces "0"');
    assert.equal(gZeroOutfit.pose, '3-12', 'pose reflects custom 12');
});

test('buildDeepFillTags: honors deepRemaining and zero deep budget', () => {
    const filled = buildDeepFillTags({ tier: 256, deep: 8, deepRemaining: 0 }, ['smile']);
    assert.deepEqual(filled, [], 'deepRemaining 0 yields no fill');
    const zeroDeep = buildDeepFillTags({ tier: 256, deep: 0 }, ['smile']);
    assert.deepEqual(zeroDeep, [], 'deep 0 yields no fill');
    const partial = buildDeepFillTags({ tier: 256, deep: 8, deepRemaining: 2 }, ['smile'], 'char1');
    assert.ok(partial.length <= 2, `partial deepRemaining caps fill length (got ${partial.length})`);
});

test('buildPoseFillTags: sitting/lying scenes omit standing tags and contradictory poses', () => {
    for (const scene of ['sitting in a cafe chair', 'lying on back in bed, lounging', 'kneeling on the floor']) {
        const fill = buildPoseFillTags(8, ['smile'], 'charSeed', scene);
        assert.ok(!fill.includes('standing on tiptoes'), `${scene}: no standing on tiptoes`);
        assert.ok(!fill.includes('weight on one leg'), `${scene}: no weight on one leg`);
    }
});

test('categorizeDynamicTag: correctly categorizes tags into canonical slots', () => {
    assert.equal(categorizeDynamicTag('dutch angle'), 'pose');
    assert.equal(categorizeDynamicTag('close-up'), 'pose');
    assert.equal(categorizeDynamicTag('from below'), 'pose');
    assert.equal(categorizeDynamicTag('wide shot'), 'pose');
    assert.equal(categorizeDynamicTag('looking at viewer'), 'pose');
    assert.equal(categorizeDynamicTag('crossed legs'), 'pose');
    assert.equal(categorizeDynamicTag('maid uniform'), 'outfit');
    assert.equal(categorizeDynamicTag('black stockings'), 'outfit');
    assert.equal(categorizeDynamicTag('nude'), 'outfit');
    assert.equal(categorizeDynamicTag('kitchen'), 'env');
    assert.equal(categorizeDynamicTag('bedroom'), 'env');
    assert.equal(categorizeDynamicTag('street'), 'env');
    assert.equal(categorizeDynamicTag('volumetric lighting'), 'lighting');
    assert.equal(categorizeDynamicTag('dappled sunlight'), 'lighting');
    assert.equal(categorizeDynamicTag('warm colors'), 'lighting');
    assert.equal(categorizeDynamicTag('light particles'), 'lighting');
    assert.equal(categorizeDynamicTag('cherry blossoms'), 'lighting');
});

test('orderDynamicPromptTags: strictly enforces canonical ordering [outfit] -> [pose & camera] -> [other] -> [env] -> [lighting]', () => {
    const mixed = [
        'volumetric lighting',
        'bedroom',
        'dutch angle',
        'maid uniform',
        'smile',
        'light particles',
        'holding apple',
        'black stockings'
    ];
    const ordered = orderDynamicPromptTags(mixed);
    assert.deepEqual(ordered, [
        'maid uniform',
        'black stockings',
        'dutch angle',
        'smile',
        'holding apple',
        'bedroom',
        'volumetric lighting',
        'light particles'
    ]);
});

test('buildDeepFillTags: smart camera framing and scene contradiction guards', () => {
    // If prompt already has camera framing, pool 0 (camera shots) is skipped
    const existingWithCamera = ['school uniform', 'smile', 'close-up', 'classroom'];
    const fillWithCamera = buildDeepFillTags({ tier: 256, deep: 4 }, existingWithCamera, 'test-seed');
    for (const tag of fillWithCamera) {
        assert.ok(!['dynamic angle', 'dutch angle', 'from above', 'from below', 'over-the-shoulder shot', 'looking back', 'wide shot', 'close-up', 'front view', 'three-quarter view'].includes(tag), `should not stack another camera angle: got ${tag}`);
    }

    // Selfie blocks conflicting shots (wide shot, over-the-shoulder shot, from below, etc.)
    const selfieExisting = ['selfie', 'smile', 'casual clothes'];
    const selfieFill = buildDeepFillTags({ tier: 256, deep: 6 }, selfieExisting, 'selfie-seed');
    for (const tag of selfieFill) {
        assert.ok(!['wide shot', 'over-the-shoulder shot', 'from below', 'foreshortening', 'looking back', 'dynamic angle', 'dutch angle'].includes(tag), `selfie cannot have conflicting shot: got ${tag}`);
    }

    // Indoor scene blocks outdoor weather/sky
    const indoorExisting = ['pajamas', 'looking at viewer', 'bedroom'];
    const indoorFill = buildDeepFillTags({ tier: 512, deep: 8 }, indoorExisting, 'indoor-seed');
    for (const tag of indoorFill) {
        assert.ok(!['rain', 'snowing', 'night sky', 'starry sky', 'clouds', 'dappled sunlight', 'god rays', 'cherry blossoms', 'falling leaves'].includes(tag), `indoor room cannot have outdoor weather: got ${tag}`);
    }
});

// ─── ✨ v2.7.37 ANATOMY IN-SLOT ✨ ───
test('categorizeDynamicTag: explicit anatomy tokens classify as pose (subject-body content)', () => {
    for (const tag of ['nipples', 'anus', 'cameltoe', 'futanari', 'erect penis', 'erection', 'pussy juice', 'cum', 'areolae', 'clitoris', 'testicles']) {
        assert.equal(categorizeDynamicTag(tag), 'pose', `${tag} must ride the pose section`);
    }
});

test('spliceAnatomyIntoPose: tail-appended anatomy re-seats after the LAST pose tag', () => {
    const out = spliceAnatomyIntoPose(
        ['black dress', 'sitting', 'smile', 'bedroom', 'candlelight', 'nipples'],
        ['nipples']
    );
    assert.deepEqual(out, ['black dress', 'sitting', 'smile', 'nipples', 'bedroom', 'candlelight']);
});

test('spliceAnatomyIntoPose: seats after the last pose among several', () => {
    const out = spliceAnatomyIntoPose(
        ['standing', 'looking at viewer', 'park', 'sunset', 'pussy'],
        ['pussy']
    );
    assert.deepEqual(out, ['standing', 'looking at viewer', 'pussy', 'park', 'sunset']);
});

test('spliceAnatomyIntoPose: falls back to after last outfit, then before first env/lighting, then head', () => {
    assert.deepEqual(
        spliceAnatomyIntoPose(['black dress', 'nipples'], ['nipples']),
        ['black dress', 'nipples']
    );
    assert.deepEqual(
        spliceAnatomyIntoPose(['bedroom', 'candlelight', 'anus'], ['anus']),
        ['anus', 'bedroom', 'candlelight']
    );
    assert.deepEqual(
        spliceAnatomyIntoPose(['nipples'], ['nipples']),
        ['nipples']
    );
});

test('spliceAnatomyIntoPose: dedupes and never duplicates an already-seated token', () => {
    const out = spliceAnatomyIntoPose(
        ['sitting', 'nipples', 'bedroom', 'nipples'],
        ['nipples']
    );
    assert.deepEqual(out, ['sitting', 'nipples', 'bedroom']);
});

test('spliceAnatomyIntoPose: empty inputs pass through untouched', () => {
    assert.deepEqual(spliceAnatomyIntoPose([], ['nipples']), []);
    assert.deepEqual(spliceAnatomyIntoPose(['sitting', 'park'], []), ['sitting', 'park']);
});


// ─── ✨ v2.7.45 THE LAZY CAMERA (split photo protocol) + OPEN LEDGER STORE FIX ───

test('LAZY CAMERA: authoring suffix carries tier counts + menus + rules, legacy stays empty', () => {
    const g512 = buildDeepTagGuidance(resolveImageBudgets(512));
    const s512 = buildPhotoAuthoringSuffix(512, g512);
    assert.ok(s512.includes('tier 512'), 'names the tier');
    assert.ok(s512.includes(`${g512.outfit} clothing tags`), 'tier outfit count rides the tail ask');
    assert.ok(s512.includes(`${g512.pose} pose`), 'tier pose count rides');
    assert.ok(s512.includes(`${g512.env} background`), 'tier env count rides');
    if (g512.outfitMenu) assert.ok(s512.includes(g512.outfitMenu), 'depth menu rides');
    for (const r of g512.profileRules) assert.ok(s512.includes(r), 'every depth rule rides');
    assert.equal(buildPhotoAuthoringSuffix(77), '', 'tier 77 = empty (legacy byte-identical)');
    assert.equal(buildPhotoAuthoringSuffix(77, g512), '', 'tier gate wins over supplied guidance');
});

test('OPEN LEDGER STORE FIX: raises stored with LIVE lowered donors survive read-back', () => {
    // App.jsx now stores { ...activeAllocWithDynamic, [key]: next }: prefix carries the
    // LIVE prefix-tag count (6), core the tier table. Read-back must NOT trim the raise.
    const norm = normalizeDeepAlloc(512, { prefix: 6, core: 16, dynamic: 30, outfit: 7, pose: 10, env: 10, deep: 12 });
    assert.equal(norm.outfit, 7, 'the +1 survives — 10 donor tags are freed');
    const maxed = normalizeDeepAlloc(512, { prefix: 6, core: 16, dynamic: 30, outfit: 16, pose: 10, env: 10, deep: 12 });
    assert.equal(maxed.outfit + maxed.pose + maxed.env + maxed.deep, 48, 'family may spend base pool + freed donors (38+10)');
});

test('OPEN LEDGER STORE FIX: donor-blind partial storage trims (documents the mixer bug)', () => {
    // Storing { outfit: 7 } alone: missing donor keys fill from the TABLE (prefix 16 = zero
    // freed) and enforceDeepEconomy trims the raise back — the exact last-10-points bug.
    const trimmed = normalizeDeepAlloc(512, { outfit: 7 });
    assert.equal(trimmed.outfit, 6, 'table-filled donors zero the headroom; raise is trimmed');
});


// ─── ✨ v2.7.49 THE FULL LEDGER (donor-aware dynamic pool) ───

test('FULL LEDGER: resolveDynamicAlloc bonusPool widens the pool; sums exactly; garbage clamps to 0', () => {
    const sum = (o) => DEEP_ECONOMY_SECTIONS.reduce((s, k) => s + o[k], 0);
    const base = resolveDynamicAlloc(256, 'zzz qqq vvv'); // no signal = table proportions
    assert.equal(sum(base), deepEconomyPool(256));
    const boosted = resolveDynamicAlloc(256, 'zzz qqq vvv', null, 10);
    assert.equal(sum(boosted), deepEconomyPool(256) + 10, 'freed donor tags ride the director pool');
    assert.equal(sum(resolveDynamicAlloc(256, 'zzz qqq vvv', null, -5)), deepEconomyPool(256), 'negative bonus clamps to 0');
    assert.equal(sum(resolveDynamicAlloc(256, 'zzz qqq vvv', null, 'junk')), deepEconomyPool(256), 'garbage bonus clamps to 0');
});

test('FULL LEDGER: tier 77 ignores the bonus (legacy bytes law — the director sleeps)', () => {
    assert.deepEqual(resolveDynamicAlloc(77, 'selfie beach dancing', null, 10), { outfit: 3, pose: 4, env: 4, deep: 0 });
});

test('FULL LEDGER: resolveImageBudgets prefixCount funds the director pool and reports the live prefix', () => {
    const table = resolveImageBudgets(256);
    const b = resolveImageBudgets(256, null, 'zzz qqq vvv', null, 4); // 4 of 14 live → 10 freed
    assert.equal(b.prefix, 4, 'dynamic path reports the LIVE prefix count (no phantom unspent)');
    const grand = ['prefix', 'core'].concat(DEEP_ECONOMY_SECTIONS).reduce((s, k) => s + b[k], 0);
    assert.equal(grand, deepEconomyTotal(256), 'FULL — freed tags are spent, the zero-sum grand total holds');
    // No prefixCount → byte-identical legacy behavior (table prefix, table pool).
    const b2 = resolveImageBudgets(256, null, 'zzz qqq vvv');
    assert.equal(b2.prefix, table.prefix);
    assert.equal(DEEP_ECONOMY_SECTIONS.reduce((s, k) => s + b2[k], 0), deepEconomyPool(256));
    // Custom path is immune to prefixCount — the user's stored alloc is honored verbatim.
    const c = resolveImageBudgets(256, { env: 1 }, 'zzz qqq vvv', null, 4);
    assert.equal(c.env, 1);
    assert.equal(c.prefix, table.prefix);
});

test('FULL LEDGER: resolveDefaultFullSpendAlloc is the director\'s no-signal view over the FULL tier', () => {
    const v = resolveDefaultFullSpendAlloc(256, 4);
    assert.equal(v.prefix, 4);
    assert.equal(v.tier, 256);
    const grand = ['prefix', 'core'].concat(DEEP_ECONOMY_SECTIONS).reduce((s, k) => s + v[k], 0);
    assert.equal(grand, deepEconomyTotal(256), 'the mixer view reads FULL out of the box');
    // join governor mirrors resolveImageBudgets exactly: family covered, never above 2× table
    const familySum = DEEP_ECONOMY_SECTIONS.reduce((s, k) => s + v[k], 0);
    assert.equal(v.dynamic, Math.min(familySum, 44), 'join cap follows the family, capped at 2× table (22×2)');
    // pristine rows: livePrefix ≥ table returns the untouched table; tier 77 keeps the table
    // ECONOMY but the mixer view DISPLAYS the live prefix count (v2.7.52 — the ledger never lies)
    assert.deepEqual(resolveDefaultFullSpendAlloc(256, 99), resolveImageBudgets(256));
    const v77 = resolveDefaultFullSpendAlloc(77, 2);
    assert.equal(v77.prefix, 2, '77 tier displays the LIVE prefix count');
    assert.equal(v77.outfit, 3, '77 outfit stays legacy');
    assert.equal(v77.deep, 0, '77 economy stays legacy bytes');
    assert.deepEqual({ ...v77, prefix: 10 }, resolveImageBudgets(77));
});


// ─── ✨ v2.7.51 THE OPEN TIER (custom token budgets) ───

test('OPEN TIER: known anchors stay byte-identical through resolveDeepTierRow', () => {
    for (const t of DEEP_PROMPT_TIERS) {
        assert.equal(resolveDeepTierBudget(t), t);
        const { tier, table } = resolveDeepTierRow(t);
        assert.equal(tier, t);
        assert.equal(table.prefix + table.core + table.dynamic + table.outfit + table.pose + table.env + table.deep, resolveImageBudgets(t).prefix + resolveImageBudgets(t).core + resolveImageBudgets(t).dynamic + resolveImageBudgets(t).outfit + resolveImageBudgets(t).pose + resolveImageBudgets(t).env + resolveImageBudgets(t).deep, `tier ${t} row stable`);
    }
});

test('OPEN TIER: 768 derives a monotonic row ≥ 512 with floors held', () => {
    const { tier, table } = resolveDeepTierRow(768);
    assert.equal(tier, 768, 'custom tier number survives');
    const t512 = resolveDeepTierRow(512).table;
    for (const k of ['prefix', 'core', 'dynamic', 'outfit', 'pose', 'env', 'deep']) {
        assert.ok(table[k] >= t512[k], `768 ${k} (${table[k]}) ≥ 512 ${k} (${t512[k]})`);
    }
    assert.ok(table.core >= 8, 'identity floor holds');
    // the whole economy speaks custom: presets resolve, ledger sums, budgets resolve
    assert.equal(DEEP_ECONOMY_SECTIONS.reduce((s, k) => s + table[k], 0), deepEconomyPool(768));
    const budgets = resolveImageBudgets(768);
    assert.equal(budgets.tier, 768);
    assert.ok(budgets.outfit >= t512.outfit, 'resolved budgets honor the derived row');
});

test('OPEN TIER: monotonic sweep — no section ever shrinks as the budget rises', () => {
    let prev = resolveDeepTierRow(77).table;
    for (let b = 96; b <= DEEP_PROMPT_MAX_BUDGET; b += 16) {
        const row = resolveDeepTierRow(b).table;
        for (const k of ['prefix', 'core', 'dynamic', 'outfit', 'pose', 'env', 'deep']) {
            assert.ok(row[k] >= prev[k], `budget ${b}: ${k} ${row[k]} < prev ${prev[k]}`);
        }
        prev = row;
    }
});

test('OPEN TIER: budget sanitization clamps fail-closed; normalizeDeepPromptBudget stays back-compat', () => {
    assert.equal(resolveDeepTierBudget('junk'), DEFAULT_DEEP_PROMPT_BUDGET);
    assert.equal(resolveDeepTierBudget(10), 77);
    assert.equal(resolveDeepTierBudget(999999), DEEP_PROMPT_MAX_BUDGET);
    assert.equal(resolveDeepTierBudget(640.9), 640);
    // legacy snap semantics untouched: normalizeDeepPromptBudget still snaps custom → 512
    assert.equal(normalizeDeepPromptBudget(768), 512);
});

test('OPEN TIER: custom budgets SURVIVE persistence via getDeepPromptPrefsForModel', () => {
    const prefs = { 'model-a': { enabled: true, budget: 768, alloc: { outfit: 12 }, sceneMode: 'smart' } };
    const resolved = getDeepPromptPrefsForModel(prefs, 'model-a');
    assert.equal(resolved.budget, 768, 'custom tier not snapped away');
    assert.ok(resolved.alloc.outfit >= 6, 'alloc re-clamped against the DERIVED row (512 outfit = 6; 768 ≥)');
});

test('OPEN TIER: presets + full-spend view stay zero-sum on a custom tier', () => {
    // ✨ v2.7.52 Director's Chair — presets are director modes now (alloc: undefined)
    assert.equal(resolveAllocPreset('cinematic', 768).alloc, undefined, 'cinematic = director mode on derived rows too');
    const view = resolveDefaultFullSpendAlloc(768, 10);
    const grand = ['prefix', 'core'].concat(DEEP_ECONOMY_SECTIONS).reduce((s, k) => s + view[k], 0);
    assert.equal(grand, deepEconomyTotal(768), 'mixer view reads FULL on the derived ledger');
});
