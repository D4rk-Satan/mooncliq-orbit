"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingModal({ isAdmin = false, onComplete }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    avatarUrl: '',
    nickname: '',
    role: '',
    logoUrl: '',
    industry: '',
    teamSize: ''
  });

  // Photo ko AWS S3 par bhejkar uska Link nikalna
  const handleFileUpload = async (e, folder) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 1. Backend se Ticket (Pre-signed URL) maangna
      const res = await fetch(`/api/upload-url?file=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}&folder=${folder}`);
      const data = await res.json();

      if (data.uploadUrl) {
        // 2. Browser se direct AWS S3 me photo fekna
        await fetch(data.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file
        });

        // 3. Permanent link ko form me save karna
        if (folder === 'avatars') setFormData({ ...formData, avatarUrl: data.fileUrl });
        if (folder === 'logos') setFormData({ ...formData, logoUrl: data.fileUrl });
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleNext = () => {
    if (!formData.nickname) return alert("Nickname is required!");
    if (isAdmin) setStep(2); // Admin ko Step 2 (Company Details) dikhana
    else handleSave(); // Employee hai toh seedha save kardo
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. AWS Amplify se secure token nikalo
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const { tokens } = await fetchAuthSession();
      const token = tokens?.idToken?.toString();

      // 2. Token ko API ke 'headers' me bhej do!
      const res = await fetch('/api/me/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // <-- Ye line miss ho gayi thi!
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        if (onComplete) onComplete();
        router.refresh();
      } else {
        console.error("Failed to save");
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };


  // --- Inline Styles (For Premium Look) ---
  const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 };
  const modalBox = { background: '#fff', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', textAlign: 'center', position: 'relative' };
  const inputStyle = { width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '0.5rem', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' };
  const buttonStyle = { width: '100%', padding: '0.85rem', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', marginTop: '2rem' };

  return (
    <div style={modalOverlay}>
      <div style={modalBox}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
          Welcome! Let's personalize your experience
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '2rem' }}>
          {step === 1 ? "Tell us a bit about yourself." : "Tell us about your organization."}
        </p>

        {/* STEP 1: Personal Details */}
        {step === 1 && (
          <div style={{ textAlign: 'left' }}>
            {/* Avatar Upload Box */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px dashed #cbd5e1', position: 'relative', cursor: 'pointer' }}>
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '2rem', color: '#94a3b8' }}>👤</span>
                )}
                {/* Hidden File Input */}
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'avatars')} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>{isUploading ? "Uploading..." : "Click to upload photo"}</p>
            </div>

            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
              Nickname (Required)
              <input type="text" placeholder="e.g. Gaurav" value={formData.nickname} onChange={(e) => setFormData({ ...formData, nickname: e.target.value })} style={inputStyle} />
            </label>

            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginTop: '1.2rem' }}>
              Your Role
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} style={inputStyle}>
                <option value="">Select a role...</option>
                <option value="CEO/Founder">CEO / Founder</option>
                <option value="Sales Manager">Sales Manager</option>
                <option value="Agent">Agent / Representative</option>
              </select>
            </label>

            <button onClick={handleNext} style={buttonStyle}>
              {isAdmin ? "Continue \u2192" : "Finish Setup \u2713"}
            </button>
          </div>
        )}

        {/* STEP 2: Company Details (Only for Admins) */}
        {step === 2 && (
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '12px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px dashed #cbd5e1', position: 'relative', cursor: 'pointer' }}>
                {formData.logoUrl ? (
                  <img src={formData.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '2rem', color: '#94a3b8' }}>🏢</span>
                )}
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'logos')} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>{isUploading ? "Uploading..." : "Upload Company Logo"}</p>
            </div>

            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
              Industry
              <select value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} style={inputStyle}>
                <option value="">Select industry...</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Software">Software / IT</option>
                <option value="Agency">Marketing Agency</option>
                <option value="Other">Other</option>
                <option value="Textile">Textile</option>
              </select>
            </label>

            <button onClick={handleSave} disabled={isSaving} style={buttonStyle}>
              {isSaving ? "Saving..." : "Finish Setup \u2713"}
            </button>
            <button onClick={() => setStep(1)} style={{ width: '100%', background: 'none', border: 'none', color: '#64748b', marginTop: '1rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              &larr; Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
