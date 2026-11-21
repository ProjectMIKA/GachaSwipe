// ✨ M.I.K.A. LAYLA CHAT HISTORY INTEROP ✨
// Bidirectional converters between GachaSwipe chat threads and the Layla network's
// chat-history JSON format — today: {"internal": [["user turn", "assistant turn"], ...]},
// plain strings, one pair per exchange.
//
// The import side is deliberately SCHEMA-SNIFFING, not schema-trusting: if a future Layla
// update renames "internal", nests the turn block deeper, or enriches turn shapes, the
// recursive scanner still finds the richest array-of-turns anywhere in the JSON tree and
// normalizes it. Pure module — no React, no DOM — unit-testable straight from node.

const TURN_TEXT_FIELDS = ['content', 'text', 'message', 'msg', 'response', 'reply', 'value'];
const ASSISTANT_ROLES = new Set(['assistant', 'ai', 'bot', 'model', 'layla', 'character', 'char']);
const USER_ROLES = new Set(['user', 'human', 'master', 'player', 'me']);

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const joinTexts = (parts) => parts.filter(t => typeof t === 'string' && t.length > 0).join('\n\n');

// Extract display text from one turn entry (bare string today; rich object allowed tomorrow).
const turnEntryToText = (entry) => {
    if (typeof entry === 'string') return entry;
    if (!isPlainObject(entry)) return '';
    for (let i = 0; i < TURN_TEXT_FIELDS.length; i++) {
        const v = entry[TURN_TEXT_FIELDS[i]];
        if (typeof v === 'string' && v.length > 0) return v;
    }
    return '';
};

const entryRole = (entry) => {
    if (!isPlainObject(entry) || typeof entry.role !== 'string') return null;
    return entry.role.toLowerCase();
};

// A turn-pair candidate: an array of strings/objects with substance (Layla today),
// or a text-bearing object (possible tomorrow).
const isTurnPairCandidate = (entry) => {
    if (Array.isArray(entry)) {
        return entry.length > 0 && entry.every(e => typeof e === 'string' || isPlainObject(e)) && entry.some(e => turnEntryToText(e).length > 0);
    }
    return isPlainObject(entry) && turnEntryToText(entry).length > 0;
};

// A flat role-tagged message list (a possible future Layla shape — and a graceful fallback
// for stray GachaSwipe message arrays): [{ role: 'user'|'assistant', content: '...' }, ...]
const isFlatMessageList = (node) => Array.isArray(node) && node.length > 0 && node.every(e =>
    isPlainObject(e) && typeof e.role === 'string' && turnEntryToText(e).length > 0);

const collectTurnBlocks = (node, depth, out) => {
    if (!node || typeof node !== 'object' || depth > 8) return;
    if (Array.isArray(node)) {
        if (isFlatMessageList(node)) { out.push({ type: 'flat', block: node }); return; }
        if (node.length > 0 && node.every(isTurnPairCandidate)) { out.push({ type: 'pairs', block: node }); return; }
        for (let i = 0; i < node.length; i++) collectTurnBlocks(node[i], depth + 1, out);
        return;
    }
    const keys = Object.keys(node);
    for (let i = 0; i < keys.length; i++) collectTurnBlocks(node[keys[i]], depth + 1, out);
};

// Normalize one pair-block entry into a [user, assistant] tuple.
const normalizePairEntry = (entry) => {
    if (isPlainObject(entry)) {
        const text = turnEntryToText(entry);
        const role = entryRole(entry);
        if (role && ASSISTANT_ROLES.has(role)) return ['', text];
        if (role && USER_ROLES.has(role)) return [text, ''];
        // No role tag: response/reply payloads read as assistant, everything else as user.
        const assistantish = (typeof entry.response === 'string' && entry.response.length > 0) || (typeof entry.reply === 'string' && entry.reply.length > 0);
        return assistantish ? ['', text] : [text, ''];
    }
    const slots = [[], []];
    const items = Array.isArray(entry) ? entry : [entry];
    for (let i = 0; i < items.length; i++) {
        const el = items[i];
        const role = entryRole(el);
        let slot;
        if (role && ASSISTANT_ROLES.has(role)) slot = 1;
        else if (role && USER_ROLES.has(role)) slot = 0;
        else slot = i % 2; // Layla contract: even index = user, odd = assistant
        slots[slot].push(turnEntryToText(el));
    }
    return [joinTexts(slots[0]), joinTexts(slots[1])];
};

