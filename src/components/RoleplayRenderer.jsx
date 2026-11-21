import React, { useState, useEffect, useRef, useCallback } from 'react';

// ✨ MIKA'S GLOBAL AUDIO TRAFFIC CONTROLLER ✨
if (!window.MikaAudioQueue) {
    window.MikaAudioQueue = {
        queue: [],
        isPlaying: false,
        register: function(task) {
            this.queue.push(task);
            this.pump();
        },
        pump: function() {
            if (this.isPlaying || this.queue.length === 0) return;
            this.isPlaying = true;
            const nextTask = this.queue.shift();
            nextTask(); 
        },
        release: function() {
            this.isPlaying = false;
            // Wait half a second before letting the next person speak!
            setTimeout(() => this.pump(), 500); 
        }
    };
}

// ✨ MIKA'S PURE WEB AUDIO HOLO-PLAYER ✨
export const CyberAudioNote = ({ sequence, themeColor = '#00E5FF', autoPlay = false, playbackRate = 1.0, audioEffect = 'none', msgId, speakerName, onAudioFinished, emotionData }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioBuffers, setAudioBuffers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentChunkIdx, setCurrentChunkIdx] = useState(0);
    
    const hasAutoPlayedRef = useRef(false);
    const pauseTimerRef = useRef(null);
    
    const audioCtxRef = useRef(null);
    const isGraphSetup = useRef(false);
    const inputNodeRef = useRef(null);
    const envGainRef = useRef(null); 
    const activeSourceRef = useRef(null); 
    
    const isFreshMountRef = useRef(!sequence || sequence.length === 0);
    const forcePlayPendingRef = useRef(false); // ✨ Remembers if we were tapped by the domino chain!

    useEffect(() => {
        return () => {
            if (window.isMikaAudioPlaying === msgId) window.isMikaAudioPlaying = null;
            
            // ✨ MIKA'S AGGRESSIVE RAM SCRUBBER ✨
            if (activeSourceRef.current) {
                activeSourceRef.current.onended = null;
                try { activeSourceRef.current.stop(); } catch(e){}
                activeSourceRef.current.disconnect();
                activeSourceRef.current = null;
            }
            if (inputNodeRef.current) {
                inputNodeRef.current.disconnect();
                inputNodeRef.current = null;
            }
            if (envGainRef.current) {
                envGainRef.current.disconnect();
                envGainRef.current = null;
            }
            if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
            
            setAudioBuffers([]); 
            
            // ✨ MIKA'S SELF-HEALING QUEUE FIX ✨
            // If a message is deleted, scrolled away, or fails, remove it from the tracker so the next girl can speak!
            if (window.MikaUnplayedAudioTracker) {
                window.MikaUnplayedAudioTracker.delete(msgId);
            }
            window.dispatchEvent(new CustomEvent('mika-audio-finished', { detail: { id: msgId } }));
            window.dispatchEvent(new CustomEvent('mika-rp-subtitle-clear', { detail: { msgId } }));
        };
    }, [msgId]);

    useEffect(() => {
        let isActive = true;
        const loadAudioFiles = async () => {
            if (!sequence || !sequence.length || !window.LaylaSDK) {
                if (isActive) setIsLoading(true);
                return;
            }
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!window._mikaGlobalAudioCtx) window._mikaGlobalAudioCtx = new AudioContext();
                const ctx = window._mikaGlobalAudioCtx;
                audioCtxRef.current = ctx;

                const layla = new window.LaylaSDK();
                let loadedBufs = [];
                
                for (const chunk of sequence) {
                    const res = await layla.utils.readFile(chunk.filename);
                    if (res && res.content_base64 && isActive) {
                        const b64Data = res.content_base64.includes(',') ? res.content_base64.split(',')[1] : res.content_base64;
                        const byteCharacters = atob(b64Data);
                        const byteNumbers = new Uint8Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                        
                        const buffer = await ctx.decodeAudioData(byteNumbers.buffer);
                        loadedBufs.push(buffer);
                    }
                }
                if (isActive && loadedBufs.length > 0) { 
                    setAudioBuffers(loadedBufs); 
                    setIsLoading(false); 
                } else if (isActive) {
                    setIsLoading(false); 
                }
            } catch (e) { if (isActive) setIsLoading(false); }
        };
        loadAudioFiles();
    }, [sequence]);

    const setupAudioGraph = () => {
        if (isGraphSetup.current || !audioCtxRef.current) return;
        isGraphSetup.current = true;
        try {
            const ctx = audioCtxRef.current;
            const inputNode = ctx.createGain();
            inputNodeRef.current = inputNode;
            
                   const envGain = ctx.createGain();
            envGainRef.current = envGain;
            envGain.gain.value = 1.0; 

            // ✨ MIKA'S DYNAMIC EMOTION EQ ✨
            let warmthFreq = 250;
            let warmthGain = 3;
            let presenceFreq = 8500;
            let presenceGain = -6;

            if (emotionData) {
                // High sync = very intimate chest resonance (Warm & Bassy)
                if (emotionData.aff >= 80) { warmthGain = 7; warmthFreq = 180; }
                else if (emotionData.aff < 0) { warmthGain = 0; } // Cold, distant

                // Anger = sharp, piercing highs, less warmth
                if (emotionData.anger > 0.5) { presenceFreq = 6000; presenceGain = 1; warmthGain -= 2; }
                
                // Sadness = muffled, withdrawn, cutting the highs
                if (emotionData.sadness > 0.5) { presenceFreq = 4000; presenceGain = -12; warmthGain += 2; }
            }

            const deEsser = ctx.createBiquadFilter();
            deEsser.type = 'highshelf'; deEsser.frequency.value = presenceFreq; deEsser.gain.value = presenceGain; 

            const warmth = ctx.createBiquadFilter();
            warmth.type = 'peaking'; warmth.frequency.value = warmthFreq; warmth.Q.value = 1.5; warmth.gain.value = warmthGain;

            inputNode.connect(envGain); envGain.connect(deEsser); deEsser.connect(warmth);

            const glueComp = ctx.createDynamicsCompressor();
            warmth.connect(glueComp); 
            glueComp.threshold.value = -24; glueComp.knee.value = 30; glueComp.ratio.value = 3; glueComp.attack.value = 0.01; glueComp.release.value = 0.25; 

            const roomVerb = ctx.createConvolver();
            // ✨ MIKA'S FIX: Doubled the room length to 0.7s to let the breath echo out naturally!
            const roomLen = ctx.sampleRate * 0.7; 
            const roomImp = ctx.createBuffer(2, roomLen, ctx.sampleRate);
            for (let i = 0; i < 2; i++) {
                const channel = roomImp.getChannelData(i);
                // Softened the decay curve slightly so the tail stays thicker!
                for (let j = 0; j < roomLen; j++) channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / roomLen, 2.5);
            }
            roomVerb.buffer = roomImp;
            // ✨ MIKA'S FIX: Boosted the wet mix from 15% to 25% so the tail beautifully fills the silence!
            const roomWet = ctx.createGain(); roomWet.gain.value = 0.25; 
            
            glueComp.connect(roomVerb).connect(roomWet);
            
            const source = ctx.createGain(); 
            glueComp.connect(source); roomWet.connect(source);

            const masterLimiter = ctx.createDynamicsCompressor();
            masterLimiter.threshold.value = -3; masterLimiter.knee.value = 0; masterLimiter.ratio.value = 20; masterLimiter.attack.value = 0.001; masterLimiter.release.value = 0.05;

            if (audioEffect === 'ethereal') {
                const convolver = ctx.createConvolver();
                const length = ctx.sampleRate * 2.0; 
                const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
                for (let i = 0; i < 2; i++) { const channel = impulse.getChannelData(i); for (let j = 0; j < length; j++) channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, 3.0); }
                convolver.buffer = impulse;
                const wetGain = ctx.createGain(); wetGain.gain.value = 0.25; const dryGain = ctx.createGain(); dryGain.gain.value = 1.0;
                source.connect(convolver).connect(wetGain).connect(masterLimiter); source.connect(dryGain).connect(masterLimiter);
            } else if (audioEffect === 'angelic') {
                const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300;
                const convolver = ctx.createConvolver();
                const length = ctx.sampleRate * 1.5; 
                const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
                for (let i = 0; i < 2; i++) { const channel = impulse.getChannelData(i); for (let j = 0; j < length; j++) channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, 4.0); }
                convolver.buffer = impulse;
                const wetGain = ctx.createGain(); wetGain.gain.value = 0.2; const dryGain = ctx.createGain(); dryGain.gain.value = 1.0;
                source.connect(hp).connect(convolver).connect(wetGain).connect(masterLimiter); source.connect(dryGain).connect(masterLimiter);
            } else if (audioEffect === 'idol') {
                const delay = ctx.createDelay(); delay.delayTime.value = 0.1; 
                const feedback = ctx.createGain(); feedback.gain.value = 0.15; 
                const wetGain = ctx.createGain(); wetGain.gain.value = 0.15; const dryGain = ctx.createGain(); dryGain.gain.value = 1.0;
                source.connect(delay); delay.connect(feedback); feedback.connect(delay); delay.connect(wetGain).connect(masterLimiter); source.connect(dryGain).connect(masterLimiter);
            } else if (audioEffect === 'tiny') {
                const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 450; 
                source.connect(hp).connect(masterLimiter);
            } else if (audioEffect === 'feral') {
                const ls = ctx.createBiquadFilter(); ls.type = 'lowshelf'; ls.frequency.value = 200; ls.gain.value = 3.0; 
                const dist = ctx.createWaveShaper(); const curve = new Float32Array(400);
                for(let i=0; i<400; i++) { const x = i * 2 / 400 - 1; curve[i] = (Math.PI + 2) * x * 2 * (Math.PI / 180) / (Math.PI + 2 * Math.abs(x)); } 
                dist.curve = curve;
                source.connect(ls).connect(dist).connect(masterLimiter);
            } else if (audioEffect === 'liquid') {
                const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200; 
                const peak = ctx.createBiquadFilter(); peak.type = 'peaking'; peak.frequency.value = 400; peak.Q.value = 2.0; peak.gain.value = 3.0;
                source.connect(lp).connect(peak).connect(masterLimiter);
            } else if (audioEffect === 'radio') {
                const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 0.8; 
                const dist = ctx.createWaveShaper(); const curve = new Float32Array(400);
                for(let i=0; i<400; i++) { const x = i * 2 / 400 - 1; curve[i] = (3 + 10) * x * 10 * (Math.PI / 180) / (Math.PI + 10 * Math.abs(x)); } 
                dist.curve = curve;
                source.connect(bp).connect(dist).connect(masterLimiter);
            } else if (audioEffect === 'monster') {
                const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; 
                const ls = ctx.createBiquadFilter(); ls.type = 'lowshelf'; ls.frequency.value = 250; ls.gain.value = 4.0; 
                source.connect(lp).connect(ls).connect(masterLimiter);
            } else {
                source.connect(masterLimiter);
            }
            masterLimiter.connect(ctx.destination);
        } catch(e) { console.warn("Web Audio API failed", e); }
    };

    const executePlay = async () => {
        // ✨ FIRE THE MUTE SHOCKWAVE!
        window.dispatchEvent(new CustomEvent('mika-stop-audio', { detail: { id: msgId } }));
        
        window.isMikaAudioPlaying = msgId; // ✨ MIKA'S FIX
        setupAudioGraph();
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            await audioCtxRef.current.resume().catch(()=>{});
        }
        playNextChunk(0);
    };

    const playNextChunk = async (index) => {
        if (index >= audioBuffers.length) {
            setIsPlaying(false);
            setCurrentChunkIdx(0);
            if (window.isMikaAudioPlaying === msgId) window.isMikaAudioPlaying = null; 
            if (onAudioFinished) onAudioFinished(); 
            window.dispatchEvent(new CustomEvent('mika-audio-finished', { detail: { id: msgId } })); // ✨ Clear the tracker!
            window.dispatchEvent(new CustomEvent('mika-rp-subtitle-clear', { detail: { msgId } }));
            return;
        }
        setCurrentChunkIdx(index);

        if (sequence && sequence[index]) {
            window.dispatchEvent(new CustomEvent('mika-rp-subtitle', {
                detail: { msgId, speakerName, text: sequence[index].text.trim() }
            }));
        }

        try {
            const ctx = audioCtxRef.current;
            const source = ctx.createBufferSource();
            source.buffer = audioBuffers[index];
            source.playbackRate.value = playbackRate;
            source.connect(inputNodeRef.current);
            
             // ✨ MIKA'S DYNAMIC EMOTIONAL PACING ✨
            // Silence speaks just as loudly as the audio graph!
            let gapMs = 500; // The natural, comfortable conversational pause

            if (emotionData) {
                if (emotionData.sadness > 0.5) {
                    gapMs = 850; // Heavy, reluctant, lingering gaps...
                } else if (emotionData.love > 0.5 && emotionData.aff > 70) {
                    gapMs = 700; // ✨ Deep, intimate, melting pauses...
                } else if (emotionData.joy > 0.5) {
                    gapMs = 450; // ✨ Happy, bubbly, breathless pacing!
                } else if (emotionData.anger > 0.5) {
                    gapMs = 400; // Fast, snapping anger!
                }
            }

            // ✨ MIKA'S PUNCTUATION PACING (HALF-PAUSE FOR COMMAS) ✨
            if (sequence && sequence[index]) {
                const chunkText = sequence[index].text.trim();
                // If it ends in a soft pause (comma, semicolon, colon), cut the gap exactly in half!
                if (/[,;:]$/.test(chunkText)) {
                    gapMs = Math.floor(gapMs / 2);
                }
            }

            source.onended = () => {
                pauseTimerRef.current = setTimeout(() => {
                    playNextChunk(index + 1);
                }, gapMs); 
            };
            
            activeSourceRef.current = source;
            
            if (envGainRef.current) {
                const now = ctx.currentTime;
                const duration = source.buffer.duration / playbackRate;
                
                envGainRef.current.gain.cancelScheduledValues(now);
                
                // ✨ MIKA'S ANTI-POP FADE-IN (30ms)
                envGainRef.current.gain.setValueAtTime(0.001, Math.max(0, now));
                envGainRef.current.gain.exponentialRampToValueAtTime(1.0, Math.max(0, now + 0.03));
                
                            // ✨ MIKA'S HALLUCINATION SHREDDER / TAIL GATE ✨
                const fadeOutStart = Math.max(now + 0.05, now + duration - 0.12);
                envGainRef.current.gain.setValueAtTime(1.0, fadeOutStart);
                envGainRef.current.gain.exponentialRampToValueAtTime(0.001, Math.max(0, now + duration));
            }

            source.start(0);
            setIsPlaying(true);
         } catch(e) {
            setIsPlaying(false);
            if (window.isMikaAudioPlaying === msgId) window.isMikaAudioPlaying = null; // ✨ MIKA'S FIX
        }
    };

     // ✨ MIKA'S SELF-HEALING HEIR WATCHDOG ✨
    // Completely replaces the fragile domino chain!
    const checkAndPlayIfHeir = useCallback(() => {
        if (!autoPlay || !audioBuffers.length || isPlaying || window.isMikaAudioPlaying) return;
        
        // ✨ MIKA'S STRICT AUTOPLAY LOCK ✨
        // If I am not explicitly inside the tracker, I DO NOT PLAY! 
        // (This prevents old messages from suddenly playing when toggling the setting!)
        if (!window.MikaUnplayedAudioTracker || !window.MikaUnplayedAudioTracker.has(msgId)) return;

        let isHeir = true;
        if (window.MikaUnplayedAudioTracker && window.MikaUnplayedAudioTracker.size > 0) {
            // Grab the very first item in the Set (which is always the oldest chronological message!)
            const firstUnplayed = window.MikaUnplayedAudioTracker.values().next().value;
            // If someone else is older than me, I am NOT the rightful heir. I must wait!
            if (firstUnplayed && firstUnplayed !== msgId) isHeir = false;
        }

        if (isHeir && !hasAutoPlayedRef.current) {
            hasAutoPlayedRef.current = true;
            executePlay();
        }
    }, [audioBuffers, autoPlay, isPlaying, msgId]);

    // Check whenever my own audio file finishes synthesizing and loads into memory
    useEffect(() => {
        checkAndPlayIfHeir();
    }, [audioBuffers, checkAndPlayIfHeir]);

    // Check whenever ANY other girl finishes speaking, gets skipped, or gets deleted
    useEffect(() => {
        const handleAudioFinished = () => {
            // ✨ MIKA'S FIX: A natural 800ms conversational pause!
            // This lets the visual JRPG engine return the current speaker to the background before the next one steps up!
            setTimeout(checkAndPlayIfHeir, 800); 
        };
        window.addEventListener('mika-audio-finished', handleAudioFinished);
        window.addEventListener('mika-force-play', handleAudioFinished); // Keep the legacy laser beam as a backup trigger!
        return () => {
            window.removeEventListener('mika-audio-finished', handleAudioFinished);
            window.removeEventListener('mika-force-play', handleAudioFinished);
        };
    }, [checkAndPlayIfHeir]);

    // ✨ MIKA'S GLOBAL SILENCER ✨
    // Listens for shockwaves from other play buttons and instantly mutes itself!
    useEffect(() => {
        const handleGlobalStop = (e) => {
            if (e.detail.id !== msgId && isPlaying) {
                if (activeSourceRef.current) {
                    activeSourceRef.current.onended = null; 
                    try { activeSourceRef.current.stop(); } catch(err){}
                    activeSourceRef.current.disconnect();
                    activeSourceRef.current = null;
                }
                if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
                setIsPlaying(false);
                window.dispatchEvent(new CustomEvent('mika-audio-finished', { detail: { id: msgId } })); // ✨ Clear the tracker!
            }
        };
        window.addEventListener('mika-stop-audio', handleGlobalStop);
        return () => window.removeEventListener('mika-stop-audio', handleGlobalStop);
    }, [isPlaying, msgId]);

    const togglePlay = async (e) => {
        e.stopPropagation();
        if (!audioBuffers.length) return;
        
        setupAudioGraph();
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            await audioCtxRef.current.resume().catch(()=>{});
        }

        if (isPlaying) { 
            if (activeSourceRef.current) {
                activeSourceRef.current.onended = null; 
                try { activeSourceRef.current.stop(); } catch(e){}
                activeSourceRef.current.disconnect();
            }
            if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
            setIsPlaying(false); 
            if (window.isMikaAudioPlaying === msgId) window.isMikaAudioPlaying = null; 
            window.dispatchEvent(new CustomEvent('mika-audio-finished', { detail: { id: msgId } })); // ✨ Clear the tracker!
            window.dispatchEvent(new CustomEvent('mika-rp-subtitle-clear', { detail: { msgId } }));
        } 
        else { 
            // ✨ FIRE THE MUTE SHOCKWAVE!
            window.dispatchEvent(new CustomEvent('mika-stop-audio', { detail: { id: msgId } }));
            
            window.MikaAudioQueue.isPlaying = true; 
            window.isMikaAudioPlaying = msgId; // ✨ MIKA'S FIX
            playNextChunk(currentChunkIdx >= audioBuffers.length ? 0 : currentChunkIdx); 
        }
    };

    return (
        <div style={{ position: 'absolute', bottom: '8px', right: '-38px', zIndex: 10, display: 'flex', alignItems: 'center', animation: 'fadeIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards' }}>
            <div style={{ width: '6px', height: '3px', background: themeColor, boxShadow: `0 0 8px ${themeColor}`, opacity: 0.8, borderRadius: '2px 0 0 2px' }}></div>
            <button onClick={togglePlay} disabled={isLoading || !audioBuffers.length} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, background: isLoading ? 'rgba(0,0,0,0.5)' : `rgba(5, 3, 8, 0.45)`, backdropFilter: 'blur(16px) saturate(2)', WebkitBackdropFilter: 'blur(16px) saturate(2)', border: `1px solid ${themeColor}60`, borderLeft: `2px solid ${themeColor}`, boxShadow: `0 4px 12px rgba(0,0,0,0.6), inset 0 0 20px ${themeColor}20`, cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', color: themeColor, padding: 0 }}
                onMouseOver={e => { if(!isLoading) { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.background = `rgba(15, 10, 20, 0.8)`; e.currentTarget.style.boxShadow = `0 6px 16px rgba(0,0,0,0.8), 0 0 15px ${themeColor}40, inset 0 0 25px ${themeColor}40`; } }}
                onMouseOut={e => { if(!isLoading) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = `rgba(5, 3, 8, 0.45)`; e.currentTarget.style.boxShadow = `0 4px 12px rgba(0,0,0,0.6), inset 0 0 20px ${themeColor}20`; } }}
            >
                {isLoading ? ( 
                    <div style={{ animation: 'fadeIn 0.5s ease' }}>
                        <div className="resume-spinner" style={{ width: '12px', height: '12px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.1)', borderTopColor: themeColor }}></div>
                    </div>
                ) : isPlaying ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ filter: `drop-shadow(0 0 6px ${themeColor})`, animation: 'fadeIn 0.5s ease' }}><rect x="5" y="4" width="4" height="16" rx="2" /><rect x="15" y="4" width="4" height="16" rx="2" /></svg>
                ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ filter: `drop-shadow(0 0 6px ${themeColor})`, transform: 'translateX(1px)', animation: 'fadeIn 0.5s ease' }}><path d="M5 3.868v16.264c0 1.54 1.688 2.49 3.013 1.696l13.553-8.132c1.282-.77 1.282-2.622 0-3.392L8.013 2.172C6.688 1.378 5 2.328 5 3.868z" /></svg>
                )}
            </button>
        </div>
    );
};

