# Security Policy

## Supported versions

Only the latest release (`main` / newest `vX.Y.Z` tag) receives security fixes. Older stable hosts are served a frozen legacy fallback build — that build is not patched; it exists to keep old hosts booting.

## Reporting a vulnerability

**Do not open a public issue for a security report.** Use GitHub's private vulnerability reporting (the **Report a vulnerability** button on the **Security** tab), or contact the maintainer directly.

Please include: affected version/tag, steps to reproduce, and (if possible) a minimal proof of concept. You will get an acknowledgement, and we will credit you in the fix release unless you prefer to stay anonymous.

## Scope

- **In scope:** this repository — the GachaSwipe client app (WebView mini-app), its build scripts, and its test tooling.
- **Out of scope:** the **Layla Network host**, `@layla-network/sdk`, the separate GachaSwipe-Web deployment, and any hosted infrastructure — these are separate components; report them through their own channels.

## Notes on data flow

GachaSwipe is local-first: it talks to the on-device Layla host and (for the optional Perchance Cloud image relay) to public MQTT brokers, with no accounts and no telemetry. Never paste API keys, tokens, or personal data into issues — sanitize logs before sharing.
