"use client";

import React, { useEffect, useState } from "react";
import DynamicField from "./FieldRegistry";
import { evaluateExecutionCriteria } from "../utils/ruleEngine";

export default function SlideOverPanel({ isOpen, onClose, lead, blueprint, tags = [], currentUser, onTransition, onLeadUpdate, pendingTransition }) {
  const [modalMode, setModalMode] = useState(null); // null | 'missing' | 'security' | 'confirm'
  const [activeTransition, setActiveTransition] = useState(null);
  const [formData, setFormData] = useState({});
  const [securityData, setSecurityData] = useState({});
  const [securityError, setSecurityError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [checklistState, setChecklistState] = useState({});
  const [tagBuilder, setTagBuilder] = useState({ isOpen: false });
  const [localTags, setLocalTags] = useState([]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
      setModalMode(null);
      setActiveTransition(null);
    }

    if (lead) {
      try {
        setLocalTags(Array.isArray(lead.tags) ? lead.tags : JSON.parse(lead.tags || "[]"));
      } catch (e) {
        setLocalTags([]);
      }
    }
  }, [isOpen, lead]);

  useEffect(() => {
    if (isOpen && lead && pendingTransition && pendingTransition.id !== activeTransition?.id) {
      handleTransitionClick(pendingTransition);
    }
  }, [isOpen, lead, pendingTransition]);

  if (!isOpen || !lead || !blueprint) return null;

  const currentStageId = lead.stageId;
  const availableTransitions = blueprint.transitions.filter(t => {
    // 0. Permission Check
    if (currentUser && !currentUser.profile?.canAccessSettings && !currentUser.profile?.permissions?.[blueprint.moduleType]?.edit) {
      return false;
    }

    // 1. Stage Check
    const validStage = t.isGlobal || (t.fromStages && t.fromStages.some(s => s.id === currentStageId));
    if (!validStage) return false;

    // 2. Execution Criteria Check
    if (t.executionCriteria && t.executionCriteria.conditions && t.executionCriteria.conditions.length > 0) {
      return evaluateExecutionCriteria(lead, t.executionCriteria);
    }


    return true; // If no criteria, button is visible
  });

  const executeTransition = (transition, finalData) => {
    onTransition(lead.id, transition.toStageId, finalData, transition.id);
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
    const visibleFields = transition.visibleFields || [];
    const checklists = transition.checklists || [];
    const customMessage = transition.customMessage;

    if (requiredFields.length > 0 || visibleFields.length > 0 || checklists.length > 0) {
      setModalMode('missing');
      return;
    }

    if (necessaryFields.length > 0) {
      setModalMode('security');
      return;
    }

    setModalMode('confirm');
  };

  const handleMissingSubmit = (e) => {
    e.preventDefault();

    const checklists = activeTransition.checklists || [];
    for (let i = 0; i < checklists.length; i++) {
      if (!checklistState[i]) {
        alert("Please complete all checklist items before proceeding.");
        return;
      }
    }

    const requiredFields = activeTransition.requiredFields || [];
    const currentData = { ...lead.customData, ...formData };
    for (let fieldName of requiredFields) {
      if (!currentData[fieldName] || String(currentData[fieldName]).trim() === "") {
        alert(`Please fill out the required field: ${fieldName}`);
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

  const handleConfirmSubmit = (e) => {
    if (e) e.preventDefault();
    setConfirmError("");
    const finalData = { ...lead.customData, ...formData };

    onTransition(lead.id, activeTransition.toStageId, finalData, activeTransition.id);
    setModalMode(null);
  };

  const handleTransitionFieldChange = (name, value, record = null, mappings = [], isSecurity = false) => {
    const targetData = isSecurity ? securityData : formData;
    const setTargetData = isSecurity ? setSecurityData : setFormData;
    
    let newData = { ...targetData, [name]: value };

    if (record && mappings && mappings.length > 0) {
      mappings.forEach(mapping => {
        if (!mapping.sourceField || !mapping.targetField) return;
        const sourceVal = record[mapping.sourceField] || (record.customData && record.customData[mapping.sourceField]);
        if (sourceVal !== undefined) {
          newData[mapping.targetField] = sourceVal;
        }
      });
    }
    setTargetData(newData);
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

            <div style={{ marginBottom: '2rem' }}>
              {tags.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No tags available. Please define tags in Settings Hub.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {tags.map(tag => (
                    <div
                      key={tag.id}
                      onClick={async () => {
                        if (localTags.find(t => t.id === tag.id)) {
                          setTagBuilder({ ...tagBuilder, isOpen: false });
                          return;
                        }
                        const newTags = [...localTags, tag];
                        setLocalTags(newTags);
                        setTagBuilder({ ...tagBuilder, isOpen: false });

                        try {
                          const { fetchAuthSession } = await import('aws-amplify/auth');
                          const session = await fetchAuthSession();
                          const token = session.tokens?.idToken?.toString();

                          const res = await fetch('/api/leads', {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': token ? `Bearer ${token}` : ''
                            },
                            body: JSON.stringify({ leadId: lead.id, tags: newTags.map(t => t.id) })
                          });

                          if (res.ok && onLeadUpdate) {
                            const updatedLead = await res.json();
                            onLeadUpdate(updatedLead);
                          }
                        } catch (e) {
                          console.error("Failed to save tag", e);
                        }
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

      <div className={`modal-card ${isOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="slide-header">
          <div>
            <span className="slide-eyebrow">BLUEPRINT STAGE: {blueprint.stages.find(s => s.id === lead.stageId)?.name || "Unknown"}</span>
            <h2 className="slide-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {lead.firstName} {lead.lastName}
              {localTags.map((t, idx) => (
                <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'white', background: t.color, padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                  {t.name}
                  {(!currentUser || currentUser.profile?.canAccessSettings || currentUser.profile?.permissions?.[blueprint.moduleType]?.edit) && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const newTags = localTags.filter((_, i) => i !== idx);
                        setLocalTags(newTags);

                        try {
                          const { fetchAuthSession } = await import('aws-amplify/auth');
                          const session = await fetchAuthSession();
                          const token = session.tokens?.idToken?.toString();

                          const res = await fetch('/api/leads', {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': token ? `Bearer ${token}` : ''
                            },
                            body: JSON.stringify({ leadId: lead.id, tags: newTags.map(t => t.id) })
                          });

                          if (res.ok && onLeadUpdate) {
                            const updatedLead = await res.json();
                            onLeadUpdate(updatedLead);
                          }
                        } catch (err) {
                          console.error("Failed to remove tag", err);
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: 0, fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}
                      aria-label="Remove tag"
                    >✕</button>
                  )}
                </span>
              ))}
              {(!currentUser || currentUser.profile?.canAccessSettings || currentUser.profile?.permissions?.[blueprint.moduleType]?.edit) && (
                <button onClick={() => setTagBuilder({ isOpen: true })} style={{ background: 'none', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.75rem', fontWeight: 500, padding: '0.2rem 0.6rem', borderRadius: '12px', cursor: 'pointer' }}>+ Add Tag</button>
              )}
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
            <h3 style={{ marginTop: 0, fontSize: '1.25rem', marginBottom: '1rem' }}>Update Prompts</h3>
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
              {(activeTransition.visibleFields || []).map(fieldName => {
                const fieldDef = blueprint.fields.find(f => f.name === fieldName);
                if (!fieldDef) return null;
                return (
                  <div key={fieldName} style={{ marginBottom: '1rem' }}>
                    <DynamicField
                      field={fieldDef}
                      value={formData[fieldName]}
                      onChange={(name, value, record, mappings) => handleTransitionFieldChange(name, value, record, mappings, false)}
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
                    <DynamicField
                      field={fieldDef}
                      value={securityData[fieldName]}
                      onChange={(name, value, record, mappings) => handleTransitionFieldChange(name, value, record, mappings, true)}
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
            {confirmError && (
              <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid #fecaca' }}>
                {confirmError}
              </div>
            )}
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