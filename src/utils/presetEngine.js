/**
 * Copyright (C) 2026 Project M.I.K.A. & Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * M.I.K.A. Preset & CharX Module Engine (ROM-09)
 * 100% original clean-room implementation using standard Web APIs (WebCrypto,
 * DecompressionStream, DataView) with zero external dependencies.
 *
 * Format & Specification Interoperability Provenance:
 * - Character Card V3 & .charx Archive Spec (kwaroran/character-card-spec-v3, MIT License)
 * - RisuAI .risup / .risupreset / .risum container format, RPack 256-byte format mapping,
 *   toggle/lorebook/regex schemas & CBS macro syntax (kwaroran/RisuAI, GPL-3.0 — clean-room
 *   format interoperability only; no RisuAI source code copied)
 * - SillyTavern Chat Completion Preset JSON schema (SillyTavern/SillyTavern, AGPL-3.0 —
 *   clean-room JSON schema interoperability only; no SillyTavern source code copied)
 *
 * Pure JS module: zero React imports, zero runtime npm dependencies (native WebCrypto +
 * DecompressionStream + self-contained RPack/MsgPack/ZIP readers), zero top-level DOM access.
 */

// Official 256-byte RPack decode lookup table from RisuAI rpack_map.bin
export const RPACK_DECODE_MAP = new Uint8Array([
    44, 247, 132, 139, 201, 101, 251, 182, 159, 174, 179, 3, 45, 1, 105, 116,
    31, 228, 163, 236, 238, 92, 52, 33, 147, 74, 15, 106, 226, 98, 2, 158,
    34, 156, 253, 60, 252, 113, 199, 198, 173, 89, 103, 5, 112, 109, 138, 68,
    18, 250, 36, 134, 95, 175, 209, 122, 71, 206, 254, 80, 99, 221, 81, 6,
    111, 24, 224, 82, 168, 9, 157, 86, 115, 76, 184, 83, 108, 195, 160, 14,
    25, 207, 62, 13, 126, 7, 50, 104, 70, 234, 72, 249, 153, 46, 171, 164,
    73, 32, 94, 85, 53, 56, 12, 188, 211, 177, 88, 22, 121, 40, 10, 26,
    225, 242, 205, 196, 57, 219, 162, 186, 96, 114, 118, 125, 149, 239, 127, 200,
    192, 222, 55, 148, 191, 181, 20, 129, 146, 37, 69, 172, 231, 245, 102, 167,
    43, 54, 90, 193, 19, 227, 75, 58, 232, 141, 131, 27, 124, 39, 176, 154,
    66, 235, 135, 170, 220, 84, 142, 120, 38, 210, 87, 41, 212, 183, 248, 47,
    143, 137, 117, 240, 65, 119, 194, 30, 255, 216, 21, 17, 229, 4, 151, 23,
    243, 49, 208, 155, 0, 215, 202, 180, 79, 42, 59, 217, 178, 107, 218, 93,
    161, 63, 48, 97, 189, 145, 61, 78, 230, 223, 190, 77, 130, 140, 29, 35,
    16, 152, 100, 244, 133, 51, 123, 144, 67, 187, 169, 136, 241, 214, 165, 28,
    246, 204, 110, 185, 91, 11, 150, 237, 213, 233, 197, 203, 8, 166, 128, 64
]);

// Inverse 256-byte RPack encode table
export const RPACK_ENCODE_MAP = (() => {
    const enc = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
        enc[RPACK_DECODE_MAP[i]] = i;
    }
    return enc;
})();

export const CORE_ST_PLACEHOLDERS = {
    main: 1,
    worldInfoBefore: 1,
    personaDescription: 1,
    charDescription: 1,
    charPersonality: 1,
    scenario: 1,
    enhanceDefinitions: 1,
    nsfw: 1,
    worldInfoAfter: 1,
    dialogueExamples: 1,
    chatHistory: 1,
    jailbreak: 1
};

/* ---------------- 1. Binary Codecs (.risup / .risupreset / .charx / .risum / PNG) ---------------- */

export function decodeRPack(bytes) {
    const out = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
        out[i] = RPACK_DECODE_MAP[bytes[i]];
    }
    return out;
}

export function encodeRPack(bytes) {
    const out = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
        out[i] = RPACK_ENCODE_MAP[bytes[i]];
    }
    return out;
}

function getTextDecoder(encoding = 'utf-8', options) {
    const TD = globalThis.TextDecoder;
    return options ? new TD(encoding, options) : new TD(encoding);
}

function getTextEncoder() {
    const TE = globalThis.TextEncoder;
    return new TE();
}

function decodeBase64ToUint8(b64) {
    const clean = String(b64 || '').replace(/\s+/g, '');
    if (typeof globalThis.atob === 'function') {
        const bin = globalThis.atob(clean);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return arr;
    }
    if (typeof globalThis.Buffer === 'function') {
        return new Uint8Array(globalThis.Buffer.from(clean, 'base64'));
    }
    throw new Error('Base64 decoder unavailable.');
}

/**
 * Probes whether the current WebView / JS runtime supports native binary
 * preset containers (.risup / .charx) via DecompressionStream('deflate-raw')
 * and WebCrypto SubtleCrypto AES-GCM. Older Android WebViews (< Chromium 103)
 * lack deflate-raw support, while .json and uncompressed .risum still work.
 */
export function probeBinaryPresetCapability() {
    let hasDeflateRaw = false;
    try {
        const DS = globalThis.DecompressionStream;
        if (typeof DS === 'function') {
            new DS('deflate-raw');
            hasDeflateRaw = true;
        }
    } catch {
        hasDeflateRaw = false;
    }
    const hasWebCrypto = Boolean(
        globalThis.crypto &&
            globalThis.crypto.subtle &&
            typeof globalThis.crypto.subtle.decrypt === 'function'
    );
    return {
        supported: hasDeflateRaw && hasWebCrypto,
        hasDeflateRaw,
        hasWebCrypto
    };
}

async function runDecompressionStream(bytes, format) {
    const DS = globalThis.DecompressionStream;
    if (typeof DS !== 'function') {
        throw new Error(
            'HOST_TOO_OLD: DecompressionStream is unavailable in this WebView (requires Chromium 103+). Use .json presets or update Android System WebView.'
        );
    }
    let ds;
    try {
        ds = new DS(format);
    } catch {
        throw new Error(
            `HOST_TOO_OLD: DecompressionStream("${format}") is unsupported in this WebView (requires Chromium 103+). Use .json presets or update Android System WebView.`
        );
    }
    const w = ds.writable.getWriter();
    if (w.closed && typeof w.closed.catch === 'function') {
        w.closed.catch(() => {});
    }
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    w.write(copy).catch(() => {});
    w.close().catch(() => {});
    const reader = ds.readable.getReader();
    const chunks = [];
    let totalLen = 0;
    try {
        while (true) {
            const step = await reader.read();
            if (step.done) break;
            if (step.value && step.value.byteLength) {
                chunks.push(step.value);
                totalLen += step.value.byteLength;
            }
        }
    } finally {
        try {
            reader.releaseLock();
        } catch { /* ignore */ }
    }
    const out = new Uint8Array(totalLen);
    let offset = 0;
    for (let i = 0; i < chunks.length; i++) {
        out.set(chunks[i], offset);
        offset += chunks[i].byteLength;
    }
    return out;
}

export async function decompressDeflateRaw(bytes) {
    return runDecompressionStream(bytes, 'deflate-raw');
}

export async function decompressBuffer(bytes) {
    const fmts =
        bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
            ? ['gzip', 'deflate', 'deflate-raw']
            : bytes.length >= 2 && bytes[0] === 0x78
                ? ['deflate', 'deflate-raw', 'gzip']
                : ['deflate-raw', 'deflate', 'gzip'];
    let lastErr = null;
    let hostTooOldErr = null;
    for (let i = 0; i < fmts.length; i++) {
        try {
            return await runDecompressionStream(bytes, fmts[i]);
        } catch (err) {
            if (!hostTooOldErr && err && typeof err.message === 'string' && err.message.indexOf('HOST_TOO_OLD') !== -1) {
                hostTooOldErr = err;
            }
            lastErr = err;
        }
    }
    throw hostTooOldErr || lastErr || new Error('Failed to decompress preset binary.');
}

