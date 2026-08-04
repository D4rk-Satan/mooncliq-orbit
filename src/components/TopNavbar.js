"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TopNavbar() {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const { tokens } = await fetchAuthSession();
        if (!tokens) return;
        
        const headers = { Authorization: `Bearer ${tokens.idToken.toString()}` };
        const balRes = await fetch('/api/wallet/balance', { headers });
        if (balRes.ok) {
          const balData = await balRes.json();
          setBalance(balData.balance || 0);
        }
      } catch (err) {
        console.error("Failed to fetch top navbar wallet balance", err);
      }
    };
    fetchBalance();
    
    // Auto refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      height: '64px',
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        
        {/* Wallet Balance Badge */}
        <Link href="/settings" style={{ textDecoration: 'none' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            background: 'linear-gradient(135deg, #f0fdfa 0%, #e0e7ff 100%)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)'; }}
          >
            <svg style={{ width: '18px', height: '18px', color: '#4f46e5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', fontFamily: 'var(--font-inter)' }}>
              ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </Link>

        {/* User Profile Dummy Icon */}
        <div style={{ 
          width: '36px', 
          height: '36px', 
          borderRadius: '50%', 
          background: '#4f46e5', 
          color: 'white', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: '14px',
          fontFamily: 'var(--font-outfit)'
        }}>
          MC
        </div>

      </div>
    </div>
  );
}
