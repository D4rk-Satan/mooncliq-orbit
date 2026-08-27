"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import DealIntakeForm from "../../components/DealIntakeForm";
import SlideOverPanel from "../../components/SlideOverPanel";
import { useRouter } from "next/navigation";
import TableSkeleton from "../../components/skeletons/TableSkeleton";
import DynamicModuleView from "@/components/DynamicModuleView";
import EntityEditModal from "@/components/EntityEditModal";

const getColumnColor = (color) => color || "#e2e8f0";

export default function DealModule() {
  const [Deals, setDeals] = useState([]);
  const [blueprint, setBlueprint] = useState(null);
  const [tags, setTags] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState("kanban"); // "kanban" or "list"
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [pendingTransition, setPendingTransition] = useState(null);

  // Bulk Actions State
  const [selectedDealIds, setSelectedDealIds] = useState([]);
  const [isBulkTagPickerOpen, setIsBulkTagPickerOpen] = useState(false);

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

      // Fetch Blueprint to get the dynamic stages
      const bpRes = await fetch('/api/blueprint?moduleType=Deal', { headers });
      const bpData = await bpRes.json();
      setBlueprint(bpData);

      // Fetch actual Deals
      const DealsRes = await fetch('/api/deals', { headers });
      if (DealsRes.ok) {
        const DealsData = await DealsRes.json();
        setDeals(DealsData);
      } else {
        setDeals([]);
      }

      // Fetch organization tags
      const tagsRes = await fetch('/api/tags?moduleType=Deal', { headers });
      if (tagsRes.ok) {
        setTags(await tagsRes.json());
      }
    } catch (err) {
      console.error("Failed to load CRM data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handDealdDeal = async (newDealPayload) => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newDealPayload)
      });
      const savedDeal = await res.json();
      setDeals((prev) => [savedDeal, ...prev]);
    } catch (err) {
      console.error("Failed to save Deal", err);
    }
  };

  const handleDragStart = (e, DealId) => {
    e.dataTransfer.setData("DealId", DealId);
  };

  const handleDrop = async (e, targetStageId) => {
    e.preventDefault();
    const DealId = e.dataTransfer.getData("DealId");

    const Deal = Deals.find(l => l.id === DealId);
    if (!Deal || Deal.stageId === targetStageId) return;

    // 1. Find valid transition
    const validTransition = blueprint.transitions.find(t =>
      (t.isGlobal || (t.fromStages && t.fromStages.some(s => s.id === Deal.stageId))) && t.toStageId === targetStageId
    );

    if (!validTransition) {
      alert("Invalid transition! The Blueprint engine prevents moving to this stage directly.");
      return;
    }

    // 2. Open panel to enforce confirmation for all transitions
    setPendingTransition(validTransition);
    setSelectedDeal(Deal);
  };

  const handleTransition = async (DealId, toStageId, updatedCustomData, transitionId) => {
    const targetStage = blueprint?.stages?.find(s => s.id === toStageId);

    // Optimistic UI update
    setDeals(prevDeals => prevDeals.map(Deal => {
      if (Deal.id === DealId) {
        return { ...Deal, stageId: toStageId, stage: targetStage || Deal.stage, customData: updatedCustomData };
      }
      return Deal;
    }));

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/deals', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ DealId, stageId: toStageId, customData: updatedCustomData, transitionId })
      });

      if (res.ok) {
        const updatedDealFromServer = await res.json();
        setDeals(prevDeals => prevDeals.map(Deal =>
          Deal.id === DealId ? updatedDealFromServer : Deal
        ));

        // Also update the selectedDeal if it's currently open in the SlideOverPanel
        if (selectedDeal && selectedDeal.id === DealId) {
          setSelectedDeal(updatedDealFromServer);
        }
      }
    } catch (err) {
      console.error("Failed to transition Deal", err);
    }
  };

  const handleDealUpdate = (updatedDealFromServer) => {
    setDeals(prevDeals => prevDeals.map(Deal =>
      Deal.id === updatedDealFromServer.id ? updatedDealFromServer : Deal
    ));
    if (selectedDeal && selectedDeal.id === updatedDealFromServer.id) {
      setSelectedDeal(updatedDealFromServer);
    }
  };

  const toggleDealSelection = (DealId, e) => {
    e.stopPropagation();
    setSelectedDealIds(prev => {
      if (prev.includes(DealId)) return prev.filter(id => id !== DealId);
      return [...prev, DealId];
    });
  };

  const selectAllDeals = (e) => {
    if (e.target.checked) {
      setSelectedDealIds(Deals.map(l => l.id));
    } else {
      setSelectedDealIds([]);
    }
  };

  const handleBulkTagApply = async (tag) => {
    if (selectedDealIds.length === 0) return;
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/deals/bulk-tag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          DealIds: selectedDealIds,
          tagId: tag.id
        })
      });
      if (res.ok) {
        // Refresh Deals
        fetchData();
        setSelectedDealIds([]);
        setIsBulkTagPickerOpen(false);
      }
    } catch (err) {
      console.error("Failed to apply bulk tag", err);
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
              moduleName="Deal"
              records={Deals}
              blueprint={blueprint}
              supportKanban={true}
              onRecordClick={(deal) => setSelectedDeal(deal)}
              renderHeaderActions={() => (
                (currentUser?.profile?.canAccessSettings || currentUser?.profile?.permissions?.Deal?.create) ? (
                  <button className="btn-primary" onClick={() => setIsFormOpen(true)}>
                    + Add Deal
                  </button>
                ) : null
              )}
            />
          )}
        </div>
      </main>

      <DealIntakeForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handDealdDeal}
      />

      <SlideOverPanel
        isOpen={!!selectedDeal}
        onClose={() => {
          setSelectedDeal(null);
          setPendingTransition(null);
        }}
        Deal={selectedDeal}
        blueprint={blueprint}
        tags={tags}
        currentUser={currentUser}
        onTransition={handleTransition}
        onDealUpdate={handleDealUpdate}
        pendingTransition={pendingTransition}
      />

      {/* FLOATING BULK ACTION BAR */}
      {selectedDealIds.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0f172a',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              background: '#334155',
              color: 'white',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              {selectedDealIds.length}
            </span>
            <span style={{ fontWeight: 500 }}>Deals Selected</span>
          </div>

          <div style={{ width: '1px', height: '24px', background: '#334155' }}></div>

          <div style={{ display: 'flex', gap: '0.75rem', position: 'relative' }}>
            <button
              onClick={() => setIsBulkTagPickerOpen(!isBulkTagPickerOpen)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
                fontWeight: 500
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
              Apply Tag
            </button>

            {isBulkTagPickerOpen && (
              <div style={{
                position: 'absolute',
                bottom: 'calc(100% + 0.5rem)',
                left: 0,
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                width: '240px',
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                color: '#0f172a'
              }}>
                <div style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>
                  SELECT A TAG
                </div>
                {tags.length === 0 ? (
                  <div style={{ padding: '1rem', fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>
                    No tags available
                  </div>
                ) : (
                  tags.map(tag => (
                    <div
                      key={tag.id}
                      onClick={() => handleBulkTagApply(tag)}
                      style={{
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f8fafc'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: tag.color }}></div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{tag.name}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            <button
              onClick={() => setSelectedDealIds([])}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                padding: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
