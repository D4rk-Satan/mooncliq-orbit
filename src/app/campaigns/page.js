"use client";

import React, { useState, useEffect } from 'react';

export default function CampaignsPage() {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [templateBody, setTemplateBody] = useState('Hi {{name}}, ');
  const [targetModule, setTargetModule] = useState('Lead'); // Added Module Selection
  const [customFilters, setCustomFilters] = useState([{ id: Date.now(), logic: 'AND', field: 'tag', operator: 'equals', value: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addFilter = () => {
    setCustomFilters([...customFilters, { id: Date.now(), logic: 'AND', field: 'tag', operator: 'equals', value: '' }]);
  };

  const removeFilter = (id) => {
    setCustomFilters(customFilters.filter(f => f.id !== id));
  };

  const updateFilter = (id, key, value) => {
    setCustomFilters(customFilters.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const { tokens } = await fetchAuthSession();
      if (!tokens) return;
      
      const idToken = tokens.idToken.toString();

      const res = await fetch('/api/campaigns', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunch = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const { tokens } = await fetchAuthSession();
      if (!tokens) throw new Error("Not authenticated");
      const idToken = tokens.idToken.toString();

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ name, templateBody, targetModule, customFilters })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(`Campaign Launched! Deducted ₹${data.costDeducted}. Queued ${data.totalQueued} messages.`);
      setShowCreateModal(false);
      fetchCampaigns();
      
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <div style={{ padding: '3rem', minHeight: '100%', background: theme.bgGradient, fontFamily: 'var(--font-inter)' }}>
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
          }}
          onClick={() => setShowCreateModal(true)}
          >
            + Create Broadcast
          </button>
        </div>

        {/* Analytics Glass Cards (Dummy logic for now) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '4rem' }}>
          {[
            { label: 'Total Campaigns', value: campaigns.length.toString(), trend: 'All time', color: '#10b981' },
            { label: 'Total Dispatched', value: campaigns.reduce((acc, c) => acc + c.totalLeads, 0), trend: 'Messages queued', color: '#3b82f6' },
            { label: 'Cost Incurred', value: `₹${campaigns.reduce((acc, c) => acc + c.estimatedCost, 0)}`, trend: 'Wallet deducted', color: '#f59e0b' }
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
          {isLoading ? <p>Loading campaigns...</p> : campaigns.length === 0 ? <p>No campaigns yet.</p> : campaigns.map((campaign, idx) => (
            <div key={campaign.id}
              onMouseEnter={() => setHoveredCard(campaign.id)}
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
              transform: hoveredCard === campaign.id ? 'translateY(-2px)' : 'none',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ flex: 1.2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: theme.textPrimary, margin: 0, fontFamily: 'var(--font-outfit)' }}>{campaign.name}</h3>
                  <span style={{ 
                    background: campaign.status === 'COMPLETED' ? 'rgba(100, 116, 139, 0.15)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                    color: campaign.status === 'COMPLETED' ? theme.textSecondary : 'white', 
                    padding: '0.35rem 0.85rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' 
                  }}>
                    {campaign.status}
                  </span>
                </div>
                <p style={{ color: theme.textSecondary, fontSize: '0.9rem', margin: 0 }}>Targeting {campaign.totalLeads} contacts</p>
              </div>
              
              <div style={{ flex: 1.5, padding: '0 2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  <span style={{ color: theme.accent }}>
                    {campaign.status === 'PROCESSING' ? `Sending Messages...` : `Delivered`}
                  </span>
                  <span style={{ color: theme.textPrimary }}>
                    {Math.round(((campaign.successCount + campaign.failedCount) / (campaign.totalLeads || 1)) * 100)}%
                  </span>
                </div>
                <div style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '9999px', height: '10px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.round(((campaign.successCount + campaign.failedCount) / (campaign.totalLeads || 1)) * 100)}%`, 
                    background: theme.accentGradient, 
                    height: '100%', borderRadius: '9999px' 
                  }}></div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', flex: 0.8, justifyContent: 'flex-end' }}>
                 <button style={{ padding: '0.75rem 1.5rem', border: 'none', background: 'rgba(15, 23, 42, 0.05)', borderRadius: '12px', fontWeight: 600, color: theme.textPrimary, cursor: 'pointer' }}>Analytics</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1.5rem 0', fontFamily: 'var(--font-outfit)' }}>Launch Broadcast</h2>
            <form onSubmit={handleLaunch}>
              <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: theme.textSecondary, marginBottom: '0.5rem' }}>Campaign Name</label>
                  <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Diwali Offer" style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: theme.textSecondary, marginBottom: '0.5rem' }}>Target Module</label>
                  <select value={targetModule} onChange={e => setTargetModule(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }}>
                    <option value="Lead">Leads</option>
                    <option value="Account">Accounts</option>
                    <option value="Deal">Deals</option>
                    <option value="Product">Products</option>
                    <option value="Task">Tasks</option>
                  </select>
                </div>
              </div>
              
              <div style={{ marginBottom: '1.5rem', background: 'rgba(241, 245, 249, 0.5)', padding: '1.5rem', borderRadius: '16px', overflowX: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 700, color: theme.textPrimary, margin: 0 }}>Target Audience Rules</label>
                  <button type="button" onClick={addFilter} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: theme.textSecondary }}>+ Add Rule</button>
                </div>
                
                {customFilters.length === 0 && <p style={{ fontSize: '0.85rem', color: theme.textSecondary }}>Targeting ALL records. Add a rule to filter.</p>}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {customFilters.map((filter, index) => (
                    <div key={filter.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr 1.5fr 30px', gap: '0.5rem', alignItems: 'center' }}>
                      {index === 0 ? (
                         <div style={{ fontSize: '0.75rem', fontWeight: 700, color: theme.textSecondary, textAlign: 'center' }}>WHERE</div>
                      ) : (
                        <select 
                          value={filter.logic}
                          onChange={(e) => updateFilter(filter.id, 'logic', e.target.value)}
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.75rem', fontWeight: 'bold' }}
                        >
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </select>
                      )}
                      
                      <select 
                        value={filter.field} 
                        onChange={(e) => updateFilter(filter.id, 'field', e.target.value)}
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.85rem' }}
                      >
                        <option value="tag">Tag</option>
                        <option value="stageId">Stage ID</option>
                        <option value="firstName">Name / Company</option>
                        <option value="city">City</option>
                      </select>
                      
                      <select 
                        value={filter.operator} 
                        onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.85rem' }}
                      >
                        <option value="equals">Equals</option>
                        <option value="contains">Contains</option>
                        <option value="not_equals">Not Equals</option>
                      </select>
                      
                      <input 
                        value={filter.value} 
                        onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                        placeholder="Value..." 
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.85rem' }} 
                      />
                      
                      <button type="button" onClick={() => removeFilter(filter.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: theme.textSecondary, marginBottom: '0.5rem' }}>Message Template</label>
                <textarea required value={templateBody} onChange={e => setTemplateBody(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '120px', resize: 'vertical', outline: 'none' }}></textarea>
                <p style={{ fontSize: '0.75rem', color: theme.textSecondary, margin: '0.5rem 0 0 0' }}>Use {'{{firstName}}'} to insert the lead's first name.</p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: 'none', fontWeight: 600, color: theme.textSecondary, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '0.75rem 2rem', background: theme.accentGradient, color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Launching...' : 'Launch Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
