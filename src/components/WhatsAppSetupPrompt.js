"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Button from "./ui/Button";

export default function WhatsAppSetupPrompt({ moduleName = "WhatsApp" }) {
  const router = useRouter();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      backgroundColor: '#f8fafc',
      minHeight: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2.5rem 1.5rem'
    }}>

      {/* Decorative Glow & Graphic */}
      <div style={{ marginBottom: '2rem', position: 'relative' }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '200px',
          height: '200px',
          backgroundColor: '#bbf7d0',
          borderRadius: '50%',
          filter: 'blur(50px)',
          opacity: 0.6,
          zIndex: 0
        }}></div>

        <div style={{
          position: 'relative',
          zIndex: 1,
          width: '120px',
          height: '120px',
          borderRadius: '32px',
          background: 'linear-gradient(145deg, #25D366 0%, #128C7E 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 20px 40px -10px rgba(37, 211, 102, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.2)',
          border: '4px solid #ffffff'
        }}>
          {/* Official Crisp Meta WhatsApp Vector Icon */}
          <svg width="68" height="68" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M41.87 6.13A23.86 23.86 0 0024.11 0C10.74 0 0 10.74 0 24.11a23.95 23.95 0 003.54 12.63L0 48l11.53-3.48a23.94 23.94 0 0012.58 3.55h.01c13.37 0 24.11-10.74 24.11-24.11a23.86 23.86 0 00-6.36-17.83z"
              fill="#ffffff"
            />
            <path
              d="M24.11 44.02a19.86 19.86 0 01-10.13-2.77l-.73-.43-7.53 2.27 2.28-7.34-.48-.76a19.92 19.92 0 01-3.05-10.88C4.47 13.31 13.27 4.51 24.11 4.51c5.24 0 10.17 2.04 13.88 5.75A19.53 19.53 0 0143.74 24.1c0 10.84-8.8 19.64-19.63 19.92z"
              fill="#25D366"
            />
            <path
              d="M34.52 28.51c-.57-.29-3.38-1.67-3.9-1.86-.53-.19-.91-.29-1.29.29-.38.57-1.48 1.86-1.81 2.24-.34.38-.67.43-1.24.14a15.7 15.7 0 01-4.63-2.85 17.3 17.3 0 01-3.2-3.99c-.33-.57-.04-.88.25-1.16.26-.26.57-.67.86-1 .28-.34.38-.57.57-.95.19-.38.1-.72-.05-1.01-.14-.29-1.29-3.1-1.77-4.24-.46-1.12-.93-.96-1.28-.98-.33-.02-.72-.02-1.1-.02-.38 0-1 .14-1.53.72-.53.57-2.01 1.96-2.01 4.78s2.06 5.54 2.34 5.93c.29.38 4.05 6.18 9.81 8.67 1.37.59 2.44.95 3.28 1.21 1.38.44 2.63.38 3.63.23 1.11-.17 3.38-1.38 3.86-2.72.48-1.34.48-2.48.33-2.72-.14-.24-.52-.38-1.09-.67z"
              fill="#ffffff"
            />
          </svg>
        </div>
      </div>

      {/* Text Info */}
      <div style={{ textAlign: 'center', maxWidth: '520px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '999px',
          backgroundColor: '#dcfce7',
          color: '#15803d',
          fontSize: '0.82rem',
          fontWeight: 600,
          marginBottom: '1rem'
        }}>
          <span>Official Meta Cloud API</span>
        </div>

        <h1 style={{
          fontSize: '2.1rem',
          fontWeight: '800',
          color: '#0f172a',
          marginBottom: '0.75rem',
          letterSpacing: '-0.02em',
          lineHeight: 1.2
        }}>
          Connect Your WhatsApp Business Account
        </h1>

        <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '2rem', fontSize: '0.96rem' }}>
          To unlock {moduleName === 'Campaigns' ? 'automated marketing broadcasts' : 'real-time 1-on-1 team messaging'} and automated deal notifications, connect your official Meta WhatsApp Business Account.
        </p>

        {/* Feature Highlights Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem 1.5rem',
          textAlign: 'left',
          marginBottom: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>✓</div>
              <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>Seamless Meta Embedded Signup (takes 60 seconds)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>✓</div>
              <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>Live 1-on-1 shared team inbox with CRM lead sync</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>✓</div>
              <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>Automated WhatsApp alerts on deal status and task updates</span>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            onClick={() => router.push('/settings/whatsapp')}
            style={{
              padding: '0.85rem 2rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              backgroundColor: '#0f172a',
              color: '#ffffff',
              borderRadius: '10px',
              boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.2)'
            }}
          >
            Connect with Meta ↗
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            style={{
              padding: '0.85rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: 500,
              borderRadius: '10px'
            }}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

