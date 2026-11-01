"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "../../components/ui/Button";
import WhatsAppSetupPrompt from "@/components/WhatsAppSetupPrompt";
import GlobalLoader from "@/components/ui/GlobalLoader";

export default function CampaignsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const { tokens } = await fetchAuthSession();
        if (!tokens) {
          setIsLoading(false);
          return;
        }

        const token = tokens.idToken.toString();
        const res = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const userData = await res.json();
          const hasPhoneId = Boolean(userData?.organization?.whatsappPhoneNumberId);
          const hasToken = Boolean(userData?.organization?.whatsappAccessToken);
          setIsConfigured(hasPhoneId && hasToken);
        }
      } catch (error) {
        console.error("Failed to check configuration:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkConfig();
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flex: 1, height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <GlobalLoader />
      </div>
    );
  }

  // Agar WhatsApp API setup nahi hai to Setup Prompt dikhayenge
  if (!isConfigured) {
    return <WhatsAppSetupPrompt moduleName="Campaigns" />;
  }

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

          {/* Megaphone / Broadcast Icon */}
          <path d="M56 74L84 62V98L56 86V74Z" fill="white" stroke="#6366f1" strokeWidth="4" strokeLinejoin="round" />
          <path d="M60 86V100C60 102 62 104 64 104C66 104 68 102 68 100V84" fill="white" stroke="#4f46e5" strokeWidth="3" strokeLinejoin="round" />
          <rect x="46" y="75" width="10" height="10" rx="2" fill="#818cf8" />
          {/* Sound waves */}
          <path d="M96 70C100 75 100 85 96 90" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
          <path d="M105 64C111 72 111 88 105 96" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" />
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
          Campaigns Module
        </h1>

        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#475569', marginBottom: '1rem' }}>
          WhatsApp API Connected!
        </h2>

        <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
          Your WhatsApp Business API is connected. The broadcast campaign composer &amp; audience segmentation tool is coming very soon.
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
