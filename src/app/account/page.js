"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import AccountIntakeForm from "../../components/AccountIntakeForm";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { getCurrentUser } = await import('aws-amplify/auth');
      await getCurrentUser();
      fetchData();
    } catch (err) {
      router.push('/sign-in');
    }
  };

  const getAuthToken = async () => {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const { tokens } = await fetchAuthSession();
    return tokens.idToken.toString();
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };

      const res = await fetch('/api/accounts', { headers });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      } else {
        setAccounts([]);
      }
    } catch (err) {
      console.error("Failed to load accounts", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAccount = async (newPayload) => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newPayload)
      });
      if (res.ok) {
        const savedAccount = await res.json();
        setAccounts((prev) => [savedAccount, ...prev]);
      } else {
        const err = await res.json();
        alert("Error: " + err.error);
      }
    } catch (err) {
      console.error("Failed to save account", err);
      alert("Failed to create account.");
    }
  };

  const renderEmptyState = () => (
    <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center', height: '100%' }}>
      <div className="empty-state-content" style={{ maxWidth: '400px' }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="30" r="4" fill="#f1f5f9" />
            <circle cx="100" cy="20" r="2" fill="#f1f5f9" />
            <circle cx="90" cy="100" r="6" fill="#f1f5f9" />
            <circle cx="10" cy="90" r="3" fill="#f1f5f9" />
            <path d="M40 20H70C75.5228 20 80 24.4772 80 30V80C80 85.5228 75.5228 90 70 90H40C34.4772 90 30 85.5228 30 80V30C30 24.4772 34.4772 20 40 20Z" fill="white" stroke="#cbd5e1" strokeWidth="3" strokeLinejoin="round" />
            <path d="M35 25H65C70.5228 25 75 29.4772 75 35V85C75 90.5228 70.5228 95 65 95H35C29.4772 95 25 90.5228 25 85V35C25 29.4772 29.4772 25 35 25Z" fill="white" stroke="#cbd5e1" strokeWidth="3" strokeLinejoin="round" />
            <rect x="40" y="40" width="25" height="4" rx="2" fill="#e2e8f0" />
            <rect x="40" y="55" width="15" height="4" rx="2" fill="#e2e8f0" />
            <rect x="40" y="70" width="20" height="4" rx="2" fill="#e2e8f0" />
            <circle cx="75" cy="70" r="15" fill="white" stroke="#cbd5e1" strokeWidth="3" />
            <path d="M85 80L95 90" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
            <path d="M70 65L80 75" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            <path d="M80 65L70 75" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>There are no records in this view.</h3>
        <p className="text-muted" style={{ marginBottom: '1.5rem', color: '#64748b' }}>Get started by creating your first account.</p>
        <button className="btn-primary" onClick={() => setIsFormOpen(true)}>
          + Add First Account
        </button>
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="table-container" style={{ margin: '0 2rem' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '40px' }}>
              <input type="checkbox" className="row-checkbox" disabled />
            </th>
            <th>Company Name</th>
            <th>Email</th>
            <th>GST No</th>
            <th>Contact Person</th>
            <th>Stage</th>
            <th>Created Date</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map(account => (
            <tr key={account.id}>
              <td>
                <input type="checkbox" className="row-checkbox" disabled />
              </td>
              <td className="font-medium">{account.companyName}</td>
              <td>{account.email || '-'}</td>
              <td>{account.gstNo || '-'}</td>
              <td>{account.contactPerson || '-'}</td>
              <td>
                <span className="badge" style={{ backgroundColor: account.stage?.color || '#eee' }}>
                  {account.stage?.name || 'Unknown'}
                </span>
              </td>
              <td className="text-muted">{new Date(account.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="table-footer">
        Showing {accounts.length} of {accounts.length} records
      </div>
    </div>
  );

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>Accounts</h1>
          {accounts.length > 0 && (
            <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button className="btn-primary" onClick={() => setIsFormOpen(true)}>
                + Add Account
              </button>
            </div>
          )}
        </header>

        <div className="module-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {isLoading ? (
            <div className="p-8 text-center" style={{ margin: 'auto' }}>
              <h3 className="text-xl">Loading Platform Data...</h3>
            </div>
          ) : accounts.length === 0 ? (
            renderEmptyState()
          ) : (
            renderListView()
          )}
        </div>
      </main>

      <AccountIntakeForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleAddAccount}
      />
    </div>
  );
}
