import React from 'react';

export default function TaskStageDropdown({ field, value, onChange, blueprint }) {
  const stages = blueprint?.stages || [];

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={field.name}>
        {field.label} {field.isRequired && <span className="text-red-500">*</span>}
      </label>
      
      <select
        id={field.name}
        className="form-input bg-white"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={field.isRequired}
      >
        <option value="" disabled>Select Status</option>
        {stages.map(stage => (
          <option key={stage.id} value={stage.id}>{stage.name}</option>
        ))}
      </select>
    </div>
  );
}
