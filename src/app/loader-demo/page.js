"use client";
import React, { useState } from "react";
import GlobalLoader from "../../components/ui/GlobalLoader";

export default function LoaderDemo() {
  const [showOverlay, setShowOverlay] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f8fafc', padding: '3rem' }}>
      <h1 style={{ fontSize: '2rem', color: '#0f172a', marginBottom: '3rem', fontWeight: 800 }}>Loader Mockups</h1>
      
      <div style={{ display: 'flex', gap: '4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        
        {/* ========================================================= */}
        {/* LOADER 1: The Planetary Orbit (True Mooncliq Vibe)        */}
        {/* ========================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginBottom: '2rem', color: '#64748b' }}>1. The Planet Orbit</h3>
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
        </div>

        {/* ========================================================= */}
        {/* LOADER 2: The Pulse Wave (Apple-style smooth)             */}
        {/* ========================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginBottom: '2rem', color: '#64748b' }}>2. Pulse Wave</h3>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '60px' }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{
                width: '8px', height: '24px', backgroundColor: '#8b5cf6', borderRadius: '4px',
                animation: 'wave 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`
              }}></div>
            ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* LOADER 3: The Tech Radar (Modern CRM style)               */}
        {/* ========================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginBottom: '2rem', color: '#64748b' }}>3. Tech Radar</h3>
          <div style={{ position: 'relative', width: '60px', height: '60px' }}>
            <div style={{
              position: 'absolute', inset: 0, border: '3px solid #8b5cf6', borderRadius: '50%', opacity: 0,
              animation: 'radar 1.5s cubic-bezier(0.165, 0.84, 0.44, 1) infinite'
            }}></div>
            <div style={{
              position: 'absolute', inset: 0, border: '3px solid #8b5cf6', borderRadius: '50%', opacity: 0,
              animation: 'radar 1.5s cubic-bezier(0.165, 0.84, 0.44, 1) infinite',
              animationDelay: '0.5s'
            }}></div>
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: '12px', height: '12px', backgroundColor: '#8b5cf6', borderRadius: '50%'
            }}></div>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* LOADER 4: THE BLUR OVERLAY DEMO                           */}
      {/* ========================================================= */}
      <div style={{ marginTop: '4rem', width: '100%', maxWidth: '800px' }}>
        <h2 style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '1rem', textAlign: 'center' }}>Glassmorphism Blur Overlay Demo</h2>
        
        {/* A Mock Card with some text to be blurred */}
        <div style={{ 
          position: 'relative', overflow: 'hidden', 
          backgroundColor: 'white', padding: '3rem', borderRadius: '16px', 
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' 
        }}>
          
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Dummy CRM Form</h3>
          <p style={{ color: '#475569', marginBottom: '1rem' }}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
            This text will magically blur out when you click the button below.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
             <div style={{ height: '40px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}></div>
             <div style={{ height: '40px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}></div>
             <div style={{ height: '40px', backgroundColor: '#f1f5f9', borderRadius: '8px', gridColumn: 'span 2' }}></div>
          </div>

          <button 
            onClick={() => {
              setShowOverlay(true);
              // Auto-hide after 3 seconds so you aren't stuck!
              setTimeout(() => setShowOverlay(false), 3000);
            }}
            style={{ 
              padding: '12px 24px', backgroundColor: '#8b5cf6', color: 'white', 
              borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600
            }}
          >
            Save Data (Shows Overlay for 3s)
          </button>

          {/* HERE IS THE BLUR LOADER MAGIC! */}
          {showOverlay && (
             <GlobalLoader overlay={true} />
          )}

        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes wave {
          0%, 40%, 100% { transform: scaleY(0.4); opacity: 0.3; }
          20% { transform: scaleY(1.2); opacity: 1; }
        }
        @keyframes radar {
          0% { transform: scale(0.1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}} />
    </div>
  );
}
