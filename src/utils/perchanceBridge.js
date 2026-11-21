/**
 * ✨ M.I.K.A. PERCHANCE CLOUD IMAGE BRIDGE (Option A — Encrypted MQTT-over-WSS Web Relay) ✨
 *
 * Allows low-spec devices to offload image generation to Perchance's free cloud GPU cluster
 * with 0 MB phone RAM, zero local LLM eviction, and NO iframe CSP / Same-Origin blocks.
 *
 * Architecture:
 *  1. Zero-RAM Web Bridge (Primary): The user opens `https://perchance.org/<slug>#channel=<channel>`
 *     once in their mobile browser (Chrome/Firefox). Because it runs as a top-level web page:
 *     - Cloudflare passes without challenges.
 *     - Ads load, fully supporting Perchance's free cloud GPUs.
 *     - No `frame-ancestors` CSP block (`ERR_BLOCKED_BY_RESPONSE` is impossible).
 *     - Native 18+ adult verification works directly in the browser.
 *  2. Bidirectional Encrypted WebSocket Pub/Sub (MQTT 3.1.1 over WSS):
 *     - Connects both GachaSwipe (Layla WebView) and the Chrome tab directly to `wss://broker.emqx.io:8084/mqtt`
 *       with automatic failover to `wss://broker.hivemq.com:8884/mqtt`.
 *     - Zero HTTP polling, zero rate-limit bans, sub-100ms PING/READY/RESULT push, and transparent
 *       multi-part chunking for arbitrary-size images.
 *  3. Fallback Iframe Monitor: GachaSwipe also maintains the local iframe HUD monitor for
 *     in-app inspection and dual-mode `window.postMessage` compatibility.
 */

export const PERCHANCE_MODEL_ID = 'perchance-cloud';

export const PERCHANCE_MODEL_OPTION = {
    id: PERCHANCE_MODEL_ID,
    name: 'Perchance Cloud (FLUX // Free Low-Spec)',
    description: 'Cloud GPU via Perchance web relay — 0 MB phone RAM, no local LLM eviction'
};

export const DEFAULT_PERCHANCE_SLUG = 'gachaswipe-bridge';

export const VALID_PERCHANCE_RESOLUTIONS = ['512x768', '768x768', '768x512', '512x512'];

export const PERCHANCE_STYLE_PRESETS = [
    {
        id: 'drawn_anime',
        icon: '🎌',
        name: 'Drawn Anime (Cel / Screencap)',
        badge: '2D CEL',
        description: 'Clean 2D anime linework, cel-shaded screencap aesthetic, vibrant colors',
        promptTemplate: 'drawn anime art, {{prompt}}, masterpiece, best quality, clean anime lineart, cel shading, vibrant colors, highly detailed',
        negativePrompt: '3d, photorealistic, realistic photo, cgi, sketch, blurry, low quality, worst quality, deformed, bad anatomy, extra limbs, watermark, text, signature'
    },
    {
        id: 'painted_anime',
        icon: '🎨',
        name: 'Painted Anime (Pixiv / Illustrious)',
        badge: 'PIXIV HD',
        description: 'Painterly digital anime illustration (WLOP / Kantoku / Pixiv masterpiece style)',
        promptTemplate: 'digital anime painting, {{prompt}}, masterpiece, best quality, in the style of wlop and kantoku, pixiv fantasia, luminous lighting, intricate details',
        negativePrompt: '3d, photorealistic, flat colors, rough sketch, blurry, low quality, worst quality, deformed, bad anatomy, extra limbs, watermark, text'
    },
    {
        id: 'cute_anime',
        icon: '🌸',
        name: 'Cute / Moe Anime',
        badge: 'KAWAII',
        description: 'Expressive kawaii moe character art with glossy eyes and soft pastel tones',
        promptTemplate: 'cute moe anime illustration, {{prompt}}, masterpiece, best quality, expressive glossy eyes, soft pastel lighting, kawaii aesthetic, ultra detailed',
        negativePrompt: '3d, photorealistic, gritty, horror, ugly, blurry, low quality, worst quality, deformed, bad anatomy, extra limbs, watermark, text'
    },
    {
        id: 'soft_anime',
        icon: '✨',
        name: 'Soft Cinematic Anime (Shinkai)',
        badge: 'CINEMA',
        description: 'Atmospheric anime film look with Makoto Shinkai volumetric lighting & bokeh',
        promptTemplate: 'cinematic anime film screencap, {{prompt}}, masterpiece, best quality, makoto shinkai style, atmospheric volumetric lighting, soft bokeh, breathtaking detail',
        negativePrompt: '3d, photorealistic, harsh flat lighting, blurry, low quality, worst quality, deformed, bad anatomy, extra limbs, watermark, text'
    },
    {
        id: 'semi_real_fantasy',
        icon: '🗡️',
        name: '2.5D Fantasy / Concept Art',
        badge: '2.5D ART',
        description: 'Semi-realistic digital character portrait with rich textures and rim lighting',
        promptTemplate: 'semi-realistic fantasy character illustration, {{prompt}}, masterpiece, best quality, concept art, dramatic rim lighting, detailed skin and fabric textures, artstation',
        negativePrompt: 'flat 2d cartoon, amateur, blurry, low quality, worst quality, deformed, bad anatomy, extra limbs, watermark, text'
    },
    {
        id: 'casual_photo',
        icon: '📸',
        name: 'Casual / Realistic Photo',
        badge: 'PHOTO',
        description: 'Photorealistic smartphone selfie & DSLR portrait with natural skin texture',
        promptTemplate: 'candid realistic photograph, {{prompt}}, raw photo, natural skin texture, soft natural lighting, shallow depth of field, sharp focus, 8k uhd',
        negativePrompt: 'anime, cartoon, illustration, drawing, painting, 3d render, cgi, plastic skin, blurry, low quality, deformed, bad anatomy, extra limbs, watermark, text'
    },
    {
        id: 'raw_custom',
        icon: '⚙️',
        name: 'Raw Danbooru / Custom Suffix',
        badge: 'CUSTOM',
        description: 'Sends raw GachaSwipe tags using only your custom Style / Quality Suffix below',
        promptTemplate: '{{prompt}}',
        negativePrompt: ''
    }
];

export const DEFAULT_PERCHANCE_STYLE_ID = 'drawn_anime';

export const DEFAULT_PERCHANCE_CONFIG = {
    slug: DEFAULT_PERCHANCE_SLUG,
    relayChannel: '',
    stylePreset: DEFAULT_PERCHANCE_STYLE_ID,
    resolution: '512x768',
    guidanceScale: 7,
    negativePrompt: 'blurry, low quality, worst quality, deformed, bad anatomy, extra limbs, watermark, text',
    artStyleSuffix: 'masterpiece, best quality, anime style, highly detailed',
    timeoutSec: 180,
    dismissedNetworkGuide: false,
    relayConsent: 'ask',
    relayNeverAskAgain: false
};

export function generateRandomRelayChannel() {
    const rand = Math.random().toString(36).slice(2, 8);
    return `gs-mika-${rand}`;
}

export function getOrGenerateRelayChannel() {
    if (typeof localStorage !== 'undefined') {
        try {
            const saved = localStorage.getItem('gs_perchance_relay_channel');
            if (saved && typeof saved === 'string') {
                const cleaned = saved.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
                if (cleaned) return cleaned;
            }
            const fresh = generateRandomRelayChannel();
            localStorage.setItem('gs_perchance_relay_channel', fresh);
            return fresh;
        } catch {
            // fallback below
        }
    }
    return 'gs-mika-default';
}

/**
 * Normalize a user-supplied Perchance URL or generator name into a clean slug.
 * Accepts:
 *  - "gachaswipe-bridge"
 *  - "https://perchance.org/gachaswipe-bridge"
 *  - "https://null.perchance.org/gachaswipe-bridge#..."
 */
