/**
 * Copyright (C) 2026 Project M.I.K.A. & Contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * In-DOM GachaSwipe Neon Dropdown selector matching LOCALIZATION_HUB
 * (.search-input trigger + .dropdown-option menu expanding directly downward).
 * Avoids native OS <select> popup mispositioning inside DesktopShell / iframes.
 */

import React, { useEffect, useRef, useState } from 'react';

const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

export const NeonSelect = ({
    value,
    options,
    onChange,
    placeholder = 'Select...',
    accentColor = 'var(--accent)',
    size = 'md',
    disabled = false,
    onOpenChange,
    style
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef(null);
    const onOpenChangeRef = useRef(onOpenChange);
    onOpenChangeRef.current = onOpenChange;

    const updateOpen = (next) => {
        setIsOpen(next);
        if (typeof onOpenChangeRef.current === 'function') {
            onOpenChangeRef.current(next);
        }
    };

    useEffect(() => {
        if (!isOpen) return undefined;
        const handleOutside = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                updateOpen(false);
            }
        };
        const handleKey = (e) => {
            if (e.key === 'Escape') updateOpen(false);
        };
        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('touchstart', handleOutside, { passive: true });
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('touchstart', handleOutside);
            document.removeEventListener('keydown', handleKey);
        };
    }, [isOpen]);

    useEffect(() => {
        return () => {
            if (typeof onOpenChangeRef.current === 'function') {
                onOpenChangeRef.current(false);
            }
        };
    }, []);

    const safeOptions = Array.isArray(options) ? options : [];
    const selectedOption = safeOptions.find(opt => String(opt.value) === String(value));
    const displayLabel = selectedOption ? selectedOption.label : placeholder;
    const isSmall = size === 'sm';

    return (
        <div
            ref={rootRef}
            style={{
                position: 'relative',
                width: '100%',
                minWidth: 0,
                zIndex: isOpen ? 220 : 1,
                ...style
            }}
        >
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (!disabled) updateOpen(!isOpen);
                }}
                className="search-input"
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    padding: isSmall ? '9px 36px 9px 12px' : '12px 38px 12px 16px',
                    fontSize: isSmall ? '12.5px' : '13.5px',
                    fontWeight: 'bold',
                    fontFamily: MONO,
                    color: selectedOption ? 'var(--text-main)' : 'var(--text-dim)',
                    background: '#0B0914',
                    border: isOpen ? `1px solid ${accentColor}` : '1px solid rgba(0, 229, 255, 0.28)',
                    borderRadius: '10px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.55 : 1,
                    position: 'relative',
                    boxShadow: isOpen ? '0 0 14px rgba(255, 16, 122, 0.22)' : 'none'
                }}
            >
                <span
                    style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0
                    }}
                >
                    {displayLabel}
                </span>
                <span
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: '36px',
                        display: 'grid',
                        placeItems: 'center',
                        color: accentColor,
                        fontSize: '10px',
                        pointerEvents: 'none'
                    }}
                >
                    {isOpen ? '▲' : '▼'}
                </span>
            </button>

            {isOpen && safeOptions.length > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        minWidth: 'min(220px, 80vw)',
                        zIndex: 300,
                        background: '#171226',
                        border: `1px solid ${accentColor}`,
                        borderRadius: '12px',
                        marginTop: '6px',
                        padding: '8px',
                        boxShadow: '0 10px 34px rgba(0, 0, 0, 0.92)',
                        maxHeight: '220px',
                        overflowY: 'auto',
                        animation: 'expandDown 0.2s ease forwards',
                        transformOrigin: 'top',
                        textAlign: 'left'
                    }}
                >
                    {safeOptions.map((opt, optIdx) => {
                        const isSelected = String(opt.value) === String(value);
                        return (
                            <div
                                key={`${String(opt.value)}_${optIdx}`}
                                className={`dropdown-option ${isSelected ? 'selected' : ''}`}
                                style={{
                                    fontFamily: MONO,
                                    fontSize: isSmall ? '12px' : '12.5px',
                                    padding: isSmall ? '10px 12px' : '12px 14px'
                                }}
                                onClick={() => {
                                    if (typeof onChange === 'function') onChange(opt.value);
                                    updateOpen(false);
                                }}
                            >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
                                    {opt.label}
                                </span>
                                {isSelected && (
                                    <span style={{ color: accentColor, fontSize: '11px', flexShrink: 0 }}>✔</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default NeonSelect;
