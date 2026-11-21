// ✨ M.I.K.A. POSITION PACKS (v2.6.29) — the builtin POV registry, carved into 5 themed packs ✨
// Each pack position is a REFERENCE ({ id }) into the static POSITIONS registry in
// src/utils/positionEngine.js — the hand-tuned keywords + POSE_DICTIONARY bundles stay the
// single source of truth until a position is edited in the forge, at which point the
// persisted pack carries a full inline def that SHADOWS the registry entry (the per-pack
// RESET button restores this constant). App seeds its positionPacks state from here at
// first boot and merges NEW builtin packs in for upgraders.

export const DEFAULT_POSITION_PACKS = [
    {
        id: 'builtin_mounts',
        name: 'MOUNTS & RIDES',
        theme: 'mounts',
        icon: '🐴',
        enabled: true,
        builtin: true,
        positions: [
            { id: 'cowgirl' },
            { id: 'reverse_cowgirl' },
            { id: 'squatting_cowgirl' },
            { id: 'reverse_squatting_cowgirl' },
            { id: 'upright_straddle' },
            { id: 'reverse_upright_straddle' },
            { id: 'amazon_position' },
            { id: 'sitting_on_face' },
        ],
    },
    {
        id: 'builtin_submission',
        name: 'DEPTH & SUBMISSION',
        theme: 'submission',
        icon: '🌊',
        enabled: true,
        builtin: true,
        positions: [
            { id: 'missionary' },
            { id: 'mating_press' },
            { id: 'anvil_position' },
            { id: 'folded_piledriver' },
            { id: 'doggystyle' },
            { id: 'standing_doggystyle' },
            { id: 'prone_bone' },
            { id: 'top_down_bottom_up' },
            { id: 'bent_over' },
            { id: 'presenting' },
            { id: 'anal_doggy' },
        ],
    },
    {
        id: 'builtin_standing',
        name: 'STANDING & SUSPENDED',
        theme: 'standing',
        icon: '🏙️',
        enabled: true,
        builtin: true,
        positions: [
            { id: 'standing_sex' },
            { id: 'standing_missionary' },
            { id: 'suspended_congress' },
            { id: 'reverse_suspended_congress' },
        ],
    },
    {
        id: 'builtin_oral',
        name: 'ORAL & HANDS',
        theme: 'oral',
        icon: '👄',
        enabled: true,
        builtin: true,
        positions: [
            { id: 'fellatio' },
            { id: 'cunnilingus' },
            { id: 'paizuri' },
            { id: 'sixty_nine' },
            { id: 'handjob' },
            { id: 'fingering' },
        ],
    },
    {
        id: 'builtin_soft',
        name: 'TEASE & CUDDLE',
        theme: 'soft',
        icon: '🛏️',
        enabled: true,
        builtin: true,
        positions: [
            { id: 'spooning' },
            { id: 'cleavage_lean' },
            { id: 'skirt_lift' },
            { id: 'embrace_front' },
            { id: 'lap_pillow' },
        ],
    },
];

// Deep clone for App state seeding — callers own their copy (packs are user-editable).
export const cloneDefaultPositionPacks = () => DEFAULT_POSITION_PACKS.map((p) => ({
    ...p,
    positions: p.positions.map((pos) => ({ ...pos })),
}));