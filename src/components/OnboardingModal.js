"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from './ui/Button';

export default function OnboardingModal({ onComplete }) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    avatarUrl: '',
    nickname: '',
    role: ''
  });

  // Photo ko AWS S3 par bhejkar uska Link nikalna
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await fetch(`/api/upload-url?file=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}&folder=avatars`);
      const data = await res.json();

      if (data.uploadUrl) {
        await fetch(data.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file
        });

        setFormData(prev => ({ ...prev, avatarUrl: data.fileUrl }));
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nickname.trim()) {
      return alert("Nickname is required!");
    }

    setIsSaving(true);
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const { tokens } = await fetchAuthSession();
      const token = tokens?.idToken?.toString();

      // Read any pending organization details saved during sign-up
      let orgData = {};
      try {
        const raw = localStorage.getItem('pending_org_setup');
        if (raw) orgData = JSON.parse(raw);
      } catch (e) {
        console.warn('Could not read pending_org_setup:', e);
      }

      const res = await fetch('/api/me/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          ...orgData
        })
      });

      if (res.ok) {
        try { localStorage.removeItem('pending_org_setup'); } catch (e) {}
        if (onComplete) onComplete();
        router.refresh();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Failed to complete onboarding.");
      }
    } catch (error) {
      console.error('Save error:', error);
      alert("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 };
  const modalBox = { background: '#fff', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', textAlign: 'center', position: 'relative' };
  const inputStyle = { width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '0.5rem', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={modalOverlay}>
      <div style={modalBox}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
          Welcome! Personalize your profile
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '2rem' }}>
          Tell us a bit about yourself to get started.
        </p>

        <div style={{ textAlign: 'left' }}>
          {/* Avatar Upload Box */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '90px', height: '90px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px dashed #cbd5e1', position: 'relative', cursor: 'pointer' }}>
              {formData.avatarUrl ? (
                <img src={formData.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '2rem', color: '#94a3b8' }}>👤</span>
              )}
              <input type="file" accept="image/*" onChange={handleFileUpload} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} disabled={isUploading} />
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>{isUploading ? "Uploading photo..." : "Click to upload photo"}</p>
          </div>

          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
            Nickname (Required)
            <input type="text" placeholder="e.g. Gaurav" value={formData.nickname} onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))} style={inputStyle} />
          </label>

          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginTop: '1.2rem' }}>
            Your Role
            <select value={formData.role} onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))} style={inputStyle}>
              <option value="">Select a role...</option>
              <option value="CEO/Founder">CEO / Founder</option>
              <option value="Sales Manager">Sales Manager</option>
              <option value="Agent">Agent / Representative</option>
            </select>
          </label>

          <Button onClick={handleSave} disabled={isSaving || isUploading} size="lg" style={{ width: '100%', marginTop: '2rem' }}>
            {isSaving ? "Saving..." : "Finish Setup ✓"}
          </Button>
        </div>
      </div>
    </div>
  );
}
