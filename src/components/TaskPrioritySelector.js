import React from 'react';

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'Low', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)' },
  { label: 'Medium', value: 'Medium', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)' },
  { label: 'High', value: 'High', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)' }
];

export default function TaskPrioritySelector({ field, value, onChange, readOnly }) {
  const currentValue = value || 'Medium';

  // Agar form state me value khali hai toh turant 'Medium' se sync kar do
  React.useEffect(() => {
    if (!value && onChange) {
      onChange('Medium');
    }
  }, [value, onChange]);





  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #334155)', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {field?.label || 'Priority'}
        {field?.isRequired && <span style={{ color: '#ef4444' }}>*</span>}
      </label>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '4px',
        background: 'var(--bg-card, #f8fafc)',
        padding: '3px',
        borderRadius: '8px',
        border: '1px solid var(--border-color, #e2e8f0)',
        height: '38px',
        boxSizing: 'border-box'
      }}>
        {PRIORITY_OPTIONS.map((opt) => {
          const isSelected = currentValue.toLowerCase() === opt.value.toLowerCase();
          return (
            <button
              key={opt.value}
              type="button"
              disabled={readOnly}
              onClick={() => onChange(opt.value)}
              style={{
                border: isSelected ? `1px solid ${opt.border}` : '1px solid transparent',
                background: isSelected ? opt.bg : 'transparent',
                color: isSelected ? opt.color : 'var(--text-secondary, #64748b)',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: isSelected ? 700 : 500,
                cursor: readOnly ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                padding: '0 8px',
                boxShadow: isSelected ? `0 1px 4px ${opt.bg}` : 'none'
              }}
            >
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: opt.color,
                opacity: isSelected ? 1 : 0.45,
                transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.15s ease'
              }} />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

