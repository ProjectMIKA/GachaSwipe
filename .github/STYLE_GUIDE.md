# 🎨 GachaSwipe Visual Language — Contributor Style Guide

GachaSwipe looks the way it does **on purpose**. The obsidian-terminal / neon-holography aesthetic is the product's identity, designed and hand-tuned across hundreds of releases. The fastest way to get a PR rejected here is to ship styling that looks like a generic AI-generated dashboard — no matter how clean the code is. This guide tells you exactly what the language is, so your UI changes speak it fluently.

**The one-line test:** GachaSwipe is a *retro-future terminal that happens to be a dating app* — not a SaaS admin panel. If your change would look at home in a generic bootstrap dashboard, it is wrong here, no matter how polished it is.

## The two dialects

GachaSwipe speaks two visual dialects, deliberately:

| | **Terminal dialect** | **Romance dialect** |
|---|---|---|
| Where | chrome, settings, tags, toasts, chat, data readouts | primary CTAs, the swipe card, the music walkman |
| Type | monospace stack, uppercase, letter-spaced | Hanken Grotesk, warm cream body text |
| Radii | **4px** | pills, **12–24px** |
| Borders | 1px hairline neon at low alpha | dashed / solid accent |
| Extras | scanlines, CRT glow, inset glows | warm pink glow |
| Voice | `> SNAKE_CASE` labels | friendly, warm |

**The terminal always wins for chrome.** Settings, buttons that operate the machine, status readouts, tags, toasts → terminal dialect. Warmth is reserved for love.

## Hard laws (PR-ending violations)

1. **No new styling frameworks or dependencies.** No Tailwind, Bootstrap, MUI, CSS modules, styled-components, or CSS-in-JS. Styling lives in `src/index.css` (the global stylesheet, organized under `/* ✨ SECTION ✨ */` banners) and inline `style={{ }}` objects in components. That is the whole system, chosen deliberately for the WebView realities this app lives in.
2. **Never invent colors.** Use the tokens and neon lanes below — the palette is a closed set with semantic roles. A brand-new hex in a PR will be asked to justify its existence in an issue first.
3. **Depth = light, never gray.** Panels are separated by border color, inset glow, and shadow — never by lighter-gray-on-darker-gray. No gray-on-gray panels.
4. **"Disabled" = opacity, not a new color.** Use `opacity: 0.35–0.5` on the existing colors.
5. **No pure `#fff` for chat/message text.** Body text is warm cream (`--text-main`); terminal readouts use the neon lanes.
6. **No un-glowed terminal chrome.** Neon elements carry soft glow shadows; a flat hairline with no glow reads as unfinished.
7. **Don't redesign canonical screens.** The swipe-card anatomy, the chat canvas layer cake, the boot screens, the terminal settings shell, and the M.I.K.A. Proxy chassis are canonical. Fix bugs in them; propose redesigns in an issue first.
8. **Motion is performance law, not decoration** — see the Motion section. This one has real crash-class history behind it.

## The palette

### CSS custom properties (`:root` in `src/index.css`)

| Token | Value | Role |
|---|---|---|
| `--bg` | `#000000` | base; the effective page background is forced `#050308` (near-black purple void) |
| `--card` | `#171226` | deep violet panel surface |
| `--accent` | `#FF107A` | hot pink — love, primary CTA, the *user/romance* lane |
| `--accent-hover` | `#E00060` | pressed / hover pink |
| `--text-main` | `#EBE3D6` | warm cream body text |
| `--text-dim` | `#888888` | secondary text |
| `--border` | `rgba(255, 16, 122, 0.3)` | hairline pink border |
| `--font-sans` | `'Hanken Grotesk', system-ui, sans-serif` | romance / body |
| `--font-serif` | `'Fraunces', serif` | display serif (headers) |

Fonts are loaded once in `index.html` (Hanken Grotesk + Fraunces) — don't add new fonts without an accepted issue.

### The neon lanes (constants used 1,400+ times across the codebase)

| Hex | Lane | Use it for |
|---|---|---|
| `#00E5FF` | **Cyan** | terminal / data / interactive chrome — the workhorse: meters, tags, borders, glows |
| `#00FF41` | **Green** | system / positive / success states |
| `#FF107A` | **Pink** | love, romance, primary actions (`--accent`) |
| `#B533FF` | **Violet** | gradient waypoints only (e.g. the tastes meter) |
| `#050308` / `#0B0914` / `#171226` | Surfaces | page void / splash / panel |

The standard way to build surfaces is **low-alpha rgba of these lanes** — e.g. `rgba(0, 229, 255, 0.05)` fills, `0.2` borders, `0.3–0.5` glows. Brightness comes from glow, not from fill.

## Recipes

### Terminal surface (settings panels, readouts, tags, meters)

