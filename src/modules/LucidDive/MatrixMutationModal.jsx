import React, { useState } from 'react';

export const MatrixMutationModal = ({
    isOpen,
    onClose,
    activeDive,
    activeWaifu,
    onExtractAndExit,
    onExtractAndExtend,
    onContinueExtended,
    isExtracting
}) => {
    if (!isOpen || !activeDive) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(5, 3, 10, 0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.25s ease'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '540px',
                background: 'linear-gradient(180deg, #0e091d 0%, #05030a 100%)',
                border: '1px solid #00FF41',
                borderRadius: '16px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 255, 65, 0.3), inset 0 0 20px rgba(0, 255, 65, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
            }}>
                {/* Header Banner */}
                <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    borderBottom: '1px solid rgba(0, 255, 65, 0.25)',
                    background: 'rgba(0, 255, 65, 0.05)'
                }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎉 ✨ 🔮</div>
                    <h2 style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: '900',
                        color: '#00FF41',
                        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                        letterSpacing: '0.12em',
                        textShadow: '0 0 12px rgba(0,255,65,0.6)'
                    }}>
                        SIMULATION CLEARED!
                    </h2>
                    <div style={{
                        fontSize: '11px',
                        color: 'rgba(0, 255, 65, 0.7)',
                        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                        marginTop: '4px'
                    }}>
                        Lucidity reached 100% // Climax Achieved
                    </div>
                </div>

                {/* Body Content */}
                <div style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    color: '#EBE3D6',
                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
                }}>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, textAlign: 'center' }}>
                        Dive Successful with <strong style={{ color: '#00E5FF' }}>{activeWaifu?.name}</strong>!
                        <br />
                        Extract this explored roleplay memory into her permanent Matrix?
                    </p>

                    <div style={{
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px dashed rgba(0, 229, 255, 0.25)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.7)',
                        lineHeight: 1.4
                    }}>
                        <div style={{ color: '#00E5FF', fontWeight: 'bold', marginBottom: '4px' }}>
                            &gt; EXTRACTION_REWARDS:
                        </div>
                        • 1-2 Danbooru-style fetish tags appended to {activeWaifu?.name}'s quirks database.<br />
                        • High-res "Dream Snapshot" image synthesized and saved to your permanent gallery.
                    </div>

                    {isExtracting && (
                        <div style={{
                            textAlign: 'center',
                            color: '#00FF41',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            animation: 'csd-pulse 1s infinite'
                        }}>
                            Extracting neural tags &amp; generating Dream Snapshot... 📸
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid rgba(0, 255, 65, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    {/* Extract & Exit */}
                    <button
                        onClick={onExtractAndExit}
                        disabled={isExtracting}
                        style={{
                            padding: '12px',
                            background: 'linear-gradient(90deg, #00FF41 0%, #00E5FF 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#000',
                            fontSize: '12px',
                            fontWeight: '900',
                            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                            letterSpacing: '0.05em',
                            cursor: isExtracting ? 'wait' : 'pointer',
                            boxShadow: '0 0 15px rgba(0, 255, 65, 0.3)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {isExtracting ? 'EXTRACTING MATRIX...' : '[ 💾 EXTRACT MATRIX & END DIVE ]'}
                    </button>

                    {/* Extract & Extend */}
                    <button
                        onClick={onExtractAndExtend}
                        disabled={isExtracting}
                        style={{
                            padding: '10px',
                            background: 'rgba(255, 215, 0, 0.15)',
                            border: '1px solid #FFD700',
                            borderRadius: '8px',
                            color: '#FFD700',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                            letterSpacing: '0.05em',
                            cursor: isExtracting ? 'wait' : 'pointer',
                            boxShadow: '0 0 10px rgba(255, 215, 0, 0.2)',
                            transition: 'all 0.2s'
                        }}
                    >
                        [ 🌌 EXTRACT &amp; CONTINUE IN EXTENDED MODE ]
                    </button>

                    {/* Continue Extended Without Extracting */}
                    <button
                        onClick={onContinueExtended}
                        disabled={isExtracting}
                        style={{
                            padding: '8px',
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '6px',
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '10px',
                            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                            cursor: isExtracting ? 'wait' : 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        [ Continue Roleplay Without Extracting Yet ]
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MatrixMutationModal;

