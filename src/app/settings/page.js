"use client";

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../../components/Sidebar";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function SettingsPage() {
  const [blueprint, setBlueprint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState("hub");
  const [selectedModule, setSelectedModule] = useState("Lead");

  // New Field State
  const [newField, setNewField] = useState({ name: "", label: "", type: "text", options: "", targetModule: "Account", isMultiSelect: false, isBiDirectional: false, targetDisplayField: "name" });
  const [isAddingField, setIsAddingField] = useState(false);

  // New Stage State
  const [newStage, setNewStage] = useState({ name: "", color: "#fde68a" });
  const [isAddingStage, setIsAddingStage] = useState(false);

  // Rules Manager State
  const [selectedRule, setSelectedRule] = useState(null);
  const [activeRuleTab, setActiveRuleTab] = useState('before');
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isFieldMenuOpen, setIsFieldMenuOpen] = useState(false);
  const addMenuRef = useRef(null);
  
  useEffect(() => {
    function handleClickOutside(event) {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) {
        setIsAddMenuOpen(false);
        setIsFieldMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [tagBuilder, setTagBuilder] = useState({ isOpen: false, name: '', color: '#ef4444' });
  const [fieldUpdateBuilder, setFieldUpdateBuilder] = useState({ isOpen: false, field: '', value: '' });
  const [createRecordBuilder, setCreateRecordBuilder] = useState({ isOpen: false, targetModule: 'Task', autoLink: true, mappings: [] });
  const tagColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#8b5cf6', '#ec4899', '#64748b', '#84cc16'];

  // Tag Manager State
  const [tags, setTags] = useState([]);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState({ name: "", color: "#ef4444", customColor: false });
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
  // selectedRule schema: { id, name, toStageId, fromStageIds: [], isGlobal: boolean, requiredFields: [], necessaryFields: [] }

  useEffect(() => {
    fetchBlueprint();
    fetchTags();
    fetchProfiles();
  }, [selectedModule]);

  const getAuthToken = async () => {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const { tokens } = await fetchAuthSession();
    return tokens.idToken.toString();
  };

  const [targetBlueprint, setTargetBlueprint] = useState(null);

  useEffect(() => {
    if (newField.targetModule && newField.targetModule !== selectedModule) {
      const fetchTarget = async () => {
        try {
          const token = await getAuthToken();
          const res = await fetch(`/api/blueprint?moduleType=${newField.targetModule}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) setTargetBlueprint(data);
        } catch (e) {
          console.error(e);
        }
      };
      fetchTarget();
    } else {
      setTargetBlueprint(blueprint);
    }
  }, [newField.targetModule, selectedModule, blueprint]);

  const getNativeFields = (moduleType) => {
    if (moduleType === 'Lead') return [{ name: 'firstName', label: 'First Name' }, { name: 'lastName', label: 'Last Name' }, { name: 'email', label: 'Email' }, { name: 'phone', label: 'Phone' }];
    if (moduleType === 'Account') return [{ name: 'companyName', label: 'Company Name' }, { name: 'website', label: 'Website' }, { name: 'phone', label: 'Phone' }];
    if (moduleType === 'Task') return [{ name: 'taskName', label: 'Task Name' }, { name: 'dueDate', label: 'Due Date' }];
    if (moduleType === 'Product') return [{ name: 'name', label: 'Product Name' }, { name: 'sku', label: 'SKU' }, { name: 'price', label: 'Price' }];
    return [{ name: 'name', label: 'Name / Default' }];
  };


  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const fetchBlueprint = async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/blueprint?moduleType=${selectedModule}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setBlueprint({ error: data.error });
      } else {
        setBlueprint(data);
      }
    } catch (err) {
      console.error("Failed to load blueprint", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/profiles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setProfiles(await res.json());
      }
    } catch (err) {
      console.error("Failed to load profiles", err);
    }
  };

  const fetchTags = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/tags?moduleType=${selectedModule}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTags(await res.json());
      }
    } catch (err) {
      console.error("Failed to load tags", err);
    }
  };

  // --- Field Handlers ---
  const handleAddField = async (e) => {
    e.preventDefault();
    if (!newField.label || !newField.type) return;

    const name = newField.label.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(' ').map((w, i) => i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)).join('');

    try {
      const token = await getAuthToken();
      const payload = {
        name,
        label: newField.label,
        type: newField.type,
        options: newField.type === 'select' && newField.options ? newField.options.split(',').map(s => s.trim()).filter(Boolean) : [],
        targetModule: newField.type === 'lookup' ? newField.targetModule : null,
        targetDisplayField: newField.type === 'lookup' ? newField.targetDisplayField : null,
        isMultiSelect: newField.type === 'lookup' ? newField.isMultiSelect : false,
        isBiDirectional: newField.type === 'lookup' ? newField.isBiDirectional : false,
        mappings: newField.type === 'lookup' ? (newField.mappings || []) : [],
        blueprintId: blueprint.id
      };

      const res = await fetch('/api/fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setNewField({ name: "", label: "", type: "text", options: "", targetModule: "Account", isMultiSelect: false, isBiDirectional: false });
        setIsAddingField(false);
        fetchBlueprint();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteField = async (id) => {
    if (!confirm("Are you sure you want to delete this field?")) return;
    try {
      const res = await fetch(`/api/fields?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchBlueprint();
    } catch (err) {
      console.error(err);
    }
  };

  // --- Stage Handlers ---
  const handleAddStage = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newStage,
        blueprintId: blueprint.id
      };

      const res = await fetch('/api/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setNewStage({ name: "", color: "#fde68a" });
        setIsAddingStage(false);
        fetchBlueprint();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStage = async (id) => {
    if (!confirm("Are you sure you want to delete this stage?")) return;
    try {
      const res = await fetch(`/api/stages?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete stage.");
      } else {
        fetchBlueprint();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTag = async (e) => {
    e.preventDefault();
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...newTag, moduleType: selectedModule })
      });
      if (res.ok) {
        setNewTag({ name: "", color: "#ef4444", customColor: false });
        setIsAddingTag(false);
        fetchTags();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTag = async (id) => {
    if (!confirm("Are you sure you want to delete this tag?")) return;
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/tags?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchTags();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const token = await getAuthToken();
      const method = selectedProfile.id ? 'PUT' : 'POST';
      const url = selectedProfile.id ? `/api/profiles?id=${selectedProfile.id}` : '/api/profiles';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(selectedProfile)
      });
      
      if (res.ok) {
        setIsProfileModalOpen(false);
        fetchProfiles();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save profile");
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
    }
  };

  const handleDeleteProfile = async (id) => {
    if (!confirm("Are you sure you want to delete this profile?")) return;
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/profiles?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchProfiles();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete profile");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(blueprint.stages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((stage, index) => ({
      ...stage,
      orderIndex: index
    }));

    // Optimistic UI update
    setBlueprint({ ...blueprint, stages: updatedItems });

    // API Call
    try {
      await fetch('/api/stages/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: updatedItems.map(s => ({ id: s.id, orderIndex: s.orderIndex }))
        })
      });
    } catch (err) {
      console.error(err);
      fetchBlueprint(); // rollback
    }
  };

  // --- Rule Handlers ---
  const openRuleModal = (existingRule = null) => {
    setActiveRuleTab('before');
    setIsAddMenuOpen(false);
    if (existingRule) {
      setSelectedRule({
        id: existingRule.id,
        name: existingRule.name,
        toStageId: existingRule.toStageId,
        fromStageIds: existingRule.fromStages?.map(s => s.id) || [],
        isGlobal: existingRule.isGlobal,
        requiredFields: existingRule.requiredFields || [],
        necessaryFields: existingRule.necessaryFields || [],
        visibleFields: existingRule.visibleFields || [],
        executionCriteria: existingRule.executionCriteria || { type: 'all', conditions: [] },
        customMessage: existingRule.customMessage || "",
        hasCustomMessage: !!existingRule.customMessage,
        checklists: existingRule.checklists || [],
        afterActions: existingRule.afterActions || { emails: [], calls: [], fieldUpdates: [], createRecords: [], webhooks: [], customActions: [], tags: [] }
      });
    } else {
      setSelectedRule({
        id: null,
        name: "",
        toStageId: "",
        fromStageIds: [],
        isGlobal: false,
        requiredFields: [],
        necessaryFields: [],
        visibleFields: [],
        executionCriteria: { type: 'all', conditions: [] },
        customMessage: "",
        hasCustomMessage: false,
        checklists: [],
        afterActions: { emails: [], calls: [], fieldUpdates: [], createRecords: [], webhooks: [], customActions: [], tags: [] }
      });
    }
  };

  const handleSaveRule = async () => {
    if (!selectedRule.name || !selectedRule.toStageId) {
      alert("Button Name and Destination Stage are required");
      return;
    }

    try {
      if (selectedRule.id) {
        await fetch(`/api/transitions?id=${selectedRule.id}`, { method: 'DELETE' });
      }

      const res = await fetch('/api/transitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blueprintId: blueprint.id,
          name: selectedRule.name,
          toStageId: selectedRule.toStageId,
          fromStageIds: selectedRule.fromStageIds,
          isGlobal: selectedRule.isGlobal,
          visibleFields: selectedRule.visibleFields,
          requiredFields: selectedRule.requiredFields,
          necessaryFields: selectedRule.necessaryFields,
          executionCriteria: selectedRule.executionCriteria,
          customMessage: selectedRule.hasCustomMessage ? selectedRule.customMessage : null,
          checklists: selectedRule.checklists,
          afterActions: selectedRule.afterActions
        })
      });

      if (res.ok) {
        setSelectedRule(null);
        fetchBlueprint();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRule = async () => {
    if (!selectedRule.id) return;
    if (!confirm("Are you sure you want to remove this rule?")) return;

    try {
      const res = await fetch(`/api/transitions?id=${selectedRule.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedRule(null);
        fetchBlueprint();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleArrayItem = (array, item) => {
    if (array.includes(item)) return array.filter(i => i !== item);
    return [...array, item];
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main" style={{ overflowY: 'auto' }}>
        <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Admin Settings</h1>
            <p className="text-muted" style={{ marginTop: '0.5rem' }}>Configure your dynamic CRM Blueprints</p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#64748b' }}>Configure Module:</span>
            <select 
              value={selectedModule} 
              onChange={(e) => setSelectedModule(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: 'white',
                fontWeight: 600,
                color: 'var(--primary)',
                fontSize: '1rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="Lead">Lead</option>
              <option value="Deal">Deal</option>
              <option value="Account">Account</option>
              <option value="Product">Product</option>
              <option value="Task">Task</option>
            </select>
          </div>
        </header>

        <div className="module-content" style={{ padding: '2rem', maxWidth: '1200px' }}>
          {isLoading ? (
            <div>Loading Settings...</div>
          ) : !blueprint || blueprint.error ? (
            <div>Failed to load blueprint: {blueprint?.error || "Unknown error"}</div>
          ) : currentView === 'hub' ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>

                {/* Customization Card */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: '#f3f4f6', padding: '0.5rem', borderRadius: '8px', color: '#475569' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" /><path d="m14 7 3 3" /><path d="M5 6v4" /><path d="M19 14v4" /><path d="M10 2v2" /><path d="M7 8H3" /><path d="M21 16h-4" /><path d="M11 3H9" /></svg>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>{selectedModule} Customization</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <button onClick={() => setCurrentView('fields')} style={{ textAlign: 'left', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', borderRadius: '6px', transition: 'all 0.2s', fontWeight: 500 }} onMouseEnter={e => e.target.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}>
                      Modules and Fields
                    </button>
                    <button onClick={() => setCurrentView('tags')} style={{ textAlign: 'left', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', borderRadius: '6px', transition: 'all 0.2s', fontWeight: 500 }} onMouseEnter={e => e.target.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}>
                      Tag Definitions
                    </button>
                    <button onClick={() => setCurrentView('blueprint')} style={{ textAlign: 'left', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', borderRadius: '6px', transition: 'all 0.2s', fontWeight: 500 }} onMouseEnter={e => e.target.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}>
                      Workflow Engine
                    </button>
                    <button onClick={() => setCurrentView('lookups')} style={{ textAlign: 'left', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', borderRadius: '6px', transition: 'all 0.2s', fontWeight: 500 }} onMouseEnter={e => e.target.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}>
                      Relationships & Lookups
                    </button>
                  </div>
                </div>

                {/* Users and Control Card */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: '#f3f4f6', padding: '0.5rem', borderRadius: '8px', color: '#475569' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Users & Control</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <button onClick={() => setCurrentView('profiles')} style={{ textAlign: 'left', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', borderRadius: '6px', transition: 'all 0.2s', fontWeight: 500 }} onMouseEnter={e => e.target.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}>
                      Roles & Profiles
                    </button>
                    <button disabled style={{ textAlign: 'left', padding: '0.5rem', background: 'none', border: 'none', cursor: 'not-allowed', color: '#cbd5e1', fontSize: '0.95rem', borderRadius: '6px', fontWeight: 500 }}>
                      Invite Users (Coming Soon)
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="settings-container" style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)' }}>

              <div style={{ display: 'flex', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <button
                  onClick={() => setCurrentView('hub')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}
                >
                  ← Back to Setup
                </button>
                <div style={{ width: '1px', height: '24px', backgroundColor: '#cbd5e1', margin: '0 1.5rem' }}></div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
                  {currentView === 'blueprint' && "Pipelines & Blueprint"}
                  {currentView === 'fields' && "Modules and Fields"}
                  {currentView === 'tags' && "Tag Definitions"}
                  {currentView === 'lookups' && "Relationships & Lookups"}
                </h2>
              </div>

              <div style={{ padding: '2rem' }}>

                {/* BLUEPRINT TAB */}
                {currentView === 'blueprint' && (
                  <div>
                    <div style={{ marginBottom: '2rem' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Live Pipeline Preview</h2>
                      {/* CSS Pipeline Visualization (Read-Only) */}
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0', padding: '1rem 0', overflowX: 'auto', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', paddingLeft: '1rem' }}>
                        {blueprint.stages.map((stage, index) => {
                          const nextStage = blueprint.stages[index + 1];
                          return (
                            <React.Fragment key={stage.id}>
                              <div style={{
                                border: '2px solid #e2e8f0', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600,
                                backgroundColor: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)', flexShrink: 0
                              }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: stage.color }}></div>
                                {stage.name}
                              </div>
                              {nextStage && (
                                <div style={{ flex: 1, minWidth: '40px', height: '3px', background: '#cbd5e1', position: 'relative', margin: '0 4px' }}>
                                  <div style={{ position: 'absolute', right: 0, top: '-4.5px', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: `8px solid #cbd5e1` }}></div>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                        {blueprint.stages.length === 0 && <span style={{ color: '#94a3b8' }}>No stages created yet.</span>}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                      {/* STAGE MANAGER (Drag & Drop) */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>1. Stage Manager</h3>
                          <button className="btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }} onClick={() => setIsAddingStage(!isAddingStage)}>
                            {isAddingStage ? 'Cancel' : '+ Add Stage'}
                          </button>
                        </div>

                        {isAddingStage && (
                          <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                            <input required type="text" placeholder="Stage Name" className="form-input bg-white" style={{ marginBottom: '0.5rem' }} value={newStage.name} onChange={e => setNewStage({ ...newStage, name: e.target.value })} />
                            <select className="form-input bg-white" style={{ marginBottom: '1rem' }} value={newStage.color} onChange={e => setNewStage({ ...newStage, color: e.target.value })}>
                              <option value="#fde68a">Yellow</option>
                              <option value="#fed7aa">Orange</option>
                              <option value="#c4b5fd">Purple</option>
                              <option value="#fbcfe8">Pink</option>
                              <option value="#a7f3d0">Green</option>
                              <option value="#bfdbfe">Blue</option>
                              <option value="#fca5a5">Red</option>
                            </select>
                            <button onClick={handleAddStage} className="btn-primary" style={{ width: '100%' }}>Save Stage</button>
                          </div>
                        )}

                        <DragDropContext onDragEnd={handleDragEnd}>
                          <Droppable droppableId="stages">
                            {(provided) => (
                              <div {...provided.droppableProps} ref={provided.innerRef}>
                                {blueprint.stages.map((stage, index) => (
                                  <Draggable key={stage.id} draggableId={stage.id} index={index}>
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        style={{
                                          padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px',
                                          marginBottom: '0.5rem', background: 'white', display: 'flex',
                                          justifyContent: 'space-between', alignItems: 'center',
                                          ...provided.draggableProps.style
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                          <div style={{ cursor: 'grab', color: '#cbd5e1' }}>⋮⋮</div>
                                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: stage.color }}></div>
                                          <span style={{ fontWeight: 500 }}>{stage.name}</span>
                                        </div>
                                        <button onClick={() => handleDeleteStage(stage.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </DragDropContext>
                      </div>

                      {/* RULES MANAGER */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>2. Rules Manager</h3>
                          <button className="btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', background: '#10b981' }} onClick={() => openRuleModal()}>
                            + Create Rule
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {blueprint.transitions.length === 0 && <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No transition rules created.</p>}
                          {blueprint.transitions.map(t => {
                            const destStage = blueprint.stages.find(s => s.id === t.toStageId);
                            return (
                              <div
                                key={t.id}
                                onClick={() => openRuleModal(t)}
                                style={{ padding: '1rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                              >
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '0.25rem' }}>{t.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    {t.isGlobal ? "From Any Stage" : `From ${t.fromStages?.length || 0} Stage(s)`} ➔ To {destStage?.name || "Unknown"}
                                  </div>
                                </div>
                                <div style={{ color: '#cbd5e1' }}>➔</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* FIELDS TAB */}
                {currentView === 'fields' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{selectedModule} Fields</h2>
                      <button className="btn-primary" onClick={() => setIsAddingField(!isAddingField)}>
                        {isAddingField ? 'Cancel' : '+ Add Field'}
                      </button>
                    </div>

                    {isAddingField && (
                      <form onSubmit={handleAddField} style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                          <div>
                            <label className="form-label">Field Label (e.g. Lead Source)</label>
                            <input required type="text" className="form-input bg-white" value={newField.label} onChange={e => setNewField({ ...newField, label: e.target.value })} />
                          </div>
                          <div>
                            <label className="form-label">Field Type</label>
                            <select className="form-input bg-white" value={newField.type} onChange={e => setNewField({ ...newField, type: e.target.value })}>
                              <option value="text">Short Text</option>
                              <option value="textarea">Long Text (Text area)</option>
                              <option value="number">Number</option>
                              <option value="currency">Currency</option>
                              <option value="date">Date</option>
                              <option value="checkbox">Checkbox (True/False)</option>
                              <option value="select">Dropdown (Select)</option>
                            </select>
                          </div>
                          {newField.type === 'select' && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <label className="form-label">Dropdown Options (Comma Separated)</label>
                              <input
                                required
                                type="text"
                                className="form-input bg-white"
                                placeholder="e.g. Enterprise, Mid-Market, Startup"
                                value={newField.options || ''}
                                onChange={e => setNewField({ ...newField, options: e.target.value })}
                              />
                            </div>
                          )}
                        </div>
                        <button type="submit" className="btn-primary">Save Field</button>
                      </form>
                    )}

                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 500 }}>Label</th>
                          <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 500 }}>Database ID</th>
                          <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 500 }}>Type</th>
                          <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blueprint.fields.map(field => (
                          <tr key={field.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '1rem', fontWeight: 500 }}>{field.label}</td>
                            <td style={{ padding: '1rem', color: '#64748b', fontFamily: 'monospace' }}>{field.name}</td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{ backgroundColor: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem' }}>{field.type}</span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                              <button onClick={() => handleDeleteField(field.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* TAGS TAB */}
                {currentView === 'tags' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Tag Definitions</h2>
                      <button className="btn-primary" onClick={() => setIsAddingTag(!isAddingTag)}>
                        {isAddingTag ? 'Cancel' : '+ Add Tag'}
                      </button>
                    </div>

                    {isAddingTag && (
                      <form onSubmit={handleAddTag} style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                          <div>
                            <label className="form-label">Tag Name (e.g. VIP)</label>
                            <input required type="text" className="form-input bg-white" value={newTag.name} onChange={e => setNewTag({ ...newTag, name: e.target.value })} />
                          </div>
                          <div>
                            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Tag Color</span>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontWeight: 'normal', fontSize: '0.85rem' }}>
                                <input type="checkbox" checked={newTag.customColor} onChange={e => setNewTag({ ...newTag, customColor: e.target.checked })} />
                                Use Custom Color
                              </label>
                            </label>
                            {newTag.customColor ? (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input type="color" value={newTag.color} onChange={e => setNewTag({ ...newTag, color: e.target.value })} style={{ height: '42px', padding: '0', cursor: 'pointer' }} />
                                <input type="text" className="form-input bg-white" value={newTag.color} onChange={e => setNewTag({ ...newTag, color: e.target.value })} style={{ flex: 1 }} />
                              </div>
                            ) : (
                              <select className="form-input bg-white" value={newTag.color} onChange={e => setNewTag({ ...newTag, color: e.target.value })}>
                                <option value="#ef4444">Red</option>
                                <option value="#f97316">Orange</option>
                                <option value="#eab308">Yellow</option>
                                <option value="#22c55e">Green</option>
                                <option value="#0ea5e9">Blue</option>
                                <option value="#8b5cf6">Purple</option>
                                <option value="#ec4899">Pink</option>
                                <option value="#64748b">Slate</option>
                              </select>
                            )}
                          </div>
                        </div>
                        <button type="submit" className="btn-primary">Save Tag</button>
                      </form>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                      {tags.length === 0 && <p style={{ color: '#64748b' }}>No tags defined yet.</p>}
                      {tags.map(tag => (
                        <div key={tag.id} style={{ padding: '1rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: tag.color }}></div>
                            <span style={{ fontWeight: 500 }}>{tag.name}</span>
                          </div>
                          <button onClick={() => handleDeleteTag(tag.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* LOOKUPS TAB */}
                {currentView === 'lookups' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Relationships & Lookups</h2>
                      <button className="btn-primary" onClick={() => setIsAddingField(!isAddingField)}>
                        {isAddingField ? 'Cancel' : '+ Add Relationship'}
                      </button>
                    </div>

                    {isAddingField && (
                      <form onSubmit={handleAddField} style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                          <div>
                            <label className="form-label">Relationship Label (e.g. Related Account)</label>
                            <input required type="text" className="form-input bg-white" placeholder="Related Account" value={newField.label} onChange={e => setNewField({ ...newField, label: e.target.value, type: 'lookup' })} />
                          </div>
                          <div>
                            <label className="form-label">Target Module (Which module to link to?)</label>
                            <select className="form-input bg-white" value={newField.targetModule} onChange={e => setNewField({ ...newField, targetModule: e.target.value, type: 'lookup' })}>
                              {['Lead', 'Deal', 'Account', 'Product', 'Task'].filter(m => m !== selectedModule).map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                              {['Lead', 'Deal', 'Account', 'Product', 'Task'].includes(selectedModule) && (
                                 <option value={selectedModule}>{selectedModule} (Self Reference)</option>
                              )}
                            </select>
                          </div>
                          <div>
                            <label className="form-label">Target Display Field (Which field to show/search)</label>
                            <select className="form-input bg-white" value={newField.targetDisplayField || 'name'} onChange={e => setNewField({ ...newField, targetDisplayField: e.target.value, type: 'lookup' })}>
                              <option value="name">Name / Default</option>
                              {getNativeFields(newField.targetModule).map(f => (
                                <option key={f.name} value={f.name}>{f.label} (Native)</option>
                              ))}
                              {(targetBlueprint?.fields || []).map(f => (
                                <option key={f.name} value={f.name}>{f.label} (Custom)</option>
                              ))}
                            </select>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', paddingTop: '1.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: '#334155' }}>
                              <input type="checkbox" checked={newField.isMultiSelect} onChange={e => setNewField({ ...newField, isMultiSelect: e.target.checked, type: 'lookup' })} />
                              Allow Multiple Selections
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: '#334155' }}>
                              <input type="checkbox" checked={newField.isBiDirectional} onChange={e => setNewField({ ...newField, isBiDirectional: e.target.checked, type: 'lookup' })} />
                              Create Reverse Connection
                            </label>
                          </div>

                          <div style={{ gridColumn: '1 / -1', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Auto-Fill Mappings (Optional)</h4>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>When a record is selected, automatically copy its data into fields on this form.</p>
                            
                            {(newField.mappings || []).map((mapping, idx) => (
                              <div key={idx} style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                                <select className="form-input bg-white" value={mapping.sourceField} onChange={e => {
                                  const m = [...(newField.mappings || [])];
                                  m[idx].sourceField = e.target.value;
                                  setNewField({...newField, mappings: m});
                                }}>
                                  <option value="">Select Target Field...</option>
                                  {getNativeFields(newField.targetModule).map(f => <option key={f.name} value={f.name}>{f.label} (Native)</option>)}
                                  {(targetBlueprint?.fields || []).map(f => <option key={f.name} value={f.name}>{f.label} (Custom)</option>)}
                                </select>
                                <span style={{ padding: '0.5rem', color: '#64748b' }}>➔ pastes to ➔</span>
                                <select className="form-input bg-white" value={mapping.targetField} onChange={e => {
                                  const m = [...(newField.mappings || [])];
                                  m[idx].targetField = e.target.value;
                                  setNewField({...newField, mappings: m});
                                }}>
                                  <option value="">Select Local Field...</option>
                                  {getNativeFields(selectedModule).map(f => <option key={f.name} value={f.name}>{f.label} (Native)</option>)}
                                  {(blueprint?.fields || []).map(f => <option key={f.name} value={f.name}>{f.label} (Custom)</option>)}
                                </select>
                                <button type="button" onClick={() => {
                                  const m = [...(newField.mappings || [])];
                                  m.splice(idx, 1);
                                  setNewField({...newField, mappings: m});
                                }} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                              </div>
                            ))}
                            <button type="button" onClick={() => setNewField({...newField, mappings: [...(newField.mappings || []), {sourceField: '', targetField: ''}]})} style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', marginTop: '0.5rem' }}>+ Add Mapping</button>
                          </div>
                        </div>
                        <button type="submit" className="btn-primary">Save Relationship</button>
                      </form>
                    )}

                    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>LABEL</th>
                            <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>TARGET MODULE</th>
                            <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>DISPLAY FIELD</th>
                            <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', textAlign: 'right' }}>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!blueprint?.fields?.filter(f => f.type === 'lookup').length && (
                            <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No relationships defined.</td></tr>
                          )}
                          {(blueprint?.fields || []).filter(f => f.type === 'lookup').map(field => (
                            <tr key={field.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '1rem', fontWeight: 500 }}>{field.label} {field.isMultiSelect && <span style={{fontSize:'0.75rem', background:'#e2e8f0', padding:'2px 6px', borderRadius:'4px', marginLeft:'0.5rem'}}>Multi</span>}</td>
                              <td style={{ padding: '1rem' }}><span style={{ backgroundColor: '#f0f9ff', color: '#0369a1', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 500 }}>{field.targetModule}</span></td>
                              <td style={{ padding: '1rem', color: '#475569' }}>{field.targetDisplayField || 'name'}</td>
                              <td style={{ padding: '1rem', textAlign: 'right' }}>
                                <button onClick={() => handleDeleteField(field.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* PROFILES TAB */}
                {currentView === 'profiles' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Roles & Profiles</h2>
                      <button className="btn-primary" onClick={() => {
                        setSelectedProfile({
                          name: '',
                          canAccessSettings: false,
                          canExportData: false,
                          permissions: {
                            Lead: { view: false, create: false, edit: false, delete: false },
                            Account: { view: false, create: false, edit: false, delete: false },
                            Task: { view: false, create: false, edit: false, delete: false },
                            Product: { view: false, create: false, edit: false, delete: false }
                          }
                        });
                        setIsProfileModalOpen(true);
                      }}>+ New Profile</button>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {profiles.map(profile => (
                        <div key={profile.id} style={{ padding: '1.5rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#0f172a' }}>{profile.name}</h3>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
                              <span>Admin: {profile.canAccessSettings ? 'Yes' : 'No'}</span>
                              <span>Export: {profile.canExportData ? 'Yes' : 'No'}</span>
                            </div>
                          </div>
                          <button className="btn-outline" onClick={() => {
                            setSelectedProfile(profile);
                            setIsProfileModalOpen(true);
                          }}>Edit Permissions</button>
                        </div>
                      ))}
                      {profiles.length === 0 && <p>No profiles found.</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* RULE MODAL */}
      {selectedRule && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '2.5rem', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>{selectedRule.id ? 'Edit Rule' : 'Create New Rule'}</h2>
              <button onClick={() => setSelectedRule(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Button Name</label>
                <input type="text" className="form-input" placeholder="e.g. Qualify Lead" value={selectedRule.name} onChange={e => setSelectedRule({ ...selectedRule, name: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 600 }}>

                  <span>From Stage(s)</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: 'var(--primary)' }}>
                    <input type="checkbox" checked={selectedRule.isGlobal} onChange={e => setSelectedRule({ ...selectedRule, isGlobal: e.target.checked })} />
                    Global (All)
                  </label>
                </label>

                {!selectedRule.isGlobal && (
                  <div style={{ position: 'relative' }}>

                    <div
                      onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
                      style={{
                        border: '1px solid #e2e8f0', padding: '0.5rem 1rem', borderRadius: '8px',
                        background: 'white', cursor: 'pointer', display: 'flex',
                        justifyContent: 'space-between', alignItems: 'center', minHeight: '42px'
                      }}
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {selectedRule.fromStageIds.length === 0 ? (
                          <span style={{ color: '#94a3b8' }}>Select stages...</span>
                        ) : (
                          selectedRule.fromStageIds.map(id => {
                            const stage = blueprint.stages.find(s => s.id === id);
                            return stage ? (
                              <span key={id} style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid #e2e8f0' }}>
                                {stage.name}
                              </span>
                            ) : null;
                          })
                        )}
                      </div>
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>▼</span>
                    </div>

                    {isStageDropdownOpen && (
                      <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setIsStageDropdownOpen(false)}></div>
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.25rem',
                          background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 20,
                          maxHeight: '200px', overflowY: 'auto', padding: '0.5rem'
                        }}>
                          {blueprint.stages.map(stage => {
                            const isDisabled = stage.id === selectedRule.toStageId;
                            return (
                              <label key={stage.id} style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem',
                                cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.5 : 1,
                                borderRadius: '4px', transition: 'background 0.2s', margin: 0
                              }} onMouseEnter={e => { if (!isDisabled) e.currentTarget.style.background = '#f8fafc' }} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <input
                                  type="checkbox"
                                  disabled={isDisabled}
                                  checked={selectedRule.fromStageIds.includes(stage.id)}
                                  onChange={() => setSelectedRule({ ...selectedRule, fromStageIds: toggleArrayItem(selectedRule.fromStageIds, stage.id) })}
                                />
                                <span style={{ fontSize: '0.875rem' }}>{stage.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Destination Stage (To)</label>
                <select className="form-input" value={selectedRule.toStageId || ""} onChange={e => {
                  const newToId = e.target.value;
                  const newFromIds = selectedRule.fromStageIds.filter(id => id !== newToId);
                  setSelectedRule({ ...selectedRule, toStageId: newToId, fromStageIds: newFromIds });
                }}>
                  <option value="" disabled>Select Destination Stage</option>
                  {blueprint.stages.map(s => (
                    <option
                      key={s.id}
                      value={s.id}
                      disabled={selectedRule.fromStageIds.includes(s.id)}
                    >
                      {s.name} {selectedRule.fromStageIds.includes(s.id) ? "(Selected in From)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <button
                onClick={() => setActiveRuleTab('before')}
                style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeRuleTab === 'before' ? '2px solid var(--primary)' : '2px solid transparent', color: activeRuleTab === 'before' ? 'var(--primary)' : '#64748b', fontWeight: 600, cursor: 'pointer' }}
              >
                Before
              </button>
              <button
                onClick={() => setActiveRuleTab('during')}
                style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeRuleTab === 'during' ? '2px solid var(--primary)' : '2px solid transparent', color: activeRuleTab === 'during' ? 'var(--primary)' : '#64748b', fontWeight: 600, cursor: 'pointer' }}
              >
                During
              </button>
              <button
                onClick={() => setActiveRuleTab('after')}
                style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeRuleTab === 'after' ? '2px solid var(--primary)' : '2px solid transparent', color: activeRuleTab === 'after' ? 'var(--primary)' : '#64748b', fontWeight: 600, cursor: 'pointer' }}
              >
                After
              </button>
            </div>

            <div style={{ minHeight: '300px' }}>

              {activeRuleTab === 'before' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>



                  <div style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Execution Criteria</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {(selectedRule.executionCriteria.conditions || []).length === 0 && (
                        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0, fontStyle: 'italic' }}>
                          This rule currently applies to all records. Add a condition to restrict it.
                        </p>
                      )}

                      {(selectedRule.executionCriteria.conditions || []).map((cond, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {idx > 0 && (
                            <div style={{ paddingLeft: '2rem' }}>
                              <select
                                className="form-input"
                                style={{ width: '80px', padding: '0.1rem 0.5rem', fontSize: '0.8rem', background: '#f8fafc' }}
                                value={cond.logical || 'AND'}
                                onChange={e => {
                                  const newConds = [...(selectedRule.executionCriteria.conditions || [])];
                                  newConds[idx].logical = e.target.value;
                                  setSelectedRule({ ...selectedRule, executionCriteria: { ...selectedRule.executionCriteria, conditions: newConds } });
                                }}
                              >
                                <option value="AND">AND</option>
                                <option value="OR">OR</option>
                              </select>
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <select className="form-input" style={{ width: '200px' }} value={cond.field} onChange={e => {
                              const newConds = [...(selectedRule.executionCriteria.conditions || [])];
                              newConds[idx].field = e.target.value;
                              setSelectedRule({ ...selectedRule, executionCriteria: { ...selectedRule.executionCriteria, conditions: newConds } });
                            }}>
                              <option value="">Select Field</option>
                              <optgroup label="Standard Fields">
                                <option value="firstName">First Name</option>
                                <option value="lastName">Last Name</option>
                                <option value="email">Email</option>
                                <option value="phone">Phone</option>
                                <option value="owner">Owner</option>
                              </optgroup>
                              {blueprint.fields.length > 0 && (
                                <optgroup label="Custom Fields">
                                  {blueprint.fields.map(f => <option key={f.id} value={f.name}>{f.label}</option>)}
                                </optgroup>
                              )}
                            </select>
                            <select className="form-input" style={{ width: '150px' }} value={cond.operator} onChange={e => {
                              const newConds = [...(selectedRule.executionCriteria.conditions || [])];
                              newConds[idx].operator = e.target.value;
                              setSelectedRule({ ...selectedRule, executionCriteria: { ...selectedRule.executionCriteria, conditions: newConds } });
                            }}>
                              <option value="is">is</option>
                              <option value="isn't">isn't</option>
                              <option value="contains">contains</option>
                              <option value="doesn't contain">doesn't contain</option>
                              <option value="starts with">starts with</option>
                              <option value="ends with">ends with</option>
                              <option value="is empty">is empty</option>
                              <option value="is not empty">is not empty</option>
                            </select>
                            {!['is empty', 'is not empty'].includes(cond.operator) && (
                              <input type="text" className="form-input" style={{ flex: 1 }} placeholder="Value" value={cond.value} onChange={e => {
                                const newConds = [...(selectedRule.executionCriteria.conditions || [])];
                                newConds[idx].value = e.target.value;
                                setSelectedRule({ ...selectedRule, executionCriteria: { ...selectedRule.executionCriteria, conditions: newConds } });
                              }} />
                            )}
                            <button onClick={() => {
                              const newConds = (selectedRule.executionCriteria.conditions || []).filter((_, i) => i !== idx);
                              setSelectedRule({ ...selectedRule, executionCriteria: { ...selectedRule.executionCriteria, conditions: newConds } });
                            }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
                          </div>
                        </div>
                      ))}
                      <button onClick={() => {
                        const newConds = [...(selectedRule.executionCriteria.conditions || []), { field: '', operator: 'is', value: '' }];
                        setSelectedRule({ ...selectedRule, executionCriteria: { ...selectedRule.executionCriteria, conditions: newConds } });
                      }} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 500, padding: 0 }}>+ Add Condition</button>
                    </div>
                  </div>
                </div>
              )}

              {activeRuleTab === 'during' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem', position: 'relative' }} ref={addMenuRef}>
                    <button onClick={() => { setIsAddMenuOpen(!isAddMenuOpen); setIsFieldMenuOpen(false); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>+</span> Add
                    </button>
                    {isAddMenuOpen && (
                      <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10, padding: '0.5rem', width: '200px', display: 'flex', flexDirection: 'column' }}>
                        <button onClick={() => {
                          if (!selectedRule.hasCustomMessage) setSelectedRule({ ...selectedRule, hasCustomMessage: true });
                          setIsAddMenuOpen(false);
                          setIsFieldMenuOpen(false);
                        }} style={{ padding: '0.5rem', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '4px' }} onMouseEnter={e => e.target.style.background = '#f8fafc'} onMouseLeave={e => e.target.style.background = 'transparent'}>Message</button>
                        <button onClick={() => {
                          setSelectedRule({ ...selectedRule, checklists: [...selectedRule.checklists, ""] });
                          setIsAddMenuOpen(false);
                          setIsFieldMenuOpen(false);
                        }} style={{ padding: '0.5rem', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '4px' }} onMouseEnter={e => e.target.style.background = '#f8fafc'} onMouseLeave={e => e.target.style.background = 'transparent'}>Checklists</button>

                        {/* New Add Field Button */}
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => setIsFieldMenuOpen(!isFieldMenuOpen)}
                            style={{ padding: '0.5rem', textAlign: 'left', background: isFieldMenuOpen ? '#f8fafc' : 'none', border: 'none', cursor: 'pointer', borderRadius: '4px', width: '100%' }}
                            onMouseEnter={e => e.target.style.background = '#f8fafc'}
                            onMouseLeave={e => e.target.style.background = isFieldMenuOpen ? '#f8fafc' : 'transparent'}
                          >
                            Field Requirements
                          </button>
                          {/* Dropdown for fields not yet added */}
                          {isFieldMenuOpen && (
                            <div style={{ position: 'absolute', top: 0, right: '100%', marginRight: '0.5rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 11, padding: '0.5rem', width: '200px', display: 'flex', flexDirection: 'column', maxHeight: '250px', overflowY: 'auto' }}>
                              {blueprint.fields.length === 0 ? (
                                <div style={{ padding: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>No fields available</div>
                              ) : (
                                blueprint.fields.map(f => {
                                  const isChecked = (selectedRule.visibleFields || []).includes(f.name);
                                  return (
                                    <label key={f.name} style={{
                                      display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem',
                                      cursor: 'pointer', borderRadius: '4px', transition: 'background 0.2s', margin: 0
                                    }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          let newVisible = toggleArrayItem(selectedRule.visibleFields || [], f.name);
                                          let newMandatory = selectedRule.requiredFields || [];
                                          let newDoubleVerify = selectedRule.necessaryFields || [];
                                          if (!newVisible.includes(f.name)) {
                                            newMandatory = newMandatory.filter(n => n !== f.name);
                                            newDoubleVerify = newDoubleVerify.filter(n => n !== f.name);
                                          }
                                          setSelectedRule({ ...selectedRule, visibleFields: newVisible, requiredFields: newMandatory, necessaryFields: newDoubleVerify });
                                        }}
                                      />
                                      <span style={{ userSelect: 'none' }}>{f.label}</span>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedRule.hasCustomMessage && (
                    <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', position: 'relative' }}>
                      <button onClick={() => setSelectedRule({ ...selectedRule, hasCustomMessage: false, customMessage: "" })} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                      <label className="form-label">Custom Message</label>
                      <input type="text" className="form-input bg-white" placeholder="e.g. Please verify the following details before proceeding." value={selectedRule.customMessage} onChange={e => setSelectedRule({ ...selectedRule, customMessage: e.target.value })} />
                    </div>
                  )}

                  {selectedRule.checklists?.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label className="form-label">Checklists</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {selectedRule.checklists.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <div style={{ color: '#cbd5e1' }}>⋮⋮</div>
                            <input type="text" className="form-input bg-white" style={{ flex: 1 }} placeholder="Checklist item (e.g. Verify ID)" value={item} onChange={e => {
                              const newLists = [...selectedRule.checklists];
                              newLists[idx] = e.target.value;
                              setSelectedRule({ ...selectedRule, checklists: newLists });
                            }} />
                            <button onClick={() => {
                              const newLists = selectedRule.checklists.filter((_, i) => i !== idx);
                              setSelectedRule({ ...selectedRule, checklists: newLists });
                            }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(selectedRule.visibleFields || []).length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label className="form-label">Field Requirements (High-Friction Engine)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                        {(selectedRule.visibleFields || []).map(fieldName => {
                          const field = blueprint.fields.find(f => f.name === fieldName);
                          if (!field) return null;
                          const isRequired = selectedRule.requiredFields?.includes(field.name) || false;
                          const isNecessary = selectedRule.necessaryFields?.includes(field.name) || false;
                          return (
                            <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: '2rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                              <div style={{ width: '150px', fontWeight: 500 }}>{field.label}</div>

                              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Always Visible</span>

                              {/* 2. MANDATORY CHECKBOX */}
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={isRequired}
                                  onChange={() => {
                                    let newMandatory = toggleArrayItem(selectedRule.requiredFields, field.name);
                                    let newDoubleVerify = selectedRule.necessaryFields;

                                    // If unchecking Mandatory, force uncheck DoubleVerify
                                    if (!newMandatory.includes(field.name)) {
                                      newDoubleVerify = newDoubleVerify.filter(n => n !== field.name);
                                    }
                                    setSelectedRule({ ...selectedRule, requiredFields: newMandatory, necessaryFields: newDoubleVerify });
                                  }}
                                />
                                Mandatory
                              </label>

                              {/* 3. DOUBLE-VERIFY CHECKBOX */}
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isRequired ? 'pointer' : 'not-allowed', fontSize: '0.875rem', opacity: isRequired ? 1 : 0.5 }}>
                                <input
                                  type="checkbox"
                                  disabled={!isRequired}
                                  checked={isNecessary}
                                  onChange={() => setSelectedRule({ ...selectedRule, necessaryFields: toggleArrayItem(selectedRule.necessaryFields, field.name) })}
                                />
                                Double-Verify
                              </label>

                              <button onClick={() => {
                                let newVisible = (selectedRule.visibleFields || []).filter(n => n !== field.name);
                                let newMandatory = (selectedRule.requiredFields || []).filter(n => n !== field.name);
                                let newDoubleVerify = (selectedRule.necessaryFields || []).filter(n => n !== field.name);
                                setSelectedRule({ ...selectedRule, visibleFields: newVisible, requiredFields: newMandatory, necessaryFields: newDoubleVerify });
                              }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeRuleTab === 'after' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {[
                    { id: 'emails', label: 'Email Notifications' },
                    { id: 'calls', label: 'Calls' },
                    { id: 'fieldUpdates', label: 'Field Updates' },
                    { id: 'createRecords', label: 'Create Records' },
                    { id: 'webhooks', label: 'Webhooks' },
                    { id: 'customActions', label: 'Custom Actions' },
                    { id: 'tags', label: 'TAGS' }
                  ].map(actionDef => (
                    <div key={actionDef.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#000000ff', letterSpacing: '0.5px' }}>{actionDef.label}</span>
                        <button onClick={() => {
                          if (actionDef.id === 'tags') {
                            setTagBuilder({ isOpen: true, name: '', color: tagColors[0] });
                          } else if (actionDef.id === 'fieldUpdates') {
                            setFieldUpdateBuilder({ isOpen: true, field: 'firstName', value: '' });
                          } else if (actionDef.id === 'createRecords') {
                            setCreateRecordBuilder({ isOpen: true, targetModule: 'Task', autoLink: true, mappings: [{ targetField: 'name', sourceField: '' }] });
                          } else {
                            const newActions = { ...selectedRule.afterActions };
                            newActions[actionDef.id] = [...(newActions[actionDef.id] || []), `New ${actionDef.label} Action`];
                            setSelectedRule({ ...selectedRule, afterActions: newActions });
                          }
                        }} style={{ background: 'none', border: 'none', color: '#000000ff', fontSize: '1.25rem', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        {actionDef.badge && (
                          <span style={{ fontSize: '0.75rem', background: '#334155', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '12px' }}>{actionDef.badge}</span>
                        )}
                      </div>

                      {selectedRule.afterActions?.[actionDef.id]?.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                          {selectedRule.afterActions[actionDef.id].map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px' }}>
                              {actionDef.id === 'tags' ? (
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'white', background: item.color, padding: '0.25rem 0.75rem', borderRadius: '12px' }}>{item.name}</span>
                              ) : actionDef.id === 'fieldUpdates' ? (
                                <span style={{ fontSize: '0.875rem', color: '#334155' }}>Update <strong>{item.field}</strong> to <strong>{item.value}</strong></span>
                              ) : actionDef.id === 'createRecords' ? (
                                <span style={{ fontSize: '0.875rem', color: '#334155' }}>Create <strong>{item.targetModule}</strong> {item.autoLink ? '(Auto-Linked)' : ''} with {item.mappings?.length || 0} mappings</span>
                              ) : (
                                <span style={{ fontSize: '0.875rem', color: '#334155' }}>{item} {idx + 1}</span>
                              )}
                              <button onClick={() => {
                                const newActions = { ...selectedRule.afterActions };
                                newActions[actionDef.id] = newActions[actionDef.id].filter((_, i) => i !== idx);
                                setSelectedRule({ ...selectedRule, afterActions: newActions });
                              }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TAG BUILDER MODAL */}
              {tagBuilder.isOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setTagBuilder({ ...tagBuilder, isOpen: false })}></div>
                  <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', position: 'relative', zIndex: 10 }}>
                    <h3 style={{ marginTop: 0, fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                      Select Tag
                      <button onClick={() => setTagBuilder({ ...tagBuilder, isOpen: false })} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                    </h3>

                    <div style={{ marginBottom: '2rem' }}>
                      {tags.length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No tags available. Create tags in the Tag Definitions menu first.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {tags.map(tag => (
                            <div
                              key={tag.id}
                              onClick={() => {
                                const newActions = { ...selectedRule.afterActions };
                                // Store the tag object (at least id, name, color)
                                if (!newActions.tags?.find(t => t.id === tag.id)) {
                                  newActions.tags = [...(newActions.tags || []), { id: tag.id, name: tag.name, color: tag.color }];
                                  setSelectedRule({ ...selectedRule, afterActions: newActions });
                                }
                                setTagBuilder({ ...tagBuilder, isOpen: false });
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0',
                                borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.borderColor = tag.color}
                              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                            >
                              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: tag.color }}></div>
                              <span style={{ fontWeight: 500, color: '#334155' }}>{tag.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                      <button className="btn-outline" onClick={() => setTagBuilder({ ...tagBuilder, isOpen: false })}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* FIELD UPDATE BUILDER MODAL */}
              {fieldUpdateBuilder.isOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setFieldUpdateBuilder({ ...fieldUpdateBuilder, isOpen: false })}></div>
                  <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', position: 'relative', zIndex: 10 }}>
                    <h3 style={{ marginTop: 0, fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                      Configure Field Update
                      <button onClick={() => setFieldUpdateBuilder({ ...fieldUpdateBuilder, isOpen: false })} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                    </h3>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Select Field to Update</label>
                      <select
                        value={fieldUpdateBuilder.field}
                        onChange={(e) => setFieldUpdateBuilder({ ...fieldUpdateBuilder, field: e.target.value })}
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '1rem', outline: 'none' }}
                      >
                        <option value="firstName">First Name</option>
                        <option value="lastName">Last Name</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="owner">Owner</option>
                        {blueprint?.fields?.map(f => (
                          <option key={f.name} value={f.name}>{f.label} (Custom)</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>New Value</label>
                      <input
                        type="text"
                        value={fieldUpdateBuilder.value}
                        onChange={(e) => setFieldUpdateBuilder({ ...fieldUpdateBuilder, value: e.target.value })}
                        placeholder="e.g. Qualified, High, 1000"
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '1rem', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                      <button className="btn-outline" onClick={() => setFieldUpdateBuilder({ ...fieldUpdateBuilder, isOpen: false })}>Cancel</button>
                      <button className="btn-primary" onClick={() => {
                        if (!fieldUpdateBuilder.field || !fieldUpdateBuilder.value.trim()) return;
                        const newActions = { ...selectedRule.afterActions };
                        newActions.fieldUpdates = [...(newActions.fieldUpdates || []), { field: fieldUpdateBuilder.field, value: fieldUpdateBuilder.value.trim() }];
                        setSelectedRule({ ...selectedRule, afterActions: newActions });
                        setFieldUpdateBuilder({ ...fieldUpdateBuilder, isOpen: false });
                      }}>Save Field Update</button>
                    </div>
                  </div>
                </div>
              )}



              {/* CREATE RECORD BUILDER MODAL */}
              {createRecordBuilder.isOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setCreateRecordBuilder({ ...createRecordBuilder, isOpen: false })}></div>
                  <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '600px', position: 'relative', zIndex: 10, maxHeight: '90vh', overflowY: 'auto' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                      Auto-Create Record
                      <button onClick={() => setCreateRecordBuilder({ ...createRecordBuilder, isOpen: false })} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div>
                        <label className="form-label">Target Module</label>
                        <select
                          className="form-input bg-white"
                          value={createRecordBuilder.targetModule}
                          onChange={e => setCreateRecordBuilder({ ...createRecordBuilder, targetModule: e.target.value })}
                        >
                          <option value="Lead">Lead</option>
                          <option value="Deal">Deal</option>
                          <option value="Account">Account</option>
                          <option value="Product">Product</option>
                          <option value="Task">Task</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: '#334155' }}>
                          <input type="checkbox" checked={createRecordBuilder.autoLink} onChange={e => setCreateRecordBuilder({ ...createRecordBuilder, autoLink: e.target.checked })} />
                          Auto-Link to Current {selectedModule}
                        </label>
                      </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <label className="form-label" style={{ margin: 0 }}>Field Mappings</label>
                        <button onClick={() => {
                          setCreateRecordBuilder({
                            ...createRecordBuilder,
                            mappings: [...createRecordBuilder.mappings, { targetField: '', sourceField: '' }]
                          });
                        }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}>+ Add Mapping</button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {createRecordBuilder.mappings.length === 0 && (
                          <div style={{ padding: '1rem', background: '#f8fafc', color: '#64748b', textAlign: 'center', borderRadius: '6px' }}>No field mappings. Blank record will be created.</div>
                        )}
                        {createRecordBuilder.mappings.map((mapping, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#f8fafc', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <div style={{ flex: 1 }}>
                              <input
                                type="text"
                                className="form-input bg-white"
                                placeholder="Target Field (e.g. name)"
                                value={mapping.targetField}
                                onChange={e => {
                                  const newMappings = [...createRecordBuilder.mappings];
                                  newMappings[idx].targetField = e.target.value;
                                  setCreateRecordBuilder({ ...createRecordBuilder, mappings: newMappings });
                                }}
                              />
                            </div>
                            <div style={{ color: '#94a3b8' }}>←</div>
                            <div style={{ flex: 1 }}>
                              <input
                                type="text"
                                className="form-input bg-white"
                                placeholder={`Source Value (e.g. {{${selectedModule}.companyName}})`}
                                value={mapping.sourceField}
                                onChange={e => {
                                  const newMappings = [...createRecordBuilder.mappings];
                                  newMappings[idx].sourceField = e.target.value;
                                  setCreateRecordBuilder({ ...createRecordBuilder, mappings: newMappings });
                                }}
                              />
                            </div>
                            <button onClick={() => {
                              const newMappings = createRecordBuilder.mappings.filter((_, i) => i !== idx);
                              setCreateRecordBuilder({ ...createRecordBuilder, mappings: newMappings });
                            }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.25rem', padding: '0 0.5rem' }}>✕</button>
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                        Tip: You can use dynamic variables like {"{{"}{selectedModule}.firstName{"}}"} or static text.
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                      <button className="btn-outline" onClick={() => setCreateRecordBuilder({ ...createRecordBuilder, isOpen: false })}>Cancel</button>
                      <button className="btn-primary" onClick={() => {
                        if (!createRecordBuilder.targetModule) return;
                        const newActions = { ...selectedRule.afterActions };
                        const payload = {
                          targetModule: createRecordBuilder.targetModule,
                          autoLink: createRecordBuilder.autoLink,
                          mappings: createRecordBuilder.mappings.filter(m => m.targetField && m.sourceField)
                        };
                        newActions.createRecords = [...(newActions.createRecords || []), payload];
                        setSelectedRule({ ...selectedRule, afterActions: newActions });
                        setCreateRecordBuilder({ ...createRecordBuilder, isOpen: false });
                      }}>Save Auto-Create</button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              {selectedRule.id && (
                <button onClick={handleDeleteRule} style={{ padding: '0.5rem 1rem', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', fontWeight: 500, marginRight: 'auto' }}>Delete Rule</button>
              )}
              <button onClick={() => setSelectedRule(null)} style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 500 }}>Cancel</button>
              <button onClick={handleSaveRule} className="btn-primary">Save Rule</button>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {isProfileModalOpen && selectedProfile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '2.5rem', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>{selectedProfile.id ? 'Edit Profile' : 'Create New Profile'}</h2>
              <button onClick={() => setIsProfileModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Profile Name</label>
              <input type="text" className="form-input" placeholder="e.g. Sales Representative" value={selectedProfile.name} onChange={e => setSelectedProfile({ ...selectedProfile, name: e.target.value })} />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Global Permissions</h3>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
                  <input type="checkbox" checked={selectedProfile.canAccessSettings} onChange={e => setSelectedProfile({ ...selectedProfile, canAccessSettings: e.target.checked })} />
                  Administrator (Access to Setup & Settings)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
                  <input type="checkbox" checked={selectedProfile.canExportData} onChange={e => setSelectedProfile({ ...selectedProfile, canExportData: e.target.checked })} />
                  Can Export Data
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Module Permissions Matrix</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>MODULE</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>VIEW</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>CREATE</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>EDIT</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>DELETE</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>DATA ACCESS</th>
                  </tr>
                </thead>
                <tbody>
                  {['Lead', 'Deal', 'Account', 'Task', 'Product'].map(mod => (
                    <tr key={mod} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 500 }}>{mod}</td>
                      {['view', 'create', 'edit', 'delete'].map(action => (
                        <td key={action} style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedProfile.permissions?.[mod]?.[action] || false}
                            onChange={(e) => {
                              const newPerms = { ...selectedProfile.permissions };
                              if (!newPerms[mod]) newPerms[mod] = { view: false, create: false, edit: false, delete: false, visibility: 'public' };
                              newPerms[mod][action] = e.target.checked;
                              
                              // Auto-check View if others are selected
                              if (e.target.checked && action !== 'view') {
                                newPerms[mod]['view'] = true;
                              }
                              // Auto-uncheck others if View is unchecked
                              if (!e.target.checked && action === 'view') {
                                newPerms[mod]['create'] = false;
                                newPerms[mod]['edit'] = false;
                                newPerms[mod]['delete'] = false;
                              }
                              
                              setSelectedProfile({ ...selectedProfile, permissions: newPerms });
                            }}
                          />
                        </td>
                      ))}
                      <td style={{ padding: '0.75rem' }}>
                        <select 
                          className="form-input"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                          value={selectedProfile.permissions?.[mod]?.visibility || 'public'}
                          onChange={(e) => {
                            const newPerms = { ...selectedProfile.permissions };
                            if (!newPerms[mod]) newPerms[mod] = { view: false, create: false, edit: false, delete: false, visibility: 'public' };
                            newPerms[mod].visibility = e.target.value;
                            setSelectedProfile({ ...selectedProfile, permissions: newPerms });
                          }}
                        >
                          <option value="public">Public Read/Write</option>
                          <option value="private">Private (Owner Only)</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              {selectedProfile.id && (
                <button onClick={() => handleDeleteProfile(selectedProfile.id)} style={{ padding: '0.5rem 1rem', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', fontWeight: 500, marginRight: 'auto' }}>Delete Profile</button>
              )}
              <button onClick={() => setIsProfileModalOpen(false)} style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 500 }}>Cancel</button>
              <button onClick={handleSaveProfile} className="btn-primary">Save Profile</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}