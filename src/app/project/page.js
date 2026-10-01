"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Button from "../../components/ui/Button";

export default function ProjectComingSoon() {
  const router = useRouter();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      backgroundColor: '#f8fafc',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>

      {/* Decorative SVG Illustration */}
      <div style={{ marginBottom: '2rem', position: 'relative' }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '180px',
          height: '180px',
          backgroundColor: '#e0e7ff',
          borderRadius: '50%',
          filter: 'blur(40px)',
          opacity: 0.7,
          zIndex: 0
        }}></div>

        <svg style={{ position: 'relative', zIndex: 1 }} width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Dashboard Frame */}
          <rect x="20" y="30" width="120" height="90" rx="8" fill="white" stroke="#c7d2fe" strokeWidth="4" />
          <path d="M20 50H140" stroke="#c7d2fe" strokeWidth="4" />
          {/* UI Elements */}
          <circle cx="35" cy="40" r="4" fill="#818cf8" />
          <circle cx="50" cy="40" r="4" fill="#a5b4fc" />
          <circle cx="65" cy="40" r="4" fill="#e0e7ff" />

          {/* Construction Elements */}
          <path d="M60 120V140" stroke="#4f46e5" strokeWidth="6" strokeLinecap="round" />
          <path d="M100 120V140" stroke="#4f46e5" strokeWidth="6" strokeLinecap="round" />
          <path d="M40 140H120" stroke="#4f46e5" strokeWidth="6" strokeLinecap="round" />

          {/* Gear / Cog */}
          <circle cx="80" cy="80" r="16" fill="white" stroke="#6366f1" strokeWidth="4" />
          <path d="M80 56V64M80 96V104M56 80H64M96 80H104M63 63L68.5 68.5M91.5 91.5L97 97M97 63L91.5 68.5M68.5 91.5L63 97" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" />
          <circle cx="80" cy="80" r="6" fill="#6366f1" />
        </svg>
      </div>

      <div style={{ textAlign: 'center', maxWidth: '500px' }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '800',
          color: '#1e293b',
          marginBottom: '1rem',
          letterSpacing: '-0.02em',
          background: 'linear-gradient(90deg, #4f46e5, #9333ea)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Projects Module
        </h1>

        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#475569', marginBottom: '1rem' }}>
          Coming Very Soon!
        </h2>

        <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
          We are currently crafting an amazing Projects Module for you.
          Soon, you'll be able to manage timelines, collaborate with your team,
          and track project milestones seamlessly inside Mooncliq CRM.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Button variant="primary" onClick={() => router.push('/dashboard')} style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
