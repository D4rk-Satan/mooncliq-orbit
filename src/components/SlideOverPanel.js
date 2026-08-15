"use client";

import React, { useEffect, useState } from "react";
import DynamicField from "./FieldRegistry";
import { evaluateExecutionCriteria } from "../utils/ruleEngine";

export default function SlideOverPanel({ isOpen, onClose, lead, blueprint, tags = [], currentUser, onTransition, onLeadUpdate, pendingTransition, onEditClick }) {
  const [modalMode, setModalMode] = useState(null); // null | 'missing' | 'security' | 'confirm'
  const [activeTransition, setActiveTransition] = useState(null);
  const [formData, setFormData] = useState({});
  const [securityData, setSecurityData] = useState({});
  const [securityError, setSecurityError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [checklistState, setChecklistState] = useState({});
  const [tagBuilder, setTagBuilder] = useState({ isOpen: false });
  const [localTags, setLocalTags] = useState([]);
  const [activeTab, setActiveTab] = useState('Details');
  


  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
      setModalMode(null);
      setActiveTransition(null);
      setActiveTab('Details');
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
  const currentStage = blueprint.stages.find(s => s.id === currentStageId);
  const stageColor = currentStage?.color || '#0ea5e9';
  const stageName = currentStage?.name || "Unknown";

  const getInitials = (firstName, lastName) => {
    const f = firstName ? firstName.charAt(0).toUpperCase() : '';
    const l = lastName ? lastName.charAt(0).toUpperCase() : '';
    return (f + l) || '?';
  };

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
        let cData = {};
        try {
          cData = typeof record.customData === 'string' ? JSON.parse(record.customData || '{}') : (record.customData || {});
        } catch(e) {}
        const sourceVal = record[mapping.sourceField] || cData[mapping.sourceField];
        if (sourceVal !== undefined) {
          newData[mapping.targetField] = sourceVal;
        }
      });
    }
    setTargetData(newData);
  };



  const renderTabContent = () => {
    if (activeTab === 'Details') {
      const standardFields = ['firstName', 'lastName', 'email', 'phone', 'owner'];
      
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', paddingBottom: '0' }}>
          {blueprint.fields.map(field => {
            const isStandard = standardFields.includes(field.name);
            let value = isStandard ? lead[field.name] : lead.customData?.[field.name];
            
            if (value === undefined || value === null || value === "") {
              value = "-";
            }

            return (
              <div key={field.id}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>{field.label}</div>
                <div style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 500, wordBreak: 'break-word' }}>{value}</div>
              </div>
            );
          })}
          {(!blueprint.fields || blueprint.fields.length === 0) && (
            <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>No fields configured in blueprint.</div>
          )}
        </div>
      );
    }

    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
        <p>No data available for {activeTab}</p>
      </div>
    );
  };

  return (
    <>


      <div className={`slide-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose} style={{ zIndex: 990 }}></div>

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

      <div className={`modal-card ${isOpen ? 'open' : ''}`} style={{ 
        display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', 
        width: '600px', maxWidth: '100vw', right: isOpen ? '0' : '-600px',
        top: 0, bottom: 0, height: '100vh', maxHeight: '100vh', borderRadius: '0',
        left: 'auto', transform: 'none', /* Override modal-card centering */
        boxShadow: '-4px 0 24px rgba(0,0,0,0.1)', zIndex: 995, position: 'fixed',
        transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '2rem 2rem 0 2rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '50%', 
                backgroundColor: `${stageColor}20`, color: stageColor, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: '1.1rem', fontWeight: 600, letterSpacing: '1px' 
              }}>
                {getInitials(lead.firstName, lead.lastName)}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {lead.firstName} {lead.lastName}
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: stageColor, backgroundColor: `${stageColor}15`, padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                    {stageName}
                  </span>
                </h2>
              </div>
            </div>
            <button 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.25rem' }} 
              onClick={onClose}
            >✕</button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '36px', borderRadius: '18px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#64748b', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            </button>
            <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '36px', borderRadius: '18px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#64748b', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </button>
            <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '36px', borderRadius: '18px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#64748b', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            </button>
            <button 
              onClick={() => onEditClick(lead)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1.25rem', height: '36px', borderRadius: '18px', border: 'none', backgroundColor: '#0f172a', color: '#ffffff', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Edit
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            {['Details', 'Activity', 'Notes', 'Files', 'Related'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none', border: 'none', padding: '0.75rem 0', cursor: 'pointer',
                  fontSize: '0.9rem', fontWeight: activeTab === tab ? 600 : 500,
                  color: activeTab === tab ? '#0f172a' : '#64748b',
                  borderBottom: activeTab === tab ? '2px solid #0f172a' : '2px solid transparent',
                  marginBottom: '-1px', transition: 'all 0.2s', whiteSpace: 'nowrap'
                }}
              >
                {tab} {tab === 'Files' || tab === 'Related' ? '(2)' : ''}
              </button>
            ))}
          </div>
        </div>

        <div className="slide-content" style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          {renderTabContent()}
          
          {localTags.length > 0 && (
            <div style={{ marginTop: '2.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.75rem' }}>Tags</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {localTags.map((t, idx) => (
                  <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', background: `${t.color}20`, border: `1px solid ${t.color}`, padding: '0.25rem 0.75rem', borderRadius: '16px' }}>
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="slide-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '1.25rem 2rem', background: '#ffffff' }}>
          {availableTransitions.length === 0 ? (
            <p className="text-muted text-sm" style={{ width: '100%', textAlign: 'center', margin: 0 }}>No transitions available for this stage.</p>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '4px' }}>
              {availableTransitions.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTransitionClick(t)}
                  style={{
                    flex: '1 0 auto', padding: '0.6rem 1.2rem', borderRadius: '8px',
                    fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                    background: t.isGlobal ? '#f8fafc' : '#0f172a',
                    color: t.isGlobal ? '#334155' : '#ffffff',
                    border: t.isGlobal ? '1px solid #e2e8f0' : 'none',
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
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