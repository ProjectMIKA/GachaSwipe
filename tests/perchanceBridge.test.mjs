import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    PERCHANCE_MODEL_ID,
    PERCHANCE_HTML_TEMPLATE,
    DEFAULT_PERCHANCE_SLUG,
    PERCHANCE_STYLE_PRESETS,
    DEFAULT_PERCHANCE_STYLE_ID,
    getPerchanceStylePreset,
    buildPerchanceStyledPrompt,
    normalizePerchanceSlug,
    resolvePerchanceEmbedUrl,
    resolvePerchancePageUrl,
    normalizePerchanceConfig,
    configurePerchanceBridge,
    isPerchanceModelSelected,
    sanitizePerchancePrompt,
    generateRandomRelayChannel,
    getOrGenerateRelayChannel,
    getPerchanceBridgeStatus,
    getPerchanceNetworkError,
    notifyNetworkBlocked,
    clearPerchanceNetworkError,
    handleIncomingBridgePayload,
    startRelayListener,
    stopRelayListener,
    pingPerchanceBridge,
    isRelayStale,
    RELAY_STALE_MS,
    createGsMqttRelay,
    DEFAULT_MQTT_BROKERS
} from '../src/utils/perchanceBridge.js';
import { classifyImageModel } from '../src/utils/deepPromptMode.js';

test('normalizePerchanceSlug handles bare names, full URLs, and null.perchance.org embeds', () => {
    assert.equal(normalizePerchanceSlug('gachaswipe-bridge'), 'gachaswipe-bridge');
    assert.equal(normalizePerchanceSlug('https://perchance.org/my-custom-gen'), 'my-custom-gen');
    assert.equal(normalizePerchanceSlug('https://null.perchance.org/my-custom-gen#edit'), 'my-custom-gen');
    assert.equal(normalizePerchanceSlug('  perchance.org/Anime_Bridge_01/extra  '), 'anime_bridge_01');
    assert.equal(normalizePerchanceSlug(''), DEFAULT_PERCHANCE_SLUG);
    assert.equal(normalizePerchanceSlug(null), DEFAULT_PERCHANCE_SLUG);
});

test('resolvePerchanceEmbedUrl and resolvePerchancePageUrl build clean Perchance URLs', () => {
    assert.equal(
        resolvePerchanceEmbedUrl('https://perchance.org/gachaswipe-bridge'),
        'https://null.perchance.org/gachaswipe-bridge'
    );
    assert.equal(
        resolvePerchancePageUrl('https://null.perchance.org/gachaswipe-bridge'),
        'https://perchance.org/gachaswipe-bridge'
    );
});

test('normalizePerchanceConfig enforces integer guidanceScale (1..30) and valid Perchance resolutions', () => {
    const cfg = normalizePerchanceConfig({
        slug: 'https://perchance.org/test-slug',
        resolution: '999x999', // invalid -> fallback to 512x768
        guidanceScale: 7.6,    // float -> rounded to 8 (text-to-image-plugin requires integers)
        timeoutSec: 10         // clamped to >= 30
    });
    assert.equal(cfg.slug, 'test-slug');
    assert.equal(cfg.resolution, '512x768');
    assert.equal(cfg.guidanceScale, 8);
    assert.equal(cfg.timeoutSec, 30);
});

test('classifyImageModel classifies Perchance Cloud as a long_encoder model', () => {
    assert.equal(classifyImageModel(PERCHANCE_MODEL_ID), 'long_encoder');
});

test('isPerchanceModelSelected matches explicit modelId or active selectedImageModel', () => {
    configurePerchanceBridge({ selectedImageModel: 'Default (Auto)' });
    assert.equal(isPerchanceModelSelected(undefined), false);
    assert.equal(isPerchanceModelSelected(PERCHANCE_MODEL_ID), true);

    configurePerchanceBridge({ selectedImageModel: PERCHANCE_MODEL_ID });
    assert.equal(isPerchanceModelSelected(undefined), true);
    configurePerchanceBridge({ selectedImageModel: 'Default (Auto)' });
});

