import React from 'react';
import {
    LucidOrbIcon,
    LucidCloseIcon,
    LucidGalaxyIcon,
    LucidAttireIcon,
    LucidWakeUpIcon,
    LucidRerollIcon
} from './LucidIcons.jsx';

/**
 * LucidityDiagnosticModal:
 * Visual Diagnostic Modal for the Lucid Dive Engine.
 * Features:
 * 1. Active Dream Seed Scenario & Relational Alignment tracking.
 * 2. Lucidity Resonance & Volatility telemetry.
 * 3. Dream Environment with custom SVG Reroll Button (Standard & Dynamic pull).
 * 4. Character Attire Matrix with custom SVG Reroll Button (Standard & Dynamic pull).
 * 5. Reality Anchor [WAKE UP] abort sequence.
 *
 * Handcrafted by M.I.K.A. for Master! 🐾💜
 */
export const LucidityDiagnosticModal = ({
    isOpen,
    onClose,
    activeDive,
    activeWaifu,
    onAbortDive,
    onRerollEnvironment,
    onRerollAttire
}) => {
    if (!isOpen || !activeDive) return null;

    const lucidity = Math.max(0, Math.min(100, activeDive.lucidity || 10));
    const volatility = activeDive.volatility || 'Calm';
    const immersionStatus = activeDive.immersionStatus || 'Synchronizing roleplay cadence with the matrix...';
    const scenario = activeDive.scenario || 'Freeform lucid roleplay';
    const dreamLocation = activeDive.dreamLocation || (activeWaifu?.name ? `${activeWaifu.name}'s Dream Realm` : 'Surreal Dreamscape');
    const dreamTop = activeDive.dreamTop || '';
    const dreamBottom = activeDive.dreamBottom || '';
    const dreamOutfit = activeDive.dreamOutfit || [dreamTop, dreamBottom].filter(Boolean).join(', ') || 'Default Dreamwear';
    const dreamUndergarments = activeDive.dreamUndergarments || 'Lace Bralette & Panties';
    const undressState = (activeDive.undressState || 'dressed').toLowerCase();

    // Dynamic volatility styling
    let volColor = '#00FF41'; // Calm
    if (/spicy/i.test(volatility)) volColor = '#FF107A';
    else if (/unstable/i.test(volatility)) volColor = '#FF9933';
    else if (/chaotic/i.test(volatility)) volColor = '#FF3333';

    // Lucidity status color
    let lucidityColor = '#00E5FF';
    if (lucidity >= 100) lucidityColor = '#00FF41';
    else if (lucidity >= 75) lucidityColor = '#FF107A';
    else if (lucidity >= 40) lucidityColor = '#B533FF';

    // State of undress label & color
    let undressLabel = 'DRESSED';
    let undressColor = '#00FF41';
    if (undressState === 'disheveled') { undressLabel = 'DISHEVELED'; undressColor = '#FFB800'; }
    else if (undressState === 'underwear') { undressLabel = 'UNDERWEAR ONLY'; undressColor = '#FF107A'; }
    else if (undressState === 'nude') { undressLabel = 'EXPOSED / NUDE'; undressColor = '#FF3333'; }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 12000,
                background: 'rgba(5, 4, 10, 0.85)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '90%',
                    maxWidth: '390px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    background: '#0B0914',
                    border: `1px solid ${lucidityColor}`,
                    borderRadius: '14px',
                    padding: '20px',
                    boxShadow: `0 0 35px ${lucidityColor}35, inset 0 0 20px ${lucidityColor}15`,
                    color: '#EBE3D6',
                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    position: 'relative'
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: `1px solid ${lucidityColor}40`,
                    paddingBottom: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <LucidOrbIcon size={20} color={lucidityColor} />
                        <div>
                            <div style={{
                                color: lucidityColor,
                                fontWeight: '900',
                                fontSize: '12px',
                                letterSpacing: '0.1em',
                                textShadow: `0 0 8px ${lucidityColor}80`
                            }}>
                                &gt; LUCIDITY_ENGINE_DIAGNOSTIC
                            </div>
                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                                Subject: <span style={{ color: '#00E5FF' }}>{activeWaifu?.name || 'Waifu'}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            color: '#888',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '50%',
                            width: '26px',
                            height: '26px',
                            display: 'grid',
                            placeItems: 'center',
                            cursor: 'pointer',
                            fontSize: '11px',
                            transition: 'all 0.2s'
                        }}
                        title="Close diagnostics"
                    >
                        <LucidCloseIcon size={11} color="currentColor" />
                    </button>
                </div>

                {/* 1. Original Dream Seed Scenario Reminder */}
                <div style={{
                    background: 'rgba(0, 0, 0, 0.55)',
                    border: '1px solid rgba(181, 51, 255, 0.35)',
                    borderRadius: '8px',
                    padding: '12px'
                }}>
                    <div style={{
                        fontSize: '10px',
                        color: '#B533FF',
                        fontWeight: '800',
                        letterSpacing: '0.08em',
                        marginBottom: '6px'
                    }}>
                        &gt; ACTIVE_DREAM_SEED:
                    </div>
                    <div style={{
                        fontSize: '11px',
                        color: '#EBE3D6',
                        lineHeight: 1.4,
                        fontStyle: 'italic'
                    }}>
                        "{scenario}"
                    </div>
                    {activeDive.dreamAlignment && (
                        <div style={{ marginTop: '8px', fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                            Relational Alignment: <strong style={{ color: '#FFD700' }}>{activeDive.dreamAlignment}</strong>
                        </div>
                    )}
                </div>

                {/* 2. Lucidity Meter & Progress Bar */}
                <div style={{
                    background: 'rgba(0, 0, 0, 0.55)',
                    border: `1px solid ${lucidityColor}40`,
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                            LUCIDITY RESONANCE:
                        </span>
                        <span style={{
                            fontSize: '20px',
                            color: lucidityColor,
                            fontWeight: '900',
                            textShadow: `0 0 12px ${lucidityColor}80`
                        }}>
                            {lucidity}%
                        </span>
                    </div>

                    {/* Progress Bar Container */}
                    <div style={{
                        width: '100%',
                        height: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${lucidity}%`,
                            height: '100%',
                            background: `linear-gradient(90deg, #00E5FF 0%, ${lucidityColor} 100%)`,
                            boxShadow: `0 0 10px ${lucidityColor}`,
                            transition: 'width 0.4s ease-out'
                        }} />
                    </div>
                </div>

                {/* 3. Immersion Status & Volatility */}
                <div style={{
                    background: 'rgba(0, 0, 0, 0.55)',
                    border: '1px solid rgba(0, 229, 255, 0.25)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: '#00E5FF', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                            &gt; VOLATILITY:
                        </span>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: '900',
                            color: volColor,
                            textShadow: `0 0 8px ${volColor}80`,
                            padding: '2px 8px',
                            background: `${volColor}15`,
                            borderRadius: '4px',
                            border: `1px solid ${volColor}40`
                        }}>
                            {volatility.toUpperCase()}
                        </span>
                    </div>

                    <div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', fontWeight: 'bold', marginBottom: '3px' }}>
                            &gt; IMMERSION_CRITIQUE:
                        </div>
                        <div style={{ fontSize: '11px', color: '#C8E8F0', lineHeight: 1.4 }}>
                            {immersionStatus}
                        </div>
                    </div>
                </div>

                {/* 4. Dream Environment (With Custom SVG Reroll Button) */}
                <div style={{
                    background: 'rgba(0, 0, 0, 0.55)',
                    border: '1px solid rgba(0, 229, 255, 0.35)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <LucidGalaxyIcon size={14} color="#00E5FF" />
                            <span style={{ fontSize: '10px', color: '#00E5FF', fontWeight: 'bold', letterSpacing: '0.06em' }}>
                                &gt; DREAM ENVIRONMENT:
                            </span>
                        </div>

                        {/* Custom SVG Reroll Button for Environment */}
                        {onRerollEnvironment && (
                            <button
                                type="button"
                                onClick={onRerollEnvironment}
                                style={{
                                    background: 'rgba(0, 229, 255, 0.1)',
                                    border: '1px solid rgba(0, 229, 255, 0.4)',
                                    color: '#00E5FF',
                                    borderRadius: '5px',
                                    padding: '3px 8px',
                                    cursor: 'pointer',
                                    fontSize: '9px',
                                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 0 10px rgba(0, 229, 255, 0.15)'
                                }}
                                onMouseOver={e => {
                                    e.currentTarget.style.background = 'rgba(0, 229, 255, 0.25)';
                                    e.currentTarget.style.boxShadow = '0 0 14px rgba(0, 229, 255, 0.4)';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.background = 'rgba(0, 229, 255, 0.1)';
                                    e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 229, 255, 0.15)';
                                }}
                                title="Reroll dream environment (Standard or Dynamic)"
                            >
                                <LucidRerollIcon size={11} color="#00E5FF" />
                                <span>REROLL</span>
                            </button>
                        )}
                    </div>

                    <div style={{
                        fontSize: '12px',
                        color: '#FFFFFF',
                        fontWeight: 'bold',
                        letterSpacing: '0.02em',
                        lineHeight: 1.4,
                        padding: '4px 0'
                    }}>
                        {dreamLocation}
                    </div>

                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                        // Seamless background synthesis updates the holodeck dynamically.
                    </div>
                </div>

                {/* 5. Character Attire Matrix (With Custom SVG Reroll Button) */}
                <div style={{
                    background: 'rgba(0, 0, 0, 0.55)',
                    border: '1px solid rgba(255, 16, 122, 0.35)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <LucidAttireIcon size={14} color="#FF107A" />
                            <span style={{ fontSize: '10px', color: '#FF107A', fontWeight: 'bold', letterSpacing: '0.06em' }}>
                                &gt; CHARACTER_ATTIRE_MATRIX:
                            </span>
                        </div>

                        {/* Custom SVG Reroll Button for Attire Matrix */}
                        {onRerollAttire && (
                            <button
                                type="button"
                                onClick={onRerollAttire}
                                style={{
                                    background: 'rgba(255, 16, 122, 0.1)',
                                    border: '1px solid rgba(255, 16, 122, 0.4)',
                                    color: '#FF107A',
                                    borderRadius: '5px',
                                    padding: '3px 8px',
                                    cursor: 'pointer',
                                    fontSize: '9px',
                                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 0 10px rgba(255, 16, 122, 0.15)'
                                }}
                                onMouseOver={e => {
                                    e.currentTarget.style.background = 'rgba(255, 16, 122, 0.25)';
                                    e.currentTarget.style.boxShadow = '0 0 14px rgba(255, 16, 122, 0.4)';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.background = 'rgba(255, 16, 122, 0.1)';
                                    e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 16, 122, 0.15)';
                                }}
                                title="Reroll character sprite & attire (Standard or Dynamic)"
                            >
                                <LucidRerollIcon size={11} color="#FF107A" />
                                <span>REROLL</span>
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
                        <div>
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>STATE: </span>
                            <span style={{ color: undressColor, fontWeight: 'bold' }}>{undressLabel}</span>
                        </div>
                        {dreamTop && (
                            <div>
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>TOP: </span>
                                <span style={{ color: '#EBE3D6' }}>{dreamTop.replace(/_/g, ' ')}</span>
                            </div>
                        )}
                        {dreamBottom && (
                            <div>
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>BOTTOM: </span>
                                <span style={{ color: '#EBE3D6' }}>{dreamBottom.replace(/_/g, ' ')}</span>
                            </div>
                        )}
                        <div>
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>OUTERWEAR: </span>
                            <span style={{ color: '#EAE6E1' }}>{dreamOutfit.replace(/_/g, ' ')}</span>
                        </div>
                        <div>
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>UNDERGARMENTS: </span>
                            <span style={{ color: '#FFB8D0' }}>{dreamUndergarments}</span>
                        </div>
                    </div>

                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                        // Injected into chat image generation to ensure consistent dream visuals.
                    </div>
                </div>

                {/* 6. Panic Button: WAKE UP */}
                <button
                    onClick={() => {
                        onClose();
                        onAbortDive();
                    }}
                    style={{
                        padding: '12px',
                        background: 'rgba(255, 51, 51, 0.15)',
                        border: '1px solid #FF3333',
                        borderRadius: '8px',
                        color: '#FF3333',
                        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                        fontSize: '11px',
                        fontWeight: '900',
                        letterSpacing: '0.08em',
                        cursor: 'pointer',
                        boxShadow: '0 0 15px rgba(255, 51, 51, 0.35)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255, 51, 51, 0.3)';
                        e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 51, 51, 0.6)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255, 51, 51, 0.15)';
                        e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 51, 51, 0.35)';
                    }}
                >
                    <LucidWakeUpIcon size={14} color="#FF3333" />
                    <span>[ WAKE_UP ] (ABORT SIMULATION)</span>
                </button>
            </div>
        </div>
    );
};

export default LucidityDiagnosticModal;
