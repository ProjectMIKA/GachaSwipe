// ✨ M.I.K.A. PHOTO VIEWER CAMERA ✨
// Shutter-flash + freeze-frame director for the fullscreen photo viewer.
// Same choreography as the LLM stream freeze (flash lands, then the cinematic /
// panning canvas pauses 180ms later as the flash peaks), but on its OWN body
// class (mika-photo-freeze) so it can never fight the LLM activity governor.
// The fullscreen photo itself carries .mika-fs-pan and is EXEMPT from the pause.

const FREEZE_DELAY_MS = 180; // freeze lands as the shutter flash peaks, masking the transition

let freezeTimer = null;
let frozen = false;   // freeze class currently applied
let freezeArmed = false; // we flashed-in for this viewer episode

function triggerShutterFlash(dir) {
    if (typeof document === 'undefined') return;
    document.body.classList.remove('mika-shutter-in', 'mika-shutter-out');
    void document.body.offsetWidth; // force style flush so the flash can restart
    document.body.classList.add(dir === 'in' ? 'mika-shutter-in' : 'mika-shutter-out');
}

function applyFreeze() {
    frozen = true;
    if (typeof document === 'undefined') return;
    document.body.classList.add('mika-photo-freeze');
}

function releaseFreeze() {
    const wasArmed = freezeArmed;
    frozen = false;
    freezeArmed = false;
    if (typeof document !== 'undefined' && wasArmed) {
        triggerShutterFlash('out');
        document.body.classList.remove('mika-photo-freeze');
        // ✨ WKWEBVIEW RESUME NUDGE ✨: some WebView builds latch `animation-play-state: paused`
        // even after the driving class is removed — unless the LLM stream freeze still owns
        // the camera, in which case leave its canvas paused and skip the nudge entirely.
        if (document.body.classList.contains('mika-stream-freeze')) return;
        void document.body.offsetWidth;
        document.body.classList.add('mika-camera-resume');
        setTimeout(() => document.body.classList.remove('mika-camera-resume'), 250);
    }
}

// Open: flash in, then freeze the cinematic/panning canvas behind the viewer.
export function armPhotoViewerFreeze() {
    if (frozen || freezeArmed || freezeTimer) return; // idempotent — one episode at a time
    freezeArmed = true;
    triggerShutterFlash('in');
    if (typeof document === 'undefined') { applyFreeze(); return; }
    if (freezeTimer) clearTimeout(freezeTimer);
    freezeTimer = setTimeout(() => {
        freezeTimer = null;
        applyFreeze();
    }, FREEZE_DELAY_MS);
}

// Close: flash out, then release the canvas with the WKWebView resume nudge.
export function releasePhotoViewerFreeze() {
    if (freezeTimer) {
        // Freeze was armed but hadn't landed yet — cancel it so the canvas never pauses
        // for a viewer that is already closed.
        clearTimeout(freezeTimer);
        freezeTimer = null;
        freezeArmed = false;
        return;
    }
    if (!frozen && !freezeArmed) return;
    releaseFreeze();
}

export function isPhotoViewerFrozen() {
    return frozen || (typeof document !== 'undefined' && document.body.classList.contains('mika-photo-freeze'));
}

export function resetPhotoViewerCamera() {
    if (freezeTimer) { clearTimeout(freezeTimer); freezeTimer = null; }
    frozen = false;
    freezeArmed = false;
    if (typeof document !== 'undefined') {
        document.body.classList.remove('mika-photo-freeze', 'mika-shutter-in', 'mika-shutter-out', 'mika-camera-resume');
    }
}

// ✨ MIKA'S SPRITE STUDIO GRIP (touch-drag panning math) ✨
// Ported from SpriteStudio's StudioStage drag physics: one full image-width of finger
// travel pans 150% of object-position (the overdrive makes the grip feel fast/premium),
// clamped to the 0-100% object-position range.
export const FS_PAN_OVERDRIVE = 150;

export function clampPan(value) {
    return Math.max(0, Math.min(100, value));
}

export function computeDragPan(initialX, initialY, dx, dy, width, height) {
    const w = width > 0 ? width : 1;
    const h = height > 0 ? height : 1;
    return {
        x: clampPan(initialX - (dx / w) * FS_PAN_OVERDRIVE),
        y: clampPan(initialY - (dy / h) * FS_PAN_OVERDRIVE),
    };
}

// ✨ AMBIENT AUTO-PAN MATH ✨ — the fullscreen photo's ambient drift is driven by a JS rAF
// camera loop instead of CSS keyframes, so grabs/resumes can never fight the CSS cascade.
// This is the pure, testable ping-pong step: drift at the same speed the old subtlePan
// keyframe had (200% of the position range per 35s = one full 0→100→0 sweep), reflecting
// direction at the edges.
export const FS_PAN_SPEED = 200 / 35; // object-position % per second (subtlePan parity)

export function stepAmbientPan(x, dir, dtSeconds) {
    let nx = x + dir * FS_PAN_SPEED * Math.max(0, dtSeconds);
    let nd = dir;
    if (nx >= 100) { nx = 200 - nx; nd = -1; }   // reflect off the right edge
    else if (nx <= 0) { nx = -nx; nd = 1; }      // reflect off the left edge
    return { x: clampPan(nx), dir: nd };
}

