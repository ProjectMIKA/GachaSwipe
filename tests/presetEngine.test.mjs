import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { TransformStream } from 'node:stream/web';
import JSZip from 'jszip';

// ── Capability-aware Node 18.19.x ESM test bootstrap ──
// 1) Node 18.19.x file-mode ESM omits globalThis.crypto unless polyfilled from node:crypto.webcrypto.
if (!globalThis.crypto || !globalThis.crypto.subtle) {
    Object.defineProperty(globalThis, 'crypto', {
        value: crypto.webcrypto,
        configurable: true,
        writable: true
    });
}

// 2) DecompressionStream('deflate-raw') landed in Node 21.2+; shim with zlib + web TransformStream on older Node rigs.
function createNodeZlibDecompressionStreamClass(FallbackNativeDS) {
    return class NodeZlibDecompressionStream {
        constructor(format) {
            if (format !== 'deflate-raw' && format !== 'deflate' && format !== 'gzip') {
                if (typeof FallbackNativeDS === 'function') return new FallbackNativeDS(format);
                throw new TypeError(`Unsupported compression format: ${format}`);
            }
            const chunks = [];
            const ts = new TransformStream({
                transform(chunk) {
                    const u8 = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
                    chunks.push(Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength));
                },
                flush(controller) {
                    const merged = Buffer.concat(chunks);
                    const inflated =
                        format === 'deflate-raw'
                            ? zlib.inflateRawSync(merged)
                            : format === 'gzip'
                                ? zlib.gunzipSync(merged)
                                : zlib.inflateSync(merged);
                    controller.enqueue(new Uint8Array(inflated.buffer, inflated.byteOffset, inflated.byteLength));
                }
            });
            this.readable = ts.readable;
            this.writable = ts.writable;
        }
    };
}

const hasNativeDeflateRaw = (() => {
    try {
        if (typeof globalThis.DecompressionStream !== 'function') return false;
        new globalThis.DecompressionStream('deflate-raw');
        return true;
    } catch {
        return false;
    }
})();

if (!hasNativeDeflateRaw) {
    Object.defineProperty(globalThis, 'DecompressionStream', {
        value: createNodeZlibDecompressionStreamClass(globalThis.DecompressionStream),
        configurable: true,
        writable: true
    });
}

const {
    RPACK_DECODE_MAP,
    probeBinaryPresetCapability,
    encodeRPack,
    decodeRPack,
    decodeMsgpack,
    detectPresetFormat,
    decodePresetBytes,
    decodeCharxOrModuleBytes,
    parseRisuCustomToggles,
    evaluateRisuCbs,
    parsePresetViewModel,
    isToggleMultiSelectEnabled,
    toggleMultiSelectIndex,
    formatSelectToggleDisplay,
    createDefaultPresetStore,
    normalizePresetTemperature,
    denormalizePresetTemperature,
    isSideChannelRequest,
    isCharGenRequest,
    applyPresetToCompletionRequest,
    applyCharxRegexToText,
    getRegexCacheSize,
    clearRegexCache,
    matchCharxKeywordLoreForMessages
} = await import('../src/utils/presetEngine.js');

function encodeMsgpackSimple(val) {
    const out = [];
    const te = new TextEncoder();
    function write(v) {
        if (v === null || v === undefined) {
            out.push(0xc0);
        } else if (typeof v === 'boolean') {
            out.push(v ? 0xc3 : 0xc2);
        } else if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 127) {
            out.push(v);
        } else if (typeof v === 'string') {
            const bytes = te.encode(v);
            if (bytes.length < 32) {
                out.push(0xa0 | bytes.length);
            } else {
                out.push(0xda, (bytes.length >> 8) & 0xff, bytes.length & 0xff);
            }
            for (const b of bytes) out.push(b);
        } else if (v instanceof Uint8Array) {
            out.push(0xc5, (v.length >> 8) & 0xff, v.length & 0xff);
            for (const b of v) out.push(b);
        } else if (Array.isArray(v)) {
            out.push(0x90 | v.length);
            for (const item of v) write(item);
        } else if (typeof v === 'object') {
            const keys = Object.keys(v);
            out.push(0x80 | keys.length);
            for (const k of keys) {
                write(k);
                write(v[k]);
            }
        }
    }
    write(val);
    return new Uint8Array(out);
}

