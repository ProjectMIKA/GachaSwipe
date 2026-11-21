import React, { useState, useEffect } from 'react';
import { LucidOrbIcon } from './LucidIcons.jsx';

/**
 * HolodeckOverlay:
 * High-immersion Visual Novel canvas for 1-on-1 Lucid Dive sessions.
 * Features:
 * 1. Dynamic Dreamscape Background with smooth 1.2s crossfading and RAG caching.
 * 2. Anchored Visual Novel character sprite stage standing naturally.
 * 3. Overhead speech bubble with dynamic speaker detection.
 * 4. Ambient floating celestial particles and cyber grid.
 * 5. Smooth blur & phase into background when switching into chat log mode (matching group chat roleplay).
 *
 * Handcrafted by M.I.K.A. for Master! 🐾💜
 */
export const HolodeckOverlay = ({
    activeDive,
    activeWaifu,
    rpBubbleState,
    formatMessageText = (t) => t,
    hideRpVisuals = false,
    onWakeUp,
    dreamTransmittedMsg,
    onAdvanceBubble
}) => {
    // ✨ MIKA'S RULES-OF-HOOKS FIX: hooks must run before any early return — an
    // activeDive→null flip while mounted would change the hook count (React #300).
    // Background crossfading engine
    const [currentBg, setCurrentBg] = useState(activeDive?.dreamBgUrl || null);
    const [prevBg, setPrevBg] = useState(null);

    // User transmitted dream intent floating projection
    const [activeUserFloat, setActiveUserFloat] = useState(null);

    useEffect(() => {
        if (dreamTransmittedMsg?.text) {
            setActiveUserFloat(dreamTransmittedMsg);
            const timer = setTimeout(() => {
                setActiveUserFloat(prev => prev?.timestamp === dreamTransmittedMsg.timestamp ? null : prev);
            }, 3600);
            return () => clearTimeout(timer);
        }
    }, [dreamTransmittedMsg?.timestamp, dreamTransmittedMsg?.text]);

    // Crossfade backgrounds smoothly whenever activeDive.dreamBgUrl changes
    useEffect(() => {
        if (activeDive?.dreamBgUrl && activeDive.dreamBgUrl !== currentBg) {
            setPrevBg(currentBg);
            setCurrentBg(activeDive.dreamBgUrl);
            const timer = setTimeout(() => {
                setPrevBg(null);
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [activeDive?.dreamBgUrl, currentBg]);

    if (!activeDive) return null;

    // Check if waifu is currently speaking
    const isWaifuSpeaking = rpBubbleState && !rpBubbleState.isGm && !rpBubbleState.isUser && !rpBubbleState.isSystemAction &&
        (rpBubbleState.speakerName === activeWaifu?.name || (activeWaifu?.name && activeWaifu.name.includes(rpBubbleState.speakerName)));

    const spriteUrl = activeWaifu?.spriteUrl || activeWaifu?.battleSpriteUrl;
    const avatarUrl = activeWaifu?.imageUrl || activeWaifu?.avatar || activeWaifu?.image || activeWaifu?.avatarUrl;
    const hasTransparentSprite = !!activeWaifu?.spriteUrl;

    return (
        <div
            className="holodeck-container"
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: hideRpVisuals ? 0 : 15,
                opacity: hideRpVisuals ? 0.22 : 1,
                filter: hideRpVisuals ? 'blur(8px) brightness(0.35)' : 'none',
                pointerEvents: hideRpVisuals ? 'none' : 'auto',
                transition: 'z-index 0.5s step-start, opacity 0.5s ease, filter 0.5s ease',
                overflow: 'hidden'
            }}
        >
            {/* Quick Wake Up Floating Trigger */}
            {onWakeUp && !hideRpVisuals && (
                <button
                    onClick={onWakeUp}
                    style={{
                        position: 'absolute',
                        top: '74px',
                        right: '20px',
                        zIndex: 130,
                        background: 'rgba(5, 3, 10, 0.8)',
                        border: '1px solid rgba(255, 51, 102, 0.7)',
                        borderRadius: '16px',
                        padding: '6px 14px',
                        color: '#FF3366',
                        fontSize: '10px',
                        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                        fontWeight: 'bold',
                        letterSpacing: '0.08em',
                        cursor: 'pointer',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.8), 0 0 12px rgba(255,51,102,0.3)',
                        transition: 'all 0.2s',
                        pointerEvents: 'auto'
                    }}
                    title="Wake up and return to waking timeline"
                >
                    <span>🌀</span> WAKE_UP
                </button>
            )}

            <style>{`
                @keyframes dreamscapePulse {
                    0%, 100% { opacity: 0.92; transform: scale(1.02); }
                    50% { opacity: 1; transform: scale(1.06); }
                }
                @keyframes etherealFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes jrpgSpeechPhase {
                    0% { opacity: 0; transform: translateY(8px) scale(0.96); filter: blur(2px); }
                    100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0px); }
                }
                @keyframes jrpgSpeechCycle {
                    0% {
                        opacity: 0;
                        transform: translateY(14px) scale(0.94);
                        filter: blur(4px);
                    }
                    10% {
                        opacity: 1;
                        transform: translateY(0px) scale(1);
                        filter: blur(0px);
                    }
                    86% {
                        opacity: 1;
                        transform: translateY(0px) scale(1);
                        filter: blur(0px);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(-8px) scale(0.97);
                        filter: blur(3px);
                    }
                }
                @keyframes particleDrift {
                    0% { transform: translateY(0) translateX(0); opacity: 0.4; }
                    50% { opacity: 0.8; }
                    100% { transform: translateY(-120px) translateX(30px); opacity: 0; }
                }
                @keyframes dreamMessageTranscend {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, 35px) scale(0.92);
                        filter: blur(6px);
                    }
                    14% {
                        opacity: 1;
                        transform: translate(-50%, 0px) scale(1);
                        filter: blur(0px);
                    }
                    68% {
                        opacity: 0.95;
                        transform: translate(-50%, -75px) scale(1.02);
                        filter: blur(0px);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -150px) scale(1.06);
                        filter: blur(8px);
                    }
                }
            `}</style>

            {/* 1. DYNAMIC DREAM BACKGROUND */}
            <div style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 0,
                overflow: 'hidden',
                background: '#040208'
            }}>
                {prevBg && (
                    <img
                        src={prevBg}
                        alt="Previous Dream Background"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center center',
                            filter: 'brightness(0.9) contrast(1.1) saturate(1.15)',
                            opacity: 0,
                            transition: 'opacity 1.2s ease-in-out',
                            zIndex: 0
                        }}
                    />
                )}

                {currentBg ? (
                    <img
                        key={currentBg}
                        src={currentBg}
                        alt="Dream Background"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center center',
                            animation: 'dreamscapePulse 25s ease-in-out infinite alternate',
                            filter: 'brightness(0.9) contrast(1.1) saturate(1.15)',
                            opacity: 1,
                            transition: 'opacity 1.2s ease-in-out',
                            zIndex: 1
                        }}
                    />
                ) : (
                    /* Cyber Holodeck Grid Fallback while background is generating */
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'radial-gradient(circle at 50% 50%, #150928 0%, #05020A 100%)'
                    }}>
                        {/* Dream Grid Lines */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: 'linear-gradient(rgba(181, 51, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.08) 1px, transparent 1px)',
                            backgroundSize: '40px 40px',
                            opacity: 0.8
                        }} />
                    </div>
                )}

                {/* Vignette Overlay */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5, 3, 10, 0.75) 100%)'
                }} />

                {/* Bottom Ground Blend so character sprite stands naturally against background */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '140px',
                    background: 'linear-gradient(to top, rgba(5, 3, 10, 0.85) 0%, transparent 100%)',
                    pointerEvents: 'none'
                }} />
            </div>

            {/* 2. GM / HOLODECK NARRATION BANNER */}
            {rpBubbleState && rpBubbleState.isGm && !rpBubbleState.isSystemAction && (
                <div style={{
                    position: 'absolute',
                    top: '90px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '90%',
                    maxWidth: '440px',
                    zIndex: 120
                }}>
                    <div style={{
                        animation: 'jrpgSpeechPhase 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                        background: 'rgba(7, 4, 14, 0.88)',
                        border: '1px solid #B533FF',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.85), 0 0 20px rgba(181,51,255,0.3)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#B533FF', fontSize: '10px', fontWeight: '900', letterSpacing: '0.1em', marginBottom: '6px' }}>
                            <LucidOrbIcon size={13} color="#B533FF" />
                            <span>DREAM NARRATION</span>
                        </div>
                        <div style={{ color: '#EBE3D6', fontSize: '12px', lineHeight: 1.5, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                            {formatMessageText(rpBubbleState.text)}
                        </div>
                    </div>
                </div>
            )}

            {/* 3. SYSTEM ACTION BANNER */}
            {rpBubbleState && rpBubbleState.isSystemAction && (
                <div style={{
                    position: 'absolute',
                    top: '90px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '90%',
                    maxWidth: '340px',
                    zIndex: 130
                }}>
                    <div style={{
                        animation: 'jrpgSpeechPhase 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                        background: 'rgba(5, 3, 8, 0.85)',
                        border: '1px solid #FF4500',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.9), 0 0 20px rgba(255,69,0,0.4)',
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                        textAlign: 'center'
                    }}>
                        <div style={{ color: '#FFD700', fontSize: '12px', fontWeight: '900', letterSpacing: '0.08em', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                            {formatMessageText(rpBubbleState.text.replace(/\[SYSTEM_ACTION:\s*|\]/g, ''))}
                        </div>
                    </div>
                </div>
            )}

            {/* 4. VISUAL NOVEL CHARACTER SPRITE STAGE */}
            <div style={{
                position: 'absolute',
                bottom: '80px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 20,
                width: '100%',
                maxWidth: '420px',
                height: '56vh',
                maxHeight: '480px',
                minHeight: '260px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                pointerEvents: 'none'
            }}>
                {/* 3.5. CHARACTER SPEECH BUBBLE (ANCHORED RIGHT ABOVE SPRITE HEAD) */}
                {isWaifuSpeaking && (
                    <div
                        key={rpBubbleState.id || rpBubbleState.text}
                        onClick={onAdvanceBubble}
                        title="Tap to advance speech"
                        style={{
                            position: 'absolute',
                            bottom: 'calc(100% + 12px)',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 'max-content',
                            minWidth: '140px',
                            maxWidth: 'min(420px, 88vw)',
                            zIndex: 140,
                            pointerEvents: 'auto',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{
                            animation: `jrpgSpeechCycle ${rpBubbleState.duration || 3200}ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
                            background: 'rgba(6, 4, 12, 0.94)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            border: '2px solid #00E5FF',
                            borderRadius: '14px',
                            padding: '10px 16px',
                            boxShadow: '0 10px 35px rgba(0,0,0,0.9), 0 0 25px rgba(0,229,255,0.35)',
                            position: 'relative'
                        }}>
                            <div style={{
                                color: '#00E5FF',
                                fontSize: '10px',
                                fontWeight: '900',
                                marginBottom: '4px',
                                letterSpacing: '0.08em',
                                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span>{activeWaifu?.name?.toUpperCase() || 'COMPANION'}</span>
                                <span style={{ fontSize: '8px', opacity: 0.5, letterSpacing: '0.05em' }}>▼ NEXT</span>
                            </div>
                            <div style={{
                                color: '#EBE3D6',
                                fontSize: '13px',
                                lineHeight: 1.45,
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap',
                                maxHeight: '160px',
                                overflowY: 'auto',
                                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
                            }}>
                                {formatMessageText(rpBubbleState.text)}
                            </div>
                            {/* Speech tail pointing down directly at her head */}
                            <div style={{
                                position: 'absolute',
                                bottom: '-8px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: 0,
                                height: 0,
                                borderLeft: '8px solid transparent',
                                borderRight: '8px solid transparent',
                                borderTop: '8px solid #00E5FF'
                            }} />
                            <div style={{
                                position: 'absolute',
                                bottom: '-5px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: 0,
                                height: 0,
                                borderLeft: '6px solid transparent',
                                borderRight: '6px solid transparent',
                                borderTop: '6px solid rgba(6, 4, 12, 0.94)'
                            }} />
                        </div>
                    </div>
                )}

                {/* Character Sprite or Hologram Avatar fallback */}
                <div style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    position: 'relative',
                    animation: 'etherealFloat 6s ease-in-out infinite alternate'
                }}>
                    {spriteUrl ? (
                        <img
                            src={spriteUrl}
                            alt={activeWaifu?.name || 'Dream Character'}
                            style={{
                                height: '100%',
                                width: 'auto',
                                objectFit: 'contain',
                                objectPosition: 'bottom center',
                                filter: hasTransparentSprite
                                    ? 'drop-shadow(0 0 15px rgba(0,229,255,0.3)) drop-shadow(0 12px 30px rgba(0,0,0,0.95))'
                                    : 'drop-shadow(0 10px 25px rgba(0,0,0,0.9))',
                                borderRadius: hasTransparentSprite ? '0' : '16px',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    ) : avatarUrl ? (
                        <div style={{
                            width: '180px',
                            height: '180px',
                            borderRadius: '50%',
                            border: '3px solid rgba(0, 229, 255, 0.7)',
                            boxShadow: '0 0 35px rgba(0, 229, 255, 0.4), inset 0 0 20px rgba(0, 229, 255, 0.3)',
                            overflow: 'hidden',
                            background: '#0B0914'
                        }}>
                            <img
                                src={avatarUrl}
                                alt={activeWaifu?.name || "Waifu Avatar"}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>
                    ) : null}
                </div>
            </div>

            {/* 5. USER TRANSMITTED DREAM INTENT FLOATING CAPSULE */}
            {activeUserFloat && (
                <div
                    key={activeUserFloat.timestamp}
                    style={{
                        position: 'absolute',
                        bottom: '90px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '88%',
                        maxWidth: '380px',
                        zIndex: 150,
                        pointerEvents: 'none',
                        animation: 'dreamMessageTranscend 3.6s cubic-bezier(0.22, 1, 0.36, 1) forwards'
                    }}
                >
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(6, 14, 30, 0.9) 0%, rgba(26, 10, 48, 0.92) 100%)',
                        border: '1.5px solid rgba(0, 229, 255, 0.75)',
                        borderRadius: '16px',
                        padding: '12px 18px',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.85), 0 0 25px rgba(0, 229, 255, 0.4), inset 0 0 15px rgba(181, 51, 255, 0.25)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid rgba(0, 229, 255, 0.25)',
                            paddingBottom: '4px'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '9px',
                                fontWeight: '900',
                                letterSpacing: '0.12em',
                                color: '#00E5FF',
                                textShadow: '0 0 8px rgba(0, 229, 255, 0.6)',
                                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
                            }}>
                                <span>◈</span>
                                <span>CONSCIOUSNESS_TRANSMISSION</span>
                            </div>
                            <span style={{ fontSize: '8px', color: 'rgba(0, 229, 255, 0.6)', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                                [SENT]
                            </span>
                        </div>
                        <div style={{
                            color: '#FFFFFF',
                            fontSize: '13px',
                            lineHeight: 1.45,
                            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                            textShadow: '0 0 10px rgba(255, 255, 255, 0.3)',
                            wordBreak: 'break-word'
                        }}>
                            {activeUserFloat.text}
                        </div>
                    </div>
                </div>
            )}

            {/* 5. ETHEREAL FLOATING PARTICLES */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3, overflow: 'hidden' }}>
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            bottom: `${(i * 15) % 80}%`,
                            left: `${(i * 18 + 10) % 90}%`,
                            width: `${(i % 3) * 2 + 3}px`,
                            height: `${(i % 3) * 2 + 3}px`,
                            borderRadius: '50%',
                            background: i % 2 === 0 ? '#00E5FF' : '#FF107A',
                            boxShadow: `0 0 10px ${i % 2 === 0 ? '#00E5FF' : '#FF107A'}`,
                            animation: `particleDrift ${6 + i * 2}s linear infinite`,
                            animationDelay: `${i * 1.2}s`
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default HolodeckOverlay;
