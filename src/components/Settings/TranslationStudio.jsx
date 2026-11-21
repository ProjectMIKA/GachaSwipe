import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLanguage, enTemplate, getLaylaHost } from '../../context/LanguageContext.jsx';

/**
 * Handcrafted Inline SVGs (Zero Native OS Emojis)
 * Strict compliance with stroke="currentColor", fill="none"
 */
const SvgGlobe = ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
);

const SvgExport = ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const SvgImport = ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);

const SvgSaveDisk = ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
    </svg>
);

const SvgSparkle = ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);

const SvgClose = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const SvgSpinner = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" stroke="rgba(0, 229, 255, 0.2)" />
        <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
);

const SvgSearch = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const SvgCheck = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const SvgAlertCircle = ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

const SvgStop = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
);

const SvgReset = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
    </svg>
);

/**
 * Robust JSON Parser for Local LLM Responses
 * Handles markdown backticks, conversational preamble, and raw JSON.
 */
const extractJsonFromResponse = (raw, chunkKeys = []) => {
    if (!raw || typeof raw !== 'string') return null;
    let text = raw.trim();

    // 0. Strip reasoning / think tags from chain-of-thought models (e.g. Qwen 2.5, DeepSeek R1)
    text = text.replace(/<[\/\\]?(?:think|thought)\b[^>]*>[\s\S]*?(?:<[\/\\]?(?:think|thought)>|<\|?end_of_thought\|?>|$)/gi, '').trim();

    // 1. Try markdown code block extraction
    const blockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (blockMatch && blockMatch[1]) {
        text = blockMatch[1].trim();
    }

    // Helper to attempt clean parse
    const tryParse = (str) => {
        try {
            // Strip trailing commas before } or ]
            const cleaned = str.replace(/,\s*([}\]])/g, '$1');
            const parsed = JSON.parse(cleaned);
            if (typeof parsed === 'object' && parsed !== null) return parsed;
        } catch (e) { }
        return null;
    };

    // 2. Direct parse attempt
    let result = tryParse(text);
    if (result) return result;

    // 3. Fallback: locate outermost { and }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        result = tryParse(text.substring(firstBrace, lastBrace + 1));
        if (result) return result;
    }

    // 4. Fallback: line-by-line regex extraction for each key in chunk
    if (chunkKeys && Array.isArray(chunkKeys) && chunkKeys.length > 0) {
        const fallbackObj = {};
        chunkKeys.forEach(k => {
            const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const rx = new RegExp(`["']${escaped}["']\\s*:\\s*["']((?:[^"\\\\]|\\\\.)*)["']`, 'i');
            const match = text.match(rx);
            if (match && match[1] !== undefined) {
                fallbackObj[k] = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            }
        });
        if (Object.keys(fallbackObj).length > 0) {
            return fallbackObj;
        }
    }

    return null;
};

