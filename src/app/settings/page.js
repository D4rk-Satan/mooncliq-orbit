"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function SettingsPage() {
  const [blueprint, setBlueprint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stages");

  // New Field State
  const [newField, setNewField] = useState({ name: "", label: "", type: "text" });
  const [isAddingField, setIsAddingField] = useState(false);

  // New Stage State
  const [newStage, setNewStage] = useState({ name: "", color: "#fde68a" });
  const [isAddingStage, setIsAddingStage] = useState(false);

  // Rules Manager State
  const [selectedRule, setSelectedRule] = useState(null);
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
    if (existingRule) {
      setSelectedRule({
        id: existingRule.id,
        name: existingRule.name,
        toStageId: existingRule.toStageId,
        fromStageIds: existingRule.fromStages?.map(s => s.id) || [],
        isGlobal: existingRule.isGlobal,
        requiredFields: existingRule.requiredFields || [],
        necessaryFields: existingRule.necessaryFields || []
      });
    } else {
      setSelectedRule({
        id: null,
        name: "",
        toStageId: blueprint.stages[0]?.id || "",
        fromStageIds: [],
        isGlobal: false,
        requiredFields: [],
        necessaryFields: []
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
          necessaryFields: selectedRule.necessaryFields
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
          ) : (
            <div className="settings-container" style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <button 
                  style={{ padding: '1rem 2rem', fontWeight: 500, borderBottom: activeTab === 'stages' ? '2px solid var(--primary)' : 'none', color: activeTab === 'stages' ? 'var(--primary)' : '#64748b' }}
                  onClick={() => setActiveTab('stages')}
                >
                  Workflow Engine
                </button>
                <button 
                  style={{ padding: '1rem 2rem', fontWeight: 500, borderBottom: activeTab === 'fields' ? '2px solid var(--primary)' : 'none', color: activeTab === 'fields' ? 'var(--primary)' : '#64748b' }}
                  onClick={() => setActiveTab('fields')}
                >
                  Custom Fields
                </button>
              </div>

              <div style={{ padding: '2rem' }}>
                
                {/* STAGES & RULES TAB */}
                {activeTab === 'stages' && (
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
                        {blueprint.stages.length === 0 && <span style={{color: '#94a3b8'}}>No stages created yet.</span>}
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
                            <input required type="text" placeholder="Stage Name" className="form-input bg-white" style={{marginBottom: '0.5rem'}} value={newStage.name} onChange={e => setNewStage({...newStage, name: e.target.value})} />
                            <select className="form-input bg-white" style={{marginBottom: '1rem'}} value={newStage.color} onChange={e => setNewStage({...newStage, color: e.target.value})}>
                              <option value="#fde68a">Yellow</option>
                              <option value="#fed7aa">Orange</option>
                              <option value="#c4b5fd">Purple</option>
                              <option value="#fbcfe8">Pink</option>
                              <option value="#a7f3d0">Green</option>
                              <option value="#bfdbfe">Blue</option>
                              <option value="#fca5a5">Red</option>
                            </select>
                            <button onClick={handleAddStage} className="btn-primary" style={{width: '100%'}}>Save Stage</button>
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
                                        <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                                          <div style={{ cursor: 'grab', color: '#cbd5e1' }}>⋮⋮</div>
                                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: stage.color }}></div>
                                          <span style={{fontWeight: 500}}>{stage.name}</span>
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
                          {blueprint.transitions.length === 0 && <p style={{color: '#64748b', fontSize: '0.875rem'}}>No transition rules created.</p>}
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
                                <div style={{color: '#cbd5e1'}}>➔</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* FIELDS TAB */}
                {activeTab === 'fields' && (
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
                            <input required type="text" className="form-input bg-white" value={newField.label} onChange={e => setNewField({...newField, label: e.target.value})} />
                          </div>
                          <div>
                            <label className="form-label">Field Type</label>
                            <select className="form-input bg-white" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value})}>
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

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Button Name (Action)</label>
              <input type="text" className="form-input" placeholder="e.g. Qualify Lead" value={selectedRule.name} onChange={e => setSelectedRule({...selectedRule, name: e.target.value})} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Destination Stage (To)</label>
              <select className="form-input" value={selectedRule.toStageId} onChange={e => setSelectedRule({...selectedRule, toStageId: e.target.value})}>
                {blueprint.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Allowed Starting Stages (From)</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: 'var(--primary)' }}>
                  <input type="checkbox" checked={selectedRule.isGlobal} onChange={e => setSelectedRule({...selectedRule, isGlobal: e.target.checked})} />
                  Global (All Stages)
                </label>
              </label>
              
              {!selectedRule.isGlobal && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
                  {blueprint.stages.map(stage => (
                    <label key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedRule.fromStageIds.includes(stage.id)} 
                        onChange={() => setSelectedRule({...selectedRule, fromStageIds: toggleArrayItem(selectedRule.fromStageIds, stage.id)})}
                      />
                      {stage.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label className="form-label">Field Requirements (High-Friction Engine)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                {blueprint.fields.length === 0 ? <span style={{color: '#94a3b8', fontSize: '0.875rem'}}>No fields exist.</span> : null}
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
                            setSelectedRule({...selectedRule, requiredFields: newRequired, necessaryFields: newNecessary});
                          }}
                        />
                        Required (Confirm)
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isRequired ? 'pointer' : 'not-allowed', fontSize: '0.875rem', opacity: isRequired ? 1 : 0.5 }}>
                        <input 
                          type="checkbox" 
                          disabled={!isRequired}
                          checked={isNecessary} 
                          onChange={() => setSelectedRule({...selectedRule, necessaryFields: toggleArrayItem(selectedRule.necessaryFields, field.name)})}
                        />
                        Mandatory (Double-Verify)
                      </label>
                    </div>
                  );
                })}
              </div>
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
