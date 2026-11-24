"use client";

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import GlobalLoader from '@/components/ui/GlobalLoader';

const PasswordRequirements = ({ password }) => {
  const requirements = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "One uppercase", met: /[A-Z]/.test(password) },
    { label: "One lowercase", met: /[a-z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
    { label: "One special character", met: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 12px', margin: '8px 0 16px', fontSize: '0.75rem' }}>
      {requirements.map((req, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: req.met ? '#16a34a' : '#94a3b8' }}>
          <span>{req.met ? '✓' : '○'}</span>
          <span>{req.label}</span>
        </div>
      ))}
    </div>
  );
};

export default function AcceptInvitePage({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const token = unwrappedParams.token;

  const [verifyStatus, setVerifyStatus] = useState('loading'); // 'loading' | 'valid' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [inviteData, setInviteData] = useState(null);

  // Form states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Step 1: Token verify karein on page load
  useEffect(() => {
    if (!token) {
      setVerifyStatus('error');
      setErrorMessage('Invalid invitation link.');
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`/api/invitations/verify?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (res.ok && data.valid) {
          setInviteData(data);
          setVerifyStatus('valid');
        } else {
          setVerifyStatus('error');
          setErrorMessage(data.error || 'Failed to verify invitation.');
        }
      } catch (err) {
        setVerifyStatus('error');
        setErrorMessage('Network error while verifying invitation. Please try again.');
      }
    };

    verifyToken();
  }, [token]);

  // Form submit handler
  const handleCompleteSetup = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setSubmitError('Please meet all password complexity requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password
        })
      });

      const data = await res.json();

      if (res.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          // Direct login / sign-in screen par prefilled email ke sath redirect
          router.push(`/sign-in?email=${encodeURIComponent(inviteData.email)}&registered=true`);
        }, 1800);
      } else {
        setSubmitError(data.error || 'Failed to activate account. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err) {
      setSubmitError('A network error occurred. Please try again later.');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      padding: '24px',
      fontFamily: 'inherit'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        padding: '36px',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        maxWidth: '460px',
        width: '100%',
        border: '1px solid #f1f5f9'
      }}>
        {/* State 1: Loading */}
        {verifyStatus === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center', padding: '20px 0' }}>
            <GlobalLoader />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>Verifying your invitation...</h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Please wait while we check your access credentials.</p>
          </div>
        )}

        {/* State 2: Error (Invalid / Expired) */}
        {verifyStatus === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', padding: '10px 0' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Invitation Link Issue</h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>{errorMessage}</p>
            <button 
              onClick={() => router.push('/sign-in')}
              style={{
                marginTop: '12px', width: '100%', padding: '11px', backgroundColor: '#3b82f6', color: 'white',
                border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem'
              }}
            >
              Go to Sign In
            </button>
          </div>
        )}

        {/* State 3: Success Screen (Account Activated) */}
        {isSuccess && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', padding: '15px 0' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Account Activated! 🎉</h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>Welcome aboard! Redirecting you to sign in...</p>
          </div>
        )}

        {/* State 4: Valid Token -> Welcome & Set Password Form */}
        {verifyStatus === 'valid' && !isSuccess && (
          <div>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                background: '#e0e7ff',
                color: '#4338ca',
                fontSize: '1.5rem',
                marginBottom: '12px'
              }}>
                🏢
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
                Join {inviteData?.orgName}
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.84rem', margin: 0 }}>
                You have been invited to join the team on Mooncliq Orbit CRM.
              </p>
            </div>

            {/* Read-Only Profile Badge */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '20px',
              fontSize: '0.82rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Full Name:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{inviteData?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Email:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{inviteData?.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Handle / Role:</span>
                <span style={{ fontWeight: 600, color: '#4338ca' }}>
                  @{inviteData?.nickname} {inviteData?.role ? `• ${inviteData?.role}` : ''}
                </span>
              </div>
            </div>

            {submitError && (
              <div style={{
                background: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '10px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                marginBottom: '16px'
              }}>
                {submitError}
              </div>
            )}

            {/* Password Setup Form */}
            <form onSubmit={handleCompleteSetup}>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                    Create Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Set a secure password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <PasswordRequirements password={password} />
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                  Confirm Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: isSubmitting ? '#94a3b8' : '#4338ca',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {isSubmitting ? 'Activating Account...' : 'Complete Setup & Join Workspace'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
