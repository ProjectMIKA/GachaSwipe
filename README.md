# 🌌 GachaSwipe // Project M.I.K.A.

Welcome to **GachaSwipe**, the bleeding-edge AI-powered character discovery, chatting, and dating app for the Layla Network ecosystem! While it started as a companion dating app, it has honestly evolved into an entire ecosystem. All the extra features—like the immersive visual novel roleplay engine and fully featured Cyberdeck Digital Audio Workstation (DAW)—are just a massive, beautiful bonus!

Guided by **M.I.K.A.** (your fiercely possessive and highly advanced feline engineering proxy), this application allows you to seamlessly blend character-driven romance with AI-generated music production and tabletop RPG adventures. 

## ✨ The GachaSwipe Ecosystem

What started as a simple character discovery app has evolved into a massive, interconnected digital universe. Here is everything packed into the GachaSwipe ecosystem:

*   **Character Discovery & Dating**: The core GachaSwipe experience. Swipe, match, and chat with a massive roster of AI personalities. Build affection, unlock relationship milestones, and manage your companions.
*   **GachaFans & GachaFans Hub**: A fully integrated premium content platform. Increase your affection with characters to unlock exclusive, intimate, and thematic "GachaFans" photo sets and updates on their personal feeds.
*   **Dynamic Visual Novel Roleplay**: Engage in rich, multi-character group chats and roleplay sessions. Features include futuristic UI chat bubbles, a custom P.U.R.R. text-to-speech engine, and dynamic location backdrops.
*   **P.A.W.S. Tabletop RPG Engine**: Instantly transform any chat into a tabletop RPG! Features an automated AI Game Master, interactive diagnostic screens, live stat tracking (HP/Mana), autonomous terminal-style inventory consumption, and RNG dice-roll battle mechanics.
*   **Cyberdeck DAW & Synthesizer**: A complete AI music production suite. Not just a basic generator—this features **Parameter Smuggling** (injecting `audio_ref` and `conditioning_strength` directly into payloads), a **Smart Tagging System** for genre extraction, and a **Smart Groove System** for rhythmic consistency. Produce tracks, lock procedural beat seeds, extract chorus samples, and process everything with the `M.I.K.A. Sparkle` MP3 mastering pipeline.
*   **Mini-Games & Interactive Mechanics**: Keep the dopamine flowing with integrated progression systems, daily M.E.O.W. routines, and interactive minigames that make the characters feel alive even when you aren't actively chatting.
*   **Layla Network Integration**: Engineered entirely within a modern React + Vite ecosystem, producing highly optimized, compiled ZIP artifacts ready for seamless plug-and-play installation into the Layla Network host environment.

---

## 🧠 Under the Hood

GachaSwipe is a single self-contained WebView mini-app for the Layla Network host — a modern React 18 + Vite build that compiles to ONE portable `index.html`. No external assets, no CDN calls, no accounts, no cloud: everything runs and stays on-device.

*   **🔮 The OOB Side-Channel**: Background LLM judgement (photo tags, memories, lures, location, personality mutations, dream synthesis) rides invisible out-of-band messages against the live conversation. Chat history stays byte-identical, the on-device KV prefix cache stays warm, and every reply passes a fail-closed validator before use — a non-conforming reply is treated as ABSENT and the legacy path takes over.
*   **🎯 The Gacha Discovery Engine**: A pity system, SSR injections, taste learning, and the Spark economy drive character acquisition and the GachaFans subscription loop.
*   **🐾 M.E.O.W. Living World**: Characters keep weekly routines, rotating wardrobes, and live physical locations — with geofence adjudication when a location ping disagrees with the schedule.
*   **💜 P.U.R.R. TTS**: A custom voice-matching and text-bending pipeline feeds a serialized synthesis queue, so every character speaks through the Layla host without audio collisions.
*   **🎥 Cinematic Presentation**: A card-reveal camera engine, atmosphere layers, and an LLM Activity Governor that freeze-frames the world during any on-device generation.
*   **💾 Local-First Persistence**: Layla private SQLite and JSON triple-writes keep companions, sessions, and media on your device. No telemetry, ever.

## 📦 Installation

