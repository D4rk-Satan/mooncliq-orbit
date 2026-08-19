"use client";
import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function DashboardLayoutWrapper({ children }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const authRoutes = ['/', '/sign-in', '/sign-up', '/forgot-password'];
  const isAuthPage = authRoutes.includes(pathname);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="dashboard-layout" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
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
