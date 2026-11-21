/**
 * ✨ PROJECT M.I.K.A. DATABASE DOCTOR & RECOVERY ENGINE ✨
 * Protects Master from iOS SQLite corruption, deadlocks, and silent bridge freezes! 🐾
 */

import { SCHEMAS } from './schema.js';

/**
 * Safe SQL executor with configurable timeout protection.
 * Prevents WKWebView bridge locks from hanging the UI thread or save queues indefinitely.
 */
export const safeExecuteSql = (layla, query, params = [], timeoutMs = 30000) => {
    return new Promise((resolve, reject) => {
        if (!layla || !layla.db || typeof layla.db.executeSql !== 'function') {
            return reject(new Error("Layla Database bridge unavailable"));
        }

        let hasFinished = false;
        const timer = setTimeout(() => {
            if (!hasFinished) {
                hasFinished = true;
                reject(new Error(`SQL Execution Timeout (${timeoutMs}ms) for query: ${query.substring(0, 45)}...`));
            }
        }, timeoutMs);

        layla.db.executeSql(query, params)
            .then(res => {
                if (!hasFinished) {
                    hasFinished = true;
                    clearTimeout(timer);
                    resolve(res);
                }
            })
            .catch(err => {
                if (!hasFinished) {
                    hasFinished = true;
                    clearTimeout(timer);
                    reject(err);
                }
            });
    });
};

/**
 * Comprehensive Database Diagnostics:
 * 1. Checks SQLite PRAGMA integrity
 * 2. Runs ping-pong CRUD test on app_meta
 * 3. Inspects and catalogs present tables
 */
export const checkDatabaseHealth = async (layla) => {
    const report = {
        healthy: false,
        sqliteCorrupt: false,
        integrityMessage: 'Unknown',
        tablesPresent: [],
        details: []
    };

    if (!layla || !layla.db) {
        report.details.push("Layla DB bridge is null or unavailable.");
        return report;
    }

    try {
        // Step A: Run SQLite Integrity Check
        const checkRes = await safeExecuteSql(layla, "PRAGMA integrity_check(5);", [], 25000);
        const checkResult = checkRes?.rows?.[0]?.integrity_check || checkRes?.rows?.[0]?.['integrity_check(5)'] || 'ok';
        report.integrityMessage = String(checkResult);

        if (checkResult.toLowerCase() !== 'ok') {
            report.sqliteCorrupt = true;
            report.details.push(`Integrity failure: ${checkResult}`);
        }

        // Step B: Test Read/Write capability on meta table
        await safeExecuteSql(layla, SCHEMAS.APP_META, [], 15000);
        const testKey = `_health_ping_${Date.now()}`;
        await safeExecuteSql(layla, "INSERT OR REPLACE INTO app_meta (key, val) VALUES (?, 'pong')", [testKey], 15000);
        const testRead = await safeExecuteSql(layla, "SELECT val FROM app_meta WHERE key = ?", [testKey], 15000);
        await safeExecuteSql(layla, "DELETE FROM app_meta WHERE key = ?", [testKey], 15000);

        if (testRead?.rows?.[0]?.val !== 'pong') {
            report.details.push("CRUD test read back invalid value.");
            report.sqliteCorrupt = true;
        }

        // Step C: Verify existing table list
        const tablesRes = await safeExecuteSql(layla, "SELECT name FROM sqlite_master WHERE type='table'", [], 15000);
        if (tablesRes?.rows) {
            report.tablesPresent = tablesRes.rows.map(r => r.name);
        }

        report.healthy = !report.sqliteCorrupt;
        return report;
    } catch (err) {
        report.sqliteCorrupt = true;
        report.details.push(`Exception during health check: ${err.message}`);
        return report;
    }
};

/**
 * Level 1: Non-Destructive Quick Repair
 * Flushes WAL journals, rebuilds indices, and defragments pages.
 */