// Shared accumulator: fold a role-tagged message stream into strict [user, assistant] pairs.
// Consecutive same-role texts merge with \n\n; orphan content folds into the previous pair.
const pairsFromRoleMessages = (list) => {
    const turns = [];
    let pendingUser = [];
    let pendingAssistant = [];
    const flushPair = () => {
        turns.push([joinTexts(pendingUser), joinTexts(pendingAssistant)]);
        pendingUser = [];
        pendingAssistant = [];
    };
    for (let i = 0; i < list.length; i++) {
        const role = list[i].role;
        const content = list[i].content;
        if (!content) continue;
        if (ASSISTANT_ROLES.has(role)) {
            pendingAssistant.push(content);
            if (pendingUser.length > 0) flushPair();
        } else if (USER_ROLES.has(role)) {
            if (pendingAssistant.length > 0 && pendingUser.length === 0 && turns.length > 0) {
                // Orphan assistant reply (proactive message) — fold into the previous pair.
                const last = turns[turns.length - 1];
                last[1] = joinTexts([last[1], joinTexts(pendingAssistant)]);
                pendingAssistant = [];
            }
            pendingUser.push(content);
            if (pendingAssistant.length > 0) flushPair();
        }
        // system/unknown roles are GachaSwipe UI chrome — no Layla slot, skipped.
    }
    if (pendingUser.length > 0 || pendingAssistant.length > 0) {
        if (turns.length > 0) {
            const last = turns[turns.length - 1];
            if (pendingUser.length > 0) last[0] = joinTexts([last[0], joinTexts(pendingUser)]);
            if (pendingAssistant.length > 0) last[1] = joinTexts([last[1], joinTexts(pendingAssistant)]);
        } else {
            flushPair();
        }
    }
    return turns;
};

// ✨ IMPORT SNIFFER: scan any parsed JSON for the richest chat-turn structure it contains. ✨
// Survives: key renames ("internal" → anything), deeper nesting, sibling metadata fields,
// string pairs, role-tagged objects, and flat role-tagged message lists.
export function laylaJsonToThreadData(json) {
    const candidates = [];
    collectTurnBlocks(json, 0, candidates);
    const scored = [];
    for (let i = 0; i < candidates.length; i++) {
        const { type, block } = candidates[i];
        let textLen = 0;
        for (let j = 0; j < block.length; j++) {
            const entry = block[j];
            if (Array.isArray(entry)) {
                for (let k = 0; k < entry.length; k++) textLen += turnEntryToText(entry[k]).length;
            } else {
                textLen += turnEntryToText(entry).length;
            }
        }
        if (textLen > 0) scored.push({ type, block, textLen, units: block.length });
    }
    if (scored.length === 0) return null;
    scored.sort((a, b) => (b.units - a.units) || (b.textLen - a.textLen));
    const best = scored[0];
    const rawTurns = best.type === 'flat'
        ? pairsFromRoleMessages(best.block.map(e => ({ role: (e.role || '').toLowerCase(), content: turnEntryToText(e) })))
        : best.block.map(normalizePairEntry);
    const turns = rawTurns.filter(t => (t[0] && t[0].length > 0) || (t[1] && t[1].length > 0));
    return turns.length > 0 ? { turns, pairCount: turns.length } : null;
}

// ✨ EXPORT: GachaSwipe messages → Layla [user, assistant] tuples (null when nothing to say). ✨
export function threadMessagesToLaylaTurns(messages) {
    if (!Array.isArray(messages)) return null;
    const list = [];
    for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        if (!m || typeof m !== 'object') continue;
        list.push({
            role: typeof m.role === 'string' ? m.role.toLowerCase() : '',
            content: typeof m.content === 'string' ? m.content : ''
        });
    }
    const turns = pairsFromRoleMessages(list);
    return turns.length > 0 ? turns : null;
}

// ✨ IMPORT: Layla tuples → GachaSwipe message objects (evenly back-dated, order-stable). ✨
export function laylaTurnsToMessages(turns, baseTimestamp = Date.now()) {
    if (!Array.isArray(turns)) return [];
    const messages = [];
    let ts = baseTimestamp - turns.length * 2 * 60000;
    for (let i = 0; i < turns.length; i++) {
        const u = turns[i][0];
        const a = turns[i][1];
        if (u) messages.push({ id: `layla_${baseTimestamp}_${i}_u`, role: 'user', content: u, timestamp: ts });
        ts += 60000;
        if (a) messages.push({ id: `layla_${baseTimestamp}_${i}_a`, role: 'assistant', content: a, timestamp: ts });
        ts += 60000;
    }
    return messages;
}

// ✨ Layla filename convention: {Name}_@ch_{uuid}_history.json ✨
const randomUuid = () => {
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    } catch (e) { /* fall through to the hand-rolled generator */ }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : ((r & 0x3) | 0x8);
        return v.toString(16);
    });
};

export function buildLaylaHistoryFilename(characterName) {
    const safeName = (characterName || 'Character').trim().replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_').replace(/^_+|_+$/g, '') || 'Character';
    return `${safeName}_@ch_${randomUuid()}_history.json`;
}

