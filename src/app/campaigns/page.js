"use client";

import React, { useState } from 'react';

export default function CampaignsPage() {
  const [hoveredCard, setHoveredCard] = useState(null);

  // Modern UI Tokens
  const theme = {
    bgGradient: 'linear-gradient(135deg, #f0fdfa 0%, #e0e7ff 50%, #f3e8ff 100%)',
    glassBg: 'rgba(255, 255, 255, 0.65)',
    glassBorder: '1px solid rgba(255, 255, 255, 0.4)',
    glassShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    accent: '#4f46e5',
    accentGradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
  };

  return (
    <div style={{ padding: '3rem', minHeight: '100vh', background: theme.bgGradient, fontFamily: 'var(--font-inter)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: theme.textPrimary, margin: 0, fontFamily: 'var(--font-outfit)', letterSpacing: '-0.02em' }}>
              Campaigns
            </h1>
            <p style={{ color: theme.textSecondary, marginTop: '0.5rem', fontSize: '1.125rem' }}>Automate and scale your WhatsApp outreach.</p>
          </div>
          <button style={{ 
            background: theme.accentGradient, 
            color: 'white', 
            padding: '1rem 2rem', 
            borderRadius: '9999px', 
            fontWeight: 600, 
            fontSize: '1rem',
            border: 'none', 
            cursor: 'pointer', 
            boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)',
            transition: 'all 0.3s ease',
            transform: 'translateY(0)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 30px -5px rgba(99, 102, 241, 0.5)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(99, 102, 241, 0.4)'; }}
          >
            + Create Broadcast
          </button>
        </div>

        {/* Analytics Glass Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '4rem' }}>
          {[
            { label: 'Total Messages (Mtd)', value: '12,450', trend: '+14% vs last month', color: '#10b981' },
            { label: 'Average Open Rate', value: '68.2%', trend: '+2.1% vs last month', color: '#10b981' },
            { label: 'Wallet Consumed', value: '₹9,960', trend: '₹5,040 remaining balance', color: '#f59e0b' }
          ].map((stat, i) => (
            <div key={i} style={{ 
              background: theme.glassBg, 
              backdropFilter: 'blur(12px)', 
              WebkitBackdropFilter: 'blur(12px)',
              padding: '2rem', 
              borderRadius: '24px', 
              border: theme.glassBorder, 
              boxShadow: theme.glassShadow,
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: theme.accentGradient, opacity: 0.1, borderRadius: '50%', filter: 'blur(20px)' }}></div>
              <div style={{ color: theme.textSecondary, fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>{stat.label}</div>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: theme.textPrimary, fontFamily: 'var(--font-outfit)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>{stat.value}</div>
              <div style={{ color: stat.color, fontSize: '0.875rem', fontWeight: 600 }}>{stat.trend}</div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: theme.textPrimary, marginBottom: '2rem', fontFamily: 'var(--font-outfit)' }}>Active & Recent Broadcasts</h2>
        
        {/* Campaign List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Active Card */}
          <div 
            onMouseEnter={() => setHoveredCard(1)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{ 
            background: theme.glassBg, 
            backdropFilter: 'blur(12px)',
            borderRadius: '20px', 
            border: theme.glassBorder, 
            padding: '2rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            boxShadow: theme.glassShadow,
            transform: hoveredCard === 1 ? 'translateY(-2px)' : 'none',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ flex: 1.2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: theme.textPrimary, margin: 0, fontFamily: 'var(--font-outfit)' }}>Diwali VIP Offer</h3>
                <span style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: '0.35rem 0.85rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>RUNNING</span>
              </div>
              <p style={{ color: theme.textSecondary, fontSize: '0.9rem', margin: 0 }}>Targeting 4,500 contacts with tag: <strong>#HotLead</strong></p>
            </div>
            
            <div style={{ flex: 1.5, padding: '0 2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                <span style={{ color: theme.accent }}>Sending Messages... (2,100 / 4,500)</span>
                <span style={{ color: theme.textPrimary }}>46%</span>
              </div>
              <div style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '9999px', height: '10px', overflow: 'hidden' }}>
                <div style={{ width: '46%', background: theme.accentGradient, height: '100%', borderRadius: '9999px', boxShadow: '0 0 10px rgba(99,102,241,0.5)' }}></div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', flex: 0.8, justifyContent: 'flex-end' }}>
               <button style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid rgba(15, 23, 42, 0.1)', borderRadius: '12px', fontWeight: 600, color: theme.textSecondary, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>Pause</button>
               <button style={{ padding: '0.75rem 1.5rem', border: 'none', background: 'rgba(15, 23, 42, 0.05)', borderRadius: '12px', fontWeight: 600, color: theme.textPrimary, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.05)'}>Analytics</button>
            </div>
          </div>

          {/* Completed Card */}
          <div 
            onMouseEnter={() => setHoveredCard(2)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{ 
            background: theme.glassBg, 
            backdropFilter: 'blur(12px)',
            borderRadius: '20px', 
            border: theme.glassBorder, 
            padding: '2rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            boxShadow: theme.glassShadow,
            transform: hoveredCard === 2 ? 'translateY(-2px)' : 'none',
            transition: 'all 0.3s ease',
            opacity: 0.85
          }}>
            <div style={{ flex: 1.2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: theme.textPrimary, margin: 0, fontFamily: 'var(--font-outfit)' }}>August Newsletter</h3>
                <span style={{ background: 'rgba(100, 116, 139, 0.15)', color: theme.textSecondary, padding: '0.35rem 0.85rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>COMPLETED</span>
              </div>
              <p style={{ color: theme.textSecondary, fontSize: '0.9rem', margin: 0 }}>Sent on Aug 1, 2026 • 8,200 Deliveries</p>
            </div>
            
            <div style={{ flex: 1.5, padding: '0 2rem', display: 'flex', gap: '3rem', alignItems: 'center' }}>
               <div>
                 <div style={{ fontSize: '1.75rem', fontWeight: 800, color: theme.textPrimary, fontFamily: 'var(--font-outfit)' }}>98%</div>
                 <div style={{ fontSize: '0.75rem', color: theme.textSecondary, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Delivered</div>
               </div>
               <div style={{ width: '1px', height: '40px', background: 'rgba(0,0,0,0.1)' }}></div>
               <div>
                 <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3b82f6', fontFamily: 'var(--font-outfit)' }}>71%</div>
                 <div style={{ fontSize: '0.75rem', color: theme.textSecondary, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Read (Blue Tick)</div>
               </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', flex: 0.8, justifyContent: 'flex-end' }}>
               <button style={{ padding: '0.75rem 1.5rem', border: 'none', background: 'rgba(15, 23, 42, 0.05)', borderRadius: '12px', fontWeight: 600, color: theme.textPrimary, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.05)'}>View Report</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