async function buildMockRisupBytes(innerPresetObj) {
    const innerMp = encodeMsgpackSimple(innerPresetObj);
    const key = crypto.createHash('sha256').update('risupreset').digest();
    const iv = Buffer.alloc(12, 0);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(Buffer.from(innerMp)), cipher.final(), cipher.getAuthTag()]);
    const outerMp = encodeMsgpackSimple({
        presetVersion: 2,
        type: 'preset',
        preset: new Uint8Array(enc)
    });
    const deflated = new Uint8Array(zlib.deflateSync(Buffer.from(outerMp)));
    return encodeRPack(deflated);
}

test('RPack encode/decode round-trip covers all 256 byte values', () => {
    const allBytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) allBytes[i] = i;
    const encoded = encodeRPack(allBytes);
    const decoded = decodeRPack(encoded);
    assert.deepEqual(decoded, allBytes);
});

test('decodes real encrypted RisuAI .risup binary container', async () => {
    const presetObj = {
        name: 'TestRisuPreset',
        temperature: 85,
        customPromptTemplateToggle: 'nsfw=Adult Mode\npov=POV=select=1st Person,3rd Person,+Omniscient',
        promptTemplate: [
            {
                type: 'plain',
                role: 'system',
                name: 'Style Core',
                text: '{{#if {{equal::{{getglobalvar::toggle_nsfw}}::1}}}}UNFILTERED{{/if}} POV={{getglobalvar::toggle_pov}}'
            }
        ]
    };
    const risupBytes = await buildMockRisupBytes(presetObj);
    const decoded = await decodePresetBytes(risupBytes, 'demo.risup');
    assert.equal(detectPresetFormat(decoded), 'risuai');
    assert.equal(decoded.name, 'TestRisuPreset');
    assert.equal(decoded.promptTemplate.length, 1);
});

test('parses RisuAI toggles (boolean, select, multi-select, text, divider) and evaluates CBS with multi-select', () => {
    const rawToggles = [
        'grp1=Core Group=divider',
        'jailbreak=Enable Rule',
        'style=Writing Style=select=None,Short,Poetic,+Noir,+Action',
        'multi_tags=Tags=multiselect=None,SlowBurn,Angst,Comedy',
        'custom_note=Author Note=text=Keep tense'
    ].join('\n');

    const fields = parseRisuCustomToggles(rawToggles, {
        jailbreak: true,
        style: '2,3',
        multi_tags: '1,3'
    });

    assert.equal(fields.length, 5);
    assert.equal(fields[0].kind, 'divider');
    assert.equal(fields[1].kind, 'boolean');
    assert.equal(fields[1].value, true);
    assert.equal(fields[2].kind, 'select');
    assert.equal(fields[2].hasPlusOption, true);
    assert.equal(isToggleMultiSelectEnabled(fields[2], {}, 'risup'), true);
    assert.equal(formatSelectToggleDisplay(fields[2]), 'Poetic + +Noir');
    assert.equal(fields[3].isExplicitMulti, true);
    assert.equal(fields[4].kind, 'text');
    assert.equal(fields[4].value, 'Keep tense');

    // Toggling multi-select indices and zero-none reset
    const opts = ['None', 'Short', 'Poetic', '+Noir', '+Action'];
    assert.equal(toggleMultiSelectIndex('0', '2', opts), '2');
    assert.equal(toggleMultiSelectIndex('2', '3', opts), '2,3');
    assert.equal(toggleMultiSelectIndex('2,3', '2', opts), '3');
    assert.equal(toggleMultiSelectIndex('2,3', '0', opts), '0');

    // CBS evaluation with multi-select comma values
    const tpl = [
        '{{#if {{equal::{{getglobalvar::toggle_jailbreak}}::1}}}}JB_ON{{:else}}JB_OFF{{/if}}',
        '{{#if_pure {{equal::{{getglobalvar::toggle_style}}::3}}}}NOIR_ACTIVE{{/if}}',
        '{{#when::style::tis::2}}POETIC_ACTIVE{{/when}}',
        '{{#if {{? $toggle_multi_tags = 3 && $toggle_jailbreak = 1}}}}COMEDY_AND_JB{{/if}}',
        '{{// hidden comment }}'
    ].join('\n');
    const out = evaluateRisuCbs(tpl, { jailbreak: '1', style: '2,3', multi_tags: '1,3' });
    assert.match(out, /JB_ON/);
    assert.match(out, /NOIR_ACTIVE/);
    assert.match(out, /POETIC_ACTIVE/);
    assert.match(out, /COMEDY_AND_JB/);
    assert.doesNotMatch(out, /hidden comment/);
});

