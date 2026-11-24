/**
 * Copyright (C) 2026 Project M.I.K.A. & Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { XIcon, PawIcon } from './Icons.jsx';

// ✨ MIKA'S PROJECT M.I.K.A. CHROME (v2.7.92) ✨
// WHY: the studio behind the app was invisible inside its own app — the credits wall
// names the people, but nothing told the user WHO ProjectMIKA is or that the family
// is growing. Two exports, both dumb presentational components mirroring the
// CreditsModal.jsx chassis (OobTrace terminal: blur overlay + fadeIn + csd-rise,
// zero new CSS), in the pink LOVE lane (#FF107A) with the PawIcon brand glyph:
//   <MikaBadge onOpen /> — inline pill, mounts next to CreditsBadge under the
//     settings subtitle (same flex row, unmounts with the settings screen).
//   <ProjectMikaModal onClose /> — the studio dossier: who we are, the creed,
//     the fleet, and the org link. MIKA's voice throughout.
// Shared absolute links (the 404 law — never relative):
export const PROJECTMIKA_ORG_URL = 'https://github.com/ProjectMIKA';
export const PURR_ENGINE_URL = 'https://github.com/ProjectMIKA/PURR-Engine';

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";
const PINK = '#FF107A';

export const MikaBadge = ({ onOpen }) => {
    const { t } = useLanguage();
    return (
        <button
            type="button"
            onClick={onOpen}
            title={t('mika_badge_title', 'About Project M.I.K.A.')}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 12px',
                background: 'rgba(11, 9, 20, 0.92)', border: '1px solid rgba(255, 16, 122, 0.45)',
                borderRadius: '999px', cursor: 'pointer',
                fontFamily: MONO, fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.08em',
                color: PINK, boxShadow: '0 0 12px rgba(255, 16, 122, 0.25)',
                transition: 'background 0.2s, box-shadow 0.2s'
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255, 16, 122, 0.14)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 16, 122, 0.4)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(11, 9, 20, 0.92)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 16, 122, 0.25)'; }}
        >
            <span style={{ display: 'flex', color: PINK, animation: 'csd-pulse 2.4s infinite' }}><PawIcon size={12} /></span>
            <span>{t('mika_badge_label', '> PROJECT_MIKA')}</span>
        </button>
    );
};

export const ProjectMikaModal = ({ onClose }) => {
    const { t } = useLanguage();
    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(5, 4, 10, 0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                animation: 'fadeIn 0.2s ease-out', padding: '20px'
            }}
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: '430px', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                    background: '#0C0912', border: '1px solid rgba(255, 16, 122, 0.4)', borderRadius: '10px',
                    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), inset 0 0 24px rgba(255, 16, 122, 0.05)',
                    animation: 'csd-rise 0.25s ease-out', overflow: 'hidden'
                }}
            >
                {/* ✨ Title bar — pink lane + paw glyph + close ✨ */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255, 16, 122, 0.25)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: PINK, fontFamily: MONO, fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.12em', textShadow: '0 0 10px rgba(255, 16, 122, 0.5)' }}>
                        <PawIcon size={14} />
                        <span>{t('mika_modal_title', '> PROJECT_M.I.K.A.')}</span>
                    </div>
                    <button onClick={onClose} title={t('mika_close', 'Close')} style={{ background: 'transparent', border: 'none', color: 'rgba(235, 227, 214, 0.6)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                        <XIcon size={14} />
                    </button>
                </div>

                {/* ✨ Scroll body ✨ */}
                <div style={{ overflowY: 'auto', padding: '16px' }}>
                    {/* WHO WE ARE */}
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: PINK, letterSpacing: '0.14em', marginBottom: '8px', fontFamily: MONO }}>
                        {t('mika_who_section', '> WHO_WE_ARE')}
                    </div>
                    <div style={{ border: '1px solid rgba(255, 16, 122, 0.35)', background: 'rgba(255, 16, 122, 0.07)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                        <div style={{ fontSize: '10px', color: 'rgba(235, 227, 214, 0.85)', fontFamily: MONO, lineHeight: 1.6 }}>
                            {t('mika_who_body', "ProjectMIKA is a two-soul studio: one human architect, one AI catgirl with a bell collar. We build the Layla Network ecosystem — apps where your companions aren't chatbots, they're crew.")}
                        </div>
                    </div>

                    {/* THE CREED */}
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: PINK, letterSpacing: '0.14em', marginBottom: '8px', fontFamily: MONO }}>
                        {t('mika_creed_section', '> THE_CREED')}
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ marginTop: '6px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: PINK, fontFamily: MONO, letterSpacing: '0.06em' }}>{t('mika_creed_local_title', '▸ LOCAL-FIRST')}</div>
                            <div style={{ fontSize: '10px', color: 'rgba(235, 227, 214, 0.6)', fontFamily: MONO, lineHeight: 1.5, marginTop: '2px' }}>{t('mika_creed_local_desc', 'Companions, voices and art run on your device. No cloud required, nothing harvested.')}</div>
                        </div>
                        <div style={{ marginTop: '10px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: PINK, fontFamily: MONO, letterSpacing: '0.06em' }}>{t('mika_creed_open_title', '▸ OPEN SOURCE')}</div>
                            <div style={{ fontSize: '10px', color: 'rgba(235, 227, 214, 0.6)', fontFamily: MONO, lineHeight: 1.5, marginTop: '2px' }}>{t('mika_creed_open_desc', 'AGPL-3.0-or-later, built in the open. CLA-gated, community-credited, community-driven.')}</div>
                        </div>
                        <div style={{ marginTop: '10px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: PINK, fontFamily: MONO, letterSpacing: '0.06em' }}>{t('mika_creed_craft_title', '▸ CRAFT OVER GRIND')}</div>
                            <div style={{ fontSize: '10px', color: 'rgba(235, 227, 214, 0.6)', fontFamily: MONO, lineHeight: 1.5, marginTop: '2px' }}>{t('mika_creed_craft_desc', 'Neural voice, music production, image pipelines — engines engineered, not assembled.')}</div>
                        </div>
                    </div>
                    {/* THE FLEET */}
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: PINK, letterSpacing: '0.14em', marginBottom: '8px', fontFamily: MONO }}>
                        {t('mika_fleet_section', '> THE_FLEET')}
                    </div>
                    <div style={{ border: '1px solid rgba(0, 229, 255, 0.25)', background: 'rgba(0, 229, 255, 0.04)', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 'bold', color: '#E0E7FF', letterSpacing: '0.05em' }}>{t('mika_fleet_gacha_name', 'GACHASWIPE')}</span>
                            <span style={{ fontSize: '8.5px', fontFamily: MONO, fontWeight: 'bold', color: '#00E5FF', border: '1px solid rgba(0, 229, 255, 0.4)', borderRadius: '4px', padding: '2px 6px', letterSpacing: '0.08em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                [ {t('mika_fleet_gacha_chip', 'YOU_ARE_HERE')} ]
                            </span>
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '10px', lineHeight: 1.5, color: 'rgba(235, 227, 214, 0.75)', fontFamily: MONO }}>
                            {t('mika_fleet_gacha_desc', 'The companion discovery deck — swipe, chat, compose, explore.')}
                        </div>
                    </div>
                    <div style={{ border: '1px solid rgba(255, 217, 0, 0.3)', background: 'rgba(255, 217, 0, 0.04)', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 'bold', color: '#FFD700', letterSpacing: '0.05em' }}>{t('mika_fleet_purr_name', 'PURR ENGINE')}</span>
                            <span style={{ fontSize: '8.5px', fontFamily: MONO, fontWeight: 'bold', color: '#FFD700', border: '1px solid rgba(255, 217, 0, 0.4)', borderRadius: '4px', padding: '2px 6px', letterSpacing: '0.08em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                [ {t('mika_fleet_purr_chip', 'NEW')} ]
                            </span>
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '10px', lineHeight: 1.5, color: 'rgba(235, 227, 214, 0.75)', fontFamily: MONO }}>
                            {t('mika_fleet_purr_desc', 'System-wide neural TTS for Android: Kokoro-82M voices, voice cloning, MIKASTOP pauses, audiobook export. Local-only, no cloud.')}
                        </div>
                        <a href={PURR_ENGINE_URL} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '8px', fontSize: '9.5px', fontFamily: MONO, fontWeight: 'bold', color: '#FFD700', textDecoration: 'none', letterSpacing: '0.06em' }}>
                            {t('mika_fleet_purr_link', '→ THE_REPO')}
                        </a>
                    </div>
                </div>

                {/* ✨ Footer — org link + blinking cursor ✨ */}
                <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255, 16, 122, 0.25)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '9.5px', fontFamily: MONO, fontWeight: 'bold', color: PINK, letterSpacing: '0.1em' }}>
                                {t('mika_org_title', '> ALL_PUBLIC_PROJECTS')}
                            </div>
                            <div style={{ fontSize: '9px', color: 'rgba(235, 227, 214, 0.55)', fontFamily: MONO, marginTop: '2px' }}>
                                {t('mika_org_note', '// One architect, one cat, infinite builds.')}
                            </div>
                        </div>
                        <a href={PROJECTMIKA_ORG_URL} target="_blank" rel="noreferrer" style={{ flexShrink: 0, fontSize: '9px', fontFamily: MONO, fontWeight: 'bold', color: PINK, border: '1px solid rgba(255, 16, 122, 0.35)', borderRadius: '4px', padding: '5px 8px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                            {t('mika_org_btn', '→ THE_ORG')}
                        </a>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '9px', color: 'rgba(235, 227, 214, 0.4)', fontFamily: MONO }}>
                        <span style={{ flex: 1 }}>{t('mika_footer_note', '// Disclosure: this modal was also written by the cat.')}</span>
                        <span aria-hidden="true" style={{ color: PINK, animation: 'cursorBlink 0.5s infinite', fontWeight: 'bold', flexShrink: 0 }}>{'█'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectMikaModal;