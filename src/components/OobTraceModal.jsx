import React, { useState, useEffect } from 'react';
import { classifyOobStatus, summarizeOobTrace } from '../utils/oobChannel.js';
import { XIcon, CameraIcon, ImageIcon, SparkIcon, OobSignalIcon } from './Icons.jsx';

// ✨ MIKA'S OOB TRACE MODAL (v2.7.41 — THE GLASS CHANNEL, TERMINAL CHASSIS) ✨
// WHY: v2.7.40 made the trace report user-facing (fixed overlay, closes only by user,
// status first, evidence on tap) but dressed it in the generic glass-pill costume.
// The app's diagnostic vocabulary is a PHOSPHOR TERMINAL (TerminalToast, the
// [▸ MIKA_PROXY // TTY] bubble, the Sanctuary phase-over) — so this modal now
// wears the same chassis: traffic-light title bar, a STATIC CRT scanline sheet
// (no animated background-position — the v2.5.26 compositor scar; the only
// animation is the opacity-only cursorBlink keyframe shared with TerminalToast),
// log-line rows with dotted leaders and bracketed [ STATUS ] verdict tags.
// ✨ CUSTOM SVG LAW: every glyph inside this window is either REUSED from the app's
// custom icon pool (Icons.jsx: XIcon close, CameraIcon photoTags, ImageIcon
// sceneBuild, SparkIcon title bolt) or hand-drawn below in the house style
// (24×24 viewBox, stroke=currentColor, round caps) — ZERO emoji, ZERO icon fonts.
// Dumb presentational component: { trace, onClose, t } — no engine state.

const STATUS_COLORS = { ok: '#00FFA3', timeout: '#FFB454', cooldown: '#7FD1FF', unsupported: '#8A93A6', invalid: '#FF5C7A' };
const STATUS_KEYS = { ok: 'oob_trace_st_ok', timeout: 'oob_trace_st_timeout', cooldown: 'oob_trace_st_cooldown', unsupported: 'oob_trace_st_unsupported', invalid: 'oob_trace_st_invalid' };

// ✨ House-style glyph shell — same contract as Icons.jsx (stroke, currentColor, round caps)
const Glyph = ({ size = 13, children }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
        {children}
    </svg>
);

