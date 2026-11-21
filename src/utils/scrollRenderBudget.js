// ✨ MIKA'S SCROLL-TIME RENDER BUDGET (v2.5.35) ✨
// Background animations are compositor-driven (GPU) and stay smooth even under load, but
// scrolling was sluggish: the frosted-glass header + input bars sit OVER the scrolling
// message list, so WKWebView recomputed their backdrop-filter blurs on EVERY scroll
// frame. While body.mika-scroll-budget is present, index.css strips those blurs (same
// trick as the proven v2.5.24 stream budget). The class is added on the first scroll
// event and removed ~250ms after the last one, so the frosted look fully restores at rest.

const SCROLL_BUDGET_CLASS = 'mika-scroll-budget';
const SCROLL_BUDGET_RELEASE_MS = 250;

let releaseTimer = null;

// ✨ v2.5.35 SCROLL FPS PROBE (diagnostics) ✨ — set window.mikaScrollFps = true in the
// console before scrolling; a frame-time histogram is logged when the scroll rests.
const fpsProbe = { active: false, lastTs: 0, deltas: [], startTs: 0 };

function maybeStartFpsProbe() {
    if (typeof window === 'undefined' || !window.mikaScrollFps) return;
    if (fpsProbe.active) return;
    fpsProbe.active = true;
    fpsProbe.lastTs = 0;
    fpsProbe.deltas = [];
    fpsProbe.startTs = performance.now();
    requestAnimationFrame(probeTick);
}

function probeTick(ts) {
    if (!fpsProbe.active) return;
    if (fpsProbe.lastTs) fpsProbe.deltas.push(ts - fpsProbe.lastTs);
    fpsProbe.lastTs = ts;
    requestAnimationFrame(probeTick);
}

function stopFpsProbe(log) {
    if (!fpsProbe.active) return;
    fpsProbe.active = false;
    if (log && fpsProbe.deltas.length > 0 && typeof console !== 'undefined') {
        const ds = fpsProbe.deltas.slice().sort((a, b) => a - b);
        const n = ds.length;
        const avg = ds.reduce((a, b) => a + b, 0) / n;
        const p95 = ds[Math.min(n - 1, Math.floor(n * 0.95))];
        console.log(`📊 [MIKA SCROLL FPS] samples=${n} avg=${(1000 / avg).toFixed(1)}fps frame=${avg.toFixed(1)}ms p95=${p95.toFixed(1)}ms worst=${ds[n - 1].toFixed(1)}ms dur=${((performance.now() - fpsProbe.startTs) / 1000).toFixed(2)}s`);
    }
    fpsProbe.deltas = [];
}

export function markChatScrollActive() {
    if (typeof document === 'undefined') return;
    document.body.classList.add(SCROLL_BUDGET_CLASS);
    if (releaseTimer) clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => {
        releaseTimer = null;
        if (typeof document !== 'undefined') {
            document.body.classList.remove(SCROLL_BUDGET_CLASS);
        }
        stopFpsProbe(true);
    }, SCROLL_BUDGET_RELEASE_MS);
    maybeStartFpsProbe();
}

export function clearChatScrollBudget() {
    if (releaseTimer) {
        clearTimeout(releaseTimer);
        releaseTimer = null;
    }
    if (typeof document !== 'undefined') {
        document.body.classList.remove(SCROLL_BUDGET_CLASS);
    }
    stopFpsProbe(false);
}