export function normalizePerchanceSlug(input) {
    if (!input || typeof input !== 'string') return DEFAULT_PERCHANCE_SLUG;
    let raw = input.trim();
    if (!raw) return DEFAULT_PERCHANCE_SLUG;
    try {
        if (/^https?:\/\//i.test(raw)) {
            const u = new URL(raw);
            raw = (u.pathname || '').replace(/^\/+|\/+$/g, '').split('/')[0] || '';
        }
    } catch {
        // Fallback regex strip below
    }
    raw = raw
        .replace(/^(?:https?:\/\/)?(?:null\.)?perchance\.org\//i, '')
        .split(/[/?#]/)[0]
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '');
    return raw || DEFAULT_PERCHANCE_SLUG;
}

export function resolvePerchanceEmbedUrl(slugOrUrl) {
    const slug = normalizePerchanceSlug(slugOrUrl);
    return `https://null.perchance.org/${slug}`;
}

export function resolvePerchancePageUrl(slugOrUrl, channel) {
    const slug = normalizePerchanceSlug(slugOrUrl);
    const activeChannel = (typeof channel === 'string' && channel.trim())
        ? channel.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
        : (currentConfig.relayChannel || (typeof localStorage !== 'undefined' ? localStorage.getItem('gs_perchance_relay_channel') : '') || '');
    const hash = activeChannel ? `#channel=${encodeURIComponent(activeChannel)}` : '';
    return `https://perchance.org/${slug}${hash}`;
}

export function getPerchanceStylePreset(styleId) {
    return PERCHANCE_STYLE_PRESETS.find((p) => p.id === styleId) || PERCHANCE_STYLE_PRESETS[0];
}

export function normalizePerchanceConfig(cfg = {}) {
    const safe = cfg && typeof cfg === 'object' ? cfg : {};
    const resolution = VALID_PERCHANCE_RESOLUTIONS.includes(safe.resolution)
        ? safe.resolution
        : DEFAULT_PERCHANCE_CONFIG.resolution;
    const stylePreset = PERCHANCE_STYLE_PRESETS.some((p) => p.id === safe.stylePreset)
        ? safe.stylePreset
        : DEFAULT_PERCHANCE_STYLE_ID;
    const rawCfg = Number(safe.guidanceScale);
    const guidanceScale = Number.isFinite(rawCfg)
        ? Math.max(1, Math.min(30, Math.round(rawCfg)))
        : DEFAULT_PERCHANCE_CONFIG.guidanceScale;
    const rawTimeout = Number(safe.timeoutSec);
    const timeoutSec = Number.isFinite(rawTimeout)
        ? Math.max(30, Math.min(300, Math.round(rawTimeout)))
        : DEFAULT_PERCHANCE_CONFIG.timeoutSec;
    const rawChannel = typeof safe.relayChannel === 'string'
        ? safe.relayChannel.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
        : '';
    const relayChannel = rawChannel || getOrGenerateRelayChannel();

    return {
        slug: normalizePerchanceSlug(safe.slug || DEFAULT_PERCHANCE_SLUG),
        relayChannel,
        stylePreset,
        resolution,
        guidanceScale,
        negativePrompt: typeof safe.negativePrompt === 'string'
            ? safe.negativePrompt
            : DEFAULT_PERCHANCE_CONFIG.negativePrompt,
        artStyleSuffix: typeof safe.artStyleSuffix === 'string'
            ? safe.artStyleSuffix
            : DEFAULT_PERCHANCE_CONFIG.artStyleSuffix,
        timeoutSec,
        dismissedNetworkGuide: Boolean(safe.dismissedNetworkGuide),
        relayConsent: (safe.relayConsent === 'allowed' || safe.relayConsent === 'declined') ? safe.relayConsent : 'ask',
        relayNeverAskAgain: Boolean(safe.relayNeverAskAgain)
    };
}

/**
 * Pure consent resolver for Perchance MQTT-WSS relay connections.
 * Fail-closed: returns authorized=false unless explicitly allowed for this session
 * or persisted with neverAskAgain=true.
 */
export function resolveRelayAuthorization(config = {}, sessionDecision = null) {
    const cfg = config && typeof config === 'object' ? config : {};
    if (cfg.relayNeverAskAgain) {
        if (cfg.relayConsent === 'allowed') {
            return { authorized: true, shouldPrompt: false, mode: 'allowed_auto' };
        }
        if (cfg.relayConsent === 'declined') {
            return { authorized: false, shouldPrompt: false, mode: 'declined_auto' };
        }
    }
    if (sessionDecision === 'allowed') {
        return { authorized: true, shouldPrompt: false, mode: 'allowed_session' };
    }
    if (sessionDecision === 'declined') {
        return { authorized: false, shouldPrompt: false, mode: 'declined_session' };
    }
    return { authorized: false, shouldPrompt: true, mode: 'prompt' };
}

/**
 * Sanitizes square brackets and curly braces from prompts before sending to Perchance.
 * Perchance's compiler evaluates [...] and {...} as list Lookups or generator syntax.
 */
export function sanitizePerchancePrompt(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/[[{]/g, '(')
        .replace(/[\]}]/g, ')')
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Combines the raw GachaSwipe prompt with the selected Perchance style preset
 * and merges preset negative tags with user negative tags.
 */
export function buildPerchanceStyledPrompt(rawPrompt, cfg = DEFAULT_PERCHANCE_CONFIG) {
    const cleanRaw = sanitizePerchancePrompt(String(rawPrompt || ''));
    const safeCfg = normalizePerchanceConfig(cfg);
    const preset = getPerchanceStylePreset(safeCfg.stylePreset);

    let styledPrompt = preset.promptTemplate
        ? preset.promptTemplate.replace('{{prompt}}', cleanRaw)
        : cleanRaw;

    const customSuffix = String(safeCfg.artStyleSuffix || '').trim();
    if (customSuffix) {
        const isDefaultSuffix = customSuffix.toLowerCase() === DEFAULT_PERCHANCE_CONFIG.artStyleSuffix.toLowerCase();
        if (preset.id === 'raw_custom' || !isDefaultSuffix) {
            if (!styledPrompt.toLowerCase().includes(customSuffix.toLowerCase())) {
                styledPrompt = styledPrompt ? `${styledPrompt}, ${customSuffix}` : customSuffix;
            }
        }
    }

    const negParts = [];
    if (preset.negativePrompt) negParts.push(preset.negativePrompt);
    if (safeCfg.negativePrompt) negParts.push(safeCfg.negativePrompt);
    const seenNeg = new Set();
    const mergedNeg = negParts
        .join(', ')
        .split(',')
        .map((t) => t.trim())
        .filter((t) => {
            if (!t) return false;
            const low = t.toLowerCase();
            if (seenNeg.has(low)) return false;
            seenNeg.add(low);
            return true;
        })
        .join(', ');

    return {
        prompt: sanitizePerchancePrompt(styledPrompt),
        negativePrompt: sanitizePerchancePrompt(mergedNeg),
        preset
    };
}

// ============================================================================
// COPY-PASTE TEMPLATES FOR SETTING UP THE PERCHANCE GENERATOR
// ============================================================================

export const PERCHANCE_LISTS_TEMPLATE = `generateImage = {import:text-to-image-plugin}

title
  GachaSwipe Neural Image Bridge

output
  GachaSwipe Perchance Bridge Online`;

export const DEFAULT_MQTT_BROKERS = [
    'wss://broker.emqx.io:8084/mqtt',
    'wss://broker.hivemq.com:8884/mqtt'
];

// Self-contained zero-dependency MQTT 3.1.1-over-WebSocket relay factory.
// Written without template literals or backslashes so it can be embedded directly
// into PERCHANCE_HTML_TEMPLATE alongside the main app runtime.
export function createGsMqttRelay(options) {
    const opts = options || {};
    const brokers = Array.isArray(opts.brokers) && opts.brokers.length
        ? opts.brokers.slice()
        : ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
    const pubTopic = String(opts.pubTopic || '');
    const subTopic = String(opts.subTopic || '');
    const clientIdPrefix = String(opts.clientIdPrefix || 'gs');
    const CHUNK_CHARS = 140000;
    const enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
    const dec = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;

    function concatBytes(parts) {
        let total = 0;
        for (let i = 0; i < parts.length; i++) total += parts[i].length;
        const out = new Uint8Array(total);
        let offset = 0;
        for (let i = 0; i < parts.length; i++) {
            out.set(parts[i], offset);
            offset += parts[i].length;
        }
        return out;
    }

    function encodeVarInt(n) {
        const out = [];
        let x = Math.max(0, Number(n) || 0);
        do {
            let b = x % 128;
            x = Math.floor(x / 128);
            if (x > 0) b = b | 128;
            out.push(b);
        } while (x > 0);
        return new Uint8Array(out);
    }

    function encodeUtf8Bytes(str) {
        if (enc) return enc.encode(String(str || ''));
        const s = String(str || '');
        const arr = new Uint8Array(s.length);
        for (let i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i) & 255;
        return arr;
    }

    function decodeUtf8Bytes(bytes) {
        if (dec) return dec.decode(bytes);
        let out = '';
        for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
        return out;
    }

    function encodeConnect(clientId, keepAliveSec) {
        const cid = encodeUtf8Bytes(clientId);
        const ka = keepAliveSec || 30;
        const hdr = new Uint8Array([
            0, 4, 77, 81, 84, 84, // MQTT
            4,                    // protocol level 4 (3.1.1)
            2,                    // clean session
            (ka >> 8) & 255, ka & 255,
            (cid.length >> 8) & 255, cid.length & 255
        ]);
        const body = concatBytes([hdr, cid]);
        return concatBytes([new Uint8Array([0x10]), encodeVarInt(body.length), body]);
    }

    function encodeSubscribe(topic, packetId) {
        const t = encodeUtf8Bytes(topic);
        const pid = packetId || 1;
        const body = new Uint8Array(2 + 2 + t.length + 1);
        body[0] = (pid >> 8) & 255;
        body[1] = pid & 255;
        body[2] = (t.length >> 8) & 255;
        body[3] = t.length & 255;
        body.set(t, 4);
        body[4 + t.length] = 0; // QoS 0
        return concatBytes([new Uint8Array([0x82]), encodeVarInt(body.length), body]);
    }

    function encodePublish(topic, payloadText) {
        const t = encodeUtf8Bytes(topic);
        const p = encodeUtf8Bytes(payloadText);
        const body = new Uint8Array(2 + t.length + p.length);
        body[0] = (t.length >> 8) & 255;
        body[1] = t.length & 255;
        body.set(t, 2);
        body.set(p, 2 + t.length);
        return concatBytes([new Uint8Array([0x30]), encodeVarInt(body.length), body]);
    }

    function encodePingreq() {
        return new Uint8Array([0xC0, 0x00]);
    }

    function decodePackets(buf) {
        const packets = [];
        let pos = 0;
        while (pos < buf.length) {
            if (pos + 2 > buf.length) break;
            const firstByte = buf[pos];
            let mult = 1;
            let remLen = 0;
            let idx = pos + 1;
            let hasLen = false;
            while (idx < buf.length) {
                const digit = buf[idx];
                remLen += (digit & 127) * mult;
                idx += 1;
                if ((digit & 128) === 0) {
                    hasLen = true;
                    break;
                }
                mult *= 128;
                if (mult > 2097152) break;
            }
            if (!hasLen || idx + remLen > buf.length) break;
            const body = buf.subarray(idx, idx + remLen);
            const pktType = firstByte >> 4;
            const flags = firstByte & 15;
            if (pktType === 2) {
                packets.push({ type: 'CONNACK', code: body.length >= 2 ? body[1] : 0 });
            } else if (pktType === 3 && body.length >= 2) {
                const tLen = (body[0] << 8) | body[1];
                let pStart = 2 + tLen;
                if ((flags & 6) > 0) pStart += 2;
                if (pStart <= body.length) {
                    packets.push({
                        type: 'PUBLISH',
                        topic: decodeUtf8Bytes(body.subarray(2, 2 + tLen)),
                        payload: decodeUtf8Bytes(body.subarray(pStart))
                    });
                }
            } else if (pktType === 9) {
                packets.push({ type: 'SUBACK' });
            } else if (pktType === 13) {
                packets.push({ type: 'PINGRESP' });
            }
            pos = idx + remLen;
        }
        return { packets: packets, rest: buf.subarray(pos) };
    }

    let brokerIdx = 0;
    let ws = null;
    let connected = false;
    let stopped = false;
    let pingTimer = null;
    let reconnectTimer = null;
    let connectWatchdog = null;
    let rxBuffer = new Uint8Array(0);
    let packetSeq = 1;
    let reconnectFailures = 0;
    const chunkBuckets = new Map();
    const outbox = []; // { obj, resolve, timer }

    function clearTimers() {
        if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        if (connectWatchdog) { clearTimeout(connectWatchdog); connectWatchdog = null; }
    }

    function failOutbox(reasonVal) {
        while (outbox.length > 0) {
            const item = outbox.shift();
            if (item.timer) clearTimeout(item.timer);
            try { item.resolve(Boolean(reasonVal)); } catch (e) {}
        }
    }

    function sendWireObj(obj) {
        if (!ws || ws.readyState !== 1 || !connected) return false;
        const json = JSON.stringify(obj);
        if (json.length <= CHUNK_CHARS) {
            ws.send(encodePublish(pubTopic, json));
            return true;
        }
        const chunkId = clientIdPrefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        const total = Math.ceil(json.length / CHUNK_CHARS);
        for (let i = 0; i < total; i++) {
            const part = json.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS);
            const frame = JSON.stringify({
                type: 'GACHASWIPE_MQTT_CHUNK',
                chunkId: chunkId,
                index: i,
                total: total,
                data: part
            });
            ws.send(encodePublish(pubTopic, frame));
        }
        return true;
    }

    function flushOutbox() {
        if (!connected) return;
        while (outbox.length > 0) {
            const item = outbox.shift();
            if (item.timer) clearTimeout(item.timer);
            let ok = false;
            try { ok = sendWireObj(item.obj); } catch (e) { ok = false; }
            try { item.resolve(ok); } catch (e) {}
        }
    }

    function ingestPayloadText(text) {
        let parsed = null;
        try { parsed = JSON.parse(text); } catch (e) { return; }
        if (!parsed || typeof parsed !== 'object') return;
        if (parsed.type === 'GACHASWIPE_MQTT_CHUNK' && parsed.chunkId && typeof parsed.total === 'number') {
            const now = Date.now();
            chunkBuckets.forEach(function(b, k) {
                if (now - b.ts > 60000) chunkBuckets.delete(k);
            });
            let bucket = chunkBuckets.get(parsed.chunkId);
            if (!bucket) {
                bucket = { parts: new Array(parsed.total), received: 0, total: parsed.total, ts: now };
                chunkBuckets.set(parsed.chunkId, bucket);
            }
            if (bucket.parts[parsed.index] === undefined) {
                bucket.parts[parsed.index] = String(parsed.data || '');
                bucket.received += 1;
            }
            if (bucket.received >= bucket.total) {
                chunkBuckets.delete(parsed.chunkId);
                try {
                    const full = JSON.parse(bucket.parts.join(''));
                    if (typeof opts.onMessage === 'function') opts.onMessage(full);
                } catch (e) {}
            }
            return;
        }
        if (typeof opts.onMessage === 'function') {
            opts.onMessage(parsed);
        }
    }

    function handleBytes(bytes) {
        rxBuffer = rxBuffer.length ? concatBytes([rxBuffer, bytes]) : bytes;
        const decoded = decodePackets(rxBuffer);
        rxBuffer = decoded.rest;
        for (let i = 0; i < decoded.packets.length; i++) {
            const pkt = decoded.packets[i];
            if (pkt.type === 'CONNACK') {
                if (connectWatchdog) { clearTimeout(connectWatchdog); connectWatchdog = null; }
                if (pkt.code === 0) {
                    connected = true;
                    reconnectFailures = 0;
                    packetSeq += 1;
                    if (subTopic && ws && ws.readyState === 1) {
                        ws.send(encodeSubscribe(subTopic, packetSeq));
                    }
                    if (pingTimer) clearInterval(pingTimer);
                    pingTimer = setInterval(function() {
                        try {
                            if (ws && ws.readyState === 1 && connected) ws.send(encodePingreq());
                        } catch (e) {}
                    }, 20000);
                    flushOutbox();
                    if (typeof opts.onOpen === 'function') {
                        try { opts.onOpen(brokers[brokerIdx]); } catch (e) {}
                    }
                } else if (ws) {
                    try { ws.close(); } catch (e) {}
                }
            } else if (pkt.type === 'PUBLISH') {
                ingestPayloadText(pkt.payload);
            }
        }
    }

    function scheduleReconnect(rotate) {
        if (stopped) return;
        clearTimers();
        connected = false;
        reconnectFailures += 1;
        if (rotate && brokers.length > 1) {
            brokerIdx = (brokerIdx + 1) % brokers.length;
        }
        if (typeof opts.onDisconnect === 'function') {
            try { opts.onDisconnect(); } catch (e) {}
        }
        const backoffDelays = [1800, 5000, 15000, 30000];
        const delayMs = backoffDelays[Math.min(reconnectFailures - 1, backoffDelays.length - 1)];
        reconnectTimer = setTimeout(function() {
            if (!stopped) connect();
        }, delayMs);
    }

    function connect() {
        if (stopped || typeof WebSocket === 'undefined') return;
        clearTimers();
        connected = false;
        rxBuffer = new Uint8Array(0);
        const url = brokers[brokerIdx];
        let sock = null;
        try {
            sock = new WebSocket(url, 'mqtt');
            sock.binaryType = 'arraybuffer';
        } catch (err) {
            if (typeof opts.onError === 'function') {
                try { opts.onError(url, err); } catch (e) {}
            }
            scheduleReconnect(true);
            return;
        }
        ws = sock;
        connectWatchdog = setTimeout(function() {
            if (!connected && ws === sock && !stopped) {
                try { sock.close(); } catch (e) {}
                scheduleReconnect(true);
            }
        }, 4500);

        sock.onopen = function() {
            if (ws !== sock || stopped) return;
            const cid = clientIdPrefix + '_' + Math.random().toString(36).slice(2, 10);
            try {
                sock.send(encodeConnect(cid, 30));
            } catch (e) {
                scheduleReconnect(true);
            }
        };

        sock.onmessage = function(ev) {
            if (ws !== sock || stopped) return;
            const data = ev && ev.data;
            if (data instanceof ArrayBuffer) {
                handleBytes(new Uint8Array(data));
            } else if (typeof Uint8Array !== 'undefined' && ArrayBuffer.isView(data)) {
                handleBytes(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
            } else if (data && typeof data.arrayBuffer === 'function') {
                data.arrayBuffer().then(function(ab) {
                    if (ws === sock && !stopped) handleBytes(new Uint8Array(ab));
                }).catch(function() {});
            }
        };

        sock.onerror = function(err) {
            if (ws !== sock || stopped) return;
            if (typeof opts.onError === 'function') {
                try { opts.onError(url, err); } catch (e) {}
            }
        };

        sock.onclose = function() {
            if (ws !== sock) return;
            ws = null;
            scheduleReconnect(!connected);
        };
    }

    function publish(obj, waitMs) {
        if (stopped) return Promise.resolve(false);
        if (connected && ws && ws.readyState === 1) {
            try {
                return Promise.resolve(sendWireObj(obj));
            } catch (e) {
                return Promise.resolve(false);
            }
        }
        const limit = waitMs || 4500;
        return new Promise(function(resolve) {
            const entry = { obj: obj, resolve: resolve, timer: null };
            entry.timer = setTimeout(function() {
                const idx = outbox.indexOf(entry);
                if (idx !== -1) outbox.splice(idx, 1);
                resolve(false);
            }, limit);
            outbox.push(entry);
        });
    }

    function rotateBroker() {
        if (stopped) return;
        if (ws) {
            try { ws.onclose = null; ws.close(); } catch (e) {}
            ws = null;
        }
        connected = false;
        brokerIdx = (brokerIdx + 1) % brokers.length;
        connect();
    }

    function close() {
        stopped = true;
        clearTimers();
        connected = false;
        failOutbox(false);
        if (ws) {
            try { ws.onclose = null; ws.close(); } catch (e) {}
            ws = null;
        }
        chunkBuckets.clear();
    }

    return {
        connect: connect,
        publish: publish,
        rotateBroker: rotateBroker,
        close: close,
        isConnected: function() { return connected; },
        getCurrentBroker: function() { return brokers[brokerIdx]; },
        codec: {
            encodeConnect: encodeConnect,
            encodeSubscribe: encodeSubscribe,
            encodePublish: encodePublish,
            encodePingreq: encodePingreq,
            decodePackets: decodePackets
        },
        _ingestTextForTest: ingestPayloadText
    };
}

export const PERCHANCE_HTML_TEMPLATE = `<div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #0B0914; color: #00E5FF; padding: 14px; border-radius: 8px; border: 1px solid rgba(0,229,255,0.3); max-width: 520px; margin: 4px auto; box-sizing: border-box; box-shadow: 0 0 24px rgba(0,229,255,0.12);">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
    <div style="font-weight: 900; font-size: 12px; letter-spacing: 0.1em; text-shadow: 0 0 8px rgba(0,229,255,0.6);">⚡ GACHASWIPE // PERCHANCE CLOUD RELAY</div>
    <span id="gs-relay-badge" style="font-size: 9px; color: #00FF41; background: rgba(0,255,65,0.12); border: 1px solid rgba(0,255,65,0.35); border-radius: 3px; padding: 2px 6px; font-weight: bold; letter-spacing: 0.05em;">LINKED</span>
  </div>
  <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 8px;">
    <span style="font-size: 10px; color: #00E5FF; font-weight: bold;">CHANNEL:</span>
    <input id="gs-channel-input" type="text" placeholder="gs-mika-xxxxxx or full bridge URL" onkeydown="if(event.key==='Enter')window.__gsSaveChannel()" style="flex: 1; background: #141024; color: #00FF41; border: 1px solid rgba(0,255,65,0.35); border-radius: 4px; padding: 4px 8px; font-size: 11px; font-family: inherit; font-weight: bold;" />
    <button id="gs-save-channel-btn" type="button" onclick="window.__gsSaveChannel()" style="background: rgba(0,255,65,0.15); color: #00FF41; border: 1px solid #00FF41; border-radius: 4px; padding: 4px 8px; font-size: 10px; font-weight: bold; cursor: pointer; font-family: inherit;">SAVE</button>
  </div>
  <div id="gs-keepalive-bar" style="background: rgba(0,229,255,0.08); border: 1px solid rgba(0,229,255,0.35); border-radius: 6px; padding: 8px 10px; margin-bottom: 8px;">
    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
      <div id="gs-keepalive-label" style="font-size: 10px; color: #cbd5e1; line-height: 1.35;">
        <b style="color: #00E5FF;">📱 Mobile Background Keep-Alive:</b> Tap once to start a 10s inaudible sub-bass loop (shows Chrome speaker/media controls so Android keeps this tab alive).
      </div>
      <button id="gs-start-relay-btn" type="button" onclick="window.__gsToggleKeepAlive()" style="background: linear-gradient(135deg, #00E5FF, #00FF41); color: #07050c; border: none; border-radius: 4px; padding: 6px 12px; font-size: 11px; font-weight: 900; cursor: pointer; font-family: inherit; letter-spacing: 0.04em; box-shadow: 0 0 12px rgba(0,229,255,0.45); flex-shrink: 0;">▶ START RELAY</button>
    </div>
    <audio id="gs-silent-audio" controls loop playsinline style="width: 100%; height: 30px; margin-top: 6px; border-radius: 4px; opacity: 0.9;"></audio>
  </div>
  <div id="gs-status" style="font-size: 11px; color: #00FF41; margin-bottom: 8px; word-break: break-word; font-weight: bold;">STATUS: CONNECTING TO RELAY...</div>
  <div style="background: rgba(255,16,122,0.12); border: 1px solid rgba(255,16,122,0.4); border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
    <div style="font-size: 10px; color: #fff; line-height: 1.35;">
      <b style="color: #FF107A;">🔞 Adult Generations?</b> Tap once to complete Perchance age confirmation:
    </div>
    <button id="gs-test-18-btn" type="button" onclick="window.__gsRunManualTest(true)" style="background: #FF107A; color: #fff; border: none; border-radius: 4px; padding: 6px 12px; font-size: 11px; font-weight: 800; cursor: pointer; font-family: inherit; letter-spacing: 0.05em; text-shadow: 0 0 6px rgba(0,0,0,0.6); box-shadow: 0 0 10px rgba(255,16,122,0.5); flex-shrink: 0;">🔞 VERIFY 18+</button>
  </div>
  <div style="display: flex; gap: 6px; margin-bottom: 8px;">
    <input id="gs-test-prompt" type="text" value="1girl, anime masterpiece, neon cyberpunk background, smiling" style="flex: 1; background: #141024; color: #fff; border: 1px solid rgba(0,229,255,0.35); border-radius: 4px; padding: 6px 8px; font-size: 11px; font-family: inherit;" />
    <button id="gs-test-sfw-btn" type="button" onclick="window.__gsRunManualTest(false)" style="background: rgba(0,229,255,0.14); color: #00E5FF; border: 1px solid #00E5FF; border-radius: 4px; padding: 6px 10px; font-size: 11px; font-weight: 800; cursor: pointer; font-family: inherit; letter-spacing: 0.05em; text-shadow: 0 0 6px rgba(0,229,255,0.6); box-shadow: 0 0 8px rgba(0,229,255,0.15);">✨ TEST SFW</button>
  </div>
  <div style="font-size: 10px; color: rgba(255,255,255,0.65); margin-bottom: 8px; line-height: 1.4;">
    💡 <b>Keep this tab open in the background!</b> GachaSwipe dispatches prompts to this page over the cloud relay with 0 MB phone RAM.
  </div>
  <div id="gs-stage" style="width: 100%; min-height: 420px; display: flex; align-items: center; justify-content: center; background: #07050c; border: 1px dashed rgba(0,229,255,0.25); border-radius: 6px; overflow: hidden; padding: 6px; box-sizing: border-box;">
    <span style="font-size: 11px; opacity: 0.5; color: #fff;">(Live preview or verification prompt appears here)</span>
  </div>
</div>

<script>
(function() {
  const statusEl = document.getElementById('gs-status');
  const stageEl = document.getElementById('gs-stage');
  const badgeEl = document.getElementById('gs-relay-badge');
  const channelInput = document.getElementById('gs-channel-input');
  const VALID_RES = ['512x512', '512x768', '768x512', '768x768'];

  function extractChannel(raw) {
    if (!raw || typeof raw !== 'string') return '';
    let candidate = raw.trim();
    const match = candidate.match(/[?#&]channel=([^&#\\s]+)/i);
    if (match && match[1]) {
      try { candidate = decodeURIComponent(match[1]); } catch (e) { candidate = match[1]; }
    } else if (/^https?:\\/\\//i.test(candidate)) {
      return '';
    }
    return candidate.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  }

  let channel = '';
  try {
    const hash = window.location.hash ? window.location.hash.substring(1) : '';
    const hashParams = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(window.location.search);
    channel = extractChannel(hashParams.get('channel') || queryParams.get('channel') || '');
    if (!channel && window.name && window.name.indexOf('channel=') !== -1) {
      channel = extractChannel(window.name);
    }
    if (!channel) {
      channel = extractChannel(localStorage.getItem('gs_perchance_relay_channel') || '');
    }
  } catch (e) {}

  if (!channel) channel = 'gs-mika-default';
  channel = channel.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'gs-mika-default';

  if (channelInput) {
    channelInput.value = channel;
  }
  try {
    localStorage.setItem('gs_perchance_relay_channel', channel);
  } catch (e) {}

  let keepAliveActive = false;
  let silentAudioUrl = null;
  let wakeLockRef = null;

  function buildSilentWavUrl() {
    if (silentAudioUrl) return silentAudioUrl;
    // 10-second 16-bit mono PCM WAV at 8000Hz carrying a 22Hz sub-bass sine wave (~ -58 dBFS RMS).
    // Exceeds Android Chrome's 5s Media Notification rule and Chromium's -72.25 dBFS AudioStreamMonitor
    // silence floor so the tab is flagged Audible & gets AudioFocus, while remaining inaudible.
    const sampleRate = 8000;
    const durationSec = 10;
    const numSamples = sampleRate * durationSec;
    const dataBytes = numSamples * 2;
    const buffer = new ArrayBuffer(44 + dataBytes);
    const view = new DataView(buffer);
    const writeStr = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataBytes, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); // block align (16-bit mono)
    view.setUint16(34, 16, true); // 16-bit signed
    writeStr(36, 'data');
    view.setUint32(40, dataBytes, true);
    const amp = 55; // ~ -55.5 dBFS peak, -58.5 dBFS RMS
    const twoPiF = 2 * Math.PI * 22; // 22Hz * 10s = 220 exact cycles (zero loop click)
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.round(amp * Math.sin(twoPiF * (i / sampleRate)));
      view.setInt16(44 + i * 2, sample, true);
    }
    silentAudioUrl = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
    return silentAudioUrl;
  }

  let cachedArtworkUrl = null;
  function buildArtworkUrl() {
    if (cachedArtworkUrl) return cachedArtworkUrl;
    try {
      const c = document.createElement('canvas');
      c.width = 96;
      c.height = 96;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#0B0914';
      ctx.fillRect(0, 0, 96, 96);
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, 88, 88);
      ctx.fillStyle = '#00FF41';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', 48, 50);
      cachedArtworkUrl = c.toDataURL('image/png');
    } catch (e) {}
    return cachedArtworkUrl || '';
  }

  function registerMediaSession() {
    if (!('mediaSession' in navigator)) return;
    try {
      if (typeof MediaMetadata === 'function') {
        const art = buildArtworkUrl();
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'GachaSwipe Cloud Relay',
          artist: 'Channel: ' + channel,
          album: 'Background Keep-Alive Active',
          artwork: art ? [{ src: art, sizes: '96x96', type: 'image/png' }] : []
        });
      }
      navigator.mediaSession.playbackState = 'playing';
      navigator.mediaSession.setActionHandler('play', async function() {
        const a = document.getElementById('gs-silent-audio');
        if (a) { try { await a.play(); } catch (e) {} }
      });
      navigator.mediaSession.setActionHandler('pause', function() {
        const a = document.getElementById('gs-silent-audio');
        if (a) { try { a.pause(); } catch (e) {} }
      });
    } catch (e) {}
  }

  function updateKeepAliveUI(active) {
    const btn = document.getElementById('gs-start-relay-btn');
    const lbl = document.getElementById('gs-keepalive-label');
    const bar = document.getElementById('gs-keepalive-bar');
    if (btn) {
      btn.textContent = active ? '🔊 RELAY ACTIVE' : '▶ START RELAY';
      btn.style.background = active ? 'rgba(0,255,65,0.2)' : 'linear-gradient(135deg, #00E5FF, #00FF41)';
      btn.style.color = active ? '#00FF41' : '#07050c';
      btn.style.border = active ? '1px solid #00FF41' : 'none';
    }
    if (lbl) {
      lbl.innerHTML = active
        ? '<b style="color: #00FF41;">🔊 Audio Focus Locked:</b> Verify Chrome shows a speaker/media notification, then switch to Layla!'
        : '<b style="color: #00E5FF;">📱 Mobile Background Keep-Alive:</b> Tap once to start a 10s inaudible sub-bass loop (shows Chrome speaker/media controls so Android keeps this tab alive).';
    }
    if (bar) {
      bar.style.borderColor = active ? 'rgba(0,255,65,0.5)' : 'rgba(0,229,255,0.35)';
      bar.style.background = active ? 'rgba(0,255,65,0.08)' : 'rgba(0,229,255,0.08)';
    }
  }

  const audioElInit = document.getElementById('gs-silent-audio');
  if (audioElInit) {
    audioElInit.src = buildSilentWavUrl();
    audioElInit.loop = true;
    audioElInit.volume = 1.0;
    audioElInit.addEventListener('play', function() {
      keepAliveActive = true;
      registerMediaSession();
      updateKeepAliveUI(true);
    });
    audioElInit.addEventListener('pause', function() {
      keepAliveActive = false;
      if ('mediaSession' in navigator) {
        try { navigator.mediaSession.playbackState = 'paused'; } catch (e) {}
      }
      updateKeepAliveUI(false);
    });
  }

  window.__gsToggleKeepAlive = async function() {
    const audioEl = document.getElementById('gs-silent-audio');
    if (!audioEl) return;
    if (!audioEl.paused && keepAliveActive) {
      keepAliveActive = false;
      try { audioEl.pause(); } catch (e) {}
      try { if (wakeLockRef) { wakeLockRef.release(); wakeLockRef = null; } } catch (e) {}
      updateKeepAliveUI(false);
      return;
    }
    try {
      if (!audioEl.src) audioEl.src = buildSilentWavUrl();
      audioEl.loop = true;
      audioEl.muted = false;
      audioEl.volume = 1.0;
      await audioEl.play();
      keepAliveActive = true;
      registerMediaSession();
      if ('wakeLock' in navigator && navigator.wakeLock && navigator.wakeLock.request) {
        navigator.wakeLock.request('screen').then(function(wl) { wakeLockRef = wl; }).catch(function() {});
      }
      updateKeepAliveUI(true);
      dispatchToBoth({
        type: 'GACHASWIPE_PERCHANCE_READY',
        channel: channel,
        generatorName: window.generatorName || 'custom',
        ts: Date.now()
      });
    } catch (err) {
      setStatus('KEEP-ALIVE BLOCKED: Tap the play button (▶) on the audio bar below (' + (err && err.message ? err.message : 'audio') + ')', '#FFC107');
    }
  };

  window.__gsSaveChannel = function() {
    if (!channelInput) return;
    const next = extractChannel(channelInput.value);
    if (next) {
      channel = next;
      channelInput.value = channel;
      try { localStorage.setItem('gs_perchance_relay_channel', channel); } catch (e) {}
      if (window.history && window.history.replaceState) {
        try { window.history.replaceState(null, null, '#' + new URLSearchParams({ channel }).toString()); } catch (e) {}
      }
      if (keepAliveActive && 'mediaSession' in navigator && typeof MediaMetadata === 'function') {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: 'GachaSwipe Cloud Relay',
            artist: 'Channel: ' + channel,
            album: 'Background Keep-Alive Active'
          });
        } catch (e) {}
      }
      initRelay();
    } else {
      setStatus('INVALID CHANNEL — paste gs-mika-xxxxxx or your bridge URL.', '#FF3366');
    }
  };

  function setStatus(text, color) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.style.color = color || '#00FF41';
  }

  function setBadge(text, color, border, bg) {
    if (!badgeEl) return;
    badgeEl.textContent = text;
    if (color) badgeEl.style.color = color;
    if (border) badgeEl.style.borderColor = border;
    if (bg) badgeEl.style.background = bg;
  }

  function postToParent(payload) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(Object.assign({ source: 'gachaswipe-perchance-bridge' }, payload), '*');
      }
    } catch (err) {
      console.warn('[GS Bridge] postMessage error:', err);
    }
  }

  const createMqtt = (${createGsMqttRelay.toString()});
  let relayMqtt = null;

  async function postToRelay(payload) {
    if (!channel || !relayMqtt) return false;
    try {
      return await relayMqtt.publish(payload, 5000);
    } catch (err) {
      console.warn('[GS Relay] post error:', err);
      return false;
    }
  }

  function dispatchToBoth(payload) {
    postToParent(payload);
    postToRelay(payload);
  }

  async function waitForPlugin(timeoutMs) {
    const limit = timeoutMs || 25000;
    const start = Date.now();
    while (typeof generateImage !== 'function') {
      if (Date.now() - start > limit) {
        throw new Error('generateImage plugin not ready. Ensure "generateImage = {import:text-to-image-plugin}" is in the left panel.');
      }
      await new Promise(function(resolve) { setTimeout(resolve, 200); });
    }
  }

  async function runGeneration(req) {
    const requestId = req.requestId || ('manual_' + Date.now());
    let prompt = String(req.prompt || '').trim();
    if (!prompt) {
      dispatchToBoth({ type: 'GACHASWIPE_PERCHANCE_RESULT', requestId, ok: false, error: 'Empty prompt' });
      return;
    }

    prompt = prompt.replace(/[[{]/g, '(').replace(/[\]}]/g, ')');
    let negativePrompt = typeof req.negativePrompt === 'string' ? req.negativePrompt : '';
    negativePrompt = negativePrompt.replace(/[[{]/g, '(').replace(/[\]}]/g, ')');

    const resolution = VALID_RES.includes(req.resolution) ? req.resolution : '512x768';
    const rawCfg = Number(req.guidanceScale);
    const guidanceScale = Number.isFinite(rawCfg) ? Math.max(1, Math.min(30, Math.round(rawCfg))) : 7;
    const rawSeed = Number(req.seed);
    const seed = Number.isFinite(rawSeed) && rawSeed >= -1 ? Math.round(rawSeed) : -1;

    setStatus('STATUS: GENERATING (' + resolution + ', CFG ' + guidanceScale + ')...', '#FFC107');
    setBadge('WORKING', '#FFC107', 'rgba(255,193,7,0.35)', 'rgba(255,193,7,0.12)');
    dispatchToBoth({
      type: 'GACHASWIPE_PERCHANCE_PROGRESS',
      requestId,
      status: 'Perchance GPU: Rendering cloud frame...',
      step: 3,
      totalSteps: 20
    });

    try {
      await waitForPlugin(20000);

      const genPromise = generateImage({
        prompt: prompt,
        negativePrompt: negativePrompt,
        resolution: resolution,
        guidanceScale: guidanceScale,
        seed: seed,
        hideGalleryButtons: true
      });

      if (typeof genPromise === 'string') {
        throw new Error(genPromise);
      }

      if (stageEl && genPromise && genPromise.iframeHtml) {
        stageEl.innerHTML = genPromise.iframeHtml;
        const innerIframe = stageEl.querySelector('iframe');
        if (innerIframe) {
          innerIframe.style.width = '100%';
          innerIframe.style.height = '420px';
          innerIframe.style.border = 'none';
          innerIframe.style.display = 'block';
          if (innerIframe.dataset && innerIframe.dataset.src && !innerIframe.src) {
            innerIframe.src = innerIframe.dataset.src;
          }
        }
      }

      const result = await genPromise;
      const dataUrl = (result && result.dataUrl) ? result.dataUrl : String(result || '');

      if (!dataUrl || !dataUrl.startsWith('data:image')) {
        throw new Error('Perchance did not return a valid base64 data:image URL.');
      }

      setStatus('STATUS: COMPLETE ✔ (' + Math.round(dataUrl.length / 1024) + ' KB)', '#00FF41');
      setBadge('ONLINE', '#00FF41', 'rgba(0,255,65,0.35)', 'rgba(0,255,65,0.12)');
      if (stageEl) {
        stageEl.innerHTML = '<img src="' + dataUrl + '" alt="Generated Image" style="max-width:100%; max-height:420px; object-fit:contain; border-radius:6px; border:1px solid #00E5FF; box-shadow:0 0 16px rgba(0,229,255,0.3);" />';
      }

      dispatchToBoth({
        type: 'GACHASWIPE_PERCHANCE_RESULT',
        requestId,
        ok: true,
        dataUrl: dataUrl,
        seed: (result && result.inputs && result.inputs.seed) || seed
      });
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err || 'Unknown Perchance error');
      setStatus('STATUS: ERROR — ' + msg, '#FF3366');
      setBadge('ERROR', '#FF3366', 'rgba(255,51,102,0.35)', 'rgba(255,51,102,0.12)');
      dispatchToBoth({
        type: 'GACHASWIPE_PERCHANCE_RESULT',
        requestId,
        ok: false,
        error: msg
      });
    }
  }

  window.__gsRunManualTest = function(isAdult) {
    const input = document.getElementById('gs-test-prompt');
    const basePrompt = isAdult
      ? '1girl, nsfw, nude, uncensored, adult 18+ verification test, anime masterpiece portrait'
      : (input && input.value ? input.value : '1girl, anime masterpiece, neon cyberpunk background, smiling');
    runGeneration({
      requestId: 'manual_' + (isAdult ? '18_' : 'sfw_') + Date.now(),
      prompt: basePrompt,
      resolution: '512x768',
      guidanceScale: 7
    });
  };

  let heartbeatTimer = null;

  function handleIncomingRelayPayload(payload) {
    if (!payload || typeof payload !== 'object') return;
    if (payload.type === 'GACHASWIPE_PERCHANCE_GENERATE') {
      runGeneration(payload);
    } else if (payload.type === 'GACHASWIPE_PERCHANCE_PING') {
      dispatchToBoth({
        type: 'GACHASWIPE_PERCHANCE_READY',
        requestId: payload.requestId || null,
        channel: channel,
        generatorName: window.generatorName || 'custom',
        ts: Date.now()
      });
    }
  }

  function initRelay() {
    if (relayMqtt) {
      try { relayMqtt.close(); } catch (e) {}
      relayMqtt = null;
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    if (channel === 'gs-mika-default') {
      setStatus('⚠️ NO CHANNEL LINKED — paste your channel ID from GachaSwipe above & tap SAVE!', '#FFC107');
      setBadge('UNLINKED', '#FFC107', 'rgba(255,193,7,0.45)', 'rgba(255,193,7,0.12)');
    } else {
      setStatus('CONNECTING TO WSS RELAY [' + channel + ']...', '#FFC107');
    }

    try {
      relayMqtt = createMqtt({
        clientIdPrefix: 'gs_tab',
        pubTopic: 'gachaswipe/relay/' + channel + '/res',
        subTopic: 'gachaswipe/relay/' + channel + '/req',
        onOpen: function(brokerUrl) {
          const host = String(brokerUrl || '').slice(6).split(':')[0] || 'wss-relay';
          if (channel !== 'gs-mika-default') {
            setStatus('STATUS: READY — Connected via ' + host + ' [' + channel + ']', '#00FF41');
            setBadge('ONLINE', '#00FF41', 'rgba(0,255,65,0.35)', 'rgba(0,255,65,0.12)');
          }
          dispatchToBoth({
            type: 'GACHASWIPE_PERCHANCE_READY',
            channel: channel,
            generatorName: window.generatorName || 'custom',
            ts: Date.now()
          });
        },
        onMessage: function(payload) {
          handleIncomingRelayPayload(payload);
        },
        onDisconnect: function() {
          if (channel !== 'gs-mika-default') {
            setStatus('RELAY RECONNECTING (switching WSS broker on ' + channel + ')...', '#FFC107');
          }
        },
        onError: function(url, err) {
          console.warn('[GS Relay] WSS broker error on ' + url + ':', err);
        }
      });
      relayMqtt.connect();

      heartbeatTimer = setInterval(function() {
        dispatchToBoth({
          type: 'GACHASWIPE_PERCHANCE_READY',
          channel: channel,
          generatorName: window.generatorName || 'custom',
          ts: Date.now()
        });
      }, 20000);
    } catch (err) {
      setStatus('RELAY INIT ERROR: ' + err.message, '#FF3366');
    }
  }

  window.addEventListener('message', function(event) {
    const d = event && event.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'GACHASWIPE_PERCHANCE_PING') {
      dispatchToBoth({
        type: 'GACHASWIPE_PERCHANCE_READY',
        requestId: d.requestId || null,
        channel: channel,
        generatorName: window.generatorName || 'custom',
        ts: Date.now()
      });
    } else if (d.type === 'GACHASWIPE_PERCHANCE_GENERATE') {
      runGeneration(d);
    }
  });

  initRelay();
})();
</script>`;

// ============================================================================
// RUNTIME RELAY & HUD MONITOR (Option A — Encrypted MQTT-over-WSS Relay)
// ============================================================================

let bridgeContainer = null;
let currentEmbedUrl = '';
let bridgeReady = false;
let relayConnected = false;
let relayLastSeenAt = 0;
let relayActiveChannel = '';
let relayMqttClient = null;
let lastReadyAt = 0;
let isMonitorVisible = false;
let currentConfig = { ...DEFAULT_PERCHANCE_CONFIG };
let activeSelectedImageModel = 'Default (Auto)';
let isRelayAuthorized = false;
let lastNetworkError = null; // { url, ts, message }

const pendingRequests = new Map(); // requestId -> { resolve, reject, timer, progressInterval, onProgress, cleanupAbort, isPing }
const statusListeners = new Set(); // fn({ ready, lastReadyAt, embedUrl, isMonitorVisible, pendingCount, relayConnected, relayChannel, hasNetworkError })

// ✨ RELAY STALENESS LAW (v2.7.70): the browser tab heartbeats READY every 25s. Three
// missed heartbeats (75s) means Chrome evicted or killed the tab — but the old latch kept
// the badge ONLINE forever and the dispatch preflight never fired. isRelayStale() is the
// honest read: status.ready turns false and status.relayStale turns true.
export const RELAY_STALE_MS = 75000;

export function isRelayStale(now = Date.now()) {
    if (!relayConnected) return false;
    return (now - relayLastSeenAt) > RELAY_STALE_MS;
}

export function getPerchanceNetworkError() {
    return lastNetworkError;
}

export function clearPerchanceNetworkError() {
    lastNetworkError = null;
    if (typeof document !== 'undefined') {
        const errEl = document.getElementById('gs-hud-network-error-banner');
        if (errEl) errEl.style.display = 'none';
    }
    notifyStatusListeners();
}

export function notifyNetworkBlocked(url) {
    lastNetworkError = {
        url: url || DEFAULT_MQTT_BROKERS[0],
        ts: Date.now(),
        message: 'Layla blocked WebSocket relay connection! Please add "broker.emqx.io" and "broker.hivemq.com" (or "*") to Layla Settings ▸ Mini-app Settings allowed URLs.'
    };
    if (typeof document !== 'undefined') {
        const errEl = document.getElementById('gs-hud-network-error-banner');
        if (errEl) errEl.style.display = 'block';
    }
    notifyStatusListeners();
}

function notifyStatusListeners() {
    const snapshot = getPerchanceBridgeStatus();
    if (typeof document !== 'undefined') {
        const badgeEl = document.getElementById('gs-hud-bridge-status-badge');
        if (badgeEl) {
            badgeEl.textContent = snapshot.ready ? 'ONLINE' : (snapshot.relayStale ? 'STALE // RE-SYNC' : 'WAITING FOR BROWSER');
            badgeEl.style.color = snapshot.ready ? '#00FF41' : (snapshot.relayStale ? '#FF107A' : '#FFC107');
            badgeEl.style.borderColor = snapshot.ready ? 'rgba(0,255,65,0.4)' : (snapshot.relayStale ? 'rgba(255,16,122,0.4)' : 'rgba(255,193,7,0.4)');
            badgeEl.style.background = snapshot.ready ? 'rgba(0,255,65,0.12)' : (snapshot.relayStale ? 'rgba(255,16,122,0.12)' : 'rgba(255,193,7,0.12)');
        }
    }
    statusListeners.forEach((fn) => {
        try { fn(snapshot); } catch { /* ignore */ }
    });
}

export function subscribePerchanceBridgeStatus(listener) {
    if (typeof listener !== 'function') return () => {};
    statusListeners.add(listener);
    try { listener(getPerchanceBridgeStatus()); } catch { /* ignore */ }
    return () => statusListeners.delete(listener);
}

export function getPerchanceBridgeStatus(now = Date.now()) {
    const channel = currentConfig.relayChannel || getOrGenerateRelayChannel();
    const relayStale = isRelayStale(now);
    return {
        ready: Boolean((relayConnected || bridgeReady) && !relayStale),
        relayConnected,
        relayStale,
        relayChannel: channel,
        relayLastSeenAt,
        lastReadyAt,
        embedUrl: currentEmbedUrl || resolvePerchanceEmbedUrl(currentConfig.slug),
        pageUrl: resolvePerchancePageUrl(currentConfig.slug, channel),
        slug: currentConfig.slug,
        isMonitorVisible,
        pendingCount: pendingRequests.size,
        isActiveModel: activeSelectedImageModel === PERCHANCE_MODEL_ID,
        hasNetworkError: Boolean(lastNetworkError)
    };
}

function updateHudPreviewImage(dataUrl, seed) {
    if (typeof document === 'undefined') return;
    const stage = document.getElementById('gs-hud-preview-stage');
    if (!stage) return;
    stage.dataset.rendering = 'false';
    const kb = Math.round(dataUrl.length / 1024);
    stage.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:12px; width:100%; box-sizing:border-box;">
            <div style="position:relative; max-width:100%; display:flex; justify-content:center;">
                <img src="${dataUrl}" alt="Perchance Cloud Render" style="max-width:100%; max-height:350px; object-fit:contain; border-radius:6px; border:1px solid #00E5FF; box-shadow:0 0 24px rgba(0,229,255,0.35);" />
                <span style="position:absolute; bottom:8px; right:8px; background:rgba(11,9,20,0.85); color:#00FF41; border:1px solid rgba(0,255,65,0.4); border-radius:3px; padding:2px 6px; font-size:9px; font-weight:bold; letter-spacing:0.05em; backdrop-filter:blur(4px);">0 MB PHONE RAM</span>
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:center; font-size:10.5px; color:#00E5FF;">
                <span style="color:#00FF41; font-weight:bold;">✔ CLOUD RENDER COMPLETE</span>
                <span style="opacity:0.4;">|</span>
                <span>${kb} KB</span>
                <span style="opacity:0.4;">|</span>
                <span>${currentConfig.resolution || '512x768'}</span>
            </div>
            <div style="display:flex; gap:8px; margin-top:2px;">
                <a href="${dataUrl}" download="gachaswipe_perchance_${Date.now()}.jpg" target="_blank" style="text-decoration:none; background:rgba(0,229,255,0.18); color:#00E5FF; border:1px solid #00E5FF; border-radius:4px; padding:5px 12px; font-size:10.5px; font-weight:800; letter-spacing:0.05em; display:inline-flex; align-items:center; gap:4px; box-shadow:0 0 8px rgba(0,229,255,0.2);">
                    💾 SAVE IMAGE
                </a>
            </div>
        </div>
    `;
}

function updateHudPreviewProgress(status, step, total) {
    if (typeof document === 'undefined') return;
    const stage = document.getElementById('gs-hud-preview-stage');
    if (!stage) return;
    const pct = Math.max(5, Math.min(100, Math.round(((step || 3) / (total || 20)) * 100)));
    const textEl = stage.querySelector('.gs-hud-progress-text');
    const fillEl = stage.querySelector('.gs-hud-progress-fill');
    if (textEl) textEl.textContent = status || 'Rendering diffusion frame...';
    if (fillEl) fillEl.style.width = `${pct}%`;
}

export function handleIncomingBridgePayload(data) {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'GACHASWIPE_PERCHANCE_READY') {
        // ✨ FAIL-CLOSED CHANNEL GUARD (v2.7.70): a READY announcing a DIFFERENT channel is
        // a stranded tab from a previous relay key — it must never latch our status. An
        // absent channel (legacy postMessage path) is accepted.
        const expectedChannel = relayActiveChannel || currentConfig.relayChannel;
        if (typeof data.channel === 'string' && data.channel && expectedChannel && data.channel !== expectedChannel) {
            return;
        }
        bridgeReady = true;
        relayConnected = true;
        lastReadyAt = Date.now();
        relayLastSeenAt = Date.now();
        clearPerchanceNetworkError();
        notifyStatusListeners();
        if (data.requestId && pendingRequests.has(data.requestId)) {
            const entry = pendingRequests.get(data.requestId);
            if (entry?.isPing) {
                clearTimeout(entry.timer);
                pendingRequests.delete(data.requestId);
                entry.resolve(true);
                notifyStatusListeners();
            }
        } else {
            // If an active PING is in flight on this exact channel and a fresh live READY
            // arrives concurrently, resolve the pending ping immediately.
            const readyTs = Number(data.ts) || 0;
            pendingRequests.forEach((entry, reqId) => {
                if (!entry?.isPing) return;
                if (!readyTs || readyTs >= ((entry.issuedAtMs || 0) - 2000)) {
                    clearTimeout(entry.timer);
                    pendingRequests.delete(reqId);
                    entry.resolve(true);
                }
            });
            notifyStatusListeners();
        }
        return;
    }

    if (data.type === 'GACHASWIPE_PERCHANCE_PROGRESS') {
        const step = Number(data.step) || 3;
        const totalSteps = Number(data.totalSteps) || 20;
        updateHudPreviewProgress(data.status || 'Perchance GPU rendering cloud frame...', step, totalSteps);

        const entry = data.requestId ? pendingRequests.get(data.requestId) : null;
        if (entry && typeof entry.onProgress === 'function') {
            try {
                entry.onProgress(
                    data.status || 'Perchance Cloud: Generating...',
                    step,
                    totalSteps
                );
            } catch { /* ignore */ }
        }
        return;
    }

    if (data.type === 'GACHASWIPE_PERCHANCE_RESULT') {
        bridgeReady = true;
        relayConnected = true;
        lastReadyAt = Date.now();
        relayLastSeenAt = Date.now();
        clearPerchanceNetworkError();

        // Update live preview in HUD modal
        if (data.ok && typeof data.dataUrl === 'string' && data.dataUrl.startsWith('data:image')) {
            updateHudPreviewImage(data.dataUrl, data.seed);
        }

        const entry = data.requestId ? pendingRequests.get(data.requestId) : null;
        if (!entry) return;

        clearTimeout(entry.timer);
        if (entry.progressInterval) clearInterval(entry.progressInterval);
        if (entry.cleanupAbort) entry.cleanupAbort();
        pendingRequests.delete(data.requestId);
        notifyStatusListeners();

        if (data.ok && typeof data.dataUrl === 'string' && data.dataUrl.startsWith('data:image')) {
            if (typeof entry.onProgress === 'function') {
                try { entry.onProgress('Perchance Cloud: Complete!', 20, 20); } catch { /* ignore */ }
            }
            entry.resolve(data.dataUrl);
        } else {
            entry.reject(new Error(data.error || 'Perchance generation failed'));
        }
    }
}

export function startRelayListener(channel, { force = false } = {}) {
    if (activeSelectedImageModel !== PERCHANCE_MODEL_ID || !isRelayAuthorized) {
        stopRelayListener();
        return false;
    }

    const activeChannel = (typeof channel === 'string' && channel.trim())
        ? channel.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
        : (currentConfig.relayChannel || getOrGenerateRelayChannel());

    if (!activeChannel) return;

    // ✨ RELAY LATCH LAW (v2.7.70): switching channels — or force-rebuilding after a stale
    // latch — is a HARD disconnect. relayConnected/bridgeReady/relayLastSeenAt describe the
    // OLD topic until a fresh READY handshake lands on the NEW one. Resetting them here,
    // BEFORE the client guard, is what keeps the status badge honest and lets the
    // dispatch preflight in generateImageViaPerchance actually fire (the v2.7.70
    // "latches onto the previous relay channel" ghost).
    if (!force && relayMqttClient && relayActiveChannel === activeChannel) {
        return;
    }

    stopRelayListener();
    relayConnected = false;
    bridgeReady = false;
    relayLastSeenAt = 0;
    relayActiveChannel = activeChannel;
    notifyStatusListeners();

    if (typeof WebSocket === 'undefined') return;

    try {
        relayMqttClient = createGsMqttRelay({
            brokers: DEFAULT_MQTT_BROKERS,
            clientIdPrefix: 'gs_app',
            pubTopic: `gachaswipe/relay/${activeChannel}/req`,
            subTopic: `gachaswipe/relay/${activeChannel}/res`,
            onOpen: () => {
                if (relayActiveChannel !== activeChannel) return;
                clearPerchanceNetworkError();
                notifyStatusListeners();
            },
            onMessage: (payload) => {
                if (relayActiveChannel !== activeChannel) return;
                handleIncomingBridgePayload(payload);
            },
            onError: (url) => {
                const now = Date.now();
                if (!startRelayListener._lastWarnAt || (now - startRelayListener._lastWarnAt) >= 60000) {
                    startRelayListener._lastWarnAt = now;
                    console.warn(
                        `[GS Relay] Unable to communicate with MQTT-WSS broker (${url}). ` +
                        `Check Layla Allowed URLs (*), your AdBlocker / Private DNS whitelist (broker.emqx.io & broker.hivemq.com), ` +
                        `or tap the (?) Troubleshoot Guide next to IMAGE_DIFFUSION_ENGINE.`
                    );
                }
            }
        });
        relayMqttClient.connect();
    } catch (err) {
        console.warn('[GS Relay] WSS relay init failed:', err);
        notifyNetworkBlocked(DEFAULT_MQTT_BROKERS[0]);
    }
}

export function stopRelayListener() {
    if (relayMqttClient) {
        try { relayMqttClient.close(); } catch { /* ignore */ }
        relayMqttClient = null;
    }
    startRelayListener._lastWarnAt = 0;
    relayActiveChannel = '';
    relayConnected = false;
    bridgeReady = false;
    relayLastSeenAt = 0;
}

export async function sendRelayRequest(payload, channel, waitMs = 6500) {
    const activeChannel = (typeof channel === 'string' && channel.trim())
        ? channel.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
        : (currentConfig.relayChannel || getOrGenerateRelayChannel());

    if (!activeChannel || typeof WebSocket === 'undefined') return false;

    if (!relayMqttClient || relayActiveChannel !== activeChannel) {
        startRelayListener(activeChannel, { force: true });
    }
    if (!relayMqttClient) {
        notifyNetworkBlocked(DEFAULT_MQTT_BROKERS[0]);
        return false;
    }

    try {
        const sent = await relayMqttClient.publish(payload, waitMs);
        if (sent) {
            clearPerchanceNetworkError();
            return true;
        }
        notifyNetworkBlocked(relayMqttClient.getCurrentBroker?.() || DEFAULT_MQTT_BROKERS[0]);
        return false;
    } catch (err) {
        console.warn('[GS Relay] Dispatch error:', err);
        notifyNetworkBlocked(relayMqttClient?.getCurrentBroker?.() || DEFAULT_MQTT_BROKERS[0]);
        return false;
    }
}

function applyMonitorVisibilityStyles() {
    if (!bridgeContainer) return;
    if (isMonitorVisible) {
        bridgeContainer.style.cssText = [
            'position: fixed',
            'inset: 0',
            'z-index: 100005',
            'background: rgba(5, 3, 10, 0.88)',
            'backdrop-filter: blur(8px)',
            'display: flex',
            'flex-direction: column',
            'align-items: center',
            'justify-content: center',
            'padding: 16px',
            'opacity: 1',
            'pointer-events: auto'
        ].join(';');
    } else {
        bridgeContainer.style.cssText = [
            'position: fixed',
            'bottom: 0px',
            'right: 0px',
            'width: 340px',
            'height: 460px',
            'opacity: 0.002',
            'pointer-events: none',
            'z-index: -1',
            'overflow: hidden'
        ].join(';');
    }
}

export function setPerchanceMonitorVisible(visible) {
    isMonitorVisible = Boolean(visible);
    if (isMonitorVisible) {
        ensurePerchanceIframe();
    }
    applyMonitorVisibilityStyles();
    notifyStatusListeners();
}

let messageListenerInstalled = false;

function installGlobalMessageListener() {
    if (messageListenerInstalled || typeof window === 'undefined') return;
    messageListenerInstalled = true;

    window.addEventListener('message', (event) => {
        const data = event?.data;
        if (!data || typeof data !== 'object') return;
        handleIncomingBridgePayload(data);
    });
}

function renderIdleHudPreview(stage, channel) {
    if (!stage) return;
    stage.dataset.rendering = 'false';
    stage.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:20px; text-align:center; max-width:380px;">
            <div style="font-size:28px; filter:drop-shadow(0 0 10px rgba(0,229,255,0.5));">⚡</div>
            <div style="font-weight:900; font-size:12px; color:#00E5FF; letter-spacing:0.1em; text-shadow:0 0 8px rgba(0,229,255,0.5);">
                ZERO-RAM CLOUD DIFFUSION MONITOR
            </div>
            <div style="font-size:10.5px; color:rgba(255,255,255,0.7); line-height:1.5;">
                GachaSwipe dispatches image prompts to your external browser tab over relay channel <b style="color:#00FF41;">${channel}</b>.
            </div>
            <div style="display:flex; flex-direction:column; gap:4px; font-size:10px; color:rgba(0,229,255,0.85); background:rgba(0,229,255,0.06); border:1px solid rgba(0,229,255,0.2); border-radius:6px; padding:8px 12px; width:100%; box-sizing:border-box; text-align:left;">
                <div>• <b>Phone RAM Impact:</b> 0 MB (No local LLM eviction)</div>
                <div>• <b>Cloud GPU Cluster:</b> Perchance FLUX</div>
                <div>• <b>Browser Tab:</b> Must be kept open in background</div>
                <div>• <b>18+ Adult Gate:</b> Native verification in Chrome</div>
            </div>
            <div style="font-size:10px; color:#FFC107;">
                Tap <b>[✨ TEST SFW]</b> above to verify your cloud connection!
            </div>
        </div>
    `;
}

async function runHudManualTest(isAdult = false) {
    const channel = currentConfig.relayChannel || getOrGenerateRelayChannel();
    startRelayListener(channel);

    if (isAdult) {
        const pageUrl = resolvePerchancePageUrl(currentConfig.slug, channel);
        try { window.open(pageUrl, '_blank'); } catch { /* ignore */ }
    }

    const stage = document.getElementById('gs-hud-preview-stage');
    if (stage) {
        stage.dataset.rendering = 'true';
        stage.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:24px; text-align:center; width:100%; box-sizing:border-box;">
                <div style="font-weight:900; font-size:12px; color:${isAdult ? '#FF107A' : '#00E5FF'}; letter-spacing:0.08em; text-shadow:0 0 8px ${isAdult ? 'rgba(255,16,122,0.6)' : 'rgba(0,229,255,0.6)'};">
                    ${isAdult ? '🔞 DISPATCHING 18+ ADULT VERIFICATION TEST...' : '⚡ DISPATCHING SAFE CLOUD TEST PROMPT...'}
                </div>
                <div class="gs-hud-progress-text" style="font-size:11px; color:#FFC107; font-weight:bold; min-height:18px;">
                    ${isAdult ? 'Switch to your Chrome tab! Tap "I am 18 or older" if prompted.' : 'Dispatching prompt to cloud GPU relay...'}
                </div>
                <div style="width:100%; max-width:320px; height:8px; background:#141024; border:1px solid ${isAdult ? 'rgba(255,16,122,0.4)' : 'rgba(0,229,255,0.4)'}; border-radius:4px; overflow:hidden;">
                    <div class="gs-hud-progress-fill" style="width:15%; height:100%; background:linear-gradient(90deg, ${isAdult ? '#FF107A, #00E5FF' : '#00E5FF, #00FF41'}); transition:width 0.3s ease;"></div>
                </div>
                <div style="font-size:10px; color:rgba(255,255,255,0.6); max-width:340px; line-height:1.4;">
                    ${isAdult ? 'Once confirmed in Chrome, your browser is permanently unlocked for adult generation!' : 'Offloaded to Perchance GPU via channel [' + channel + '] • 0 MB Phone RAM'}
                </div>
            </div>
        `;
    }

    const testPrompt = isAdult
        ? '1girl, nsfw, nude, uncensored, adult 18+ verification test, anime masterpiece portrait'
        : '1girl, anime masterpiece, neon cyberpunk background, smiling';

    try {
        const dataUrl = await generateImageViaPerchance(testPrompt, (status, step, total) => {
            updateHudPreviewProgress(status, step, total);
        });
        updateHudPreviewImage(dataUrl);
    } catch (err) {
        if (stage) {
            stage.dataset.rendering = 'false';
            stage.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:20px; text-align:center;">
                    <div style="font-size:12px; font-weight:bold; color:#FF3366;">❌ GENERATION ERROR</div>
                    <div style="font-size:10.5px; color:rgba(255,255,255,0.8); max-width:380px; line-height:1.4;">
                        ${err?.message || 'Generation timed out or failed.'}
                    </div>
                    <div style="font-size:10px; color:#00E5FF; margin-top:6px;">
                        Ensure your Perchance generator is open in Chrome and tap [↗ OPEN IN BROWSER]!
                    </div>
                </div>
            `;
        }
    }
}

function renderHudHelperBarHtml(channel) {
    return `<b>Zero-RAM Cloud Bridge:</b> Tap <span style="color:#00E5FF;font-weight:bold;">[ ↗ OPEN IN BROWSER ]</span> once to launch in Chrome/Firefox and leave that tab open in the background. GachaSwipe dispatches prompts to your channel <code style="color:#00FF41;font-weight:bold;">${channel}</code> with 0 MB phone RAM!`;
}

export function ensurePerchanceIframe(forceReload = false) {
    if (typeof document === 'undefined') return null;
    installGlobalMessageListener();

    const channel = currentConfig.relayChannel || getOrGenerateRelayChannel();
    startRelayListener(channel);

    if (!bridgeContainer) {
        bridgeContainer = document.createElement('div');
        bridgeContainer.id = 'mika-perchance-bridge-modal';

        const card = document.createElement('div');
        card.style.cssText = [
            'width: 100%',
            'max-width: 520px',
            'background: #0B0914',
            'border: 1px solid #00E5FF',
            'border-radius: 10px',
            'box-shadow: 0 12px 48px rgba(0, 0, 0, 0.9), 0 0 20px rgba(0, 229, 255, 0.25)',
            'display: flex',
            'flex-direction: column',
            'overflow: hidden',
            'font-family: ui-monospace, SFMono-Regular, Menlo, monospace'
        ].join(';');

        const header = document.createElement('div');
        header.style.cssText = [
            'display: flex',
            'justify-content: space-between',
            'align-items: center',
            'padding: 10px 14px',
            'background: rgba(0, 229, 255, 0.08)',
            'border-bottom: 1px solid rgba(0, 229, 255, 0.25)',
            'color: #00E5FF'
        ].join(';');

        const titleGroup = document.createElement('div');
        titleGroup.style.cssText = 'display: flex; align-items: center; gap: 8px;';
        titleGroup.innerHTML = `
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#00E5FF; box-shadow:0 0 8px #00E5FF;"></span>
            <span style="font-weight:900; font-size:12px; letter-spacing:0.1em; text-shadow:0 0 8px rgba(0,229,255,0.6);">PERCHANCE // ZERO-RAM RELAY MONITOR</span>
        `;

        const headerActions = document.createElement('div');
        headerActions.style.cssText = 'display: flex; align-items: center; gap: 8px;';

        const statusBadge = document.createElement('span');
        statusBadge.id = 'gs-hud-bridge-status-badge';
        statusBadge.style.cssText = 'background: rgba(0,255,65,0.12); color: #00FF41; border: 1px solid rgba(0,255,65,0.35); border-radius: 4px; padding: 2px 7px; font-size: 10px; font-weight: bold; letter-spacing: 0.06em;';
        statusBadge.textContent = (relayConnected || bridgeReady) ? 'ONLINE' : 'WAITING FOR BROWSER';

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '✕ HIDE';
        closeBtn.style.cssText = 'background: rgba(255,51,102,0.15); color: #FF3366; border: 1px solid rgba(255,51,102,0.45); border-radius: 4px; padding: 4px 10px; font-size: 11px; font-weight: 800; cursor: pointer; font-family: inherit; letter-spacing: 0.05em; transition: all 0.15s ease; box-shadow: 0 0 6px rgba(255,51,102,0.2);';
        closeBtn.onclick = () => setPerchanceMonitorVisible(false);

        headerActions.appendChild(statusBadge);
        headerActions.appendChild(closeBtn);
        header.appendChild(titleGroup);
        header.appendChild(headerActions);

        // Dedicated HUD Control Bar (Row 2 — sleek full-width cyber chips)
        const hudToolbar = document.createElement('div');
        hudToolbar.style.cssText = [
            'display: flex',
            'align-items: center',
            'gap: 6px',
            'padding: 8px 12px',
            'background: #100C1F',
            'border-bottom: 1px solid rgba(0, 229, 255, 0.2)',
            'flex-wrap: wrap'
        ].join(';');

        const openWebBtn = document.createElement('button');
        openWebBtn.type = 'button';
        openWebBtn.textContent = '↗ OPEN IN BROWSER';
        openWebBtn.title = 'Open generator page in browser to run with 0 MB phone RAM';
        openWebBtn.style.cssText = 'flex: 1.2; min-width: 130px; background: rgba(0,229,255,0.18); color: #00E5FF; border: 1px solid #00E5FF; border-radius: 4px; padding: 6px 10px; font-size: 11px; font-weight: 800; cursor: pointer; font-family: inherit; letter-spacing: 0.06em; text-align: center; text-shadow: 0 0 6px rgba(0,229,255,0.6); box-shadow: 0 0 8px rgba(0,229,255,0.18); transition: all 0.15s;';
        openWebBtn.onclick = () => {
            // ✨ CLICK-TIME CHANNEL LAW (v2.7.70): read the relay channel at CLICK time —
            // creation-time closures kept opening the OLD relay URL after [⟳ New Channel].
            const pageUrl = resolvePerchancePageUrl(currentConfig.slug, currentConfig.relayChannel || getOrGenerateRelayChannel());
            try {
                window.open(pageUrl, '_blank');
            } catch (err) {
                console.warn('[GS Bridge] window.open error:', err);
            }
        };

        const copyLinkBtn = document.createElement('button');
        copyLinkBtn.type = 'button';
        copyLinkBtn.textContent = '📋 COPY LINK';
        copyLinkBtn.title = 'Copy full generator URL with channel hash';
        copyLinkBtn.style.cssText = 'flex: 0 0 auto; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.85); border: 1px solid rgba(255,255,255,0.25); border-radius: 4px; padding: 6px 9px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; letter-spacing: 0.05em; transition: all 0.15s;';
        copyLinkBtn.onclick = () => {
            const pageUrl = resolvePerchancePageUrl(currentConfig.slug, currentConfig.relayChannel || getOrGenerateRelayChannel());
            if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(pageUrl);
            }
        };

        const testSfwBtn = document.createElement('button');
        testSfwBtn.type = 'button';
        testSfwBtn.textContent = '✨ TEST SFW';
        testSfwBtn.title = 'Test safe generation over relay and display live preview';
        testSfwBtn.style.cssText = 'flex: 0 0 auto; background: rgba(0,255,65,0.12); color: #00FF41; border: 1px solid #00FF41; border-radius: 4px; padding: 6px 8px; font-size: 11px; font-weight: 800; cursor: pointer; font-family: inherit; letter-spacing: 0.06em; transition: all 0.15s;';
        testSfwBtn.onclick = () => runHudManualTest(false);

        const verify18Btn = document.createElement('button');
        verify18Btn.type = 'button';
        verify18Btn.textContent = '🔞 VERIFY 18+';
        verify18Btn.title = 'Opens Chrome tab and requests 18+ age verification';
        verify18Btn.style.cssText = 'flex: 0 0 auto; background: rgba(255,16,122,0.2); color: #FF107A; border: 1px solid #FF107A; border-radius: 4px; padding: 6px 8px; font-size: 11px; font-weight: 800; cursor: pointer; font-family: inherit; letter-spacing: 0.06em; text-align: center; text-shadow: 0 0 6px rgba(255,16,122,0.6); box-shadow: 0 0 8px rgba(255,16,122,0.2); transition: all 0.15s;';
        verify18Btn.onclick = () => runHudManualTest(true);

        const reloadBtn = document.createElement('button');
        reloadBtn.type = 'button';
        reloadBtn.textContent = '⟳ RE-SYNC';
        reloadBtn.title = 'Reconnect relay listener and refresh status';
        reloadBtn.style.cssText = 'flex: 0 0 auto; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.85); border: 1px solid rgba(255,255,255,0.25); border-radius: 4px; padding: 6px 8px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; letter-spacing: 0.05em; transition: all 0.15s;';
        reloadBtn.onclick = () => ensurePerchanceIframe(true);

        hudToolbar.appendChild(openWebBtn);
        hudToolbar.appendChild(copyLinkBtn);
        hudToolbar.appendChild(testSfwBtn);
        hudToolbar.appendChild(verify18Btn);
        hudToolbar.appendChild(reloadBtn);

        const helperBar = document.createElement('div');
        helperBar.id = 'gs-hud-helper-bar';
        helperBar.style.cssText = 'padding: 8px 14px; font-size: 10.5px; color: rgba(255,255,255,0.75); background: #0D0A18; border-bottom: 1px solid rgba(0,229,255,0.15); line-height: 1.45;';
        helperBar.innerHTML = renderHudHelperBarHtml(channel);

        const networkErrorBanner = document.createElement('div');
        networkErrorBanner.id = 'gs-hud-network-error-banner';
        networkErrorBanner.style.cssText = 'display:none; padding:8px 12px; font-size:10.5px; line-height:1.4; color:#FFC107; background:rgba(255,193,7,0.12); border-bottom:1px solid rgba(255,193,7,0.3);';
        networkErrorBanner.innerHTML = `⚠️ <b>Layla Network Notice:</b> If relay requests fail, go to Layla <b>Settings ▸ Mini-app Settings</b> and add <code style="color:#00FF41; background:rgba(0,0,0,0.4); padding:1px 4px; border-radius:3px;">broker.emqx.io</code> &amp; <code style="color:#00FF41; background:rgba(0,0,0,0.4); padding:1px 4px; border-radius:3px;">broker.hivemq.com</code> (or <code style="color:#00FF41; background:rgba(0,0,0,0.4); padding:1px 4px; border-radius:3px;">*</code>) to Allowed URLs!`;

        const previewStage = document.createElement('div');
        previewStage.id = 'gs-hud-preview-stage';
        previewStage.style.cssText = 'width: 100%; min-height: 380px; max-height: 480px; display: flex; align-items: center; justify-content: center; background: #07050c; border: 1px dashed rgba(0,229,255,0.25); border-radius: 6px; overflow-y: auto; overflow-x: hidden; position: relative; box-sizing: border-box;';
        renderIdleHudPreview(previewStage, channel);

        card.appendChild(header);
        card.appendChild(hudToolbar);
        card.appendChild(helperBar);
        card.appendChild(networkErrorBanner);
        card.appendChild(previewStage);
        bridgeContainer.appendChild(card);
        applyMonitorVisibilityStyles();
        document.body.appendChild(bridgeContainer);
    }

    if (forceReload) {
        clearPerchanceNetworkError();
        // ✨ RE-SYNC MUST REBUILD (v2.7.70): force=true is a HARD rebuild — the old
        // same-channel early-return made this button a no-op after a silent disconnect.
        startRelayListener(channel, { force: true });
        pingPerchanceBridge(3000).catch(() => {});
        const stage = document.getElementById('gs-hud-preview-stage');
        if (stage) renderIdleHudPreview(stage, channel);
        const helperBarEl = document.getElementById('gs-hud-helper-bar');
        if (helperBarEl) helperBarEl.innerHTML = renderHudHelperBarHtml(channel);
    }

    return bridgeContainer;
}