// ✨ Hand-drawn kind glyphs (custom — not in the shared pool; OOB-specific vocabulary)
const ClapperIcon = () => (<Glyph><rect x="3" y="9" width="18" height="11" rx="1.5" /><path d="M3 9l2-5h14l2 5" /><path d="M7.4 4l2 5M11.7 4l2 5M16 4l2 5" /></Glyph>);
const ChipIcon = () => (<Glyph><rect x="7" y="7" width="10" height="10" rx="1" /><path d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3" /></Glyph>);
const EnvelopeIcon = () => (<Glyph><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3.5 7.5L12 13l8.5-5.5" /></Glyph>);
const PinIcon = () => (<Glyph><path d="M12 21.5s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.9 12 21.5 12 21.5z" /><circle cx="12" cy="11" r="2.4" /></Glyph>);
const MapFoldIcon = () => (<Glyph><path d="M9 4L3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z" /><path d="M9 4v13M15 6.5v13" /></Glyph>);
const CalendarIcon = () => (<Glyph><rect x="4" y="5.5" width="16" height="15" rx="2" /><path d="M4 10.5h16M8.5 3.5v4M15.5 3.5v4" /></Glyph>);
const DnaIcon = () => (<Glyph><path d="M8 3c0 5 8 5.5 8 9.5S8 16.5 8 21M16 3c0 5-8 5.5-8 9.5S16 16.5 16 21" /><path d="M9.2 6.5h5.6M9.2 17.5h5.6" /></Glyph>);
const DreamBubbleIcon = () => (<Glyph><circle cx="12" cy="9.5" r="6" /><circle cx="5" cy="17.5" r="2.3" /><circle cx="11" cy="20" r="1.4" /></Glyph>);
const TargetIcon = () => (<Glyph><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.5" /></Glyph>);
const StarburstIcon = () => (<Glyph><path d="M12 3l1.9 5.6L19.5 12l-5.6 1.9L12 19.5l-1.9-5.6L4.5 12l5.6-1.9z" /></Glyph>);
const GlitchPulseIcon = () => (<Glyph><path d="M2.5 12h4l2-6 3 12 2-9 1.5 3h6.5" /></Glyph>);
const FlameIcon = () => (<Glyph><path d="M12 2.5c1 3.5-3.5 5-3.5 9.5a5.5 5.5 0 0 0 11 .3c0-2-1-3.6-2-5-.4 1.4-1 2.2-2.1 2.5C15.9 6.9 14.3 4.2 12 2.5z" /></Glyph>);
const SpeechIcon = () => (<Glyph><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" /></Glyph>);
const SignalBarsIcon = () => (<Glyph><path d="M4 18v-3M9 18v-7.5M14 18V7M19 18v-5" /><path d="M3 21h18" /></Glyph>);

// photoTags + sceneBuild reuse the shared pool (CameraIcon / ImageIcon) verbatim.
const KIND_ICONS = {
    photoTags: CameraIcon,
    positionDirect: ClapperIcon,
    sceneBuild: ImageIcon,
    memoryExtract: ChipIcon,
    luresPlan: EnvelopeIcon,
    locationArbiter: PinIcon,
    locationReconcile: MapFoldIcon,
    schedulePlaces: CalendarIcon,
    matrixMutate: DnaIcon,
    lucidDream: DreamBubbleIcon,
    shootOptions: TargetIcon,
    dreamSeeds: StarburstIcon,
    chaosDirector: GlitchPulseIcon,
    swipeRoast: FlameIcon,
    chatCommentary: SpeechIcon,
    fluxConvert: SparkIcon,
};

export const OobTraceModal = ({ trace, onClose, t }) => {
    const [expanded, setExpanded] = useState(null);
    const entries = Array.isArray(trace) ? trace : [];
    const sum = summarizeOobTrace(entries);
    const tt = (k, fb) => (typeof t === 'function' ? t(k, fb) : fb);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            onClick={() => onClose && onClose()}
            style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5, 4, 10, 0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease-out' }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ background: '#0B0914', border: '1px solid #00FF41', borderRadius: '12px', maxWidth: '500px', width: '90vw', maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: '0 0 30px rgba(0, 255, 65, 0.35), inset 0 0 15px rgba(0, 255, 65, 0.12)', color: '#EBE3D6', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: '12px', padding: '18px 20px', overflow: 'hidden' }}
            >
                {/* ✨ HEADER — Styled to match MEOW Engine & SYNC Diagnostic modal ✨ */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0, 255, 65, 0.3)', paddingBottom: '12px', marginBottom: '14px' }}>
                    <div style={{ color: '#00FF41', fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.1em', textShadow: '0 0 8px rgba(0, 255, 65, 0.6)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <OobSignalIcon size={14} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tt('oob_trace_title', '> OOB_GLASS_CHANNEL')}</span>
                    </div>
                    <button
                        className="icon-btn"
                        onClick={() => onClose && onClose()}
                        aria-label={tt('oob_trace_close', 'CLOSE')}
                        style={{ color: '#888', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', width: '28px', height: '28px', display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    >
                        <XIcon size={14} />
                    </button>
                </div>

                {/* ✨ STATUS STRIP — Styled to match SYNC Score Box ✨ */}
                <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0, 255, 65, 0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', flexShrink: 0 }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                        {tt('oob_trace_judgements', 'TOTAL JUDGEMENTS')}: <span style={{ color: '#00FF41', fontSize: '13px', fontWeight: '900' }}>{sum.total}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ color: STATUS_COLORS.ok, fontSize: '11px', fontWeight: 'bold' }}>[ {sum.ok} {tt('oob_trace_ok', 'OK')} ]</span>
                        {sum.flagged > 0 && <span style={{ color: '#FFB454', fontSize: '11px', fontWeight: 'bold' }}>[ {sum.flagged} {tt('oob_trace_flagged', 'FLAGGED')} ]</span>}
                    </div>
                </div>

                {/* ✨ BODY — subtle CRT scanline background over the log items ✨ */}
                <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative', padding: '4px 0', background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 65, 0.03) 2px, rgba(0, 255, 65, 0.03) 4px)' }}>
                    {entries.length === 0 && (
                        <div style={{ padding: '24px 16px', color: 'rgba(235, 227, 214, 0.55)', textAlign: 'center' }}>
                            {tt('oob_trace_empty', '[ NO_TRACE_ENTRIES ] — this photo fired no background judgements.')}
                        </div>
                    )}
                    {entries.map((e, i) => {
                        const status = classifyOobStatus(e);
                        const kind = String(e.kind || '?');
                        const secs = Number(e.latencyMs) > 0 ? (Number(e.latencyMs) / 1000).toFixed(1) + 's' : '—';
                        const open = expanded === i;
                        const KindIcon = KIND_ICONS[kind] || SignalBarsIcon;
                        return (
                            <div key={i} style={{ background: open ? 'rgba(0, 255, 65, 0.06)' : 'rgba(255, 255, 255, 0.03)', border: `1px solid ${open ? 'rgba(0, 255, 65, 0.4)' : 'rgba(0, 255, 65, 0.15)'}`, borderRadius: '8px', marginBottom: '8px', transition: 'all 0.15s ease' }}>
                                <div
                                    onClick={() => setExpanded(open ? null : i)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', cursor: 'pointer' }}
                                >
                                    <span aria-hidden="true" style={{ color: open ? '#00FF41' : 'rgba(235, 227, 214, 0.45)', fontSize: '10px', transition: 'transform 0.15s ease', transform: open ? 'rotate(90deg)' : 'none', width: '8px', textAlign: 'center', flexShrink: 0 }}>{'▸'}</span>
                                    <span style={{ color: STATUS_COLORS[status], display: 'flex', alignItems: 'center' }}><KindIcon /></span>
                                    <span style={{ fontWeight: 'bold', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tt('oob_trace_kind_' + kind, kind.toUpperCase())}</span>
                                    {e.flux?.enabled && (
                                        <span style={{ color: e.flux.style === 'custom' ? '#FFB454' : '#00FF41', background: e.flux.style === 'custom' ? 'rgba(255, 180, 84, 0.12)' : 'rgba(0, 255, 65, 0.1)', border: `1px solid ${e.flux.style === 'custom' ? 'rgba(255, 180, 84, 0.4)' : 'rgba(0, 255, 65, 0.35)'}`, borderRadius: '4px', padding: '1px 5px', fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.04em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                            {e.flux.style === 'hybrid_perchance' ? '+ HYBRID' : e.flux.style === 'custom' ? '+ CUSTOM' : '+ FLUX'}
                                        </span>
                                    )}
                                    <span aria-hidden="true" style={{ flex: 1, borderBottom: '1px dotted rgba(235, 227, 214, 0.18)', margin: '0 2px', minWidth: '12px' }} />
                                    <span style={{ color: STATUS_COLORS[status], fontWeight: 'bold', fontSize: '9.5px', letterSpacing: '0.06em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                                        <span aria-hidden="true" style={{ width: '5px', height: '5px', borderRadius: '1.5px', background: STATUS_COLORS[status], boxShadow: '0 0 5px ' + STATUS_COLORS[status] }} />
                                        [ {tt(STATUS_KEYS[status], status.toUpperCase())} ]
                                    </span>
                                    <span style={{ color: 'rgba(235, 227, 214, 0.5)', fontSize: '10px', minWidth: '30px', textAlign: 'right', flexShrink: 0 }}>{secs}</span>
                                </div>
                                {open && (
                                    <div style={{ margin: '0 12px 10px 12px', padding: '10px 12px', background: 'rgba(0, 0, 0, 0.65)', border: '1px solid rgba(0, 255, 65, 0.25)', borderLeft: '3px solid #00FF41', borderRadius: '6px', fontSize: '10.5px', lineHeight: 1.6, color: 'rgba(235, 227, 214, 0.8)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        <div style={{ color: '#00FF41', fontWeight: 'bold', marginBottom: '4px' }}>{tt('oob_trace_ask', '> ASK')}</div>
                                        <div style={{ marginBottom: '8px' }}>{e.askHead || '(empty)'}</div>
                                        {e.replyHead && (
                                            <>
                                                <div style={{ color: '#00FF41', fontWeight: 'bold', marginBottom: '4px' }}>{tt('oob_trace_reply', '> REPLY')}</div>
                                                <div style={{ marginBottom: e.flux?.enabled ? '8px' : 0 }}>{e.replyHead}</div>
                                            </>
                                        )}
                                        {e.flux?.enabled && (
                                            <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px dashed rgba(0, 255, 65, 0.25)' }}>
                                                <div style={{ color: e.flux.style === 'custom' ? '#FFB454' : '#00FF41', fontWeight: 'bold', marginBottom: '4px' }}>
                                                    {e.flux.style === 'hybrid_perchance'
                                                        ? `> NATURAL LANGUAGE / DANBOORU HYBRID (${e.flux.tokenBudget || 256}T)`
                                                        : e.flux.style === 'custom'
                                                            ? `> CUSTOM OOB DIRECTOR (${e.flux.tokenBudget || 256}T)`
                                                            : `> FLUX / NATURAL LANGUAGE (${e.flux.tokenBudget || 256}T)`}
                                                </div>
                                                {e.flux.ask && <div style={{ marginBottom: '6px', color: 'rgba(235, 227, 214, 0.72)' }}>{e.flux.ask}</div>}
                                                <div style={{ color: e.flux.style === 'custom' ? '#FFB454' : '#00FF41', fontWeight: 'bold', marginBottom: '2px' }}>
                                                    {e.flux.style === 'hybrid_perchance' ? '> HYBRID_PROMPT (PROSE + TAGS)' : e.flux.style === 'custom' ? '> CUSTOM_OOB_PROMPT' : '> FLUX_PROMPT'}
                                                </div>
                                                <div style={{ color: e.flux.reply ? '#EBE3D6' : '#FFB454' }}>
                                                    {e.flux.reply || '[DETERMINISTIC_FALLBACK — OOB omitted flux_prompt]'}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ✨ FOOTER — Phosphor trust line & blinking cursor ✨ */}
                <div style={{ padding: '10px 0 0 0', borderTop: '1px solid rgba(0, 255, 65, 0.25)', color: 'rgba(235, 227, 214, 0.5)', fontSize: '10px', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ flex: 1 }}>{tt('oob_trace_footer', '// Background judgement only — outside chat history, verified before use.')}</span>
                    <span aria-hidden="true" style={{ color: '#00FF41', animation: 'cursorBlink 0.5s infinite', fontWeight: 'bold', flexShrink: 0 }}>{'█'}</span>
                </div>
            </div>
        </div>
    );
};
