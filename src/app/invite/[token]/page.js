"use client";

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import GlobalLoader from '@/components/ui/GlobalLoader';

export default function AcceptInvitePage({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const token = unwrappedParams.token;

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('Verifying your invitation...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid invitation link.');
      return;
    }

    const acceptInvitation = async () => {
      try {
        const res = await fetch('/api/invitations/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage('Invitation accepted successfully! Redirecting to sign up...');
          setTimeout(() => {
            router.push(`/sign-up?email=${encodeURIComponent(data.user.email)}&orgName=${encodeURIComponent(data.orgName)}&invited=true`);
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to accept invitation.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('A network error occurred. Please try again later.');
      }
    };

    acceptInvitation();
  }, [token, router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center'
      }}>
        {status === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <GlobalLoader />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>{message}</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Please wait while we set up your account access.</p>
          </div>
        )}

        {status === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>{message}</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>You will be redirected momentarily.</p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>Link Expired or Invalid</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>{message}</p>
            <button 
              onClick={() => router.push('/sign-up')}
              style={{
                marginTop: '10px', width: '100%', padding: '12px', backgroundColor: '#3b82f6', color: 'white',
                border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
            >
              Go to Sign Up
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
