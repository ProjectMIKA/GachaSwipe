import React from 'react';

/**
 * Lucid Dive Custom Cybernetic SVG Icons
 * Handcrafted by M.I.K.A. for Master! 🐾💜
 */

// 🔮 Lucid Crystal Orb / Holodeck Resonance
export const LucidOrbIcon = ({ size = 18, color = '#00E5FF' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
        <defs>
            <radialGradient id={`orbGrad_${color.replace(/[^a-zA-Z0-9]/g, '')}`} cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                <stop offset="40%" stopColor={color} stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0B0914" stopOpacity="0.95" />
            </radialGradient>
            <filter id="orbGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>
        <circle cx="12" cy="12" r="8" fill={`url(#orbGrad_${color.replace(/[^a-zA-Z0-9]/g, '')})`} filter="url(#orbGlow)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" stroke={color} strokeWidth="1.2" strokeDasharray="3 2" transform="rotate(-25 12 12)" opacity="0.8" />
        <circle cx="9" cy="9" r="1.5" fill="#FFFFFF" opacity="0.85" />
        <circle cx="15" cy="15" r="0.8" fill={color} opacity="0.9" />
    </svg>
);

// 🌀 Hyper-Dive Portal / Neural Vortex
export const LucidVortexIcon = ({ size = 16, color = '#00E5FF' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
        <path d="M12 2a10 10 0 0 1 10 10c0 4.418-3.582 8-8 8s-6-2.686-6-6 1.79-4 4-4 2 .895 2 2-.448 1-1 1" />
        <circle cx="12" cy="12" r="1.5" fill={color} />
    </svg>
);

// 🤝 Ally / Companion Dynamic (Linked Nodes / Shield Bond)
export const LucidAllyIcon = ({ size = 15, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

// ⚔️ Antagonist / Rival Dynamic (Crossed Cyber Blades)
export const LucidSwordsIcon = ({ size = 15, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
        <polyline points="14.5 17.5 3 6 6 3 17.5 14.5" />
        <line x1="13" y1="19" x2="19" y2="13" />
        <line x1="16" y1="16" x2="20" y2="20" />
        <line x1="19" y1="21" x2="21" y2="19" />
        <polyline points="9.5 17.5 21 6 18 3 6.5 14.5" />
        <line x1="5" y1="13" x2="11" y2="19" />
        <line x1="4" y1="20" x2="8" y2="16" />
        <line x1="3" y1="19" x2="5" y2="21" />
    </svg>
);

// 🎲 Reroll / Matrix Randomizer Dice
export const LucidRerollIcon = ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
        <rect x="3" y="3" width="18" height="18" rx="4" ry="4" />
        <circle cx="8.5" cy="8.5" r="1.5" fill={color} />
        <circle cx="15.5" cy="8.5" r="1.5" fill={color} />
        <circle cx="12" cy="12" r="1.5" fill={color} />
        <circle cx="8.5" cy="15.5" r="1.5" fill={color} />
        <circle cx="15.5" cy="15.5" r="1.5" fill={color} />
    </svg>
);

// 🚀 Engage Hyper-Dive Thruster Rocket
export const LucidRocketIcon = ({ size = 15, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
);

// 🌌 Dream Location / Celestial Galaxy Compass
export const LucidGalaxyIcon = ({ size = 15, color = '#00E5FF' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
        <circle cx="12" cy="12" r="9" opacity="0.35" strokeDasharray="3 3" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)" />
        <circle cx="12" cy="12" r="3" fill={color} />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" opacity="0.7" />
    </svg>
);

// 👗 Dream Attire Matrix / Garment Matrix
export const LucidAttireIcon = ({ size = 15, color = '#FF107A' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
        <path d="M9 3h6l2 4-3 2v12H10V9L7 7l2-4z" />
        <path d="M9 3a3 3 0 0 0 6 0" />
        <line x1="10" y1="13" x2="14" y2="13" opacity="0.7" />
    </svg>
);

// 🛑 Wake Up Panic Button / Reality Anchor
export const LucidWakeUpIcon = ({ size = 15, color = '#FF3333' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
        <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3" />
    </svg>
);

// Sleek Close 'X' Icon
export const LucidCloseIcon = ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

// 🧠 Neural Stream Icon
export const LucidBrainIcon = ({ size = 14, color = '#00E5FF' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
        <path d="M9.5 2A4.5 4.5 0 0 0 5 6.5C5 7.4 5.3 8.2 5.8 8.9A4 4 0 0 0 4 12a4 4 0 0 0 2 3.5 4.5 4.5 0 0 0 8.5 2.5V2" />
        <path d="M14.5 2A4.5 4.5 0 0 1 19 6.5c0 .9-.3 1.7-.8 2.4A4 4 0 0 1 20 12a4 4 0 0 1-2 3.5 4.5 4.5 0 0 1-8.5 2.5V2" />
    </svg>
);

// ⚡ Spark / Neural Pulse Icon
export const LucidSparkIcon = ({ size = 14, color = '#FFD700' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