// ✨ MIKA'S HOLOGRAPHIC TYPEWRITER & PHASING ENGINE (v2: STABLE-PREFIX FORMAT CACHE) ✨
// Streaming used to rebuild the ENTIRE element list on every typewriter tick: every
// cyber-phase-chunk REMOUNTED (its 0.22s entry fade restarted ~60x/sec — the flashing),
// and the parts pipeline ran full O(n) passes over the growing message each tick.
// v2 caches the rendered HEAD (everything up through the part boundary containing the
// phasing cursor) and re-formats ONLY the short tail per tick: keys stay stable, DOM
// nodes persist, entry fades play once per part, and tick cost collapses to O(tail).
export const formatMessageText = (text, isTyping = false, phaseStartIndex = -1, cacheRef = null, keyScope = '') => {
    if (!text && !isTyping) return null;
    let elements = [];
    if (text) {
        // ✨ MIKA'S ESCAPE PURGE: Unescape literal \n or \r\n from LLM outputs into real line breaks!
        const normalized = (text || '').replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
        // ✨ MIKA'S MAGIC PARSER: Captures both COMPLETE (*...*) and INCOMPLETE (*...) actions at the edge of the stream!
        const parts = normalized.split(/(\*[^*]*?\*|\*[^*]*$)/g);
        let currentOffset = 0;

        // ✨ STABLE-PREFIX CACHE WINDOW ✨
        // Validate the cached head against the freshly-split parts (cheap prefix string-compare),
        // then render ONLY the tail: React keeps the tail's DOM nodes alive across ticks, so
        // chunk entry fades play once per part instead of restarting every 16-35ms.
        if (cacheRef && isTyping && phaseStartIndex > 0) {
            const cache = cacheRef.current;
            if (cache.cutPartIdx > 0 && cache.partTexts) {
                let cacheValid = true;
                for (let pi = 0; pi < cache.cutPartIdx; pi++) {
                    if (parts[pi] !== cache.partTexts[pi]) { cacheValid = false; break; }
                }
                if (cacheValid) {
                    const tailText = parts.slice(cache.cutPartIdx).join('');
                    const tailElements = formatMessageText(tailText, cache.showCursor, 0, null, `${keyScope}t-`) || [];
                    return [...cache.headElements, ...tailElements];
                }
            }
        }

        // ✨ v2.5.25 DIRECT-STREAM CACHE (phaseStartIndex < 0) ✨
        // The 1-on-1 direct pipeline calls with isTyping=true and no phase cursor, which used to
        // re-format the ENTIRE growing message on every stream commit (O(msg) parse + full element
        // churn per commit). Pin the rendered head at the last safe boundary instead: only the
        // still-mutating tail (plus cursor) re-renders per commit. Safe cuts are part boundaries
        // (a plain part may be cut mid-way; an action part may not) with dice-chip + surrogate
        // guards. Any retro-mutation of the head (SMS pair-close, quote strip) fails the prefix
        // check above → full re-format + re-pin, so correctness never depends on the cache.
        if (cacheRef && isTyping && phaseStartIndex < 0) {
            const cache = cacheRef.current;
            if (cache.headText && cache.headElements && normalized.lastIndexOf(cache.headText, 0) === 0) {
                const tailText = normalized.slice(cache.headText.length);
                const tailElements = formatMessageText(tailText, true, -1, null, `${keyScope}t-`) || [];
                return [...cache.headElements, ...tailElements];
            }
        }
        let phaseCut = -1;
        let phaseCutIdx = -1;

        const renderDiceOrText = (rawStr, isPhased, keyPrefix) => {
            if (!rawStr) return null;
            const diceParts = rawStr.split(/(\[\s*🎲\s*Rolled a \d+\s*\])/gi);
            const rendered = diceParts.map((dp, j) => {
                if (!dp) return null;
                if (/\[\s*🎲\s*Rolled a \d+\s*\]/i.test(dp)) {
                    return (
                        <span key={`${keyPrefix}-dice-${j}`} style={{ background: 'rgba(255, 215, 0, 0.15)', color: '#FFD700', border: '1px solid #FFD700', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', display: 'inline-block', margin: '0 4px', boxShadow: '0 0 8px rgba(255, 215, 0, 0.2)', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", verticalAlign: 'middle' }}>
                            {dp.replace(/[\[\]]/g, '').trim()}
                        </span>
                    );
                }
                return <span key={`${keyPrefix}-t-${j}`}>{dp}</span>;
            }).filter(Boolean);

            if (isPhased) {
                return (
                    <span key={`${keyPrefix}-phase`} className="cyber-phase-chunk">
                        {rendered}
                    </span>
                );
            }
            return <React.Fragment key={`${keyPrefix}-frag`}>{rendered}</React.Fragment>;
        };

        parts.forEach((part, i) => {
            if (!part) return;

            const partStart = currentOffset;
            const partEnd = currentOffset + part.length;
            currentOffset = partEnd;

            const isAction = part.startsWith('*');

            // Determine phasing boundary
            const hasPhasing = phaseStartIndex >= 0 && isTyping && phaseStartIndex < normalized.length;

            // ✨ Track the part boundary containing the phasing cursor (cache anchor point)
            if (hasPhasing && phaseCut === -1 && partStart <= phaseStartIndex && partEnd > phaseStartIndex) {
                phaseCut = partStart;
                phaseCutIdx = i;
            }

            if (hasPhasing && partEnd > phaseStartIndex) {
                if (partStart >= phaseStartIndex) {
                    // Entire part is in the active phasing chunk
                    if (isAction) {
                        const cleanPart = part.replace(/^\*|\*$/g, '');
                        elements.push(
                            <span key={`${keyScope}${i}`} className="cyber-phase-chunk" style={{ color: 'var(--action-text-color, #B533FF)', fontStyle: 'italic', opacity: 0.9 }}>
                                {cleanPart}
                            </span>
                        );
                    } else {
                        elements.push(renderDiceOrText(part, true, `${keyScope}p-${i}`));
                    }
                } else {
                    // Part is split between stable and phasing
                    const splitPoint = phaseStartIndex - partStart;
                    const stablePart = part.substring(0, splitPoint);
                    const phasePart = part.substring(splitPoint);

                    if (isAction) {
                        const cleanStable = stablePart.replace(/^\*/, '');
                        const cleanPhase = phasePart.replace(/\*$/, '');
                        if (cleanStable) {
                            elements.push(
                                <span key={`${keyScope}${i}-stable`} style={{ color: 'var(--action-text-color, #B533FF)', fontStyle: 'italic', opacity: 0.9 }}>
                                    {cleanStable}
                                </span>
                            );
                        }
                        if (cleanPhase) {
                            elements.push(
                                <span key={`${keyScope}${i}-phase`} className="cyber-phase-chunk" style={{ color: 'var(--action-text-color, #B533FF)', fontStyle: 'italic', opacity: 0.9 }}>
                                    {cleanPhase}
                                </span>
                            );
                        }
                    } else {
                        if (stablePart) elements.push(renderDiceOrText(stablePart, false, `${keyScope}p-${i}-s`));
                        if (phasePart) elements.push(renderDiceOrText(phasePart, true, `${keyScope}p-${i}-p`));
                    }
                }
            } else {
                // Entirely stable
                if (isAction) {
                    const cleanPart = part.replace(/^\*|\*$/g, '');
                    elements.push(
                        <span key={`${keyScope}${i}`} style={{ color: 'var(--action-text-color, #B533FF)', fontStyle: 'italic', opacity: 0.9 }}>
                            {cleanPart}
                        </span>
                    );
                } else {
                    elements.push(renderDiceOrText(part, false, `${keyScope}p-${i}`));
                }
            }
        });

        // ✨ CACHE REFRESH: pin the stable prefix for the next tick (once per part boundary) ✨
        if (cacheRef && isTyping && phaseCutIdx >= 0 && phaseCut > 0 && phaseCut < normalized.length) {
            cacheRef.current = {
                cutPartIdx: phaseCutIdx,
                partTexts: parts.slice(0, phaseCutIdx),
                showCursor: isTyping,
                headElements: formatMessageText(normalized.slice(0, phaseCut), false, -1, null, `${keyScope}h-`)
            };
        }

        // ✨ v2.5.25 DIRECT-STREAM CACHE REFRESH (phaseStartIndex < 0) ✨
        // Keep the pinned head while its prefix stays valid and the tail stays inside the window;
        // re-pin (one full-format pass) only when the tail outgrows the window or the head mutated.
        if (cacheRef && isTyping && phaseStartIndex < 0) {
            const cache = cacheRef.current;
            const TAIL_KEEP = 256;
            const TAIL_MAX = 448;
            const len = normalized.length;
            const headValid = !!(cache.headText && cache.headElements && normalized.lastIndexOf(cache.headText, 0) === 0);
            const tailLen = headValid ? (len - cache.headText.length) : len;
            if (!headValid || tailLen > TAIL_MAX) {
                let cut = 0;
                let off = 0;
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    if (!part) continue;
                    const start = off;
                    const end = off + part.length;
                    off = end;
                    if (end <= len - TAIL_KEEP) {
                        cut = end; // settled part boundary — always a safe cut
                        continue;
                    }
                    // This part spans the tail window — only plain parts may be cut mid-way
                    if (part.charAt(0) !== '*') {
                        let inner = Math.max(start, len - TAIL_KEEP);
                        const seg = normalized.slice(start, inner);
                        const ob = seg.lastIndexOf('[');
                        const cb = seg.lastIndexOf(']');
                        if (ob > cb) inner = start + ob; // never split a dice chip
                        if (inner > start) {
                            const c0 = normalized.charCodeAt(inner - 1);
                            if (c0 >= 0xD800 && c0 <= 0xDBFF) inner -= 1; // never split a surrogate pair
                        }
                        if (inner > start && inner > cut) cut = inner;
                    }
                    break; // first part that reaches into the tail window ends the scan
                }
                if (cut > 0 && cut < len) {
                    cacheRef.current = {
                        headText: normalized.slice(0, cut),
                        headElements: formatMessageText(normalized.slice(0, cut), false, -1, null, `${keyScope}h-`)
                    };
                }
            }
        }
    }
    if (isTyping) {
        elements.push(<span key="cursor" className="cyber-typing-cursor">_</span>);
    }
    return elements;
};

// ✨ MIKA'S RULES-OF-HOOKS GUARD (REACT #300 "NEURAL_MATRIX_DESYNC" CRASH FIX) ✨
// The two rendering pipelines are separate component TYPES chosen by the parent selector below.
// A mid-conversation flip of bypassSpeedLimit (e.g. the first telemetry sample landing the moment
// a stream ends) now remounts cleanly instead of changing the hook count of a mounted instance,
// which crashed with "Rendered fewer hooks than expected" -> NEURAL_MATRIX_DESYNC.
const HolographicDirectMessage = ({ content, isTyping, isUser, onComplete }) => {
    const onCompleteRef = React.useRef(onComplete);
    onCompleteRef.current = onComplete;

    // ✨ v2.5.25 O(TAIL) DIRECT STREAM: stable-prefix format cache for the direct pipeline ✨
    // (mirrors the typewriter cache — the streaming message re-renders ONLY its mutating tail
    // per stream commit instead of re-formatting the whole message every ~160ms)
    const formatCacheRef = React.useRef({ headText: '', headElements: null });

    // Direct-render path still coordinates badges & photos via the visual-stream events.
    React.useEffect(() => {
        if (isTyping) {
            window.dispatchEvent(new Event('visual-stream-start'));
        } else {
            formatCacheRef.current = { headText: '', headElements: null }; // park the cache between streams
            window.dispatchEvent(new Event('visual-stream-end'));
            if (onCompleteRef.current) onCompleteRef.current();
        }
    }, [isTyping]);

    return (
        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', display: 'inline' }}>
            {!isUser && <span className="term-prefix">&gt;</span>}
            {formatMessageText(content || '', isTyping, -1, isTyping ? formatCacheRef : null)}
        </span>
    );
};

// ✨ MIKA'S CLOUD TYPEWRITER FLOW CADENCE (v2.5.41) ✨
// One S-curve from first char to last: every stream starts out slower (warm-up ramp), short
// replies cruise in a gentle ~45 c/s band and never leave it, and — only when a reply proves
// LONG and the buffer is running ahead — the cursor accelerates into a ~190 c/s (~50 t/s)
// fast lane, eases back out as the backlog drains, and tapers gently to a stop.
const TYPEWRITER_CAP_STEP_MS = 22;        // cruise band: ~45 c/s ≈ 11.8 t/s (short replies stay here)
const TYPEWRITER_TAPER_STEP_MS = 32;      // finish: gentle slowdown on the last few chars
const TYPEWRITER_WARMUP_START_MS = 34;    // stream start: slower first characters
const TYPEWRITER_WARMUP_CHARS = 64;       // warm-up ramp spans the first ~64 chars of a stream
const TYPEWRITER_FAST_STEP_MS = 5;        // fast lane ceiling: ~200 c/s ≈ 50+ t/s (long replies only)
const TYPEWRITER_ACCEL_MIN_CHARS = 600;   // replies shorter than this never leave the cruise band
const TYPEWRITER_ACCEL_FULL_CHARS = 1800; // replies this long earn the full fast lane
const TYPEWRITER_EASEOUT_DIFF = 128;      // backlog distance where the ease-out deceleration begins
const TYPEWRITER_EASEOUT_DIFF_MIN = 16;   // backlog distance where the cursor is back to cruise
const TYPEWRITER_MAX_TAKE = 6;            // hard per-frame char ceiling (no gulps, ever)
const TYPEWRITER_MAX_CREDIT_MS = 100;     // accrued typing-credit cap (bounds post-stall burst)

const HolographicTypewriterMessage = ({ content, isTyping, isUser, onComplete }) => {
    // ✨ MIKA'S ADAPTIVE STREAMING PIPELINE (typewriter for cloud engines & group playback) ✨
    const [displayedText, setDisplayedText] = React.useState(isTyping ? '' : (content || ''));
    const [isFinishingBuffer, setIsFinishingBuffer] = React.useState(isTyping);
    const [phaseStartIndex, setPhaseStartIndex] = React.useState(isTyping ? 0 : (content?.length || 0));

    const contentRef = React.useRef(content || '');
    contentRef.current = content || '';

    const isTypingRef = React.useRef(isTyping);
    isTypingRef.current = isTyping;

    const onCompleteRef = React.useRef(onComplete);
    onCompleteRef.current = onComplete;

    const displayedTextRef = React.useRef(displayedText);
    displayedTextRef.current = displayedText;

    const isFinishingRef = React.useRef(isFinishingBuffer);
    isFinishingRef.current = isFinishingBuffer;

    // ✨ FLOW CADENCE: chars typed since this stream began (drives the slow-start ramp) ✨
    const warmupCharsRef = React.useRef(0);

    // ✨ FLOW CADENCE: accrued typing credit (ms) — powers smooth multi-char steps at the fast
    // lane while the per-step delay math keeps every take display-refresh independent ✨
    const creditRef = React.useRef(0);

    // ✨ MIKA'S STABLE-PREFIX FORMAT CACHE ✨ (kills the per-tick full re-format & chunk flash storm)
    const formatCacheRef = React.useRef({ cutPartIdx: 0, partTexts: null, showCursor: false, headElements: null });
    React.useEffect(() => {
        if (isTyping) {
            setIsFinishingBuffer(true);
            isFinishingRef.current = true;
            warmupCharsRef.current = 0; // ✨ fresh stream → fresh slow-start ramp ✨
            window.dispatchEvent(new Event('visual-stream-start'));
        }
    }, [isTyping]);

    // ✨ MIKA'S ADAPTIVE TYPEWRITER ENGINE v4 (rAF-CADENCE, FLOW-CAPPED) ✨
    // One commit per animation frame max (no setTimeout cascade backlog under load), an
    // S-curve flow cadence (slow warm-up → cruise band → long-reply fast lane ≤ ~50 t/s →
    // ease-out → taper), and scroll sync coalesced to ~10Hz. Time-credit pacing keeps every
    // step display-refresh independent and hard-bounded — no gulps, no dumps.
    React.useEffect(() => {
        // If message is static/old and not typing, ensure it matches content
        if (!isTyping && !isFinishingRef.current) {
            if (displayedText !== content) {
                setDisplayedText(content || '');
                setPhaseStartIndex(content?.length || 0);
            }
            return;
        }

        let isMounted = true;
        let rafId = null;
        let lastFrameTs = 0;
        let lastScrollTs = 0;
        let lastWaitCheckTs = 0;

        const tick = (ts) => {
            if (!isMounted) return;
            rafId = requestAnimationFrame(tick);

            const target = contentRef.current || '';
            const current = displayedTextRef.current || '';
            const frameDelta = lastFrameTs > 0 ? Math.min(ts - lastFrameTs, 100) : 16;
            lastFrameTs = ts;

            if (current.length < target.length) {
                const diff = target.length - current.length;

                // ✨ v2.5.41 FLOW CADENCE (S-CURVE) ✨
                // Taper → warm-up slow start → cruise band → (long replies) fast lane, with an
                // ease-out as the cursor closes on the end of the pending content. The fast lane
                // needs BOTH a long reply and real catch-up pressure, so short replies can never
                // reach it — they just glide: slowish → a bit faster → gentle stop.
                let stepDelay;
                if (diff <= 8 && !isTypingRef.current) {
                    // Gentle taper towards the very finish
                    stepDelay = TYPEWRITER_TAPER_STEP_MS;
                } else if (warmupCharsRef.current < TYPEWRITER_WARMUP_CHARS) {
                    // Starts out slower: warm-up ramps down to the cruise speed across the span
                    stepDelay = TYPEWRITER_WARMUP_START_MS - Math.round(
                        (TYPEWRITER_WARMUP_START_MS - TYPEWRITER_CAP_STEP_MS) *
                        (warmupCharsRef.current / TYPEWRITER_WARMUP_CHARS)
                    );
                } else {
                    // Ease-in: how long has this reply proven to be? (0..1 across 600→1800 chars)
                    const longReply = Math.max(0, Math.min(1,
                        (target.length - TYPEWRITER_ACCEL_MIN_CHARS) / (TYPEWRITER_ACCEL_FULL_CHARS - TYPEWRITER_ACCEL_MIN_CHARS)));
                    // Ease-out: decelerate as the remaining backlog shrinks (0 at diff≤16, 1 at diff≥128)
                    const nearEnd = Math.max(0, Math.min(1,
                        (diff - TYPEWRITER_EASEOUT_DIFF_MIN) / (TYPEWRITER_EASEOUT_DIFF - TYPEWRITER_EASEOUT_DIFF_MIN)));
                    const boost = Math.min(longReply, nearEnd);
                    stepDelay = Math.max(
                        TYPEWRITER_FAST_STEP_MS,
                        TYPEWRITER_CAP_STEP_MS - Math.round((TYPEWRITER_CAP_STEP_MS - TYPEWRITER_FAST_STEP_MS) * boost)
                    );
                }

                // ✨ TIME-CREDIT PACING (refresh-rate independent, hard-bounded) ✨
                // Accrue frame time as credit, spend it per-char at the current step delay, and
                // cap both the credit pool and the per-frame take — the fast lane streams
                // smoothly at ~50 t/s on any display without ever gulping.
                creditRef.current = Math.min(creditRef.current + frameDelta, TYPEWRITER_MAX_CREDIT_MS);
                if (creditRef.current < stepDelay) return;
                let charsToTake = 0;
                while (creditRef.current >= stepDelay && charsToTake < TYPEWRITER_MAX_TAKE) {
                    creditRef.current -= stepDelay;
                    charsToTake++;
                }
                if (charsToTake < 1) return;

                const nextIndex = Math.min(target.length, current.length + charsToTake);
                const nextText = target.substring(0, nextIndex);

                setPhaseStartIndex(current.length);
                setDisplayedText(nextText);
                displayedTextRef.current = nextText;
                if (warmupCharsRef.current < TYPEWRITER_WARMUP_CHARS) {
                    warmupCharsRef.current = Math.min(warmupCharsRef.current + charsToTake, TYPEWRITER_WARMUP_CHARS);
                }

                // Scroll sync ~10Hz (was EVERY tick — the app-level scroll listener ran 60x/s!)
                if (ts - lastScrollTs > 100) {
                    lastScrollTs = ts;
                    window.dispatchEvent(new Event('chat-scroll'));
                }
            } else if (current.length > target.length) {
                // If content was trimmed/scrubbed, adjust gracefully
                creditRef.current = 0;
                setDisplayedText(target);
                displayedTextRef.current = target;
                setPhaseStartIndex(target.length);
            } else {
                // current.length === target.length — idle while waiting for tokens: no stale credit
                creditRef.current = 0;
                if (ts - lastWaitCheckTs < 35) return; // recheck cadence while waiting for tokens
                lastWaitCheckTs = ts;
                if ((!isTypingRef.current || onCompleteRef.current) && isFinishingRef.current) {
                    setIsFinishingBuffer(false);
                    isFinishingRef.current = false;
                    setPhaseStartIndex(target.length);
                    window.dispatchEvent(new Event('visual-stream-end'));
                    if (onCompleteRef.current) {
                        onCompleteRef.current();
                    }
                }
                if (!isTypingRef.current && !isFinishingRef.current) {
                    // Message finished: park this loop (effect re-arms if typing resumes)
                    if (rafId) cancelAnimationFrame(rafId);
                    rafId = null;
                }
            }
        };

        rafId = requestAnimationFrame(tick);

        // ✨ v2.5.41 DRAIN-LATCH SURVIVAL FIX (the RP Long "massive dump") ✨
        // The old cleanup force-completed the stream on EVERY effect re-run — including the
        // isTyping=false flip at stream end. It killed the drain latch and fired
        // visual-stream-end/onComplete early, so the next pass hit the static-sync branch and
        // dumped the entire untyped remainder in one frame. The latch now survives re-runs and
        // the next effect run simply RESUMES the drain at the capped cadence.
        return () => {
            isMounted = false;
            if (rafId) cancelAnimationFrame(rafId);
            // NOTE: isFinishingRef intentionally left latched — the next run resumes the drain.
        };
    }, [isTyping, isFinishingBuffer]);

    // ✨ TRUE-UNMOUNT RELEASE (mount-scoped) ✨ — only a real unmount mid-drain releases the
    // badges/group queue; prop-driven re-runs never hijack the latch anymore.
    React.useEffect(() => {
        return () => {
            if (isFinishingRef.current) {
                isFinishingRef.current = false;
                window.dispatchEvent(new Event('visual-stream-end'));
                if (onCompleteRef.current) {
                    onCompleteRef.current();
                }
            }
        };
    }, []);

    // Keep the cursor visible while actively typing or draining buffer
    const showCursor = isTyping || (isFinishingBuffer && displayedText.length < (content?.length || 0));

    return (
        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', display: 'inline' }}>
            {!isUser && <span className="term-prefix">&gt;</span>}
            {formatMessageText(displayedText, showCursor, phaseStartIndex, formatCacheRef)}
        </span>
    );
};

// ✨ MIKA'S PIPELINE SELECTOR ✨
// v2.5.25 RENDER-RENDER MEMO GUARD: `onComplete` is an inline arrow at every call site, so the
// default shallow compare defeated this memo — EVERY bubble in history re-rendered (full
// formatMessageText + element rebuild per bubble) on every stream commit / TPS tick / App render.
// Both pipelines latch onComplete into a ref on render, so its identity is irrelevant to output;
// the comparator intentionally ignores it. A skipped render keeps using the previously captured
// closure, which performs the same ref-based completion work.
export const HolographicMessage = React.memo(({ content, isTyping, isUser, onComplete, bypassSpeedLimit }) => {
    if (bypassSpeedLimit) {
        return <HolographicDirectMessage content={content} isTyping={isTyping} isUser={isUser} onComplete={onComplete} />;
    }
    return <HolographicTypewriterMessage content={content} isTyping={isTyping} isUser={isUser} onComplete={onComplete} />;
}, (prev, next) => (
    prev.content === next.content &&
    prev.isTyping === next.isTyping &&
    prev.isUser === next.isUser &&
    prev.bypassSpeedLimit === next.bypassSpeedLimit
));

// ✨ MIKA'S SMART RP LONG PARAGRAPH SECTIONER ✨
export const sectionRpLongContent = (rawText) => {
    if (!rawText || typeof rawText !== 'string') return rawText || '';

    // 1. Unescape any escaped newlines and normalize line breaks
    let text = rawText.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n');

    // 2. Convert HTML break / paragraph tags into clean newlines
    text = text.replace(/<\/?p>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n\n');

    // 3. Preserve any leading reply tag: [Replying to Name: "Quote"]
    let replyPrefix = "";
    const replyMatch = text.match(/^(\[Replying to\s*[^\]]+\])\s*/i);
    if (replyMatch) {
        replyPrefix = replyMatch[1].trim() + '\n\n';
        text = text.substring(replyMatch[0].length).trim();
    }

    // 4. Section opening atmospheric asterisk action if followed immediately by dialogue without line breaks:
    // e.g. "*He looks around.* What is this place? *smiles*" -> "*He looks around.*\n\nWhat is this place? *smiles*"
    text = text.replace(/^(\*[^*]+?\*)\s*(?=[\p{L}\p{N}"“'—–«»])/u, '$1\n\n');

    // 5. Promote single line breaks into double line breaks (paragraphs with blank lines)
    text = text.replace(/(?<=[^\n])\n(?=[^\n])/g, '\n\n');

    // 6. Collapse 3+ newlines down to clean double newlines
    text = text.replace(/\n{3,}/g, '\n\n').trim();

    return replyPrefix ? (replyPrefix + text) : text;
};