test('decodes .risum binary and .charx ZIP archive (including hybrid prefix)', async () => {
    const risumJson = JSON.stringify({
        type: 'risuModule',
        module: {
            name: 'DarkLoreMod',
            customModuleToggle: 'hud=Show HUD\nmode=Mode=select=Off,Compact,Full',
            lorebook: [
                { comment: 'Always Rule', key: '', content: 'World is neon.', alwaysActive: true },
                { comment: 'Blade Lore', key: 'katana, blade', content: 'Forged in Kyoto.', alwaysActive: false }
            ],
            regex: [
                { comment: 'Strip OOC', in: '\\[OOC:[^\\]]*\\]', out: '', type: 'editoutput', flag: 'g', ableFlag: true }
            ]
        }
    });
    const rpackBody = encodeRPack(new TextEncoder().encode(risumJson));
    const risumBuf = new Uint8Array(6 + rpackBody.length);
    risumBuf[0] = 0x6f;
    risumBuf[1] = 0x00;
    new DataView(risumBuf.buffer).setUint32(2, rpackBody.length, true);
    risumBuf.set(rpackBody, 6);

    const decodedRisum = await decodeCharxOrModuleBytes(risumBuf, 'darklore.risum');
    assert.equal(decodedRisum.__isCharxModule, true);
    assert.equal(decodedRisum.name, 'DarkLoreMod');
    assert.equal(decodedRisum.lorebook.length, 2);
    assert.equal(decodedRisum.regex.length, 1);

    // Build a JPEG+ZIP hybrid .charx file
    const zip = new JSZip();
    zip.file('card.json', JSON.stringify({
        spec: 'chara_card_v3',
        data: {
            name: 'CyberCard',
            system_prompt: 'Stay in character.'
        }
    }));
    zip.file('module.risum', risumBuf);
    const zipU8 = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    const fakeJpegPrefix = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const hybrid = new Uint8Array(fakeJpegPrefix.length + zipU8.length);
    hybrid.set(fakeJpegPrefix, 0);
    hybrid.set(zipU8, fakeJpegPrefix.length);

    const decodedCharx = await decodeCharxOrModuleBytes(hybrid, 'hybrid.charx');
    assert.equal(decodedCharx.__isCharxModule, true);
    assert.equal(decodedCharx.promptBlocks.length, 1);
    assert.equal(decodedCharx.lorebook.length, 2);
    assert.equal(decodedCharx.regex.length, 1);
});

test('parses SillyTavern preset JSON and groups categorized options', () => {
    const stPreset = {
        name: 'ST_Deck',
        prompts: [
            { identifier: 'main', name: 'Main', role: 'system', content: '', marker: true },
            { identifier: 'tone_warm', name: '[Tone] Warm', role: 'system', content: 'Be warm.', enabled: true },
            { identifier: 'tone_cold', name: '[Tone] Cold', role: 'system', content: 'Be cold.', enabled: false },
            { identifier: 'solo', name: 'Standalone Rule', role: 'system', content: 'Write vividly.', enabled: true }
        ],
        prompt_order: [
            {
                character_id: 100001,
                order: [
                    { identifier: 'main', enabled: true },
                    { identifier: 'tone_warm', enabled: true },
                    { identifier: 'tone_cold', enabled: false },
                    { identifier: 'solo', enabled: true }
                ]
            }
        ]
    };

    const vm = parsePresetViewModel({ id: 'p1', fileName: 'st.json', data: stPreset }, null);
    assert.equal(vm.format, 'sillytavern');
    assert.equal(vm.groups.length, 2);
    assert.equal(vm.groups[0].title, 'Tone');
    assert.equal(vm.groups[0].suggestedMode, 'dropdown');
    assert.equal(vm.activePrompts.length, 2);
    assert.match(vm.compiledPrompt, /Be warm\./);
    assert.doesNotMatch(vm.compiledPrompt, /Be cold\./);
});

