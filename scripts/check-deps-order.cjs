/**
 * ✨ MIKA'S DEPS-ORDER GUARD ✨ (v2.7.47)
 *
 * Crash class: "Cannot access 'X' before initialization" at boot (TDZ). When a state
 * destructured from useState is referenced inside a useEffect/useMemo/useCallback DEPENDENCY
 * ARRAY that sits textually ABOVE the declaration, the deps array evaluates during render —
 * before the const initializes — and every render of the component throws. Shipped in
 * v2.7.44 ('!!activeChatStatsModal' deps vs its useState 5 lines below), detonated at the
 * v2.7.46 boot with NEURAL_MATRIX_DESYNC. The hook-import guard cannot see this class.
 *
 * What we check (fail-closed): for every deps array (`}, [deps])`) in the src jsx/js files,
 * resolve each dep's base identifier against every `const [a, b] = useState(...)` declaration;
 * any dep whose declaration lives on a LATER line than the deps array fails the build.
 * (Effect BODIES are deferred and may legally reference later declarations — only the
 * render-time deps evaluation is guarded.)
 *
 * Zero deps: Node built-ins only. Runs on prebuild, next to check-hook-imports.cjs.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const collectFiles = (dir, out = []) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) collectFiles(p, out);
        else if (/\.(jsx|js)$/.test(entry.name)) out.push(p);
    }
    return out;
};

let offenders = 0;
for (const file of collectFiles(SRC)) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const decls = new Map(); // state name -> first declaration line (1-based)
    lines.forEach((l, i) => {
        const m = l.match(/const\s*\[\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*\]\s*=\s*useState/);
        if (m) {
            if (!decls.has(m[1])) decls.set(m[1], i + 1);
            if (!decls.has(m[2])) decls.set(m[2], i + 1);
        }
    });
    lines.forEach((l, i) => {
        const m = l.match(/\},\s*\[([^\]]*)\]\s*\)/);
        if (!m) return;
        for (const raw of m[1].split(',')) {
            const id = raw.trim();
            if (!id) continue;
            const base = id.replace(/^!+/, '').split(/[.\[\)\s(]/)[0];
            if (decls.has(base) && decls.get(base) > i + 1) {
                offenders += 1;
                console.error(`[deps-order] ${path.relative(ROOT, file)}:${i + 1} — dep '${id}' reads useState '${base}' declared LATER (line ${decls.get(base)}). Hoist the declaration above this deps array (render-time TDZ boot crash class, see v2.7.44/47).`);
            }
        }
    });
}

if (offenders > 0) {
    console.error(`[deps-order] ✖ ${offenders} render-time TDZ offender(s). Fix before building.`);
    process.exit(1);
}
console.log('[deps-order] ✓ no deps-array TDZ offenders');
