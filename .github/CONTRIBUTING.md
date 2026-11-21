# Contributing to GachaSwipe

🌌 Welcome! GachaSwipe is the AI-powered gacha character discovery / dating /
RP / music-production mini-app for the **Layla Network** host. We love
contributors — please read this before opening a pull request.

## ✍️ Step 1: The CLA (required)

To keep the project's licensing clean and sustainable, every contributor
signs our [Individual Contributor License Agreement](CLA.md) — once, one
click. **CLA Assistant** will automatically comment on your first pull
request with a signing link; merges stay blocked until it is signed. You
keep full ownership and credit for your code.

## 🛠️ Getting started

```bash
npm install
npm run dev        # Vite dev server
npm test           # zero-dependency node:test suite
npm run lint       # ESLint 9 (flat config)
npm run build      # hook-import guard → vite build → release packaging
```

GachaSwipe is a **WebView mini-app**: in production it runs inside the Layla
Network host and talks to it through `@layla-network/sdk`. In a plain browser
(`npm run dev`) the UI runs and every host-coupled feature is
feature-detected — it stays on its legacy/fallback path outside the host, so
most UI work is testable without one.

## 🗺️ Where things live

| Path | What it is |
|---|---|
| `src/App.jsx` | The central hub (global state, swipe deck, chat engine wiring). Large — make surgical edits, never reformat. |
| `src/components/` | UI components (SwipeCard, MatrixShooter, RoleplayRenderer, …) |
| `src/modules/` | Feature pods (ChatCtrl, IsekaiMirror, LucidDive, …) |
| `src/utils/` | **Pure engines** — no React, no `window` at module top-level, unit-testable |
| `src/context/LanguageContext.jsx` | ALL user-facing strings (`en` is canonical) |
| `src/data/constants.js` | Tutorial steps + static gacha/archetype data |
| `tests/` | Zero-dependency `node --test` suites |

## 📏 Ground rules

1. **Pure utils stay pure.** Engines in `src/utils/` must not import React or
   touch `window` at module top-level. If you add or extend an engine there,
   add tests in `tests/*.test.mjs` in the same change.
2. **User-facing strings go through `LanguageContext`** (including toasts and
   labels). Add the `en` key; translation lanes handle the rest.
3. **No new dependencies without an accepted issue first.** The tooling is
   zero-new-deps by policy.
4. **Never edit `legacy.html`** (frozen fallback build) or `src/lame.all.js`
   (vendored MP3 encoder).
5. **Never commit build artifacts** — zips, `dist/`, `builds/` output.
6. **Small, focused PRs** — one feature or fix per pull request, with a short
   description of what changed and why.

## 🎨 Code style

4-space indent · single quotes · semicolons · trailing commas in multiline
literals. New systems get a banner comment explaining the **why** (crash
class, cache behavior), not just the what.

## 📮 Pull request checklist

- [ ] `npm test` green · `npm run lint` green
- [ ] New/changed pure engines have test coverage
- [ ] Strings go through `LanguageContext`
- [ ] No new deps (or an accepted issue justifies them)
- [ ] No build artifacts committed
- [ ] `legacy.html` / `src/lame.all.js` untouched
- [ ] CLA signed (first PR only)

## 📜 License

By contributing, you agree that your contributions are distributed under
[AGPL-3.0-or-later](LICENSE) and covered by the [CLA](CLA.md).
