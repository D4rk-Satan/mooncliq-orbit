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
    console.log(e.target.value); // Naya Alert Yahan

    const val = e.target.value;
    if (val === 'CUSTOM') {
      onChange('CUSTOM');
      setShowModal(true);
    } else {
      onChange(val);
      setShowModal(false); // Agar dusra option chuna toh modal band ho jaye
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
    <div className="form-group" style={{ position: 'relative' }}>

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
        <div style={{ position: 'absolute', zIndex: 9999, top: '100%', left: 0, marginTop: '8px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px', width: '320px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '12px', display: 'block' }}>Set Custom Recurrence</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', alignSelf: 'center', color: '#475569' }}>Repeat every</span>
            <input type="number" min="1" className="form-input" style={{ width: '70px', padding: '8px' }} value={customInterval} onChange={e => setCustomInterval(e.target.value)} />
            <select className="form-input bg-white" style={{ flex: 1, padding: '8px' }} value={customFreq} onChange={e => setCustomFreq(e.target.value)}>
              <option value="Daily">day(s)</option>
              <option value="Weekly">week(s)</option>
              <option value="Monthly">month(s)</option>
              <option value="Yearly">year(s)</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn-outline" onClick={() => setShowModal(false)} style={{ padding: '6px 12px' }}>Cancel</button>
            <button type="button" className="btn-primary" onClick={handleCustomSave} style={{ padding: '6px 16px' }}>Save</button>
          </div>
        </div>
      )}

    </div>
  );
}
