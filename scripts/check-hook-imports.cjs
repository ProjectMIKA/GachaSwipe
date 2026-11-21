#!/usr/bin/env node
/**
 * ✨ MIKA'S RULES-OF-HOOKS GUARD (React error #300 "NEURAL_MATRIX_DESYNC" prevention) ✨
 *
 * Born from the v2.5.60 boot hotfix: ChatCtrlModal.jsx called useState() without
 * importing it — vite build stayed GREEN, but the app exploded at boot inside the
 * Layla WebView ("Rendered fewer hooks than expected"). Rollup hoists/reorders module
 * scopes, so a missing named import can even slip through in some chunk layouts.
 *
 * This guard scans every .js/.jsx module under src/ for calls to React hooks and
 * verifies each used hook is actually imported. Exits non-zero on any violation,
 * failing the build BEFORE an artifact is ever produced.
 *
 * Zero dependencies. Run via `npm run prebuild` (wired into `npm run build`).
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

// Every hook this codebase can legally call. Extend when React grows new ones.
const REACT_HOOKS = new Set([
    'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback',
    'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect',
    'useDebugValue', 'useDeferredValue', 'useTransition', 'useId',
    'useSyncExternalStore', 'useInsertionEffect', 'useOptimistic', 'use'
]);

const JS_EXTENSIONS = new Set(['.js', '.jsx']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);

function walk(dir, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, out);
        } else if (JS_EXTENSIONS.has(path.extname(entry.name))) {
            out.push(full);
        }
    }
    return out;
}

// `import React, { useState, useEffect as hookA } from "react"` / `import * as React from "react"`
function collectHookImports(source) {
    const named = new Set();
    let hasNamespaceReact = false;
    const importRe = /import\s+(?:([A-Za-z_$][\w$]*)\s*,\s*)?(?:\{([^}]*)\}|\*\s*as\s+([A-Za-z_$][\w$]*))?\s*from\s*['"]react['"]/g;
    let m;
    while ((m = importRe.exec(source)) !== null) {
        if (m[2]) {
            m[2].split(',').forEach((spec) => {
                const name = spec.split(/\s+as\s+/)[0].trim();
                if (name && REACT_HOOKS.has(name)) named.add(name);
            });
        }
        if (m[3]) hasNamespaceReact = true; // `import * as React` covers React.useState calls
    }
    return { named, hasNamespaceReact };
}

// Local hook definitions (`const useFoo = ...` / `function useFoo(`) are exempt.
function collectLocalHookDefs(source) {
    const defs = new Set();
    const re = /(?:const|let|var|function)\s+([\w$]*)\s*=?\s*(?:=\s*)?(?:\(|async)/g;
    let m;
    while ((m = re.exec(source)) !== null) {
        if (m[1].startsWith('use')) defs.add(m[1]);
    }
    return defs;
}

const files = walk(SRC_DIR, []);
const violations = [];

for (const file of files) {
    const rel = path.relative(path.join(__dirname, '..'), file);
    const source = fs.readFileSync(file, 'utf8');
    const { named, hasNamespaceReact } = collectHookImports(source);
    const localDefs = collectLocalHookDefs(source);
    const callRe = /(?<![.\w$])(use[A-Z][\w$]*)\s*\(/g;
    let m;
    while ((m = callRe.exec(source)) !== null) {
        const hook = m[1];
        if (!REACT_HOOKS.has(hook)) continue;                    // custom hook — fine
        if (localDefs.has(hook)) continue;                       // defined in this file
        if (named.has(hook)) continue;                           // properly imported
        if (hasNamespaceReact && source.slice(0, m.index).includes('React.' + hook)) continue;
        violations.push(`${rel}: calls ${hook}() at offset ${m.index} but never imports it from 'react'`);
    }
}

if (violations.length > 0) {
    console.error('🙀 HOOK-IMPORT GUARD: React hooks used without imports — this is the Neural Matrix Desync crash class!');
    violations.forEach((v) => console.error('  ✗ ' + v));
    process.exit(1);
}

console.log(`✅ Hook-import guard: ${files.length} modules scanned, all React hooks properly imported.`);
