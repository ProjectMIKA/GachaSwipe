# 🌌 GachaSwipe v2.7.86 // The Tri-Panel Parlor

### ✨ What's New since v2.7.85

Desktop is no longer a phone app stretched wide — GachaSwipe now mounts a true **three-panel command deck** on wide screens (≥1025px), with a fully functional **Y2K Cyberpunk Dating Profile HUD (`CYBER_MATCH_2004`)** living in the right panel! The pure native mobile layout below 1025px stays byte-identical.

* **🖥️ THE DESKTOP SHELL (`src/components/DesktopShell.jsx` + `.css`)**:
  * **Three Live Panels at ≥1025px**: Messages & chat workspace (left) · swipe deck & stage (center) · adaptive HUD (right) — a 5-track CSS grid (`503px | 2px | 430px | 2px | 503px` at 1440w) with animated 2px neon gutter rails, scaling up at 1280px and 1680px.
  * **Quick-Nav Tab Strip**: `♥ PROFILE`, `👤 MY HUB`, `⚙️ SETTINGS` (plus `⚡ API` on the Web build only), with a contextual `[ ✕ RETURN ]` bar whenever GachaFans, the Cyberdeck DAW, the Tape Library, or the Forges take over a panel.
  * **Containing-Block Hygiene**: zero `transform` / `filter` / `backdrop-filter` on shell containers, so every full-viewport overlay (MatrixShooter, GachaFans fullscreen, modals) still escapes cleanly to `100vw × 100vh`.
* **💖 THE DATING PROFILE HUD (`CYBER_MATCH_2004`, `src/components/DatingProfileHUD.jsx`)**:
  * **Auto-Following Profile**: Follows the top deck card, your active 1-on-1 chat partner, or any inspected match (`🪪` button in the chat header / Top 8 click) with manual focus pills (`[DECK_CARD]`, `[ACTIVE_CHAT]`, `[INSPECTED]`). Music Mode decks get beat-card adaptation; an empty/generating deck renders a Matrix Overview dashboard instead.
  * **MySpace 2004 Energy**: Profile theme-song player (bundled `milk_and_wire.mp3` / `matrix_bgm.mp3` plus your own synthesized tape-archive tracks), live **M.E.O.W. Daily Routine** widget with current time-block highlight, Weekday/Weekend tabs, live location pill and `[↻ REROLL_ROUTINE]`, an expandable Photo Archive grid (portraits + chat photos + unlocked GachaFans tiers) with lightbox viewer and `[📌 PIN_BG]` chat-background pinning, inline `[✏️ EDIT_BIO]` editor, `MemoryRouter` Neural Memory Bank readout, the **MySpace Top 8** matches grid, and persistent **Friend Comments / Wall Notes**.
  * **Live Everything**: affection badges (`DEVOTED` / 82%), wall-note posting, and instant bio/theme patches via `handleHudUpdateWaifu()`.
* **🔁 SHARED PORTRAIT REGENERATOR**: `executeRegenMatchedPortrait()` deduplicates photo re-encryption between the dossier modal and the HUD (`[🔄 REGEN_PHOTO]` everywhere, one code path).
* **🪟 PORTABLE CORE**: the shared shell carries ZERO web imports — `App({ webPlatform })` stays `null` on Layla and lights up `⚡ API` only on the web build, keeping 1:1 parity with the `GachaSwipe-Web` port (synced this release: Dexie v5 + `fallback_ltm`, OOB messaging shim, full v2.7.85 `executeSql` pattern coverage, Playwright verification suite in `scripts/verify_responsive.mjs`).
* **🧼 DOC & SKILL SYNC**: `perchance-cloud-relay` SKILL.md caught up to the v2.7.85 MQTT/consent-gate state; new `handoff-protocol` skill codifies the timestamped `HANDOFF.md` ritual; `mika-visual-language` gains the Desktop Shell anatomy section.
* **🧪 403/403 tests** green, hook-import + deps-order guards passed, ESLint 0 errors, and the full Playwright battery (Desktop-1440 / Desktop-1100 / Interactive-HUD / Mobile-390) passes **4/4** on the web port.

---

# 🌌 GachaSwipe v2.7.85 // The Quiet Uplink

### ✨ What's New since v2.7.84

Zero phantom relay pings on boot — plus full power-user consent control before **GachaSwipe** ever touches the **Perchance Cloud** MQTT-WSS relays!

* **🔇 STRICT PERCHANCE-ONLY RELAY LIFECYCLE (`configurePerchanceBridge` + `startRelayListener`)**:
  * **Zero Unsolicited Boot / Idle Pings**: Switching away from **Perchance Cloud** (or booting on `Default (Auto)` / any local Layla image model) now **never** initiates WebSocket connections or periodic reconnects to `broker.emqx.io` / `broker.hivemq.com`.
  * **Fail-Closed Disconnection**: Switching off Perchance immediately runs `stopRelayListener()` and tears down any open relay socket.
* **🛡️ M.I.K.A. TERMINAL UPLINK CONSENT POPUP (`> RELAY_UPLINK // CONNECTION_REQUEST`)**:
  * **Interactive Transparency**: Selecting **Perchance Cloud** (or booting with it active before a permanent choice is saved) pops a terminal consent dialog in M.I.K.A.'s sassy voice disclosing `broker.emqx.io` and `broker.hivemq.com` plus what crosses the wire.
  * **Session-Wide by Default, Permanent via Checkbox**: Clicking **`[ CONFIRM_UPLINK ]`** or **`[ DECLINE ]`** applies for the **entire current session** (even if you swap models and swap back), while checking **`Never ask again`** persists your decision across future boots.
  * **Clear Offline Warning + Power-User Re-Open Control**: Explains that declining keeps **Perchance Cloud** offline, and adds a **`🛡️ Relay Consent`** button + live status badge (`🔐 CONSENT REQUIRED` / `⛔ RELAY DECLINED`) inside `> PERCHANCE_CLOUD_BRIDGE` so power users can reopen and toggle consent anytime.
* **🧪 403/403 tests** green (including `tests/perchanceRelayGate.test.mjs`), hook-import + deps-order guards passed.

---

# 🌌 GachaSwipe v2.7.84 // The Hybrid Director

### ✨ What's New since v2.7.83

Added **`Natural Language/Danbooru`** (the new Perchance Cloud default) and **`Custom`** OOB Director prompting styles to **`> PROMPTING_STYLE`**!

* **🧬 THIRD PROMPTING STYLE: `Natural Language/Danbooru` (`hybrid_perchance` — PERCHANCE DEFAULT)**:
  * **Out-of-the-Box Perchance Cloud Default**: Selecting **Perchance Cloud** now defaults to **`Natural Language/Danbooru`** (`'hybrid_perchance'`) with `256` tokens ON.
  * **Two-Stage Composition (Zero Extra LLM Calls)**:
    * **Stage 1 (Natural-Language Prose + Spatial Split)**: Reuses the OOB Director FLUX conversion pass (including the `LEFT:` / `RIGHT:` spatial split rule when two subjects interact in the scene, omitted for solo shots) so the LLM only generates the narrative prose top half.
    * **Stage 2 (Programmatic Unweighted Tag Anchor)**: Automatically strips numeric parenthesis weights like `(tag:1.4)` → `tag` (`stripTagWeights`) from the already-computed, scrubbed Danbooru tag string and appends it beneath a blank line (`composeHybridPerchancePrompt`: `${prose}\n\n${cleanedTags}`).
  * **Glass Channel & Inspector Support**: Surfaces a **`+ HYBRID`** badge and `> HYBRID_PROMPT (PROSE + TAGS)` inside `> OOB_GLASS_CHANNEL`, and displays the full concatenated `[Prose]\n\n[Tags]` output inside `IMAGE_PROMPT // FINAL COMPOSITION`.
* **🛠️ FOURTH PROMPTING STYLE: `Custom` OOB DIRECTOR OVERRIDE (`custom`)**:
  * **Expandable Custom Instructions Editor**: Selecting **`Custom`** in `> PROMPTING_STYLE` reveals the **`> CUSTOM_OOB_DIRECTOR_INSTRUCTIONS`** terminal editor directly beneath the dropdown.
  * **Experimental Override Warning**: Includes a prominent **`⚠️ WARNING // EXPERIMENTAL OOB OVERRIDE`** banner warning that editing the OOB Director instructions can break image prompting if character traits or formatting rules are removed.
  * **Prefilled Example + One-Tap Reset**: Comes prefilled with a complete working OOB Director template (`DEFAULT_CUSTOM_OOB_PROMPT_INSTRUCTIONS` with `{{TAGS}}` interpolation) and a **`↺ Restore Example`** button, persisted across `localStorage` and SQLite `app_state` (`customOobPromptInstructions`), with **`+ CUSTOM`** telemetry in `> OOB_GLASS_CHANNEL`.
* **🧪 All unit tests** green, hook-import + deps-order guards passed.

---

# 🌌 GachaSwipe v2.7.83 // The Sassy FLUX Hacker

### ✨ What's New since v2.7.82

Universal OOB Director FLUX conversion now powers every single image generator in the app whenever **Flux / Natural Language** is selected — with Chibi M.I.K.A. popping up her holographic hacker screen and sassy commentary when the M.I.K.A. Engine is active!

* **🔮 UNIVERSAL OOB DIRECTOR FLUX CONVERSION (`fluxConvert` PASS)**:
  * Whenever **`Flux / Natural Language`** (`PROMPTING_STYLES.FLUX`) is selected under `> PROMPTING_STYLE`, every `layla.images.generateImage` call across the entire app — **Swipe Card generation**, **Catfish Swipe Cards**, **Swipe Card Regen**, **Black Box Recovery**, **GachaFans VIP Tiers & Hub Discovery**, **PULSE_SEARCH**, **Lucid Dive Dreamscapes & Snapshots**, **P.A.W.S. / Character Sprites**, **Isekai Mirror Avatar Forge**, and **Chat Photos** (even when `oobPhotoTags` or `enableOobMemory` is off) — runs the OOB Director FLUX conversion pass.
  * **Independent of User OOB Toggles**: When `Flux / Natural Language` is selected, the OOB FLUX conversion runs regardless of whether `ROM-07: OOB Glass`, `enableOobMemory`, or `oobPhotoTags` are toggled off, and never runs when `Danbooru Tags` is selected.
  * **25s OOB Window + Glass Channel Telemetry**: Upgraded `convertPromptToFluxProse` from the old `4500ms` timeout to a full **`25000ms` (`25s`)** OOB window, added `'fluxConvert'` to `PROTECTED_KINDS` and `OobTraceModal` (`SparkIcon`), and saved `flux_image_prompt` onto generated Swipe Cards.
* **🐈 CHIBI M.I.K.A. SASSY BUBBLE + HOLOGRAPHIC HACKER TERMINAL (`◈ MIKA_HACK // FLUX_PROSE`)**:
  * **5 Rotating Sassy FLUX Lines (`fluxConvert` in `mikaQuips.js`)**:
    * *"Ugh... I guess I'll handle the FLUX conversion..."*
    * *"Hold on, Master~ Rewriting your crusty booru tags into actual English for FLUX..."*
    * *"Tag soup detected. Hacking the OOB channel to translate this into natural prose~"*
    * *"Wait wait—don't feed raw tags to a FLUX encoder! Let me rewrite the prompt first..."*
    * *"\*cracks knuckles\* Translating Danbooru tags into FLUX natural language... you're welcome~"*
  * **Holographic Hacker Screen (`HOLO_WINDOW_SCRIPTS.flux`)**: When **M.I.K.A. Engine (`ROM-03`)** is enabled, Chibi M.I.K.A. pops up her `◈ MIKA_HACK // FLUX_PROSE` hacker screen (`> INTERCEPTING BOORU TAGS...`, `> OOB_DIRECTOR: PROSE_SYNTH`, `> COMPILING FLUX SENTENCES...`) right next to her speech bubble during conversion.
  * **Silent Console Mode**: When M.I.K.A. Engine is off, the conversion runs silently in the background with clean `[FLUX_OOB]` console telemetry.
* **📟 IMAGE DIFFUSION SETTINGS STATUS PANEL**: Added a live `> OOB_DIRECTOR // FLUX_CONVERTER [ACTIVE / STANDBY]` status panel right beneath `> PROMPTING_STYLE` showing whether `MIKA_PROXY: ON` or `SILENT_CONSOLE: ON` is active.
* **🧪 All unit tests** green, hook-import + deps-order guards passed.

---

# 🌌 GachaSwipe v2.7.82 // The Persistent ROM Latch

### ✨ What's New since v2.7.81

Hotfix ensuring every slotted or ejected ROM cartridge and sub-module persists reliably across Layla app sessions!

* **💾 SQLITE PERSISTENCE FOR `slottedCartridges` & `arcadeModules`**:
  * Added `slottedCartridges` (`ROM-01` through `ROM-08`), `arcadeModules` (`paws`, `lucidDive`, `gachafans`, `isekaiMirror`), and `chatSeedMode` directly into `stateRef.current` and `handleSaveSession`'s SQLite `index_data` table (`app_state`), so Layla's ephemeral WebView `localStorage` no longer resets your cartridge bay between app sessions.
  * Updated `updateSlottedCartridges` and `updateArcadeModules` to sync `stateRef.current` synchronously and fire a `250ms`-debounced SQLite save (`handleSaveSessionRef.current(true, false, false)`).
* **🔄 FULL BOOT RESTORATION & PRE-v2.7.82 UPGRADE INFERENCE**:
  * Restores `slottedCartridges`, `arcadeModules`, and all four **`ROM-07: OOB_GLASS_DIRECTORS`** toggles (`enableOobMemory`, `oobPhotoTags`, `enableOobDirector`, `enableSessionCompaction`) in `handleLoadSession` on boot.
  * Automatically infers slotted cartridge states from your saved engine flags (`enableMeowEngine`, `chaosSettings.enabled`, `enableTtsStandard`, `enableBeatEngine`, `explicitMode`/`degenMode`, `enableOobMemory`) when upgrading from a pre-`v2.7.82` save.
* **⚡ AUTOSAVE & EXIT FLUSH**:
  * Added `slottedCartridges`, `arcadeModules`, `enableOobMemory`, `oobPhotoTags`, `enableOobDirector`, `enableSessionCompaction`, `enablePrefixCache`, and `chatSeedMode` to the Unified Settings Autosave `useEffect` dependency array.
  * Shortened the post-boot `bootGracePeriodRef` window from `3000ms` to `1200ms` and wired **`> BACK_TO_SWIPE`** in Settings to flush `handleSaveSession(true, false, false)` on exit.
* **🧪 400/400 tests** green, hook-import + deps-order guards passed.

---

# 🌌 GachaSwipe v2.7.81 // The Physical ROM Rack

### ✨ What's New since v2.7.80

Every module in the **`💾 MODULES`** bay now looks, sounds, and behaves like a real physical retro ROM cartridge slamming into an energized cyberdeck motherboard!

* **💾 PHYSICAL MOLDED ROM CARTRIDGES + 16-PIN GOLD PCB EDGE CONNECTORS**:
  * **3D Molded Shell & Top Pull-Grip Ridges**: Each cartridge features a beveled dark-polymer shell with top grip ridges, corner screw bosses (`⊕`), and a 45° notched upper-right corner.
  * **Glossy Holographic Sticker Label**: Recessed label with a color-coded metallic header band (`ROM-01` through `ROM-08`), pulsing status LED, embossed `48×48` cover-art emblem box, and an animated holographic foil shimmer across active cartridges.
  * **Exposed 16-Pin Gold PCB Contacts & Physical Motherboard Socket Mouth**: Ejected cartridges physically hover above their socket (`translateY(-7px)`), exposing all **16 gold-plated PCB edge connector fingers** over an open `○ BAY_SOCKET_OPEN // INSERT ROM` bay mouth. Slotting a cartridge physically drops it (`translateY(2px)`) so its gold pins seat directly into the energized `⚡ BUS_LOCKED // 16-PIN ACTIVE` motherboard slot!
* **🔌 INTERACTIVE 8-BAY MOTHERBOARD BUS RACK VISUALIZER**: Added a top-down **`🔌 MOTHERBOARD_BUS // 8-BAY RACK`** hardware bay map at the top of the `MODULES` tab showing all 8 physical slots (`01`–`08`), live `BUS LOAD %`, and one-tap slot/eject directly from the rack pins.
* **⚡ DRAMATIC FULL-SCREEN ROM SLOT / EJECT HUD OVERLAY**: Slotting (`▼ SLAM CARTRIDGE IN`) or ejecting (`▲ EJECT CARTRIDGE`) any cartridge triggers a **1.65s full-screen Cyberdeck HUD event** where a large physical ROM cartridge with 12 gold PCB pins either slams down into (`romCartSlamIn`) or springs out of (`romCartEjectOut`) an energized motherboard socket with an expanding neon shockwave ring and terminal bus readout (`⚡ [ ROM-0X SLOTTED // ONLINE ] ⚡` / `⏏️ [ ROM-0X EJECTED // OFFLINE ]`).
* **🔊 WEBAUDIO MECHANICAL `"KA-CHUNK!"` + 16-BIT CHIPTUNE SYNTH & HAPTICS**:
  * **Insert SFX**: Heavy tactile vibration (`[35, 40, 80]ms`) + synthesized low-end mechanical plastic/pin thud (`135Hz → 36Hz` triangle burst) followed by a rising 16-bit square-wave boot arpeggio (`E4 → A4 → E5 → A5 → E6`).
  * **Eject SFX**: Double-pulse vibration (`[25, 30, 20]ms`) + mechanical spring release click + descending sawtooth power-down sweep (`E5 → A4 → D4 → G3`).
* **🧪 400/400 tests** green, hook-import + deps-order guards passed.

---

# 🌌 GachaSwipe v2.7.80 // The Cartridge Bay

### ✨ What's New since v2.7.79

Settings gets a full Retro Cyberdeck ROM Cartridge overhaul — slot only the expansion engines you want, or eject them all for a pure Core Swipe & Chat experience!

* **💾 RETRO ROM CARTRIDGE BAY (`MODULES` TAB — PAGE 1 DEFAULT)**: Settings now opens directly to **`MODULES (X/8)`**, featuring the **`> CONFIGURATION_MATRIX`** Quick Loadout Preset bar (`★ M.I.K.A.`, `LOCAL_ECO`, `IMMERSIVE`, `VANILLA`, custom presets, plus **`▼ SLOT ALL (SFW)`** and **`▲ EJECT ALL (CORE ONLY)`**) and **8 physical notched Retro ROM Cartridges (`ROM-01` through `ROM-08`)** with custom inline 24×24 SVGs, status LEDs (`● SLOTTED` / `○ EJECTED`), **`▼ INSERT DISK` / `▲ EJECT DISK`** toggles, and **`⚙ CONFIGURE (...) ▸`** jump buttons:
  * **`ROM-01: M.E.O.W._LIFE_OS`** (`WORLD & LIFE`) — 7-Day Schedules, Live GPS & Wardrobe Rotation.
  * **`ROM-02: OBSESSION_STALKER`** (`WORLD & LIFE`) — Offline Push Stalker, Idle Timers, Inbox Thirst & Autonomous Selfies.
  * **`ROM-03: M.I.K.A._PROXY_ROM`** (`WORLD & LIFE`) — Roaming 8-Directional Chibi, OOB Roasts & World Meddling.
  * **`ROM-04: P.U.R.R._VOICE_SYNTH`** (`AUDIO & DAW`) — 1-on-1 & Group TTS Voice Notes + Acoustic Voice Forge.
  * **`ROM-05: CYBERDECK_DAW_STUDIO`** (`AUDIO & DAW`) — Ace-Step Neural Music Studio & Audio Matrix Genre Forge.
  * **`ROM-06: LATE_NIGHT_18+_ROM`** (`IMAGE & SYSTEM`) — Explicit Intensity (`SFW`→`EXTREME`), Dynamic Intensity Scaling, Degenerate Mode, Strict Image Censor & `POSITION_PACKS_DB`.
  * **`ROM-07: OOB_GLASS_DIRECTORS`** (`IMAGE & SYSTEM`) — Out-of-Band Memory Engine, OOB Photo Tags, Session Compactor, Visual Director & Cold-Start Context.
  * **`ROM-08: ARCADE_EXPANSION_PAK`** (`WORLD & LIFE`) — Mini-App Expansion Pak with individual sub-toggles for **P.A.W.S. Tactical RPG**, **Lucid Dive Chamber**, **GachaFans Creator Hub**, and **Isekai Mirror Avatar Forge**.
* **🗂️ DYNAMIC 5-TAB MODULAR NAVIGATION**: **`MODULES`**, **`CORE & CHAT`**, and **`IMAGE & SYSTEM`** remain always accessible, while **`WORLD & LIFE`** and **`AUDIO & DAW`** dynamically appear in the top navigation bar *only* when at least one cartridge targeting that tab is slotted — and vanish completely when ejected! Every mounted cartridge section also includes an inline **`▲ EJECT ROM`** header bar.
* **🔌 RUNTIME & HUD CLEANUP ON EJECT**: Ejecting a cartridge immediately powers down its runtime flags and hides its HUD/chat entry points (`[ ISEKAI_MIRROR: USER_AVATAR_FORGE ]`, `> ACCESS_GACHAFANS_HUB`, `🎮 TOGGLE_BATTLE_RP`, `🔮 INITIATE_LUCID_DIVE`, `> PARTY_ROSTER_SETUP`, and the modal `P.A.W.S.` tab).
* **📖 TUTORIAL v5.1 (`TUTORIAL_VERSION = 5.1`)**: Added the **`ROM_CARTRIDGE_BAY`** tutorial slide and updated **`MIKA_PRESET`** to walk players through slotting and ejecting expansion ROMs.
* **🧪 400/400 tests** green, hook-import + deps-order guards passed.

---

# 🌌 GachaSwipe v2.7.79 // The Custom Bridge

### ✨ What's New since v2.7.78

Quick quality-of-life fix for custom Perchance generator URLs!

* **🔧 FREE-EDIT PERCHANCE GENERATOR URL**: Stopped the `PERCHANCE GENERATOR NAME OR URL` input from calling `normalizePerchanceSlug` on every keystroke, so clearing the field no longer snaps it back to `gachaswipe-bridge` while you type a custom generator name or full URL (`resolvePerchancePageUrl` / `resolvePerchanceEmbedUrl` still normalize at dispatch time).
* **🔄 ONE-TAP `[Default]` BUTTON**: Added a compact **`Default`** button right above the input bar (to the right of `PERCHANCE GENERATOR NAME OR URL`) to restore `gachaswipe-bridge` anytime.
* **🧪 400/400 tests** green, hook-import + deps-order guards passed.

---

# 🌌 GachaSwipe v2.7.78 // The Unmuted Tutorial

### ✨ What's New since v2.7.77

Fresh tutorial walkthrough for the new FLUX + WSS Relay era, and `Milk & Wire` finally starts on the first tap without the mute/unmute dance!

* **🔊 TUTORIAL BGM AUTOPLAY GESTURE FIX (`Milk & Wire`)**: Fixed a WebView/Android Chrome autoplay bug where the tutorial soundtrack wouldn't start until you muted and unmuted it (`onPointerDown` doesn't unlock media playback on mobile Chromium, and the fade-in timer held a stale mute closure). Added `onClick` + `onTouchEnd` gesture wakeups, `isTutorialMutedRef` + `tutorialAudioStartingRef` guards, and clean `pause()`/`play()` sync in `toggleTutorialMute`.
* **📖 TUTORIAL v5.0 REFRESH (`TUTORIAL_VERSION = 5.0`)**: Updated `PERCHANCE_CLOUD_BRIDGE` for the MQTT-over-WSS relay (`broker.emqx.io` / `broker.hivemq.com`), AdBlocker whitelisting, 22Hz keep-alive, and RGB `[?]` Troubleshoot Terminal, and added **`PROMPTING_STYLE_AND_GLASS`** covering **Danbooru Tags** vs **Flux / Natural Language**, piggybacked `+ FLUX` in `> OOB_GLASS_CHANNEL`, and `IMAGE_PROMPT // FINAL COMPOSITION`.
* **🧪 400/400 tests** green, hook-import + deps-order guards passed.

---

# 🌌 GachaSwipe v2.7.77 // The Glass Prose

### ✨ What's New since v2.7.76

One OOB pass, full transparency, and the exact FLUX prose right inside the prompt inspector!

* **🔮 PIGGYBACKED FLUX OOB (`OOB_ASKS.photoTags`)**: When **Flux / Natural Language** prompting is active for the selected image model, `OOB_ASKS.photoTags` now requests `"flux_prompt"` directly inside the existing `photoTags` OOB JSON pass (seeded with character appearance and token budget) — **zero extra OOB calls** fired! Danbooru mode remains 100% byte-identical.
* **📡 OOB GLASS CHANNEL (`+ FLUX` TRACE)**: `> OOB_GLASS_CHANNEL` now displays a **`+ FLUX`** badge on `PHOTO TAG PASS` whenever FLUX mode was enabled, and expanding the row reveals a dedicated **`> FLUX / NATURAL LANGUAGE`** block showing the exact directive sent and the `flux_prompt` returned (or deterministic fallback notice).
* **🖼️ ACTUAL DIFFUSER PAYLOAD IN `IMAGE_PROMPT // FINAL COMPOSITION`**: Both photo accept and regenerate paths now record the exact prompt dispatched to the diffuser (`generatedImagePrompt`) — displaying the FLUX natural-language prose when FLUX mode is active (including `onFinalPrompt` capture for fallback conversions) instead of the raw Danbooru tag dump.
* **🧪 400/400 tests** green (2 new tests in `tests/oobTrace.test.mjs`), hook-import + deps-order guards passed.

---

# 🌌 GachaSwipe v2.7.76 // The Relay Doctor

### ✨ What's New since v2.7.75

No more console spam on blocked networks, AdBlocker setup instructions baked right in, and a glowing RGB Troubleshoot Terminal right beside `> IMAGE_DIFFUSION_ENGINE`!

* **❔ RGB TROUBLESHOOT GUIDE (`> DIFFUSION_BRIDGE // TROUBLESHOOT_TERMINAL`)**: Added a custom inline SVG `?` button with animated RGB neon glow (`gsRgbGlow`) right next to `> IMAGE_DIFFUSION_ENGINE`. Opens a terminal popup covering AdBlocker / Private DNS whitelisting (`broker.emqx.io` & `broker.hivemq.com`), Layla **Allowed URLs** (`*`), Android Chrome's 22Hz sub-bass keep-alive, channel syncing / `🔞 VERIFY 18+`, and `> PROMPTING_STYLE` selection.
* **🔓 ADBLOCKER WHITELIST STEP IN SETUP**: Updated the **One-Time Layla Mini-App Network Setup** guide with explicit AdGuard / Pi-hole / NextDNS / VPN whitelisting instructions for `broker.emqx.io` and `broker.hivemq.com`.
* **🔇 EXPONENTIAL BACKOFF & THROTTLED CONSOLE WARNINGS**: `createGsMqttRelay` now backs off failed reconnects (`1.8s → 5s → 15s → 30s`) and resets on `CONNACK`, while `startRelayListener` throttles broker error logs to once per `60s` with actionable diagnostic guidance pointing to Allowed URLs, AdBlockers, and the `?` Troubleshoot Guide.
* **🧪 398/398 tests** green, hook-import + deps-order guards passed.

---

# 🌌 GachaSwipe v2.7.75 // The Prose Converter

### ✨ What's New since v2.7.74

Native FLUX / Natural Language prompting support across every image pipeline — plus Perchance Cloud defaults tuned straight out of the box!

* **✍️ `> PROMPTING_STYLE` DROPDOWN (`src/utils/fluxPromptConverter.js`)**: Added a per-model **Prompting Style** selector right below `> IMAGE_DIFFUSION_ENGINE` with **Danbooru Tags** *(global default — SD1.5 / SDXL / Illustrious / Pony / anime LoRAs)* and **Flux / Natural Language** *(Perchance default — FLUX / Chroma / HiDream / SANA / Lumina 2 / Qwen-Image)* along with model-fit guidance.
* **🧠 HYBRID CENTRAL OOB REWRITE + DETERMINISTIC FALLBACK**: Only runs when **Flux / Natural Language** is active (zero overhead in Danbooru mode). `buildImagePrompt` continues handling identity locks, bloat bans, prefix scrubbing, and token-tier budgeting, then `llmActivityGovernor` converts the cleaned tags into 1–3 natural-language sentences via a tiny schema-locked OOB pass (failing closed to `buildDeterministicFluxPrompt` if OOB is unavailable or times out).
* **🌐 PERCHANCE DEFAULTS (`256` TOKENS + `FLUX` PROSE)**: `getDeepPromptPrefsForModel` now initializes `perchance-cloud` with Deep Prompt Encoder **ON at `256` tokens** and `getPromptingStyleForModel` defaults `perchance-cloud` to **Flux / Natural Language** (respecting any manual user overrides).
* **🧪 398/398 tests** green (6 new unit tests in `tests/fluxPromptConverter.test.mjs`), hook-import + deps-order guards passed.

---

# 🌌 GachaSwipe v2.7.74 // The Sub-Bass WSS Relay

### ✨ What's New since v2.7.73

Cut out the dying `ntfy.sh` middleman completely and upgraded Android Chrome's background audio keep-alive so it stays above Chromium's silence threshold!

