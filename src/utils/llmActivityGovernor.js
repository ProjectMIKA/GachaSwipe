// ✨ M.I.K.A. LLM ACTIVITY GOVERNOR ✨
// Ref-counted registry of in-flight LLM operations (chat streams, completions, image generation).
// While ANY operation is in flight on a LOCAL engine, the chat canvas is freeze-framed (shutter
// flash + animation pause) so llama.cpp keeps the CPU instead of fighting the compositor.
// The animation returns with a gentle shutter-release after the LAST operation completes.
// A debounce window bridges the natural gaps between chained steps (text -> photo prompt -> image
// gen, group spool batch -> next batch) so the background never flickers between steps.

import { isPerchanceModelSelected, generateImageViaPerchance } from './perchanceBridge.js';
import { convertPromptToFluxProse, PROMPTING_STYLES, isOobProsePromptingStyle } from './fluxPromptConverter.js';

let imagePromptingResolver = null;
let completionPresetMiddleware = null;

export function setImagePromptingResolver(fn) {
    imagePromptingResolver = typeof fn === 'function' ? fn : null;
}

export function setCompletionPresetMiddleware(middleware) {
    completionPresetMiddleware =
        middleware && typeof middleware.beforeRequest === 'function' ? middleware : null;
}

const UNFREEZE_DEBOUNCE_MS = 2000; // resume window after the final LLM op ends
const FREEZE_DELAY_MS = 180;       // freeze lands as the shutter flash peaks, masking the transition
const WATCHDOG_IDLE_SHUTDOWN_MS = 3000; // ✨ v2.5.33: watchdog stands down shortly after the last op ends

let isLocalTierFn = () => false;
const activeOps = new Map(); // opId -> { tag, t0 }
const longOpWarned = new Set(); // opIds already warned as suspiciously long-running
let nextOpId = 1;
let freezeTimer = null;
let unfreezeTimer = null;
let watchdogTimer = null;
let watchdogShutdownTimer = null; // ✨ v2.5.33: pending idle stand-down of the watchdog interval
let frozen = false;          // freeze class currently applied
let freezeArmed = false;     // we flashed-in for this activity episode (local tier)
let thoughtHoldCount = 0;    // ✨ v2.5.50: ref-count of active reasoning-phase freeze holds
let thoughtFreezeOwned = false; // ✨ v2.5.50: the thought freeze armed the camera itself (cloud tier)
let lastImageGenEndAt = 0;   // ✨ v2.5.31: completion time of the most recent diffusion op (host mounts the image model here)
let lastLlmEndAt = 0;        // ✨ v2.5.31: completion time of the most recent chat op (the LLM's KV cache survives only while it stays loaded)

function triggerShutterFlash(dir) {
    if (typeof document === 'undefined') return;
    document.body.classList.remove('mika-shutter-in', 'mika-shutter-out');
    void document.body.offsetWidth; // force style flush so the flash can restart
    document.body.classList.add(dir === 'in' ? 'mika-shutter-in' : 'mika-shutter-out');
}

function applyFreeze() {
    // ✨ v2.5.50: logical state first, DOM side-effects second — the freeze state machine is
    // now observable (and testable) even when document is unavailable.
    frozen = true;
    if (typeof document === 'undefined') return;
    document.body.classList.add('mika-stream-freeze');
    // ✨ STREAM-TIME RENDER BUDGET: strip GPU-expensive backdrop blurs while frozen ✨
    document.body.classList.add('mika-stream-budget');
}

