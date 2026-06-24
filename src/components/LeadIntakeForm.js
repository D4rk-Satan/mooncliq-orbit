"use client";

import React, { useEffect, useState } from "react";
import DynamicField from "./FieldRegistry";

export default function LeadIntakeForm({ isOpen, onClose, onSave }) {
  const [blueprint, setBlueprint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Standard fields
  const [standardData, setStandardData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    owner: "",
    stageId: "" // We will set this based on the first stage
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
      const res = await fetch('/api/blueprint?moduleType=Lead', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setBlueprint(data);
      if (data.stages && data.stages.length > 0) {
        setStandardData(prev => ({ ...prev, stageId: data.stages[0].id })); // Default to first stage
      }
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

  const handleCustomChange = (name, value) => {
    setCustomData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...standardData,
      customData,
      blueprintId: blueprint?.id
    });
    // Reset
    setStandardData({ firstName: "", lastName: "", email: "", phone: "", owner: "", stageId: blueprint?.stages?.[0]?.id || "" });
    setCustomData({});
    onClose();
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
                <span className="slide-eyebrow">NEW {blueprint?.moduleType?.toUpperCase() || 'LEAD'}</span>
                <h2 className="slide-title">{blueprint?.name || 'Lead Intake Form'}</h2>
              </div>
              <button type="button" className="btn-close" onClick={onClose}>✕</button>
            </div>

            <div className="slide-content">
              <div className="data-section">
                <h3 className="section-heading">Standard Information</h3>
                <div className="data-grid-2col form-group-grid">
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input required type="text" name="firstName" value={standardData.firstName} onChange={handleStandardChange} className="form-input" placeholder="e.g. John" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input required type="text" name="lastName" value={standardData.lastName} onChange={handleStandardChange} className="form-input" placeholder="e.g. Doe" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" name="email" value={standardData.email} onChange={handleStandardChange} className="form-input" placeholder="e.g. john@example.com" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input type="tel" name="phone" value={standardData.phone} onChange={handleStandardChange} className="form-input" placeholder="e.g. +1 234 567 890" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lead Owner</label>
                    <input type="text" name="owner" value={standardData.owner} onChange={handleStandardChange} className="form-input" placeholder="e.g. Jane Smith" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      Initial Stage 🔒
                    </label>
                    <select disabled name="stageId" value={standardData.stageId} className="form-input" style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}>
                      {blueprint?.stages?.map(stage => (
                        <option key={stage.id} value={stage.id}>{stage.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {blueprint?.fields && blueprint.fields.length > 0 && (
                <div className="data-section">
                  <h3 className="section-heading">Custom Details</h3>
                  <div className="data-grid-2col form-group-grid">
                    {blueprint.fields.map(field => (
                      <DynamicField
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
              <button type="submit" className="btn-primary" style={{ marginLeft: 'auto' }}>Save Lead</button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
