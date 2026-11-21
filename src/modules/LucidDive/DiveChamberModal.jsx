import React, { useState, useCallback } from 'react';
import { useDreamSynthesis } from './useDreamSynthesis.js';
import {
    LucidVortexIcon,
    LucidCloseIcon,
    LucidAllyIcon,
    LucidSwordsIcon,
    LucidRerollIcon,
    LucidRocketIcon
} from './LucidIcons.jsx';

/**
 * DiveChamberModal:
 * Diagnostic Terminal style pre-flight synchronization chamber for 1-on-1 Lucid Dive.
 * Matches M.E.O.W. and Neural Sync aesthetic with custom SVG icons.
 * Features per-character seed caching for both Ally and Antagonist modes.
 * Handcrafted by M.I.K.A. for Master! 🐾💜
 */
export const DiveChamberModal = ({
    isOpen,
    onClose,
    activeWaifu,
    activeChat = null,
    layla,
    preferences,
    onLaunchDive,
    showToast,
    showAlert
}) => {
    const [dreamAlignment, setDreamAlignment] = useState('Ally');

    const dream = useDreamSynthesis({
        layla,
        activeWaifu,
        activeChat,
        preferences,
        dreamAlignment,
        enabled: isOpen,
        showToast,
        showAlert
    });

    const themeColor = activeWaifu?.themeColor || activeWaifu?.color || '#00FF41';
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
    const themeRgb = hexToRgb(themeColor);

    const handleAlignmentChange = (newAlign) => {
        if (newAlign === dreamAlignment) return;
        setDreamAlignment(newAlign);
    };

    const handleConfirmLaunch = useCallback(() => {
        const chosenSeed = dream.selectedSeed || (dream.seeds && dream.seeds[0]);
        const chosenScenario = typeof chosenSeed === 'object' ? chosenSeed?.scenario : chosenSeed;
        if (!chosenScenario) {
            if (showAlert) {
                showAlert("Matrix Lock Missing", "Please select a dream seed before diving!");
            } else if (showToast) {
                showToast("Please select a dream seed before diving!");
            }
            return;
        }

        onLaunchDive({
            scenario: chosenScenario,
            mode: 'kinetic',
            alignment: dreamAlignment,
            dreamAlignment: dreamAlignment
        });
        onClose();
    }, [dream.selectedSeed, dream.seeds, dreamAlignment, onLaunchDive, onClose, showAlert, showToast]);

    if (!isOpen) return null;

    const isAlly = dreamAlignment === 'Ally';
    const isAntagonist = dreamAlignment === 'Antagonist';
    const charFirstName = activeWaifu?.name?.split(' ')[0] || 'Character';

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
                style={{
                    width: '100%',
                    maxWidth: '350px',
                    background: '#0B0914',
                    border: `1px solid ${themeColor}`,
                    borderRadius: '12px',
                    padding: '18px',
                    boxShadow: `0 0 30px ${themeColor}40, inset 0 0 15px ${themeColor}20`,
                    color: '#EBE3D6',
                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                    maxHeight: '88vh',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s ease'
                }}
            >
                {/* Diagnostic Header */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: `1px solid ${themeColor}60`,
                        paddingBottom: '10px',
                        marginBottom: '12px',
                        flexShrink: 0
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <LucidVortexIcon size={18} color={themeColor} />
                        <div>
                            <div style={{ color: themeColor, fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.08em', textShadow: `0 0 8px ${themeColor}80` }}>
                                &gt; DIVE_CHAMBER_SYNC
                            </div>
                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                                TARGET: {charFirstName.toUpperCase()}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            color: '#888',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '50%',
                            width: '26px',
                            height: '26px',
                            display: 'grid',
                            placeItems: 'center',
                            cursor: 'pointer',
                            fontSize: '11px',
                            lineHeight: 1,
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                        onMouseOut={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                        title="Close chamber"
                    >
                        <LucidCloseIcon size={11} color="currentColor" />
                    </button>
                </div>

                {/* Concise Alignment Buttons */}
                <div style={{ marginBottom: '6px', flexShrink: 0 }}>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', marginBottom: '6px', fontWeight: 'bold' }}>
                        DYNAMIC_RELATIONSHIP
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <button
                            type="button"
                            onClick={() => handleAlignmentChange('Ally')}
                            style={{
                                background: isAlly ? `rgba(${themeRgb}, 0.2)` : 'rgba(255,255,255,0.03)',
                                border: isAlly ? `1px solid ${themeColor}` : '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '6px',
                                padding: '8px 4px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                color: isAlly ? themeColor : '#888',
                                fontSize: '11px',
                                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'all 0.2s',
                                boxShadow: isAlly ? `0 0 10px ${themeColor}30` : 'none'
                            }}
                        >
                            <LucidAllyIcon size={14} color={isAlly ? themeColor : '#888'} />
                            <span>ALLY</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAlignmentChange('Antagonist')}
                            style={{
                                background: isAntagonist ? `rgba(${themeRgb}, 0.2)` : 'rgba(255,255,255,0.03)',
                                border: isAntagonist ? `1px solid ${themeColor}` : '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '6px',
                                padding: '8px 4px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                color: isAntagonist ? themeColor : '#888',
                                fontSize: '11px',
                                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'all 0.2s',
                                boxShadow: isAntagonist ? `0 0 10px ${themeColor}30` : 'none'
                            }}
                        >
                            <LucidSwordsIcon size={14} color={isAntagonist ? themeColor : '#888'} />
                            <span>ANTAGONIST</span>
                        </button>
                    </div>

                    {/* Dynamic Subtext */}
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', marginTop: '5px', lineHeight: 1.25 }}>
                        {isAlly
                            ? `// ${charFirstName} & user are allies teaming up in this dream.`
                            : `// ${charFirstName} is the antagonist/rival opposing you in this dream.`}
                    </div>
                </div>

                {/* Scrollable Seeds & Custom Input */}
                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        paddingRight: '2px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}
                >
                    {/* Seed Influence Input (ABOVE Dream Seeds) */}
                    <div
                        style={{
                            background: `rgba(${themeRgb}, 0.04)`,
                            border: `1px solid ${themeColor}35`,
                            borderRadius: '8px',
                            padding: '10px',
                            boxShadow: `inset 0 0 10px ${themeColor}15`
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ fontSize: '10px', fontWeight: '800', color: themeColor, letterSpacing: '0.06em' }}>
                                &gt; SEED_INFLUENCE
                            </div>
                            <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.45)', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                                [OPTIONAL THEME/VIBE]
                            </span>
                        </div>
                        <input
                            type="text"
                            value={dream.seedInfluence || ''}
                            onChange={(e) => dream.setSeedInfluence(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !dream.isSynthesizing) {
                                    e.preventDefault();
                                    dream.rerollSeeds(dream.seedInfluence);
                                }
                            }}
                            placeholder="Type something to influence dream seeds..."
                            style={{
                                width: '100%',
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: dream.seedInfluence?.trim() ? `1px solid ${themeColor}` : '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '6px',
                                padding: '8px 10px',
                                color: '#FFFFFF',
                                fontSize: '11px',
                                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                                boxSizing: 'border-box',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Dream Seeds Panel */}
                    <div
                        style={{
                            background: `rgba(${themeRgb}, 0.04)`,
                            border: `1px solid ${themeColor}35`,
                            borderRadius: '8px',
                            padding: '10px',
                            boxShadow: `inset 0 0 10px ${themeColor}15`
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ fontSize: '10px', fontWeight: '800', color: themeColor, letterSpacing: '0.06em' }}>
                                &gt; DREAM_SEEDS
                            </div>
                            <button
                                type="button"
                                onClick={() => dream.rerollSeeds(dream.seedInfluence)}
                                disabled={dream.isSynthesizing}
                                style={{
                                    background: 'transparent',
                                    border: `1px solid ${themeColor}50`,
                                    borderRadius: '4px',
                                    color: themeColor,
                                    fontSize: '9px',
                                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                                    padding: '3px 7px',
                                    cursor: dream.isSynthesizing ? 'not-allowed' : 'pointer',
                                    opacity: dream.isSynthesizing ? 0.5 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <LucidRerollIcon size={11} color={themeColor} />
                                <span>{dream.isSynthesizing ? 'SYNTHESIZING...' : 'RE-ROLL'}</span>
                            </button>
                        </div>

                        {dream.isSynthesizing && (
                            <div style={{
                                fontSize: '10px',
                                color: themeColor,
                                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                                textAlign: 'center',
                                padding: '6px 8px',
                                background: `rgba(${themeRgb}, 0.08)`,
                                borderRadius: '4px',
                                border: `1px dashed ${themeColor}60`,
                                marginBottom: '8px',
                                letterSpacing: '0.04em'
                            }}>
                                ⚡ {dream.seedInfluence?.trim() ? `CALIBRATING SEEDS WITH INFLUENCE: "${dream.seedInfluence.trim()}"...` : 'CALIBRATING NEURAL DREAM SEEDS...'}
                            </div>
                        )}

                        {/* Seeds List */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            opacity: dream.isSynthesizing ? 0.45 : 1,
                            pointerEvents: dream.isSynthesizing ? 'none' : 'auto',
                            transition: 'opacity 0.2s ease'
                        }}>
                            {dream.seeds.map((seed, idx) => {
                                const seedText = typeof seed === 'object' ? seed.scenario : seed;
                                const defaultTitles = ['ALGORITHM VECTOR', 'SHARED MEMORY', 'PERSONA BLUEPRINT'];
                                const seedTitle = typeof seed === 'object' ? (seed.title || defaultTitles[idx]) : (defaultTitles[idx] || `DREAM SEED #${idx + 1}`);
                                const isSelected = dream.selectedSeed === seedText || dream.selectedSeed === seed;

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => dream.setSelectedSeed(seedText)}
                                        style={{
                                            background: isSelected ? `rgba(${themeRgb}, 0.16)` : 'rgba(0, 0, 0, 0.35)',
                                            border: isSelected ? `1.5px solid ${themeColor}` : '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: '8px',
                                            padding: '9px 12px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            fontSize: '11px',
                                            lineHeight: 1.35,
                                            color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
                                            boxShadow: isSelected ? `0 0 12px ${themeColor}35, inset 0 0 8px ${themeColor}15` : 'none',
                                            display: 'flex',
                                            gap: '10px',
                                            alignItems: 'flex-start'
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: '13px',
                                                height: '13px',
                                                borderRadius: '50%',
                                                border: `1.5px solid ${isSelected ? themeColor : 'rgba(255,255,255,0.25)'}`,
                                                display: 'grid',
                                                placeItems: 'center',
                                                marginTop: '2px',
                                                flexShrink: 0
                                            }}
                                        >
                                            {isSelected && (
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: themeColor, boxShadow: `0 0 6px ${themeColor}` }} />
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ marginBottom: '4px' }}>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: '800',
                                                    color: isSelected ? themeColor : '#EAE6E1',
                                                    letterSpacing: '0.04em',
                                                    textShadow: isSelected ? `0 0 8px ${themeColor}60` : 'none'
                                                }}>
                                                    {seedTitle.toUpperCase()}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '11px', lineHeight: 1.4, color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)' }}>
                                                {seedText}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Engage Hyper-Dive Launch Button */}
                <div style={{ marginTop: '12px', flexShrink: 0 }}>
                    <button
                        type="button"
                        onClick={handleConfirmLaunch}
                        style={{
                            width: '100%',
                            background: `linear-gradient(135deg, ${themeColor} 0%, rgba(${themeRgb}, 0.75) 100%)`,
                            border: `1px solid ${themeColor}`,
                            borderRadius: '8px',
                            padding: '10px',
                            color: '#0B0914',
                            fontWeight: '900',
                            fontSize: '12px',
                            letterSpacing: '0.08em',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: `0 0 15px ${themeColor}60`,
                            transition: 'all 0.2s',
                            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
                        }}
                        onMouseOver={e => { e.currentTarget.style.boxShadow = `0 0 25px ${themeColor}`; }}
                        onMouseOut={e => { e.currentTarget.style.boxShadow = `0 0 15px ${themeColor}60`; }}
                    >
                        <LucidRocketIcon size={16} color="#0B0914" />
                        <span>ENGAGE HYPER-DIVE</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DiveChamberModal;
