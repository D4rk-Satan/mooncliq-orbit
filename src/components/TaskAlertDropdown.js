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

      {showModal && (
        <div style={{ marginTop: '10px', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
          <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '8px', display: 'block' }}>Set Custom Alert</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '12px' }}>
            <input 
              type="number" 
              min="1" 
              className="form-input" 
              style={{ width: '80px' }}
              value={customValue} 
              onChange={e => setCustomValue(e.target.value)} 
            />
            <select 
              className="form-input bg-white" 
              style={{ flex: 1 }}
              value={customUnit} 
              onChange={e => setCustomUnit(e.target.value)}
            >
              <option value="Minutes">minute(s)</option>
              <option value="Hours">hour(s)</option>
              <option value="Days">day(s)</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px', minHeight: 'auto' }} onClick={() => setShowModal(false)}>Cancel</button>
            <button type="button" className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', minHeight: 'auto' }} onClick={handleCustomSave}>Save Alert</button>
          </div>
        </div>
      )}
    </div>
  );
}
