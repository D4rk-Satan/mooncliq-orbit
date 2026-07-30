"use client";

import React, { useEffect, useState } from "react";
import DynamicField from "./FieldRegistry";
import useClientScripts from "@/hooks/useClientScripts";

export default function TaskIntakeForm({ isOpen, onClose, onSave }) {
  const [blueprint, setBlueprint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Standard fields
  const [standardData, setStandardData] = useState({
    taskName: "",
    startDateTime: "",
    dueDateTime: "",
    endDateTime: "",
    repeat: "",
    alert: "",
    notes: ""
  });

  // Dynamic fields
  const [customData, setCustomData] = useState({});

  const { executeScript, standardFieldStates } = useClientScripts({
    moduleType: "Task",
    standardData, setStandardData,
    customData, setCustomData,
    blueprint, setBlueprint
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      fetchBlueprint();
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isOpen]);

  const getAuthToken = async () => {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const { tokens } = await fetchAuthSession();
    return tokens.idToken.toString();
  };

  const fetchBlueprint = async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/blueprint?moduleType=Task', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setBlueprint(data);
      setTimeout(() => executeScript("onLoad"), 0);
    } catch (err) {
      console.error("Failed to load blueprint", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleFieldChange = (field, name, value, record = null, mappings = []) => {
    if (field?.isSystemField) {
      setStandardData((prev) => ({ ...prev, [name]: value }));
    } else {
      setCustomData((prev) => ({ ...prev, [name]: value }));
    }

    setTimeout(() => executeScript("onChange", name), 0);

    if (record && mappings && mappings.length > 0) {
      mappings.forEach(mapping => {
        if (!mapping.sourceField || !mapping.targetField) return;
        let cData = {};
        try {
          cData = typeof record.customData === 'string' ? JSON.parse(record.customData || '{}') : (record.customData || {});
        } catch(e) {}
        const sourceVal = record[mapping.sourceField] || cData[mapping.sourceField];
        
        if (sourceVal !== undefined) {
          // Check if target is a standard field
          const standardKeys = ["firstName", "lastName", "email", "phone", "owner", "stageId", "companyName", "gstNo", "website", "address", "contactPerson", "name", "sku", "taskName", "startDateTime", "dueDateTime", "endDateTime", "repeat", "alert", "notes"];
          if (standardKeys.includes(mapping.targetField)) {
            setStandardData(prev => ({ ...prev, [mapping.targetField]: sourceVal }));
          } else {
            setCustomData(prev => ({ ...prev, [mapping.targetField]: sourceVal }));
          }
        }
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Clean up empty dates
    const payloadData = { ...standardData };
    if (!payloadData.startDateTime) delete payloadData.startDateTime;
    if (!payloadData.dueDateTime) delete payloadData.dueDateTime;
    if (!payloadData.endDateTime) delete payloadData.endDateTime;

    onSave({
      ...payloadData,
      customData,
      blueprintId: blueprint?.id
    });

    // Reset
    setStandardData({ taskName: "", startDateTime: "", dueDateTime: "", endDateTime: "", repeat: "", alert: "", notes: "" });
    setCustomData({});
    onClose();
  };

  // Convert ISO string back to datetime-local format for the input value
  const toLocalISO = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  };

  return (
    <>
      <div className={`slide-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      <div className={`modal-card ${isOpen ? 'open' : ''}`} style={{ width: '700px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {isLoading ? (
          <div className="p-8 text-center" style={{ margin: 'auto' }}>
            <h3 className="text-xl">Loading Architecture...</h3>
            <p className="text-muted mt-2">Fetching Blueprint from Database</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div className="slide-header" style={{ flexShrink: 0, backgroundColor: 'var(--card-bg)', zIndex: 10 }}>
              <div>
                <span className="slide-eyebrow">NEW {blueprint?.moduleType?.toUpperCase() || 'TASK'}</span>
                <h2 className="slide-title">{blueprint?.name || 'Task Intake Form'}</h2>
              </div>
              <button type="button" className="btn-close" onClick={onClose}>✕</button>
            </div>

            <div className="slide-content">
              {blueprint?.fields && (() => {
                const visibleFields = blueprint.fields.filter(f => !f.isHidden && !standardFieldStates?.[f.name]?.isHidden);
                
                let orderedSections = [];
                if (blueprint?.layoutConfig && Array.isArray(blueprint.layoutConfig) && blueprint.layoutConfig.length > 0) {
                    orderedSections = [...blueprint.layoutConfig].sort((a,b) => a.order - b.order);
                } else {
                    const uniqueNames = [...new Set(visibleFields.map(f => f.sectionName || 'General Information'))];
                    orderedSections = uniqueNames.map(name => ({ name, columns: 2 }));
                }
                
                return orderedSections.map(section => {
                  const sectionFields = visibleFields.filter(f => (f.sectionName || 'General Information') === section.name)
                    .sort((a,b) => (a.sectionOrder || 0) - (b.sectionOrder || 0));
                    
                  if (sectionFields.length === 0) return null;
                  
                  return (
                    <div className="data-section" key={section.name || section.id}>
                      <h3 className="section-heading">{section.name}</h3>
                      <div className="form-group-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${section.columns || 2}, 1fr)`, gap: '1.5rem' }}>
                        {sectionFields.map(field => {
                          const stateOverride = standardFieldStates?.[field.name];
                          const modifiedField = {
                            ...field,
                            isRequired: stateOverride?.isRequired !== undefined ? stateOverride.isRequired : field.isRequired
                          };
                          return (
                            <DynamicField
                            formData={{ ...standardData, ...customData }}
                            key={field.id}
                            field={modifiedField}
                            value={field.isSystemField ? standardData[field.name] : customData[field.name]}
                            onChange={(name, value, record, mappings) => handleFieldChange(field, name, value, record, mappings)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="slide-footer" style={{ borderTop: '1px solid #e2e8f0', flexShrink: 0, backgroundColor: 'var(--card-bg)', zIndex: 10 }}>
              <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ marginLeft: 'auto' }}>Save Task</button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