function releaseFreeze() {
    const wasArmed = freezeArmed;
    frozen = false;
    freezeArmed = false;
    if (typeof document !== 'undefined' && wasArmed) {
        triggerShutterFlash('out');
        document.body.classList.remove('mika-stream-freeze');
        document.body.classList.remove('mika-stream-budget');
        // ✨ WKWEBVIEW RESUME NUDGE ✨: some WebView builds latch `animation-play-state: paused`
        // even after the driving class is removed. Force a style flush, then assert running for
        // one frame via the transient mika-camera-resume class (see index.css).
        void document.body.offsetWidth;
        document.body.classList.add('mika-camera-resume');
        setTimeout(() => document.body.classList.remove('mika-camera-resume'), 250);
    }
    // ✨ v2.5.63: PROFILE CAMERA RE-ARM ✨ — a dossier opened while this stream owned the canvas
    // (its arm was deferred). The resume nudge above just woke every subtlePan layer back up, so
    // re-claim the camera for the profile NOW, silently: the mika-profile-freeze rules sit AFTER
    // mika-camera-resume in the cascade, so the canvas re-pauses even inside the nudge window.
    // No second shutter flash — the 'out' flash above reads as the transition. Menu-owned
    // canvases are left to the menu camera (its class keeps them held; endMenuFreeze releases).
    if (profileFreezeWanted && !profileFreezeOwned && !menuFreezeOwned) {
        profileFreezeWanted = false;
        applyProfileFreeze();
    }
    scheduleWatchdogShutdown(); // ✨ v2.5.33: camera is back — nothing left for the watchdog to guard ✨
}

export function configureActivityGovernor({ isLocalTier } = {}) {
    if (typeof isLocalTier === 'function') isLocalTierFn = isLocalTier;
}

// ✨ v2.5.31: IMAGE-SWAP CACHE-EVICTION PROBE ✨
// On-device, mounting the diffusion model forces the host to unload the LLM (RAM), and the
// reverse swap reloads it — wiping the KV prefix cache either way. True when an image op has
// completed after the most recent chat op, i.e. the NEXT LLM turn will be a cold re-prefill.
export function hasImageGenSinceLastLlmTurn() {
    return lastImageGenEndAt > 0 && lastImageGenEndAt > lastLlmEndAt;
}

export function beginLlmActivity(tag = 'llm') {
    const id = nextOpId++;
    const wasEmpty = activeOps.size === 0;
    activeOps.set(id, { tag, t0: Date.now() });
    if (wasEmpty) {
        // Cancel any pending release from the debounce window (chained steps keep the camera frozen)
        if (unfreezeTimer) { clearTimeout(unfreezeTimer); unfreezeTimer = null; }
        if (watchdogShutdownTimer) { clearTimeout(watchdogShutdownTimer); watchdogShutdownTimer = null; } // ✨ v2.5.33: activity resumed — watchdog stays on duty ✨
        ensureWatchdog();
        if (isLocalTierFn()) {
            freezeArmed = true;
            console.log(`[LLMGovernor] 🎬 freeze armed — first op: ${tag} (local tier, ${activeOps.size} op)`);
            triggerShutterFlash('in');
            if (freezeTimer) clearTimeout(freezeTimer);
            freezeTimer = setTimeout(() => {
                freezeTimer = null;
                if (activeOps.size > 0) applyFreeze();
            }, FREEZE_DELAY_MS);
        } else {
            console.log(`[LLMGovernor] op begin: ${tag} (no freeze — non-local tier)`);
        }
    }
    return id;
}

export function endLlmActivity(id) {
    if (id === null || id === undefined || !activeOps.has(id)) return; // unknown / already ended
    const op = activeOps.get(id);
    activeOps.delete(id);
    longOpWarned.delete(id);
    if (activeOps.size === 0) {
        if (unfreezeTimer) clearTimeout(unfreezeTimer);
        // ✨ v2.5.33: only schedule a release when something is actually frozen ✨ — cloud turns
        // used to log a phantom "camera released after debounce" for a freeze that never armed.
        if (frozen || freezeArmed) {
            unfreezeTimer = setTimeout(() => {
                unfreezeTimer = null;
                if (activeOps.size === 0) {
                    console.log(`[LLMGovernor] ⚡ camera released after debounce — last op was ${op ? op.tag : '?'}`);
                    releaseFreeze();
                }
            }, UNFREEZE_DEBOUNCE_MS);
        }
        scheduleWatchdogShutdown();
    }
}

