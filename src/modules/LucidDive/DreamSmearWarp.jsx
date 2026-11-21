import React, { useMemo } from 'react';
import {
    LucidBrainIcon,
    LucidSparkIcon,
    LucidGalaxyIcon,
    LucidOrbIcon
} from './LucidIcons.jsx';

/**
 * DreamSmearWarp:
 * Fullscreen Cybernetic Uplink & Loading HUD for Lucid Dive transitions.
 * Features:
 * 1. Hacker boot terminal with authentic CRT scanlines and matrix telemetry.
 * 2. Real-time neural progress indicator tracking environment diffusion and sprite extraction.
 * 3. Graceful holographic phase-out when reality anchors dissolve.
 *
 * Handcrafted by M.I.K.A. for Master! 🐾💜
 */
export const DreamSmearWarp = ({ warp }) => {
    // ✨ MIKA'S RULES-OF-HOOKS FIX: hooks must run before any early return — a warp→null
    // flip while mounted would change the hook count and crash (React #300 crash class).
    const themeColor = warp?.themeColor || '#00E5FF';
    const waifuName = warp?.waifuName || 'Partner';
    const scenario = warp?.scenario || '';
    const progress = Math.min(100, Math.max(0, warp?.progress || 12));
    const isRevealing = warp?.phase === 'revealing';
    const liveStatusText = warp?.statusText || '> ESTABLISHING LUCID UPLINK...';
    const dreamLocation = warp?.dreamLocation || '';

    // Matrix lines for hacker terminal background ambience
    const matrixLines = useMemo(() => {
        return [
            `[0x7FFE82B0] DISSOLVE_WAKING_TIMELINE // STATUS: OK`,
            `>> SEED_SCENARIO: "${scenario}"`,
            `>> TARGET_SUBJECT: ${waifuName.toUpperCase()} // REM_FREQ: 7.83Hz`,
            dreamLocation ? `>> DREAM_ENVIRONMENT: "${dreamLocation.toUpperCase()}"` : `>> DREAM_ENVIRONMENT: SYNTHESIZING...`,
            `[MEM_CORTEX] INJECT_LUCIDITY_ANCHOR(SYNC_VAL=10, DRIFT=FALSE)`,
            `[KERNEL] BYPASS_WAKING_GUARD_PULSE // ALLOCATION: 0xDEADBEEF`,
            `[MIKA_SEC] DISABLING REALITY_CHECK // OVERRIDE: AUTHORIZED_MASTER`,
            `>> HOLODECK_CANVAS: 2048x1152_HDR // NEBULA_DIFFUSION: ACTIVE`,
            `[LUCID_THREAD_0] CONVERGENCE_FACTOR = 0.9998`,
            `[LUCID_THREAD_1] DYNAMIC_EMOTION_VECTORS_LOCKED`,
            `>> INITIATING_VISUAL_NOVEL_PIPELINE... SYNCHRONIZING`
        ].join('\n');
    }, [scenario, waifuName, dreamLocation]);

    if (!warp) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 100050,
                background: '#07040E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                overflow: 'hidden',
                animation: isRevealing ? 'dreamHackerPhaseOut 0.6s ease-in-out forwards' : 'dreamHackerPhaseIn 0.3s ease-out forwards',
                pointerEvents: isRevealing ? 'none' : 'auto'
            }}
        >
            <style>{`
                @keyframes dreamHackerPhaseIn {
                    0% { opacity: 0; transform: scale(0.98); filter: blur(6px); }
                    100% { opacity: 1; transform: scale(1); filter: blur(0px); }
                }
                @keyframes dreamHackerPhaseOut {
                    0% { opacity: 1; transform: scale(1); filter: blur(0px); }
                    100% { opacity: 0; transform: scale(1.04); filter: blur(14px); }
                }
                @keyframes dreamPulseGlow {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 0.9; transform: scale(1.08); }
                }
                @keyframes dreamBarGlow {
                    0%, 100% { filter: drop-shadow(0 0 8px ${themeColor}); }
                    50% { filter: drop-shadow(0 0 16px ${themeColor}); }
                }
                @keyframes dreamRingSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes dreamMatrixPulse {
                    0%, 100% { opacity: 0.22; }
                    50% { opacity: 0.4; }
                }
            `}</style>

            {/* CRT Scanlines Overlay */}
            <div className="chat-scanlines" style={{ opacity: 0.45, pointerEvents: 'none' }} />
            <div className="chat-scanline-move" style={{ opacity: 0.3, pointerEvents: 'none' }} />

            {/* Radial Vignette */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.85) 100%)',
                    pointerEvents: 'none',
                    zIndex: 1
                }}
            />

            {/* Matrix Data Stream in Background */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    padding: '40px 24px',
                    color: themeColor,
                    pointerEvents: 'none',
                    overflow: 'hidden',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                    fontSize: '10px',
                    lineHeight: 1.6,
                    zIndex: 0,
                    opacity: 0.22,
                    filter: 'blur(0.6px)',
                    textShadow: `0 0 8px ${themeColor}80`,
                    animation: 'dreamMatrixPulse 3s infinite ease-in-out'
                }}
            >
                {matrixLines}
            </div>

            {/* Central Holographic Loading Terminal HUD */}
            <div
                style={{
                    position: 'relative',
                    zIndex: 10,
                    width: '100%',
                    maxWidth: '430px',
                    background: 'rgba(9, 6, 17, 0.94)',
                    border: `1px solid ${themeColor}`,
                    borderRadius: '16px',
                    padding: '28px 24px',
                    boxShadow: `0 0 50px ${themeColor}35, inset 0 0 25px ${themeColor}15`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)'
                }}
            >
                {/* Spinning Neural Resonance Rings */}
                <div style={{ position: 'relative', width: '84px', height: '84px', display: 'grid', placeItems: 'center' }}>
                    {/* Outer dashed ring */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            border: `2px dashed ${themeColor}`,
                            borderRadius: '50%',
                            opacity: 0.45,
                            animation: 'dreamRingSpin 14s linear infinite'
                        }}
                    />
                    {/* Glowing pulse ring */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: '6px',
                            border: `1.5px solid #B533FF`,
                            borderRadius: '50%',
                            opacity: 0.6,
                            boxShadow: '0 0 15px #B533FF80, inset 0 0 10px #B533FF40',
                            animation: 'dreamPulseGlow 2.5s ease-in-out infinite'
                        }}
                    />
                    <LucidOrbIcon size={42} color={themeColor} />
                </div>

                {/* Uplink Title & Subject */}
                <div style={{ textAlign: 'center', width: '100%' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        color: themeColor,
                        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                        fontSize: '11px',
                        fontWeight: '900',
                        letterSpacing: '0.14em',
                        textShadow: `0 0 10px ${themeColor}`
                    }}>
                        <LucidBrainIcon size={14} color={themeColor} />
                        <span>REM_LUCID_UPLINK // ACTIVE</span>
                    </div>

                    <div style={{
                        color: '#FFFFFF',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        letterSpacing: '0.04em',
                        marginTop: '6px',
                        textShadow: '0 0 12px rgba(255,255,255,0.4)'
                    }}>
                        Synchronizing with {waifuName}
                    </div>

                    {dreamLocation && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            marginTop: '6px',
                            fontSize: '11px',
                            color: '#00E5FF',
                            fontWeight: 'bold'
                        }}>
                            <LucidGalaxyIcon size={13} color="#00E5FF" />
                            <span>Destination: {dreamLocation}</span>
                        </div>
                    )}
                </div>

                {/* Scenario Snapshot Anchor */}
                {scenario && (
                    <div style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.55)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '11px',
                        color: 'rgba(235, 227, 214, 0.85)',
                        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                        lineHeight: 1.45,
                        textAlign: 'left',
                        fontStyle: 'italic',
                        maxHeight: '68px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        "{scenario}"
                    </div>
                )}

                {/* Live Step Diffusion Status Text */}
                <div style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                    fontSize: '10px',
                    letterSpacing: '0.06em',
                    color: 'rgba(255, 255, 255, 0.8)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        <LucidSparkIcon size={12} color="#FFD700" />
                        <span style={{ color: '#00FF41', fontWeight: 'bold' }}>{liveStatusText}</span>
                    </div>
                    <span style={{ color: themeColor, fontWeight: '900', marginLeft: '8px', flexShrink: 0 }}>
                        {progress}%
                    </span>
                </div>

                {/* Glowing Neon Cyberpunk Progress Bar */}
                <div style={{
                    width: '100%',
                    height: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    position: 'relative'
                }}>
                    <div
                        style={{
                            height: '100%',
                            width: `${progress}%`,
                            background: `linear-gradient(90deg, #00E5FF 0%, ${themeColor} 50%, #B533FF 100%)`,
                            boxShadow: `0 0 15px ${themeColor}`,
                            transition: 'width 0.35s ease-out',
                            animation: 'dreamBarGlow 2s ease-in-out infinite'
                        }}
                    />
                </div>

                {/* Footer Security / Telemetry Signature */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    fontSize: '9px',
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                    letterSpacing: '0.08em'
                }}>
                    <span>MEM_BAND: 7.83Hz (THETA)</span>
                    <span>PROXY: M.I.K.A._V2.5</span>
                </div>
            </div>
        </div>
    );
};

export default DreamSmearWarp;