test('applies preset + keyword lorebook + regex to chat requests while bypassing side-channel calls', () => {
    const store = createDefaultPresetStore();
    store.presets = [
        {
            id: 'p1',
            fileName: 'risu.risup',
            data: {
                name: 'RP_Master',
                temperature: 90,
                customPromptTemplateToggle: 'style=Style=select=Normal,Dramatic,+Poetic',
                __laylaToggleValues: { style: '1,2' },
                promptTemplate: [
                    {
                        type: 'plain',
                        role: 'system',
                        name: 'Core',
                        text: '{{#if {{equal::{{getglobalvar::toggle_style}}::2}}}}POETIC_DIRECTIVE{{/if}}'
                    }
                ]
            }
        }
    ];
    store.activeId = 'p1';
    store.modules = [
        {
            id: 'm1',
            fileName: 'mod.charx',
            data: {
                __isCharxModule: true,
                name: 'LorePack',
                customModuleToggle: '',
                promptBlocks: [],
                lorebook: [
                    { id: 'l1', comment: 'Katana', key: 'katana', secondkey: '', content: 'Ancient steel.', alwaysActive: false, enabled: true }
                ],
                regex: [
                    { id: 'r1', comment: 'Trim OOC', in: '\\s*\\[OOC\\]', out: '', type: 'editoutput', flag: 'g', ableFlag: true, enabled: true },
                    { id: 'r2', comment: 'Normalize input', in: 'teh', out: 'the', type: 'editinput', flag: 'gi', ableFlag: true, enabled: true }
                ]
            }
        }
    ];
    store.activeModuleId = 'm1';

    // 1. Normal chat completion gets injected + keyword lore + input regex + temperature
    const chatReq = {
        messages: [
            { role: 'system', content: 'Base system prompt.' },
            { role: 'user', content: 'She draws teh katana silently.' }
        ]
    };
    const res = applyPresetToCompletionRequest(chatReq, store);
    assert.equal(res.injected, true);
    assert.equal(res.skipped, false);
    assert.equal(res.req.temperature, 0.9);
    assert.match(res.req.messages[0].content, /POETIC_DIRECTIVE/);
    assert.match(res.req.messages[0].content, /Ancient steel\./);
    assert.equal(res.req.messages[1].content, 'She draws the katana silently.');

    // Output regex strips [OOC]
    const cleaned = applyCharxRegexToText(
        'She nods slowly. [OOC]',
        res.charxVm.activeRegexList,
        res.charxVm.unifiedToggleValues,
        'output'
    );
    assert.equal(cleaned, 'She nods slowly.');

    // 2. Side-channel JSON/OOB call is strictly skipped
    const sideReq = {
        messages: [{ role: 'system', content: '[SIDE-CHANNEL TASK] Output STRICT JSON only.' }]
    };
    const sideRes = applyPresetToCompletionRequest(sideReq, store);
    assert.equal(sideRes.injected, false);
    assert.equal(sideRes.skipped, true);
    assert.equal(sideRes.req, sideReq);

    // 3. Char-gen call is skipped when injectionScope === 'chat_only'
    const charGenReq = {
        messages: [{ role: 'system', content: 'USER_PREFERENCES: cyberpunk waifu generator <first_message>' }]
    };
    const cgSkipped = applyPresetToCompletionRequest(charGenReq, store);
    assert.equal(cgSkipped.injected, false);
    assert.equal(cgSkipped.skipped, true);

    // 4. Char-gen call is injected when injectionScope === 'chat_and_chargen'
    const storeWithCharGen = { ...store, injectionScope: 'chat_and_chargen' };
    const cgInjected = applyPresetToCompletionRequest(charGenReq, storeWithCharGen);
    assert.equal(cgInjected.injected, true);
    assert.match(cgInjected.req.messages[0].content, /ACTIVE PRESET STYLE & WORLDVIEW REFERENCE/);

    // 5. Keyword lorebook matcher returns empty when keyword absent
    assert.deepEqual(
        matchCharxKeywordLoreForMessages(res.charxVm.activeKeywordLore, [{ role: 'user', content: 'hello world' }]),
        []
    );
});


test('evaluates nested interleaved CBS macros, setvar/addvar/getvar, trim, and null-safe inputs', () => {
    const out = evaluateRisuCbs(
        '{{// ignored comment}}{{setvar::rank::2}}{{addvar::rank::3}}' +
            '{{#if {{equal::{{#when::mode::tis::1}}ok{{:else}}no{{/when}}::ok}}}}' +
            'RANK={{getvar::rank}}   {{trim}}   DONE' +
            '{{/if}}',
        { mode: '1' }
    );
    assert.equal(out, 'RANK=5DONE');
    assert.equal(evaluateRisuCbs('{{#if toggle_missing}}NO{{:else}}SAFE{{/if}}', null), 'SAFE');
    assert.equal(evaluateRisuCbs(null, undefined), '');
});