export const TranslationStudio = ({ isOpen, onClose, appLanguage = 'English', layla: propLayla }) => {
    const {
        t,
        activeLanguage,
        customDictionary,
        saveCustomDictionary,
        resetToDefault,
        isSaving
    } = useLanguage();

    // Local draft state bound to inputs
    const [draftDictionary, setDraftDictionary] = useState({});
    const [targetLanguage, setTargetLanguage] = useState(appLanguage || 'Japanese');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'untranslated' | 'localized'
    const [notification, setNotification] = useState(null);

    // Auto-translation engine state
    const [isTranslating, setIsTranslating] = useState(false);
    const [translationProgress, setTranslationProgress] = useState({ currentBatch: 0, totalBatches: 0, totalKeys: 0, completedKeys: 0 });
    const abortControllerRef = useRef(false);
    const fileInputRef = useRef(null);

    // Initialize local draft from customDictionary or enTemplate
    useEffect(() => {
        if (isOpen) {
            const initial = {};
            Object.keys(enTemplate).forEach(key => {
                initial[key] = (customDictionary && customDictionary[key] !== undefined)
                    ? customDictionary[key]
                    : (enTemplate[key] || '');
            });
            setDraftDictionary(initial);
            if (appLanguage && appLanguage !== 'English') {
                setTargetLanguage(appLanguage);
            }
        }
    }, [isOpen, customDictionary, appLanguage]);

    // Show temporary status notification
    const triggerNotification = useCallback((message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification(prev => (prev?.message === message ? null : prev));
        }, 3500);
    }, []);

    // Filtered keys based on search and status filter tab
    const filteredKeys = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const allKeys = Object.keys(enTemplate);

        return allKeys.filter(key => {
            const orig = (enTemplate[key] || '').toLowerCase();
            const curr = (draftDictionary[key] || '').toLowerCase();
            const isTranslated = draftDictionary[key] !== undefined && draftDictionary[key] !== '' && draftDictionary[key] !== enTemplate[key];

            if (activeFilter === 'untranslated' && isTranslated) return false;
            if (activeFilter === 'localized' && !isTranslated) return false;

            if (!query) return true;
            return key.toLowerCase().includes(query) || orig.includes(query) || curr.includes(query);
        });
    }, [searchQuery, draftDictionary, activeFilter]);

    // Calculation of localized progress stats
    const stats = useMemo(() => {
        const total = Object.keys(enTemplate).length;
        let translated = 0;
        Object.keys(enTemplate).forEach(k => {
            const val = draftDictionary[k];
            if (val && val.trim() !== '' && val !== enTemplate[k]) {
                translated++;
            }
        });
        return { total, translated, percent: Math.round((translated / total) * 100) };
    }, [draftDictionary]);

    // Update single key in draft
    const handleDraftChange = (key, value) => {
        setDraftDictionary(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // ✨ EXPORT TEMPLATE JSON ✨
    const handleExport = async () => {
        try {
            const dataToExport = {
                metadata: {
                    schema: "gachaswipe_localization_matrix_v1",
                    generator: "M.I.K.A. Translation Studio (BYOL)",
                    language: targetLanguage || "Custom",
                    exported_at: new Date().toISOString(),
                    total_keys: Object.keys(enTemplate).length
                },
                translations: { ...draftDictionary }
            };

            const jsonStr = JSON.stringify(dataToExport, null, 2);
            const sanitizedLang = (targetLanguage || 'custom').toLowerCase().replace(/[^a-z0-9]/g, '_');
            const fileName = `gachaswipe_localization_${sanitizedLang}.json`;

            const activeLayla = propLayla || getLaylaHost();

            // 1. Primary: Native Layla SDK saveFile with Android share sheet
            if (activeLayla && activeLayla.utils && typeof activeLayla.utils.saveFile === 'function') {
                try {
                    const bytes = new TextEncoder().encode(jsonStr);
                    let bin = '';
                    const chunkSize = 32768;
                    for (let i = 0; i < bytes.length; i += chunkSize) {
                        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
                    }
                    const b64 = btoa(bin);
                    await activeLayla.utils.saveFile(fileName, b64, true);
                    triggerNotification("Template exported to Share Sheet! 💾", "success");
                    return;
                } catch (sdkErr) {
                    console.warn("[M.I.K.A. TranslationStudio] Layla saveFile error, attempting fallbacks:", sdkErr);
                }
            }

            // 2. Web browser fallback using a.download
            try {
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                triggerNotification("Template downloaded! 💾", "success");
                return;
            } catch (blobErr) {
                console.warn("[M.I.K.A. TranslationStudio] Blob download fallback failed:", blobErr);
            }

            // 3. Ultimate Fallback: Copy to clipboard so user never loses data
            if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(jsonStr);
                triggerNotification("JSON copied to clipboard! 📋", "info");
            } else {
                throw new Error("No download bridge available.");
            }
        } catch (err) {
            console.error("Export error:", err);
            triggerNotification("Failed to export template.", "error");
        }
    };

    // ✨ IMPORT JSON FILE ✨
    const handleImportFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                const importedTranslations = parsed.translations || parsed;

                if (typeof importedTranslations !== 'object' || importedTranslations === null) {
                    throw new Error("Invalid dictionary mapping");
                }

                setDraftDictionary(prev => {
                    const next = { ...prev };
                    Object.keys(enTemplate).forEach(key => {
                        if (importedTranslations[key] !== undefined) {
                            next[key] = String(importedTranslations[key]);
                        }
                    });
                    return next;
                });

                if (parsed.metadata?.language) {
                    setTargetLanguage(parsed.metadata.language);
                }

                triggerNotification(t('alert_import_success', "Localization JSON imported successfully!"), "success");
            } catch (err) {
                console.error("Import error:", err);
                triggerNotification(t('alert_import_invalid', "Invalid JSON format! Please select a valid translation file."), "error");
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    // ✨ SAVE & APPLY MATRIX DIRECTLY TO SQLITE (layla.db) ✨
    const handleSaveAndApply = async () => {
        try {
            const savedToDb = await saveCustomDictionary(draftDictionary, 'custom');
            if (savedToDb) {
                triggerNotification(t('alert_save_success', "Matrix saved and applied to layla.db!"), "success");
            } else {
                triggerNotification(t('alert_save_fallback', "Saved to local cache (Layla DB bridge offline)."), "info");
            }
        } catch (err) {
            console.error("Save error:", err);
            triggerNotification("Failed to save translation matrix.", "error");
        }
    };

    // Reset draft back to master enTemplate
    const handleResetDraft = () => {
        const resetCopy = {};
        Object.keys(enTemplate).forEach(k => {
            resetCopy[k] = enTemplate[k];
        });
        setDraftDictionary(resetCopy);
        triggerNotification("Draft matrix restored to default English.", "info");
    };

    // ✨ PHASE 3: 1-CLICK LLM AUTO-TRANSLATOR (THE M.I.K.A. ENGINE) ✨
    const handleAutoTranslate = async () => {
        const lang = targetLanguage.trim();
        if (!lang) {
            triggerNotification(t('alert_empty_target_lang', "Please specify a target language first!"), "error");
            return;
        }

        const activeLayla = propLayla || getLaylaHost();
        if (!activeLayla || !activeLayla.chat || !activeLayla.chat.completions || typeof activeLayla.chat.completions.create !== 'function') {
            triggerNotification("Layla LLM engine unavailable! Ensure the Layla runtime is active.", "error");
            return;
        }

        abortControllerRef.current = false;
        setIsTranslating(true);

        const allKeys = Object.keys(enTemplate);
        // Chunking keys in batches of 12 (within 10-15 range) to guarantee zero context overflow and higher accuracy on local LLMs
        const BATCH_SIZE = 12;
        const batches = [];
        for (let i = 0; i < allKeys.length; i += BATCH_SIZE) {
            batches.push(allKeys.slice(i, i + BATCH_SIZE));
        }

        setTranslationProgress({
            currentBatch: 0,
            totalBatches: batches.length,
            totalKeys: allKeys.length,
            completedKeys: 0
        });

        let completedCount = 0;
        let hasErrors = false;
        const accumulatedDraft = { ...draftDictionary };

        try {
            for (let bIndex = 0; bIndex < batches.length; bIndex++) {
                if (abortControllerRef.current) {
                    triggerNotification(t('alert_translation_interrupted', "Auto-translation was aborted."), "info");
                    break;
                }

                const currentChunkKeys = batches[bIndex];
                setTranslationProgress({
                    currentBatch: bIndex + 1,
                    totalBatches: batches.length,
                    totalKeys: allKeys.length,
                    completedKeys: completedCount
                });

                // Prepare key-value dictionary for this batch
                const chunkPayload = {};
                currentChunkKeys.forEach(k => {
                    chunkPayload[k] = enTemplate[k];
                });

                const systemPrompt = `You are a professional mobile app & video game UI localization engine. Translate the English values in this JSON into ${lang}.

CRITICAL DIRECTIVE: BREVITY & UI FIT OVER LITERAL TRANSLATION!
Screen real estate is strictly limited on mobile screens. It does NOT need to be a word-for-word direct translation. A brief, "close enough" translation or standard software/gaming UI shorthand in ${lang} is MUCH better than a long literal sentence. NEVER produce verbose text that could break or overflow UI buttons and tabs.

STRICT TRANSLATION RULES:
1. BUTTONS, TABS & NAVIGATION (keys starting with 'btn_', 'tab_', 'nav_', 'status_'):
   - STRICT LIMIT: 1 to 3 words maximum! Keep character length short (comparable to English, ideally under 16 characters).
   - If original is 1 or 2 words (e.g., "SAVE", "LIKE", "PASS", "FRIENDS", "HISTORY", "CORE MATRIX", "CHAT DYNAMICS"), the translation MUST remain equally short (e.g. "GUARDAR", "LIKE", "PASAR", "AMIGOS", "HISTORIAL", "NÚCLEO", "CHATS"). Never translate a single button into a descriptive phrase!
2. HEADERS & TOGGLE TITLES (values starting with '>'):
   - STRICT LIMIT: 1 to 3 words maximum. Use compact software shorthand (e.g. '> STARTUP_SCREEN' -> '> INICIO', '> SPECIES_MIXING' -> '> ESPECIES', '> AUTO_QUEUE_MATCHES' -> '> COLA_AUTO').
3. DESCRIPTIONS (values starting with '//'):
   - Keep descriptions punchy and brief (strictly under 12-14 words). Eliminate all filler words.
4. PRESERVE SYMBOLS, FORMATTING & ACRONYMS:
   - Always preserve leading symbols and brackets: '>', '//', '+', '[!]', '[ ]', '[', ']', emojis.
   - If English is in UPPERCASE or uses underscores, format translation similarly (e.g., '> SAVE_DATA' -> '> GUARDAR_DATOS' or '> GUARDAR').
   - Keep recognized technical acronyms and engine names intact without awkward translations: M.I.K.A., P.U.R.R., M.E.O.W., HUD, DAW, BPM, MP3, SMS, RP, SQL, DB, VIP, AI, JSON, Danbooru.
5. OUTPUT:
   - Output ONLY a valid JSON object with the exact keys. No markdown code blocks, thoughts, or conversational comments.`;
                const userPrompt = JSON.stringify(chunkPayload, null, 2);

                try {
                    const completion = await activeLayla.chat.completions.create({
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ]
                    });

                    const rawOutput = (typeof completion === 'string')
                        ? completion
                        : (completion?.choices?.[0]?.message?.content || completion?.content || '');
                    const parsedResult = extractJsonFromResponse(rawOutput, currentChunkKeys);

                    if (parsedResult && typeof parsedResult === 'object') {
                        // Automatically populate the corresponding <input> fields in real time
                        currentChunkKeys.forEach(k => {
                            if (parsedResult[k] !== undefined && parsedResult[k] !== null) {
                                let val = String(parsedResult[k]).trim();
                                // Clean wrapping double/single quotes if model wrapped string
                                val = val.replace(/^["'“”]+|["'“”]+$/g, '').trim();
                                // If the original key was a header starting with > and model omitted >, restore it
                                if (enTemplate[k]?.startsWith('> ') && !val.startsWith('>')) {
                                    val = `> ${val.replace(/^[>:\-—\s]+/, '').trim()}`;
                                } else if (enTemplate[k]?.startsWith('// ') && !val.startsWith('//')) {
                                    val = `// ${val.replace(/^[\/:\-—\s]+/, '').trim()}`;
                                }
                                accumulatedDraft[k] = val;
                            }
                        });
                        setDraftDictionary({ ...accumulatedDraft });
                        completedCount += currentChunkKeys.length;
                    } else {
                        console.warn(`[M.I.K.A. Auto-Translate] Batch ${bIndex + 1} did not return valid JSON:`, rawOutput);
                        hasErrors = true;
                    }
                } catch (batchErr) {
                    console.error(`[M.I.K.A. Auto-Translate] Error translating batch ${bIndex + 1}:`, batchErr);
                    hasErrors = true;
                }

                setTranslationProgress(prev => ({ ...prev, completedKeys: completedCount }));
            }

            if (!abortControllerRef.current) {
                // ✨ MIKA'S INSTANT SYNC: Automatically commit and apply matrix directly to active UI and layla.db!
                try {
                    await saveCustomDictionary(accumulatedDraft, 'custom');
                } catch (saveErr) {
                    console.error("[M.I.K.A. Auto-Translate] Error auto-applying matrix:", saveErr);
                }

                if (hasErrors) {
                    triggerNotification(t('alert_translation_error', "Translation completed with some batch warnings. Matrix applied to UI!"), "info");
                } else {
                    triggerNotification(t('alert_save_success', `All translation chunks resolved and applied to UI!`), "success");
                }
            }
        } catch (globalErr) {
            console.error("[M.I.K.A. Auto-Translate] Critical error:", globalErr);
            triggerNotification("Neural translation encountered an unhandled error.", "error");
        } finally {
            setIsTranslating(false);
        }
    };

    const handleAbortTranslation = () => {
        abortControllerRef.current = true;
        setIsTranslating(false);
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(5, 4, 10, 0.95)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            animation: 'fadeIn 0.25s ease'
        }}>
            {/* Main Cyberpunk Studio Window */}
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '920px',
                height: '90vh',
                maxHeight: '860px',
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(8, 6, 16, 0.98)',
                border: '1px solid #00E5FF',
                borderRadius: '16px',
                boxShadow: '0 0 35px rgba(0, 229, 255, 0.25), inset 0 0 20px rgba(0, 229, 255, 0.05)',
                overflow: 'hidden',
                color: '#EBE3D6',
                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
            }}>
                {/* Cyber Scanline Overlay */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
                    backgroundSize: '100% 4px',
                    opacity: 0.35,
                    zIndex: 2
                }} />

                {/* Header Bar */}
                <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(0, 229, 255, 0.25)',
                    background: 'rgba(0, 229, 255, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    zIndex: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1, marginRight: '10px' }}>
                        <div style={{
                            padding: '6px',
                            borderRadius: '6px',
                            background: 'rgba(0, 229, 255, 0.12)',
                            border: '1px solid #00E5FF',
                            color: '#00E5FF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 8px rgba(0,229,255,0.3)',
                            flexShrink: 0
                        }}>
                            <SvgGlobe size={16} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{
                                fontWeight: '800',
                                fontSize: '13px',
                                letterSpacing: '0.06em',
                                color: '#00E5FF',
                                textShadow: '0 0 8px rgba(0,229,255,0.4)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {t('studio_title', 'TRANSLATION STUDIO // BYOL')}
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(235, 227, 214, 0.6)', marginTop: '1px', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {t('studio_subtitle', '// Bring Your Own Language Matrix')}
                            </div>
                        </div>
                    </div>

                    {/* Close Modal Button */}
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: 'rgba(255, 255, 255, 0.7)',
                            borderRadius: '8px',
                            padding: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            flexShrink: 0
                        }}
                        onMouseOver={e => { e.currentTarget.style.borderColor = '#FF3333'; e.currentTarget.style.color = '#FF3333'; }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'; e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'; }}
                        title="Close Studio"
                    >
                        <SvgClose size={18} />
                    </button>
                </div>

                {/* Status Notification Banner */}
                {notification && (
                    <div style={{
                        padding: '8px 20px',
                        background: notification.type === 'error'
                            ? 'rgba(255, 51, 51, 0.15)'
                            : (notification.type === 'info' ? 'rgba(181, 51, 255, 0.15)' : 'rgba(0, 255, 65, 0.15)'),
                        borderBottom: `1px solid ${notification.type === 'error' ? '#FF3333' : (notification.type === 'info' ? '#B533FF' : '#00FF41')}`,
                        color: notification.type === 'error' ? '#FF5555' : (notification.type === 'info' ? '#D884FF' : '#00FF41'),
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        zIndex: 10,
                        animation: 'fadeIn 0.2s ease'
                    }}>
                        {notification.type === 'error' ? <SvgAlertCircle size={14} /> : <SvgCheck size={14} />}
                        <span>{notification.message}</span>
                    </div>
                )}

                {/* Top Control Panel: Auto-Translator & Target Dialect */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(0, 229, 255, 0.15)',
                    background: 'rgba(0, 229, 255, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative',
                    zIndex: 10
                }}>
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        flexWrap: 'wrap',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between'
                    }}>
                        {/* Target Language Input */}
                        <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                color: '#00E5FF',
                                marginBottom: '6px',
                                letterSpacing: '0.08em'
                            }}>
                                &gt; {t('target_language_label', 'TARGET LOCALIZATION DIALECT')}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    value={targetLanguage}
                                    onChange={e => setTargetLanguage(e.target.value)}
                                    placeholder={t('target_language_placeholder', "e.g. Japanese, French, Spanish, Pirate Slang...")}
                                    disabled={isTranslating}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        background: '#0B0914',
                                        border: '1px solid rgba(0, 229, 255, 0.35)',
                                        borderRadius: '8px',
                                        color: '#00E5FF',
                                        fontSize: '12px',
                                        fontFamily: 'inherit',
                                        outline: 'none',
                                        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
                                        transition: 'all 0.2s'
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = '#00E5FF'}
                                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.35)'}
                                />
                            </div>
                        </div>

                        {/* LLM Auto-Translate Trigger */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {!isTranslating ? (
                                <button
                                    onClick={handleAutoTranslate}
                                    style={{
                                        padding: '10px 18px',
                                        borderRadius: '8px',
                                        border: '1px solid #00E5FF',
                                        background: 'rgba(0, 229, 255, 0.15)',
                                        color: '#00E5FF',
                                        fontWeight: 'bold',
                                        fontSize: '11px',
                                        letterSpacing: '0.08em',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: '0 0 14px rgba(0, 229, 255, 0.25), inset 0 0 8px rgba(0, 229, 255, 0.1)',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={e => {
                                        e.currentTarget.style.background = 'rgba(0, 229, 255, 0.28)';
                                        e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 229, 255, 0.4)';
                                    }}
                                    onMouseOut={e => {
                                        e.currentTarget.style.background = 'rgba(0, 229, 255, 0.15)';
                                        e.currentTarget.style.boxShadow = '0 0 14px rgba(0, 229, 255, 0.25)';
                                    }}
                                >
                                    <SvgSparkle size={15} />
                                    <span>[ {t('btn_auto_translate', 'AUTO_TRANSLATE_MATRIX')} ]</span>
                                </button>
                            ) : (
                                <button
                                    onClick={handleAbortTranslation}
                                    style={{
                                        padding: '10px 18px',
                                        borderRadius: '8px',
                                        border: '1px solid #FF3333',
                                        background: 'rgba(255, 51, 51, 0.15)',
                                        color: '#FF5555',
                                        fontWeight: 'bold',
                                        fontSize: '11px',
                                        letterSpacing: '0.08em',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: '0 0 12px rgba(255, 51, 51, 0.3)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <SvgStop size={14} />
                                    <span>[ {t('btn_abort', 'ABORT')} ]</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Progress Indicator Bar when Translating */}
                    {isTranslating && (
                        <div style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: 'rgba(0, 229, 255, 0.05)',
                            border: '1px solid rgba(0, 229, 255, 0.25)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            animation: 'fadeIn 0.2s ease'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#00E5FF' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <SvgSpinner size={14} />
                                    <span>
                                        Translating Batch {translationProgress.currentBatch} / {translationProgress.totalBatches} ({translationProgress.completedKeys} / {translationProgress.totalKeys} keys resolved)
                                    </span>
                                </div>
                                <span style={{ fontWeight: 'bold' }}>
                                    {Math.round((translationProgress.currentBatch / (translationProgress.totalBatches || 1)) * 100)}%
                                </span>
                            </div>
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.round((translationProgress.currentBatch / (translationProgress.totalBatches || 1)) * 100)}%`,
                                    background: 'linear-gradient(90deg, #00E5FF, #00FF41)',
                                    boxShadow: '0 0 8px #00E5FF',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Sub-Header Actions: Import, Export, Search, Stats */}
                <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(0, 229, 255, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    position: 'relative',
                    zIndex: 10
                }}>
                    {/* Search & Filter */}
                    <div style={{ position: 'relative', width: '100%' }}>
                        <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(0, 229, 255, 0.5)' }}>
                            <SvgSearch size={14} />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder={t('search_keys_placeholder', 'Search translation key or original text...')}
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '8px 12px 8px 32px',
                                background: '#0B0914',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '6px',
                                color: '#EBE3D6',
                                fontSize: '11px',
                                fontFamily: 'inherit',
                                outline: 'none'
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = '#00E5FF'}
                            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                        />
                    </div>

                    {/* Community Sharing & Action Buttons: 3 buttons side-by-side */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                        {/* Hidden file input for import */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".json"
                            style={{ display: 'none' }}
                            onChange={handleImportFile}
                        />

                        <button
                            onClick={handleExport}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                padding: '8px 6px',
                                borderRadius: '6px',
                                border: '1px solid rgba(0, 229, 255, 0.4)',
                                background: 'rgba(0, 229, 255, 0.08)',
                                color: '#00E5FF',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                letterSpacing: '0.04em',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(0, 229, 255, 0.2)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(0, 229, 255, 0.08)'}
                            title="Download JSON matrix file"
                        >
                            <SvgExport size={13} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>EXPORT TEMPLATE</span>
                        </button>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                padding: '8px 6px',
                                borderRadius: '6px',
                                border: '1px solid rgba(181, 51, 255, 0.4)',
                                background: 'rgba(181, 51, 255, 0.08)',
                                color: '#D884FF',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                letterSpacing: '0.04em',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(181, 51, 255, 0.2)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(181, 51, 255, 0.08)'}
                            title="Load JSON matrix file"
                        >
                            <SvgImport size={13} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>IMPORT JSON</span>
                        </button>

                        <button
                            onClick={handleResetDraft}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                padding: '8px 6px',
                                borderRadius: '6px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'rgba(255, 255, 255, 0.75)',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                letterSpacing: '0.04em',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                            title="Reset all inputs back to English defaults"
                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; e.currentTarget.style.color = '#FFF'; }}
                            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)'; }}
                        >
                            <SvgReset size={12} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>DEFAULT</span>
                        </button>
                    </div>
                </div>

                {/* Status Filter Tabs & Section Header */}
                <div style={{
                    padding: '8px 20px',
                    background: 'rgba(0, 229, 255, 0.04)',
                    borderBottom: '1px solid rgba(0, 229, 255, 0.15)',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    position: 'relative',
                    zIndex: 10
                }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {[
                            { id: 'all', label: `${t('filter_all', 'ALL')} (${stats.total})` },
                            { id: 'untranslated', label: `${t('filter_untranslated', 'UNTRANSLATED')} (${stats.total - stats.translated})` },
                            { id: 'localized', label: `${t('filter_localized', 'LOCALIZED')} (${stats.translated})` }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveFilter(tab.id)}
                                style={{
                                    padding: '5px 12px',
                                    borderRadius: '6px',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    letterSpacing: '0.06em',
                                    cursor: 'pointer',
                                    border: activeFilter === tab.id ? '1px solid #00E5FF' : '1px solid rgba(255, 255, 255, 0.12)',
                                    background: activeFilter === tab.id ? 'rgba(0, 229, 255, 0.16)' : 'transparent',
                                    color: activeFilter === tab.id ? '#00E5FF' : 'rgba(255, 255, 255, 0.5)',
                                    boxShadow: activeFilter === tab.id ? '0 0 10px rgba(0,229,255,0.2)' : 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(0, 229, 255, 0.7)', letterSpacing: '0.08em', fontWeight: 'bold' }}>
                        &gt; {t('active_matrix_label', 'ACTIVE UI LOCALIZATION MATRIX')}
                    </div>
                </div>

                {/* Scrollable Key-Value Matrix Cards List (Responsive & Never Overflowing) */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    position: 'relative',
                    zIndex: 5
                }}>
                    {filteredKeys.length === 0 ? (
                        <div style={{
                            padding: '40px',
                            textAlign: 'center',
                            color: 'rgba(255, 255, 255, 0.4)',
                            fontSize: '12px',
                            fontStyle: 'italic'
                        }}>
                            // No translation keys found matching current filter or "{searchQuery}"
                        </div>
                    ) : (
                        filteredKeys.map(key => {
                            const originalVal = enTemplate[key] || '';
                            const currentVal = draftDictionary[key] !== undefined ? draftDictionary[key] : '';
                            const isChanged = currentVal !== '' && currentVal !== originalVal;
                            const isUiControl = key.startsWith('btn_') || key.startsWith('tab_') || key.startsWith('nav_') || key.startsWith('status_');
                            const isTooLong = isUiControl && currentVal && currentVal.length > 20;

                            return (
                                <div
                                    key={key}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                        padding: '12px',
                                        borderRadius: '10px',
                                        background: isChanged ? 'rgba(0, 229, 255, 0.03)' : 'rgba(0, 0, 0, 0.35)',
                                        border: isChanged ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.07)',
                                        boxShadow: isChanged ? '0 0 12px rgba(0, 229, 255, 0.06)' : 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {/* Top Row: Key Identifier Badge + Status Indicator */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            <span style={{
                                                fontSize: '10px',
                                                padding: '3px 8px',
                                                borderRadius: '4px',
                                                background: 'rgba(0, 229, 255, 0.12)',
                                                color: '#00E5FF',
                                                border: '1px solid rgba(0, 229, 255, 0.3)',
                                                fontFamily: "ui-monospace, 'SF Mono', monospace",
                                                letterSpacing: '0.06em',
                                                fontWeight: 'bold'
                                            }}>
                                                {key}
                                            </span>
                                            {isTooLong && (
                                                <span
                                                    title="Warning: Long text in buttons/tabs may wrap or overflow compact mobile UI. Keep brief!"
                                                    style={{
                                                        fontSize: '9px',
                                                        color: '#FFB800',
                                                        background: 'rgba(255, 184, 0, 0.15)',
                                                        border: '1px solid rgba(255, 184, 0, 0.4)',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontWeight: 'bold',
                                                        letterSpacing: '0.04em'
                                                    }}
                                                >
                                                    ⚠️ {currentVal.length} chars (long)
                                                </span>
                                            )}
                                        </div>
                                        {isChanged ? (
                                            <span style={{ fontSize: '9px', color: '#00FF41', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', letterSpacing: '0.05em' }}>
                                                <SvgCheck size={12} /> {t('status_localized', 'LOCALIZED')}
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.35)', letterSpacing: '0.05em' }}>
                                                DEFAULT EN
                                            </span>
                                        )}
                                    </div>

                                    {/* Middle Row: Original English Reference */}
                                    <div style={{
                                        fontSize: '11px',
                                        color: 'rgba(235, 227, 214, 0.75)',
                                        lineHeight: 1.4,
                                        background: 'rgba(255, 255, 255, 0.02)',
                                        padding: '6px 10px',
                                        borderRadius: '6px',
                                        borderLeft: '2px solid rgba(0, 229, 255, 0.4)',
                                        wordBreak: 'break-word'
                                    }}>
                                        <span style={{ fontSize: '9px', color: 'rgba(0, 229, 255, 0.6)', marginRight: '6px', fontWeight: 'bold', letterSpacing: '0.05em' }}>EN:</span>
                                        {originalVal}
                                    </div>

                                    {/* Bottom Row: Full-Width Editable Custom Translation Input */}
                                    <div style={{ position: 'relative', width: '100%' }}>
                                        <input
                                            type="text"
                                            value={currentVal}
                                            onChange={e => handleDraftChange(key, e.target.value)}
                                            placeholder={originalVal}
                                            style={{
                                                width: '100%',
                                                boxSizing: 'border-box',
                                                padding: '9px 12px',
                                                background: '#0B0914',
                                                border: isChanged ? '1px solid #00FF41' : '1px solid rgba(255, 255, 255, 0.16)',
                                                borderRadius: '6px',
                                                color: isChanged ? '#00FF41' : '#EBE3D6',
                                                fontSize: '12px',
                                                fontFamily: 'inherit',
                                                outline: 'none',
                                                transition: 'all 0.2s',
                                                boxShadow: isChanged ? '0 0 10px rgba(0, 255, 65, 0.12)' : 'inset 0 0 6px rgba(0,0,0,0.5)'
                                            }}
                                            onFocus={e => e.currentTarget.style.borderColor = '#00E5FF'}
                                            onBlur={e => {
                                                if (!isChanged) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Bar: Stats & Master Save Button */}
                <div style={{
                    padding: '14px 20px',
                    borderTop: '1px solid rgba(0, 229, 255, 0.25)',
                    background: 'rgba(0, 229, 255, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    position: 'relative',
                    zIndex: 10
                }}>
                    {/* Key Localization Progress Stat */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'rgba(235, 227, 214, 0.8)' }}>
                        <span style={{ color: '#00E5FF', fontWeight: 'bold' }}>
                            {stats.translated} / {stats.total}
                        </span>
                        <span>{t('keys_stat_translated', 'Keys Localized')} ({stats.percent}%)</span>
                        {stats.percent > 0 && (
                            <span style={{
                                fontSize: '9px',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                background: 'rgba(0, 255, 65, 0.15)',
                                color: '#00FF41',
                                border: '1px solid #00FF41'
                            }}>
                                MATRIX ACTIVE READY
                            </span>
                        )}
                    </div>

                    {/* Master Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                background: 'transparent',
                                color: 'rgba(255, 255, 255, 0.6)',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                letterSpacing: '0.06em',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.color = '#EBE3D6'}
                            onMouseOut={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
                        >
                            {t('btn_close', 'CLOSE')}
                        </button>

                        {/* Glowing "SAVE & APPLY MATRIX" writes directly to layla.db */}
                        <button
                            onClick={handleSaveAndApply}
                            disabled={isSaving}
                            style={{
                                padding: '10px 22px',
                                borderRadius: '8px',
                                border: '1px solid #00FF41',
                                background: 'rgba(0, 255, 65, 0.15)',
                                color: '#00FF41',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                letterSpacing: '0.1em',
                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 0 16px rgba(0, 255, 65, 0.3), inset 0 0 10px rgba(0, 255, 65, 0.1)',
                                transition: 'all 0.2s',
                                opacity: isSaving ? 0.6 : 1
                            }}
                            onMouseOver={e => {
                                if (!isSaving) {
                                    e.currentTarget.style.background = 'rgba(0, 255, 65, 0.28)';
                                    e.currentTarget.style.boxShadow = '0 0 24px rgba(0, 255, 65, 0.5)';
                                }
                            }}
                            onMouseOut={e => {
                                if (!isSaving) {
                                    e.currentTarget.style.background = 'rgba(0, 255, 65, 0.15)';
                                    e.currentTarget.style.boxShadow = '0 0 16px rgba(0, 255, 65, 0.3)';
                                }
                            }}
                        >
                            {isSaving ? <SvgSpinner size={15} /> : <SvgSaveDisk size={15} />}
                            <span>[ {t('btn_save_apply', 'SAVE & APPLY MATRIX')} ]</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TranslationStudio;
