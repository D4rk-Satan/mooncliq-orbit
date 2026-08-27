"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import DynamicIntakeForm from "@/components/DynamicIntakeForm";
import SlideOverPanel from "../../components/SlideOverPanel";
import { useRouter } from "next/navigation";
import TableSkeleton from "../../components/skeletons/TableSkeleton";
import DynamicModuleView from "@/components/DynamicModuleView";
import EntityEditModal from "@/components/EntityEditModal";

export default function AccountPage() {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [blueprint, setBlueprint] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [tags, setTags] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [pendingTransition, setPendingTransition] = useState(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
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

      // Fetch User Profile
      const meRes = await fetch('/api/me', { headers });
      const meData = await meRes.json();
      setCurrentUser(meData);

      const bpRes = await fetch('/api/blueprint?moduleType=Account', { headers });
      if (bpRes.ok) setBlueprint(await bpRes.json());

      const tagsRes = await fetch('/api/tags?moduleType=Account', { headers });
      if (tagsRes.ok) setTags(await tagsRes.json());

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

  const handleAccountUpdate = (updatedAccount) => {
    setAccounts(prev => prev.map(a => a.id === updatedAccount.id ? updatedAccount : a));
    if (selectedAccount && selectedAccount.id === updatedAccount.id) {
      setSelectedAccount(updatedAccount);
    }
  };

  const handleTransition = async (accountId, toStageId, customData, transitionId) => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/accounts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accountId,
          stageId: toStageId,
          customData,
          transitionId
        })
      });
      if (res.ok) {
        const updated = await res.json();
        handleAccountUpdate(updated);
        setSelectedAccount(null);
        setPendingTransition(null);
      } else {
        const err = await res.json();
        alert("Transition failed: " + err.error);
      }
    } catch (e) {
      console.error("Transition failed", e);
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

  return (
    <>

      <main className="dashboard-main">
        <div className="module-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {isLoading ? (
            <div className="p-8 text-center" style={{ margin: 'auto' }}>
              <TableSkeleton />
            </div>
          ) : (
            <DynamicModuleView
              moduleName="Account"
              records={accounts}
              blueprint={blueprint}
              supportKanban={false}
              onRecordClick={(account) => setSelectedAccount(account)}
              renderHeaderActions={() => (
                <button className="btn-primary" onClick={() => setIsFormOpen(true)} style={{ whiteSpace: 'nowrap' }}>
                  + Add Account
                </button>
              )}
            />
          )}

        </div>
      </main>

      <DynamicIntakeForm
        moduleType="Account"
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleAddAccount}
      />


      <SlideOverPanel
        isOpen={!!selectedAccount}
        onClose={() => {
          setSelectedAccount(null);
          setPendingTransition(null);
        }}
        lead={selectedAccount}
        blueprint={blueprint}
        tags={tags}
        currentUser={currentUser}
        onTransition={handleTransition}
        onLeadUpdate={handleAccountUpdate}
        pendingTransition={pendingTransition}
        onEditClick={() => setIsEditModalOpen(true)}
      />

      <EntityEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        entity={selectedAccount}
        blueprint={blueprint}
        onUpdate={handleAccountUpdate}
        currentUser={currentUser}
        moduleName="Accounts"
      />

    </>
  );
}
