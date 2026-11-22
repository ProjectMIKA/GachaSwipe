// ✨ MIKA'S ESLINT SETUP (flat config, ESLint 9) ✨
// Kept deliberately pragmatic: this is a 34k-line App.jsx monolith, so the goal is
// catching real crash-class bugs (rules-of-hooks, hook deps, undefined vars,
// duplicate imports) — not style policing. Formatting is NOT linted.
import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';

export default [
    { ignores: ['dist/**', 'node_modules/**', 'builds/**', 'archive/**', 'scratch/**', 'SDK/**', 'GachaSwipe OG/**', 'src/lame.all.js', 'legacy.html', '*.cjs', 'tests/**'] },
    js.configs.recommended,
    {
        files: ['src/**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            parserOptions: { ecmaFeatures: { jsx: true } },
            globals: {
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                console: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                clearTimeout: 'readonly',
                clearInterval: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                fetch: 'readonly',
                AbortController: 'readonly',
                URL: 'readonly',
                Blob: 'readonly',
                File: 'readonly',
                FileReader: 'readonly',
                FormData: 'readonly',
                Image: 'readonly',
                Audio: 'readonly',
                AudioContext: 'readonly',
                OfflineAudioContext: 'readonly',
                MediaRecorder: 'readonly',
                WebSocket: 'readonly',
                Worker: 'readonly',
                CustomEvent: 'readonly',
                Event: 'readonly',
                history: 'readonly',
                location: 'readonly',
                crypto: 'readonly',
                performance: 'readonly',
                indexedDB: 'readonly',
                Notification: 'readonly',
                getComputedStyle: 'readonly',
                matchMedia: 'readonly',
                screen: 'readonly',
                atob: 'readonly',
                btoa: 'readonly',
                structuredClone: 'readonly'
            }
        },
        settings: { react: { version: 'detect' } },
        plugins: {
            react: reactPlugin,
            'react-hooks': hooksPlugin
        },
        rules: {
            // ── THE CRASH CLASS (these have shipped real boot crashes) ──
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            // no-undef is a warning (not error) because App.jsx carries ~33 copy-pasted
            // "defensive save" setTimeout blocks whose typeof-guards reference undeclared
            // identifiers on purpose (runtime-safe, lint-fatal). Refactor them someday, Master~
            'no-undef': 'warn',
            'no-dupe-keys': 'error',
            'no-dupe-args': 'error',
            'no-unreachable': 'error',
            'no-const-assign': 'error',
            'no-this-before-super': 'error',

            // ── jsx hygiene ──
            'react/jsx-uses-vars': 'error',     // marks JSX usage as used — without it, component/icon
                                                // imports used only in JSX are false-flagged as unused
                                                // (OobTraceModal icons, CreditsBadge/Modal, etc.)
            'react/jsx-key': 'error',
            'react/jsx-no-duplicate-props': 'error',
            'react/no-unknown-property': 'off', // inline styles + css custom props everywhere
            'react/react-in-jsx-scope': 'off',  // new JSX transform
            'react/prop-types': 'off',          // the codebase never used prop-types

            // ── relaxed on purpose (monolith reality) ──
            'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^React$' }],
            'no-empty': ['error', { allowEmptyCatch: true }],
            'no-cond-assign': 'off',
            'no-prototype-builtins': 'off',
            'no-useless-escape': 'off',
            'no-control-regex': 'off',
            'no-case-declarations': 'off',
            'no-extra-boolean-cast': 'warn', // !!x chains in App.jsx are stylistic, not a crash class
            'no-inner-declarations': 'off',
            'no-useless-catch': 'off',
            'no-async-promise-executor': 'off',
            'require-yield': 'off',
            'no-misleading-character-class': 'off',
            'no-irregular-whitespace': 'off'
        }
    }
];
