/**
 * ✨ MIKA'S OOB TRACE TEST SUITE — THE GLASS CHANNEL (v2.7.39) ✨
 *
 * Plain `node --test` — ZERO new dependencies. Verifies the transparency ring
 * buffer in src/utils/oobChannel.js: every askOutOfBand terminal outcome lands
 * in the trace (kind, ok/fail, latency, ask head, reply head), the buffer is
 * ring-capped, and clearOobTrace resets it. With no client armed, asks resolve
 * 'unsupported' — which still traces (transparency includes refusals).
 *
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { askOutOfBand, getOobTrace, clearOobTrace, classifyOobStatus, summarizeOobTrace, OOB_ASKS, OOB_VALIDATORS } from '../src/utils/oobChannel.js';

test('glass channel: an unsupported ask still lands in the trace with its ask head', async () => {
    clearOobTrace();
    const res = await askOutOfBand('photoTags', 'What is she wearing right now?');
    assert.equal(res.ok, false);
    assert.equal(res.error, 'unsupported');
    const trace = getOobTrace();
    assert.equal(trace.length, 1);
    const entry = trace[0];
    assert.equal(entry.kind, 'photoTags');
    assert.equal(entry.ok, false);
    assert.equal(entry.error, 'unsupported');
    assert.equal(entry.askHead, 'What is she wearing right now?');
    assert.equal(entry.replyHead, null, 'no reply exists for an unsupported ask');
    assert.ok(Number.isFinite(entry.latencyMs));
});

test('glass channel: empty ask traces with the client-gate error, never throws', async () => {
    clearOobTrace();
    const res = await askOutOfBand('sceneBuild', '   ');
    assert.equal(res.ok, false);
    assert.equal(getOobTrace().length, 1);
    // Guard order: capability is checked BEFORE ask emptiness — with no client
    // armed (node:test has no window.layla), an empty ask still traces 'unsupported'.
    assert.equal(getOobTrace()[0].error, 'unsupported');
});

test('glass channel: ask heads are capped at 240 chars (heads only, no full payloads)', async () => {
    clearOobTrace();
    const longAsk = 'x'.repeat(1000);
    await askOutOfBand('memoryExtract', longAsk);
    const entry = getOobTrace()[0];
    assert.equal(entry.askHead.length, 240);
});

test('glass channel: clearOobTrace empties the buffer; getOobTrace returns a copy', () => {
    clearOobTrace();
    const copy = getOobTrace();
    copy.push({ kind: 'tampered' });
    assert.equal(getOobTrace().length, 0, 'external mutation must not leak into the module buffer');
});

// ─── v2.7.40 TRACE LENS (classifyOobStatus + summarizeOobTrace — the modal's pure lens) ───
test('trace lens: classifyOobStatus maps every terminal outcome to a human status class', () => {
    assert.equal(classifyOobStatus({ ok: true }), 'ok');
    assert.equal(classifyOobStatus({ ok: false, error: 'timeout' }), 'timeout');
    assert.equal(classifyOobStatus({ ok: false, error: 'aborted' }), 'timeout');
    assert.equal(classifyOobStatus({ ok: false, error: 'cooldown' }), 'cooldown');
    assert.equal(classifyOobStatus({ ok: false, error: 'unsupported' }), 'unsupported');
    assert.equal(classifyOobStatus({ ok: false, error: 'empty-ask' }), 'unsupported');
    assert.equal(classifyOobStatus({ ok: false, error: 'invalid-json' }), 'invalid');
    assert.equal(classifyOobStatus({ ok: false, error: 'empty-reply' }), 'invalid');
    assert.equal(classifyOobStatus({ ok: false, error: 'error' }), 'invalid');
    assert.equal(classifyOobStatus(null), 'invalid', 'fail-closed: junk shapes never throw');
    assert.equal(classifyOobStatus('junk'), 'invalid');
});
test('trace lens: summarizeOobTrace counts totals, ok, and flagged; tolerates junk input', () => {
    const trace = [
        { kind: 'photoTags', ok: true },
        { kind: 'positionDirect', ok: false, error: 'timeout' },
        { kind: 'sceneBuild', ok: true },
        { kind: 'memoryExtract', ok: false, error: 'cooldown' },
    ];
    assert.deepEqual(summarizeOobTrace(trace), { total: 4, ok: 2, flagged: 2 });
    assert.deepEqual(summarizeOobTrace([]), { total: 0, ok: 0, flagged: 0 });
    assert.deepEqual(summarizeOobTrace(null), { total: 0, ok: 0, flagged: 0 }, 'non-array input never throws');
    assert.deepEqual(summarizeOobTrace([{ ok: true }, null]), { total: 2, ok: 1, flagged: 1 }, 'null entries count as flagged');
});

test('glass channel: fluxMeta attaches FLUX OOB details only when enabled', async () => {
    clearOobTrace();
    await askOutOfBand('photoTags', 'plain danbooru ask');
    assert.equal(getOobTrace()[0].flux, undefined, 'Danbooru mode leaves trace entry clean');

    clearOobTrace();
    await askOutOfBand('photoTags', 'flux-enabled ask', {
        fluxMeta: { tokenBudget: 256, ask: 'Rewrite as natural prose.' }
    });
    const fluxEntry = getOobTrace()[0];
    assert.equal(fluxEntry.flux.enabled, true);
    assert.equal(fluxEntry.flux.tokenBudget, 256);
    assert.equal(fluxEntry.flux.ask, 'Rewrite as natural prose.');
    assert.equal(fluxEntry.flux.reply, null);
});

test('photoTags piggyback: wantFlux adds flux_prompt to ask/schema only when enabled & validator fails closed', () => {
    const base = OOB_ASKS.photoTags({ charName: 'Panko', userName: 'Master', recentExcerpt: 'hey' });
    const off = OOB_ASKS.photoTags({ charName: 'Panko', userName: 'Master', recentExcerpt: 'hey', wantFlux: false });
    assert.equal(off.message, base.message);
    assert.equal(off.jsonSchema.properties.flux_prompt, undefined);

    const on = OOB_ASKS.photoTags({
        charName: 'Panko', userName: 'Master', recentExcerpt: 'hey',
        wantFlux: true, fluxTokenBudget: 256, charAppearance: 'golden hair, dog ears'
    });
    assert.ok(on.message.includes('flux_prompt'));
    assert.ok(on.fluxAsk && on.fluxAsk.includes('natural-language sentences'));
    assert.ok(on.jsonSchema.properties.flux_prompt);

    const validOut = OOB_VALIDATORS.photoTags({
        outfit: 'cream tshirt',
        pose_and_expression: 'winking, selfie',
        environment: 'sidewalk, daylight',
        flux_prompt: 'A petite doggirl with golden hair and floppy dog ears takes a cheerful sidewalk selfie in bright afternoon sunlight.'
    });
    assert.ok(validOut.fluxPrompt.includes('doggirl with golden hair'));

    const badOut = OOB_VALIDATORS.photoTags({
        outfit: 'cream tshirt',
        pose_and_expression: 'winking',
        environment: 'sidewalk',
        flux_prompt: '<bad>xml</bad>'
    });
    assert.equal(badOut.fluxPrompt, null, 'XML in flux_prompt fails closed without breaking tags');
});