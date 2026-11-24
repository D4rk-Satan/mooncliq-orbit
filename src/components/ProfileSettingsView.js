"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Button from './ui/Button';
import toast from 'react-hot-toast';

export default function ProfileSettingsView({ onDirtyChange, shakeTrigger = 0 }) {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Original pristine data from backend (for discard / dirty tracking)
  const [initialData, setInitialData] = useState(null);

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
  const [designations, setDesignations] = useState([]);
  const [nickCheckStatus, setNickCheckStatus] = useState(null); // 'checking' | 'available' | 'taken'

  // Ref to hold pending photo files for deferred upload upon Save Changes
  const pendingFilesRef = useRef({ avatar: null, logo: null });

  // 1. Fetch Existing Data & Designations
  useEffect(() => {
    const fetchProfileAndDesignations = async () => {
      try {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const { tokens } = await fetchAuthSession();
        const token = tokens?.idToken?.toString();

        const [meRes, desigRes] = await Promise.all([
          fetch('/api/me', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/designations', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (meRes.ok) {
          const data = await meRes.json();
          const loaded = {
            avatarUrl: data.avatarUrl || data.profile?.avatarUrl || '',
            nickname: data.nickname || data.profile?.nickname || '',
            role: data.role || data.profile?.role || '',
            logoUrl: data.organization?.logoUrl || '',
            companyName: data.organization?.name || '',
            industry: data.organization?.industry || '',
            teamSize: data.organization?.teamSize || '',
            gstNumber: data.organization?.gstNumber || ''
          };
          setProfileData(loaded);
          setInitialData(loaded);
          setIsAdmin(data.profile?.canManageUsers === true);
        }

        if (desigRes.ok) {
          const dData = await desigRes.json();
          setDesignations(dData.designations || []);
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileAndDesignations();
  }, []);

  // 2. Debounced Nickname Check (excludes own current nickname)
  useEffect(() => {
    const trimmed = (profileData.nickname || '').trim().toLowerCase();
    const initialTrimmed = (initialData?.nickname || '').trim().toLowerCase();

    if (!trimmed || trimmed === initialTrimmed || trimmed.length < 2) {
      setNickCheckStatus(null);
      return;
    }

    setNickCheckStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const { tokens } = await fetchAuthSession();
        const token = tokens?.idToken?.toString();

        const res = await fetch(`/api/auth/check-nickname?nickname=${encodeURIComponent(trimmed)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setNickCheckStatus(data.available ? 'available' : 'taken');
      } catch (e) {
        setNickCheckStatus(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [profileData.nickname, initialData?.nickname]);

  // 3. Compute isDirty (hasUnsavedChanges) & notify parent
  const isDirty = useMemo(() => {
    if (!initialData) return false;
    return (
      (profileData.nickname || '') !== (initialData.nickname || '') ||
      (profileData.role || '') !== (initialData.role || '') ||
      (profileData.avatarUrl || '') !== (initialData.avatarUrl || '') ||
      (profileData.logoUrl || '') !== (initialData.logoUrl || '') ||
      (profileData.industry || '') !== (initialData.industry || '') ||
      (profileData.teamSize || '') !== (initialData.teamSize || '') ||
      (profileData.gstNumber || '') !== (initialData.gstNumber || '')
    );
  }, [profileData, initialData]);

  useEffect(() => {
    if (onDirtyChange) onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  // Shake trigger from parent / blocked navigation
  useEffect(() => {
    if (shakeTrigger > 0) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [shakeTrigger]);

  // 4. BeforeUnload listener if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // 5. Photo Selection with Instant Local Preview (Upload happens on Save)
  const handlePhotoSelect = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File size must be less than ${MAX_SIZE_MB}MB`);
      e.target.value = '';
      return;
    }

    // Local object URL for instant preview
    const previewUrl = URL.createObjectURL(file);
    if (type === 'avatars') {
      pendingFilesRef.current.avatar = file;
      setProfileData(prev => ({ ...prev, avatarUrl: previewUrl }));
    } else {
      pendingFilesRef.current.logo = file;
      setProfileData(prev => ({ ...prev, logoUrl: previewUrl }));
    }
  };

  // Helper to upload a single file to S3
  const uploadFileToS3 = async (file, folder) => {
    let fileToUpload = file;
    try {
      const imageCompression = (await import('browser-image-compression')).default;
      fileToUpload = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      });
    } catch (compErr) {
      console.warn('Compression skipped:', compErr);
    }

    const res = await fetch(`/api/upload-url?file=${encodeURIComponent(fileToUpload.name || file.name)}&fileType=${encodeURIComponent(fileToUpload.type || file.type)}&folder=${folder}`);
    const data = await res.json();
    if (data.uploadUrl) {
      await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': fileToUpload.type || file.type },
        body: fileToUpload
      });
      return data.fileUrl;
    }
    throw new Error("Failed to obtain upload URL");
  };

  // 6. Discard Changes
  const handleDiscard = () => {
    if (!initialData) return;
    setProfileData({ ...initialData });
    pendingFilesRef.current = { avatar: null, logo: null };
    setNickCheckStatus(null);
    toast("Changes discarded", { icon: '↩️' });
  };

  // 7. Save Changes
  const handleSave = async () => {
    if (!profileData.nickname?.trim()) {
      toast.error("Nickname is required!");
      return;
    }
    if (nickCheckStatus === 'taken') {
      toast.error("This nickname is already taken in your organization.");
      return;
    }

    setIsSaving(true);
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const { tokens } = await fetchAuthSession();
      const token = tokens?.idToken?.toString();

      let finalAvatarUrl = profileData.avatarUrl;
      let finalLogoUrl = profileData.logoUrl;

      // Upload avatar if new file is pending
      if (pendingFilesRef.current.avatar) {
        setIsUploadingAvatar(true);
        try {
          finalAvatarUrl = await uploadFileToS3(pendingFilesRef.current.avatar, 'avatars');
        } catch (e) {
          toast.error("Failed to upload profile photo.");
          setIsSaving(false);
          setIsUploadingAvatar(false);
          return;
        }
        setIsUploadingAvatar(false);
      }

      // Upload logo if new file is pending
      if (pendingFilesRef.current.logo) {
        setIsUploadingLogo(true);
        try {
          finalLogoUrl = await uploadFileToS3(pendingFilesRef.current.logo, 'logos');
        } catch (e) {
          toast.error("Failed to upload organization logo.");
          setIsSaving(false);
          setIsUploadingLogo(false);
          return;
        }
        setIsUploadingLogo(false);
      }

      const payload = {
        ...profileData,
        avatarUrl: finalAvatarUrl,
        logoUrl: finalLogoUrl,
        nickname: profileData.nickname.trim().toLowerCase()
      };

      const res = await fetch('/api/me/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = {
          ...profileData,
          avatarUrl: finalAvatarUrl,
          logoUrl: finalLogoUrl,
          nickname: payload.nickname
        };
        setProfileData(updated);
        setInitialData(updated);
        pendingFilesRef.current = { avatar: null, logo: null };
        setNickCheckStatus(null);
        toast.success("Profile updated successfully!");
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to save changes.");
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error("Failed to save profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: '#64748b' }}>Loading profile...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '5rem', position: 'relative' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Organization Profile</h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0.25rem 0 0 0' }}>
          Manage company logo, legal business details, and organization size.
        </p>
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
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handlePhotoSelect(e, 'logos')} disabled={isSaving} />
              </label>
              {profileData.logoUrl && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      pendingFilesRef.current.logo = null;
                      setProfileData(prev => ({ ...prev, logoUrl: '' }));
                    }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', marginTop: '0.25rem', textDecoration: 'underline' }}
                  >
                    Remove
                  </button>
                </div>
              )}
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

      {/* FLOATING ACTION PILL (Top-Centered Unsaved Changes with Shake) */}
      <style>{`
        @keyframes profile-shake-banner {
          0%, 100% { transform: translateX(-50%); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(calc(-50% - 8px)); }
          20%, 40%, 60%, 80% { transform: translateX(calc(-50% + 8px)); }
        }
        @keyframes profileSlideDown {
          from { transform: translate(-50%, -100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>

      {isDirty && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          backgroundColor: '#0f172a',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '50px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          whiteSpace: 'nowrap',
          animation: isShaking ? 'profile-shake-banner 0.4s ease-in-out' : 'profileSlideDown 0.3s ease-out forwards'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
            <span style={{ fontSize: '0.92rem', fontWeight: 500 }}>Unsaved changes</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isSaving}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontWeight: 500,
                padding: '4px 8px',
                fontSize: '0.85rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={e => e.target.style.color = 'white'}
              onMouseLeave={e => e.target.style.color = '#94a3b8'}
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || nickCheckStatus === 'taken'}
              style={{
                backgroundColor: nickCheckStatus === 'taken' ? '#64748b' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '24px',
                padding: '6px 18px',
                cursor: (isSaving || nickCheckStatus === 'taken') ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={e => {
                if (nickCheckStatus !== 'taken') e.target.style.backgroundColor = '#059669';
              }}
              onMouseLeave={e => {
                if (nickCheckStatus !== 'taken') e.target.style.backgroundColor = '#10b981';
              }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
