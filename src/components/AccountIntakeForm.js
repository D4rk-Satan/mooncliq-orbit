"use client";

import React, { useEffect, useState } from "react";
import DynamicField from "./FieldRegistry";

export default function AccountIntakeForm({ isOpen, onClose, onSave }) {
  const [blueprint, setBlueprint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Standard fields
  const [standardData, setStandardData] = useState({
    companyName: "",
    email: "",
    gstNo: "",
    website: "",
    address: "",
    contactPerson: "",
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
      const res = await fetch('/api/blueprint?moduleType=Account', {
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
    onSave({
      ...standardData,
      customData,
      blueprintId: blueprint?.id
    });
    // Reset
    setStandardData({ companyName: "", email: "", gstNo: "", website: "", address: "", contactPerson: "" });
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
                <span className="slide-eyebrow">NEW {blueprint?.moduleType?.toUpperCase() || 'ACCOUNT'}</span>
                <h2 className="slide-title">{blueprint?.name || 'Account Intake Form'}</h2>
              </div>
              <button type="button" className="btn-close" onClick={onClose}>✕</button>
            </div>

            <div className="slide-content">
              <div className="data-section">
                <h3 className="section-heading">Standard Information</h3>
                <div className="data-grid-2col form-group-grid">
                  <div className="form-group">
                    <label className="form-label">Company Name *</label>
                    <input required type="text" name="companyName" value={standardData.companyName} onChange={handleStandardChange} className="form-input" placeholder="e.g. Acme Corp" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" name="email" value={standardData.email} onChange={handleStandardChange} className="form-input" placeholder="e.g. contact@acme.com" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST No</label>
                    <input type="text" name="gstNo" value={standardData.gstNo} onChange={handleStandardChange} className="form-input" placeholder="e.g. 22AAAAA0000A1Z5" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Website</label>
                    <input type="url" name="website" value={standardData.website} onChange={handleStandardChange} className="form-input" placeholder="e.g. https://acme.com" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Person</label>
                    <input type="text" name="contactPerson" value={standardData.contactPerson} onChange={handleStandardChange} className="form-input" placeholder="e.g. Jane Smith" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <input type="text" name="address" value={standardData.address} onChange={handleStandardChange} className="form-input" placeholder="e.g. 123 Business Rd" />
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
              <button type="submit" className="btn-primary" style={{ marginLeft: 'auto' }}>Save Account</button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
