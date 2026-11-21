import React from 'react';
import {
    useAvatarForge,
    GENDER_OPTIONS,
    BODY_TYPE_OPTIONS,
    HAIR_COLOR_OPTIONS,
    EYE_COLOR_OPTIONS,
    AESTHETIC_OPTIONS
} from './useAvatarForge.js';
import { CyberDropdown } from '../common/CyberDropdown.jsx';

export const IsekaiMirrorModal = ({
    isOpen,
    onClose,
    layla,
    preferences,
    customUserProfile,
    setCustomUserProfile,
    showToast,
    showAlert,
    getImageModelId
}) => {
    // ✨ MIKA'S RULES-OF-HOOKS FIX: the forge hook must run before any early return — an
    // isOpen→false flip while mounted would change the hook count (React #300 crash class).
    // Safe to call unconditionally: useAvatarForge only reads props + fires SDK calls from
    // explicit user callbacks, never on mount.
    const forge = useAvatarForge({
        layla,
        preferences,
        customUserProfile,
        setCustomUserProfile,
        showToast,
        showAlert,
        getImageModelId
    });

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(5, 3, 10, 0.85)',
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
                maxWidth: '720px',
                maxHeight: '92vh',
                background: 'linear-gradient(180deg, #0d0a18 0%, #06040a 100%)',
                border: '1px solid rgba(0, 229, 255, 0.4)',
                borderRadius: '16px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 229, 255, 0.2), inset 0 0 20px rgba(0, 229, 255, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
            }}>
                {/* Scanline decoration */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'linear-gradient(rgba(18, 16, 26, 0) 50%, rgba(0, 0, 0, 0.3) 50%)',
                    backgroundSize: '100% 4px',
                    pointerEvents: 'none',
                    opacity: 0.3,
                    zIndex: 1
                }} />

                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(0, 229, 255, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(0, 229, 255, 0.04)',
                    position: 'relative',
                    zIndex: 2
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>🪞</span>
                        <div>
                            <h2 style={{
                                margin: 0,
                                fontSize: '16px',
                                fontWeight: '800',
                                color: '#00E5FF',
                                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                                letterSpacing: '0.08em',
                                textShadow: '0 0 10px rgba(0,229,255,0.6)'
                            }}>
                                &gt; ISEKAI_MIRROR // USER_AVATAR_FORGE
                            </h2>
                            <div style={{
                                fontSize: '10px',
                                color: 'rgba(0, 229, 255, 0.6)',
                                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                                letterSpacing: '0.05em'
                            }}>
                                Calibrate your persona &amp; manifest transparent tactical sprites
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(0, 229, 255, 0.3)',
                            borderRadius: '6px',
                            color: '#00E5FF',
                            width: '28px',
                            height: '28px',
                            display: 'grid',
                            placeItems: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
                        }}
                        title="Close Forge"
                    >
                        ✕
                    </button>
                </div>

                {/* Scrollable Body */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    position: 'relative',
                    zIndex: 2
                }}>
                    {/* SECTION 1: MIRROR OF TRUTH (LORE GENERATION) */}
                    <div style={{
                        background: 'rgba(0, 229, 255, 0.03)',
                        border: '1px solid rgba(0, 229, 255, 0.2)',
                        borderRadius: '10px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                                <div style={{
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    color: '#00E5FF',
                                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                                    letterSpacing: '0.08em'
                                }}>
                                    &gt; MIRROR_OF_TRUTH // ALGORITHM REFLECTION
                                </div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                    Derived from your top algorithmic affinities:
                                    <span style={{ color: '#FF107A', marginLeft: '6px', fontWeight: 'bold' }}>
                                        {forge.top3Preferences.join(' • ')}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={forge.generateMirrorOfTruthLore}
                                disabled={forge.isGeneratingLore}
                                style={{
                                    background: forge.isGeneratingLore ? 'rgba(0, 229, 255, 0.1)' : 'rgba(0, 229, 255, 0.15)',
                                    border: '1px solid #00E5FF',
                                    borderRadius: '6px',
                                    color: '#00E5FF',
                                    padding: '6px 12px',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                                    cursor: forge.isGeneratingLore ? 'wait' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 0 10px rgba(0,229,255,0.2)'
                                }}
                            >
                                {forge.isGeneratingLore ? (
                                    <span>Divining Truth... 📡</span>
                                ) : (
                                    <span>{forge.classAlignment ? '🔄 RE-DIVINE LORE' : '🪞 GAZE INTO MIRROR'}</span>
                                )}
                            </button>
                        </div>

                        {/* Lore display card */}
                        <div style={{
                            background: 'rgba(0, 0, 0, 0.5)',
                            border: '1px dashed rgba(0, 229, 255, 0.3)',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '10px', color: '#FFD700', fontWeight: 'bold', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                                    CLASS &amp; ALIGNMENT:
                                </span>
                                <input
                                    type="text"
                                    value={forge.classAlignment}
                                    onChange={e => forge.setClassAlignment(e.target.value)}
                                    placeholder="Click 'Gaze into Mirror' or enter custom RPG class..."
                                    style={{
                                        flex: 1,
                                        background: 'transparent',
                                        border: 'none',
                                        borderBottom: '1px solid rgba(255, 215, 0, 0.3)',
                                        color: '#FFD700',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                                        outline: 'none',
                                        padding: '2px 4px'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '10px', color: 'rgba(0, 229, 255, 0.7)', fontWeight: 'bold', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                                    ORIGIN BACKSTORY:
                                </span>
                                <textarea
                                    rows="2"
                                    value={forge.backstory}
                                    onChange={e => forge.setBackstory(e.target.value)}
                                    placeholder="Your humorous two-sentence isekai induction story will appear here..."
                                    style={{
                                        width: '100%',
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#E0E7FF',
                                        fontSize: '11px',
                                        lineHeight: 1.5,
                                        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                                        resize: 'none',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: VISUAL MATRIX BUILDER */}
                    <div style={{
                        background: 'rgba(255, 16, 122, 0.03)',
                        border: '1px solid rgba(255, 16, 122, 0.2)',
                        borderRadius: '10px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px'
                    }}>
                        <div style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            color: '#FF107A',
                            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                            letterSpacing: '0.08em'
                        }}>
                            &gt; VISUAL_BUILDER // AVATAR MATRIX
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                            {/* Gender Presentation */}
                            <CyberDropdown
                                label="GENDER PRESENTATION"
                                value={forge.gender}
                                options={GENDER_OPTIONS}
                                onChange={forge.setGender}
                                accentColor="#FF107A"
                            />

                            {/* Body Type */}
                            <CyberDropdown
                                label="BODY TYPE"
                                value={forge.bodyType}
                                options={BODY_TYPE_OPTIONS}
                                onChange={forge.setBodyType}
                                accentColor="#FF107A"
                            />

                            {/* Hair Color */}
                            <CyberDropdown
                                label="HAIR COLOR"
                                value={forge.hairColor}
                                options={HAIR_COLOR_OPTIONS}
                                onChange={forge.setHairColor}
                                accentColor="#FF107A"
                            />

                            {/* Eye Color */}
                            <CyberDropdown
                                label="EYE COLOR"
                                value={forge.eyeColor}
                                options={EYE_COLOR_OPTIONS}
                                onChange={forge.setEyeColor}
                                accentColor="#FF107A"
                            />

                            {/* Aesthetic */}
                            <div style={{ gridColumn: '1/-1' }}>
                                <CyberDropdown
                                    label="AESTHETIC & ATTIRE"
                                    value={forge.aesthetic}
                                    options={AESTHETIC_OPTIONS}
                                    onChange={forge.setAesthetic}
                                    accentColor="#FF107A"
                                />
                            </div>
                        </div>

                        {/* Base Prompt Preview */}
                        <div style={{
                            fontSize: '9px',
                            color: 'rgba(255,255,255,0.4)',
                            background: 'rgba(0,0,0,0.4)',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
                        }}>
                            <span style={{ color: '#00E5FF' }}>&gt; COMPILED_BASE_PROMPT: </span>
                            {forge.basePrompt}
                        </div>
                    </div>

                    {/* SECTION 3: SPRITE PREVIEWS & FORGE ACTION */}
                    <div style={{
                        background: 'rgba(0, 255, 65, 0.03)',
                        border: '1px solid rgba(0, 255, 65, 0.2)',
                        borderRadius: '10px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    color: '#00FF41',
                                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                                    letterSpacing: '0.08em'
                                }}>
                                    &gt; CHROMA_KEY_SPRITES // TACTICAL HOLOGRAMS
                                </div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                                    Stripped of green background for seamless tactical overlay
                                </div>
                            </div>
                        </div>

                        {/* Dual Sprite Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                            {/* Casual Pose */}
                            <div style={{
                                border: '1px dashed rgba(0, 255, 65, 0.3)',
                                borderRadius: '8px',
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                background: 'radial-gradient(circle, rgba(0, 255, 65, 0.05) 0%, rgba(0,0,0,0.5) 100%)'
                            }}>
                                <div style={{ fontSize: '10px', color: '#00FF41', fontWeight: 'bold', marginBottom: '8px', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                                    CASUAL POSE (STANDING)
                                </div>

                                <div style={{
                                    width: '100%',
                                    height: '220px',
                                    borderRadius: '6px',
                                    // Checkered background pattern to showcase transparent PNG
                                    backgroundImage: 'linear-gradient(45deg, #111 25%, transparent 25%), linear-gradient(-45deg, #111 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #111 75%), linear-gradient(-45deg, transparent 75%, #111 75%)',
                                    backgroundSize: '16px 16px',
                                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                                    backgroundColor: '#070707',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    {forge.casualSpriteUrl ? (
                                        <img
                                            src={forge.casualSpriteUrl}
                                            alt="Casual Sprite"
                                            style={{ height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 4px rgba(0,255,65,0.4))' }}
                                        />
                                    ) : (
                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                                            [ No Casual Sprite ]
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Battle Pose */}
                            <div style={{
                                border: '1px dashed rgba(255, 69, 0, 0.3)',
                                borderRadius: '8px',
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                background: 'radial-gradient(circle, rgba(255, 69, 0, 0.05) 0%, rgba(0,0,0,0.5) 100%)'
                            }}>
                                <div style={{ fontSize: '10px', color: '#FF4500', fontWeight: 'bold', marginBottom: '8px', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                                    BATTLE POSE (ACTION/WEAPON)
                                </div>

                                <div style={{
                                    width: '100%',
                                    height: '220px',
                                    borderRadius: '6px',
                                    backgroundImage: 'linear-gradient(45deg, #111 25%, transparent 25%), linear-gradient(-45deg, #111 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #111 75%), linear-gradient(-45deg, transparent 75%, #111 75%)',
                                    backgroundSize: '16px 16px',
                                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                                    backgroundColor: '#070707',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    {forge.battleSpriteUrl ? (
                                        <img
                                            src={forge.battleSpriteUrl}
                                            alt="Battle Sprite"
                                            style={{ height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 4px rgba(255,69,0,0.4))' }}
                                        />
                                    ) : (
                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                                            [ No Battle Sprite ]
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Forge Button & Progress */}
                        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {forge.isForgingSprites && (
                                <div style={{
                                    textAlign: 'center',
                                    color: '#00FF41',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                                    animation: 'csd-pulse 1s infinite',
                                    padding: '8px 12px',
                                    background: 'rgba(0, 255, 65, 0.08)',
                                    border: '1px solid rgba(0, 255, 65, 0.3)',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    wordBreak: 'break-word'
                                }}>
                                    {forge.forgeStepText || "Synthesizing transparent tactical sprites..."}
                                </div>
                            )}

                            <button
                                onClick={forge.forgeAvatarSprites}
                                disabled={forge.isForgingSprites}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: forge.isForgingSprites ? 'rgba(0, 229, 255, 0.2)' : 'linear-gradient(90deg, #00E5FF 0%, #FF107A 100%)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#000',
                                    fontSize: '13px',
                                    fontWeight: '900',
                                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                                    letterSpacing: '0.1em',
                                    cursor: forge.isForgingSprites ? 'wait' : 'pointer',
                                    boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)',
                                    transition: 'all 0.2s',
                                    textTransform: 'uppercase'
                                }}
                            >
                                {forge.isForgingSprites ? '[ SYNTHESIZING SPRITES... ]' : '[ ⚔️ FORGE AVATAR ]'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IsekaiMirrorModal;

