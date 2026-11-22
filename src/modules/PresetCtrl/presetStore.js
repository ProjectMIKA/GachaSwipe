/**
 * Copyright (C) 2026 Project M.I.K.A. & Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Lightweight reactive store for ROM-09 (PRESET ENGINE).
 * - Zero boot I/O & zero preset RAM footprint while ROM-09 is ejected (or in LOCAL_ECO mode).
 * - Debounced persistence (350ms + immediate lifecycle flush) directly to canonical Layla
 *   SQLite app_state & IndexedDB without redundant multi-table / Base64 file IPC writes.
 */

import { useState, useEffect } from 'react';
import {
    createDefaultPresetStore,
    normalizePresetStore,
    unwrapPresetObject,
    detectPresetFormat,
    normalizeCharxOrModuleObject,
    decodePresetBytes,
    decodeCharxOrModuleBytes,
    getActivePresetRecord,
    getActiveModuleRecord,
    parsePresetViewModel,
    parseMultiSelectIndices,
    isToggleMultiSelectEnabled,
    toggleMultiSelectIndex,
    denormalizePresetTemperature,
    applyPresetToCompletionRequest,
    applyCharxRegexToText
} from '../../utils/presetEngine.js';

const STORAGE_KEY = 'gachaswipe_layla_preset_store_v2';
const NATIVE_FILE_NAME = 'gachaswipe_layla_preset_store_v2.json';
const IDB_NAME = 'gachaswipe_layla_preset_idb_v2';
const IDB_STORE = 'kv';
const BRIDGE_TIMEOUT_MS = 8000;
const PERSIST_DEBOUNCE_MS = 350;
const MAX_LOCALSTORAGE_CHARS = 262144; // 256 KB cap so multi-MB presets never bloat sync localStorage

let idSeqCounter = 0;
function makeUniqueStoreId(prefix) {
    idSeqCounter = (idSeqCounter + 1) % 1000000;
    return `${prefix}_${Date.now().toString(36)}_${idSeqCounter.toString(36)}`;
}

function withTimeout(promise, ms, fallbackValue) {
    return new Promise(resolve => {
        let settled = false;
        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                resolve(fallbackValue);
            }
        }, ms);
        Promise.resolve(promise)
            .then(val => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timer);
                    resolve(val);
                }
            })
            .catch(() => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timer);
                    resolve(fallbackValue);
                }
            });
    });
}

let store = createDefaultPresetStore();
let sdkRef = null;
let ensuredAppStateSdk = null;
let cachedIdbPromise = null;
let hasLoadedSyncSeed = false;
let hasHydratedAsync = false;
let hasHydratedWithSdk = false;
let inflightHydration = null;
let preHydrationOverrides = {};

let persistDebounceTimer = null;
let hasPendingPersist = false;
let isSavingNative = false;
let pendingNativeJson = null;
let lifecycleFlushBound = false;

const hookStats = {
    interceptedCount: 0,
    skippedSideChannelCount: 0,
    lastHookedAt: null,
    storageEngine: 'IDLE'
};

const listeners = new Set();

function notifyListeners() {
    if (listeners.size === 0) return;
    const snap = getPresetStoreSnapshot();
    listeners.forEach(fn => {
        try { fn(snap); } catch { /* ignore subscriber error */ }
    });
}

export function getPresetStoreSnapshot() {
    return {
        store,
        stats: { ...hookStats }
    };
}

export function subscribePresetStore(listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function loadSyncSeedOnce() {
    if (hasLoadedSyncSeed) return;
    hasLoadedSyncSeed = true;
    try {
        if (typeof localStorage !== 'undefined') {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const norm = normalizePresetStore(JSON.parse(raw));
                if (norm) {
                    store = { ...norm, ...preHydrationOverrides };
                    if (store.presets.length > 0 || store.modules.length > 0) {
                        hasHydratedAsync = true;
                        hookStats.storageEngine = 'LOCAL_CACHE';
                    }
                }
            }
        }
    } catch { /* ignore storage errors */ }
    if (hookStats.storageEngine === 'IDLE') {
        hookStats.storageEngine = 'READY';
    }
}