export function decodeMsgpack(bytes) {
    if (!bytes || !(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
        throw new Error('MsgPack empty buffer');
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const td = getTextDecoder('utf-8');
    let o = 0;

    function need(n) {
        if (n < 0 || o + n > bytes.length) {
            throw new Error('MsgPack truncated buffer');
        }
    }

    function readStr(len) {
        need(len);
        const s = td.decode(bytes.subarray(o, o + len));
        o += len;
        return s;
    }

    function readBin(len) {
        need(len);
        const b = bytes.slice(o, o + len);
        o += len;
        return b;
    }

    function readArr(len) {
        if (len < 0 || len > bytes.length - o) {
            throw new Error('MsgPack array length exceeds remaining buffer');
        }
        const a = new Array(len);
        for (let i = 0; i < len; i++) a[i] = read();
        return a;
    }

    function readMap(len) {
        if (len < 0 || len * 2 > bytes.length - o) {
            throw new Error('MsgPack map length exceeds remaining buffer');
        }
        const m = {};
        for (let i = 0; i < len; i++) {
            const k = read();
            m[typeof k === 'string' || typeof k === 'number' ? String(k) : JSON.stringify(k)] = read();
        }
        return m;
    }

    function read() {
        need(1);
        const b = bytes[o++];
        if (b <= 0x7f) return b;
        if (b >= 0xe0) return b - 256;
        if ((b & 0xf0) === 0x80) return readMap(b & 0x0f);
        if ((b & 0xf0) === 0x90) return readArr(b & 0x0f);
        if ((b & 0xe0) === 0xa0) return readStr(b & 0x1f);
        switch (b) {
            case 0xc0: return null;
            case 0xc2: return false;
            case 0xc3: return true;
            case 0xc4: { need(1); const l = bytes[o++]; return readBin(l); }
            case 0xc5: { need(2); const l = view.getUint16(o, false); o += 2; return readBin(l); }
            case 0xc6: { need(4); const l = view.getUint32(o, false); o += 4; return readBin(l); }
            case 0xc7: { need(2); const l = bytes[o++]; o += 1; return readBin(l); }
            case 0xc8: { need(3); const l = view.getUint16(o, false); o += 3; return readBin(l); }
            case 0xc9: { need(5); const l = view.getUint32(o, false); o += 5; return readBin(l); }
            case 0xca: { need(4); const v = view.getFloat32(o, false); o += 4; return v; }
            case 0xcb: { need(8); const v = view.getFloat64(o, false); o += 8; return v; }
            case 0xcc: { need(1); return bytes[o++]; }
            case 0xcd: { need(2); const v = view.getUint16(o, false); o += 2; return v; }
            case 0xce: { need(4); const v = view.getUint32(o, false); o += 4; return v; }
            case 0xcf: {
                need(8);
                const hi = view.getUint32(o, false);
                const lo = view.getUint32(o + 4, false);
                o += 8;
                return hi * 4294967296 + lo;
            }
            case 0xd0: { need(1); const v = view.getInt8(o); o += 1; return v; }
            case 0xd1: { need(2); const v = view.getInt16(o, false); o += 2; return v; }
            case 0xd2: { need(4); const v = view.getInt32(o, false); o += 4; return v; }
            case 0xd3: {
                need(8);
                const hi = view.getInt32(o, false);
                const lo = view.getUint32(o + 4, false);
                o += 8;
                return hi * 4294967296 + lo;
            }
            case 0xd4: { need(1); o += 1; return readBin(1); }
            case 0xd5: { need(1); o += 1; return readBin(2); }
            case 0xd6: { need(1); o += 1; return readBin(4); }
            case 0xd7: { need(1); o += 1; return readBin(8); }
            case 0xd8: { need(1); o += 1; return readBin(16); }
            case 0xd9: { need(1); const l = bytes[o++]; return readStr(l); }
            case 0xda: { need(2); const l = view.getUint16(o, false); o += 2; return readStr(l); }
            case 0xdb: { need(4); const l = view.getUint32(o, false); o += 4; return readStr(l); }
            case 0xdc: { need(2); const l = view.getUint16(o, false); o += 2; return readArr(l); }
            case 0xdd: { need(4); const l = view.getUint32(o, false); o += 4; return readArr(l); }
            case 0xde: { need(2); const l = view.getUint16(o, false); o += 2; return readMap(l); }
            case 0xdf: { need(4); const l = view.getUint32(o, false); o += 4; return readMap(l); }
            default: throw new Error('MsgPack byte 0x' + b.toString(16));
        }
    }

    return read();
}

export async function decryptRisuAesGcm(cipherBytes) {
    const subtle = globalThis.crypto && globalThis.crypto.subtle;
    if (!subtle) {
        throw new Error(
            'HOST_TOO_OLD: WebCrypto SubtleCrypto is unavailable in this environment (requires secure context / Chromium 103+).'
        );
    }
    const keyBytes = await subtle.digest('SHA-256', getTextEncoder().encode('risupreset'));
    const cryptoKey = await subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
    const iv = new Uint8Array(12);
    const copy = new Uint8Array(cipherBytes.byteLength);
    copy.set(cipherBytes);
    const plain = await subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, copy);
    return new Uint8Array(plain);
}

function toU8(v) {
    if (v instanceof Uint8Array) return v;
    if (v instanceof ArrayBuffer) return new Uint8Array(v);
    if (Array.isArray(v)) return new Uint8Array(v);
    if (v && typeof v === 'object' && v.type === 'Buffer' && Array.isArray(v.data)) return new Uint8Array(v.data);
    if (v && typeof v === 'object' && typeof v.byteLength === 'number' && v.buffer instanceof ArrayBuffer) {
        return new Uint8Array(v.buffer, v.byteOffset || 0, v.byteLength);
    }
    if (typeof v === 'string' && v.length > 0) {
        try {
            return decodeBase64ToUint8(v);
        } catch { /* ignore */ }
    }
    return null;
}

export function unwrapPresetObject(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
    let cur = obj;
    for (let depth = 0; depth < 4; depth++) {
        if (
            Array.isArray(cur.promptTemplate) ||
            typeof cur.customPromptTemplateToggle === 'string' ||
            Array.isArray(cur.prompts) ||
            Array.isArray(cur.prompt_order)
        ) {
            break;
        }
        const candidate = cur.preset || cur.pres || cur.data;
        if (
            candidate &&
            typeof candidate === 'object' &&
            !Array.isArray(candidate) &&
            !(candidate instanceof Uint8Array) &&
            !(candidate instanceof ArrayBuffer) &&
            candidate.type !== 'Buffer'
        ) {
            const inner = { ...candidate };
            if (cur.__laylaToggleValues && !inner.__laylaToggleValues) {
                inner.__laylaToggleValues = cur.__laylaToggleValues;
            }
            if (cur.__laylaDisabledTemplateIds && !inner.__laylaDisabledTemplateIds) {
                inner.__laylaDisabledTemplateIds = cur.__laylaDisabledTemplateIds;
            }
            cur = inner;
            continue;
        }
        if (typeof candidate === 'string' && candidate.trim().indexOf('{') === 0) {
            try {
                const parsedInner = JSON.parse(candidate);
                if (parsedInner && typeof parsedInner === 'object' && !Array.isArray(parsedInner)) {
                    cur = parsedInner;
                    continue;
                }
            } catch { /* ignore */ }
        }
        break;
    }
    return cur;
}

async function decodeDecryptedPresetPayload(decrypted) {
    const looksCompressed =
        decrypted.length >= 2 &&
        ((decrypted[0] === 0x1f && decrypted[1] === 0x8b) ||
            (decrypted[0] === 0x78 &&
                (decrypted[1] === 0x01 || decrypted[1] === 0x5e || decrypted[1] === 0x9c || decrypted[1] === 0xda)));

    if (!looksCompressed) {
        try {
            const directMp = decodeMsgpack(decrypted);
            if (directMp && typeof directMp === 'object' && !Array.isArray(directMp)) {
                return unwrapPresetObject(directMp);
            }
        } catch { /* ignore */ }
    }

    try {
        const innerDecomp = await decompressBuffer(decrypted);
        const d1 = decodeMsgpack(innerDecomp);
        if (d1 && typeof d1 === 'object') return unwrapPresetObject(d1);
    } catch { /* ignore */ }

    const d2 = decodeMsgpack(decrypted);
    if (d2 && typeof d2 === 'object') return unwrapPresetObject(d2);
    throw new Error('Failed to decode decrypted preset payload.');
}

async function tryDecodeBinaryCandidate(candidateBytes) {
    const decompressed = await decompressBuffer(candidateBytes);
    const outer = decodeMsgpack(decompressed);
    if (!outer || typeof outer !== 'object') throw new Error('Invalid preset container format.');

    const enc = toU8(outer.preset) || toU8(outer.pres);
    if (
        enc &&
        enc.length > 0 &&
        (outer.presetVersion === 0 ||
            outer.presetVersion === 2 ||
            outer.type === 'preset' ||
            outer.type === 'risupreset' ||
            outer.preset ||
            outer.pres)
    ) {
        const decrypted = await decryptRisuAesGcm(enc);
        return decodeDecryptedPresetPayload(decrypted);
    }
    return unwrapPresetObject(outer);
}

/**
 * Pure ZIP extractor for RisuAI .charx archives (including JPEG+ZIP / PNG+ZIP hybrid .charx).
 * Extracts card.json, module.risum, and any .json/.risum entries without relying on browser fetch.
 */
export async function extractZipEntriesFromBytes(buf) {
    if (!buf || buf.length < 30) return null;
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const td = getTextDecoder('utf-8');
    const entries = {};
    let foundAny = false;

    function isTargetEntryName(name) {
        if (!name) return false;
        const clean = String(name).replace(/\\/g, '/');
        return (
            clean === 'card.json' ||
            clean === 'module.risum' ||
            /(^|\/)(card\.json|module\.risum|module\.json)$/i.test(clean) ||
            /\.(json|risum|charx)$/i.test(clean)
        );
    }

    let eocdPos = -1;
    let actualCdStart = -1;
    let zipBaseOffset = 0;
    const minSearch = Math.max(0, buf.length - 65557);
    for (let i = buf.length - 22; i >= minSearch; i--) {
        if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) {
            const candCount = view.getUint16(i + 10, true);
            const candSize = view.getUint32(i + 12, true);
            const candOffset = view.getUint32(i + 16, true);
            if (
                candOffset + 4 <= buf.length &&
                buf[candOffset] === 0x50 &&
                buf[candOffset + 1] === 0x4b &&
                buf[candOffset + 2] === 0x01 &&
                buf[candOffset + 3] === 0x02
            ) {
                eocdPos = i;
                actualCdStart = candOffset;
                zipBaseOffset = 0;
                break;
            }
            const inferredCd = i - candSize;
            if (
                inferredCd >= 0 &&
                inferredCd + 4 <= buf.length &&
                buf[inferredCd] === 0x50 &&
                buf[inferredCd + 1] === 0x4b &&
                buf[inferredCd + 2] === 0x01 &&
                buf[inferredCd + 3] === 0x02
            ) {
                eocdPos = i;
                actualCdStart = inferredCd;
                zipBaseOffset = inferredCd - candOffset;
                break;
            }
            if (candCount === 0 && candSize === 0) {
                eocdPos = i;
                actualCdStart = candOffset;
                zipBaseOffset = 0;
                break;
            }
        }
    }

    if (eocdPos !== -1 && actualCdStart >= 0) {
        const cdCount = view.getUint16(eocdPos + 10, true);
        let ptr = actualCdStart;
        for (let c = 0; c < cdCount && ptr + 46 <= buf.length; c++) {
            if (!(buf[ptr] === 0x50 && buf[ptr + 1] === 0x4b && buf[ptr + 2] === 0x01 && buf[ptr + 3] === 0x02)) {
                break;
            }
            const method = view.getUint16(ptr + 10, true);
            const compSize = view.getUint32(ptr + 20, true);
            const nameLen = view.getUint16(ptr + 28, true);
            const extraLen = view.getUint16(ptr + 30, true);
            const commentLen = view.getUint16(ptr + 32, true);
            const localHdrRel = view.getUint32(ptr + 42, true);
            const entryName = td.decode(buf.subarray(ptr + 46, ptr + 46 + nameLen));
            ptr += 46 + nameLen + extraLen + commentLen;

            if (!isTargetEntryName(entryName)) continue;

            let localPos = localHdrRel + zipBaseOffset;
            if (
                localPos < 0 ||
                localPos + 30 > buf.length ||
                !(buf[localPos] === 0x50 && buf[localPos + 1] === 0x4b && buf[localPos + 2] === 0x03 && buf[localPos + 3] === 0x04)
            ) {
                if (
                    localHdrRel >= 0 &&
                    localHdrRel + 30 <= buf.length &&
                    buf[localHdrRel] === 0x50 &&
                    buf[localHdrRel + 1] === 0x4b &&
                    buf[localHdrRel + 2] === 0x03 &&
                    buf[localHdrRel + 3] === 0x04
                ) {
                    localPos = localHdrRel;
                } else {
                    continue;
                }
            }

            const lNameLen = view.getUint16(localPos + 26, true);
            const lExtraLen = view.getUint16(localPos + 28, true);
            const dataStart = localPos + 30 + lNameLen + lExtraLen;
            if (compSize > 0 && dataStart + compSize <= buf.length) {
                const rawSlice = buf.subarray(dataStart, dataStart + compSize);
                try {
                    if (method === 0) {
                        entries[entryName] = rawSlice;
                        foundAny = true;
                    } else if (method === 8) {
                        entries[entryName] = await decompressDeflateRaw(rawSlice);
                        foundAny = true;
                    }
                } catch { /* ignore corrupted entry */ }
            }
        }
    }

    if (foundAny) return entries;

    // Fallback: linear scan for Local File Headers (0x04034b50)
    for (let p = 0; p <= buf.length - 30; p++) {
        if (buf[p] === 0x50 && buf[p + 1] === 0x4b && buf[p + 2] === 0x03 && buf[p + 3] === 0x04) {
            const lFlags = view.getUint16(p + 6, true);
            const lMethod = view.getUint16(p + 8, true);
            const lCompSize = view.getUint32(p + 18, true);
            const lFnLen = view.getUint16(p + 26, true);
            const lExLen = view.getUint16(p + 28, true);
            if (lFnLen === 0 || lFnLen > 512 || p + 30 + lFnLen + lExLen > buf.length) continue;
            const fName = td.decode(buf.subarray(p + 30, p + 30 + lFnLen));
            const dStart = p + 30 + lFnLen + lExLen;

            if (isTargetEntryName(fName)) {
                const candidateSlices = [];
                if (lCompSize > 0 && lCompSize !== 0xffffffff && dStart + lCompSize <= buf.length) {
                    candidateSlices.push(buf.subarray(dStart, dStart + lCompSize));
                } else if ((lFlags & 8) !== 0 || lCompSize === 0) {
                    let nextSig = -1;
                    for (let s = dStart; s <= buf.length - 4; s++) {
                        if (
                            buf[s] === 0x50 &&
                            buf[s + 1] === 0x4b &&
                            ((buf[s + 2] === 0x07 && buf[s + 3] === 0x08) ||
                                (buf[s + 2] === 0x03 && buf[s + 3] === 0x04) ||
                                (buf[s + 2] === 0x01 && buf[s + 3] === 0x02) ||
                                (buf[s + 2] === 0x05 && buf[s + 3] === 0x06))
                        ) {
                            nextSig = s;
                            break;
                        }
                    }
                    if (nextSig > dStart) {
                        if (buf[nextSig + 2] === 0x07 && buf[nextSig + 3] === 0x08) {
                            candidateSlices.push(buf.subarray(dStart, nextSig));
                        } else {
                            if (nextSig - 12 > dStart) {
                                candidateSlices.push(buf.subarray(dStart, nextSig - 12));
                            }
                            candidateSlices.push(buf.subarray(dStart, nextSig));
                        }
                    }
                }

                for (let cs = 0; cs < candidateSlices.length; cs++) {
                    const slice = candidateSlices[cs];
                    try {
                        if (lMethod === 0) {
                            entries[fName] = slice;
                            foundAny = true;
                            break;
                        } else if (lMethod === 8) {
                            entries[fName] = await decompressDeflateRaw(slice);
                            foundAny = true;
                            break;
                        }
                    } catch { /* ignore */ }
                }
            }

            if (lCompSize > 0 && lCompSize !== 0xffffffff && dStart + lCompSize <= buf.length) {
                p = dStart + lCompSize - 1;
            }
        }
    }
    return foundAny ? entries : null;
}

function tryParseJsonFromBytes(bytes) {
    if (!bytes || bytes.length < 2) return null;
    try {
        const raw = getTextDecoder('utf-8', { fatal: false }).decode(bytes);
        const clean = raw.replace(/^\uFEFF/, '').replace(/\0+$/g, '').trim();
        if (!clean) return null;
        if (clean.charAt(0) === '{') {
            const parsedDirect = JSON.parse(clean);
            if (parsedDirect && typeof parsedDirect === 'object') return parsedDirect;
        }
        const firstBrace = clean.indexOf('{');
        const lastBrace = clean.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace && firstBrace < 64) {
            const parsedSlice = JSON.parse(clean.slice(firstBrace, lastBrace + 1));
            if (parsedSlice && typeof parsedSlice === 'object') return parsedSlice;
        }
    } catch { /* ignore */ }
    return null;
}

/**
 * Decodes RisuAI .risum module binary (magic 0x6F, version 0x00, 4-byte LE mainLen, RPack + JSON/MsgPack/deflate).
 */
