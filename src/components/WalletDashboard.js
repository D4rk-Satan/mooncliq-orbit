"use client";

import React, { useState, useEffect } from 'react';

export default function WalletDashboard() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(1000);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hoveredTx, setHoveredTx] = useState(null);

  // Modern UI Tokens (Matching Campaigns Page)
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

  useEffect(() => {
    fetchWalletData();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const getAuthToken = async () => {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const { tokens } = await fetchAuthSession();
    return tokens;
  };

  const fetchWalletData = async () => {
    setIsLoading(true);
    try {
      const tokens = await getAuthToken();
      const headers = { Authorization: `Bearer ${tokens.idToken.toString()}` };

      const balRes = await fetch('/api/wallet/balance', { headers });
      if (balRes.ok) {
        const balData = await balRes.json();
        setBalance(balData.balance || 0);
      }

      const transRes = await fetch('/api/wallet/transactions', { headers });
      if (transRes.ok) {
        const transData = await transRes.json();
        setTransactions(Array.isArray(transData) ? transData : []);
      }
    } catch (err) {
      console.error("Failed to fetch wallet data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecharge = async () => {
    if (!window.Razorpay) {
      alert('Razorpay SDK failed to load.');
      return;
    }

    setIsProcessing(true);
    try {
      const tokens = await getAuthToken();
      const idToken = tokens.idToken.toString();
      const payload = tokens.idToken.payload;
      
      const userEmail = payload.email || '';
      const userName = payload.name || payload['custom:name'] || 'Mooncliq User';
      
      const res = await fetch('/api/wallet/payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ amount: rechargeAmount })
      });
      
      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.details || orderData.error || 'Unknown error');

      const options = {
        key: 'rzp_test_TLcyKjhq5um2hn',
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Mooncliq Orbit',
        description: 'Wallet Recharge',
        order_id: orderData.orderId,
        handler: function (response) {
          setShowRechargeModal(false);
          setTimeout(() => { fetchWalletData(); }, 2000);
          alert('Payment Successful! Wallet will be updated shortly.');
        },
        prefill: { name: userName, email: userEmail },
        theme: { color: theme.accent }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response){
        alert(response.error.description);
      });
      rzp.open();
    } catch (error) {
      console.error(error);
      alert(`Failed to initiate payment: ${error.message}`);
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ padding: '3rem', minHeight: '100vh', background: theme.bgGradient, fontFamily: 'var(--font-inter)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: theme.textPrimary, margin: 0, fontFamily: 'var(--font-outfit)', letterSpacing: '-0.02em' }}>
              Billing & Wallet
            </h1>
            <p style={{ color: theme.textSecondary, marginTop: '0.5rem', fontSize: '1.125rem' }}>Manage your prepaid credits for WhatsApp API.</p>
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.accent }}></div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
            
            {/* Left Column: Balance Card */}
            <div style={{ gridColumn: 'span 4' }}>
              <div style={{ 
                background: theme.glassBg,
                backdropFilter: 'blur(16px)',
                border: theme.glassBorder,
                borderRadius: '24px',
                padding: '2.5rem',
                boxShadow: theme.glassShadow,
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <svg style={{ width: '20px', height: '20px', color: theme.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                    <span style={{ color: theme.textSecondary, fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available Balance</span>
                  </div>
                  <h2 style={{ fontSize: '3.5rem', fontWeight: 800, color: theme.textPrimary, margin: 0, fontFamily: 'var(--font-outfit)', letterSpacing: '-0.03em' }}>
                    <span style={{ fontSize: '2rem', color: theme.textSecondary, marginRight: '4px' }}>₹</span>
                    {balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h2>
                </div>

                {balance < 500 && (
                  <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '2rem' }}>
                    <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.875rem', fontWeight: 600 }}>⚠️ Low balance. Recharge soon.</p>
                  </div>
                )}

                <div style={{ marginTop: 'auto' }}>
                  <button 
                    onClick={() => setShowRechargeModal(true)}
                    style={{ 
                      width: '100%',
                      background: theme.accentGradient, 
                      color: 'white', 
                      padding: '1.25rem', 
                      borderRadius: '16px', 
                      fontWeight: 600, 
                      fontSize: '1.125rem',
                      border: 'none', 
                      cursor: 'pointer', 
                      boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 30px -5px rgba(99, 102, 241, 0.5)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(99, 102, 241, 0.4)'; }}
                  >
                    + Add Funds
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Transactions */}
            <div style={{ gridColumn: 'span 8' }}>
              <div style={{ 
                background: theme.glassBg,
                backdropFilter: 'blur(16px)',
                border: theme.glassBorder,
                borderRadius: '24px',
                padding: '2.5rem',
                boxShadow: theme.glassShadow,
                height: '100%'
              }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: theme.textPrimary, margin: '0 0 2rem 0', fontFamily: 'var(--font-outfit)' }}>Transaction Ledger</h3>
                
                {transactions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: theme.textSecondary }}>
                    <p>No transactions found.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {transactions.map((tx) => (
                      <div 
                        key={tx.id} 
                        onMouseEnter={() => setHoveredTx(tx.id)}
                        onMouseLeave={() => setHoveredTx(null)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          padding: '1.25rem',
                          background: hoveredTx === tx.id ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
                          border: theme.glassBorder,
                          borderRadius: '16px',
                          transition: 'all 0.2s ease',
                          transform: hoveredTx === tx.id ? 'translateX(4px)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                          <div style={{ 
                            width: '48px', height: '48px', borderRadius: '12px', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: tx.type === 'CREDIT' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: tx.type === 'CREDIT' ? '#10b981' : '#ef4444'
                          }}>
                            {tx.type === 'CREDIT' ? (
                              <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12"></path></svg>
                            ) : (
                              <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"></path></svg>
                            )}
                          </div>
                          <div>
                            <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600, color: theme.textPrimary }}>{tx.description}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: theme.textSecondary, fontSize: '0.875rem' }}>
                              <span>{new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</span>
                              {tx.referenceId && (
                                <>
                                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: theme.textSecondary }}></span>
                                  <span style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>{tx.referenceId}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: tx.type === 'CREDIT' ? '#10b981' : theme.textPrimary }}>
                          {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recharge Modal Overlay (Glassmorphic) */}
      {showRechargeModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div 
            style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }}
            onClick={() => !isProcessing && setShowRechargeModal(false)}
          ></div>
          
          <div style={{ 
            position: 'relative', 
            background: theme.glassBg, 
            backdropFilter: 'blur(24px)',
            border: theme.glassBorder, 
            borderRadius: '24px', 
            boxShadow: theme.glassShadow,
            width: '100%', 
            maxWidth: '450px', 
            padding: '2.5rem'
          }}>
            
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: theme.textPrimary, margin: 0, fontFamily: 'var(--font-outfit)' }}>Add Funds</h3>
              <p style={{ color: theme.textSecondary, marginTop: '0.5rem', fontSize: '0.9rem' }}>Secure payment powered by Razorpay</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Amount (INR)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: theme.textSecondary, fontSize: '1.25rem', fontWeight: 600 }}>₹</span>
                <input 
                  type="number" 
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  style={{ 
                    width: '100%', padding: '1rem 1rem 1rem 2.5rem', 
                    background: 'rgba(255,255,255,0.8)', 
                    border: '2px solid rgba(99, 102, 241, 0.2)', 
                    borderRadius: '16px', 
                    fontSize: '1.5rem', fontWeight: 700, color: theme.textPrimary,
                    outline: 'none', transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = theme.accent}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.2)'}
                  min="100"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
              {[1000, 5000, 10000].map(amt => (
                <button 
                  key={amt} 
                  onClick={() => setRechargeAmount(amt)}
                  style={{ 
                    flex: 1, padding: '0.75rem 0', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 600,
                    background: rechargeAmount == amt ? theme.accent : 'rgba(255,255,255,0.5)',
                    color: rechargeAmount == amt ? 'white' : theme.textSecondary,
                    border: rechargeAmount == amt ? 'none' : theme.glassBorder,
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  ₹{amt.toLocaleString()}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setShowRechargeModal(false)} 
                disabled={isProcessing}
                style={{ flex: 1, padding: '1rem', background: 'transparent', border: theme.glassBorder, borderRadius: '16px', fontWeight: 600, color: theme.textSecondary, cursor: isProcessing ? 'not-allowed' : 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleRecharge} 
                disabled={isProcessing} 
                style={{ 
                  flex: 1, padding: '1rem', background: theme.textPrimary, border: 'none', borderRadius: '16px', 
                  fontWeight: 600, color: 'white', cursor: isProcessing ? 'not-allowed' : 'pointer',
                  opacity: isProcessing ? 0.7 : 1, boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
                }}
              >
                {isProcessing ? 'Processing...' : 'Proceed to Pay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
