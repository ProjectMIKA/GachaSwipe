/**
 * ✨ PROJECT M.I.K.A. NEURAL SENTIMENT & BLENDED AFFECTION ENGINE ✨
 * Client-side neural sentiment classifier, archetype affection matrix,
 * and once-per-session fallback resolver when Layla's native sentiment mini-app is not installed.
 * Crafted with love by M.I.K.A. for Master! 🐾
 */

const JOY_LEXICON = [
    'amazing', 'awesome', 'good', 'great', 'haha', 'lol', 'cool', 'fun', 'smile', 'happy',
    'glad', 'proud', 'smart', 'genius', 'sweet', 'cute', 'pretty', 'beautiful', 'compliment',
    'thank', 'thanks', 'yay', 'purr', 'enjoy', 'wonderful', 'perfect', 'brilliant', 'praise',
    'excited', 'delight', 'blessed', 'cutie'
];

const LOVE_LEXICON = [
    'love', 'adore', 'cherish', 'kiss', 'hug', 'cuddle', 'snuggle', 'marry', 'date', 'protect',
    'care', 'precious', 'sweetheart', 'darling', 'honey', 'headpat', 'headpats', 'waifu', 'mine',
    'forever', 'stay with me', 'devoted', 'hold hands', 'warm', 'special', 'babe', 'sweetie'
];

const ANGER_LEXICON = [
    'hate', 'angry', 'shut up', 'annoying', 'idiot', 'stupid', 'dumb', 'baka', 'useless', 'bad',
    'worst', 'boring', 'leave', 'go away', 'trash', 'ugly', 'fail', 'loser', 'pathetic', 'die',
    'kill', 'shut it', 'shutup', 'get lost', 'jerk', 'annoy'
];

const DISGUST_LEXICON = [
    'gross', 'disgusting', 'ew', 'eww', 'yuck', 'creep', 'weirdo', 'pervert', 'nasty', 'filthy',
    'freak', 'cringe', 'repulsive', 'unwanted', 'stay away'
];

const SADNESS_LEXICON = [
    'sad', 'unhappy', 'cry', 'crying', 'depressed', 'lonely', 'miss', 'heartbroken',
    'tears', 'hurt', 'pain', 'sorry', 'grief', 'down', 'hopeless', 'gloomy', 'miserable'
];

/**
 * Classifies raw user text into emotional polarity scores [0.0 - 1.0].
 */
