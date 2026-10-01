"use client";
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import OnboardingModal from './OnboardingModal';

export default function DashboardLayoutWrapper({ children }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const authRoutes = ['/', '/sign-in', '/sign-up', '/forgot-password'];
  const isAuthPage = authRoutes.includes(pathname);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [refreshSidebarKey, setRefreshSidebarKey] = useState(0);

  useEffect(() => {
    if (!isAuthPage) {
      checkOnboardingStatus();
    } else {
      setIsCheckingOnboarding(false);
    }
  }, [pathname, isAuthPage]);

  const checkOnboardingStatus = async () => {
    setIsCheckingOnboarding(true);
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const { tokens } = await fetchAuthSession();
      if (!tokens) return;
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${tokens.idToken.toString()}` }
      });
      if (res.ok) {
        const userData = await res.json();
        if (userData?.profile && !userData.profile.onboardingCompleted) {
          setShowOnboarding(true);
          setIsAdmin(userData.profile.canManageUsers === true);
        }
      }
    } catch (e) {
      console.error("Failed to check onboarding", e);
    } finally {
      setIsCheckingOnboarding(false);
    }
  };


  if (isAuthPage) {
    return <>{children}</>;
  }

  // Prevents the dashboard from flashing for 2-4 seconds while API is being called
  if (isCheckingOnboarding) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>Setting up your workspace...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {showOnboarding && (
        <OnboardingModal
          isAdmin={isAdmin}
          onComplete={() => {
            setShowOnboarding(false);
            setRefreshSidebarKey(prev => prev + 1); // Trigger Sidebar to re-fetch profile data
          }}
        />
      )}
      <Sidebar 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen} 
        refreshKey={refreshSidebarKey}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* MOBILE HEADER (Only visible on phones) */}
        <div className="mobile-header">
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>moonCliq</div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0f172a' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>

        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