export function configurePerchanceBridge({ config, selectedImageModel, relayAuthorized } = {}) {
    let channelChanged = false;
    if (config) {
        const next = normalizePerchanceConfig(config);
        channelChanged = next.relayChannel !== currentConfig.relayChannel;
        currentConfig = next;
        try {
            if (typeof localStorage !== 'undefined' && next.relayChannel) {
                localStorage.setItem('gs_perchance_relay_channel', next.relayChannel);
            }
        } catch (e) {}
    }
    if (selectedImageModel !== undefined) {
        activeSelectedImageModel = selectedImageModel;
    }
    if (relayAuthorized !== undefined) {
        isRelayAuthorized = Boolean(relayAuthorized);
    }

    const canConnect = activeSelectedImageModel === PERCHANCE_MODEL_ID && isRelayAuthorized;
    if (!canConnect) {
        stopRelayListener();
        if (bridgeContainer) {
            setPerchanceMonitorVisible(false);
        }
        notifyStatusListeners();
        return;
    }

    const nextChannel = currentConfig.relayChannel || getOrGenerateRelayChannel();
    if (channelChanged || !relayMqttClient || relayActiveChannel !== nextChannel) {
        startRelayListener(nextChannel, { force: Boolean(channelChanged) });
        if (channelChanged && bridgeContainer) {
            ensurePerchanceIframe(true);
        }
    }
    notifyStatusListeners();
}