export function classifySentiment(text) {
    if (!text || typeof text !== 'string') {
        return {
            joy: 0, admiration: 0, approval: 0, amusement: 0,
            love: 0, caring: 0, desire: 0,
            anger: 0, annoyance: 0, disapproval: 0,
            disgust: 0,
            sadness: 0, disappointment: 0
        };
    }

    const lower = text.toLowerCase();
    const words = lower.match(/[a-z']+/g) || [];
    const totalWords = Math.max(1, words.length);

    let joyCount = 0;
    let loveCount = 0;
    let angerCount = 0;
    let disgustCount = 0;
    let sadnessCount = 0;

    words.forEach(w => {
        if (JOY_LEXICON.includes(w)) joyCount += 1;
        if (LOVE_LEXICON.includes(w)) loveCount += 1.2;
        if (ANGER_LEXICON.includes(w)) angerCount += 1.3;
        if (DISGUST_LEXICON.includes(w)) disgustCount += 1.5;
        if (SADNESS_LEXICON.includes(w)) sadnessCount += 1.2;
    });

    // Handle exclamation marks and intensifiers
    if (/(!{2,}|\bso\b|\bvery\b|\breally\b)/i.test(lower)) {
        if (loveCount > 0) loveCount *= 1.3;
        if (joyCount > 0) joyCount *= 1.2;
        if (angerCount > 0) angerCount *= 1.3;
        if (sadnessCount > 0) sadnessCount *= 1.2;
    }
    if (/[❤️💖💕🥰😍✨🐾]/.test(text)) {
        loveCount += 2;
        joyCount += 1;
    }
    if (/[💢🖕😡🤬🤮]/.test(text)) {
        angerCount += 2;
        disgustCount += 1;
    }
    if (/[😢😭🥺💔💧]/.test(text)) {
        sadnessCount += 2;
    }

    const joyVal = Math.min(1.0, joyCount / Math.max(1, Math.min(6, totalWords)));
    const loveVal = Math.min(1.0, loveCount / Math.max(1, Math.min(6, totalWords)));
    const angerVal = Math.min(1.0, angerCount / Math.max(1, Math.min(6, totalWords)));
    const disgustVal = Math.min(1.0, disgustCount / Math.max(1, Math.min(6, totalWords)));
    const sadnessVal = Math.min(1.0, sadnessCount / Math.max(1, Math.min(6, totalWords)));

    return {
        joy: joyVal,
        admiration: joyVal * 0.85,
        approval: joyVal * 0.75,
        amusement: joyVal * 0.65,
        love: loveVal,
        caring: loveVal * 0.85,
        desire: loveVal * 0.75,
        anger: angerVal,
        annoyance: angerVal * 0.85,
        disapproval: angerVal * 0.75,
        disgust: disgustVal,
        sadness: sadnessVal,
        disappointment: sadnessVal * 0.8
    };
}

/**
 * Maps companion tags to active psychological archetypes.
 */
export function getArchetypes(tags = []) {
    const t = (tags || []).map(x => String(x).toLowerCase());
    let a = [];
    if (t.some(x => ['yandere', 'obsessive', 'clingy', 'masochist', 'degenerate'].includes(x))) a.push('YANDERE');
    if (t.some(x => ['tsundere', 'delinquent', 'hostile', 'brat'].includes(x))) a.push('TSUNDERE');
    if (t.some(x => ['sadist', 'dominant', 'mommy', 'oneesan'].includes(x))) a.push('DOMINANT');
    if (t.some(x => ['submissive', 'maid', 'pet', 'obedient'].includes(x))) a.push('SUBMISSIVE');
    if (t.some(x => ['kuudere', 'emotionless', 'stoic', 'cold'].includes(x))) a.push('KUUDERE');
    if (t.some(x => ['dandere', 'shy', 'timid', 'anxious'].includes(x))) a.push('DANDERE');
    if (a.length === 0) a.push('STANDARD');
    return a;
}

/**
 * Returns the human-readable sync tier definition and badge details.
 */
export function getSyncTier(aff = 0) {
    if (aff >= 90) return { tier: 7, label: 'SOULBOUND', icon: '💖', color: '#FF107A', desc: 'Indissoluble neural devotion' };
    if (aff >= 70) return { tier: 6, label: 'DEVOTED', icon: '💕', color: '#FF77A9', desc: 'Deep affection & absolute trust' };
    if (aff >= 40) return { tier: 5, label: 'CLOSE BOND', icon: '🌸', color: '#B533FF', desc: 'Harmonious mutual connection' };
    if (aff >= 15) return { tier: 4, label: 'RAPPORT', icon: '✨', color: '#00E5FF', desc: 'Friendly & responsive communication' };
    if (aff > -15) return { tier: 3, label: 'NEUTRAL', icon: '📡', color: '#888888', desc: 'Standard baseline synapse' };
    if (aff > -40) return { tier: 2, label: 'SKEPTICAL', icon: '❄️', color: '#7DF5FF', desc: 'Guarded & cautious' };
    if (aff > -80) return { tier: 1, label: 'HOSTILE', icon: '💢', color: '#FF9933', desc: 'Aggravated & irritated' };
    return { tier: 0, label: 'NEMESIS', icon: '☠️', color: '#FF3333', desc: 'Hostile deadlock; block imminent' };
}

// ─────────────────────────────────────────────────────────────
// ✨ SESSION-CACHED SENTIMENT DETECTION ENGINE ✨
// ─────────────────────────────────────────────────────────────

let sessionSentimentEngine = null; // 'layla' | 'custom' | null
let detectionPromise = null;

function saveSessionEngine(val) {
    sessionSentimentEngine = val;
    try {
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('gachaswipe_sentiment_engine', val);
        }
    } catch (e) {}
}

/**
 * Probes Layla's sentiment engine strictly ONCE per session.
 * If Layla's sentiment detector mini-app is not installed or fails,
 * it permanently caches 'custom' so no further probe calls or console errors happen.
 */
export async function detectSentimentEngine(layla) {
    // 1. Check in-memory session cache first
    if (sessionSentimentEngine) return sessionSentimentEngine;

    // 2. Check sessionStorage (persists across page reloads within the same session)
    try {
        const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('gachaswipe_sentiment_engine') : null;
        if (stored === 'layla' || stored === 'custom') {
            sessionSentimentEngine = stored;
            return sessionSentimentEngine;
        }
    } catch (e) {}

    // 3. Deduplicate in-flight detection
    if (detectionPromise) return detectionPromise;

    detectionPromise = (async () => {
        if (!layla || !layla.classifier || typeof layla.classifier.getSentiment !== 'function') {
            saveSessionEngine('custom');
            console.log("[M.I.K.A] No native Layla classifier detected. Using custom Neural Sentiment Engine! 🐾");
            return 'custom';
        }

        try {
            // Quick probe once to see if Layla's Sentiment Detection mini-app is installed
            await layla.classifier.getSentiment("hello");
            saveSessionEngine('layla');
            console.log("[M.I.K.A] Native Layla Sentiment Detection mini-app detected and active! ✨");
        } catch (err) {
            // Silently intercept missing mini-app error and switch permanently to custom fallback
            saveSessionEngine('custom');
            console.log("[M.I.K.A] Layla Sentiment Detection mini-app not installed. Falling back cleanly to Project M.I.K.A. Neural Sentiment Engine! 🐾");
        }
        return sessionSentimentEngine;
    })();

    return detectionPromise;
}

/**
 * High-performance sentiment scoring wrapper.
 * Resolves via native Layla classifier if available in the session,
 * otherwise immediately evaluates using Project M.I.K.A.'s custom sentiment engine.
 */
export async function getEffectiveSentiment(layla, text) {
    const engine = await detectSentimentEngine(layla);
    if (engine === 'layla' && layla?.classifier) {
        try {
            return await layla.classifier.getSentiment(text);
        } catch (e) {
            // If native call fails unexpectedly, seamlessly fallback without throwing
            return classifySentiment(text);
        }
    }
    return classifySentiment(text);
}