export function isLlmStreamFrozen() {
    return frozen || (typeof document !== 'undefined' && document.body.classList.contains('mika-stream-freeze'));
}

// ✨ v2.5.50: REASONING-PHASE CAMERA FREEZE ✨
// Reasoning models stream <think> tokens into the chat's thought wall for a long stretch of the
// reply. On the LOCAL tier the stream freeze already holds the camera for the whole stream, so
// this is a no-op passenger. On the CLOUD tier nothing ever froze the canvas — so while ONLY
// thought tokens are flowing, we run the exact same shutter choreography as the local freeze:
// flash in → pause the cinematic/panning canvas 180ms later (as the flash peaks). The moment
// real content starts, endThoughtFreeze() releases the camera with the shutter-release flash
// while the reply keeps streaming over the re-animated background.
export function beginThoughtFreeze() {
    thoughtHoldCount++;
    if (frozen || freezeArmed || freezeTimer) {
        // The local-tier stream freeze already owns (or is arming) the camera — ride along.
        return;
    }
    thoughtFreezeOwned = true;
    freezeArmed = true;
    console.log('[LLMGovernor] 🧠 thought freeze armed — reasoning tokens streaming (thought wall active)');
    triggerShutterFlash('in');
    if (freezeTimer) clearTimeout(freezeTimer);
    freezeTimer = setTimeout(() => {
        freezeTimer = null;
        applyFreeze();
    }, FREEZE_DELAY_MS);
}

export function endThoughtFreeze() {
    if (thoughtHoldCount > 0) thoughtHoldCount--;
    if (thoughtHoldCount > 0) return;
    if (!thoughtFreezeOwned) return; // camera owned by the stream freeze — leave it be
    thoughtFreezeOwned = false;
    if (freezeTimer) {
        // Freeze was armed but hadn't landed yet — cancel it so the canvas never pauses
        // for a reasoning phase that is already over.
        clearTimeout(freezeTimer);
        freezeTimer = null;
        freezeArmed = false;
        return;
    }
    releaseFreeze(); // shutter-release flash + WKWebView resume nudge
}

// ✨ v2.5.57: MENU CAMERA FREEZE ✨
// While an in-chat admin surface is open (SYS_CTRL dropdown, CHAT_CTRL archive terminal), the
// cinematic canvas behind the chat freezes under the same shutter choreography as the stream
// freeze. NEW_CHAT rewrites the chat's message list while the menu is open, which re-derives
// the chatBgPool and re-decodes the backdrop PNGs — the freeze masks that swap. Deliberately
// a SEPARATE body class (mika-menu-freeze) from the stream freeze so the two cameras can
// never fight over each other's release paths.
let menuFreezeOwned = false; // the menu camera armed the freeze itself

function applyMenuFreeze() {
    // Logical state first, DOM side-effects second (same shape as the v2.5.50 freeze).
    menuFreezeOwned = true;
    if (typeof document === 'undefined') return;
    document.body.classList.add('mika-menu-freeze');
}

// Open: flash in, then freeze the canvas behind the menu as the flash peaks.
export function beginMenuFreeze() {
    if (menuFreezeOwned || freezeTimer) return; // idempotent — one episode at a time
    triggerShutterFlash('in');
    if (typeof document === 'undefined') { applyMenuFreeze(); return; }
    if (freezeTimer) clearTimeout(freezeTimer); // cheap insurance — never double-arm
    freezeTimer = setTimeout(() => {
        freezeTimer = null;
        applyMenuFreeze();
    }, FREEZE_DELAY_MS);
}