export function usePresetStore() {
    loadSyncSeedOnce();
    const [snapshot, setSnapshot] = useState(() => getPresetStoreSnapshot());
    useEffect(() => {
        const unsub = subscribePresetStore(setSnapshot);
        setSnapshot(getPresetStoreSnapshot());
        ensurePresetStoreHydrated().catch(() => {});
        return unsub;
    }, []);
    return snapshot;
}

/* ---------------- IndexedDB & Layla Native Persistence ---------------- */

function openIdb() {
    if (cachedIdbPromise) return cachedIdbPromise;
    const rawPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('No IndexedDB'));
            return;
        }
        try {
            const req = indexedDB.open(IDB_NAME, 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(IDB_STORE)) {
                    db.createObjectStore(IDB_STORE);
                }
            };
            req.onsuccess = () => {
                const db = req.result;
                const resetCache = () => { cachedIdbPromise = null; };
                db.onclose = resetCache;
                db.onversionchange = () => {
                    try { db.close(); } catch { /* ignore */ }
                    cachedIdbPromise = null;
                };
                resolve(db);
            };
            req.onerror = () => {
                cachedIdbPromise = null;
                reject(req.error || new Error('IDB open error'));
            };
            req.onblocked = () => {
                cachedIdbPromise = null;
                reject(new Error('IDB blocked'));
            };
        } catch (err) {
            cachedIdbPromise = null;
            reject(err);
        }
    });
    cachedIdbPromise = withTimeout(rawPromise, BRIDGE_TIMEOUT_MS, null).then(db => {
        if (!db) cachedIdbPromise = null;
        return db;
    });
    return cachedIdbPromise;
}

function readFromIdb() {
    return openIdb()
        .then(db => {
            if (!db) return null;
            return withTimeout(
                new Promise(resolve => {
                    try {
                        const tx = db.transaction(IDB_STORE, 'readonly');
                        const g = tx.objectStore(IDB_STORE).get(STORAGE_KEY);
                        g.onsuccess = () => resolve(typeof g.result === 'string' ? g.result : null);
                        g.onerror = () => resolve(null);
                    } catch {
                        cachedIdbPromise = null;
                        resolve(null);
                    }
                }),
                BRIDGE_TIMEOUT_MS,
                null
            );
        })
        .catch(() => null);
}

function writeToIdb(jsonStr) {
    return openIdb()
        .then(db => {
            if (!db) return false;
            return withTimeout(
                new Promise(resolve => {
                    try {
                        const tx = db.transaction(IDB_STORE, 'readwrite');
                        tx.objectStore(IDB_STORE).put(jsonStr, STORAGE_KEY);
                        tx.oncomplete = () => resolve(true);
                        tx.onerror = () => resolve(false);
                    } catch {
                        cachedIdbPromise = null;
                        resolve(false);
                    }
                }),
                BRIDGE_TIMEOUT_MS,
                false
            );
        })
        .catch(() => false);
}

async function execSqlWithTimeout(sdk, query, params = []) {
    if (!sdk || !sdk.db || typeof sdk.db.executeSql !== 'function') return null;
    return withTimeout(sdk.db.executeSql(query, params), BRIDGE_TIMEOUT_MS, null);
}

async function ensureAppStateTable(sdk) {
    if (!sdk || !sdk.db || typeof sdk.db.executeSql !== 'function') return false;
    if (ensuredAppStateSdk === sdk) return true;
    const res = await execSqlWithTimeout(
        sdk,
        'CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, val TEXT)',
        []
    );
    if (res !== null) ensuredAppStateSdk = sdk;
    return true;
}

async function readFromLaylaDb(sdk) {
    if (!sdk || !sdk.db || typeof sdk.db.executeSql !== 'function') return null;
    // 1. Canonical GachaSwipe app_state table
    try {
        await ensureAppStateTable(sdk);
        const stateRes = await execSqlWithTimeout(sdk, 'SELECT val FROM app_state WHERE key = ?', [STORAGE_KEY]);
        if (
            stateRes &&
            Array.isArray(stateRes.rows) &&
            stateRes.rows.length > 0 &&
            stateRes.rows[0] &&
            typeof stateRes.rows[0].val === 'string' &&
            stateRes.rows[0].val.length > 0
        ) {
            return stateRes.rows[0].val;
        }
    } catch { /* fall through to read-only legacy table */ }

    // 2. Read-only migration fallback for legacy layla_preset_kv table
    try {
        const res = await execSqlWithTimeout(sdk, 'SELECT v FROM layla_preset_kv WHERE k = ?', [STORAGE_KEY]);
        if (res && Array.isArray(res.rows) && res.rows.length > 0 && res.rows[0] && typeof res.rows[0].v === 'string') {
            return res.rows[0].v;
        }
    } catch { /* ignore if legacy table never existed */ }
    return null;
}