export async function decodeRisumBytes(buf) {
    try {
        if (!buf || buf.length < 8) return null;
        if (buf[0] !== 0x6f || buf[1] !== 0x00) return null;

        const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        const mainLen = view.getUint32(2, true);
        if (mainLen === 0) return null;
        const endPos = Math.min(buf.length, 6 + mainLen);
        if (endPos <= 6) return null;

        const mainSlice = buf.subarray(6, endPos);
        const rpackDecoded = decodeRPack(mainSlice);
        const candidates = [rpackDecoded, mainSlice];

        for (let i = 0; i < candidates.length; i++) {
            const cand = candidates[i];
            const jObj = tryParseJsonFromBytes(cand);
            if (jObj && typeof jObj === 'object' && !Array.isArray(jObj)) {
                return jObj.module && typeof jObj.module === 'object' ? jObj.module : jObj;
            }
            try {
                const mpDirect = decodeMsgpack(cand);
                if (mpDirect && typeof mpDirect === 'object' && !Array.isArray(mpDirect)) {
                    return mpDirect.module && typeof mpDirect.module === 'object' ? mpDirect.module : mpDirect;
                }
            } catch { /* ignore */ }
        }

        for (let j = 0; j < candidates.length; j++) {
            try {
                const decomp = await decompressBuffer(candidates[j]);
                const jObj2 = tryParseJsonFromBytes(decomp);
                if (jObj2 && typeof jObj2 === 'object' && !Array.isArray(jObj2)) {
                    return jObj2.module && typeof jObj2.module === 'object' ? jObj2.module : jObj2;
                }
                const mpDecomp = decodeMsgpack(decomp);
                if (mpDecomp && typeof mpDecomp === 'object' && !Array.isArray(mpDecomp)) {
                    return mpDecomp.module && typeof mpDecomp.module === 'object' ? mpDecomp.module : mpDecomp;
                }
            } catch { /* ignore */ }
        }
    } catch { /* ignore */ }
    return null;
}

export async function extractPngCardJsonFromBytes(buf) {
    try {
        if (!buf || buf.length < 32 || buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
            return null;
        }
        const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        const tdLatin1 = getTextDecoder('iso-8859-1');
        let offset = 8;
        let bestObj = null;

        while (offset + 12 <= buf.length) {
            const len = view.getUint32(offset, false);
            const type = tdLatin1.decode(buf.subarray(offset + 4, offset + 8));
            const dataStart = offset + 8;
            if (dataStart + len > buf.length) break;

            if (type === 'tEXt' || type === 'iTXt' || type === 'zTXt') {
                const chunk = buf.subarray(dataStart, dataStart + len);
                let nulPos = -1;
                for (let k = 0; k < Math.min(chunk.length, 32); k++) {
                    if (chunk[k] === 0) {
                        nulPos = k;
                        break;
                    }
                }
                if (nulPos > 0) {
                    const keyword = tdLatin1.decode(chunk.subarray(0, nulPos)).toLowerCase();
                    if (keyword === 'ccv3' || keyword === 'chara') {
                        let payloadBytes = chunk.subarray(nulPos + 1);
                        if (type === 'zTXt' && payloadBytes.length > 1) {
                            try {
                                payloadBytes = await decompressBuffer(payloadBytes.subarray(1));
                            } catch { /* ignore */ }
                        } else if (type === 'iTXt' && payloadBytes.length > 4) {
                            const compFlag = payloadBytes[0];
                            let pOff = 2;
                            while (pOff < payloadBytes.length && payloadBytes[pOff] !== 0) pOff++;
                            pOff++;
                            while (pOff < payloadBytes.length && payloadBytes[pOff] !== 0) pOff++;
                            pOff++;
                            payloadBytes = payloadBytes.subarray(pOff);
                            if (compFlag === 1) {
                                try {
                                    payloadBytes = await decompressBuffer(payloadBytes);
                                } catch { /* ignore */ }
                            }
                        }
                        const b64Str = tdLatin1.decode(payloadBytes).trim();
                        try {
                            const u8 = decodeBase64ToUint8(b64Str);
                            const parsed = tryParseJsonFromBytes(u8);
                            if (parsed && (keyword === 'ccv3' || !bestObj)) {
                                bestObj = parsed;
                            }
                        } catch { /* ignore */ }
                    }
                }
            }
            offset += 12 + len;
            if (type === 'IEND') break;
        }
        return bestObj;
    } catch { /* ignore */ }
    return null;
}

