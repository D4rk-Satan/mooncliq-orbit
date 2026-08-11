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

      {showModal && typeof document !== 'undefined' && createPortal(
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', padding: '2rem', borderRadius: '12px', width: '400px', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)', opacity: 1, pointerEvents: 'auto' }}>
            <h3 className="text-xl font-semibold mb-4">Custom Recurrence</h3>
            
            <div className="form-group mb-4">
              <label className="form-label">Repeat every</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="number" 
                  min="1" 
                  className="form-input" 
                  value={customInterval} 
                  onChange={e => setCustomInterval(e.target.value)} 
                />
                <select 
                  className="form-input bg-white" 
                  value={customFreq} 
                  onChange={e => setCustomFreq(e.target.value)}
                >
                  <option value="Daily">day(s)</option>
                  <option value="Weekly">week(s)</option>
                  <option value="Monthly">month(s)</option>
                  <option value="Yearly">year(s)</option>
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
