import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import SlideOverPanel from './SlideOverPanel';

const AccountIntakeForm = dynamic(() => import('./AccountIntakeForm'), { ssr: false });
const LeadIntakeForm = dynamic(() => import('./LeadIntakeForm'), { ssr: false });
const DealIntakeForm = dynamic(() => import('./DealIntakeForm'), { ssr: false });
const ProductIntakeForm = dynamic(() => import('./ProductIntakeForm'), { ssr: false });
const TaskIntakeForm = dynamic(() => import('./TaskIntakeForm'), { ssr: false });


export default function LookupInput({ field, value, onChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [isQuickCreating, setIsQuickCreating] = useState(false);

  // value is expected to be an array of objects if multiSelect, or single object if not.
  const selectedItems = Array.isArray(value) ? value : (value ? [value] : []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getDisplayValue = (record) => {
    if (field.targetDisplayField && field.targetDisplayField !== 'name') {
      const val = record[field.targetDisplayField] || (record.customData && record.customData[field.targetDisplayField]);
      if (val) return String(val);
    }
    return record.name || (record.customData && record.customData.companyName) || record.taskName || (record.firstName ? record.firstName + ' ' + (record.lastName || '') : '') || record.email || 'Unknown';
  };

  
  const evaluateFilters = (record) => {
    if (!field.filters || !Array.isArray(field.filters) || field.filters.length === 0) return true;
    return field.filters.every(filter => {
      if (!filter.field || !filter.operator) return true;
      const recordValue = String(record[filter.field] || (record.customData && record.customData[filter.field]) || '').toLowerCase();
      const filterValue = String(filter.value || '').toLowerCase();
      
      switch (filter.operator) {
        case 'is': return recordValue === filterValue;
        case 'is_not': return recordValue !== filterValue;
        case 'contains': return recordValue.includes(filterValue);
        default: return true;
      }
    });
  };

  const searchRecords = async (query) => {
    if (!field.targetModule) return;
    setIsLoading(true);
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const { tokens } = await fetchAuthSession();
      const token = tokens.idToken.toString();

      let endpoint = '';
      if (field.targetModule === 'Lead') endpoint = '/api/leads';
      if (field.targetModule === 'Account') endpoint = '/api/accounts';
      if (field.targetModule === 'Product') endpoint = '/api/products';
      if (field.targetModule === 'Task') endpoint = '/api/tasks';

      if (!endpoint) return;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter locally for now
        const filtered = data.filter(item => {
           const nameToMatch = getDisplayValue(item);
           return nameToMatch.toLowerCase().includes(query.toLowerCase());
        });
        setResults(filtered);
      }
    } catch (err) {
      console.error("Error fetching lookup data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      searchRecords(searchTerm);
    }
  }, [isOpen, searchTerm]);

  const handleSelect = (record) => {
    const displayName = getDisplayValue(record);
    const payload = { id: record.id, name: displayName };

    if (field.isMultiSelect) {
      const isAlreadySelected = selectedItems.find(item => item.id === record.id);
      if (!isAlreadySelected) {
        onChange(field.name, [...selectedItems, payload], record, field.mappings);
      }
    } else {
      console.log('LookupInput Selection:', {name: field.name, payload, record, mappings: field.mappings}); onChange(field.name, payload, record, field.mappings);
      setIsOpen(false);
    }
    setSearchTerm(''); // Clear search on select
  };

  const handleRemove = (idToRemove) => {
    if (field.isMultiSelect) {
      onChange(field.name, selectedItems.filter(item => item.id !== idToRemove));
    } else {
      onChange(field.name, null);
    }
  };

  return (
    <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
      <label className="form-label" htmlFor={field.name}>
        {field.label} {field.isRequired && <span className="text-red-500">*</span>}
      </label>
      
      <div 
        className="form-input bg-white" 
        style={{ minHeight: '42px', height: 'auto', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.25rem 0.5rem', alignItems: 'center', cursor: 'text' }}
        onClick={() => setIsOpen(true)}
      >
        {selectedItems.map(item => (
          <span key={item.id} style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', border: '1px solid #e2e8f0' }}>
            {item.name}
            <button type="button" onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, fontSize: '1rem', lineHeight: 1 }}>×</button>
          </span>
        ))}
        
        {(!field.isMultiSelect && selectedItems.length > 0) ? null : (
          <input
            type="text"
            style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, minWidth: '100px', fontSize: '0.95rem' }}
            placeholder={selectedItems.length === 0 ? `Search ${field.targetModule || 'record'}...` : ''}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
          />
        )}
      </div>

      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 50, maxHeight: '200px', overflowY: 'auto' }}>
          {isLoading && <div style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.875rem' }}>Loading...</div>}
          {!isLoading && results.length === 0 && <div style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.875rem' }}>No records found.</div>}
          
          {!isLoading && results.map(record => {
            const displayName = getDisplayValue(record);
            const isSelected = selectedItems.find(item => item.id === record.id);
            return (
              <div 
                key={record.id} 
                onClick={() => handleSelect(record)}
                style={{ padding: '0.75rem', cursor: isSelected ? 'default' : 'pointer', background: isSelected ? '#f8fafc' : 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', opacity: isSelected ? 0.6 : 1 }}
                onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = '#f1f5f9' }}
                onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = 'white' }}
              >
                <div>
                  <div style={{ fontWeight: 500, color: '#0f172a' }}>{displayName}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {record.id.split('-')[0]}</div>
                </div>
                {isSelected && <span style={{ color: '#10b981', fontSize: '0.875rem' }}>Selected</span>}
              </div>
            );
          })}
          {field.targetModule && (
            <div 
              style={{ padding: '0.75rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem' }}
              onClick={() => { setIsOpen(false); setIsQuickCreating(true); }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
            >
              <span>+ New {field.targetModule}</span>
            </div>
          )}
        </div>
      )}
      {isQuickCreating && (
        <SlideOverPanel title={`New ${field.targetModule}`} onClose={() => setIsQuickCreating(false)}>
          {field.targetModule === 'Account' && <AccountIntakeForm onSuccess={(newRecord) => { setIsQuickCreating(false); handleSelect(newRecord); }} />}
          {field.targetModule === 'Lead' && <LeadIntakeForm onSuccess={(newRecord) => { setIsQuickCreating(false); handleSelect(newRecord); }} />}
          {field.targetModule === 'Deal' && <DealIntakeForm onSuccess={(newRecord) => { setIsQuickCreating(false); handleSelect(newRecord); }} />}
          {field.targetModule === 'Product' && <ProductIntakeForm onSuccess={(newRecord) => { setIsQuickCreating(false); handleSelect(newRecord); }} />}
          {field.targetModule === 'Task' && <TaskIntakeForm onSuccess={(newRecord) => { setIsQuickCreating(false); handleSelect(newRecord); }} />}
        </SlideOverPanel>
      )}
    </div>
  );
}
