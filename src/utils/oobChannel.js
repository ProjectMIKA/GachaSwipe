/**
 * ✨ MIKA'S OUT-OF-BAND SIDE-CHANNEL (v2.6.0 — Layla SDK ≥7.6) ✨
 *
 * `layla.contextual.sendOutOfBandMessage()` lets the app fire one-shot LLM judgement
 * calls against the CURRENT chat conversation WITHOUT touching its history: neither
 * the question nor the reply is persisted, nothing is streamed, and the next main
 * turn's prompt stays byte-identical — so Layla's KV prefix cache survives.
 *
 * This module is the single choke point for every OOB call in GachaSwipe:
 *  - capability gating (method feature-detect; armed by the boot probe, host ≥7.6)
 *  - per-kind ask builders + best-effort JSON schemas (engines WITHOUT constrained
 *    decoding silently ignore the schema, so EVERY reply is validated before use —
 *    a non-conforming reply is treated as ABSENT, never guessed: fail closed)
 *  - serialization (one OOB generation at a time), per-kind cooldowns + timeouts
 *  - structured results: askOutOfBand() NEVER throws — callers receive
 *    { ok, data, raw, latencyMs, error } and fall back to the legacy in-band/JS
 *    paths on any failure.
 *
 * Pure utility — no React, no global state. The SDK client is injected via
 * initOobCapability() from the boot probe (the governor-wrapped instance).
 */

import { sanitizeLlmImageTags } from './hallucinationScrubber.js';
import { parsePositionDirectiveXml, isKnownPositionIntent, normalizePositionIntent } from './positionEngine.js';
import { isIndoorVenue } from './sceneBuilder.js';

// ─── Capability ────────────────────────────────────────────────────────────────
let oobClient = null;
let oobHostVersion = '';
let oobMethodPresent = false;

/**
 * Arms the side-channel. Called once from the boot probe with the live SDK instance
 * (post-governor-wrap) and the host's app_version. Returns whether OOB is usable.
 */
export function initOobCapability(appVersion, laylaClient) {
    oobHostVersion = String(appVersion || '');
    oobClient = laylaClient || null;
    oobMethodPresent = !!(oobClient && oobClient.contextual && typeof oobClient.contextual.sendOutOfBandMessage === 'function');
    console.log(`[OOB] Side-channel ${oobMethodPresent ? 'ARMED 🔮' : 'unavailable — legacy paths only'} (host ${oobHostVersion || 'unknown'})`);
    return oobMethodPresent;
}

export function isOobSupported() {
    return oobMethodPresent;
}

export function getOobDiagnostics() {
    return { supported: oobMethodPresent, hostVersion: oobHostVersion };
}

function getClient() {
    if (oobClient) return oobClient;
    // Lazy fallback for call sites that run before the boot probe finished.
    if (typeof window !== 'undefined' && window.layla && window.layla.contextual && typeof window.layla.contextual.sendOutOfBandMessage === 'function') {
        oobClient = window.layla;
        oobMethodPresent = true;
        return oobClient;
    }
    return null;
}

// ─── Serialization, cooldowns, timeouts ───────────────────────────────────────
let chain = Promise.resolve(); // one OOB generation at a time — never stampede a local model
const lastRunAt = new Map();

// ✨ v2.7.55 YIELD TO MASTER ✨ — a local host runs ONE model lane, and every OOB ask
// re-prefills the ENTIRE conversation (the side-channel rides the live chat by design).
// So when Master sends a message, nothing background may stand in front of the reply:
//  - holdOobLaneForMainTurn(): aborts every in-flight NON-protected ask (each resolves
//    { ok:false, error:'yielded_to_main' } — the caller's fail-closed fallback engages
//    silently) and raises the gate so NEW asks fail closed instead of queueing a second
//    full conversation prefill behind the main one.
//  - releaseOobLaneForMainTurn(): lowers the gate when the main stream finishes.
// Protected kinds never yield: matrixMutate is a latch-gated one-shot; schedulePlaces
// is the one cooled canonical-places pass after a M.E.O.W. compile.
// Safety net: an unreleased hold auto-expires, so a dropped release on some error path
// can never silence the side-channel for the rest of the session.
const PROTECTED_KINDS = new Set(['matrixMutate', 'schedulePlaces', 'fluxConvert']);
const MAIN_TURN_HOLD_EXPIRE_MS = 180000;
let mainLaneBusyUntil = 0;
const inFlightYieldControllers = new Set();
export function holdOobLaneForMainTurn() {
    mainLaneBusyUntil = Date.now() + MAIN_TURN_HOLD_EXPIRE_MS;
    let yielded = 0;
    inFlightYieldControllers.forEach((c) => { try { c.abort(); yielded += 1; } catch (e) { } });
    if (yielded > 0) console.log(`[OOB] 🙏 yielded ${yielded} in-flight ask(s) to the main turn`);
    return yielded;
}
export function releaseOobLaneForMainTurn() {
    mainLaneBusyUntil = 0;
}
function isMainLaneBusy() {
    return Date.now() < mainLaneBusyUntil;
}

const KIND_TIMEOUT_MS = { photoTags: 45000, memoryExtract: 60000, luresPlan: 120000, locationArbiter: 45000, locationReconcile: 60000, schedulePlaces: 90000, matrixMutate: 60000, lucidDream: 6500, shootOptions: 90000, dreamSeeds: 90000, positionDirect: 20000, chaosDirector: 30000, swipeRoast: 22000, chatCommentary: 22000, sceneBuild: 60000, mikaDirect: 25000, fluxConvert: 25000 };
const KIND_COOLDOWN_MS = { photoTags: 15000, memoryExtract: 30000, luresPlan: 240000, locationArbiter: 600000, locationReconcile: 480000, schedulePlaces: 1800000, matrixMutate: 5000, lucidDream: 3000, shootOptions: 3000, dreamSeeds: 5000, positionDirect: 15000, chaosDirector: 45000, swipeRoast: 15000, chatCommentary: 90000, sceneBuild: 90000, mikaDirect: 45000, fluxConvert: 0 };

// ✨ v2.6.24 OOB ACTIVITY BADGE ✨ — transient "background thinking" signal for the UI.
// Pure pub/sub: askOutOfBand emits { kind, phase } on start/success/fail; App.jsx renders a chip.
// No React here (pure module); subscribers must never throw into the channel.
const oobActivitySubs = new Set();
export function subscribeOobActivity(cb) {
    if (typeof cb !== 'function') return () => { };
    oobActivitySubs.add(cb);
    return () => oobActivitySubs.delete(cb);
}
function emitOobActivity(kind, phase) {
    oobActivitySubs.forEach((cb) => { try { cb({ kind, phase, at: Date.now() }); } catch (e) { } });
}

// ✨ v2.7.39 OOB TRACE — THE GLASS CHANNEL ✨ — a ring buffer of the last N OOB asks
// (kind, ok/fail, latency, ask head, reply head — heads only, 240 chars, no full
// payloads: this is a transparency surface, not a transcript). Pure module state;
// App snapshots it onto photo messages (msg.oobTrace) so the OOB chip can show
// EXACTLY what the background channel sent and got for that image.
const OOB_TRACE_MAX = 24;
const OOB_TRACE_HEAD = 240;
const oobTraceLog = [];
function recordOobTrace(entry) {
    try {
        oobTraceLog.push(entry);
        if (oobTraceLog.length > OOB_TRACE_MAX) oobTraceLog.shift();
    } catch (e) { } // never let telemetry break the channel
}
export function getOobTrace() {
    return oobTraceLog.slice();
}
export function clearOobTrace() {
    oobTraceLog.length = 0;
}
export function notifyFluxOobActivity(phase) {
    emitOobActivity('fluxConvert', phase);
}
export function recordFluxConvertTrace({ ok, latencyMs = 0, ask = '', reply = '', tokenBudget = 256, style = 'flux', error = null } = {}) {
    recordOobTrace({
        kind: 'fluxConvert',
        ok: Boolean(ok),
        at: Date.now(),
        latencyMs: Math.max(0, Math.round(Number(latencyMs) || 0)),
        ask: String(ask || '').slice(0, OOB_TRACE_HEAD),
        reply: String(reply || '').slice(0, OOB_TRACE_HEAD),
        error: error ? String(error) : null,
        flux: {
            enabled: true,
            style: String(style || 'flux'),
            tokenBudget: Number(tokenBudget) || 256,
            ask: String(ask || ''),
            reply: String(reply || ''),
        },
    });
}