async function writeToLaylaDb(sdk, jsonStr) {
    if (!sdk || !sdk.db || typeof sdk.db.executeSql !== 'function') return false;
    try {
        await ensureAppStateTable(sdk);
        const res = await execSqlWithTimeout(
            sdk,
            'INSERT OR REPLACE INTO app_state (key, val) VALUES (?, ?)',
            [STORAGE_KEY, jsonStr]
        );
        return res !== null;
    } catch {
        return false;
    }
}

function decodeBase64ToUtf8(b64Raw) {
    const clean = String(b64Raw || '').replace(/^data:[^;]+;base64,/i, '').trim();
    if (!clean) return null;
    const binStr = atob(clean);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
    return new globalThis.TextDecoder('utf-8').decode(bytes);
}

async function readFromLaylaFile(sdk) {
    if (!sdk || !sdk.utils || typeof sdk.utils.readFile !== 'function') return null;
    try {
        const res = await withTimeout(sdk.utils.readFile(NATIVE_FILE_NAME), BRIDGE_TIMEOUT_MS, null);
        if (res && typeof res.content_base64 === 'string' && res.content_base64.length > 0) {
            return decodeBase64ToUtf8(res.content_base64);
        }
    } catch { /* ignore */ }
    return null;
}

function syncMirrorLocalStorage(jsonStr) {
    try {
        if (typeof localStorage === 'undefined') return;
        if (jsonStr.length <= MAX_LOCALSTORAGE_CHARS) {
            localStorage.setItem(STORAGE_KEY, jsonStr);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch { /* ignore quota error; IDB & Layla SQLite handle larger payloads */ }
}

function scoreStoreCandidate(cand) {
    if (!cand || !Array.isArray(cand.presets)) return -1;
    const hasContent = cand.presets.length > 0 || (Array.isArray(cand.modules) && cand.modules.length > 0);
    const ts = typeof cand.updatedAt === 'number' ? cand.updatedAt : 0;
    return (hasContent ? 1e15 : 0) + ts;
}

async function flushNativeSave() {
    if (isSavingNative || !pendingNativeJson) return;
    isSavingNative = true;
    try {
        while (pendingNativeJson) {
            const jsonToSave = pendingNativeJson;
            pendingNativeJson = null;
            if (sdkRef) {
                const okDb = await writeToLaylaDb(sdkRef, jsonToSave);
                if (okDb && hookStats.storageEngine !== 'LAYLA_SQLITE_DB') {
                    hookStats.storageEngine = 'LAYLA_SQLITE_DB';
                    notifyListeners();
                }
            }
        }
    } finally {
        isSavingNative = false;
    }
}

function persistStoreNow() {
    if (persistDebounceTimer !== null) {
        clearTimeout(persistDebounceTimer);
        persistDebounceTimer = null;
    }
    if (!hasPendingPersist) return;
    hasPendingPersist = false;

    const jsonStr = JSON.stringify(store);
    syncMirrorLocalStorage(jsonStr);
    writeToIdb(jsonStr);
    if (sdkRef) {
        pendingNativeJson = jsonStr;
        flushNativeSave();
    } else if (hookStats.storageEngine === 'READY') {
        hookStats.storageEngine = 'INDEXED_DB';
    }
}

function ensureLifecycleFlushListener() {
    if (lifecycleFlushBound || typeof window === 'undefined') return;
    lifecycleFlushBound = true;
    const onHide = () => {
        if (hasPendingPersist) persistStoreNow();
    };
    window.addEventListener('pagehide', onHide);
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && hasPendingPersist) {
                persistStoreNow();
            }
        });
    }
}

