"use client";

import React, { useEffect, useState } from "react";

export default function SlideOverPanel({ isOpen, onClose, lead, blueprint, onTransition }) {
  const [modalMode, setModalMode] = useState(null); // null | 'missing' | 'security' | 'confirm'
  const [activeTransition, setActiveTransition] = useState(null);
  const [formData, setFormData] = useState({});
  const [securityData, setSecurityData] = useState({});
  const [securityError, setSecurityError] = useState("");
  const [checklistState, setChecklistState] = useState({});
  const [tagBuilder, setTagBuilder] = useState({ isOpen: false, name: '', color: '#ef4444' });
  const [localTags, setLocalTags] = useState([]);
  const tagColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#8b5cf6', '#ec4899', '#64748b', '#84cc16'];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
      setModalMode(null);
    }
    
    if (lead) {
      try {
        setLocalTags(Array.isArray(lead.tags) ? lead.tags : JSON.parse(lead.tags || "[]"));
      } catch (e) {
        setLocalTags([]);
      }
    }
  }, [isOpen, lead]);

  if (!isOpen || !lead || !blueprint) return null;

  const currentStageId = lead.stageId;
  const availableTransitions = blueprint.transitions.filter(t => {
    // 1. Stage Check
    const validStage = t.isGlobal || (t.fromStages && t.fromStages.some(s => s.id === currentStageId));
    if (!validStage) return false;

    // 2. Execution Criteria Check
    if (t.executionCriteria && t.executionCriteria.conditions && t.executionCriteria.conditions.length > 0) {
      const type = t.executionCriteria.type || 'all';
      const criteriaMet = t.executionCriteria.conditions[type === 'all' ? 'every' : 'some'](cond => {
        const leadValue = String(lead.customData?.[cond.field] || "").toLowerCase();
        const condValue = String(cond.value || "").toLowerCase();
        
        switch (cond.operator) {
          case 'is': return leadValue === condValue;
          case 'is_not': return leadValue !== condValue;
          case 'contains': return leadValue.includes(condValue);
          case 'does_not_contain': return !leadValue.includes(condValue);
          case 'starts_with': return leadValue.startsWith(condValue);
          case 'ends_with': return leadValue.endsWith(condValue);
          case 'is_empty': return leadValue === "";
          case 'is_not_empty': return leadValue !== "";
          default: return true;
        }
      });
      return criteriaMet;
    }
    
    return true; // If no criteria, button is visible
  });

  const executeTransition = (transition, finalData) => {
    onTransition(lead.id, transition.toStageId, finalData);
    setModalMode(null);
    onClose();
  };

  const handleTransitionClick = (transition) => {
    setActiveTransition(transition);
    setFormData(lead.customData || {});
    setSecurityData({});
    setSecurityError("");
    setChecklistState((transition.checklists || []).reduce((acc, _, idx) => ({ ...acc, [idx]: false }), {}));

    const requiredFields = transition.requiredFields || [];
    const necessaryFields = transition.necessaryFields || [];
    const checklists = transition.checklists || [];

    if (requiredFields.length > 0 || checklists.length > 0) {
      setModalMode('missing');
      return;
    }

    if (necessaryFields.length > 0) {
      setModalMode('security');
      return;
    }

    if (requiredFields.length > 0) {
      setModalMode('confirm');
      return;
    }

    executeTransition(transition, lead.customData);
  };

  const handleMissingSubmit = (e) => {
    e.preventDefault();
    for (let fieldName of activeTransition.requiredFields || []) {
      if (!formData[fieldName] || String(formData[fieldName]).trim() === "") {
        alert("Please fill all required fields");
        return;
      }
    }
    
    const checklists = activeTransition.checklists || [];
    for (let i = 0; i < checklists.length; i++) {
      if (!checklistState[i]) {
        alert("Please complete all checklist items before proceeding.");
        return;
      }
    }

    if ((activeTransition.necessaryFields || []).length > 0) {
      setModalMode('security');
    } else {
      setModalMode('confirm');
    }
  };

  const handleSecuritySubmit = (e) => {
    e.preventDefault();
    setSecurityError("");
    const necessaryFields = activeTransition.necessaryFields || [];
    const currentData = { ...lead.customData, ...formData };

    for (let fieldName of necessaryFields) {
      const expected = String(currentData[fieldName] || "").toLowerCase().trim();
      const actual = String(securityData[fieldName] || "").toLowerCase().trim();
      if (expected !== actual) {
        setSecurityError(`Verification Failed: The value entered does not match the saved data.`);
        return;
      }
    }

    setModalMode('confirm');
  };

  const handleConfirmSubmit = () => {
    const finalData = { ...lead.customData, ...formData };
    onTransition(lead.id, activeTransition.toStageId, finalData, activeTransition.id);
  };

  return (
    <>
      <div className={`slide-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose}></div>

      {/* TAG BUILDER MODAL */}
      {tagBuilder.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <button className="btn-primary" onClick={async () => {
                if (!tagBuilder.name.trim()) return;
                const newTags = [...localTags, { name: tagBuilder.name.trim(), color: tagBuilder.color }];
                setLocalTags(newTags);
                setTagBuilder({ ...tagBuilder, isOpen: false });
                
                try {
                  const { fetchAuthSession } = await import('aws-amplify/auth');
                  const session = await fetchAuthSession();
                  const token = session.tokens?.idToken?.toString();
                  
                  await fetch('/api/leads', {
                    method: 'PATCH',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': token ? `Bearer ${token}` : ''
                    },
                    body: JSON.stringify({ leadId: lead.id, tags: newTags })
                  });
                } catch (e) {
                  console.error("Failed to save tag", e);
                }
              }}>Save Tag</button>
            </div>
          </div>
        </div>
      )}

      <div className={`modal-card ${isOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="slide-header">
          <div>
            <span className="slide-eyebrow">BLUEPRINT STAGE: {blueprint.stages.find(s => s.id === lead.stageId)?.name || "Unknown"}</span>
            <h2 className="slide-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {lead.firstName} {lead.lastName}
              {localTags.map((t, idx) => (
                <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'white', background: t.color, padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                  {t.name}
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      const newTags = localTags.filter((_, i) => i !== idx);
                      setLocalTags(newTags);
                      
                      try {
                        const { fetchAuthSession } = await import('aws-amplify/auth');
                        const session = await fetchAuthSession();
                        const token = session.tokens?.idToken?.toString();
                        
                        await fetch('/api/leads', {
                          method: 'PATCH',
                          headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': token ? `Bearer ${token}` : ''
                          },
                          body: JSON.stringify({ leadId: lead.id, tags: newTags })
                        });
                      } catch (err) {
                        console.error("Failed to remove tag", err);
                      }
                    }} 
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: 0, fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}
                    aria-label="Remove tag"
                  >✕</button>
                </span>
              ))}
              <button onClick={() => setTagBuilder({ isOpen: true, name: '', color: tagColors[0] })} style={{ background: 'none', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.75rem', fontWeight: 500, padding: '0.2rem 0.6rem', borderRadius: '12px', cursor: 'pointer' }}>+ Add Tag</button>
            </h2>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close panel">✕</button>
        </div>

        <div className="slide-content" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>

          <div className="data-section">
            <h3 className="section-heading">Contact Information</h3>
            <div className="data-grid-2col">
              <div className="data-block">
                <span className="data-label">Email</span>
                <span className="data-value">{lead.email || "-"}</span>
              </div>
              <div className="data-block">
                <span className="data-label">Phone</span>
                <span className="data-value">{lead.phone || "-"}</span>
              </div>
              <div className="data-block">
                <span className="data-label">Owner</span>
                <span className="data-value">{lead.owner || "-"}</span>
              </div>
              <div className="data-block">
                <span className="data-label">Created At</span>
                <span className="data-value">{new Date(lead.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="data-section">
            <h3 className="section-heading">Dynamic Fields (Blueprint)</h3>
            <div className="data-grid-2col">
              {blueprint.fields.map(field => (
                <div className="data-block" key={field.id}>
                  <span className="data-label">{field.label}</span>
                  <span className="data-value">{lead.customData?.[field.name] || "-"}</span>
                </div>
              ))}
              {blueprint.fields.length === 0 && (
                <span className="text-muted text-sm">No custom fields defined.</span>
              )}
            </div>
          </div>
        </div>

        <div className="slide-footer" style={{ flexWrap: 'wrap', gap: '0.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '1.5rem' }}>
          {availableTransitions.length === 0 ? (
            <p className="text-muted text-sm" style={{ width: '100%', textAlign: 'center', margin: 0 }}>No transitions available for this stage.</p>
          ) : (
            availableTransitions.map(t => (
              <button
                key={t.id}
                onClick={() => handleTransitionClick(t)}
                className={t.isGlobal ? "btn-outline" : "btn-primary"}
                style={{ flex: '1 1 auto', textAlign: 'center', minWidth: '120px' }}
              >
                {t.name}
              </button>
            ))
          )}
        </div>
      </div>

      {/* MISSING FIELDS MODAL */}
      {modalMode === 'missing' && activeTransition && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setModalMode(null)}></div>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', position: 'relative', zIndex: 10 }}>
            <h3 style={{ marginTop: 0, fontSize: '1.25rem', marginBottom: '1rem' }}>Review Requirements</h3>
            <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              {activeTransition.customMessage ? activeTransition.customMessage : (
                <>Please review and confirm the required data below to execute <strong>{activeTransition.name}</strong>.</>
              )}
            </p>
            <form onSubmit={handleMissingSubmit}>
              {(activeTransition.checklists || []).length > 0 && (
                <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', color: '#334155' }}>Checklist</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {(activeTransition.checklists || []).map((item, idx) => (
                      <label key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                        <input type="checkbox" style={{ marginTop: '0.2rem' }} checked={checklistState[idx] || false} onChange={e => setChecklistState({ ...checklistState, [idx]: e.target.checked })} />
                        <span style={{ color: checklistState[idx] ? '#94a3b8' : '#0f172a', textDecoration: checklistState[idx] ? 'line-through' : 'none' }}>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {(activeTransition.requiredFields || []).map(fieldName => {
                const fieldDef = blueprint.fields.find(f => f.name === fieldName);
                if (!fieldDef) return null;
                return (
                  <div key={fieldName} style={{ marginBottom: '1rem' }}>
                    <label className="form-label">{fieldDef.label} <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type={fieldDef.type === 'number' ? 'number' : 'text'}
                      className="form-input"
                      value={formData[fieldName] || ''}
                      onChange={e => setFormData({ ...formData, [fieldName]: e.target.value })}
                      required
                    />
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn-outline" onClick={() => setModalMode(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Save & Continue</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECURITY CHECKPOINT MODAL */}
      {modalMode === 'security' && activeTransition && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setModalMode(null)}></div>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', position: 'relative', zIndex: 10 }}>
            <h3 style={{ marginTop: 0, fontSize: '1.25rem', marginBottom: '1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🔒 Security Checkpoint
            </h3>
            <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              Please verify the following data to proceed with <strong>{activeTransition.name}</strong>.
            </p>
            {securityError && (
              <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid #fecaca' }}>
                {securityError}
              </div>
            )}
            <form onSubmit={handleSecuritySubmit}>
              {(activeTransition.necessaryFields || []).map(fieldName => {
                const fieldDef = blueprint.fields.find(f => f.name === fieldName);
                if (!fieldDef) return null;
                return (
                  <div key={fieldName} style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Verify {fieldDef.label}</label>
                    <input
                      type={fieldDef.type === 'number' ? 'number' : 'text'}
                      className="form-input"
                      placeholder={`Type the current ${fieldDef.label}...`}
                      value={securityData[fieldName] || ''}
                      onChange={e => setSecurityData({ ...securityData, [fieldName]: e.target.value })}
                      required
                    />
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn-outline" onClick={() => setModalMode(null)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }}>Verify</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FINAL CONFIRMATION MODAL */}
      {modalMode === 'confirm' && activeTransition && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setModalMode(null)}></div>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', position: 'relative', zIndex: 10, textAlign: 'center' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.25rem', marginBottom: '1rem' }}>Are you sure?</h3>
            <p className="text-muted" style={{ marginBottom: '2rem', fontSize: '1rem' }}>
              {activeTransition.customMessage ? activeTransition.customMessage : (
                <>You are about to execute <strong>{activeTransition.name}</strong>. Do you want to proceed?</>
              )}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button type="button" className="btn-outline" onClick={() => setModalMode(null)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleConfirmSubmit}>Yes, Proceed</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}