/**
 * ✨ PROJECT M.I.K.A. HYBRID RAG LONG-TERM MEMORY ROUTER ✨
 * Centralized, telemetry-enabled memory routing and keyword-weighted RAG engine.
 * Seamlessly merges native Layla host memories with local SQLite fallback storage.
 * Crafted with love by M.I.K.A. for Master! 🐾
 */

class MemoryRouterService {
    constructor() {
        this.layla = null;
        this.isOfficialActive = false;
        this.initialized = false;
        this.initPromise = null;
        // ✨ MIKA'S RECENT INJECTION TIMEOUT TRACKER: targetKey -> Map<normalizedKey, timestamp>
        this.recentInjections = new Map();
        this.defaultCooldownMs = 10 * 60 * 1000; // 10 minutes timeout
    }

    /**
     * Extracts normalized comparison key from a memory string.
     * Strips punctuation, whitespace, and bracket metadata to compare semantic essence.
     * @param {string} text
     * @returns {string}
     */
    normalizeMemoryText(text) {
        if (!text || typeof text !== 'string') return '';
        const monologueMatch = text.match(/»([\s\S]*?)«/);
        const core = monologueMatch ? monologueMatch[1] : text.replace(/\([^)]*\)/g, '');
        return core
            .toLowerCase()
            .replace(/<[^>]+>/g, ' ')
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Checks if a memory was injected recently within the timeout window.
     * @param {string} targetKey
     * @param {string} memoryText
     * @param {number} [cooldownMs]
     * @returns {boolean}
     */
    isTimedOut(targetKey, memoryText, cooldownMs = this.defaultCooldownMs) {
        if (!targetKey || !memoryText) return false;
        const targetMap = this.recentInjections.get(targetKey);
        if (!targetMap) return false;
        const normKey = this.normalizeMemoryText(memoryText);
        if (!normKey) return false;

        const lastInjected = targetMap.get(normKey);
        if (!lastInjected) return false;

        const elapsed = Date.now() - lastInjected;
        if (elapsed < cooldownMs) {
            return true;
        }
        targetMap.delete(normKey);
        return false;
    }

    /**
     * Records a successful memory injection to lock it under cooldown timeout.
     * @param {string} targetKey
     * @param {string} memoryText
     */
    recordInjection(targetKey, memoryText) {
        if (!targetKey || !memoryText) return;
        if (!this.recentInjections.has(targetKey)) {
            this.recentInjections.set(targetKey, new Map());
        }
        const targetMap = this.recentInjections.get(targetKey);
        const normKey = this.normalizeMemoryText(memoryText);
        if (normKey) {
            targetMap.set(normKey, Date.now());
        }
    }

