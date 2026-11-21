import { useState, useCallback, useEffect, useRef } from 'react';
import { askOutOfBand, OOB_ASKS, OOB_VALIDATORS, isOobSupported } from '../../utils/oobChannel.js';

/**
 * Custom hook for Lucid Dive scenario generation and dynamic storyboard synthesis.
 * Features per-character and per-alignment seed caching so switching chats or alignments
 * always retrieves that specific character's seeds without mixing characters up or loop-regenerating.
 * Handcrafted by M.I.K.A. for Master! 🐾💜
 */

const CACHE_STORAGE_KEY = 'gachaswipe_dream_seeds_cache_v2'; // v2: invalidates caches poisoned by old fallback seeds

const loadSeedCache = () => {
    try {
        const raw = localStorage.getItem(CACHE_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

const saveSeedCache = (cache) => {
    try {
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.warn("[LucidDive] Could not save seed cache:", e);
    }
};

export function useDreamSynthesis({
    layla,
    activeWaifu,
    activeChat = null,
    preferences = {},
    dreamAlignment = 'Ally',
    enabled = true,
    showToast = () => { },
    showAlert = () => { }
}) {
    const [seeds, setSeeds] = useState([]);
    const [selectedSeed, setSelectedSeed] = useState('');
    const [seedInfluence, setSeedInfluence] = useState('');
    const [diveMode, setDiveMode] = useState('kinetic'); // Pure Visual Novel mode
    const [roleAlignment, setRoleAlignment] = useState('antagonist');
    const [userRole, setUserRole] = useState('');
    const [storyboard, setStoryboard] = useState(null);

    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
    const [isExtractingLoot, setIsExtractingLoot] = useState(false);

    const activeCharKey = activeWaifu?.id || activeWaifu?.name || 'companion';
    const activeWaifuRef = useRef(activeCharKey);
    activeWaifuRef.current = activeCharKey;
    const seedInfluenceRef = useRef(seedInfluence);
    seedInfluenceRef.current = seedInfluence;
    const isSynthesizingRef = useRef(false);
    const loadedKeyRef = useRef('');

    // Comprehensive seed cleaner to strip stray <seed>, </seed>, <scenario>, etc.
    const cleanSeedText = useCallback((raw) => {
        if (!raw || typeof raw !== 'string') return '';
        return raw
            .replace(/<[^>]+>/g, '') // Scrub all XML tags completely
            .replace(/[*_`]/g, '')
            .replace(/^(?:(?:option\s*\d+|scenario\s*\d+|\d+)\s*[:.)\-]\s*|[\s\d\-*.•)\]>"'])+/i, '')
            .replace(/[\s"']+$/g, '')
            .trim();
    }, []);

    // Normalizer to convert legacy string cache or structured object to standard seed shape
    const normalizeSeed = useCallback((item, idx) => {
        const defaultTitles = ['ALGORITHM VECTOR', 'SHARED MEMORY', 'PERSONA BLUEPRINT'];
        const defaultCategories = ['algorithm', 'memory', 'persona'];
        if (typeof item === 'object' && item !== null && (item.scenario || item.text)) {
            return {
                title: item.title ? cleanSeedText(item.title) : defaultTitles[idx] || `DREAM SEED #${idx + 1}`,
                source: item.source ? cleanSeedText(item.source) : '',
                scenario: cleanSeedText(item.scenario || item.text),
                type: item.type || defaultCategories[idx] || 'general'
            };
        }
        return {
            title: defaultTitles[idx] || `DREAM SEED #${idx + 1}`,
            source: '',
            scenario: cleanSeedText(typeof item === 'string' ? item : ''),
            type: defaultCategories[idx] || 'general'
        };
    }, [cleanSeedText]);

    /**
     * Synthesizes 3 dream seeds with per-character and per-alignment caching.
     * Seed 1: Top 10 algorithm traits (1-2 traits).
     * Seed 2: 2 recent character memories (or recent chat context).
     * Seed 3: Character profile / traits / quirks.
     * Seed Influence: Applies theme to all 3 seeds.
     */
    const synthesizeDreamSeeds = useCallback(async (alignmentOverride, forceReroll = false, influenceOverride = null) => {
        if (!activeWaifu) {
            if (showAlert) showAlert("No Subject", "Select a character to synthesize a Lucid Dive.");
            return;
        }

        const charId = activeWaifu.id || activeWaifu.name || 'companion';
        const activeAlignment = alignmentOverride || dreamAlignment || 'Ally';
        const alignKey = String(activeAlignment).toLowerCase().includes('antag') ? 'Antagonist' : 'Ally';
        const activeInfluence = (influenceOverride !== null && influenceOverride !== undefined ? influenceOverride : seedInfluenceRef.current)?.trim() || '';

        // Dynamic cache key: if activeInfluence exists, separate cache per influence
        const cacheSubKey = activeInfluence
            ? `${alignKey}__infl_${activeInfluence.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)}`
            : alignKey;

        // 1. Check cache first if not explicitly rerolling!
        if (!forceReroll) {
            const cache = loadSeedCache();
            const cachedList = cache[charId]?.[cacheSubKey];
            if (Array.isArray(cachedList) && cachedList.length > 0) {
                const normalizedCached = cachedList.map((s, idx) => normalizeSeed(s, idx)).filter(s => s.scenario);
                if (normalizedCached.length > 0) {
                    setSeeds(normalizedCached);
                    setSelectedSeed(normalizedCached[0].scenario);
                    return;
                }
            }
        }

        // Prevent overlapping/looping synthesis calls
        if (isSynthesizingRef.current) return;
        isSynthesizingRef.current = true;
        setIsSynthesizing(true);

        const charName = activeWaifu.name || 'Character';
        const charTags = (activeWaifu.tags || []).join(', ') || 'anime companion';
        const charQuirks = (activeWaifu.quirks || []).join(', ');
        const charPersonality = activeWaifu.personality || activeWaifu.description || '';
        const isAntag = alignKey === 'Antagonist';

        // 🌟 SEED 1 CONTEXT: Pick 1 or 2 traits from user's top 10 preferences
        const sortedPreferences = Object.entries(preferences || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([tag]) => tag);
        const fallbackAlgoTraits = ['cyberpunk', 'possessive', 'neon', 'tsundere', 'playful', 'yandere', 'maid', 'kuudere', 'gothic', 'adventure'];
        const poolAlgo = sortedPreferences.length > 0 ? sortedPreferences : fallbackAlgoTraits;
        const shuffledAlgo = [...poolAlgo].sort(() => 0.5 - Math.random());
        const pickedCount = poolAlgo.length >= 2 ? (Math.random() < 0.5 ? 1 : 2) : 1;
        const pickedAlgoTraits = shuffledAlgo.slice(0, pickedCount);
        const algoContextStr = pickedAlgoTraits.join(', ');

        // 🌟 SEED 2 CONTEXT: 2 recent memories (or recent chat context)
        const rawMsgs = (activeChat?.savedRealMessages && activeChat.savedRealMessages.length > 0)
            ? activeChat.savedRealMessages
            : (activeChat?.messages || []);

        const rawMemories = rawMsgs
            .filter(m => m.memory && m.memory !== 'NONE' && typeof m.memory === 'string' && m.memory.trim())
            .map(m => m.memory.trim());

        let memoryContextStr = '';
        let memorySourceLabel = '';
        if (rawMemories.length >= 2) {
            const pickedMems = rawMemories.slice(-2);
            memoryContextStr = pickedMems.map((m, i) => `Memory ${i + 1}: "${m}"`).join(' | ');
            memorySourceLabel = pickedMems.map(m => m.length > 22 ? m.slice(0, 20) + '…' : m).join(' & ');
        } else if (rawMemories.length === 1) {
            memoryContextStr = `Recent Memory: "${rawMemories[0]}"`;
            memorySourceLabel = rawMemories[0].length > 32 ? rawMemories[0].slice(0, 30) + '…' : rawMemories[0];
        } else {
            const recentChat = rawMsgs
                .slice(-6)
                .map(m => `${m.sender || m.role || 'Partner'}: ${(m.text || m.content || '').replace(/\s+/g, ' ').slice(0, 80)}`.trim())
                .filter(Boolean)
                .slice(-4);
            if (recentChat.length > 0) {
                memoryContextStr = `Recent Chat Dialogues:\n${recentChat.join('\n')}`;
                memorySourceLabel = 'Recent Chat';
            } else {
                memoryContextStr = `Starting Lore: ${activeWaifu.scenario || activeWaifu.description || 'First meeting'}`;
                memorySourceLabel = 'Starting Lore';
            }
        }

        // 🌟 SEED 3 CONTEXT: Character profile, traits, and quirks
        const personaContextStr = [
            charQuirks ? `Quirks: ${charQuirks}` : '',
            charTags ? `Archetypes/Tags: ${charTags}` : '',
            charPersonality ? `Personality/Lore: ${charPersonality.slice(0, 160)}` : ''
        ].filter(Boolean).join(' | ') || 'playful anime companion';
        const personaSourceLabel = (charQuirks || charTags || 'Core Persona').slice(0, 35);

        const defaultTitles = ['ALGORITHM VECTOR', 'SHARED MEMORY', 'PERSONA BLUEPRINT'];
        const defaultSources = [algoContextStr, memorySourceLabel, personaSourceLabel];

        showToast(activeInfluence 
            ? `Calibrating dream seeds with influence "${activeInfluence}"... 🔮`
            : `Calibrating 3 distinct ${alignKey} dream seeds for ${charName.split(' ')[0]}... 🔮`
        );

        const dynamicDirective = isAntag
            ? `DYNAMIC: ANTAGONIST. ${charName} must be the antagonist, rival, mischievous boss, captor, or playful obstacle opposing, teasing, or testing the user in the scenario.`
            : `DYNAMIC: ALLY. ${charName} and the user must be close allies, comrades, or partners-in-crime working together side-by-side.`;

        let influenceDirective = "";
        if (activeInfluence) {
            influenceDirective = `\n\n>>> CRITICAL USER SEED THEME INFLUENCE <<<
The user requested this overarching thematic influence: "${activeInfluence}".
You MUST actively weave this theme into ALL 3 dream seeds while still honoring each seed's specific context source!`;
        }

        const prompt = `You are an elite lucid dream scenario architect for ${charName} (Tropes: ${charTags}).
We are crafting 3 wildly distinct, surreal dream seeds for an uninhibited, whimsical Lucid Dream Holodeck.

${dynamicDirective}${influenceDirective}

>>> 3 DIVERSE DREAM SEED PERSPECTIVES <<<
- SEED 1 [ALGORITHM VECTOR]: Craft a surreal dream scenario built around the user's top algorithm preference traits: [${algoContextStr}].
- SEED 2 [SHARED MEMORY]: Craft a dream scenario rooted in ${charName} and user's shared past events / memories: [${memoryContextStr}]. Transform this real memory or recent shared moment into an exaggerated, surreal dream-logic adventure!
- SEED 3 [PERSONA BLUEPRINT]: Craft a dream scenario that delves deep into ${charName}'s personal quirks, distinctive habits, or archetypes: [${personaContextStr}]. Turn her inner quirks or secret desires into an eccentric dream world.

${activeInfluence ? `REMINDER: Apply the theme influence "${activeInfluence}" across ALL 3 seeds!` : ''}

LUCID DREAM RULES:
1. Every scenario must be a 1 or 2 sentence immersive, silly, surreal, or exciting dream premise.
2. The dynamic (${alignKey.toUpperCase()}) must be clearly felt in each scenario.
3. Give each seed a short, punchy creative title (2-4 words) that evokes its premise and source.

OUTPUT FORMAT:
Output strictly XML inside <seeds>:
<seeds>
  <seed>
    <title>Short Creative Title for Seed 1</title>
    <source>${algoContextStr}</source>
    <scenario>1-2 sentence surreal dream scenario based on algorithm traits...</scenario>
  </seed>
  <seed>
    <title>Short Creative Title for Seed 2</title>
    <source>${memorySourceLabel.replace(/<[^>]+>/g, '').slice(0, 35)}</source>
    <scenario>1-2 sentence surreal dream scenario based on shared memory/chat...</scenario>
  </seed>
  <seed>
    <title>Short Creative Title for Seed 3</title>
    <source>${personaSourceLabel.replace(/<[^>]+>/g, '').slice(0, 35)}</source>
    <scenario>1-2 sentence surreal dream scenario based on character profile/quirks...</scenario>
  </seed>
</seeds>
Do NOT include any conversational preamble or outro.`;

        try {
            // ✨ v2.6.3 OOB VISUAL DIRECTOR ✨ — seed synthesis rides the side-channel. It never
            // needed to stream (the reply was parsed wholesale after finalContent()), and the
            // old synthetic stream re-prefilled the host KV prefix cache right before the dive
            // opens the chat. Fail-closed: any miss falls to the legacy stream + XML parsers,
            // then to the hardcoded contingency seeds.
            let oobSeeds = null;
            if (isOobSupported()) {
                const seedAsk = OOB_ASKS.dreamSeeds({ charName, taskBody: prompt });
                const seedRes = await askOutOfBand('dreamSeeds', seedAsk.message, { jsonSchema: seedAsk.jsonSchema });
                if (seedRes.ok) oobSeeds = OOB_VALIDATORS.dreamSeeds(seedRes.data);
            }

            let freshSeeds = [];

            if (oobSeeds) {
                // Side-channel path: validator-normalized seeds, same shape as the XML parsers
                // below. Source labels stay app-authored (defaultSources) — the LLM only
                // authors title + scenario.
                freshSeeds = oobSeeds.seeds.map((s, idx) => ({
                    title: s.title || defaultTitles[idx] || `SEED ${idx + 1}`,
                    source: defaultSources[idx] || '',
                    scenario: s.scenario,
                    type: idx === 0 ? 'algorithm' : idx === 1 ? 'memory' : 'persona'
                }));
            } else {
            if (!layla || !layla.chat || !layla.chat.completions) {
                throw new Error("Layla chat engine offline");
            }

            const stream = layla.chat.completions.stream({
                messages: [
                    { role: 'system', content: prompt },
                    { role: 'user', content: `Generate the 3 dream seeds for ${charName} now. Output ONLY the <seeds> XML, nothing else.` }
                ]
            });

            const raw = await stream.finalContent();

            // Clean thought tags and markdown code blocks
            let clean = raw
                .replace(/<[\/\\]?(?:think|thought|\|?channel\|?>?\s*thought|channel>thought)\b>?[\s\S]*?(?:<[\/\\]?(?:think|thought|channel)>|<\|?end_of_thought\|?>|<\|?channel\|?>?\s*(?:model|assistant|bot|message))/gi, '')
                .replace(/```json/gi, '')
                .replace(/```xml/gi, '')
                .replace(/```/gi, '')
                .trim();

            // Method A: XML tags (<seed>...</seed>)
            const xmlBlocks = [...clean.matchAll(/<seed\b[^>]*>([\s\S]*?)<\/seed>/gi)];
            if (xmlBlocks && xmlBlocks.length > 0) {
                freshSeeds = xmlBlocks.slice(0, 3).map((match, idx) => {
                    const block = match[1];
                    const titleM = block.match(/<title>([\s\S]*?)<\/title>/i);
                    const sourceM = block.match(/<source>([\s\S]*?)<\/source>/i);
                    const scenarioM = block.match(/<scenario>([\s\S]*?)<\/scenario>/i);

                    const title = titleM ? cleanSeedText(titleM[1]) : defaultTitles[idx];
                    const source = sourceM ? cleanSeedText(sourceM[1]) : defaultSources[idx];
                    const scenario = scenarioM ? cleanSeedText(scenarioM[1]) : cleanSeedText(block);

                    return {
                        title: title || defaultTitles[idx],
                        source: source || defaultSources[idx],
                        scenario: scenario || cleanSeedText(block),
                        type: idx === 0 ? 'algorithm' : idx === 1 ? 'memory' : 'persona'
                    };
                }).filter(s => s.scenario && s.scenario.length > 10);
            }

            // Method B: JSON Array extraction ([...])
            if (freshSeeds.length === 0) {
                const jsonMatch = clean.match(/\[[\s\S]*?\]/);
                if (jsonMatch) {
                    try {
                        const parsed = JSON.parse(jsonMatch[0]);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            freshSeeds = parsed.slice(0, 3).map((item, idx) => {
                                if (typeof item === 'object' && item !== null) {
                                    return {
                                        title: item.title ? cleanSeedText(item.title) : defaultTitles[idx],
                                        source: item.source ? cleanSeedText(item.source) : defaultSources[idx],
                                        scenario: cleanSeedText(item.scenario || item.text || item.description || ''),
                                        type: idx === 0 ? 'algorithm' : idx === 1 ? 'memory' : 'persona'
                                    };
                                }
                                return {
                                    title: defaultTitles[idx],
                                    source: defaultSources[idx],
                                    scenario: cleanSeedText(String(item)),
                                    type: idx === 0 ? 'algorithm' : idx === 1 ? 'memory' : 'persona'
                                };
                            }).filter(s => s.scenario && s.scenario.length > 10);
                        }
                    } catch (e) {
                        console.warn("[LucidDive] JSON array parse error:", e);
                    }
                }
            }

            // Method C: Line extraction fallback (e.g. 1. Scenario..., 2. Scenario...)
            if (freshSeeds.length === 0) {
                const lines = clean.split('\n')
                    .map(l => cleanSeedText(l))
                    .filter(l => l.length > 15 && !l.toLowerCase().startsWith('here are') && !l.toLowerCase().startsWith('scenario:'));
                if (lines.length > 0) {
                    freshSeeds = lines.slice(0, 3).map((l, idx) => ({
                        title: defaultTitles[idx],
                        source: defaultSources[idx],
                        scenario: l,
                        type: idx === 0 ? 'algorithm' : idx === 1 ? 'memory' : 'persona'
                    }));
                }
            }

            } // ✨ end legacy stream fallback (OOB VISUAL DIRECTOR)

            if (freshSeeds.length > 0) {
                freshSeeds = freshSeeds.slice(0, 3);
                // Save to per-character cache
                const cache = loadSeedCache();
                if (!cache[charId]) cache[charId] = {};
                cache[charId][cacheSubKey] = freshSeeds;
                saveSeedCache(cache);

                if (activeWaifuRef.current === charId) {
                    setSeeds(freshSeeds);
                    setSelectedSeed(freshSeeds[0].scenario);
                    loadedKeyRef.current = `${charId}_${alignKey}`;
                    showToast(activeInfluence ? "Influenced dream seeds calibrated! 🌌" : "Dream seeds locked in matrix! 🌌");
                }
            } else {
                throw new Error("Could not extract scenarios from LLM response.");
            }
        } catch (err) {
            console.warn("[LucidDive] Seed synthesis fallback triggered:", err);
            const inflSnippet = activeInfluence ? ` centered around ${activeInfluence}` : '';
            const fallbackSeeds = isAntag ? [
                {
                    title: "ALGORITHM VECTOR",
                    source: algoContextStr,
                    scenario: `A bizarre dream mishap${inflSnippet} leaves you shrunk down to mouse-size in ${charName}'s room, where she playfully pins you down and teasingly decides your fate.`,
                    type: "algorithm"
                },
                {
                    title: "SHARED MEMORY",
                    source: memorySourceLabel,
                    scenario: `In a surreal dream arcade${inflSnippet} where your past chats rule, ${charName} plays the mischievous rival boss challenging you to an absurd high-stakes gauntlet.`,
                    type: "memory"
                },
                {
                    title: "PERSONA BLUEPRINT",
                    source: personaSourceLabel,
                    scenario: `Caught trespassing in ${charName}'s floating neon realm${inflSnippet} built from her deepest quirks, you find yourself at the mercy of her mischievous interrogation and playful penalties.`,
                    type: "persona"
                }
            ] : [
                {
                    title: "ALGORITHM VECTOR",
                    source: algoContextStr,
                    scenario: `You and ${charName} wake up as partner detectives${inflSnippet} in an absurd dream metropolis matching your algorithm where gravity keeps flipping, cooperating to track down a runaway magical artifact.`,
                    type: "algorithm"
                },
                {
                    title: "SHARED MEMORY",
                    source: memorySourceLabel,
                    scenario: `Diving into an oversized dreamscape crafted from your shared moments${inflSnippet}, you and ${charName} must team up as stealth partners to pull off a hilarious heist.`,
                    type: "memory"
                },
                {
                    title: "PERSONA BLUEPRINT",
                    source: personaSourceLabel,
                    scenario: `Undercover as a dynamic duo${inflSnippet} inside a wonderland shaped by ${charName}'s inner quirks and personality, you two pull off a daring high-tech dream mission back-to-back.`,
                    type: "persona"
                }
            ];

            // Fallback seeds are NOT cached: they must never permanently overwrite
            // real LLM-generated seeds. Next dive will re-attempt synthesis.
            if (activeWaifuRef.current === charId) {
                setSeeds(fallbackSeeds);
                setSelectedSeed(fallbackSeeds[0].scenario);
                loadedKeyRef.current = `${charId}_${alignKey}`;
                showToast("Dream link unstable - contingency seeds active (will re-synthesize next dive).");
            }
        } finally {
            isSynthesizingRef.current = false;
            setIsSynthesizing(false);
        }
    }, [layla, activeWaifu, activeChat, preferences, dreamAlignment, cleanSeedText, normalizeSeed, showToast, showAlert]);

    const synthesizeDreamSeedsRef = useRef(synthesizeDreamSeeds);
    synthesizeDreamSeedsRef.current = synthesizeDreamSeeds;

    // Whenever the modal is opened or activeWaifu/alignment changes, load cached seeds or synthesize once!
    useEffect(() => {
        if (!enabled || !activeWaifu) {
            loadedKeyRef.current = '';
            return;
        }

        const charId = activeWaifu.id || activeWaifu.name || 'companion';
        const alignKey = String(dreamAlignment).toLowerCase().includes('antag') ? 'Antagonist' : 'Ally';
        const key = `${charId}_${alignKey}`;

        if (loadedKeyRef.current === key) {
            return;
        }
        loadedKeyRef.current = key;

        const cache = loadSeedCache();
        const cachedList = cache[charId]?.[alignKey];

        if (Array.isArray(cachedList) && cachedList.length > 0) {
            const normalized = cachedList.map((s, idx) => normalizeSeed(s, idx)).filter(s => s.scenario);
            if (normalized.length > 0) {
                setSeeds(normalized);
                setSelectedSeed(normalized[0].scenario);
                return;
            }
        }
        synthesizeDreamSeedsRef.current(alignKey, false);
    }, [enabled, activeWaifu?.id, activeWaifu?.name, dreamAlignment, normalizeSeed]);

    /**
     * Synthesizes an adaptive 3-beat storyboard guidance arc for the chosen scenario.
     */
    const generateDynamicStoryboard = useCallback(async (scenario) => {
        if (!layla || !layla.chat || !scenario) return null;

        setIsGeneratingStoryboard(true);
        try {
            const prompt = `You are a dynamic narrative architect for a roleplay holodeck. 
The selected scenario is: "${scenario}".
Create an adaptive 3-beat storyboard guidance structure that will help steer the narrative organically toward a natural climax and resolution.
Output strictly as JSON in this exact structure:
{
  "act1": "Setup & initial tension (1 sentence)",
  "act2": "Escalation & pivotal obstacle/climax (1 sentence)",
  "act3": "Organic resolution & emotional aftermath (1 sentence)"
}`;

            const stream = layla.chat.completions.stream({
                messages: [
                    { role: 'system', content: prompt },
                    { role: 'user', content: 'Generate the 3-beat storyboard now. Output ONLY the JSON object, nothing else.' }
                ]
            });

            const raw = await stream.finalContent();
            let clean = raw
                .replace(/<[\/\\]?(?:think|thought|\|?channel\|?>?\s*thought|channel>thought)\b>?[\s\S]*?(?:<[\/\\]?(?:think|thought|channel)>|<\|?end_of_thought\|?>|<\|?channel\|?>?\s*(?:model|assistant|bot|message))/gi, '')
                .replace(/```json/gi, '')
                .replace(/```/gi, '')
                .trim();

            const parsed = JSON.parse(clean);
            setStoryboard(parsed);
            return parsed;
        } catch (err) {
            console.warn("Storyboard generator fallback:", err);
            const fallbackBoard = {
                act1: "Initial encounter and scene orientation.",
                act2: "Rising stakes, unexpected complications, and emotional engagement.",
                act3: "Dynamic climax leading to a memorable, high-impact outcome."
            };
            setStoryboard(fallbackBoard);
            return fallbackBoard;
        } finally {
            setIsGeneratingStoryboard(false);
        }
    }, [layla]);

    const extractMutationTags = useCallback(async (scenarioText) => {
        if (!layla || !layla.chat) return ['dream_resonance'];

        setIsExtractingLoot(true);
        try {
            const prompt = `You are an anime tag classifier. Summarize the roleplay scenario and emotional fetish vibe of this story into 1 or 2 concise Danbooru-style tags (e.g., 'telepathy, mind_break', 'yandere, high_stakes', 'cuddle_lock, sweet_talk'):
"${scenarioText}"
Output strictly inside XML tags: <tags>tag1, tag2</tags>`;

            const stream = layla.chat.completions.stream({
                messages: [
                    { role: 'system', content: prompt },
                    { role: 'user', content: 'Classify the scenario now. Output ONLY the <tags> XML, nothing else.' }
                ]
            });

            const raw = await stream.finalContent();
            const clean = raw.replace(/<[\/\\]?(?:think|thought)\b>?[\s\S]*?(?:<[\/\\]?(?:think|thought)>|$)/gi, '');
            const match = clean.match(/<tags>([\s\S]*?)<\/tags>/i);

            if (match) {
                const tags = match[1]
                    .split(',')
                    .map(t => t.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'))
                    .filter(Boolean)
                    .slice(0, 2);
                return tags.length > 0 ? tags : ['matrix_bonded'];
            }
            return ['dream_weaver'];
        } catch (err) {
            console.error("Tag extraction error:", err);
            return ['lucid_diver'];
        } finally {
            setIsExtractingLoot(false);
        }
    }, [layla]);

    const handleSelectSeed = useCallback((val) => {
        if (typeof val === 'object' && val !== null && val.scenario) {
            setSelectedSeed(val.scenario);
        } else {
            setSelectedSeed(val);
        }
    }, []);

    return {
        seeds,
        setSeeds,
        selectedSeed,
        setSelectedSeed: handleSelectSeed,
        seedInfluence,
        setSeedInfluence,
        customSeed: seedInfluence, // backwards compatibility
        setCustomSeed: setSeedInfluence,
        diveMode,
        setDiveMode,
        roleAlignment,
        setRoleAlignment,
        userRole,
        setUserRole,
        storyboard,
        setStoryboard,
        synthesizeDreamSeeds,
        rerollSeeds: (infl) => synthesizeDreamSeedsRef.current(dreamAlignment, true, infl !== undefined ? infl : seedInfluenceRef.current),
        generateDynamicStoryboard,
        extractMutationTags,
        isSynthesizing,
        isGeneratingStoryboard,
        isExtractingLoot
    };
}

export default useDreamSynthesis;