test('PERCHANCE_STYLE_PRESETS and buildPerchanceStyledPrompt format prompts and deduplicate negatives', () => {
    assert.ok(PERCHANCE_STYLE_PRESETS.length >= 7);
    const defaultPreset = getPerchanceStylePreset('unknown_preset');
    assert.equal(defaultPreset.id, DEFAULT_PERCHANCE_STYLE_ID);

    const painted = buildPerchanceStyledPrompt('silver hair, crimson eyes, smiling', {
        stylePreset: 'painted_anime',
        negativePrompt: 'blurry, extra fingers',
        dismissedNetworkGuide: true
    });
    assert.equal(painted.preset.id, 'painted_anime');
    assert.ok(painted.prompt.includes('digital anime painting, silver hair, crimson eyes, smiling'));
    assert.ok(painted.prompt.includes('in the style of wlop and kantoku'));
    assert.ok(painted.negativePrompt.includes('3d'));
    assert.ok(painted.negativePrompt.includes('extra fingers'));
    // Ensure 'blurry' is deduplicated in merged negative prompt
    const blurryMatches = painted.negativePrompt.split(',').map(s => s.trim()).filter(s => s === 'blurry');
    assert.equal(blurryMatches.length, 1);

    const rawCustom = buildPerchanceStyledPrompt('1girl, gothic dress', {
        stylePreset: 'raw_custom',
        artStyleSuffix: 'retro 90s cel anime, vhs grain',
        dismissedNetworkGuide: true
    });
    assert.equal(rawCustom.prompt, '1girl, gothic dress, retro 90s cel anime, vhs grain');

    const norm = normalizePerchanceConfig({ stylePreset: 'casual_photo', dismissedNetworkGuide: true });
    assert.equal(norm.stylePreset, 'casual_photo');
    assert.equal(norm.dismissedNetworkGuide, true);
});

test('sanitizePerchancePrompt converts square and curly brackets to parentheses to prevent Perchance list syntax collisions', () => {
    assert.equal(sanitizePerchancePrompt('[masterpiece:1.2], {solo}, [1girl]'), '(masterpiece:1.2), (solo), (1girl)');
    assert.equal(sanitizePerchancePrompt(''), '');
    assert.equal(sanitizePerchancePrompt(null), '');

    const sanitizedRes = buildPerchanceStyledPrompt('[1girl], {cyberpunk:1.1}', {
        stylePreset: 'raw_custom',
        artStyleSuffix: '',
        negativePrompt: '[bad anatomy], {worst quality}',
        dismissedNetworkGuide: true
    });
    assert.equal(sanitizedRes.prompt, '(1girl), (cyberpunk:1.1)');
    assert.ok(!sanitizedRes.prompt.includes('['));
    assert.ok(!sanitizedRes.prompt.includes('{'));
    assert.ok(sanitizedRes.negativePrompt.includes('(bad anatomy)'));
    assert.ok(sanitizedRes.negativePrompt.includes('(worst quality)'));
    assert.ok(!sanitizedRes.negativePrompt.includes('['));
    assert.ok(!sanitizedRes.negativePrompt.includes('{'));
});

test('relayChannel helpers and resolvePerchancePageUrl hash attachment', () => {
    const randChannel = generateRandomRelayChannel();
    assert.ok(randChannel.startsWith('gs-mika-'));
    assert.ok(randChannel.length >= 10);

    const defaultChannel = getOrGenerateRelayChannel();
    assert.ok(defaultChannel);

    const urlWithChan = resolvePerchancePageUrl('gachaswipe-bridge', 'test-channel-99');
    assert.equal(urlWithChan, 'https://perchance.org/gachaswipe-bridge#channel=test-channel-99');

    const normalized = normalizePerchanceConfig({
        relayChannel: 'My_Channel-123!'
    });
    assert.equal(normalized.relayChannel, 'my_channel-123');

    const status = getPerchanceBridgeStatus();
    assert.ok(status.relayChannel);
    assert.equal(typeof status.ready, 'boolean');
    assert.equal(typeof status.hasNetworkError, 'boolean');
});

test('network error reporting helpers track and clear connection blocks', () => {
    clearPerchanceNetworkError();
    assert.equal(getPerchanceNetworkError(), null);
    assert.equal(getPerchanceBridgeStatus().hasNetworkError, false);

    notifyNetworkBlocked('wss://broker.emqx.io:8084/mqtt');
    const err = getPerchanceNetworkError();
    assert.ok(err);
    assert.ok(err.url.includes('broker.emqx.io'));
    assert.equal(getPerchanceBridgeStatus().hasNetworkError, true);

    clearPerchanceNetworkError();
    assert.equal(getPerchanceNetworkError(), null);
    assert.equal(getPerchanceBridgeStatus().hasNetworkError, false);
});

test('relay latch law: channel re-key hard-disconnects and resets the READY latch', () => {
    configurePerchanceBridge({ config: { relayChannel: 'latch-a' } });
    handleIncomingBridgePayload({ type: 'GACHASWIPE_PERCHANCE_READY', channel: 'latch-a' });
    assert.equal(getPerchanceBridgeStatus().ready, true);

    // Re-key to a fresh channel: the old topic's READY latch must NOT survive
    configurePerchanceBridge({ config: { relayChannel: 'latch-b' } });
    const st = getPerchanceBridgeStatus();
    assert.equal(st.relayChannel, 'latch-b');
    assert.equal(st.ready, false);
    assert.equal(st.relayStale, false);
    assert.equal(st.relayConnected, false);
});