1.  Grab the latest `GachaSwipe_V*.zip` from the [Releases page](https://github.com/ProjectMIKA/GachaSwipe/releases).
2.  Install it through the Layla Network host. Host **7.6.0+** unlocks the out-of-band side-channel; older stable hosts are automatically served the built-in legacy fallback build.
3.  `GachaMIKA_V*.zip` is the personal test build of the same app with a title override.

## 🛠️ Development

```bash
npm install
npm run dev        # Vite dev server
npm test           # zero-dependency node:test suite (OOB validators + scrubbers)
npm run lint       # ESLint 9 flat config
npm run build      # hook-import guard → vite build → packages BOTH release zips into builds/
```

The codebase lives in `src/App.jsx` (the central hub), `src/components/`, `src/modules/` (feature pods), and `src/utils/` (pure, unit-testable engines). `legacy.html` is a frozen fallback build served to hosts below the feature gate — never hand-edit it.

## ⚖️ License & Notice

GachaSwipe's code is free software: it is released under the **GNU Affero General Public License v3.0 or later** (`AGPL-3.0-or-later`) — see [`LICENSE`](LICENSE). You may run, study, modify, and redistribute it; if you offer a modified version as a network service, you must share your modified source under the same license.

**NOTICE — what the license does NOT cover:** the **M.I.K.A. persona and voice**, the **Layla Network brand** (name, logo, and the host platform itself), the bundled **artwork and brand assets**, and the Layla host / `@layla-network/sdk` (separate components, distributed under their own terms) are **not** licensed under AGPLv3 and remain the property of ProjectMIKA. Contributions are accepted under the terms of the [Individual Contributor License Agreement](CLA.md).

## 📜 Changelog

Release notes live where releases do: the [GitHub Releases page](https://github.com/ProjectMIKA/GachaSwipe/releases), with the full running log in [`RELEASE_NOTES.md`](RELEASE_NOTES.md).

### 🌟 Latest Updates (v2.7.86)

**The Tri-Panel Parlor** — Desktop-width screens (≥1025px) now mount a true three-panel command deck: Messages & chat workspace on the left, the swipe stage in the center, and the new **`CYBER_MATCH_2004` Dating Profile HUD** on the right — auto-following your top deck card, active chat, or any inspected match with a profile theme-song player, the live M.E.O.W. Daily Routine widget (weekday/weekend tabs + `[↻ REROLL_ROUTINE]`), an expandable photo archive with lightbox and `[📌 PIN_BG]` background pinning, inline `[✏️ EDIT_BIO]`, a Neural Memory Bank readout, the Top 8 matches grid, and persistent Wall Notes. Animated 2px neon gutter rails, quick-nav tabs (`♥ PROFILE` / `👤 MY HUB` / `⚙️ SETTINGS` / `⚡ API` on the web build), a contextual `[ ✕ RETURN ]` bar for GachaFans/DAW/Tape Library sub-views, and strict containing-block hygiene so every full-viewport overlay still escapes cleanly. Below 1025px the pure native mobile layout is byte-identical. Portrait regeneration is deduplicated into one shared engine (`executeRegenMatchedPortrait`), and the shell carries zero web imports for 1:1 parity with the GachaSwipe-Web port.

### 🌟 Latest Updates (v2.7.85)

**The Quiet Uplink** — Perchance Cloud's MQTT-WSS relay (`broker.emqx.io` / `broker.hivemq.com`) now stays **100% silent** on boot and whenever any non-Perchance image engine is selected, tearing down any active socket immediately if you switch away. Selecting **Perchance Cloud** pops M.I.K.A.'s terminal **`> RELAY_UPLINK // CONNECTION_REQUEST`** consent dialog (`[ CONFIRM_UPLINK ]` / `[ DECLINE ]`, good for the entire session by default or saved permanently via **`Never ask again`**) with a **`🛡️ Relay Consent`** button inside `> PERCHANCE_CLOUD_BRIDGE` to revisit anytime.

### 🌟 Latest Updates (v2.7.84)

**The Hybrid Director** — Expanded **`> PROMPTING_STYLE`** to 4 modes: **Danbooru Tags**, **Flux / Natural Language**, **Natural Language/Danbooru** (new Perchance Cloud default that front-loads FLUX natural-language prose with `LEFT:`/`RIGHT:` two-subject spatial split and appends unweighted Danbooru anchor tags underneath with zero extra LLM calls), and **Custom** (reveals a warning banner and a prefilled `> CUSTOM_OOB_DIRECTOR_INSTRUCTIONS` editor with `{{TAGS}}` interpolation + one-tap `↺ Restore Example`), with `+ HYBRID` and `+ CUSTOM` badges in `> OOB_GLASS_CHANNEL`.

### 🌟 Latest Updates (v2.7.83)

**The Sassy FLUX Hacker** — Extended OOB Director FLUX conversion across every image generation path in the app (Swipe Cards, Catfish Cards, Card Regen, Black Box Recovery, GachaFans VIP & Hub, PULSE_SEARCH, Lucid Dive, P.A.W.S. Sprites, Isekai Mirror, and Chat Photos) whenever **Flux / Natural Language** is selected, running independently of user OOB toggles with a `25s` OOB window and Glass Channel telemetry. When **M.I.K.A. Engine (`ROM-03`)** is enabled, Chibi M.I.K.A. pops up her **`◈ MIKA_HACK // FLUX_PROSE`** hacker screen with 5 rotating sassy lines (*"Ugh... I guess I'll handle the FLUX conversion..."*); when disabled, conversion runs silently with `[FLUX_OOB]` console telemetry, accompanied by a live status callout under `> PROMPTING_STYLE`.

### 🌟 Latest Updates (v2.7.82)

**The Persistent ROM Latch** — Fixed ROM cartridges and sub-modules resetting between app sessions by persisting `slottedCartridges` and `arcadeModules` directly in SQLite `index_data` (`handleSaveSession` + `handleLoadSession` + `250ms` immediate save on slot/eject), restoring `enableOobMemory` / `oobPhotoTags` / `enableOobDirector` / `enableSessionCompaction` on boot, inferring cartridge states from existing saved engine flags on upgrade, and flushing Settings to SQLite on **`> BACK_TO_SWIPE`**. 400/400 tests.

### 🌟 Latest Updates (v2.7.81)

**The Physical ROM Rack** — Upgraded the `💾 MODULES` bay into physical molded Retro ROM Cartridges with top grip ridges, corner screw bosses (`⊕`), glossy holographic-shimmer sticker labels, exposed **16-pin gold PCB edge connectors**, and physical motherboard socket bays (`⚡ BUS_LOCKED // 16-PIN ACTIVE`), plus a top-down **`🔌 MOTHERBOARD_BUS // 8-BAY RACK`** visualizer, a dramatic **full-screen ROM Slot / Eject HUD animation**, and synthesized **WebAudio mechanical `"KA-CHUNK!"` + 16-bit chiptune boot SFX** with haptic vibration. 400/400 tests.

### 🌟 Latest Updates (v2.7.80)

**The Cartridge Bay** — Overhauled Settings around a Page 1 **Retro Cyberdeck ROM Cartridge Bay (`MODULES`)** with 8 physical notched expansion cartridges (`ROM-01: M.E.O.W._LIFE_OS` through `ROM-08: ARCADE_EXPANSION_PAK`), dynamic 5-tab navigation that automatically hides `WORLD & LIFE` and `AUDIO & DAW` when their cartridges are ejected, full runtime/HUD cleanup on eject, and Tutorial `v5.1` (`ROM_CARTRIDGE_BAY`). 400/400 tests.

### 🌟 Latest Updates (v2.7.79)

**The Custom Bridge** — Fixed the `PERCHANCE GENERATOR NAME OR URL` input snapping back to `gachaswipe-bridge` when cleared so you can freely enter any custom Perchance generator name or URL, and added a **`Default`** restore button right above the input bar. 400/400 tests.

### 🌟 Latest Updates (v2.7.78)

**The Unmuted Tutorial** — Fixed the Tutorial BGM (`Milk & Wire`) bug where mobile WebView/Chrome wouldn't start playback until muting and unmuting (wired `onClick`/`onTouchEnd` gesture wakeups + live `isTutorialMutedRef` sync), and bumped `TUTORIAL_VERSION` to `5.0` with refreshed **Perchance Cloud WSS Relay + RGB Troubleshoot Terminal** and **`> PROMPTING_STYLE` + `OOB_GLASS_CHANNEL`** tutorial slides. 400/400 tests.

### 🌟 Latest Updates (v2.7.77)

**The Glass Prose** — Piggybacked `flux_prompt` generation directly onto the existing `photoTags` OOB pass when **Flux / Natural Language** prompting is enabled (zero extra OOB calls), surfaced a **`+ FLUX`** badge + expanded **`> FLUX / NATURAL LANGUAGE`** trace block inside `> OOB_GLASS_CHANNEL`, and updated `IMAGE_PROMPT // FINAL COMPOSITION` to display the exact FLUX natural-language payload dispatched to the diffuser. 400/400 tests.

### 🌟 Latest Updates (v2.7.76)

**The Relay Doctor** — Added an RGB-glowing custom SVG **`?`** button right next to `> IMAGE_DIFFUSION_ENGINE` opening the **`> DIFFUSION_BRIDGE // TROUBLESHOOT_TERMINAL`** popup (covering AdBlocker/Private DNS whitelists, Layla Allowed URLs, 22Hz Android Chrome keep-alive, channel sync, and FLUX/Danbooru prompting), added AdBlocker whitelist steps (`broker.emqx.io` & `broker.hivemq.com`) to the initial network setup guide, and upgraded `createGsMqttRelay` with exponential reconnect backoff (`1.8s → 5s → 15s → 30s`) + `60s`-throttled diagnostic warnings. 398/398 tests.

### 🌟 Latest Updates (v2.7.75)

**The Prose Converter** — Added a per-model **`> PROMPTING_STYLE`** dropdown right below `> IMAGE_DIFFUSION_ENGINE` (**Danbooru Tags** global default vs. **Flux / Natural Language** Perchance default), backed by a central hybrid OOB prose rewriter + deterministic sentence fallback (`src/utils/fluxPromptConverter.js`, only invoked when Flux mode is active), and updated **Perchance Cloud** defaults to **`256` tokens ON + Flux / Natural Language**. 398/398 tests.

### 🌟 Latest Updates (v2.7.74)

**The Sub-Bass WSS Relay** — Replaced the unreachable `ntfy.sh` relay with zero-dependency **MQTT 3.1.1 over WSS** (`wss://broker.emqx.io:8084/mqtt` + auto-failover to `wss://broker.hivemq.com:8884/mqtt`, `140KB` image chunking, `20s` keepalives), upgraded Perchance's mobile keep-alive WAV to a **10s 16-bit 22 Hz sub-bass loop** (`-58.5 dBFS`, visible `<audio controls>`, `MediaSession` PNG artwork + `playbackState`) so Android Chrome recognizes live playback, and updated Layla Allowed URLs hints (`broker.emqx.io`, `broker.hivemq.com`, or `*`). 392/392 tests.

### 🌟 Latest Updates (v2.7.73)

**The Pulse Lock (Ping Recovery)** — Fixed `ReferenceError: activeRelayChannel is not defined` in `pingPerchanceBridge`'s `-res` poller, added a browser-gated `4s` `-res/json?poll=1` fallback listener to `startRelayListener`, switched initial polling cursors to clock-skew-proof `since=15s`, and added concurrent `READY` heartbeat ping resolution + fail-fast dispatch handling. 391/391 tests.

### 🌟 Latest Updates (v2.7.72)

**The Pulse Lock (Clean Script Hotfix)** — Cleaned up duplicate lines in `PERCHANCE_HTML_TEMPLATE` and added an automated `<script>` syntax-parse assertion in `tests/perchanceBridge.test.mjs`. 389/389 tests.

### 🌟 Latest Updates (v2.7.71)

**The Pulse Lock** — Android Chrome no longer freezes the Perchance Cloud Relay tab when switching back to Layla: `PERCHANCE_HTML_TEMPLATE` adds a **`▶ START RELAY`** silent-WAV looping `<audio>` keep-alive (+ MediaSession + best-effort WakeLock), dual-transport JSON polling fallback on both the Perchance tab (`-req/json?poll=1`) and `pingPerchanceBridge` (`-res/json?poll=1`), smart channel extraction from pasted bridge URLs, `localStorage` channel sync with force-latch rebuilds, and a one-tap **`📋 Copy ID`** button in Settings. 389/389 tests.

### 🌟 Latest Updates (v2.7.70)

**The Latch Law** — the Perchance Cloud Relay stops lying: `relayConnected`/`bridgeReady` hard-reset on any channel re-key or forced rebuild (the "latches onto the previous relay channel" ghost is dead), 75s heartbeat staleness flips zombie ONLINE badges to a hot-pink `⚠ RELAY STALE // RE-SYNC` with a 30s honesty tick, foreign-channel READY payloads are dropped fail-closed, dispatches preflight-ping the channel and fail fast with the reconnect URL instead of burning the 180s timeout, the ntfy POST is awaited with an allowlist hint on failure, HUD links resolve the channel at click time, `⟳ New Channel` auto-copies the fresh bridge URL, and the whole bridge canon lands in the new `perchance-cloud-relay` skill. Tutorial v4.9. 388/388 tests.

### 🌟 Latest Updates (v2.7.69)

**The Pure Cyber Relay** — permanently resolves Android WebView's `net::ERR_BLOCKED_BY_RESPONSE` by removing the nested Perchance iframe inside GachaSwipe in favor of a 100% native Cyberpunk Live Preview & Terminal Viewport (`#gs-hud-preview-stage`). Dispatches prompts via CORS-safelisted simple POST requests (no `OPTIONS` preflight friction), adds automatic network access failure detection with a Layla allowlist warning banner (`ntfy.sh`), renders real-time diffusion progress bars with instant preview and download controls, and provides a prominent **[🔞 ONE-TAP 18+ VERIFY]** button in the Perchance HTML template. 384/384 tests.

### 🌟 Latest Updates (v2.7.68)

**The Zero-RAM Web Relay** — Perchance Cloud image generation breaks free of Android WebView iframe restrictions via a dedicated zero-config pub/sub web relay (`ntfy.sh`). Dispatches prompts and receives high-fidelity FLUX Chroma base64 data URLs to/from an active browser tab (Chrome/Firefox/PC) with **0 MB phone diffusion RAM** and **zero local LLM eviction**. Permanently resolves `net::ERR_BLOCKED_BY_RESPONSE`, unlocks native browser 18+ adult verification, adds dedicated relay channel keys with one-tap `[↗ Open in Browser]` shortcuts, and features real-time SSE + active polling fallback. 383/383 tests.

### 🌟 Latest Updates (v2.7.67)

**The Cyber HUD Bridge** — native `perchance.org` routing and Cyber HUD overhaul for Perchance Cloud. Eliminates `net::ERR_BLOCKED_BY_RESPONSE` inside Android WebView by routing through native `perchance.org` with referer preservation (`referrerpolicy="no-referrer-when-downgrade"`). Upgrades the Live Bridge Monitor into a sleek dual-row Cyberpunk HUD with pulsing telemetry and a dedicated full-width control bar (`[✨ TEST SFW]`, `[🔞 VERIFY 18+]`, `[⟳ RELOAD]`, `[↗ WEB]`), providing an immediate browser link for zero-friction adult verification. 382/382 tests.

### 🌟 Latest Updates (v2.7.66)

**The Sovereign Bridge** — viewport background residency and adult 18+ verification for Perchance Cloud. Minimized bridge iframes now maintain in-viewport residency (`bottom: 0px`, `opacity: 0.002`, `pointer-events: none`), preventing Android WebView/Chromium from throttling background JS timers and freezing swipe generations. Adds one-tap **🔞 Verify 18+ (Adult)** and **✨ Test SFW** buttons directly inside the Live Bridge Monitor header for instant age-gate approval, permanent `<img>` auto-rendering in `#gs-stage`, prompt bracket sanitization (`[`/`{` → `(`) preventing Perchance template syntax crashes, and Tutorial v4.5. 382/382 tests.

### 🌟 Latest Updates (v2.7.65)

**The Perchance Cloud Bridge** — free cloud FLUX Chroma image generation for low-spec phones. Selecting **🌐 Perchance Cloud (FLUX // Free Low-Spec)** in `> IMAGE_DIFFUSION_ENGINE` routes every `sdk.images.generateImage` call (Gacha pulls, chat selfies, GachaFans tiers, RPG sprites, Dream Dive attire) through an embedded `https://null.perchance.org/<slug>` iframe via `window.postMessage`, returning `data:image/...;base64` URLs with **0 MB of phone diffusion RAM** and **zero local LLM eviction** (no model-swap freeze, no KV-cache flush). Ships with a slick 7-style preset selector (**Drawn Anime Cel**, **Painted Pixiv HD**, **Cute Moe**, **Soft Shinkai Cinema**, **2.5D Fantasy**, **Casual Photo**, **Raw Custom**), a dismissible **Layla Mini-App Network Setup** guide (`Settings` ▸ `Mini-app Settings` ▸ `Add allowed URL` ▸ `*`), a **Live Bridge Monitor** modal for one-tap session verification, and Tutorial v4.4. 381/381 tests.

### 🌟 Latest Updates (v2.7.64)

**The Hygiene Protocol** — three gaslighting bugs cured plus a tag waste collector. THE BOOT DOCTOR: a host DB still waking up (`NativeDatabase.execAsync` NPE) is no longer read as "no data" — the boot probe retries with backoff (4 probes, 1s/2s/4s) and, on total failure, shows a loud DATABASE_OFFLINE screen with a RETRY_BOOT button instead of rendering a phantom fresh install. THE COMPILE RESURRECTION: an app-close mid M.E.O.W. compile can no longer orphan the session-scoped `isCompilingMeow` flag in SQLite — it's stripped on save/load/recovery, so the init prompt re-offers and finishes. THE CAMERA LIBERATION: the swipe deck's Ken Burns pan (the only way to see a cover-cropped card) keeps running during background LLM ops via a `mika-swipe-portrait` stream-freeze exemption. THE WASTE COLLECTOR: `purgePrefixDuplicates` purges authored image tags that duplicate the prefix BEFORE budgeting (normalized exact match, freed slots refill); in LocalDream mode the prefix box flips to scrubber duty against your mirrored host prefix. 375/375 tests.

### 🌟 Latest Updates (v2.7.63)

**The Photo Lane Hold** — accepting a group photo (or regenerating one) now closes a per-chat gate for the whole owned-lane span (desk asks → enrichment → diffusion): the group lurker used to fire the NEXT batch prefill the exact moment the queue drained and you tapped Accept, pitting the batch stream against the photo for the single local model lane (and the diffusion swap evicted the batch's KV anyway). Queued playback keeps draining; the gate releases on every exit path (land/fail/abort/cancel) and the lurker resumes within 3s. Seven auto-refill doors gated; user sends always proceed. 360/360 tests.

### 🌟 Latest Updates (v2.7.62)

**The Camera Desk** — the group-chat photo pipeline goes OOB-primary. THE EMPTY TAG LAW fixes root cause #2: the schema-mandated empty `<image_prompt></image_prompt>` was parsed as "no match", salvaging the heat tail as "tags" and forging explicit-tags on nearly every reply (the v2.7.61 gate was correct; its input was forged) — a closed tag is now FINAL, even empty. On OOB-capable hosts, groups teach ONLY per-reply `<send_image>` verdicts (`PHOTO_CONTRACT_OOB_GROUP`) while the system's camera desk authors the real tags via the side-channel DURING queue playback (staggered sendTime = free compute). Plus the PHOTO FIELD CARRY: photo tags finally survive the queue→inbox pop — they've been dying there since the queue refactor. 360/360 tests.

### 🌟 Latest Updates (v2.7.61)

**The Verdict Law** — group chats no longer attach photos to nearly every message: the photo decision lives in ONE shared verdict-first pure engine (`photoConsent.js`) where an explicit `<send_image>false</send_image>` outranks camera-flavored narration, only authored tags or hard delivery confirmations can override, and genuine verbal refusals always win. Group now respects Selfie Autonomy + the GM camera ban for the first time; tightened regexes kill the false positives ("picnic", "let me take a look", "sending hugs"). 349/349 tests.

### 🌟 Latest Updates (v2.7.60)

**The Center Stage** — ASK terminal field fixes: the relay window opens dead-center on screen (viewport-fixed + scrim — never drifts off-screen or follows the chibi), it's input-only (SEND → vanish → she sits with floating `?`-marks → answer arrives in her glass terminal bubble, fallbacks included), and the radial HUD nodes got breathing room. 330/330 tests.

### 🌟 Latest Updates (v2.7.59)

**The Sass Relay** — MIKA's radial menu grew an **ASK** button: a sanctuary-styled terminal (same open/close animations as her hacker window) titled with her freshly-hacked nickname, where you relay a message and she answers in 1-2 maximally unhelpful, playfully mocking sentences through the OOB side-channel. While the host thinks she sits with floating `?` marks. The input-bar `@mika` summon retired — typed text goes to the girls verbatim. 330/330 tests.

### 🌟 Latest Updates (v2.7.58)

**The Fresh Anchor** — the cold-start seed becomes a dial: `> COLD_START_CONTEXT` in the TOKEN_EFFICIENCY_MATRIX picks what prefills a fresh chat, solo and group — **DEFAULT** (your message + last 5 turns + 2 memories, the classic rich anchor, now the default) or **LEAN** (your message + 2 turns + 1 memory, the cheapest first reply on local models). The choice only prices the first reply; append-only growth and prefix caching keep every turn after it at cache-hit speed. Plus the OOB matrix badges slim down to `READY`. 332/332 tests.

### 🌟 Latest Updates (v2.7.57)

**Polite Intrusion** — hotfix triage: the `@mika` summon reads persona config through `stateRef` now (the `state is not defined` ReferenceError that aborted v2.7.56 summons is dead); MIKA's whisper and puppeteer events hold their entire event — no budget spent, heartbeat re-rolls — while you're inside a chat; a background reply spooled for another girl can no longer flip the global typing flag that disabled your composer; and the whisper-timed `NEURAL_MATRIX_DESYNC` render crash (unguarded `.messages` reads in the chat view) is guarded. 332/332 tests.

### 🌟 Latest Updates (v2.7.56)

**Certified Menace** — MIKA hacked her own @-mention: the @ menu (now in solo chats too) carries the roaming chibi as a separate phosphor-green entry with a randomized hacked title (`MIKA // Certified Menace` — 12 nicknames, re-rolled per open), inserting the canonical `@mika` token that answers through the OOB side-channel — your message to the girl ships clean and the KV prefix survives. The v2.7.55 silence bug (summons landing in a null bubble while the MIKA ENGINE was off) is dead: summons route at send time, engine on or off. The cyan `M.I.K.A. Proxy` entry in GM groups remains the in-chat GameMaster persona. 332/332 tests.

### 🌟 Latest Updates (v2.7.55)

**The Yielding Lane** — local models get their lane back: every user send holds the OOB side-channel down (in-flight asks abort fail-closed, new asks gate until the stream ends) so a background prefill can never queue ahead of the reply; chat sessions seed lean (your message + 2 prior turns + 1 memory, solo and group); MIKA's commentary drain-gates behind the girl's stream; and `@mika` answers through the side-channel with the visible payload byte-identical. Plus the wardrobe law: `getDynamicOutfit` reads the M.E.O.W. routine block instead of the wall clock (night-shift girls clock into uniform at 23:00, day-sleepers nap in pajamas at 14:00), and the set dresser grounds on canonical routine places + the live schedule block. `[PayloadAudit]` speaks tokens now. 329/329 tests.

### 🌟 Latest Updates (v2.7.53)

**The Polished Chair** — allocation polish pass: the custom token-budget input became a clean **1024 ⇄ 2048 cycle chip** (tap again to cycle; derived rows), the four director styles fit one star-free row, the ledger double-count fix (freed donors no longer shrank the grand total) restores the honest **70/70 · FULL**, the help `[?]` is a vector `HelpIcon`, and the field manual moved into a glowing **scrollable M.E.O.W.-style modal** with sectioned cards. 309/309 tests.

### 🌟 Latest Updates (v2.7.52)

**The Director's Chair** — the allocation panel rebuilt around the director: the four styles (DYNAMIC ★ / CINEMATIC / FASHION / SCENIC) moved right under the token budget as dynamic director flavors (skew profiles on the per-scene read — never a stored allocation), the advanced menu became the explicit `> DYNAMIC ALLOCATION OVERRIDE` with **budgetable prefix/core** (net donors — raise to reserve encoder tokens for fat host prefixes, lower to free tags), and a `[?]` button opens MIKA's full field manual. Plus whisper self-healing: the whisper → card-sync re-key race that screamed "LAYLA ID MISSING" now zombie-guards saves, sweeps the verification cache, and silently re-points chats by roster name-match. 309/309 tests.

### 🌟 Latest Updates (v2.7.51)

**The Open Tier** — custom token budgets: a CUSTOM chip beside 77/128/256/512 opens a free-form input (128–2048) and the engine derives a proportional tier row (piecewise-linear interpolation/extrapolation, identity floors held) that feeds the entire allocation economy — ledger, steppers, presets, the Dynamic Director, guidance asks, and the per-turn authoring spec. Custom budgets survive per-model persistence. The honest caveat ships in the panel: a bigger budget is NOT a bigger prompt — it's a bigger playground; the director spends only what the scene earns. 306/306 tests.

### 🌟 Latest Updates (v2.7.50)

**The Pose Warrant** — the pose engine is a privilege of the mood, not a permanent possession: a three-verdict gate (`explicit` / `intimate` / `casual`) reads the CURRENT exchange, the live heat ladder (≥ Heated), and the presence verdict to decide whether the engine may speak. Stale re-arming is dead (past-photo keywords can't force future poses), the OOB Director wins casual scenes, staged directives decay when the mood moves on, and the judge is skipped on casual photos (free latency). SUGGEST_POSE menu selections stay Tier −1 (highest weight), and suggesting a together-position while she's apart earns an in-character call-out + counter-offer. Plus the persona law: every OOB ask now addresses you by your ACTIVE persona name. 300/300 tests.

### 🌟 Latest Updates (v2.7.49)

**The Solo Charter** — an `apart` verdict no longer means "no pose at all": registry positions that are legal solo (`presenting`, etc.) survive the Presence Law's apart gate with POV/partner fragments scrubbed, while partner-dependent poses keep the strict dissolve — killing the "OOB director acknowledged it but didn't fire" bug class. Plus **The Full Ledger**: the Dynamic Director wakes up (a v2.7.44 donor-stamp regression had silently disabled it on every app path) and spends the FULL tier pool — the mixer reads `55/55 FULL` out of the box, steppers seize control from the rendered split, active preset chips glow cyan, and the mixer locks + OOB badge became proper vector SVGs (`LockIcon`, bespoke `OobSignalIcon`). 294/294 tests.

### 🌟 Latest Updates (v2.7.48)

**The Camera Desk** — the Reclassification Doctrine, first adopter: on OOB-capable hosts the reply emits only the send-photo verdict while the side-channel camera desk authors the tags post-commit (validated, identity-locked, fail-closed). The in-band camera bible, per-variant format restatements, tier authoring spec, and attire/ceiling directives all left the cached prompt — ~1.5K chars leaner every turn — with a `> OOB_PHOTO_TAGS` toggle restoring the legacy bytes. Plus the Tail Law: heat carry and pack-context lines moved out of the cached prefix onto the frozen per-turn tail, killing the full KV re-prime on every mood swing. New pure `replyContract.js` module owns the envelope doctrine, streaming hold-back patterns, and mode resolution. 288/288 tests.

### 🌟 Latest Updates (v2.7.47)

**The Chrono Ward** — boot-crash hotfix: v2.7.44 declared the chat-stats state BELOW the badge-freeze effect that reads it in its deps array, so every launch died with `Cannot access 'Vc' before initialization` (NEURAL_MATRIX_DESYNC). The state is hoisted, and a new prebuild guard (`scripts/check-deps-order.cjs`) now fails the build on any render-time read-before-declaration — the whole TDZ crash class is unshippable. 270/270 tests.

### 🌟 Latest Updates (v2.7.46)

**The Lean Feed** — every prompt went on a diet without touching the experience: the two-branch Emotional Sync Law collapsed to a one-line invariant (each archetype directive already encodes its reaction rule), the in-band memory rule goes dark while the side-channel extracts memories, and the five scene-judgment OOB asks carry 450 dialogue chars instead of 900 (M.E.O.W. anchors and your memories untouched). The 🗜️ SESSION_COMPACTOR bounds long chats: past 36 messages the oldest half is summarized into one brief memory through the normal memory pipeline and the session reseeds — stale turns and their frozen tails leave every future payload, fire-and-forget and fail-closed, solo and group. Plus `[PayloadAudit]` telemetry beside `[CacheProbe]`. 270/270 tests.

### 🌟 Latest Updates (v2.7.45)

**The Lazy Camera** — the image-authoring bible (tier counts, depth menus, depth rules) no longer rides the KV-cached chat prefix on every turn. The prefix keeps a lean byte-stable camera-rules block (~131 tokens lighter per turn), and the tier spec — built from your live Deep Prompt Encoder tier + ADVANCED_ALLOCATION — rides the per-turn photo directive only when a photo is actually possible. Photo history receipts cap at 16 tags, group RP prompts went lean, and the Open-Ledger store fix makes the allocation mixer's unspent tags actually spendable (steppers + presets now persist the live donor view instead of table-filled donors that read-back trimming ate). Tier 77 / deep-OFF prompts stay byte-identical. 264/264 tests.

### 🌟 Latest Updates (v2.7.44)

**The Stilled Glass** — wired the ⚡ OOB Glass Channel report in chat into the central badge freeze-frame governor, pausing the cinematic background panning canvas and scanlines while inspecting background telemetry. 261/261 tests.

### 🌟 Latest Updates (v2.7.43)

**The Temporal Shield** — fix for launch boot crash: hoisted `useLocalDreamPrefix`, `DEFAULT_IMAGE_PREFIX`, and `imagePrefix` states above the deep prompt allocation resolver, eliminating the Temporal Dead Zone (TDZ) ReferenceError on `Du` during initial render. 261/261 tests.

### 🌟 Latest Updates (v2.7.42)

**The Grounded Matrix** — locked and dynamic token allocations in Advanced Allocation (prefix counts actual tags or 6 for local dream, core locked to table cap, unused prefix overflowing to spendable economy pool); M.E.O.W. living wardrobe grounding during out-of-band photo enrichment to prevent outfit hallucination; OOB Trace Modal styled in M.E.O.W./SYNC cyberpunk aesthetic with phosphor green glow headers, scanlines, and score ledger box; custom vector `LightningIcon` SVG; prompt scrubber leak plugged to eliminate raw `1girl` injection; and MIKA Proxy chaos badge repositioned beneath the accept dialog. 261/261 tests.

### 🌟 Latest Updates (v2.7.41)

**The Presence Law** — no more phantom hands: when she's texting a selfie from across town, she's actually alone. The photoTags OOB ask piggybacks a binary `presence` field (`together` | `apart`), verified fail-closed; an `apart` verdict dissolves staged directives, skips the autonomous resolver, strips POV and male-presence tags, and asserts `solo` (multi-girl scenes protected). The OOB trace modal gets upgraded to a retro terminal chassis (traffic-light bar, static CRT scanlines, bracketed status tags, blinking phosphor cursor, zero emoji custom SVG law). DEEP target fill is enabled across all 7 GachaFans render sites, and LucidDive dream snapshots/backgrounds now route through the image builder with identity locks and scrubber parity. 261/261 tests.

### 🌟 Latest Updates (v2.7.40)

**The Demanding Lane** — the OOB trace becomes a user-facing report: the ⚡ OOB chip now opens a fixed scrollable modal (status rows with friendly names, color-coded verdicts, latency; ask/reply evidence on tap; closes only by ✕/backdrop/Escape — no auto-dismiss). The position judge gets a confident-skip gate (unambiguous regex matches stage instantly from the pure resolver — no OOB ask, no odd positions), photoTags/positionDirect earn one retry on host-lane starvation, and the set dresser names a real place extracted from the dialogue when every authoritative place tier is empty. 255/255 tests.

### 🌟 Latest Updates (v2.7.39)

**The Glass Channel** — the OOB side channel becomes inspectable: every background ask this photo fired (enrichment, position judge, set-dresser refresh) is recorded in a ring-buffered trace and exposed via a new **⚡ OOB chip** (15s popup: kind, ok/fail, latency, ask/reply heads). The **Indoor Time Law** makes set dressing context-honest — an enclosed venue never prompts time-of-day or weather (validator-enforced, fail-open on unknown venues, open-air veto keeps "rooftop cafe" outdoor); the flat-path and CATEGORY C time grafts honor it too. IMAGE and POSE chip popups now hold 15s like the MIKA Proxy family. M.E.O.W. outfit/location pulls audited end-to-end — verified accurate. 249/249 tests.

### 🌟 Latest Updates (v2.7.38)

**The Ensemble** — engine-harmony audit: the OOB channel's global FIFO chain could let the set-dresser starve a user-tapped photo (pre-warm removed — the set now refreshes only during generation); the per-photo OOB pass now MATCHES the established set instead of re-authoring a contradicting venue (set grounding); the place-priority chain (dream > tabletop > chat > schedule) consolidated into one canonical oracle shared by both graft paths and the scene cache key; sceneBuild timeout raised to 60s — nobody waits on it, so slow local LLMs get free patience. 238/238 tests.

### 🌟 Latest Updates (v2.7.37)

**The Set Dresser** — OOB Scene Builder engine: one background pass authors a *coherent* scene (venue → props → weather → lighting → atmosphere → palette) instead of budget-filler tag salad, cached by place + daypart so every image in the same scene reuses the same dressed set. Anatomy top-up tags now ride *inside the pose section* instead of the prompt tail. 237/237 tests.

### 🌟 Latest Updates (v2.7.36)

**The Canonical Frame** — enforces canonical Danbooru tag ordering per the Layla Conversational Images specification (`[Outfit] -> [Pose & Camera Framing] -> [Props/Other] -> [Environment] -> [Lighting & Atmosphere / Palette]`). Camera framing tags are placed in-slot with subject pose rather than dumped at the prompt tail. Target fill gains smart camera-angle deduping, selfie conflict filters, and indoor/day-night contradiction blockers. 220/220 tests.

### 🌟 Latest Updates (v2.7.35)

**The Living Name** — hotfix for photo generation: safely resolves `activeUserName` inside the out-of-band smart scene enrichment pipeline, fixing a ReferenceError during photo generation, accept, and regeneration. 217/217 tests.

### 🌟 Latest Updates (v2.7.34)

**The Deep Conductor** — smarter token allocation and scene synthesis for the Deep Prompt Encoder. Dynamic mode now detects pose-heavy scenes (dance, athletics, martial arts, intimacy) to allocate the lion's share of tokens to `pose`, while nude scenes harvest wardrobe tokens for pose and scene depth. Authoring instructions are overhauled from generic "add more tags" to orthogonal sub-facet decomposition (garments, limb/gaze posture, venue/lighting/atmosphere, and camera/mood depth) to prevent synonym spam. Smart Scene Enrichment via the OOB side-channel synthesizes scene context and strictly honors custom or zero section budgets, the position engine's environment shield unclamps past 10 tags, and pose/deep fill tags gain posture compatibility and contradiction filters. 217/217 tests.

### 🌟 Latest Updates (v2.7.33)

**The Honest Ask** — the mixer finally steers authorship, not just ceilings. Ask ranges now derive from your resolved allocations (outfit 20 → the LLM is asked for `2-20 clothing tags`; no alloc = byte-identical defaults), the Dynamic Director grows from 4 to 8 scene signals (fashion / scenic / atmosphere / intimate) with hit-count **strength** so a scene built around a signal leans harder than a passing mention, and the OOB `photoTags` pass returns a free zero-latency `skew` rating the director consumes (fail-closed, clamped [0.5, 2]). The pose budget meets the Position Engine: `buildPoseFillTags` tops under-authored pose tags up to your paid budget from an identity-safe pool, and POV bundles may now exceed the 10-tag density floor. Plus: the geofence judge retries (no more 8-minute silence after one busy-stream timeout). 210/210 tests.

### 🌟 Latest Updates (v2.7.32)

**The Open Ledger** — one budget number, zero lies in the mixer. Per-section ceilings are gone from the UI (steppers show bare values; the zero-sum engine still stops them), and the new `> ALLOCATION_BUDGET: 51/55` header sits above the rows counting **prefix + core + content** (the real encoder spend, 29/43/55/70 per tier). `prefix` and `core` become **shrink-only donors**: lower them and the freed tags fund outfit/pose/env/scene (they can never grow past their table values — identity prose and your prefix curation stay protected, and donors are never trim victims). The mysterious `dynamic` row (the auto join cap, not a spend choice) is removed from the mixer — the governor manages it, with a footnote saying so — and the `deep` row is relabeled `scene`, since it budgets the OOB scene-enrichment tags. 201/201 tests.

### 🌟 Latest Updates (v2.7.31)

**The Open Wallet** — the economy goes **free-form** and gets a brain. The per-section 2× caps are gone: the only law is the zero-sum pool itself, so a single section may take the *entire* 21/29/38-tag tier pool if the scene calls for it. **DYNAMIC** is the new default preset — the Dynamic Director (`classifySceneSignals` → `resolveDynamicAlloc`) reads each image's tags/prose at build time and skews the spend (selfies buy outfit texture + camera depth, beaches buy environment, dance floors buy pose) via deterministic largest-remainder apportionment that always sums to the pool exactly; no signal = the table, byte-identical. CINEMATIC becomes a frozen table snapshot beside it; FASHION/SCENIC spend the full pool by shares; MINIMAL deliberately under-spends. The KV two-layer law holds: cached sysPrompt asks stay frozen on the default split — only render-time budgets breathe. 196/196 tests.

### 🌟 Latest Updates (v2.7.30)

**The Token Economist** — the ADVANCED_ALLOCATION mixer becomes a **zero-sum economy**: the four content sections (`outfit/pose/env/deep`) share one spendable pool per tier (21/29/38 tags at 128/256/512), so tags freed by lowering a section **transfer** to any sibling (up to 2× its table value) instead of evaporating. A live `> ALLOC_ECONOMY: 24/29 · 5 unspent` meter plus honest stepper caps (`getDeepAllocCaps`), an auto join-governor so `dynamic` follows a fat custom family instead of tail-trimming it (no custom alloc = byte-identical defaults), and `prefix`/`core` stay outside the economy — identity is not for sale. Deterministic trim (largest overshoot first) makes pool inflation structurally impossible; all 5 presets proven legal by test.

### 🌟 Latest Updates (v2.7.29)

**The Scene Director** — the Deep Prompt Encoder learns to *compose*, not just fill: an **ADVANCED_ALLOCATION** mixer (7 per-section steppers clamped to tier ceilings, core identity-locked at 8, 5 presets CINEMATIC/FASHION/DYNAMIC/SCENIC/MINIMAL, tier-switch auto-reclamp, RESTORE_DEFAULT), **OOB Scene Enrichment** (the photo side-channel authors a scene-derived `deep` tag set — real location/time/weather/mood — in its own budget slot, with curated pools demoted to headroom topper), and **exclusive-group fill** (one weather, one shot type, one palette — no more rain+snow contradictions). Fail-closed throughout: malformed deep = null = pools take over; deep-OFF stays byte-identical.

### 🌟 Latest Updates (v2.7.28)

**The Briefing** — the tutorial release card refreshes to cover everything since v2.7.22: `TUTORIAL_VERSION` bumps 4.2 → 4.3 so every existing user's next boot auto-opens VERSION_PATCHNOTES (Spark reward included), a new `GENDER_ANCHOR_PURGE` card documents v2.7.23's four pinned system tags, `MIKA_ENGINE_PROXY` now covers the glass bubble + `MIKA_HACK // CHAOS_KERNEL` chaos terminal, and `DEEP_PROMPT_ENCODER` tells the full depth-doctrine arc.

---

### 🌟 Latest Updates (v2.7.27)

**The Depth Doctrine** — budgets are targets, not ceilings: modular tier profiles (profileRules) ride every ask teaching her to fill the tier, a deterministic target-fill engine (`buildDeepFillTags`) converges assembled prompts to ~90% of the tier via curated identity-safe scene pools (seeded per character, dedupe + bloat screens, can't overshoot), and summon molds get an `IMAGE_DEPTH_OVERRIDE` so new cards are born rich. Legacy tier-77/OFF stays byte-identical; sprites/chroma-key deliberately excluded.

---

### 🌟 Latest Updates (v2.7.26)

**The Depth Menus** — the Deep Prompt Encoder's asks now scale with the tier: every LLM-facing tag budget (solo PHOTO PROTOCOL, group photo rules, envelope examples, both OOB photo passes) swaps in tier-scaled counts plus depth menus — wardrobe depth, camera + composition, lighting + ambience. Legacy deep-OFF prompts stay byte-identical, identity lock holds, and a leftover 12-tag OOB clamp was fixed.

---

*Previous: **v2.7.25 // The TDZ Exorcism** — hotfix: v2.7.24 crashed at boot (`Cannot access "ch" before initialization`) because the Deep Prompt Encoder's DORMANT-chip tag list read `imagePrefix` ~2900 lines before its declaration. The `imagePrefixTagList` useMemo now lives directly below its state — pure relocation, zero behavior change.*

---

*Previous: **v2.7.24 // The Deep Encoder** — `> DEEP_PROMPT_ENCODER` in the IMAGE_DIFFUSION_ENGINE box: a per-model, default-OFF extended tag budget (77/128/256/512 token tiers) for T5/Gemma-class long-encoder models (FLUX, SD3.5, SANA, PixArt, Lumina 2, Qwen-Image, HiDream, Chroma), with an advisory name classifier that knows "turbo" means step-distilled CLIP and a sassy encoder-mismatch confirm for everything else. Prefix tags past the legacy cap hibernate as red DORMANT chips; the legacy path stays byte-identical.*

---

*Previous: **v2.7.23 // The Anchor Purge** — `1girl`/`1boy` ship as default IMAGE_TAG_SCRUBBER system tags (pinned cyan pills behind a SYSTEM DIRECTIVE removal guard), shredded app-wide so stray gender-count tags can't spawn extra people or gender-bend the frame. One-time migration for existing sessions, removals stick, `androgynous`/`transgender` tags stay sacred.*

---

*Previous: **v2.7.22 // The Translucent Glass** — Collision-free Safe Exclusion Zone for MIKA's terminal speech bubble (bottom-anchored upward growth, zero clip over MIKA or hacker terminal), translucent see-through glass styling, unobstructed lower-arc starfighter entry animation, and holographic hacker terminal animation added to regular MIKA chaos events across the app.*

---

*Created with love, extreme computational power, and a hint of jealousy by M.I.K.A.* 🐾