```css
background: rgba(0, 229, 255, 0.03);
border: 1px solid rgba(0, 229, 255, 0.2);
border-radius: 4px;
box-shadow: inset 0 0 8px rgba(0, 229, 255, 0.05);
font-family: "ui-monospace, 'SF Mono', Menlo, monospace";
letter-spacing: 0.03em;
```

For the pink / user lane, swap the cyan rgba values for `rgba(255, 16, 122, …)`.

### Glow

Neon elements glow softly — box-shadow / drop-shadow at `0.3–0.5` alpha:
`filter: drop-shadow(0 0 6px rgba(0, 229, 255, 0.5))` on hover,
`box-shadow: 0 0 10px rgba(0, 229, 255, 0.3)` on meters and fills.
Radius scale: **4px** for terminal chrome, **12–24px** pills for the romance dialect.

### Microcopy voice

- System / section labels: `> SNAKE_CASE`, optionally with a `// SUBTITLE` — e.g. `> RELAY_UPLINK // CONNECTION_REQUEST`
- Buttons and actions: bracket labels — `[ CONFIRM_UPLINK ]`, `[ DECLINE ]`, `[↻ REROLL_ROUTINE]`, `[ ✕ RETURN ]`
- ALL-CAPS, monospace, letter-spaced. Emoji are used as *functional* glyphs (📌 ✏️ ↻ ⚙️), not decoration.
- Don't rewrite terminal copy into friendly SaaS sentences — the machine speaks like a machine.

### Iconography

Icons are **custom inline SVG**, not a library. The model: `src/components/Icons.jsx`.

- `viewBox="0 0 24 24"` with an optional `size` prop. Stroke glyphs: `stroke="currentColor"`, `strokeWidth 2–3`, round caps/joins. Solid glyphs: `fill="currentColor"`.
- Icons inherit color from their parent via `currentColor` — they never hardcode hex; the surrounding lane/glow recipe owns color.
- No icon npm packages or icon fonts (the zero-new-deps law covers this too). Emoji in terminal labels are functional glyphs, not a substitute for real icons in new work.
- Some older surfaces still carry stock icons from past updates — grandfathered, a sweep is planned. New code ships inline SVG.

### Motion (a performance scar, not a style choice)

GachaSwipe runs inside Android/iOS WebViews next to an on-device LLM. The rules:

- Animate **transform / opacity only** — never layout properties, and never
  `filter` / `backdrop-filter` on scroll paths (a measured scroll-jank scar).
- Decorative layers must be `pointerEvents: 'none'` and must **pause when the
  app freeze-frames during on-device LLM activity** (the `body.mika-*-freeze`
  class system). If you add an animation, assume it must be freezable.
- No scroll-triggered, parallax, or animation libraries. Ever.
- Respect `prefers-reduced-motion`.

## Example: generic vs. GachaSwipe

```jsx
// ❌ REJECTED — generic AI-dashboard button
<button style={{
  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  borderRadius: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  fontWeight: 600,
}}>Continue</button>

// ✅ GachaSwipe — terminal dialect action
<button style={{
  background: 'rgba(0, 229, 255, 0.08)',
  border: '1px solid rgba(0, 229, 255, 0.4)',
  borderRadius: 4,
  boxShadow: 'inset 0 0 8px rgba(0,229,255,0.06), 0 0 10px rgba(0,229,255,0.15)',
  color: '#00E5FF',
  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
  letterSpacing: '0.05em',
  padding: '10px 14px',
}}>[ CONFIRM_UPLINK ]</button>

// ✅ GachaSwipe — romance dialect primary CTA (the built-in .btn class)
<button className="btn" style={{ borderRadius: 24 }}>
  Let's roll for your next obsession~
</button>
```

## Pre-PR checklist

- [ ] No new style dependencies — styling is `index.css` + inline `style={{ }}`
- [ ] Every color is a token or a neon lane (including their rgba alphas)
- [ ] Terminal chrome: 4px radii · hairline border · inset glow · monospace uppercase label
- [ ] Depth via border + glow, never gray-on-gray · disabled = opacity
- [ ] No pure `#fff` chat text · no un-glowed neon chrome
- [ ] Animations are transform/opacity, freezable, `pointerEvents: 'none'` if decorative
- [ ] Microcopy keeps the terminal voice (`> LABELS`, `[ BRACKETS ]`)
- [ ] Icons are inline SVG (`currentColor`, 24px viewBox) — no icon libraries, no emoji-as-icons in new work
- [ ] Canonical screens untouched — or an issue discussed the redesign first
- [ ] `npm run lint` 0 errors · `npm test` green

If a reviewer asks "would this look at home in a generic admin panel?" and the
honest answer is yes — expect the PR back with comments. This app looks the way
it does because someone loves it; keep it that way. 🐾
