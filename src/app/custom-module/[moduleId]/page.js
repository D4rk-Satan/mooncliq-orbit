"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Sidebar from "../../../components/Sidebar";
import DynamicModuleView from "../../../components/DynamicModuleView";
import SlideOverPanel from "../../../components/SlideOverPanel";
import DynamicIntakeForm from "../../../components/DynamicIntakeForm";
import EntityEditModal from "../../../components/EntityEditModal";
import Button from "../../../components/ui/Button";
import { fetchAuthSession } from "aws-amplify/auth";
import GlobalLoader from "../../../components/ui/GlobalLoader";


const getAuthToken = async () => {
  const { tokens } = await fetchAuthSession();
  return tokens?.idToken?.toString() || tokens?.accessToken?.toString();
};

export default function CustomModulePage() {
  const params = useParams();
  const moduleId = params.moduleId;

  const [moduleDef, setModuleDef] = useState(null);
  const [records, setRecords] = useState([]);
  const [blueprint, setBlueprint] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isNewRecordPanelOpen, setIsNewRecordPanelOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    async function fetchData() {
      if (!moduleId) return;
      try {
        const token = await getAuthToken();

        // 1. Fetch Module Info
        const modRes = await fetch(`/api/custom-modules`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const allMods = await modRes.json();
        const currentMod = allMods.find(m => m.id === moduleId);
        setModuleDef(currentMod);

        // 2. Fetch Module Records
        const recRes = await fetch(`/api/custom-modules/records?moduleId=${moduleId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const recordsData = await recRes.json();
        setRecords(recordsData);

        // 3. Fetch Real Blueprint layout setup
        const bpRes = await fetch(`/api/blueprint?moduleType=${moduleId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (bpRes.ok) {
          const bpData = await bpRes.json();
          setBlueprint(bpData);
        } else {
          setBlueprint({ moduleType: moduleId, fields: [] });
        }

      } catch (err) {
        console.error("Error loading custom module:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [moduleId]);

  const handleCreateRecord = async (newRecordData) => {
    try {
      const token = await getAuthToken();
      // Adjust the API call based on how DynamicIntakeForm returns data
      // For custom modules, the data goes into 'customData' mostly, or a mix of standard and custom.
      // We will send a POST to custom-modules/records
      const res = await fetch(`/api/custom-modules/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customModuleId: moduleId,
          blueprintId: blueprint?.id || "",
          stageId: blueprint?.stages?.[0]?.id || "",
          customData: newRecordData.customData || newRecordData,
          owner: newRecordData.owner || null,
          name: newRecordData.name || newRecordData.customData?.name || "New Record"
        })
      });
      if (res.ok) {
        const created = await res.json();
        setRecords([created, ...records]);
        setIsNewRecordPanelOpen(false);
      }
    } catch (err) {
      console.error("Error creating record:", err);
    }
  };

  const handleUpdateRecord = async (updatedData) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/custom-modules/records?id=${updatedData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customData: updatedData.customData || updatedData
        })
      });
      if (res.ok) {
        const result = await res.json();
        setRecords(records.map(r => r.id === result.id ? result : r));
        setRecordToEdit(null);
        if (selectedRecord && selectedRecord.id === result.id) {
          setSelectedRecord(result);
        }
      }
    } catch (err) {
      console.error("Error updating record:", err);
    }
  };

  // Navigation Logic for SlideOverPanel Arrows
  const selectedIndex = selectedRecord ? records.findIndex(r => r.id === selectedRecord.id) : -1;
  const hasNext = selectedIndex !== -1 && selectedIndex < records.length - 1;
  const hasPrev = selectedIndex > 0;

  const handleNext = () => {
    if (hasNext) setSelectedRecord(records[selectedIndex + 1]);
  };

  const handlePrev = () => {
    if (hasPrev) setSelectedRecord(records[selectedIndex - 1]);
  };

  if (loading) {
    return (
      <main className="dashboard-main" style={{ backgroundColor: 'var(--bg-primary)', padding: '1.5rem', overflowY: 'auto', position: 'relative', minHeight: '100vh' }}>
        <GlobalLoader overlay={true} />
      </main>
    );
  }


  if (!moduleDef) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
        <div style={{ flex: 1, padding: '2rem' }}>
          <h2>Module not found</h2>
        </div>
      </div>
    );
  }

  const handleDropRecord = async (recordId, stageId) => {
    try {
      const token = await getAuthToken();
      // Optimistic update
      const updatedRecords = records.map(r => r.id === recordId ? { ...r, stageId } : r);
      setRecords(updatedRecords);

      const res = await fetch(`/api/custom-modules/records?id=${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ stageId })
      });
      if (!res.ok) {
        throw new Error('Failed to update stage');
      }
      const result = await res.json();
      setRecords(prev => prev.map(r => r.id === result.id ? result : r));
    } catch (err) {
      console.error("Error dropping record:", err);
      // Revert would go here if needed
    }
  };

  const handleDeleteRecord = async (recordToDelete) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/custom-modules/records/${recordToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete record');
        return;
      }
      setRecords(prev => prev.filter(r => r.id !== recordToDelete.id));
      if (selectedRecord && selectedRecord.id === recordToDelete.id) {
        setSelectedRecord(null);
      }
    } catch (err) {
      console.error("Failed to delete record", err);
      alert('An error occurred while deleting the record.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <DynamicModuleView
        moduleName={moduleDef.name}
        records={records}
        blueprint={blueprint}
        tags={[]}
        supportKanban={true}
        onDropRecord={handleDropRecord}
        onRecordClick={(record) => setSelectedRecord(record)} // Open slide over panel on row click
        onEditClick={(record) => setRecordToEdit(record)} // Open edit modal on edit icon click
        renderHeaderActions={() => (
          <Button variant="primary" onClick={() => setIsNewRecordPanelOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            New Record
          </Button>
        )}
        onDeleteClick={handleDeleteRecord}
      />

      {/* CREATE PANEL */}
      <DynamicIntakeForm
        moduleType={moduleId}
        moduleName={moduleDef.name}
        isOpen={isNewRecordPanelOpen}
        onClose={() => setIsNewRecordPanelOpen(false)}
        onSave={handleCreateRecord}
      />

      {/* PREVIEW PANEL */}
      <SlideOverPanel
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        lead={selectedRecord}
        blueprint={blueprint}
        onEditClick={() => {
          setRecordToEdit(selectedRecord);
          setSelectedRecord(null); // Close preview panel when editing
        }}
        onLeadUpdate={handleUpdateRecord}
        hasNext={hasNext}
        hasPrev={hasPrev}
        onNext={handleNext}
        onPrev={handlePrev}
        onDeleteClick={handleDeleteRecord}
      />

      {/* EDIT MODAL */}
      <EntityEditModal
        isOpen={!!recordToEdit}
        onClose={() => setRecordToEdit(null)}
        entity={recordToEdit}
        blueprint={blueprint}
        onUpdate={handleUpdateRecord}
        moduleName={moduleDef.name}
        isCustomModule={true}
      />
    </div>
  );
}
