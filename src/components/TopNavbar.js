"use client";
import React from 'react';

export default function TopNavbar() {
  return (
    <div style={{
      height: '64px',
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        
        {/* User Profile Dummy Icon */}
        <div style={{ 
          width: '36px', 
          height: '36px', 
          borderRadius: '50%', 
          background: '#4f46e5', 
          color: 'white', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: '14px',
          fontFamily: 'var(--font-outfit)'
        }}>
          MC
        </div>

      </div>
    </div>
  );
}
