"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function SettingsPage() {
  const [blueprint, setBlueprint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState("hub");

  // New Field State
  const [newField, setNewField] = useState({ name: "", label: "", type: "text" });
  const [isAddingField, setIsAddingField] = useState(false);

  // New Stage State
  const [newStage, setNewStage] = useState({ name: "", color: "#fde68a" });
  const [isAddingStage, setIsAddingStage] = useState(false);

  // Rules Manager State
  const [selectedRule, setSelectedRule] = useState(null);
  const [activeRuleTab, setActiveRuleTab] = useState('during');
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [tagBuilder, setTagBuilder] = useState({ isOpen: false, name: '', color: '#ef4444' });
  const tagColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#8b5cf6', '#ec4899', '#64748b', '#84cc16'];
  // selectedRule schema: { id, name, toStageId, fromStageIds: [], isGlobal: boolean, requiredFields: [], necessaryFields: [] }

  useEffect(() => {
    fetchBlueprint();
  }, []);

  const getAuthToken = async () => {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const { tokens } = await fetchAuthSession();
    return tokens.idToken.toString();
  };

  const fetchBlueprint = async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/blueprint?moduleType=Lead', {
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

  // --- Field Handlers ---
  const handleAddField = async (e) => {
    e.preventDefault();
    try {
      const token = await getAuthToken();
      const payload = {
        ...newField,
        blueprintId: blueprint.id,
        name: newField.label.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase()).replace(/[^a-zA-Z0-9]/g, '')
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
        setNewField({ name: "", label: "", type: "text" });
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
    setActiveRuleTab('during');
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
        toStageId: blueprint.stages[0]?.id || "",
        fromStageIds: [],
        isGlobal: false,
        requiredFields: [],
        necessaryFields: [],
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
        <header className="dashboard-header">
          <h1>Admin Settings</h1>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>Configure your dynamic CRM Blueprints</p>
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
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Lead Customization</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <button onClick={() => setCurrentView('fields')} style={{ textAlign: 'left', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', borderRadius: '6px', transition: 'all 0.2s', fontWeight: 500 }} onMouseEnter={e => e.target.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}>
                      Modules and Fields
                    </button>
                    <button onClick={() => setCurrentView('blueprint')} style={{ textAlign: 'left', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', borderRadius: '6px', transition: 'all 0.2s', fontWeight: 500 }} onMouseEnter={e => e.target.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}>
                      Workflow Engine
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
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Lead Fields</h2>
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
                              <option value="text">Text Input</option>
                              <option value="number">Number</option>
                            </select>
                          </div>
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
              </div>
            </div>
          )}
        </div>
      </main>

      {/* RULE MODAL */}
      {selectedRule && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>{selectedRule.id ? 'Edit Rule' : 'Create New Rule'}</h2>
              <button onClick={() => setSelectedRule(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Button Name (Action)</label>
                <input type="text" className="form-input" placeholder="e.g. Qualify Lead" value={selectedRule.name} onChange={e => setSelectedRule({ ...selectedRule, name: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Destination Stage (To)</label>
                <select className="form-input" value={selectedRule.toStageId} onChange={e => {
                  const newToId = e.target.value;
                  const newFromIds = selectedRule.fromStageIds.filter(id => id !== newToId);
                  setSelectedRule({ ...selectedRule, toStageId: newToId, fromStageIds: newFromIds });
                }}>
                  {blueprint.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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

                  <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Allowed Starting Stages (From)</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: 'var(--primary)' }}>
                        <input type="checkbox" checked={selectedRule.isGlobal} onChange={e => setSelectedRule({ ...selectedRule, isGlobal: e.target.checked })} />
                        Global (All Stages)
                      </label>
                    </label>

                    {!selectedRule.isGlobal && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
                        {blueprint.stages.map(stage => {
                          const isDisabled = stage.id === selectedRule.toStageId;
                          return (
                            <label key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.5 : 1 }}>
                              <input
                                type="checkbox"
                                disabled={isDisabled}
                                checked={selectedRule.fromStageIds.includes(stage.id)}
                                onChange={() => setSelectedRule({ ...selectedRule, fromStageIds: toggleArrayItem(selectedRule.fromStageIds, stage.id) })}
                              />
                              {stage.name}
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Execution Criteria</h4>
                    <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name="criteriaType" checked={selectedRule.executionCriteria.type === 'all'} onChange={() => setSelectedRule({ ...selectedRule, executionCriteria: { ...selectedRule.executionCriteria, type: 'all' } })} /> All records
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name="criteriaType" checked={selectedRule.executionCriteria.type === 'matching'} onChange={() => setSelectedRule({ ...selectedRule, executionCriteria: { ...selectedRule.executionCriteria, type: 'matching' } })} /> Records matching the conditions
                      </label>
                    </div>

                    {selectedRule.executionCriteria.type === 'matching' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {selectedRule.executionCriteria.conditions.map((cond, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <select className="form-input" style={{ width: '200px' }} value={cond.field} onChange={e => {
                              const newConds = [...selectedRule.executionCriteria.conditions];
                              newConds[idx].field = e.target.value;
                              setSelectedRule({ ...selectedRule, executionCriteria: { ...selectedRule.executionCriteria, conditions: newConds } });
                            }}>
                              <option value="">Select Field</option>
                              {blueprint.fields.map(f => <option key={f.id} value={f.name}>{f.label}</option>)}
                            </select>
                            <select className="form-input" style={{ width: '150px' }} value={cond.operator} onChange={e => {
                              const newConds = [...selectedRule.executionCriteria.conditions];
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
                                const newConds = [...selectedRule.executionCriteria.conditions];
                                newConds[idx].value = e.target.value;
                                setSelectedRule({ ...selectedRule, executionCriteria: { ...selectedRule.executionCriteria, conditions: newConds } });
                              }} />
                            )}
                            <button onClick={() => {
                              const newConds = selectedRule.executionCriteria.conditions.filter((_, i) => i !== idx);
                              setSelectedRule({ ...selectedRule, executionCriteria: { ...selectedRule.executionCriteria, conditions: newConds } });
                            }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
                          </div>
                        ))}
                        <button onClick={() => {
                          const newConds = [...selectedRule.executionCriteria.conditions, { field: '', operator: 'is', value: '' }];
                          setSelectedRule({ ...selectedRule, executionCriteria: { ...selectedRule.executionCriteria, conditions: newConds } });
                        }} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 500, padding: 0 }}>+ Add Condition</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeRuleTab === 'during' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem', position: 'relative' }}>
                    <button onClick={() => setIsAddMenuOpen(!isAddMenuOpen)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>+</span> Add
                    </button>
                    {isAddMenuOpen && (
                      <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10, padding: '0.5rem', width: '200px', display: 'flex', flexDirection: 'column' }}>
                        <button onClick={() => {
                          if (!selectedRule.hasCustomMessage) setSelectedRule({ ...selectedRule, hasCustomMessage: true });
                          setIsAddMenuOpen(false);
                        }} style={{ padding: '0.5rem', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '4px' }} onMouseEnter={e => e.target.style.background = '#f8fafc'} onMouseLeave={e => e.target.style.background = 'transparent'}>Message</button>
                        <button onClick={() => {
                          setSelectedRule({ ...selectedRule, checklists: [...selectedRule.checklists, ""] });
                          setIsAddMenuOpen(false);
                        }} style={{ padding: '0.5rem', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '4px' }} onMouseEnter={e => e.target.style.background = '#f8fafc'} onMouseLeave={e => e.target.style.background = 'transparent'}>Checklists</button>
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

                  <label className="form-label">Field Requirements (High-Friction Engine)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                    {blueprint.fields.length === 0 ? <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No fields exist.</span> : null}
                    {blueprint.fields.map(field => {
                      const isRequired = selectedRule.requiredFields.includes(field.name);
                      const isNecessary = selectedRule.necessaryFields.includes(field.name);
                      return (
                        <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: '2rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <div style={{ width: '150px', fontWeight: 500 }}>{field.label}</div>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                            <input
                              type="checkbox"
                              checked={isRequired}
                              onChange={() => {
                                const newRequired = toggleArrayItem(selectedRule.requiredFields, field.name);
                                // If unchecking required, also uncheck necessary
                                let newNecessary = selectedRule.necessaryFields;
                                if (!newRequired.includes(field.name) && newNecessary.includes(field.name)) {
                                  newNecessary = newNecessary.filter(n => n !== field.name);
                                }
                                setSelectedRule({ ...selectedRule, requiredFields: newRequired, necessaryFields: newNecessary });
                              }}
                            />
                            Required (Confirm)
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isRequired ? 'pointer' : 'not-allowed', fontSize: '0.875rem', opacity: isRequired ? 1 : 0.5 }}>
                            <input
                              type="checkbox"
                              disabled={!isRequired}
                              checked={isNecessary}
                              onChange={() => setSelectedRule({ ...selectedRule, necessaryFields: toggleArrayItem(selectedRule.necessaryFields, field.name) })}
                            />
                            Mandatory (Double-Verify)
                          </label>
                        </div>
                      );
                    })}
                  </div>
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
                      Add Tags
                      <button onClick={() => setTagBuilder({ ...tagBuilder, isOpen: false })} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                    </h3>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <input
                        type="text"
                        value={tagBuilder.name}
                        onChange={(e) => setTagBuilder({ ...tagBuilder, name: e.target.value })}
                        placeholder="Tag Name (e.g. VIP)"
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '1rem', outline: 'none' }}
                        autoFocus
                      />
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.75rem' }}>Select Color</p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {tagColors.map(color => (
                          <div
                            key={color}
                            onClick={() => setTagBuilder({ ...tagBuilder, color })}
                            style={{
                              width: '24px', height: '24px', borderRadius: '50%', background: color, cursor: 'pointer',
                              border: tagBuilder.color === color ? '2px solid #0f172a' : '2px solid transparent',
                              boxShadow: tagBuilder.color === color ? '0 0 0 2px white inset' : 'none'
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                      <button className="btn-outline" onClick={() => setTagBuilder({ ...tagBuilder, isOpen: false })}>Cancel</button>
                      <button className="btn-primary" onClick={() => {
                        if (!tagBuilder.name.trim()) return;
                        const newActions = { ...selectedRule.afterActions };
                        newActions.tags = [...(newActions.tags || []), { name: tagBuilder.name.trim(), color: tagBuilder.color }];
                        setSelectedRule({ ...selectedRule, afterActions: newActions });
                        setTagBuilder({ ...tagBuilder, isOpen: false });
                      }}>Save Tag</button>
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
    </div>
  );
}