function schedulePersistStore() {
    ensureLifecycleFlushListener();
    hasPendingPersist = true;
    if (persistDebounceTimer !== null) {
        clearTimeout(persistDebounceTimer);
    }
    persistDebounceTimer = setTimeout(() => {
        persistDebounceTimer = null;
        persistStoreNow();
    }, PERSIST_DEBOUNCE_MS);
}

function commitStore(nextStore, options = {}) {
    loadSyncSeedOnce();
    const isContentMutation =
        options.contentMutation === true ||
        (Array.isArray(nextStore.presets) && nextStore.presets.length > 0) ||
        (Array.isArray(nextStore.modules) && nextStore.modules.length > 0);

    if (isContentMutation) {
        hasHydratedAsync = true;
        preHydrationOverrides = {};
    }

    store = {
        ...nextStore,
        updatedAt: Date.now()
    };

    // Guard: never overwrite IndexedDB / Layla DB with an empty store before async hydration finishes
    if (!hasHydratedAsync && !isContentMutation) {
        notifyListeners();
        return;
    }

    schedulePersistStore();
    notifyListeners();
}

/**
 * Registers the Layla SDK handle without triggering any DB/file/JSON I/O while ROM-09 is ejected.
 * If ROM-09 was already activated earlier in boot, automatically upgrades hydration with SDK DB.
 */
export function registerPresetSdkRef(sdk) {
    if (sdk) sdkRef = sdk;
    if (hasLoadedSyncSeed && sdkRef && !hasHydratedWithSdk) {
        ensurePresetStoreHydrated().catch(() => {});
    }
}

export async function hydratePresetStoreFromSdk(sdk) {
    if (sdk) sdkRef = sdk;
    loadSyncSeedOnce();

    const candidates = [];

    if (sdkRef) {
        const dbRaw = await readFromLaylaDb(sdkRef);
        if (dbRaw) {
            try {
                const dbNorm = normalizePresetStore(JSON.parse(dbRaw));
                if (dbNorm) candidates.push({ source: 'LAYLA_SQLITE_DB', store: dbNorm });
            } catch { /* ignore */ }
        } else {
            // Read-only fallback to legacy native file only when SQLite app_state has no entry
            const fileRaw = await readFromLaylaFile(sdkRef);
            if (fileRaw) {
                try {
                    const fileNorm = normalizePresetStore(JSON.parse(fileRaw));
                    if (fileNorm) candidates.push({ source: 'LAYLA_NATIVE_FILE', store: fileNorm });
                } catch { /* ignore */ }
            }
        }
        hasHydratedWithSdk = true;
    }

    const idbRaw = await readFromIdb();
    if (idbRaw) {
        try {
            const idbNorm = normalizePresetStore(JSON.parse(idbRaw));
            if (idbNorm) candidates.push({ source: 'INDEXED_DB', store: idbNorm });
        } catch { /* ignore */ }
    }

    hasHydratedAsync = true;

    if (candidates.length === 0) {
        if (Object.keys(preHydrationOverrides).length > 0) {
            store = { ...store, ...preHydrationOverrides };
            preHydrationOverrides = {};
        }
        if ((store.presets.length > 0 || store.modules.length > 0) && sdkRef) {
            const curStr = JSON.stringify(store);
            writeToLaylaDb(sdkRef, curStr);
            writeToIdb(curStr);
        }
        notifyListeners();
        return;
    }

    candidates.sort((a, b) => scoreStoreCandidate(b.store) - scoreStoreCandidate(a.store));
    const best = candidates[0];
    if (scoreStoreCandidate(best.store) >= scoreStoreCandidate(store)) {
        store = {
            ...best.store,
            ...preHydrationOverrides
        };
        preHydrationOverrides = {};
        hookStats.storageEngine = best.source === 'LAYLA_NATIVE_FILE' ? 'LAYLA_SQLITE_DB' : best.source;
        // Only migrate to canonical target when best came from a non-primary fallback
        if (sdkRef && best.source !== 'LAYLA_SQLITE_DB') {
            const bestJson = JSON.stringify(store);
            syncMirrorLocalStorage(bestJson);
            writeToLaylaDb(sdkRef, bestJson);
            writeToIdb(bestJson);
        } else if (!sdkRef && best.source !== 'INDEXED_DB') {
            const bestJson = JSON.stringify(store);
            writeToIdb(bestJson);
        }
        notifyListeners();
    } else if (sdkRef && (store.presets.length > 0 || store.modules.length > 0)) {
        const curJson = JSON.stringify(store);
        writeToLaylaDb(sdkRef, curJson);
    }
}