export function normalizeCharxOrModuleObject(rawObj, extraRisumModule, fallbackName) {
    if (!rawObj || typeof rawObj !== 'object') return null;

    const modSource =
        rawObj.type === 'risuModule' && rawObj.module
            ? rawObj.module
            : rawObj.module && typeof rawObj.module === 'object'
                ? rawObj.module
                : rawObj;
    const cardData =
        rawObj.spec === 'chara_card_v3' ||
        rawObj.spec === 'chara_card_v2' ||
        (rawObj.data && typeof rawObj.data === 'object' && !Array.isArray(rawObj.data))
            ? rawObj.data || rawObj
            : typeof rawObj.name === 'string' &&
                (typeof rawObj.description === 'string' ||
                    typeof rawObj.first_mes === 'string' ||
                    typeof rawObj.system_prompt === 'string' ||
                    rawObj.character_book ||
                    rawObj.extensions)
                ? rawObj
                : null;
    const risuExt =
        (cardData && cardData.extensions && cardData.extensions.risuai) ||
        (rawObj.extensions && rawObj.extensions.risuai) ||
        {};
    const risumMod =
        extraRisumModule && typeof extraRisumModule === 'object'
            ? extraRisumModule.module && typeof extraRisumModule.module === 'object'
                ? extraRisumModule.module
                : extraRisumModule
            : null;

    const isRecognizedModule =
        Boolean(rawObj.__isCharxModule) ||
        rawObj.type === 'risuModule' ||
        rawObj.type === 'risu' ||
        rawObj.spec === 'chara_card_v3' ||
        rawObj.spec === 'chara_card_v2' ||
        Array.isArray(modSource.lorebook) ||
        Array.isArray(modSource.regex) ||
        Array.isArray(modSource.trigger) ||
        typeof modSource.customModuleToggle === 'string' ||
        typeof modSource.backgroundEmbedding === 'string' ||
        typeof modSource.cjs === 'string' ||
        Boolean(cardData) ||
        Boolean(risumMod);

    if (!isRecognizedModule) return null;

    if (
        rawObj.__isCharxModule &&
        Array.isArray(rawObj.lorebook) &&
        Array.isArray(rawObj.regex) &&
        Array.isArray(rawObj.promptBlocks)
    ) {
        return rawObj;
    }

    const name =
        (risumMod && typeof risumMod.name === 'string' && risumMod.name.trim()) ||
        (cardData && typeof cardData.name === 'string' && cardData.name.trim()) ||
        (typeof modSource.name === 'string' && modSource.name.trim()) ||
        (fallbackName || 'CharX_Module').replace(/\.(charx|risum|json|png)$/i, '');

    const description =
        (risumMod && typeof risumMod.description === 'string' && risumMod.description.trim()) ||
        (cardData && typeof cardData.creator_notes === 'string' && cardData.creator_notes.trim()) ||
        (typeof modSource.description === 'string' && modSource.description.trim()) ||
        '';

    const toggleParts = [];
    if (typeof modSource.customModuleToggle === 'string' && modSource.customModuleToggle.trim()) {
        toggleParts.push(modSource.customModuleToggle.trim());
    }
    if (
        typeof risuExt.customModuleToggle === 'string' &&
        risuExt.customModuleToggle.trim() &&
        toggleParts.indexOf(risuExt.customModuleToggle.trim()) === -1
    ) {
        toggleParts.push(risuExt.customModuleToggle.trim());
    }
    if (
        risumMod &&
        typeof risumMod.customModuleToggle === 'string' &&
        risumMod.customModuleToggle.trim() &&
        toggleParts.indexOf(risumMod.customModuleToggle.trim()) === -1
    ) {
        toggleParts.push(risumMod.customModuleToggle.trim());
    }
    const customModuleToggle = toggleParts.join('\n');

    const promptBlocks = [];
    if (cardData) {
        if (typeof cardData.system_prompt === 'string' && cardData.system_prompt.trim()) {
            promptBlocks.push({
                id: 'charx_sys_prompt',
                name: 'System Prompt (CharX)',
                role: 'system',
                content: cardData.system_prompt.trim(),
                enabled: true
            });
        }
        if (typeof cardData.post_history_instructions === 'string' && cardData.post_history_instructions.trim()) {
            promptBlocks.push({
                id: 'charx_post_hist',
                name: 'Post-History / Jailbreak (CharX)',
                role: 'system',
                content: cardData.post_history_instructions.trim(),
                enabled: true
            });
        }
        if (typeof risuExt.additionalText === 'string' && risuExt.additionalText.trim()) {
            promptBlocks.push({
                id: 'charx_risu_add_text',
                name: 'Risu Additional Prompt',
                role: 'system',
                content: risuExt.additionalText.trim(),
                enabled: true
            });
        }
        if (typeof cardData.description === 'string' && cardData.description.trim()) {
            const descText = cardData.description.trim();
            const looksLikeModulePrompt =
                /\{\{|<[a-zA-Z0-9_-]+>|\[.*\]|##/i.test(descText) || promptBlocks.length === 0;
            promptBlocks.push({
                id: 'charx_description',
                name: 'Module / Card Description',
                role: 'system',
                content: descText,
                enabled: looksLikeModulePrompt
            });
        }
        if (typeof cardData.personality === 'string' && cardData.personality.trim()) {
            promptBlocks.push({
                id: 'charx_personality',
                name: 'Personality / Style Block',
                role: 'system',
                content: cardData.personality.trim(),
                enabled: false
            });
        }
        if (typeof cardData.scenario === 'string' && cardData.scenario.trim()) {
            promptBlocks.push({
                id: 'charx_scenario',
                name: 'Scenario / World Context',
                role: 'system',
                content: cardData.scenario.trim(),
                enabled: false
            });
        }
        if (typeof cardData.mes_example === 'string' && cardData.mes_example.trim()) {
            promptBlocks.push({
                id: 'charx_mes_example',
                name: 'Example Dialogue (mes_example)',
                role: 'system',
                content: cardData.mes_example.trim(),
                enabled: false
            });
        }
    }

    const lorebook = [];
    const pushRisuLoreArray = (arr, prefix) => {
        if (!Array.isArray(arr)) return;
        for (let i = 0; i < arr.length; i++) {
            const lb = arr[i];
            if (!lb || typeof lb !== 'object') continue;
            if (lb.mode === 'folder') continue;
            const content = typeof lb.content === 'string' ? lb.content : '';
            if (!content.trim()) continue;
            const keyStr = Array.isArray(lb.key) ? lb.key.join(', ') : typeof lb.key === 'string' ? lb.key : '';
            const secKeyStr = Array.isArray(lb.secondkey)
                ? lb.secondkey.join(', ')
                : typeof lb.secondkey === 'string'
                    ? lb.secondkey
                    : '';
            const comment =
                (typeof lb.comment === 'string' && lb.comment.trim()) ||
                (typeof lb.name === 'string' && lb.name.trim()) ||
                (keyStr ? keyStr.slice(0, 36) : 'Lore Entry #' + (lorebook.length + 1));
            const alwaysActive = Boolean(lb.alwaysActive || lb.constant || !keyStr.trim());
            lorebook.push({
                id: prefix + '_lore_' + i,
                comment,
                key: keyStr,
                secondkey: secKeyStr,
                content,
                insertorder: typeof lb.insertorder === 'number' ? lb.insertorder : 100,
                alwaysActive,
                selective: Boolean(lb.selective),
                enabled: lb.enabled !== false
            });
        }
    };

    pushRisuLoreArray(modSource.lorebook, 'mod');
    if (risumMod && risumMod !== modSource) {
        pushRisuLoreArray(risumMod.lorebook, 'risum');
    }
    if (Array.isArray(risuExt.customLore)) {
        pushRisuLoreArray(risuExt.customLore, 'ext_lore');
    }

    if (cardData && cardData.character_book) {
        const cbEntries = Array.isArray(cardData.character_book.entries)
            ? cardData.character_book.entries
            : cardData.character_book.entries && typeof cardData.character_book.entries === 'object'
                ? Object.keys(cardData.character_book.entries).map(k => cardData.character_book.entries[k])
                : Array.isArray(cardData.character_book)
                    ? cardData.character_book
                    : [];
        for (let cIdx = 0; cIdx < cbEntries.length; cIdx++) {
            const ce = cbEntries[cIdx];
            if (!ce || typeof ce !== 'object') continue;
            if (ce.mode === 'folder' || (ce.extensions && ce.extensions.risu_mode === 'folder')) continue;
            const ceContent = typeof ce.content === 'string' ? ce.content : '';
            if (!ceContent.trim()) continue;
            const keysStr = Array.isArray(ce.keys)
                ? ce.keys.join(', ')
                : typeof ce.key === 'string'
                    ? ce.key
                    : '';
            const secKeysStr = Array.isArray(ce.secondary_keys)
                ? ce.secondary_keys.join(', ')
                : typeof ce.secondkey === 'string'
                    ? ce.secondkey
                    : '';
            const ceTitle =
                (typeof ce.comment === 'string' && ce.comment.trim()) ||
                (typeof ce.name === 'string' && ce.name.trim()) ||
                (keysStr ? keysStr.slice(0, 36) : 'Book Entry #' + (cIdx + 1));
            const ceAlways = Boolean(
                ce.constant ||
                    ce.alwaysActive ||
                    (ce.extensions && ce.extensions.risu_alwaysActive) ||
                    !keysStr.trim()
            );
            lorebook.push({
                id: 'cb_lore_' + cIdx,
                comment: ceTitle,
                key: keysStr,
                secondkey: secKeysStr,
                content: ceContent,
                insertorder: typeof ce.insertion_order === 'number' ? ce.insertion_order : 100,
                alwaysActive: ceAlways,
                selective: Boolean(ce.selective),
                enabled: ce.enabled !== false
            });
        }
    }

    const regexList = [];
    const pushRegexArray = (arr, prefix) => {
        if (!Array.isArray(arr)) return;
        for (let r = 0; r < arr.length; r++) {
            const rx = arr[r];
            if (!rx || typeof rx !== 'object') continue;
            const inPat =
                typeof rx.in === 'string'
                    ? rx.in
                    : typeof rx.findRegex === 'string'
                        ? rx.findRegex
                        : '';
            const outPat =
                typeof rx.out === 'string'
                    ? rx.out
                    : typeof rx.replaceString === 'string'
                        ? rx.replaceString
                        : '';
            if (!inPat) continue;
            const rxTitle =
                (typeof rx.comment === 'string' && rx.comment.trim()) ||
                (typeof rx.scriptName === 'string' && rx.scriptName.trim()) ||
                'Regex #' + (regexList.length + 1) + ' (' + (rx.type || 'editoutput') + ')';
            regexList.push({
                id: prefix + '_rx_' + r,
                comment: rxTitle,
                in: inPat,
                out: outPat,
                type: typeof rx.type === 'string' ? rx.type : 'editoutput',
                flag: typeof rx.flag === 'string' ? rx.flag : 'g',
                ableFlag: Boolean(rx.ableFlag),
                enabled: rx.enabled !== false && rx.disabled !== true
            });
        }
    };

    pushRegexArray(modSource.regex, 'mod');
    if (risumMod && risumMod !== modSource) {
        pushRegexArray(risumMod.regex, 'risum');
    }
    pushRegexArray(risuExt.customScripts, 'ext');

    return {
        __isCharxModule: true,
        name,
        description,
        customModuleToggle,
        promptBlocks,
        lorebook,
        regex: regexList,
        __laylaToggleValues:
            rawObj.__laylaToggleValues && typeof rawObj.__laylaToggleValues === 'object'
                ? rawObj.__laylaToggleValues
                : {},
        __laylaDisabledLoreIds:
            rawObj.__laylaDisabledLoreIds && typeof rawObj.__laylaDisabledLoreIds === 'object'
                ? rawObj.__laylaDisabledLoreIds
                : {},
        __laylaDisabledRegexIds:
            rawObj.__laylaDisabledRegexIds && typeof rawObj.__laylaDisabledRegexIds === 'object'
                ? rawObj.__laylaDisabledRegexIds
                : {},
        __laylaDisabledPromptIds:
            rawObj.__laylaDisabledPromptIds && typeof rawObj.__laylaDisabledPromptIds === 'object'
                ? rawObj.__laylaDisabledPromptIds
                : {},
        __laylaForceAlwaysLoreIds:
            rawObj.__laylaForceAlwaysLoreIds && typeof rawObj.__laylaForceAlwaysLoreIds === 'object'
                ? rawObj.__laylaForceAlwaysLoreIds
                : {}
    };
}

export async function decodeCharxOrModuleBytes(buf, fileName = 'module.charx') {
    if (!buf || buf.length === 0) {
        throw new Error('Empty .charx / .risum file.');
    }

    // 1. .risum binary (0x6F, 0x00)
    const risumDirect = await decodeRisumBytes(buf);
    if (risumDirect) {
        const normRisum = normalizeCharxOrModuleObject(risumDirect, null, fileName);
        if (normRisum) return normRisum;
    }

    // 2. ZIP archive (.charx or JPEG/PNG+ZIP hybrid)
    const zipEntries = await extractZipEntriesFromBytes(buf);
    if (zipEntries) {
        let cardJsonObj = null;
        let embeddedRisumObj = null;
        const entryKeys = Object.keys(zipEntries);

        for (let i = 0; i < entryKeys.length; i++) {
            const k = entryKeys[i];
            const eBytes = zipEntries[k];
            if (!eBytes) continue;
            if (/module\.risum$|\.risum$/i.test(k)) {
                const decRm = await decodeRisumBytes(eBytes);
                if (decRm) embeddedRisumObj = decRm;
            } else if (/card\.json$|\.json$/i.test(k)) {
                const parsed = tryParseJsonFromBytes(eBytes);
                if (parsed && typeof parsed === 'object') {
                    if (/card\.json$/i.test(k) || !cardJsonObj) {
                        cardJsonObj = parsed;
                    }
                }
            }
        }

        if (cardJsonObj || embeddedRisumObj) {
            const normZip = normalizeCharxOrModuleObject(
                cardJsonObj || embeddedRisumObj,
                cardJsonObj ? embeddedRisumObj : null,
                fileName
            );
            if (normZip) return normZip;
        }
    }

    // 3. PNG with embedded ccv3 / chara chunk
    const pngCard = await extractPngCardJsonFromBytes(buf);
    if (pngCard) {
        const normPng = normalizeCharxOrModuleObject(pngCard, null, fileName);
        if (normPng) return normPng;
    }

    // 4. Plain UTF-8 JSON module or character card
    const jObj = tryParseJsonFromBytes(buf);
    if (jObj) {
        const normJson = normalizeCharxOrModuleObject(jObj, null, fileName);
        if (normJson) return normJson;
    }

    // 5. Fallback: RPack / deflate / MsgPack module container
    const candidates = [decodeRPack(buf), buf];
    for (let c = 0; c < candidates.length; c++) {
        const cand = candidates[c];
        const jCand = tryParseJsonFromBytes(cand);
        if (jCand) {
            const normJCand = normalizeCharxOrModuleObject(jCand, null, fileName);
            if (normJCand) return normJCand;
        }
        try {
            const mpDirect = decodeMsgpack(cand);
            if (mpDirect && typeof mpDirect === 'object') {
                const normDirect = normalizeCharxOrModuleObject(mpDirect, null, fileName);
                if (normDirect) return normDirect;
            }
        } catch { /* ignore */ }
        try {
            const dec = await decompressBuffer(cand);
            const jDec = tryParseJsonFromBytes(dec);
            if (jDec) {
                const normJDec = normalizeCharxOrModuleObject(jDec, null, fileName);
                if (normJDec) return normJDec;
            }
            const mp = decodeMsgpack(dec);
            if (mp && typeof mp === 'object') {
                const normMp = normalizeCharxOrModuleObject(mp, null, fileName);
                if (normMp) return normMp;
            }
        } catch { /* ignore */ }
    }

    throw new Error('Could not decode .charx / .risum module file.');
}

export async function decodePresetBytes(buf, fileName = 'preset.risup') {
    if (!buf || buf.length === 0) {
        throw new Error('Empty preset file.');
    }
    const lower = String(fileName || '').toLowerCase();

    // 0. Check if file is .charx / .risum / ZIP archive
    if (
        lower.endsWith('.charx') ||
        lower.endsWith('.risum') ||
        (buf.length >= 4 && buf[0] === 0x6f && buf[1] === 0x00) ||
        (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04)
    ) {
        try {
            const charxMod = await decodeCharxOrModuleBytes(buf, fileName);
            if (charxMod) return charxMod;
        } catch { /* fall through */ }
    }

    // 1. Plain UTF-8 JSON
    try {
        const rawTxt = getTextDecoder('utf-8', { fatal: false }).decode(buf);
        const cleanTxt = rawTxt.replace(/^\uFEFF/, '').replace(/\0+$/g, '').trim();
        const firstBrace = cleanTxt.indexOf('{');
        const lastBrace = cleanTxt.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace && firstBrace < 32) {
            const j = JSON.parse(cleanTxt.slice(firstBrace, lastBrace + 1));
            if (j && typeof j === 'object' && !Array.isArray(j)) {
                const unwrapped = unwrapPresetObject(j);
                if (detectPresetFormat(unwrapped)) return unwrapped;
                const asMod = normalizeCharxOrModuleObject(j, null, fileName);
                if (asMod) return asMod;
                const encJson = toU8(j.preset) || toU8(j.pres);
                if (encJson && encJson.length > 0) {
                    const decJson = await decryptRisuAesGcm(encJson);
                    return decodeDecryptedPresetPayload(decJson);
                }
                return unwrapped;
            }
        }
    } catch { /* ignore */ }

    // 2. Binary RPack + deflate/zlib + MsgPack + AES-GCM
    const isRisup = lower.endsWith('.risup');
    const candidates = isRisup ? [decodeRPack(buf), buf] : [buf, decodeRPack(buf)];
    let lastErr = null;
    for (let i = 0; i < candidates.length; i++) {
        try {
            const res = await tryDecodeBinaryCandidate(candidates[i]);
            if (res && typeof res === 'object') return res;
        } catch (err) {
            lastErr = err;
        }
    }

    // 3. Uncompressed direct MsgPack container
    for (let k = 0; k < candidates.length; k++) {
        try {
            const directOuter = decodeMsgpack(candidates[k]);
            if (directOuter && typeof directOuter === 'object') {
                const directEnc = toU8(directOuter.preset) || toU8(directOuter.pres);
                if (directEnc && directEnc.length > 0) {
                    const directDec = await decryptRisuAesGcm(directEnc);
                    return decodeDecryptedPresetPayload(directDec);
                }
                return unwrapPresetObject(directOuter);
            }
        } catch { /* ignore */ }
    }

    // 4. Final fallback: hybrid .charx / PNG card
    try {
        const fallbackCharx = await decodeCharxOrModuleBytes(buf, fileName);
        if (fallbackCharx) return fallbackCharx;
    } catch { /* ignore */ }

    throw lastErr || new Error('Failed to decode preset or .charx/.risum file.');
}

/* ---------------- 2. Format Detection, Toggles, Multi-Select & CBS Evaluator ---------------- */

export function detectPresetFormat(rawObj) {
    if (rawObj && typeof rawObj === 'object' && rawObj.__isCharxModule) return 'charx';
    const obj = unwrapPresetObject(rawObj);
    if (!obj || typeof obj !== 'object') return null;
    if (obj.__isCharxModule) return 'charx';
    if (
        Array.isArray(obj.promptTemplate) ||
        typeof obj.customPromptTemplateToggle === 'string' ||
        typeof obj.mainPrompt === 'string' ||
        typeof obj.maxResponse === 'number' ||
        typeof obj.PresensePenalty === 'number'
    ) {
        return 'risuai';
    }
    if (Array.isArray(obj.prompts) || Array.isArray(obj.prompt_order)) {
        return 'sillytavern';
    }
    return null;
}

export function isZeroNoneOptionLabel(label) {
    const t = String(label || '').trim().toLowerCase();
    return (
        t === '없음' ||
        t === '꺼짐' ||
        t === '비활성' ||
        t === '비활성화' ||
        t === '선택안함' ||
        t === '선택 안함' ||
        t === '미사용' ||
        t === '안함' ||
        t === 'none' ||
        t === 'off' ||
        t === 'disabled' ||
        t === 'false' ||
        t === 'x' ||
        t === '-'
    );
}

export function parseMultiSelectIndices(valRaw, optionsLen) {
    const raw = String(valRaw !== undefined && valRaw !== null ? valRaw : '0').trim();
    if (!raw) return ['0'];
    const parts = raw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    const out = [];
    for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (out.indexOf(p) === -1) {
            const n = Number(p);
            if (!Number.isNaN(n) && n >= 0 && (!optionsLen || n < optionsLen)) {
                out.push(String(n));
            } else if (!optionsLen) {
                out.push(p);
            }
        }
    }
    return out.length > 0 ? out : ['0'];
}

export function formatSelectToggleDisplay(tf) {
    if (!tf || !Array.isArray(tf.options) || tf.options.length === 0) {
        return String(tf && tf.value !== undefined ? tf.value : '');
    }
    const indices = parseMultiSelectIndices(tf.value, tf.options.length);
    const labels = [];
    for (let i = 0; i < indices.length; i++) {
        const idx = Number(indices[i]);
        if (!Number.isNaN(idx) && tf.options[idx] !== undefined) {
            labels.push(tf.options[idx]);
        } else {
            labels.push(indices[i]);
        }
    }
    return labels.join(' + ');
}

export function isToggleMultiSelectEnabled(tf, multiSelectTogglesMap, sourcePrefix = 'risup') {
    if (!tf) return false;
    const multiKey = sourcePrefix === 'charx' ? 'charx:' + tf.key : tf.key;
    if (multiSelectTogglesMap && multiSelectTogglesMap[multiKey] !== undefined) {
        return Boolean(multiSelectTogglesMap[multiKey]);
    }
    return Boolean(tf.isExplicitMulti || tf.hasPlusOption || String(tf.value).indexOf(',') !== -1);
}

export function toggleMultiSelectIndex(currentValue, clickedIdxRaw, options) {
    const opts = Array.isArray(options) ? options : [];
    const clickedIdx = String(clickedIdxRaw);
    const zeroIsNone = opts.length > 0 && isZeroNoneOptionLabel(opts[0]);
    const current = parseMultiSelectIndices(currentValue, opts.length);

    if (zeroIsNone && clickedIdx === '0') {
        return '0';
    }
    const filtered = current.filter(x => (zeroIsNone ? x !== '0' : true));
    const pos = filtered.indexOf(clickedIdx);
    if (pos !== -1) {
        filtered.splice(pos, 1);
    } else {
        filtered.push(clickedIdx);
    }
    filtered.sort((a, b) => Number(a) - Number(b));
    return filtered.length > 0 ? filtered.join(',') : '0';
}

