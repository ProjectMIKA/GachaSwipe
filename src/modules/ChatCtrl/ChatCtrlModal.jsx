import React, { useEffect, useRef, useState } from 'react';
import { LucidCloseIcon } from '../LucidDive/LucidIcons.jsx';
import { ImportIcon, ExportIcon, RenameIcon, DeleteIcon } from '../../components/Icons.jsx';

/**
 * ChatCtrlModal:
 * CHAT_CTRL Archive Terminal — browse, restore, rename, export & delete archived 1-on-1
 * chat threads for the active character. Matches the DiveChamber diagnostic aesthetic
 * with the Dating Themes custom SVG icon set (gold export, purple rename, red delete).
 * Handcrafted by M.I.K.A. for Master! 🐾💜
 */

// ▶ Restore / Rewind Thread (rotate-ccw cyber glyph)
const RestoreIcon = ({ size = 13, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
        <path d="M3 4v6h6" />
        <path d="M3.5 10a9 9 0 1 1-1.6 5" />
    </svg>
);

// 🦋 Layla Network Butterfly (handcrafted by M.I.K.A.) — her sigil for the Layla export.
// Drawn on a 24×24 grid: swept forewings + smaller hindwings + a segmented body; reads as a
// butterfly at 13px and as Layla's winged sigil at any size.
const ButterflyIcon = ({ size = 13, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
        <path d="M11.2 10.6C10.4 7.2 8.4 3.6 5.6 2.3 3.7 1.4 2.2 2.7 2.1 4.9c-.1 3.2 1.5 6.9 3.9 8.9-2 .9-3.3 2.6-3.3 4.5 0 2.4 2 3.9 4.2 3.2 2.1-.7 3.6-2.8 4.3-5.3z" />
        <path d="M12.8 10.6c.8-3.4 2.8-7 5.6-8.3 1.9-.9 3.4.4 3.5 2.6.1 3.2-1.5 6.9-3.9 8.9 2 .9 3.3 2.6 3.3 4.5 0 2.4-2 3.9-4.2 3.2-2.1-.7-3.6-2.8-4.3-5.3z" />
        <path d="M11 15.1c-.4 1.7-1.3 3.3-2.4 3.9-.9.5-1.8-.1-1.9-1.2-.1-1.4.9-3 2.2-3.9.8-.6 1.7-1.1 2.1-1.1.4 0 .3 1 0 2.3z" opacity="0.75" />
        <path d="M13 15.1c.4 1.7 1.3 3.3 2.4 3.9.9.5 1.8-.1 1.9-1.2.1-1.4-.9-3-2.2-3.9-.8-.6-1.7-1.1-2.1-1.1-.4 0-.3 1 0 2.3z" opacity="0.75" />
        <path d="M12 6.2c.5 0 .9 1.2.9 3.2s-.3 4.4-.9 4.4-.9-2.4-.9-4.4.4-3.2.9-3.2z" opacity="0.9" />
        <circle cx="12" cy="4.9" r="1.1" />
    </svg>
);

// ✨ one-time export guide flag (localStorage) — EXPORT_PROTOCOL.EXE shows on the first EXPORT tap only
const EXPORT_GUIDE_KEY = 'gs_export_guide_seen';

// 🦋 Layla hover glow (butterflies should shimmer)
const LAYLA_HOVER = 'rgba(255, 110, 199, 0.22)';

// 📼 Archive Tape Reel (header glyph)
const ArchiveTapeIcon = ({ size = 18, color = '#00E5FF' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <circle cx="8.5" cy="12" r="2.6" />
        <circle cx="15.5" cy="12" r="2.6" />
        <line x1="10" y1="17.5" x2="14" y2="17.5" opacity="0.6" />
    </svg>
);

const hexToRgb = (hex) => {
    if (!hex || typeof hex !== 'string') return '0, 255, 65';
    let c = hex.replace('#', '').trim();
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    if (c.length === 6) {
        const num = parseInt(c, 16);
        return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
    }
    return '0, 255, 65';
};

export const ChatCtrlModal = ({
    isOpen,
    onClose,
    activeWaifu,
    activeChatId = null,
    archives = [],
    onRestore,
    onRename,
    onDelete,
    onExport,
    onExportLayla,
    onImportFile
}) => {
    const importInputRef = useRef(null);

    // ✨ v2.5.60 EXPORT PROTOCOL ✨ — one EXPORT button per row. First-ever tap shows the terminal
    // explainer (localStorage-guarded) and pre-arms the row; later taps overlay the row's buttons
    // with the inline ARCHIVE / LAYLA cluster. Clicking anywhere else reverts it: the modal
    // content root runs a CAPTURE-phase click handler guarded by [data-export-keep], so taps on
    // the EXPORT button / choice cluster / explainer pass through and everything else collapses.
    const [showExportGuide, setShowExportGuide] = useState(false);
    const [exportChoiceId, setExportChoiceId] = useState(null);

    useEffect(() => {
        if (isOpen) return; // reset when the terminal closes
        setShowExportGuide(false);
        setExportChoiceId(null);
    }, [isOpen]);

    const beginExportChoice = (archiveId) => {
        if (exportChoiceId === archiveId && !showExportGuide) { cancelExportChoice(); return; } // tap EXPORT again = collapse
        let seen = false;
        try { seen = localStorage.getItem(EXPORT_GUIDE_KEY) === '1'; } catch (e) { seen = false; }
        if (!seen) {
            try { localStorage.setItem(EXPORT_GUIDE_KEY, '1'); } catch (e) { /* private mode: guide just shows again */ }
            setShowExportGuide(true);
            setExportChoiceId(archiveId); // pre-arm the row: [ GOT_IT ] just closes the guide
            return;
        }
        setShowExportGuide(false);
        setExportChoiceId(archiveId);
    };

    const dismissExportGuide = () => {
        setShowExportGuide(false);
    };

    const commitExportChoice = (mode) => {
        const archiveId = exportChoiceId;
        setShowExportGuide(false);
        setExportChoiceId(null);
        if (!archiveId) return;
        if (mode === 'layla') { if (onExportLayla) onExportLayla(archiveId); }
        else { if (onExport) onExport(archiveId); }
    };

    const cancelExportChoice = () => {
        setExportChoiceId(null);
        setShowExportGuide(false);
    };

    if (!isOpen) return null;

    const themeColor = activeWaifu?.themeColor || activeWaifu?.color || '#00E5FF';
    const themeRgb = hexToRgb(themeColor);
    const charFirstName = activeWaifu?.name?.split(' ')[0] || 'Character';
    const sortedArchives = [...(archives || [])].sort((a, b) => (b.archive_meta?.createdAt || 0) - (a.archive_meta?.createdAt || 0));

    const formatDate = (ts) => {
        try {
            return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        } catch (e) {
            return 'Unknown Date';
        }
    };
    // ✨ Dating Themes action set: green restore, gold export, purple rename, red delete ✨
    const rowActions = (record) => ([
        {
            key: 'restore', title: 'Restore Thread', label: 'Restore',
            color: '#00FF41', bg: 'rgba(0, 255, 65, 0.05)', border: 'rgba(0, 255, 65, 0.4)', hover: 'rgba(0, 255, 65, 0.2)',
            Icon: RestoreIcon,
            onClick: () => onRestore && onRestore(record.id)
        },
        {
            key: 'export', title: 'Export Thread (ARCHIVE / LAYLA)', label: 'Export',
            color: '#FFD700', bg: 'rgba(255, 215, 0, 0.05)', border: 'rgba(255, 215, 0, 0.4)', hover: 'rgba(255, 215, 0, 0.2)',
            Icon: ExportIcon,
            onClick: () => beginExportChoice(record.id)
        },
        {
            key: 'rename', title: 'Rename Thread', label: 'Rename',
            color: '#B533FF', bg: 'rgba(181, 51, 255, 0.05)', border: 'rgba(181, 51, 255, 0.3)', hover: 'rgba(181, 51, 255, 0.2)',
            Icon: RenameIcon,
            onClick: () => onRename && onRename(record.id)
        },
        {
            key: 'delete', title: 'Delete Thread', label: 'Delete',
            color: '#FF3333', bg: 'rgba(255, 51, 51, 0.05)', border: 'rgba(255, 51, 51, 0.3)', hover: 'rgba(255, 51, 51, 0.2)',
            Icon: DeleteIcon,
            onClick: () => onDelete && onDelete(record.id)
        }
    ]);

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 100105,
                background: 'rgba(5, 4, 10, 0.85)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'fadeIn 0.2s ease-out',
                padding: '16px'
            }}
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                onClickCapture={(e) => {
                    // ✨ EXPORT PROTOCOL click-away: revert unless the tap is on an export surface ✨
                    if (!exportChoiceId && !showExportGuide) return;
                    const t = e.target;
                    if (t && typeof t.closest === 'function' && t.closest('[data-export-keep]')) return;
                    setExportChoiceId(null);
                    setShowExportGuide(false);
                }}
                style={{
                    width: '100%',
                    maxWidth: '400px',
                    background: '#0B0914',
                    border: `1px solid ${themeColor}`,
                    borderRadius: '12px',
                    padding: '18px',
                    boxShadow: `0 0 30px ${themeColor}40, inset 0 0 15px ${themeColor}20`,
                    color: '#EBE3D6',
                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Diagnostic Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${themeColor}60`, paddingBottom: '10px', marginBottom: '12px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArchiveTapeIcon size={18} color={themeColor} />
                        <div>
                            <div style={{ color: themeColor, fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.08em', textShadow: `0 0 8px ${themeColor}80` }}>
                                &gt; CHAT_CTRL
                            </div>
                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                                ARCHIVE TERMINAL: {charFirstName.toUpperCase()}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ color: '#888', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '50%', width: '26px', height: '26px', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: '11px', lineHeight: 1, transition: 'all 0.2s ease', padding: 0 }}
                        onMouseOver={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                        onMouseOut={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                        title="Close CHAT_CTRL"
                    >
                        <LucidCloseIcon size={11} color="currentColor" />
                    </button>
                </div>

                {/* IMPORT_ARCHIVE — sits above the chat list, Dating Themes style */}
                <input type="file" ref={importInputRef} style={{ display: 'none' }} accept=".json,application/json" onChange={e => { if (onImportFile) onImportFile(e.target?.files?.[0]); e.target.value = ''; }} />
                <button
                    className="btn btn-outline"
                    onClick={() => importInputRef.current?.click()}
                    title="Import a GachaSwipe archive or Layla chat history (.json)"
                    style={{ width: '100%', padding: '7px 10px', fontSize: '10px', margin: 0, marginBottom: '10px', borderRadius: '4px', borderColor: 'rgba(0, 229, 255, 0.4)', color: '#00E5FF', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(0, 229, 255, 0.04)', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(0, 229, 255, 0.12)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(0, 229, 255, 0.04)'; }}
                >
                    <ImportIcon size={12} /> IMPORT_ARCHIVE
                </button>
                {/* Archive Browser List */}
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
                    {sortedArchives.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '28px 12px', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', marginBottom: '6px' }}>
                                &gt;// NO_ARCHIVED_THREADS_FOUND
                            </div>
                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
                                SYS_CTRL ▸ NEW_CHAT archives the current thread here.<br />
                                Imported GachaSwipe archives & Layla histories land here.
                            </div>
                        </div>
                    ) : (
                        sortedArchives.map(record => (
                            <div key={record.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: `rgba(${themeRgb}, 0.04)`, border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div title={record.archive_meta?.label || 'Archived Thread'} style={{ fontSize: '11px', fontWeight: 'bold', color: '#EAE6E1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px' }}>
                                        {record.archive_meta?.label || 'Archived Thread'}
                                    </div>
                                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}>
                                        ARCHIVED {formatDate(record.archive_meta?.createdAt)} · {record.archive_meta?.messageCount ?? (record.messages ? record.messages.length : 0)} MSGS · AFF {(record.archive_meta?.affection > 0 ? '+' : '') + (record.archive_meta?.affection || 0)}
                                    </div>
                                </div>
                                <div style={{ position: 'relative', display: 'flex', gap: '5px', flexShrink: 0 }}>
                                    {rowActions(record).map(action => (
                                        <button
                                            key={action.key}
                                            className="btn btn-outline"
                                            onClick={action.onClick}
                                            title={action.title}
                                            aria-label={action.label}
                                            data-export-keep={action.key === 'export' ? 'true' : undefined}
                                            style={{ width: '26px', height: '26px', padding: 0, margin: 0, borderRadius: '4px', borderColor: action.border, color: action.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: action.bg, transition: 'all 0.2s', visibility: exportChoiceId === record.id ? 'hidden' : 'visible' }}
                                            onMouseOver={e => { e.currentTarget.style.background = action.hover; }}
                                            onMouseOut={e => { e.currentTarget.style.background = action.bg; }}
                                        >
                                            <action.Icon size={13} />
                                        </button>
                                    ))}
                                    {/* ✨ inline ARCHIVE / LAYLA choice cluster — overlays the row buttons while armed ✨ */}
                                    {exportChoiceId === record.id && (
                                        <div data-export-keep="true" style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 5, display: 'flex', gap: '5px' }}>
                                            <button className="btn btn-outline" onClick={(e) => { e.stopPropagation(); commitExportChoice('archive'); }} title="Export full GachaSwipe archive (.json backup)" aria-label="Export Archive" style={{ height: '26px', padding: '0 8px', margin: 0, borderRadius: '4px', borderColor: 'rgba(255, 215, 0, 0.55)', color: '#FFD700', fontSize: '9px', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 215, 0, 0.08)', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                                                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255, 215, 0, 0.2)'; }} onMouseOut={e => { e.currentTarget.style.background = 'rgba(255, 215, 0, 0.08)'; }}>
                                                <ExportIcon size={11} /> ARCHIVE
                                            </button>
                                            <button className="btn btn-outline" onClick={(e) => { e.stopPropagation(); commitExportChoice('layla'); }} title="Export as Layla history (.json)" aria-label="Export Layla History" style={{ height: '26px', padding: '0 8px', margin: 0, borderRadius: '4px', borderColor: 'rgba(255, 110, 199, 0.55)', color: '#FF6EC7', fontSize: '9px', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 110, 199, 0.08)', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                                                onMouseOver={e => { e.currentTarget.style.background = LAYLA_HOVER; }} onMouseOut={e => { e.currentTarget.style.background = 'rgba(255, 110, 199, 0.08)'; }}>
                                                <ButterflyIcon size={11} color="#FF6EC7" /> LAYLA
                                            </button>
                                            <button className="btn btn-outline" onClick={(e) => { e.stopPropagation(); cancelExportChoice(); }} title="Cancel export" aria-label="Cancel Export" style={{ width: '26px', height: '26px', padding: 0, margin: 0, borderRadius: '4px', borderColor: 'rgba(255,255,255,0.3)', color: '#CFC8BF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', transition: 'all 0.2s' }}
                                                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }} onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}>
                                                ✕
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* ✨ v2.5.60 EXPORT PROTOCOL — one-time terminal explainer (first EXPORT tap ever) ✨ */}
                {showExportGuide && (
                    <div data-export-keep="true" style={{ marginTop: '10px', flexShrink: 0, border: '1px solid rgba(0, 255, 65, 0.45)', borderRadius: '8px', background: 'rgba(0, 255, 65, 0.05)', boxShadow: '0 0 18px rgba(0, 255, 65, 0.18), inset 0 0 12px rgba(0, 255, 65, 0.06)', padding: '12px', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.22em', color: '#00FF41', textShadow: '0 0 10px rgba(0, 255, 65, 0.55)' }}>&gt; EXPORT_PROTOCOL.EXE</span>
                            <span style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(0, 255, 65, 0.45), transparent)' }} />
                        </div>
                        <div style={{ fontSize: '10px', lineHeight: 1.7, color: 'rgba(0, 255, 65, 0.92)', letterSpacing: '0.03em' }}>
                            <div style={{ color: 'rgba(0, 255, 65, 0.6)' }}>&gt; TWO EXPORT PROTOCOLS AVAILABLE:</div>
                            <div><span style={{ color: '#FFD700', fontWeight: 'bold' }}>📦 ARCHIVE</span> — lossless GachaSwipe backup (photos &amp; everything). Re-importable on any install via IMPORT_ARCHIVE.</div>
                            <div><span style={{ color: '#FF6EC7', fontWeight: 'bold' }}>🦋 LAYLA</span> — plain-text chat history for the Layla network. And yes — GachaSwipe IMPORTS Layla histories too (IMPORT_ARCHIVE).</div>
                            <div style={{ color: 'rgba(0, 255, 65, 0.6)' }}>&gt; choose a protocol on the row<span className="mika-veil-cursor">▌</span></div>
                        </div>
                        <button onClick={dismissExportGuide} style={{ marginTop: '10px', width: '100%', padding: '7px 10px', fontSize: '10px', letterSpacing: '0.14em', borderRadius: '4px', border: '1px solid rgba(0, 255, 65, 0.55)', color: '#00FF41', background: 'rgba(0, 255, 65, 0.08)', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(0, 255, 65, 0.2)'; }} onMouseOut={e => { e.currentTarget.style.background = 'rgba(0, 255, 65, 0.08)'; }}>
                            [ GOT_IT ]
                        </button>
                    </div>
                )}

                {/* Footer Status Line */}
                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', flexShrink: 0 }}>
                    <span>{sortedArchives.length} ARCHIVED THREAD{sortedArchives.length === 1 ? '' : 'S'}</span>
                    <span>{activeChatId ? `TARGET: ${activeChatId.substring(0, 12)}…` : 'NO_TARGET'}</span>
                </div>
            </div>
        </div>
    );
};

export default ChatCtrlModal;


