"use client";

import React, { useState, useEffect, useRef } from "react";
import Badge from "./ui/Badge";
import Button from "./ui/Button";

const getColumnColor = (color) => color || "#e2e8f0";

const CustomDropdown = ({ value, options, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ddRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => { if (ddRef.current && !ddRef.current.contains(e.target)) setIsOpen(false); };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOpt = options.find(o => o.value === value);

  return (
    <div ref={ddRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#0f172a', outline: 'none', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span>{selectedOpt ? selectedOpt.label : placeholder}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 60, maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
          {options.map((opt, i) => (
            <div
              key={i}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#d9f99d'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              style={{ padding: '6px 8px', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '4px', color: '#0f172a', transition: 'background-color 0.1s' }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function DynamicModuleView({
  moduleName,
  records,
  blueprint,
  tags,
  supportKanban = false,
  currentUser,
  onRecordClick,
  onEditClick,
  renderHeaderActions,
  onDropRecord,
  selectedRecordIds = [],
  setSelectedRecordIds,
  onBulkTagApply
}) {
  const [viewMode, setViewMode] = useState(supportKanban ? "kanban" : "list");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter States
  const [activeFilters, setActiveFilters] = useState([]);
  const [filterLogic, setFilterLogic] = useState('AND');
  const [isFilterBuilderOpen, setIsFilterBuilderOpen] = useState(false);
  const [fbField, setFbField] = useState('');
  const [fbOperator, setFbOperator] = useState('contains');
  const [fbValue, setFbValue] = useState('');
  const filterBuilderRef = useRef(null);

  // Column States
  const defaultCols = ['firstName', 'companyName', 'email', 'owner', 'stage', 'createdAt'];
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [isManageColsMenuOpen, setIsManageColsMenuOpen] = useState(false);

  // Sort States
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  // UI States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState(null);
  const [activeCardMenuId, setActiveCardMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!supportKanban) setViewMode('list');
  }, [supportKanban]);

  useEffect(() => {
    const handleGlobalClick = () => setActiveCardMenuId(null);
    if (activeCardMenuId) document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [activeCardMenuId]);

  useEffect(() => {
    function handleClickOutsideFB(event) {
      if (filterBuilderRef.current && !filterBuilderRef.current.contains(event.target)) {
        setIsFilterBuilderOpen(false);
      }
    }
    if (isFilterBuilderOpen) document.addEventListener("mousedown", handleClickOutsideFB);
    else document.removeEventListener("mousedown", handleClickOutsideFB);
    return () => document.removeEventListener("mousedown", handleClickOutsideFB);
  }, [isFilterBuilderOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    const saved = localStorage.getItem(`mooncliq_${moduleName.toLowerCase()}_cols`);
    if (saved) {
      try { setVisibleColumns(JSON.parse(saved)); } catch (e) { setVisibleColumns(defaultCols); }
    } else {
      setVisibleColumns(defaultCols);
    }
  }, [moduleName]);

  const handleColToggle = (colName) => {
    let newCols = [...visibleColumns];
    if (newCols.includes(colName)) {
      newCols = newCols.filter(c => c !== colName);
    } else {
      if (newCols.length >= 7) { alert("Maximum 7 columns allowed"); return; }
      newCols.push(colName);
    }
    setVisibleColumns(newCols);
    localStorage.setItem(`mooncliq_${moduleName.toLowerCase()}_cols`, JSON.stringify(newCols));
  };

  const handleDragStartCol = (e, idx) => e.dataTransfer.setData('colIdx', idx);
  const handleDropCol = (e, dropIdx) => {
    const dragIdx = parseInt(e.dataTransfer.getData('colIdx'));
    if (isNaN(dragIdx) || dragIdx === dropIdx) return;
    const newCols = [...visibleColumns];
    const [dragged] = newCols.splice(dragIdx, 1);
    newCols.splice(dropIdx, 0, dragged);
    setVisibleColumns(newCols);
    localStorage.setItem(`mooncliq_${moduleName.toLowerCase()}_cols`, JSON.stringify(newCols));
  };

  const addFilter = () => {
    if (!fbField || !fbOperator) return;
    if (!['isEmpty', 'isNotEmpty'].includes(fbOperator) && !fbValue) return;
    setActiveFilters([...activeFilters, { id: Date.now(), field: fbField, operator: fbOperator, value: fbValue }]);
    setFbField(''); setFbOperator('contains'); setFbValue('');
    setIsFilterBuilderOpen(false);
  };

  const removeFilter = (id) => setActiveFilters(activeFilters.filter(f => f.id !== id));

  const getFieldInfo = (fieldName) => {
    const defaultLabels = { firstName: 'NAME', companyName: 'COMPANY', email: 'EMAIL', owner: 'OWNER', stage: 'STAGE', createdAt: 'CREATED', name: 'NAME' };
    if (defaultLabels[fieldName]) return defaultLabels[fieldName];
    const blueprintField = (blueprint?.fields || []).find(f => f.name === fieldName);
    return blueprintField ? blueprintField.label.toUpperCase() : fieldName.toUpperCase();
  };

  const toggleRecordSelection = (recordId, e) => {
    if (!setSelectedRecordIds) return;
    e.stopPropagation();
    setSelectedRecordIds(prev => {
      if (prev.includes(recordId)) return prev.filter(id => id !== recordId);
      return [...prev, recordId];
    });
  };

  const selectAllRecords = (e) => {
    if (!setSelectedRecordIds) return;
    if (e.target.checked) setSelectedRecordIds(filteredRecords.map(r => r.id));
    else setSelectedRecordIds([]);
  };

  // Filter & Sort Logic
  const filteredRecords = records.filter(record => {
    let cData = {};
    try { cData = typeof record.customData === 'string' ? JSON.parse(record.customData) : (record.customData || {}); } catch (e) { }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const searchableFields = ['firstName', 'lastName', 'email', 'companyName', 'name'];
      let match = false;
      for (const f of searchableFields) {
        if (record[f] && String(record[f]).toLowerCase().includes(q)) match = true;
        if (cData[f] && String(cData[f]).toLowerCase().includes(q)) match = true;
      }
      if (!match) return false;
    }

    if (activeFilters.length === 0) return true;

    const evaluateFilter = (filter) => {
      const isCustom = !(blueprint?.fields?.find(f => f.name === filter.field) === undefined) && !['firstName', 'lastName', 'email', 'phone', 'owner', 'stage', 'name'].includes(filter.field);
      let recordValue = isCustom ? (cData[filter.field] || '') : (record[filter.field] || '');
      if (filter.field === 'stage') recordValue = record.stage?.name || '';

      let lVal = String(recordValue).toLowerCase();
      let fVal = String(filter.value).toLowerCase();

      switch (filter.operator) {
        case 'is': return lVal === fVal;
        case 'isNot': return lVal !== fVal;
        case 'contains': return lVal.includes(fVal);
        case 'notContains': return !lVal.includes(fVal);
        case 'startsWith': return lVal.startsWith(fVal);
        case 'endsWith': return lVal.endsWith(fVal);
        case 'isEmpty': return lVal === '' || lVal === 'undefined' || lVal === 'null';
        case 'isNotEmpty': return lVal !== '' && lVal !== 'undefined' && lVal !== 'null';
        default: return true;
      }
    };

    return filterLogic === 'AND' ? activeFilters.every(evaluateFilter) : activeFilters.some(evaluateFilter);
  }).sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    const standardFields = ['firstName', 'lastName', 'name', 'email', 'phone', 'owner', 'createdAt'];
    if (!standardFields.includes(sortConfig.key)) {
      try { aVal = (typeof a.customData === 'string' ? JSON.parse(a.customData) : (a.customData || {}))[sortConfig.key]; } catch (e) { }
      try { bVal = (typeof b.customData === 'string' ? JSON.parse(b.customData) : (b.customData || {}))[sortConfig.key]; } catch (e) { }
    }
    if (aVal === bVal) return 0;
    if (!aVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (!bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const dateA = new Date(aVal); const dateB = new Date(bVal);
      if (!isNaN(dateA) && !isNaN(dateB)) return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      return sortConfig.direction === 'asc' ? aVal.toLowerCase().localeCompare(bVal.toLowerCase()) : bVal.toLowerCase().localeCompare(aVal.toLowerCase());
    }
    return sortConfig.direction === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  const renderEmptyState = () => (
    <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center', height: '100%' }}>
      <div className="empty-state-content" style={{ maxWidth: '400px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>No records found</h3>
        <p className="text-muted" style={{ marginBottom: '1.5rem', color: '#64748b' }}>Try adjusting your filters or search query.</p>
      </div>
    </div>
  );

  const renderKanbanView = () => {
    if (!blueprint?.stages) return null;
    const isFilterActive = searchQuery !== "" || activeFilters.length > 0;
    const columns = blueprint.stages.map(stage => {
      const columnRecords = filteredRecords.filter(r => r.stageId === stage.id);
      return { stage, records: columnRecords, isCollapsed: isFilterActive && columnRecords.length === 0 };
    });

    return (
      <div className="kanban-board">
        {columns.map(col => {
          if (col.isCollapsed) {
            return (
              <div
                key={col.stage.id}
                onDrop={(e) => onDropRecord && onDropRecord(e, col.stage.id)}
                onDragOver={(e) => e.preventDefault()}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px', maxWidth: '60px',
                  border: '2px dashed #e2e8f0', borderRadius: '16px', padding: '1rem 0', margin: '0 0.5rem', opacity: 0.6
                }}
              >
                <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', color: getColumnColor(col.stage.color), fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', marginTop: '10px' }}>
                  {col.stage.name} (0)
                </div>
              </div>
            );
          }
          return (
            <div
              key={col.stage.id}
              className="kanban-column"
              onDrop={(e) => onDropRecord && onDropRecord(e, col.stage.id)}
              onDragOver={(e) => e.preventDefault()}
              style={{ padding: '0 0.5rem', display: 'flex', flexDirection: 'column', minWidth: '320px' }}
            >
              <div className="kanban-column-header" style={{ backgroundColor: getColumnColor(col.stage.color), borderRadius: '24px', color: '#ffffff', border: 'none', padding: '0.75rem 1.25rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1rem', fontWeight: 600 }}>{col.stage.name}</h3>
                <span className="kanban-count" style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)', color: '#ffffff', border: 'none', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600 }}>{col.records.length}</span>
              </div>

              <div className="kanban-cards" style={{ backgroundColor: col.stage.color ? `${col.stage.color}15` : '#f8fafc', borderRadius: '16px', padding: '0.75rem', minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {col.records.map(record => {
                  const title = record.fullName || record.customData?.companyName || record.name || (record.firstName ? `${record.firstName} ${record.lastName || ''}`.trim() : 'Unknown Record');

                  const subtitle = record.customData?.industry || record.email || moduleName;
                  let recordTags = [];
                  try { recordTags = Array.isArray(record.tags) ? record.tags : JSON.parse(record.tags || "[]"); } catch (e) { }

                  const dateOptions = { day: 'numeric', month: 'short' };
                  const formattedDate = record.createdAt ? new Date(record.createdAt).toLocaleDateString('en-US', dateOptions) : 'No due date';
                  const callCount = Math.floor(Math.random() * 4) + 1;
                  const attachCount = Math.floor(Math.random() * 3) + 1;

                  return (
                    <div
                      key={record.id}
                      className={`kanban-card ${selectedRecordIds.includes(record.id) ? 'selected' : ''}`}
                      onClick={() => onRecordClick && onRecordClick(record)}
                      draggable="true"
                      onDragStart={(e) => e.dataTransfer.setData("recordId", record.id)}
                      style={{ border: selectedRecordIds.includes(record.id) ? '2px solid var(--primary)' : '1px solid transparent', backgroundColor: '#ffffff', borderRadius: '16px', padding: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                    >
                      <div className="card-header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                          <input type="checkbox" checked={selectedRecordIds.includes(record.id)} onChange={(e) => toggleRecordSelection(record.id, e)} onClick={(e) => e.stopPropagation()} style={{ marginTop: '6px' }} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#111827', fontWeight: 600 }}>{title}</h4>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>{subtitle}</span>
                          </div>
                        </div>

                        <div style={{ position: 'relative' }}>
                          <button className="card-menu-btn" onClick={(e) => { e.stopPropagation(); setActiveCardMenuId(activeCardMenuId === record.id ? null : record.id); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                          </button>
                          {activeCardMenuId === record.id && (
                            <div style={{ position: 'absolute', right: 0, top: '100%', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', zIndex: 50, padding: '0.25rem' }} onClick={(e) => e.stopPropagation()}>
                              <button onClick={(e) => { e.stopPropagation(); setActiveCardMenuId(null); onEditClick && onEditClick(record); }} style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>Edit</button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="card-footer-bottom" style={{ marginTop: '1rem', paddingTop: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="date-badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '0.25rem 0.6rem', borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 500 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                          {formattedDate}
                        </div>

                        {recordTags.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                            <Badge color={recordTags[0].color}>
                              {recordTags[0].name}
                            </Badge>
                            {recordTags.length > 1 && (
                              <Badge backgroundColor="#e2e8f0" textColor="#64748b">
                                +{recordTags.length - 1}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="card-icons" style={{ display: 'flex', gap: '0.75rem', color: '#94a3b8' }}>
                          <div className="card-icon-item" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            <span>{callCount}</span>
                          </div>
                          <div className="card-icon-item">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                            <span>{attachCount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => {
    const getInitials = (name) => (name || '').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '?';
    const renderCellContent = (record, colName) => {
      let cData = {};
      try { cData = typeof record.customData === 'string' ? JSON.parse(record.customData) : (record.customData || {}); } catch (e) { }

      let val = '';
      const standardFields = ['id', 'name', 'firstName', 'lastName', 'email', 'phone', 'owner', 'stage', 'createdAt', 'updatedAt'];

      if (colName === 'firstName' || colName === 'fullName') {
        val = record.fullName ? record.fullName : `${record.firstName || ''} ${record.lastName || ''}`.trim();
        if (!val) val = '-';
      }

      else if (colName === 'name') val = record.name;
      else if (colName === 'companyName') val = cData.companyName || '-';
      else if (colName === 'owner') return record.owner ? <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#818cf8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>{getInitials(record.owner)}</div> : <span>-</span>;
      else if (colName === 'stage') return <div style={{ padding: '4px 12px', borderRadius: '20px', backgroundColor: record.stage?.color || '#3b82f6', color: '#ffffff', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block' }}>{record.stage?.name || 'Unknown'}</div>;
      else if (colName === 'status') {
        const isActive = record.status === 'Active' || cData.status === 'Active';
        return (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              const newStatus = isActive ? 'In-Active' : 'Active';
              try {
                const res = await fetch('/api/products', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ productId: record.id, status: newStatus })
                });
                if (res.ok) {
                  window.location.reload(); // Update hone ke baad table refresh kar dega
                }
              } catch (err) {
                console.error("Status Update Error:", err);
              }
            }}

            style={{ padding: '4px 12px', borderRadius: '20px', backgroundColor: isActive ? '#a7f3d0' : '#fca5a5', color: isActive ? '#065f46' : '#991b1b', fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            {isActive ? 'Active' : 'In-Active'}
          </button>
        );
      }

      else if (colName === 'createdAt' || colName === 'updatedAt') val = new Date(record[colName]).toLocaleDateString('en-GB');
      else if (standardFields.includes(colName)) val = record[colName] || '-';
      else val = cData[colName] || '-';

      return <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={val}>{val}</div>;
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: 'transparent', padding: '1.5rem', overflow: 'hidden' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 10 }}>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: "0.75rem 1rem", width: "40px", textAlign: "center" }}>
                    <input type="checkbox" checked={filteredRecords.length > 0 && selectedRecordIds.length === filteredRecords.length} onChange={selectAllRecords} />
                  </th>
                  {visibleColumns.map((colName, idx) => (
                    <th key={colName + idx} draggable onDragStart={(e) => handleDragStartCol(e, idx)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropCol(e, idx)} style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", cursor: "grab" }}>
                      {getFieldInfo(colName)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: selectedRecordIds.includes(record.id) ? '#f8fafc' : 'transparent' }} onClick={() => onRecordClick && onRecordClick(record)}>
                    <td style={{ padding: '1rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedRecordIds.includes(record.id)} onChange={(e) => toggleRecordSelection(record.id, e)} />
                    </td>
                    {visibleColumns.map((colName, idx) => (
                      <td key={colName + idx} style={{ padding: "0.75rem 1rem", fontSize: "0.9rem" }}>{renderCellContent(record, colName)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Footer Pagination (Added here) */}
          <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff' }}>
            <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
              Showing 1-{filteredRecords.length} of {records.length}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', color: '#64748b' }}>
                {/* Left Arrow SVG */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', margin: '0 0.5rem' }}>1 / 1</span>
              <button style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', color: '#64748b' }}>
                {/* Right Arrow SVG */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
      {/* Mini Header Inside the Component for Filters and Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.5rem', backgroundColor: 'transparent', alignItems: 'center', gap: '1rem' }}>

        {/* 1. LEFT SIDE: Title */}
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', minWidth: '120px' }}>{moduleName}s</h1>

        {/* 2. CENTER: Unified Search & Filter (Leads Style) */}
        <div style={{ display: 'flex', flex: 1, justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', position: 'relative', width: '380px' }}>
            <svg style={{ marginLeft: '12px', color: '#94a3b8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>

            <input type="text" placeholder={`type 3 characters to search...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, padding: '8px 12px', border: 'none', outline: 'none', fontSize: '0.9rem', backgroundColor: 'transparent' }} />

            <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }}></div>

            <div style={{ position: 'relative' }} ref={filterBuilderRef}>
              <button onClick={() => setIsFilterBuilderOpen(!isFilterBuilderOpen)} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: isFilterBuilderOpen ? '#d9f99d' : 'transparent', border: 'none', borderRadius: '0 8px 8px 0', cursor: 'pointer', color: isFilterBuilderOpen ? '#0f172a' : '#64748b', fontWeight: 500, fontSize: '0.85rem', transition: 'all 0.15s' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                Filter
              </button>

              {isFilterBuilderOpen && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '320px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50, padding: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '12px' }}>Add Filter</div>
                  <CustomDropdown value={fbField} placeholder="Select Field..." onChange={(val) => { setFbField(val); setFbValue(''); setFbOperator('contains'); }} options={[{ value: 'stage', label: 'Stage' }, ...(blueprint?.fields || []).map(f => ({ value: f.name, label: f.label }))]} />
                  {fbField && <CustomDropdown value={fbOperator} placeholder="Select Operator..." onChange={(val) => setFbOperator(val)} options={[{ value: 'contains', label: 'Contains' }, { value: 'is', label: 'Is' }]} />}
                  {fbField && <input type="text" placeholder="Value..." value={fbValue} onChange={(e) => setFbValue(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', outline: 'none' }} />}
                  <button onClick={addFilter} style={{ marginTop: '8px', padding: '8px', width: '100%', backgroundColor: '#d9f99d', borderRadius: '6px', cursor: 'pointer', border: 'none', fontWeight: 600 }}>Apply Filter</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. RIGHT SIDE: Action Buttons & Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-end' }}>

          {/* Ye Add Deal button wapas laayega */}
          {renderHeaderActions && renderHeaderActions()}

          {/* 3-Dot Menu Dropdown (Exact Leads Style) */}
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{ padding: '0.5rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>

            {isMenuOpen && (
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', minWidth: '180px', zIndex: 50, padding: '0.5rem' }}>

                {/* Section 1: View Mode */}
                {supportKanban && (
                  <div style={{ marginBottom: '4px' }}>
                    <div
                      onClick={(e) => { e.stopPropagation(); setOpenAccordion(openAccordion === 'view' ? null : 'view'); setIsManageColsMenuOpen(false); setIsSortMenuOpen(false); }}
                      style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: openAccordion === 'view' ? '#d9f99d' : 'transparent', borderRadius: '4px' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d9f99d'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = openAccordion === 'view' ? '#d9f99d' : 'transparent'}
                    >
                      <span>View Mode</span>
                    </div>

                    {openAccordion === 'view' && (
                      <div style={{ paddingLeft: '0.5rem', marginTop: '4px', borderLeft: '2px solid #e2e8f0', marginLeft: '6px' }}>
                        <button
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem', borderRadius: '4px', backgroundColor: viewMode === 'kanban' ? '#d9f99d' : 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                          onClick={() => { setViewMode('kanban'); setIsMenuOpen(false); }}
                        >
                          Kanban Board
                        </button>
                        <button
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem', borderRadius: '4px', backgroundColor: viewMode === 'list' ? '#d9f99d' : 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                          onClick={() => { setViewMode('list'); setIsMenuOpen(false); }}
                        >
                          List View
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {supportKanban && <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '0.5rem 0' }}></div>}

                {/* Section 2: Manage Data */}
                <div style={{ marginBottom: '4px' }}>
                  <div
                    onClick={(e) => { e.stopPropagation(); setOpenAccordion(openAccordion === 'data' ? null : 'data'); setIsManageColsMenuOpen(false); setIsSortMenuOpen(false); }}
                    style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: openAccordion === 'data' ? '#d9f99d' : 'transparent', borderRadius: '4px' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d9f99d'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = openAccordion === 'data' ? '#d9f99d' : 'transparent'}
                  >
                    <span>Manage Data</span>
                  </div>

                  {openAccordion === 'data' && (
                    <div style={{ paddingLeft: '0.5rem', marginTop: '4px', borderLeft: '2px solid #e2e8f0', marginLeft: '6px', position: 'relative' }}>
                      {viewMode === 'list' && (
                        <>
                          <button
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left', padding: '0.5rem', borderRadius: '4px', backgroundColor: isManageColsMenuOpen ? '#f1f5f9' : 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                            onClick={(e) => { e.stopPropagation(); setIsManageColsMenuOpen(!isManageColsMenuOpen); setIsSortMenuOpen(false); }}
                          >
                            Columns
                          </button>

                          {/* Manage Columns Popup */}
                          {isManageColsMenuOpen && (
                            <div style={{ position: 'absolute', right: '100%', top: '0', marginRight: '8px', padding: '0.5rem', maxHeight: '350px', width: '280px', overflowY: 'auto', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', zIndex: 60 }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>VISIBLE COLUMNS ({visibleColumns.length}/7)</div>
                              {[{ name: 'createdAt', label: 'Created Date' }, { name: 'firstName', label: 'First Name' }, { name: 'companyName', label: 'Company' }, ...(blueprint?.fields || [])].reduce((acc, curr) => { if (!acc.find(i => i.name === curr.name)) acc.push(curr); return acc; }, []).map((field, idx) => {
                                const isSelected = visibleColumns.includes(field.name);
                                return (
                                  <div key={field.name + idx} onClick={(e) => { e.stopPropagation(); handleColToggle(field.name); }} style={{ display: 'flex', alignItems: 'center', padding: '8px', fontSize: '0.85rem', cursor: 'pointer', backgroundColor: isSelected ? '#d9f99d' : 'transparent', borderRadius: '6px', marginBottom: '2px' }}>
                                    {field.label}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}

                      <button
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left', padding: '0.5rem', borderRadius: '4px', backgroundColor: isSortMenuOpen ? '#f1f5f9' : 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                        onClick={(e) => { e.stopPropagation(); setIsSortMenuOpen(!isSortMenuOpen); setIsManageColsMenuOpen(false); }}
                      >
                        Sort Data
                      </button>

                      {/* Sort Data Popup */}
                      {isSortMenuOpen && (
                        <div style={{ position: 'absolute', right: '100%', top: '32px', marginRight: '8px', padding: '0.5rem', maxHeight: '350px', width: '280px', overflowY: 'auto', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', zIndex: 60 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>SORT FIELDS</div>
                          {[{ name: 'createdAt', label: 'Created Date' }, { name: 'firstName', label: 'First Name' }, { name: 'companyName', label: 'Company' }, ...(blueprint?.fields || [])].reduce((acc, curr) => { if (!acc.find(i => i.name === curr.name)) acc.push(curr); return acc; }, []).map((field, idx) => {
                            const isSelected = sortConfig.key === field.name;
                            return (
                              <div key={field.name + idx} onClick={(e) => { e.stopPropagation(); setSortConfig({ key: field.name, direction: isSelected && sortConfig.direction === 'asc' ? 'desc' : 'asc' }); }} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', fontSize: '0.85rem', cursor: 'pointer', backgroundColor: isSelected ? '#d9f99d' : 'transparent', borderRadius: '6px' }}>
                                {field.label} {isSelected ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>

      </div>

      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', padding: '0.5rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          {activeFilters.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#d9f99d', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 500 }}>
              {f.field} {f.operator} "{f.value}"
              <span onClick={() => removeFilter(f.id)} style={{ cursor: 'pointer', opacity: 0.6, marginLeft: '4px' }}>✕</span>
            </div>
          ))}
          <span onClick={() => setActiveFilters([])} style={{ fontSize: '0.8rem', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '4px', fontWeight: 500 }}>Clear All</span>
        </div>
      )}

      {/* Content Rendering */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {(records.length === 0 && searchQuery === "") ? renderEmptyState() : (viewMode === 'kanban' ? renderKanbanView() : renderListView())}
      </div>

    </div>
  );
}
