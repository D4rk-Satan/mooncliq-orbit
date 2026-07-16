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
};

// The Component that dynamically renders the right input based on field type
export default function DynamicField({ field, value, onChange }) {
  const Component = registry[field.type];

  if (!Component) {
    return (
      <div className="text-red-500 text-sm p-2 border border-red-500 rounded">
        Unsupported field type: {field.type}
      </div>
    );
  }

  return <Component field={field} value={value} onChange={(name, val, record, mappings) => onChange(name, val, record, mappings)} />;
}