export function ensurePresetStoreHydrated() {
    loadSyncSeedOnce();
    const needsSdkHydration = Boolean(sdkRef && !hasHydratedWithSdk);
    if (hasHydratedAsync && !needsSdkHydration) {
        return Promise.resolve();
    }
    if (inflightHydration) return inflightHydration;
    inflightHydration = hydratePresetStoreFromSdk(sdkRef)
        .catch(() => {})
        .finally(() => {
            inflightHydration = null;
        });
    return inflightHydration;
}

/* ---------------- File Import & Store Mutators ---------------- */

async function readFileAsUint8Array(file) {
    if (!file) throw new Error('No file provided.');
    if (typeof file.arrayBuffer === 'function') {
        try {
            const ab = await file.arrayBuffer();
            if (ab) return new Uint8Array(ab);
        } catch { /* fall back to FileReader on older WebViews */ }
    }
    if (typeof FileReader !== 'undefined') {
        const abFromReader = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
            reader.readAsArrayBuffer(file);
        });
        if (abFromReader) return new Uint8Array(abFromReader);
    }
    throw new Error('Cannot read file buffer in this WebView.');
}

export async function importPresetOrCharxFile(file, preferCharxSlot = false) {
    loadSyncSeedOnce();
    const fileName = (file && file.name) || (preferCharxSlot ? 'module.charx' : 'preset.risup');
    const buf = await readFileAsUint8Array(file);
    const decoded = preferCharxSlot
        ? await decodeCharxOrModuleBytes(buf, fileName)
        : await decodePresetBytes(buf, fileName);

    if (decoded && decoded.__isCharxModule) {
        const modId = makeUniqueStoreId('charx');
        const nextModules = [{ id: modId, fileName, data: decoded }, ...store.modules];
        commitStore(
            {
                ...store,
                modules: nextModules,
                activeModuleId: modId,
                charxEnabled: true
            },
            { contentMutation: true }
        );
        return { kind: 'charx', id: modId, name: decoded.name || fileName };
    }

    const unwrapped = unwrapPresetObject(decoded);
    const presetId = makeUniqueStoreId('preset');
    const nextPresets = [{ id: presetId, fileName, data: unwrapped }, ...store.presets];
    commitStore(
        {
            ...store,
            presets: nextPresets,
            activeId: presetId
        },
        { contentMutation: true }
    );
    return { kind: 'preset', id: presetId, name: unwrapped.name || fileName };
}

export function importPastedJson(rawText) {
    loadSyncSeedOnce();
    const clean = String(rawText || '').trim();
    if (!clean) throw new Error('Pasted JSON content is empty.');
    const rawJson = JSON.parse(clean);
    const parsed = unwrapPresetObject(rawJson);

    if (detectPresetFormat(parsed)) {
        const id = makeUniqueStoreId('preset');
        const fileName =
            typeof parsed.name === 'string' && parsed.name.trim()
                ? parsed.name.trim() + '.json'
                : 'pasted_preset.json';
        commitStore(
            {
                ...store,
                presets: [{ id, fileName, data: parsed }, ...store.presets],
                activeId: id
            },
            { contentMutation: true }
        );
        return { kind: 'preset', id, name: parsed.name || fileName };
    }

    const charxNorm = normalizeCharxOrModuleObject(rawJson, null, 'pasted_module.charx');
    if (!charxNorm) {
        throw new Error('Could not detect a valid RisuAI preset, .charx/.risum module, or SillyTavern preset.');
    }
    const modId = makeUniqueStoreId('charx');
    commitStore(
        {
            ...store,
            modules: [{ id: modId, fileName: (charxNorm.name || 'pasted_module') + '.charx', data: charxNorm }, ...store.modules],
            activeModuleId: modId,
            charxEnabled: true
        },
        { contentMutation: true }
    );
    return { kind: 'charx', id: modId, name: charxNorm.name || 'pasted_module' };
}

export function setActivePresetId(id) {
    commitStore({ ...store, activeId: id }, { contentMutation: true });
}

