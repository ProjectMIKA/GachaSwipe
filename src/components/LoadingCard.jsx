import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Constants from '../data/constants.js';
import { DetailsList } from './SharedUI.jsx';

// ✨ MIKA'S LIVE XML STREAM PROGRESS TRACKER ✨
const getProfileStreamMetrics = (generation) => {
    if (!generation || generation.phase !== 'profile') {
        return { progress: 0, statusText: 'CONNECTING_NEURAL_LINK...' };
    }

    if (generation.parsedWaifu) {
        return { progress: 100, statusText: 'PROFILE_SYNTHESIS_COMPLETE' };
    }

    const content = generation.streamedContent || '';
    const isThinking = generation.isThinking || false;
    const isMusic = window.mikaSwipeMode === 'music' || content.includes('<concept>');

    // If waiting for first tokens or currently in thinking state
    if (!content.trim()) {
        if (isThinking) {
            return { progress: 5, statusText: 'NEURAL_MATRIX_REASONING...' };
        }
        return { progress: 2, statusText: isMusic ? 'INITIALIZING_BEAT_SYNTH...' : 'CONNECTING_NEURAL_LINK...' };
    }

    // 🎵 Music Mode XML Stream Tracking
    if (isMusic) {
        const musicMilestones = [
            { tag: 'concepts', start: 4, end: 8, label: 'INITIALIZING_BEAT_MATRIX...' },
            { tag: 'concept', start: 10, end: 16, label: 'COMPOSING_CONCEPT_1...' },
            { tag: 'title', start: 16, end: 24, label: 'TITLING_TRACKS...' },
            { tag: 'bpm', start: 24, end: 32, label: 'CALIBRATING_TEMPO...' },
            { tag: 'vibe_description', start: 32, end: 46, label: 'SYNTHESIZING_SONIC_VIBE...' },
            { tag: 'tags', start: 46, end: 58, label: 'ASSIGNING_GENRE_TAGS...' },
            { tag: 'lyrics', start: 58, end: 72, label: 'WRITING_LYRICAL_BLUEPRINT...' },
            { tag: '/concept', start: 72, end: 85, label: 'FINALIZING_TRACK_CONCEPTS...' },
            { tag: '/concepts', start: 95, end: 100, label: 'BEAT_GENERATION_COMPLETE' }
        ];

        let maxPct = isThinking ? 5 : 6;
        let activeLabel = 'SYNTHESIZING_BEATS...';

        for (const m of musicMilestones) {
            const openTag = `<${m.tag}>`;
            const closeTag = `</${m.tag.replace('/', '')}>`;
            const hasOpen = content.includes(openTag);
            const hasClose = content.includes(closeTag);

            if (hasClose) {
                maxPct = Math.max(maxPct, m.end);
            } else if (hasOpen) {
                maxPct = Math.max(maxPct, m.start);
                activeLabel = m.label;
            }
        }
        return { progress: Math.min(100, maxPct), statusText: activeLabel };
    }

    // 🐾 Character Profile Generation XML Tracking
    // In sequence: starts with <name> and concludes with image tags down to <environment>
    const waifuMilestones = [
        { tag: 'name', start: 6, end: 12, label: 'COMPILING_IDENTITY...' },
        { tag: 'age', start: 12, end: 18, label: 'ESTABLISHING_LORE...' },
        { tag: 'tagline', start: 18, end: 26, label: 'GENERATING_TAGLINE...' },
        { tag: 'description', start: 26, end: 42, label: 'SYNTHESIZING_BIOGRAPHY...' },
        { tag: 'personality', start: 42, end: 58, label: 'STRUCTURING_PSYCH_PROFILE...' },
        { tag: 'scenario', start: 58, end: 70, label: 'SIMULATING_MEETING_SCENARIO...' },
        { tag: 'first_message', alt: ['first_mes', 'greeting'], start: 70, end: 80, label: 'DRAFTING_OPENING_TRANSMISSION...' },
        { tag: 'tags', start: 80, end: 84, label: 'TAGGING_CHARACTER_TROPES...' },
        { tag: 'likes', start: 84, end: 87, label: 'ANALYZING_PREFERENCES...' },
        { tag: 'dislikes', start: 87, end: 90, label: 'ANALYZING_DISLIKES...' },
        { tag: 'quirks', start: 90, end: 93, label: 'INJECTING_UNIQUE_QUIRKS...' },
        { tag: 'quotes', start: 93, end: 95, label: 'RECORDING_VOICE_MEMOS...' },
        // Final image prompt tags:
        { tag: 'anatomy', start: 95, end: 96, label: 'STRUCTURING_ANATOMY_MATRIX...' },
        { tag: 'species_tags', alt: ['identity_tags'], start: 96, end: 97, label: 'ENCODING_VISUAL_IDENTITY...' },
        { tag: 'hair_color', alt: ['hair_style', 'eyes', 'body_tags'], start: 97, end: 98, label: 'REFINING_FACIAL_AESTHETICS...' },
        { tag: 'outfit', start: 98, end: 98.8, label: 'TAILORING_WARDROBE...' },
        { tag: 'pose_and_expression', start: 98.8, end: 99.4, label: 'CALIBRATING_POSE_EXPRESSION...' },
        { tag: 'environment', start: 99.4, end: 100, label: 'RENDERING_ENVIRONMENT_SEED...' }
    ];

    let maxPct = isThinking ? 5 : 4;
    let activeLabel = isThinking ? 'NEURAL_MATRIX_REASONING...' : 'COMPILING_NEURAL_PROFILE...';

    for (let i = 0; i < waifuMilestones.length; i++) {
        const m = waifuMilestones[i];
        const tagsToCheck = [m.tag, ...(m.alt || [])];

        for (const t of tagsToCheck) {
            const openTag = `<${t}>`;
            const closeTag = `</${t}>`;
            const openIdx = content.indexOf(openTag);
            const closeIdx = content.indexOf(closeTag);

            if (closeIdx !== -1) {
                if (m.end > maxPct) {
                    maxPct = m.end;
                    if (i === waifuMilestones.length - 1) {
                        maxPct = 100;
                        activeLabel = 'DIFFUSION_SEED_COMPILED';
                    } else {
                        activeLabel = waifuMilestones[i + 1]?.label || m.label;
                    }
                }
            } else if (openIdx !== -1) {
                activeLabel = m.label;
                const innerLength = content.length - (openIdx + openTag.length);
                const span = m.end - m.start;
                const partial = Math.min(span * 0.85, (innerLength / 120) * span);
                maxPct = Math.max(maxPct, m.start + partial);
            }
        }
    }

    return { progress: Math.min(100, Math.max(0, maxPct)), statusText: activeLabel };
};

