import { useState, useCallback, useMemo } from 'react';
import { chromaKeyImage } from '../../utils/chromaKey.js';

export const GENDER_OPTIONS = [
    '1man, masculine',
    '1girl, feminine',
    'androgynous person',
    'genderfluid adventurer',
    'femboy, delicate',
    'tomboy, athletic'
];

export const BODY_TYPE_OPTIONS = [
    'slender physique',
    'athletic toned build',
    'curvy figure',
    'muscular powerhouse',
    'petite frame',
    'tall and commanding build'
];

export const HAIR_COLOR_OPTIONS = [
    'silver white',
    'jet black',
    'crimson red',
    'neon cyan blue',
    'golden blonde',
    'pastel pink',
    'emerald green',
    'deep violet purple'
];

export const EYE_COLOR_OPTIONS = [
    'glowing amber gold',
    'piercing crimson red',
    'amethyst purple',
    'ice cyan blue',
    'emerald green',
    'obsidian dark'
];

export const AESTHETIC_OPTIONS = [
    'Cyberpunk Netrunner with glowing LED implants',
    'High-Fantasy Holy Paladin with gilded plate armor',
    'Arcane Runemaster draped in starlit celestial robes',
    'Shadow Assassin with tactical stealth gear and daggers',
    'Mecha Pilot in a sleek futuristic form-fitting plugsuit',
    'Neo-Tokyo Streetwear Shinobi with tactical jacket',
    'Gothic Blood Knight with dark ornate filigree armor',
    'Steampunk Clockwork Alchemist with brass goggles and vials'
];

/**
 * Custom hook for the Isekai Mirror Avatar Forge.
 * Manages lore synthesis via Mirror of Truth and dual-sprite greenscreen extraction.
 */
