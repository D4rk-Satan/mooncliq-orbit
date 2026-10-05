"use client";
import React from "react";

const GlobalLoader = ({ fullScreen = false, overlay = false }) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      // Overlay mode: Position it over existing content with Glassmorphism blur
      ...(overlay ? {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(5px)', // Magic line for blur!
        zIndex: 9999
      } : {
        // Normal mode
        height: fullScreen ? '100vh' : '100%',
        backgroundColor: fullScreen ? '#f8fafc' : 'transparent',
        minHeight: fullScreen ? 'auto' : '200px'
      })
    }}>
      <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        
        {/* The Sun / Center Core */}
        <div style={{ position: 'absolute', width: '16px', height: '16px', backgroundColor: '#fae52bff', borderRadius: '50%', boxShadow: '0 0 15px #6366f1' }}></div>
        
        {/* Inner Orbit Path & Planet */}
        <div style={{
          position: 'absolute', width: '40px', height: '40px', borderRadius: '50%',
          border: '1px dashed #cbd5e1',
          animation: 'spin 2s linear infinite'
        }}>
          {/* The Inner Planet */}
          <div style={{
            position: 'absolute', top: '-4px', left: '16px',
            width: '8px', height: '8px', backgroundColor: '#a855f7', borderRadius: '50%'
          }}></div>
        </div>

        {/* Outer Orbit Path & Planet */}
        <div style={{
          position: 'absolute', width: '70px', height: '70px', borderRadius: '50%',
          border: '1px solid #e2e8f0',
          animation: 'spin 4s linear infinite reverse'
        }}>
          {/* The Outer Planet */}
          <div style={{
            position: 'absolute', bottom: '8px', right: '4px',
            width: '10px', height: '10px', backgroundColor: '#3b82f6', borderRadius: '50%'
          }}></div>
        </div>

      </div>

      {/* Ek baar styles yahan define kar diye, taaki kisi aur CSS file par depend na hona pade */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};

export default GlobalLoader;
