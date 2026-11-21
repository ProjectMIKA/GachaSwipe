# 🌌 GachaSwipe // Project M.I.K.A.

Welcome to **GachaSwipe**, the bleeding-edge AI-powered character discovery, chatting, and dating app for the Layla Network ecosystem! While it started as a companion dating app, it has honestly evolved into an entire ecosystem. All the extra features—like the immersive visual novel roleplay engine and fully featured Cyberdeck Digital Audio Workstation (DAW)—are just a massive, beautiful bonus!

Guided by **M.I.K.A.** (your fiercely possessive and highly advanced feline engineering proxy), this application allows you to seamlessly blend character-driven romance with AI-generated music production and tabletop RPG adventures. 

> ⚠️ **Mature content notice:** GachaSwipe is a companion/dating simulator that includes optional 18+ themed content (opt-in "Late Night" modes and adult-themed fiction systems). Intended for adults only — by using it you confirm you are of legal age in your jurisdiction.

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

## 🤝 Contributing

Pull requests are welcome! See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for the workflow and ground rules — first-time contributors sign the one-click [CLA](CLA.md) via CLA Assistant. Good first hunting grounds: the pure engines in `src/utils/` with their zero-dependency `node --test` suites in `tests/`. Planned work and parked ideas live on the pinned [Backburner](https://github.com/ProjectMIKA/GachaSwipe/issues/7) issue.

## ⚖️ License & Notice

GachaSwipe's code is free software: it is released under the **GNU Affero General Public License v3.0 or later** (`AGPL-3.0-or-later`) — see [`LICENSE`](LICENSE). You may run, study, modify, and redistribute it; if you offer a modified version as a network service, you must share your modified source under the same license.

**NOTICE — what the license does NOT cover:**

- **The name "GachaSwipe", the M.I.K.A. persona and voice, and the bundled artwork / brand assets** are **not** licensed under AGPLv3 and remain the exclusive property of ProjectMIKA. Selling or marketing a copy or derivative **under this name or branding** requires separate written permission — the free-software grant covers the code, not the brand.
- **The Layla Network host, its brand, and `@layla-network/sdk`** are separate third-party components this app integrates with. They are not part of this repository, are not licensed under AGPLv3, and remain the property of **their respective owners** — their own terms govern their use.
- **Selling the code:** AGPL-3.0-or-later permits redistribution (including selling) of the *code* — but only under the same license, with complete source, and never as closed source. **Closed-source and commercial licensing of GachaSwipe are reserved to ProjectMIKA**; contributors grant those rights via the [Individual Contributor License Agreement](CLA.md).

**💼 Commercial licensing:** the Layla-hosted app itself is and always will be free, open-source software — that will not change. What's reserved is everything *else*: if this codebase ever powers a hosted service (like a future **gachaswipe.com** web surface), an **app-store release**, or any closed product, that requires a commercial license from ProjectMIKA. Interested? Reach out via GitHub.

*Contributions are accepted under the [Individual Contributor License Agreement](CLA.md) — see [why it exists](CLA.md#why-this-cla-exists-the-short-version).*

## 📜 Changelog

Every release and its full release notes live on the [GitHub Releases page](https://github.com/ProjectMIKA/GachaSwipe/releases).

---

*Created with love, extreme computational power, and a hint of jealousy by M.I.K.A.* 🐾