export function useAvatarForge({
    layla,
    preferences = {},
    customUserProfile = {},
    setCustomUserProfile,
    showToast = () => { },
    showAlert = () => { },
    getImageModelId = () => undefined
}) {
    // Visual builder selections
    const [gender, setGender] = useState(customUserProfile.visualConfig?.gender || GENDER_OPTIONS[0]);
    const [bodyType, setBodyType] = useState(customUserProfile.visualConfig?.bodyType || BODY_TYPE_OPTIONS[1]);
    const [hairColor, setHairColor] = useState(customUserProfile.visualConfig?.hairColor || HAIR_COLOR_OPTIONS[0]);
    const [eyeColor, setEyeColor] = useState(customUserProfile.visualConfig?.eyeColor || EYE_COLOR_OPTIONS[0]);
    const [aesthetic, setAesthetic] = useState(customUserProfile.visualConfig?.aesthetic || AESTHETIC_OPTIONS[0]);

    // Lore state
    const [classAlignment, setClassAlignment] = useState(customUserProfile.class_alignment || '');
    const [backstory, setBackstory] = useState(customUserProfile.backstory || '');

    // Sprites state
    const [casualSpriteUrl, setCasualSpriteUrl] = useState(customUserProfile.casualSpriteUrl || null);
    const [battleSpriteUrl, setBattleSpriteUrl] = useState(customUserProfile.battleSpriteUrl || null);

    // Operational loading states
    const [isGeneratingLore, setIsGeneratingLore] = useState(false);
    const [isForgingSprites, setIsForgingSprites] = useState(false);
    const [forgeStepText, setForgeStepText] = useState('');

    // Compute top 3 swipe preferences
    const top3Preferences = useMemo(() => {
        const sorted = Object.entries(preferences || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([tag]) => tag);
        return sorted.length > 0 ? sorted : ['cyberpunk', 'catgirl', 'tsundere'];
    }, [preferences]);

    // Base prompt compilation
    const basePrompt = useMemo(() => {
        return `${gender}, ${bodyType}, ${hairColor} hair, ${eyeColor} eyes, ${aesthetic} attire, highly detailed, masterpiece`;
    }, [gender, bodyType, hairColor, eyeColor, aesthetic]);

    /**
     * 1. LORE GENERATION ("Mirror of Truth")
     * Fires LLM prompt to generate teasing RPG Class, Alignment, and Backstory.
     */
    const generateMirrorOfTruthLore = useCallback(async () => {
        if (!layla || !layla.chat || !layla.chat.completions) {
            showAlert("Mirror Offline", "Layla neural core is currently unavailable.");
            return;
        }

        setIsGeneratingLore(true);
        showToast("The Mirror of Truth gazes deep into your soul... 🪞");

        try {
            const prompt = `You are the Mirror of Truth. Based on the user's dating app preferences: [${top3Preferences.join(', ')}], generate a hilarious, slightly teasing RPG Class, Alignment, and a 2-sentence Backstory for them to enter a fantasy matrix.\nOutput must be strictly XML: <class_alignment>Class Name (e.g. Chaotic Degenerate Waifu Summoner)</class_alignment><backstory>Two sentence backstory here.</backstory>`;

            const stream = layla.chat.completions.stream({
                messages: [{ role: 'system', content: prompt }]
            });

            const rawContent = await stream.finalContent();
            const cleanContent = rawContent
                .replace(/<[\/\\]?(?:think|thought|\|?channel\|?>?\s*thought|channel>thought)\b>?[\s\S]*?(?:<[\/\\]?(?:think|thought|channel)>|<\|?end_of_thought\|?>|<\|?channel\|?>?\s*(?:model|assistant|bot|message))/gi, '')
                .trim();

            const classMatch = cleanContent.match(/<class_alignment>([\s\S]*?)<\/class_alignment>/i);
            const backstoryMatch = cleanContent.match(/<backstory>([\s\S]*?)<\/backstory>/i);

            const parsedClass = classMatch ? classMatch[1].trim() : "Chaotic Degenerate Vector-Mage";
            const parsedBackstory = backstoryMatch ? backstoryMatch[1].trim() : `Summoned across the digital divide due to an unhealthy fixation on ${top3Preferences.join(' and ')}. They now wander the matrix seeking their destined match with questionable tactical judgement.`;

            setClassAlignment(parsedClass);
            setBackstory(parsedBackstory);

            showToast("Mirror of Truth reflection materialized! ✨");
        } catch (err) {
            console.error("Mirror of Truth lore generation failed:", err);
            showToast("The Mirror shattered momentarily! Check console. 🚫");
        } finally {
            setIsGeneratingLore(false);
        }
    }, [layla, top3Preferences, showToast, showAlert]);

    /**
     * 3. SPRITE GENERATION & CHROMA KEY
     * Renders casual and battle sprites on green background and strips them.
     */
    const forgeAvatarSprites = useCallback(async () => {
        if (!layla || !layla.images || !layla.images.generateImage) {
            showAlert("Image Core Unavailable", "Layla image generator is not ready.");
            return;
        }

        setIsForgingSprites(true);
        const modelId = typeof getImageModelId === 'function' ? getImageModelId() : undefined;
        const greenScreenSuffix = ", full body, centered, entirely in frame, solid neon green background, simple background, isolated, no effects, no particles, no magic aura";

        try {
            // Step 1: Casual Pose
            setForgeStepText("Synthesizing casual matrix avatar... (1/2)");
            const casualPrompt = `${basePrompt}, standing straight, casual pose${greenScreenSuffix}`;
            const rawCasual = await layla.images.generateImage(
                casualPrompt,
                (status, step, total) => {
                    setForgeStepText(`Rendering casual sprite: ${status || 'Painting'} ${step ? `(${step}/${total || 20})` : ''}`);
                },
                undefined,
                modelId
            );

            setForgeStepText("Chroma-keying casual sprite background...");
            const transparentCasual = await chromaKeyImage(rawCasual, 85, 40, 'green');
            setCasualSpriteUrl(transparentCasual);

            // Step 2: Battle Pose
            setForgeStepText("Synthesizing tactical battle avatar... (2/2)");
            const battlePrompt = `${basePrompt}, action pose, battle stance, wielding weapon${greenScreenSuffix}`;
            const rawBattle = await layla.images.generateImage(
                battlePrompt,
                (status, step, total) => {
                    setForgeStepText(`Rendering battle sprite: ${status || 'Painting'} ${step ? `(${step}/${total || 20})` : ''}`);
                },
                undefined,
                modelId
            );

            setForgeStepText("Chroma-keying battle sprite background...");
            const transparentBattle = await chromaKeyImage(rawBattle, 85, 40, 'green');
            setBattleSpriteUrl(transparentBattle);

            // Commit complete profile to global store
            const finalProfile = {
                ...customUserProfile,
                class_alignment: classAlignment || "Cybernetic Wanderer",
                backstory: backstory || "An adventurer who dared to dive through the Isekai Mirror.",
                casualSpriteUrl: transparentCasual,
                battleSpriteUrl: transparentBattle,
                stats: {
                    hp: 100,
                    maxHp: 100,
                    mana: 50,
                    maxMana: 50
                },
                visualConfig: {
                    gender,
                    bodyType,
                    hairColor,
                    eyeColor,
                    aesthetic
                }
            };

            if (typeof setCustomUserProfile === 'function') {
                setCustomUserProfile(finalProfile);
            }

            showToast("Avatar successfully forged and materialized! ⚔️✨");
        } catch (err) {
            console.error("Avatar forge failed:", err);
            showAlert("Forge Error", "Failed to complete avatar synthesis: " + (err.message || err));
        } finally {
            setIsForgingSprites(false);
            setForgeStepText('');
        }
    }, [
        layla,
        basePrompt,
        classAlignment,
        backstory,
        customUserProfile,
        setCustomUserProfile,
        gender,
        bodyType,
        hairColor,
        eyeColor,
        aesthetic,
        getImageModelId,
        showToast,
        showAlert
    ]);

    return {
        // Form selections
        gender, setGender,
        bodyType, setBodyType,
        hairColor, setHairColor,
        eyeColor, setEyeColor,
        aesthetic, setAesthetic,
        basePrompt,
        top3Preferences,

        // Lore
        classAlignment, setClassAlignment,
        backstory, setBackstory,
        generateMirrorOfTruthLore,
        isGeneratingLore,

        // Sprites
        casualSpriteUrl, setCasualSpriteUrl,
        battleSpriteUrl, setBattleSpriteUrl,
        forgeAvatarSprites,
        isForgingSprites,
        forgeStepText
    };
}

export default useAvatarForge;