export function deleteActivePreset() {
    const rec = getActivePresetRecord(store);
    if (!rec) return;
    const nextPresets = store.presets.filter(p => p.id !== rec.id);
    commitStore(
        {
            ...store,
            presets: nextPresets,
            activeId: nextPresets[0] ? nextPresets[0].id : null
        },
        { contentMutation: true }
    );
}

export function setActiveModuleId(id) {
    commitStore({ ...store, activeModuleId: id }, { contentMutation: true });
}

export function toggleCharxEnabled() {
    const nextVal = store.charxEnabled === false;
    if (!hasHydratedAsync) preHydrationOverrides.charxEnabled = nextVal;
    commitStore({ ...store, charxEnabled: nextVal });
}

export function deleteActiveModule() {
    const modRec = getActiveModuleRecord(store);
    if (!modRec) return;
    const nextModules = store.modules.filter(m => m.id !== modRec.id);
    commitStore(
        {
            ...store,
            modules: nextModules,
            activeModuleId: nextModules[0] ? nextModules[0].id : null
        },
        { contentMutation: true }
    );
}

export function setPresetHookEnabled(enabled) {
    const nextVal = Boolean(enabled);
    if (Boolean(store.sdkHookEnabled) === nextVal) return;
    if (!hasHydratedAsync) preHydrationOverrides.sdkHookEnabled = nextVal;
    commitStore({ ...store, sdkHookEnabled: nextVal });
}

export function setInjectionScope(scope) {
    const nextScope = scope === 'chat_and_chargen' ? 'chat_and_chargen' : 'chat_only';
    if (!hasHydratedAsync) preHydrationOverrides.injectionScope = nextScope;
    commitStore({ ...store, injectionScope: nextScope });
}

export function setInjectionPosition(pos) {
    const nextPos = pos === 'prepend' ? 'prepend' : pos === 'tail' ? 'tail' : 'append';
    if (!hasHydratedAsync) preHydrationOverrides.injectionPosition = nextPos;
    commitStore({ ...store, injectionPosition: nextPos });
}

function updateActivePresetData(mutator) {
    const rec = getActivePresetRecord(store);
    if (!rec) return;
    const nextData = { ...unwrapPresetObject(rec.data) };
    mutator(nextData);
    const nextPresets = store.presets.map(p => (p.id === rec.id ? { ...p, data: nextData } : p));
    commitStore({ ...store, presets: nextPresets }, { contentMutation: true });
}

function updateActiveModuleData(mutator) {
    const modRec = getActiveModuleRecord(store);
    if (!modRec || !modRec.data) return;
    const nextData = { ...modRec.data };
    mutator(nextData);
    const nextModules = store.modules.map(m => (m.id === modRec.id ? { ...m, data: nextData } : m));
    commitStore({ ...store, modules: nextModules }, { contentMutation: true });
}

export function setRisuToggleValue(sourcePrefix, key, value) {
    if (sourcePrefix === 'charx') {
        updateActiveModuleData(d => {
            d.__laylaToggleValues = { ...(d.__laylaToggleValues || {}), [key]: value };
        });
    } else {
        updateActivePresetData(d => {
            d.__laylaToggleValues = { ...(d.__laylaToggleValues || {}), [key]: value };
        });
    }
}

export function toggleSelectMultiMode(sourcePrefix, key) {
    const presetRec = getActivePresetRecord(store);
    const modRec = store.charxEnabled !== false ? getActiveModuleRecord(store) : null;
    const vm = parsePresetViewModel(presetRec, modRec);
    const toggleList = sourcePrefix === 'charx' && vm.charxVm ? vm.charxVm.toggles : vm.risuToggles;
    const tf = (toggleList || []).find(t => t.key === key);
    const multiKey = sourcePrefix === 'charx' ? 'charx:' + key : key;
    const curMulti = isToggleMultiSelectEnabled(tf, store.multiSelectToggles, sourcePrefix);
    const nextMulti = !curMulti;

    const nextMultiMap = { ...(store.multiSelectToggles || {}), [multiKey]: nextMulti };
    store = { ...store, multiSelectToggles: nextMultiMap };

    if (!nextMulti && tf) {
        const indices = parseMultiSelectIndices(tf.value, (tf.options || []).length);
        setRisuToggleValue(sourcePrefix, key, indices[0] || '0');
    } else {
        commitStore({ ...store, multiSelectToggles: nextMultiMap }, { contentMutation: true });
    }
}

