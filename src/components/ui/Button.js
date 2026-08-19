// Paste your Button component code here
import React from 'react';

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    onClick,
    style,
    disabled = false
}) {
    //base classes jo har ek button par apply hoga
    let baseClass = "btn-base";

    // Variant ke hisaab se class lagayenge
    if (variant === 'primary') baseClass += " btn-primary";
    else if (variant === 'outline') baseClass += " btn-outline";
    else if (variant === 'ghost') baseClass += " btn-ghost";
    return (
        <button
            className={baseClass}
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: size === 'sm' ? '0.4rem 0.8rem' : size === 'lg' ? '0.75rem 1.5rem' : '0.5rem 1rem',
                fontSize: size === 'sm' ? '0.8rem' : size === 'lg' ? '1rem' : '0.85rem',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                ...style // Agar koi custom inline style pass kiya ho toh
            }}
        >
            {children}
        </button>
    );
}