test('defensively rejects empty, truncated, or oversized MsgPack buffers without RangeError', () => {
    assert.throws(() => decodeMsgpack(new Uint8Array(0)), /empty/i);
    // 0xca (float32) with only 2 trailing bytes instead of 4
    assert.throws(() => decodeMsgpack(new Uint8Array([0xca, 0x3f, 0x80])), /truncated/i);
    // 0xdd (array32) claiming 0xffffffff elements in a 6-byte buffer
    assert.throws(() => decodeMsgpack(new Uint8Array([0xdd, 0xff, 0xff, 0xff, 0xff, 0x01])), /exceeds/i);
    // 0xdb (str32) claiming 1000 bytes in a 6-byte buffer
    assert.throws(() => decodeMsgpack(new Uint8Array([0xdb, 0x00, 0x00, 0x03, 0xe8, 0x41])), /truncated/i);
});

test('preserves RisuAI 0-200 vs SillyTavern 0-2 temperature scale and forwards all 5 sampling params', () => {
    assert.equal(normalizePresetTemperature({ temperature: 85 }, 'risuai'), 0.85);
    assert.equal(normalizePresetTemperature({ temperature: 100 }, 'risuai'), 1);
    assert.equal(normalizePresetTemperature({ temperature: 1 }, 'risuai'), 0.01);
    assert.equal(normalizePresetTemperature({ temperature: 0 }, 'risuai'), 0);
    assert.equal(normalizePresetTemperature({ temperature: 1 }, 'sillytavern'), 1);
    assert.equal(normalizePresetTemperature({ temperature: 0.85 }, 'sillytavern'), 0.85);

    assert.equal(denormalizePresetTemperature(0.85, 'risuai'), 85);
    assert.equal(denormalizePresetTemperature(1.0, 'risuai'), 100);
    assert.equal(denormalizePresetTemperature(0.85, 'sillytavern'), 0.85);

    const store = createDefaultPresetStore();
    store.presets = [
        {
            id: 'p_full',
            fileName: 'deck.risup',
            data: {
                name: 'SamplingDeck',
                temperature: 100,
                top_p: 0.92,
                top_k: 40,
                min_p: 0.05,
                maxResponse: 2048,
                promptTemplate: [{ type: 'plain', role: 'system', name: 'Rule', text: 'Stay vivid.' }]
            }
        }
    ];
    store.activeId = 'p_full';

    const res = applyPresetToCompletionRequest(
        { messages: [{ role: 'system', content: 'Chat system' }, { role: 'user', content: 'Hi!' }] },
        store
    );
    assert.equal(res.injected, true);
    assert.equal(res.req.temperature, 1);
    assert.equal(res.req.top_p, 0.92);
    assert.equal(res.req.top_k, 40);
    assert.equal(res.req.min_p, 0.05);
    assert.equal(res.req.max_tokens, 2048);
});

test('accurately classifies GachaSwipe v2.7.87 M.E.O.W., DAW, Forge, Ad, SMS, and multimodal requests', () => {
    // M.E.O.W. routine compiler (has user message, must still be skipped as side-channel!)
    assert.equal(
        isSideChannelRequest({
            messages: [
                { role: 'system', content: 'Routine architect' },
                { role: 'user', content: 'Compile the <routine> XML block now.' }
            ]
        }),
        true
    );
    // DAW song generator (has user message, must be skipped)
    assert.equal(
        isSideChannelRequest({
            messages: [
                { role: 'system', content: '<concepts><concept><lyrics>...</lyrics></concept></concepts>' },
                { role: 'user', content: 'Generate 3 song concepts' }
            ]
        }),
        true
    );
    // GachaFans fake ad (user-only message, must be skipped)
    assert.equal(
        isSideChannelRequest({
            messages: [{ role: 'user', content: 'Write ONE absurd and unhinged fake advertisement for "GachaFans"' }]
        }),
        true
    );
    // Position Forge (has user message, must be skipped)
    assert.equal(
        isSideChannelRequest({
            messages: [
                { role: 'system', content: 'You are M.I.K.A., an expert danbooru tag smith and intimate-scene art director.' },
                { role: 'user', content: 'Theme: romantic' }
            ]
        }),
        true
    );
    // SMS Simulation (single system message chat opener -> NOT side-channel and NOT chargen!)
    const smsReq = {
        messages: [{ role: 'system', content: '[SYSTEM: SMS SIMULATION MODE]\nYou are initiating the conversation.' }]
    };
    assert.equal(isSideChannelRequest(smsReq), false);
    assert.equal(isCharGenRequest(smsReq), false);

    // Multimodal user chat message -> lorebook matches text content cleanly
    const lore = [{ key: 'emerald', secondkey: '', selective: false, comment: 'Gem', evaluatedContent: 'Green gem.' }];
    const matched = matchCharxKeywordLoreForMessages(lore, [
        { role: 'user', content: [{ type: 'text', text: 'She holds the emerald up to the light.' }] }
    ]);
    assert.equal(matched.length, 1);
});