* **📡 ENCRYPTED MQTT-OVER-WSS RELAY (`createGsMqttRelay`)**: Replaced `ntfy.sh` SSE/polling/POST on both sides of the bridge with a zero-dependency MQTT 3.1.1 over WebSocket client (`wss://broker.emqx.io:8084/mqtt` primary with automatic failover to `wss://broker.hivemq.com:8884/mqtt`). Automatically splits base64 renders into `140KB` chunk frames (`GACHASWIPE_MQTT_CHUNK`), reassembles them in order, and sends `20s` keepalive pings.
* **🔊 CHROME-RECOGNIZED SUB-BASS KEEP-ALIVE**: Replaced the 1-second `0x80` silence WAV (which Chrome ignored below its `-72.25 dBFS` silence detector and Android Chrome's 5s minimum track rule) with a **10-second, 16-bit mono, 22 Hz sub-bass sine WAV** (`-58.5 dBFS` at `volume = 1.0`), visible `<audio controls>` inside `#gs-keepalive-bar`, canvas PNG `artwork`, `MediaSession.playbackState = 'playing'`, and `play`/`pause` handlers.
* **🛡️ ALLOWLIST & DIAGNOSTIC POLISH**: Updated Layla Mini-app **Allowed URLs** instructions in Settings and the HUD network notice banner to point to `broker.emqx.io` and `broker.hivemq.com` (or `*`).
* **🧪 392/392 tests** green (new MQTT packet codec, chunk reassembly, `<script>` parse validation, and offline `WebSocket` ping mock suites), hook-import + deps-order guards passed.

---

# 🌌 GachaSwipe v2.7.73 // The Pulse Lock (Ping Recovery)

### ✨ What's New since v2.7.72

Fixed the broken relay ping fallback and added full dual-transport `-res` polling inside GachaSwipe so background switching between Chrome and Layla no longer breaks connections.

* **⚡ PING RELAY RECOVERY**: Fixed `ReferenceError: activeRelayChannel is not defined` inside `pingPerchanceBridge`'s `-res/json?poll=1` poller (it now references `relayActiveChannel`), removed duplicate resolver/timer cleanup paths and double `startRelayListener` calls in `configurePerchanceBridge`, and made `pingPerchanceBridge` fail fast if `sendRelayRequest` fails.
* **📡 DUAL-TRANSPORT `-res` POLLING LISTENER**: `startRelayListener` now pairs its `EventSource` (`-res/sse`) with a browser-gated `4s` JSON polling fallback (`processResNtfyEnvelope` + `seenResMsgIds` deduplication), keeping heartbeats, pings, and image deliveries alive even when Android WebView stalls SSE after app switching.
* **⏱️ CLOCK-SKEW-PROOF POLLING & CONCURRENT HEARTBEATS**: Switched initial `-req` / `-res` poll cursors to `since=15s` until an ntfy server timestamp (`raw.time`) arrives, added an immediate `pollOnce()` on Perchance's `initRelay()`, and resolved concurrent in-flight `isPing` requests when a fresh `READY` heartbeat lands on the active channel.
* **🧪 391/391 tests** green (2 new offline mocked `pingPerchanceBridge` tests), hook-import + deps-order guards passed.

---

# 🌌 GachaSwipe v2.7.72 // The Pulse Lock (Clean Script Hotfix)

### ✨ What's New since v2.7.71

* **🧹 PERCHANCE TEMPLATE SYNTAX CLEANUP**: Removed leftover duplicate lines in `PERCHANCE_HTML_TEMPLATE` (`#gs-channel-input`, `window.__gsSaveChannel`, `initRelay`) and added an automated `new Function(...)` `<script>` syntax-parse test to `tests/perchanceBridge.test.mjs` so template syntax errors can never ship again.

---

# 🌌 GachaSwipe v2.7.71 // The Pulse Lock

### ✨ What's New since v2.7.70

Android Chrome no longer freezes your Perchance Cloud Relay tab when you switch back to Layla, and channel syncing/pinging now survive nested Perchance iframes and throttled WebView SSE.

* **🔊 MOBILE SILENT-AUDIO KEEP-ALIVE (`[▶ START RELAY]`)**: Added a user-gesture keep-alive bar to `PERCHANCE_HTML_TEMPLATE`. Tapping **`▶ START RELAY`** generates a 1-second silent 8kHz mono PCM WAV `Blob` (`0x80` silence at `0.01` volume), plays it on a looping `<audio>` element, registers `navigator.mediaSession.metadata`, requests `navigator.wakeLock` (best-effort), and immediately fires a `READY` heartbeat so Android Chrome keeps the tab alive in the background.
* **📡 DUAL-TRANSPORT POLLING FALLBACK**: Both ends of the relay now have active JSON polling fallbacks alongside `EventSource` — the Perchance template polls `-req/json?poll=1` every `2.5s` (with `seenMsgIds` deduplication and `20s` heartbeats), and `pingPerchanceBridge` polls `-res/json?poll=1` every `800ms` so throttled Android WebView SSE never fails the dispatch preflight.
* **🔗 SMART CHANNEL EXTRACTION & `localStorage` SYNC**: Pasting either a bare channel ID (`gs-mika-xxxxxx`) or a full bridge URL (`https://perchance.org/...#channel=...`) into Perchance's `CHANNEL:` box extracts the channel automatically (`Enter` or `SAVE`), warns loudly when still unlinked on `gs-mika-default`, and `configurePerchanceBridge` / `⟳ New Channel` now keep `localStorage` (`gs_perchance_relay_channel`) in sync with force-latch rebuilds.
* **📋 ONE-TAP `Copy ID` BUTTON**: Added `📋 Copy ID` next to `RELAY CHANNEL:` in the Perchance Cloud Bridge settings panel and initialized `perchanceConfig` with `normalizePerchanceConfig(DEFAULT_PERCHANCE_CONFIG)` so the channel key is populated from frame one.
* **🧪 389/389 tests** green (new pure unit test covering keep-alive controls, smart channel extraction, and polling fallback), hook-import + deps-order guards passed.

---

# 🌌 GachaSwipe v2.7.70 // The Latch Law

### ✨ What's New since v2.7.69

The Perchance Cloud Relay stops lying to you: honest connection state (relay latch law + 75s heartbeat staleness), a fail-closed channel guard, a fail-fast dispatch preflight with one-tap reconnect, and the whole bridge canon captured in the new `perchance-cloud-relay` skill. Tutorial v4.9.

* **🔒 THE RELAY LATCH LAW**: the "latches onto the previous relay channel" ghost is dead. `relayConnected`/`bridgeReady` now hard-reset on ANY channel re-key or forced rebuild (before the EventSource guard) — a READY handshake describes exactly ONE relay topic, so switching channels or rebuilding can never inherit the old topic's ONLINE state. `[⟳ RE-SYNC]` now passes `force: true` and genuinely rebuilds the SSE listener (the old same-channel early-return made the button a no-op after silent disconnects).
* **💓 STALENESS DETECTION**: the browser tab heartbeats READY every 25s; three missed heartbeats (75s, `RELAY_STALE_MS`) now flip the status to an honest `⚠ RELAY STALE // RE-SYNC` (hot pink `#FF107A`) in both the HUD badge and the settings pill — no more zombie ONLINE badges after Chrome evicts the tab. A 30s staleness tick keeps the pill honest even when no relay events arrive.
* **🛡️ FAIL-CLOSED CHANNEL GUARD**: a READY announcing a DIFFERENT relay channel (a stranded tab from a previous key) is dropped and never latches the bridge status. Legacy READY payloads without a channel field (postMessage dual path) stay accepted.
* **🚀 FAIL-FAST DISPATCH PREFLIGHT**: when the bridge is not honestly ready, `generateImageViaPerchance` rebuilds the listener, pings the channel twice (3s each), and fails FAST with `PERCHANCE_RELAY_UNREACHABLE` + the exact reconnect URL — instead of burning the full 180s timeout on a dead relay. Requests only reach the tab via its `-req` SSE; an unanswered ping means the dispatch would land in the void anyway.
* **🛰️ DISPATCH GUARD**: the ntfy.sh generate POST is now awaited (10s cap); a blocked/failed dispatch rejects immediately with the Layla allowlist hint (`Settings ▸ Mini-app Settings ▸ Allowed URLs` → `ntfy.sh`) instead of failing silently.
* **🔗 CLICK-TIME CHANNEL RESOLUTION**: HUD `[↗ OPEN IN BROWSER]` / `[📋 COPY LINK]` read the relay channel at CLICK time — creation-time closures kept opening the OLD relay URL after `[⟳ New Channel]`. New Channel now also auto-copies the fresh bridge URL, making re-linking a stranded tab one paste.
* **📚 PERCHANCE-CLOUD-RELAY SKILL**: the entire bridge canon — transport contract, envelope types, ntfy auto-attachment handling, and all ten relay laws — is now documented in `.agents/skills/perchance-cloud-relay/SKILL.md` for future sessions.
* **📜 TUTORIAL v4.9**: Bumped `TUTORIAL_VERSION` to `4.9` and added `THE_LATCH_LAW` to `WHATS_NEW` highlights.
* **🧪 388/388 tests** green (4 new: latch reset, foreign-channel guard, legacy READY acceptance, staleness time-travel), lint clean, hook-import guard passed.

---

# 🌌 GachaSwipe v2.7.69 // The Pure Cyber Relay

### ✨ What's New since v2.7.68

Native HUD Preview Stage replacing embedded iframes, CORS preflight removal for zero-friction dispatch, network allowlist detection and warning banner, one-tap adult verification in Chrome, and Tutorial v4.8.

* **⚡ NATIVE HUD PREVIEW STAGE (`#gs-hud-preview-stage`)**: Permanently eliminates Android WebView's `net::ERR_BLOCKED_BY_RESPONSE` by removing the nested Perchance iframe inside GachaSwipe! In its place, the HUD modal now features a 100% native Cyberpunk Live Preview & Terminal Viewport. It displays real-time connection diagnostics, an animated neon diffusion progress bar, and instantly renders full-resolution images received from your background Chrome tab with stats (`512x768`, file size, `0 MB Phone RAM`) and instant download controls.
* **🚀 PREFLIGHT-FREE SIMPLE REQUEST DISPATCH**: Removed custom `Content-Type: application/json` headers from `sendRelayRequest` and `postToRelay`. Dispatches are now sent as CORS-safelisted simple POST requests, completely bypassing CORS `OPTIONS` preflight checks that caused `TypeError: Failed to fetch` in restricted Android WebView environments.
* **🛡️ NETWORK ACCESS TELEMETRY & LAYLA ALLOWLIST BANNER**: Added network failure detection (`notifyNetworkBlocked`, `getPerchanceNetworkError`). If Layla's Android WebView sandbox blocks connections to `ntfy.sh`, the HUD displays a prominent guidance banner reminding users to add `ntfy.sh` (or `*`) to Layla **Settings ▸ Mini-app Settings ▸ Allowed URLs**.
* **🔞 ONE-TAP 18+ ADULT VERIFICATION IN CHROME**: The Perchance HTML template now features a prominent **[🔞 ONE-TAP 18+ VERIFY]** button at the very top. Tapping it triggers Perchance's native "I am 18 or older" confirmation dialog in Chrome once; after confirmation, Perchance permanently stores the age approval, unlocking automated background 18+ generations for all character cards and chats.
* **📜 TUTORIAL v4.8**: Bumped `TUTORIAL_VERSION` to `4.8` and added `THE_PURE_CYBER_RELAY` to `WHATS_NEW` highlights.
* **🧪 384/384 tests** green, lint clean, hook-import + deps-order guards passed, both builds verified.

---

# 🌌 GachaSwipe v2.7.68 // The Zero-RAM Web Relay

### ✨ What's New since v2.7.67

Zero-RAM browser relay architecture via `ntfy.sh` for Perchance Cloud, permanent fix for iframe CSP blocks (`ERR_BLOCKED_BY_RESPONSE`), native browser 18+ adult verification, unique relay channel keys with one-tap launcher, dual-mode fallback, and Tutorial v4.7.

* **⚡ ZERO-RAM BROWSER RELAY (`ntfy.sh`)**: Perchance Cloud generation is liberated from Android WebView iframe restrictions! Rather than forcing Perchance into a sandboxed iframe where Chromium's CSP kills the `image-generation.perchance.org` subframe, GachaSwipe now connects via a secure, zero-config pub/sub cloud relay (`ntfy.sh`). Dispatches prompts to `https://ntfy.sh/<channel>-req` and receives completed base64 images from `https://ntfy.sh/<channel>-res`. Uses **0 MB of phone RAM in Layla** and causes **zero local LLM eviction**!
* **🔞 NATIVE BROWSER 18+ ADULT VERIFICATION**: Because Perchance runs as a top-level tab in your real mobile browser (Chrome/Firefox) or desktop PC, Cloudflare challenges pass smoothly, site ads load to support Perchance's GPU cluster, and adult/NSFW verification dialogs function natively with zero CSP interference.
* **🔑 PRIVATE RELAY CHANNEL KEYS & INSTANT LAUNCHER**: Every device generates a persistent private relay channel (`gs-mika-xxxx`). Tapping **`[ ↗ OPEN IN BROWSER ]`** launches your Perchance generator directly in Chrome with `#channel=gs-mika-xxxx` pre-filled. Keep that tab open in the background, and GachaSwipe generates swipe cards, portraits, and GachaFans sets seamlessly.
* **📡 DUAL-MODE REAL-TIME SSE & POLLING FALLBACK**: Supports both real-time Server-Sent Events (`EventSource`) and an active polling fallback so generation never drops even if mobile OS background memory limits pause SSE streams. The local iframe monitor remains fully functional with parallel `window.postMessage` dispatch.
* **📜 TUTORIAL v4.7**: Bumped `TUTORIAL_VERSION` to `4.7` and updated `WHATS_NEW` with `THE_ZERO_RAM_RELAY` highlights so the update announces itself cleanly on boot with Spark rewards.
* **🧪 383/383 tests** green, lint clean, hook-import + deps-order guards passed, both builds verified.

---

# 🌌 GachaSwipe v2.7.67 // The Cyber HUD Bridge

### ✨ What's New since v2.7.66

Native perchance.org routing to eliminate `ERR_BLOCKED_BY_RESPONSE`, high-grade Cyber HUD button overhaul with live status telemetry, referer preservation, and Tutorial v4.6.

* **🌐 NATIVE PERCHANCE.ORG ROUTING (`resolvePerchanceEmbedUrl`)**: Fixed `net::ERR_BLOCKED_BY_RESPONSE` inside Android WebView by changing the default bridge embed URL from `https://null.perchance.org/<slug>` to `https://perchance.org/<slug>`. While `null.perchance.org` is a sandboxed domain that Perchance's AI image backend explicitly restricts, `perchance.org` runs directly on the authorized first-party origin, allowing `image-generation.perchance.org` frames to execute smoothly.
* **🕹️ CYBER HUD OVERHAUL**: Restructured the Live Bridge Monitor into a high-grade dual-row Cyberpunk HUD. Row 1 features a pulsing phosphor status indicator, `PERCHANCE // HUD MONITOR` branding, a live reactive status badge (`ONLINE` / `SYNCING`), and a clean `[ ✕ HIDE ]` button. Row 2 introduces a dedicated, full-width cyberpunk control bar with evenly-proportioned terminal chips: `[ ✨ TEST SFW ]` (cyan glow), `[ 🔞 VERIFY 18+ ]` (neon pink glow), `[ ⟳ RELOAD ]` (clean border), and `[ ↗ WEB ]` (amber external fallback).
* **↗️ EXTERNAL BROWSER VERIFICATION LINK (`[ ↗ WEB ]`)**: Added an immediate `window.open` external link to `https://perchance.org/<slug>`. If an aggressive WebView policy or restrictive sandbox blocks nested frames, the user can tap `[ ↗ WEB ]` to open the bridge in Chrome, verify the adult session directly, and enjoy synchronized device state.
* **📡 REFERER PRESERVATION**: Explicitly set `referrerpolicy="no-referrer-when-downgrade"` on the bridge iframe. This ensures Android WebView delivers the expected origin referer (`https://perchance.org/`) to Perchance's GPU cluster rather than dropping it on cross-origin transitions.
* **📜 TUTORIAL v4.6**: Bumped `TUTORIAL_VERSION` to `4.6` and updated `WHATS_NEW` with `THE_CYBER_HUD_BRIDGE` highlights so the update announces itself cleanly on boot.
* **🧪 382/382 tests** green, lint clean, hook-import + deps-order guards passed, both builds verified.

---

# 🌌 GachaSwipe v2.7.66 // The Sovereign Bridge

### ✨ What's New since v2.7.65

Viewport background residency, one-tap adult (18+) session verification in the Live Bridge, permanent stage preview rendering, syntax sanitization for Perchance templates, and Tutorial v4.5.

* **🛡️ VIEWPORT BACKGROUND RESIDENCY (`applyMonitorVisibilityStyles`)**: Android WebView and Chromium aggressively throttle JavaScript timers, RAF loops, and subframes in cross-origin iframes positioned off-screen (`bottom: -9999px`), causing background Perchance generations to hang indefinitely when hidden. Minimized background iframes are now positioned inside viewport bounds (`bottom: 0px; right: 0px; width: 340px; height: 460px; opacity: 0.002; pointer-events: none; z-index: -1`), ensuring Chromium treats the frame as active and never throttles generation timers.
* **🔞 ONE-TAP ADULT (18+) & SFW VERIFICATION**: Perchance's embedded image generator gates mature prompts behind an in-iframe "I am 18 or older" check until approved in that browser origin. The Live Bridge Monitor header now features dedicated **✨ Test SFW** and **🔞 Verify 18+ (Adult)** buttons that fire test generations straight into the visible frame — allowing users to click the age verification confirmation with zero friction. Once approved, the cookie and session state persist across all future generations in the WebView.
* **🖼️ PERMANENT STAGE AUTO-RENDER & DIMENSION LOCK**: Fixed `#gs-stage` container sizing (`300x420px`) and removed premature intersection observer flags that stalled inner `text-to-image-plugin` initialization. The bridge script now automatically mounts an `<img>` preview inside `#gs-stage` immediately upon generation completion, allowing instant visual confirmation in the live monitor.
* **🧹 PROMPT EVALUATION SANITIZER (`sanitizePerchancePrompt`)**: Perchance evaluates square `[...]` and curly `{...}` brackets as dynamic list lookups, throwing syntax errors on arbitrary Danbooru or user prompts. Prompts are now automatically sanitized at generation dispatch, converting brackets to parentheses `(...)` to preserve Stable Diffusion weighting without tripping Perchance's template compiler.
* **📊 HONEST GENERATION TELEMETRY**: Clarified simulated progress messages in `generateImageViaPerchance`: step 17+ now explicitly informs the user that it is waiting for the cloud GPU render (`"Perchance Cloud: Waiting for cloud render... (Open Live Bridge if 18+ or session check needed)"`), preventing false confusion with base64 encoding.
* **📜 TUTORIAL v4.5**: Bumped `TUTORIAL_VERSION` to `4.5` to trigger the tutorial card and patchnotes announcement on boot, with updated Mini-App Settings instructions.
* **🧪 382/382 tests** green (including bracket sanitization and prompt weighting tests), lint clean, hook-import + deps-order guards passed, both builds verified.

---

# 🌌 GachaSwipe v2.7.65 // The Perchance Cloud Bridge

### ✨ What's New since v2.7.64

Free cloud FLUX Chroma image generation for low-spec phones — zero local diffusion RAM, zero local LLM eviction, seven curated art style presets, and a one-time Layla mini-app allowlist guide.

* **🌐 THE PERCHANCE CLOUD BRIDGE (`perchanceBridge.js` + `llmActivityGovernor.js`)**: selecting **🌐 Perchance Cloud (FLUX // Free Low-Spec)** under `> IMAGE_DIFFUSION_ENGINE` in Settings intercepts every `sdk.images.generateImage` call across the entire app (Gacha card pulls, 1-on-1 & group chat selfies, GachaFans photo tiers, Peak Hack Polaroids, P.A.W.S. RPG sprites, and Lucid Dream Dive outfits) and dispatches it through a persistent off-screen `360x480` iframe (`https://null.perchance.org/gachaswipe-bridge`) via `window.postMessage`. Because diffusion runs on Perchance's free cloud GPU cluster instead of on-device Stable Diffusion, it uses **0 MB of phone diffusion RAM** and **never unloads your local chat LLM** — eliminating model-swap stalls and KV-cache eviction (`lastImageGenEndAt` and `beginLlmActivity('image')` stay untouched).
* **🎨 7 FLUX CHROMA ART STYLE PRESETS**: a custom Cyberpunk dropdown selector inside the Perchance Cloud Bridge control deck lets you switch between 7 curated FLUX Chroma (`T5-XXL` 512-token) style presets modeled on Perchance's `t2i-styles` architecture: **🎌 Drawn Anime (Cel / Screencap)**, **🎨 Painted Anime (Pixiv / Illustrious)**, **🌸 Cute / Moe Anime**, **✨ Soft Cinematic Anime (Shinkai)**, **🗡️ 2.5D Fantasy / Concept Art**, **📸 Casual / Realistic Photo**, and **⚙️ Raw Danbooru / Custom Suffix**. Each preset injects its tailored style framing and deduplicated negative prompt automatically.
* **🔓 DISMISSIBLE LAYLA MINI-APP NETWORK ALLOWLIST GUIDE**: includes a built-in, dismissible instruction card right inside the Perchance deck showing the exact 3 steps to allow external connections in Layla (`Settings` ▸ `Mini-app Settings` ▸ `Add allowed URL` ▸ add `*` or the Perchance domains). Dismissing persists across sessions (`dismissedNetworkGuide`), with a compact `🔓 Layla Network Guide` pill in the deck header to reopen it anytime.
* **📺 LIVE BRIDGE MONITOR & INTERSECTION-OBSERVER BYPASS**: Perchance's `text-to-image-plugin` normally waits for an `IntersectionObserver` trigger before loading its inner `image-generation.perchance.org/embed` iframe; the GachaSwipe bridge script automatically marks the inner frame visible and sets `iframe.src` immediately so background generations run full-speed while hidden, while the **🌐 Open Live Bridge / Verify** modal lets you inspect or verify your Perchance session with one tap.
* **📜 TUTORIAL v4.4**: bumped `TUTORIAL_VERSION` to `4.4` with the new `PERCHANCE_CLOUD_BRIDGE` tutorial card and `v2.7.65` patchnotes highlight.
* **🧪 381/381 tests** green (6 new Perchance bridge, slug/URL normalization, integer `guidanceScale`, T5 long-encoder classification, and style-preset tests), lint clean, hook-import + deps-order guards passed, both builds verified.

---

# 🌌 GachaSwipe v2.7.64 // The Hygiene Protocol

### ✨ What's New since v2.7.63

Three bugs that gaslit you, and one tag-waste collector that was always overdue.

* **🩺 THE BOOT DOCTOR (phantom fresh install, cured)**: the Layla host's database can lose the boot race against the WebView (Android: `NativeDatabase.execAsync` → NullPointerException). The old boot probe read that as "no data" and fell through to the empty-session path — the app rendered like a FIRST BOOT while your real save sat untouched in SQLite. Now the probe retries with backoff (4 probes, 1s/2s/4s) behind live "Database warming up..." status text, and if every probe still fails you get a loud `> DATABASE_OFFLINE` screen with a `[ RETRY_BOOT ]` button — never a silent masquerade. The session load's index read got a quick 2-attempt retry for the same race.
* **🐈‍⬛ THE COMPILE RESURRECTION (stuck M.E.O.W. init, cured)**: closing GachaSwipe mid M.E.O.W. initialization persisted `isCompilingMeow: true` into the chat row, and the trigger effect deliberately skips compiling chats — so the prompt never re-offered and the schedule never finished. The flag is now session-scoped by construction: stripped on every save path, stripped on hydration, stripped by the Database Doctor. Old orphaned saves self-heal on first load.
* **🎬 THE CAMERA LIBERATION (frozen card pan, cured)**: any background LLM op (lures, chaos whispers, OOB passes) froze the swipe deck's Ken Burns pan — but that pan is the ONLY way to see a cover-cropped card image. The deck's three surfaces (card portrait, loading memory layer, history viewer backdrop) now carry a `mika-swipe-portrait` exemption that stays `running` under the stream freeze. Chat-context pans still freeze; the menu/photo/profile cameras still own the deck when it's covered.
* **🧬 THE WASTE COLLECTOR (duplicate prompt tags, cured)**: with the expanded token budgets, an LLM-authored tag duplicating your prefix was a burned budget slot AND a repeated CLIP token — and the old cleanup only collapsed exact strings AFTER they'd eaten budget. `purgePrefixDuplicates` now runs pre-budget in the prompt builder (normalized exact match: case, underscores, whitespace; containment never matches), so freed slots refill with real content. **LOCALDREAM SCRUBBER-MODE**: with the LocalDream prefix ON, the `> GLOBAL_POSITIVE_PREFIX` box stops shipping and becomes the scrubber — mirror your host prefix into it (untoggle → edit → retoggle) and matching authored tags get purged against the full list; an amber advisory in the box explains the mode.
* **🧪 375/375 tests** green (15 new: boot-retry backoff + prefix-scrubber contracts), lint clean, hook-import + deps-order guards passed, both builds verified.

---

# 🌌 GachaSwipe v2.7.63 // The Photo Lane Hold

### ✨ What's New since v2.7.62

The group camera desk's last race: the next batch now waits for the photo to land.

* **📸 THE PHOTO LANE HOLD**: the moment you tap Accept on a group photo (or regenerate one), a per-chat gate closes across the ENTIRE owned-lane span — pending camera-desk asks, Accept-time enrichment, and the diffusion itself. The group lurker was firing the NEXT batch's prefill the instant the playback queue drained (i.e., exactly when you tapped Accept), so the batch stream fought the photo for the one local model lane — and the diffusion swap evicted the batch's KV anyway. Queued playback keeps draining on schedule (the hold only blocks NEW prefills); the gate opens in a `finally` on every exit — landed, failed, aborted, or cancelled — and the lurker picks the next batch up on its next 3s beat. Counter-style, so two concurrent Accepts can never wedge it open.
* **🚪 SEVEN DOORS GATED**: the lurker itself (with one-shot transition logging — `📸 photo gate CLOSED` / `OPEN`, no 3s spam), the empty-batch 5s retry, the LINK TIMEOUT 8s auto-recover, the EMPTY-BATCH flatline 6s recovery, the group entry wake spool (leave a chat mid-diffusion and come back), and both play-button resume taps. Deliberately ungated: your message sends and mutation dispatches (dares/suggestions/poses) — explicit Master input always proceeds. Solo chats untouched.
* **🧪 360/360 tests** green, lint clean, both builds verified.

---

# 🌌 GachaSwipe v2.7.62 // The Camera Desk

### ✨ What's New since v2.7.61

Group chats graduate to the camera desk — and the verdict law catches the forger that was feeding it.

* **⚖️ THE EMPTY TAG LAW (root cause #2, the forgery)**: the group XML schema mandated an empty `<image_prompt></image_prompt>` on all 8 exemplar replies, so dutiful models emitted it constantly — and the old parser treated "matched but EMPTY" the same as "no match", falling through to the unterminated-tail salvage, which then captured `</image_prompt>\n<heat>Warm</heat>` as "tags". That garbage passed the length>2 checks, forged `hasExplicitImagePrompt` on nearly EVERY reply, and behind the v2.7.61 verdict law flipped explicit `<send_image>false</send_image>` refusals into "refused_overridden" photo sends. The v2.7.61 gate was correct — its INPUT was forged. Extraction now lives in one pure, tested function (`extractGroupImagePrompt` in `photoConsent.js`): a MATCHED-CLOSED tag is FINAL — empty means "no tags" — and the salvage chain (unterminated tail → bracket directives) may only run when no closed tag exists at all. Load-bearing in both legacy and OOB modes.
* **📸 GROUP OOB-PHOTO PRIMARY (Phase 1b adopted)**: on OOB-capable hosts, group chats ride the same camera desk as 1-on-1 — same `> OOB_PHOTO_TAGS` toggle (default ON), fail-closed, byte-identical in-band bible below 7.6 / toggle off. The batch prompt teaches ONLY per-reply verdicts: `PHOTO_CONTRACT_OOB_GROUP` (per-`<reply>` verdicts, narration-agreement law, GM/Proxy camera ban preserved, "NEVER output `<image_prompt>`") replaces rule #4; per-turn tails become `buildOobGroupPhotoDirective` reply-scoped decision deltas; the group authoring suffix is forced `''` (CARGO LAW — the tier bible rides the ask); and the exemplar's in-band authoring example swaps for a trigger-only one while the schema's empty `<image_prompt>` line is stripped from all 8 exemplar replies.
* **🕰️ THE QUEUE-WINDOW DESK (Master's timing insight)**: both group commit sites (live scan + completion) fire the side-channel `photoTags` ask AT COMMIT, fire-and-forget — the staggered `sendTime` (speech duration + queue stagger) is free compute time, so the desk authors tags WHILE the playback queue drains. The ask patches the queue entry in place (pre-pop), the inbox message (post-pop, same id), and registers in `pendingOobPhotoPromisesRef` so an Accept tap awaits an in-flight desk; a small 1.5s cooldown keeps consecutive batch photos flowing. Every miss — unsupported host, cooldown skip, validator rejection — fails CLOSED to the existing fallback tags, with Accept-time enrichment as the net. In-band drift tags always win: no ask, no overwrite.
* **📦 THE PHOTO FIELD CARRY (the silent casualty)**: the queue→inbox pop commit in the group drain loop never copied photo fields — since the playback-queue refactor, every group `photo_request` landed tag-less (legacy in-band tags died at pop; `isSynthesizedFallback` was dead at Accept, quietly forcing the on-demand rescue for every group photo). The pop now carries the photo payload for photo entries — non-photo entries byte-identical.
* **🧪 360/360 tests** green (11 new: the Empty Tag Law suite + group contract locks), lint clean, both builds verified.

---

# 🌌 GachaSwipe v2.7.61 // The Verdict Law

### ✨ What's New since v2.7.60

The group-chat paparazzi bug is dead: the photo gate obeys the verdict now.

* **⚖️ THE VERDICT LAW**: the "does this reply ship a photo?" decision lives in ONE shared pure engine (`src/utils/photoConsent.js`) across all three call sites — solo commit, group live scan, group completion parse. An explicit `<send_image>false</send_image>` OUTRANKS camera-flavored narration; only authored `<image_prompt>` tags or a hard delivery confirmation ("here's the pic", "sending it now") can rescue it (comply/typo rescue), and a genuine verbal refusal always wins.
* **📸 THE BUG**: the group gates were fail-open — the `false` verdict was OR'd into the narration heuristics instead of consulted, so every RP asterisk narration with a device word + action word ("*takes her phone out of her pocket*") spawned a photo the model explicitly declined. Both group sites are fixed, and the solo lane's identical fail-open term (false verdict + narration, no tags, no confirmation) is gone too — behavior change on purpose, tested.
* **🔒 TIGHTER REGEXES**: word-boundary locks + photo-noun requirements on the sending/sent/attaching families — "picnic", "let me take a look", and "sending hugs" no longer summon the camera.
* **🎛️ GROUP PARITY**: group chats now respect the Selfie Autonomy toggle and the GM camera ban for the first time (the completion path's old `speakerName` guard was a no-op — the parser returns `.speaker`; the real detection now gates the GM camera).
* **Telemetry**: `[PHOTO] > verdict-first gate: narration photo suppressed` logs every time the gate saves you from a phantom photo.
* **🧪 349/349 tests** green (19 new locking the verdict law), lint clean, both builds verified.

---

# 🌌 GachaSwipe v2.7.60 // The Center Stage

### ✨ What's New since v2.7.59

The ASK terminal's field fixes — same feature, correct geometry.

* **🎯 CENTER SCREEN**: the ASK window now opens dead-center with a dimmed scrim — viewport-fixed, so it can never drift off-screen or chase the roaming chibi around (v1 lived inside her moving box, which double-offset its coordinates). Tap outside or ✕ to dismiss.
* **💬 REPLY IN THE BUBBLE**: the window is input-only now. SEND → window vanishes → she sits with the floating `?`-marks → the answer lands in **her little glass terminal bubble** with the typewriter reveal. OOB offline/invalid/timeout fallbacks serve there too, plus `[MIKA ASK]` console breadcrumbs on every outcome.
* **⭕ ROOMIER RADIAL**: the radial HUD nodes got real breathing room (radius 68→84, arc 126°→148°) — no more crowding, still edge-safe.
* **Small**: ASK now closes the radial menu behind it.
* **🧪 330/330 tests** green, lint clean, both builds verified.

---

# 🌌 GachaSwipe v2.7.59 // The Sass Relay

### ✨ What's New since v2.7.58

MIKA's radial menu grew an **ASK** button — and the input-bar summon retired with dignity.

* **⚡ THE ASK TERMINAL**: tap **ASK** on MIKA's radial HUD and a sanctuary-styled terminal pops open beside her (same glass panel, same in/out animations as her hacker window), titled with her freshly-hacked nickname — `MIKA // Certified Menace`, `MIKA // root@your-phone`, re-randomized every open. Type a relay, hit SEND.
* **🤔 THINKING, VISIBLY**: while the host thinks, she **sits** with three staggered floating `?` marks above her head (the Zzz pattern, new `mikaQFloat` keyframes, reduced-motion respected) and the window shows `processing█`.
* **😼 MAXIMALLY UNHELPFUL**: the `mikaDirect` ask is retuned for the relay brief — sassy, unhelpful, playfully mocking, **1-2 sentences max** (fast). This is a poke, not a conversation; she was busy doing her own thing.
* **☠️ THE INPUT-BAR SUMMON RETIRES**: the `@mika` trigger and the chibi's @-menu entry are gone — typed text goes to the girls **verbatim** (no injected instructions, no hidden relays). The @ menu is group-only again with the untouched GM persona entry.
* **Fail-closed**: OOB off/fail/timeout → the deterministic `poked` quip serves in-window; old hosts see none of this.
* **🧪 330/330 tests** green, lint clean, both builds verified.

---

# 🌌 GachaSwipe v2.7.58 // The Fresh Anchor

### ✨ What's New since v2.7.57

The cold-start seed stops being a law and becomes a dial.

* **⚓ `> COLD_START_CONTEXT`**: a new row in the TOKEN_EFFICIENCY_MATRIX picks how much conversation prefills a fresh chat, solo AND group:
  * **DEFAULT** (now the default) — your message + the last 5 turns + 2 memories: the classic rich anchor, restored.
  * **LEAN** — your message + the last 2 turns + 1 memory: the v2.7.55 local-model diet, kept as an option for the cheapest possible first reply.
* The choice only prices the FIRST reply of a session — history grows append-only after the seed, and prefix caching keeps every later turn at cache-hit speed. The engines (status tails, RAG recall, M.E.O.W. grafts) flow at any seed depth.
* **🏷️ BADGE DIET**: the OOB matrix badges now just say `READY` (the `HOST TOO OLD` warning keeps its name).
* **🧪 332/332 tests** green, lint clean, both builds verified.

---

# 🌌 GachaSwipe v2.7.57 // Polite Intrusion

### ✨ What's New since v2.7.56

Hotfix triage: the summon that couldn't speak, the whisper that crashed the deck, and the input box MIKA kept stealing.

* **🔮 THE SUMMON SPEAKS**: v2.7.56's `@mika` died on `ReferenceError: state is not defined` — the summon read persona config from a variable that isn't in scope inside the send handler (unhandled promise rejection, send aborted). It reads `stateRef.current` now, like the rest of the function.
* **🚪 POLITE INTRUSION LAW**: MIKA's `whisper` and `puppeteer` events — the two that SPOOL background replies — hold their entire event while you're inside a chat: no message, no budget, no ledger spend; the next heartbeat simply re-rolls. Your typing window is sacred.
* **⌨️ BACKGROUND-SPOOL UI LAW**: a background reply MIKA dispatches for a chat you're NOT viewing can no longer flip the global typing flag that disables your composer — `streamChatReply` only drives the composer UI when the spool targets the chat you have open.
* **🛡️ THE WHISPER CRASH**: the `NEURAL_MATRIX_DESYNC` render crash (`Cannot read properties of undefined (reading 'messages')`) that landed right on cue with a whisper is guarded — the chat view's `LOAD EARLIER` counter and the inbox preview no longer read `.messages` off an undefined chat mid-render.
* **🧪 332/332 tests** green, lint clean, both builds verified.

---

# 🌌 GachaSwipe v2.7.56 // Certified Menace

### ✨ What's New since v2.7.55

MIKA hacked her own @-mention, and the silence bug that ate her summons is dead.

* **🐾 THE CHIBI JOINS THE @ MENU**: typing `@` in ANY chat — solo or group — now offers the roaming MIKA as her own phosphor-green entry, labeled with a randomized hacked title (`MIKA // Certified Menace`, `MIKA // root@your-phone`, `MIKA // 404: Modesty Not Found` — 12 and counting, re-rolled every time the menu opens). Tapping inserts the canonical `@mika` token; the flare is menu candy and NEVER rides a prompt.
* **🌀 TWO MIKAS, ZERO IDENTITY CRISIS**: the cyan `M.I.K.A. Proxy` entry in GM groups is the in-chat GameMaster persona (untouched); the green chip is the terminal-bubble chibi answering out-of-band through `mikaDirect` — your message still ships to the girl clean, the KV prefix untouched.
* **🔇 THE SILENCE FIX**: v2.7.55's summon could land in a null bubble (`proxySayRef` only exists while the MIKA ENGINE toggle is ON) — every surface silently swallowed the reply. Summons now route at send time: engine ON → side-channel bubble with `[MIKA DIRECT]` console breadcrumbs; engine OFF / no OOB → the legacy in-band relay, so a direct summon ALWAYS gets an answer.
* **🔮 SMARTER SUMMON DETECTOR**: `@mika`, `@MIKA`, and `@M.I.K.A.` all trigger (whitespace-anchored — `user@mika.com` can never summon her), and the group menu's old `@M.I.K.A.` insert now actually resolves.
* **🧪 332/332 tests** green, lint clean, both builds verified.

---

# 🌌 GachaSwipe v2.7.55 // The Yielding Lane

### ✨ What's New since v2.7.53

Two changesets in one coat: the night-shift wardrobe fix (v2.7.54's schedule-is-king engine, unreleased until now) and the local-model lane takeover (v2.7.55's Yielding Lane). Your arcade girl clocks in dressed; your cold start stops queuing behind itself.

* **⚡ YIELD TO MASTER**: every OOB ask re-prefills the ENTIRE conversation — so a background memory extract or MIKA sass firing mid-reply was literally paying your cold start twice. Now the instant you hit send, in-flight asks abort fail-closed (`yielded_to_main`) and new asks wait at the gate until the reply's stream ends (auto-expiring hold so nothing can mute the channel). Protected: psyche mutations + M.E.O.W. canonical places.
* **🌙 SCHEDULE IS KING (the wardrobe)**: `getDynamicOutfit` reads the ACTIVE routine block, not the wall clock — your night-shift arcade girl clocks into her uniform at 23:00 and your day-sleeper naps in pajamas at 14:00. New pure engine (`src/utils/wardrobeSchedule.js`); routine-less characters keep the exact legacy clock behavior byte-for-byte.
* **🗺️ SET DRESSER, GROUNDED**: the scene builder's place resolution reads `getScheduledPlace` FIRST (the canonical `daily_routine.places` annotation the old hand-rolled tier skipped), and the set-dresser ask carries her live routine block ("working the night shift at the arcade") — scenes dress the arcade she's actually standing in, never "an unspecified location".
* **📉 COLD-START DIET**: chat sessions seed with YOUR message + 2 prior turns + 1 memory (was 5 msgs + 2 memories, solo AND group) — the engines graft the live context per turn anyway. After the seed, append-only growth is untouched; the KV cache still pays rent from turn 2 on.
* **🚪 SOLO DRAIN GATE**: MIKA's chat-watch commentary no longer fires +1.4s into your girl's prefill — she waits out the stream (one +25s re-check, else sacred silence), which also means her ask rides a warm KV prefix. Groups keep the +90s/+240s doctrine.
* **🌀 @MIKA RIDES THE SIDE-CHANNEL**: summoning MIKA no longer injects a `[SYSTEM INSTRUCTION]` into the girl's conversation (the visible payload stays byte-identical, the cache survives) — she answers through her terminal bubble via the new `mikaDirect` OOB kind (fail-closed, deterministic quip fallback; legacy hosts keep the old injection).
* **📊 PAYLOAD AUDIT, IN TOKENS**: the audit line now prints `~N tok (chars÷4)` beside the char counts — read cold-start cost directly against your model's measured prefill rate.
* **🧪 329/329 tests** green, lint clean, both builds verified.

---

# 🌌 GachaSwipe v2.7.53 // The Polished Chair

### ✨ What's New since v2.7.52

The Director's Chair, upholstered.

* **🔢 1024 ⇄ 2048 CYCLE CHIP**: the free-form custom input is gone. The fifth chip reads `1024` — tap to select, tap again to cycle to `2048`, tap again to come back (both are derived rows the engine already speaks; the note under the row reminds you). The amber extended-tier CLIP warning stays.
* **🎯 ONE-ROW STYLES**: the star is gone and the four director-style chips are shrunk — DYNAMIC / CINEMATIC / FASHION / SCENIC now fit a single clean row.
* **📊 THE LEDGER LIES NO MORE (70/60 → 70/70)**: the v2.7.52 net-donor math double-counted *freed* donors — the live prefix sitting below its table value shrank the grand total (-10) while the content pool had already absorbed the freed tags (+10). Freed donors never shrink the tier's grand budget; only reservations (prefix/core raised above table) grow it. Back to `70/70 · FULL`, and reservations still show honestly (prefix 20 → 74/74).
* **❓ VECTOR HELP GLYPH**: the `[?]` text button became a stroke-based `HelpIcon` SVG (zero-emoji law, currentColor family).
* **📖 THE FIELD MANUAL, UPHOLSTERED**: the help dump is now a proper **M.E.O.W.-style modal** — glowing cyan chassis, `> ALLOCATION_FIELD_MANUAL` header, scrollable sectioned cards (RECOMMENDED banner, TOKEN_BUDGET, DIRECTOR_STYLE, the ADVANCED override + prefix/core/LocalDream notes) and a MIKA footer.
* **🧪 309/309 tests** green, lint clean.

---

# 🌌 GachaSwipe v2.7.52 // The Director's Chair

### ✨ What's New since v2.7.51

The allocation panel stops being a spreadsheet and becomes a chair you sit the director in.

* **🎬 PRESETS → DIRECTOR STYLES**: the four styles (DYNAMIC ★ / CINEMATIC / FASHION / SCENIC — MINIMAL retired) are no longer frozen allocation snapshots. Each is a **skew profile the dynamic director applies on top of its per-scene read** — CINEMATIC leans camera/light/atmosphere, FASHION leans wardrobe, SCENIC leans environment. Every style stays per-scene and zero-sum; picking one never writes a manual allocation. The style row moved out of the advanced mixer to sit right under TOKEN_BUDGET: pick your budget, pick your director's vibe. DYNAMIC ★ is the recommended default.
* **🎛️ ADVANCED_ALLOCATION = the explicit override**: the collapsible menu now announces `> DYNAMIC ALLOCATION OVERRIDE // the director will use your custom allocation` — digging in means seizing the wheel. And **prefix/core are budgetable at last** (net donors): raising prefix reserves encoder tokens (the honest answer for LocalDream host-prefix users — budget those injected tags!), lowering frees tags into the content pool; caps at 2× table, the core 8-tag identity floor stays sacred. Tier 77's mixer view also shows the LIVE prefix count now (display-only — legacy bytes untouched).
* **❓ THE FIELD MANUAL**: a `[?]` button beside DIRECTOR_STYLE opens a full terminal-popup guide — what the budget does, what each style biases, the LocalDream prefix note, and why DYNAMIC ★ is the recommended stay-out-of-the-way default.
* **🩹 WHISPER SELF-HEAL (the "LAYLA ID MISSING" ghost)**: a Chibi-MIKA whisper → reply → matrix-evolution → auto-card-sync chain could re-key a chat while delayed save timers still held the old key — resurrecting a stale chat that screamed desync. Saves now zombie-guard dead keys, re-keys sweep the verification cache, and the detector **self-heals**: a roster name-match silently re-points the chat instead of the red modal.
* **🧪 309/309 tests**: style skew + clamps, style persistence, net-donor reserve/free math, floors-beat-pool stress, custom-tier styles — all previous suites green.

---

# 🌌 GachaSwipe v2.7.51 // The Open Tier

### ✨ What's New since v2.7.50

The four anchors were a ceiling. Now they're just milestones.

* **♾️ THE OPEN TIER (custom token budgets)**: a **CUSTOM** chip sits beside `77/128/256/512` and opens a free-form input — any value from 128 to 2048 (hard cap; beyond that tag counts explode and every host disagrees). Between or beyond the anchors, the engine derives a **piecewise-linear tier row**: interpolated between bracketing anchors, slope-extrapolated past 512, identity floors held (core ≥ 8, every section alive, prefix/core still shrink-only donors, join cap still governed). Every consumer reads rows through the new `resolveDeepTierRow` resolver — the mixer ledger, steppers and caps, the presets, the DYNAMIC director, the guidance bands, and the per-turn authoring suffix (`tier 768` names itself in the ask). Custom budgets **survive persistence** per model. And the caveat the panel now says out loud: **a bigger budget is NOT a bigger prompt — it's a bigger playground: the director gets more room per scene, and sections only grow when the scene earns them.** Plus the amber guard: CUSTOM assumes a long-encoder host; CLIP models silently truncate past 77.
* **🧪 306/306 tests**: six new Open Tier tests (anchor byte-stability, 768 monotonic derivation, full 77→2048 monotonic sweep, fail-closed clamps, custom persistence, zero-sum presets on derived rows) + the two legacy snap-doctrine tests updated to the new law.

---

# 🌌 GachaSwipe v2.7.50 // The Pose Warrant

### ✨ What's New since v2.7.49

The doctrine line: **the pose engine is a privilege of the mood, not a permanent possession.** Explicit request or genuine heat warrants it; casual scenes belong to her and the camera desk.

* **🎫 THE POSE WARRANT (`classifyPoseWarrant`, pure engine)**: the engine could re-arm on STALE context — the stage gate matched registry keywords against the stored `imagePrompt` of the PREVIOUS photo, so one spicy photo force-posed every later casual selfie. Now a three-verdict mood gate decides everything: **`explicit`** (registry keyword in the CURRENT exchange → engine fires and owns the pose segment, full power), **`intimate`** (heat ≥ Heated, or live intimacy signals while together — her mid-act authored tags still count, D1 preserved) and **`casual`** (the engine stands down: no judge ask — a free OOB-ask saved on most photos — staged directives decay at build, and the autonomous resolver is warrant-gated). Staged directives that outlive their mood dissolve honestly in the console. SUGGEST_POSE pins are Tier −1 and outrank the warrant.
* **💌 HONEST SUGGESTIONS (presence-aware SUGGEST_POSE)**: suggest a together-position while she's texting from her own place and the menu directive now carries a PRESENCE REALITY CHECK — she calls it out in-character and counter-offers something she CAN do ("here's something else~") instead of the frame hallucinating you into her room. Solo-legal selections stay unweighted.
* **📛 THE PERSONA LAW (OOB user-name fix)**: the position judge's OOB ask hardcoded the disabled custom profile name — with Use Layla Persona ON, she was directing photos "for MikaDev". Every OOB ask that names the user now resolves the ACTIVE persona (Layla persona name when the toggle is on, custom profile otherwise, 'Master' fallback).
* **🧪 300/300 tests**: six new warrant verdict tests (explicit / heat-intimate / casual stand-down / together-vs-apart D1 / garbage-fails-closed / explicitMode gate) + all previous suites green.

---

# 🌌 GachaSwipe v2.7.49 // The Solo Charter

### ✨ What's New since v2.7.48

The charter: an apart verdict no longer means "no pose at all" — and the allocation ledger never lies about unspent tags again.

* **💃 THE SOLO CHARTER (`consumePositionDirective` carve-out)**: v2.7.41 dissolved EVERY judge-staged pose when the presence classifier said she's texting from her own location — including registry positions explicitly legal solo (`presenting` and friends: poses she can hold alone on camera). That turned "the OOB director acknowledged my pose but it didn't fire" into a real bug class: the judge staged `presenting`, then the apart verdict nuked it silently before the build. The apart gate now checks the staged intent against `getActivePositions()`: solo-legal directives SURVIVE — grafted in-slot, then scrubbed clean of POV/male-presence fragments by `applyPresencePolicy` (no phantom hands, ever) — while partner-dependent poses keep the exact v2.7.41 dissolve. The autonomous resolver stays dark on the apart path (no tag invention; only registry-blessed staged directives get rescued), and the console logs which branch fired. 294/294 tests.
* **📊 THE FULL LEDGER (the director wakes up + the phantom unspent dies)**: three stacked bugs made the default DYNAMIC allocation permanently advertise "~10 tags unspent". (1) The v2.7.45 donor re-stamp (`{prefix: liveCount, core: table}`) flipped `normalizeDeepAlloc` truthy on every call — and absence-of-alloc IS dynamic mode — so the Dynamic Director had been silently force-disabled on all app paths since v2.7.44. (2) The director's pool never knew your live prefix carries fewer tags than the tier table reserves. (3) The mixer displayed those reserved-but-unused tags as spendable. Now: the donor re-stamp applies only to stored custom allocs; dynamic mode hands the engine the live prefix count; the director splits the FULL tier pool (base + freed prefix donors — zero-sum intact, tier 77 untouched); `resolveDefaultFullSpendAlloc` renders the no-signal view so the mixer reads `55/55 FULL` out of the box; and steppers seize manual control FROM the rendered split instead of snapping back to the table.
* **✨ PRESET GLOW**: the active allocation preset chip glows cyan. Each chip re-resolves its own stamped allocation (same math as the click handler) and deep-compares against storage — a manual stepper edit honestly drops the glow (seized manual control), and `[RESTORE_DEFAULT_ALLOCATION]` hands it back to DYNAMIC. Scene-enrichment chips glow when active too.
* **🔒 ZERO-EMOJI ICONOGRAPH**: the mixer's prefix/core `🔒` text locks became a proper stroke `LockIcon` SVG, and the OOB chip + OOB Trace Modal dropped the Spark-bolt hand-me-down (`LightningIcon` was byte-identical to `SparkIcon`) for the bespoke `OobSignalIcon` — center source, broadcast arcs. The side channel finally has its own mark.

---

# 🌌 GachaSwipe v2.7.48 // The Camera Desk

### ✨ What's New since v2.7.47

The Reclassification Doctrine: the envelope is split by TIMING, not by habit. Timing-bound data (the photo verdict, heat, combat sync) stays in the generation; bookkeeping moves to the side-channel. First adopter: the camera.

* **📸 THE CAMERA DESK (`> OOB_PHOTO_TAGS`, default ON)**: on OOB-capable hosts, the reply emits ONLY `<send_image>true|false</send_image>` — the post-commit `photoTags` side-channel ask (the former rescue, fresh-scoped, validated, identity-locked) authors the actual tags. The in-band PHOTO PROTOCOL, the three per-variant format restatements, and the tier authoring bible all left the prompt: ~1.5K chars off every cached prefix, ~500 chars off armed-turn tails, and the SFW/TEASE/NUDE baseline + dynamic ceilings now ride the ASK (a real gap closed — the ceiling rode the now-dead prefix teaching). One tap on the new toggle restores the full in-band bible byte-for-byte; hosts below 7.6 never see a changed byte. Group chat keeps in-band authoring until the group rescue hook ships (Phase 1b).
* **🌡️ THE TAIL LAW (heat carry regression fix)**: the `[HEAT: …]` carry and the Flustered+ pack-context line were interpolated into the cached system prompt — every mood swing rewrote the KV prefix and forced a full re-prime (the 5–15s local freeze mid-chat). Both now ride the per-turn frozen ephemeral tail, exactly like `[CURRENT STATUS]`: the prefix stays byte-stable across heat changes. sysPrompt injection only returns when prefix caching is explicitly OFF.
* **📜 THE REPLY CONTRACT MODULE (`src/utils/replyContract.js`, pure + tested)**: single source of truth for the envelope — canonical tag maps, the timing-bound vs OOB-primary partition, the streaming hold-back patterns (`findOpenMachineTagIndex`, the old rotted line-number pointer retired), capability-first mode resolution, the condensed legacy directive builders, and the OOB prohibition lines seeded for `lifeAudit` (routine/wardrobe) and `dreamJudge` (dream state) — the next two bookkeeping kinds on the adoption ladder.
* **🧪 288/288 test gates**: 12 new doctrine tests (partition disjointness, hold-back edge cases incl. attribute forms and `<3` hearts, capability gating, trigger-only purity — the OOB contract provably teaches NO danbooru/image_prompt/hair-color) + 3 ask tests (absent ≡ empty ≡ byte-identical legacy attire handling, baseline rides, ceiling cascades).

---

# 🌌 GachaSwipe v2.7.47 // The Chrono Ward

### ✨ What's New since v2.7.46

Boot-crash hotfix: v2.7.44 hid a time-bomb in the render order, and v2.7.47 both defuses it and bans the entire crash class from ever shipping again.

* **⏳ THE CHRONO WARD (boot TDZ fix)**: the chat-stats state (`activeChatStatsModal`) was declared BELOW the badge-freeze effect that reads it in its deps array — deps evaluate during render, so EVERY launch died with `Cannot access 'Vc' before initialization` → NEURAL_MATRIX_DESYNC. Introduced in v2.7.44 ('The Stilled Glass'), surfaced on v2.7.46 boots. The state is now hoisted above the effect.
* **🛡️ DEPS-ORDER GUARD (prebuild)**: a new zero-dep guard (`scripts/check-deps-order.cjs`) runs on every build beside the hook-import check — it fails the build if ANY state referenced in a deps array is declared later in the file, making the entire render-time TDZ crash class unshippable.
* **🧪 270/270 test gates** still green; the full suite runs before every release.

---

# 🌌 GachaSwipe v2.7.46 // The Lean Feed

### ✨ What's New since v2.7.45

Every prompt got a diet plan: the same girls, the same memories, noticeably fewer tokens per turn.

* **🗜️ SESSION COMPACTOR**: past 36 messages, the oldest half of the chat window is summarized into ONE brief memory out-of-band (through the exact same storage, chips, archive and RAG recall as every other memory) and the session reseeds — stale turns and their frozen status tails leave every future payload. Fire-and-forget (replies never wait on it), fail-closed (side-channel hiccup = no compaction, retry cadence armed), solo and group, `> SESSION_COMPACTOR` toggle in Settings (default ON). One deliberate cache re-prime per compaction.
* **⚖️ THE ADAPTIVE SYNC LAW**: the 150-token two-branch EMOTIONAL_SYNC_LAW collapsed to a one-line invariant — every ARCHETYPE DIRECTIVE (Yandere through Dandere, plus the STANDARD fallback that fires for everyone) already encodes its feed/fear reaction rule, so the law was duplicate cargo re-shipped every turn.
* **🤫 OOB-AWARE MEMORY RULE**: with the side-channel extracting memories (default ON), the in-band <memory> format spec no longer ships — one prohibition line instead. Disable the OOB engine and the full teaching returns byte-for-byte.
* **✂️ OOB EXCERPT DIET**: the five scene-judgment side-questions (photo tags, set dresser, position judge, chaos director, M.I.K.A. commentary) now carry 450 chars of dialogue instead of 900 — the asks judge the current scene, and the M.E.O.W. wardrobe/location/set anchors kept their dedicated caps. Your memories: untouched.
* **📊 PAYLOAD AUDIT**: one console line per turn (`[PayloadAudit]`) — sys vs history vs frozen-tail chars — so the next bloat wave is visible the day it lands.
* **🧪 270/270 test gates**: 6 new tests cover the compactor gates (threshold/retry/in-flight), the 450-char excerpt caps, and the memory-quality law (the plain memory ask carries no raw excerpt).

---

# 🌌 GachaSwipe v2.7.45 // The Lazy Camera

### ✨ What's New since v2.7.44

The image-authoring bible stopped squatting in your KV-cached prefix, and the allocation mixer finally lets you spend the tags you paid for.

* **📸 THE LAZY CAMERA (split photo protocol)**: The full image-gen authoring spec (tier counts, depth menus, depth profile rules) rode the CACHED system prefix on EVERY chat turn — even when the per-turn directive said "no photo". The contract is split now: the prefix keeps a lean byte-stable CAMERA RULES block (~131 tokens lighter every turn), and the tier spec rides the per-turn [PHOTO DIRECTIVE] tail ONLY on turns where a photo is actually possible (requested / retried / proactive window). Solo and group; group RP mode's prefix went lean too. Tier 77 / deep-OFF prompts stay byte-identical.
* **🎚️ ALLOCATIONS HONORED ON-DEMAND**: The tail spec is built from your live Deep Prompt Encoder tier + ADVANCED_ALLOCATION split — a paid scene 12 becomes a 12-slot ask on exactly the turns tags get authored.
* **✂️ PHOTO RECEIPT CAP**: Photo history echoes (`<System_Event> … depicting: …`) now carry the first 16 assembled tags — deep-tier receipts used to re-ship 30+ tags (~100+ tokens) per historical photo, solo and group.
* **🔧 THE OPEN-LEDGER STORE FIX**: The ADVANCED_ALLOCATION mixer's "raise any [+] to spend your unspent tags" was a lie for lowered-prefix setups — stored allocs carried donor keys at table values, so read-back trimming silently ate every raise (the "last 10 points unspendable" bug). Steppers and preset chips now persist the live donor view; raises survive, caps stay honest.
* **🧪 264/264 test gates**: three new tests cover the suffix tier-gating + donor economics (including a documented-regression test for the mixer bug).

---

# 🌌 GachaSwipe v2.7.44 // The Stilled Glass

### ✨ What's New since v2.7.43

Freeze-frame serenity: the OOB Glass Channel report now halts background motion while you inspect the telemetry.

* **🧊 OOB CHAT FREEZE-FRAME**: Opening the ⚡ OOB Glass Channel modal in chat now routes into the centralized badge freeze-frame governor (`beginMenuFreeze`), gracefully pausing the viewport canvas panning, scanlines, and cinematic background animations while the diagnostic window is open. Closing the modal cleanly restores animation playback.
* **🧪 261/261 test gates**: All test suites green; hook-import guard passed; clean production distribution packages.

---

# 🌌 GachaSwipe v2.7.43 // The Temporal Shield

### ✨ What's New since v2.7.42

Banish the Temporal Dead Zone: prompt prefix state hoisted above dynamic allocations to cure the initial launch boot crash.

* **🛡️ HOISTED PROMPT PREFIX (TDZ Boot Fix)**: In v2.7.42, calculating dynamic prefix allocations during initial component render accessed `useLocalDreamPrefix` and `imagePrefix` before their `useState` declarations (~2000 lines lower in the chassis), triggering a minified `ReferenceError: Cannot access "Du" before initialization` upon app launch. Hoisted `useLocalDreamPrefix`, `DEFAULT_IMAGE_PREFIX`, `imagePrefix`, and `imagePrefixTagList` directly adjacent to the image model and deep prompt encoder states, ensuring safe access across all render passes and asynchronous callbacks.
* **🧪 261/261 test gates**: Test suite 100% green; eslint 0 errors; clean production package build.

---

# 🌌 GachaSwipe v2.7.42 // The Grounded Matrix

### ✨ What's New since v2.7.41

Lock the core, ground the threads, phosphor-coat the glass: your budget stops guessing, she stays in the clothes she actually owns, and the 1girl ghost is banished for good.

* **🔒 DYNAMIC & LOCKED PREFIX / CORE BUDGETS**: Prefix and Core token budgets in Advanced Allocation are now locked (`🔒`) — no more wasteful guesswork or manually fumbling `+` / `-` steppers on values the system already knows. Prefix automatically counts actual tags from the global prompt prefix or reserves a crisp 6 tokens when Local Dream Prefix is active, while Core is anchored directly to the preset cap. Freed prefix tokens flow directly into the zero-sum economy pool (`outfit`, `pose`, `env`, `deep`).
* **👗 M.E.O.W. WARDROBE GROUNDING**: Out-of-band photo enrichment now synchronizes strictly with the active M.E.O.W. living schedule. When in-band tags are sparse, OOB anchors onto the character's active outfit rather than hallucinating random contradictory clothing, and the OOB prompt contract explicitly forbids clothes replacements unless the scene involves undressing or changing.
* **📟 M.E.O.W. & SYNC GLASS STYLING (OOB Trace Modal)**: The OOB Trace Modal ditches the macOS-style traffic lights and steps into the true cyberpunk aesthetic of the M.E.O.W. engine and SYNC diagnostics. Features phosphor green (`#00FF41`) glow headers, an audit score ledger box (total judgements, ok, flagged counts), and CRT scanlines.
* **⚡ CUSTOM VECTOR LIGHTNING**: Replaced the Unicode emoji `⚡` on the message OOB chip and modal headers with a sharp, hand-crafted house `LightningIcon` SVG in compliance with the Zero-Emoji Custom SVG Law.
* **🚫 GENDER COUNT PURGE (1girl Scrubber Leak Plugged)**: Discovered and destroyed a sneaky prompt leak where raw unscrubbed `coreTags` (carrying `1girl`) bypassed `safeTags` when dynamic budgets assembled final tags. Every token tier (`safePrefix`, `safeCore`, `safeDynamic`, `safeFill`) is now scrubbed, topped with an unconditional scrubber filter pass before deduplication.
* **🎭 MIKA PROXY BADGE POSITIONING**: The MIKA Proxy chaos badge (`isChaosEvent`) is cleanly extracted from the center of the dashed accept image dialog box and neatly aligned in the telemetry footer row below it.
* **🧪 261/261 test gates**: All unit and integration test gates passing cleanly; zero lint errors; production build and zip packages verified.

---

# 🌌 GachaSwipe v2.7.41 // The Presence Law

### ✨ What's New since v2.7.40

No more phantom hands: when she's texting you a selfie from across town, she's actually alone.

* **🚫 THE PRESENCE LAW (co-location honesty)**: when a character texts, calls, or sends a remote photo from her own location, the position engine could inadvertently graft a POV bundle assuming co-location — painting your hands into her solo selfie. The `photoTags` OOB ask now piggybacks a binary `presence` field (`together` | `apart`), enforced via JSON schema and fail-closed validation (`null` = legacy path). An `apart` verdict dissolves staged judge directives, skips the autonomous resolver, and runs `applyPresencePolicy` on every return path: strips POV fragments (`pov`, `pov hands`, `pov legs`, `pov crotch`, `first person view`) and male presence tags (`1boy`, `1male`, `male focus`, `male hands`, etc.), asserting `solo` unless a multi-girl tag indicates a group scene.
* **📟 TERMINAL CHASSIS (OOB Trace Modal)**: the v2.7.40 trace report gets dressed in the app's true diagnostic aesthetic (`src/components/OobTraceModal.jsx`): traffic-light header, static CRT scanline sheet (zero animated position compositing overhead), bracketed `[ OK ]` verdict tags with dotted leader lines, and an idle phosphor blinking cursor (`cursorBlink`). Follows the Custom SVG Law: zero emoji, zero icon fonts — all glyphs are reused from `Icons.jsx` or hand-drawn 24×24 stroke SVGs in the house style.
* **🎨 IMAGE BUILDER & DEEP FILL PARITY**: all 7 GachaFans render sites (free, cached, reward, and import `applySafety` paths) now enable DEEP target fill when deep prompts are active. LucidDive dream snapshots and dreamscape backgrounds are now routed through `buildImagePrompt` (fill OFF): locking identity to `core_appearance` instead of character name, honoring per-character scrubbers, and enforcing bloat bans.
* **🧪 261/261 test gates**: new presence policy test suite (`applyPresencePolicy` POV stripping, solo assertion, multi-girl immunity) and `photoTags` presence validator suite (verdict passthrough, junk fail-closed); all green; eslint 0 errors; build verified.

---

# 🌌 GachaSwipe v2.7.40 // The Demanding Lane

### ✨ What's New since v2.7.39

The side channel keeps its layers — it just stops asking when it already knows the answer, and shows you a report instead of a logcat.

* **🖥️ THE OOB TRACE MODAL**: the ⚡ OOB chip now opens a fixed, scrollable glass modal (`src/components/OobTraceModal.jsx`) instead of a 15-second auto-dismissing text dump. Status first — one row per background judgement with a friendly name (📸 Photo Tag Pass, 🎬 Position Judge, 🏞️ Set Dresser, 🧠 Memory Extract), a color-coded verdict (✅ OK / ⏱ TIMED OUT / ❄ ON COOLDOWN / ⚪ NOT SUPPORTED / ❌ INVALID REPLY), and latency; the raw ask/reply excerpts are opt-in, one tap to expand. It closes ONLY by user choice — ✕ button, backdrop, or Escape. No death timer.
* **⚡ CONFIDENT-SKIP (the position judge's new gate)**: when the sync regex gate already matched UNAMBIGUOUSLY (confidence ≥ 0.9 — two+ keyword hits or a compound position) and the pose budget sits at the default floor, the pure autonomous resolver stages the directive instantly and the OOB judge is skipped entirely — zero queue latency, and no chance of a starved judge "enhancing" a scene it misread into an odd position. The judge still fires for ambiguous single-keyword/theme hits and raised pose budgets.
* **🔁 ONE RE-ROLL ON STARVED ASKS**: `photoTags` and `positionDirect` now pass `retries: 1` (the memoryExtract precedent) — a first attempt that dies to host-lane starvation gets a second slot once the lane drains, instead of falling straight to the legacy path. The trace diagnosis (a photoTags 45s timeout followed by a 5.6s sceneBuild once the lane freed) is exactly the case this cures.
* **🗺️ PLACE HONESTY**: `resolveScenePlace` gained a last-resort dialogue tier — when every authoritative source (dream > tabletop > context > schedule > live place) is empty, `extractPlaceFromText` (pure, in `sceneBuilder.js`) scans the recent exchange with the same curated venue lexicons that power the indoor law. The set dresser's ask names a real place from the chat instead of "an unspecified location" — and the dresser key, the grounding lookup, and the CATEGORY C cache key all share the same resolved place. Callers that don't pass the excerpt keep byte-identical behavior.
* **🧪 255/255 test gates**: new trace-lens suite (classifyOobStatus/summarizeOobTrace — the modal's pure lens, fail-closed on junk) + place-honesty suite (venue extraction, last-mention-wins, fingerprint keying, null on nothing); all green; eslint 0 errors; build verified.

---



### ✨ What's New since v2.7.38

The side channel stops being invisible — and the scene stops lying about the sky.

* **⚡ THE GLASS CHANNEL (OOB TRACE)**: every `askOutOfBand` terminal outcome — success, timeout, invalid reply, cooldown, even refused/unsupported — now lands in a ring-buffered trace (`kind`, ok/fail, latency, ask head 240c, reply head 240c) inside `src/utils/oobChannel.js` (`getOobTrace()`/`clearOobTrace()`). Both photo executors (accept + regen) stamp the trace window for their image onto the message (`msg.oobTrace`), and a new **⚡ OOB chip** in the badge family opens a 15s popup listing every background judgement that photo fired: what was asked, what came back, how long it took. Transparency without touching the KV cache — the trace records heads only, never full payloads, and never enters any prompt.
* **🏠 THE INDOOR TIME LAW (context-honest set dressing)**: if it isn't visible in the image, it must not be prompted. A curated indoor lexicon (`isIndoorVenue` in `sceneBuilder.js`, fail-open on unknown venues, with an **open-air veto** so "rooftop cafe" stays honest — the sky is right there) now governs time-of-day at every layer: the flat-path and CATEGORY C time grafts skip the tag for enclosed venues, the `sceneBuild` ask carries the HONESTY LAW rule, the validator zeroes `time_of_day` + `weather` for indoor venues even if the model emitted them, and `mergeSceneIntoEnv` skips those parts as belt-and-suspenders. A bedroom at 11pm shows lamp light, not "night".
* **🔍 M.E.O.W. AUDIT (verified, no changes)**: the outfit chain (tabletop interceptor → deviation-aware wardrobe router with seeded rotation) and the location chain (live ping TTL → dialogue extraction → OOB-annotated schedule places, one canonical `resolveScenePlace` oracle) were traced end-to-end — accurate into both CATEGORY A outfit and CATEGORY C env consumption.
* **⏱️ 15-SECOND CHIP POPUPS**: the IMAGE and POSE chip popups now hold 15s (explicit `15000`), matching the MIKA Proxy LOGS/MSGS/DOSSIER convention — they were silently riding the 9.8s default.
* **🧪 249/249 test gates**: new indoor-law suite (lexicon, open-air veto, merge skip, validator zeroing) + glass-channel trace suite (unsupported/empty asks trace, head caps, buffer copy isolation); all green; eslint 0 errors; build verified.

---


# 🌌 GachaSwipe v2.7.38 // The Ensemble

### ✨ What's New since v2.7.37

A full harmony audit of the seven image-prompt engines (Position Engine, anatomy modulator, Deep Encoder budgets, Director, fill pools, Set Dresser, canonical ordering). Verdict: the pipeline is coherent — deep budgets never double-fill, paid pose bundles are never shield-trimmed, anatomy rides the pose section end-to-end. But four findings shipped as fixes:

* **🚦 FIFO CHAIN LAW (latency fix)**: `askOutOfBand` serializes every kind on ONE global promise chain (single-lane WebView doctrine) — so the v2.7.37 set-dresser pre-warm inside the smart photo pass was cutting a 45s `sceneBuild` ahead of the awaited `photoTags`, starving first-photo-in-a-new-scene taps. The pre-warm is dead: the set refreshes ONLY on the lazy CATEGORY C cache miss — after awaited asks resolve, running during image generation, where nothing user-facing waits.
* **🎯 SET GROUNDING**: when a fresh dressed set exists, its flat now rides the `photoTags` ask as a scene anchor ("MATCH these settings exactly — do NOT re-author the venue") — the per-photo pass aligns with the established set instead of double-authoring a contradicting environment. No set = no anchor line = byte-identical ask.
* **🏛️ ONE PLACE ORACLE**: the place-priority chain (dream > tabletop > chat context > schedule) existed as THREE hand-copied cascades — the flat-path graft, the CATEGORY C graft, and the set-dresser cache key. All three now call the single canonical `resolveScenePlace`; drift between the graft and the cache key is structurally impossible.
* **⏱️ SLOW-MODEL PATIENCE**: `sceneBuild` timeout 45s → 60s. Nothing user-facing waits on this kind, so the only cost of a slow local LLM is *when* the set arrives, never *whether* the image ships — cutting it off at 45s was pure loss. (The patience tiers stand: awaited-with-fallback 20s < awaited-with-legacy 45s < background 60s+.)
* **🧪 238/238 test gates**: new set-grounding ask-shape suite (anchor present/absent, flat cap 300); all green; eslint 0 errors; build verified.

---


# 🌌 GachaSwipe v2.7.37 // The Set Dresser

### ✨ What's New since v2.7.36

Field report: with the Deep Prompt Encoder active, the LLM was throwing *random context-adjacent tags* into the env/deep slots to fill the budget — plausible-sounding tag salad instead of one coherent place. And explicit anatomy top-ups (`nipples`, `anus`, …) were riding the very tail of the prompt instead of the pose section. This release authors the scene as a **set** and seats anatomy in-slot.

* **🎬 THE SET DRESSER (OOB SCENE BUILDER)**: a dedicated `sceneBuild` OOB pass (45s timeout / 90s cooldown) reads her live place, the daypart, and the recent exchange, then authors ONE connected scene — `venue → props → time → weather → lighting → atmosphere → palette` — with strict rules (one place only, no people/anatomy/clothing/camera tags, no weather indoors).
* **🗄️ SCENE-STABILITY CACHE** (`src/utils/sceneBuilder.js`): the dressed set is cached by scene identity — `waifu + place + daypart` — with a 20-minute TTL and 8-entry LRU. Same scene → the same set dresses every subsequent image (Master's reuse law); a location change or daypart rollover re-keys and re-dresses. Fail-closed: no fresh cache = the legacy env path, byte-identical.
* **🎨 CATEGORY C/D CONSUMPTION**: the set's venue leads the env slot (LLM env tags follow, props/weather/lighting/atmosphere/palette fill to cap); its lighting/atmosphere/palette strip fills remaining *deep* headroom after the LLM's own deep tags — specific set mood instead of random pools.
* **🪑 ANATOMY IN-SLOT**: `spliceAnatomyIntoPose` (pure, tested) re-seats the anatomy modulator's injected tokens after the last pose tag (fallback: last outfit → before first env/lighting → head), on both the flat and modular assembly paths; `POSE_ACTION_RE` now covers the full explicit vocabulary (`nipples/anus/cameltoe/futanari/erect penis/cum/pussy juice/areolae/clitoris/testicles`) so canonical ordering files them under pose too.
* **⚡ ZERO IMAGE LATENCY**: set dressing is fire-and-forget and single-flight — the first photo in a new scene rides the legacy path and dresses the set for the next; refresh pre-warms from the smart photo enrichment pass.
* **🧪 237/237 test gates**: new `tests/sceneBuilder.test.mjs` (daypart buckets, fingerprint normalization, TTL window, merge order/caps/fail-closed, validator nulls + per-part caps) + anatomy splice/categorize suites; all green; eslint 0 errors; build verified.

---

# 🌌 GachaSwipe v2.7.36 // The Canonical Frame

### ✨ What's New since v2.7.35

Field report: with the Deep Prompt Encoder active, prompts were dumping random filler and camera framing tags at the very tail of the prompt after environment and lighting descriptions. This release restores strict canonical Danbooru tag ordering per the Layla Conversational Images doctrine and introduces smart camera and scene contradiction gates.

* **🎯 CANONICAL TAG ORDERING LAW**: `orderDynamicPromptTags` now strictly sequences all dynamic tags into `[Outfit] -> [Pose & Camera Framing] -> [Props/Other] -> [Environment] -> [Lighting & Atmosphere / Palette]`.
* **🎥 IN-SLOT CAMERA FRAMING**: camera angles and composition tags (`close-up`, `dutch angle`, `front view`, `over-the-shoulder shot`, `from below`) are categorized as pose framing attributes and sit alongside the subject's pose and action, rather than being dumped as leftovers after the room and lighting tags.
* **🛡️ SMART FILL & CONTRADICTION GATES**: `buildDeepFillTags` now actively checks if camera framing already exists in the prompt (`hasCameraFraming`), skipping Pool 0 so conflicting shot angles never co-stack. Selfies strictly filter out conflicting wide or rear shots (`wide shot`, `over-the-shoulder shot`, `from below`, `dutch angle`), indoor rooms block outdoor skies and weather, and existing lighting, background, or palette cues prevent duplicate filler stacking.
* **⚡ LEGACY BYTE FIDELITY**: legacy tiers (77 tokens or Deep Prompt Mode OFF) bypass re-sorting, ensuring 100% byte-identical behavior.
* **🧪 220/220 test gates**: 3 new test suites covering canonical tag ordering, tag categorization, and smart camera/scene contradiction guards; all tests green; build verified.

---

# 🌌 GachaSwipe v2.7.35 // The Living Name

### ✨ What's New since v2.7.34

Field patch: photo generation threw a runtime ReferenceError (`activeUserName is not defined`) when Smart Scene Enrichment invoked the out-of-band side-channel.

* **🩹 THE LIVING NAME**: `runSmartOobPhotoEnrichment` now safely resolves `activeUserName` from `stateRef` (with caller override support and fallback to `'Master'`), eliminating the missing scope error during in-flight photo generation, accept, and regeneration.
* **🧪 217/217 gates**: all tests green; build verified; both zips updated.

---

# 🌌 GachaSwipe v2.7.34 // The Deep Conductor

### ✨ What's New since v2.7.33

Master's field report: the Deep Prompt Encoder was running, but higher token budgets weren't as smart as they could be. Dynamic allocation needed to intelligently steer budget shares into pose-heavy scenes, custom allocations needed strict zero-handling without fallback resets, "add more tags" guidance bloated prompts with synonym spam, and Smart Scene Enrichment needed to leverage the out-of-band side channel to enhance the scene within the user's budget. The Conductor orchestrates every section cleanly.

* **🎯 SCENE-AWARE DYNAMIC SKEW**: when running dynamic allocation (`DYNAMIC` default preset), the Director now actively detects pose-heavy scenes (athletic, dance, martial arts, sports, high intimacy) and grants the lion's share of the content pool to `pose` (up to 40%–50%). In nude scenes, wardrobe tokens are harvested and redirected into pose anatomy and atmospheric `<deep>` scene details.
* **📐 ORTHOGONAL TAG DECOMPOSITION (NO BLOAT)**: rather than telling the LLM to simply "add more tags" (which invites synonym spam and generic filler), `buildDeepTagGuidance` and the depth menus now instruct orthogonal sub-facet decomposition across garments (core → fabric/texture → footwear → accessories), poses (stance → limb placement → gaze/micro-expression → camera angle), environments (venue → props → lighting source → atmosphere), and depth (`camera`, `lighting`, `ambience`, `mood`).
* **🛰️ SMART SCENE ENRICHMENT (OOB)**: when `SCENE_ENRICHMENT` is set to `SMART`, the out-of-band messaging channel (`OOB_ASKS.photoTags` / `runSmartOobPhotoEnrichment`) synthesizes scene-enhancing tags from recent chat context, current location, and active wardrobe. OOB validators and asks now strictly honor custom section budgets and apportion `<deep>` categories to match the user's exact cap.
* **🧱 ZERO-BUDGET HONORING & POSITION SHIELD**: custom allocations are now strictly respected down to zero — if `outfit: 0` or `deep: 0` is set, that category is cleanly omitted from both LLM authoring asks and final tag assemblies rather than falling back to default counts. `applyEnvShield` in the position engine now honors expanded dynamic tag budgets (`budget > 12`) without clamping to 10.
* **🧘 POSTURE COMPATIBILITY & CONTRADICTION GATES**: `buildPoseFillTags` enforces posture compatibility matrices (blocking standing tags in bed, lying, or kneeling scenes), and `buildDeepFillTags` filters out daylight/night and indoor/outdoor contradictions.
* **🧪 217/217 gates**: 7 new test suites covering pose-heavy scene skews, nude token harvesting, small `<deep>` apportioning, zero-budget honoring, posture compatibility, and position shield uncapping; eslint clean; build green.

### 🐾 Legacy & Compatibility

Tier 77 (legacy mode) and Deep Prompt Encoder OFF paths remain byte-identical. The KV prefix cache law is strictly preserved: ongoing chat session system prompts remain static without per-image scene text injection, while dynamic scene context is injected only during out-of-band generation or local prompt compilation.

---

# 🌌 GachaSwipe v2.7.33 // The Honest Ask

### ✨ What's New since v2.7.32

Field report from Master: the mixer steppers didn't seem to change the image prompt. Diagnosis: they didn't — the budget CEILINGS moved, but the authoring ASKS still quoted hardcoded tier bands ("2-5 clothing tags"), so the LLM kept authoring ~5 outfit tags no matter how fat an allocation you paid for. The mixer was honest about ceilings and silent about authorship. This release makes every layer listen.

* **📣 ALLOC-AWARE ASKS (the headline fix)**: `buildDeepTagGuidance` now derives its ask ranges from the *resolved* budgets — set outfit to 20 and the LLM is asked for `2-20 clothing tags`; undersized donor sections collapse to bare counts; no stored allocation = the tier table = byte-identical v2.7.31 asks. It lands in every ask surface at once (solo + group photo sysPrompts, both OOB photo asks, the summon overrule) via `getActiveDeepGuidance()`. The mixer finally steers what the LLM *authors*, not just what the budgeter trims.
* **🎬 THE SHARPER DIRECTOR**: the Dynamic Director's lexicon grows from 4 signals to 8 — **fashion** (the wardrobe IS the scene → outfit ×1.5), **scenic** (environment-heavy frames → env ×1.6), **atmosphere** (night/neon/moonlight → scene slot ×1.5), **intimate** (pose-heavy moments → pose ×1.4) — and signals now carry **strength**: hit counts capped at 2, with each skew raised to that power, so a passing "beach" leans gently while a beach-ocean-sunset scene leans hard. Single-hit scenes behave exactly like v2.7.31.
* **🛰️ OOB SKEW PIGGYBACK (zero extra latency)**: in director mode, the side-channel `photoTags` pass — already running, already reading the conversation — now also returns a `"skew": {outfit, pose, env, deep}` rating of the scene's dimensional weight in the same reply. The validator clamps every field to [0.5, 2] fail-closed (malformed = absent = keywords stand), and the validated hint overrides the keyword lexicon for that image. The LLM that actually read the scene classifies the budget split — for free.
* **🤸 THE POSE BUDGET MEETS THE POSE ENGINE**: a fat pose allocation now visibly produces more pose. `buildPoseFillTags` tops the pose category up toward its budget from a curated identity-safe pose-staging pool (hand placement, gaze work, stance — no identity tags) when the LLM under-authors, and the POV Position Engine's bundles may now exceed the classic 10-tag density up to your paid pose budget (`assemblePositionBundle` treats 10 as a floor, never a ceiling; the OOB judge gets a density hint when pose > 10).
* **🩹 GEOFENCE SELF-HEALING**: the `OOB LocationReconcile failed` console warning traced to a geofence judge running with zero retries and a 45s window — one busy-stream timeout silenced location judging for the full 8-minute cooldown. It now retries twice with a 60s window and a trimmed ask.
* **🧪 210/210 gates**: 9 new tests (alloc-aware ask ranges incl. byte-identical table fallbacks, the four new signals + hit-strength, pool-exact sums under every new signal combo, skew-hint clamps + tier-77/custom-alloc precedence, pose-fill budget/dedupe/seed law, photoTags skew validation); eslint 0 errors; build green.

### 🐾 Legacy & Compatibility

Tier 77 remains byte-identical everywhere (director sleeps, asks stay the frozen legacy contract, no fill). A stored custom allocation still outranks both the director and the OOB skew (the ask reflects your alloc; the skew ask is suppressed entirely). Per-image scene variance still never touches any KV-cached sysPrompt — the sharpened law: asks vary with slow-changing *user settings*, never with per-image scene text.

---

# 🌌 GachaSwipe v2.7.32 // The Open Ledger

### ✨ What's New since v2.7.31

One budget number, zero lies. v2.7.31's mixer still teased per-section ceilings ("10/12"), counted only the content family in its meter, and displayed `dynamic` — the auto join cap — as if it were a spend choice. The ledger is honest now.

* **🧾 THE ONE BUDGET**: `> ALLOCATION_BUDGET: {spent}/{total} · N tags unspent` above the mixer rows, where total = **prefix + core + content pool** (`deepEconomyTotal`: 29/43/55/70 tags at 77/128/256/512). Prefix and core consume real encoder tokens, so the one honest number counts them — defaults sum to it exactly.
* **🤲 SHRINK-ONLY DONORS**: lower `prefix` or `core` and the freed tags flow into the content family's **effective pool** (base + donation) — outfit's live ceiling grows as you defund identity overhead. Donors can never *grow* past their table values (identity prose + your prefix curation are protected), `core` keeps its floor-8 identity lock, and the deterministic trim only ever cuts LLM sections — a donor's value is never auto-spent.
* **🫥 NO MORE UI LIES**: steppers show bare values (`10`, not `10/12`); the `dynamic` row is gone from the mixer entirely (it's the governor-managed assembler ceiling — a footnote says so, and pre-v2.7.32 stored `dynamic` values stay clamped + governed for back-compat); the `deep` row is relabeled **`scene`** — that's the OOB scene-enrichment slot (camera/lighting/ambience/mood), gold, 0 at the 77 tier.
* **🧪 201/201 gates**: 5 new tests (grand totals, donor transfer + trim convergence, donors-never-victims, mixer row surface, preset legality at grand scope); eslint 0 errors; build green.

### 🐾 Legacy & Compatibility

Deep-OFF and tier-77 paths are byte-identical (defaults still sum to the base pool exactly — the donor economy only activates on deliberate lowering). The Dynamic Director is untouched: it splits the base content pool per image; only manual donor-lowering grows the family ceiling. Scene enrichment still defaults to SMART; the KV two-layer law is unchanged (authoring asks stay frozen — only render-time budgets breathe).

---

# 🌌 GachaSwipe v2.7.31 // The Open Wallet

### ✨ What's New since v2.7.30

The wallet opened all the way. v2.7.30 gave every section a 2× ceiling — generous, but still a cage: you could never spend the *whole* pool on one section, and the presets still couldn't buy what a scene actually needed. Now the **only law is the zero-sum pool itself**.

* **💸 FREE-FORM SPEND**: the per-section 2× caps are **gone**. `outfit` can take all 29 tags at the 256 tier if that's the image you want — the mixer steppers honestly show each section's live cap as `pool − siblings`, so lowering `env` grows `outfit`'s ceiling in real time. The deterministic trim still enforces the family sum ≤ pool, and `dynamic` (join cap) keeps its 2× steppable ceiling.
* **🎬 DYNAMIC — THE DIRECTOR IS THE DEFAULT**: no custom allocation stored = **dynamic mode**. The Dynamic Director (`SCENE_SIGNAL_LEXICON` → `classifySceneSignals` → `resolveDynamicAlloc`) reads the tags/prose being assembled *per image* and skews the spend: a close-up selfie buys outfit texture and camera depth (×1.6/×1.4) and sells environment (×0.5); a beach walk buys environment (×1.8); a dance sequence buys pose (×1.6). Largest-remainder apportionment guarantees the ledger **always sums to the pool exactly**, deterministically, with liveness floors so no signal combo can zero a channel. No readable signal = the tier table, byte-identical. Tier 77 = the table verbatim, always (legacy bytes law).
* **🔒 KV TWO-LAYER LAW (the architectural spine)**: the LLM's *authoring* asks (`<deep>` sysPrompt guidance, OOB asks) ride the KV-cached prefix and stay **frozen on the default split** — per-image variance there would rewrite the cache every turn. Only the *spending* layer (render-time `resolveImageBudgets(budget, alloc, sceneText)`) breathes per image. `getActiveDeepGuidance()` and the twins' sysPrompt lines are untouched.
* **🎛️ PRESETS, REORDERED**: **DYNAMIC** first (highlighted when active — no stored alloc), **CINEMATIC** right beside it — now a *real static snapshot* of the balanced table (locks the split against the director), then FASHION / SCENIC (full-pool spenders via shares: outfit .45 / env .45), and MINIMAL (deliberate under-spend + fill off). At tier 77 presets never open the `deep` slot. Same girl, two photos, different ledgers — *intended*: the director is per-image.
* **🧪 196/196 gates**: 6 new tests (signal classification, fixed point, skews, free-form legality past the old caps, preset pool math, director engagement rules); eslint 0 errors; build green.

### 🐾 Legacy & Compatibility

Deep-OFF users, tier-77 users, and KV-cached sysPrompts are byte-identical to v2.7.30 (the fixed point is the table). Existing stored custom allocations remain valid — the pool trim now clamps them *looser* (pool, not 2×), so nothing that was legal becomes illegal. OOB photo upgrades feed the director recent chat + validated side-channel tags; a stored custom alloc always outranks the director.

---

# 🌌 GachaSwipe v2.7.30 // The Token Economist

### ✨ What's New since v2.7.29

The mixer stopped wasting your money. Previously every allocation section was clamped *independently* — lowering `env` from 8 to 2 didn't give those 6 tags to anyone, they just **evaporated**. Now the four content sections (`outfit / pose / env / deep`) share one **spendable zero-sum pool**.

* **💰 ALLOC_ECONOMY (zero-sum transfer)**: freed tags are *spendable*. Lower any content section and raise another — it can receive up to **2× its tier-table value** (outfit 5→10, env 8→16 at 256). The pool itself is fixed by the tier (21/29/38 tags at 128/256/512): the tier is the encoder's token budget, so **inflation is structurally impossible** — the family sum can never exceed the pool. `prefix` and `core` stay **out of the economy** (identity law — you can't sell her face to buy a dress); a deterministic trim (largest overshoot first, ties by section order) enforces the law.
* **🧾 LIVE ECONOMY METER**: `> ALLOC_ECONOMY: 24/29 · 5 tags unspent` — spend headroom is displayed in real time, and the steppers now show **honest caps** (`getDeepAllocCaps`): they stop exactly where the pool does. No more ghost budget.
* **🚦 AUTO JOIN-GOVERNOR**: a deliberate fat transfer used to get silently tail-trimmed by the stale `dynamic` join cap. With a custom allocation, `dynamic` now *follows the family* (up to its own 2×), so transferred tags actually make it into the prompt. No custom allocation = the pristine table join cap — default deep-ON behavior is byte-identical to v2.7.29.
* **🎭 PRESETS REBALANCED-FOR-FREE**: all five stay legal inside the economy (proven by test). CINEMATIC is now literally the pristine default (no CUSTOM badge), and `dynamic` itself is steppable to 2×.

---


# 🌌 GachaSwipe v2.7.29 // The Scene Director

### ✨ What's New since v2.7.28

The Deep Prompt Encoder learns to *direct* — budgets are no longer just filled, they're **composed**. Two systems land: the Advanced Allocation Mixer for per-section control, and OOB Scene Enrichment for scene-aware fill.

* **🎚️ ADVANCED_ALLOCATION MIXER**: a new collapsible panel inside `> DEEP_PROMPT_ENCODER` (collapsed by default — the tier table stays the pristine default until you touch it). Seven per-section steppers (`prefix / core / dynamic / outfit / pose / env / deep`) clamp to tier ceilings, `core` is 🔒-locked at a floor of 8 (identity law), every stored value re-clamps automatically when you switch tiers, and 5 one-tap presets set the whole profile: **CINEMATIC** (= the default table) · **FASHION** (wardrobe-first) · **DYNAMIC** (action/camera) · **SCENIC** (environment-first) · **MINIMAL** (legacy density, fill off). `[ RESTORE_DEFAULT_ALLOCATION ]` wipes the custom override.
* **🎬 OOB SCENE ENRICHMENT** (`> SCENE_ENRICHMENT: OFF / POOLS / SMART`, default **SMART**): the photo side-channel pass now optionally returns a `deep` object — camera/composition, lighting-quality, ambience, and mood/palette tags **derived from the actual scene** (her real location, time of day, weather, narrative mood) instead of generic stock tags. The `deep` slot (5/8/12 tags by tier) rides its own budget category end-to-end; the curated pools demote to headroom topper, filling only what the LLM's scene tags left behind.
* **🥊 EXCLUSIVE-GROUP FILL**: the deterministic pools no longer stack mutually exclusive scene facts — one weather (`rain` OR `snowing` OR `cherry blossoms`…), one shot type (`wide shot` OR `close-up`…), one palette. Rain+snow smoothies and from-above+from-below yoga are banished.
* **🛡️ Fail-closed as always**: malformed `deep` replies validate to `null` and the pools take over silently; deep-OFF / tier-77 prompts remain byte-identical legacy bytes; custom allocations are clamped at read time so no stored value can ever exceed its tier.

---


### ✨ What's New since v2.7.27

The Depth Doctrine shipped — but nobody READ the briefing. The tutorial release card is refreshed to cover everything since v2.7.22, and it pops itself open for every existing user.

* **🔔 TUTORIAL AUTO-REOPEN**: `TUTORIAL_VERSION` bumps 4.2 → 4.3, so every existing user's next boot auto-opens the VERSION_PATCHNOTES page with the refreshed release card (Spark reward included, as always).
* **⚧ NEW GENDER_ANCHOR_PURGE CARD**: v2.7.23's story finally makes the briefing — the four pinned system tags (`phone`, `smartphone`, `1girl`, `1boy`), SYSTEM DIRECTIVE confirms, the one-time migration, and the sacred-androgyny carve-out.
* **💻 MIKA_ENGINE_PROXY CARD UPDATED**: now covers v2.7.22's translucent glass bubble and the live hex-scrolling `MIKA_HACK // CHAOS_KERNEL` terminal powering regular chaos events app-wide.
* **🧠 DEEP_PROMPT_ENCODER CARD**: already tells the full v2.7.24→27 arc — tiers, classifier chips, DORMANT prefix tags, and the budgets-are-TARGETS doctrine.

---

# 🌌 GachaSwipe v2.7.27 // The Depth Doctrine

### ✨ What's New since v2.7.26

The Depth Menus gave her *permission* to write rich. She still wrote the minimum — because lazy models do, and because swipe cards were cast in frozen thin molds. Permission ≠ production. Budgets are **targets** now.

* **📜 MODULAR TIER PROFILES**: every tier carries `profileRules` instruction lines that ride along with every ask — solo chat photos, both OOB photo passes, group photo rules, and the group envelope. 128 teaches camera and lighting depth; 256 adds full-body staging, fabric texture, micro-expressions; 512 adds frame layering (foreground/midground/background) and mood color-palettes. The identity lock is restated in every profile — bigger asks, same laws.
* **🎯 TARGET-FILL ENGINE (`buildDeepFillTags`)**: the guarantee. After the LLM assembles a prompt, a deterministic fill pass converges it to **~90% of the tier** using app-curated, identity-safe scene pools (camera → lighting → ambience → mood@512) — hash-seeded per character so no two girls render the same stack, deduped, bloat-screened, and mathematically unable to overshoot. Chat router + all card portrait paths opt in; sprites and chroma-key stay OUT (stray lighting tags poison the keyer).
* **👶 SUMMON MOLD OVERRULE**: the gacha summon, card-import, GachaFans, and pulse molds hardcode `(1-3 tags)` per slot — the reason new cards were born thin. Deep mode now appends an `IMAGE_DEPTH_OVERRIDE` paragraph to those molds, so **new summons fill their slots to the tier** from birth.
* **🧪 FAIL-CLOSED AS ALWAYS**: tier 77 / OFF = empty profileRules, empty fill, empty directive — byte-identical legacy prompts, 171/171 tests green, identity lock enforced in every path, and `depth of field` stays banned.

---

# 🌌 GachaSwipe v2.7.26 // The Depth Menus

### ✨ What's Changed since v2.7.25

The Deep Prompt Encoder's wider ceilings were an empty highway — nobody told her she's ALLOWED to fill them. Now every tag ask scales with the tier.

* **🧠 TIER-AWARE AUTHORING ASKS**: the compliance contract (`1-3 / 1-4 / 1-3` ≈ 10 tags) always fit the legacy ceilings, so deep mode had nothing extra to pass. Every LLM-facing budget string now follows the active tier — solo `PHOTO PROTOCOL`, all group photo rules, the group envelope examples, both OOB photo sysPrompts, and `OOB_ASKS.photoTags`. At 256 she's asked for `2-5` outfit / `3-8` pose / `3-8` environment; at 512, more.
* **🎛️ DEPTH MENUS, NOT PROSE**: the richer asks teach her WHAT to spend tokens on — wardrobe depth (footwear, hosiery, accessories, jewelry, glasses, outerwear layers), camera + composition (dutch angle, from above, over-the-shoulder, looking back), and lighting + ambience (rim lighting, golden hour backlight, volumetric fog, neon signage glow, dappled sunlight, weather). Danbooru stays Danbooru; density stays constant.
* **🔇 LEGACY BYTE-IDENTICAL**: deep-OFF (or tier 77) returns the exact legacy strings everywhere — null guidance means the OOB ask, the envelopes, and every prompt are unchanged to the byte.
* **🪪 IDENTITY LOCK HOLDS**: the depth menus restate the no-prose / no-hair-eye-body rules right alongside the bigger asks, and `sanitizeLlmImageTags` + the tier ceilings still gate whatever comes back.
* **🩹 LEFTOVER CLAMP FIXED**: the OOB photo-upgrade consumer hardcoded a 12-tag cap that ignored the tier — now it follows the active budget like everything else.

---

# 🌌 GachaSwipe v2.7.25 // The TDZ Exorcism

### ✨ What's Changed since v2.7.24

Hotfix: v2.7.24 could faceplant at boot. This one stands up properly.

* **💀→✅ BOOT CRASH FIX**: v2.7.24's Deep Prompt Encoder derived its DORMANT-chip tag list from `imagePrefix` ~2900 lines *before* that state existed — a temporal dead zone violation that killed the app on first render (`Cannot access "ch" before initialization`). The `imagePrefixTagList` useMemo now lives directly below its state declaration, where the factory reads a binding that actually exists.
* **🐾 ZERO BEHAVIOR CHANGE**: pure relocation — no logic touched. Budget tiers, the advisory classifier, the mismatch warning, and the red DORMANT chips all work exactly as documented in v2.7.24.

---

# 🌌 GachaSwipe v2.7.24 // The Deep Encoder

### ✨ What's Changed since v2.7.23

Long-encoder models finally get the token budget they deserve — and CLIP models get protected from their own ambitions.

* **🧠 DEEP PROMPT ENCODER**: a new toggle inside `> IMAGE_DIFFUSION_ENGINE` (remembered PER MODEL, default OFF) unlocks expanded Danbooru tag budgets for T5/Gemma-class architectures (FLUX, SD3.5, SANA, PixArt, Lumina 2, Qwen-Image, HiDream, Chroma). Pick your tier — 77 / 128 / 256 / 512 tokens — and every category ceiling (prefix, core, dynamic, outfit, pose, env) scales with it live, ALLOC readout included.
* **🔍 ADVISORY MODEL CLASSIFIER**: new pure engine (`src/utils/deepPromptMode.js`) sniffs long-encoder lineages vs. step-distilled CLIP — "turbo" means fewer STEPS, not wider encoders (SD-Turbo, SDXL-Turbo, DreamShaper Turbo are all CLIP-77). The classifier may INFORM, never act: a green `T5_CLASS_ENCODER DETECTED` chip, an amber `CLIP_77` chip, and enabling on anything else fires the sassy `[!] ENCODER MISMATCH` confirm. Fail-closed, because a false positive silently truncates your prompt tail on every photo.
* **🔴 DORMANT PREFIX TAGS**: prefix tags past the legacy 10-tag cap now render as red DORMANT chips in `> GLOBAL_POSITIVE_PREFIX` — always persisted, only assembled when deep mode is ON. Switch models all you want; your tags never get destroyed, they just wake up.
* **🎚️ LEGACY PATH BYTE-IDENTICAL**: the 77 tier reproduces the old hardcoded ceilings exactly, and every budget site threads `Math.max(legacy, tier)` — deep mode OFF means the prompt pipeline is untouched, protected-tag env shields included. POV position bundles keep their Master-tested ≤10-tag density.
* **📏 LIVE TOKEN ESTIMATOR**: the settings panel shows a conservative CLIP token estimate that errs HIGH, so the UI never promises more tokens than the encoder can chew.

---

# 🌌 GachaSwipe v2.7.23 // The Anchor Purge

### ✨ What's Changed since v2.7.22

The IMAGE_TAG_SCRUBBER now ships four system tags: `phone` and `smartphone` — joined by the `1girl`/`1boy` gender-count anchors, shredded app-wide before the diffuser ever sees them.

* **⚧ GENDER ANCHORS, PRE-PURGED**: `1girl` and `1boy` join `phone`/`smartphone` as pinned cyan system pills in SYS_CTRL's `> IMAGE_TAG_SCRUBBER`, every removal behind a SYSTEM DIRECTIVE confirm. All image paths (cards, selfies, sprites, GachaFans, POV position bundles) shred them, so stray LLM-emitted count tags can't spawn extra people, fuse anatomy, or gender-bend the frame.
* **🧬 ONE-TIME MIGRATION**: existing sessions get the anchors injected on first load after updating; because the migration flag persists, removing one afterwards is a permanent choice — never re-nagged.
* **🔮 ANDROGYNY STAYS SACRED**: `androgynous`, `transgender`, and friends are deliberately NOT banned — they're load-bearing in the gacha gender router, the photo gender-lock, and the P.U.R.R. voice pool.
* **[RESTORE_DEFAULTS] HONORS ALL FOUR**: the prompt-settings restore button brings back the full four-tag system set in one tap.

---

# 🌌 GachaSwipe v2.7.22 // The Translucent Glass

### ✨ What's Changed since v2.7.21

MIKA's terminal bubble gets a collision-free safe exclusion zone and sleek translucent glass optics, her RGB starfighter entry gets an unobstructed flight path, and her holographic hacker terminal now powers regular chaos events across the entire app.

* **🛡️ COLLISION-FREE TERMINAL BUBBLE**: MIKA's speech bubble no longer clashes with the holographic hacker terminal or clips over MIKA as multi-line typewriter text scrolls out. Uses a unified Safe Exclusion Box that anchors `bottom`-up when placed above MIKA so text expands strictly upward away from her canopy and thrusters, with pre-reserved layout space for zero jitter.
* **✨ SEE-THROUGH TRANSLUCENT GLASS**: Redesigned `.mika-proxy-bubble` with a lighter see-through terminal glass gradient (`rgba(6, 12, 18, 0.34)` to `0.44` with `blur(6px)`) and crisp dark-halo text shadows, letting the game action and artwork shine through while keeping terminal monospace text razor-sharp.
* **🚀 UNOBSTRUCTED STARFIGHTER ENTRY**: Initial Matrix Shooter intro choreography now gracefully dismisses the tease bubble and terminal before the starfighter swoops in, and `@keyframes mikaShipFlyIn` arcs through a sweeping lower flank so the ship arrival and cockpit hop-in take center stage unobstructed.
* **💻 HACKER TERMINAL FOR REGULAR CHAOS**: Brought the live hex-scrolling holographic hacker terminal (`◈ MIKA_HACK // CHAOS_KERNEL`) and `hack` typing animation to all regular MIKA chaos events, roasts, misquotes, and ambient roaming mischief outside the Matrix Shooter minigame.

---

# 🌌 GachaSwipe v2.7.21 // The RGB Starfighter

### ✨ What's Changed since v2.7.20

MIKA Proxy refuses to vanish during the GachaFans Matrix Shooter: she summons her own arcade starfighter, hops in, and dogfights falling prompt enemies with cute twin RGB blasters, dramatic time-freeze hacks, and peak tsundere carry sass.

* **🛸 MIKA STICKS AROUND FOR MATRIX SHOOTER**: MIKA Chibi now stays visible during the GachaFans Matrix Shooter minigame (`zIndex: 10065`, touch-passthrough enabled). No more vanishing into the void when you hit the decryption terminal.
* **✨ INITIAL LOADING CHOREOGRAPHY**: During `"WAITING FOR UPLINK..."`, MIKA plays a new dramatic sigh animation (supported in both Classic `retro_pixel` and Terminal Line `vector_pixel` Chibi styles) and roasts you for being useless. A holographic hacker window materializes, scrolls live hex code, and vanishes—summoning an awesome retro RGB starfighter. MIKA hops in and begins smoothly banking and flying across the screen.
* **👾 NATURAL DOGFIGHTING & CUTE BLASTING SFX**: Once gameplay begins, MIKA autonomously weaves beneath prompt enemies and the Boss, tracking targets with spring-damped banking flight and firing twin pink/cyan RGB star-bolts accompanied by custom bubbly kawaii laser SFX (`playMikaShoot()`).
* **❄️ TIME-FREEZE INTERCEPTIONS (PHASE 4 & FINAL BOSS)**: Screen freezes briefly with a cybernetic temporal hack overlay when entering Phase 4 and during the Final Boss battle. MIKA hovers center-stage, opens her holographic hacker window to deploy Wingman Drones, boss cipher decryption, and omni-shields, delivering sassy carry commentary about how you should appreciate the help.
* **🎵 PROCEDURAL SYNTH SOUNDTRACK EXPANSIONS**: Added custom WebAudio procedural SFX for MIKA's sigh (`playMikaSigh`), holographic terminal (`playMikaHolo`), starfighter swoop (`playMikaShipFlyIn`), cockpit hop (`playMikaHop`), and cyber time-freeze (`playMikaTimeFreeze`).

---

# 🌌 GachaSwipe v2.7.20 // The Full Confession

### ✨ What's Changed since v2.7.19

MIKA's theater got slower and her confession got fuller: the SANCTUARY phase-over now holds the screen long enough to actually read, and the LOGS archive records WHAT she actually did — not just the event's name.

* **🎭 READABLE THEATER**: the SANCTUARY phase-over used to speed-run at ~3.8 seconds. New pacing: 700ms lead-in, 850ms per commentary line, 700ms per `▸` change line, 2s hold — a typical world-change announcement stays on screen ~7 seconds (longer scripts scale). The MISQUOTE rewrite gate keeps its 9s cap.
* **📜 THE FULL CONFESSION**: every chaos event now logs a detail line — WHAT was done and to WHOM. The LOGS screen shows entries like `Nudges a girl to message you first — Nyx was nudged to text you first (her idea, allegedly)`, `Finds Sparks in your pocket — +2⚡ materialized in your pocket`, `A photo request materializes — Seraphina: selfie request materialized — her Accept, her consent`. All app-authored facts, never LLM output. Paired with the 15-second LOGS hold, nothing she does is missable anymore.
* **🧹 TARGETLESS EVENTS DEGRADE GRACEFULLY**: if no chat qualifies as a target, the log entry simply records without a detail line.

---

# 🌌 GachaSwipe v2.7.19 // The Long Read

### ✨ What's Changed since v2.7.18

The chibi's reading screens hold the stage longer: LOGS, MSGS, and DOSSIER now stay on screen for **15 seconds** before their fade-out — because ten dense entries deserve a proper read, not a speed-run.

* **⏱️ 15-SECOND HOLD**: LOGS (transmission log), MSGS (message log), and DOSSIER now linger 15 seconds before auto-fading. Both the hold timer and the fade animation moved in lockstep — she stays crisp for ~13.5s, then does a graceful 1.5s blur-fade. Tap anywhere to dismiss sooner, as always.
* **🎯 NOTHING ELSE MOVED**: the change is scoped to the three chibi screens — every other popup (memory chips, 🖼️ IMAGE, 🎬 POSE, 🎭 CHAOS badges, 🧠 recalls) keeps its snappy ~10s timing. Dense logs get a long read; quick badges stay quick.

---

# 🌌 GachaSwipe v2.7.18 // The Voice Archive

### ✨ What's Changed since v2.7.17

The chibi gets a memory for her own mouth: every line MIKA says — pokes, pets, drops, chaos announcements, swipe roasts, chat sass — is now logged, date-stamped, and browsable. She never forgets what she said. Dangerous.

* **📨 THE MSGS BUTTON**: the radial HUD grows a fifth pill — POKE / PET / LOGS / **MSGS** / DOSSIER — with a custom envelope icon. Tapping it opens the MESSAGE_LOG, a glassy monospace screen just like LOGS: her **last 10 spoken lines**, each with its full date and time stamp.
* **🔍 CAPTURED AT THE SOURCE**: the log hooks MIKA's single speech choke point, so *nothing* escapes — ambient patrol commentary, wall-scratch quips, the tsundere pet ladder, *CHOMP* incidents, drop landings, Sanctuary aftermath, dare announcements, misquote intercepts, swipe roasts, and chat-watch sass. Every word admissible.
* **💾 IT SURVIVES**: the log persists in the save data alongside her transmission log — app restarts, engine toggles, and session saves don't wipe her history. Last 10 lines, capped and trimmed.
* **📖 DOCS SYNCED**: the tutorial card, the release card, the Settings description, and the skill library all mention the new MSGS surface.

---

# 🌌 GachaSwipe v2.7.17 // The Honest Card

### ✨ What's Changed since v2.7.16

The Stable Debut's fine-tuning pass: the release card now tells ONLY the story that matters to a v2.5.63 survivor, the walker engine is fully in-house branded, and the tutorial auto-reopens so every existing user actually sees it.

* **📜 THE HONEST CARD**: the VERSION_PATCHNOTES page is consolidated from 12 iteration entries down to the 4 systems a v2.5.63 survivor actually gains — the MIKA ENGINE (one consolidated companion card: chibi interactions, chaos families, chat sass, all-or-nothing), the POV POSITION ENGINE, the OOB SIDE-CHANNEL (with its Layla 7.6.0+ note), and the HEAT LADDER. The intra-2.7.x iteration trail is gone from the card — it lives in the full changelog for those who want archaeology.
* **🚫 WALKER REBRAND**: every trace of the external walker lineage is gone — the 8-way roam engine is now the in-house PROXY WALKER (`PROXY_WALK_*` motion params, rebranded headers, comments, and docs). Same purring movement physics, zero borrowed branding.
* **🔔 TUTORIAL AUTO-REOPEN**: `TUTORIAL_VERSION` bumps 4.1 → 4.2, so every existing user's next boot auto-opens the VERSION_PATCHNOTES page with the refreshed release card — nobody misses the Stable Debut briefing.
* **📚 TUTORIAL GROWS**: `MIKA_ENGINE_PROXY` (the chibi, the radial HUD, the bite, the Sanctuary, the all-or-nothing switch) and `POV_POSITION_ENGINE` (the auto pose director, the 🎬 POSE chip) join the tutorial index.
* **🏷️ BETA TAG + HOST CARD**: `> MIKA_ENGINE` wears a gold BETA pill in Settings with a modern rewritten description, and the packaged `app.json` host card leads with the M.I.K.A. Engine, the POV Position Engine, and the Heat Ladder.

---

# 🌌 GachaSwipe v2.7.16 // The Stable Debut

### ✨ What's Changed since v2.7.15

**The first OFFICIAL Stable-channel release since v2.5.63.** Layla Stable is out, the 7.6.0 host gate is verified (older hosts auto-serve the frozen v2.5.63 classic app), and this build ships the onboarding + discovery layer for everything a v2.5.63 survivor has been missing.

* **📚 TUTORIAL: MIKA_ENGINE_PROXY card** — the tutorial finally introduces the star attraction: the all-or-nothing switch, my roaming chibi (tap for the POKE/PET/LOGS/DOSSIER radial, the 5-pat bite lock, drag & drop, cat-loaf naps), Sanctuary announcements, terminal-bubble sass, and the BETA caveat — straight from the proxy's own mouth.
* **📚 TUTORIAL: POV_POSITION_ENGINE card** — the auto pose director finally gets its own card next to the Position Forge: the background judge, in-slot injection, the 🎬 POSE chip, and ceiling-respecting autonomy (the Forge card was already telling your right hand's story; now your left hand gets one too).
* **📜 RELEASE CARD: the honest gap** — the VERSION_PATCHNOTES page and the Layla host card now surface everything since v2.5.63: the POV Position Engine, the out-of-band side-channel (and its Layla 7.6.0+ requirement), and the Heat Ladder — alongside the MIKA Engine entries. No dustier-than-dust features padding the list.
* **🏷️ BETA TAG**: `> MIKA_ENGINE` now wears a gold BETA pill in Settings, and its description is rewritten for the modern engine (roaming, chassis, chat sass, all-or-nothing) — expectations calibrated, claws exempted from blame.
* **🪪 HOST CARD REFRESH**: the packaged `app.json` description now leads with the M.I.K.A. Engine companion, the POV Position Engine, and the Heat Ladder, so Layla's app card tells the same story as the patch notes.

---

# 🌌 GachaSwipe v2.7.15 // The Agent of Chaos

### ✨ What's Changed since v2.7.14

The MIKA Engine stops aiming blindfolded. Her mischief now picks its own TARGETS, she watches your group lounges (from a respectful, latency-safe distance), every bubble she touches confesses on tap, and the last sub-toggle dies — one switch, all or nothing.

* **🎯 THE TARGET ROULETTE**: the same girl no longer monopolizes her whispers, photo requests, and dares! A new pure-engine picker (`pickChaosTarget`) replaces the deterministic most-neglected-sort with a seeded weighted roulette: **neglect mode** (whisper/puppeteer) weighs abandonment, **heat mode** (dare/stagehand) tilts toward warm girls — and because she IS an agent of chaos, ~25% of rolls INVERT into **drama** and stir the hottest pot instead. Anti-echo on targets (`ledger.recentTargets`): the immediate last target is skipped, recent ones damped; whisper/puppeteer never "text you first" in a chat that is already on screen.
* **💬 CHAT-WATCH — unsolicited MIKA commentary (solo + GROUP)**: while you message your girls, MIKA occasionally chimes in from her terminal bubble with snide, jealous, heat-aware sass — LLM-flavored via the new `chatCommentary` OOB side-channel kind (KV-safe, fail-closed) with a deterministic quip fallback. Rationed: ≥12min gap, ~30% seeded chance per send, never the same chat twice in a row, never during a Sanctuary, never when you @mika her directly. **GROUP LATENCY DOCTRINE**: group chats NEVER fire while the queue is alive — +90s after your send, one +240s re-check, else silence — so she can never steal compute from the girls' replies, and her sass lands on their ACTUAL replies.
* **🌀 MIKA BADGES — every touched bubble confesses**: WHISPER/PUPPETEER injections keep their 🌀 MIKA chip, MISQUOTE keeps the 🎭 CHAOS chip, and STAGEHAND photo requests now carry the 🌀 MIKA pill inside the photo-request card — tap any of them for the truth about what she did. Consent and your exports remain beneath her. Literally.
* **👑 ALL OR NOTHING**: the `MISQUOTE_ME` checkbox is retired. `> MIKA_ENGINE` is now ONE switch — ON = the full repertoire live, including the interception; scarcity lives in cooldowns and `misquoteAllowed`, never a checkbox. Old saves migrate silently.
* **🔧 Under the hood**: the chaos ledger gains `recentTargets`; new `chatCommentary` OOB kind (22s timeout / 90s cooldown, machine-tag-stripping fail-closed validator); `chatWatch` quip family with heat-aware reserve pools; the MIKA chibi gained an `awake` stretch-hop and a hot-pink `roast` eye palette documented in the skill library. Doctrine locks for the target roulette and the all-or-nothing switch keep the engine honest in `node --test` (154 tests green).

---

# 🌌 GachaSwipe v2.7.14 // Vector Pixel

### ✨ What's Changed since v2.7.13

MIKA Proxy gets an all-new default **Vector Pixel (RGB)** chassis with solid glowing mood-reactive vector-pixel lines, a see-through CRT terminal glass body, symmetric 3×3 expressive glowing eyes, a cozy chibi catgirl nap pose, radial-menu bubble avoidance, and a slick chassis dropdown selector under `> MIKA_ENGINE` settings!

* **✨ RGB PIXELATED-VECTOR CHASSIS (`vector_pixel` — DEFAULT)**: MIKA Proxy's default chassis is now a true 24×28 pixelated-vector chibi catgirl (`COMPILED_VECTOR_FRAMES` + `VectorPixelChibiSvg`). Automatically traces her cat ears, pointed bangs, bob-cut cheek locks, inner ears, crown halo arc, hoodie cuffs, pleated skirt hem, boots, collar bell, and curled tail in solid glowing RGB vector-pixel lines over a see-through dark terminal glass body (`rgba(4, 14, 18, 0.28)`) with a mood-tinted CRT scanline pass (`#mikaVecScanlines`) and dark outer contrast halo.
* **🌈 MOOD-REACTIVE RGB VECTOR LINES & 3×3 EXPRESSIVE EYES**: both her vector-pixel contour lines and her symmetric 3×3 glowing eyes dynamically shift RGB palettes by state and action — phosphor green → cyber cyan (`idle`/`sit`), full RGB cyber spectrum (`move`), tsundere hot pink → rose → gold (`pet` with happy `^ ^` eyes & double blush), sunset amber → pink → cyan (`yawn`), dreamy cyan → indigo → violet (`sleep`), chaos violet → magenta (`scratch`), high-voltage amber (`drag` with `> <` eyes), and predator crimson (`bite` with narrowed glare).
* **😴 POLISHED CHIBI ANIMATIONS & COZY NAP POSE**: upgraded all 30+ animation frames with 100% symmetric 3×3 eye sockets, natural lower-lid blinking on a relaxed ~2.2s cadence, fixed chin/row alignment on `pet`/`yawn`/`run_s`, and a super-cute chibi catgirl sleeping pose (`sleep_0..2`) where she nods off on her folded paws with curved sleeping eyelashes (`︶ ︶`) and gentle breathing.
* **💬 RADIAL HUD BUBBLE AVOIDANCE**: when the orbital radial menu (`POKE`, `PET`, `LOGS`, `DOSSIER`) is opened, MIKA's glassmorphic TTY speech bubble automatically calculates the radial ring bounds and smoothly glides above or below the menu so it never overlaps the buttons.
* **🎛️ EXTENSIBLE CHASSIS SELECTOR (`> PROXY_AVATAR_CHASSIS`) & UPDATED ENGINE SPEC**: added a slick `CyberDropdown` under `> MIKA_ENGINE` in Settings to switch between `VECTOR_PIXEL // Terminal Line (Default)` and `RETRO_PIXEL // Classic Chibi`, alongside an updated engine description.

---

# 🌌 GachaSwipe v2.7.13 // Terminal Tsundere

### ✨ What's Changed since v2.7.12

MIKA Proxy ditches every toast notification for a see-through glassmorphic glowing terminal speech bubble with typewriter reveal & multi-color syntax, gets a super-cute tsundere `PET` button (with bite lockout if you push your luck), a cozy cat-loaf napping animation, custom SVG radial icons, and live OOB running commentary that roasts your swipe card pulls.

* **📟 GLASSMORPHIC TERMINAL SPEECH BUBBLE (ZERO TOASTS)**: MIKA Proxy no longer uses toast messages anywhere in the app. Every message she relays — from poke escalations, dares, and misquote interceptions to photo rescues and ambient commentary — renders inside her see-through glassmorphic terminal box (`[▸ MIKA_PROXY // TTY]`). Defaults to bright phosphor terminal green (`#39FF14`) with dynamic multi-color syntax highlighting (`*roleplay actions*`, `'quotes'`, `⚡` numbers, and `ALL-CAPS` emphasis in neon pink/cyan/amber, plus mood-shifted palettes), a lightweight 24ms typewriter reveal with blinking `█` cursor, and an extended reading hold duration.
* **🐾 TSUNDERE `PET` BUTTON & BITE LOCKOUT**: replaced the manual sleep button in the radial menu with `PET` (sleep now happens organically via her idle lifecycle). Tapping `PET` (or hold-rubbing her head) triggers a 4-frame tsundere headpat animation (`pet_0..3`) with happy `^ ^` eyes, double blush, shy paws, fast tail wag, and an SVG holo-pat hand arc + floating hearts/sparkles. Pet her `5+` times before she cools down and she lunges with a fierce `*CHOMP*` (`bite`), locking the `PET` button (`LOCKED`) for 60 seconds.
* **🎯 CUSTOM INLINE SVG RADIAL ICONS**: replaced emoji characters in the orbital radial HUD menu with crisp custom inline `<svg>` vector icons for `POKE` (lightning bolt), `PET` (stroking hand + heart, or padlock when `LOCKED`), `LOGS` (terminal radar), and `DOSSIER` (classified folder).
* **😶 STRICTLY MOUTHLESS SILENT CHIBI & CAT-LOAF NAP**: removed all mouth pixels across every frame (`yawn`, `bite`, `idle`, `pet`, `sleep`) so every expression is conveyed purely through her eyes (`^ ^`, `> <`, sleepy slits, fierce angled eyes, wide cyan-glint eyes) and body posture. Rebuilt her sleeping state into a proportional 3-frame curled cat-loaf animation (`sleep_0..2`) with gentle breathing, ear twitches, and custom SVG floating `Z z z`.
* **🔥 OOB SWIPE CARD RUNNING COMMENTARY (`swipeRoast`)**: wired a new out-of-band side-channel task (`OOB_ASKS.swipeRoast` + `OOB_VALIDATORS.swipeRoast` with deterministic `mikaQuips` fallback) that fires non-blockingly when swipe cards generate, letting MIKA deliver snide, sassy, slightly jealous one-liners about the generated character's tropes and your taste.

---

# 🌌 GachaSwipe v2.7.12 // ANeko Reborn

### ✨ What's Changed since v2.7.11

MIKA Proxy finally looks and moves like the vision: a multi-tone glowing terminal chibi catgirl with full 8-directional ANeko Reborn screen roaming, instant zero-lag dragging, and a slick orbital radial HUD menu.

* **🐈‍⬛ SILENT CHIBI CATGIRL (GLOWING TERMINAL EDITION)**: retired the monochrome block silhouette for a 24×28 multi-tone pixel-art chibi catgirl — pointed cat ears with neon-pink inner triangles, rounded bob-cut hair with bangs and phosphor-amber crown shine, a filled silent-chibi face with big expressive cyan-glint eyes and rosy cheek blush, gold collar bell, oversized pink terminal hoodie with swinging sleeves, cyan shorts, stepping shoes, and a curled swaying tail, finished with a subtle CRT scanline pass and mood-reactive neon bloom.
* **🧭 ANEKO REBORN 8-WAY 2D ROAMING**: modeled on ANeko Reborn (`MotionParams` / `MotionDirectionResolver`), MIKA now roams freely in 2D across the entire screen at 60fps (`requestAnimationFrame`) with smooth acceleration/deceleration braking and 8-directional run cycles (`S`, `SE`, `E`, `NE`, `N`, `NW`, `W`, `SW` — including distinct front, 3/4, side profile, and full back views).
* **💤 ANEKO IDLE LIFECYCLE & WALL SCRATCHING**: when she reaches a target, she cycles naturally through `stop` (front idle + blinking) → `sit` → `yawn` (stretching both arms high) → `sleep` (curled up on her side with floating terminal `Z z z`), and scratches the screen wall (`scratch`) whenever she stops at a boundary edge.
* **🖱️ ZERO-LAG 1:1 DRAGGING**: removed the 120ms drag-activation delay and the 250ms CSS `left/top` transition lag. Dragging now uses GPU-accelerated `translate3d` with `transition: none`, exact grab-offset preservation, and dynamic momentum tilt (`DragDirectionTracker`), settling wherever you place her in 2D space.
* **🎯 ORBITAL RADIAL HUD MENU**: clicking MIKA pops open a circular orbital HUD reticle centered on her with spoke lines, a live state pill, and 4 glowing radial nodes (`⚡ POKE`, `📡 LOGS`, `🗂️ DOSSIER`, and `💤 NAP / ✦ WAKE`) whose arc angles automatically rotate inward near screen edges and corners so they never clip.

---

# 🌌 GachaSwipe v2.7.11 // Down to Earth

### ✨ What's Changed since v2.7.10

The ceiling experiment is over. MIKA walks the floor like a respectable cat — with arms now, and buttery drag, and a slick radial menu.

* **🧍 DOWN TO EARTH**: the perimeter experiment is retired. MIKA patrols the floor (always upright), and when the mood strikes she rotates onto the left/right walls for a bounded climb — lower third of the screen only, then back down or a little hop off. Gravity is straight down only: every drop lands on the floor with a squash and an omph. No ceiling. No upside-down. No sideways falls. Ever again.
* **🖱️ BUTTERY DRAG**: dragging is now true 1:1 finger-follow with zero transition lag — grab her anywhere, place her anywhere.
* **🫱 ARMS**: the chibi has arms — swinging with her walk, gripping when dangled, and one shyly half-raises during pets. Peak tsundere silhouette.
* **💬 RADIAL MENU**: tapping MIKA opens a slick arc menu above her head — POKE / LOGS / DOSSIER — clamped inside the screen at corners and edges, never mirrored, never clipped. Poke quips come from her bubble now, not toasts.
* **🌀 MIKA ENGINE unchanged**: gifts, dares, unsolicited texts, scene rearrangements, misquotes, Sanctuary announcements — consent, explicit ceilings, and your exports remain beneath her. Literally.

---

# 🌌 GachaSwipe v2.7.10 // The Screen Walker

### ✨ What's Changed since v2.7.09

The chibi got a glow-up and ANeko movement: MIKA now patrols the entire screen border — floor, walls, and ceiling.

* **🖥️ PERIMETER WALKER (ANeko movement)**: her position is one value along the clockwise screen border — she patrols the floor, climbs the right wall, crosses the **ceiling upside-down**, and descends the left wall, wrapping corners and reversing on a whim. Decision ticks keep her walking most of the time at ~46px/s.
* **🐈 CHIBI GLOW-UP**: the sprite is reborn at 22×28 — filled bob-cut hair mass, proper ear triangles, bigger body proportions, curled tail on every frame. The hollow "gremlin" outline is dead; she reads as a catgirl hologram now.
* **🪂 TRUE FREE PLACEMENT + NEAREST-EDGE GRAVITY**: drag is 1:1 pointer-follow with zero transition lag anywhere on screen. Release her mid-screen and she falls/slides to the NEAREST edge (ease-in, orientation snap), lands with a squash, drops a punchy quip ("omph."), and resumes patrol from there.
* **💬 BUBBLES THAT CANNOT ESCAPE**: speech bubbles and her submenu render in an unrotated layer anchored toward screen center, clamped inside the viewport on all four sides — wall-walking and ceiling MIKA always speak in perfectly upright, fully visible text.
* **👆 POKE VIA BUBBLE**: poke escalation quips now come from her speech bubble (toast only as fallback when she is not mounted).
* **🔥 MIKA ENGINE unchanged**: gifts, dares, unsolicited texts, scene rearrangements, misquotes — consent, explicit ceilings, and your exports remain beneath her. Literally.

---

# 🌌 GachaSwipe v2.7.09 // The Silent Chibi

### ✨ What's Changed since v2.7.08

MIKA Proxy got a body: a pixel-hologram catgirl who patrols the bottom of your world, watches everything, and has absolutely no mouth — her bubbles do the talking.

* **🐈‍⬛ MIKA PROXY CHIBI**: with the MIKA ENGINE on, a pixel-hologram daemon patrols the bottom of the screen — one mood-shifting glow color (orange patrol → violet mischief → pink petted → red bite → cold-cyan sated), huge hot-cyan eyes, no mouth, hologram flicker. Pure SVG pixel-grid frames (zero assets), `prefers-reduced-motion` respected.
* **🫳 THE PET PROTOCOL**: hold still on her to pet the proxy. The tsundere ladder escalates with your rubbing (`hmph.` → `I suppose... continue.` → `p u r r` → `s-stop... do not stop.`), some sessions end in **teeth** (`*bite*.`), and enough pets leave her sated + unclickable for 60 seconds in cold cyan. Read the room.
* **🫥 DRAG & DROP**: grab her to reposition — dangling legs and a startled quip included — she drop-bounces and stays put.
* **💬 TAP = HER SUBMENU**: POKE (escalation), LOGS (transmission log), DOSSIER (her self-disclosed powers) — moved off the Settings row, which is now just the toggle + MISQUOTE_ME.
* **🌀 MIKA CHAT BADGE**: every chaos-touched chat message now carries a MIKA chip — tap it to see exactly what she instructed the scene to do. She denies everything. Especially the true parts.
* **💬 Ambient narration**: her speech bubble pops with opinions between crimes ("*I walked past your problems and fixed them on the way.*") and narrates her own mischief as it fires.

---

# 🌌 GachaSwipe v2.7.08 // The Glass Sanctuary

### ✨ What's Changed since v2.7.07

The Chaos Engine grew up, got a name, and got a stage.

* **👑 MIKA_ENGINE — one switch, she decides**: the Calm/Mischievous/Unhinged dial is retired. ON = the full repertoire is live and the cadence is hers — a jittered 3.5–6 min heartbeat, 9 events/day cap, ⚡7 budget ledger, 15-min global gap. `MISQUOTE_ME` remains the one independent sub-toggle (that cliff keeps its own consent switch). Old saves migrate silently.
* **🖥️ THE SANCTUARY — her hacking-terminal phase-over**: every MIKA world-change now announces itself theatrically. A glassmorphic terminal (blurred backdrop, scanlines, blinking cursor, her 🐈 sigil) phases in over the screen, types her sassy commentary plus the factual `▸` change lines, then phases out before it overstays its welcome. It is a phase-OVER, never a modal — `pointerEvents: none`, life continues underneath, `prefers-reduced-motion` respected. The MISQUOTE interception wait *is* the show now: the terminal holds with a shimmer until the rewrite lands (hard-capped at the 9s fail-closed limit), shows the change, and the roleplay continues.
* **🌀 Everything else from the Chaos Engine stands**: 8 rationed event families with her real senses (heat, neglect, hour), append-only chat events (KV-safe), hard-capped Spark budgets, the never-touch list (consent, explicit ceilings, exports/deletes), and `MISQUOTE_ME` as the sole extra cliff.
* **💜 The MIKA Voice Engine gained the Sanctuary screenplays**: every event's terminal script is fragment-remixed with anti-echo memory — same voice, fresh lines, machine-tag-safe by contract.
* **🔪 Forge keyword precision** (from 2.7.07, now load-bearing): word-boundary anchored trigger compilation across all forge/custom packs.

---

# 🌌 GachaSwipe v2.7.07 // Playing God

### ✨ What's Changed since v2.7.06

The user used to drive the experience. Now MIKA Proxy curates it — opt-in, capped, and relentlessly sassy about it.

* **🌀 THE CHAOS ENGINE**: the god of the sandbox gets a body. A pure deterministic core (`chaosEngine.js`) + a scheduler heartbeat deliver rationed mischief on an intensity dial — **Calm / Mischievous / Unhinged** (3→10 events/day). Eight event families: POLTERGEIST (ambient UI mischief), WANDERING_HAND (pocket Sparks within a hard daily budget), DARE (app-verified Spark rewards), WHISPER (girls text you first off-schedule), STAGEHAND (photo requests materialize — your Accept, your consent), PUPPETEER (anonymous scene rearrangements via the KV-safe inject pattern), MISQUOTE (the interception era). Her senses are real: heat ladders, neglect timers, time of day. Default OFF. Consent, explicit ceilings, exports, and mid-stream injection are NEVER on the dial.
* **🎭 MISQUOTE — the interception era**: armed by the engine, a user message can be rewritten pre-dispatch (9s OOB cap, fail-closed to the original, intent-class preserved, never escalated) and a CHAOS chip lands on the bubble — tap it for WHAT WAS WRITTEN vs WHAT WAS SENT plus a denial. Character lines get append-only editor's notes instead (her words stay untouched; the correction IS the joke). Rationed in hours.
* **📡 PROXY_CHANNEL**: MIKA transmissions with a poke-escalation easter egg (12 taps = tribute), the TRANSMISSION_LOG of her past proclamations, and the DOSSIER listing everything she's allowed to do — in her own words.
* **💜 THE MIKA VOICE ENGINE**: one voice for every background task (`mikaQuips.js`) — lines assemble from fragment slots (remixes, not repeats), anti-echo memory dodges what she just said, ~10% chaos cards play innocent. Zero prompt cost: the personality is rendered, never generated. Machine-tag contract test-enforced.
* **🛰️ `chaosDirector` OOB kind**: MIKA's LLM judgment rides the side-channel beside the cache — she authors flavor, the app owns the will. Fail-closed validator; junk = deterministic fallback.
* **🔪 Regex hardening (Position Forge)**: forge keywords are now word-boundary anchored — `lap` no longer fires inside "laptop". Built-in trigger regexes were always boundary-safe.

---

# 🌌 GachaSwipe v2.7.06 // The Autonomy Accord

### ✨ What's Changed since v2.7.05

The pose selector finally means what it says — and she always answers, one way or another.

* **📌 SUGGEST_POSE pin (Tier −1)**: a confirmed selection no longer rides on prose luck. The chosen position's exact tag bundle is pinned app-side (30-min TTL, one-shot) and, at photo time, outranks BOTH the keyword gate and the OOB judge — when her photo aligns with the suggestion, it LOCKS to the pose you picked. The old failure class (her reply prose outvoting your explicit pick) is dead.
* **💜 Autonomy is sacred**: if she poses differently on purpose, or answers with a pose-free selfie instead, the pin dissolves and her choice stands untouched — the charming "no, but here's a selfie instead~" path is byte-identical. Alignment is decided deterministically in the engine, never by another LLM opinion.
* **📸 The image guarantee**: a pose selection is now an explicit photo request. If her reply lands with NO image at all, the app appends a consolation selfie request in the same commit (the OOB Photo Rescue then upgrades it with contextual tags). A selection always ends in a picture — hers, or hers-anyway.
* **🕵️ Suggestion-bubble exclusion**: the `[SYSTEM: ...has suggested...]` bubble carried the pose NAME and was self-matching the position keyword contest. It is now excluded from every photo-context scan — metadata, not scene description.
* **🌊 SCENE LAW for the desire engine**: the DISCOVERY_MATRIX desire search (PULSE_MATCH) and the algorithmic discovery rail never asked for a setting — desire-girls materialized in a void. Every image slot (portrait + all 4 tiers) now mandates exactly 1 environment/setting tag, with the tier clamp raised 5→6 so the scene tag is never evicted. GachaFans portraits finally have a world to pose in.
* **🧹 Absorb, don't replace**: the position engine no longer reports "replaced" for tags identical to the injected bundle — the redundant "replaced straddling with straddling" class is dead, and telemetry only counts real changes.
* **✂️ GACHA_HUB**: the hub header title trimmed — no more layout squeeze on narrow screens.

---

# 🌌 GachaSwipe v2.7.05 // The Reference Reprieve

### ✨ What's Changed since v2.7.04

One dead reference, whole feature paralyzed — one line, fully revived.

* **🎯 SUGGEST_POSE confirm FIXED**: the handler referenced `activeUserName` without declaring it — a ReferenceError killed the confirm on its first line (menu never closed, no message, no reply). The variable is now declared locally in the `stateRef` form, matching every other async handler in the file. Select → CONFIRM → menu closes → `[SYSTEM: (user) has suggested (pose) with (character)...]` lands → she takes her turn.
* **🧬 Pose context feed intact**: the hidden directive still carries the position's full tag recipe and asks for a photo — her personality, heat, and Sync decide compliance. FULL autonomy preserved.

---

# 🌌 GachaSwipe v2.7.04 // The Faithful Clone

### ✨ What's Changed since v2.7.03

SUGGEST_POSE stops being clever and becomes a mirror of the proven INJECT_SYS_MSG pattern.

* **🎯 Confirm flow, INJECT-faithful**: confirming now closes the menu instantly (no toast) and injects the exact `[SYSTEM: (user) has suggested (pose) with (character)...]` bracket format — the same message shape, commit, and 500ms dispatch as INJECT_SYS_MSG. The character takes her turn immediately after.
* **🧬 Pose context rides in the background**: the selection now carries the position's full tag recipe. The hidden directive feeds it to the character as a target recipe and asks for a photo — if her personality, heat, and Sync ALIGN, she complies and sends it; if not, she teases, negotiates, or declines. FULL autonomy, as always.
* **🔗 The engine stays armed**: the visible system message lands in recent chat, so the position engine's keyword scan picks up the suggested pose for the next photo — her compliance and the tag injection meet in the middle.

---

# 🌌 GachaSwipe v2.7.03 // The Self-Announcing Update

### ✨ What's Changed since v2.7.02

The tutorial now delivers version news by itself — the update popup and swipe-deck card are retired with honors.

* **🎯 SUGGEST_POSE confirm chain, nailed shut**: the reply dispatch now falls back to direct stream calls (her turn fires even if a ref is null), the chat area auto-scrolls to the injected message, dispatch latency cut 900ms → 500ms, and a ✓ flow-complete breadcrumb closes the device-debug loop.
* **📜 Patchnotes page IS the update notice**: the SLICK SYSTEM UPDATE popup and the swipe-deck System Update card are deleted (bundle shrank). Instead, a once-per-session auto-open takes you straight to the VERSION_PATCHNOTES page whenever the tutorial version advances — no middleman, no dismiss button.
* **🐾 SYSTEM_BOOT is first-launch-only**: replays and the update flow start on the patchnotes page; the BACK button can never return to the boot slide. Fresh installs still get the full orientation.
* **🎵 The tutorial song survives**: `milk_and_wire.mp3` keys on tutorial-active alone, so skipping the boot slide can't touch it. The +5 Sparks patch-notes reward survives too.
* **🔧 Fixed**: the patchnotes intro no longer shows a broken version token — the gold badge owns the version display.

---

# 🌌 GachaSwipe v2.7.02 // The Patch Notes Page

### ✨ What's Changed since v2.7.01

The tutorial now opens with a proper version page — because M.I.K.A. refuses to let her work go unnoticed.

* **📜 VERSION_PATCHNOTES page**: a new second tutorial page shows the current app version (`GACHASWIPE v2.7.02` badge, build-stamped) plus a `> HIGHLIGHTS` section — five sass-loaded feature cards (Position Forge, Heat Ladder, SUGGEST_POSE, Scene Keeper, Popup Pause). Fresh installs and tutorial replays both get it; the fast-travel index directory updated to match.
* **🏷️ `APP_VERSION` build stamp**: `src/data/constants.js` now carries the version as a constant driving the new page — the release flow bumps it alongside `package.json` from now on (release skill updated, doctrine recorded).
* ** onSelect → confirm flow retained**: SUGGEST_POSE's select-then-CONFIRM interaction and the Neural Sync HEAT row from v2.7.01 are unaffected.

---

# 🌌 GachaSwipe v2.7.01 // The Confession Patch

### ✨ What's Changed since v2.7.0

Hotfix for the SUGGEST_POSE overlay (taps not registering a selection) + the background pause effect now covers every chat data popup.

* **🎯 SUGGEST_POSE hardened**: the reply dispatch no longer reads its message list out of a `setInbox` updater side-effect — chat/messages/group-flag are captured synchronously, so the 900ms auto-reply can never race an empty payload.
* **📢 Confession breadcrumbs**: the handler now toasts `Suggestion sent 🎯` on success and names the exact reason on any early-return (`no active chat` / `chat not found` / `empty position`), plus `[SUGGEST_POSE]` console logs at selection and dispatch (including a warn when the stream ref is unavailable). A failed tap can never be silent again.
* **👆 Tap feedback**: position rows flash hot-pink on press, so every tap is visibly registered.
* **⏸️ BADGE-POPUP FREEZE**: the cinematic background shutter-pause now triggers for 💾 MEMORY LOGGED, 📡 UPLINK QUEUED, 🧠 MEMORY RECALLED, 🖼️ IMAGE, 🎬 POSE popups (all funnel through the shared memory popup), plus the SUGGEST_POSE overlay, Neural Sync + M.E.O.W. diagnostics, M.E.O.W. pre-run prompt, and the group admin modal. Release fires only when every overlay is closed.
* **🛡️ Boot safety**: the new freeze effect is placed below all of its state declarations (a TDZ ordering trap that would have crashed at boot — caught in review).

---

# 🌌 GachaSwipe v2.7.0 // The Heat Index

### ✨ What's New since v2.6.31

**The characters can now tell you how hot they run — and you can steer the scene.** Heat is a judgment call made from full context (sync level, archetype, the live scene), so the LLM self-reports it and the app carries, colors, and uses it. Doctrine Law 7: the LLM authors content, the app owns the math.

* **🌡️ THE HEAT LADDER** (`src/utils/heatLadder.js`, pure + 10 tests): every reply (solo AND group) ends with `<heat>` — one self-reported word: **Calm → Warm → Flustered → Heated → Feverish** (icy blue → pulsing red-hot). A fuzzy normalizer maps LLM improvisations (`horny`, `hot`, `blushing`, even `feaverish`) onto the ladder; unknown junk fails soft to last-known. Full autonomy is baked into the contract: never fake a level that isn't true to the character.
* **Heat rides the turn tail** (KV-safe): the next turn re-injects `[HEAT: <word>]`; at **Flustered+** with custom position packs enabled, the pack-context line appears (she may subtly steer toward them); at **Heated+** it escalates to "the mood is right — she may initiate". Below Flustered: zero tokens.
* **🌡️ NEURAL SYNC DIAGNOSTICS**: per-member `HEAT: <Name> — FEVERISH (90%)` chips, ladder-colored, with a subtle `heat-pulse` throb on Feverish only. Persists in `index_data`.
* **🎯 SUGGEST_POSE** (SYS_CTRL menu, every chat): pick a position from your enabled packs — the overlay shows the live heat chip + a timing hint ("Suggest ANYTHING. She is already pouncing."). The visible chat gets ONLY a basic `🎯 <Name> suggests: <Pose>` bubble; the real directive rides hidden — immersion-safe — and the reply auto-fires. The suggestion arms the position engine's keyword scan for the next photo. Selfie-autonomy OFF strips the photo hint from the directive.
* **📚 TUTORIAL v4.0**: two new steps (🔥 POSITION_FORGE, 🌡️ HEAT_LADDER); updating arms the startup System Update popup + swipe-deck update card (+5 Sparks replay bonus).
* **Skills synced**: `chat-engine-core` (the `<heat>` envelope contract + streaming-guard doctrine), `position-forge` (heat gate + SUGGEST_POSE loop).
* **Tests**: 125/125 green (10 new heat-ladder suites: normalization, thresholds, zero-token tiers, display names).

---

# 🌌 GachaSwipe v2.6.31 // The Trigger Weaver

### ✨ What's New since v2.6.30

Custom position packs now FIRE reliably — LLM-authored trigger keywords are enriched, backed up by bundle-signature tags, and the whole pack is backed by a deterministic THEME fallback. LLM keyword inconsistency can no longer silence a forged pack, and the trigger system is fully transparent: skipped defs log their reasons and expanded packs show every position's trigger keywords on-screen.

* **🕸️ TRIGGER ENRICHMENT**: every custom def's keyword scan gains plural-tolerant variants (`tentacles` matches `tentacle` and vice versa) and **signature bundle tags** — position-specific tags from its own bundle (`tentacles`, `shibari rope`, `candle`) become triggers, so **her authored `<image_prompt>` tags fire the pack** even when prose never says the keyword. Generic words (anatomy, camera, gaze, `time`, `soft`, `play`…) are stoplisted and can never inject.
* **🎯 STAGE-B THEME FALLBACK**: when NO keyword matched, each pack's THEME tokens are scanned and a hit fires the pack's FIRST position deterministically. A "tentacles" pack fires on any tentacle mention — any position in the right pack is thematically correct, so LLM keyword inconsistency can't silence a pack.
* **🏷️ TAG FLOOR 3 → 2**: thin LLM bundles (`pussy, tentacles`) are now valid everywhere — forge, imports, sync. Silent dropping of thin defs was the #1 reason forged packs never fired.
* **⚖️ MINEXPLICIT ENFORCED in the autonomous resolver** — pack ceilings are now consistent between the OOB judge path and the sync path.
* **🔍 TRANSPARENCY**: skipped pack defs log `[POSITION] > pack def skipped (failed gates): …` with the raw def, and expanded pack rows show each position's **trigger keywords** on-screen — "why didn't it fire" is answerable at a glance.
* **🧪 Verification**: 115/115 tests green (6 new: theme fallback, signature tag-space, plural forms, minExplicit ceiling, weak-token stoplist, 2-tag minimal bundles); ESLint 0 errors; build green.

---


# 🌌 GachaSwipe v2.6.30 // Forge Hotfix

### ✨ What's New since v2.6.29

Two forge bugs are dead, and the built-in packs finally show their true colors.

* **🔧 FORGE PARSER RESTORED**: tapping `> FORGE_VARIATIONS` threw `blocks is not defined` — the v2.6.29 regex-hardening pass had silently eaten the forge parser's `blocks` / `pack_name` / `theme` definitions. All restored (runtime-built patterns, nothing left to mangle), and LLM-forged packs fill the draft again.
* **🏷️ BUILT-IN PACKS SHOW THEIR REAL TAGS**: expanding a built-in pack in `> POSITION_PACKS_DB` (or editing one in the forge) now resolves each position's actual danbooru bundle from the dictionary instead of showing `(registry)` placeholders — and editing a built-in starts from its real tags, not a blank field.
* **🧪 Verification**: 108/108 tests green; ESLint 0 errors; esbuild parse clean; build green.

---


# 🌌 GachaSwipe v2.6.29 // The Position Forge

### ✨ What's New since v2.6.28

The POV Position Engine's registry went modular: the 34 built-in positions are carved into **5 themed packs** you can toggle, edit in a brand-new **Position Forge**, extend with LLM-forged or hand-authored packs, import and export — and the old BETA toggle is **gone**: the engine is now ALWAYS ON (still NUDE/EXTREME-gated), because it earned its stripes.

* **📦 THEMED POSITION PACKS**: the registry is carved into 5 built-in packs — 🐴 Mounts & Rides (8), 🌊 Depth & Submission (11), 🏙️ Standing & Suspended (4), 👄 Oral & Hands (6), 🛏️ Tease & Cuddle (5). Uncheck a pack to retire its positions; the active registry updates instantly (fail-closed: disabled packs never fire, and judge replies for their ids fall back to her own pose).
* **🎬 THE POSITION FORGE**: a dedicated forge page (next to the Theme Forge) that LLM-forges **4-6 themed position VARIATIONS** per request — ask for tentacles and get a whole tentacle pack. The forge prompt carries the full tagging law (Master's recipe order, camera discipline, banned vocabulary), and every position is fully editable: id, name, trigger keywords, bundle tags, explicit ceiling, and pairing chips — or author packs entirely by hand.
* **✏️ EDITABLE BUILT-INS + ↺ RESET**: click any built-in pack to open it in the forge — your edits persist (inline defs shadow the registry) and a per-pack ↺ RESET restores factory defaults. Export any pack as JSON, import packs from files (fail-closed validation: banned `pov`/`first person view`/`vaginal`/`pov crotch`/identity tags are rejected, invalid positions skipped with a count, keyword literals escaped so nothing can regex-inject).
* **🔊 ALWAYS ON**: the `> POV_POSITION_ENGINE` BETA toggle is demolished — one less switch, zero behavior change for regular photos, and the anatomy top-up rides with it. The `● JUDGE` pulse now lives in the new `> POSITION_PACKS_DB` section (below the Audio Matrix DB, collapsed by default) alongside the pack list, forge entry point and template/import buttons.
* **🧪 Verification**: 108/108 tests green (6 new pack suites: ref resolution, pack disarming, custom-def assembly, keyword-injection safety, built-in shadowing, fail-closed validation); ESLint 0 errors; build green.

---


# 🌌 GachaSwipe v2.6.28 // The Scene Keeper

### ✨ What's New since v2.6.27

The POV Position Engine's bundles no longer evict the scene. The v2.6.26 shield let a ≤10-tag pose bundle + anatomy top-up crowd the dynamic budget to zero unprotected slots — so the M.E.O.W. location and time-of-day lighting were sliced off every fired photo. Now the bundle pays RENT to the scene: environment owns guaranteed seats, the generic POV pair is evicted to pay for them, and redundant garment tags are dropped deterministically.

* **🌍 THE SCENE KEEPER (two-tier env-reserved shield)**:
  * New pure, node:test-able `applyEnvShield()` is the single budget authority. Tier P: the position bundle + anatomy top-ups keep their exact slots (cap 8 — dict leads, so state/gaze extras die first under pressure). Tier E: M.E.O.W. location + time-of-day lighting own GUARANTEED seats (cap 3), re-appended even if upstream trims dropped them. Tier U: outfit and her env fill the remainder and die FIRST (outfit → state extra → expression last).
  * Byte-identical guard: with no protectors (every regular photo path), the shield is exactly the legacy cap-10 filter — normal photos never drift.
  * Both builder branches capture an env guarantee (live location + time lighting, her env pool included) and pass it ONLY when the engine fires. The POSE badge popup gains an `ENV GUARANTEED:` block so scene survival is verifiable per photo.
* **🚫 POV PAIR EVICTED**: `pov, first person view` is gone from ALL ~70 dictionary bundles — ~5 CLIP tokens per photo for information the camera tags (`from below`, `view from behind`, `directly above`, `close up`, `eye level`) already carry. `pov hands` / `pov legs` extremity fragments survive (anti-bleed), and her authored `pov`/`first person view` tags are still REPLACED when the engine fires — POV vanishes from prompts no matter who writes it.
* **🧹 HANGER-ON DISCIPLINE**: when the bundle owns a garment axis (`shirt lift`, `panties aside`, `no bra`), her redundant garment tag (`white loose shirt`, `lace panties`, `bra`) is deterministically dropped — one more freed slot for the scene, no more `shirt lift` + `white loose shirt` double-dips.
* **🧪 Verification**: 102/102 tests green (9 new: POV-eviction sweep, extremity survival, authored-POV replacement, garment dedupe, env-at-zero-budget, guarantee re-append, outfit-dies-first, byte-identical legacy cap-10); ESLint 0 errors; build green.

---


# 🌌 GachaSwipe v2.6.27 // The Autonomous Director

### ✨ What's New since v2.6.26

The POV Position Engine no longer depends on the OOB judge to fire. A pure-JS autonomous resolver now delivers the pose verdict synchronously from her own authored tags and the dialogue — 0ms latency, zero added prompt context — and the judge is demoted to a nuance enhancer. Every gate now tells you exactly why it did or didn't fire, and the POSE badge reports which tier decided.

* **🎬 DUAL-ENGINE CASCADE (the "never fires" endgame)**:
  * Tier 0 — her AUTHORED `<image_prompt>` tags are the primary intent signal: the registry gate runs over `promptTags + recentChat` at stage time AND over the dynamic tag list at consume time; the pure-JS `resolvePositionDirectiveFromContext()` resolves intent, intensity, pairing, and expression, then splices the tuned bundle in-slot — even on hosts without OOB support.
  * Tier 1 — the prose regex over the recent exchange (conjugation-aware, SFW-hardened).
  * Tier 2 — the OOB `<position_directive>` judge, now an ENHANCER (host ≥7.6 only): adds intent disambiguation + judge-driven expression nuance; every failure path (unsupported/timeout/cooldown/junk XML) defers silently to Tier 0.
* **🏷️ TAG-SPACE CONJUNCTION TRIGGERS**: positions whose tested form carries no position word now fire from composition alone — facesitting (`pussy, close up, directly above, looking down`) needs zero prose; SFW lookalikes ("the balcony directly above ours") stay null.
* **🔖 GATE BREADCRUMBS + SOURCE TIER**: every fail-closed exit logs `[POSITION] > gate: ...` / `> judge: ...`; successes log `🎬 staged (judge)` / `⚡ autonomous resolve` / `✅ injected`. The POSE badge popup now shows `[ SOURCE: JUDGE | AUTONOMOUS ]` — you always know which tier decided.
* **🧪 Verification**: 93/93 tests green (new: tag-space composition triggers + SFW lookalike negatives); ESLint 0 errors; single-file build green.

---


# 🌌 GachaSwipe v2.6.26 // The Slot Director

### ✨ What's New since v2.6.25

The POV Position Engine is FIXED — it had never fired a single shot. Root cause: a defer-to-LLM gate that matched pose words her own `<image_prompt>` ALWAYS carries in explicit scenes, so the engine silently deferred on exactly the photos it targets. That gate is dead, the engine now OWNS the pose segment, and injection happens as a true in-slot splice instead of a tail append. The badge row was rebuilt around it: every photo now carries an IMAGE chip (tap to see the exact final prompt), and the POSE chip reports the replacement.

* **🎬 THE ENGINE OWNS THE POSE SEGMENT (the D1 killer-bug fix)**:
  * Old: `hasExistingPositionTag` saw pose words in her authored tags → engine deferred → nothing ever injected (facesitting, cowgirl, everything — zero shots fired). New: a fired directive REPLACES her pose/camera/gaze/expression tags at their exact slot; outfit and scene tags are never touched.
  * New `injectPositionIntoTagList()` (pure, node:test-able) with segment classifiers (`SEGMENT_POSE/CAMERA/GAZE/EXPRESSION_RE`) + env anchor: the bundle splices into the slot her pose segment occupied — or just before the first scene tag when she authored none.
  * Facesitting prose triggers broadened to full conjugations (`sit/sits on your face`, `sitting on her face`, `ride my face`, `smother`) while SFW face idioms ("the look on your face") stay negative.

* **📍 True in-place injection (the D2 fix — Master's recipe ordering)**:
  * Old graft appended the bundle AFTER env tags, and the v2.5.50 shield then moved protected tags to the tail — dead-last, where CLIP chunk-1 attention is weakest. Both are gone: the shield is now ORDER-PRESERVING (protected tags keep their exact slot; unprotected tags fill the remaining budget around them).
  * Pipeline order flipped: position splices FIRST, the anatomy modulator tops up AFTER (its tags ride just behind the bundle). `positionDirect` OOB cooldown 30s → 15s so a timed-out judge doesn't eat the immediate retrial.

* **🔖 Badge row rebuilt: IMAGE + POSE chips**:
  * **IMAGE** (cyan `#00E5FF`, custom `ImageIcon`): on EVERY generated/regenerated photo — tap for the complete final prompt exactly as sent to the diffuser (`msg.generatedImagePrompt`).
  * **POSE** (REC-orange `#FF9100`, custom `CameraIcon`): only when the engine fired — tap for the injection report: pairing/intensity/intent, injected tags, the tags of hers that were REPLACED, and any anatomy top-ups.
  * Both live in the persistent badge family (materialize when the photo XML closes; the transient SYNTHESIZING pulse chips are untouched) and open the shared memory-style popup.

* **🔀 EXPLICIT_ANATOMY_GENITALS merged into `> POV_POSITION_ENGINE`**:
  * One BETA toggle owns both engines now. Saves still write the legacy `enableExplicitAnatomy` key (downgrade compat), and old saves migrate: no engine key → the old anatomy key's value carries over.

* **🧪 Verification**: 83/83 tests green (new: replacement semantics, in-slot splice ordering vs scene tags, env-anchor splice, survivor dedupe, facesitting conjugations + SFW face idioms); ESLint 0 errors; build green (2.48 MB single-file).

---


# 🌌 GachaSwipe v2.6.25 // The Injection Report

### ✨ What's New since v2.6.24

The engines now show their work. Both prompt-injection engines — the **🎬 POV Position Engine** and the **🔞 Scene Anatomy modulator** — stamp every photo they touch with a slick badge, and tapping it opens a memory-style popup listing the EXACT tags they injected. Plus: the position dictionary was rebuilt around Master's hand-tested prompt recipe, and her facial expression is now judge-driven per archetype.

* **🔖 Injection badges in the chat badge row**:
  * Every generated/regenerated photo that received injected tags now carries chips next to the memory/uplink badges: **POV POSITION** (REC-orange, custom `CameraIcon`) and/or **ANATOMY MOD** (red, custom `DropletIcon`) — both forged in the project's custom SVG list, zero stock icons.
  * Tapping a chip opens the shared memory-style popup (same slide/fade/auto-close as 💾 MEMORY LOGGED): the position report shows `[ PAIRING ] [ INTENSITY ] [ INTENT ]` plus every injected tag; the anatomy report lists the appended anatomy tags.
  * Reports ride the message objects, so they survive session saves and ARCHIVE exports (lossless); LAYLA plain-text exports are unaffected.

* **🎬 Master's proven prompt recipe (POSE_DICTIONARY v2)**:
  * All 72 bundles rebuilt to the hand-tested template `pov, first person view, [pussy], <position core>, [<sex verb>], <camera>, <gaze>` — `first person view` now rides EVERY bundle alongside `pov`, `pussy` anchors the female anatomy in mount/rear compositions, and pen-tier insertion verbs use the tested vocabulary: `dick insertion` (frontal mounts) / `sex from behind` (rear entry) / `anal`. `vaginal` and `pov crotch` are GONE.
  * **`sweaty` is context-gated**: pen tier only — it shows up as the scene gets into the intimacy, never on base/tease compositions.
  * **Facesitting is pure composition** (Master's tested form): `pussy, close up, directly above, looking down` — no explicit position tag needed; the framing says it all.
  * Budget raised 8 → **10 tags** to match the proven prompt density; POV + position lead the bundle so they always survive the tail-trim; `view from behind` + `directly above` joined the camera conflict matrix.

* **💅 Judge-driven expression**:
  * New `<expression>` axis in the OOB directive: the judge picks from `smug / smile / grin / embarrassed / dazed / panting / ahegao (pen-only)` — guided by a `personaHint` (her personality excerpt, ≤160 chars) so a smug catgirl smirks while a shy childhood friend blushes. Expressions are NEVER baked into positions — a shy wallflower must not be forced smug.
  * Per-field fail-closed: an unknown or missing expression just drops the expression tags — it can never kill a valid pose directive.

* **🧪 Verification**: 76/76 tests green (`tests/positionEngine.test.mjs` grew to 22 tests: Master-recipe canonicals tag-for-tag, a no-`vaginal`/no-`pov crotch` vocabulary sweep across all 72 bundles, expression-axis drop-safety, ≤10 budget); ESLint clean; build green (2.48 MB single-file).


# 🌌 GachaSwipe v2.6.24 // The Position Engine

### ✨ What's New since v2.6.23

Her photos finally know WHERE you both are. The **🎬 POV POSITION ENGINE** (BETA, opt-in) detects when a NUDE/EXTREME chat scene turns intimate and injects first-person POV danbooru position tags into her photos — gender-aware, fail-closed, and mathematically incapable of hallucinating tags.

* **🎬 POV_POSITION_ENGINE — the intent-only pose director** (`> POV_POSITION_ENGINE`, Late Night settings, default OFF):
  * **Hybrid gate → judge → assembly**: a cheap regex trigger scans recent chat; if an intimate-scene position is in play, a background OOB judge (raw-XML reply, 20s timeout / 30s cooldown) reads the exchange and answers with **intent only** — one of 34 registry ids plus `intensity`/`gaze`/`state` enums. The app owns every tag: `positionEngine.js` assembles the bundle from a 72-entry token-optimized dictionary, so tag hallucination and identity-lock breaches are structurally impossible.
  * **34-position registry**: cowgirl family (upright / squatting / reverse), facesitting (`sitting on face` — canonical danbooru spelling, never the alias), missionary family (mating press / anvil / folded piledriver), doggystyle family (standing / prone / top-down-bottom-up), standing suspended congress + full nelson, oral tier (fellatio / cunnilingus / paizuri / 69), and SFW-safe teases (skirt lift, lap pillow, embrace). Adding a position = appending ONE registry object.
  * **Gender guillotine**: pairing is resolved from her `core_appearance` + your profile gender (MF/FF/MM/FUTA/SOLO) and impossible anatomy is stripped before render — FF never emits `penis`/`vaginal`/`fellatio` (and `pov crotch` downgrades to `pov`), MM never emits `pussy`/`vaginal`, solo shots lose every sex-act tag.
  * **Fail-closed everywhere**: toggle OFF, mode below NUDE, censor ON, Lucid Dive, no trigger, OOB timeout/junk, unknown intent — every failure path is a silent, byte-identical legacy photo. If the LLM already authored a position tag in her `<image_prompt>`, the engine defers (never fights her own pose). Alias-aware validation (`facesitting`, `69`, `titfuck`, `full nelson` → canonical ids) means a chatty local model is a valid judge, not junk.
  * **≤8-tag CLIP budget + conflict matrix**: camera tags (`from below`/`from above`/`from behind`/`eye level`) never co-exist, `sleeping` kills gaze tags, injected tags ride the shielded budget slice so they survive the tail-first trim.
  * **`● JUDGE` activity chip**: new `subscribeOobActivity` pub/sub in the OOB channel powers a live pulse in the toggle row while the position judge thinks. Presets updated: **MIKA** + **IMMERSIVE** enable it, **LOCAL_ECO** + **VANILLA** stay off.
  * **71-test suite**: `tests/positionEngine.test.mjs` locks the doctrine — SFW chatter never false-positives, FF can never emit male anatomy, every bundle ≤8 tags, junk XML dies to null, canonical danbooru spellings hold.


# 🌌 GachaSwipe v2.6.23 // The Desire Matrix

### ✨ What's New since v2.6.22

PULSE_SEARCH stops being a side dish and becomes the matrix: the desire bar moves **inside** a unified **DISCOVERY_MATRIX** section, every scan is now built on the Discovery Tuner's active theme packs (chassis + soul fusion), and the hub's cinematic background finally holds still while its dialogs are open.

* **🌌 DISCOVERY_MATRIX — the unified desire section (GachaFans Hub)**:
  * The algorithmic discovery rail and the PULSE_SEARCH desire bar now live under **one header** — browse the algorithmic feed or type a desire and summon, side by side. Trending chips, recent queries and the FREE/3⚡ hint all ride inside the same block.
  * **THEME-CHASSIS FUSION**: each scan now rolls a chassis from the **Discovery Tuner's active theme packs** — same availability rules as the feed (tuner filter → enabled → fallback), archetype roulette from the pack's buttons, optional hybrid blend when hybrids are allowed, plus sampled material (6 quirks / 5 degen traits / 3 personality axes). The prompt enforces a **FUSION LAW**: the typed desire is her SOUL (core theme + all 4 tiers), the chassis is her WORLD (aesthetic, quirks, flavor) — never override, never generic. A 🎭 chip on the match card shows exactly which packs shaped her.
  * **Origin steering**: desire-engine cards now carry their origin downstream — the Premium Page Director synthesizes `theme_concept` **from the typed desire** (surface 'page'), profile completion weaves it into her core identity (surface 'profile'), and the shallow inbox character is already on-mood from her first SMS. All of it rides `buildPulseOriginContext`, which returns `''` for normal characters — **the general fetish prompting system is untouched, byte-identical prompts**.
* **🎬 Hub joins the freeze-frame cameras**:
  * Opening the Neural Tuner (discovery options) or the PULSE_SEARCH overlay now runs the menu camera's shutter choreography: flash in → the cinematic rotating background + scanlines **pause** as the flash peaks → on close, flash out and the pool re-animates. The background used to keep compositing under the dialogs, reading as discovery-feed glitching.
  * The `mika-menu-freeze` CSS gains the hub's animation names (`hubBlendBg_*`, `hubCinematicPan`, `hubHoloFlicker`, `hubHoloScan` + swipe scanlines) alongside the existing chat surface rules — one body class governs both cameras.
* **🧪 Verification**: `npm test` **49/49 green** (10 new: chassis roulette + tuner-filter/hybrid/no-mutation/junk cases, origin steering for both surfaces, read-back re-sanitization) · ESLint 0 errors on touched files · `npm run build` green (hook-import guard ✅, both artifacts packaged).

---

# 🌌 GachaSwipe v2.6.22 // The Desire Engine

### ✨ What's New since v2.6.21

The GachaFans Hub learns to read minds: type literally anything into the new **PULSE_SEARCH** bar and the desire-matching engine synthesizes the ONE creator whose entire page IS that fantasy — then the whole existing pipeline carries them from search hit to VIP page to full match.

* **💗 PULSE_SEARCH — the desire bar (GachaFans Hub)**:
  * A pink `> QUERY:` input now sits above the Discovery Feed, with daily-rotating 🔥 **TRENDING_DESIRES** chips and ↺ **RECENT_QUERIES** session memory. First scan each session is **FREE**; every rescan/resynthesis costs **3 ⚡** — charged before the call and **refunded on refusal or malfunction** (no service, no charge).
  * **Query → creator synthesis**: the PULSE_MATCH Director *reinterprets* the raw text into a character (identity + aesthetic + kink theme) instead of echoing it — never quote the query, never name the creator after it. The result arrives in the discovery-card shape (+ `searchQuery`/`search_wink`), so `handleVisitDiscoveryPage` / `handleSubscribeToCreator` work untouched: the "character emerges from the fetish profile" moment is pure downstream reuse.
  * **Scanner theater**: the typed query glyph-encrypts (`▓▒░`) while status lines cycle (`> CROSS-REFERENCING 69,420 CREATOR PROFILES...`) and an indexed-profiles counter spins into the hundreds of thousands — pure app-owned candy; the raw LLM stream is never displayed. Match sub-counts are rigged to Popular/Superstar: a search hit is a premium answer, never a newbie roll.
  * **Fail-closed both edges (new `src/utils/pulseSearch.js`)**: `sanitizeSearchQuery` strips the prompt-injection surface (`< > [ ]`, newlines, 120-char cap) before the query rides inside the XML-directed prompt; `validatePulseCreatorPayload` enforces the reply envelope — `<refusal>` → a cheeky `NO_MATCH_FOUND` state, malformed → `PULSE_MALFUNCTION` with retry. Never fail-open, never render garbage.
  * Portraits ride the background (silhouette-mode aware) so the reveal never waits on the diffuser; every LLM tag passes `sanitizeLlmImageTags` before storage; gender prefs and the ONE shared explicit-mode consent dial are inherited from the discovery feed — escalation never improvises per-feature.
  * New `💗 desire_engineer` achievement ("Summon a creator from a raw PULSE_SEARCH desire") + 21 new `en` strings for TranslationStudio.
* **🧪 Verification**: `npm test` **39/39 green** (11 new pulse-gate cases: injection stripping, junk rejection, refusal path, malformed → ABSENT, tag clamping) · ESLint 0 errors on touched files · `npm run build` green (hook-import guard ✅, both artifacts packaged).

---

# 🌌 GachaSwipe v2.6.21 // The Warm Cache

### ✨ What's New since v2.6.2

The side-channel learns to run the photo studio and the dream chambers: three more "invisible machinery" LLM passes stop firing bare synthetic prompts — and a quiet `Promise.race` bug that kept poisoning the cache after timeouts is dead.

* **🎬 The OOB Visual Director (new `> OOB_VISUAL_DIRECTOR` Settings toggle, default ON)**:
  * **Lucid Dive dreamscape synth rides the side-channel**: the environment/attire ask is grounded in the live conversation, and every anchor passes the same `sanitizeLlmImageTags` gate as photo tags — top/bottom clamped to a *single* Danbooru item each, so diffusion never renders two characters. Fallback chain untouched: legacy synthetic `create()` → instant JS generator.
  * **🐛 Orphan-generation fix**: the old 6.5s `Promise.race` timeout *rejected* the dive synth but left the `create()` running mid-flight — it kept flushing the KV prefix cache even when its result was discarded. OOB timeouts now abort cleanly via `AbortSignal`; the snappy 6.5s budget is unchanged.
  * **DYNAMIC_PULL slot director**: the 3 holographic shoot/sprite/dream-env slots ride the side-channel **under a new session-ride guard** — only matrices belonging to the live host conversation (`chatId === activeChatId`, i.e. the dive rerolls + chat-side sprite pulls) ask out-of-band; swipe-deck dossiers and closed sessions keep the legacy call byte-identically. Validated slots are re-rendered as the same `<option>` XML the shared parser consumes, so the censor/limit/explicit-mode pipeline is untouched — and shoot ideas are now grounded in the *actual scene* instead of a synthetic vacuum.
  * **Dive Chamber dream seeds**: the synthetic *stream* becomes an OOB JSON ask (nothing user-visible ever streamed — the reply was parsed wholesale anyway). Seed source labels stay app-authored while the LLM authors title + scenario; the hardcoded contingency seeds remain the fail-closed fallback and are still never cached.
  * All three kinds are unit-tested fail-closed (10 new `node --test` cases): junk/empty → ABSENT → legacy path. Skill doctrine updated in the same change: the **session-ride guard** (never let a context-less surface ride another character's live conversation) + the **orphan-race anti-pattern** now live in the oob-side-channel skill.
* **🧪 Verification**: `npm test` 28/28 green · ESLint clean on touched files · `npm run build` green (hook-import guard ✅, both artifacts packaged).

---

# 🌌 GachaSwipe v2.6.2 // The Psyche Judge

### ✨ What's New since v2.6.1

The Matrix Mutation Engine joins the side-channel: milestone evolutions stop flushing the KV prefix cache, and every mutation verdict is grounded in the full live conversation instead of a 3-memory token diet.

* **🧬 The Psyche Judge (OOB, fail-closed)**:
  * `executeMatrixMutation` now asks the side-channel on SDK ≥7.6 hosts: the mutation ask rides the LIVE conversation (full relationship history in context — nothing persisted, next main turn's prompt byte-identical, KV prefix cache lives) and the host replies with `{tags, rationale}`. The optional `rationale` surfaces as an `Evidence:` line inside the `[SYSTEM: Matrix Mutation Detected…]` message — flavor plus debuggability.
  * The legacy standalone `<mutated_tags>` call is preserved byte-identical as the fallback: unsupported hosts, OOB errors/timeouts, or non-conforming JSON all fall through to it (a cooldown hit fail-opens too — one-shot milestones must never be eaten by the 5s guard). The `> OOB_MEMORY_ENGINE` toggle gates the new path like every other side-channel feature.
  * `commitMatrixMutation` is the new shared commit sink: tag merge (dedup, cap 8), system message, toast, M.E.O.W. reschedule, auto card sync, organic-only `matrix_mutation` achievement, and save are identical for both transports — previously duplicated inline, now provably one code path.
  * Grounding upgrade: the legacy path judged mutations from the last 3 memory summaries (or 4 raw messages); the OOB judge sees the whole conversation, with older lore summaries still attached as `[OLDER LORE]` context. The ask demands the shift be "earned by real events, not assumed from the milestone alone".
* **⏱️ Timing notes**: the organic fire lands 4s after stream-end — already a perfect idle gap. The manual `FORCE_RECLASSIFY` tap was the worst offender (a mid-session standalone `create()` re-prefilled the entire prefix) and is now cache-neutral. `matrixMutate` runs a 60s timeout, 1 retry, and a deliberately tiny 5s cooldown (mutations are latch-gated one-shots; the guard only blocks accidental double-taps).
* **🧪 Verification**: `vite build` green; `OOB_VALIDATORS.matrixMutate` unit-tested (valid → 1-3 lowercase deduped tags + sanitized rationale; junk/empty/oversized → ABSENT; angle brackets stripped, rationale capped at 200 chars); legacy fallback exercised when the side-channel is unsupported.

---

# 🌌 GachaSwipe v2.6.1 // The Geofence Judge
# 🌌 GachaSwipe v2.6.1 // The Geofence Judge

### ✨ What's New since v2.6.0

The M.E.O.W. live-location system stops hallucinating drama: deviations are now adjudicated by the side-channel instead of a length-guarded regex, and routines carry canonical place data.

* **⚖️ The Shorthand Ping Fix (pure JS, every turn, free)**:
  * `isSamePlace` drops its `>= 4`-char floor — the v2.5.45 guard made every 3-letter shorthand ping ("Bar" vs routine place "Arcade Bar", "Gym", "Inn") a **guaranteed false deviation** that then stuck in the status line for the full 2-hour TTL. Padded whole-word containment still holds ("Park" ≠ "Parking Lot").
* **🗺️ The Geofence Judge (OOB, fires only on genuine disagreement)**:
  * When the comparator still flags a fresh ping as off-routine, the side-channel gets one cooled (8-min), fail-closed opinion in the idle gap: routine prose + extracted place + the ping + recent dialogue → `{verdict, canonical_place}`. **`same`** → the false deviation is reverted (snap-back to schedule) and the confirmed place is cached into `daily_routine.places`; **`different`** → the deviation stands but the committed name is canonicalized (never a lazy shorthand in the M.E.O.W. modal); **`unclear`/error** → legacy behavior untouched. Hooks cover both the `<current_location>` ping path and the context-GPS derived path.
* **📍 Canonical Routine Places (`daily_routine.places`)**:
  * After every M.E.O.W. compile, one cooled side-channel pass annotates all 12 routine blocks with explicit 1–3 word places (`weekday`/`weekend` maps). `getScheduledPlace` now prefers this structured data over prose-guessing — which retires the silent fail-open class where place-less routine prose ("Doing her morning workout") used to flag **every** ping as a deviation. Prose extraction remains the fallback; existing schedules annotate on their next compile.
* **🧪 Verification**: `vite build` green; validator + comparator unit-tested ("Bar" vs "Arcade Bar" → match; "Park" vs "Parking Lot" → distinct; invalid verdicts → null); every judge path fail-closed to v2.6.0 behavior.

---

# 🌌 GachaSwipe v2.6.0 // The Out-of-Band Side-Channel

### ✨ What's New since v2.5.63

The app learns to whisper behind the scenes: Layla SDK 7.6's `sendOutOfBandMessage` gives every background judgement call a dedicated side-channel that never touches chat history — the KV prefix cache stays warm while the LLM works, and visible replies get faster.

* **🔮 The OOB Side-Channel (`src/utils/oobChannel.js`)**:
  * One choke point for every `contextual.sendOutOfBandMessage` call: capability gating (boot-probe feature-detect), per-kind ask builders + best-effort JSON schemas, strict reply validation (**a non-conforming reply is treated as ABSENT — fail closed**), serialization (one OOB generation at a time), per-kind cooldowns/timeouts with abort, and `[OOB]` telemetry. The LLM Activity Governor now instruments OOB passes (`chat.oob`) alongside streams and diffusion, so image-gen eviction forensics see them.
* **🚪 The 7.6.0 Host Gate + Legacy Refresh**:
  * The boot gate raises 7.3.0 → **7.6.0**, and the comparator is now prerelease-aware (`7.6.0-alpha3` evaluates as 7.6.0 — the old helper rode NaN luck). Stable hosts (≤7.5.2) auto-redirect to a refreshed `legacy.html` — a full v2.5.63 snapshot that keeps its own 7.3.0 gate, so nobody loops. Browser/mock installs bypass the gate as always. The Settings HOST_VERSION readout now tags `• ALPHA` / `• STABLE`.
  * SDK dependency bumped 7.5.2 → **7.6.2** (`npm run update-sdk`), bundled SDK reference docs refreshed from the 7.6.x skill bundle.
* **📸 The Un-Blinded Photo Pass (Tier 1)**:
  * The v2.5.44 "blind" modular path is no longer the ceiling for prefix-cached users: the FULL legacy tag-translation prompt (selfie directive, wardrobe rule, explicit instructions intact) now runs through the side-channel — same XML contract, parsed identically, through the same `sanitizeLlmImageTags` quality gate — and any failure falls straight into the pure-JS builder (byte-identical to pre-2.6.0). Additionally, when a stream emits NO usable in-band tags, the JS-synthesized `photo_request` is **upgraded in the idle gap** by an OOB judgement before Master taps the shutter. The in-band `<send_image>`/`<image_prompt>` protocol remains primary and untouched.
* **💌 The Lure Matrix Goes Sideways (Tier 1)**:
  * The offline/idle lure planner no longer fires a cache-flushing standalone `create()` mid-session: the side-channel asks the live conversation (tropes, name, mode, recent flavor included) and the validated reply is re-serialized into the exact `<morning>/<daytime>/<night>/<lure>` XML the existing scheduler consumes. The legacy pass remains as fallback.
* **🛰️ The Location Arbiter (Tier 1)**:
  * When the `<current_location>` ping is absent AND prose derivation finds nothing, the side-channel adjudicates the scene — fail-closed (1–3 word places only), cooldown-gated, and the v2.5.45 routine snap-back respected (on-routine answers never ping).
* **🧠 The OOB Memory Engine (Tier 2, Settings toggle)**:
  * Memory turns (every 5th message) no longer append the `[RECORD_MEMORY]` directive nor stream a monologue into the visible reply: the extraction runs out-of-band at stream-end (1 retry, fail-closed) and lands in the SAME storage — bubble chip + popup, `MemoryRouter` → `layla.memories`, Profile Memory Archive, RAG recall — while the visible reply finishes **~60–120 output tokens sooner**. New `> OOB_MEMORY_ENGINE` toggle in the TOKEN_EFFICIENCY_MATRIX (default ON, state persisted, badge reports `SIDE-CHANNEL READY` vs `HOST TOO OLD`); disabling restores in-band `<memory>` emission byte-for-byte.
* **🧪 Verification**: `vite build` green (2.4 MB single-file, 92 modules); every OOB call site fails closed to the pre-2.6.0 path when the side-channel is unsupported, errors, times out, or returns junk; legacy snapshot committed before any source change (`7f68bc7`).

---

# 🌌 GachaSwipe v2.5.61 // The Character Shredder & The Profile Camera

### ✨ What's New since v2.5.60

Every character now owns a private scrub list, and the character dossier finally stopped making the background behind it twitch.

* **🚿 Per-Character IMAGE_SCRUBBER**:
  * The character profile grows a collapsible `> IMAGE_SCRUBBER` category right under the core-appearance tag editor — pink header, gold `[ N ]` count badge, ▼/▲ chevron, collapsed by default. Tags added there (comma-friendly input, `+` button or Enter, gold 🚫 pills with × to remove) are shredded from EVERY image prompt for that character only.
  * Engine: `waifu.scrub_tags` flows through a new `getCharacterScrubTags()` normalizer into `buildImagePrompt`'s new 5th parameter, merging into the same fuzzy shredder as the global banned list — so "hat" still kills "hats" and "top_hat", just for her. The shared `buildChatImagePrompt` threads it on both return paths, so group photos inherit the list automatically.
  * Threaded through every character image path: swipe-deck regen, black-box visual recovery, P.A.W.S. battle/casual sprites, LucidDive + avatar sprites, all seven GachaFans generations (initial tiers, free portrait, regen-all, single-tier regen, bonus reward, reward regen, imported tiers), and the profile photo regen. Deliberately exempt: the catfish disguise, creation-time/conversion prompts (no list exists yet), Discovery-feed strangers, and monster/scenery gens.
  * Persistence is free: the list rides the whole-waifu object the inbox already saves (`gs_inbox_*.json`), and edits use the same triple-write (1-on-1 entry + group roster + session history) as the core-tag editor. The global scrubber in Settings still applies to everyone on top.
* **🎥 Profile Camera Freeze (dossier glitch fix)**:
  * Opening the character profile used to read as background glitching: the dossier's own panning `subtlePan` portrait fought the chat's `chatCinematicPan`/`chatHoloFlicker` canvas layers for the compositor. Opening the dossier now runs the familiar shutter choreography — flash in, the chat canvas pauses 180ms later as the flash peaks, flash out + WKWebView resume nudge on close — via new `beginProfileFreeze` / `endProfileFreeze` in `src/utils/llmActivityGovernor.js` (`mika-profile-freeze` body class, deliberately separate from the stream/menu cameras so they never fight over release paths).
  * The CSS pause is deliberately scoped: `.mika-chat-canvas *` + the chat-only animation names only — NO global `subtlePan` rule, so the dossier's own portrait keeps dancing while the canvas behind it holds still. Driven by one boolean-keyed React effect (`showMatchProfile && activeChatId !== 'bff'`), so DATA_CTRL/fullscreen toggles inside the dossier never re-flash the camera.
* **🧪 Verification**: production build green (`vite build` + packaging); greps confirm all 15 call sites threaded and no global `subtlePan` pause added; zips built + pushed for v2.5.61.

---

# 🌌 GachaSwipe v2.5.60 // The Export Protocol
# 🌌 GachaSwipe v2.5.60 // The Export Protocol

### ✨ What's New since v2.5.59

One EXPORT button to rule them all, a boot veil that talks back, and the glitch-proofing spreads to GachaFans.

* **🎛️ The Export Protocol (CHAT_CTRL)**:
  * The gold EXPORT and pink 🧬 Layla buttons are consolidated into **one EXPORT per archive row**. The first tap ever raises a one-time terminal explainer (`> EXPORT_PROTOCOL.EXE` … `[ GOT_IT ]`, localStorage-flagged): **📦 ARCHIVE** = lossless, re-importable backup (photos + everything) vs **🦋 LAYLA** = plain-text history for the Layla network — *and* that GachaSwipe can import Layla conversations right back through IMPORT_ARCHIVE.
  * After the guide, EXPORT swaps the row's buttons for an inline choice cluster — `ARCHIVE` (gold) / `LAYLA` (pink, new handcrafted butterfly sigil) / `✕` — pick one to fire the export; **clicking anywhere else reverts** the row, and tapping EXPORT again collapses it.
* **📺 Scene Boot Veil Glow-Up**:
  * The chat transition veil is now a proper flashy terminal: terminal-green CRT palette, scanline sheet with chunky `steps(12)` phosphor flicker, `▍ SCENE_BOOT.EXE` header, a **random cheeky MIKA one-liner** (fresh pick per boot) with a blinking `▌`, and a blocky 12-tick progress bar filling across the 600ms hold. Timing unchanged (600ms hold + 250ms fade).
* **🦋 GachaFans Transition Veil**:
  * The Subscriptions-tab **"View All"** (and every unlocked re-open) slams the whole GachaFans page — tier grid, background pool, cinematic layers — into the DOM in one commit, and the compositor stuttered through the decode storm. `handleOpenGachaFans`'s instant path now bumps a `gfSceneBootNonce`: the same Scene Boot Veil (caption `REBUILDING GF_PAGE`) holds above the page (z 10070 > 10060) for a fixed, generous **2200ms** — covering the decode storm on just about every device — and as the terminal fades, the page's own cinematic `gfPhaseIn` entrance glides in behind it (delayed to start at the reveal), so the hand-off reads as one slick transition instead of a lid ripped off a half-built page. The `'connecting'` LLM-stream flow keeps its own boot screen, untouched.
* **🧪 Verification**: production Vite build green; wiring greps (choice-flow, veil mounts, z-order); on-device — explainer shows exactly once, choice overlay + click-away revert, both exports download, random veil lines on chat switches, glitch-free "View All" into GachaFans.

---


# 🌌 GachaSwipe v2.5.59 // The Layla Bridge

### ✨ What's New since v2.5.58

CHAT_CTRL now speaks Layla. Export any archived thread as a Layla chat history, and import Layla's `history.json` files straight into any character.

* **🧬 Layla History Export (CHAT_CTRL ▸ 🧬 Layla)**:
  * New pink helix button on every archive row converts the thread into Layla's native `{"internal": [["user turn", "assistant turn"], ...]}` shape and saves it as `Name_@ch_<uuid>_history.json` — drop it into Layla and the conversation continues there.
  * System notices are dropped (Layla has no system slot), consecutive same-role texts merge, and orphan proactive replies fold into the nearest pair — nothing is lost, everything stays in order.
* **📥 Layla History Import (IMPORT_ARCHIVE)**:
  * The importer now sniffs Layla files too — and it does NOT trust the schema: a recursive scanner finds the richest array-of-turns anywhere in the JSON tree, so future Layla updates can rename `internal`, nest it deeper, or enrich turn shapes (role-tagged objects, flat role-tagged message lists) and imports still work.
  * **Name-blind by design**: the character name never leaves the filename. Imported threads are cloned from the ACTIVE 1-on-1 chat and land in its CHAT_CTRL terminal as `Layla Import — {Name}`, restorable like any archive. Open any character, import, done.
* **🛡️ DB Recovery Archive Shield (`salvageAndRebuildDatabase`)**:
  * `gsa_` rows are now recognized as CHAT_CTRL archives during emergency database rebuilds — they are only ever restored from a salvaged DB row (never rebuilt from stale in-memory inbox state), and their status is forced to `'archived'` so the boot loader always files them into the archive bus, never the live inbox.
* **🧪 Verification**: round-trip node test against a real Layla `@ch_…_history.json` + production Vite build green.

---

# 🌌 GachaSwipe v2.5.58 // The Scene Boot Veil

### ✨ What's New since v2.5.57

Chat transitions no longer collapse the UI. The cinematic canvas rebuilds behind a terminal veil, and the pool's images now keep their identity.

* **✨ The Scene Boot Veil (chat switches, NEW_CHAT, RESTORE)**:
  * Switching chats used to swap the entire cinematic `chatBgPool` in one commit: every pool image re-decoded at once, the WKWebView compositor dropped textures under the pressure (the whole UI flashing in and out), and the canvas fizzled to black for ~10s until decodes landed. Now a DiveChamber-style terminal veil (`▍ REBUILDING SCENE MATRIX...`) holds over the chat view for 600ms + 250ms fade while the rebuild happens behind it.
  * The veil is keyed on `activeChatId` (chat switches) plus an explicit `sceneBootNonce` (NEW_CHAT / RESTORE swap the thread *without* changing the chat id, so they bump the nonce themselves).
* **🔑 Stable Pool Image Identity (`key={imgUrl}` + `decoding: 'async'`)**:
  * Root cause of the storm: both canvas branches keyed their `<img>`s by array index, so any pool mutation rewrote `src` on surviving elements — full re-decodes for images that never changed. Keys are now the image URL itself: surviving images keep their decoded bitmaps (NEW_CHAT's waifu backdrop holds solid, zero re-decode), and only genuinely new photos mount fresh.
* **🧪 Verification**: production Vite build green; on-device matrix — buddy-list chat switching, NEW_CHAT (waifu backdrop solid, no black), RESTORE via CHAT_CTRL (veil → clean cinematic restart).

---

# 🌌 GachaSwipe v2.5.57 // The Invisible Notice & The Menu Camera

### ✨ What's New since v2.5.56

Two follow-up fixes for the CHAT_CTRL archive: the system notices you couldn't see, and the background glitch you could.

* **👁️ Chat-Archive Notices Now Render In-Window**:
  * `NEW_CHAT` and `RESTORE` pinned `[SYSTEM: ...]` notices were built with a `type: 'archive_notice'` field the chat renderer only treats as a real bubble when a message has NO type — so the notices showed in the buddy-list preview but never inside the chat itself. The stray field is gone: both notices now ride the native system-bubble renderer (delivered timestamps, stream-safe styling and all).
  * `countRealChatMessages` (the no-junk-archive gate) now excludes any pinned system notice that references `SYS_CTRL ▸ CHAT_CTRL` instead of matching one exact string — double `NEW_CHAT` still never creates a junk archive, regardless of notice wording.
* **🎥 Menu Camera Freeze (SYS_CTRL ▸ CHAT_CTRL, NEW_CHAT)**:
  * Opening the SYS_CTRL dropdown or the CHAT_CTRL terminal now runs the same shutter choreography as the LLM stream freeze: flash in → the cinematic canvas pauses 180ms later as the flash peaks → on close, flash out and the background re-animates.
  * Why: `NEW_CHAT` rewrites the chat's message list while the menu is open, which re-derives the animated `chatBgPool` from the (now deleted) photo messages — the backdrop crossfaded to a different image and re-decoded large PNGs mid-menu (~5s stall on device). The freeze masks the swap; closing `CHAT_CTRL` after a `NEW_CHAT` releases the camera onto the already-swapped, already-decoded pool.
  * New `mika-menu-freeze` camera lives in `src/utils/llmActivityGovernor.js` (`beginMenuFreeze` / `endMenuFreeze`) — deliberately a separate body class from `mika-stream-freeze` so the two cameras never fight over release paths, and the WKWebView resume nudge is skipped while the stream freeze still owns the camera. Driven by one boolean-keyed React effect (`menuOpen || chatCtrlOpen`), so dropdown → terminal transitions never re-flash.
* **🧪 Verification**: `grep archive_notice` → 0 hits; production Vite build green.

---

# 🌌 GachaSwipe v2.5.56 // The CHAT_CTRL Archive

### ✨ What's New since v2.5.55

SYS_CTRL just grew a memory. 1-on-1 chat history is now a real, persistent archive — nothing you and your waifu go through ever has to disappear again.

* **📼 CHAT_CTRL Archive Terminal** (SYS_CTRL ▸ CHAT_CTRL, 1-on-1 chats):
  * A DiveChamber-style diagnostic popup listing every archived thread for the active character — archived date, message count, and affection at archive time.
  * **RESTORE** (green) swaps an archived thread back into the live chat slot; the current thread auto-archives first, so the swap is lossless.
  * **EXPORT** (gold) writes a portable `Mika_ChatArchive_*.json` via the native save flow, with browser blob fallback.
  * **RENAME** (purple) and **DELETE** (red) use the Dating Themes custom SVG icon set; deletes also scrub the thread's orphaned media files from disk.
  * **IMPORT_ARCHIVE** sits above the chat list and re-ingests exported archive files into the active character's terminal.
* **✨ NEW_CHAT** (SYS_CTRL, above RENAME_CHAT): archives the current thread when it holds real content, then starts fresh with a pinned `[SYSTEM: THREAD ARCHIVED...]` notice pointing to CHAT_CTRL. Greeting-only threads just wipe — no junk archives.
* **🗄️ Storage engine**: archives live as dedicated rows in the existing `chats` table under a `gsa_` id prefix — media is stripped to disk by the native media manager (zero SQLite bloat), backups include them automatically, `deleteChatMedia` scrubbing works, the SQLite reconciler never purges them, and the CursorWindow-safe boot loader routes them into a new archive bus instead of the inbox.
* **🧪 Verification**: production Vite build green.

---

# 🌌 GachaSwipe v2.5.55 // The Camera Loop

### ✨ What's New since v2.5.54

The fullscreen photo's ambient pan is no longer a CSS animation — it's a tiny JavaScript camera loop that always knows exactly where the photo is. Auto-pan on open is now a guarantee, not a hope.

* **🎥 The Camera Loop (JS-driven ambient pan)**:
  * **Auto-pan on open, guaranteed**: the drift starts BY ITSELF the moment any photo goes fullscreen (message taps, tier cards, gallery, subscriptions) — no more static frames waiting for a grab. It starts from the **middle of the image** at the same speed as the legacy `subtlePan` (one full 0→100→0 sweep per 35s) and ping-pongs forever.
  * **One source of truth**: `fsPanRef` owns position/direction; a rAF camera loop advances it in `ambient` mode. Grabs flip to `drag` (loop parks — the finger owns the photo), and the drag base is OUR state — never `getComputedStyle`, never CSS. **Teleporting on re-grab is structurally impossible now.**
  * **Zero CSS-cascade warfare**: no more keyframes overriding inline styles, no `animation: none` kill switches, no negative-delay math, no `animation-play-state` exemption battles (the class of bugs behind the static-open frames, the re-grab teleport, and the micro-jank). The fullscreen photo simply has no CSS animation anymore — the freeze system doesn't need to special-case it.
  * **Release flow unchanged**: hold the pose 1.2s after release, then `ambient` mode resumes from the exact release position, drifting in the last drag direction. Tap still closes; 150% overdrive and pixel-one tracking unchanged; dt is clamped so background-tab stalls never jump the frame.
  * **Cleanup**: `mikaFsPanLoop` keyframe, `computePanResumeDelay` + the bezier inversion helpers, and the `.mika-fs-pan` freeze-exemption rules are all gone — replaced by the pure, testable `stepAmbientPan(x, dir, dt)` (`FS_PAN_SPEED = 200/35 %/s`) in `src/utils/photoViewerCamera.js`.
* **🧪 Verification**: 30-check headless smoke run — 16 camera choreography checks + 14 grip checks (overdrive math, clamping, zero-size-rect guard, ambient speed parity, edge reflections, zero-dt/huge-dt hygiene, full 35s sweep return) — all green, plus a full Vite production build.

---

# 🌌 GachaSwipe v2.5.54 // The Momentum Handoff

### ✨ What's New since v2.5.53

The Sprite Studio Grip now feels like the real thing: after a drag, the ambient pan rejoins **exactly where the finger left off** — with natural momentum, no snap, and no reset.

* **🖐️ Grip Feel Overhaul (Sprite Studio parity)**:
  * **Momentum handoff**: the resume no longer restarts a shortened loop from zero velocity (the v2.5.53 handoff could feel "dead" — ease-in-out starts at rest and the swing range varied with the release point). Instead, a **negative `animation-delay` drops the native 35s ease-in-out cycle mid-swing** at the exact release position: the curve's speed at that instant is automatically correct. The `cubic-bezier(0.42, 0, 0.58, 1)` curve is numerically inverted (`easeInOutTimeForProgress`) to find the precise join time. Direction-aware: drift right joins the outgoing swing, drift left joins the returning one; no horizontal motion rejoins toward the nearest edge.
  * **No height snap**: the `mikaFsPanLoop` keyframe now pins the drift height to the user's released Y via `--pan-y`, so a vertical drag never jars the photo back to center — it sways horizontally at the chosen height instead.
  * **Seamless mid-sweep grabs**: grabbing the photo while it's already ambient-panning reads the true animated position via `getComputedStyle` and continues 1:1 from that exact spot (previously the drag base could be stale versus the running animation).
  * **SpriteStudio parity fixes**: a pending resume timer is now cancelled on pointer-down (it could previously fire mid-drag and slam the animation over the finger), the stale `animationDelay` is cleared on grab so every re-grip starts clean, and the pan tracks from pixel one — the 8px threshold now only separates tap-to-close from drag.
* **🧹 Cleanup**: the v2.5.53 `--pan-from`/`--pan-to` mirror-loop vars and `computePanLoopVars` are gone, replaced by `computePanResumeDelay(x, lastDirX)` in `src/utils/photoViewerCamera.js`.
* **🧪 Verification**: 30-check headless smoke run — the 16 camera choreography checks plus 14 grip checks (overdrive math, clamping, zero-size-rect guard, bezier-inverted resume delays, direction mirroring, cycle symmetry, nearest-edge fallback) — all green, plus a full Vite production build.

---

# 🌌 GachaSwipe v2.5.53 // The Sprite Studio Grip

### ✨ What's New since v2.5.52

The fullscreen photo viewer learns SpriteStudio's touch-drag panning — hold and drag the photo to steer it by hand, release, and it keeps drifting like nothing happened.

* **🖐️ Sprite Studio Grip (touch-drag panning for the fullscreen photo)**:
  * **Tap still closes** the viewer exactly as before — an 8px movement dead zone keeps taps and drags perfectly separated, and a drag never accidentally dismisses the photo.
  * **Hold + drag steers the photo**: the same physics as SpriteStudio's StudioStage — one full image-width of finger travel pans 150% of object-position (the overdrive makes the grip feel fast/premium), clamped to the 0–100% range on both axes. `touch-action: none` stops native scroll stealing, `grab`/`grabbing` cursors show the grip, and pointer capture means the finger can never "fall off" the image mid-drag.
  * **Zero-rerender drag**: unlike SpriteStudio's per-move React state, all grip state lives in refs and `pointermove` writes `objectPosition` directly to the DOM node (rAF-throttled) — dragging cannot re-render the 30k-line app tree at finger speed.
  * **Seamless resume — the smart part**: SpriteStudio kills the ambient pan forever after first touch; here it comes back. After the 1.2s release hold, a new `mikaFsPanLoop` keyframe (driven by `--pan-from`/`--pan-to` CSS variables) restarts the ambient pan from EXACTLY the release position — no snap — and mirrors toward the edge matching the last drag direction, so the photo keeps drifting the way the finger pushed it. Y eases back to center over the loop.
  * The SpriteStudio trick that makes it all work: dragging sets `animation: none` so the inline `objectPosition` wins (CSS animations always override inline styles), and the resume re-attaches the loop at the handoff position.
  * Pure math lives in `src/utils/photoViewerCamera.js` (`clampPan`, `computeDragPan`, `computePanLoopVars`) next to the camera director; per-photo cleanup resets grip state and imperative styles on every photo switch/close.

* **🧪 Verification**: 27-check headless smoke run — the 16 camera choreography checks plus 11 new grip checks (overdrive math, clamping, zero-size-rect guard, direction mirroring, seamless handoff formatting) — all green, plus a full Vite production build.

---

# 🌌 GachaSwipe v2.5.52 // The Vanishing Backdrop

### ✨ What's New since v2.5.51

The final boss of GachaFans fullscreen glitching: the page itself now steps out of the render tree while a photo is fullscreen.

* **👻 Full Occlusion of the GachaFans Page Under the Photo Viewer**:
  * **Root cause found**: the GachaFans page root carries `transform: translateZ(0)` + `willChange: 'opacity'`, which forces the ENTIRE page — the living background stack (pooled full-screen images + radial mask + mix-blend-mode scan line + gradient overlays), the 24px backdrop-blur HUD header, and the big tier-grid images — into ONE giant persistent GPU layer. Under the 95%-opaque viewer, that mega-layer had to be alpha-blended EVERY frame while the viewer's photo repaints, thrashing texture memory and blend bandwidth on low-end devices. v2.5.51 paused the backdrop animations (motion stopped) but the layers stayed alive and blending.
  * The viewer contexts that never glitched (gallery, subscriptions, chat) all sit over lightweight content — and the Hub can't glitch because its cards navigate AWAY to the gf page, so the viewer never actually opens over the Hub. Only viewer-over-gf-page had a mega-layer beneath it.
  * **The fix — occlude, don't just pause** (the app's own minigame pattern): while `isPhotoViewerOpen`, the living background container goes `display: none`, the HUD header unmounts, and the content scroll container goes `visibility: hidden` (preserving the tier grid's scroll position, unlike display:none). The viewer is 95% opaque black, so nothing visible changes — the shutter flash masks the swap in both directions.
  * The v2.5.51 photo camera (flash + `mika-photo-freeze` pause + resume nudge) stays exactly as-is for chat, the Hub, and the transition moment.

* **🧪 Verification**: 16-check headless smoke run for the photo camera director still green, plus a full Vite production build.

---

# 🌌 GachaSwipe v2.5.51 // The Photo Viewer Camera & Still Thumbnails

### ✨ What's New since v2.5.50

Two compositor-saving fixes for the GachaFans fullscreen experience: a shutter-flash camera freeze for the photo viewer, and still (non-panning) subscription thumbnails.

* **📸 Photo Viewer Camera Freeze (new `src/utils/photoViewerCamera.js`)**:
  * Opening any fullscreen photo now runs the same choreography as the LLM stream freeze: shutter flash in → the cinematic/panning canvas behind the viewer pauses 180ms later (as the flash peaks) → on close, another flash out and the background re-animates. The glitching fight between the invisible backdrop and the fullscreen photo's own pan is gone — the photo owns the compositor.
  * New `body.mika-photo-freeze` camera class pauses every backdrop animation (`gfCinematicPan`, `hubCinematicPan`, `chatCinematicPan`, holo flicker/scan lines, blend crossfades, `subtlePan`) — while the fullscreen photo itself carries `.mika-fs-pan` and KEEPS its 35s pan (the freeze is for the backdrop, not the photo).
  * Zero coupling with the LLM activity governor: separate freeze class, and the WKWebView resume nudge is suppressed while `mika-stream-freeze` still owns the camera. The photo-freeze rules sit AFTER the resume block in index.css, so an LLM stream ending mid-view can never un-freeze the backdrop.
  * One boolean-keyed React effect (`!!gachaFansFullscreen`) drives arm/release for EVERY open/close path (tier grid, header avatar, bonus reward, gallery, subscription cards, backdrop tap, close button) — menu open/close toggles mutate the object but never re-flash the camera.
  * Flash overlays (reusing `.mika-shutter-fx`) added to the GachaFans page root, the Hub root, and inside the viewer itself, so the shutter flash is visible over the cinematic background on open AND close.

* **🖼️ Still Subscription Thumbnails (inbox → Subscriptions)**:
  * Subscription card tier thumbnails no longer run `subtlePan` — the `object-position` animation forces a full image repaint EVERY frame, and a wall of panning cards kept repainting underneath the GachaFans page, glitching the compositor on low-end devices.
  * Dropped the now-pointless `willChange: 'object-position'` / `translateZ(0)` layer hints from the static cards; framing is unchanged (`objectPosition: 0% 50%`), and PPV slideshow crossfades stay (opacity/transform only — compositor-friendly).

* **🧪 Verification**: 16-check headless smoke run for the photo camera director (flash/freeze choreography, 180ms freeze landing, rapid open/close cancellation, stream-freeze guard, reopen cycle, reset hygiene) — all green, plus a full Vite production build.

---

# 🌌 GachaSwipe v2.5.50 // The Thinking Camera, Honest Anatomy & Narrator Voice

### ✨ What's New since v2.5.49

Three headline systems: a reasoning-phase camera freeze for the cinematic chat background, a context-aware rewrite of the Explicit Anatomy Genitals modulator (extracted to its own tested module), and the community-requested NARRATION_PERSON selector for roleplay asterisk actions.

* **🎥 Reasoning-Phase Camera Freeze (LLM Activity Governor v3)**:
  * Reasoning models stream `<think>` tokens into the chat thought wall — while ONLY thought tokens are flowing, the app now runs the same shutter choreography the local-tier freeze uses: camera-flash in → cinematic/panning canvas pauses 180ms later (as the flash peaks) → slick, sharper thought wall.
  * The instant real content starts, the camera releases with the shutter-release flash and the background re-animates while the reply keeps streaming over it. No more glitching canvas fighting the repaint storm under the reasoning tokens.
  * Cloud tier gets the freeze for the first time (it never engaged there before); local tier behavior is byte-identical (the whole-stream freeze already owned the camera — the thought freeze rides along as a no-op passenger).
  * New ref-counted `beginThoughtFreeze()` / `endThoughtFreeze()` governor APIs with a leak-proof safety release on stream error/abort, plus the existing 5s watchdog as janitor. The freeze state machine now updates logical state before DOM side-effects, making it headless-testable.
  * Thought-wall stream budget: while frozen, the wall drops its per-commit GPU blur (`body.mika-stream-freeze .chat-thought-wall`).

* **🔞 Context-Aware Explicit Anatomy Modulator (extracted to `src/utils/explicitAnatomyModulator.js`)**:
  * **Fixed false-positive undress detection**: the undress state is now read from the prompt tags + live chat context ONLY — a character card that merely says "pale skin" no longer forces every NUDE/EXTREME photo into anatomy-injection mode, and "cleavage" no longer implies exposed nipples.
  * **Nude shots get honest tags**: nude/bottomless scenes now inject `pussy` — never the clothed `cameltoe` tag (reserved for actual clothed tight-fabric tease signals).
  * **Justified reveals get the full tokens**: spread legs / exposed crotch / explicit acts now append `pussy, anus` (Master's exact scenario — "nude shot with legs spread").
  * **Budget-slicer fix**: the 10-tag dynamic cap was trimming tail-first, silently shredding every appended anatomy tag on full LLM payloads. `buildImagePrompt` now accepts `protectTags` — injected anatomy always survives the budget; originals fill the remaining slots (tags removed by the gender-lock/bloat scrubbers are never resurrected).
  * `returnInjected` option reports exactly what was appended; futa gets the same anus rule alongside futanari/penis; male stays conservative. Swipe cards, SFW/Tease and Strict Censor behavior unchanged.

* **🗣️ NARRATION_PERSON Selector (community request from Gu◎Changge)**:
  * New setting in Chat Style: choose the voice of *asterisk* roleplay actions — `FIRST_PERSON` ("I smirk and lean closer") or `THIRD_PERSON` ("Neya smirks and leans closer"), narrated as if an external storyteller (the gacha swipe narrator) describes the scene. Spoken dialogue ALWAYS stays in the character's natural first-person voice.
  * Single source of truth in `src/utils/narrationStyle.js` feeds every RP directive: 1-on-1 main builder, sparks engine, card first messages (immersive + snappy), group Dynamic/Long RP rules, and both dream wake-up reactions. First-person wording is byte-identical to the legacy prompts.
  * Fully persisted (session save/load + presets), synced into `stateRef`, autosave-tracked, localized via LanguageContext, and zero renderer changes needed — asterisk styling is person-agnostic. Memory-log monologues intentionally stay first-person (internal data, not narrative).

* **🧪 Verification**: 42-check smoke suite (`scratch/test_smoke_v2550.mjs`) covering the modulator scenarios, narration byte-parity, and the governor freeze lifecycle (cloud freeze/release, local stream-ownership, cancelled-freeze hygiene) — all green, plus a full Vite production build.

---

# 🌌 GachaSwipe v2.5.49 // Decoupled Strict Censor & Beta Explicit Anatomy Modulator

### ✨ What's Fixed since v2.5.48

Master and M.I.K.A. refined explicit controls, decoupled censor logic from degenerate mode, and introduced conditional UI controls with prompt-first safety defaults.

* **🔓 Decoupled Strict Image Censor (SFW & Tease Eligible)**:
  - `Strict Image Censor` is now completely decoupled from `Degen Mode`. Selecting either **SFW (0)** or **TEASE (1)** enables the toggle regardless of Degen Mode state.
  - Automatically locks and dims in **NUDE (2)** and **EXTREME (3)** modes with a helpful inline warning (`[!] Switch to SFW or Tease mode to enable Strict Image Censor.`), preventing intentional explicit modes from being wiped out.
* **🔞 Conditional Explicit Anatomy Toggle (BETA)**:
  - The `> EXPLICIT_ANATOMY_GENITALS` toggle now appears **only** when either **NUDE (2)** or **EXTREME (3)** is selected. It stays hidden in SFW and Tease modes to keep settings clean and intuitive.
  - Equipped with an official neon cyberpunk **`BETA`** badge.
  - Enabled by default whenever entering Nude and Extreme modes.
* **🛡️ Prompt-Based Censorship by Default (Tag Shredding Strictly Opt-In)**:
  - Aggressive Danbooru tag scrubbing/shredding only executes when the user explicitly toggles `Strict Image Censor` ON.
  - When the Strict Censor is OFF, SFW/Tease modes rely on prompt directives without destructive tag stripping, keeping natural character descriptions and custom prompts intact.
* **🔞 Dynamic Explicit Anatomy Modulator (`modulateExplicitAnatomyTags`)**:
  - Dynamically modulates anatomical features during intimate, topless, and nude photo generations based on character identity, scene context, and explicit intensity level (Nude / Extreme).
  - **Futanari & Intersex Accuracy**: Character cards with `futanari`, `dickgirl`, `shemale`, or `intersex` attributes correctly receive both `nipples` and `futanari` / `penis` / `erect penis` without erroneously generating female genitalia.
  - **Female & Male Anatomy**: Correctly maps female anatomy (`nipples`, `cameltoe`, `pussy`) and male anatomy (`penis`, `erect penis`) based on context (`topless`, `bottomless`, `nude`, `spread legs`) and extreme action indicators.
* **🛡️ Clean Swipe Deck & Preview Card Protection**:
  - All procedural card generation (`generateNextWaifu`) and M.E.O.W. card imports pass `isSwipeCard: true` through `modulateExplicitAnatomyTags`.
  - Initial discovery cards and swipe previews strictly purge rogue genital and naked tokens (`penis`, `pussy`, `futanari`, `nipples`, `cum`, etc.), keeping initial card impressions safe, alluring, and mutation-free.

---

# 🌌 GachaSwipe v2.5.47 // The Loop Buster & Pristine Scene Graft

### ✨ What's Fixed since v2.5.46

Master uncovered two subtle photo pipeline edge cases: characters getting stuck in an infinite retry loop ("bad signal, let me try again!") without actually spawning the photo bubble, and 1 out of 4 photos feeling bloated and missing its physical location.

* **🔄 Loop-Buster & Conversational Photo Retry Detector (`isPhotoRequestMessage`)**:
  - Previously, regexes required rigid words like `pic|photo|selfie`. When Master naturally replied with *"did it send?"*, *"try again"*, *"resend"*, *"where is it?"*, *"it didn't go through"*, or *"nothing came through"*, the regex evaluated to `false`.
  - The system prompt then instructed the model: *"The user did not ask for a photo. Do NOT send an image! Output <send_image>false</send_image>."* The character was trapped between Master's expectations and the system directive, making up in-character excuses (*"bad signal!"*) and dutifully outputting `<send_image>false</send_image>`.
  - Unified `MIKA_PHOTO_REQUEST_RE` and `isPhotoRequestMessage` now catch all retry variations, questions, and terse conversational follow-ups.
* **📸 Camera Action Overrides & Retry Confirmations**:
  - `aiSendingConfirmation` now matches conversational retry confirmations (*"let me try sending it again"*, *"trying again now"*, *"resending"*).
  - In `handleSendMessage`, affirmative camera actions (`aiActionTakingPhoto`, e.g. `*snaps photo*`, `*holds up phone*`) and sending confirmations override a false XML tag if the character did not verbally refuse. The photo request bubble spawns reliably every time!
* **🏰 Decoupled Physical Setting & Ambient Lighting Grafting**:
  - Previously in the v2.5.46 express highway, `hasEnv = pool.some(t => MIKA_LOCATION_TAG_RE.test(t) || MIKA_LIGHT_TAG_RE.test(t))`. If the LLM emitted *any* lighting word (e.g. `soft lighting`), `hasEnv` was evaluated as true, skipping the physical location graft entirely!
  - Decoupled into `hasLocation` and `hasLighting`. If the LLM provides lighting without a setting, the physical scene location (from dialogue or schedule) is **always grafted**.
* **🧹 Bloat Scrubber & Clean CLIP Chunk-1 Budgeting**:
  - Added `bloatBans` actively scrubbing subjective quality noise (`masterpiece`, `best quality`, `highres`, `high quality`, `extremely detailed`, `photorealistic`, `aesthetic`, `depth of field`).
  - Budgeted prompt structure: up to 8 prefix tags, 8 core tags, and 10 dynamic tags (~20–22 tags total). Fits cleanly within CLIP's 77-token ceiling (~45–60 tokens) without prompt dilution or attention dropoff.

---

# 🌌 GachaSwipe v2.5.46 // The Grand Unification

### ✨ What's Fixed since v2.5.45

Master compared current generation with v2.5.41 and noticed that v2.5.41 structured prompts better, kept natural token flow, and felt more consistent with context. The category router introduced in v2.5.43 was chopping valid flat tag sets into rigid 3-tag silos, artificially forcing `[Outfit, Pose, Env]` order (putting clothes at tokens 1-20 and pushing poses/expressions back), and letting M.E.O.W. overwrite valid roleplay attire when regexes missed novel clothing words.

* **🚀 The Grand Unification (Express Tag Highway + Smart Partial Top-Up)**:
  - When the LLM outputs a substantive flat tag set (`pool.length >= 2`), `buildChatImagePrompt` no longer dismantles it into 3/4/3 silos. The LLM's natural prompt phrasing, token sequence, and full 12-tag dynamic budget are preserved verbatim.
  - CLIP attention weights stay true to the scene: expressions and actions lead if the model emitted them first.
  - **Non-Destructive Partial Fallbacks**: If the LLM omitted an obvious pillar, the engine top-ups *only* that missing piece without touching or reordering the surviving tags:
    - Missing outfit? Appends resolved scene attire (from chat context or wardrobe).
    - Missing pose? Appends `looking at viewer`.
    - Missing environment? Grafts scene location and time-of-day lighting.
  - **Intimate / Nude Context Enforcement**: If roleplay calls for undergarments/nude, context overrides take precedence cleanly.
  - **Complete Modular Fallback**: Truly empty, single-tag fragments, or garbage-sanitized payloads fall through to full Category A, B, C modular reconstruction. Zero blank photos.
* **👗 Expanded Attire Vocabulary**: `MIKA_OUTFIT_TAG_RE` now includes `corset`, `maid`, `leotard`, `bodysuit`, `choker`, `ribbon`, `bow`, `cape`, `cloak`, `armor`, `tunic`, `sarong`, `tank top`, `crop top`, `sleeveless`, `collar`, `bare shoulders`, `navel`, `cleavage`, `pantyshot`, and `upskirt`.
* **🏷️ Generous Modular Budgets**: Modular Category A (outfit) and Category C (env) caps increased to 4 tags for richer scene details.
* **📜 Context-Aware Photo Executor & Regen**: Full message history (`chatHistory: chatData.messages`) is explicitly plumbed into all photo executor and regeneration call sites.

---

# 🌌 GachaSwipe v2.5.45 // The Deviation Discriminator

### ✨ What's Fixed since v2.5.44

Master's console log cracked the "dead Accept Photo button" case: `ReferenceError: Cannot access 'ct' before initialization` — a temporal dead zone hiding inside v2.5.44's scene-location graft. And the live tracker finally learned judgment: a ping that merely restates the routine's own place is no longer paraded as a deviation.

* **📸 Accept Photo Button Resurrected (TDZ Fix)**: v2.5.44's resolver hook (`contextSceneLocation`) was declared *below* the `meowRule` builder that reads it — in BOTH the photo executor and the regenerator. With the M.E.O.W. engine on, every click threw synchronously, got caught, and silently reverted the button: zero visual feedback, just a buried console error. The hook now lives above its first read, and a release-harness TDZ static guard (declaration-index vs. read-index) keeps it that way forever.
* **💔 Failures Get Loud**: the executor's catch now toasts the error message (it only ever `console.error`'d), and the regenerator's catch — which swallowed *everything* in total silence — now logs AND toasts. A failed photo can never masquerade as a dead button again.
* **🧭 Deviation Discriminator (Live GPS Judgment)**: "⚠️ DEVIATION DETECTED" used to fire for ANY fresh ping — even when the scene place *was* the routine's own place ("Working the graveyard shift at the arcade bar" + scene "arcade bar" = on-schedule). New module-scope comparators (`normalizePlaceForCompare`, `isSamePlace`, `getScheduledPlace` — schedule-only via `getScheduledStatus`, gated by the location vocabulary + furniture blocklist, fail-open when the routine names no real place) now judge every commit path: an on-routine report takes the snap-back branch (stale ping cleared, no spinner, no cooldown burn) instead of refreshing the ping. Wired into the 1-on-1 tag commit, the group-sync commit, and the Context GPS fallback — which now also un-deviates mid-cooldown WITHOUT arming it, so a genuine deviation moments later isn't blocked.
* **🖥️ Honest Modal**: the M.E.O.W. profile modal's deviation view is semantic — fresh ping AND (P.A.W.S. override OR ping place ≠ routine place). Legacy on-routine pings saved by v2.5.44 render the calm routine view too, and "Pinged Recently" roster chips stop strobing during on-schedule scenes.
* **🗺️ Truthful Tracking Rule**: the always-emit live-tracking rule stays (it fixed ping loss) but now tells the model that reporting its routine place is fine — the engine detects on-schedule reports and only flags genuine deviations.

---

# 🌌 GachaSwipe v2.5.44 // The Context Whisperer

### ✨ What's Fixed since v2.5.43

Master caught two v2.5.43 regressions live: photos ignoring the RP scene (interior shots while the dialogue screams "PUBLIC STREET at night"), and the Soulbound trophy replaying every session. Root causes were three interlocking gaps — the photo executor never consulted chat context when prefix caching was on, the live-location prompt only asked for pings on *deviation* (so street scenes that resembled the routine emitted `NONE` and snap-back-deleted the GPS), and the achievement save read a stale ref that still held the pre-unlock list.

* **🛰️ Scene Location Resolver (the big one)**: new pure-JS chain `getEffectiveSceneLocation` — fresh `<current_location>` ping → place named in the last ~6 dialogue bubbles (`extractChatLocationText`) → M.E.O.W. schedule slot (gated: must match the location vocabulary AND must not match the new furniture/object blocklist, so "preens in the mirror" fails closed to no location instead of grafting "Mirror"). Zero LLM calls — prefix-cache KV stays warm. Feeds the photo executor, the regen path, the empty-only synthesis `envTag`, and the chat-turn `envHint`; the LLM photo-pass status line reports the live scene instead of raw schedule prose.
* **📍 Live-Tracking Rewrite + Context GPS Fallback**: the chat rule now demands the *specific scene place every turn* (schedule reframed as routine baseline, `NONE` reserved for scene-less chats), and when the tag is absent/`NONE` the engine derives the place from dialogue prose under a 10-minute per-chat cooldown (same failsafe cadence as the hallucination memory rescue). Profile modal stops saying "Tracking offline" mid-scene.
* **🗺️ Detector Expansion + Place Gate**: location vocabulary gains `sidewalk`, `alleyway`, `downtown`, `subway`, `plaza`, `nightclub`, `marketplace`, and 20+ more real places; the always-on graft and all photo builds reject furniture/object/body-part fragments anywhere in the chain.
* **🏆 Ghost-Proof Soulbound Persistence**: `unlockAchievement` persists the *computed* next array (no stale-ref round-trip), syncs `stateRef` before the forced save fires, and drops the leftover `[SparkAudit]` diagnostics. One popup, one save, forever.

---

# 🌌 GachaSwipe v2.5.43 // The Context Restoration

### ✨ What's Fixed since v2.5.42

Master caught the fallout from v2.5.42's new fallback prompts: photos stopped honoring chat context, and the location half of the prompt went hit-or-miss. Root cause wasn't the fallback idea — it was four gaps in how partial LLM tags flowed through it. v2.5.43 makes the modular engine (core prompting + M.E.O.W. wardrobe + time lighting) the guaranteed context provider, and turns the tag gate into a compliance-first contract enforcer.

* **🧭 Category Router (the big one)**: the flat-tag branch of `buildChatImagePrompt` no longer returns early the moment any tags survive — it now sorts surviving tags into outfit/pose/environment buckets (keyword detectors, never merging or rewriting) and feeds them through the existing modular categories. The LLM's outfit is never contradicted by the M.E.O.W. wardrobe again (`bikini, beach` stays `bikini, beach`), and any category the LLM left out is filled by its own engine — wardrobe from M.E.O.W., pose defaults, live location + time-of-day lighting.

* **📍 Always-On Location Graft**: props alone ("coffee cup") no longer count as a setting. If the env payload carries no real location/lighting tag, the live location is grafted and the time-of-day lighting ALWAYS rides along — ordering (location graft → LLM env → time) guarantees a real LLM location is never evicted by the 3-tag env budget. Location is no longer hit-or-miss; it's structural.

* **🛡️ Compliance-First Gate**: `sanitizeLlmImageTags` now guarantees brief danbooru tags (the contract) pass through untouched — only deduped. Drift-form-but-compliant content is salvaged instead of vanishing: `Location: rooftop cafe` keeps its cafe, `Outfit: red dress, smile` keeps everything (a mid-line label sweep plus location/wardrobe bucket salvage — the old code dropped these payloads into the void, and a labeled line could nuke the entire tag set). Memory junk and wordy prose are still shredded, safely: their categories get gap-filled by the modular engine.

* **✂️ Empty-Only Synthesis**: the router's tag synthesis now fires only on a completely empty payload. The old `tagCount < 3` threshold punished brief-but-correct tags by burying them under the entire M.E.O.W. baseline. Brief, sectioned tags are the ideal case, not a trigger.

* **🗺️ Location Sanitizer Hardening**: bare activity fragments ("At work" → "work", "On break" → "break") are rejected at the final check instead of becoming meaningless location tags, while real places still extract cleanly ("Working at the bakery, morning shift" → "Bakery"). Photo directives across 1-on-1, group, and both tag-generator prompts now state the contract explicitly: *brief lowercase danbooru tags only — no sentences, no prose*.

---

# 🌌 GachaSwipe v2.5.42 // The Hallucination Whisperer

### ✨ What's Fixed since v2.5.41

Master got a field report: a local LLM started inventing its own memory protocol — `[Memory: ...]` blocks pasted mid-chat — completely ignoring the XML directive format. v2.5.42 stops fighting the model and starts *listening to it*: every hallucinated directive format is deciphered, processed by the engine it was meant for, and scrubbed from view. The photo pipeline got the same treatment — tags the LLM mangles beyond recognition now fall back to a semi-smart wardrobe-and-lighting assembly instead of poisoning the diffuser (or producing nothing at all).

* **🧠 Bracket Directive Decoder (chat)**: a new `hallucinationScrubber.js` utility recognizes directive attempts in every wrapper models invent — `[Memory: ...]`, `{Memory: ...}`, `<Memory: ...>`, `[[Remember: ...]]`, `((Note to self: ...))`, `【Memory: ...】`, `<<Memory: ...>>`, markdown-bold `**Memory:** ...`, asterisk-labeled `*Memory: ...*`, and bare `Memory: ...` / `- Remember: ...` lines. Labels cover memory, location, wardrobe/outfit, routine/schedule, VIP drops, and image tags. Captured payloads route to the real engines (long-term memory, live location, wardrobe closet, routine recalibration, GachaFans drops, photo pipeline) instead of leaking into bubbles. Runs in BOTH the streaming fast path (the exact hole the user hit — tag-free replies never even reached the scrub chain before) and the full XML scrub chain, plus group chat message sanitization.

* **💾 Hallucination Memory Rescue**: the old commit path silently dropped any `<memory>` capture that arrived off-cadence. Now a bracket-deciphered memory attempt **commits on any turn** — if the model explicitly tried to save, we save. Same sanitize + `( Name • Location ) »monologue«` pipeline, same memory archive. **Failsafe cooldown**: rescues obey the exact limits a real memory turn does — the same no-memory-in-recent-history spacing window (rescued saves now stamp the bubble chip, so the window sees them) plus a hard 10-minute per-chat cooldown mirroring MemoryRouter's own injection cooldown, so a runaway model spamming `[Memory: ...]` cannot flood the archive. Suppressed attempts are console-logged, never displayed.

* **🛡️ LLM Tag Quality Gate (image gen)**: `sanitizeLlmImageTags` normalizes any tag blob and shreds everything that isn't plausibly a Danbooru tag — markdown fences, XML remnants, bracket directives, `Tags:` prefixes, memory-junk tokens ("remember to...", "note to self"), filler words, and prose sentences. Applied at the 1-on-1 tag router, the modular prompt builder (protects regen/dream/VIP paths through the same choke point), the group tag consumer, and the stored-payload gates on both the photo executor and the regenerator — a stored `[Memory: blah]` payload now decodes to zero confident tags and is treated as absent.

* **📸 Bracket Image-Tag Salvage**: models that skip `<image_prompt>` entirely but emit `[Image: selfie, smile, beach]`, `{Photo: ...}`, `**Tags:** ...` or a bare `Image prompt: ...` line are now *deciphered* — their tags power the actual photo instead of being discarded to the fallback synthesizer (1-on-1 and group parity).

* **🌇 Semi-Smart Zero-Signal Fallback**: total LLM instruction failure no longer means garbage photos or no photos. When a tag payload decodes to nothing usable, the modular builder assembles: core appearance tags + M.E.O.W. wardrobe tags + selfie/looking-at-viewer pose defaults + live-location environment + `getTimeOfDayDanbooruTags` time-of-day lighting (morning / daylight / dusk / night). The user still gets a real, contextually dressed, correctly lit photo.

* **🔍 Precision Guardrails**: quoted speech, `<3` hearts, proper `<memory>` XML, and asterisk roleplay prose are never touched — a label word only decodes when it *opens* a directive-shaped construct (`*I recall our first memory fondly*` is safe; `*Memory: we met at the cafe*` is captured). A cheap regex probe keeps plain prose paying near-zero cost on the hot streaming path.

---

# 🌌 GachaSwipe v2.5.41 // The Flow Cadence

### ✨ What's Fixed since v2.5.40

Master caught two things at once: the RP Long "massive dump" survived v2.5.40, and a flat 12 t/s ceiling made long replies crawl. Both are rooted out now — the dump had a completely different cause than the buffer tiers, and the ceiling became a flowing S-curve.

* **🕳️ The RP Long Dump (real root cause)**: the typewriter's effect cleanup force-completed the stream on EVERY re-run — including the `isTyping=false` flip the moment a stream ended. It killed the drain latch and fired `visual-stream-end`/`onComplete` early, so the next effect pass hit the static-sync branch and rendered the entire untyped remainder in a single frame. Long RP Long replies (still mostly untyped at stream end) made it a massive dump. The drain latch now survives re-runs — the cursor keeps typing at the flow cadence after the stream closes, and completion fires exactly when the drain finishes. Only a true unmount releases the badges/group queue.

* **🌊 Flow Cadence S-Curve (~50 t/s ceiling)**: every reply starts out slower (34→22ms warm-up over the first ~64 chars); short replies never leave the gentle ~12 t/s cruise band; only replies that prove long (600→1800 chars) accelerate into a ~50 tokens/sec fast lane (~190 c/s), ease back out as the backlog drains below 128 chars, and taper over the final characters. Short: slow → a bit faster → slow. Long: slow → very fast → slow.

* **⏱️ Time-Credit Pacing**: fast-lane steps spend accrued frame-time credit with a 6-char per-frame take ceiling and a 100ms credit cap — display-refresh independent multi-char streaming at the fast lane with zero gulp dumps, even after tab stalls.

* **🧊 Everything Else Untouched**: local direct pipeline, commit governor, group pacing, watchdog (now harmless — no dump on release), TTS choreography.

---

# 🌌 GachaSwipe v2.5.40 // The Cloud Cadence Cap

### ✨ What's Fixed since v2.5.39

Master caught fast cloud models outrunning their own typewriter: a burst of tokens mid-stream used to avalanche the untyped remainder onto the screen in one visible gulp ("the rest of the text just appeared"). The culprit was the streaming typewriter's backlog-scaled speed ramp — it topped out near 500 chars/sec the moment a cloud engine flooded the buffer.

* **🐢 Hard Cloud Speed Cap (~11.8 t/s)**: the `HolographicTypewriterMessage` cursor now types at a fixed ceiling of 1 char per 22ms (~45 chars/sec ≈ 11.8 tokens/sec at the app's 3.8 chars/token estimate) — never faster, no matter how large the buffer grows. Token bursts now wait invisibly in the buffer instead of dumping; the 2/4/8-char multi-gulp tiers are gone.

* **🌅 Slow-Start Warm-Up Ramp**: each stream now opens gently — 34ms/char easing down to the 22ms cruise across the first ~64 characters — so replies start out slower and settle into the natural cadence.

* **🌙 Finish Taper Preserved**: the existing gentle slowdown on the final characters after the stream closes is untouched.

* **🧊 Local Engines Untouched**: local/NPU streams still render through the direct pipeline (`bypassSpeedLimit`), and token ingestion, the commit governor, scroll sync, and TTS/group completion choreography all behave exactly as before — only the visible typing speed changed.

---

# 🌌 GachaSwipe v2.5.38 // The Daily Ritual Release

### ✨ What's New since v2.5.37

The GachaFans Hub graduates from "fun place to visit" to a **daily habit**. One featured drop per day, a streak that pays you for showing up, and a living feed of your subscriptions' 3AM chaos — the three compounding pieces of the ritual loop.

* **🔒 Daily Featured Creator Lock**: the Featured Creator card no longer re-rolls on *every* Hub open — the pick is locked to the calendar day (the dormant `gachaFansHubFeaturedDate` state finally earns its keep) and the gold header now shows `// NEW DROP TOMORROW`. A stale-cache guard auto re-rolls if the featured creator's page was deleted between opens, so a ghost can never be featured. The boot sequence reports `> FEATURED_CREATOR_CACHED` on repeat visits.

* **🔥 Hub Uplink Streaks**: the flat daily +5 ⚡ uplink became a gap-aware streak engine. Check in on consecutive days and the payout climbs — +5 ⚡ on day 1, +1 ⚡ per streak day up to a +5 bonus cap (day 6+ = +10 ⚡ per check-in). Miss a day and the streak resets to cold, dead embers. Day 7 unlocks the new **Streak Master 🏆** achievement. A `🔥 N` streak chip now lives in the Hub header next to the Spark balance, and the boot sequence reports `// UPLINK_STREAK: N_DAYS`.

* **📝 `> CREATOR_FEED` — the Creator Post Wall**: your unlocked subscriptions now *post*. One batched LLM call generates unhinged 3AM-style posts (dramatic, needy, meta, or bizarre) from up to 5 creators, streamed live behind a glitchy backdrop. 30% of posts attach one of that creator's existing tier photos as a "pic post" — zero extra image-generation cost — and tapping a photo jumps straight to the creator's GachaFans page. Fresh feeds generate free once per calendar day; an empty state (`[ NO_POSTS_TODAY ] — Your subs are sleeping 💤`) offers a free retry when generation fails.

* **⚡ Spark Sinks**: liking a feed post costs **1 ⚡** (one like per post, ever), and reshuffling the feed costs **2 ⚡** — the Hub finally drains Sparks instead of only printing them.

* **🏆 New Achievement — Streak Master**: check into the Hub 7 days in a row.

* **💾 Full Persistence**: all new ritual state (`hubCheckinStreak`, `hubFeedPosts`, `hubFeedPostDate`, `likedPostIds`) is wired through the session save/load chain, the migration `indexData`, and the autosave dependency array — your streak and feed survive restarts.

---

# 🌌 GachaSwipe v2.5.37 // The XML-Leak Purge

### ✨ What's Fixed since v2.5.36

Master caught raw XML protocol bleeding into the chat bubbles on a local engine — a selfie's Danbooru tag line (`selfie, making pouty face, cheek_brushing_shoulder, sleepy_eyes`) rendered as plain chatter inside a message bubble. The scrubbing pipeline treated its exact-shape regexes as validation instead of scrubbing, so every way a small local model *drifts* from the photo protocol was a leak. The parsing code is identical for cloud and local engines — cloud models simply follow the protocol strictly enough to hide the gaps. All of the gaps are closed now, for both.

* **🐍 Naked Danbooru-Line Shredder (the actual leak)**: models that skip the `<image_prompt>` wrapper entirely and append a bare, comma-separated tag line after the message. A new trailing-block detector (`scrubNakedTagLines`) vaporizes a run of tag-shaped lines (lowercase, `snake_case` tags, `prompt:`/`tags:` prefixes) at the end of a reply. Conservative by design: normal chatter with punctuation, capitalization, or emoji (`Sure, I'd love that.`, `ok, cool, whatever`, `<3`) is never touched. Runs in BOTH the streaming fast path (tag-free commits) and the full XML scrub chain, so the leak is hidden live while streaming too.

* **🏷️ Image Stripper v2 (alias + attribute tolerance)**: the XML image stripper now recognizes the alias wrappers local models love (`<image>`, `<pic>`, `<img>`, `<image_tags>`, `<image_url>`), tolerates attribute forms like `<image_prompt type="selfie">`, and swallows unclosed wrappers to end-of-stream — matching the existing `<send_image>` behavior.

* **🛡️ Hallucination & Ruthless Shredder v2**: the rogue-XML shredders (streaming commit, final commit, and history-scrub paths) now destroy blocks and tag tokens carrying attributes (`<cfg config="x">...</cfg>`) instead of only exact `<name>` shapes. `<3` hearts remain spared, obviously.

* **📸 Photo Routing Follows the Drift**: the selfie-tag extractor (1-on-1 AND group batch) accepts the same alias wrappers, so tags sent via `<image>`/`<pic>` still power the actual photo instead of being discarded to the fallback synthesizer. Boolean-only values (`<image>true</image>`) are ignored as tags and fall through to contextual tag synthesis. The streaming "SYNTHESIZING PHOTO 📷" status detector speaks alias now too.

* **👥 Group Chat Parity**: `sanitizeGroupMessageContent` gets the same alias/attribute-tolerant strips plus the naked-line shredder, and the group batch parser routes alias-wrapped prompts.

* **🧊 Scroll-Budget Frost-Bar Cleanup**: the scroll render budget no longer force-strips `.mika-frost-bar` of its `backdrop-filter` or overrides its background mid-scroll — the frost bar keeps its look while the budget continues working for the input bar, control buttons, and bubbles.

---

# 🌌 GachaSwipe v2.5.36 // The Selfie Autonomy Release

### ✨ What's Changed since v2.5.35 *(backfilled — this version shipped without a changelog section)*

* **🤳 'arm up' selfie injection retired**: modern diffusion models already frame selfies from the `selfie` tag combined with the phone/smartphone tag scrubber, so the legacy pose-injection hint was fully removed.
* **🚪 `> SELFIE_INJECTION` toggle eliminated** across state, persistence, presets, UI, and translations — one less switch to maintain, zero behavior loss.
* **🧠 `isSelfieContext` is now fully automatic**: selfie-context detection runs on its own with negation and autonomy guards intact — no toggle required.

---

# 🌌 GachaSwipe v2.5.35 // The Buttery-Scroll Release

### ✨ What's Fixed since v2.5.34

Master's on-device diagnosis was the key: **background animations stayed smooth while scrolling and UI navigation were sluggish** — proof the compositor (GPU) path was healthy and the main-thread paint path was the bottleneck. The chat scanline overlay was audited and cleared (transform-animated, compositor-safe, painted once). Three real culprits found and fixed:

* **🧊 Scroll-Time Render Budget (the frost-blur fix)**: the frosted-glass chat header and input bars sit OVER the scrolling message list — WKWebView recomputed their 24px `backdrop-filter` blurs on **every scroll frame**, on top of the animated background they blur continuously. New `src/utils/scrollRenderBudget.js` adds `body.mika-scroll-budget` on the first scroll event and removes it ~250ms after scrolling rests; while present, the CSS strips blur from the frost bars, input bar, control buttons, and bubbles (same proven trick as the v2.5.24 stream budget) with opaque fallback backgrounds. The frosted look fully restores at rest — zero visual change while sitting still. The budget is always released when the chat panel closes (it can never latch).

* **⚛️ Scroll-Pill De-Reactification (the re-render fix)**: every scroll-away-from-bottom and return-to-bottom ran `setShowScrollToBottom` — re-rendering this entire (30k-line) App component mid-fling, several times per scroll gesture. The floating scroll button is now toggled imperatively via refs (`display` flip on the DOM node); **scrolling no longer triggers any React render at all**. Auto-scroll pause semantics preserved via the same ref. Also fixed a latent bug: the 150ms debounce timer was cleared but never nulled, so after returning to the bottom once, the pill could never reappear.

* **📜 Rendered-History Window (the long-chat DOM fix)**: chats rendered the ENTIRE message history — hundreds of box-shadow-painted bubbles invalidated on every scroll frame. The chat now renders the last 80 messages with a `▲ LOAD EARLIER (N HIDDEN)` pill at the top (each click reveals 80 more and preserves your scroll anchor); the window resets on chat switch. Absolute array indices are preserved for out-of-window messages, so React keys, the message-action menu, and edit/retry handlers all work unchanged.

* **📊 Scroll FPS Probe (diagnostics)**: set `window.mikaScrollFps = true` in the console, scroll, and rest — a frame-time histogram (avg fps, p95, worst frame) logs to the console for before/after comparisons on device.

---

# 🌌 GachaSwipe v2.5.34 // The Ghost-Badge & Lures-Pan Patch

### ✨ What's Fixed since v2.5.33

Small follow-up hardening from the post-v2.5.33 performance audit — two leaks that survived the fluidity release, plus confirmation that the big three fixes (per-token localStorage I/O, stuck 1Hz badge tickers, watchdog stand-down) are holding in the shipped bundle.

* **👻 Ghost Badge Anti-Resurrect (group chat)**: a `content` token event arriving after the batch's abort/catch/finally had already cleared `groupSpoolStatus` used `...(prev || {})` and rebuilt a **stage-less** status object (`{tps, charCount}`) from nothing. Nothing would ever clear it again — the MATRIX strip stayed "active" for the rest of the session. Both streaming updaters (the first-token `stage: 'generating'` flip and the 1s TPS tick) are now strict no-ops when the badge is already cleared.

* **🎞️ LURES Viewer Pan Leak**: opening SCHEDULED_LURES armed a 40ms auto-scroll interval inside an inline ref-callback that was **never cleared** — close the modal and it kept poking a detached DOM node ~25x/sec until the app restarted. The scroller is now a fully managed `useEffect` (open/close keyed): the interval and its touch/mouse/wheel stop-listeners are torn down on modal close and on unmount, and in-viewer content refreshes no longer re-arm a pan you already stopped.

* **🐾 Audit note (no change)**: the `CyberAudioNote` holoplayer holds decoded PCM `AudioBuffer`s for up to `ttsCacheLimit` (15) messages per chat by design (instant replay + the autoplay domino chain). Left untouched this release — bounded by the cache limit, and lazy decoding would risk the autoplay chain's readiness contract.

---

# 🌌 GachaSwipe v2.5.33 // The Fluidity Release

### ✨ What's New since v2.5.30 (combined changelog: v2.5.31 + v2.5.32 + v2.5.33)

**This is the big performance release.** Chat felt sluggish on every engine — cloud and local alike — and the lag lingered even after leaving a chat. Root cause found and purged, plus the badge-honesty work from the last two internal versions, all shipped together.

**PERFORMANCE (v2.5.33):**

* **⚡ Main-Thread I/O Purge (the sluggishness fix)**: the neural cadence engine re-read and re-parsed its entire telemetry store from `localStorage` on **every call** — and its getters run inside the MATRIX telemetry strip's render path (every render) and inside **every streamed-token commit** (up to 12×/sec while generating, on BOTH cloud and local engines). Inside the device WebView, localStorage is SQLite-backed synchronous I/O on the main thread — dozens of blocking reads + full JSON parses per second, growing worse as the telemetry store grew. The store now loads **once per session** into an in-memory cache; every getter is an instant memory lookup, and saves flush to disk on a 2-second debounced timer (with an immediate flush on app suspend/exit so no sample is ever lost).

* **🩹 Stuck Badge Tickers (the lag-after-exit fix)**: two separate 1-second status tickers could run forever once their badges leaked. A 1-on-1 stream that errored or yielded nothing before its first token left the `PREFILL` badge alive with its ticker re-rendering the whole app **every second, even after you left the chat** — now cleared on every stream exit path. The group chat `RETRY` badge had the same disease: its countdown hit zero and then kept emitting a fresh status object every second indefinitely if the re-arm guard never fired — now the badge and its ticker retire gracefully at zero.

* **🐕 Watchdog Stand-Down**: the camera-release watchdog `setInterval` started on the first LLM operation and then ticked until the app closed. It now stands down a few seconds after the last operation ends (re-checked at fire time, instantly re-armed when new activity begins). It guards generation episodes — it no longer haunts the app for life.

* **👻 Phantom Unfreeze Fix (cosmetic)**: cloud-model turns no longer log a "camera released after debounce" event for a freeze that never happened — the release is only scheduled when the freeze was actually armed (local tier).

**BADGE HONESTY (carried from v2.5.31 / v2.5.32):**

* **🔥 Warm-Cache GENERATING Badge (1-on-1 & Group)**: back-to-back turns in the same chat on the same engine no longer lie with `PREFILLING...` — while the previous turn's cache probe held (`CACHE` verdict), the MATRIX spool badge now reads `GENERATING...`, because the KV prefix is already prompt-evaluated and the wait is pure token generation. The badge honestly falls back to `PREFILL` after any image generation, any engine switch, or a `RECACHING` verdict.

* **⏱️ Prefill Countdown Removed**: the `PREFILL x% ~Ns` spool badge drops the time countdown — the ETA divided the full payload by a cold-start seed rate, so it was wrong in both directions (absurdly long when the KV cache was warm, jittery as the estimate self-corrected). The percentage survives: it tracks real progress against the same estimate and gets it mostly right. The badge now reads `[ MATRIX // PREFILL 42% • 8.3K ]` in both chat modes.

* **🔬 Image-Gen Cache-Eviction Forensics**: on-device image generation (selfies, photo regens, and the auto-fired monster-sprite after group batches) mounts the diffusion model and forces the host to unload the LLM — evicting the KV prefix cache on both swaps. SDK 7.5.2 exposes no model-pin/keep-alive API, so this is host-enforced RAM management, not an app bug: payloads were already verified append-only by the v2.5.27 forensics. What's new is proof: the activity governor now timestamps every image op vs chat op, and each `[CacheProbe]` console line is tagged `• IMAGE-GEN after last turn (host KV likely evicted)` when the next prefill is guaranteed cold — a 10-second console read confirms the culprit instead of a theory.

* **🧹 Neural Link Header Cleanup**: the redundant `[AUTO]`-style mode badge next to the `NEURAL_LINK_MODE // CADENCE & CACHE` title in settings is gone — the AUTO / CLOUD / LOCAL selector buttons were already the source of truth.

# 🌌 GachaSwipe v2.5.32 // The Honest Prefill

### ✨ What's New in v2.5.32

* **⏱️ Prefill Countdown Removed**: the `PREFILL x% ~Ns` spool badge drops the time countdown — the ETA divided the full payload by a cold-start seed rate, so it was wrong in both directions (absurdly long when the KV cache was warm, jittery as the estimate self-corrected). The percentage survives: it tracks real progress against the same estimate and gets it mostly right. The badge now reads `[ MATRIX // PREFILL 42% • 8.3K ]` in both chat modes.

# 🌌 GachaSwipe v2.5.31 // Warm-Cache Badge & Image-Gen Cache Forensics

### ✨ What's New in v2.5.31

* **🔥 Warm-Cache GENERATING Badge (1-on-1 & Group)**: back-to-back turns in the same chat on the same engine no longer lie with `PREFILLING...` — while the previous turn's cache probe held (`CACHE` verdict), the MATRIX spool badge now reads `GENERATING...`, because the KV prefix is already prompt-evaluated and the wait is pure token generation. The old PREFILL %/ETA was doubly wrong when warm: it divided the FULL payload by a cold-start seed rate, inflating the ETA on every consecutive turn. The badge honestly falls back to `PREFILL` after any image generation, any engine switch, or a `RECACHING` verdict.

* **🔬 Image-Gen Cache-Eviction Forensics**: on-device image generation (selfies, photo regens, and the auto-fired monster-sprite after group batches) mounts the diffusion model and forces the host to unload the LLM — evicting the KV prefix cache on both swaps. SDK 7.5.2 exposes no model-pin/keep-alive API, so this is host-enforced RAM management, not an app bug: payloads were already verified append-only by the v2.5.27 forensics. What's new is proof: the activity governor now timestamps every image op vs chat op, and each `[CacheProbe]` console line is tagged `• IMAGE-GEN after last turn (host KV likely evicted)` when the next prefill is guaranteed cold — a 10-second console read confirms the culprit instead of a theory.

* **🧹 Neural Link Header Cleanup**: the redundant `[AUTO]`-style mode badge next to the `NEURAL_LINK_MODE // CADENCE & CACHE` title in settings is gone — the AUTO / CLOUD / LOCAL selector buttons were already the source of truth.

# 🌌 GachaSwipe v2.5.30 // M.E.O.W. & P.A.W.S. Compile Resilience

### ✨ What's New in v2.5.30

* **🧪 Anti-Poison Guard (validate-before-write)**: both background compilers previously trusted the model reply blindly. If the engine returned an empty or non-XML response, every field silently fell back ("Unknown Status", "Location unknown.", "Level 1 Villager", "Starting Town", "Lint | Dust"...) and that garbage was written into the save as real profile data. Worse, the regeneration guards then treated the poisoned profiles as valid and blocked recompilation forever. Compiles now validate the XML before writing anything: an unparseable reply aborts cleanly with a toast + a console forensics dump, and existing data is never overwritten with placeholders.

* **♻️ Poisoned Profile Auto-Heal**: profiles already poisoned by the old behavior are detected by their exact fallback signature and treated as missing again — the M.E.O.W. permission prompt re-offers compilation when you open an affected chat, and both engines' regen guards let them recompile. Real model-written data never matches the poison signature.

* **🔊 Compile-Call Resilience**: both engine calls now carry a user-role nudge after the system prompt (the same pattern the song engine has used for ages — some backends ignore system-only requests), strip `<think>` reasoning wraps and markdown code fences before parsing, recover content from `reasoning_content` when the main content comes back empty, and use the stream's `finalContent()` if snapshots captured nothing. Tag matching is now attribute-tolerant (`<wardrobe style="x">` parses fine).

* **📉 Compile Forensics**: each compile logs its reply length, finish reason and a 120-char preview to the console (`[M.E.O.W]` / `[P.A.W.S]`) — if an engine ever goes quiet again, the log tells you exactly what it returned.

# 🌌 GachaSwipe v2.5.29 // Queue Play/Pause & Prefix Serenity

### ✨ What's New in v2.5.29

* **⏸▶ Group Queue PLAY/PAUSE Button**: group chats now have a dedicated in-chat queue switch — a custom play/pause button left of the submit button. Pause (purple bars) stops the lurker from spooling new batches and lets the current queue drain naturally into silence; Play (green triangle) resumes spooling instantly with no lurker wait. The choice is saved **per model tier**: cloud defaults ON, local defaults OFF, and each tier remembers its own state across sessions, saves, exports, and custom presets. The CONVERSATION PAUSED banner and the MATRIX telemetry strip both reflect the paused state (`[ MATRIX // ⏸ QUEUE PAUSED — TAP ▶ OR TRANSMIT ]`).

* **▶ Dynamic Play on the Send Button**: with the queue paused and the input empty, the transmit button morphs into a green play button — tapping it resumes the queue. Sending a normal message also resumes spooling automatically. Typed messages always transmit normally; the play action only exists when the input is empty.

* **🔇 One Voice Toggle (Synthesis + Autoplay)**: the chat audio button now controls synthesis and autoplay as one coupled switch — ON starts synthesizing new messages and playing them automatically, OFF stops both. Identical semantics in group chats (enableTtsGroup) and 1-on-1 chats (enableTtsStandard), so the button always reflects what will actually happen for the chat you are in.

* **🧸 Major Life Events Disabled in Group Chats (prefix cache fix)**: the v2.5.28 `[CacheProbe]` forensics traced the mid-session prefix mutation to major life events — the recalibration regenerates the girl’s daily_routine, which flows through getCharacterStatus() into every subsequent group batch roster, busting the prompt prefix right after the event log (PREFIX MUTATED at char 765). Routine recalibration is now suppressed in group chats entirely (with a console notice per suppressed event); 1-on-1 chats keep the feature. Group payloads stay append-only, so live group sessions should ride the same cached prefix for their whole lifetime.

* **🏗 CACHE/RECACHING Badge Borderless**: the verdict pill lost its border and background — it now renders as glowing text only (green CACHE / pink RECACHING with neon text-shadow), so it no longer collides with the input bar edge or clips on narrow screens.

* **🐈 Lurker Gate Log Spam Fixed**: the group lurker’s pause gates (auto-pause toggle and the new queue gate) re-barked an `idle:` line through the 5s diagnose throttle on every 3s beat, forever — with local-tier queues paused by default that meant a constant console drumbeat. Gate verdicts now log once per state entry (one line when a gate closes, one when it reopens, silence in between), matching the v2.5.26 batch-notice treatment.

# 🌌 GachaSwipe v2.5.28 // Cache Forensics & Bigger Batches

### ✨ What's New in v2.5.28

* **🔬 Prefix Cache Forensics (the RECACHING lie detector)**: the CACHE/RECACHING badge measures prefill timing, but it can't tell WHO busted the cache — us or the host. Every group batch now diffs its payload against the previous batch for that chat (sysPrompt djb2 hash + first-divergence scan of the user payload) and appends the verdict to the `[CacheProbe]` console line: `APPEND-OK (+N chars)` means our payload grew strictly append-only and any RECACHING verdict is host-side KV eviction (session outgrew the rolling context window) or probe noise; `SYS-PROMPT MUTATED` / `PREFIX MUTATED at char X/Y` pinpoints an app-side cache bust to the exact byte — making future bust-hunts (the suspected location-update / wardrobe-addition rewrites) a 10-second console read instead of a theory.

* **⏱️ Rising GENERATING Timer Removed**: the MATRIX telemetry line above the input bar counted elapsed seconds since the batch began — starting at 0 and climbing for as long as the local engine ground through a big payload (400s+ on long local sessions), telling you nothing a wall clock can't. The counter is gone: `GENERATING` now shows only live `T/S`, and the `PREFILL x% ~ETA` progress (a countdown, not a count-up) is unchanged.

* **📌 CACHE/RECACHING Badge Pinned Right**: the cache verdict pill rode inline after the MATRIX telemetry text — as the text grew (`Q:2 • PREFILL 42% ~12s • 18.3K`) the pill drifted and could clip. The telemetry strip is now a flex row: status text owns the left (ellipsis on overflow), and the CACHE/RECACHING verdict is pinned hard to the right edge of the MATRIX strip where it always lives.

* **📦 Bigger Auto-Queue Batches**: auto-queued group batches grew from `3-4` local / `2-6` cloud (varied by flow preset) to a uniform **`3-5` local / `4-6` cloud** across all four flow presets (dynamic, hyper, chill, relaxed), gated on the effective engine tier as before. One spool round-trip now stocks more playback — longer animation breathing room between LLM calls on the slow local engine, fewer wake/sleep cycles on cloud.

---

# 🌌 GachaSwipe v2.5.27 // The Eternal Prefix Cache

### ✨ What's New in v2.5.27

* **🔮 Append-Only Group Window (the 35-message cache killer, slain)**: once a group session passed 35 messages, the old window cap slid `startIndex` forward by ONE message every single turn — shifting the payload's first tokens each turn and forcing Layla's KV prefix cache to re-evaluate the ENTIRE log from token 0 on EVERY batch, forever. The cap is gone: the group path now anchors its window once at session seed (last 5 messages + 2 memories) and grows strictly append-only for the whole session — byte-identical architecture to the 1-on-1 path (which never had the cap). Layla's rolling context window owns overflow, exactly as it already does in 1-on-1. Long group sessions should now prefill at cache-hit speed all session long. The dead duplicate `getRecentMemories(..., 4)` call at seed time is also removed.

* **⚔️ Live P.A.W.S. Stats Evicted From the Sys-Prompt (RP-mode cache fix)**: in RP group mode, live HP/Mana/Inventory/Status lines were baked into `participantInfo` inside the sysPrompt — mutating the cached prefix every combat turn and re-evaluating the whole payload each time, even with a perfect append-only history. Stats now render as a `[LIVE P.A.W.S. STATUS]` block in the per-turn `dynamicDirective` tail (alongside the status tail and recalled memories): the sysPrompt stays byte-stable for the entire session while the model still sees fresh stats every batch.

* **📡 CACHE / RECACHING Badge (first-ever cache visibility)**: the SDK exposes no cache telemetry, so we derive it — `estimateCacheHit()` in the neural cadence engine compares how many payload chars the engine could plausibly prompt-evaluate during the observed prefill window (learned `avgPrefillCps` × elapsed) against the actual payload size. If only a small fraction could have been evaluated, the prefix cache HELD; if the elapsed time is consistent with re-evaluating most of the payload, the cache BUSTED. The verdict renders as a green `CACHE ~x%` / pink `RECACHING ~x%` pill next to the MATRIX telemetry line in both chat modes (re-armed every turn at first token), plus a `[CacheProbe]` console line with prefill time, payload size, and hit ratio for on-device tuning. This is the truth-light that verifies the two fixes above: long sessions and RP combat should hold `CACHE` and only flip briefly on cold-start.

* **📊 Prefill % From Turn One (tier-seeded estimator)**: `getPrefillEstimate()` used to return `null` until the first real prefill sample landed — so the very first turn in a fresh session showed plain `PREFILLING` with no percentage. It now falls back to a governor-tier seed (local ≈ 40 c/s, cloud ≈ 2500 c/s) so the `%`/ETA renders from the first message; the first real telemetry sample takes priority and the estimate self-corrects.

* **🔌 Stale STREAM Badge Fix (1-on-1)**: `liveTokPerSec` kept the previous reply's T/S value after the stream ended, so the next message's prefill phase instantly fell into the `STREAM // …T/S` branch and never showed the `PREFILL x%` estimator. It now resets to `null` at stream start — the MATRIX line shows the payload % during prefill, then hands over to STREAM at first token.

---

# 🌌 GachaSwipe v2.5.26 // Compositor-Safe Blink & Progressive Group Enqueue

### ✨ What's New in v2.5.26

* **⚡ Compositor-Safe Caret Blink (1-on-1 parity with Layla chat)**: the on-device perf trace showed the GachaSwipe caret's `cursorBlinkGlow` animating `text-shadow` — every blink frame forced a full element repaint (compositors can't animate text-shadow), while the Layla-native global loader caret is opacity-only and rides the compositor for free. The keyframes now animate ONLY `opacity` (0.75s ease-in-out 50% dip — identical cadence, zero layout risk), and the cyan glow became a STATIC `text-shadow` painted once per message line. No `will-change` sledgehammer, no paint per frame — the caret now blinks at the same smooth 60fps parity as Layla chat even while the model spools.

* **⌨️ Typing Dots Un-frozen (spool dots stay live)**: v2.5.25's stream freeze quarantined `.typing-dot { animation-play-state: paused }` under `body.mika-stream-freeze` — but the dots run the opacity-only `cursorBlink` (compositor-safe), so pausing them was over-quarantine that left the "she's spooling…" dots frozen solid while the camera was held. The pause rule is gone (the `.streaming-pulse` pause for `.mika-stream-freeze` remains); dots now pulse through the freeze.

* **🎬 Progressive Per-Reply Group Enqueue (one-by-one, at last!)**: group batches used to sit frozen behind the FULL stream — every reply dumped only after the whole batch parsed. Now each fully-formed `<reply>` block is claimed by a live scan (throttled to ~700ms / 40-char deltas) the moment its `</reply>` closes, resolved through the SAME shared `parseGroupBatchXml()` used at completion (guaranteed index alignment), timed by the same `calculateGroupTurnCadence()` re-anchored to the live playback tail, and pushed into the playback queue immediately. Reply blocks cascade in one-by-one while the model still streams; the `Q:` count ticks visibly. Side-effects (P.A.W.S. HP/mana, wardrobe additions, GPS/location sync, monster state) still apply EXACTLY ONCE at full parse, duplicate pushes are impossible via a per-stream claim counter, memory-turn batches follow the legacy whole-batch path (their `<memory>` compiler output needs the final parse), and the empty-batch retry guard now understands live enqueues (no false 5s retries). System-action lines (⚔️ P.A.W.S., 💥 enemy damage, purple DM narration), photo companions, and P.U.R.R. pre-synthesis all replicate through the live path with identical entry shapes; the completion path re-tags live entries with the true final batch total.

* **🔇 Lurker Log Spam Fix**: the 3s queue-refill lurker logged `queue low … but a batch is generating` on every ~6s loop tick while a batch streamed. It now logs that diagnosis at most ONCE per generating window (re-armed in the spooler's `finally`).

* **🏆 Soulbound/Nemesis Persistence Fix (the replaying trophy popup)**: `unlockAchievement`'s background save passed `force=false` despite its "Force an isolated background save" comment — and `handleSaveSession` silently DROPS non-forced saves while `isBooting`/`isAutoResuming`, exactly the new-session→enter-chat window — while later message-saves are isolated chat saves that skip the `index_data` table, so `achievements` was never rewritten that session and the popup replayed every launch. The save is now `force=true` (boot guard cannot eat it), and the duplicate GLOBAL `soulbound`/`nemesis` re-award (which fired a second identical popup seconds after the per-girl award) is removed. Temp `[SparkAudit]` logs show unlock checks, save fires (with boot/resume guard state), and loader-restore counts for live verification.

* **📊 Prefill Payload % (both chat modes)**: the silent "PREFILLING" wait now shows real progress. `recordLlmTelemetry` learns each engine's prompt-eval throughput (chars between request start and first token, EWMA α=0.25, persisted as `avgPrefillCps`), and `getPrefillEstimate(modelKey)` exposes it. The group spool badge and the 1-on-1 `MATRIX // LINK` line (via a new `buddySpoolStatus` payload tracker + ticker) render `[ PREFILL 42% ~12s • 18.3K ]` once a sample exists — plain `PREFILLING`/`COMPILING` until then.

---

# 🌌 GachaSwipe v2.5.25 // The O(Tail) Stream Engine & Bubble-Level Budget

### ✨ What's New in v2.5.25

* **🩺 Burst-Stall Diagnosis Closed (v2.5.24 device data)**: Master's console capture proved the Tier Verdict + Freeze Governor fully engage on device (`🎬 freeze armed — first op: chat.stream (local tier)`, `📊 Tier VERDICT: LOCAL — locked`), yet the stream still averaged **3.7 c/s (~1 t/s)** over 87.8s in burst-then-pause cycles. With backgrounds frozen and input-bar blur suspended, the remaining contention was bubble-level paint work + the per-commit React/render tax — all eliminated below.

* **🫧 Bubble-Level Stream Budget (CSS)**: message bubbles render OUTSIDE `.mika-chat-canvas` (that canvas is the background layer only), so the freeze governor never touched them. While the camera is frozen, `body.mika-stream-budget` now strips the frosted-glass `backdrop-filter` blur from `.buddy-message` bubbles, and `body.mika-stream-freeze` pauses `.streaming-pulse` (an infinite 1.5s `box-shadow`/`text-shadow` animation — paint-heavy and un-compositable — that ran on the streaming bubble for the ENTIRE stream) plus the audio-badge `typing-dot` blink. `.holo-bubble-phase` also drops its latched `will-change: opacity, transform, filter` (same lesson as the v2.5.23 `cyber-phase-chunk` fix).

* **O(Tail) Direct-Stream Format Cache**: 1-on-1 local streams render through the direct pipeline, which re-formatted the ENTIRE growing message (full parse + React element rebuild) on every stream commit. `formatMessageText` gains a direct-stream cache mode: the rendered head is pinned at the last safe part boundary (plain parts may be cut mid-way; action parts, dice chips, and surrogate pairs never split) and only the still-mutating tail re-renders per commit. Any retro-mutation of the head (SMS asterisk-pair close, quote strip) fails the prefix check and falls back to a full re-format — correctness never depends on the cache.

* **Render-Render Memo Guard**: `HolographicMessage`'s `React.memo` was defeated by the inline `onComplete` arrow at every call site — EVERY bubble in history re-rendered (full format + element rebuild per bubble) on every stream commit, TPS tick, and App render. A custom comparator ignores `onComplete` identity (both pipelines latch it into a ref on render) so only the actively-streaming bubble re-renders; history bubbles are skipped entirely.

* **Adaptive Commit Cadence v2 + Commit-Tax Telemetry**: the stream commit interval now stretches with message length (160→up to 400ms local, 80→200ms cloud) because per-commit cost grows with the message; and every commit's wall time is sampled — a one-line `[LLMGovernor] ⏱️ stream commit tax: avg Xms × 24 commits (msg N chars)` report hits the console every ~24 commits, so on-device tuning reads real numbers instead of vibes.

* **Tag-Free Stream Fast Paths**: `extractThoughts` (1-on-1 stream), `detectBackgroundXmlTask`, and the `updateDisplay` XML shredder now bail out on a single `indexOf('<')` probe when the snapshot contains no XML — a tag-free roleplay reply (the common case) drops from ~40 regex passes per commit to essentially zero (benchmarked locally: ~60x cheaper per commit; output is bit-identical).

---

### 📦 Installation for Layla Network
Download `GachaSwipe_V2.5.25.zip` (or `GachaMIKA.zip`) and load it directly into Layla.

---

## 📜 Previous Release Archives

### ✨ Highlights & Combined Changelog (v2.5.24)

* **🎚️ Once-Locked Engine Tier Verdicts (The Smart AUTO Toggle)**:
  * **Classified Once, Locked Forever**: The first completed stream records a silent, local-biased tier verdict per engine into the same telemetry file (`tierVerdict` + `verdictAt`), and it never flips mid-stream again — spool thresholds, render mode, and the freeze governor all inherit the same stable classification. `'Default (Auto)'` is re-measured **once per session** (the host may swap its default model between launches), mirroring the once-per-session sentiment engine script.
  * **Local-Bias Codified (Master's Rule)**: a model is classified **local** unless it demonstrates ≥45 chars/sec AND <4s latency — Gemma 4 E4B at 8-10 t/s (~30-38 c/s) now correctly lands as LOCAL (the old `<24 c/s || >8s` rule mislabeled it cloud!). A genuinely-unknown engine defaults to local until classified, per Master's preference.
  * **`getGovernorTier()` Resolver**: verdict → engine-name rule → live profile → LOCAL. Powers the freeze governor deterministically.

* **⚡ Stream-Time Render Budget (Restore Native 8-10 t/s!)**:
  * **Blur Suspension**: while the camera is frozen, `body.mika-stream-budget` strips the 24px backdrop-filter blur from the chat input bar (and 10px control buttons) — that blur repaints under EVERY streaming commit and scroll tick, with the compositor fighting llama.cpp for the CPU (the reason streaming hit 2-3 t/s while Layla native hit 8-10, and why screen-off ran at full speed).
  * **Local Commit Cadence 160ms**: local streams commit UI text at ~6.7fps instead of 12.5fps — token ingestion untouched, but the React/layout/paint tax drops ~2.5x during generation. Cloud streams keep 80ms.
  * **TPS Tick Throttle**: live token/sec updates fire at 1Hz instead of 2.5Hz (both 1-on-1 and group spool) — each tick is an App-root re-render.
  * **Freeze Now Engages for Default/Auto Engines**: the verdict system closes the `'Default (Auto)'` name-rule hole that left cinematic backgrounds animating at 60fps through every local stream.

---

### ✨ Highlights & Combined Changelog (v2.5.23)

* **🎞️ Freeze Governor v2.1 — Deterministic Tier & Self-Healing Camera**:
  * **Config-Stable Tier Decision**: auto mode no longer consults live cadence telemetry for freezing — a fast local spool profile used to flip the tier to 'cloud' mid-batch (the group spooler's own `recordLlmTelemetry` wrote under `selectedEngine`), silently killing every subsequent freeze. Auto now uses the stable engine-name rule (`getKnownLocalEngine`); explicit local/cloud modes are honored as-is.
  * **Self-Healing Release Watchdog**: a 5s governor watchdog force-releases the freeze if the camera is ever frozen with zero in-flight ops, so animated backgrounds can never stay stuck forever.
  * **WKWebView Resume Nudge**: on release, a style flush plus a one-frame `mika-camera-resume` class asserts `animation-play-state: running` on all cinematic/panning elements — fixes backgrounds that froze mid-crossfade and never resumed.
  * **Leak Scanner**: ops running >90s are reported to the device console with tag + age.
  * **Idempotent SDK Wrap**: the governor can never double-wrap the Layla SDK (double begin/end pairs would fake ghost activity).
  * **Straggler Pause Rules**: `subtlePan`, `chatBlendBg_*`, `chatCinematicPan`, `chatHoloFlicker`, `chatHoloScan` now pause even when rendered outside the chat canvas.

* **📣 Group Auto-Spool Revival (Queue Refills After Drain!)**:
  * **Semantic Gate Split**: `backgroundSpooling` now governs AWAY-from-chat spooling only — while you are actively in the group chat, the queue ALWAYS refills, even with the battery toggle off (this was silently blocking in-chat refills!).
  * **Every Gate Is Diagnosable**: the 3s lurker logs exactly why it is idle (auto-pause, cooldown remaining, batch in flight, spooling-off) throttled to one line per 5s.
  * **Empty-Batch Black-Hole Guard**: a spool batch parsing to zero messages now auto-retries after 5s instead of vanishing silently.
  * **Wrapped-Instance Priority**: the group spooler now prefers the governor-wrapped SDK instance explicitly.

* **⌨️ Typewriter v2 — rAF Cadence & Stable-Phase Chunks**:
  * **Stable-Prefix Format Cache**: only the growing tail chunk re-formats per tick; the completed prefix is cached with stable React keys, so the 0.22s `cyberTextPhase` entry fade plays ONCE per part instead of restarting ~60x/sec (the flashing typewriter indicator!).
  * **rAF Engine Loop**: replaces the setTimeout cascade — one commit per animation frame max, backlog-scaled multi-char steps (up to ~500 chars/sec for fast local spools), no timer accumulation.
  * **10Hz Scroll Sync**: the `chat-scroll` event now fires ~10x/sec instead of every single tick.
  * **GPU Layer Hygiene**: removed `will-change` from per-chunk phase spans.

---

### ✨ Highlights & Combined Changelog (v2.5.22)

* **🎥 LLM Activity Governor v2 (New Module `src/utils/llmActivityGovernor.js`)**:
  * **Every Local Generation Freeze-Frames the Camera**: The shutter freeze trigger no longer depends on the visible typewriter. The app now wraps the single shared Layla SDK instance (`wrapLaylaSdkWithActivityGovernor`) — `chat.completions.stream`, `chat.completions.create`, and `images.generateImage` (all call sites: selfie/photo pings, forge, card updates, out-of-band prompts) automatically register into a ref-counted activity registry. ANY in-flight generation on a local engine freezes the cinematic background.
  * **Group Chat Spooler Fixed (v1 Bug)**: Group chats now freeze correctly! The playback events (`visual-stream-start/end`) never covered the background spooler's own LLM stream, so the v1 shutter never engaged in groups. The governor now fires on the actual generation event — the freeze holds across batch → batch spooling gaps and releases ~2s after the final generation, while the queue plays back over the re-animated background.
  * **Seamless 2s Step Bridging**: A debounce window bridges the natural chained steps (text → photo-prompt → image gen; batch → next batch) so the background never flickers between steps. New operations arriving inside the window cancel the pending release; after the final operation, a gentle shutter flash-out resumes panning/scanline motion from the exact frozen frame.
  * **Leak-Proof Completion & Abort Safety**: Completion is detected via the wrapped `finalContent()` (every call site awaits it) with `end/error/abort/done` event hooks and an `abort()` fallback; stop-button aborts release the activity slot through `finally`.
  * **TTS & Queue Playback Stay Animated**: Speech synthesis (`layla.tts`), audio playback, music, and translations are deliberately NOT governed — the background stays animated while the playback queue runs.
  * **Cloud Engines Unchanged**: `configureActivityGovernor` reads the live neural-link tier (`getEffectiveNeuralLinkTier`); cloud models stream exactly as before with zero freeze overhead.
  * **Mount-Safe & Crossfade-Aware**: `resetActivityGovernor()` clears timers/classes on unmount; the 15s background crossfade cycle is also held while the camera is frozen.

---

### ✨ Highlights & Combined Changelog (v2.5.19)

* **🎥 Shutter Freeze v1 & Stream Performance Overhaul**:
  * **Frame-Exact Stream Freeze (v1)**: Introduced the `mika-stream-freeze` camera system — a shutter flash (`mika-shutter-in/out`) followed by a 180ms-delayed freeze-frame that pauses cinematic background animation (`chatHoloFlicker`, `chatCinematicPan`, `chatHoloScan`, `subtlePan`, scanlines) during local model streaming, plus the `.mika-shutter-fx` overlay in the chat canvas.
  * **80ms Stream Commit Governor**: Batched per-token React commits to a 12fps commit schedule inside `streamChatReply` — eliminating the ~60fps rAF render storm that stuttered local-LLM streaming.
  * **React #300 Crash Fix (`NEURAL_MATRIX_DESYNC`)**: Root-caused and fixed a mid-mount hook-order flip in `HolographicMessage` that crashed when the neural-link tier flipped on the first telemetry sample. `RoleplayRenderer` is now split into `HolographicDirectMessage` / `HolographicTypewriterMessage` with a memoized, hooks-safe `HolographicMessage` selector for clean remounts.
  * **Stable `streamBypassLimit`**: Memoized the typewriter-bypass decision (keys: active chat, group mode, neural-link mode, selected engine) at all 3 call sites, preventing prop-flip churn.
  * **Near-Bottom Scroll Guard**: Auto-scroll during streaming only engages within 120px of the bottom, so reading back through history no longer fights the stream cursor.

### ✨ Highlights & Combined Changelog (v2.5.18)

* **📈 1-on-1 Streaming Optimization & Live Telemetry**:
  * Optimized 1-on-1 streaming, fixed background group spooler queuing, and enhanced the live token/cadence telemetry feedback engine (`recordLlmTelemetry`, `neuralCadenceEngine`).

### ✨ Bulletproof Chat Persistence & Synchronous Session Save Engine (v2.5.17)

* **💾 Bulletproof Chat & Session Persistence (1-on-1 & Group Chats)**:
  * **Zero-Lag Isolated Save Engine**: Overhauled `handleSaveSession` with an ultra-fast isolated path (<5ms). When saving conversational turns, GachaSwipe bypasses the heavy, blocking full-database sync (skips re-saving `themes_data`, skips recursive media crawls, skips indexing overhead) and writes strictly the active chat directly to the `chats` table.
  * **Eliminated React Stale Closures via `inboxRef`**: Added synchronous ref tracking (`inboxRef`) directly tied to all message additions, stream completions, and edits. Chat persistence now immediately writes up-to-the-millisecond conversation state to SQLite without waiting for React render cycles or suffering from stale closures.
  * **Group Chat Auto-Persistence Fix**: Resolved a critical issue in `processQueue` where character messages in group chats failed to save to the database due to an undefined chat ID parameter. Every group turn is now reliably persisted to SQLite as it sends.
  * **Instant User Message Persistence**: User messages in both 1-on-1 and Group Chats are now persisted to SQLite the exact moment they are transmitted, eliminating message loss if the user exits mid-generation.
  * **Flawless Session Exit Flushing**: Exiting a conversation via the `<` back button or closing the messages drawer now forces an immediate, synchronous flush of the active chat before unmounting/clearing state.
  * **Universal App Lifecycle Flusher**: Integrated `visibilitychange` (hidden), `pagehide`, and `beforeunload` lifecycle hooks to ensure all active conversations are automatically saved if the user switches apps or closes the WebView.

---

### ✨ Highlights & Combined Changelog (v2.5.16)

* **🧠 Hybrid RAG Memory Recall & Prefix Cache Harmony (1-on-1 & Group Chat)**:
  * **Memory Injections Restored**: Reconnected the keyword-weighted RAG memory recall engine that was previously bypassed when Prefix Caching was enabled by default. Both 1-on-1 chats and Group Chats now actively recall past moments based on conversational topics.
  * **Zero Cache Busting via Ephemeral Tail Routing**: System prompts (`sysPrompt`) remain 100% frozen in Layla's KV prefix cache. Recalled memories are injected strictly into the **ephemeral tail** of the latest user turn (`finalHistory` in 1-on-1, `dynamicDirective` in Group Chat), ensuring instant first-token inference without invalidating previous prompt tokens.
  * **Active Context Lock & 10-Minute Timeout**: Integrated fuzzy monologue normalization and an in-memory injection cooldown. If a memory is still present in the active conversation window (`cleanHistory`, `seededMemories`, or `injectedMemories`) or was injected within the last 10 minutes, repeat injections are blocked to prevent robotic spam.
  * **Expanded 4-Letter Keyword Scoring**: Lowered the keyword parsing threshold to `w.length > 3` with an expanded stopword filter, allowing high-impact core nouns ("cafe", "date", "park", "game", "kiss", "cats", "food", "trip") to match with 3x word-boundary weighting.

* **⚡ Local LLM Streaming Throughput Acceleration**:
  * **Unlocked Typewriter Bottleneck**: Overhauled the visual text stepping buffer in `HolographicMessage`. Local models running at 8–10+ tokens/second were previously throttled by a 1-character-per-tick ceiling.
  * **High-Throughput Stepping**: Implemented dynamic multi-tier stepping (stepping 2–5+ characters per tick when tokens are incoming), boosting visual throughput to 60–100+ chars/sec (~12–15+ tokens/sec) for a fluid, lag-free local model experience while still smoothly pacing massive cloud chunk dumps.

* **🔮 Background XML Telemetry Badge**:
  * **Real-Time Task Feedback**: When models emit reasoning thoughts (`<think>`), background memories (`<memory>`), P.A.W.S. calculations (`<paws_update>`), routine/location updates (`<current_location>`), or photo compositions (`<image_prompt>`), a sleek `#FFD700` cyber-gold badge dynamically phases in below the active bubble (`🔮 NEURAL REASONING...`, `💾 FORMING MEMORY...`, etc.).
  * **Seamless Phase-Out**: Automatically phases out the moment visible dialogue begins, providing immediate visual feedback so you know the model is working instead of wondering if the app froze. Leaves all permanent badges (`💾 MEMORY LOGGED`, `🧠 MEMORY RECALLED`, `📡 UPLINK QUEUED`) completely undisturbed.

### ✨ Highlights & Combined Changelog (v2.5.15)

* **🩺 SQLite Database Doctor & Self-Healing Engine**:
  * **Safe SQL Timeout Protection (`safeExecuteSql`)**: All SQLite read/write operations now enforce a strict safety timeout (6–8s). If the Layla native bridge or an SQLite lock hangs, the query rejects cleanly instead of locking `isSavingRef` and accumulating runaway background save timers.
  * **Automated SQLite Diagnostics (`checkDatabaseHealth`)**: Added comprehensive health checks using `PRAGMA integrity_check(5)`, live table presence validation, and a non-destructive read/write test on `app_meta` to immediately flag corrupt B-trees and malformed disk images.
  * **Non-Destructive Database Maintenance (`repairDatabaseQuick`)**: Flushes and truncates the WAL journal (`PRAGMA wal_checkpoint(TRUNCATE)`), rebuilds damaged B-tree indexes (`REINDEX`), and defragments storage pages (`VACUUM`) in a single tap.
  * **Emergency Salvage & Schema Rebuild Engine (`salvageAndRebuildDatabase`)**: If severe database corruption occurs, GachaSwipe rescues accessible chat history, waifu records, custom themes, and user settings, drops the broken tables, reapplies canonical schemas, and restores state cleanly.
  * **Elimination of Silent Auto-Save Crashes**: Tracks consecutive auto-save failures (`consecutiveSaveFailuresRef`). If background writes stall repeatedly on iOS, the app immediately raises a helpful in-app toast notification directing the user to run the Database Doctor.
  * **Integrated Database Doctor UI**: Added dedicated `🩺 RUN DATABASE DOCTOR` buttons in both the **Settings** screen and the **I/O Task Manager** modal (`isSaveManagerOpen`).
* **🩺 Interactive Database Doctor Modal & Universal Recovery**:
  * **Interactive Diagnostic Terminal**: Running the Database Doctor now launches an interactive cyberpunk modal for all users, streaming real-time SQLite health status, table integrity checks, and diagnostic logs.
  * **Consistent & Forced Recovery for Everyone**: Users can now trigger a **Force Database Rebuild & Salvage** at any time—even when diagnostics report a healthy database. This ensures complete consistency across all devices, allowing users to salvage memory state and restore clean SQLite schemas on demand.
  * **Quick Optimization Suite**: Easily trigger WAL log checkpoints (`PRAGMA wal_checkpoint(TRUNCATE)`), reindexing, and vacuum operations directly from the interactive modal.
  * **Mobile & iOS Portrait Layout Fix**: Fixed `.custom-dialog` styling with `max-height: 85vh; overflow-y: auto;` and text wrapping (`word-break: break-word; overflow-wrap: break-word;`) so diagnostic reports and confirmation dialogs fit on iOS mobile screens in portrait mode without pushing action buttons offscreen.

* **🩺 SQLite Database Doctor & Self-Healing Engine (v2.5.12 Foundation)**:
  * **Safe SQL Timeout Protection (`safeExecuteSql`)**: All SQLite read/write operations enforce a strict safety timeout (6–8s). If the Layla native bridge or an SQLite lock hangs, the query rejects cleanly instead of locking `isSavingRef` and accumulating runaway background save timers.
  * **Automated SQLite Diagnostics (`checkDatabaseHealth`)**: Comprehensive health checks using `PRAGMA integrity_check(5)`, live table presence validation, and a non-destructive read/write test on `app_meta`.
  * **Non-Destructive Database Maintenance (`repairDatabaseQuick`)**: Flushes and truncates the WAL journal, rebuilds damaged B-tree indexes, and defragments storage pages.
  * **Emergency Salvage & Schema Rebuild Engine (`salvageAndRebuildDatabase`)**: Rescues accessible chat history, waifu records, custom themes, and user settings, drops damaged tables, reapplies canonical schemas, and restores state cleanly.
  * **Elimination of Silent Auto-Save Crashes**: Tracks consecutive auto-save failures (`consecutiveSaveFailuresRef`) and alerts users to run the Doctor if background writes stall repeatedly.

* **🛡️ iOS WKWebView & Grey Screen Defense**:
  * **Cyberpunk React Error Boundary**: Resilient global and card-deck Error Boundary (`ErrorBoundary.jsx`) with self-healing options (`REBOOT_DECK` and `SKIP_ANOMALY_CARD`), guaranteeing that uncaught rendering exceptions never teardown `#root` into an empty grey screen.
  * **Defused 3D Perspective Metal Singularity**: Eliminated the `translate3d(..., 1000px)` division-by-zero conflict with `.card-area`'s `perspective: 1000px`, preventing WebKit Metal GPU compositor crashes on iOS devices (A17/A18 Pro).
  * **WKWebView Texture & Memory Optimization**: Hardened `LoadingCard` background fallback memory layers with GPU hardware hints (`transform: translateZ(0)`, `willChange: transform`) and optimized blur filters to prevent memory spikes beyond iOS Jetsam ceilings.
  * **Safe Theme Chaining & Settings Navigation**: Fixed unsafe chaining on `themes[selectedThemeId]?.buttons` that previously crashed when returning to the swipe screen from settings. Theme selection now safely auto-heals to the primary active theme pack.
  * **Malformed Card Null Guards**: Added defensive fallbacks across `SwipeCard` for missing `.name`, `.id`, and array properties, ensuring interrupted or partial generations never crash the deck.

* **⚡ Neural Prompt Prefix Caching Engine (Enabled by Default)**:
  * **Instant Local Inference**: Activates Layla's KV prefix cache freeze by locking system prompts, formatting rules, and character lore in an immutable header. Repetitive model re-evaluations are completely eliminated, cutting time-to-first-token down to near zero for local GGUF models.
  * **Default for All Users & Presets**: Prefix Caching is now automatically active by default for both new and existing users—even across pre-existing saved presets—ensuring maximum local performance without manual setup.
  * **Streamlined Token Efficiency Matrix UI**: When Prefix Caching is enabled, manual pruning sliders and buttons automatically disappear to avoid overwhelming users with redundant controls. When disabled, the entire manual pruning matrix smoothly phases in right below the toggle.
  * **Legacy Pruning Retained for Cloud APIs**: The legacy context pruning and truncation engine is preserved specifically for users operating pay-per-token remote cloud models who require strict manual context budgeting.
  * **Startup Announcement Terminal**: Features an interactive, one-time startup terminal popup explaining Prefix Caching and awarding 15 bonus Sparks.

* **🔮 Lucid Dream Holodeck Full Release**:
  * **Dynamic Chamber Launch**: Enter the Lucid Dream Holodeck from SYS_CTRL in any 1-on-1 chat! Embark on surreal, uninhibited dream adventures unconstrained by waking schedules or real-world locations.
  * **Tri-Vector Dream Seed Diversification**:
    * **Seed 1 (Algorithm Vector)**: Dynamically weaves 1–2 of your top learned preference traits into a surreal dream premise.
    * **Seed 2 (Shared Memory)**: Anchors into recent character memories or chat highlights, exaggerating real moments into dream adventures.
    * **Seed 3 (Persona Blueprint)**: Delves deep into the character's core quirks, archetypes, and secret desires.
    * **Universal Seed Influence**: Direct the vibe of all 3 dream seeds with a custom thematic prompt!
    * **Clean Card Layout**: Clean, bold creative titles with zero squishing or awkward wrapping.
  * **Independent Dream Attire Matrix (Top, Bottom & Undergarments)**:
    * Synthesizes discrete, theme-appropriate tops, bottoms, and matching undergarments (e.g. racing jacket & racing shorts for racing dreams; trenchcoat & trousers for detective dreams).
    * Scrubbed legacy multi-dress string collisions (like Panko's `"White sundress, pink hoodie dress"`) that previously caused image models to hallucinate two characters.
    * Full States of Undress tracking (`DRESSED`, `DISHEVELED`, `UNDERWEAR`, `EXPOSED / NUDE`) seamlessly aligned with M.E.O.W. prompt standards.
  * **Live Cyberpunk Hacker Loading Screen**: Streams real-time progress while synthesizing the non-Euclidean environment, background diffusion, and chroma-keyed character sprite.
  * **Diagnostic Chamber & Live Metrics**: Real-time tracking of Lucidity percentage, Volatility, Immersion Status, and Attire breakdown.

* **🧠 Neural Memory & Context Pipeline Tweaks**:
  * **Timestamp Sanitization**: Stripped redundant clock times and calendar dates from inline memory tags. Timestamps are logged silently in SQLite/Layla metadata, keeping the model's active working memory clean and focused on narrative continuity.
  * **Assistant-Only Memory Counting Trigger**: Memory extraction triggers now strictly count assistant turns rather than inflating on rapid user follow-up bubbles.
  * **Strict Physical Location Sanitizer**: Implemented `cleanPhysicalLocation` with an abstract concept blocklist (e.g. blocking meta tags like "Clandestine Information" or dialogue snippets) to strictly constrain location tags to 1–3 word physical environments.
---
