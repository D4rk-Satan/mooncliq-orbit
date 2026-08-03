"use client";

import { useState, useEffect } from 'react';

export default function WalletDashboard() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(1000);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const getAuthToken = async () => {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const { tokens } = await fetchAuthSession();
    return tokens.idToken.toString();
  };

  const fetchWalletData = async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };

      const balRes = await fetch('/api/wallet/balance', { headers });
      const balData = await balRes.json();
      setBalance(balData.balance || 0);

      const transRes = await fetch('/api/wallet/transactions', { headers });
      const transData = await transRes.json();
      setTransactions(Array.isArray(transData) ? transData : []);
    } catch (err) {
      console.error("Failed to fetch wallet data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecharge = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/wallet/payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: rechargeAmount })
      });
      if (res.ok) {
        setShowRechargeModal(false);
        fetchWalletData(); // Refresh balance and history
      }
    } catch (err) {
      console.error("Recharge failed", err);
    }
  };

  return (
    <div className="wallet-dashboard p-6" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="header-row flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Billing & Wallet</h2>
          <p className="text-sm text-slate-500">Manage your prepaid wallet for WhatsApp API usage.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><div className="spinner"></div></div>
      ) : (
        <>
          <div className="balance-card bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-8 text-white shadow-lg mb-8 flex justify-between items-center">
            <div>
              <p className="text-blue-100 text-sm uppercase tracking-wider font-semibold mb-1">Available Balance</p>
              <h1 className="text-5xl font-bold tracking-tight">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h1>
              {balance < 500 && (
                <p className="text-red-200 text-sm mt-2 font-medium">⚠️ Low balance. Please recharge soon.</p>
              )}
            </div>
            <div>
              <button 
                onClick={() => setShowRechargeModal(true)}
                className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-sm"
              >
                + Add Funds
              </button>
            </div>
          </div>

          <div className="transactions-section">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Transaction Ledger</h3>
            {transactions.length === 0 ? (
              <p className="text-slate-500 italic">No transactions yet.</p>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {tx.description}
                          {tx.referenceId && <span className="block text-xs text-slate-400">Ref: {tx.referenceId}</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right">
                          <span className={tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}>
                            {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Add Funds to Wallet</h3>
            <p className="text-sm text-slate-500 mb-4">For MVP, this is a mock gateway. It will instantly add money without Razorpay.</p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
              <input 
                type="number" 
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-lg"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRechargeModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">Cancel</button>
              <button onClick={handleRecharge} className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors font-medium shadow-sm">Proceed to Pay</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