test('fail-closed channel guard: READY from a foreign channel never latches status', () => {
    configurePerchanceBridge({ config: { relayChannel: 'guard-a' } });
    handleIncomingBridgePayload({ type: 'GACHASWIPE_PERCHANCE_READY', channel: 'somewhere-else' });
    assert.equal(getPerchanceBridgeStatus().ready, false);

    handleIncomingBridgePayload({ type: 'GACHASWIPE_PERCHANCE_READY', channel: 'guard-a' });
    assert.equal(getPerchanceBridgeStatus().ready, true);
});

test('legacy READY without a channel field is accepted (postMessage dual path)', () => {
    configurePerchanceBridge({ config: { relayChannel: 'legacy-a' } });
    handleIncomingBridgePayload({ type: 'GACHASWIPE_PERCHANCE_READY' });
    assert.equal(getPerchanceBridgeStatus().ready, true);
});

test('staleness law: 3 missed 25s heartbeats flip ready=false + relayStale=true', () => {
    configurePerchanceBridge({ config: { relayChannel: 'stale-a' } });
    handleIncomingBridgePayload({ type: 'GACHASWIPE_PERCHANCE_READY', channel: 'stale-a' });
    assert.equal(getPerchanceBridgeStatus().ready, true);
    assert.equal(isRelayStale(), false);

    // Wall-clock time travel: just past the 75s window (3 missed 25s heartbeats)
    const future = Date.now() + RELAY_STALE_MS + 1;
    assert.equal(isRelayStale(future), true);
    const st = getPerchanceBridgeStatus(future);
    assert.equal(st.relayStale, true);
    assert.equal(st.ready, false);
    assert.equal(st.relayConnected, true); // the latch remains, staleness is the honest read

    // A fresh READY on the same channel clears staleness again
    handleIncomingBridgePayload({ type: 'GACHASWIPE_PERCHANCE_READY', channel: 'stale-a' });
    assert.equal(getPerchanceBridgeStatus().ready, true);
});

test('PERCHANCE_HTML_TEMPLATE includes audible keep-alive, MediaSession artwork, smart channel extraction, and MQTT-WSS relay', () => {
    assert.ok(PERCHANCE_HTML_TEMPLATE.includes('id="gs-start-relay-btn"'));
    assert.ok(PERCHANCE_HTML_TEMPLATE.includes('id="gs-silent-audio"'));
    assert.ok(PERCHANCE_HTML_TEMPLATE.includes('controls'));
    assert.ok(PERCHANCE_HTML_TEMPLATE.includes('window.__gsToggleKeepAlive'));
    assert.ok(PERCHANCE_HTML_TEMPLATE.includes('buildSilentWavUrl'));
    assert.ok(PERCHANCE_HTML_TEMPLATE.includes('buildArtworkUrl'));
    assert.ok(PERCHANCE_HTML_TEMPLATE.includes('playbackState'));
    assert.ok(PERCHANCE_HTML_TEMPLATE.includes('extractChannel('));
    assert.ok(PERCHANCE_HTML_TEMPLATE.includes('wss://broker.emqx.io:8084/mqtt'));
    assert.ok(PERCHANCE_HTML_TEMPLATE.includes('wss://broker.hivemq.com:8884/mqtt'));
    assert.ok(PERCHANCE_HTML_TEMPLATE.includes('NO CHANNEL LINKED'));

    // Verify embedded <script> parses cleanly with zero syntax errors
    const match = PERCHANCE_HTML_TEMPLATE.match(/<script>([\s\S]*?)<\/script>/);
    assert.ok(match && match[1], 'Expected <script> block in PERCHANCE_HTML_TEMPLATE');
    assert.doesNotThrow(() => new Function(match[1]));
});

