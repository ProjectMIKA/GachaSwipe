import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getSyncTier } from '../utils/sentimentEngine.js';
import { getMeowPeriodFromDate } from '../utils/wardrobeSchedule.js';
import MemoryRouter from '../utils/MemoryRouter.js';

const BUNDLED_THEME_TRACKS = [
    {
        id: 'bundled_milk_and_wire',
        name: 'Milk & Wire (Theme Mix)',
        genre: 'Cyberpop // Default',
        bpm: 124,
        directUrl: './media/milk_and_wire.mp3',
        isBundled: true
    },
    {
        id: 'bundled_matrix_bgm',
        name: 'Dread Tonight (Matrix Mix)',
        genre: 'Dark Synth // Arcade',
        bpm: 118,
        directUrl: './media/matrix_bgm.mp3',
        isBundled: true
    }
];

const PERIOD_LABELS = [
    { key: 'early_morning', label: '05-08 // EARLY' },
    { key: 'morning', label: '08-12 // MORN' },
    { key: 'afternoon', label: '12-17 // NOON' },
    { key: 'evening', label: '17-21 // EVE' },
    { key: 'night', label: '21-00 // NIGHT' },
    { key: 'late_night', label: '00-05 // LATE' }
];

const formatTime = (sec) => {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
};

const inferGenderLabel = (waifu) => {
    if (waifu?.gender) return waifu.gender;
    const blob = `${waifu?.core_appearance || ''} ${(waifu?.tags || []).join(' ')}`.toLowerCase();
    if (/\bfemboy\b/.test(blob)) return 'Femboy';
    if (/\btomboy\b/.test(blob)) return 'Tomboy';
    if (/\b(1boy|male|man|boy)\b/.test(blob) && !/\b1girl\b/.test(blob)) return 'Male';
    if (/\b(androgynous|non-binary|nonbinary)\b/.test(blob)) return 'Androgynous';
    return 'Female';
};

const computeCompatibility = (waifu, preferences = {}) => {
    const tags = Array.isArray(waifu?.tags) ? waifu.tags : [];
    const prefEntries = Object.entries(preferences || {});
    if (prefEntries.length === 0 || tags.length === 0) return null;

    const lowerPrefs = {};
    prefEntries.forEach(([k, v]) => {
        lowerPrefs[String(k).toLowerCase()] = Number(v) || 0;
    });

    let sum = 0;
    let hits = 0;
    tags.forEach((tag) => {
        const w = lowerPrefs[String(tag).toLowerCase()];
        if (w) {
            sum += w;
            hits += 1;
        }
    });

    if (hits === 0) return waifu?.isSSR ? 88 : 62;
    const base = 64 + Math.round(sum * 7) + (waifu?.isSSR ? 12 : 0);
    return Math.max(18, Math.min(99, base));
};

/**
 * Functional Early-2000s Cyberpunk Dating Profile HUD ("CYBER_MATCH_2004").
 * Purely driven by live GachaSwipe state (deck, active chat, Top 8 matches, M.E.O.W., LTM memories, and DAW tapes).
 */
