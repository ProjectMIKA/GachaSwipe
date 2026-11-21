/**
 * ✨ PROJECT M.I.K.A. CHAT ENGINE & MEMORY BRIDGE ✨
 * Central abstraction bridge for chat streaming workers and hybrid memory scoring.
 * Crafted with love by M.I.K.A. for Master! 🐾
 */

import { MemoryRouter } from '../../utils/MemoryRouter.js';

export { MemoryRouter };

/**
 * Retrieves the top relevant memory for a given waifu / participant set.
 * Delegates directly to the centralized hybrid RAG MemoryRouter.
 * 
 * @param {string|string[]} waifuId
 * @param {string} lastUserMsg
 * @param {Array<string|Object>} contextMemories
 * @param {string[]} stopWords
 * @returns {Promise<string|null>}
 */
export async function getRelevantMemory(waifuId, lastUserMsg, contextMemories = [], stopWords = [], options = {}) {
    return await MemoryRouter.getRelevantMemory(waifuId, lastUserMsg, contextMemories, stopWords, options);
}

/**
 * Dual-persists a generated conversation memory to SQLite fallback and official engine.
 * 
 * @param {string} waifuId
 * @param {string} text
 * @param {string} sessionId
 * @param {string|null} [waifuName]
 * @param {Object} [options]
 * @returns {Promise<void>}
 */
export async function saveMemory(waifuId, text, sessionId, waifuName = null, options = {}) {
    return await MemoryRouter.saveMemory(waifuId, text, sessionId, waifuName, options);
}

export default {
    MemoryRouter,
    getRelevantMemory,
    saveMemory
};
