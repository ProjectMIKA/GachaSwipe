import React from 'react';
import './DesktopShell.css';

/**
 * Portable 3-Panel Desktop Workspace Shell (>= 1025px).
 * Mounts Left (Messages/Chat), Center (Swipe Stage), and Right (Adaptive HUD / App Sub-Views).
 * Pure JSX + CSS Grid; zero web-specific dependencies so both GachaSwipe (Layla) and GachaSwipe-Web share it verbatim.
 */
export const DesktopShell = ({
    leftPanel,
    centerPanel,
    rightPanel,
    rightHudLabel = 'PROFILE',
    activeNavTab = 'profile',
    onSelectNavTab,
    isSubViewOpen = false,
    subViewLabel = '',
    onExitSubView,
    engineBadgeLabel = 'AUTO',
    onClickEngineBadge,
    showApiTab = false,
    lockRightBodyScroll = false
}) => {
    const navTabs = [
        { id: 'profile', label: '♥ PROFILE', accent: '#ff107a' },
        { id: 'session', label: '👤 MY HUB', accent: '#00e5ff' },
        { id: 'settings', label: '⚙️ SETTINGS', accent: '#b533ff' },
        ...(showApiTab ? [{ id: 'api', label: '⚡ API', accent: '#00ff9d' }] : [])
    ];

    const displayModel = engineBadgeLabel
        ? String(engineBadgeLabel).split('/').pop()
        : 'AUTO';

    return (
        <div className="three-panel-root">
            {/* LEFT PANEL: Live Native Messages & Active Chat */}
            <aside className="panel-left" aria-label="Messages Panel">
                {leftPanel}
            </aside>

            {/* CYBERPUNK GUTTER RAIL (LEFT) */}
            <div className="cyber-gutter left" aria-hidden="true">
                <div className="gutter-light-pulse" />
                <div className="gutter-marker">[L]</div>
                <div className="gutter-label">MATRIX_RAIL_01 // CHAT_STREAM</div>
                <div className="gutter-marker">[01]</div>
            </div>

            {/* CENTER PANEL: Live Swipe Stage */}
            <main className="panel-center" aria-label="Swipe Stage">
                {centerPanel}
            </main>

            {/* CYBERPUNK GUTTER RAIL (RIGHT) */}
            <div className="cyber-gutter right" aria-hidden="true">
                <div className="gutter-light-pulse" />
                <div className="gutter-marker green">[R]</div>
                <div className="gutter-label">DIAGNOSTIC_RAIL_02 // ADAPTIVE_HUD</div>
                <div className="gutter-marker green">[02]</div>
            </div>

            {/* RIGHT PANEL: Adaptive HUD + Real App Sub-Views */}
            <aside className="panel-right" aria-label="Adaptive HUD Panel">
                <div className="panel-right-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 1 }}>
                        <div
                            style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: '#00ff9d',
                                boxShadow: '0 0 10px #00ff9d',
                                animation: 'csd-pulse 1.5s infinite',
                                flexShrink: 0
                            }}
                        />
                        <span
                            style={{
                                color: '#00ff9d',
                                fontSize: '11.5px',
                                fontWeight: 900,
                                letterSpacing: '0.12em',
                                textShadow: '0 0 8px rgba(0, 255, 157, 0.5)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}
                        >
                            ADAPTIVE_HUD // {String(rightHudLabel || 'PROFILE').toUpperCase()}
                        </span>
                    </div>

                    <div
                        style={{
                            width: '106px',
                            minWidth: '106px',
                            maxWidth: '106px',
                            height: '22px',
                            background: 'rgba(0, 229, 255, 0.1)',
                            border: '1px solid rgba(0, 229, 255, 0.35)',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            flexShrink: 0,
                            boxSizing: 'border-box',
                            maskImage: 'linear-gradient(90deg, transparent 0%, black 8px, black calc(100% - 8px), transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 8px, black calc(100% - 8px), transparent 100%)',
                            cursor: 'pointer'
                        }}
                        title={`Active Engine: ${engineBadgeLabel || 'Default (Auto)'}`}
                        onClick={onClickEngineBadge}
                    >
                        <div
                            className="hud-model-marquee"
                            style={{
                                fontSize: '9px',
                                color: '#00e5ff',
                                letterSpacing: '0.08em',
                                fontWeight: 800
                            }}
                        >
                            <span style={{ paddingRight: '24px' }}>⚡ {displayModel}</span>
                            <span style={{ paddingRight: '24px' }}>⚡ {displayModel}</span>
                        </div>
                    </div>
                </div>

                {/* Quick-Nav Tab Strip */}
                <div className="panel-right-nav">
                    {navTabs.map((tab) => {
                        const isSelected = !isSubViewOpen && activeNavTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => onSelectNavTab && onSelectNavTab(tab.id)}
                                style={{
                                    flex: '1 1 auto',
                                    padding: '7px 10px',
                                    fontSize: '10px',
                                    fontFamily: 'inherit',
                                    fontWeight: 800,
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    transition: 'all 0.18s ease',
                                    whiteSpace: 'nowrap',
                                    letterSpacing: '0.05em',
                                    background: isSelected ? `${tab.accent}24` : 'rgba(255, 255, 255, 0.02)',
                                    color: isSelected ? tab.accent : 'rgba(255, 255, 255, 0.55)',
                                    border: isSelected ? `1px solid ${tab.accent}` : '1px solid rgba(255, 255, 255, 0.08)',
                                    boxShadow: isSelected ? `0 0 12px ${tab.accent}35` : 'none'
                                }}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Contextual Return Bar when inside DAW / Forges / GachaFans */}
                {isSubViewOpen && (
                    <div className="panel-right-subbar">
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#00e5ff', letterSpacing: '0.08em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            &gt; {subViewLabel || 'ACTIVE_SUBSYSTEM'}
                        </span>
                        {onExitSubView && (
                            <button
                                type="button"
                                onClick={onExitSubView}
                                style={{
                                    background: 'rgba(0, 229, 255, 0.12)',
                                    border: '1px solid rgba(0, 229, 255, 0.45)',
                                    color: '#00e5ff',
                                    borderRadius: '4px',
                                    padding: '4px 10px',
                                    fontSize: '9.5px',
                                    fontWeight: 800,
                                    fontFamily: 'inherit',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                }}
                            >
                                [ ✕ RETURN ]
                            </button>
                        )}
                    </div>
                )}

                {/* Right Panel Scrollable Stage */}
                <div className={`panel-right-body${lockRightBodyScroll ? ' scroll-locked' : ''}`}>
                    {rightPanel}
                </div>
            </aside>
        </div>
    );
};

export default DesktopShell;