export function parseRisuCustomToggles(rawStr, savedValues = {}) {
    const list = [];
    if (typeof rawStr !== 'string' || !rawStr.trim()) return list;
    const lines = rawStr.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.indexOf('//') === 0 || line.indexOf('#') === 0) continue;
        const parts = line.split('=');
        const k = (parts[0] || '').trim();
        const label = (parts[1] || k).trim();
        const type = (parts[2] || '').trim().toLowerCase();
        const optRaw = parts.slice(3).join('=').trim();

        if (type === 'divider' || type === 'group' || type === 'caption') {
            list.push({ key: k || '__div_' + i, label: label || 'Section', kind: 'divider', value: false });
            continue;
        }
        if (type === 'groupend') continue;
        if (!k) continue;

        if (
            type === 'select' ||
            type === 'dropdown' ||
            type === 'multiselect' ||
            type === 'multi' ||
            type === 'checkbox' ||
            type === 'check'
        ) {
            const opts = optRaw
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);
            const cur = savedValues[k] !== undefined ? String(savedValues[k]) : '0';
            const hasPlusOpt = opts.some(o => o.indexOf('+') === 0 || o.indexOf('＋') === 0);
            const isExplicitMulti =
                type === 'multiselect' || type === 'multi' || type === 'checkbox' || type === 'check';
            list.push({
                key: k,
                label,
                kind: 'select',
                options: opts,
                value: cur,
                hasPlusOption: hasPlusOpt,
                isExplicitMulti
            });
        } else if (type === 'text') {
            const curT = savedValues[k] !== undefined ? String(savedValues[k]) : optRaw;
            list.push({ key: k, label, kind: 'text', value: curT });
        } else {
            const curB =
                savedValues[k] !== undefined
                    ? savedValues[k] === true || savedValues[k] === '1' || savedValues[k] === 'true'
                    : false;
            list.push({ key: k, label, kind: 'boolean', value: curB });
        }
    }
    return list;
}

function stripOuterParens(s) {
    let str = String(s || '').trim();
    while (str.length >= 2 && str.charAt(0) === '(' && str.charAt(str.length - 1) === ')') {
        let depth = 0;
        let balanced = true;
        for (let i = 0; i < str.length - 1; i++) {
            const ch = str.charAt(i);
            if (ch === '(') depth++;
            else if (ch === ')') {
                depth--;
                if (depth === 0) {
                    balanced = false;
                    break;
                }
            }
        }
        if (balanced && depth === 1) {
            str = str.slice(1, -1).trim();
        } else {
            break;
        }
    }
    return str.replace(/^[()]+|[()]+$/g, '').trim();
}

function cbsValuesMatch(aRaw, bRaw) {
    const a = stripOuterParens(aRaw);
    const b = stripOuterParens(bRaw);
    if (a === b) return true;
    const aNum = Number(a);
    const bNum = Number(b);
    if (a !== '' && b !== '' && !Number.isNaN(aNum) && !Number.isNaN(bNum) && aNum === bNum) return true;
    if (a.indexOf(',') !== -1) {
        const aParts = a
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        for (let i = 0; i < aParts.length; i++) {
            if (aParts[i] === b) return true;
            const apNum = Number(aParts[i]);
            if (aParts[i] !== '' && b !== '' && !Number.isNaN(apNum) && !Number.isNaN(bNum) && apNum === bNum) {
                return true;
            }
        }
    }
    if (b.indexOf(',') !== -1) {
        const bParts = b
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        for (let j = 0; j < bParts.length; j++) {
            if (bParts[j] === a) return true;
            const bpNum = Number(bParts[j]);
            if (bParts[j] !== '' && a !== '' && !Number.isNaN(bpNum) && !Number.isNaN(aNum) && bpNum === aNum) {
                return true;
            }
        }
    }
    return false;
}

function evalSingleCbsComp(tokenRaw) {
    const token = stripOuterParens(tokenRaw);
    const m = token.match(/^(.*?)\s*(>=|<=|!=|==|=|>|<)\s*(.*)$/);
    if (m) {
        const lhs = stripOuterParens(m[1]);
        const op = m[2];
        const rhs = stripOuterParens(m[3]);
        if (op === '=' || op === '==') return cbsValuesMatch(lhs, rhs);
        if (op === '!=') return !cbsValuesMatch(lhs, rhs);
        const rNum = Number(rhs);
        if (lhs.indexOf(',') !== -1 && !Number.isNaN(rNum)) {
            const lParts = lhs
                .split(',')
                .map(s => Number(s.trim()))
                .filter(n => !Number.isNaN(n));
            if (lParts.length > 0) {
                if (op === '>=') return lParts.some(n => n >= rNum);
                if (op === '<=') return lParts.some(n => n <= rNum);
                if (op === '>') return lParts.some(n => n > rNum);
                if (op === '<') return lParts.some(n => n < rNum);
            }
        }
        const lNum = Number(lhs);
        if (op === '>=') return lNum >= rNum;
        if (op === '<=') return lNum <= rNum;
        if (op === '>') return lNum > rNum;
        if (op === '<') return lNum < rNum;
    }
    if (token.indexOf(',') !== -1) {
        const tParts = token
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        return tParts.some(p => p !== '0' && p.toLowerCase() !== 'false');
    }
    return (
        token === '1' ||
        token.toLowerCase() === 'true' ||
        (token !== '' && !Number.isNaN(Number(token)) && Number(token) > 0)
    );
}

function evalRisuQuestion(exprRaw, toggleValues) {
    const expr = String(exprRaw || '').replace(/\$toggle_([a-zA-Z0-9_.\-\uAC00-\uD7A3]+)/gi, (_, key) => {
        const v = toggleValues[key.trim()];
        return v === undefined || v === null ? '0' : String(v);
    });
    const orParts = expr.split(/\|\||\|/);
    for (let i = 0; i < orParts.length; i++) {
        const andParts = orParts[i].split(/&&|&/);
        let andOk = true;
        for (let j = 0; j < andParts.length; j++) {
            if (!evalSingleCbsComp(andParts[j])) {
                andOk = false;
                break;
            }
        }
        if (andOk) return '1';
    }
    return '0';
}

function evalWhenClauseTokens(tokens, toggleValues) {
    if (!tokens || tokens.length === 0) return false;
    const t0 = (tokens[0] || '').toLowerCase();
    const t1 = (tokens[1] || '').toLowerCase();
    if (t0 === 'not' && tokens.length >= 2) {
        return !evalWhenClauseTokens(tokens.slice(1), toggleValues);
    }
    if (t0 === 'toggle' && tokens.length >= 2) {
        const tv = toggleValues[tokens[1]];
        return cbsValuesMatch(tv !== undefined ? String(tv) : '0', '1') || tv === 'true';
    }
    if (t1 === 'tis' && tokens.length >= 3) {
        const tvTis = toggleValues[tokens[0]];
        return cbsValuesMatch(tvTis !== undefined ? String(tvTis) : '0', tokens[2]);
    }
    if (t1 === 'tisnot' && tokens.length >= 3) {
        const tvTisNot = toggleValues[tokens[0]];
        return !cbsValuesMatch(tvTisNot !== undefined ? String(tvTisNot) : '0', tokens[2]);
    }
    if (t1 === 'is' && tokens.length >= 3) {
        return cbsValuesMatch(tokens[0], tokens[2]);
    }
    if (t1 === 'isnot' && tokens.length >= 3) {
        return !cbsValuesMatch(tokens[0], tokens[2]);
    }
    const joined = tokens.join('::');
    return joined === '1' || joined.toLowerCase() === 'true';
}

/**
 * Evaluates RisuAI Curly Braced Syntax (CBS) macros using active toggle/dropdown/multi-select values.
 */
export function evaluateRisuCbs(text, toggleValues = {}) {
    if (!text || typeof text !== 'string') return '';
    const safeToggles = toggleValues && typeof toggleValues === 'object' ? toggleValues : {};
    const localVars = { ...safeToggles };
    let out = text;

    // 0. Strip CBS comments {{// ...}} upfront so commented macros never execute
    out = out.replace(/\{\{\/\/[\s\S]*?\}\}/g, '');

    // 1. {{length::{{getglobalvar::toggle_KEY}}}} & {{user_input}}
    out = out.replace(
        /\{\{length::\{\{(?:getglobalvar|getvar)::toggle_([a-zA-Z0-9_.\-\uAC00-\uD7A3]+)\}\}\}\}/gi,
        (_, key) => {
            const val = localVars[key.trim()];
            return String(String(val !== undefined && val !== null ? val : '').trim().length);
        }
    );
    out = out.replace(/\{\{user_input\}\}/gi, '');

    const blockRegex =
        /\{\{#(if_pure|if|when)(?:\s+|::)?([^{}]*?)\}\}((?:(?!\{\{#(?:if_pure|if|when)\b)[\s\S])*?)\{\{\/(?:if_pure|if|when)(?:\s*)\}\}/i;

    const resolveValueMacrosPass = str => {
        let cur = str;
        for (let pass = 0; pass < 8; pass++) {
            const prev = cur;
            cur = cur.replace(
                /\{\{setvar::([a-zA-Z0-9_.\-\uAC00-\uD7A3]+)::([^{}]*?)\}\}/gi,
                (_, rawKey, rawVal) => {
                    const cleanKey = rawKey.trim().replace(/^toggle_/i, '');
                    localVars[cleanKey] = rawVal;
                    localVars[rawKey.trim()] = rawVal;
                    return '';
                }
            );
            cur = cur.replace(
                /\{\{addvar::([a-zA-Z0-9_.\-\uAC00-\uD7A3]+)::([^{}]*?)\}\}/gi,
                (_, rawKey, rawDelta) => {
                    const cleanKey = rawKey.trim().replace(/^toggle_/i, '');
                    const baseNum = Number(localVars[rawKey.trim()] ?? localVars[cleanKey] ?? 0) || 0;
                    const deltaNum = Number(rawDelta) || 0;
                    const nextStr = String(baseNum + deltaNum);
                    localVars[cleanKey] = nextStr;
                    localVars[rawKey.trim()] = nextStr;
                    return '';
                }
            );
            cur = cur.replace(
                /\{\{(?:getglobalvar|getvar)::([a-zA-Z0-9_.\-\uAC00-\uD7A3]+)\}\}/gi,
                (_, rawKey) => {
                    const k = rawKey.trim();
                    const stripped = k.replace(/^toggle_/i, '');
                    const val =
                        localVars[k] !== undefined
                            ? localVars[k]
                            : localVars[stripped] !== undefined
                                ? localVars[stripped]
                                : /^toggle_/i.test(k)
                                    ? '0'
                                    : '';
                    return val === null || val === undefined ? '' : String(val);
                }
            );
            cur = cur.replace(/\{\{length::([^{}]*?)\}\}/gi, (_, inner) => {
                return String(String(inner || '').trim().length);
            });
            cur = cur.replace(/\{\{\?\s*([^{}]*?)\}\}/g, (_, expr) => {
                return evalRisuQuestion(expr, localVars);
            });
            cur = cur.replace(
                /\{\{(equal|not_equal|notequal|and|or)::([^{}]*?)::([^{}]*?)\}\}/gi,
                (_, opRaw, aRaw, bRaw) => {
                    const op = opRaw.toLowerCase();
                    const a = String(aRaw).trim();
                    const b = String(bRaw).trim();
                    if (op === 'equal') return cbsValuesMatch(a, b) ? '1' : '0';
                    if (op === 'not_equal' || op === 'notequal') return !cbsValuesMatch(a, b) ? '1' : '0';
                    const aT = a === '1' || a.toLowerCase() === 'true';
                    const bT = b === '1' || b.toLowerCase() === 'true';
                    if (op === 'and') return aT && bT ? '1' : '0';
                    return aT || bT ? '1' : '0';
                }
            );
            cur = cur.replace(/\{\{not::([^{}]*?)\}\}/gi, (_, aRaw) => {
                const a = String(aRaw).trim();
                const aT = a === '1' || a.toLowerCase() === 'true';
                return aT ? '0' : '1';
            });
            if (cur === prev) break;
        }
        return cur;
    };

    // 2 & 3. Interleaved fixed-point resolution of value macros AND nested {{#if}} / {{#if_pure}} / {{#when}} blocks
    for (let round = 0; round < 24; round++) {
        const roundPrev = out;
        out = resolveValueMacrosPass(out);

        if (blockRegex.test(out)) {
            out = out.replace(blockRegex, (_, tagRaw, condRaw, body) => {
                const tag = String(tagRaw || '').toLowerCase();
                const cond = String(condRaw || '').trim();
                let truthy = false;

                if (tag === 'when') {
                    let parts = cond.split('::').map(s => s.trim());
                    if (parts[0] && parts[0].toLowerCase() === 'keep' && parts.length >= 2) {
                        parts = parts.slice(1);
                    }
                    const clauses = [];
                    const ops = [];
                    let curClause = [];
                    for (let cIdx = 0; cIdx < parts.length; cIdx++) {
                        const tk = parts[cIdx];
                        const tkLow = tk.toLowerCase();
                        if ((tkLow === 'and' || tkLow === 'or') && curClause.length > 0) {
                            clauses.push(curClause);
                            ops.push(tkLow);
                            curClause = [];
                        } else {
                            curClause.push(tk);
                        }
                    }
                    if (curClause.length > 0) clauses.push(curClause);
                    if (clauses.length > 0) {
                        truthy = evalWhenClauseTokens(clauses[0], localVars);
                        for (let opIdx = 0; opIdx < ops.length; opIdx++) {
                            const nextVal = evalWhenClauseTokens(clauses[opIdx + 1], localVars);
                            if (ops[opIdx] === 'and') truthy = truthy && nextVal;
                            else truthy = truthy || nextVal;
                        }
                    }
                } else {
                    truthy = cond === '1' || cond.toLowerCase() === 'true';
                    if (!truthy && /^toggle_([a-zA-Z0-9_.\-\uAC00-\uD7A3]+)$/i.test(cond)) {
                        const k = cond.replace(/^toggle_/i, '');
                        truthy =
                            cbsValuesMatch(localVars[k] !== undefined ? String(localVars[k]) : '0', '1') ||
                            localVars[k] === 'true';
                    }
                }
                const elseParts = String(body).split(/\{\{:else\}\}/i);
                return truthy ? elseParts[0] : elseParts[1] || '';
            });
        }

        if (out === roundPrev) break;
    }

    // 4. Apply {{trim}} macro (strips whitespace adjacent to {{trim}})
    out = out.replace(/\s*\{\{trim\}\}\s*/gi, '');
    return out.replace(/\n{3,}/g, '\n\n').trim();
}

function extractCategoryAndShort(rawName) {
    const trimmed = (rawName || '').trim();
    const m1 = trimmed.match(/^[\[【(]([^\]】)]{1,28})[\]】)]\s*(.+)$/);
    if (m1) {
        const g1 = m1[1].trim();
        const l1 = m1[2].trim();
        if (g1 && l1 && !/^(on|off|toggle|opt|필수|선택|주의|참고)$/i.test(g1)) {
            return { cat: g1, short: l1 };
        }
    }
    const m2 = trimmed.match(/^([^:：｜|/\-]{2,26})\s*(?:[:：｜|]| - | \/ )\s*(.+)$/);
    if (m2) return { cat: m2[1].trim(), short: m2[2].trim() };
    return { cat: null, short: trimmed || 'Untitled' };
}

