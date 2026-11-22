/**
 * Copyright (C) 2026 Project M.I.K.A. & Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * ROM-09: PRESET ENGINE — Full-featured React modal for RisuAI (.risup / .risupreset),
 * CharX / RisuM (.charx / .risum), and SillyTavern (.json) presets & modules.
 * Supports boolean toggles, single-select dropdowns, multi-select checkboxes,
 * CBS live preview, prompt block editing, CharX lorebook/regex toggles, and 5 sampling parameters.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { NeonSelect } from './NeonSelect.jsx';
import {
    evaluateRisuCbs,
    formatSelectToggleDisplay,
    getActiveModuleRecord,
    getActivePresetRecord,
    isToggleMultiSelectEnabled,
    normalizePresetTemperature,
    parseMultiSelectIndices,
    parsePresetViewModel,
    probeBinaryPresetCapability,
    unwrapPresetObject
} from '../../utils/presetEngine.js';
import {
    deleteActiveModule,
    deleteActivePreset,
    importPastedJson,
    importPresetOrCharxFile,
    selectToggleOptionIndex,
    setActiveModuleId,
    setActivePresetId,
    setCharxItemState,
    setGroupDisplayMode,
    setInjectionPosition,
    setInjectionScope,
    setPresetHookEnabled,
    setPresetSamplingParam,
    setPromptBlocksEnabledMap,
    setRisuToggleValue,
    toggleCharxEnabled,
    toggleSelectMultiMode,
    updatePromptBlockContent,
    usePresetStore
} from './presetStore.js';

const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

const CharxChipGlyph = ({ size = 12 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}
    >
        <rect x="6" y="6" width="12" height="12" rx="2" />
        <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
        <line x1="9" y1="2" x2="9" y2="6" />
        <line x1="15" y1="2" x2="15" y2="6" />
        <line x1="9" y1="18" x2="9" y2="22" />
        <line x1="15" y1="18" x2="15" y2="22" />
        <line x1="2" y1="9" x2="6" y2="9" />
        <line x1="2" y1="15" x2="6" y2="15" />
        <line x1="18" y1="9" x2="22" y2="9" />
        <line x1="18" y1="15" x2="22" y2="15" />
    </svg>
);

const BoltPresetGlyph = ({ size = 12 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}
    >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

export const SwitchButton = ({ checked, onToggle, label }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked ? 'true' : 'false'}
        aria-label={label || 'Toggle'}
        onClick={onToggle}
        style={{
            position: 'relative',
            width: '46px',
            height: '24px',
            borderRadius: '4px',
            border: `1px solid ${checked ? 'var(--accent)' : 'rgba(0, 229, 255, 0.28)'}`,
            background: checked ? 'rgba(255, 16, 122, 0.2)' : 'rgba(0, 229, 255, 0.04)',
            boxShadow: checked
                ? '0 0 10px rgba(255, 16, 122, 0.35), inset 0 0 6px rgba(255, 16, 122, 0.12)'
                : 'inset 0 0 6px rgba(0, 229, 255, 0.05)',
            opacity: checked ? 1 : 0.72,
            cursor: 'pointer',
            flexShrink: 0,
            padding: 0,
            transition: 'opacity 0.16s ease, border-color 0.16s ease'
        }}
    >
        <span
            style={{
                position: 'absolute',
                top: '2px',
                left: checked ? '24px' : '2px',
                width: '18px',
                height: '18px',
                borderRadius: '2px',
                background: checked ? 'var(--accent)' : 'var(--text-dim)',
                boxShadow: checked ? '0 0 6px var(--accent)' : 'none',
                transition: 'transform 0.16s ease, background 0.16s ease'
            }}
        />
    </button>
);

export const ToggleFieldRow = ({
    field,
    sourcePrefix,
    multiSelectMap,
    onOpenSelectPopup,
    t
}) => {
    const isCharx = sourcePrefix === 'charx';

    if (field.kind === 'divider') {
        return (
            <div
                style={{
                    padding: '7px 12px',
                    background: 'rgba(255,16,122,0.1)',
                    borderBottom: '1px solid rgba(255,16,122,0.2)',
                    fontFamily: MONO,
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#00E5FF',
                    letterSpacing: '0.04em'
                }}
            >
                {field.label}
            </div>
        );
    }

    if (field.kind === 'boolean') {
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '12px 14px',
                    borderBottom: '1px solid rgba(0, 229, 255, 0.12)'
                }}
            >
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)', wordBreak: 'break-word' }}>
                        {field.label}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: MONO, marginTop: '2px' }}>
                        toggle_{field.key}{isCharx ? ' · charx' : ''}
                    </div>
                </div>
                <SwitchButton
                    checked={Boolean(field.value)}
                    label={field.label}
                    onToggle={() => setRisuToggleValue(sourcePrefix, field.key, !field.value)}
                />
            </div>
        );
    }

    if (field.kind === 'select') {
        const isMulti = isToggleMultiSelectEnabled(field, multiSelectMap, sourcePrefix);
        const options = field.options || [];
        const selectedIndices = parseMultiSelectIndices(field.value, options.length);
        const summaryText = formatSelectToggleDisplay(field);

        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '12px 14px',
                    borderBottom: '1px solid rgba(0, 229, 255, 0.12)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)', wordBreak: 'break-word' }}>
                            {field.label}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: MONO, marginTop: '2px' }}>
                            toggle_{field.key}{isCharx ? ' · charx' : ''}{isMulti ? ` · ${t('preset_ctrl_multi_enabled', 'Multi-select')}` : ''}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <button
                            type="button"
                            onClick={() => onOpenSelectPopup(sourcePrefix, field.key)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                minWidth: '148px',
                                maxWidth: '240px',
                                padding: '9px 12px',
                                borderRadius: '4px',
                                background: '#0B0914',
                                border: `1px solid ${selectedIndices.length > 1 ? '#00FF41' : 'rgba(0,229,255,0.4)'}`,
                                color: 'var(--text-main)',
                                fontSize: '12.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left'
                            }}
                        >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {summaryText}
                            </span>
                            <span style={{ fontSize: '9.5px', color: '#00E5FF', flexShrink: 0 }}>▼</span>
                        </button>
                        <button
                            type="button"
                            title={t('preset_ctrl_toggle_multi_title', 'Toggle multi-select mode')}
                            onClick={() => toggleSelectMultiMode(sourcePrefix, field.key)}
                            style={{
                                padding: '8px 10px',
                                borderRadius: '4px',
                                border: `1px solid ${isMulti ? '#FF107A' : 'rgba(0,229,255,0.3)'}`,
                                background: isMulti ? 'rgba(255,16,122,0.14)' : 'transparent',
                                color: isMulti ? '#FF107A' : 'var(--text-dim)',
                                fontFamily: MONO,
                                fontSize: '11px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {isMulti ? `☑ ${t('preset_ctrl_multi_short', 'MULTI')}` : `☐ ${t('preset_ctrl_multi_short', 'MULTI')}`}
                        </button>
                    </div>
                </div>

                {isMulti && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', paddingTop: '2px' }}>
                        {options.map((opt, idx) => {
                            const idxStr = String(idx);
                            const isChecked = selectedIndices.indexOf(idxStr) !== -1;
                            return (
                                <button
                                    key={idxStr}
                                    type="button"
                                    onClick={() => selectToggleOptionIndex(sourcePrefix, field.key, idxStr, true)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '6px 11px',
                                        borderRadius: '4px',
                                        border: `1px solid ${isChecked ? '#00E5FF' : 'rgba(0, 229, 255, 0.22)'}`,
                                        background: isChecked ? 'rgba(0,229,255,0.16)' : 'rgba(20,16,34,0.85)',
                                        color: isChecked ? '#00E5FF' : 'var(--text-dim)',
                                        fontSize: '12px',
                                        fontWeight: isChecked ? 800 : 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <span style={{ fontFamily: MONO, fontSize: '11.5px', color: isChecked ? '#00FF41' : 'var(--text-dim)' }}>
                                        {isChecked ? '☑' : '☐'}
                                    </span>
                                    <span>{opt}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    if (field.kind === 'text') {
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '12px 14px',
                    borderBottom: '1px solid rgba(0, 229, 255, 0.12)'
                }}
            >
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)', wordBreak: 'break-word' }}>
                        {field.label}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: MONO, marginTop: '2px' }}>
                        toggle_{field.key}{isCharx ? ' · charx' : ''}
                    </div>
                </div>
                <input
                    type="text"
                    value={String(field.value || '')}
                    onChange={e => setRisuToggleValue(sourcePrefix, field.key, e.target.value)}
                    style={{
                        width: '190px',
                        padding: '9px 12px',
                        borderRadius: '4px',
                        background: '#0B0914',
                        border: '1px solid rgba(0,229,255,0.35)',
                        color: 'var(--text-main)',
                        fontSize: '12.5px',
                        fontFamily: MONO
                    }}
                />
            </div>
        );
    }

    return null;
};

export const PromptBlockEditorDrawer = ({ item, toggleValues }) => {
    const evaluatedPreview = useMemo(
        () => evaluateRisuCbs(item.content || '', toggleValues || {}),
        [item.content, toggleValues]
    );
    const hasCbsMacros = /\{\{[\s\S]+?\}\}/.test(item.content || '');

    return (
        <div
            style={{
                background: '#050308',
                borderTop: '1px dashed rgba(0,229,255,0.28)',
                borderBottom: '1px solid rgba(0, 229, 255, 0.12)',
                padding: '10px 12px'
            }}
        >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '140px' }}>
                    <div style={{ fontSize: '10px', color: '#00E5FF', fontFamily: MONO, marginBottom: '3px' }}>
                        BLOCK_TITLE
                    </div>
                    <input
                        type="text"
                        value={item.name || ''}
                        onChange={e => updatePromptBlockContent(item.identifier, { name: e.target.value })}
                        style={{
                            width: '100%',
                            padding: '5px 8px',
                            borderRadius: '4px',
                            background: 'var(--card)',
                            border: '1px solid rgba(0,229,255,0.3)',
                            color: 'var(--text-main)',
                            fontSize: '11.5px',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>
                <div style={{ minWidth: '148px' }}>
                    <div style={{ fontSize: '10px', color: '#00E5FF', fontFamily: MONO, marginBottom: '3px' }}>
                        ROLE
                    </div>
                    <NeonSelect
                        size="sm"
                        value={item.role || 'system'}
                        accentColor="#00E5FF"
                        options={[
                            { value: 'system', label: 'system' },
                            { value: 'user', label: 'user' },
                            { value: 'assistant', label: 'assistant' }
                        ]}
                        onChange={val => updatePromptBlockContent(item.identifier, { role: val })}
                    />
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: '#00E5FF', fontFamily: MONO }}>
                    PROMPT_CONTENT (Auto-saves)
                </span>
                <span style={{ fontSize: '10px', color: '#00FF41', fontFamily: MONO }}>
                    {(item.content || '').length.toLocaleString()} chars
                </span>
            </div>
            <textarea
                value={item.content || ''}
                onChange={e => updatePromptBlockContent(item.identifier, { content: e.target.value })}
                style={{
                    width: '100%',
                    height: '140px',
                    padding: '8px',
                    borderRadius: '4px',
                    background: '#050308',
                    border: '1px solid rgba(0,229,255,0.28)',
                    color: 'var(--text-main)',
                    fontFamily: MONO,
                    fontSize: '11.5px',
                    lineHeight: 1.5,
                    resize: 'vertical',
                    boxSizing: 'border-box'
                }}
            />
            {hasCbsMacros && (
                <details style={{ marginTop: '4px' }}>
                    <summary style={{ cursor: 'pointer', fontSize: '10.5px', color: 'var(--text-dim)', fontFamily: MONO }}>
                        &gt; View CBS Evaluated Output ({evaluatedPreview.length.toLocaleString()} chars active)
                    </summary>
                    <pre
                        style={{
                            marginTop: '4px',
                            maxHeight: '140px',
                            overflow: 'auto',
                            padding: '8px',
                            borderRadius: '4px',
                            background: '#050308',
                            border: '1px solid rgba(0, 229, 255, 0.16)',
                            color: 'var(--text-main)',
                            fontFamily: MONO,
                            fontSize: '10.5px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                        }}
                    >
                        {evaluatedPreview || '(Currently evaluates to empty with current toggle states)'}
                    </pre>
                </details>
            )}
        </div>
    );
};

export const PresetCtrlModal = ({ isOpen, onClose, showToast }) => {
    const { t } = useLanguage();
    const { store, stats } = usePresetStore();
    const [tab, setTab] = useState('controls');
    const [search, setSearch] = useState('');
    const [showPasteBox, setShowPasteBox] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [copied, setCopied] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState({
        risu_toggles: false,
        charx_toggles: false,
        charx_lore: false,
        charx_regex: false,
        prompt_blocks: true
    });
    const [expandedBlockIds, setExpandedBlockIds] = useState({});
    const [selectDialog, setSelectDialog] = useState(null); // { sourcePrefix, key }

    const presetFileInputRef = useRef(null);
    const charxFileInputRef = useRef(null);
    const copyTimerRef = useRef(null);

    useEffect(() => {
        return () => {
            if (copyTimerRef.current) {
                clearTimeout(copyTimerRef.current);
                copyTimerRef.current = null;
            }
        };
    }, []);

    const binaryCap = useMemo(() => probeBinaryPresetCapability(), []);
    const activePresetRec = useMemo(() => getActivePresetRecord(store), [store]);
    const activeModRec = useMemo(() => getActiveModuleRecord(store), [store]);
    const charxEnabled = store.charxEnabled !== false;

    const vm = useMemo(() => {
        if (!isOpen) return null;
        if (!activePresetRec && !(charxEnabled && activeModRec)) return null;
        return parsePresetViewModel(activePresetRec, charxEnabled ? activeModRec : null);
    }, [isOpen, activePresetRec, activeModRec, charxEnabled]);

    const charxVm = vm ? vm.charxVm : null;

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKeyDown = e => {
            if (e.key === 'Escape') {
                if (selectDialog) setSelectDialog(null);
                else if (typeof onClose === 'function') onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, selectDialog, onClose]);

    if (!isOpen) return null;

    const q = search.trim().toLowerCase();

    const toggleSection = secKey => {
        setCollapsedSections(prev => ({ ...prev, [secKey]: !prev[secKey] }));
    };

    const toggleBlockExpand = id => {
        setExpandedBlockIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleFileImport = async (e, preferCharx) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        try {
            setErrorMsg('');
            const res = await importPresetOrCharxFile(file, preferCharx);
            if (typeof showToast === 'function') {
                showToast(
                    res.kind === 'charx'
                        ? `${t('rom09_toast_loaded_charx', '🧩 Loaded CharX/Module:')} ${res.name}`
                        : `${t('rom09_toast_loaded_preset', '⚡ Loaded Preset:')} ${res.name}`
                );
            }
        } catch (err) {
            setErrorMsg((preferCharx ? 'CharX/Module decode failed: ' : 'Preset decode failed: ') + (err?.message || String(err)));
        }
    };

    const handleApplyPaste = () => {
        try {
            setErrorMsg('');
            const res = importPastedJson(pasteText);
            setPasteText('');
            setShowPasteBox(false);
            if (typeof showToast === 'function') {
                showToast(
                    res.kind === 'charx'
                        ? `${t('rom09_toast_loaded_charx', '🧩 Loaded CharX/Module:')} ${res.name}`
                        : `${t('rom09_toast_loaded_preset', '⚡ Loaded Preset:')} ${res.name}`
                );
            }
        } catch (err) {
            setErrorMsg('Failed to parse JSON: ' + (err?.message || String(err)));
        }
    };

    const handleCopyCompiled = () => {
        if (!vm || !vm.compiledPrompt || !navigator.clipboard) return;
        navigator.clipboard
            .writeText(vm.compiledPrompt)
            .then(() => {
                setCopied(true);
                if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
                copyTimerRef.current = setTimeout(() => {
                    setCopied(false);
                    copyTimerRef.current = null;
                }, 1400);
            })
            .catch(() => {});
    };

    const handleNumericParamChange = (paramKey, rawVal) => {
        const trimmed = String(rawVal).trim();
        if (trimmed === '') {
            setPresetSamplingParam(paramKey, undefined);
            return;
        }
        const num = Number(trimmed);
        if (!Number.isFinite(num)) return;
        setPresetSamplingParam(paramKey, num);
    };

    const interactiveTogglesCount = vm
        ? vm.risuToggles.filter(x => x.kind !== 'divider').length +
          (charxVm ? charxVm.toggles.filter(x => x.kind !== 'divider').length : 0)
        : 0;

    // Resolve active selection modal target
    let dialogField = null;
    if (selectDialog && vm) {
        const list =
            selectDialog.sourcePrefix === 'charx' && charxVm
                ? charxVm.toggles
                : vm.risuToggles;
        dialogField = (list || []).find(item => item.key === selectDialog.key) || null;
    }

    const activeRawPreset = activePresetRec ? unwrapPresetObject(activePresetRec.data || {}) : {};
    const presetFormat = vm && activePresetRec ? vm.format : null;
    const normalizedTemp = activePresetRec ? normalizePresetTemperature(activeRawPreset, presetFormat) : undefined;
    const displayTemp = normalizedTemp !== undefined ? normalizedTemp : '';
    const maxTokensKey = presetFormat === 'risuai' ? 'maxResponse' : 'openai_max_tokens';
    const rawMaxTokensVal =
        typeof activeRawPreset[maxTokensKey] === 'number' && Number.isFinite(activeRawPreset[maxTokensKey])
            ? activeRawPreset[maxTokensKey]
            : '';

    const sectionHeaderStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        padding: '8px 2px 6px',
        marginTop: '4px',
        fontFamily: MONO,
        fontSize: '11px',
        fontWeight: 900,
        color: '#00E5FF',
        letterSpacing: '0.06em',
        cursor: 'pointer',
        userSelect: 'none'
    };

    const cardStyle = {
        background: 'rgba(0, 229, 255, 0.03)',
        border: '1px solid rgba(0, 229, 255, 0.2)',
        borderRadius: '4px',
        boxShadow: 'inset 0 0 8px rgba(0, 229, 255, 0.05)',
        marginBottom: '12px'
    };

    const miniBtnStyle = {
        padding: '8px 12px',
        borderRadius: '4px',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'rgba(0, 229, 255, 0.28)',
        background: 'rgba(0, 229, 255, 0.06)',
        boxShadow: 'inset 0 0 6px rgba(0, 229, 255, 0.05)',
        color: 'var(--text-main)',
        fontFamily: MONO,
        fontSize: '11px',
        fontWeight: 800,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        flexShrink: 0,
        whiteSpace: 'nowrap'
    };

    const numInputStyle = {
        width: '124px',
        padding: '8px 10px',
        borderRadius: '4px',
        background: '#0B0914',
        border: '1px solid rgba(0, 229, 255, 0.3)',
        boxShadow: 'inset 0 0 6px rgba(0, 229, 255, 0.05)',
        color: 'var(--text-main)',
        fontFamily: MONO,
        fontSize: '12.5px'
    };

    return (
        <div
            onClick={e => {
                if (e.target === e.currentTarget && typeof onClose === 'function') onClose();
            }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 100110,
                background: 'rgba(5, 3, 8, 0.86)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px'
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '720px',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#0B0914',
                    border: '1px solid #FF107A',
                    borderRadius: '12px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 24px rgba(255,16,122,0.22)',
                    overflow: 'hidden',
                    color: 'var(--text-main)'
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        padding: '12px 14px',
                        background: 'linear-gradient(90deg, rgba(255,16,122,0.16), rgba(0,229,255,0.1))',
                        borderBottom: '1px solid rgba(255,16,122,0.32)'
                    }}
                >
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: MONO, fontSize: '14.5px', fontWeight: 900, color: '#00E5FF', letterSpacing: '0.06em' }}>
                            ◈ {t('preset_ctrl_title', 'PRESET ENGINE')}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginTop: '2px' }}>
                            {t('preset_ctrl_subtitle', 'RisuAI Preset (.risup) & Module (.charx / .risum) · Auto-saved')}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            ...miniBtnStyle,
                            padding: '6px 11px',
                            borderColor: 'rgba(0,229,255,0.4)',
                            color: '#00E5FF',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}
                    >
                        [ X ]
                    </button>
                </div>

                {/* Live Bridge Status Strip */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                        padding: '6px 14px',
                        background: store.sdkHookEnabled ? 'rgba(0,255,65,0.08)' : 'rgba(255,16,122,0.1)',
                        borderBottom: '1px solid rgba(0, 229, 255, 0.16)',
                        fontFamily: MONO,
                        fontSize: '10px',
                        color: store.sdkHookEnabled ? '#00FF41' : '#FF3333'
                    }}
                >
                    <span>
                        BRIDGE: {store.sdkHookEnabled ? 'ACTIVE' : 'PAUSED'} · SAVED: {stats.storageEngine}
                    </span>
                    <span>
                        INJECTED: {stats.interceptedCount}x{stats.lastHookedAt ? ` (${stats.lastHookedAt})` : ''}
                    </span>
                </div>

                {/* Compact Single-Row Slot 1 (.risup / .json) & Slot 2 (.charx / .risum) */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        padding: '10px 14px',
                        background: 'rgba(11, 9, 20, 0.92)',
                        borderBottom: '1px solid rgba(0, 229, 255, 0.16)'
                    }}
                >
                    {/* Slot 1: PRESET */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: MONO, fontSize: '10px', fontWeight: 900, color: '#FF107A', flexShrink: 0, whiteSpace: 'nowrap' }}>
                            {BoltPresetGlyph({ size: 11 })} PRESET:
                        </span>
                        {store.presets.length > 0 ? (
                            <NeonSelect
                                size="sm"
                                style={{ flex: '1 1 145px' }}
                                value={activePresetRec ? activePresetRec.id : ''}
                                accentColor="#FF107A"
                                options={store.presets.map(p => ({
                                    value: p.id,
                                    label:
                                        p.data && typeof p.data.name === 'string' && p.data.name.trim()
                                            ? `${p.data.name.trim()} (${p.fileName})`
                                            : p.fileName
                                }))}
                                onChange={val => setActivePresetId(val)}
                            />
                        ) : (
                            <span style={{ flex: 1, minWidth: 0, fontFamily: MONO, fontSize: '11px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {t('preset_ctrl_no_preset', 'No preset loaded')}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => presetFileInputRef.current && presetFileInputRef.current.click()}
                            style={{
                                ...miniBtnStyle,
                                background: '#FF107A',
                                borderColor: '#FF107A',
                                color: 'var(--text-main)'
                            }}
                        >
                            {t('btn_import_short', '+ IMPORT')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowPasteBox(prev => !prev)}
                            style={{
                                ...miniBtnStyle,
                                borderColor: 'rgba(0,229,255,0.4)',
                                color: '#00E5FF'
                            }}
                        >
                            {t('btn_paste_short', 'PASTE')}
                        </button>
                        {activePresetRec && (
                            <button
                                type="button"
                                onClick={deleteActivePreset}
                                style={{
                                    ...miniBtnStyle,
                                    borderColor: 'rgba(255, 51, 51,0.5)',
                                    color: '#FF3333',
                                    background: 'rgba(255, 51, 51,0.1)'
                                }}
                            >
                                {t('btn_delete_short', 'DEL')}
                            </button>
                        )}
                        <input
                            ref={presetFileInputRef}
                            type="file"
                            style={{ display: 'none' }}
                            onChange={e => handleFileImport(e, false)}
                        />
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: '9.5px', color: 'var(--text-dim)', lineHeight: 1.2, paddingLeft: '2px' }}>
                        {t('preset_ctrl_supported_preset_full', 'Supported: .risup · .risupreset · .json (RisuAI & SillyTavern)')}
                    </div>

                    {/* Slot 2: CHARX / RISUM */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginTop: '2px' }}>
                        <span style={{ fontFamily: MONO, fontSize: '10px', fontWeight: 900, color: '#00E5FF', flexShrink: 0, whiteSpace: 'nowrap' }}>
                            {CharxChipGlyph({ size: 11 })} CHARX:
                        </span>
                        {store.modules.length > 0 ? (
                            <React.Fragment>
                                <NeonSelect
                                    size="sm"
                                    style={{ flex: '1 1 145px' }}
                                    value={activeModRec ? activeModRec.id : ''}
                                    accentColor="#00E5FF"
                                    options={store.modules.map(m => ({
                                        value: m.id,
                                        label:
                                            m.data && typeof m.data.name === 'string' && m.data.name.trim()
                                                ? `${m.data.name.trim()} (${m.fileName})`
                                                : m.fileName
                                    }))}
                                    onChange={val => setActiveModuleId(val)}
                                />
                                <button
                                    type="button"
                                    onClick={toggleCharxEnabled}
                                    style={{
                                        ...miniBtnStyle,
                                        borderColor: charxEnabled ? '#00FF41' : 'rgba(0, 229, 255, 0.25)',
                                        color: charxEnabled ? '#00FF41' : 'var(--text-dim)',
                                        background: charxEnabled ? 'rgba(0,255,65,0.12)' : 'transparent'
                                    }}
                                >
                                    {charxEnabled ? 'ON' : 'OFF'}
                                </button>
                            </React.Fragment>
                        ) : (
                            <span style={{ flex: 1, minWidth: 0, fontFamily: MONO, fontSize: '11px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {t('preset_ctrl_no_module', 'No module linked')}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => charxFileInputRef.current && charxFileInputRef.current.click()}
                            style={{
                                ...miniBtnStyle,
                                borderColor: '#00E5FF',
                                color: '#00E5FF',
                                background: 'rgba(0,229,255,0.14)'
                            }}
                        >
                            {t('btn_import_short', '+ IMPORT')}
                        </button>
                        {activeModRec && (
                            <button
                                type="button"
                                onClick={deleteActiveModule}
                                style={{
                                    ...miniBtnStyle,
                                    borderColor: 'rgba(255, 51, 51,0.5)',
                                    color: '#FF3333',
                                    background: 'rgba(255, 51, 51,0.1)'
                                }}
                            >
                                {t('btn_delete_short', 'DEL')}
                            </button>
                        )}
                        <input
                            ref={charxFileInputRef}
                            type="file"
                            style={{ display: 'none' }}
                            onChange={e => handleFileImport(e, true)}
                        />
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: '9.5px', color: 'var(--text-dim)', lineHeight: 1.2, paddingLeft: '2px' }}>
                        {t('preset_ctrl_supported_charx_full', 'Supported: .charx · .risum · .json (RisuAI Module · Lorebook & Regex)')}
                    </div>
                </div>

                {/* Paste JSON Box */}
                {showPasteBox && (
                    <div style={{ background: 'var(--card)', borderBottom: '1px solid rgba(0,229,255,0.25)', padding: '10px 14px' }}>
                        <div style={{ fontSize: '10.5px', color: '#00E5FF', marginBottom: '4px', fontFamily: MONO }}>
                            &gt; PASTE_PRESET_OR_MODULE_JSON (Risu Preset / Module / Character Card / SillyTavern JSON)
                        </div>
                        <textarea
                            value={pasteText}
                            onChange={e => setPasteText(e.target.value)}
                            placeholder='{"presetVersion": 2, "type": "preset", "preset": { ... }}'
                            style={{
                                width: '100%',
                                height: '84px',
                                padding: '8px',
                                borderRadius: '4px',
                                background: '#050308',
                                border: '1px solid rgba(0,229,255,0.3)',
                                color: 'var(--text-main)',
                                fontFamily: MONO,
                                fontSize: '11px',
                                marginBottom: '4px',
                                boxSizing: 'border-box'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setShowPasteBox(false)} style={miniBtnStyle}>
                                {t('btn_cancel', 'CANCEL')}
                            </button>
                            <button
                                type="button"
                                onClick={handleApplyPaste}
                                style={{ ...miniBtnStyle, background: '#FF107A', borderColor: '#FF107A', color: 'var(--text-main)' }}
                            >
                                {t('btn_load_json', 'LOAD JSON')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                {vm && (
                    <div
                        style={{
                            display: 'flex',
                            borderBottom: '1px solid rgba(0, 229, 255, 0.18)',
                            background: '#050308'
                        }}
                    >
                        {[
                            { id: 'controls', label: `> TOGGLES (${interactiveTogglesCount || vm.totalCount})` },
                            { id: 'params', label: '> ENGINE_LINK' },
                            { id: 'prompt', label: `> COMPILED (${vm.activePrompts.length})` }
                        ].map(tb => {
                            const active = tab === tb.id;
                            return (
                                <button
                                    key={tb.id}
                                    type="button"
                                    onClick={() => setTab(tb.id)}
                                    style={{
                                        flex: 1,
                                        minWidth: 0,
                                        padding: '10px 6px',
                                        borderTop: 'none',
                                        borderLeft: 'none',
                                        borderRight: 'none',
                                        borderBottom: `2px solid ${active ? '#FF107A' : 'transparent'}`,
                                        background: active ? 'rgba(255,16,122,0.1)' : 'transparent',
                                        color: active ? '#FF107A' : 'var(--text-dim)',
                                        fontFamily: MONO,
                                        fontSize: '10.5px',
                                        fontWeight: 800,
                                        whiteSpace: 'nowrap',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {tb.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
                    {!binaryCap.supported && (
                        <div
                            style={{
                                padding: '9px 12px',
                                borderRadius: '4px',
                                background: 'rgba(255, 69, 0, 0.1)',
                                border: '1px solid rgba(255, 69, 0, 0.45)',
                                boxShadow: 'inset 0 0 8px rgba(255, 69, 0, 0.08)',
                                color: '#FF4500',
                                fontSize: '10.5px',
                                marginBottom: '10px',
                                fontFamily: MONO,
                                lineHeight: 1.45
                            }}
                        >
                            &gt; HOST_TOO_OLD // WebView lacks {!binaryCap.hasDeflateRaw ? 'DecompressionStream("deflate-raw")' : 'WebCrypto AES-GCM'} (&lt; Chromium 103). SillyTavern .json &amp; .risum work normally; update Android System WebView for .risup / .charx.
                        </div>
                    )}
                    {errorMsg && (
                        <div
                            style={{
                                padding: '12px 14px',
                                borderRadius: '4px',
                                background: 'rgba(255,16,122,0.14)',
                                border: '1px solid rgba(255,16,122,0.45)',
                                color: '#FF3333',
                                fontSize: '11.5px',
                                marginBottom: '10px',
                                fontFamily: MONO
                            }}
                        >
                            {errorMsg}
                        </div>
                    )}

                    {!vm ? (
                        <div
                            style={{
                                padding: '26px 14px',
                                textAlign: 'center',
                                border: '1px dashed rgba(0,229,255,0.28)',
                                borderRadius: '4px',
                                background: 'rgba(0,229,255,0.04)'
                            }}
                        >
                            <div style={{ fontFamily: MONO, fontSize: '12.5px', fontWeight: 900, color: '#00E5FF', marginBottom: '4px' }}>
                                {t('preset_ctrl_empty_title', 'NO_PRESET_OR_CHARX_LOADED')}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.55 }}>
                                {t(
                                    'preset_ctrl_empty_desc',
                                    'Tap + IMPORT above to load a RisuAI preset (.risup / .risupreset / .json) and/or a CharX module (.charx / .risum). Both persist automatically inside [ROM-09].'
                                )}
                            </div>
                        </div>
                    ) : tab === 'controls' ? (
                        <div>
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={t(
                                    'preset_ctrl_search_placeholder',
                                    'Filter preset toggles, .charx lorebook, regex scripts, or prompt blocks...'
                                )}
                                className="search-input"
                                style={{
                                    width: '100%',
                                    padding: '11px 14px',
                                    borderRadius: '4px',
                                    background: '#0B0914',
                                    border: '1px solid rgba(0,229,255,0.32)',
                                    color: 'var(--text-main)',
                                    fontSize: '13px',
                                    fontFamily: MONO,
                                    marginBottom: '12px',
                                    boxSizing: 'border-box'
                                }}
                            />

                            {/* 1. Risu Preset Toggles */}
                            {vm.risuToggles.length > 0 && (() => {
                                const interactiveCount = vm.risuToggles.filter(x => x.kind !== 'divider').length;
                                const show = !collapsedSections.risu_toggles || q.length > 0;
                                const visibleFields = vm.risuToggles.filter(f =>
                                    !q ||
                                    f.label.toLowerCase().indexOf(q) !== -1 ||
                                    f.key.toLowerCase().indexOf(q) !== -1
                                );
                                return (
                                    <div>
                                        <div style={sectionHeaderStyle} onClick={() => toggleSection('risu_toggles')}>
                                            <span>&gt; RISU_PRESET_OPTIONS ({interactiveCount})</span>
                                            <span style={{ ...miniBtnStyle, padding: '2px 7px' }}>
                                                {show ? 'HIDE ▲' : 'SHOW ▼'}
                                            </span>
                                        </div>
                                        {show && (
                                            <div style={cardStyle}>
                                                {visibleFields.map((f, idx) => (
                                                    <ToggleFieldRow
                                                        key={`risu_${f.key}_${idx}`}
                                                        field={f}
                                                        sourcePrefix="risu"
                                                        multiSelectMap={store.multiSelectToggles}
                                                        onOpenSelectPopup={(src, key) => setSelectDialog({ sourcePrefix: src, key })}
                                                        t={t}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* 2. CharX Module Toggles */}
                            {charxVm && charxVm.toggles.length > 0 && (() => {
                                const interactiveCount = charxVm.toggles.filter(x => x.kind !== 'divider').length;
                                const show = !collapsedSections.charx_toggles || q.length > 0;
                                const visibleFields = charxVm.toggles.filter(f =>
                                    !q ||
                                    f.label.toLowerCase().indexOf(q) !== -1 ||
                                    f.key.toLowerCase().indexOf(q) !== -1
                                );
                                return (
                                    <div>
                                        <div style={sectionHeaderStyle} onClick={() => toggleSection('charx_toggles')}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{CharxChipGlyph({ size: 12 })} &gt; CHARX_MODULE_OPTIONS ({interactiveCount})</span>
                                            <span style={{ ...miniBtnStyle, padding: '2px 7px' }}>
                                                {show ? 'HIDE ▲' : 'SHOW ▼'}
                                            </span>
                                        </div>
                                        {show && (
                                            <div style={cardStyle}>
                                                {visibleFields.map((f, idx) => (
                                                    <ToggleFieldRow
                                                        key={`cx_${f.key}_${idx}`}
                                                        field={f}
                                                        sourcePrefix="charx"
                                                        multiSelectMap={store.multiSelectToggles}
                                                        onOpenSelectPopup={(src, key) => setSelectDialog({ sourcePrefix: src, key })}
                                                        t={t}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* 3. CharX Lorebook & Prompts */}
                            {charxVm && (charxVm.promptBlocks.length + charxVm.loreItems.length) > 0 && (() => {
                                const totalItems = charxVm.promptBlocks.length + charxVm.loreItems.length;
                                const activeCount =
                                    charxVm.alwaysActiveLore.length +
                                    charxVm.keywordLore.length +
                                    charxVm.activePromptBlocks.length;
                                const show = !collapsedSections.charx_lore || q.length > 0;
                                return (
                                    <div>
                                        <div style={sectionHeaderStyle} onClick={() => toggleSection('charx_lore')}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>{CharxChipGlyph({ size: 12 })} &gt; CHARX_LOREBOOK_&amp;_PROMPTS ({activeCount} / {totalItems} ACTIVE)</span>
                                            <span style={{ ...miniBtnStyle, padding: '2px 7px' }}>
                                                {show ? 'HIDE ▲' : 'SHOW ▼'}
                                            </span>
                                        </div>
                                        {show && (
                                            <div style={cardStyle}>
                                                {charxVm.promptBlocks.map((pb, pbIdx) => {
                                                    if (q && pb.name.toLowerCase().indexOf(q) === -1 && (pb.content || '').toLowerCase().indexOf(q) === -1) {
                                                        return null;
                                                    }
                                                    const expanded = Boolean(expandedBlockIds[pb.identifier]);
                                                    return (
                                                        <div key={`${pb.identifier}_${pbIdx}`}>
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    gap: '8px',
                                                                    padding: '12px 14px',
                                                                    borderBottom: '1px solid rgba(0, 229, 255, 0.12)'
                                                                }}
                                                            >
                                                                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => toggleBlockExpand(pb.identifier)}>
                                                                    <div style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <span style={{ color: '#00E5FF', fontFamily: MONO, fontSize: '10px' }}>[MODULE]</span>
                                                                        <span>{pb.shortLabel || pb.name}</span>
                                                                        <span style={{ fontSize: '10px', color: '#00E5FF', fontFamily: MONO }}>{expanded ? '[▲]' : '[▼]'}</span>
                                                                    </div>
                                                                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: MONO, marginTop: '2px' }}>
                                                                        {pb.role} · {(pb.content || '').length.toLocaleString()} chars
                                                                    </div>
                                                                </div>
                                                                <SwitchButton
                                                                    checked={pb.enabled}
                                                                    label={pb.name}
                                                                    onToggle={() => setCharxItemState('prompt', pb.identifier, !pb.enabled)}
                                                                />
                                                            </div>
                                                            {expanded && (
                                                                <div style={{ background: '#050308', padding: '10px 12px', borderBottom: '1px solid rgba(0, 229, 255, 0.12)' }}>
                                                                    <pre style={{ margin: 0, maxHeight: '160px', overflow: 'auto', fontFamily: MONO, fontSize: '10.5px', color: 'var(--text-main)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                                        {pb.evaluatedContent || pb.content || ''}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {charxVm.loreItems.map((item, loreIdx) => {
                                                    const hay = `${item.name} ${(item.keys || []).join(' ')} ${item.content || ''}`.toLowerCase();
                                                    if (q && hay.indexOf(q) === -1) return null;
                                                    const expanded = Boolean(expandedBlockIds[item.identifier]);
                                                    const isForcedAlways = Boolean(activeModRec?.data?.__laylaForceAlwaysLoreIds?.[item.identifier]);
                                                    return (
                                                        <div key={`${item.identifier}_${loreIdx}`}>
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    gap: '8px',
                                                                    padding: '12px 14px',
                                                                    borderBottom: '1px solid rgba(0, 229, 255, 0.12)'
                                                                }}
                                                            >
                                                                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => toggleBlockExpand(item.identifier)}>
                                                                    <div style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                                                        <span style={{ color: item.alwaysActive ? '#00FF41' : '#FFD700', fontFamily: MONO, fontSize: '10px' }}>
                                                                            {item.alwaysActive ? '[ALWAYS]' : '[KEYWORD]'}
                                                                        </span>
                                                                        <span>{item.name}</span>
                                                                        <span style={{ fontSize: '10px', color: '#00E5FF', fontFamily: MONO }}>{expanded ? '[▲]' : '[▼]'}</span>
                                                                    </div>
                                                                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: MONO, marginTop: '2px' }}>
                                                                        {(item.keys || []).length > 0 ? `Keys: ${item.keys.join(', ')}` : 'Always injected'}
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                                    {!item.nativeAlways && (
                                                                        <button
                                                                            type="button"
                                                                            title="Force Always Active"
                                                                            onClick={() => setCharxItemState('lore-always', item.identifier, !isForcedAlways)}
                                                                            style={{
                                                                                ...miniBtnStyle,
                                                                                padding: '3px 6px',
                                                                                borderColor: isForcedAlways ? '#00FF41' : 'rgba(0, 229, 255, 0.25)',
                                                                                color: isForcedAlways ? '#00FF41' : 'var(--text-dim)'
                                                                            }}
                                                                        >
                                                                            PIN
                                                                        </button>
                                                                    )}
                                                                    <SwitchButton
                                                                        checked={item.enabled}
                                                                        label={item.name}
                                                                        onToggle={() => setCharxItemState('lore', item.identifier, !item.enabled)}
                                                                    />
                                                                </div>
                                                            </div>
                                                            {expanded && (
                                                                <div style={{ background: '#050308', padding: '10px 12px', borderBottom: '1px solid rgba(0, 229, 255, 0.12)' }}>
                                                                    <pre style={{ margin: 0, maxHeight: '160px', overflow: 'auto', fontFamily: MONO, fontSize: '10.5px', color: 'var(--text-main)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                                        {item.evaluatedContent || item.content || ''}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* 4. CharX Regex Scripts */}
                            {charxVm && charxVm.regexItems.length > 0 && (() => {
                                const show = !collapsedSections.charx_regex || q.length > 0;
                                return (
                                    <div>
                                        <div style={sectionHeaderStyle} onClick={() => toggleSection('charx_regex')}>
                                            <span>&gt; CHARX_REGEX_SCRIPTS ({charxVm.activeRegex.length} / {charxVm.regexItems.length} ACTIVE)</span>
                                            <span style={{ ...miniBtnStyle, padding: '2px 7px' }}>
                                                {show ? 'HIDE ▲' : 'SHOW ▼'}
                                            </span>
                                        </div>
                                        {show && (
                                            <div style={cardStyle}>
                                                <div style={{ padding: '7px 14px', borderBottom: '1px solid rgba(0, 229, 255, 0.14)', background: 'rgba(0, 229, 255, 0.04)', fontFamily: MONO, fontSize: '10px', color: 'var(--text-dim)' }}>
                                                    // ENVELOPE_GUARD: GachaSwipe &lt;send_image&gt;, &lt;reply&gt;, and &lt;dream_state&gt; tags are automatically shielded during editoutput.
                                                </div>
                                                {charxVm.regexItems.map((rx, rxIdx) => {
                                                    const hay = `${rx.comment} ${rx.in} ${rx.type}`.toLowerCase();
                                                    if (q && hay.indexOf(q) === -1) return null;
                                                    return (
                                                        <div
                                                            key={`${rx.id}_${rxIdx}`}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                gap: '10px',
                                                                padding: '12px 14px',
                                                                borderBottom: '1px solid rgba(0, 229, 255, 0.12)'
                                                            }}
                                                        >
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: '12px', fontWeight: 700 }}>
                                                                    {rx.comment}
                                                                </div>
                                                                <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: MONO, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    [{rx.type}] /{rx.in}/{rx.flag || 'g'}
                                                                </div>
                                                            </div>
                                                            <SwitchButton
                                                                checked={rx.enabled}
                                                                label={rx.comment}
                                                                onToggle={() => setCharxItemState('regex', rx.id, !rx.enabled)}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* 5. Collapsible Prompt Blocks (Preset Template / SillyTavern Blocks) */}
                            {vm.groups.length > 0 && (() => {
                                const show = !collapsedSections.prompt_blocks || q.length > 0;
                                return (
                                    <div>
                                        <div style={sectionHeaderStyle} onClick={() => toggleSection('prompt_blocks')}>
                                            <span>&gt; PROMPT_BLOCKS ({vm.presetBlockCount})</span>
                                            <span style={{ ...miniBtnStyle, padding: '2px 7px' }}>
                                                {show ? 'HIDE ▲' : 'SHOW ▼'}
                                            </span>
                                        </div>
                                        {show &&
                                            vm.groups.map(g => {
                                                const visibleItems = g.items.filter(it =>
                                                    !q ||
                                                    it.name.toLowerCase().indexOf(q) !== -1 ||
                                                    (it.content || '').toLowerCase().indexOf(q) !== -1
                                                );
                                                if (visibleItems.length === 0) return null;

                                                const mode =
                                                    store.groupModes[g.id] ||
                                                    (g.isCategorized && g.items.length >= 2 ? g.suggestedMode : 'toggles');

                                                if (g.isCategorized && mode === 'dropdown' && !q) {
                                                    const enabledItems = g.items.filter(x => x.enabled);
                                                    const currentVal =
                                                        enabledItems.length === 0
                                                            ? '__NONE__'
                                                            : enabledItems.length === 1
                                                                ? enabledItems[0].identifier
                                                                : '__MULTI__';

                                                    return (
                                                        <div key={g.id} style={{ ...cardStyle, padding: '10px 12px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                                                                <span style={{ fontFamily: MONO, fontSize: '11px', fontWeight: 800, color: '#00E5FF' }}>
                                                                    [{g.title}] ({enabledItems.length}/{g.items.length})
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setGroupDisplayMode(g.id, 'toggles')}
                                                                    style={{ ...miniBtnStyle, padding: '3px 7px', borderColor: 'rgba(255,16,122,0.4)', color: '#FF107A' }}
                                                                >
                                                                    MULTI-CHECK ▾
                                                                </button>
                                                            </div>
                                                            <NeonSelect
                                                                size="sm"
                                                                value={currentVal}
                                                                accentColor="#00E5FF"
                                                                options={[
                                                                    { value: '__NONE__', label: '-- None (Disabled) --' },
                                                                    ...(currentVal === '__MULTI__'
                                                                        ? [{ value: '__MULTI__', label: `-- Multiple Active (${enabledItems.length}) --` }]
                                                                        : []),
                                                                    ...g.items.map(it => ({
                                                                        value: it.identifier,
                                                                        label: it.shortLabel
                                                                    }))
                                                                ]}
                                                                onChange={val => {
                                                                    if (val === '__MULTI__') return;
                                                                    const patch = {};
                                                                    g.items.forEach(it => {
                                                                        patch[it.identifier] = val === it.identifier;
                                                                    });
                                                                    setPromptBlocksEnabledMap(patch);
                                                                }}
                                                            />
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={g.id} style={cardStyle}>
                                                        {g.isCategorized && (
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    padding: '7px 12px',
                                                                    background: 'rgba(0,229,255,0.06)',
                                                                    borderBottom: '1px solid rgba(0, 229, 255, 0.12)'
                                                                }}
                                                            >
                                                                <span style={{ fontFamily: MONO, fontSize: '11px', fontWeight: 800, color: '#00E5FF' }}>
                                                                    [{g.title}]
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setGroupDisplayMode(g.id, 'dropdown')}
                                                                    style={{ ...miniBtnStyle, padding: '3px 7px', borderColor: 'rgba(0,229,255,0.35)', color: '#00E5FF' }}
                                                                >
                                                                    DROPDOWN ▾
                                                                </button>
                                                            </div>
                                                        )}
                                                        {visibleItems.map((it, itIdx) => {
                                                            const expanded = Boolean(expandedBlockIds[it.identifier]);
                                                            return (
                                                                <div key={`${it.identifier}_${itIdx}`}>
                                                                    <div
                                                                        style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'space-between',
                                                                            gap: '10px',
                                                                            padding: '12px 14px',
                                                                            borderBottom: '1px solid rgba(0, 229, 255, 0.12)'
                                                                        }}
                                                                    >
                                                                        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => toggleBlockExpand(it.identifier)}>
                                                                            <div style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                <span>{it.shortLabel || it.name}</span>
                                                                            </div>
                                                                            <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: MONO, marginTop: '2px' }}>
                                                                                {it.role} · {(it.content || '').length.toLocaleString()} chars
                                                                            </div>
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleBlockExpand(it.identifier)}
                                                                                style={{
                                                                                    ...miniBtnStyle,
                                                                                    padding: '4px 8px',
                                                                                    borderColor: expanded ? '#FF107A' : 'rgba(0,229,255,0.35)',
                                                                                    color: expanded ? '#FF107A' : '#00E5FF',
                                                                                    background: expanded ? 'rgba(255,16,122,0.12)' : 'rgba(0,229,255,0.08)'
                                                                                }}
                                                                            >
                                                                                {expanded ? 'CLOSE ▲' : 'EDIT ✎'}
                                                                            </button>
                                                                            <SwitchButton
                                                                                checked={it.enabled}
                                                                                label={it.name}
                                                                                onToggle={() => setPromptBlocksEnabledMap({ [it.identifier]: !it.enabled })}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    {expanded && (
                                                                        <PromptBlockEditorDrawer item={it} toggleValues={vm.toggleValues} />
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                );
                            })()}
                        </div>
                    ) : tab === 'params' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '44px' }}>
                            <div style={cardStyle}>
                                <div style={{ padding: '8px 12px', background: 'rgba(0,229,255,0.08)', borderBottom: '1px solid rgba(0, 229, 255, 0.16)', fontFamily: MONO, fontSize: '11px', fontWeight: 900, color: '#00E5FF' }}>
                                    &gt; ENGINE_INJECTION_LINK
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', borderBottom: '1px solid rgba(0, 229, 255, 0.12)' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: 700 }}>
                                            {t('preset_ctrl_bridge_title', 'Active SDK Injection Bridge')}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: MONO }}>
                                            {t('preset_ctrl_bridge_desc', 'Injects active preset + CharX directives into chat completions (skips JSON/XML OOB tasks)')}
                                        </div>
                                    </div>
                                    <SwitchButton
                                        checked={store.sdkHookEnabled}
                                        label="SDK Injection Bridge"
                                        onToggle={() => setPresetHookEnabled(!store.sdkHookEnabled)}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', borderBottom: '1px solid rgba(0, 229, 255, 0.12)' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: 700 }}>
                                            {t('preset_ctrl_charx_link_title', 'Active .charx / .risum Module Link')}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: MONO }}>
                                            {t('preset_ctrl_charx_link_desc', 'Includes active CharX lorebook, module prompts, and input/output regex scripts')}
                                        </div>
                                    </div>
                                    <SwitchButton
                                        checked={charxEnabled}
                                        label="CharX Module Link"
                                        onToggle={toggleCharxEnabled}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 14px', borderBottom: '1px solid rgba(0, 229, 255, 0.12)' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700 }}>
                                        {t('preset_ctrl_scope_label', 'Injection Scope')}
                                    </div>
                                    <NeonSelect
                                        value={store.injectionScope}
                                        accentColor="#00E5FF"
                                        options={[
                                            { value: 'chat_only', label: 'CHAT_ONLY (Recommended)' },
                                            { value: 'chat_and_chargen', label: 'CHAT + CHAR_GEN' }
                                        ]}
                                        onChange={val => setInjectionScope(val)}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 14px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700 }}>
                                        {t('preset_ctrl_position_label', 'System Prompt Merge Position')}
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: MONO }}>
                                        // TAIL appends a post-history system block so keyword lore &amp; CBS toggles never bust host KV prefix cache.
                                    </div>
                                    <NeonSelect
                                        value={store.injectionPosition}
                                        accentColor="#00E5FF"
                                        options={[
                                            { value: 'append', label: 'APPEND (After GachaSwipe System Prompt)' },
                                            { value: 'prepend', label: 'PREPEND (Before GachaSwipe System Prompt)' },
                                            { value: 'tail', label: 'TAIL (KV_CACHE_SAFE — Post-History)' }
                                        ]}
                                        onChange={val => setInjectionPosition(val)}
                                    />
                                </div>
                            </div>

                            {activePresetRec && (
                                <div style={cardStyle}>
                                    <div style={{ padding: '8px 12px', background: 'rgba(255,16,122,0.08)', borderBottom: '1px solid rgba(0, 229, 255, 0.16)', fontFamily: MONO, fontSize: '11px', fontWeight: 900, color: '#FF107A' }}>
                                        {t('preset_ctrl_sampling_header', '> SAMPLING_PARAMETERS')}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid rgba(0, 229, 255, 0.12)' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 700 }}>
                                            {t('preset_ctrl_param_temp', 'Temperature')}
                                        </span>
                                        <input
                                            type="number"
                                            step="0.05"
                                            min="0"
                                            max="2"
                                            value={displayTemp}
                                            placeholder="default"
                                            onChange={e => handleNumericParamChange('temperature', e.target.value)}
                                            style={numInputStyle}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid rgba(0, 229, 255, 0.12)' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 700 }}>
                                            {t('preset_ctrl_param_top_p', 'Top-P')}
                                        </span>
                                        <input
                                            type="number"
                                            step="0.02"
                                            min="0"
                                            max="1"
                                            value={typeof activeRawPreset.top_p === 'number' && Number.isFinite(activeRawPreset.top_p) ? activeRawPreset.top_p : ''}
                                            placeholder="default"
                                            onChange={e => handleNumericParamChange('top_p', e.target.value)}
                                            style={numInputStyle}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid rgba(0, 229, 255, 0.12)' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 700 }}>
                                            {t('preset_ctrl_param_top_k', 'Top-K')}
                                        </span>
                                        <input
                                            type="number"
                                            step="1"
                                            min="0"
                                            max="200"
                                            value={typeof activeRawPreset.top_k === 'number' && Number.isFinite(activeRawPreset.top_k) ? activeRawPreset.top_k : ''}
                                            placeholder="default"
                                            onChange={e => handleNumericParamChange('top_k', e.target.value)}
                                            style={numInputStyle}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid rgba(0, 229, 255, 0.12)' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 700 }}>
                                            {t('preset_ctrl_param_min_p', 'Min-P')}
                                        </span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="1"
                                            value={typeof activeRawPreset.min_p === 'number' && Number.isFinite(activeRawPreset.min_p) ? activeRawPreset.min_p : ''}
                                            placeholder="default"
                                            onChange={e => handleNumericParamChange('min_p', e.target.value)}
                                            style={numInputStyle}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 700 }}>
                                            {t('preset_ctrl_param_max_tokens', 'Max Response Tokens')}
                                        </span>
                                        <input
                                            type="number"
                                            step="64"
                                            min="64"
                                            max="65536"
                                            value={rawMaxTokensVal}
                                            placeholder="default"
                                            onChange={e => handleNumericParamChange(maxTokensKey, e.target.value)}
                                            style={numInputStyle}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                                <div>
                                    <div style={{ fontFamily: MONO, fontSize: '11px', color: '#00E5FF', fontWeight: 800 }}>
                                        &gt; COMPILED_PROMPT ({vm.compiledPrompt.length.toLocaleString()} chars)
                                    </div>
                                    <div style={{ fontFamily: MONO, fontSize: '9.5px', color: '#00FF41', marginTop: '2px' }}>
                                        EST_TOKENS: ~{Math.ceil(vm.compiledPrompt.length / 3.6).toLocaleString()} ({vm.activePrompts.length} active blocks)
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCopyCompiled}
                                    style={{
                                        ...miniBtnStyle,
                                        borderColor: copied ? '#00FF41' : '#00E5FF',
                                        color: copied ? '#00FF41' : '#00E5FF'
                                    }}
                                >
                                    {copied
                                        ? t('preset_ctrl_copied', 'COPIED ✓')
                                        : t('preset_ctrl_copy_prompt', 'COPY COMPILED PROMPT')}
                                </button>
                            </div>
                            <pre
                                style={{
                                    margin: 0,
                                    padding: '12px',
                                    borderRadius: '4px',
                                    background: '#050308',
                                    border: '1px solid rgba(0,229,255,0.25)',
                                    color: 'var(--text-main)',
                                    fontFamily: MONO,
                                    fontSize: '11px',
                                    lineHeight: 1.55,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word'
                                }}
                            >
                                {vm.compiledPrompt || '(No active prompt blocks or directives compiled yet)'}
                            </pre>
                        </div>
                    )}
                </div>

                {/* In-app Select / Multi-Select Popup Modal */}
                {selectDialog && dialogField && (() => {
                    const opts = dialogField.options || [];
                    const isMulti = isToggleMultiSelectEnabled(
                        dialogField,
                        store.multiSelectToggles,
                        selectDialog.sourcePrefix
                    );
                    const selectedIndices = parseMultiSelectIndices(dialogField.value, opts.length);

                    return (
                        <div
                            onClick={() => setSelectDialog(null)}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 20,
                                background: 'rgba(5, 3, 8, 0.82)',
                                backdropFilter: 'blur(4px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '16px'
                            }}
                        >
                            <div
                                onClick={e => e.stopPropagation()}
                                style={{
                                    width: '100%',
                                    maxWidth: '420px',
                                    maxHeight: '76vh',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    background: 'var(--card)',
                                    border: '1px solid #00E5FF',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    boxShadow: '0 16px 40px rgba(0,0,0,0.85)'
                                }}
                            >
                                <div
                                    style={{
                                        padding: '11px 14px',
                                        background: 'rgba(0, 229, 255, 0.08)',
                                        borderBottom: '1px solid rgba(0,229,255,0.25)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px'
                                    }}
                                >
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', wordBreak: 'break-word' }}>
                                            {dialogField.label}
                                        </div>
                                        <div style={{ fontSize: '10px', fontFamily: MONO, color: '#00E5FF', marginTop: '2px' }}>
                                            toggle_{dialogField.key} · {isMulti ? 'MULTI-SELECT' : 'SINGLE-SELECT'}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => toggleSelectMultiMode(selectDialog.sourcePrefix, dialogField.key)}
                                        style={{
                                            ...miniBtnStyle,
                                            borderColor: isMulti ? '#FF107A' : 'rgba(0,229,255,0.4)',
                                            color: isMulti ? '#FF107A' : '#00E5FF',
                                            background: isMulti ? 'rgba(255,16,122,0.16)' : 'rgba(0,229,255,0.08)'
                                        }}
                                    >
                                        {isMulti ? '☑ MULTI ON' : '☐ MULTI OFF'}
                                    </button>
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {opts.map((opt, idx) => {
                                        const idxStr = String(idx);
                                        const isChecked = selectedIndices.indexOf(idxStr) !== -1;
                                        return (
                                            <button
                                                key={idxStr}
                                                type="button"
                                                onClick={() => {
                                                    const res = selectToggleOptionIndex(
                                                        selectDialog.sourcePrefix,
                                                        dialogField.key,
                                                        idxStr,
                                                        false
                                                    );
                                                    if (res.closedPopup) setSelectDialog(null);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: '10px',
                                                    padding: '9px 11px',
                                                    borderRadius: '4px',
                                                    border: `1px solid ${isChecked ? '#00E5FF' : 'rgba(0, 229, 255, 0.18)'}`,
                                                    background: isChecked ? 'rgba(0,229,255,0.15)' : 'rgba(0, 229, 255, 0.03)',
                                                    color: isChecked ? 'var(--text-main)' : 'var(--text-main)',
                                                    fontSize: '12.5px',
                                                    fontWeight: isChecked ? 700 : 500,
                                                    cursor: 'pointer',
                                                    textAlign: 'left'
                                                }}
                                            >
                                                <span>{opt}</span>
                                                <span style={{ fontFamily: MONO, fontSize: '13px', color: isChecked ? '#00FF41' : 'var(--text-dim)', flexShrink: 0 }}>
                                                    {isMulti ? (isChecked ? '☑' : '☐') : isChecked ? '●' : '○'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div
                                    style={{
                                        padding: '9px 14px',
                                        background: '#0B0914',
                                        borderTop: '1px solid rgba(0, 229, 255, 0.18)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px'
                                    }}
                                >
                                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: MONO }}>
                                        {isMulti
                                            ? t('preset_ctrl_select_multi_hint', 'Select multiple options')
                                            : t('preset_ctrl_select_plus_hint', 'Tap + option to auto multi-select')}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectDialog(null)}
                                        style={{
                                            ...miniBtnStyle,
                                            padding: '6px 14px',
                                            background: '#FF107A',
                                            borderColor: '#FF107A',
                                            color: 'var(--text-main)'
                                        }}
                                    >
                                        {t('btn_done', 'DONE')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};

export { NeonSelect };
