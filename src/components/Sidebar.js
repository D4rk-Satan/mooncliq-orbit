"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "aws-amplify/auth";

export default function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem('mooncliq_sidebar_collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('mooncliq_sidebar_collapsed', newState.toString());
  };

  const handleSignOut = async () => {
    try {

      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg> },
    { name: "Lead", href: "/lead", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
    { name: "Deal", href: "/deal", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><path d="M12 18V6"></path></svg> },
    { name: "Project", href: "/project", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg> },
    { name: "Task", href: "/task", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg> },
    { name: "Account", href: "/account", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> },
    { name: "Products", href: "/products", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> },
    { name: "Whatsapp", href: "/whatsapp", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> },
    { name: "Campaigns", href: "/campaigns", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"></path><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg> },
  ];

  return (
    <>
      {/* Mobile Backdrop (Dark background) */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9998 }}
        ></div>
      )}
      <aside className={`dashboard-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`} style={{ width: isCollapsed ? '72px' : '260px', transition: isMounted ? 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none', overflow: 'hidden', flexShrink: 0 }}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', padding: isCollapsed ? '1rem 0' : '1rem 1.5rem' }}>
          {!isCollapsed && <span>moonCliq</span>}
          {isCollapsed && <span style={{ fontSize: '1.2rem' }}>mC</span>}
          <button
            onClick={toggleSidebar}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Toggle Sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        </div>
        <nav className="sidebar-nav" style={{ padding: '0.5rem 0' }}>
          {navItems.map((item, idx) => (
            <Link key={idx} href={item.href} className={`nav-item ${pathname === item.href ? "active" : ""}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', justifyContent: isCollapsed ? 'center' : 'flex-start', padding: isCollapsed ? '0.75rem 0' : '0.75rem 1.5rem', margin: isCollapsed ? '0.25rem' : '0.25rem 1rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title={item.name}>{item.icon}</span>
              {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.name}</span>}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: isCollapsed ? '1rem 0' : '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid #e5e7eb' }}>
          <Link href="/settings" className={`nav-item ${pathname === "/settings" ? "active" : ""}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', justifyContent: isCollapsed ? 'center' : 'flex-start', padding: isCollapsed ? '0.75rem 0' : '0.75rem 1.5rem', margin: isCollapsed ? '0.25rem' : '0.25rem 1rem' }} title="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Settings</span>}
          </Link>
          <button
            onClick={handleSignOut}
            className="nav-item"
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: isCollapsed ? 'center' : 'flex-start', padding: isCollapsed ? '0.75rem 0' : '0.75rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', width: '100%', margin: isCollapsed ? '0.25rem' : '0.25rem 1rem', color: '#ef4444' }}
            title="Log Out"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Log Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
