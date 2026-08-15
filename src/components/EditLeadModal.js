import React, { useState, useEffect, useMemo } from 'react';

const EditLeadModal = ({ isOpen, onClose, lead, blueprint, onLeadUpdate, currentUser }) => {
  const [editData, setEditData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(0);

  useEffect(() => {
    if (isOpen && lead) {
      setEditData({ ...lead, customData: { ...(lead.customData || {}) } });
      setHasUnsavedChanges(false);
    }
  }, [isOpen, lead]);

  const handleChange = (name, value, isStandard) => {
    setHasUnsavedChanges(true);
    if (isStandard) {
      setEditData(prev => ({ ...prev, [name]: value }));
    } else {
      setEditData(prev => ({ ...prev, customData: { ...(prev.customData || {}), [name]: value } }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const { tokens } = await fetchAuthSession();
      const token = tokens.idToken.toString();

      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ leadId: lead.id, ...editData })
      });

      if (res.ok && onLeadUpdate) {
        const updatedLead = await res.json();
        onLeadUpdate(updatedLead);
        setHasUnsavedChanges(false);
        onClose();
      }
    } catch (e) {
      console.error("Failed to save lead edit", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = () => {
    if (hasUnsavedChanges) {
      setShakeTrigger(prev => prev + 1);
    } else {
      onClose();
    }
  };

  // Blueprint se sections aur fields nikalna (Stage ko chhod kar)
  const { visibleFields, orderedSections } = useMemo(() => {
    if (!blueprint?.fields) return { visibleFields: [], orderedSections: [] };

    // Stage field hamesha hide karni hai edit modal me
    const vf = blueprint.fields.filter(f => !f.isHidden && f.name !== 'stage');

    let os = [];
    if (blueprint?.layoutConfig && Array.isArray(blueprint.layoutConfig) && blueprint.layoutConfig.length > 0) {
      os = [...blueprint.layoutConfig].sort((a, b) => a.order - b.order);
    } else {
      const uniqueNames = [...new Set(vf.map(f => f.sectionName || 'General Information'))];
      os = uniqueNames.map(name => ({ name, columns: 2 }));
    }
    return { visibleFields: vf, orderedSections: os };
  }, [blueprint]);


  if (!isOpen || !lead) return null;

  const standardFields = ['firstName', 'lastName', 'email', 'phone', 'owner'];
  const formattedDate = lead.updatedAt ? new Date(lead.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }) : '';
  const updatedBy = lead.customData?.owner || 'System'; // placeholder, can be refined

  return (
    <>
      <div
        onClick={handleBackdropClick}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 100,
          backdropFilter: 'blur(2px)', transition: 'all 0.2s'
        }}
      ></div>

      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '90%', maxWidth: '700px', backgroundColor: '#ffffff',
          borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          zIndex: 101, display: 'flex', flexDirection: 'column', maxHeight: '90vh',
          animation: shakeTrigger ? 'shake 0.4s ease-in-out' : 'none'
        }}
        onAnimationEnd={() => setShakeTrigger(0)}
      >
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translate(-50%, -50%); }
            20% { transform: translate(calc(-50% - 8px), -50%); }
            40% { transform: translate(calc(-50% + 8px), -50%); }
            60% { transform: translate(calc(-50% - 4px), -50%); }
            80% { transform: translate(calc(-50% + 4px), -50%); }
          }
        `}</style>

        {/* Unsaved Changes Bar */}
        {hasUnsavedChanges && (
          <div style={{
            position: 'absolute', top: '-60px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: '#0f172a', color: 'white', padding: '12px 24px',
            borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '24px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 110, whiteSpace: 'nowrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', backgroundColor: '#f59e0b', borderRadius: '50%' }}></div>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Unsaved changes</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => { setHasUnsavedChanges(false); onClose(); }}
                disabled={isSaving}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 500, padding: '4px 8px', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = 'white'}
                onMouseLeave={e => e.target.style.color = '#94a3b8'}
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '24px', padding: '6px 16px', cursor: 'pointer', fontWeight: 600, transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
                onMouseEnter={e => e.target.style.backgroundColor = '#059669'}
                onMouseLeave={e => e.target.style.backgroundColor = '#10b981'}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ padding: '24px 32px 16px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EDIT LEAD</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Last updated {formattedDate}
            </p>
          </div>
          <button
            onClick={handleBackdropClick}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Body / Form */}
        <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>

          {orderedSections.map((section, idx) => {
            // Is section ke fields nikalna
            const sectionFields = visibleFields.filter(f => (f.sectionName || 'General Information') === section.name);
            if (sectionFields.length === 0) return null;

            return (
              <div key={idx} style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  {section.name}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${section.columns || 2}, 1fr)`, gap: '20px' }}>

                  {sectionFields.map(field => {
                    const isStandard = standardFields.includes(field.name);
                    const value = isStandard ? editData[field.name] : editData.customData?.[field.name];

                    return (
                      <div key={field.name} style={{ gridColumn: field.fullWidth ? '1 / -1' : 'auto' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                          {field.label} {field.isRequired && <span style={{ color: '#ef4444' }}>*</span>}
                        </label>

                        {field.type === 'Select' ? (
                          <select
                            value={value || ''}
                            onChange={(e) => handleChange(field.name, e.target.value, isStandard)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
                          >
                            <option value="">Select...</option>
                            {(field.options || []).map((opt, i) => (
                              <option key={i} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type === 'Number' ? 'number' : field.type === 'Email' ? 'email' : 'text'}
                            value={value || ''}
                            onChange={(e) => handleChange(field.name, e.target.value, isStandard)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '0.9rem', outline: 'none' }}
                          />
                        )}
                      </div>
                    );
                  })}

                </div>
              </div>
            );
          })}

        </div>

      </div>
    </>
  );
};

export default EditLeadModal;
