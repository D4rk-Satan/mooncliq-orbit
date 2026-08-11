import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export default function TaskAlertDropdown({ field, value, onChange }) {
  const [showModal, setShowModal] = useState(false);
  const [customUnit, setCustomUnit] = useState('Minutes');
  const [customValue, setCustomValue] = useState(15);

  const predefinedOptions = [
    { label: 'None', value: '' },
    { label: 'At time of task', value: '0' },
    { label: '5 min before', value: '5' },
    { label: '10 min before', value: '10' },
    { label: '1 hour before', value: '60' },
    { label: '1 day before', value: '1440' } // 24 * 60
  ];

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === 'CUSTOM') {
      setShowModal(true);
    } else {
      onChange(val);
    }
  };

  const handleCustomSave = () => {
    let minutes = customValue;
    if (customUnit === 'Hours') minutes = customValue * 60;
    if (customUnit === 'Days') minutes = customValue * 1440;
    
    onChange(minutes.toString());
    setShowModal(false);
  };

  const isPredefined = predefinedOptions.find(o => o.value === value);
  const displayValue = isPredefined ? value : (value ? 'CUSTOM' : '');

  // Helper to display custom text nicely
  const getCustomLabel = () => {
    if (!value) return '';
    const mins = parseInt(value, 10);
    if (mins % 1440 === 0) return `${mins / 1440} day(s) before`;
    if (mins % 60 === 0) return `${mins / 60} hour(s) before`;
    return `${mins} min(s) before`;
  };

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={field.name}>
        {field.label} {field.isRequired && <span className="text-red-500">*</span>}
      </label>
      
      <select
        id={field.name}
        className="form-input bg-white"
        value={displayValue}
        onChange={handleSelectChange}
        required={field.isRequired}
      >
        {predefinedOptions.map(opt => (
          <option key={opt.label} value={opt.value}>{opt.label}</option>
        ))}
        <option value="CUSTOM">Custom...</option>
      </select>

      {!isPredefined && value && (
        <div className="text-sm text-gray-500 mt-1">
          Custom: {getCustomLabel()}
        </div>
      )}

      {showModal && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '2rem', borderRadius: '12px', width: '400px', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)', opacity: 1, pointerEvents: 'auto' }}>
            <h3 className="text-xl font-semibold mb-4">Custom Alert</h3>
            
            <div className="form-group mb-4">
              <label className="form-label">Remind me before</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="number" 
                  min="1" 
                  className="form-input" 
                  value={customValue} 
                  onChange={e => setCustomValue(e.target.value)} 
                />
                <select 
                  className="form-input bg-white" 
                  value={customUnit} 
                  onChange={e => setCustomUnit(e.target.value)}
                >
                  <option value="Minutes">minute(s)</option>
                  <option value="Hours">hour(s)</option>
                  <option value="Days">day(s)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleCustomSave}>Save</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
