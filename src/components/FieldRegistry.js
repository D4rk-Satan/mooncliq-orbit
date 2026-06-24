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

// The Main Registry Mapping
const registry = {
  text: TextInput,
  number: NumberInput,
  currency: NumberInput, // Mapping currency to number for MVP
  select: SelectInput,
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

  return <Component field={field} value={value} onChange={onChange} />;
}
