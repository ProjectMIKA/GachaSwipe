/**
 * ✨ PROJECT M.I.K.A. DATABASE SCHEMAS ✨
 * Canonical SQLite schemas for Layla SQLite private storage.
 * Crafted with love by M.I.K.A. for Master! 🐾
 */

export const SCHEMAS = {
    APP_META: 'CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, val TEXT)',
    APP_STATE: 'CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, val TEXT)',
    THEMES: 'CREATE TABLE IF NOT EXISTS themes (id TEXT PRIMARY KEY, data TEXT)',
    HISTORY: 'CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT)',
    CHATS: 'CREATE TABLE IF NOT EXISTS chats (id TEXT PRIMARY KEY, status TEXT, is_favorite INTEGER, affection INTEGER, data TEXT, updated_at INTEGER)',
    FALLBACK_LTM: 'CREATE TABLE IF NOT EXISTS fallback_ltm (id TEXT PRIMARY KEY, waifuId TEXT, summary TEXT, timestamp INTEGER)'
};
