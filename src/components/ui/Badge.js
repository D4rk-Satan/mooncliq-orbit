import React from 'react';

export default function Badge({ children, color, backgroundColor = '#e2e8f0', textColor = '#64748b' }) {
    // Agar user ne direct 'color' pass kiya (jaise #ff0000), toh usko apply karenge,
    // warna default background aur text color use karenge.
    const bg = color || backgroundColor;
    const text = color ? 'white' : textColor;

    return (
        <span
            style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                color: text,
                backgroundColor: bg,
                padding: '0.15rem 0.4rem',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            {children}
        </span>
    );
}