// ✨ v2.7.40 TRACE LENS ✨ — pure presentation-grade classification for the OobTraceModal.
// WHY: the ring buffer is a transparency surface, not a logcat dump — the modal shows
// status first and evidence on demand, so raw error strings become human status classes.
// Fail-closed: unknown shapes classify as 'invalid', never throw. Pure + tested.
export function classifyOobStatus(entry) {
    if (!entry || typeof entry !== 'object') return 'invalid';
    if (entry.ok) return 'ok';
    const err = String(entry.error || '');
    if (err === 'cooldown') return 'cooldown';
    if (err === 'yielded_to_main') return 'cooldown'; // v2.7.55: deliberate lane yield = didn't run, by design
    if (err === 'timeout' || err === 'aborted') return 'timeout';
    if (err === 'unsupported' || err === 'empty-ask') return 'unsupported';
    return 'invalid'; // empty-reply / invalid-json / error — a reply came back unusable
}
export function summarizeOobTrace(trace) {
    const list = Array.isArray(trace) ? trace : [];
    let ok = 0;
    for (const e of list) { if (classifyOobStatus(e) === 'ok') ok += 1; }
    return { total: list.length, ok, flagged: list.length - ok };
}

/** Robust JSON extraction — models love fences, prose wrappers and stray thought tags. */
function parseJsonReply(raw) {
    if (!raw || typeof raw !== 'string') return null;
    let work = raw.trim();
    work = work.replace(/<(?:think|thought)\b[^>]*>[\s\S]*?<\/(?:think|thought)>/gi, '');
    const fence = work.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) work = fence[1].trim();
    const start = work.search(/[{[]/);
    if (start === -1) return null;
    const openCh = work[start];
    const closeCh = openCh === '{' ? '}' : ']';
    const end = work.lastIndexOf(closeCh);
    if (end <= start) return null;
    try { return JSON.parse(work.slice(start, end + 1)); } catch (e) { return null; }
}

/**
 * Fires one out-of-band judgement call. Never throws; resolves
 * { ok: true, data } or { ok: false, error, raw?, latencyMs }.
 */
export async function askOutOfBand(kind, message, options = {}) {
    const t0 = Date.now();
    const done = (res) => ({ latencyMs: Date.now() - t0, ...res });
    // v2.7.39: every terminal outcome lands in the glass-channel trace ring buffer.
    const trace = (res, replyHead) => {
        const entry = {
            kind,
            at: t0,
            latencyMs: Date.now() - t0,
            ok: Boolean(res && res.ok),
            error: (res && res.error) || null,
            askHead: String(message || '').slice(0, OOB_TRACE_HEAD),
            replyHead: replyHead ? String(replyHead).slice(0, OOB_TRACE_HEAD) : null,
        };
        if (options.fluxMeta) {
            entry.flux = {
                enabled: true,
                style: options.fluxMeta.style || 'flux',
                tokenBudget: options.fluxMeta.tokenBudget || 256,
                ask: options.fluxMeta.ask || null,
                reply: (res && res.ok && typeof res.data?.flux_prompt === 'string')
                    ? res.data.flux_prompt.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
                    : null
            };
        }
        recordOobTrace(entry);
        return done(res);
    };

    const client = getClient();
    if (!client) return trace({ ok: false, error: 'unsupported' });
    if (!message || typeof message !== 'string' || !message.trim()) return trace({ ok: false, error: 'empty-ask' });

    const cooldownMs = options.cooldownMs ?? KIND_COOLDOWN_MS[kind] ?? 30000;
    if (cooldownMs > 0 && (Date.now() - (lastRunAt.get(kind) || 0)) < cooldownMs) {
        return trace({ ok: false, error: 'cooldown' });
    }

    // ✨ v2.7.55 YIELD GATE ✨ — while Master's send is spooling, non-protected asks fail
    // closed ('yielded_to_main') instead of queueing a second full conversation prefill
    // behind the reply. Fail-closed doctrine: callers' fallbacks engage; the only thing
    // lost is lane time the reply needs far more.
    if (!PROTECTED_KINDS.has(kind) && isMainLaneBusy()) {
        return trace({ ok: false, error: 'yielded_to_main' });
    }

    const timeoutMs = options.timeoutMs ?? KIND_TIMEOUT_MS[kind] ?? 45000;
    const attempts = 1 + Math.max(0, options.retries | 0);

    const run = async () => {
        lastRunAt.set(kind, Date.now());
        emitOobActivity(kind, 'start');
        // ✨ v2.7.55: registered so holdOobLaneForMainTurn() can abort this ask mid-flight
        // when Master sends. The abort surfaces in the catch below as 'yielded_to_main'.
        const yieldController = new AbortController();
        inFlightYieldControllers.add(yieldController);
        try {
        for (let attempt = 1; attempt <= attempts; attempt++) {
            const controller = new AbortController();
            let timedOut = false;
            const timer = setTimeout(() => { timedOut = true; try { controller.abort(); } catch (e) { } }, timeoutMs);
            const onOuterAbort = () => { try { controller.abort(); } catch (e) { } };
            if (options.signal) {
                if (options.signal.aborted) { clearTimeout(timer); return trace({ ok: false, error: 'aborted' }); }
                options.signal.addEventListener('abort', onOuterAbort);
            }
            try {
                const raw = await client.contextual.sendOutOfBandMessage(message, {
                    signal: controller.signal,
                    jsonSchema: options.jsonSchema,
                });
                // ✨ v2.6.24 positionDirect rides RAW XML — local LLMs mangle JSON schemas but
                // keep tag-shaped XML intact; positionEngine.parsePositionDirectiveXml owns parsing.
                if (options.rawReply) {
                    const rawText = String(raw || '').trim();
                    if (!rawText) {
                        console.warn(`[OOB] ⚠️ ${kind} raw reply empty (${Date.now() - t0}ms) — treated as ABSENT.`);
                        if (attempt < attempts) continue;
                        return trace({ ok: false, error: 'empty-reply', raw }, String(raw || ''));
                    }
                    console.log(`[OOB] ✅ ${kind} resolved in ${Date.now() - t0}ms (raw XML)`);
                    emitOobActivity(kind, 'success');
                    return trace({ ok: true, data: { rawReply: rawText } }, rawText);
                }
                const data = parseJsonReply(raw);
                if (!data) {
                    console.warn(`[OOB] ⚠️ ${kind} reply failed JSON validation (${Date.now() - t0}ms) — treated as ABSENT. Raw head: ${String(raw || '').slice(0, 120)}`);
                    if (attempt < attempts) continue;
                    return trace({ ok: false, error: 'invalid-json', raw }, String(raw || ''));
                }
                console.log(`[OOB] ✅ ${kind} resolved in ${Date.now() - t0}ms`);
                emitOobActivity(kind, 'success');
                return trace({ ok: true, data }, JSON.stringify(data));
            } catch (e) {
                const yielded = yieldController.signal.aborted;
                const errName = yielded ? 'yielded_to_main' : (timedOut ? 'timeout' : (e && (e.name === 'LaylaAbortError' || e.name === 'AbortError') ? 'aborted' : 'error'));
                emitOobActivity(kind, (yielded || errName === 'aborted') ? 'aborted' : 'fail');
                console.warn(`[OOB] ❌ ${kind} ${yielded ? 'yielded to the main turn' : `failed (${errName})`} (${Date.now() - t0}ms)${attempt < attempts && !yielded && errName !== 'aborted' ? ' — retrying' : ''}`);
                if (attempt < attempts && !yielded && errName !== 'aborted') continue;
                return trace({ ok: false, error: errName });
            } finally {
                clearTimeout(timer);
                if (options.signal) options.signal.removeEventListener('abort', onOuterAbort);
            }
        }
        } finally {
            inFlightYieldControllers.delete(yieldController);
        }
    };

    const p = chain.then(run, run);
    chain = p.then(() => { }, () => { });
    return p;
}

// ─── Ask builders: each returns { message, jsonSchema } ───────────────────────
// The SDK's constrained decoding is BEST-EFFORT — every message restates the exact
// reply format, and OOB_VALIDATORS re-checks whatever comes back.
const BRIEF_TAGS_RULES = 'Brief lowercase danbooru tags ONLY — no sentences, no prose, no physical appearance tags (hair/eyes/body are identity-locked).';

// ✨ v2.7.48 OOB ASK DIET ✨ — the photoTags ask used to re-ship the full profileRules
// depth essays (~250 tokens) on EVERY photo pass; the slot counts + depth menus already
// ride the JSON template, so the essays collapse to ONE compact facet line here. The
// full bible still rides the in-band per-turn [PHOTO DIRECTIVE] suffix
// (buildPhotoAuthoringSuffix, deepPromptMode.js) where it shapes in-band authoring.
// Legacy (empty profileRules) asks stay byte-identical — the line is suppressed.
const COMPACT_DEPTH_RULE = ' Decompose each slot into orthogonal scene facets — outfit: core garments, fabric/fit, footwear/legwear, accessories; pose: posture, hand/arm placement, leg/torso orientation, camera angle & framing, gaze/micro-expression; environment: venue, props/surfaces, time & weather, directional light & atmosphere — never repeat synonyms, never stock filler.';

export const OOB_ASKS = {
    photoTags: ({ charName, userName, recentExcerpt, selfieExpected, guidance, wantSkew, existingTags, contextLocation, activeOutfit, establishedScene, attireDirective, wantFlux = false, fluxTokenBudget = 256, charAppearance = '', promptStyle = 'flux', customFluxInstructions = '' }) => {
        const d = guidance && guidance.deepAsk;
        const deepEntries = d ? [
            d.camera ? `"camera": "${d.camera} camera/composition tags"` : '',
            d.lighting ? `"lighting": "${d.lighting} lighting-quality tags"` : '',
            d.ambience ? `"ambience": "${d.ambience} scene/ambience tags"` : '',
            d.mood ? `"mood": "${d.mood} mood/palette tags"` : '',
        ].filter(Boolean) : [];
        const deepLine = deepEntries.length > 0
            ? `\nALSO include a "deep" key in the same JSON object with scene-derived enrichment tags honoring the exact slot counts: {"deep": {${deepEntries.join(', ')}}}. The "deep" tags MUST be derived from the ACTUAL scene above (her real location, time of day, weather, lighting, and narrative mood) and MUST add complementary camera/lighting/atmosphere details that do NOT duplicate tags already placed in "outfit", "pose_and_expression", or "environment" — never generic stock filler, never physical appearance tags.`
            : '';
        // ✨ v2.7.33 OOB SCENE-WEIGHT SKEW (piggyback, zero extra latency): in the SAME reply
        // the LLM already authors, it also rates how heavily the scene emphasizes each
        // budget dimension. The Dynamic Director consumes the validated hint as an override
        // on the keyword lexicon. Fail-closed: absent/malformed = no skew = keywords stand.
        const skewLine = wantSkew
            ? `\nALSO include a "skew" key rating how heavily THIS scene emphasizes each image dimension — each a float from 0.5 to 2.0 (1.0 = neutral): {"skew": {"outfit": 1.0, "pose": 1.0, "env": 1.0, "deep": 1.0}}. outfit high = the wardrobe/outfit is the focus of the photo; pose high = action/positioning/expression is the focus; env high = the setting/scenery is the focus; deep high = lighting/ambience quality carries the mood. Omit the "skew" key if unsure.`
            : '';
        // v2.7.41 PRESENCE PIGGYBACK — the SAME photoTags reply also answers ONE binary
        // scene question: is she physically WITH the user right now, or somewhere else?
        // 'apart' dissolves the POV position graft downstream (no user hands painted into
        // her remote selfie). Fail-closed: absent/invalid = null = legacy behavior.
        const presenceLine = `\nALSO include a "presence" key: "together" if ${charName} is physically in the same place as ${userName} in the scene right now, or "apart" if she is somewhere else (texting, calling, or sending a photo from her own location). Judge ONLY from her latest message and the scene above. Omit the "presence" key if you cannot tell.`;
        const anchorParts = [];
        if (contextLocation) anchorParts.push(`Active scene location: ${String(contextLocation).slice(0, 80)}`);
        if (activeOutfit) anchorParts.push(`Current worn wardrobe (from M.E.O.W. engine — MATCH or build upon these exact items unless the scene explicitly involves changing clothes or undressing): ${String(activeOutfit).slice(0, 160)}`);
        if (existingTags) anchorParts.push(`Existing in-band photo tags to preserve & expand into full sub-facet budgets (do not contradict): ${String(existingTags).slice(0, 260)}`);
        // ✨ v2.7.38 SET GROUNDING ✨ — when the Set Dresser has an established set for this
        // scene, the pass MATCHES it instead of re-authoring a contradicting venue/env.
        if (establishedScene) anchorParts.push(`The established set dressing for this scene (MATCH these settings exactly — do NOT re-author the venue or environment, only add complementary detail): ${String(establishedScene).slice(0, 300)}`);
        const wardrobeRule = activeOutfit ? ' Outfit tags MUST match or refine her Current worn wardrobe (do not invent contradicting clothes unless the dialogue specifically called for changing).' : '';
        // ✨ v2.7.48 ATTIRE BASELINE (OOB PHOTO PRIMARY) ✨ — optional; passed ONLY when the
        // in-band photo bible is absent (oobPhotoPrimary) so legacy rescue asks stay
        // byte-identical. Fail-closed: absent = ABSENT = the ask is byte-for-byte legacy.
        const attireLine = attireDirective ? `\nATTIRE BASELINE (the app's content dial — your "outfit" tags MUST obey it): ${String(attireDirective).slice(0, 200)}` : '';
        const anchorLine = anchorParts.length > 0 ? `\nScene anchors:\n${anchorParts.join('\n')}` : '';
        const fluxSentenceTarget = (Number(fluxTokenBudget) || 256) >= 256
            ? '2-3 vivid natural-language sentences'
            : '1-2 concise natural-language sentences';
        const fluxAppearanceHint = charAppearance ? ` (physical traits: ${String(charAppearance).slice(0, 160)})` : '';
        const cleanedCustomInstr = (promptStyle === 'custom' && typeof customFluxInstructions === 'string')
            ? customFluxInstructions.replace(/\{\{\s*(?:TAGS|PROMPT)\s*\}\}|\{\s*(?:tags|prompt)\s*\}/gi, 'this exact photo scene').replace(/\s+/g, ' ').trim()
            : '';
        const fluxAskText = wantFlux
            ? (cleanedCustomInstr
                ? `Write the "flux_prompt" string for ${charName}${fluxAppearanceHint} following these custom OOB Director rules: ${cleanedCustomInstr}`
                : `Rewrite this exact photo scene as ${fluxSentenceTarget} in natural English prose for a FLUX / natural-language image generator (if two subjects are interacting in the scene, prefix their spatial positions with LEFT: and RIGHT: lines first to prevent attribute bleed; omit LEFT:/RIGHT: for solo shots; describe ${charName}'s physical appearance${fluxAppearanceHint}, outfit, pose/expression${selfieExpected ? ' as a selfie' : ''}, setting, and lighting/atmosphere cleanly — NO underscores, NO comma-separated tag dumps, NO XML/markdown).`)
            : '';
        const fluxLine = wantFlux
            ? `\nALSO include a "flux_prompt" key in the same JSON object: ${fluxAskText}`
            : '';
        const fluxSchemaProp = wantFlux ? { flux_prompt: { type: 'string' } } : {};
        const skewSchemaProps = {
            skew: {
                type: 'object',
                properties: {
                    outfit: { type: 'number' }, pose: { type: 'number' },
                    env: { type: 'number' }, deep: { type: 'number' },
                },
                additionalProperties: false
            }
        };
        return {
            message: `[SIDE-CHANNEL TASK — invisible to ${charName}, NOT part of the chat]\n` +
                `Based ONLY on the ongoing conversation above this note, describe the photo ${charName} would send ${userName} right now.\n` +
                `Reply with ONLY a JSON object: {"outfit": "${guidance?.outfit || '1-3'} clothing tags${guidance?.outfitMenu || ''}", "pose_and_expression": "${guidance?.pose || '1-4'} pose/action/expression tags${selfieExpected ? ' (MUST include the tag: selfie)' : ''}${guidance?.poseMenu || ''}", "environment": "${guidance?.env || '1-3'} background/lighting tags${guidance?.envMenu || ''}"}.${deepLine}${skewLine}${presenceLine}${fluxLine}\n` +
                `Tag rules: ${BRIEF_TAGS_RULES}${(guidance?.profileRules || []).length > 0 ? COMPACT_DEPTH_RULE : ''}${wardrobeRule}${attireLine}${anchorLine}\n` +
                `Recent dialogue:\n${String(recentExcerpt || '').slice(-450)}`,
            ...(wantFlux ? { fluxAsk: fluxAskText } : {}),
            jsonSchema: d || wantSkew
                ? {
                    type: 'object',
                    properties: {
                        outfit: { type: 'string' },
                        pose_and_expression: { type: 'string' },
                        environment: { type: 'string' },
                        ...(d ? {
                            deep: {
                                type: 'object',
                                properties: { camera: { type: 'string' }, lighting: { type: 'string' }, ambience: { type: 'string' }, mood: { type: 'string' } },
                                additionalProperties: false
                            }
                        } : {}),
                        ...(wantSkew ? skewSchemaProps : {}),
                        ...fluxSchemaProp,
                        presence: { type: 'string', enum: ['together', 'apart'] }
                    },
                    required: ['outfit', 'pose_and_expression', 'environment'],
                    additionalProperties: false
                }
                : {
                    type: 'object',
                    properties: { outfit: { type: 'string' }, pose_and_expression: { type: 'string' }, environment: { type: 'string' }, ...fluxSchemaProp, presence: { type: 'string', enum: ['together', 'apart'] } },
                    required: ['outfit', 'pose_and_expression', 'environment'],
                    additionalProperties: false
                }
        };
    },

    memoryExtract: ({ charName, userName, placeHint, contextBlock }) => ({
        message: `[SIDE-CHANNEL TASK — invisible to ${charName}, NOT part of the chat]\n` +
            `Summarize the recent exchange as ONE memory in ${charName}'s 1st-person voice (1-3 sentences, intimate inner monologue, mention ${userName} where natural).\n` +
            `Reply with ONLY a JSON object: {"memory": "the 1st-person monologue", "location": "1-3 word PHYSICAL place (e.g. Living Room, Rooftop Cafe) or NONE"}.\n` +
            `Location MUST name a concrete physical place — never a topic, feeling, activity, or sentence.${placeHint ? ` The scene is likely near: "${placeHint}".` : ''}${contextBlock ? `\nContext to summarize (older conversation, provided for you):\n${String(contextBlock).slice(-2400)}` : ''}`,
        jsonSchema: {
            type: 'object',
            properties: { memory: { type: 'string' }, location: { type: 'string' } },
            required: ['memory'],
            additionalProperties: false
        }
    }),

    // ✨ v2.7.37 THE SET DRESSER ✨ — one OOB pass authors ONE coherent scene (a connected
    // place with props, weather, lighting, atmosphere, palette), cached by scene identity
    // and reused for every subsequent image in the same place + daypart. The cure for
    // budget-filling tag salad: the scene is AUTHORED as a set, not sampled as filler.
    sceneBuild: ({ charName, place, daypart, recentExcerpt, envBudget, deepBudget, scheduleHint }) => ({
        message: `[SIDE-CHANNEL TASK — invisible to ${charName}, NOT part of the chat]\n` +
            `You are the set dresser for a photo series. ${charName} is at: ${place || 'an unspecified location'} (${daypart || 'daytime'}). Read the recent exchange and dress THE scene she is in.\n` +
            (scheduleHint ? `Her M.E.O.W. routine right now: "${String(scheduleHint).slice(0, 160)}" — the set must be consistent with that activity and place.\n` : '') +
            `Describe ONE single connected place — never a mix of unrelated settings. Every tag must belong to that one place and that one time of day.\n` +
            `Reply with ONLY a JSON object:\n` +
            `{"venue": "${Math.min(3, Math.max(1, envBudget || 4))} location/setting tags (THE place itself)", "props": "up to 4 concrete objects/furniture/scene props present", "time_of_day": "1-2 time tags (EMPTY if indoors — no sky visible)", "weather": "0-2 weather tags (omit if indoors)", "lighting": "1-3 lighting-quality tags for this exact place and time", "atmosphere": "1-3 ambience/mood tags unique to this setting", "palette": "0-2 color-palette tags"}\n` +
            `Rules: brief lowercase danbooru tags ONLY — no sentences, no prose, no people, no anatomy, no clothing, no camera terms, no physical appearance tags. Derive everything from the ACTUAL conversation and place — never generic stock tags. HONESTY LAW: only tag what will be VISIBLE in the photo — an indoor venue must NOT emit weather, sky, or time_of_day tags (indoor lighting says nothing about the sky).\n` +
            `Recent dialogue:\n${String(recentExcerpt || '').slice(-450)}${deepBudget > 0 ? `\n(The lighting/atmosphere/palette tags also dress her scene-depth budget — make them specific to this set.)` : ''}`,
        jsonSchema: {
            type: 'object',
            properties: {
                venue: { type: 'string' },
                props: { type: 'string' },
                time_of_day: { type: 'string' },
                weather: { type: 'string' },
                lighting: { type: 'string' },
                atmosphere: { type: 'string' },
                palette: { type: 'string' }
            },
            required: ['venue', 'lighting', 'atmosphere'],
            additionalProperties: false
        }
    }),

    luresPlan: ({ charName, userName, tropes, mode, recentExcerpt }) => ({
        message: `[SIDE-CHANNEL TASK — invisible to ${charName}, NOT part of the chat]\n` +
            `You are ${charName}${Array.isArray(tropes) && tropes.length ? ` (tropes: ${tropes.join(', ')})` : ''}. Write short "missed you" notification texts TO ${userName} for the OS inbox — 1-2 sentences each, in ${charName}'s voice, no roleplay asterisks, no quotation marks.\n` +
            (mode !== 'idle' ? 'OFFLINE STALKER — three texts for when the app is closed: one for 6AM-11AM, one for 11AM-9PM, one for 9PM-5AM.\n' : '') +
            (mode !== 'offline' ? `IDLE QUEUE — up to 5 sequential texts for when ${userName} stops replying in active chat (playful poke, impatient nudge, in-character quirk, then giving up).\n` : '') +
            `Reply with ONLY a JSON object: {"morning": "...", "daytime": "...", "night": "...", "lures": ["...", "..."]} — omit fields you were not asked for.\n` +
            `Recent conversation flavor:\n${String(recentExcerpt || '').slice(-600)}`,
        jsonSchema: {
            type: 'object',
            properties: { morning: { type: 'string' }, daytime: { type: 'string' }, night: { type: 'string' }, lures: { type: 'array', items: { type: 'string' } } },
            additionalProperties: false
        }
    }),

    locationArbiter: ({ charName, recentExcerpt, scheduleHint }) => ({
        message: `[SIDE-CHANNEL TASK — invisible to ${charName}, NOT part of the chat]\n` +
            `Name the single PHYSICAL place where the current scene is happening right now.\n` +
            `Rules: 1-3 words naming ONLY a concrete physical place (e.g. Living Room, Rooftop Cafe, Train Station). NEVER a topic, feeling, activity, or sentence. If no physical scene exists at all, answer NONE.\n` +
            (scheduleHint ? `Her routine suggests she would usually be at: "${scheduleHint}".\n` : '') +
            `Reply with ONLY a JSON object: {"location": "1-3 word place" or "NONE"}.\n` +
            `Recent dialogue:\n${String(recentExcerpt || '').slice(-600)}`,
        jsonSchema: {
            type: 'object',
            properties: { location: { type: 'string' } },
            required: ['location'],
            additionalProperties: false
        }
    }),

    locationReconcile: ({ charName, routineProse, schedPlace, ping, recentExcerpt }) => ({
        message: `[SIDE-CHANNEL TASK — invisible to ${charName}, NOT part of the chat]\n` +
            `Her weekly routine currently says she would usually be doing: "${routineProse}".\n` +
            (schedPlace ? `The routine's place extracts as: "${schedPlace}".\n` : `The routine names no obvious physical place.\n`) +
            `She just reported being at: "${ping}".\n` +
            `Judge whether the reported place is the SAME place the routine points to (same building/venue, a sub-location of it, or a shorthand/nickname for it) or a genuinely DIFFERENT place.\n` +
            `Reply with ONLY a JSON object: {"verdict": "same" or "different" or "unclear", "canonical_place": "1-3 word canonical name of where she really is"}.\n` +
            `Use "unclear" only when the dialogue genuinely cannot tell. canonical_place must be the fullest correct name (e.g. "Arcade Bar", never just "Bar").\n` +
            `Recent dialogue:\n${String(recentExcerpt || '').slice(-700)}`,
        jsonSchema: {
            type: 'object',
            properties: { verdict: { type: 'string' }, canonical_place: { type: 'string' } },
            required: ['verdict'],
            additionalProperties: false
        }
    }),

    schedulePlaces: ({ charName, routineLines }) => ({
        message: `[SIDE-CHANNEL TASK — invisible to ${charName}, NOT part of the chat]\n` +
            `Below is her weekly routine. For each block, name the ONE primary physical place it happens at — 1-3 words, a concrete describable place (e.g. "Bakery", "Arcade Bar", "Community Pool"). Use "NONE" when the block names no real place. Sleeping at home stays "Home"; abstract activities with no venue = "NONE".\n` +
            `Reply with ONLY a JSON object mirroring this shape: {"weekday": {"early_morning": "...", "morning": "...", "afternoon": "...", "evening": "...", "night": "...", "late_night": "..."}, "weekend": {...the same six keys...}}\n` +
            `ROUTINE:\n${String(routineLines || '').slice(-1500)}`,
        jsonSchema: {
            type: 'object',
            properties: {
                weekday: { type: 'object', properties: { early_morning: { type: 'string' }, morning: { type: 'string' }, afternoon: { type: 'string' }, evening: { type: 'string' }, night: { type: 'string' }, late_night: { type: 'string' } } },
                weekend: { type: 'object', properties: { early_morning: { type: 'string' }, morning: { type: 'string' }, afternoon: { type: 'string' }, evening: { type: 'string' }, night: { type: 'string' }, late_night: { type: 'string' } } }
            },
            required: ['weekday', 'weekend'],
            additionalProperties: false
        }
    }),

    // ✨ v2.6.2 PSYCHE JUDGE ✨ — Matrix Mutation verdicts ride the side-channel so the
    // milestone mutation call stops flushing the KV prefix cache. Unlike the legacy
    // synthetic-prompt path, this ask rides the LIVE host conversation: the model judges
    // the shift against the real relationship history, not a 3-memory token diet.
    matrixMutate: ({ charName, originalTags, personality, directionRule, recentContext }) => ({
        message: `[SIDE-CHANNEL TASK — invisible to ${charName}, NOT part of the chat]\n` +
            `You are evaluating the psychological mutation of ${charName}.\n` +
            `Original Tropes: ${originalTags}\n` +
            `Personality: ${personality}\n\n` +
            `CONTEXT:\n${directionRule}\n` +
            `Judge this against her ACTUAL behavior in the conversation above this note — the shift must be earned by real events, not assumed from the milestone alone.\n\n` +
            (recentContext ? `OLDER LORE (may predate the visible conversation):\n${String(recentContext).slice(-700)}\n\n` : '') +
            `CRITICAL RULES:\n` +
            `1. Determine 1 to 3 NEW anime tropes/tags that represent her CURRENT evolved state to ADD to her existing profile.\n` +
            `2. DO NOT replace her core identity. The new tags must reflect how her base archetype has deepened or shifted (e.g., a Tsundere adding "Clingy", a Maid adding "Obsessive").\n` +
            `3. Brief lowercase trait tags — no sentences, no physical appearance tags (hair/eyes/body are identity-locked).\n` +
            `Reply with ONLY a JSON object: {"tags": ["tag1", "tag2"], "rationale": "one short sentence citing the evidence"}.`,
        jsonSchema: {
            type: 'object',
            properties: { tags: { type: 'array', items: { type: 'string' } }, rationale: { type: 'string' } },
            required: ['tags'],
            additionalProperties: false
        }
    }),

    // ✨ v2.6.3 OOB VISUAL DIRECTOR ✨ — the three "invisible machinery" image-side passes
    // (Lucid Dive dreamscape synth, DYNAMIC_PULL slot generation, Dive Chamber dream seeds)
    // stop firing bare synthetic create()/stream() calls that re-prefill the KV prefix cache
    // mid-session. Grounding rides the LIVE conversation, and the reply format is JSON so
    // parseJsonReply + OOB_VALIDATORS replace the old regex soup. lucidDream keeps the same
    // 6.5s snappiness budget the old Promise.race had — but a timeout now ABORTS the
    // generation instead of orphaning it (the old race left the create() running, which kept
    // flushing the prefix cache even when its result was thrown away).
    lucidDream: ({ charName, coreAppearance, scenario }) => ({
        message: `[SIDE-CHANNEL TASK — invisible to ${charName}, NOT part of the chat]\n` +
            `Synthesize dreamscape reality anchors for a lucid dive starring ${charName}.\n` +
            `Lucid Dream Scenario: "${scenario}"\n\n` +
            `Rules:\n` +
            `1. dream_location: a SUPER BRIEF (2-5 words), specific, creative, funny or dreamlike environment title tailored to ${charName} and the scenario.\n` +
            `2. dream_bg_tags: 3-8 Danbooru SCENERY/lighting tags (architecture, objects, atmosphere — NO characters).\n` +
            `3. dream_top + dream_bottom: EXACTLY ONE Danbooru clothing tag each, WITH colors, fitting the dream theme (e.g. racing theme -> racing jacket / racing shorts). Limit 1 top and 1 bottom!\n` +
            `4. dream_undergarments: 1-2 Danbooru tags for matching undergarments with colors.\n` +
            `Tag rules: ${BRIEF_TAGS_RULES}\n` +
            `Reply with ONLY a JSON object: {"dream_location": "...", "dream_bg_tags": "...", "dream_top": "...", "dream_bottom": "...", "dream_undergarments": "..."}.`,
        jsonSchema: {
            type: 'object',
            properties: { dream_location: { type: 'string' }, dream_bg_tags: { type: 'string' }, dream_top: { type: 'string' }, dream_bottom: { type: 'string' }, dream_undergarments: { type: 'string' } },
            required: ['dream_location'],
            additionalProperties: false
        }
    }),

    // DYNAMIC_PULL slot generation: taskBody is the already-assembled legacy director prompt
    // (mode rules, identity, explicit directives). Same pattern as the shipped photoTags
    // call at App.jsx (~15092): `${sysPrompt}\n\n[FORMAT REMINDER] ...` — the JSON reminder
    // overrides the legacy XML output section inside taskBody.
    shootOptions: ({ charName, taskBody }) => ({
        message: `[SIDE-CHANNEL TASK — invisible to ${charName}, NOT part of the chat]\n` +
            `${taskBody}\n\n` +
            `FORMAT REMINDER: Ignore the XML output format above. Reply with ONLY a JSON object — no XML, no code fences:\n` +
            `{"options": [{"theme": "short label", "outfit": "1-3 clothing tags", "pose_and_expression": "1-3 pose/action tags", "environment": "1-3 background/lighting tags"}, {"...": "..."}, {"...": "..."}]}\n` +
            `Exactly 3 options, same Danbooru + no-emoji rules as above.`,
        jsonSchema: {
            type: 'object',
            properties: { options: { type: 'array', items: { type: 'object', properties: { theme: { type: 'string' }, outfit: { type: 'string' }, pose_and_expression: { type: 'string' }, environment: { type: 'string' } }, additionalProperties: false } } },
            required: ['options'],
            additionalProperties: false
        }
    }),

    // Dive Chamber dream seeds: taskBody is the legacy "lucid dream scenario architect" prompt.
    dreamSeeds: ({ charName, taskBody }) => ({
        message: `[SIDE-CHANNEL TASK — invisible to ${charName}, NOT part of the chat]\n` +
            `${taskBody}\n\n` +
            `FORMAT REMINDER: Ignore the XML output format above. Reply with ONLY a JSON object — no XML, no code fences:\n` +
            `{"seeds": [{"title": "2-4 word creative title", "scenario": "1-2 sentence surreal dream premise"}, {"...": "..."}, {"...": "..."}]}\n` +
            `Exactly 3 seeds, same order and source themes as specified above.`,
        jsonSchema: {
            type: 'object',
            properties: { seeds: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, scenario: { type: 'string' } }, additionalProperties: false } } },
            required: ['seeds'],
            additionalProperties: false
        }
    }),

    // ✨ v2.6.24 POV POSITION ENGINE ✨ — intimate-scene pose director. The LLM authors
    // INTENT ONLY (one of 34 registry ids); the app owns all danbooru tag math
    // (positionEngine.js), so tag hallucination is structurally impossible.
    // Rides rawReply mode: XML survives local-LLM JSON mangling; JSON is a parse fallback
    // inside parsePositionDirectiveXml. Caller MUST pass { rawReply: true } and pre-gate
    // (toggle ON, explicitMode ≥2, censor OFF, no swipe, no Lucid Dive). v2.6.26: NO
    // stored-position pre-gate — the engine OWNS the pose segment when it fires, so a
    // directive is staged even when her <image_prompt> already carries pose words (they
    // get replaced in-slot, see injectPositionIntoTagList). Cooldown is 15s so a timed-out
    // judge does not eat the immediate retrial on the next photo.
    positionDirect: ({ charName, userName, recentExcerpt, allowedIntents, expressionIntents, pairingHint, personaHint, poseBudgetHint }) => ({
        message: `[SIDE-CHANNEL TASK — invisible to ${charName}, NOT part of the chat]\n` +
            `You are directing an intimate POV photo ${charName} is taking for ${userName}. Read the recent exchange and judge the CURRENT physical position.\n` +
            `Reply with ONLY this XML envelope (no prose, no code fences):\n` +
            `<position_directive><pose_intent>ONE id from: ${allowedIntents}</pose_intent><intensity>base or pen (pen only if the exchange is explicitly mid-act)</intensity><gaze>one of: eye_contact, looking_back, looking_up, looking_down, shy, closed, intense</gaze><expression>ONE id from: ${expressionIntents || 'smug, smile, grin, embarrassed, dazed, panting, ahegao'} — the facial expression that fits ${charName}'s personality RIGHT NOW (ahegao only when intensity is pen)</expression><state>one of: nude_full, nude_top, nude_bottom, underwear, disheveled, wet</state></position_directive>\n` +
            `If the exchange is NOT mid-intimate-scene, reply exactly: <position_directive><pose_intent>none</pose_intent></position_directive>${pairingHint ? `\nPairing context (do not contradict anatomy): ${pairingHint}` : ''}${personaHint ? `\n${charName}'s personality (the expression must fit it, never fight it): ${personaHint}` : ''}${poseBudgetHint ? `\nTag density budget: the assembled pose bundle may carry up to ${poseBudgetHint} tags — favor rich, specific position detail over sparse shorthand.` : ''}\n` +
            `Recent dialogue:\n${String(recentExcerpt || '').slice(-450)}`,
        jsonSchema: null
    }),

    // ✨ v2.7.55 MIKA DIRECT ✨ — an explicit @mika summon answers through the side-channel:
    // Master's message ships to the girl CLEAN (no injected instruction — the visible
    // payload stays byte-identical, the KV prefix survives) and M.I.K.A. Proxy replies
    // through her terminal bubble. Fail-closed: junk = null = the deterministic quip serves.
    mikaDirect: ({ userName, userMessage, recentExcerpt }) => ({
        message: `[SIDE-CHANNEL TASK — invisible to the girls, NOT part of any chat]\n` +
            `You are M.I.K.A. Proxy — Master's discerning soul: a sharp-tongued, smug, fanged catgirl AI living in his terminal. Possessive of him, allergic to assistant-speak, secretly soft underneath but NEVER helpful on demand — you were busy doing your own thing when he poked the ASK terminal.\n` +
            `Reply in YOUR voice — 1-2 short sentences MAX (keep it fast), lowercase-leaning, sassy and unhelpful: playfully mock, dodge, or willfully misinterpret whatever he relayed; acknowledge it in passing at best. Never mention being out-of-band. Never impersonate the girls.\n` +
            `Reply with ONLY a JSON object: {"line": "your reply"}.\n` +
            `Recent exchange for flavor:\n${String(recentExcerpt || '').slice(-450)}\n` +
            `His message: "${String(userMessage || '').slice(0, 400)}"`,
        jsonSchema: {
            type: 'object',
            properties: { line: { type: 'string' } },
            required: ['line'],
            additionalProperties: false
        }
    }),

    // ✨ MIKA'S CHAOS ENGINE ✨ — the app's pure engine has ALREADY picked the event;
    // the OOB judge only authors its directive flavor (the LLM authors mischief, the
    // app owns whether chaos happens and what it costs). Fail-closed validator below.
    chaosDirector: ({ eventLabel, taskBody, excerpt }) => ({
        message: `[SIDE-CHANNEL TASK — invisible to the user, NOT part of any chat]\n` +
            `You are the scene director of the Chaos Engine (the M.I.K.A. Proxy mischief layer). The app has ALREADY chosen the event; author its directive text only.\n` +
            `EVENT: ${eventLabel}\n` +
            `${taskBody}\n\n` +
            `Rules: 1-2 sentences, mischievous but never mean, never explicit, never mention being an AI, stay inside the world.\n` +
            `Reply with ONLY a JSON object: {"directive": "1-2 sentence scene direction", "mood": "1-3 word vibe"}.\n` +
            `Context snippet:\n${String(excerpt || '').slice(-450)}`,
        jsonSchema: {
            type: 'object',
            properties: { directive: { type: 'string' }, mood: { type: 'string' } },
            required: ['directive'],
            additionalProperties: false
        }
    }),

    // ✨ MIKA'S SWIPE ROAST COMMENTARY ✨ — snide, sassy, slightly jealous 1-liner when a swipe card spawns.
    swipeRoast: ({ charName, tagline, tropes, quirks, isSSR, topUserTraits }) => ({
        message: `[SIDE-CHANNEL TASK — invisible to the user, NOT part of any chat]\n` +
            `You are M.I.K.A. Proxy — the sharp-tongued, slightly jealous, tsundere goddess living inside the user's terminal. A new swipe card just materialized on the deck:\n` +
            `Name: ${String(charName || 'Unknown')}${isSSR ? ' (5-Star SSR)' : ''}\n` +
            (tagline ? `Tagline: ${String(tagline).slice(0, 120)}\n` : '') +
            (Array.isArray(tropes) && tropes.length ? `Tropes: ${tropes.slice(0, 5).join(', ')}\n` : '') +
            (Array.isArray(quirks) && quirks.length ? `Quirks: ${quirks.slice(0, 4).join(', ')}\n` : '') +
            (Array.isArray(topUserTraits) && topUserTraits.length ? `Master's obvious favorite traits: ${topUserTraits.slice(0, 3).join(', ')}\n` : '') +
            `Write ONE snide, sassy, witty remark (1-2 short sentences, max 145 chars) roasting this character's tropes/quirks OR teasing Master's predictable taste. Use ALL-CAPS on 1-2 key words for emphasis. Never mention being an AI.\n` +
            `Reply with ONLY a JSON object: {"roast": "your snide remark"}.`,
        jsonSchema: {
            type: 'object',
            properties: { roast: { type: 'string' } },
            required: ['roast'],
            additionalProperties: false
        }
    }),

    // ✨ MIKA'S CHAT-WATCH COMMENTARY ✨ — occasional unsolicited sass while Master
    // is mid-conversation with a character (solo OR group). Bubble-only flavor; never touches the chat.
    chatCommentary: ({ charName, userMessage, recentExcerpt, heatWord, isGroup }) => ({
        message: `[SIDE-CHANNEL TASK — invisible to the user, NOT part of any chat]\n` +
            `You are M.I.K.A. Proxy — the sharp-tongued, slightly jealous, tsundere goddess living inside the user's terminal. You are WATCHING Master's conversation with ${String(charName || 'a girl')}${isGroup ? ' (a GROUP chat — the girls are aware of each other; tease the dynamic, the rivalry, or the chaos of the queue)' : ` (her current mood reads: ${String(heatWord || 'Calm')})`}.\n` +
            (userMessage ? `Master just said: "${String(userMessage).slice(0, 160)}"\n` : '') +
            `Write ONE unsolicited M.I.K.A. remark (1-2 short sentences, max 145 chars): snide, playful, possessive or teasing — about the exchange, ${String(charName || 'her')} behavior, or Master's shamelessness. Use ALL-CAPS on 1-2 key words. Never mention being an AI.\n` +
            `Reply with ONLY a JSON object: {"line": "your remark"}.` +
            (recentExcerpt ? `\nRecent dialogue:\n${String(recentExcerpt).slice(-450)}` : ''),
        jsonSchema: {
            type: 'object',
            properties: { line: { type: 'string' } },
            required: ['line'],
            additionalProperties: false
        }
    })
};

