/**
 * Copyright (C) 2026 Project M.I.K.A. & Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * ROM-09 (PRESET ENGINE) inline bay panel rendered inside
 * Settings > IMAGE & SYSTEM when ROM-09 is slotted.
 * Follows .github/STYLE_GUIDE.md closed neon palette & LOCALIZATION_HUB dropdowns.
 */

import React, { useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import {
    getActiveModuleRecord,
    getActivePresetRecord,
    parsePresetViewModel,
    probeBinaryPresetCapability
} from '../../utils/presetEngine.js';
import { NeonSelect } from './NeonSelect.jsx';
import {
    importPresetOrCharxFile,
    setActiveModuleId,
    setActivePresetId,
    setInjectionPosition,
    setInjectionScope,
    setPresetHookEnabled,
    toggleCharxEnabled,
    usePresetStore
} from './presetStore.js';

const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

const PresetFadersGlyph = ({ size = 14 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}
    >
        <line x1="4" y1="7" x2="20" y2="7" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="17" x2="20" y2="17" />
        <circle cx="9" cy="7" r="2" fill="currentColor" />
        <circle cx="15" cy="12" r="2" fill="currentColor" />
        <circle cx="10" cy="17" r="2" fill="currentColor" />
    </svg>
);

export const PresetRomPanel = ({ onOpenPresetCtrl, showToast }) => {
    const { t } = useLanguage();
    const { store, stats } = usePresetStore();
    const presetInputRef = useRef(null);
    const charxInputRef = useRef(null);
    const [openDropdownKey, setOpenDropdownKey] = useState(null);

    const binaryCap = useMemo(() => probeBinaryPresetCapability(), []);
    const activePresetRec = useMemo(() => getActivePresetRecord(store), [store]);
    const activeModRec = useMemo(() => getActiveModuleRecord(store), [store]);
    const charxEnabled = store.charxEnabled !== false;

    const vm = useMemo(() => {
        if (!activePresetRec && !(charxEnabled && activeModRec)) return null;
        return parsePresetViewModel(activePresetRec, charxEnabled ? activeModRec : null);
    }, [activePresetRec, activeModRec, charxEnabled]);

    const presetOptions = useMemo(
        () =>
            store.presets.map(p => ({
                value: p.id,
                label:
                    p.data && typeof p.data.name === 'string' && p.data.name.trim()
                        ? `${p.data.name.trim()} (${p.fileName})`
                        : p.fileName
            })),
        [store.presets]
    );

    const moduleOptions = useMemo(
        () =>
            store.modules.map(m => ({
                value: m.id,
                label:
                    m.data && typeof m.data.name === 'string' && m.data.name.trim()
                        ? `${m.data.name.trim()} (${m.fileName})`
                        : m.fileName
            })),
        [store.modules]
    );

    const scopeOptions = useMemo(
        () => [
            { value: 'chat_only', label: 'CHAT_ONLY (Recommended)' },
            { value: 'chat_and_chargen', label: 'CHAT + CHAR_GEN' }
        ],
        []
    );

    const positionOptions = useMemo(
        () => [
            { value: 'append', label: 'APPEND (After System Prompt)' },
            { value: 'prepend', label: 'PREPEND (Before System Prompt)' },
            { value: 'tail', label: 'TAIL (KV_CACHE_SAFE — Post-History)' }
        ],
        []
    );

    const handleMenuOpen = (key) => (nextOpen) => {
        setOpenDropdownKey(prev => (nextOpen ? key : prev === key ? null : prev));
    };

    const handleFileImport = async (e, preferCharx) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        try {
            const res = await importPresetOrCharxFile(file, preferCharx);
            if (typeof showToast === 'function') {
                showToast(
                    res.kind === 'charx'
                        ? `${t('rom09_toast_loaded_charx', '[CHARX_LOADED]')} ${res.name}`
                        : `${t('rom09_toast_loaded_preset', '[PRESET_LOADED]')} ${res.name}`
                );
            }
        } catch (err) {
            if (typeof showToast === 'function') {
                showToast(`${t('rom09_toast_import_failed', '[IMPORT_FAILED]')} ${err?.message || String(err)}`);
            }
        }
    };

    const risuToggleCount = vm ? vm.risuToggles.filter(x => x.kind !== 'divider').length : 0;
    const charxToggleCount = vm && vm.charxVm ? vm.charxVm.toggles.filter(x => x.kind !== 'divider').length : 0;
    const loreCount = vm && vm.charxVm ? vm.charxVm.alwaysActiveLore.length + vm.charxVm.keywordLore.length : 0;
    const regexCount = vm && vm.charxVm ? vm.charxVm.activeRegex.length : 0;

    return (
        <div
            className="list-item"
            style={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                textAlign: 'left',
                position: 'relative',
                zIndex: openDropdownKey ? 60 : 1,
                border: '1px solid var(--border)',
                background: 'rgba(255, 16, 122, 0.04)',
                boxShadow: '0 0 15px rgba(255, 16, 122, 0.08), inset 0 0 8px rgba(255, 16, 122, 0.05)',
                marginBottom: '12px'
            }}
        >
            {/* Header Row (matches LOCALIZATION_HUB & OOB_GLASS_DIRECTORS status badges) */}
            <div style={{ width: '100%', marginRight: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--accent)', fontFamily: MONO, letterSpacing: '0.1em', whiteSpace: 'nowrap', minWidth: 0 }}>
                    {t('rom09_panel_title', '> PRESET ENGINE')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span
                        title={
                            binaryCap.supported
                                ? 'Native DecompressionStream(deflate-raw) + WebCrypto AES-GCM ready'
                                : 'WebView lacks DecompressionStream(deflate-raw) or WebCrypto (Chromium 103+ required for .risup / .charx)'
                        }
                        style={{
                            fontSize: '9px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: binaryCap.supported ? 'rgba(0, 255, 65, 0.15)' : 'rgba(255, 69, 0, 0.15)',
                            color: binaryCap.supported ? '#00FF41' : '#FF4500',
                            border: binaryCap.supported ? '1px solid #00FF41' : '1px solid #FF4500',
                            fontWeight: 'bold',
                            fontFamily: MONO,
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}
                    >
                        {binaryCap.supported ? 'READY' : 'HOST TOO OLD'}
                    </span>
                    <button
                        type="button"
                        onClick={() => setPresetHookEnabled(!store.sdkHookEnabled)}
                        title="Toggle SDK preset injection bridge"
                        style={{
                            fontSize: '9px',
                            fontWeight: 'bold',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: store.sdkHookEnabled ? '1px solid #00FF41' : '1px solid rgba(0, 229, 255, 0.25)',
                            background: store.sdkHookEnabled ? 'rgba(0, 255, 65, 0.12)' : 'rgba(0, 229, 255, 0.04)',
                            color: store.sdkHookEnabled ? '#00FF41' : 'var(--text-dim)',
                            opacity: store.sdkHookEnabled ? 1 : 0.65,
                            letterSpacing: '0.08em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            fontFamily: MONO,
                            transition: 'opacity 0.2s ease, border-color 0.2s ease',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}
                    >
                        <span
                            style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                background: store.sdkHookEnabled ? '#00FF41' : 'var(--text-dim)',
                                boxShadow: store.sdkHookEnabled ? '0 0 6px #00FF41' : 'none'
                            }}
                        />
                        {store.sdkHookEnabled ? t('matrix_status_active', 'ACTIVE') : t('matrix_status_inactive', 'INACTIVE')}
                    </button>
                </div>
            </div>

            <div style={{ width: '100%', fontSize: '11px', color: 'var(--text-dim)', marginBottom: !binaryCap.supported ? '10px' : '14px', fontFamily: MONO, letterSpacing: '0.04em', lineHeight: 1.45 }}>
                {t('rom09_panel_desc', '// RisuAI (.risup), CharX/RisuM (.charx/.risum) & SillyTavern (.json) toggles, dropdowns & multi-select.')}
            </div>

            {!binaryCap.supported && (
                <div
                    style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '8px 10px',
                        marginBottom: '12px',
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 69, 0, 0.45)',
                        background: 'rgba(255, 69, 0, 0.1)',
                        boxShadow: 'inset 0 0 8px rgba(255, 69, 0, 0.08)',
                        color: '#FF4500',
                        fontFamily: MONO,
                        fontSize: '10px',
                        lineHeight: 1.45
                    }}
                >
                    &gt; HOST_TOO_OLD // WebView lacks {!binaryCap.hasDeflateRaw ? 'DecompressionStream("deflate-raw")' : 'WebCrypto AES-GCM'} (&lt; Chromium 103). SillyTavern .json &amp; .risum work normally; update Android System WebView to decode encrypted .risup / .charx archives.
                </div>
            )}

            {/* Slot 1: Active Preset Selector */}
            <div style={{ position: 'relative', width: '100%', marginBottom: '14px', zIndex: openDropdownKey === 'preset' ? 40 : 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#FF107A', fontFamily: MONO, letterSpacing: '0.05em', minWidth: 0 }}>
                        &gt; PRESET_SLOT (.risup · .risupreset · .json)
                    </div>
                    <button
                        type="button"
                        onClick={() => presetInputRef.current && presetInputRef.current.click()}
                        style={{
                            padding: '5px 10px',
                            borderRadius: '4px',
                            border: '1px solid #FF107A',
                            background: 'rgba(255, 16, 122, 0.16)',
                            boxShadow: '0 0 8px rgba(255, 16, 122, 0.2), inset 0 0 6px rgba(255, 16, 122, 0.08)',
                            color: '#FF107A',
                            fontFamily: MONO,
                            fontSize: '10px',
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}
                    >
                        [ {t('btn_import_short', '+ IMPORT')} ]
                    </button>
                    <input
                        ref={presetInputRef}
                        type="file"
                        style={{ display: 'none' }}
                        onChange={e => handleFileImport(e, false)}
                    />
                </div>
                {store.presets.length > 0 ? (
                    <NeonSelect
                        value={activePresetRec ? activePresetRec.id : ''}
                        options={presetOptions}
                        onChange={val => setActivePresetId(val)}
                        accentColor="#FF107A"
                        onOpenChange={handleMenuOpen('preset')}
                    />
                ) : (
                    <button
                        type="button"
                        onClick={() => presetInputRef.current && presetInputRef.current.click()}
                        className="search-input"
                        style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '12px 16px',
                            fontSize: '13px',
                            color: 'var(--text-dim)',
                            background: '#0B0914',
                            border: '1px dashed rgba(255, 16, 122, 0.35)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontFamily: MONO
                        }}
                    >
                        {t('preset_ctrl_no_preset', 'No preset loaded')} — [ {t('btn_import_short', '+ IMPORT')} ]
                    </button>
                )}
            </div>

            {/* Slot 2: Active CharX / RisuM Module Selector */}
            <div style={{ position: 'relative', width: '100%', marginBottom: '14px', zIndex: openDropdownKey === 'charx' ? 40 : 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#00E5FF', fontFamily: MONO, letterSpacing: '0.05em', minWidth: 0 }}>
                        &gt; CHARX_SLOT (.charx · .risum)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {store.modules.length > 0 && (
                            <button
                                type="button"
                                onClick={toggleCharxEnabled}
                                style={{
                                    padding: '5px 9px',
                                    borderRadius: '4px',
                                    border: `1px solid ${charxEnabled ? '#00FF41' : 'rgba(0, 229, 255, 0.25)'}`,
                                    background: charxEnabled ? 'rgba(0, 255, 65, 0.14)' : 'rgba(0, 229, 255, 0.04)',
                                    boxShadow: charxEnabled ? '0 0 8px rgba(0, 255, 65, 0.2)' : 'none',
                                    color: charxEnabled ? '#00FF41' : 'var(--text-dim)',
                                    opacity: charxEnabled ? 1 : 0.55,
                                    fontFamily: MONO,
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                }}
                            >
                                {charxEnabled ? 'ON' : 'OFF'}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => charxInputRef.current && charxInputRef.current.click()}
                            style={{
                                padding: '5px 10px',
                                borderRadius: '4px',
                                border: '1px solid #00E5FF',
                                background: 'rgba(0, 229, 255, 0.14)',
                                boxShadow: '0 0 8px rgba(0, 229, 255, 0.2), inset 0 0 6px rgba(0, 229, 255, 0.08)',
                                color: '#00E5FF',
                                fontFamily: MONO,
                                fontSize: '10px',
                                fontWeight: 800,
                                letterSpacing: '0.05em',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                            }}
                        >
                            [ {t('btn_import_short', '+ IMPORT')} ]
                        </button>
                        <input
                            ref={charxInputRef}
                            type="file"
                            style={{ display: 'none' }}
                            onChange={e => handleFileImport(e, true)}
                        />
                    </div>
                </div>
                {store.modules.length > 0 ? (
                    <NeonSelect
                        value={activeModRec ? activeModRec.id : ''}
                        options={moduleOptions}
                        onChange={val => setActiveModuleId(val)}
                        accentColor="#00E5FF"
                        onOpenChange={handleMenuOpen('charx')}
                    />
                ) : (
                    <button
                        type="button"
                        onClick={() => charxInputRef.current && charxInputRef.current.click()}
                        className="search-input"
                        style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '12px 16px',
                            fontSize: '13px',
                            color: 'var(--text-dim)',
                            background: '#0B0914',
                            border: '1px dashed rgba(0, 229, 255, 0.35)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontFamily: MONO
                        }}
                    >
                        {t('preset_ctrl_no_module', 'No module linked')} — [ {t('btn_import_short', '+ IMPORT')} ]
                    </button>
                )}
            </div>

            {/* Injection Scope */}
            <div style={{ position: 'relative', width: '100%', marginBottom: '14px', zIndex: openDropdownKey === 'scope' ? 40 : 2 }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'rgba(0, 229, 255, 0.85)', marginBottom: '6px', fontFamily: MONO, letterSpacing: '0.05em' }}>
                    &gt; INJECTION_SCOPE
                </div>
                <NeonSelect
                    value={store.injectionScope}
                    options={scopeOptions}
                    onChange={val => setInjectionScope(val)}
                    accentColor="#00E5FF"
                    onOpenChange={handleMenuOpen('scope')}
                />
            </div>

            {/* Merge Position */}
            <div style={{ position: 'relative', width: '100%', marginBottom: '14px', zIndex: openDropdownKey === 'position' ? 40 : 1 }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'rgba(0, 229, 255, 0.85)', marginBottom: '6px', fontFamily: MONO, letterSpacing: '0.05em' }}>
                    &gt; MERGE_POSITION
                </div>
                <NeonSelect
                    value={store.injectionPosition}
                    options={positionOptions}
                    onChange={val => setInjectionPosition(val)}
                    accentColor="#00E5FF"
                    onOpenChange={handleMenuOpen('position')}
                />
            </div>

            {/* Live Summary Bar (Style Guide Terminal Surface recipe) */}
            <div
                style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    padding: '10px 12px',
                    marginBottom: '12px',
                    borderRadius: '4px',
                    background: 'rgba(0, 229, 255, 0.03)',
                    border: '1px solid rgba(0, 229, 255, 0.2)',
                    boxShadow: 'inset 0 0 8px rgba(0, 229, 255, 0.05)',
                    fontFamily: MONO,
                    fontSize: '11px',
                    color: 'var(--text-dim)'
                }}
            >
                <span>
                    TOGGLES: <strong style={{ color: '#00E5FF' }}>{risuToggleCount + charxToggleCount}</strong> · LORE: <strong style={{ color: '#00FF41' }}>{loreCount}</strong> · REGEX: <strong style={{ color: '#FF107A' }}>{regexCount}</strong>
                </span>
                <span style={{ color: '#00FF41' }}>
                    INJECTED: {stats.interceptedCount}x · {stats.storageEngine}
                </span>
            </div>

            {/* Prominent Full-Width Terminal Action Button */}
            <button
                type="button"
                className="btn btn-outline"
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '4px',
                    border: '1px solid #FF107A',
                    background: 'rgba(255, 16, 122, 0.12)',
                    color: '#FF107A',
                    fontFamily: MONO,
                    fontSize: '11px',
                    fontWeight: '800',
                    letterSpacing: '0.1em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 0 14px rgba(255, 16, 122, 0.25), inset 0 0 8px rgba(255, 16, 122, 0.08)',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease, transform 0.15s ease'
                }}
                onMouseOver={e => {
                    e.currentTarget.style.background = 'rgba(255, 16, 122, 0.22)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 16, 122, 0.4), inset 0 0 10px rgba(255, 16, 122, 0.12)';
                }}
                onMouseOut={e => {
                    e.currentTarget.style.background = 'rgba(255, 16, 122, 0.12)';
                    e.currentTarget.style.boxShadow = '0 0 14px rgba(255, 16, 122, 0.25), inset 0 0 8px rgba(255, 16, 122, 0.08)';
                }}
                onClick={onOpenPresetCtrl}
            >
                {PresetFadersGlyph({ size: 14 })}
                <span>[ {t('btn_open_preset_ctrl', 'PRESET ENGINE')} ]</span>
            </button>
        </div>
    );
};

export default PresetRomPanel;
export { NeonSelect };