export function isPerchanceRelayAuthorized() {
    return isRelayAuthorized;
}

export function pingPerchanceBridge(timeoutMs = 4000) {
    if (activeSelectedImageModel !== PERCHANCE_MODEL_ID || !isRelayAuthorized) {
        return Promise.resolve(false);
    }
    const channel = currentConfig.relayChannel || getOrGenerateRelayChannel();
    startRelayListener(channel);

    const requestId = `ping_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const issuedAtMs = Date.now();
    const publishWaitMs = Math.max(400, timeoutMs - 250);

    return new Promise((resolve) => {
        let settled = false;

        const finish = (val) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            pendingRequests.delete(requestId);
            notifyStatusListeners();
            resolve(Boolean(val));
        };

        const timer = setTimeout(() => {
            finish(false);
        }, timeoutMs);

        pendingRequests.set(requestId, {
            isPing: true,
            issuedAtMs,
            resolve: (val) => finish(val),
            reject: () => finish(false),
            timer
        });

        // Ping cloud relay over MQTT-WSS (fail fast if Layla sandbox blocks WebSockets)
        sendRelayRequest({ type: 'GACHASWIPE_PERCHANCE_PING', requestId }, channel, publishWaitMs)
            .then((ok) => {
                if (!ok) finish(false);
            })
            .catch(() => finish(false));
    });
}

function makeAbortError() {
    const err = new Error('The operation was aborted.');
    err.name = 'AbortError';
    return err;
}

/**
 * Generate an image through the Perchance web relay.
 * Matches `layla.images.generateImage(prompt, onProgress, img2img, modelId, options)` semantics.
 */
export async function generateImageViaPerchance(prompt, onProgress, options = {}) {
    const signal = options?.signal;
    if (signal?.aborted) {
        throw makeAbortError();
    }

    if (!isRelayAuthorized) {
        const declinedErr = new Error(
            'Perchance relay connection is declined or awaiting confirmation. Open Settings ▸ > PERCHANCE_CLOUD_BRIDGE ▸ Relay Consent to connect.'
        );
        declinedErr.code = 'PERCHANCE_RELAY_DECLINED';
        throw declinedErr;
    }

    const cfg = currentConfig;
    const channel = cfg.relayChannel || getOrGenerateRelayChannel();

    // ✨ DISPATCH PREFLIGHT LAW (v2.7.70): never burn the full generation timeout on a dead
    // relay. If the bridge is not honestly ready (never-connected OR latched-stale), rebuild
    // the SSE listener, ping the channel twice, and fail FAST with the reconnect URL.
    // Requests only reach the tab through its `-req` SSE — an unanswered ping means the
    // dispatch would land in the void anyway.
    const bridgeStatus = getPerchanceBridgeStatus();
    if (!bridgeStatus.ready) {
        startRelayListener(channel, { force: Boolean(bridgeStatus.relayStale) });
        if (typeof onProgress === 'function') {
            try { onProgress(`Perchance Cloud: Probing relay channel [${channel}]...`, 1, 20); } catch { /* ignore */ }
        }
        const relayAlive = (await pingPerchanceBridge(3000)) || (await pingPerchanceBridge(3000));
        if (!relayAlive) {
            const pageUrl = resolvePerchancePageUrl(cfg.slug, channel);
            const unreachable = new Error(
                `Perchance relay is not responding on channel "${channel}". ` +
                `Open (or re-open) your bridge tab in Chrome/Firefox: ${pageUrl} ` +
                `— then tap [⟳ RE-SYNC] and retry. (Heartbeats stop when the tab is closed or evicted.)`
            );
            unreachable.code = 'PERCHANCE_RELAY_UNREACHABLE';
            throw unreachable;
        }
    }

    if (signal?.aborted) {
        throw makeAbortError();
    }

    const { prompt: finalPrompt, negativePrompt: finalNegativePrompt } = buildPerchanceStyledPrompt(prompt, cfg);

    const requestId = `gs_t2i_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const timeoutMs = (cfg.timeoutSec || 180) * 1000;

    const requestPayload = {
        type: 'GACHASWIPE_PERCHANCE_GENERATE',
        requestId,
        prompt: finalPrompt,
        negativePrompt: finalNegativePrompt,
        resolution: cfg.resolution || '512x768',
        guidanceScale: cfg.guidanceScale || 7,
        seed: -1
    };

    return new Promise((resolve, reject) => {
        let simulatedStep = 2;
        if (typeof onProgress === 'function') {
            try { onProgress('Perchance Cloud: Queued on relay...', simulatedStep, 20); } catch { /* ignore */ }
        }

        const progressInterval = setInterval(() => {
            if (simulatedStep < 18) {
                simulatedStep += 1;
                if (typeof onProgress === 'function') {
                    try {
                        let label;
                        if (simulatedStep < 6) {
                            label = 'Perchance Cloud: Dispatching prompt to GPU...';
                        } else if (simulatedStep < 13) {
                            label = 'Perchance Cloud: Rendering diffusion steps...';
                        } else if (simulatedStep < 17) {
                            label = 'Perchance Cloud: Finalizing render & transfer...';
                        } else {
                            label = 'Perchance Cloud: Waiting for cloud render... (Open Chrome tab if 18+ check needed)';
                        }
                        onProgress(label, simulatedStep, 20);
                    } catch { /* ignore */ }
                }
            }
        }, 900);

        const timer = setTimeout(() => {
            clearInterval(progressInterval);
            if (cleanupAbort) cleanupAbort();
            pendingRequests.delete(requestId);
            notifyStatusListeners();
            const pageUrl = resolvePerchancePageUrl(cfg.slug, channel);
            reject(new Error(
                `Perchance bridge timed out after ${cfg.timeoutSec || 180}s. ` +
                `Ensure your Perchance generator is open in a browser tab (${pageUrl}) with channel "${channel}". ` +
                `Tap [↗ OPEN IN BROWSER] to launch it in Chrome/Firefox!`
            ));
        }, timeoutMs);

        let cleanupAbort = null;
        if (signal) {
            const onAbort = () => {
                clearTimeout(timer);
                clearInterval(progressInterval);
                pendingRequests.delete(requestId);
                notifyStatusListeners();
                reject(makeAbortError());
            };
            signal.addEventListener('abort', onAbort, { once: true });
            cleanupAbort = () => signal.removeEventListener('abort', onAbort);
        }

        pendingRequests.set(requestId, {
            resolve: (val) => {
                clearInterval(progressInterval);
                resolve(val);
            },
            reject: (err) => {
                clearInterval(progressInterval);
                reject(err);
            },
            timer,
            progressInterval,
            onProgress,
            cleanupAbort
        });
        notifyStatusListeners();

        // ✨ DISPATCH GUARD (v2.7.70): await MQTT publish (10s cap) — a blocked/failed dispatch
        // used to burn the full generation timeout in silence.
        (async () => {
            const dispatched = await Promise.race([
                sendRelayRequest(requestPayload, channel, 7500),
                new Promise((res) => setTimeout(() => res(false), 10000))
            ]);
            if (!dispatched) {
                clearInterval(progressInterval);
                clearTimeout(timer);
                if (typeof cleanupAbort === 'function') cleanupAbort();
                pendingRequests.delete(requestId);
                notifyStatusListeners();
                const dispatchErr = new Error(
                    'Perchance relay dispatch failed. Check Layla Settings ▸ Mini-app Settings ▸ Allowed URLs includes "broker.emqx.io" & "broker.hivemq.com" (or "*"), then retry. Channel: ' + channel
                );
                dispatchErr.code = 'PERCHANCE_DISPATCH_FAILED';
                reject(dispatchErr);
            }
        })();
    });
}

export function isPerchanceModelSelected(modelId) {
    return modelId === PERCHANCE_MODEL_ID || activeSelectedImageModel === PERCHANCE_MODEL_ID;
}