/**
 * Handles selecting an option inside the dropdown / multi-select popup or inline chips.
 * Automatically activates multi-select when user taps a '+...' additive option.
 * Returns { closedPopup: boolean }.
 */
export function selectToggleOptionIndex(sourcePrefix, key, clickedIdxRaw, forceMulti = false) {
    const presetRec = getActivePresetRecord(store);
    const modRec = store.charxEnabled !== false ? getActiveModuleRecord(store) : null;
    const vm = parsePresetViewModel(presetRec, modRec);
    const toggleList = sourcePrefix === 'charx' && vm.charxVm ? vm.charxVm.toggles : vm.risuToggles;
    const tf = (toggleList || []).find(t => t.key === key);
    if (!tf) return { closedPopup: true };

    const opts = tf.options || [];
    const clickedIdx = String(clickedIdxRaw);
    const clickedLabel = opts[Number(clickedIdx)] || '';
    const clickedIsPlus = clickedLabel.indexOf('+') === 0 || clickedLabel.indexOf('＋') === 0;
    const multiKey = sourcePrefix === 'charx' ? 'charx:' + key : key;
    let isMulti = forceMulti || isToggleMultiSelectEnabled(tf, store.multiSelectToggles, sourcePrefix);

    if (clickedIsPlus && !isMulti) {
        store = {
            ...store,
            multiSelectToggles: { ...(store.multiSelectToggles || {}), [multiKey]: true }
        };
        isMulti = true;
    }

    if (!isMulti) {
        setRisuToggleValue(sourcePrefix, key, clickedIdx);
        return { closedPopup: true };
    }

    const nextVal = toggleMultiSelectIndex(tf.value, clickedIdx, opts);
    setRisuToggleValue(sourcePrefix, key, nextVal);
    return { closedPopup: false };
}

export function setGroupDisplayMode(groupId, mode) {
    commitStore(
        {
            ...store,
            groupModes: { ...(store.groupModes || {}), [groupId]: mode }
        },
        { contentMutation: true }
    );
}

export function setPromptBlocksEnabledMap(enabledMap) {
    updateActivePresetData(obj => {
        const fmt = detectPresetFormat(obj);
        if (fmt === 'risuai') {
            const disabled = { ...(obj.__laylaDisabledTemplateIds || {}) };
            Object.keys(enabledMap).forEach(id => {
                if (enabledMap[id]) delete disabled[id];
                else disabled[id] = true;
            });
            obj.__laylaDisabledTemplateIds = disabled;
        } else {
            if (Array.isArray(obj.prompts)) {
                obj.prompts = obj.prompts.map(p =>
                    p && enabledMap[p.identifier] !== undefined ? { ...p, enabled: enabledMap[p.identifier] } : p
                );
            }
            if (Array.isArray(obj.prompt_order)) {
                let idx = obj.prompt_order.findIndex(b => b && b.character_id === 100001);
                if (idx === -1 && obj.prompt_order.length) idx = obj.prompt_order.length - 1;
                if (idx >= 0 && Array.isArray(obj.prompt_order[idx].order)) {
                    obj.prompt_order = obj.prompt_order.map((blk, bIdx) => {
                        if (bIdx !== idx) return blk;
                        return {
                            ...blk,
                            order: blk.order.map(o =>
                                enabledMap[o.identifier] !== undefined ? { ...o, enabled: enabledMap[o.identifier] } : o
                            )
                        };
                    });
                }
            }
        }
    });
}