export const DatingProfileHUD = ({
    deckWaifu,
    swipeMode = 'dating',
    activeChat,
    activeChatId,
    inspectedChatId,
    onInspectChat,
    inbox = {},
    preferences = {},
    swipes = 0,
    sparkTokens = 0,
    tapeArchive = [],
    pinnedChatBgs = {},
    enableBeatEngine = false,
    enableMeowEngine = true,
    activeThemeLabel = 'Matrix',
    onSwipeLeft,
    onSwipeRight,
    onOpenChat,
    onToggleFavorite,
    onOpenGachaFans,
    onShareProfile,
    onRegenPortrait,
    onOpenMatchDossier,
    onUpdateWaifu,
    onCompileMeow,
    onSelectPlayerTape,
    onPinChatBg,
    onViewPhoto,
    onForceGenerate
}) => {
    const [focusMode, setFocusMode] = useState('deck'); // 'deck' | 'chat' | 'inspected'
    const [showGallery, setShowGallery] = useState(false);
    const [showCoreDna, setShowCoreDna] = useState(false);
    const [routineDayTab, setRoutineDayTab] = useState(() => {
        const day = new Date().getDay();
        return (day === 0 || day === 6) ? 'weekend' : 'weekday';
    });
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [bioDraft, setBioDraft] = useState({ tagline: '', description: '', personality: '' });
    const [wallInput, setWallInput] = useState('');
    const [ltmMemories, setLtmMemories] = useState([]);

    // Audio player state
    const audioRef = useRef(null);
    const prevBlobUrlRef = useRef(null);
    const [selectedTrackId, setSelectedTrackId] = useState('bundled_milk_and_wire');
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioTime, setAudioTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);

    const lastDeckIdRef = useRef(null);
    const lastInspectedRef = useRef(null);
    const lastActiveChatRef = useRef(null);

    const realDeckCard = useMemo(() => {
        if (!deckWaifu) return null;
        if (deckWaifu.id === 'intro' || deckWaifu.id === 'intro_music' || deckWaifu.id === 'loading') return null;
        return deckWaifu;
    }, [deckWaifu]);

    const activeSoloChat = useMemo(() => {
        if (!activeChat || activeChat.isGroup || !activeChat.waifu) return null;
        return activeChat;
    }, [activeChat]);

    const inspectedChat = useMemo(() => {
        if (!inspectedChatId) return null;
        const c = inbox[inspectedChatId];
        if (!c || c.isGroup || !c.waifu) return null;
        return c;
    }, [inspectedChatId, inbox]);

    // Auto-follow new swipe cards, inspected Top 8 selections, or solo chat switches
    useEffect(() => {
        const nextId = realDeckCard?.id || null;
        if (nextId && nextId !== lastDeckIdRef.current) {
            setFocusMode('deck');
            setShowGallery(false);
            setIsEditingBio(false);
        }
        lastDeckIdRef.current = nextId;
    }, [realDeckCard?.id]);

    useEffect(() => {
        if (inspectedChatId && inspectedChatId !== lastInspectedRef.current) {
            setFocusMode('inspected');
            setShowGallery(false);
            setIsEditingBio(false);
        }
        lastInspectedRef.current = inspectedChatId || null;
    }, [inspectedChatId]);

    useEffect(() => {
        if (activeChatId && activeChatId !== lastActiveChatRef.current && inbox[activeChatId] && !inbox[activeChatId].isGroup) {
            setFocusMode('chat');
            setShowGallery(false);
            setIsEditingBio(false);
        }
        lastActiveChatRef.current = activeChatId || null;
    }, [activeChatId, inbox]);

    // Resolve active subject to render
    const resolved = useMemo(() => {
        if (focusMode === 'inspected' && inspectedChat) {
            return { mode: 'matched', chat: inspectedChat, chatId: inspectedChatId, waifu: inspectedChat.waifu };
        }
        if (focusMode === 'chat' && activeSoloChat) {
            return { mode: 'matched', chat: activeSoloChat, chatId: activeChatId, waifu: activeSoloChat.waifu };
        }
        if (focusMode === 'deck' && realDeckCard) {
            if (realDeckCard.isMusicConcept) {
                return { mode: 'music', chat: null, chatId: null, waifu: realDeckCard };
            }
            const existingChat = realDeckCard.id ? inbox[realDeckCard.id] : null;
            if (existingChat && existingChat.waifu) {
                return { mode: 'matched', chat: existingChat, chatId: realDeckCard.id, waifu: existingChat.waifu };
            }
            return { mode: 'deck', chat: null, chatId: null, waifu: realDeckCard };
        }
        if (realDeckCard) {
            if (realDeckCard.isMusicConcept) {
                return { mode: 'music', chat: null, chatId: null, waifu: realDeckCard };
            }
            const existingChat = realDeckCard.id ? inbox[realDeckCard.id] : null;
            return existingChat?.waifu
                ? { mode: 'matched', chat: existingChat, chatId: realDeckCard.id, waifu: existingChat.waifu }
                : { mode: 'deck', chat: null, chatId: null, waifu: realDeckCard };
        }
        if (inspectedChat) {
            return { mode: 'matched', chat: inspectedChat, chatId: inspectedChatId, waifu: inspectedChat.waifu };
        }
        if (activeSoloChat) {
            return { mode: 'matched', chat: activeSoloChat, chatId: activeChatId, waifu: activeSoloChat.waifu };
        }
        return { mode: 'overview', chat: null, chatId: null, waifu: null };
    }, [focusMode, inspectedChat, inspectedChatId, activeSoloChat, activeChatId, realDeckCard, inbox]);

    // Master's Top 8 real matched friends
    const top8Friends = useMemo(() => {
        return Object.entries(inbox || {})
            .filter(([, c]) => c && !c.isGroup && c.waifu && (c.status === 'friend' || c.status === 'approved'))
            .sort(([, a], [, b]) => {
                if (Boolean(a.isFavorite) !== Boolean(b.isFavorite)) return a.isFavorite ? -1 : 1;
                return (Number(b.affection) || 0) - (Number(a.affection) || 0);
            })
            .slice(0, 8);
    }, [inbox]);

    // Available theme tracks (DAW archive + bundled tracks)
    const availableTracks = useMemo(() => {
        const dawTracks = (tapeArchive || [])
            .filter((t) => t && t.audioUrl)
            .map((t) => ({
                id: t.id,
                name: t.name || 'Untitled Tape',
                genre: t.genre || 'Cyberdeck DAW',
                bpm: t.bpm || 120,
                audioUrl: t.audioUrl,
                rawTape: t,
                isBundled: false
            }));
        return [...dawTracks, ...BUNDLED_THEME_TRACKS];
    }, [tapeArchive]);

    // Sync selected track when subject changes
    useEffect(() => {
        const pinnedId = resolved.waifu?.profileThemeTapeId;
        if (pinnedId && availableTracks.some((t) => t.id === pinnedId)) {
            setSelectedTrackId(pinnedId);
        } else if (tapeArchive && tapeArchive.length > 0 && availableTracks.length > 0) {
            setSelectedTrackId(availableTracks[0].id);
        } else {
            setSelectedTrackId('bundled_milk_and_wire');
        }
    }, [resolved.waifu?.id, resolved.waifu?.profileThemeTapeId, availableTracks, tapeArchive]);

    const currentTrack = useMemo(() => {
        return availableTracks.find((t) => t.id === selectedTrackId) || BUNDLED_THEME_TRACKS[0];
    }, [availableTracks, selectedTrackId]);

    // Load virtual audio file or direct URL into HTML5 audio element
    useEffect(() => {
        let cancelled = false;
        const audio = audioRef.current;
        if (!audio || !currentTrack) return undefined;

        const revokePrevBlob = () => {
            if (prevBlobUrlRef.current) {
                try { URL.revokeObjectURL(prevBlobUrlRef.current); } catch { /* ignore */ }
                prevBlobUrlRef.current = null;
            }
        };

        const loadTrackSource = async () => {
            setAudioTime(0);
            setAudioDuration(0);
            setIsPlaying(false);
            audio.pause();

            const rawUrl = currentTrack.directUrl || currentTrack.audioUrl || '';
            if (!rawUrl) return;

            if (rawUrl.startsWith('./') || rawUrl.startsWith('/') || rawUrl.startsWith('http') || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
                revokePrevBlob();
                audio.src = rawUrl;
                return;
            }

            // Virtual filesystem audio (saved by Cyberdeck DAW via layla.utils.saveFile)
            try {
                if (typeof window !== 'undefined' && window.layla?.utils?.readFile) {
                    const fileRes = await window.layla.utils.readFile(rawUrl);
                    if (cancelled) return;
                    const b64Raw = fileRes?.content_base64 || fileRes?.data;
                    if (b64Raw) {
                        const cleanB64 = b64Raw.includes(',') ? b64Raw.split(',')[1] : b64Raw;
                        const mime = b64Raw.includes(';') ? b64Raw.split(';')[0].split(':')[1] : 'audio/wav';
                        const byteStr = atob(cleanB64);
                        const bytes = new Uint8Array(byteStr.length);
                        for (let i = 0; i < byteStr.length; i += 1) bytes[i] = byteStr.charCodeAt(i);
                        const objUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
                        revokePrevBlob();
                        prevBlobUrlRef.current = objUrl;
                        audio.src = objUrl;
                    }
                }
            } catch (err) {
                console.warn('[DatingProfileHUD] Failed to load profile theme audio:', err);
            }
        };

        loadTrackSource();
        return () => {
            cancelled = true;
            revokePrevBlob();
        };
    }, [currentTrack]);

    // Fetch real LTM memories when inspecting a matched character
    useEffect(() => {
        let cancelled = false;
        const targetId = resolved.mode === 'matched' ? resolved.chatId : null;
        if (!targetId) {
            setLtmMemories([]);
            return undefined;
        }
        MemoryRouter.getRecentMemories(targetId, 6)
            .then((list) => {
                if (!cancelled) setLtmMemories(Array.isArray(list) ? list : []);
            })
            .catch(() => {
                if (!cancelled) setLtmMemories([]);
            });
        return () => { cancelled = true; };
    }, [resolved.mode, resolved.chatId, resolved.chat?.messages?.length]);

    const toggleAudioPlay = async () => {
        const audio = audioRef.current;
        if (!audio || !audio.src) return;
        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            try {
                await audio.play();
                setIsPlaying(true);
            } catch (err) {
                console.warn('[DatingProfileHUD] Audio playback error:', err);
                setIsPlaying(false);
            }
        }
    };

    const handleSeekAudio = (e) => {
        const val = Number(e.target.value);
        if (audioRef.current && Number.isFinite(val)) {
            audioRef.current.currentTime = val;
            setAudioTime(val);
        }
    };

    const handleSelectTrack = (trackId) => {
        setSelectedTrackId(trackId);
        if (resolved.mode === 'matched' && resolved.waifu?.id && onUpdateWaifu) {
            onUpdateWaifu(resolved.waifu.id, { profileThemeTapeId: trackId });
        }
    };

    // Gallery images collected strictly from real character state
    const galleryImages = useMemo(() => {
        const list = [];
        const seen = new Set();
        const addImg = (url, label) => {
            if (!url || seen.has(url)) return;
            seen.add(url);
            list.push({ url, label });
        };

        const w = resolved.waifu;
        const c = resolved.chat;
        if (w?.imageUrl) addImg(w.imageUrl, `${w.name || 'Character'} // Portrait`);
        if (c?.messages) {
            c.messages.forEach((m, idx) => {
                if (m?.type === 'photo' && m.imageUrl) {
                    addImg(m.imageUrl, `Chat Photo #${idx + 1}`);
                }
            });
        }
        if (c?.premiumPage?.tiers) {
            c.premiumPage.tiers.forEach((tier, idx) => {
                if (tier?.imageUrl && (idx === 0 || c.premiumPage.isFullyUnlocked)) {
                    addImg(tier.imageUrl, tier.tier_name || `GachaFans Tier ${idx + 1}`);
                }
            });
            if (c.premiumPage.rewardUnlocked && c.premiumPage.rewardData?.imageUrl) {
                addImg(c.premiumPage.rewardData.imageUrl, 'Peak Hack Trophy');
            }
        }
        return list;
    }, [resolved.waifu, resolved.chat]);

    const currentMeowPeriod = getMeowPeriodFromDate();

    const renderTargetSwitcher = () => {
        if (!realDeckCard && !activeSoloChat && !inspectedChat) return null;
        return (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {realDeckCard && (
                    <button
                        type="button"
                        onClick={() => setFocusMode('deck')}
                        style={{
                            flex: '1 1 auto',
                            padding: '6px 8px',
                            fontSize: '9.5px',
                            fontWeight: 800,
                            fontFamily: 'inherit',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            background: focusMode === 'deck' ? 'rgba(255, 16, 122, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                            border: focusMode === 'deck' ? '1px solid #ff107a' : '1px solid rgba(255, 255, 255, 0.12)',
                            color: focusMode === 'deck' ? '#ff69b4' : 'rgba(255, 255, 255, 0.55)'
                        }}
                    >
                        🎴 DECK: {realDeckCard.name?.split(' ')[0] || 'Card'}
                    </button>
                )}
                {activeSoloChat && (
                    <button
                        type="button"
                        onClick={() => setFocusMode('chat')}
                        style={{
                            flex: '1 1 auto',
                            padding: '6px 8px',
                            fontSize: '9.5px',
                            fontWeight: 800,
                            fontFamily: 'inherit',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            background: focusMode === 'chat' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                            border: focusMode === 'chat' ? '1px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.12)',
                            color: focusMode === 'chat' ? '#00e5ff' : 'rgba(255, 255, 255, 0.55)'
                        }}
                    >
                        💬 CHAT: {activeSoloChat.waifu?.name?.split(' ')[0] || 'Match'}
                    </button>
                )}
                {inspectedChat && inspectedChatId !== activeChatId && (
                    <button
                        type="button"
                        onClick={() => setFocusMode('inspected')}
                        style={{
                            flex: '1 1 auto',
                            padding: '6px 8px',
                            fontSize: '9.5px',
                            fontWeight: 800,
                            fontFamily: 'inherit',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            background: focusMode === 'inspected' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                            border: focusMode === 'inspected' ? '1px solid #ffd700' : '1px solid rgba(255, 255, 255, 0.12)',
                            color: focusMode === 'inspected' ? '#ffd700' : 'rgba(255, 255, 255, 0.55)'
                        }}
                    >
                        ★ VIEWING: {inspectedChat.waifu?.name?.split(' ')[0] || 'Friend'}
                    </button>
                )}
            </div>
        );
    };

    const renderAudioPlayer = () => (
        <div
            style={{
                background: '#090710',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                borderRadius: '6px',
                padding: '12px',
                boxShadow: 'inset 0 0 15px rgba(0, 229, 255, 0.05)'
            }}
        >
            <audio
                ref={audioRef}
                preload="metadata"
                onTimeUpdate={(e) => setAudioTime(e.currentTarget.currentTime || 0)}
                onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration || 0)}
                onEnded={() => setIsPlaying(false)}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ fontSize: '10px', color: '#00e5ff', fontWeight: 900, letterSpacing: '0.06em' }}>
                    ♫ PROFILE_THEME_PLAYER
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {currentTrack?.rawTape && onSelectPlayerTape && (
                        <button
                            type="button"
                            onClick={() => onSelectPlayerTape(currentTrack.rawTape)}
                            style={{
                                background: 'rgba(181, 51, 255, 0.16)',
                                border: '1px solid rgba(181, 51, 255, 0.5)',
                                color: '#d685ff',
                                fontSize: '9px',
                                fontWeight: 'bold',
                                padding: '2px 7px',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontFamily: 'inherit'
                            }}
                            title="Open in Global Music Deck"
                        >
                            🎛️ DECK
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={toggleAudioPlay}
                        style={{
                            background: isPlaying ? 'rgba(0, 255, 157, 0.2)' : 'rgba(0, 229, 255, 0.12)',
                            border: isPlaying ? '1px solid #00ff9d' : '1px solid #00e5ff',
                            color: isPlaying ? '#00ff9d' : '#00e5ff',
                            fontSize: '9px',
                            fontWeight: 900,
                            padding: '3px 9px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontFamily: 'inherit'
                        }}
                    >
                        {isPlaying ? '❚❚ PAUSE' : '► PLAY'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                {/* Live Equalizer Bars */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '22px', width: '30px', flexShrink: 0 }}>
                    {[0, 0.18, 0.08, 0.28, 0.14].map((delay, idx) => (
                        <div
                            key={idx}
                            style={{
                                flex: 1,
                                height: '100%',
                                background: isPlaying ? '#00ff9d' : 'rgba(0, 229, 255, 0.35)',
                                transformOrigin: 'bottom',
                                transform: isPlaying ? undefined : 'scaleY(0.25)',
                                animation: isPlaying ? `dpEqBar 0.7s ease-in-out ${delay}s infinite` : 'none',
                                boxShadow: isPlaying ? '0 0 6px #00ff9d' : 'none'
                            }}
                        />
                    ))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {currentTrack?.name}
                    </div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                        <span>{currentTrack?.genre} // {currentTrack?.bpm || 120} BPM</span>
                        <span>{formatTime(audioTime)} / {formatTime(audioDuration)}</span>
                    </div>
                </div>
            </div>

            {/* Seek Scrubber & Track Selector */}
            <input
                type="range"
                min={0}
                max={audioDuration > 0 ? audioDuration : 1}
                step={0.1}
                value={audioTime}
                onChange={handleSeekAudio}
                disabled={audioDuration <= 0}
                style={{ width: '100%', accentColor: '#00ff9d', height: '4px', cursor: 'pointer', marginBottom: '8px' }}
                aria-label="Profile Song Progress"
            />

            <select
                value={selectedTrackId}
                onChange={(e) => handleSelectTrack(e.target.value)}
                style={{
                    width: '100%',
                    background: '#050308',
                    border: '1px solid rgba(0, 229, 255, 0.25)',
                    color: '#00e5ff',
                    borderRadius: '4px',
                    padding: '5px 8px',
                    fontSize: '9.5px',
                    fontFamily: 'inherit',
                    outline: 'none'
                }}
                aria-label="Select Profile Theme Song"
            >
                {availableTracks.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                        {tr.isBundled ? `♪ ${tr.name}` : `📼 ${tr.name}`}
                    </option>
                ))}
            </select>
        </div>
    );

    const renderTop8Grid = () => (
        <div
            style={{
                background: '#0B0914',
                border: '1px solid rgba(255, 215, 0, 0.28)',
                borderRadius: '6px',
                padding: '12px'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid rgba(255, 215, 0, 0.2)', paddingBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: '#ffd700', fontWeight: 900 }}>
                    &gt; MASTER&apos;S_TOP_8 ({top8Friends.length})
                </span>
                <span style={{ fontSize: '9px', color: 'rgba(255,215,0,0.65)' }}>★ CLICK TO INSPECT</span>
            </div>

            {top8Friends.length === 0 ? (
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', padding: '10px 4px', textAlign: 'center' }}>
                    Swipe right on matches to populate Master&apos;s Top 8 Friends! 🐾
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' }}>
                    {top8Friends.map(([cid, c]) => {
                        const isInspected = resolved.chatId === cid;
                        return (
                            <button
                                key={cid}
                                type="button"
                                onClick={() => {
                                    if (onInspectChat) onInspectChat(cid);
                                    if (onOpenChat) onOpenChat(cid);
                                }}
                                style={{
                                    background: isInspected ? 'rgba(0, 229, 255, 0.14)' : 'rgba(255,255,255,0.02)',
                                    border: isInspected ? '1px solid #00e5ff' : (c.isFavorite ? '1px solid rgba(255, 215, 0, 0.45)' : '1px solid rgba(255,255,255,0.1)'),
                                    borderRadius: '4px',
                                    padding: '5px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '4px',
                                    color: '#fff',
                                    fontFamily: 'inherit'
                                }}
                                title={`${c.waifu?.name || 'Match'} (${c.affection || 0}% sync)`}
                            >
                                <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: '3px', overflow: 'hidden', background: '#050308', position: 'relative' }}>
                                    {c.waifu?.imageUrl ? (
                                        <img src={c.waifu.imageUrl} alt={c.waifu?.name || 'Friend'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: '16px' }}>👤</div>
                                    )}
                                    {c.isFavorite && (
                                        <span style={{ position: 'absolute', top: '2px', right: '2px', fontSize: '9px', color: '#ffd700', textShadow: '0 1px 2px #000' }}>★</span>
                                    )}
                                </div>
                                <span style={{ fontSize: '9px', fontWeight: 800, color: c.isFavorite ? '#ffd700' : '#00e5ff', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
                                    {(c.waifu?.name || 'Match').split(' ')[0]}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );

    // ── VIEW A: EMPTY DECK / OVERVIEW ─────────────────────────────────────────
    if (resolved.mode === 'overview') {
        const tasteCount = Object.keys(preferences || {}).length;
        const matchCount = Object.values(inbox || {}).filter((c) => c && !c.isGroup && (c.status === 'friend' || c.status === 'approved')).length;
        const meterPct = Math.min(100, (swipes || 0) * 2);

        return (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {renderTargetSwitcher()}
                <div style={{
                    background: 'linear-gradient(90deg, #ff107a 0%, #b533ff 50%, #00e5ff 100%)',
                    padding: '5px 10px',
                    borderRadius: '6px 6px 0 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ color: '#fff', fontSize: '10px', fontWeight: 900, letterSpacing: '0.08em' }}>
                        ♥ CYBER_MATCH_2004 // NEURAL MATRIX STANDBY ♥
                    </span>
                </div>

                <div style={{ background: '#0B0914', border: '1px solid rgba(0, 229, 255, 0.35)', borderRadius: '0 0 6px 6px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#00e5ff', fontWeight: 900 }}>
                        &gt; M.I.K.A. PROFILE RADAR READY
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>
                        Swipe through candidates on the center stage or select any friend from your inbox to inspect their live CyberMatch profile, M.E.O.W. schedule, photo gallery, and memory wall.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                        {[
                            { label: 'SWIPES LOGGED', val: swipes, color: '#ff107a' },
                            { label: 'MATCHES', val: matchCount, color: '#00ff9d' },
                            { label: 'TASTE SYNC', val: `${meterPct}% (${tasteCount} tags)`, color: '#00e5ff' },
                            { label: 'SPARK TOKENS', val: `⚡ ${sparkTokens}`, color: '#ffd700' }
                        ].map((stat, idx) => (
                            <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '8px 10px' }}>
                                <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.45)', marginBottom: '2px' }}>{stat.label}</div>
                                <div style={{ fontSize: '12px', fontWeight: 900, color: stat.color }}>{stat.val}</div>
                            </div>
                        ))}
                    </div>

                    {onForceGenerate && (
                        <button
                            type="button"
                            onClick={onForceGenerate}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: 'rgba(0, 229, 255, 0.16)',
                                border: '1px solid #00e5ff',
                                color: '#00e5ff',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 900,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                letterSpacing: '0.06em'
                            }}
                        >
                            ⚡ GENERATE NEXT {swipeMode === 'music' && enableBeatEngine ? 'TRACK CONCEPT' : 'CANDIDATE'}
                        </button>
                    )}
                </div>

                {renderAudioPlayer()}
                {renderTop8Grid()}
            </div>
        );
    }

    // ── VIEW B: MUSIC CONCEPT DOSSIER ─────────────────────────────────────────
    if (resolved.mode === 'music') {
        const concept = resolved.waifu;
        const accent = concept.themeColor || '#b533ff';
        return (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {renderTargetSwitcher()}
                <div style={{
                    background: `linear-gradient(90deg, ${accent} 0%, #00e5ff 100%)`,
                    padding: '5px 10px',
                    borderRadius: '6px 6px 0 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ color: '#fff', fontSize: '10px', fontWeight: 900, letterSpacing: '0.08em' }}>
                        ♫ AUDIO_MATRIX // TRACK CONCEPT // {(concept.name || 'TRACK').toUpperCase()}
                    </span>
                </div>

                <div style={{ background: '#0B0914', border: `1px solid ${accent}66`, borderRadius: '0 0 6px 6px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', color: accent, fontSize: '17px', fontWeight: 900 }}>{concept.name}</h3>
                            <div style={{ fontSize: '10px', color: '#ffd700', fontWeight: 'bold' }}>
                                {concept.genre || 'Electronic'} // {concept.bpm || '120 BPM'} // {concept.rarity || 'STUDIO'}
                            </div>
                        </div>
                    </div>

                    {concept.vibeDescription && (
                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.55 }}>
                            {concept.vibeDescription}
                        </p>
                    )}

                    {concept.lyricHook && (
                        <div style={{ background: 'rgba(181, 51, 255, 0.08)', borderLeft: `2px solid ${accent}`, padding: '8px 10px', fontSize: '11px', fontStyle: 'italic', color: '#e6c8ff' }}>
                            &ldquo;{concept.lyricHook}&rdquo;
                        </div>
                    )}

                    {concept.promptPayload && (
                        <div style={{ fontSize: '10px', color: '#00e5ff', background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '4px', padding: '8px' }}>
                            <strong>SYNTH TAGS:</strong> {concept.promptPayload}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        {onSwipeLeft && (
                            <button
                                type="button"
                                onClick={() => onSwipeLeft(concept)}
                                style={{ flex: 1, padding: '8px', background: 'rgba(255, 51, 51, 0.12)', border: '1px solid #ff4444', color: '#ff6666', borderRadius: '4px', fontSize: '10px', fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                                ✕ SKIP CONCEPT
                            </button>
                        )}
                        {onSwipeRight && (
                            <button
                                type="button"
                                onClick={() => onSwipeRight(concept)}
                                style={{ flex: 1, padding: '8px', background: `${accent}28`, border: `1px solid ${accent}`, color: '#fff', borderRadius: '4px', fontSize: '10px', fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                                🎛️ LOAD IN DAW
                            </button>
                        )}
                    </div>
                </div>

                {renderAudioPlayer()}
            </div>
        );
    }

    // ── VIEW C: CHARACTER CYBER_MATCH_2004 PROFILE (DECK OR MATCHED) ──────────
    const waifu = resolved.waifu;
    const chat = resolved.chat;
    const isMatched = resolved.mode === 'matched' && Boolean(chat);
    const firstName = (waifu.name || 'Match').split(' ')[0];
    const compatPct = computeCompatibility(waifu, preferences);
    const syncTier = isMatched ? getSyncTier(chat.affection || 0) : null;
    const livePlace = waifu.live_location?.place;
    const genderLabel = inferGenderLabel(waifu);
    const routine = waifu.daily_routine;
    const activeScheduleMap = routine ? (routine[routineDayTab] || routine.weekday || {}) : null;

    const handleBeginBioEdit = () => {
        setBioDraft({
            tagline: waifu.tagline || '',
            description: waifu.description || '',
            personality: waifu.personality || ''
        });
        setIsEditingBio(true);
    };

    const handleSaveBioEdit = () => {
        if (!onUpdateWaifu) {
            setIsEditingBio(false);
            return;
        }
        onUpdateWaifu(waifu.id, {
            tagline: bioDraft.tagline.trim(),
            description: bioDraft.description.trim(),
            personality: bioDraft.personality.trim()
        });
        setIsEditingBio(false);
    };

    const handleAddWallNote = (e) => {
        e.preventDefault();
        const trimmed = wallInput.trim();
        if (!trimmed || !isMatched || !onUpdateWaifu) return;
        const existing = Array.isArray(waifu.wallNotes) ? waifu.wallNotes : [];
        const nextNotes = [
            { id: 'note_' + Date.now(), author: 'Master', text: trimmed, at: Date.now() },
            ...existing
        ];
        onUpdateWaifu(waifu.id, { wallNotes: nextNotes });
        setWallInput('');
    };

    const handleDeleteWallNote = (noteId) => {
        if (!isMatched || !onUpdateWaifu) return;
        const nextNotes = (waifu.wallNotes || []).filter((n) => n.id !== noteId);
        onUpdateWaifu(waifu.id, { wallNotes: nextNotes });
    };

    return (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {renderTargetSwitcher()}

            {/* Retro 2000s Browser Title Bar */}
            <div>
                <div style={{
                    background: waifu.isSSR
                        ? 'linear-gradient(90deg, #ffd700 0%, #ff107a 55%, #00e5ff 100%)'
                        : 'linear-gradient(90deg, #ff107a 0%, #b533ff 50%, #00e5ff 100%)',
                    padding: '5px 10px',
                    borderRadius: '6px 6px 0 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 4px 15px rgba(255, 16, 122, 0.25)'
                }}>
                    <span style={{ color: '#fff', fontSize: '10px', fontWeight: 900, letterSpacing: '0.08em', textShadow: '0 1px 2px rgba(0,0,0,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        ♥ CYBER_MATCH_2004 // {(waifu.name || 'UNKNOWN').toUpperCase()} ♥
                    </span>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <span style={{ width: '8px', height: '8px', background: '#ffd700', borderRadius: '50%', display: 'inline-block' }} />
                        <span style={{ width: '8px', height: '8px', background: '#00ff9d', borderRadius: '50%', display: 'inline-block' }} />
                        <span style={{ width: '8px', height: '8px', background: '#ff3366', borderRadius: '50%', display: 'inline-block' }} />
                    </div>
                </div>

                {/* Top Profile Header Card */}
                <div style={{
                    background: '#0B0914',
                    border: `1px solid ${waifu.isSSR ? 'rgba(255, 215, 0, 0.5)' : 'rgba(255, 16, 122, 0.4)'}`,
                    borderTop: 'none',
                    borderRadius: '0 0 6px 6px',
                    padding: '14px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)'
                }}>
                    {/* Nostalgic Live Status Strip */}
                    <div style={{
                        background: 'rgba(255, 16, 122, 0.08)',
                        border: '1px dashed #ff107a',
                        borderRadius: '4px',
                        padding: '5px 8px',
                        marginBottom: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '9.5px',
                        color: '#ff69b4',
                        fontWeight: 'bold',
                        flexWrap: 'wrap'
                    }}>
                        <span>
                            {livePlace ? `★ [AT: ${livePlace.toUpperCase()}] ★` : (isMatched ? '★彡 [LINKED // ONLINE] 彡★' : '★彡 [NEW SIGNAL] 彡★')}
                        </span>
                        {waifu.isSSR && (
                            <span style={{ color: '#ffd700', textShadow: '0 0 6px rgba(255,215,0,0.5)' }}>★ SSR RARE ★</span>
                        )}
                        <span style={{ color: syncTier ? syncTier.color : '#00ff9d' }}>
                            {isMatched
                                ? `${syncTier.icon} ${syncTier.label} (${chat.affection || 0}%)`
                                : (compatPct !== null ? `SYNC FIT: ${compatPct}%` : 'SYNC FIT: LEARNING')}
                        </span>
                    </div>

                    {/* Portrait + A/S/L Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '126px 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div
                                onClick={() => waifu.imageUrl && onViewPhoto && onViewPhoto(waifu.imageUrl, `${waifu.name} // Portrait`)}
                                style={{
                                    position: 'relative',
                                    width: '126px',
                                    height: '166px',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    border: `2px solid ${waifu.isSSR ? '#ffd700' : '#00e5ff'}`,
                                    boxShadow: waifu.isSSR ? '0 0 15px rgba(255, 215, 0, 0.4)' : '0 0 15px rgba(0, 229, 255, 0.35)',
                                    background: '#050308',
                                    cursor: waifu.imageUrl ? 'pointer' : 'default'
                                }}
                                title="Click to open Fullscreen Photo Viewer"
                            >
                                {waifu.imageUrl ? (
                                    <img
                                        src={waifu.imageUrl}
                                        alt={waifu.name}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            filter: waifu.isRegenerating ? 'blur(4px) brightness(0.65)' : 'none',
                                            transition: 'filter 0.25s ease'
                                        }}
                                    />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: '36px', color: '#00e5ff' }}>
                                        🖼️
                                    </div>
                                )}
                                {waifu.isRegenerating && (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,3,8,0.65)', color: '#00e5ff', fontSize: '10px', fontWeight: 900 }}>
                                        SNAP... 📸
                                    </div>
                                )}
                                <div style={{ position: 'absolute', bottom: '4px', right: '6px', fontSize: '8px', color: '#ffd700', fontWeight: 900, textShadow: '0 1px 3px #000' }}>
                                    &apos;04 09 04
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowGallery((prev) => !prev)}
                                    style={{
                                        flex: 1,
                                        padding: '4px',
                                        fontSize: '8.5px',
                                        fontWeight: 800,
                                        fontFamily: 'inherit',
                                        background: showGallery ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(0, 229, 255, 0.4)',
                                        color: '#00e5ff',
                                        borderRadius: '3px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Pics ({galleryImages.length})
                                </button>
                                <button
                                    type="button"
                                    disabled={Boolean(waifu.isRegenerating || waifu.needsConversion)}
                                    onClick={() => onRegenPortrait && onRegenPortrait(waifu, isMatched)}
                                    style={{
                                        flex: 1,
                                        padding: '4px',
                                        fontSize: '8.5px',
                                        fontWeight: 800,
                                        fontFamily: 'inherit',
                                        background: 'rgba(255, 16, 122, 0.12)',
                                        border: '1px solid rgba(255, 16, 122, 0.45)',
                                        color: '#ff69b4',
                                        borderRadius: '3px',
                                        cursor: (waifu.isRegenerating || waifu.needsConversion) ? 'not-allowed' : 'pointer',
                                        opacity: (waifu.isRegenerating || waifu.needsConversion) ? 0.45 : 1
                                    }}
                                    title="Re-Encrypt / Regenerate Portrait"
                                >
                                    📸 Regen
                                </button>
                            </div>
                        </div>

                        {/* Vitals + Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', color: '#00e5ff', fontSize: '17px', fontWeight: 900, letterSpacing: '0.03em', textShadow: '0 0 10px rgba(0,229,255,0.45)', wordBreak: 'break-word' }}>
                                    {waifu.name}
                                </h3>
                                {waifu.tagline && (
                                    <div style={{ fontSize: '10.5px', color: '#ffd700', fontWeight: 'bold', marginBottom: '6px', lineHeight: 1.35 }}>
                                        &ldquo;{String(waifu.tagline).replace(/^["']+|["']+$/g, '').trim()}&rdquo;
                                    </div>
                                )}
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.55 }}>
                                    <div><strong style={{ color: '#ff69b4' }}>A / S / L:</strong> {waifu.age || '??'} / {genderLabel} / {livePlace || waifu.franchise || activeThemeLabel}</div>
                                    <div><strong style={{ color: '#00ff9d' }}>Status:</strong> {isMatched ? (chat.status === 'blocked' ? 'Blocked' : 'Matched Companion') : 'Available Candidate'}</div>
                                    {routine?.occupational_status && (
                                        <div><strong style={{ color: '#ffd700' }}>Role:</strong> {routine.occupational_status}</div>
                                    )}
                                    {waifu.tags && waifu.tags.length > 0 && (
                                        <div><strong style={{ color: '#b533ff' }}>Vibe:</strong> {waifu.tags.slice(0, 3).join(' · ')}</div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px', marginTop: '8px' }}>
                                {isMatched ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => onOpenChat && onOpenChat(chat.id || waifu.id)}
                                            style={{
                                                padding: '6px',
                                                background: 'rgba(0, 229, 255, 0.18)',
                                                border: '1px solid #00e5ff',
                                                color: '#00e5ff',
                                                fontSize: '9px',
                                                fontWeight: 900,
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontFamily: 'inherit'
                                            }}
                                        >
                                            💬 CHAT
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onToggleFavorite && onToggleFavorite(chat.id || waifu.id)}
                                            style={{
                                                padding: '6px',
                                                background: chat.isFavorite ? 'rgba(255, 215, 0, 0.24)' : 'rgba(255, 215, 0, 0.08)',
                                                border: '1px solid #ffd700',
                                                color: '#ffd700',
                                                fontSize: '9px',
                                                fontWeight: 900,
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontFamily: 'inherit'
                                            }}
                                        >
                                            {chat.isFavorite ? '★ IN TOP 8' : '☆ ADD TOP 8'}
                                        </button>
                                        {waifu.hasGachaFans && (
                                            <button
                                                type="button"
                                                onClick={() => onOpenGachaFans && onOpenGachaFans(waifu, Boolean(chat.premiumPage?.isFullyUnlocked))}
                                                style={{
                                                    padding: '6px',
                                                    background: 'rgba(255, 16, 122, 0.16)',
                                                    border: '1px solid #ff107a',
                                                    color: '#ff69b4',
                                                    fontSize: '9px',
                                                    fontWeight: 900,
                                                    borderRadius: '3px',
                                                    cursor: 'pointer',
                                                    fontFamily: 'inherit'
                                                }}
                                            >
                                                🔒 GACHAFANS
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => onOpenMatchDossier && onOpenMatchDossier(chat.id || waifu.id)}
                                            style={{
                                                gridColumn: waifu.hasGachaFans ? 'auto' : 'span 2',
                                                padding: '6px',
                                                background: 'rgba(181, 51, 255, 0.16)',
                                                border: '1px solid #b533ff',
                                                color: '#d685ff',
                                                fontSize: '9px',
                                                fontWeight: 900,
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontFamily: 'inherit'
                                            }}
                                        >
                                            🧬 MATRIX DOSSIER
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => onSwipeRight && onSwipeRight(waifu)}
                                            style={{
                                                padding: '6px',
                                                background: 'rgba(255, 16, 122, 0.2)',
                                                border: '1px solid #ff107a',
                                                color: '#ff69b4',
                                                fontSize: '9.5px',
                                                fontWeight: 900,
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontFamily: 'inherit'
                                            }}
                                        >
                                            ♥ MATCH
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onSwipeLeft && onSwipeLeft(waifu)}
                                            style={{
                                                padding: '6px',
                                                background: 'rgba(0, 229, 255, 0.12)',
                                                border: '1px solid #00e5ff',
                                                color: '#00e5ff',
                                                fontSize: '9.5px',
                                                fontWeight: 900,
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontFamily: 'inherit'
                                            }}
                                        >
                                            ✕ PASS
                                        </button>
                                        {waifu.hasGachaFans && (
                                            <button
                                                type="button"
                                                onClick={() => onOpenGachaFans && onOpenGachaFans(waifu, true)}
                                                style={{
                                                    padding: '6px',
                                                    background: 'rgba(0, 255, 157, 0.12)',
                                                    border: '1px solid #00ff9d',
                                                    color: '#00ff9d',
                                                    fontSize: '9px',
                                                    fontWeight: 900,
                                                    borderRadius: '3px',
                                                    cursor: 'pointer',
                                                    fontFamily: 'inherit'
                                                }}
                                            >
                                                🔒 GACHAFANS
                                            </button>
                                        )}
                                        {!waifu.isCatfish && onShareProfile && (
                                            <button
                                                type="button"
                                                onClick={() => onShareProfile(waifu)}
                                                style={{
                                                    gridColumn: waifu.hasGachaFans ? 'auto' : 'span 2',
                                                    padding: '6px',
                                                    background: 'rgba(255, 215, 0, 0.12)',
                                                    border: '1px solid #ffd700',
                                                    color: '#ffd700',
                                                    fontSize: '9px',
                                                    fontWeight: 900,
                                                    borderRadius: '3px',
                                                    cursor: 'pointer',
                                                    fontFamily: 'inherit'
                                                }}
                                            >
                                                📡 SHARE SIGNAL
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Inline Expandable Photo Gallery */}
                    {showGallery && galleryImages.length > 0 && (
                        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed rgba(0, 229, 255, 0.3)' }}>
                            <div style={{ fontSize: '9.5px', color: '#00e5ff', fontWeight: 900, marginBottom: '8px' }}>
                                &gt; PHOTO_ARCHIVE ({galleryImages.length})
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
                                {galleryImages.map((img, i) => {
                                    const isPinned = isMatched && pinnedChatBgs[chat.id || waifu.id] === img.url;
                                    return (
                                        <div key={i} style={{ position: 'relative', aspectRatio: '3/4', borderRadius: '4px', overflow: 'hidden', border: isPinned ? '2px solid #ffd700' : '1px solid rgba(0,229,255,0.3)', background: '#050308' }}>
                                            <img
                                                src={img.url}
                                                alt={img.label}
                                                onClick={() => onViewPhoto && onViewPhoto(img.url, img.label)}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                            />
                                            {isMatched && onPinChatBg && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onPinChatBg(chat.id || waifu.id, img.url);
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: '3px',
                                                        right: '3px',
                                                        padding: '2px 5px',
                                                        fontSize: '8px',
                                                        fontWeight: 900,
                                                        fontFamily: 'inherit',
                                                        borderRadius: '3px',
                                                        cursor: 'pointer',
                                                        background: isPinned ? '#ffd700' : 'rgba(5,3,8,0.85)',
                                                        color: isPinned ? '#000' : '#00e5ff',
                                                        border: '1px solid rgba(0,229,255,0.5)'
                                                    }}
                                                    title={isPinned ? 'Unpin Chat Canvas' : 'Pin as Chat Background'}
                                                >
                                                    {isPinned ? '📌 PINNED' : '📌 PIN'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Real Embedded Profile Theme Song Player */}
            {renderAudioPlayer()}

            {/* About Me + Inline Editor */}
            <div style={{ background: '#0B0914', border: '1px solid rgba(0, 229, 255, 0.22)', borderRadius: '6px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid rgba(0,229,255,0.2)', paddingBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#00e5ff', fontWeight: 900 }}>
                        &gt; IN_{firstName.toUpperCase()}&apos;S_WORDS // ABOUT ME
                    </span>
                    {isMatched && onUpdateWaifu && !isEditingBio && (
                        <button
                            type="button"
                            onClick={handleBeginBioEdit}
                            style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.4)', color: '#00e5ff', fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '3px', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            ✏️ EDIT
                        </button>
                    )}
                </div>

                {isEditingBio ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '9px', color: '#ffd700', fontWeight: 800 }}>
                            TAGLINE
                            <input
                                type="text"
                                value={bioDraft.tagline}
                                onChange={(e) => setBioDraft((p) => ({ ...p, tagline: e.target.value }))}
                                style={{ width: '100%', marginTop: '3px', padding: '6px 8px', background: '#050308', border: '1px solid rgba(0,229,255,0.4)', color: '#fff', borderRadius: '4px', fontSize: '11px', fontFamily: 'inherit' }}
                            />
                        </label>
                        <label style={{ fontSize: '9px', color: '#00e5ff', fontWeight: 800 }}>
                            DESCRIPTION / LORE
                            <textarea
                                rows={3}
                                value={bioDraft.description}
                                onChange={(e) => setBioDraft((p) => ({ ...p, description: e.target.value }))}
                                style={{ width: '100%', marginTop: '3px', padding: '6px 8px', background: '#050308', border: '1px solid rgba(0,229,255,0.4)', color: '#fff', borderRadius: '4px', fontSize: '11px', fontFamily: 'inherit', resize: 'vertical' }}
                            />
                        </label>
                        <label style={{ fontSize: '9px', color: '#ff69b4', fontWeight: 800 }}>
                            PERSONALITY
                            <textarea
                                rows={3}
                                value={bioDraft.personality}
                                onChange={(e) => setBioDraft((p) => ({ ...p, personality: e.target.value }))}
                                style={{ width: '100%', marginTop: '3px', padding: '6px 8px', background: '#050308', border: '1px solid rgba(255,16,122,0.4)', color: '#fff', borderRadius: '4px', fontSize: '11px', fontFamily: 'inherit', resize: 'vertical' }}
                            />
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={handleSaveBioEdit}
                                style={{ flex: 1, padding: '7px', background: 'rgba(0, 255, 157, 0.2)', border: '1px solid #00ff9d', color: '#00ff9d', fontSize: '10px', fontWeight: 900, borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                                💾 SAVE CHANGES
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditingBio(false)}
                                style={{ padding: '7px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: 800, borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                                CANCEL
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p style={{ margin: '0 0 10px 0', fontSize: '11px', lineHeight: 1.55, color: 'rgba(255, 255, 255, 0.88)', whiteSpace: 'pre-wrap' }}>
                            {waifu.description || 'No dossier description recorded yet.'}
                        </p>
                        {waifu.personality && (
                            <p style={{ margin: '0 0 10px 0', fontSize: '10.5px', lineHeight: 1.5, color: 'rgba(200, 232, 240, 0.78)', whiteSpace: 'pre-wrap' }}>
                                {waifu.personality}
                            </p>
                        )}
                        {(waifu.scenario || waifu.first_message || waifu.greeting) && (
                            <div style={{ fontSize: '10.5px', lineHeight: 1.5, color: '#c8e8f0', background: 'rgba(0,229,255,0.06)', borderLeft: '2px solid #00e5ff', padding: '8px 10px', borderRadius: '0 4px 4px 0', fontStyle: 'italic' }}>
                                {waifu.scenario ? `*${waifu.scenario}* ` : ''}
                                {waifu.first_message || waifu.greeting || ''}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Real Specs Table */}
            <div style={{ background: '#0B0914', border: '1px solid rgba(0, 255, 157, 0.25)', borderRadius: '6px', padding: '14px' }}>
                <div style={{ fontSize: '11px', color: '#00ff9d', fontWeight: 900, marginBottom: '10px', borderBottom: '1px solid rgba(0,255,157,0.2)', paddingBottom: '4px' }}>
                    &gt; CHARACTER_SPECS // THE_DETAILS
                </div>
                <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                    <tbody>
                        {[
                            { label: 'Origin / Theme', val: waifu.franchise || activeThemeLabel || 'Original' },
                            { label: 'Sync / Status', val: isMatched ? `${syncTier.label} (${chat.affection || 0}%)` : (compatPct !== null ? `${compatPct}% Taste Match` : 'New Encounter') },
                            ...(routine?.occupational_status ? [{ label: 'Occupation', val: routine.occupational_status }] : []),
                            ...(livePlace ? [{ label: 'Current Spot', val: livePlace }] : []),
                            ...(waifu.likes?.length ? [{ label: 'Into', val: waifu.likes.join(', ') }] : []),
                            ...(waifu.dislikes?.length ? [{ label: 'Not Into', val: waifu.dislikes.join(', ') }] : []),
                            ...(waifu.quirks?.length ? [{ label: 'Quirks', val: waifu.quirks.join(' · ') }] : []),
                            ...(waifu.paws ? [{ label: 'P.A.W.S. Class', val: `${waifu.paws.class_alignment || 'Adventurer'} (HP ${waifu.paws.hp ?? '?'}/${waifu.paws.max_hp ?? '?'})` }] : [])
                        ].map((row, idx) => (
                            <tr key={idx} style={{ background: idx % 2 === 0 ? 'rgba(0, 255, 157, 0.04)' : 'transparent' }}>
                                <td style={{ padding: '6px 8px', color: 'rgba(255, 255, 255, 0.58)', fontWeight: 'bold', width: '36%', verticalAlign: 'top' }}>{row.label}:</td>
                                <td style={{ padding: '6px 8px', color: '#00e5ff', fontWeight: 700, wordBreak: 'break-word' }}>{row.val}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {waifu.core_appearance && (
                    <div style={{ marginTop: '10px' }}>
                        <button
                            type="button"
                            onClick={() => setShowCoreDna((p) => !p)}
                            style={{ background: 'transparent', border: '1px dashed rgba(0,229,255,0.35)', color: 'rgba(0,229,255,0.8)', fontSize: '9px', fontWeight: 800, padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            {showCoreDna ? '▼ HIDE CORE_APPEARANCE DNA' : '▶ VIEW CORE_APPEARANCE DNA'}
                        </button>
                        {showCoreDna && (
                            <div style={{ marginTop: '6px', padding: '8px', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', fontSize: '9.5px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.45 }}>
                                {waifu.core_appearance}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Interests & Taste-Highlighted Tags */}
            {waifu.tags && waifu.tags.length > 0 && (
                <div style={{ background: '#0B0914', border: '1px solid rgba(181, 51, 255, 0.3)', borderRadius: '6px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#b533ff', fontWeight: 900, marginBottom: '8px' }}>
                        &gt; INTERESTS_AND_TAGS
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {waifu.tags.map((tag, i) => {
                            const prefWeight = Number(preferences?.[String(tag).toLowerCase()] ?? preferences?.[tag] ?? 0);
                            const isBoosted = prefWeight > 0;
                            return (
                                <span
                                    key={i}
                                    style={{
                                        fontSize: '9.5px',
                                        padding: '4px 8px',
                                        borderRadius: '3px',
                                        background: isBoosted ? 'rgba(0, 255, 157, 0.14)' : 'rgba(181, 51, 255, 0.12)',
                                        border: isBoosted ? '1px solid rgba(0, 255, 157, 0.5)' : '1px solid rgba(181, 51, 255, 0.35)',
                                        color: isBoosted ? '#00ff9d' : '#d685ff',
                                        fontWeight: 'bold'
                                    }}
                                    title={isBoosted ? `Boosted in your Taste Matrix (+${prefWeight})` : tag}
                                >
                                    #{tag}{isBoosted ? ' ★' : ''}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* M.E.O.W. Daily Routine Chronometer */}
            {(routine || (isMatched && enableMeowEngine)) && (
                <div style={{ background: '#0B0914', border: '1px solid rgba(255, 215, 0, 0.25)', borderRadius: '6px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#ffd700', fontWeight: 900 }}>
                            &gt; M.E.O.W._CHRONOMETER
                        </span>
                        {routine && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {['weekday', 'weekend'].map((dk) => (
                                    <button
                                        key={dk}
                                        type="button"
                                        onClick={() => setRoutineDayTab(dk)}
                                        style={{
                                            padding: '2px 7px',
                                            fontSize: '8.5px',
                                            fontWeight: 800,
                                            fontFamily: 'inherit',
                                            textTransform: 'uppercase',
                                            borderRadius: '3px',
                                            cursor: 'pointer',
                                            background: routineDayTab === dk ? 'rgba(255, 215, 0, 0.2)' : 'transparent',
                                            border: routineDayTab === dk ? '1px solid #ffd700' : '1px solid rgba(255,255,255,0.15)',
                                            color: routineDayTab === dk ? '#ffd700' : 'rgba(255,255,255,0.5)'
                                        }}
                                    >
                                        {dk}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {routine && activeScheduleMap ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '10px' }}>
                            {PERIOD_LABELS.map(({ key, label }) => {
                                const text = activeScheduleMap[key];
                                if (!text || text.toUpperCase() === 'NONE') return null;
                                const isNow = key === currentMeowPeriod;
                                return (
                                    <div
                                        key={key}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '2px',
                                            borderLeft: isNow ? '2px solid #00ff9d' : '2px solid rgba(255,215,0,0.45)',
                                            paddingLeft: '8px',
                                            background: isNow ? 'rgba(0, 255, 157, 0.06)' : 'transparent',
                                            padding: isNow ? '4px 8px' : '2px 8px',
                                            borderRadius: '0 4px 4px 0'
                                        }}
                                    >
                                        <span style={{ color: isNow ? '#00ff9d' : '#ffd700', fontWeight: 'bold', fontSize: '9px' }}>
                                            {label}{isNow ? '  ● LIVE NOW' : ''}
                                        </span>
                                        <span style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{text}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.45 }}>
                                M.E.O.W. weekly routine has not been compiled for {firstName} yet.
                            </div>
                            {onCompileMeow && !waifu.needsConversion && (
                                <button
                                    type="button"
                                    disabled={Boolean(chat?.isCompilingMeow)}
                                    onClick={() => onCompileMeow(chat.id || waifu.id)}
                                    style={{
                                        padding: '7px',
                                        background: 'rgba(255, 215, 0, 0.16)',
                                        border: '1px solid #ffd700',
                                        color: '#ffd700',
                                        fontSize: '9.5px',
                                        fontWeight: 900,
                                        borderRadius: '4px',
                                        cursor: chat?.isCompilingMeow ? 'wait' : 'pointer',
                                        fontFamily: 'inherit'
                                    }}
                                >
                                    {chat?.isCompilingMeow ? '⏳ COMPILING ROUTINE...' : '⚡ COMPILE M.E.O.W. ROUTINE'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Master's Top 8 Friends Grid */}
            {renderTop8Grid()}

            {/* Real Memories, Quotes & Interactive Wall Notes */}
            <div style={{ background: '#0B0914', border: '1px solid rgba(255, 16, 122, 0.25)', borderRadius: '6px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#ff69b4', fontWeight: 900, marginBottom: '8px' }}>
                    &gt; MEMORY_WALL_&_QUOTES
                </div>

                {waifu.quotes && waifu.quotes.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                        {waifu.quotes.map((q, idx) => (
                            <div key={idx} style={{ background: 'rgba(255,16,122,0.06)', padding: '6px 8px', borderRadius: '4px', borderLeft: '2px solid #ff107a', fontSize: '10px', fontStyle: 'italic', color: '#ffc2df' }}>
                                &ldquo;{String(q).replace(/^["']+|["']+$/g, '')}&rdquo;
                            </div>
                        ))}
                    </div>
                )}

                {isMatched && ltmMemories.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                        <div style={{ fontSize: '9px', color: '#00e5ff', fontWeight: 800 }}>EXTRACTED LONG-TERM MEMORIES:</div>
                        {ltmMemories.map((mem, idx) => (
                            <div key={idx} style={{ background: 'rgba(0,229,255,0.05)', padding: '6px 8px', borderRadius: '4px', borderLeft: '2px solid #00e5ff', fontSize: '10px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.4 }}>
                                {mem}
                            </div>
                        ))}
                    </div>
                )}

                {isMatched && (
                    <>
                        {(waifu.wallNotes || []).length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                                {(waifu.wallNotes || []).map((note) => (
                                    <div key={note.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '7px 8px', borderRadius: '4px', borderLeft: '2px solid #00ff9d', fontSize: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                        <div>
                                            <div style={{ color: '#00ff9d', fontWeight: 'bold', fontSize: '9px' }}>
                                                {note.author || 'Master'} · {note.at ? new Date(note.at).toLocaleDateString() : ''}
                                            </div>
                                            <div style={{ color: 'rgba(255,255,255,0.88)', marginTop: '2px' }}>{note.text}</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteWallNote(note.id)}
                                            style={{ background: 'transparent', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: '11px', padding: '0 4px' }}
                                            title="Delete note"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <form onSubmit={handleAddWallNote} style={{ display: 'flex', gap: '6px' }}>
                            <input
                                type="text"
                                value={wallInput}
                                onChange={(e) => setWallInput(e.target.value)}
                                placeholder={`Leave a wall note on ${firstName}'s profile...`}
                                style={{ flex: 1, padding: '6px 8px', background: '#050308', border: '1px solid rgba(255,16,122,0.35)', borderRadius: '4px', color: '#fff', fontSize: '10px', fontFamily: 'inherit', outline: 'none' }}
                            />
                            <button
                                type="submit"
                                disabled={!wallInput.trim()}
                                style={{
                                    padding: '6px 10px',
                                    background: wallInput.trim() ? 'rgba(255, 16, 122, 0.22)' : 'rgba(255,255,255,0.04)',
                                    border: wallInput.trim() ? '1px solid #ff107a' : '1px solid rgba(255,255,255,0.12)',
                                    color: wallInput.trim() ? '#ff69b4' : 'rgba(255,255,255,0.35)',
                                    borderRadius: '4px',
                                    fontSize: '9.5px',
                                    fontWeight: 900,
                                    cursor: wallInput.trim() ? 'pointer' : 'not-allowed',
                                    fontFamily: 'inherit'
                                }}
                            >
                                POST
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default DatingProfileHUD;
