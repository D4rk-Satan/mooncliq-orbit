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
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(true);

  // Naya state: Advanced (Developer) mode dikhane ke liye
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

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

  const handleSave = async (e) => {
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

  // Common input styling for a clean look
  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    marginTop: '0.5rem',
    fontSize: '0.95rem',
    color: '#334155',
    backgroundColor: '#fff',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#475569',
    marginTop: '1.5rem'
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>

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
        borderRadius: '12px',
        padding: '2.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0'
      }}>

        {/* Header Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
          {/* WhatsApp SVG Icon */}
          <svg viewBox="0 0 24 24" width="32" height="32" fill="#25D366">
            <path d="M12.031 21.492c-1.613 0-3.193-.418-4.595-1.21l-.328-.186-3.414.896.914-3.328-.204-.325A9.453 9.453 0 0 1 2.5 12.03C2.5 6.786 6.785 2.5 12.03 2.5c5.244 0 9.53 4.286 9.53 9.53 0 5.245-4.286 9.462-9.53 9.462m5.228-6.735c-.287-.144-1.696-.838-1.958-.934-.263-.095-.454-.144-.645.144-.191.287-.741.934-.908 1.124-.168.191-.335.215-.622.072-.287-.144-1.21-.446-2.305-1.42-.852-.758-1.426-1.695-1.593-1.982-.168-.287-.018-.442.125-.585.13-.13.287-.335.431-.502.144-.168.191-.287.287-.478.096-.191.048-.36-.024-.504-.072-.144-.645-1.554-.883-2.128-.232-.559-.467-.483-.645-.492-.168-.009-.36-.009-.551-.009s-.502.072-.765.36c-.263.287-1.004.981-1.004 2.392s1.028 2.774 1.171 2.966c.144.191 2.022 3.084 4.898 4.328.684.296 1.218.473 1.636.605.688.217 1.314.186 1.808.113.553-.081 1.696-.693 1.935-1.362.239-.67.239-1.244.168-1.362-.072-.119-.263-.191-.551-.335" />
          </svg>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>WhatsApp Business API</h1>
        </div>

        <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>
          Connect your WhatsApp Business Account (WABA) to start sending automated messages and campaigns.
        </p>

        {/* Connect Meta Button (Dummy UI for now until Meta App is verified) */}
        <button style={{
          width: '100%',
          padding: '0.85rem',
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '2rem',
          boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
        }}>
          Connect with Meta &rarr;
        </button>

        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', marginBottom: '1.5rem' }} />

        {/* Status Messages */}
        {message.text && (
          <div style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', color: message.type === 'success' ? '#166534' : '#991b1b', fontSize: '0.9rem', fontWeight: 500, border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave}>

          <label style={labelStyle}>
            WhatsApp Business Account ID (WABA ID)
            <input
              type="text"
              value={formData.whatsappWabaId}
              onChange={(e) => setFormData({ ...formData, whatsappWabaId: e.target.value })}
              placeholder="e.g. 109834571239857"
              style={inputStyle}
            />
            <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.3rem' }}>Found in Meta Events Manager</span>
          </label>

          <label style={labelStyle}>
            Phone Number ID
            <input
              type="text"
              value={formData.whatsappPhoneNumberId}
              onChange={(e) => setFormData({ ...formData, whatsappPhoneNumberId: e.target.value })}
              placeholder="e.g. 121088764532"
              style={inputStyle}
            />
            <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.3rem' }}>Found in Meta App Settings</span>
          </label>

          {/* Advanced / Developer Mode Toggle */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed #cbd5e1' }}>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0 }}
            >
              {showAdvanced ? "▼ Hide Advanced Settings" : "▶ Show Advanced Settings (Test Token)"}
            </button>

            {showAdvanced && (
              <label style={{ ...labelStyle, marginTop: '1rem' }}>
                System Access Token (Developer Mode)
                <input
                  type="password"
                  value={formData.whatsappAccessToken}
                  onChange={(e) => setFormData({ ...formData, whatsappAccessToken: e.target.value })}
                  placeholder="Paste your 24-hour test token here..."
                  style={inputStyle}
                />
                <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.3rem' }}>Leave blank if connecting via official Meta popup.</span>
              </label>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: isSaving ? '#94a3b8' : '#0f172a',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer'
              }}
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>

            <button
              type="button"
              onClick={() => router.push('/settings')}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: 'transparent',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
