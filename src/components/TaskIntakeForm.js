"use client";

import React, { useEffect, useState } from "react";
import DynamicField from "./FieldRegistry";

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
    } catch (err) {
      console.error("Failed to load blueprint", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleStandardChange = (e) => {
    const { name, value } = e.target;
    setStandardData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setStandardData((prev) => ({ ...prev, [name]: value ? new Date(value).toISOString() : "" }));
  };

  const handleCustomChange = (name, value, record = null, mappings = []) => {
    setCustomData((prev) => ({ ...prev, [name]: value }));

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
              <div className="data-section">
                <h3 className="section-heading">Standard Information</h3>
                <div className="data-grid-2col form-group-grid">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Task Name *</label>
                    <input required type="text" name="taskName" value={standardData.taskName} onChange={handleStandardChange} className="form-input" placeholder="e.g. Call Client" />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Start Date & Time</label>
                    <input type="datetime-local" name="startDateTime" value={toLocalISO(standardData.startDateTime)} onChange={handleDateChange} className="form-input" />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Due Date & Time</label>
                    <input type="datetime-local" name="dueDateTime" value={toLocalISO(standardData.dueDateTime)} onChange={handleDateChange} className="form-input" />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">End Date & Time</label>
                    <input type="datetime-local" name="endDateTime" value={toLocalISO(standardData.endDateTime)} onChange={handleDateChange} className="form-input" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Repeat</label>
                    <select name="repeat" value={standardData.repeat} onChange={handleStandardChange} className="form-input">
                      <option value="">None</option>
                      <option value="everyday">Everyday</option>
                      <option value="week">Every Week</option>
                      <option value="month">Every Month</option>
                      <option value="year">Every Year</option>
                    </select>
                  </div>
                  
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Alert</label>
                    <select name="alert" value={standardData.alert} onChange={handleStandardChange} className="form-input">
                      <option value="">No Alert</option>
                      <option value="at time of event">At time of event</option>
                      <option value="5 minutes before">5 minutes before</option>
                      <option value="10 minutes before">10 minutes before</option>
                      <option value="15 minutes before">15 minutes before</option>
                      <option value="30 minutes before">30 minutes before</option>
                      <option value="1 hour before">1 hour before</option>
                      <option value="2 hour before">2 hour before</option>
                      <option value="1 day before">1 day before</option>
                      <option value="2 day before">2 day before</option>
                      <option value="1 week before">1 week before</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Notes</label>
                    <textarea name="notes" value={standardData.notes} onChange={handleStandardChange} className="form-input" rows="4" style={{ resize: 'vertical' }}></textarea>
                  </div>
                </div>
              </div>

              {blueprint?.fields && blueprint.fields.length > 0 && (
                <div className="data-section">
                  <h3 className="section-heading">Custom Details</h3>
                  <div className="data-grid-2col form-group-grid">
                    {blueprint.fields.map(field => (
                      <DynamicField
                        formData={{ ...standardData, ...customData }}
                        key={field.id}
                        field={field}
                        value={customData[field.name]}
                        onChange={handleCustomChange}
                      />
                    ))}
                  </div>
                </div>
              )}
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
