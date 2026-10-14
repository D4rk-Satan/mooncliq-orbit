"use client";
import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import toast from 'react-hot-toast';

export default function ProfileSettingsView() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);


  const [profileData, setProfileData] = useState({
    avatarUrl: '',
    nickname: '',
    role: '',
    logoUrl: '',
    companyName: '',
    industry: '',
    teamSize: '',
    gstNumber: ''
  });

  const [isAdmin, setIsAdmin] = useState(false);

  // 1. Fetch Existing Data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const { tokens } = await fetchAuthSession();
        const token = tokens?.idToken?.toString();

        const res = await fetch('/api/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setProfileData({
            avatarUrl: data.profile?.avatarUrl || '',
            nickname: data.profile?.nickname || '',
            role: data.profile?.role || '',
            logoUrl: data.organization?.logoUrl || '',
            companyName: data.organization?.name || '',
            industry: data.organization?.industry || '',
            teamSize: data.organization?.teamSize || '',
            gstNumber: data.organization?.gstNumber || ''
          });
          setIsAdmin(data.profile?.canManageUsers === true);
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // 2. Photo Upload to S3 (5MB Limit + Auto Compression)
  const handleFileUpload = async (e, folder) => {
    const file = e.target.files[0];
    if (!file) return;

    // Max 5MB Limit check
    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File size must be less than ${MAX_SIZE_MB}MB`);
      e.target.value = '';
      return;
    }

    const isAvatar = folder === 'avatars';
    if (isAvatar) setIsUploadingAvatar(true);
    else setIsUploadingLogo(true);

    try {
      // Auto compress image
      let fileToUpload = file;
      try {
        const imageCompression = (await import('browser-image-compression')).default;
        const options = {
          maxSizeMB: 0.5, // Compress to max 500KB
          maxWidthOrHeight: 1024,
          useWebWorker: true
        };
        fileToUpload = await imageCompression(file, options);
      } catch (compErr) {
        console.warn('Compression skipped, uploading original file:', compErr);
      }

      const res = await fetch(`/api/upload-url?file=${encodeURIComponent(fileToUpload.name || file.name)}&fileType=${encodeURIComponent(fileToUpload.type || file.type)}&folder=${folder}`);
      const data = await res.json();

      if (data.uploadUrl) {
        await fetch(data.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': fileToUpload.type || file.type },
          body: fileToUpload
        });

        if (folder === 'avatars') {
          setProfileData(prev => ({ ...prev, avatarUrl: data.fileUrl }));
          toast.success("Profile photo updated!");
        }
        if (folder === 'logos') {
          setProfileData(prev => ({ ...prev, logoUrl: data.fileUrl }));
          toast.success("Organization logo updated!");
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Failed to upload image.");
    } finally {
      if (isAvatar) setIsUploadingAvatar(false);
      else setIsUploadingLogo(false);
      e.target.value = '';
    }
  };


  // 3. Save Changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const { tokens } = await fetchAuthSession();
      const token = tokens?.idToken?.toString();

      const res = await fetch('/api/me/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      if (res.ok) {
        toast.success("Profile updated successfully! Refresh page to see changes in sidebar");
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to save changes.");
      }

    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: '#64748b' }}>Loading profile...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Profile & Organization</h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0.25rem 0 0 0' }}>Update your personal details and company information.</p>
      </div>

      {/* Personal Settings Card */}
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.15rem', color: '#0f172a', fontWeight: 600 }}>Personal Details</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '2rem' }}>
          {/* Avatar Area */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#f1f5f9', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto', overflow: 'hidden' }}>
              {profileData.avatarUrl ? (
                <img src={profileData.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '2.5rem', color: '#94a3b8' }}>👤</span>
              )}
            </div>

            <label style={{ color: '#4f46e5', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
              {isUploadingAvatar ? 'Uploading...' : 'Change Photo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'avatars')} disabled={isUploadingAvatar} />
            </label>
          </div>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Nickname / Name</label>
              <input type="text" value={profileData.nickname} onChange={(e) => setProfileData({ ...profileData, nickname: e.target.value })} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Job Role</label>
              <input type="text" value={profileData.role} onChange={(e) => setProfileData({ ...profileData, role: e.target.value })} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Organization Settings Card (Only for Admins) */}
      {isAdmin && (
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.15rem', color: '#0f172a', fontWeight: 600 }}>Organization Details</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '2rem' }}>
            {/* Logo Area */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '8px', backgroundColor: '#f1f5f9', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto', overflow: 'hidden' }}>
                {profileData.logoUrl ? (
                  <img src={profileData.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '0.5rem' }} />
                ) : (
                  <span style={{ fontSize: '2.5rem', color: '#94a3b8' }}>🏢</span>
                )}
              </div>
              <label style={{ color: '#4f46e5', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                {isUploadingLogo ? 'Uploading...' : 'Change Logo'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'logos')} disabled={isUploadingLogo} />
              </label>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Company Name (Cannot change)</label>
                <input type="text" value={profileData.companyName} readOnly style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', fontSize: '0.95rem', color: '#94a3b8' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>GST Number</label>
                <input
                  type="text"
                  placeholder="24Axxxxxxxxxxxxx (Optional)"
                  maxLength={15}
                  value={profileData.gstNumber || ''}
                  onChange={(e) => setProfileData({ ...profileData, gstNumber: e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '') })}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Industry</label>
                  <select value={profileData.industry} onChange={(e) => setProfileData({ ...profileData, industry: e.target.value })} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', backgroundColor: 'white' }}>
                    <option value="">Select Industry...</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Software">Software & IT</option>
                    <option value="Agency">Marketing Agency</option>
                    <option value="Textile">Textile</option>
                    <option value="ecommerce">E-Commerce</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Team Size</label>
                  <select value={profileData.teamSize} onChange={(e) => setProfileData({ ...profileData, teamSize: e.target.value })} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', backgroundColor: 'white' }}>
                    <option value="">Select Size...</option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="201+">201+</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'right' }}>
        <Button onClick={handleSave} disabled={isSaving || isUploadingAvatar || isUploadingLogo} style={{ padding: '0.75rem 2.5rem' }}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

    </div>
  );
}