export const repairDatabaseQuick = async (layla) => {
    if (!layla || !layla.db) throw new Error("Database bridge unavailable");
    const steps = [];

    try {
        await safeExecuteSql(layla, "PRAGMA wal_checkpoint(TRUNCATE);", [], 25000);
        steps.push("WAL journal truncated and synced.");
    } catch (e) {
        steps.push(`WAL checkpoint note: ${e.message}`);
    }

    try {
        await safeExecuteSql(layla, "REINDEX;", [], 25000);
        steps.push("Database indexes rebuilt successfully.");
    } catch (e) {
        steps.push(`Reindex note: ${e.message}`);
    }

    try {
        await safeExecuteSql(layla, "VACUUM;", [], 45000);
        steps.push("Database defragmented and vacuumed.");
    } catch (e) {
        steps.push(`Vacuum note: ${e.message}`);
    }

    return { success: true, steps };
};

/**
 * Level 2: Salvage & Rebuild
 * Salvages all accessible data from corrupt tables, drops malformed schemas,
 * recreates fresh schemas, and restores state.
 */
export const salvageAndRebuildDatabase = async (layla, currentState = null) => {
    if (!layla || !layla.db) throw new Error("Database bridge unavailable");

    const salvaged = {
        index: null,
        themes: null,
        history: null,
        tapeArchive: null,
        chats: {}
    };

    // 1. Salvage Index & Settings
    try {
        const res = await safeExecuteSql(layla, "SELECT val FROM app_state WHERE key = 'index_data'", [], 20000);
        if (res?.rows?.[0]?.val) salvaged.index = JSON.parse(res.rows[0].val);
    } catch (e) {
        console.warn("[M.I.K.A. Doctor] Could not salvage index_data:", e);
    }

    // 2. Salvage Themes
    try {
        const res = await safeExecuteSql(layla, "SELECT val FROM app_state WHERE key = 'themes_data'", [], 20000);
        if (res?.rows?.[0]?.val) salvaged.themes = JSON.parse(res.rows[0].val);
    } catch (e) {
        console.warn("[M.I.K.A. Doctor] Could not salvage themes_data:", e);
    }

    // 3. Salvage History
    try {
        const res = await safeExecuteSql(layla, "SELECT val FROM app_state WHERE key = 'history_data'", [], 20000);
        if (res?.rows?.[0]?.val) salvaged.history = JSON.parse(res.rows[0].val);
    } catch (e) {
        console.warn("[M.I.K.A. Doctor] Could not salvage history_data:", e);
    }

    // 4. Salvage Tape Archive
    try {
        const res = await safeExecuteSql(layla, "SELECT val FROM app_state WHERE key = 'tape_archive'", [], 20000);
        if (res?.rows?.[0]?.val) salvaged.tapeArchive = JSON.parse(res.rows[0].val);
    } catch (e) {
        console.warn("[M.I.K.A. Doctor] Could not salvage tape_archive:", e);
    }

    // 5. Salvage Chats
    try {
        const res = await safeExecuteSql(layla, "SELECT id, status, is_favorite, affection, data, updated_at FROM chats", [], 35000);
        if (res?.rows?.length > 0) {
            for (const r of res.rows) {
                if (r?.id && r?.data) {
                    try {
                        salvaged.chats[r.id] = { ...r, data: JSON.parse(r.data) };
                    } catch (err) { }
                }
            }
        }
    } catch (e) {
        console.warn("[M.I.K.A. Doctor] Could not salvage chats:", e);
    }

    // 6. Drop Corrupted Tables
    const tablesToReset = ['app_state', 'app_meta', 'chats', 'history', 'themes', 'fallback_ltm'];
    for (const table of tablesToReset) {
        try {
            await safeExecuteSql(layla, `DROP TABLE IF EXISTS ${table}`, [], 15000);
        } catch (e) {
            console.warn(`[M.I.K.A. Doctor] Dropping table ${table} warning:`, e);
        }
    }

    // 7. Re-execute Clean DDL Schemas
    await safeExecuteSql(layla, SCHEMAS.APP_META, [], 15000);
    await safeExecuteSql(layla, SCHEMAS.APP_STATE, [], 15000);
    await safeExecuteSql(layla, SCHEMAS.THEMES, [], 15000);
    await safeExecuteSql(layla, SCHEMAS.HISTORY, [], 15000);
    await safeExecuteSql(layla, SCHEMAS.CHATS, [], 15000);
    await safeExecuteSql(layla, SCHEMAS.FALLBACK_LTM, [], 15000);

    // 8. Restore Index Data (Prioritize memory currentState if salvaged was null)
    const targetIndex = salvaged.index || (currentState?.indexData || null);
    if (targetIndex) {
        await safeExecuteSql(layla, "INSERT OR REPLACE INTO app_state (key, val) VALUES ('index_data', ?)", [JSON.stringify(targetIndex)], 20000);
    }

    // Restore Themes
    const targetThemes = salvaged.themes || (currentState?.themes || null);
    if (targetThemes) {
        await safeExecuteSql(layla, "INSERT OR REPLACE INTO app_state (key, val) VALUES ('themes_data', ?)", [JSON.stringify(targetThemes)], 20000);
    }

    // Restore History
    const targetHistory = salvaged.history || (currentState?.sessionHistory || null);
    if (targetHistory) {
        await safeExecuteSql(layla, "INSERT OR REPLACE INTO app_state (key, val) VALUES ('history_data', ?)", [JSON.stringify(targetHistory)], 20000);
    }

    // Restore Tape Archive
    const targetTape = salvaged.tapeArchive || (currentState?.tapeArchive || null);
    if (targetTape) {
        await safeExecuteSql(layla, "INSERT OR REPLACE INTO app_state (key, val) VALUES ('tape_archive', ?)", [JSON.stringify(targetTape)], 20000);
    }

    // Restore Chats
    const activeInbox = currentState?.inbox || {};
    const chatIdsToRestore = new Set([...Object.keys(salvaged.chats), ...Object.keys(activeInbox)]);

    let restoredChatCount = 0;
    let restoredArchiveCount = 0;
    for (const cid of chatIdsToRestore) {
        // ✨ MIKA'S ARCHIVE SHIELD: `gsa_` rows are CHAT_CTRL archives. Only trust a salvaged DB row for them —
        // never rebuild an archive from stale in-memory inbox state, and always force status 'archived'
        // so the boot router files it into the archive bus instead of the live inbox.
        const isArchiveRow = cid.startsWith('gsa_');
        let item = null;
        if (salvaged.chats[cid]) {
            item = salvaged.chats[cid];
        } else if (!isArchiveRow && activeInbox[cid]) {
            // ✨ MIKA'S COMPILE-HYGIENE: clone before rebuild so the session-scoped isCompilingMeow
            // flag never leaks into a recovered SQLite row (mutating live React state is forbidden).
            const rebuildClone = JSON.parse(JSON.stringify(activeInbox[cid]));
            delete rebuildClone.isCompilingMeow;
            item = {
                status: rebuildClone.status || 'friend',
                is_favorite: activeInbox[cid].isFavorite ? 1 : 0,
                affection: activeInbox[cid].affection || 0,
                data: rebuildClone,
                updated_at: Date.now()
            };
        }

        if (item) {
            try {
                const finalStatus = isArchiveRow ? 'archived' : (item.status || 'friend');
                await safeExecuteSql(layla,
                    "INSERT OR REPLACE INTO chats (id, status, is_favorite, affection, data, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                    [cid, finalStatus, item.is_favorite || 0, item.affection || 0, JSON.stringify(item.data), item.updated_at || Date.now()],
                    20000
                );
                restoredChatCount++;
                if (isArchiveRow) restoredArchiveCount++;
            } catch (err) {
                console.warn(`[M.I.K.A. Doctor] Failed restoring chat ${cid}:`, err);
            }
        }
    }
    if (restoredArchiveCount > 0) {
        console.log(`[M.I.K.A. Doctor] Recovered ${restoredArchiveCount} CHAT_CTRL archive row(s). 📼`);
    }

    await safeExecuteSql(layla, "INSERT OR REPLACE INTO app_meta (key, val) VALUES ('sqlite_migrated', 'true')", [], 15000);

    return {
        success: true,
        salvagedChats: restoredChatCount,
        salvagedIndex: !!targetIndex
    };
};