test('createGsMqttRelay encodes/decodes MQTT packets including >128B varints and reassembles chunked frames', () => {
    const received = [];
    const relay = createGsMqttRelay({
        brokers: DEFAULT_MQTT_BROKERS,
        pubTopic: 'gachaswipe/relay/test/req',
        subTopic: 'gachaswipe/relay/test/res',
        onMessage: (obj) => received.push(obj)
    });

    const largeText = JSON.stringify({ ok: true, blob: 'x'.repeat(2048) });
    const pkt = relay.codec.encodePublish('gachaswipe/relay/test/res', largeText);
    const decoded = relay.codec.decodePackets(pkt);
    assert.equal(decoded.packets.length, 1);
    assert.equal(decoded.packets[0].type, 'PUBLISH');
    assert.equal(decoded.packets[0].topic, 'gachaswipe/relay/test/res');
    assert.equal(decoded.packets[0].payload, largeText);

    const connectPkt = relay.codec.encodeConnect('gs_unit_1', 30);
    assert.equal(connectPkt[0], 0x10);
    const subPkt = relay.codec.encodeSubscribe('gachaswipe/relay/test/res', 2);
    assert.equal(subPkt[0], 0x82);

    // Chunked payload reassembly
    const fullObj = { type: 'GACHASWIPE_PERCHANCE_RESULT', ok: true, dataUrl: 'data:image/jpeg;base64,' + 'A'.repeat(256) };
    const fullStr = JSON.stringify(fullObj);
    const half = Math.floor(fullStr.length / 2);
    relay._ingestTextForTest(JSON.stringify({
        type: 'GACHASWIPE_MQTT_CHUNK',
        chunkId: 'chk_1',
        index: 0,
        total: 2,
        data: fullStr.slice(0, half)
    }));
    assert.equal(received.length, 0);
    relay._ingestTextForTest(JSON.stringify({
        type: 'GACHASWIPE_MQTT_CHUNK',
        chunkId: 'chk_1',
        index: 1,
        total: 2,
        data: fullStr.slice(half)
    }));
    assert.equal(received.length, 1);
    assert.deepEqual(received[0], fullObj);
    relay.close();
});

test('pingPerchanceBridge resolves true when mock MQTT-WSS broker handshakes and replies READY (offline socket mock)', async () => {
    const origWebSocket = globalThis.WebSocket;
    const helperCodec = createGsMqttRelay({ brokers: DEFAULT_MQTT_BROKERS }).codec;
    class MockWebSocket {
        constructor(url) {
            this.url = url;
            this.readyState = 0;
            this.binaryType = 'arraybuffer';
            setTimeout(() => {
                this.readyState = 1;
                if (typeof this.onopen === 'function') this.onopen();
            }, 5);
        }
        send(data) {
            const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
            const pktType = bytes[0] >> 4;
            if (pktType === 1) {
                // CONNECT -> reply CONNACK (code 0)
                setTimeout(() => {
                    if (typeof this.onmessage === 'function') {
                        this.onmessage({ data: new Uint8Array([0x20, 0x02, 0x00, 0x00]).buffer });
                    }
                }, 5);
            } else if (pktType === 3) {
                // PUBLISH -> inspect PING and reply READY on /res
                const { packets } = helperCodec.decodePackets(bytes);
                for (const p of packets) {
                    if (p.type !== 'PUBLISH') continue;
                    const msg = JSON.parse(p.payload);
                    if (msg.type === 'GACHASWIPE_PERCHANCE_PING') {
                        const resBytes = helperCodec.encodePublish(
                            'gachaswipe/relay/ping-test-ch/res',
                            JSON.stringify({
                                type: 'GACHASWIPE_PERCHANCE_READY',
                                requestId: msg.requestId,
                                channel: 'ping-test-ch',
                                ts: Date.now()
                            })
                        );
                        setTimeout(() => {
                            if (typeof this.onmessage === 'function') {
                                this.onmessage({ data: resBytes.buffer });
                            }
                        }, 5);
                    }
                }
            }
        }
        close() {
            this.readyState = 3;
            if (typeof this.onclose === 'function') this.onclose();
        }
    }

    try {
        globalThis.WebSocket = MockWebSocket;
        configurePerchanceBridge({ config: { relayChannel: 'ping-test-ch' }, selectedImageModel: PERCHANCE_MODEL_ID, relayAuthorized: true });
        const alive = await pingPerchanceBridge(2000);
        assert.equal(alive, true);
        assert.equal(getPerchanceBridgeStatus().ready, true);
    } finally {
        stopRelayListener();
        configurePerchanceBridge({ selectedImageModel: 'Default (Auto)', relayAuthorized: false });
        globalThis.WebSocket = origWebSocket;
    }
});

test('pingPerchanceBridge fails fast with false when mock WebSocket blocks connections', async () => {
    const origWebSocket = globalThis.WebSocket;
    try {
        globalThis.WebSocket = function BlockedWebSocket() {
            throw new Error('WebSocket blocked by Layla sandbox');
        };
        configurePerchanceBridge({ config: { relayChannel: 'ping-blocked-ch' }, selectedImageModel: PERCHANCE_MODEL_ID, relayAuthorized: true });
        const alive = await pingPerchanceBridge(700);
        assert.equal(alive, false);
        assert.ok(getPerchanceNetworkError());
    } finally {
        stopRelayListener();
        configurePerchanceBridge({ selectedImageModel: 'Default (Auto)', relayAuthorized: false });
        clearPerchanceNetworkError();
        globalThis.WebSocket = origWebSocket;
    }
});