test('deduplicates duplicate numeric prompt_order and prompts identifiers in SillyTavern presets', () => {
    const record = {
        id: 'st_dup_test',
        fileName: 'dup_order.json',
        format: 'sillytavern',
        data: {
            prompts: [
                { identifier: '1795254689882', name: 'Style Rule A', role: 'system', content: 'Rule A content', enabled: true },
                { identifier: '1795254689882', name: 'Style Rule A Duplicate', role: 'system', content: 'Rule A content', enabled: true },
                { identifier: '1795254689999', name: 'Extra Rule B', role: 'system', content: 'Rule B content', enabled: true },
                { identifier: '1795254689999', name: 'Extra Rule B Duplicate', role: 'system', content: 'Rule B content', enabled: true }
            ],
            prompt_order: [
                {
                    character_id: 100001,
                    order: [
                        { identifier: '1795254689882', enabled: true },
                        { identifier: '1795254689882', enabled: true }
                    ]
                }
            ]
        }
    };
    const vm = parsePresetViewModel(record, null);
    const allIds = vm.groups.flatMap(g => g.items.map(it => it.identifier));
    assert.equal(allIds.length, new Set(allIds).size, 'Every rendered prompt block identifier must be unique');
    assert.equal(vm.activePrompts.filter(p => p.identifier === '1795254689882').length, 1);
});

test('reuses bounded RegExp cache across turns, resets global lastIndex, and caps cache at 256 entries', () => {
    clearRegexCache();
    assert.equal(getRegexCacheSize(), 0);

    const rules = [
        { in: '\\[SFX:[^\\]]*\\]', out: '', type: 'editoutput', flag: 'g', ableFlag: true },
        { in: '{{getglobalvar::toggle_tag}}', out: 'NEON', type: 'editoutput', flag: 'g', ableFlag: true }
    ];

    // Repeated turns reuse the exact same cached RegExp instances without /g lastIndex drift
    for (let turn = 0; turn < 5; turn++) {
        const cleaned = applyCharxRegexToText('Hello [SFX:beep] world [SFX:boop]!', rules, {}, 'output');
        assert.equal(cleaned, 'Hello  world !');
    }
    assert.equal(getRegexCacheSize(), 2);

    // Flood > 256 distinct patterns to verify LRU eviction bound
    const manyRules = [];
    for (let i = 0; i < 300; i++) {
        manyRules.push({ in: 'TOKEN_' + i + '_END', out: 'X', type: 'editoutput', flag: 'g', ableFlag: true });
    }
    const out = applyCharxRegexToText('TOKEN_0_END and TOKEN_299_END', manyRules, {}, 'output');
    assert.equal(out, 'X and X');
    assert.equal(getRegexCacheSize(), 256);
});