// Close: flash out, then release the canvas with the WKWebView resume nudge.
export function endMenuFreeze() {
    if (!menuFreezeOwned) {
        // Freeze armed but not landed yet: the pending flash-to-freeze timer is ours only
        // while no stream/thought freeze could have taken the shared timer meanwhile.
        if (freezeTimer && activeOps.size === 0 && !frozen && !freezeArmed) {
            clearTimeout(freezeTimer);
            freezeTimer = null;
        }
        return;
    }
    menuFreezeOwned = false;
    if (frozen || freezeArmed || (typeof document !== 'undefined' && document.body.classList.contains('mika-stream-freeze'))) {
        // The stream/thought camera owns (or is arming) the canvas — leave ITS freeze alone.
        // The menu's own claim is void either way, so drop its class and slip out quietly.
        if (typeof document !== 'undefined') document.body.classList.remove('mika-menu-freeze');
        return;
    }
    triggerShutterFlash('out');
    if (typeof document !== 'undefined') {
        document.body.classList.remove('mika-menu-freeze');
        // ✨ WKWEBVIEW RESUME NUDGE ✨ — same latch workaround as the stream release; the
        // stream-freeze coexistence case is fully handled by the early return above.
        void document.body.offsetWidth;
        document.body.classList.add('mika-camera-resume');
        setTimeout(() => document.body.classList.remove('mika-camera-resume'), 250);
    }
}

// ✨ v2.5.61: PROFILE CAMERA FREEZE ✨
// While the chat character profile (dossier) is open, the cinematic canvas behind the chat
// freezes under the same shutter choreography as the menu freeze. The dossier re-renders its
// scroll tree constantly and runs its own subtlePan portrait on the compositor, which used to
// fight the chat's chatCinematicPan/chatHoloFlicker layers and read as background glitching.
// The CSS side (index.css) is scoped to the chat canvas + chat-only animation names — the
// dossier's own portrait (also subtlePan) is deliberately NOT covered by any global rule.
// Separate body class (mika-profile-freeze) so stream/menu/profile cameras never fight.
let profileFreezeOwned = false; // the profile camera armed the freeze itself
let profileFreezeWanted = false; // ✨ v2.5.63: dossier opened while another camera owned the canvas — its release must re-arm us

function applyProfileFreeze() {
    // Logical state first, DOM side-effects second (same shape as the menu freeze).
    profileFreezeOwned = true;
    if (typeof document === 'undefined') return;
    document.body.classList.add('mika-profile-freeze');
}

// Open: flash in, then freeze the chat canvas as the flash peaks.
// ✨ v2.5.63: DEFERRED-CLAIM FIX ✨ — this used to bail silently whenever another camera owned
// (or was arming) the shared freezeTimer, and NOTHING re-armed the profile freeze when that
// stream released mid-dossier: the canvas woke up and its subtlePan wallpaper fought the
// dossier's own subtlePan portrait again (major bg glitching — most visible on freshly
// imported characters, whose chats get visited while their conversion/greeting streams are
// still churning). Now the claim is remembered and the stream release path re-arms the freeze
// (see releaseFreeze).
export function beginProfileFreeze() {
    if (profileFreezeOwned) return; // already armed — one episode at a time
    if (frozen || freezeArmed || freezeTimer || (typeof document !== 'undefined' && document.body.classList.contains('mika-stream-freeze'))) {
        // Another camera owns (or is arming) the canvas — remember the claim, skip the flash
        // (that camera already owns the transition), and let its release re-arm us.
        profileFreezeWanted = true;
        return;
    }
    profileFreezeWanted = false;
    triggerShutterFlash('in');
    if (typeof document === 'undefined') { applyProfileFreeze(); return; }
    if (freezeTimer) clearTimeout(freezeTimer); // cheap insurance — never double-arm
    freezeTimer = setTimeout(() => {
        freezeTimer = null;
        applyProfileFreeze();
    }, FREEZE_DELAY_MS);
}

