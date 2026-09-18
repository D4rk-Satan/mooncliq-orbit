"use client";
import React, { useState, useEffect } from 'react';

export default function ProfileSettingsView() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [profileData, setProfileData] = useState({
    avatarUrl: '',
    nickname: '',
    role: '',
    logoUrl: '',
    companyName: '',
    industry: '',
    teamSize: ''
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
            teamSize: data.organization?.teamSize || ''
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

  // 2. Photo Upload to S3
  const handleFileUpload = async (e, folder) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await fetch(`/api/upload-url?file=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}&folder=${folder}`);
      const data = await res.json();

      if (data.uploadUrl) {
        await fetch(data.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file
        });

        if (folder === 'avatars') setProfileData({ ...profileData, avatarUrl: data.fileUrl });
        if (folder === 'logos') setProfileData({ ...profileData, logoUrl: data.fileUrl });
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert("Failed to upload image.");
    } finally {
      setIsUploading(false);
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
        alert("Profile updated successfully! (Refresh page to see changes in sidebar)");
      } else {
        alert("Failed to save changes.");
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
              {isUploading ? 'Uploading...' : 'Change Photo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'avatars')} disabled={isUploading} />
            </label>
          </div>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Nickname / Name</label>
              <input type="text" value={profileData.nickname} onChange={(e) => setProfileData({...profileData, nickname: e.target.value})} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Job Role</label>
              <input type="text" value={profileData.role} onChange={(e) => setProfileData({...profileData, role: e.target.value})} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }} />
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
                {isUploading ? 'Uploading...' : 'Change Logo'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'logos')} disabled={isUploading} />
              </label>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Company Name (Cannot change)</label>
                <input type="text" value={profileData.companyName} readOnly style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', fontSize: '0.95rem', color: '#94a3b8' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Industry</label>
                  <select value={profileData.industry} onChange={(e) => setProfileData({...profileData, industry: e.target.value})} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', backgroundColor: 'white' }}>
                    <option value="">Select Industry...</option>
                    <option value="software">Software & IT</option>
                    <option value="ecommerce">E-Commerce</option>
                    <option value="marketing">Marketing & Agency</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Team Size</label>
                  <select value={profileData.teamSize} onChange={(e) => setProfileData({...profileData, teamSize: e.target.value})} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', backgroundColor: 'white' }}>
                    <option value="">Select Size...</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'right' }}>
        <button onClick={handleSave} disabled={isSaving || isUploading} style={{ padding: '0.75rem 2.5rem', backgroundColor: isSaving ? '#94a3b8' : '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.3)' }}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

    </div>
  );
}