test('Node 18 DecompressionStream shim & probeBinaryPresetCapability handle legacy hosts cleanly', async () => {
    // 1. Normal environment (or active shim) reports binary capability ready
    const readyCap = probeBinaryPresetCapability();
    assert.equal(readyCap.supported, true);
    assert.equal(readyCap.hasDeflateRaw, true);
    assert.equal(readyCap.hasWebCrypto, true);

    const origDS = globalThis.DecompressionStream;
    try {
        // 2. Force-exercise the Node 18 zlib DecompressionStream shim even on Node 22+
        globalThis.DecompressionStream = createNodeZlibDecompressionStreamClass(undefined);
        const risupBytes = await buildMockRisupBytes({
            name: 'Node18ShimCheck',
            promptTemplate: [{ type: 'plain', role: 'system', name: 'Core', text: 'Shim works.' }]
        });
        const decodedViaShim = await decodePresetBytes(risupBytes, 'shim.risup');
        assert.equal(decodedViaShim.name, 'Node18ShimCheck');

        // 3. Simulate Chromium 80-102 Android WebView ('gzip'/'deflate' exist, 'deflate-raw' throws)
        //    with a raw-deflated .risup container
        const innerMp = encodeMsgpackSimple({
            name: 'RawDeflatePreset',
            promptTemplate: [{ type: 'plain', role: 'system', name: 'Core', text: 'Raw deflate.' }]
        });
        const key = crypto.createHash('sha256').update('risupreset').digest();
        const cipher = crypto.createCipheriv('aes-256-gcm', key, Buffer.alloc(12, 0));
        const enc = Buffer.concat([cipher.update(Buffer.from(innerMp)), cipher.final(), cipher.getAuthTag()]);
        const outerMp = encodeMsgpackSimple({ presetVersion: 2, type: 'preset', preset: new Uint8Array(enc) });
        const rawDeflatedRisup = encodeRPack(new Uint8Array(zlib.deflateRawSync(Buffer.from(outerMp))));

        globalThis.DecompressionStream = class LegacyWebViewDS {
            constructor(fmt) {
                if (fmt === 'deflate-raw') throw new TypeError('Unsupported format deflate-raw');
                return new origDS(fmt);
            }
        };
        const legacyCap = probeBinaryPresetCapability();
        assert.equal(legacyCap.supported, false);
        assert.equal(legacyCap.hasDeflateRaw, false);
        assert.equal(legacyCap.hasWebCrypto, true);
        await assert.rejects(() => decodePresetBytes(rawDeflatedRisup, 'legacy.risup'), /HOST_TOO_OLD/);
    } finally {
        globalThis.DecompressionStream = origDS;
    }
});

test('supports KV-cache-safe TAIL merge position without mutating prefix system prompt or history', () => {
    const store = createDefaultPresetStore();
    store.injectionPosition = 'tail';
    store.presets = [
        {
            id: 'p_tail',
            fileName: 'tail.risup',
            data: {
                name: 'TailDeck',
                promptTemplate: [{ type: 'plain', role: 'system', name: 'Rule', text: 'Dynamic tail rule.' }]
            }
        }
    ];
    store.activeId = 'p_tail';

    const baseSys = 'STATIC GACHASWIPE SYSTEM PREFIX';
    const req = {
        messages: [
            { role: 'system', content: baseSys },
            { role: 'user', content: 'Turn 1 user' },
            { role: 'assistant', content: 'Turn 1 reply' },
            { role: 'user', content: 'Turn 2 user' }
        ]
    };
    const res = applyPresetToCompletionRequest(req, store);
    assert.equal(res.injected, true);
    assert.equal(res.req.messages.length, 5);
    assert.equal(res.req.messages[0].content, baseSys, 'Prefix system prompt must stay byte-identical for KV cache');
    assert.equal(res.req.messages[3].content, 'Turn 2 user');
    assert.equal(res.req.messages[4].role, 'system');
    assert.match(res.req.messages[4].content, /Dynamic tail rule\./);
});

test('shields GachaSwipe reply envelopes (<send_image>, <reply>, <dream_state>) from aggressive editoutput regexes', () => {
    const aggressiveHtmlStripper = [
        { in: '<[^>]+>', out: '', type: 'editoutput', flag: 'g', ableFlag: true }
    ];
    const rawReply =
        '<reply><speaker>Mika</speaker>Hello Master! <custom_hud>HP:100</custom_hud> <send_image>true</send_image></reply>' +
        '<dream_state><lucidity>80</lucidity></dream_state>';
    const cleaned = applyCharxRegexToText(rawReply, aggressiveHtmlStripper, {}, 'output');

    assert.doesNotMatch(cleaned, /<custom_hud>/, 'Non-envelope custom tags are still processed by preset regex');
    assert.match(cleaned, /HP:100/);
    assert.match(cleaned, /<reply>/);
    assert.match(cleaned, /<speaker>Mika<\/speaker>/);
    assert.match(cleaned, /<send_image>true<\/send_image>/);
    assert.match(cleaned, /<\/reply>/);
    assert.match(cleaned, /<dream_state><lucidity>80<\/lucidity><\/dream_state>/);
});