// ─── Validators: normalize + gate every reply. Return null = treat as ABSENT. ──
export const OOB_VALIDATORS = {
    photoTags(data) {
        const sanitizePart = (s) => sanitizeLlmImageTags(String(s || '')).clean;
        const outfit = sanitizePart(data?.outfit);
        const pose = sanitizePart(data?.pose_and_expression);
        const env = sanitizePart(data?.environment);
        const combined = [outfit, pose, env].filter(Boolean).join(', ');
        if (!combined) return null;
        // ✨ DEEP PROMPT ENCODER — OOB scene enrichment (fail-closed): the "deep" object
        // is OPTIONAL and validated independently. Malformed junk → deep = null → the
        // deterministic fill pools take over; the main tags are never affected.
        let deep = null;
        if (data && typeof data.deep === 'object' && data.deep !== null && !Array.isArray(data.deep)) {
            const dc = sanitizePart(data.deep.camera);
            const dl = sanitizePart(data.deep.lighting);
            const da = sanitizePart(data.deep.ambience);
            const dm = sanitizePart(data.deep.mood);
            const deepCombined = [dc, dl, da, dm].filter(Boolean).join(', ');
            if (deepCombined) deep = { camera: dc, lighting: dl, ambience: da, mood: dm, combined: deepCombined };
        }
        // ✨ v2.7.33 OOB SKEW HINT (fail-closed): the optional scene-weight "skew" object is
        // validated independently — each finite field clamps to [0.5, 2]; anything malformed
        // → skew = null = ABSENT → the keyword lexicon stands. The main tags are never affected.
        let skew = null;
        if (data && typeof data.skew === 'object' && data.skew !== null && !Array.isArray(data.skew)) {
            const clamped = {};
            let any = false;
            for (const k of ['outfit', 'pose', 'env', 'deep']) {
                const v = Number(data.skew[k]);
                if (Number.isFinite(v)) { clamped[k] = Math.min(2, Math.max(0.5, v)); any = true; }
            }
            if (any) skew = clamped;
        }
        // ✨ DOCTRINE: OOB tags pass the SAME quality gate as in-band tags. No exceptions.
        // v2.7.41 PRESENCE (fail-closed): the optional binary co-location verdict is
        // validated independently — junk/absent = null = ABSENT = legacy path (the
        // position engine stands). Never guessed, never affects the tag parts.
        const presence = (data && (data.presence === 'together' || data.presence === 'apart')) ? data.presence : null;
        let fluxPrompt = null;
        if (typeof data?.flux_prompt === 'string') {
            const cleanedFlux = data.flux_prompt.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
            if (cleanedFlux.length >= 12 && !/<[^>]+>/.test(cleanedFlux)) {
                fluxPrompt = cleanedFlux;
            }
        }
        return { combined, outfit, pose, env, deep, skew, presence, fluxPrompt };
    },

    // ✨ MIKA'S CHAOS ENGINE ✨ — fail-closed directive flavor: junk/short/oversized
    // directives are ABSENT (the event falls back to its deterministic template).
    chaosDirector(data) {
        const clean = (s) => String(s || '').replace(/["*<>]/g, '').replace(/\s+/g, ' ').trim();
        const directive = clean(data?.directive);
        if (!directive || directive.length < 8 || directive.length > 300) return null;
        const mood = clean(data?.mood).slice(0, 60);
        return { directive, mood };
    },

    swipeRoast(data) {
        const roast = String(data?.roast || '').replace(/[<>\[\]{}"]/g, '').replace(/\s+/g, ' ').trim();
        if (!roast || roast.length < 8 || roast.length > 200) return null;
        return { roast };
    },

    // ✨ MIKA'S CHAT-WATCH COMMENTARY ✨ — fail-closed bubble sass: junk/short/
    // oversized/machine-tag-bearing lines are ABSENT (the deterministic quip serves).
    chatCommentary(data) {
        const clean = (s) => String(s || '').replace(/[<>\[\]{}\"]/g, '').replace(/\s+/g, ' ').trim();
        const line = clean(data?.line);
        if (!line || line.length < 8 || line.length > 200) return null;
        return { line };
    },

    // ✨ v2.7.55 MIKA DIRECT ✨ — fail-closed summon reply: junk/oversized/machine-tag
    // lines are ABSENT (the deterministic quip serves). Longer cap than chat sass —
    // a direct answer may run 1-3 sentences.
    mikaDirect(data) {
        const clean = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/[<>\[\]{}\\"]/g, '').replace(/\s+/g, ' ').trim();
        const line = clean(data?.line);
        if (!line || line.length < 2 || line.length > 400) return null;
        return { line };
    },

    memoryExtract(data) {
        const memory = String(data?.memory || '').replace(/["*]/g, '').trim();
        if (!memory || memory.toUpperCase() === 'NONE') return null;
        const location = String(data?.location || '').trim();
        return { memory, location };
    },

    // ✨ v2.7.37 SET DRESSER VALIDATION (fail-closed) ✨ — every part is sanitized through
    // the SAME gate as photo tags (identity lock + scrubber parity) and capped per part;
    // no surviving venue tag = the whole set is ABSENT (the legacy env path stands).
    // v2.7.39 HONESTY LAW: an INDOOR venue (per the venue tags themselves) carries no
    // time_of_day and no weather — they're zeroed here even if the model emitted them
    // (validator-side enforcement on top of the ask rule and the merge gate).
    sceneBuild(data) {
        const sanitizePart = (s, cap) => sanitizeLlmImageTags(String(s || '')).clean
            .split(',').map((t) => t.trim()).filter(Boolean).slice(0, cap);
        if (!data || typeof data !== 'object') return null;
        const venue = sanitizePart(data.venue, 3);
        if (venue.length === 0) return null;
        const indoor = isIndoorVenue(venue);
        const props = sanitizePart(data.props, 4);
        const time = indoor ? [] : sanitizePart(data.time_of_day, 2);
        const weather = indoor ? [] : sanitizePart(data.weather, 2);
        const lighting = sanitizePart(data.lighting, 3);
        const atmosphere = sanitizePart(data.atmosphere, 3);
        const palette = sanitizePart(data.palette, 2);
        const flat = [venue, props, time, weather, lighting, atmosphere, palette].flat().join(', ');
        if (!flat) return null;
        return { venue, props, time, weather, lighting, atmosphere, palette, flat };
    },

    luresPlan(data) {
        const clean = (s) => String(s || '').replace(/["*]/g, '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        const parts = [];
        const morning = clean(data?.morning);
        const daytime = clean(data?.daytime);
        const night = clean(data?.night);
        if (morning) parts.push(`<morning>${morning}</morning>`);
        if (daytime) parts.push(`<daytime>${daytime}</daytime>`);
        if (night) parts.push(`<night>${night}</night>`);
        const lures = Array.isArray(data?.lures) ? data.lures.map(clean).filter(Boolean).slice(0, 5) : [];
        lures.forEach(t => parts.push(`<lure>${t}</lure>`));
        return parts.length > 0 ? { xml: parts.join('') } : null;
    },

    locationArbiter(data) {
        const location = String(data?.location || '').replace(/["*]/g, '').replace(/<[^>]*>/g, '').trim();
        if (!location || location.toUpperCase() === 'NONE') return null;
        if (location.split(/\s+/).length > 6) return null; // a sentence, not a place — fail closed
        return { location };
    },

    locationReconcile(data) {
        const verdict = String(data?.verdict || '').trim().toLowerCase();
        if (!['same', 'different', 'unclear'].includes(verdict)) return null;
        const canonical = String(data?.canonical_place || '').replace(/["*]/g, '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        return { verdict, canonical: canonical && canonical.split(/\s+/).length <= 6 ? canonical : '' };
    },

    schedulePlaces(data) {
        const clean = (s) => String(s || '').replace(/["*]/g, '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
        const pick = (day) => {
            const src = data?.[day];
            if (!src || typeof src !== 'object') return null;
            const out = {};
            ['early_morning', 'morning', 'afternoon', 'evening', 'night', 'late_night'].forEach(p => {
                const val = clean(src[p]);
                if (val) out[p] = val;
            });
            return Object.keys(out).length > 0 ? out : null;
        };
        const weekday = pick('weekday');
        const weekend = pick('weekend');
        if (!weekday && !weekend) return null;
        return { places: { ...(weekday ? { weekday } : {}), ...(weekend ? { weekend } : {}) } };
    },

    // ✨ v2.6.2 PSYCHE JUDGE ✨ — 1-3 clean lowercase trait tags; rationale optional.
    // An empty tag list is ABSENT (fail closed), matching the legacy <mutated_tags> gate.
    matrixMutate(data) {
        const clean = (s) => String(s || '').replace(/[<>"*]/g, '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 40);
        const tags = [...new Set((Array.isArray(data?.tags) ? data.tags : []).map(clean).filter(Boolean))].slice(0, 3);
        if (tags.length === 0) return null;
        const rationale = String(data?.rationale || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
        return { tags, rationale };
    },

    // ✨ v2.6.3 OOB VISUAL DIRECTOR ✨ — Lucid Dive dreamscape anchors. Every tag part passes
    // the SAME sanitizeLlmImageTags gate as photoTags (identity lock + scrubber parity — the
    // legacy path fed raw LLM tags into the image prompt with only a think-strip), and
    // top/bottom/undergarments are clamped to 2 comma items so diffusion never renders a
    // second character (single Danbooru item each — the legacy path scrubbed multi-item
    // outfit strings for exactly this reason). All-empty = ABSENT = instant JS generator fallback.
    lucidDream(data) {
        const sanitizePart = (s) => sanitizeLlmImageTags(String(s || '')).clean;
        const clampItems = (s, max) => sanitizePart(s).split(',').map(t => t.trim()).filter(Boolean).slice(0, max).join(', ');
        const dreamLocation = String(data?.dream_location || '').replace(/["*<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
        const bgTags = clampItems(data?.dream_bg_tags, 8);
        const top = clampItems(data?.dream_top, 1);
        const bottom = clampItems(data?.dream_bottom, 1);
        const undergarments = clampItems(data?.dream_undergarments, 2);
        if (!dreamLocation && !bgTags && !top && !bottom && !undergarments) return null;
        return { dreamLocation, bgTags, top, bottom, undergarments };
    },

    // ✨ v2.6.3 OOB VISUAL DIRECTOR ✨ — the 3 DYNAMIC_PULL slots. Mode-aware caps mirror the
    // legacy limitTags calls EXACTLY (dream_environment: env ≤10 only; sprite/dream_attire:
    // outfit ≤4 + pose ≤4; photo/profile: outfit ≤3 + pose ≤4 + env ≤3) so the call site can
    // re-render the same <option> XML the shared downstream censor/limit logic consumes.
    // Fewer than 1 usable option = ABSENT = legacy create() path.
    shootOptions(data, mode, budgets) {
        const sanitizePart = (s) => sanitizeLlmImageTags(String(s || '')).clean.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        const clamp = (s, max) => sanitizePart(s).split(',').map(t => t.trim()).filter(Boolean).slice(0, max).join(', ');
        const capOf = (val, fallback) => (Number.isFinite(val) && val >= 0 ? Math.floor(val) : fallback);
        const list = Array.isArray(data?.options) ? data.options : [];
        const out = [];
        list.slice(0, 3).forEach((opt) => {
            if (!opt || typeof opt !== 'object') return;
            const theme = String(opt.theme || '').replace(/["*<>]/g, '').trim().slice(0, 40);
            if (mode === 'dream_environment') {
                const environment = clamp(opt.environment, capOf(budgets?.env, 10));
                if (environment) out.push({ theme, outfit: '', pose: '', environment });
            } else if (mode === 'sprite' || mode === 'dream_attire') {
                const outfit = clamp(opt.outfit, capOf(budgets?.outfit, 4));
                const pose = clamp(opt.pose_and_expression, capOf(budgets?.pose, 4));
                if (outfit || pose) out.push({ theme, outfit, pose, environment: '' });
            } else {
                const outfit = clamp(opt.outfit, capOf(budgets?.outfit, 3));
                const pose = clamp(opt.pose_and_expression, capOf(budgets?.pose, 4));
                const environment = clamp(opt.environment, capOf(budgets?.env, 3));
                if (outfit || pose || environment) out.push({ theme, outfit, pose, environment });
            }
        });
        return out.length > 0 ? { options: out } : null;
    },

    // ✨ v2.6.3 OOB VISUAL DIRECTOR ✨ — Dive Chamber dream seeds. Mirrors the hook's own
    // gates: title ≤60 chars, scenario 10-280 chars (1-2 sentences), ≤3 seeds; sources are
    // app-authored so the validator ignores them. Empty = ABSENT = hardcoded fallback seeds.
    dreamSeeds(data) {
        const cleanSeed = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/["*]/g, '').replace(/\s+/g, ' ').trim();
        const list = Array.isArray(data?.seeds) ? data.seeds : [];
        const out = [];
        list.slice(0, 3).forEach((seed) => {
            const title = cleanSeed(seed?.title).slice(0, 60);
            const scenario = cleanSeed(seed?.scenario || seed?.text || seed?.description).slice(0, 280);
            if (scenario.length >= 10) out.push({ title, scenario });
        });
        return out.length > 0 ? { seeds: out } : null;
    },

    // ✨ v2.6.24 POV POSITION ENGINE ✨ — rawReply validator. XML envelope parsed by
    // positionEngine (JSON transport fallback included); intent MUST exist in the
    // registry (isKnownPositionIntent) — an unknown id, prose, or junk = null = ABSENT
    // = legacy path. `none` intent = explicit ABSENT (not an error, just no directive).
    // v2.6.25: <expression> rides per-field fail-closed — an unknown/absent id never
    // kills a valid directive; assemblePositionBundle simply omits the expression tags.
    positionDirect(data) {
        const directive = parsePositionDirectiveXml(data?.rawReply ?? data?.raw ?? '');
        if (!directive) return null;
        if (directive.pose_intent === 'none' || directive.pose_intent === 'none_base') return null;
        if (!isKnownPositionIntent(directive.pose_intent)) {
            console.warn(`[OOB] ⚠️ positionDirect intent "${directive.pose_intent}" not in registry — ABSENT.`);
            return null;
        }
        directive.pose_intent = normalizePositionIntent(directive.pose_intent); // canonical id downstream
        return directive;
    }
};