    /**
     * Telemetry Boot Probe to determine host memory capabilities.
     * Runs once on app mount / client bootstrap.
     * @param {Object} laylaInstance
     */
    async initialize(laylaInstance) {
        if (laylaInstance) {
            this.layla = laylaInstance;
        }

        if (this.initialized) {
            return this.isOfficialActive;
        }

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            try {
                if (!this.layla || !this.layla.memories || typeof this.layla.memories.list !== 'function') {
                    throw new Error("Native Layla memory service unavailable");
                }

                // Harmless API probe to verify if host memory engine is enabled and responding
                await this.layla.memories.list('system_probe', 0, 1);
                this.isOfficialActive = true;
                console.log("[M.I.K.A. LTM] Official Layla Memory Engine: ONLINE ✨");
            } catch (err) {
                this.isOfficialActive = false;
                console.log("[M.I.K.A. LTM] Official Engine Offline. Synthetic SQLite Fallback: ONLINE 🐾");
            } finally {
                this.initialized = true;
                this.initPromise = null;
            }
            return this.isOfficialActive;
        })();

        return this.initPromise;
    }

    /**
     * Dual-save memory into local SQLite fallback_ltm table and official Layla memories.
     * @param {string} waifuId
     * @param {string} text
     * @param {string} sessionId
     * @param {string|null} [waifuName]
     * @param {Object} [options]
     */
    async saveMemory(waifuId, text, sessionId, waifuName = null, options = {}) {
        if (!text || typeof text !== 'string') return;
        const cleanText = text.trim();
        if (!cleanText || cleanText.toUpperCase() === 'NONE') return;

        const timestamp = Date.now();
        const id = 'mem_' + timestamp;
        const targetLabel = waifuName || waifuId;

        // 1. ALWAYS insert into the local fallback_ltm table in layla.db
        if (this.layla?.db) {
            try {
                await this.layla.db.executeSql(
                    'INSERT OR REPLACE INTO fallback_ltm (id, waifuId, summary, timestamp) VALUES (?, ?, ?, ?)',
                    [id, waifuId, cleanText, timestamp]
                );
            } catch (dbErr) {
                console.error("[M.I.K.A. LTM] Fallback SQLite save failed:", dbErr);
            }
        }

        // 2. Try official layla.memories.createOrUpdate() API call
        if (this.isOfficialActive && this.layla?.memories) {
            try {
                await this.layla.memories.createOrUpdate([{
                    id: 0,
                    character_id: waifuId,
                    session_id: sessionId,
                    rawText: cleanText,
                    summary: cleanText,
                    timestamp: timestamp,
                    knowledgeGraphJSON: null
                }]);
            } catch (apiErr) {
                // Official engine failed; local SQLite safely holds the record
                console.warn("[M.I.K.A. LTM] Official memory API save failed (safely stored in fallback SQLite):", apiErr);
            }
        }

        if (!options.silent) {
            console.log(`[M.I.K.A. LTM] Memory Saved for ${targetLabel}:`, cleanText);
        }
    }

    /**
     * Hybrid memory retrieval and keyword-weighted RAG scoring.
     * Merges official host memories and fallback SQLite records, scores them by keyword overlap,
     * checks cooldown against active context memories and timeout cache, and returns top-1 memory string or null.
     * 
     * @param {string|string[]} waifuId - Single waifu ID or array of participant IDs for group chats
     * @param {string} lastUserMsg - The user's prompt text to extract keywords from
     * @param {Array<string|Object>} currentContextMemories - Memories already present in current chat window
     * @param {string[]} stopWordsArray - Array of common/participant stopwords to exclude
     * @param {Object} [options] - Optional custom timeoutMs or threshold settings
     * @returns {Promise<string|null>}
     */
    async getRelevantMemory(waifuId, lastUserMsg = '', currentContextMemories = [], stopWordsArray = [], options = {}) {
        const waifuIds = Array.isArray(waifuId) ? waifuId : [waifuId].filter(Boolean);
        if (waifuIds.length === 0) return null;

        const targetKey = [...waifuIds].sort().join('_');
        const cooldownMs = options.cooldownMs || this.defaultCooldownMs;

        // 1. Fetch official host memories (up to 30 recent per waifu)
        let officialMemories = [];
        if (this.isOfficialActive && this.layla?.memories) {
            try {
                const results = await Promise.all(
                    waifuIds.map(id =>
                        this.layla.memories.list(id, 0, 30).catch(() => [])
                    )
                );
                officialMemories = results.flat();
            } catch (e) {
                console.warn("[M.I.K.A. LTM] Official memory fetch warning:", e);
            }
        }

        // 2. Fetch all memories from local fallback_ltm table
        let fallbackMemories = [];
        if (this.layla?.db) {
            try {
                const placeholders = waifuIds.map(() => '?').join(',');
                const query = `SELECT id, waifuId, summary, timestamp FROM fallback_ltm WHERE waifuId IN (${placeholders})`;
                const res = await this.layla.db.executeSql(query, waifuIds);
                if (res?.rows && res.rows.length > 0) {
                    fallbackMemories = res.rows.map(row => ({
                        id: row.id,
                        character_id: row.waifuId,
                        summary: row.summary,
                        rawText: row.summary,
                        timestamp: row.timestamp
                    }));
                }
            } catch (dbErr) {
                console.error("[M.I.K.A. LTM] SQLite fallback memory query failed:", dbErr);
            }
        }

        // 3. Merge and deduplicate by memory summary / raw text
        const seenTexts = new Set();
        const mergedPool = [];

        for (const item of [...officialMemories, ...fallbackMemories]) {
            const text = (item.summary || item.rawText || '').trim();
            if (!text) continue;
            const normalizedText = text.toLowerCase();
            if (!seenTexts.has(normalizedText)) {
                seenTexts.add(normalizedText);
                mergedPool.push({
                    id: item.id,
                    character_id: item.character_id || item.waifuId,
                    summary: text,
                    rawText: text,
                    timestamp: item.timestamp || Date.now()
                });
            }
        }

        if (mergedPool.length === 0) return null;

        // 4. Keyword RAG Extraction & Scoring
        // Common conversational stopwords (including 3-4 letter grammatical glue) to filter out
        const defaultGrammarStopwords = [
            'the', 'and', 'for', 'you', 'are', 'was', 'with', 'that', 'this', 'have', 'from',
            'they', 'them', 'some', 'what', 'when', 'will', 'your', 'said', 'were', 'been',
            'then', 'than', 'into', 'just', 'more', 'also', 'here', 'back', 'much', 'like',
            'well', 'know', 'want', 'tell', 'make', 'good', 'look', 'time', 'only', 'come',
            'give', 'take', 'even', 'most', 'very', 'about', 'would', 'could', 'should',
            'their', 'there', 'where', 'which', 'these', 'those', 'really', 'always', 'never',
            'going', 'being', 'doing', 'having', 'think', 'thought'
        ];
        const lowerStopWords = new Set([
            ...defaultGrammarStopwords,
            ...(stopWordsArray || []).map(w => String(w).toLowerCase())
        ]);

        // Support words with length > 3 (e.g. date, cafe, park, game, kiss, food, cats, trip, song)
        const rawKeywords = (lastUserMsg || '')
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3 && !lowerStopWords.has(w));
        const uniqueKeywords = [...new Set(rawKeywords)];

        if (uniqueKeywords.length === 0) return null;

        // Context memories normalization to avoid cooldown spam
        const contextMemoriesNormalized = (currentContextMemories || [])
            .map(m => {
                if (typeof m === 'string') return this.normalizeMemoryText(m);
                return this.normalizeMemoryText(m?.summary || m?.rawText || '');
            })
            .filter(Boolean);

        // Score each memory by keyword overlap
        const isMemoryActiveInContext = (candidateNorm) => {
            if (!candidateNorm) return false;
            return contextMemoriesNormalized.some(cNorm => {
                if (cNorm === candidateNorm) return true;
                if (cNorm.length > 12 && candidateNorm.length > 12) {
                    return cNorm.includes(candidateNorm) || candidateNorm.includes(cNorm);
                }
                return false;
            });
        };

        // Score each memory by keyword overlap (Exact boundary matches get 3x weight)
        const scoredMemories = mergedPool.map(m => {
            const rawCandText = m.summary || m.rawText || '';
            const textToSearch = rawCandText.toLowerCase();
            let score = 0;

            uniqueKeywords.forEach(kw => {
                const regexWordBoundary = new RegExp(`\\b${kw}\\b`, 'i');
                if (regexWordBoundary.test(textToSearch)) {
                    score += 3; // High-weight exact word match!
                } else if (textToSearch.includes(kw)) {
                    score += 1; // Substring partial match
                }
            });

            // Recency boost (up to +0.5 for recent memories)
            if (m.timestamp) {
                const ageDays = (Date.now() - m.timestamp) / (1000 * 60 * 60 * 24);
                if (ageDays < 7) score += 0.5;
                else if (ageDays < 30) score += 0.25;
            }

            return { memory: m, score, rawText: rawCandText };
        });

        // Filter out 0-score memories, memories already in context, and memories in timeout cooldown
        const validCandidates = scoredMemories
            .filter(item => {
                if (item.score < 2) return false; // Minimum threshold
                const normCand = this.normalizeMemoryText(item.rawText);
                // 1. Is it currently in active context?
                if (isMemoryActiveInContext(normCand)) return false;
                // 2. Is it currently timed out from a recent injection?
                if (this.isTimedOut(targetKey, item.rawText, cooldownMs)) return false;
                return true;
            })
            .sort((a, b) => b.score - a.score);

        if (validCandidates.length > 0 && validCandidates[0].score > 0) {
            const chosen = validCandidates[0].memory.summary || validCandidates[0].memory.rawText;
            // Record injection timestamp for cooldown lock
            this.recordInjection(targetKey, chosen);
            return chosen;
        }

        return null;
    }

    /**
     * ✨ M.I.K.A. COLD-START SEED QUERY ✨
     * Fetches the last N most recent memories for a waifu or group of participants
     * to stably seed the conversation context for prefix caching.
     * @param {string|string[]} waifuId
     * @param {number} [limit=2]
     * @returns {Promise<string[]>}
     */
    async getRecentMemories(waifuId, limit = 2) {
        const waifuIds = Array.isArray(waifuId) ? waifuId : [waifuId].filter(Boolean);
        if (waifuIds.length === 0) return [];

        let officialMemories = [];
        if (this.isOfficialActive && this.layla?.memories) {
            try {
                const results = await Promise.all(
                    waifuIds.map(id => this.layla.memories.list(id, 0, limit).catch(() => []))
                );
                officialMemories = results.flat();
            } catch (e) {
                console.warn("[M.I.K.A. LTM] Official recent memory fetch warning:", e);
            }
        }

        let fallbackMemories = [];
        if (this.layla?.db) {
            try {
                const placeholders = waifuIds.map(() => '?').join(',');
                const query = `SELECT id, waifuId, summary, timestamp FROM fallback_ltm WHERE waifuId IN (${placeholders}) ORDER BY timestamp DESC LIMIT ?`;
                const res = await this.layla.db.executeSql(query, [...waifuIds, limit]);
                if (res?.rows && res.rows.length > 0) {
                    fallbackMemories = res.rows.map(row => ({
                        id: row.id,
                        character_id: row.waifuId,
                        summary: row.summary,
                        timestamp: row.timestamp
                    }));
                }
            } catch (dbErr) {
                console.error("[M.I.K.A. LTM] SQLite fallback recent memory query failed:", dbErr);
            }
        }

        const seenTexts = new Set();
        const merged = [];
        for (const item of [...officialMemories, ...fallbackMemories]) {
            const text = (item.summary || item.rawText || '').trim();
            if (!text || text.toUpperCase() === 'NONE') continue;
            const norm = text.toLowerCase();
            if (!seenTexts.has(norm)) {
                seenTexts.add(norm);
                merged.push({ text, timestamp: item.timestamp || 0 });
            }
        }
        merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        return merged.slice(0, limit).map(m => m.text);
    }
}

export const MemoryRouter = new MemoryRouterService();
export default MemoryRouter;
