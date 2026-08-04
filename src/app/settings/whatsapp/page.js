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

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <button 
        onClick={() => router.push('/settings')}
        style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}
      >
        &larr; Back to Main Settings
      </button>

      <div style={{ 
        background: 'rgba(255, 255, 255, 0.65)', 
        backdropFilter: 'blur(16px)', 
        borderRadius: '16px', 
        padding: '2.5rem', 
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        border: '1px solid rgba(255, 255, 255, 0.18)'
      }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', fontFamily: 'var(--font-outfit)' }}>Meta WhatsApp API</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.95rem' }}>Configure your Meta Cloud API credentials to enable incoming and outgoing WhatsApp messages for your organization.</p>

        {message.text && (
          <div style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', background: message.type === 'success' ? '#dcfce7' : '#fee2e2', color: message.type === 'success' ? '#166534' : '#991b1b', fontSize: '0.9rem', fontWeight: 500 }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Permanent Access Token</label>
            <input 
              type="password" 
              value={formData.whatsappAccessToken}
              onChange={(e) => setFormData({...formData, whatsappAccessToken: e.target.value})}
              placeholder="EAAI..." 
              required
              style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', fontFamily: 'monospace' }}
            />
            <small style={{ color: '#94a3b8', display: 'block', marginTop: '0.3rem' }}>Generate this from your Meta App Dashboard under WhatsApp &gt; API Setup.</small>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Phone Number ID</label>
            <input 
              type="text" 
              value={formData.whatsappPhoneNumberId}
              onChange={(e) => setFormData({...formData, whatsappPhoneNumberId: e.target.value})}
              placeholder="e.g. 123456789012345" 
              required
              style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', fontFamily: 'monospace' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>WhatsApp Business Account ID (WABA ID)</label>
            <input 
              type="text" 
              value={formData.whatsappWabaId}
              onChange={(e) => setFormData({...formData, whatsappWabaId: e.target.value})}
              placeholder="e.g. 987654321098765" 
              required
              style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', fontFamily: 'monospace' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={isSaving}
            style={{ 
              background: '#4f46e5', 
              color: 'white', 
              padding: '0.9rem', 
              borderRadius: '8px', 
              border: 'none', 
              fontWeight: 600, 
              fontSize: '1rem', 
              cursor: isSaving ? 'not-allowed' : 'pointer',
              marginTop: '1rem',
              transition: 'background 0.2s',
              opacity: isSaving ? 0.7 : 1
            }}
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </form>
      </div>
    </div>
  );
}