export const LoadingCard = ({ top, style, generation, onRetry, emptyQueueAndNoAuto, onForceGenerate, fallbackImage }) => {
    let progress = generation?.phase === 'image' ? Math.max(0, Math.min(100, generation.imageStep / generation.imageTotalSteps * 100)) : 0;
    
    // Monotonic profile progress tracking
    const maxProfileProgressRef = useRef(0);
    useEffect(() => {
        if (generation?.phase !== 'profile') {
            maxProfileProgressRef.current = 0;
        }
    }, [generation?.phase]);

    const profileMetrics = useMemo(() => {
        return getProfileStreamMetrics(generation);
    }, [generation?.streamedContent, generation?.isThinking, generation?.phase, generation?.parsedWaifu]);

    if (generation?.phase === 'profile') {
        maxProfileProgressRef.current = Math.max(maxProfileProgressRef.current, profileMetrics.progress);
    }
    const currentProfileProgress = maxProfileProgressRef.current;
            return (
                <div style={{ position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden', background: (generation?.phase === 'error' || generation?.phase === 'stopped') ? 'linear-gradient(150deg, #240A12, #000)' : 'linear-gradient(150deg, #050308, #111)', boxShadow: '0 28px 60px -28px rgba(0,0,0,0.9), inset 0 0 40px rgba(0,229,255,0.15), inset 0 0 10px rgba(0,229,255,0.3)', border: (generation?.phase === 'error' || generation?.phase === 'stopped') ? '1px solid rgba(255, 16, 122, 0.4)' : '1px solid rgba(0, 229, 255, 0.3)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.4s ease-out', zIndex: 20, ...style }}>
                    <div className="swipe-scanlines" style={{ zIndex: 1, opacity: 0.6 }}></div>
                    <div className="swipe-scanline-move" style={{ zIndex: 1, opacity: 0.4 }}></div>
                    
                    {/* MIKA'S BLURRED MEMORY LAYER */}
                    {fallbackImage && (
                        <img className="mika-swipe-portrait" src={fallbackImage} alt="" style={{ position: 'absolute', inset: '-30px', width: 'calc(100% + 60px)', height: 'calc(100% + 60px)', objectFit: 'cover', objectPosition: '0% 50%', filter: 'blur(6px) brightness(0.35) saturate(0.7)', animation: 'subtlePan 35s ease-in-out infinite', opacity: 0.85, pointerEvents: 'none', transform: 'translateZ(0)', willChange: 'object-position, transform', WebkitBackfaceVisibility: 'hidden' }} />
                    )}

                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, transparent 30%, rgba(0,229,255,0.08) 50%, transparent 70%)', animation: (generation?.phase === 'error' || generation?.phase === 'stopped') ? 'none' : 'csd-shimmer 1.5s linear infinite', zIndex: 2 }}></div>
                    
                    {!top || (!generation && !emptyQueueAndNoAuto) ? (
                        <div style={{ position: 'absolute', left: 20, right: 20, bottom: 20, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 10 }}>
                            <div style={{ width: '55%', height: 30, borderRadius: 4, background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.3)' }}></div>
                            <div style={{ width: '92%', height: 12, borderRadius: 2, background: 'rgba(0,229,255,0.1)' }}></div>
                            <div style={{ width: '76%', height: 12, borderRadius: 2, background: 'rgba(0,229,255,0.1)' }}></div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                                {[58, 46, 52].map((w, i) => <div key={i} style={{ width: w, height: 22, borderRadius: 4, background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.2)' }}></div>)}
                            </div>
                        </div>
                    ) : emptyQueueAndNoAuto && !generation ? (
                         <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, color: '#00E5FF', justifyContent: 'center', alignItems: 'center', zIndex: 10, position: 'relative' }}>
                            <div style={{ fontSize: '40px', marginBottom: '10px' }}>👀</div>
                            <h3 style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", margin: 0, fontSize: 16, textAlign: 'center', textShadow: '0 0 10px rgba(0,229,255,0.5)', letterSpacing: '0.05em' }}>&gt; NO_MATCHES_IN_QUEUE</h3>
                            <p style={{ textAlign: 'center', fontSize: '11px', opacity: 0.8, marginBottom: '10px', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", color: 'var(--text-dim)' }}>// Auto-queue is disabled to save performance. Tap below to find someone new!</p>
                            <button onClick={onForceGenerate} style={{ border: '1px solid #00E5FF', background: 'rgba(0, 229, 255, 0.1)', color: '#00E5FF', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 12, fontWeight: 700, padding: '12px 24px', borderRadius: 4, cursor: 'pointer', boxShadow: '0 0 15px rgba(0,229,255,0.2), inset 0 0 10px rgba(0,229,255,0.1)' }}>&gt; SEARCH_DATABASE</button>
                        </div>
                    ) : (
                        <div style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 14, color: '#fff', zIndex: 10, position: 'relative', minHeight: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                <div>
                                    <div style={{ fontSize: 10, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                                        {generation.phase === 'error' ? '[ ERROR_DETECTED ]' : generation.phase === 'stopped' ? '[ ENGINE_HALTED ]' : generation.phase === 'image' ? '[ RENDERING_VISUALS ]' : '[ COMPILING_MATRIX ]'}
                                    </div>
                                    <div style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 18, fontWeight: 800, marginTop: 4, textShadow: '0 0 10px rgba(0,229,255,0.4)', color: '#00E5FF', letterSpacing: '0.05em' }}>
                                        &gt; {generation.phase === 'error' ? 'LAYLA_NEEDS_ATTENTION' : generation.phase === 'stopped' ? 'MANUAL_OVERRIDE' : (window.mikaSwipeMode === 'music' ? 'SYNTHESIZING_BEATS' : 'NEW_MATCH_INCOMING')}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="stat-page-content" onPointerDown={e => e.stopPropagation()} style={{ flex: (generation.phase === 'profile' && Boolean(generation.streamedContent)) ? '0 0 auto' : '1 1 auto', minHeight: 0, position: 'relative', border: '1px solid rgba(0, 229, 255, 0.2)', background: 'rgba(0, 229, 255, 0.03)', borderRadius: 4, padding: '16px 12px', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', boxShadow: 'inset 0 0 15px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {/* Matrix Thinking Background for Initial Notes Screen */}
                                {generation.thinkingContent && (
                                    <div style={{ position: 'absolute', inset: 0, padding: '16px', color: '#00E5FF', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", pointerEvents: 'none', overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '9.5px', lineHeight: 1.35, zIndex: 0, opacity: generation.streamedContent ? 0.10 : 0.32, filter: generation.streamedContent ? 'blur(2px)' : 'blur(1.4px)', textShadow: '0 0 6px rgba(0, 229, 255, 0.4)', maskImage: 'linear-gradient(to bottom, black 25%, transparent 90%)', WebkitMaskImage: 'linear-gradient(to bottom, black 25%, transparent 90%)', transition: 'opacity 0.6s ease-in-out, filter 0.6s ease-in-out' }}>
                                        {generation.thinkingContent}
                                    </div>
                                )}

                                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {generation.phase === 'error' ? ( <div style={{fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 11.5, color: '#FF3333'}}>{generation.error}</div> ) : generation.phase === 'stopped' ? ( <div style={{fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 11.5, color: '#EBE3D6'}}>Generation manually stopped by Master. Hit Play to try again!</div> ) : (
                                        <>
                                            {generation.parsedWaifu ? (
                                                <div style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", display: 'flex', flexDirection: 'column', gap: '16px', animation: 'csd-rise 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                                                        <h3 style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", margin: 0, fontSize: 16, fontWeight: 800, color: '#00E5FF', letterSpacing: '0.05em', textShadow: '0 0 8px rgba(0,229,255,0.4)' }}>&gt; {(generation.parsedWaifu.name || 'TARGET').toUpperCase()}_DATA</h3>
                                                    </div>
                                                    
                                                    <DetailsList items={generation.parsedWaifu.likes} label="INTO" tone="like"/>
                                                    <DetailsList items={generation.parsedWaifu.dislikes} label="NOT_INTO" tone="dislike"/>
                                                    {generation.parsedWaifu.quirks && generation.parsedWaifu.quirks.length > 0 && <DetailsList items={generation.parsedWaifu.quirks} label="QUIRKS" tone="like"/>}

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                                                        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00E5FF', minWidth: 52 }}>&gt; DATABASE_ENTRY</span>
                                                        <div style={{ fontSize: 12, color: '#EBE3D6', background: 'rgba(0, 229, 255, 0.05)', borderRadius: 4, padding: '10px 14px', lineHeight: 1.4, borderLeft: '2px solid #00E5FF', borderTop: '1px solid rgba(0, 229, 255, 0.3)', borderRight: '1px solid rgba(0, 229, 255, 0.3)', borderBottom: '1px solid rgba(0, 229, 255, 0.3)' }}>
                                                            {generation.parsedWaifu.description}
                                                            <br/><br/>
                                                            <span style={{opacity: 0.8}}>{generation.parsedWaifu.personality}</span>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', minWidth: 52 }}>&gt; IMAGE_PROMPT_DATA</span>
                                                            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: generation.parsedWaifu.explicitLevel >= 3 ? '#FF3333' : generation.parsedWaifu.explicitLevel === 2 ? '#B533FF' : generation.parsedWaifu.explicitLevel === 1 ? '#FF107A' : '#00E5FF', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                                                [{generation.parsedWaifu.explicitLevel >= 3 ? 'EXTREME' : generation.parsedWaifu.explicitLevel === 2 ? 'NUDE' : generation.parsedWaifu.explicitLevel === 1 ? 'TEASE' : 'SFW'}]
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', background: 'rgba(0, 0, 0, 0.5)', borderRadius: 4, padding: '10px', lineHeight: 1.4, border: '1px dashed #333' }}>
                                                            {generation.parsedWaifu.image_prompt}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 11.5, color: '#fff', whiteSpace: 'pre-wrap', textShadow: '0 1px 3px rgba(0,0,0,0.9)'}}>
                                                    {generation.responseText || 'Waiting for Layla to start typing...'}
                                                    {generation.isThinking && (
                                                        <div style={{ color: '#00E5FF', fontStyle: 'italic', marginTop: '12px', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 11, animation: 'csd-pulse 1.5s infinite', textShadow: '0 0 8px rgba(0, 229, 255, 0.6)', fontWeight: 'bold' }}>
                                                            &gt; NEURAL_ENGINE_REASONING...
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* MIKA'S SIGNAL INTERCEPTOR UI */}
                            {generation.incomingMessage && (
                                <div style={{ flex: '0 0 auto', padding: '12px', background: 'rgba(0, 229, 255, 0.08)', border: '1px dashed #00E5FF', borderRadius: '4px', color: '#EBE3D6', fontSize: '11.5px', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", marginTop: '4px', boxShadow: 'inset 0 4px 12px rgba(0,229,255,0.1)', animation: 'expandDown 0.3s ease forwards', transformOrigin: 'top' }}>
                                    <div style={{ color: '#00E5FF', fontWeight: 'bold', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ animation: 'csd-pulse 1.5s infinite' }}>[ ⚠️ INCOMING SIGNAL ]</span>
                                    </div>
                                    <div style={{ whiteSpace: 'pre-wrap', fontStyle: 'italic', opacity: 0.9, maxHeight: '120px', overflowY: 'auto', paddingRight: '4px', WebkitOverflowScrolling: 'touch' }}>{generation.incomingMessage}</div>
                                </div>
                            )}

                            {generation.phase === 'profile' && Boolean(generation.streamedContent) && (

                                <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative', marginTop: '4px', borderRadius: 4, border: '1px solid rgba(255, 16, 122, 0.4)', background: 'linear-gradient(180deg, rgba(11,9,20,0.9) 0%, rgba(20,12,30,0.9) 100%)', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.8)', overflow: 'hidden' }}>
                                    
                                    {/* Fixed Matrix Background (Pinned to Viewport) */}
                                    {(generation.thinkingContent || generation.streamedContent) && (
                                        <div style={{ position: 'absolute', inset: 0, padding: '16px', color: '#FF107A', pointerEvents: 'none', overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '9.5px', lineHeight: 1.3, zIndex: 0, opacity: 0.28, filter: 'blur(1.4px)', textShadow: '0 0 6px rgba(255,16,122,0.4)', transition: 'all 0.6s ease-in-out', maskImage: 'linear-gradient(to bottom, black 10%, transparent 85%)', WebkitMaskImage: 'linear-gradient(to bottom, black 10%, transparent 85%)' }}>
                                            {generation.thinkingContent}
                                            {generation.thinkingContent && generation.streamedContent && '\n\n'}
                                            {generation.streamedContent}
                                        </div>
                                    )}

                                    {/* Scrollable Content Area */}
                                    <div className="stat-page-content" onPointerDown={e => e.stopPropagation()} style={{ flex: 1, minHeight: 0, position: 'relative', padding: 12, overflowY: 'auto', overflowX: 'hidden', touchAction: 'pan-y', zIndex: 1, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 11, lineHeight: 1.5, WebkitOverflowScrolling: 'touch' }}>
                                        <div style={{ position: 'sticky', top: -12, margin: '-12px -12px 8px -12px', padding: '6px 12px', background: 'rgba(255, 16, 122, 0.15)', borderBottom: '1px solid rgba(255, 16, 122, 0.3)', color: 'var(--accent)', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'space-between', zIndex: 2 }}>
                                            <span>Live Output Stream</span>
                                            <span style={{ animation: 'csd-pulse 1s infinite' }}>●</span>
                                        </div>
                                        
                                        <div style={{ position: 'relative' }}>
                                            {generation.isThinking && <div style={{ color: '#00E5FF', fontStyle: 'italic', marginBottom: '8px', animation: 'csd-pulse 1.5s infinite', textShadow: '0 0 8px rgba(0, 229, 255, 0.5)', fontWeight: 'bold' }}>&gt; NEURAL_ENGINE_REASONING...</div>}
                                            <div style={{ color: '#EBE3D6', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                                                {generation.streamedContent}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, marginTop: 'auto' }}>
                                {generation.phase === 'image' && (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontWeight: 700, color: '#EBE3D6' }}>
                                            <span>&gt; {generation.imageStatus || 'RENDERING_PORTRAIT...'}</span>
                                            <span style={{ fontVariantNumeric: 'tabular-nums', color: '#00E5FF' }}>{Math.round(progress)}%</span>
                                        </div>
                                        <div style={{ height: 6, borderRadius: 4, background: 'rgba(0,0,0,0.5)', overflow: 'hidden', border: '1px solid rgba(0, 229, 255, 0.3)' }}>
                                            <div style={{ height: '100%', width: `${progress}%`, borderRadius: 4, background: '#00E5FF', transition: 'width 0.25s ease', boxShadow: '0 0 10px rgba(0, 229, 255, 0.5)' }}></div>
                                        </div>
                                    </>
                                )}
                                {generation.phase === 'profile' && (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontWeight: 700, color: '#EBE3D6' }}>
                                            <span>&gt; {profileMetrics.statusText}</span>
                                            <span style={{ fontVariantNumeric: 'tabular-nums', color: '#00E5FF' }}>{Math.round(currentProfileProgress)}%</span>
                                        </div>
                                        <div style={{ height: 6, borderRadius: 4, background: 'rgba(0,0,0,0.5)', overflow: 'hidden', border: '1px solid rgba(0, 229, 255, 0.3)' }}>
                                            <div style={{ height: '100%', width: `${currentProfileProgress}%`, borderRadius: 4, background: '#00E5FF', transition: 'width 0.25s ease', boxShadow: '0 0 10px rgba(0, 229, 255, 0.5)' }}></div>
                                        </div>
                                    </>
                                )}
                                {generation.phase === 'error' && (
                                    <button onClick={onRetry} style={{ alignSelf: 'flex-start', border: '1px solid #00E5FF', background: 'rgba(0, 229, 255, 0.1)', color: '#00E5FF', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 11, fontWeight: 700, padding: '8px 14px', borderRadius: 4, cursor: 'pointer', boxShadow: '0 0 10px rgba(0,229,255,0.2)' }}>&gt; RETRY_GENERATION</button>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            );
        };