// Close: flash out, then release the canvas with the WKWebView resume nudge.
export function endProfileFreeze() {
    profileFreezeWanted = false; // ✨ v2.5.63: dossier closed — drop any deferred claim first
    if (!profileFreezeOwned) {
        // Freeze armed but not landed yet: reclaim the shared timer only while no
        // stream/thought/menu freeze could have taken it meanwhile.
        if (freezeTimer && activeOps.size === 0 && !frozen && !freezeArmed) {
            clearTimeout(freezeTimer);
            freezeTimer = null;
        }
        return;
    }
    profileFreezeOwned = false;
    if (frozen || freezeArmed || (typeof document !== 'undefined' && document.body.classList.contains('mika-stream-freeze'))) {
        // The stream/thought camera owns (or is arming) the canvas — leave ITS freeze alone.
        // The profile's own claim is void either way, so drop its class and slip out quietly.
        if (typeof document !== 'undefined') document.body.classList.remove('mika-profile-freeze');
        return;
    }
    triggerShutterFlash('out');
    if (typeof document !== 'undefined') {
        document.body.classList.remove('mika-profile-freeze');
        // ✨ WKWEBVIEW RESUME NUDGE ✨ — same latch workaround as the stream/menu release; the
        // stream-freeze coexistence case is fully handled by the early return above.
        void document.body.offsetWidth;
        document.body.classList.add('mika-camera-resume');
        setTimeout(() => document.body.classList.remove('mika-camera-resume'), 250);
    }
}

export function resetActivityGovernor() {
    if (freezeTimer) { clearTimeout(freezeTimer); freezeTimer = null; }
    if (unfreezeTimer) { clearTimeout(unfreezeTimer); unfreezeTimer = null; }
    if (watchdogTimer) { clearInterval(watchdogTimer); watchdogTimer = null; }
    if (watchdogShutdownTimer) { clearTimeout(watchdogShutdownTimer); watchdogShutdownTimer = null; } // ✨ v2.5.33
    activeOps.clear();
    longOpWarned.clear();
    frozen = false;
    freezeArmed = false;
    thoughtHoldCount = 0;      // ✨ v2.5.50
    thoughtFreezeOwned = false; // ✨ v2.5.50
    menuFreezeOwned = false;    // ✨ v2.5.57
    profileFreezeOwned = false; // ✨ v2.5.61
    profileFreezeWanted = false; // ✨ v2.5.63
    lastImageGenEndAt = 0;
    lastLlmEndAt = 0;
    if (typeof document !== 'undefined') {
        document.body.classList.remove('mika-stream-freeze', 'mika-stream-budget', 'mika-menu-freeze', 'mika-profile-freeze', 'mika-shutter-in', 'mika-shutter-out', 'mika-camera-resume');
    }
}

// ✨ MIKA'S RELEASE WATCHDOG & LEAK SCANNER ✨
// Every 5s: if the camera is somehow frozen with zero in-flight ops (a lost/unfired debounce
// timer or unknown stall), force-release so animated backgrounds can never stay stuck forever.
// Also reports ops running suspiciously long (>90s) — device-console diagnosable.
// ✨ v2.5.33: WATCHDOG STAND-DOWN ✨ — the interval used to tick until unmount once started. Now,
// once nothing is in flight and nothing is frozen (re-checked at fire time), it clears itself.
function scheduleWatchdogShutdown() {
    if (activeOps.size > 0 || frozen || freezeArmed) return;
    if (watchdogShutdownTimer || !watchdogTimer) return;
    watchdogShutdownTimer = setTimeout(() => {
        watchdogShutdownTimer = null;
        if (activeOps.size === 0 && !frozen && !freezeArmed && watchdogTimer) {
            clearInterval(watchdogTimer);
            watchdogTimer = null;
            console.log('[LLMGovernor] 🐾 watchdog idle — standing down');
        }
    }, WATCHDOG_IDLE_SHUTDOWN_MS);
}

