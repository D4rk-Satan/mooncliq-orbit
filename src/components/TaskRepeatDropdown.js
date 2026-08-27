import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export default function TaskRepeatDropdown({ field, value, onChange }) {
  const [showModal, setShowModal] = useState(false);
  const [customFreq, setCustomFreq] = useState('Daily');
  const [customInterval, setCustomInterval] = useState(1);

  const predefinedOptions = [
    { label: 'None', value: '' },
    { label: 'Everyday', value: 'FREQ=DAILY;INTERVAL=1' },
    { label: 'Every week', value: 'FREQ=WEEKLY;INTERVAL=1' },
    { label: 'Every 2 weeks', value: 'FREQ=WEEKLY;INTERVAL=2' },
    { label: 'Every month', value: 'FREQ=MONTHLY;INTERVAL=1' },
    { label: 'Every year', value: 'FREQ=YEARLY;INTERVAL=1' }
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
    let freq = 'DAILY';
    if (customFreq === 'Weekly') freq = 'WEEKLY';
    if (customFreq === 'Monthly') freq = 'MONTHLY';
    if (customFreq === 'Yearly') freq = 'YEARLY';
    
    onChange(`FREQ=${freq};INTERVAL=${customInterval}`);
    setShowModal(false);
  };

  const isPredefined = predefinedOptions.find(o => o.value === value);
  const displayValue = isPredefined ? value : (value ? 'CUSTOM' : '');

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
          Custom rule: {value}
        </div>
      )}

      {showModal && (
        <div style={{ marginTop: '10px', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
          <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '8px', display: 'block' }}>Set Custom Recurrence</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', alignSelf: 'center' }}>Repeat every</span>
            <input 
              type="number" 
              min="1" 
              className="form-input" 
              style={{ width: '60px' }}
              value={customInterval} 
              onChange={e => setCustomInterval(e.target.value)} 
            />
            <select 
              className="form-input bg-white" 
              style={{ flex: 1 }}
              value={customFreq} 
              onChange={e => setCustomFreq(e.target.value)}
            >
              <option value="Daily">day(s)</option>
              <option value="Weekly">week(s)</option>
              <option value="Monthly">month(s)</option>
              <option value="Yearly">year(s)</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px', minHeight: 'auto' }} onClick={() => setShowModal(false)}>Cancel</button>
            <button type="button" className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', minHeight: 'auto' }} onClick={handleCustomSave}>Save Recurrence</button>
          </div>
        </div>
      )}
    </div>
  );
}
