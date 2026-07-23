import React from 'react';

// Renders a simple text input
const TextInput = ({ field, value, onChange }) => (
  <div className="form-group">
    <label className="form-label" htmlFor={field.name}>
      {field.label} {field.isRequired && <span className="text-red-500">*</span>}
    </label>
    <input
      type="text"
      id={field.name}
      name={field.name}
      required={field.isRequired}
      value={value || ''}
      onChange={(e) => onChange(field.name, e.target.value)}
      className="form-input"
      placeholder={`Enter ${field.label.toLowerCase()}`}
    />
  </div>
);

// Renders a number input
const NumberInput = ({ field, value, onChange }) => (
  <div className="form-group">
    <label className="form-label" htmlFor={field.name}>
      {field.label} {field.isRequired && <span className="text-red-500">*</span>}
    </label>
    <input
      type="number"
      id={field.name}
      name={field.name}
      required={field.isRequired}
      value={value || ''}
      onChange={(e) => onChange(field.name, Number(e.target.value))}
      className="form-input"
      placeholder={`0`}
    />
  </div>
);

// Renders a select dropdown
const SelectInput = ({ field, value, onChange }) => (
  <div className="form-group">
    <label className="form-label" htmlFor={field.name}>
      {field.label} {field.isRequired && <span className="text-red-500">*</span>}
    </label>
    <select
      id={field.name}
      name={field.name}
      required={field.isRequired}
      value={value || ''}
      onChange={(e) => onChange(field.name, e.target.value)}
      className="form-input bg-white"
    >
      <option value="" disabled>Select {field.label}</option>
      {field.options && field.options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);

// Renders a date input
const DateInput = ({ field, value, onChange }) => (
  <div className="form-group">
    <label className="form-label" htmlFor={field.name}>
      {field.label} {field.isRequired && <span className="text-red-500">*</span>}
    </label>
    <input
      type="date"
      id={field.name}
      name={field.name}
      required={field.isRequired}
      value={value || ''}
      onChange={(e) => onChange(field.name, e.target.value)}
      className="form-input"
    />
  </div>
);

// Renders a checkbox input
const CheckboxInput = ({ field, value, onChange }) => (
  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
    <input
      type="checkbox"
      id={field.name}
      name={field.name}
      required={field.isRequired}
      checked={!!value}
      onChange={(e) => onChange(field.name, e.target.checked)}
      style={{ cursor: 'pointer', width: '1.2rem', height: '1.2rem' }}
    />
    <label className="form-label" htmlFor={field.name} style={{ margin: 0, cursor: 'pointer' }}>
      {field.label} {field.isRequired && <span className="text-red-500">*</span>}
    </label>
  </div>
);

// Renders a textarea
const TextareaInput = ({ field, value, onChange }) => (
  <div className="form-group">
    <label className="form-label" htmlFor={field.name}>
      {field.label} {field.isRequired && <span className="text-red-500">*</span>}
    </label>
    <textarea
      id={field.name}
      name={field.name}
      required={field.isRequired}
      value={value || ''}
      onChange={(e) => onChange(field.name, e.target.value)}
      className="form-input"
      placeholder={`Enter ${field.label.toLowerCase()}`}
      rows={3}
    />
  </div>
);

// Renders a currency input
const CurrencyInput = ({ field, value, onChange }) => (
  <div className="form-group">
    <label className="form-label" htmlFor={field.name}>
      {field.label} {field.isRequired && <span className="text-red-500">*</span>}
    </label>
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>$</span>
      <input
        type="number"
        id={field.name}
        name={field.name}
        required={field.isRequired}
        value={value || ''}
        onChange={(e) => onChange(field.name, Number(e.target.value))}
        className="form-input"
        style={{ paddingLeft: '1.75rem' }}
        placeholder={`0.00`}
        step="0.01"
      />
    </div>
  </div>
);

import LookupInput from './LookupInput';

// Renders a Subform (One-to-Many grid)
const SubformInput = ({ field, value, onChange, formData }) => {
  const rows = Array.isArray(value) ? value : [];
  const columns = field.subformFields || [];

  const handleAddRow = () => {
    const newRow = {};
    columns.forEach(col => {
      newRow[col.name] = ''; // Initialize with empty values
    });
    onChange(field.name, [...rows, newRow]);
  };

  const handleRemoveRow = (idx) => {
    const newRows = [...rows];
    newRows.splice(idx, 1);
    onChange(field.name, newRows);
  };

  const handleCellChange = (rowIndex, colName, colValue) => {
    const newRows = [...rows];
    newRows[rowIndex] = { ...newRows[rowIndex], [colName]: colValue };
    onChange(field.name, newRows);
  };

  return (
    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
      <label className="form-label">
        {field.label} {field.isRequired && <span className="text-red-500">*</span>}
      </label>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#f8fafc' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              {columns.map(col => (
                <th key={col.name} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#475569' }}>
                  {col.label} {col.isRequired && <span className="text-red-500">*</span>}
                </th>
              ))}
              <th style={{ padding: '0.75rem', width: '50px' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                {columns.map(col => (
                  <td key={col.name} style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                    <div style={{ margin: 0, padding: 0 }}>
                      <DynamicField 
                        field={{ ...col, label: '' }} // Hide individual labels inside table
                        value={row[col.name]} 
                        formData={{ ...formData, ...row }} // Pass row context to allow intra-row lookups if needed
                        onChange={(name, val) => handleCellChange(idx, name, val)} 
                      />
                    </div>
                  </td>
                ))}
                <td style={{ padding: '0.5rem', verticalAlign: 'top', textAlign: 'center' }}>
                  <button type="button" onClick={() => handleRemoveRow(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.5rem' }}>✕</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                  No items added yet. Click "Add Row" to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div style={{ padding: '0.75rem', backgroundColor: 'white', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" onClick={handleAddRow} style={{ color: 'var(--primary)', fontWeight: 500, fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer' }}>
            + Add Row
          </button>
        </div>
      </div>
    </div>
  );
};

// The Main Registry Mapping
const registry = {
  text: TextInput,
  number: NumberInput,
  currency: CurrencyInput,
  select: SelectInput,
  date: DateInput,
  checkbox: CheckboxInput,
  textarea: TextareaInput,
  lookup: LookupInput,
  subform: SubformInput,
};

// The Component that dynamically renders the right input based on field type
export default function DynamicField({ field, value, onChange, formData }) {
  const Component = registry[field.type];

  if (!Component) {
    return (
      <div className="text-red-500 text-sm p-2 border border-red-500 rounded">
        Unsupported field type: {field.type}
      </div>
    );
  }

  return <Component field={field} value={value} formData={formData} onChange={(name, val, record, mappings) => onChange(name, val, record, mappings)} />;
}