function isHeaderDivider(item) {
    const t = (item.name || '').trim();
    const c = (item.content || '').trim();
    if (!c && t.length > 0 && !CORE_ST_PLACEHOLDERS[item.identifier]) return true;
    if (/^[\-=~*#◈◆◇▶▷━─═]{2,}/.test(t) && c.length < 40) return true;
    if (/^\[.*(구분|섹션|헤더|메뉴|설정|그룹|section|header).*\]$/i.test(t) && c.length === 0) return true;
    return false;
}

export function buildOptionGroups(items) {
    const catCounts = {};
    const parsedList = items.map(it => {
        const p = extractCategoryAndShort(it.name);
        if (p.cat) {
            const key = p.cat.toLowerCase();
            catCounts[key] = (catCounts[key] || 0) + 1;
        }
        return { item: it, cat: p.cat, short: p.short };
    });

    const groups = [];
    const bucketByCatKey = {};

    for (let i = 0; i < parsedList.length; i++) {
        const entry = parsedList[i];
        const catKey = entry.cat ? entry.cat.toLowerCase() : null;
        if (catKey && catCounts[catKey] >= 2) {
            if (!bucketByCatKey[catKey]) {
                const newGroup = {
                    id: 'grp_' + catKey.replace(/[^a-zA-Z0-9_\uAC00-\uD7A3]/g, '_'),
                    title: entry.cat,
                    suggestedMode: 'dropdown',
                    items: []
                };
                bucketByCatKey[catKey] = newGroup;
                groups.push(newGroup);
            }
            bucketByCatKey[catKey].items.push({ ...entry.item, shortLabel: entry.short });
        } else {
            groups.push({
                id: 'single_' + entry.item.identifier,
                title: entry.item.name,
                suggestedMode: 'toggles',
                items: [{ ...entry.item, shortLabel: entry.item.name }]
            });
        }
    }

    for (let gIdx = 0; gIdx < groups.length; gIdx++) {
        const g = groups[gIdx];
        if (g.items.length >= 2) {
            const enabledCount = g.items.filter(x => x.enabled).length;
            g.suggestedMode = enabledCount >= 2 ? 'toggles' : 'dropdown';
        }
    }

    return groups;
}

/* ---------------- 3. ViewModel Builders (Preset + CharX Module) ---------------- */

export function parseCharxModuleViewModel(modRecord, baseToggleValues = {}) {
    if (!modRecord || !modRecord.data) return null;
    const mod = normalizeCharxOrModuleObject(modRecord.data, null, modRecord.fileName);
    if (!mod) return null;

    const savedToggles =
        mod.__laylaToggleValues && typeof mod.__laylaToggleValues === 'object' ? mod.__laylaToggleValues : {};
    const risuToggles = parseRisuCustomToggles(mod.customModuleToggle || '', savedToggles);

    const modToggleValuesMap = {};
    const activeToggleSummaryLines = [];
    for (let tIdx = 0; tIdx < risuToggles.length; tIdx++) {
        const tf = risuToggles[tIdx];
        if (tf.kind === 'divider') continue;
        modToggleValuesMap[tf.key] = tf.kind === 'boolean' ? (tf.value ? '1' : '0') : String(tf.value);
        if (tf.kind === 'boolean' && tf.value) {
            activeToggleSummaryLines.push('- ' + tf.label + ': ON');
        } else if (tf.kind === 'select' && tf.options && tf.options.length > 0) {
            activeToggleSummaryLines.push('- ' + tf.label + ': ' + formatSelectToggleDisplay(tf));
        } else if (tf.kind === 'text' && String(tf.value).trim()) {
            activeToggleSummaryLines.push('- ' + tf.label + ': ' + String(tf.value).trim());
        }
    }

    const unifiedToggles = { ...baseToggleValues, ...modToggleValuesMap };
    const disabledPromptMap = mod.__laylaDisabledPromptIds || {};
    const disabledLoreMap = mod.__laylaDisabledLoreIds || {};
    const forceAlwaysLoreMap = mod.__laylaForceAlwaysLoreIds || {};
    const disabledRegexMap = mod.__laylaDisabledRegexIds || {};

    const promptBlocks = (mod.promptBlocks || []).map(pb => {
        const isEn = disabledPromptMap[pb.id] !== undefined ? !disabledPromptMap[pb.id] : Boolean(pb.enabled);
        const evalContent = evaluateRisuCbs(pb.content || '', unifiedToggles);
        return {
            ...pb,
            id: pb.id,
            identifier: pb.id,
            shortLabel: pb.name,
            evaluatedContent: evalContent,
            enabled: isEn
        };
    });

    const loreItems = (mod.lorebook || []).map(lb => {
        const isEn = disabledLoreMap[lb.id] !== undefined ? !disabledLoreMap[lb.id] : lb.enabled !== false;
        const isAlways =
            forceAlwaysLoreMap[lb.id] !== undefined ? Boolean(forceAlwaysLoreMap[lb.id]) : Boolean(lb.alwaysActive);
        const evalContent = evaluateRisuCbs(lb.content || '', unifiedToggles);
        const keysList = String(lb.key || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        const displayTitle = lb.comment || lb.name || (keysList[0] ? keysList[0] : 'Lore Entry');
        return {
            ...lb,
            name: displayTitle,
            comment: displayTitle,
            keys: keysList,
            evaluatedContent: evalContent,
            enabled: isEn,
            alwaysActive: isAlways
        };
    });

    const regexItems = (mod.regex || []).map(rx => {
        const isEn = disabledRegexMap[rx.id] !== undefined ? !disabledRegexMap[rx.id] : rx.enabled !== false;
        return {
            ...rx,
            inPattern: typeof rx.in === 'string' ? rx.in : '',
            outReplace: typeof rx.out === 'string' ? rx.out : '',
            flags: typeof rx.flag === 'string' ? rx.flag : 'g',
            enabled: isEn
        };
    });

    const compiledParts = [];
    if (activeToggleSummaryLines.length > 0) {
        compiledParts.push(
            '[Active CharX Module Directives // ' + mod.name + ']\n' + activeToggleSummaryLines.join('\n')
        );
    }

    const activePrompts = [];
    const activePromptBlocks = [];
    for (let pIdx = 0; pIdx < promptBlocks.length; pIdx++) {
        const pbItem = promptBlocks[pIdx];
        if (!pbItem.enabled || !pbItem.content || !pbItem.content.trim()) continue;
        if (pbItem.evaluatedContent) {
            activePromptBlocks.push(pbItem);
            activePrompts.push({
                identifier: pbItem.id,
                name: '[CHARX] ' + pbItem.name,
                shortLabel: pbItem.name,
                role: pbItem.role || 'system',
                content: pbItem.content,
                evaluatedContent: pbItem.evaluatedContent
            });
            compiledParts.push('### [CHARX] ' + pbItem.name + ' (' + (pbItem.role || 'system') + ')\n' + pbItem.evaluatedContent);
        }
    }

    const activeAlwaysLore = [];
    const activeKeywordLore = [];
    for (let lIdx = 0; lIdx < loreItems.length; lIdx++) {
        const lbItem = loreItems[lIdx];
        if (!lbItem.enabled || !lbItem.content || !lbItem.content.trim()) continue;
        if (!lbItem.evaluatedContent) continue;
        if (lbItem.alwaysActive) {
            activeAlwaysLore.push(lbItem);
            activePrompts.push({
                identifier: lbItem.id,
                name: '[LORE] ' + lbItem.comment,
                shortLabel: lbItem.comment,
                role: 'system',
                content: lbItem.content,
                evaluatedContent: lbItem.evaluatedContent
            });
            compiledParts.push('### [CHARX LOREBOOK] ' + lbItem.comment + '\n' + lbItem.evaluatedContent);
        } else {
            activeKeywordLore.push(lbItem);
        }
    }

    const activeRegexList = regexItems.filter(rx => rx.enabled);

    return {
        id: modRecord.id,
        fileName: modRecord.fileName,
        name: mod.name,
        description: mod.description,
        toggles: risuToggles,
        risuToggles,
        toggleValues: modToggleValuesMap,
        unifiedToggleValues: unifiedToggles,
        promptBlocks,
        activePromptBlocks,
        loreItems,
        alwaysActiveLore: activeAlwaysLore,
        activeAlwaysLore,
        keywordLore: activeKeywordLore,
        activeKeywordLore,
        regexItems,
        activeRegex: activeRegexList,
        activeRegexList,
        activePrompts,
        compiledPrompt: compiledParts.join('\n\n')
    };
}

export function parsePresetViewModel(record, activeModRecord = null) {
    const obj = record && record.data ? unwrapPresetObject(record.data) : {};
    const format = record ? detectPresetFormat(obj) : null;
    const savedToggles =
        obj.__laylaToggleValues && typeof obj.__laylaToggleValues === 'object' ? obj.__laylaToggleValues : {};
    const toggleRaw =
        typeof obj.customPromptTemplateToggle === 'string'
            ? obj.customPromptTemplateToggle
            : typeof obj.customModuleToggle === 'string'
                ? obj.customModuleToggle
                : '';
    const risuToggles = parseRisuCustomToggles(toggleRaw, savedToggles);

    const toggleValuesMap = {};
    const activeToggleSummaryLines = [];
    for (let tIdx = 0; tIdx < risuToggles.length; tIdx++) {
        const tf = risuToggles[tIdx];
        if (tf.kind === 'divider') continue;
        toggleValuesMap[tf.key] = tf.kind === 'boolean' ? (tf.value ? '1' : '0') : String(tf.value);
        if (tf.kind === 'boolean' && tf.value) {
            activeToggleSummaryLines.push('- ' + tf.label + ': ON');
        } else if (tf.kind === 'select' && tf.options && tf.options.length > 0) {
            activeToggleSummaryLines.push('- ' + tf.label + ': ' + formatSelectToggleDisplay(tf));
        } else if (tf.kind === 'text' && String(tf.value).trim()) {
            activeToggleSummaryLines.push('- ' + tf.label + ': ' + String(tf.value).trim());
        }
    }

    const charxVm = activeModRecord ? parseCharxModuleViewModel(activeModRecord, toggleValuesMap) : null;
    // Preset blocks always prioritize the preset's own toggleValuesMap so CharX toggles never overwrite preset toggles
    const presetEvalToggleValues = charxVm
        ? { ...charxVm.toggleValues, ...toggleValuesMap }
        : toggleValuesMap;

    const resolvedItems = [];
    if (record && format === 'risuai') {
        const disabledMap =
            obj.__laylaDisabledTemplateIds && typeof obj.__laylaDisabledTemplateIds === 'object'
                ? obj.__laylaDisabledTemplateIds
                : {};
        if (Array.isArray(obj.promptTemplate)) {
            for (let i = 0; i < obj.promptTemplate.length; i++) {
                const b = obj.promptTemplate[i];
                if (!b || typeof b !== 'object') continue;
                const bType = String(b.type || 'plain');
                let text = typeof b.text === 'string' ? b.text : '';
                if (!text && b.type2 === 'main' && typeof obj.mainPrompt === 'string') text = obj.mainPrompt;
                else if (!text && bType === 'jailbreak' && typeof obj.jailbreak === 'string') text = obj.jailbreak;
                else if ((!text || text.trim() === '{{slot}}') && b.type2 === 'globalNote' && typeof obj.globalNote === 'string') {
                    text = obj.globalNote;
                }
                const trimmedText = text.trim();
                const isPlaceholder =
                    !trimmedText ||
                    trimmedText === '{{slot}}' ||
                    bType === 'chat' ||
                    bType === 'description' ||
                    bType === 'persona' ||
                    bType === 'lorebook' ||
                    bType === 'memory' ||
                    bType === 'authornote' ||
                    bType === 'postEverything' ||
                    bType === 'cache';
                if (isPlaceholder) continue;
                const id = 'risu_tpl_' + i;
                const legacyId = 'risu_pt_' + i;
                const name =
                    typeof b.name === 'string' && b.name.trim()
                        ? b.name.trim()
                        : '[' + bType + '] ' + (text.slice(0, 26).replace(/\s+/g, ' ') || 'Block #' + (i + 1));
                resolvedItems.push({
                    identifier: id,
                    name,
                    shortLabel: name,
                    role: b.role === 'bot' ? 'assistant' : typeof b.role === 'string' ? b.role : 'system',
                    content: text,
                    enabled: !(disabledMap[id] || disabledMap[legacyId]),
                    isCore: false
                });
            }
        } else {
            if (typeof obj.mainPrompt === 'string' && obj.mainPrompt.trim()) {
                resolvedItems.push({
                    identifier: 'mainPrompt',
                    name: 'Main Prompt',
                    shortLabel: 'Main Prompt',
                    role: 'system',
                    content: obj.mainPrompt,
                    enabled: !disabledMap.mainPrompt,
                    isCore: false
                });
            }
            if (typeof obj.jailbreak === 'string' && obj.jailbreak.trim()) {
                resolvedItems.push({
                    identifier: 'jailbreak',
                    name: 'Jailbreak Prompt',
                    shortLabel: 'Jailbreak',
                    role: 'system',
                    content: obj.jailbreak,
                    enabled: !disabledMap.jailbreak,
                    isCore: false
                });
            }
            if (typeof obj.globalNote === 'string' && obj.globalNote.trim()) {
                resolvedItems.push({
                    identifier: 'globalNote',
                    name: 'Global Note',
                    shortLabel: 'Global Note',
                    role: 'system',
                    content: obj.globalNote,
                    enabled: !disabledMap.globalNote,
                    isCore: false
                });
            }
        }
    } else if (record && format === 'sillytavern') {
        const rawPrompts = Array.isArray(obj.prompts) ? obj.prompts : [];
        const byId = {};
        for (let pIdx = 0; pIdx < rawPrompts.length; pIdx++) {
            const rp = rawPrompts[pIdx];
            if (rp && rp.identifier) byId[rp.identifier] = rp;
        }
        const orderBlocks = Array.isArray(obj.prompt_order) ? obj.prompt_order : [];
        let blockIdx = orderBlocks.findIndex(b => b && b.character_id === 100001);
        if (blockIdx === -1 && orderBlocks.length > 0) blockIdx = orderBlocks.length - 1;
        const activeOrder = blockIdx >= 0 && Array.isArray(orderBlocks[blockIdx].order) ? orderBlocks[blockIdx].order : [];
        const seen = {};

        for (let oIdx = 0; oIdx < activeOrder.length; oIdx++) {
            const entry = activeOrder[oIdx];
            if (!entry || !entry.identifier || seen[entry.identifier]) continue;
            seen[entry.identifier] = true;
            const def = byId[entry.identifier];
            const content = def && typeof def.content === 'string' ? def.content : '';
            const isCore = Boolean(CORE_ST_PLACEHOLDERS[entry.identifier]) || Boolean(def && def.marker && !content.trim());
            resolvedItems.push({
                identifier: entry.identifier,
                name: def && def.name ? def.name : entry.identifier,
                shortLabel: def && def.name ? def.name : entry.identifier,
                role: def && def.role ? def.role : 'system',
                content,
                enabled: Boolean(entry.enabled),
                isCore
            });
        }
        for (let rIdx = 0; rIdx < rawPrompts.length; rIdx++) {
            const rem = rawPrompts[rIdx];
            if (!rem || !rem.identifier || seen[rem.identifier]) continue;
            seen[rem.identifier] = true;
            const remContent = typeof rem.content === 'string' ? rem.content : '';
            const remCore = Boolean(CORE_ST_PLACEHOLDERS[rem.identifier]) || Boolean(rem.marker && !remContent.trim());
            resolvedItems.push({
                identifier: rem.identifier,
                name: rem.name || rem.identifier,
                shortLabel: rem.name || rem.identifier,
                role: rem.role || 'system',
                content: remContent,
                enabled: Boolean(rem.enabled),
                isCore: remCore
            });
        }
    }

    const toggleable = resolvedItems.filter(it => !it.isCore && !isHeaderDivider(it));
    const groups = buildOptionGroups(toggleable);

    const compiledParts = [];
    if (activeToggleSummaryLines.length > 0) {
        compiledParts.push('[Active Risu Preset Directives]\n' + activeToggleSummaryLines.join('\n'));
    }

    const activePrompts = [];
    for (let aIdx = 0; aIdx < toggleable.length; aIdx++) {
        const ap = toggleable[aIdx];
        if (!ap.enabled || !ap.content.trim()) continue;
        const evaluated = evaluateRisuCbs(ap.content, presetEvalToggleValues);
        if (evaluated) {
            activePrompts.push({ ...ap, evaluatedContent: evaluated });
            compiledParts.push('### ' + ap.name + ' (' + ap.role + ')\n' + evaluated);
        }
    }

    if (charxVm) {
        if (charxVm.compiledPrompt) {
            compiledParts.push(charxVm.compiledPrompt);
        }
        for (let cIdx = 0; cIdx < charxVm.activePrompts.length; cIdx++) {
            activePrompts.push(charxVm.activePrompts[cIdx]);
        }
    }

    const compiled = compiledParts.join('\n\n');
    const baseName = record
        ? typeof obj.name === 'string' && obj.name.trim()
            ? obj.name.trim()
            : record.fileName.replace(/\.(risup|risupreset|json)$/i, '')
        : '';
    const unionName =
        baseName && charxVm
            ? baseName + ' + ' + charxVm.name
            : baseName || (charxVm ? charxVm.name : 'No Preset');

    return {
        format: record ? format : charxVm ? 'charx' : null,
        name: unionName,
        risuToggles,
        groups,
        activePrompts,
        totalCount: toggleable.length + (charxVm ? charxVm.promptBlocks.length + charxVm.loreItems.length : 0),
        presetBlockCount: toggleable.length,
        compiledPrompt: compiled,
        toggleValues: presetEvalToggleValues,
        charxVm
    };
}

/* ---------------- 4. Runtime Lorebook, Regex & SDK Payload Injection ---------------- */

function extractMessageText(msg) {
    if (!msg) return '';
    if (typeof msg.content === 'string') return msg.content;
    if (Array.isArray(msg.content)) {
        return msg.content
            .map(part => {
                if (typeof part === 'string') return part;
                if (part && typeof part.text === 'string') return part.text;
                return '';
            })
            .filter(Boolean)
            .join('\n');
    }
    return '';
}

export function matchCharxKeywordLoreForMessages(keywordLoreList, messages) {
    if (!Array.isArray(keywordLoreList) || keywordLoreList.length === 0 || !Array.isArray(messages)) {
        return [];
    }
    const recentText = messages
        .slice(-8)
        .map(extractMessageText)
        .join('\n')
        .toLowerCase();
    if (!recentText.trim()) return [];

    const matched = [];
    for (let i = 0; i < keywordLoreList.length; i++) {
        const lb = keywordLoreList[i];
        if (!lb || !lb.key) continue;
        const primaryKeys = String(lb.key)
            .split(',')
            .map(k => k.trim().toLowerCase())
            .filter(Boolean);
        if (primaryKeys.length === 0) continue;

        const hitPrimary = primaryKeys.some(pk => recentText.indexOf(pk) !== -1);
        if (!hitPrimary) continue;

        if (lb.selective && lb.secondkey && String(lb.secondkey).trim()) {
            const secKeys = String(lb.secondkey)
                .split(',')
                .map(k => k.trim().toLowerCase())
                .filter(Boolean);
            if (secKeys.length > 0) {
                const hitSec = secKeys.some(sk => recentText.indexOf(sk) !== -1);
                if (!hitSec) continue;
            }
        }
        matched.push(lb);
    }
    return matched;
}

const REGEX_INSTANCE_CACHE = new Map();
const MAX_REGEX_CACHE_ENTRIES = 256;

function getCachedRegExp(pattern, flags) {
    const cacheKey = flags + '\u0000' + pattern;
    let compiled = REGEX_INSTANCE_CACHE.get(cacheKey);
    if (compiled) {
        REGEX_INSTANCE_CACHE.delete(cacheKey);
        REGEX_INSTANCE_CACHE.set(cacheKey, compiled);
        compiled.lastIndex = 0;
        return compiled;
    }
    compiled = new RegExp(pattern, flags);
    if (REGEX_INSTANCE_CACHE.size >= MAX_REGEX_CACHE_ENTRIES) {
        const oldestKey = REGEX_INSTANCE_CACHE.keys().next().value;
        if (oldestKey !== undefined) REGEX_INSTANCE_CACHE.delete(oldestKey);
    }
    REGEX_INSTANCE_CACHE.set(cacheKey, compiled);
    return compiled;
}

export function getRegexCacheSize() {
    return REGEX_INSTANCE_CACHE.size;
}

export function clearRegexCache() {
    REGEX_INSTANCE_CACHE.clear();
}

// Shields GachaSwipe's structural reply-envelope tags from broad preset output regexes
// (e.g. /<[^>]+>/g status-bar strippers) so camera verdicts, group <reply> framing,
// M.E.O.W. tracking, and Lucid Dive <dream_state> envelopes never silently fail-closed.
const GACHASWIPE_ENVELOPE_SHIELD_RE =
    /<(send_image|image_prompt|current_location|routine_update|wardrobe_addition|dream_state|memory|heat|battle_status|spawn_enemy|enemy_update|speaker)\b[^>]*>[\s\S]*?<\/\1>|<\/?reply\b[^>]*>/gi;
const ENVELOPE_SENTINEL_RESTORE_RE = /\uE000GSENV(\d+)\uE001/g;

export function applyCharxRegexToText(rawText, activeRegexList, unifiedToggleValues = {}, phase = 'output') {
    if (!rawText || typeof rawText !== 'string') return rawText;
    if (!Array.isArray(activeRegexList) || activeRegexList.length === 0) return rawText;

    let shieldedEnvelopes = null;
    let out = rawText;
    if (phase === 'output' && out.indexOf('<') !== -1) {
        GACHASWIPE_ENVELOPE_SHIELD_RE.lastIndex = 0;
        if (GACHASWIPE_ENVELOPE_SHIELD_RE.test(out)) {
            shieldedEnvelopes = [];
            GACHASWIPE_ENVELOPE_SHIELD_RE.lastIndex = 0;
            out = out.replace(GACHASWIPE_ENVELOPE_SHIELD_RE, match => {
                const token = '\uE000GSENV' + shieldedEnvelopes.length + '\uE001';
                shieldedEnvelopes.push(match);
                return token;
            });
        }
    }

    for (let i = 0; i < activeRegexList.length; i++) {
        const rx = activeRegexList[i];
        if (!rx || !rx.in) continue;
        const rType = String(rx.type || 'editoutput').toLowerCase();
        const isInputPhase = rType === 'editinput' || rType === 'editprocess';
        const isOutputPhase = rType === 'editoutput' || rType === 'editdisplay' || !isInputPhase;
        if (phase === 'input' && !isInputPhase) continue;
        if (phase === 'output' && !isOutputPhase) continue;

        try {
            const rawFlags = rx.ableFlag && typeof rx.flag === 'string' ? rx.flag : 'g';
            const cleanFlags = rawFlags.replace(/[^gimsuy]/g, '') || 'g';
            const regExp = getCachedRegExp(rx.in, cleanFlags);
            const replacement = evaluateRisuCbs(typeof rx.out === 'string' ? rx.out : '', unifiedToggleValues);
            out = out.replace(regExp, replacement);
        } catch { /* ignore invalid user regex */ }
    }

    if (shieldedEnvelopes && shieldedEnvelopes.length > 0) {
        ENVELOPE_SENTINEL_RESTORE_RE.lastIndex = 0;
        out = out.replace(ENVELOPE_SENTINEL_RESTORE_RE, (full, idxStr) => {
            const idx = Number(idxStr);
            return idx >= 0 && idx < shieldedEnvelopes.length ? shieldedEnvelopes[idx] : full;
        });
    }
    return out;
}

export function isSideChannelRequest(req) {
    if (!req || !Array.isArray(req.messages) || req.messages.length === 0) return true;
    if (req.jsonSchema || req.response_format) return true;
    const combined = req.messages.map(extractMessageText).join('\n');
    return (
        /\[SIDE-CHANNEL TASK|Reply with ONLY a JSON object|Output STRICT JSON only|Output ONLY a valid JSON object|Output must be strictly XML|Return exactly 3 <option> blocks|CRITICAL DIRECTIVE: BREVITY & UI FIT OVER LITERAL TRANSLATION/i.test(
            combined
        ) ||
        /Generate the 3-beat storyboard now|Generate the 3 dream seeds for|<seeds>[\s\S]*?<\/seeds>|Summarize the recent exchange as ONE memory|You are an anime tag classifier|Output ONLY the <tags> XML|You are the Mirror of Truth/i.test(
            combined
        ) ||
        /Compile the <routine> XML block|<occupational_status>[\s\S]*?<wardrobe>[\s\S]*?<weekday>|<mutated_tags>|<dream_location>|<image_tags>[\s\S]*?<handwritten_message>|You are the set dresser for a photo series/i.test(
            combined
        ) ||
        /expert danbooru tag smith|creative archetype architect|Create a GachaSwipe original theme pack|You are a fashion AI for|Output ONLY a pipe-separated list|Output ONLY a comma-separated list/i.test(
            combined
        ) ||
        /You are a music producer|professional music producer and audio engineer|You are a professional songwriter|<concepts>[\s\S]*?<concept>[\s\S]*?<lyrics>|<analysis>\s*<(?:title|bpm)>|Output ONLY the bracketed sections and lyrics/i.test(
            combined
        ) ||
        /fake advertisement for "GachaFans"|Write a social media feed for "GachaFans"/i.test(combined)
    );
}

export function isCharGenRequest(req) {
    if (!req || !Array.isArray(req.messages) || req.messages.length === 0) return false;
    const combined = req.messages.map(extractMessageText).join('\n');
    return /USER_PREFERENCES:|PULSE_MATCH_ORIGIN:|SSR_RARITY_FLAG:|PERSPECTIVE:\s*Strict Third-Person Only|Start directly with <name>|\[SYSTEM:\s*GACHAFANS CREATOR GENERATOR\]|\[SYSTEM:\s*PROFILE COMPLETION\]|<theme_concept>|waifu generator|character generator|<first_message>|<appearance_tags>|<daily_routine>/i.test(
        combined
    );
}

/**
 * Converts stored preset temperature to standard 0.0 - 2.0 float scale.
 * RisuAI presets store temperature on a 0 - 200 integer scale (e.g. 85 -> 0.85, 100 -> 1.0).
 */
export function normalizePresetTemperature(rawP, format) {
    if (!rawP || typeof rawP.temperature !== 'number' || !Number.isFinite(rawP.temperature) || rawP.temperature < 0) {
        return undefined;
    }
    const t = rawP.temperature;
    if (rawP.__laylaTempFloat === true) {
        return Number(t.toFixed(4));
    }
    if (format === 'risuai') {
        if (t === 0) return 0;
        if (t > 2 || Number.isInteger(t)) {
            return Number((t / 100).toFixed(4));
        }
        return Number(t.toFixed(4));
    }
    return t > 2 ? Number((t / 100).toFixed(4)) : Number(t.toFixed(4));
}

/**
 * Converts a 0.0 - 2.0 UI float temperature back into the preset's native storage scale.
 */
export function denormalizePresetTemperature(displayTemp, format) {
    if (typeof displayTemp !== 'number' || !Number.isFinite(displayTemp) || displayTemp < 0) {
        return undefined;
    }
    const clamped = Math.min(2, Math.max(0, displayTemp));
    if (format === 'risuai') {
        return Math.round(clamped * 100);
    }
    return Number(clamped.toFixed(4));
}

/* ---------------- 5. Store Helpers & Pure Request Transformer ---------------- */

export function createDefaultPresetStore() {
    return {
        presets: [],
        activeId: null,
        modules: [],
        activeModuleId: null,
        charxEnabled: true,
        groupModes: {},
        multiSelectToggles: {},
        sdkHookEnabled: true,
        injectionPosition: 'append',
        injectionScope: 'chat_only',
        updatedAt: 0
    };
}

export function normalizePresetStore(parsed) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const next = {
        ...createDefaultPresetStore(),
        ...parsed
    };
    next.presets = Array.isArray(next.presets)
        ? next.presets
              .filter(p => p && p.id && p.data)
              .map(p => ({ ...p, data: unwrapPresetObject(p.data) }))
        : [];
    next.modules = Array.isArray(next.modules)
        ? next.modules
              .filter(m => m && m.id && m.data)
              .map(m => ({ ...m, data: normalizeCharxOrModuleObject(m.data, null, m.fileName) || m.data }))
        : [];
    next.charxEnabled = next.charxEnabled !== false;
    next.sdkHookEnabled = next.sdkHookEnabled !== false;
    next.injectionPosition = next.injectionPosition === 'prepend' ? 'prepend' : 'append';
    next.injectionScope = next.injectionScope === 'chat_and_chargen' ? 'chat_and_chargen' : 'chat_only';
    next.groupModes = next.groupModes && typeof next.groupModes === 'object' ? next.groupModes : {};
    next.multiSelectToggles =
        next.multiSelectToggles && typeof next.multiSelectToggles === 'object' ? next.multiSelectToggles : {};
    next.updatedAt = typeof next.updatedAt === 'number' ? next.updatedAt : 0;
    if (next.injectionPosition !== 'append' && next.injectionPosition !== 'prepend' && next.injectionPosition !== 'tail') {
        next.injectionPosition = 'append';
    }
    if (next.injectionScope !== 'chat_only' && next.injectionScope !== 'chat_and_chargen') {
        next.injectionScope = 'chat_only';
    }
    if (!next.activeId && next.presets[0]) next.activeId = next.presets[0].id;
    if (!next.activeModuleId && next.modules[0]) next.activeModuleId = next.modules[0].id;
    return next;
}

export function getActivePresetRecord(store) {
    if (!store || !Array.isArray(store.presets) || store.presets.length === 0) return null;
    if (!store.activeId) return store.presets[0] || null;
    return store.presets.find(p => p.id === store.activeId) || store.presets[0] || null;
}

export function getActiveModuleRecord(store) {
    if (!store || !Array.isArray(store.modules) || store.modules.length === 0) return null;
    if (!store.activeModuleId) return store.modules[0] || null;
    return store.modules.find(m => m.id === store.activeModuleId) || store.modules[0] || null;
}

/**
 * Pure request transformer for sdk.chat.completions.stream / create.
 * Returns { req, injected, skipped, isCharGen, charxVm }.
 */
export function applyPresetToCompletionRequest(req, store) {
    if (!req || typeof req !== 'object' || !store || !store.sdkHookEnabled) {
        return { req, injected: false, skipped: false, isCharGen: false, charxVm: null };
    }
    const presetRec = getActivePresetRecord(store);
    const modRec = store.charxEnabled !== false ? getActiveModuleRecord(store) : null;
    if (!presetRec && !modRec) {
        return { req, injected: false, skipped: false, isCharGen: false, charxVm: null };
    }

    // Fast short-circuit BEFORE CBS/prompt/lorebook evaluation so OOB side-channels
    // (including LocalDream image-tag authoring) incur near-zero CPU & GC overhead.
    if (isSideChannelRequest(req)) {
        return { req, injected: false, skipped: true, isCharGen: false, charxVm: null };
    }

    const isCharGen = isCharGenRequest(req);
    if (isCharGen && store.injectionScope !== 'chat_and_chargen') {
        return { req, injected: false, skipped: true, isCharGen: true, charxVm: null };
    }

    const vm = parsePresetViewModel(presetRec, modRec);
    const charxVm = vm.charxVm || null;
    let compiled = (vm.compiledPrompt || '').trim();

    if (charxVm && Array.isArray(charxVm.activeKeywordLore) && Array.isArray(req.messages)) {
        const matchedKeywordLore = matchCharxKeywordLoreForMessages(charxVm.activeKeywordLore, req.messages);
        if (matchedKeywordLore.length > 0) {
            const kwParts = matchedKeywordLore.map(
                lb => '### [CHARX KEYWORD LORE // ' + lb.comment + ']\n' + lb.evaluatedContent
            );
            compiled = (compiled ? compiled + '\n\n' : '') + kwParts.join('\n\n');
        }
    }

    const rawP = presetRec ? unwrapPresetObject(presetRec.data || {}) : {};
    const presetFormat = presetRec ? detectPresetFormat(rawP) : null;
    const resolvedTemp = normalizePresetTemperature(rawP, presetFormat);
    const hasSamplingOverride =
        resolvedTemp !== undefined ||
        (typeof rawP.top_p === 'number' && Number.isFinite(rawP.top_p) && rawP.top_p > 0 && rawP.top_p <= 1) ||
        (typeof rawP.top_k === 'number' && Number.isFinite(rawP.top_k) && rawP.top_k > 0) ||
        (typeof rawP.min_p === 'number' && Number.isFinite(rawP.min_p) && rawP.min_p > 0 && rawP.min_p <= 1) ||
        (typeof rawP.maxResponse === 'number' && Number.isFinite(rawP.maxResponse) && rawP.maxResponse >= 64) ||
        (typeof rawP.openai_max_tokens === 'number' && Number.isFinite(rawP.openai_max_tokens) && rawP.openai_max_tokens >= 64);

    const hasInputRegex = Boolean(
        charxVm &&
            Array.isArray(charxVm.activeRegexList) &&
            charxVm.activeRegexList.some(rx => {
                const t = String(rx.type || '').toLowerCase();
                return t === 'editinput' || t === 'editprocess';
            })
    );

    if (!compiled && !hasSamplingOverride && !hasInputRegex) {
        return { req, injected: false, skipped: false, isCharGen: false, charxVm };
    }

    const cloned = { ...req };
    if (Array.isArray(req.messages)) {
        const msgs = req.messages.map(m => {
            const copyM = { ...m };
            if (hasInputRegex && typeof copyM.content === 'string' && copyM.role === 'user') {
                copyM.content = applyCharxRegexToText(
                    copyM.content,
                    charxVm.activeRegexList,
                    charxVm.unifiedToggleValues,
                    'input'
                );
            }
            return copyM;
        });

        if (compiled) {
            const banner = isCharGen
                ? '\n\n================================================================\n' +
                  '[ACTIVE PRESET STYLE & WORLDVIEW REFERENCE // ' +
                  (vm.name || 'Custom Preset') +
                  ']\n' +
                  'IMPORTANT: Apply the tone, language, worldview, and writing style below when authoring the character profile and first_message, ' +
                  "but you MUST strictly preserve GachaSwipe's required XML/JSON character output tags and schema without omitting any fields!\n\n" +
                  compiled +
                  '\n================================================================\n'
                : '\n\n================================================================\n' +
                  '[ACTIVE PRESET OVERRIDE // ' +
                  (vm.name || 'Custom Preset') +
                  ']\n' +
                  compiled +
                  '\n================================================================\n';

            const alreadyInjected = msgs.some(
                m =>
                    m &&
                    typeof m.content === 'string' &&
                    (m.content.indexOf('[ACTIVE PRESET OVERRIDE //') !== -1 ||
                        m.content.indexOf('[ACTIVE PRESET STYLE & WORLDVIEW REFERENCE //') !== -1)
            );
            if (!alreadyInjected) {
                if (store.injectionPosition === 'tail' && !isCharGen) {
                    // KV prefix-cache safe mode: keeps msgs[0] and prior chat history byte-identical
                    // across turns even when keyword lorebooks or CBS variables flip.
                    msgs.push({ role: 'system', content: banner.trim() });
                } else {
                    const sysIdx = msgs.findIndex(m => m && m.role === 'system');
                    if (sysIdx !== -1 && typeof msgs[sysIdx].content === 'string') {
                        msgs[sysIdx].content =
                            store.injectionPosition === 'prepend' && !isCharGen
                                ? banner + '\n' + msgs[sysIdx].content
                                : msgs[sysIdx].content + banner;
                    } else {
                        msgs.unshift({ role: 'system', content: banner.trim() });
                    }
                }
            }
        }
        cloned.messages = msgs;
    }

    if (resolvedTemp !== undefined && cloned.temperature === undefined) {
        cloned.temperature = resolvedTemp;
    }
    if (
        typeof rawP.top_p === 'number' &&
        Number.isFinite(rawP.top_p) &&
        rawP.top_p > 0 &&
        rawP.top_p <= 1 &&
        cloned.top_p === undefined
    ) {
        cloned.top_p = rawP.top_p;
    }
    if (typeof rawP.top_k === 'number' && Number.isFinite(rawP.top_k) && rawP.top_k > 0 && cloned.top_k === undefined) {
        cloned.top_k = Math.round(rawP.top_k);
    }
    if (
        typeof rawP.min_p === 'number' &&
        Number.isFinite(rawP.min_p) &&
        rawP.min_p > 0 &&
        rawP.min_p <= 1 &&
        cloned.min_p === undefined
    ) {
        cloned.min_p = rawP.min_p;
    }
    const rawMaxTokens =
        presetFormat === 'risuai'
            ? rawP.maxResponse
            : typeof rawP.openai_max_tokens === 'number'
                ? rawP.openai_max_tokens
                : rawP.maxResponse;
    if (
        typeof rawMaxTokens === 'number' &&
        Number.isFinite(rawMaxTokens) &&
        rawMaxTokens >= 64 &&
        cloned.max_tokens === undefined
    ) {
        cloned.max_tokens = Math.round(rawMaxTokens);
    }

    return { req: cloned, injected: true, skipped: false, isCharGen, charxVm };
}
