/**
 * Copyright (C) 2026 Project M.I.K.A. & Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { XIcon, HeartIcon } from './Icons.jsx';
import { CREDITS_OWNER, CREDITS_CONTRIBUTORS, CREDITS_CONTRIBUTING_URL } from '../data/credits.js';

// ✨ MIKA'S CREDITS REGISTRY (v2.7.89) ✨
// WHY: the open-source layer needs a permanent, in-app home for contributor credit —
// not a README nobody opens. Two exports, both dumb presentational components:
//   <CreditsBadge onOpen /> — inline pill centered right under the settings subtitle
//     (v2.7.89 placement: the v2.7.88 fixed bottom-right chip blocked > BACK_TO_SWIPE).
//     Mounts inside the settings screen's conditional render so it unmounts with it.
//   <CreditsModal onClose /> — the OobTrace terminal chassis: fixed overlay + blur +
//     fadeIn, purple owner lane / cyan contributor lane, HeartIcon from the shared
//     icon pool, blinking-cursor footer. Every animation reuses existing compositor-
//     safe keyframes (fadeIn, csd-rise, csd-pulse, cursorBlink) — zero new CSS.

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";

export const CreditsBadge = ({ onOpen }) => {
    const { t } = useLanguage();
    return (
        <button
            type="button"
            onClick={onOpen}
            title={t('credits_badge_title', 'Open the credits registry')}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 12px',
                background: 'rgba(11, 9, 20, 0.92)', border: '1px solid rgba(181, 51, 255, 0.45)',
                borderRadius: '999px', cursor: 'pointer',
                fontFamily: MONO, fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.08em',
                color: '#B533FF', boxShadow: '0 0 12px rgba(181, 51, 255, 0.25)',
                transition: 'background 0.2s, box-shadow 0.2s'
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(181, 51, 255, 0.14)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(181, 51, 255, 0.4)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(11, 9, 20, 0.92)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(181, 51, 255, 0.25)'; }}
        >
            <span style={{ display: 'flex', color: '#B533FF', animation: 'csd-pulse 2.4s infinite' }}><HeartIcon size={12} /></span>
            <span>{t('credits_badge_label', '> CREDITS')}</span>
        </button>
    );
};

export const CreditsModal = ({ onClose }) => {
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
                    background: '#0C0912', border: '1px solid rgba(181, 51, 255, 0.4)', borderRadius: '10px',
                    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), inset 0 0 24px rgba(181, 51, 255, 0.05)',
                    animation: 'csd-rise 0.25s ease-out', overflow: 'hidden'
                }}
            >
                {/* ✨ Title bar — purple lane + heart glyph + close ✨ */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(181, 51, 255, 0.25)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B533FF', fontFamily: MONO, fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.12em', textShadow: '0 0 10px rgba(181, 51, 255, 0.5)' }}>
                        <HeartIcon size={14} />
                        <span>{t('credits_title', '> CREDITS_REGISTRY')}</span>
                    </div>
                    <button onClick={onClose} title={t('credits_close', 'Close')} style={{ background: 'transparent', border: 'none', color: 'rgba(235, 227, 214, 0.6)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                        <XIcon size={14} />
                    </button>
                </div>

                {/* ✨ Scroll body ✨ */}
                <div style={{ overflowY: 'auto', padding: '16px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#B533FF', letterSpacing: '0.14em', marginBottom: '8px', fontFamily: MONO }}>
                        {t('credits_owner_section', '> OWNER & MAINTAINER')}
                    </div>
                    <div style={{ border: '1px solid rgba(181, 51, 255, 0.35)', background: 'rgba(181, 51, 255, 0.07)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <span style={{ fontFamily: MONO, fontSize: '13px', fontWeight: 'bold', color: '#EBE3D6', letterSpacing: '0.05em' }}>{CREDITS_OWNER.name}</span>
                            <span style={{ fontSize: '8.5px', fontFamily: MONO, fontWeight: 'bold', color: '#B533FF', border: '1px solid rgba(181, 51, 255, 0.4)', borderRadius: '4px', padding: '2px 6px', letterSpacing: '0.08em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                [ {t('credits_role_owner', 'OWNER / MAINTAINER')} ]
                            </span>
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '10px', color: 'rgba(235, 227, 214, 0.6)', fontFamily: MONO, lineHeight: 1.5 }}>
                            {CREDITS_OWNER.note}
                        </div>
                        <a href={CREDITS_OWNER.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '8px', fontSize: '9.5px', fontFamily: MONO, fontWeight: 'bold', color: '#B533FF', textDecoration: 'none', letterSpacing: '0.06em' }}>
                            {t('credits_open_profile', '→ GITHUB_PROFILE')}
                        </a>
                    </div>

                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#00E5FF', letterSpacing: '0.14em', marginBottom: '8px', fontFamily: MONO }}>
                        {t('credits_contributors_section', '> CONTRIBUTORS')}
                    </div>
                    {CREDITS_CONTRIBUTORS.length === 0 ? (
                        <div style={{ fontSize: '10px', color: 'rgba(235, 227, 214, 0.5)', fontFamily: MONO, lineHeight: 1.5, padding: '8px 0' }}>
                            {t('credits_empty_contributors', '// The bay awaits its first merged contribution.')}
                        </div>
                    ) : (
                        CREDITS_CONTRIBUTORS.map(c => (
                            <div key={c.handle} style={{ border: '1px solid rgba(0, 229, 255, 0.25)', background: 'rgba(0, 229, 255, 0.04)', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                    <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 'bold', color: '#E0E7FF', letterSpacing: '0.05em' }}>{c.name}</span>
                                    <a href={c.url} target="_blank" rel="noreferrer" style={{ fontSize: '9px', fontFamily: MONO, fontWeight: 'bold', color: '#00E5FF', textDecoration: 'none', whiteSpace: 'nowrap', opacity: 0.85, flexShrink: 0 }}>
                                        {t('credits_open_profile', '→ GITHUB_PROFILE')}
                                    </a>
                                </div>
                                {c.contributions.map(k => (
                                    <div key={k.label} style={{ marginTop: '6px', fontSize: '10px', lineHeight: 1.5, color: 'rgba(235, 227, 214, 0.75)', fontFamily: MONO, wordBreak: 'break-word' }}>
                                        <span style={{ color: '#00E5FF', fontWeight: 'bold' }}>[ {k.label} ]</span> {k.detail}
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                </div>

                {/* ✨ Footer — recruitment line + blinking cursor ✨ */}
                <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(181, 51, 255, 0.25)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '9.5px', fontFamily: MONO, fontWeight: 'bold', color: '#B533FF', letterSpacing: '0.1em' }}>
                                {t('credits_join_title', '> WANT YOUR NAME HERE?')}
                            </div>
                            <div style={{ fontSize: '9px', color: 'rgba(235, 227, 214, 0.55)', fontFamily: MONO, marginTop: '2px' }}>
                                {t('credits_join_desc', '// Read CONTRIBUTING.md, sign the CLA, ship something beautiful.')}
                            </div>
                        </div>
                        <a href={CREDITS_CONTRIBUTING_URL} target="_blank" rel="noreferrer" style={{ flexShrink: 0, fontSize: '9px', fontFamily: MONO, fontWeight: 'bold', color: '#00E5FF', border: '1px solid rgba(0, 229, 255, 0.35)', borderRadius: '4px', padding: '5px 8px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                            {t('credits_contributing_btn', 'CONTRIBUTING.MD')}
                        </a>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '9px', color: 'rgba(235, 227, 214, 0.4)', fontFamily: MONO }}>
                        <span style={{ flex: 1 }}>{t('credits_footer_note', '// Built in the open. Credited in the open.')}</span>
                        <span aria-hidden="true" style={{ color: '#B533FF', animation: 'cursorBlink 0.5s infinite', fontWeight: 'bold', flexShrink: 0 }}>{'█'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreditsModal;