export function updatePromptBlockContent(id, updates) {
    if (!id || !updates) return;
    updateActivePresetData(obj => {
        const fmt = detectPresetFormat(obj);
        if (fmt === 'risuai') {
            if (id.indexOf('risu_tpl_') === 0 && Array.isArray(obj.promptTemplate)) {
                const idx = Number(id.replace('risu_tpl_', ''));
                obj.promptTemplate = obj.promptTemplate.map((blk, i) => {
                    if (i !== idx || !blk || typeof blk !== 'object') return blk;
                    const nextBlk = { ...blk };
                    if (updates.name !== undefined) nextBlk.name = updates.name;
                    if (updates.role !== undefined) nextBlk.role = updates.role === 'assistant' ? 'bot' : updates.role;
                    if (updates.content !== undefined) {
                        nextBlk.text = updates.content;
                        if (nextBlk.type2 === 'main' && typeof obj.mainPrompt === 'string') obj.mainPrompt = updates.content;
                        if (nextBlk.type === 'jailbreak' && typeof obj.jailbreak === 'string') obj.jailbreak = updates.content;
                        if (nextBlk.type2 === 'globalNote' && typeof obj.globalNote === 'string') obj.globalNote = updates.content;
                    }
                    return nextBlk;
                });
            } else if (id === 'mainPrompt' || id === 'jailbreak' || id === 'globalNote') {
                if (updates.content !== undefined) obj[id] = updates.content;
            }
        } else if (fmt === 'sillytavern' && Array.isArray(obj.prompts)) {
            obj.prompts = obj.prompts.map(p => {
                if (!p || p.identifier !== id) return p;
                return {
                    ...p,
                    name: updates.name !== undefined ? updates.name : p.name,
                    role: updates.role !== undefined ? updates.role : p.role,
                    content: updates.content !== undefined ? updates.content : p.content
                };
            });
        }
    });
}

export function setCharxItemState(kind, id, active) {
    if (!id) return;
    updateActiveModuleData(d => {
        if (kind === 'prompt') {
            const nextMap = { ...(d.__laylaDisabledPromptIds || {}) };
            if (active) delete nextMap[id];
            else nextMap[id] = true;
            d.__laylaDisabledPromptIds = nextMap;
        } else if (kind === 'lore') {
            const nextMap = { ...(d.__laylaDisabledLoreIds || {}) };
            if (active) delete nextMap[id];
            else nextMap[id] = true;
            d.__laylaDisabledLoreIds = nextMap;
        } else if (kind === 'regex') {
            const nextMap = { ...(d.__laylaDisabledRegexIds || {}) };
            if (active) delete nextMap[id];
            else nextMap[id] = true;
            d.__laylaDisabledRegexIds = nextMap;
        } else if (kind === 'lore-always') {
            const nextMap = { ...(d.__laylaForceAlwaysLoreIds || {}) };
            if (active) nextMap[id] = true;
            else delete nextMap[id];
            d.__laylaForceAlwaysLoreIds = nextMap;
        }
    });
}

export function setPresetSamplingParam(key, value) {
    updateActivePresetData(obj => {
        if (value === undefined || value === null || value === '' || !Number.isFinite(Number(value))) {
            delete obj[key];
            if (key === 'temperature') delete obj.__laylaTempFloat;
            return;
        }
        const num = Number(value);
        if (key === 'temperature') {
            const fmt = detectPresetFormat(obj);
            const stored = denormalizePresetTemperature(num, fmt);
            if (stored === undefined) {
                delete obj.temperature;
            } else {
                obj.temperature = stored;
                delete obj.__laylaTempFloat;
            }
        } else {
            obj[key] = num;
        }
    });
}

/* ---------------- SDK Governor Middleware Adapter ---------------- */

export function createPresetEngineMiddleware() {
    ensurePresetStoreHydrated().catch(() => {});
    return {
        beforeRequest(req) {
            const res = applyPresetToCompletionRequest(req, store);
            if (res.skipped) {
                hookStats.skippedSideChannelCount++;
                notifyListeners();
            } else if (res.injected) {
                hookStats.interceptedCount++;
                hookStats.lastHookedAt =
                    new Date().toLocaleTimeString() + (res.isCharGen ? ' [CHAR_GEN]' : ' [CHAT]');
                notifyListeners();
            }
            return res;
        },
        transformOutput(text, ctx) {
            if (!text || typeof text !== 'string') return text;
            if (!ctx || !ctx.injected || !ctx.charxVm) return text;
            if (!Array.isArray(ctx.charxVm.activeRegexList) || ctx.charxVm.activeRegexList.length === 0) {
                return text;
            }
            return applyCharxRegexToText(
                text,
                ctx.charxVm.activeRegexList,
                ctx.charxVm.unifiedToggleValues,
                'output'
            );
        }
    };
}
