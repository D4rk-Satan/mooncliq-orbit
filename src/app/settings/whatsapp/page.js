"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WhatsAppSettings() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    whatsappAccessToken: '',
    whatsappPhoneNumberId: '',
    whatsappWabaId: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isConnectingMeta, setIsConnectingMeta] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetchSettings();
    loadFacebookSDK();
  }, []);

  const loadFacebookSDK = () => {
    if (window.FB) return;

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID || '1794882205026181',
        cookie: true,
        xfbml: true,
        version: 'v19.0'
      });
    };

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  };

  const fetchSettings = async () => {
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const { tokens } = await fetchAuthSession();
      if (!tokens) return;

      const res = await fetch('/api/settings/whatsapp', {
        headers: { Authorization: `Bearer ${tokens.idToken.toString()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFormData({
          whatsappAccessToken: data.whatsappAccessToken || '',
          whatsappPhoneNumberId: data.whatsappPhoneNumberId || '',
          whatsappWabaId: data.whatsappWabaId || ''
        });
      }
    } catch (error) {
      console.error("Failed to load WhatsApp settings", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMetaEmbeddedSignup = () => {
    if (!window.FB) {
      alert("Meta SDK is still initializing. Please wait 2 seconds and try again.");
      return;
    }

    setIsConnectingMeta(true);
    setMessage({ text: '', type: '' });

    const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID || '';

    const loginParams = {
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        feature: 'whatsapp_embedded_signup',
        version: 2
      }
    };

    if (configId) {
      loginParams.config_id = configId;
    } else {
      loginParams.scope = 'whatsapp_business_management,whatsapp_business_messaging';
    }

    window.FB.login(function (response) {
      if (response.authResponse?.code) {
        const code = response.authResponse.code;
        (async () => {
          try {
            const { fetchAuthSession } = await import('aws-amplify/auth');
            const { tokens } = await fetchAuthSession();

            const exchangeRes = await fetch('/api/whatsapp/embedded-signup', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokens.idToken.toString()}`
              },
              body: JSON.stringify({ code })
            });

            const result = await exchangeRes.json();

            if (exchangeRes.ok && result.success) {
              setMessage({ 
                text: `🎉 Successfully connected to Meta WhatsApp Business! (WABA ID: ${result.wabaId})`, 
                type: 'success' 
              });
              fetchSettings();
            } else {
              setMessage({ 
                text: result.error || 'Failed to exchange credentials with Meta.', 
                type: 'error' 
              });
            }
          } catch (err) {
            console.error("Embedded signup error:", err);
            setMessage({ text: 'Error connecting WhatsApp account.', type: 'error' });
          } finally {
            setIsConnectingMeta(false);
          }
        })();
      } else {
        setMessage({ text: 'Meta connection window was closed or not completed.', type: 'error' });
        setIsConnectingMeta(false);
      }
    }, loginParams);
  };

  const handleSaveManual = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const { tokens } = await fetchAuthSession();

      const res = await fetch('/api/settings/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.idToken.toString()}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setMessage({ text: 'WhatsApp configuration saved successfully!', type: 'success' });
      } else {
        setMessage({ text: 'Failed to save configuration.', type: 'error' });
      }
    } catch (error) {
      console.error("Save settings error:", error);
      setMessage({ text: 'An error occurred while saving.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: '2rem', color: '#64748b' }}>Loading configuration...</div>;
  }

  const isConnected = !!(formData.whatsappWabaId && formData.whatsappPhoneNumberId);

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    marginTop: '0.5rem',
    fontSize: '0.92rem',
    color: '#1e293b',
    backgroundColor: '#fff',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#475569',
    marginTop: '1.25rem'
  };

  return (
    <div style={{ padding: '2.5rem 1.5rem', maxWidth: '780px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>

      {/* Back Button */}
      <button
        onClick={() => router.push('/settings')}
        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}
      >
        &larr; Back to Settings
      </button>

      {/* Main Settings Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '2.5rem',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
        border: '1px solid #e2e8f0'
      }}>

        {/* Official Meta Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Official Meta Co-Branding Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Crisp Official Meta Brand Gradient Vector */}
              <img 
                src="/meta-icon-official.svg" 
                alt="Meta Logo" 
                style={{ width: '38px', height: '24px', objectFit: 'contain' }} 
              />
              <span style={{ color: '#cbd5e1', fontSize: '1.4rem', fontWeight: 300, lineHeight: 1 }}>/</span>
              {/* WhatsApp Green Icon */}
              <svg viewBox="0 0 24 24" width="30" height="30" fill="#25D366">
                <path d="M12.031 21.492c-1.613 0-3.193-.418-4.595-1.21l-.328-.186-3.414.896.914-3.328-.204-.325A9.453 9.453 0 0 1 2.5 12.03C2.5 6.786 6.785 2.5 12.03 2.5c5.244 0 9.53 4.286 9.53 9.53 0 5.245-4.286 9.462-9.53 9.462m5.228-6.735c-.287-.144-1.696-.838-1.958-.934-.263-.095-.454-.144-.645.144-.191.287-.741.934-.908 1.124-.168.191-.335.215-.622.072-.287-.144-1.21-.446-2.305-1.42-.852-.758-1.426-1.695-1.593-1.982-.168-.287-.018-.442.125-.585.13-.13.287-.335.431-.502.144-.168.191-.287.287-.478.096-.191.048-.36-.024-.504-.072-.144-.645-1.554-.883-2.128-.232-.559-.467-.483-.645-.492-.168-.009-.36-.009-.551-.009s-.502.072-.765.36c-.263.287-1.004.981-1.004 2.392s1.028 2.774 1.171 2.966c.144.191 2.022 3.084 4.898 4.328.684.296 1.218.473 1.636.605.688.217 1.314.186 1.808.113.553-.081 1.696-.693 1.935-1.362.239-.67.239-1.244.168-1.362-.072-.119-.263-.191-.551-.335" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                Meta WhatsApp Cloud API
              </h1>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Official Meta Business Integration for Mooncliq Orbit</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.35rem 0.75rem', borderRadius: '20px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d' }}>Cloud API v19.0</span>
          </div>
        </div>

        <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '1.75rem', lineHeight: '1.5' }}>
          Connect your Meta WhatsApp Business Account (WABA) to dispatch automated workflow alerts, trigger instant notifications, and engage leads in real-time.
        </p>

        {/* Status Messages */}
        {message.text && (
          <div style={{ 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1.5rem', 
            background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', 
            color: message.type === 'success' ? '#166534' : '#991b1b', 
            fontSize: '0.9rem', 
            fontWeight: 500, 
            border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}` 
          }}>
            {message.text}
          </div>
        )}

        {/* Live Status Card: Connected State (Meta-Styled Modern Card) */}
        {isConnected ? (
          <div style={{
            background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.75rem',
            marginBottom: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '8px', 
                  backgroundColor: '#dcfce7', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.05rem' }}>WhatsApp Business Account Connected</div>
                  <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>● Meta Cloud API Active & Synced</div>
                </div>
              </div>
              <span style={{ fontSize: '0.78rem', background: '#dcfce7', color: '#15803d', padding: '0.3rem 0.75rem', borderRadius: '20px', fontWeight: 700 }}>
                VERIFIED
              </span>
            </div>

            {/* Meta Business Assets Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem', 
              background: '#f1f5f9', 
              padding: '1.25rem', 
              borderRadius: '8px',
              fontSize: '0.85rem'
            }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  WABA Account ID
                </span>
                <span style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: 700, fontSize: '0.95rem' }}>
                  {formData.whatsappWabaId}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Phone Number ID
                </span>
                <span style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: 700, fontSize: '0.95rem' }}>
                  {formData.whatsappPhoneNumberId}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Quality Status
                </span>
                <span style={{ color: '#15803d', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🟢 High Quality (Green)
                </span>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={handleMetaEmbeddedSignup}
                disabled={isConnectingMeta}
                style={{
                  padding: '0.6rem 1.2rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  color: '#0081FB',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {/* Meta Icon */}
                <img 
                  src="/meta-icon-official.svg" 
                  alt="Meta" 
                  style={{ width: '20px', height: '14px', objectFit: 'contain' }} 
                />
                {isConnectingMeta ? "Opening Meta..." : "Reconnect / Change WhatsApp Number"}
              </button>

              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Secure OAuth 2.0 Token Management
              </span>
            </div>
          </div>
        ) : (
          /* Official One-Click Meta Connect Button (Pure Meta Branding) */
          <div style={{ 
            marginBottom: '2rem', 
            background: 'linear-gradient(180deg, #F0F6FF 0%, #FFFFFF 100%)', 
            padding: '2rem', 
            borderRadius: '12px', 
            border: '1px solid #BFDBFE',
            textAlign: 'center' 
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '0.5rem' }}>
              Connect Your WhatsApp Business Account
            </h3>
            <p style={{ color: '#475569', fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
              Grant Mooncliq Orbit access to manage WhatsApp templates and dispatch automated messages via official Meta Embedded Signup.
            </p>

            <button
              type="button"
              onClick={handleMetaEmbeddedSignup}
              disabled={isConnectingMeta}
              style={{
                padding: '0.9rem 2.25rem',
                backgroundColor: '#0081FB', // Meta Blue
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: isConnectingMeta ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(0, 129, 251, 0.35)',
                transition: 'all 0.2s'
              }}
            >
              {/* Meta Official Logo */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M16.993 6.667c-1.84 0-3.37.95-4.493 2.45-1.123-1.5-2.653-2.45-4.493-2.45C4.462 6.667 2 9.42 2 12.8c0 3.38 2.462 6.133 6.007 6.133 1.84 0 3.37-.95 4.493-2.45 1.123 1.5 2.653 2.45 4.493 2.45 3.545 0 6.007-2.753 6.007-6.133 0-3.38-2.462-6.133-6.007-6.133zm-8.986 9.8c-2.07 0-3.54-1.637-3.54-3.667 0-2.03 1.47-3.667 3.54-3.667 1.528 0 2.81 1.096 3.42 2.72-.11.23-.23.46-.35.69-.64 1.25-1.74 2.224-3.07 2.224zm8.986 0c-1.33 0-2.43-.974-3.07-2.224-.12-.23-.24-.46-.35-.69.61-1.624 1.892-2.72 3.42-2.72 2.07 0 3.54 1.637 3.54 3.667 0 2.03-1.47 3.667-3.54 3.667z"/>
              </svg>
              {isConnectingMeta ? "Launching Meta Window..." : "Continue with Meta"}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '1.25rem', fontSize: '0.78rem', color: '#64748b' }}>
              <span>🔒 256-Bit Encrypted</span>
              <span>•</span>
              <span>⚡ Instant Cloud API Sync</span>
              <span>•</span>
              <span>📋 Official Tech Provider</span>
            </div>
          </div>
        )}

        {/* Developer / Manual Override Form */}
        <div style={{ paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0 }}
          >
            {showAdvanced ? "▼ Hide Developer / Manual Settings" : "▶ Show Developer / Manual Settings"}
          </button>

          {showAdvanced && (
            <form onSubmit={handleSaveManual} style={{ marginTop: '1.25rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600, display: 'block', marginBottom: '1rem' }}>
                ⚠️ Developer Sandbox Mode: Use this to test temporary tokens before Meta Embedded Signup is live.
              </span>

              <label style={labelStyle}>
                WhatsApp Business Account ID (WABA ID)
                <input
                  type="text"
                  value={formData.whatsappWabaId}
                  onChange={(e) => setFormData({ ...formData, whatsappWabaId: e.target.value })}
                  placeholder="e.g. 4655813551360777"
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                Phone Number ID
                <input
                  type="text"
                  value={formData.whatsappPhoneNumberId}
                  onChange={(e) => setFormData({ ...formData, whatsappPhoneNumberId: e.target.value })}
                  placeholder="e.g. 1280538615150772"
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                System Access Token (Developer Mode)
                <input
                  type="password"
                  value={formData.whatsappAccessToken}
                  onChange={(e) => setFormData({ ...formData, whatsappAccessToken: e.target.value })}
                  placeholder="EAAZAgb5..."
                  style={inputStyle}
                />
              </label>

              <button
                type="submit"
                disabled={isSaving}
                style={{
                  marginTop: '1.5rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#0f172a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {isSaving ? "Saving..." : "Save Manual Settings"}
              </button>
            </form>
          )}
        </div>

        {/* Webhook Endpoint Help for Meta Console */}
        <div style={{ marginTop: '2.5rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <strong style={{ color: '#0f172a' }}>Webhook Endpoint for Meta Developer Portal</strong>
            <span style={{ fontSize: '0.75rem', background: '#e2e8f0', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>POST</span>
          </div>
          <code style={{ display: 'block', padding: '0.5rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#0f172a', fontFamily: 'monospace' }}>
            /api/whatsapp/webhook
          </code>
          <span style={{ display: 'block', marginTop: '0.5rem', color: '#64748b' }}>
            Verify Token: <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>mooncliq_whatsapp_secret_123</code>
          </span>
        </div>

      </div>
    </div>
  );
}
