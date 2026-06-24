"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "aws-amplify/auth";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-logo">moonCliq</div>
      <nav className="sidebar-nav">
        <Link href="/dashboard" className={`nav-item ${pathname === "/dashboard" ? "active" : ""}`} style={{ display: 'block', textDecoration: 'none' }}>
          Dashboard
        </Link>
        <Link href="/lead" className={`nav-item ${pathname === "/lead" ? "active" : ""}`} style={{ display: 'block', textDecoration: 'none' }}>
          Lead
        </Link>
        <div className="nav-item">Deal</div>
        <div className="nav-item">Customer</div>
        <div className="nav-item">Customer Contact</div>
        <div className="nav-item">Products</div>
      </nav>
      <div style={{ marginTop: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button 
          onClick={handleSignOut} 
          className="nav-item" 
          style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
        >
          🚪 Log Out
        </button>
        <Link href="/settings" className={`nav-item ${pathname === "/settings" ? "active" : ""}`} style={{ display: 'block', textDecoration: 'none' }}>
          ⚙️ Settings
        </Link>
      </div>
    </aside>
  );
}