function ensureWatchdog() {
    if (watchdogTimer || typeof setInterval === 'undefined') return;
    watchdogTimer = setInterval(() => {
        const now = Date.now();
        if (activeOps.size === 0) {
            if (frozen && !unfreezeTimer && !freezeTimer) {
                console.warn('[LLMGovernor] 🐾 watchdog: frozen with zero ops and no release timer — force releasing!');
                releaseFreeze();
            }
        } else {
            activeOps.forEach((op, id) => {
                const ageSec = Math.floor((now - op.t0) / 1000);
                if (ageSec > 90 && !longOpWarned.has(id)) {
                    longOpWarned.add(id);
                    console.warn(`[LLMGovernor] ⏳ op "${op.tag}" has been running ${ageSec}s (long — possible leak or slow local gen)`);
                }
            });
        }
    }, 5000);
}

// ✨ SDK WRAPPER: one choke point for ALL LLM activity ✨
// Wraps chat.completions.stream / chat.completions.create / images.generateImage on the live SDK
// instance so every generation in the app (1-on-1, group spooling, selfies, forge, card updates)
// automatically feeds the governor. Completion is detected via finalContent() (used by every call
// site), with 'end'/'error'/'abort'/'done' event hooks and abort() as leak-proof fallbacks.
export function wrapLaylaSdkWithActivityGovernor(sdk) {
    if (!sdk) return sdk;
    if (sdk.__mikaGovernorWrapped) return sdk; // ✨ idempotent — never double-wrap (double begin/end pairs would fake ghost activity)
    try {
        const completions = sdk.chat && sdk.chat.completions;
        if (completions) {
            if (typeof completions.stream === 'function') {
                const origStream = completions.stream;
                completions.stream = function (...args) {
                    let mwCtx = null;
                    let callArgs = args;
                    if (completionPresetMiddleware && args.length > 0 && args[0] && typeof args[0] === 'object') {
                        try {
                            mwCtx = completionPresetMiddleware.beforeRequest(args[0]);
                            if (mwCtx && mwCtx.req) {
                                callArgs = [mwCtx.req, ...args.slice(1)];
                            }
                        } catch { /* preserve original request on middleware error */ }
                    }
                    const id = beginLlmActivity('chat.stream');
                    let ended = false;
                    const finish = () => { if (!ended) { ended = true; lastLlmEndAt = Date.now(); endLlmActivity(id); } };
                    let stream;
                    try {
                        stream = origStream.apply(this, callArgs);
                    } catch (e) {
                        finish();
                        throw e;
                    }
                    if (!stream) { finish(); return stream; }
                    if (typeof stream.finalContent === 'function') {
                        const origFinalContent = stream.finalContent.bind(stream);
                        stream.finalContent = async function (...fa) {
                            try {
                                const raw = await origFinalContent(...fa);
                                if (
                                    typeof raw === 'string' &&
                                    completionPresetMiddleware &&
                                    typeof completionPresetMiddleware.transformOutput === 'function' &&
                                    mwCtx &&
                                    mwCtx.injected
                                ) {
                                    try {
                                        return completionPresetMiddleware.transformOutput(raw, mwCtx);
                                    } catch { return raw; }
                                }
                                return raw;
                            }
                            finally { finish(); }
                        };
                    }
                    if (typeof stream.on === 'function') {
                        const origOn = stream.on.bind(stream);
                        stream.on = function (evt, cb) {
                            if (evt === 'end' || evt === 'error' || evt === 'abort' || evt === 'done') {
                                return origOn(evt, function (...ea) {
                                    finish();
                                    return typeof cb === 'function' ? cb(...ea) : undefined;
                                });
                            }
                            return origOn(evt, cb);
                        };
                    }
                    if (typeof stream.abort === 'function') {
                        const origAbort = stream.abort.bind(stream);
                        stream.abort = function (...aa) {
                            try { return origAbort(...aa); }
                            finally { finish(); }
                        };
                    }
                    return stream;
                };
            }
            if (typeof completions.create === 'function') {
                const origCreate = completions.create;
                completions.create = async function (...args) {
                    let mwCtx = null;
                    let callArgs = args;
                    if (completionPresetMiddleware && args.length > 0 && args[0] && typeof args[0] === 'object') {
                        try {
                            mwCtx = completionPresetMiddleware.beforeRequest(args[0]);
                            if (mwCtx && mwCtx.req) {
                                callArgs = [mwCtx.req, ...args.slice(1)];
                            }
                        } catch { /* preserve original request on middleware error */ }
                    }
                    const id = beginLlmActivity('chat.create');
                    try {
                        const result = await origCreate.apply(this, callArgs);
                        if (
                            completionPresetMiddleware &&
                            typeof completionPresetMiddleware.transformOutput === 'function' &&
                            mwCtx &&
                            mwCtx.injected &&
                            result &&
                            Array.isArray(result.choices) &&
                            result.choices[0]?.message &&
                            typeof result.choices[0].message.content === 'string'
                        ) {
                            try {
                                result.choices[0].message.content = completionPresetMiddleware.transformOutput(
                                    result.choices[0].message.content,
                                    mwCtx
                                );
                            } catch { /* ignore transform error */ }
                        }
                        return result;
                    }
                    finally { lastLlmEndAt = Date.now(); endLlmActivity(id); }
                };
            }
        }
        // ✨ v2.6.0: out-of-band side-channel passes count as LLM activity too — the image-gen
        // eviction forensics and stream-freeze logic must see them (host swaps models on diffusion).
        if (sdk.contextual && typeof sdk.contextual.sendOutOfBandMessage === 'function') {
            const origOob = sdk.contextual.sendOutOfBandMessage;
            sdk.contextual.sendOutOfBandMessage = async function (...args) {
                const id = beginLlmActivity('chat.oob');
                try { return await origOob.apply(this, args); }
                finally { lastLlmEndAt = Date.now(); endLlmActivity(id); }
            };
        }
        if (sdk.images && typeof sdk.images.generateImage === 'function') {
            const origGenerate = sdk.images.generateImage;
            sdk.images.generateImage = async function (...args) {
                let [prompt, onProgress, img2img, modelId, options] = args;
                const promptCfg = imagePromptingResolver ? imagePromptingResolver(modelId) : null;
                if (isOobProsePromptingStyle(promptCfg?.style) && typeof prompt === 'string' && prompt.trim() && !options?.skipFluxConvert) {
                    try {
                        if (typeof onProgress === 'function') {
                            try { onProgress('OOB Director: Converting tags to FLUX prose...', 1, 20); } catch { /* ignore */ }
                        }
                        prompt = await convertPromptToFluxProse(prompt, {
                            sdk,
                            tokenBudget: promptCfg.tokenBudget || 256,
                            style: promptCfg.style,
                            customInstructions: promptCfg.customInstructions || '',
                            onFluxConvertStart: promptCfg.onFluxConvertStart,
                            onFluxConvertEnd: promptCfg.onFluxConvertEnd,
                        });
                    } catch { /* fallback handled inside convertPromptToFluxProse */ }
                }
                if (typeof options?.onFinalPrompt === 'function') {
                    try { options.onFinalPrompt(prompt); } catch { /* ignore */ }
                }
                // ✨ PERCHANCE CLOUD BRIDGE INTERCEPT ✨ — routes to cloud iframe without touching
                // local diffusion RAM or flagging LLM KV-cache eviction (`lastImageGenEndAt`).
                if (isPerchanceModelSelected(modelId)) {
                    return await generateImageViaPerchance(prompt, onProgress, options);
                }
                const id = beginLlmActivity('image');
                const nextArgs = [prompt, onProgress, img2img, modelId, options, ...args.slice(5)];
                try { return await origGenerate.apply(this, nextArgs); }
                finally { lastImageGenEndAt = Date.now(); endLlmActivity(id); }
            };
        }
        console.log('[LLMGovernor] Layla SDK wrapped: chat.completions.stream/create + images.generateImage');
    } catch (e) {
        console.warn('[LLMGovernor] Failed to wrap SDK:', e);
    }
    sdk.__mikaGovernorWrapped = true;
    return sdk;
}