"use client";

import React, { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import Sidebar from "../../components/Sidebar";
import LeadIntakeForm from "../../components/LeadIntakeForm";
import SlideOverPanel from "../../components/SlideOverPanel";
import EditLeadModal from "../../components/EditLeadModal";
import { useRouter } from "next/navigation";
import TableSkeleton from "../../components/skeletons/TableSkeleton";

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

export default function LeadModule() {
  const [leads, setLeads] = useState([]);
  const [blueprint, setBlueprint] = useState(null);
  const [tags, setTags] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState("kanban"); // "kanban" or "list"
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState(null);
  const [pendingTransition, setPendingTransition] = useState(null);

  // Bulk Actions State
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [isBulkTagPickerOpen, setIsBulkTagPickerOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState(null);
  // ListView Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState([]);
  const [filterLogic, setFilterLogic] = useState('AND');
  const [isFilterBuilderOpen, setIsFilterBuilderOpen] = useState(false);
  const [fbField, setFbField] = useState('');
  const [fbOperator, setFbOperator] = useState('contains');
  const [fbValue, setFbValue] = useState('');
  const filterBuilderRef = useRef(null);

  useEffect(() => {
    function handleClickOutsideFB(event) {
      if (filterBuilderRef.current && !filterBuilderRef.current.contains(event.target)) {
        setIsFilterBuilderOpen(false);
      }
    }
    if (isFilterBuilderOpen) {
      document.addEventListener("mousedown", handleClickOutsideFB);
    } else {
      document.removeEventListener("mousedown", handleClickOutsideFB);
    }
    return () => document.removeEventListener("mousedown", handleClickOutsideFB);
  }, [isFilterBuilderOpen]);

  const addFilter = () => {
    if (!fbField || !fbOperator) return;
    if (!['isEmpty', 'isNotEmpty'].includes(fbOperator) && !fbValue) return;
    setActiveFilters([...activeFilters, { id: Date.now(), field: fbField, operator: fbOperator, value: fbValue }]);
    setFbField(''); setFbOperator('contains'); setFbValue('');
    setIsFilterBuilderOpen(false);
  };
  const removeFilter = (id) => setActiveFilters(activeFilters.filter(f => f.id !== id));
  const defaultCols = ['firstName', 'companyName', 'email', 'owner', 'stage', 'createdAt'];
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [isManageColsMenuOpen, setIsManageColsMenuOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('mooncliq_lead_cols');
    if (saved) {
      try { setVisibleColumns(JSON.parse(saved)); } catch (e) { setVisibleColumns(defaultCols); }
    } else {
      setVisibleColumns(defaultCols);
    }
  }, []);

  const handleColToggle = (colName) => {
    let newCols = [...visibleColumns];
    if (newCols.includes(colName)) {
      newCols = newCols.filter(c => c !== colName);
    } else {
      if (newCols.length >= 7) {
        alert("Maximum 7 columns allowed");
        return;
      }
      newCols.push(colName);
    }
    setVisibleColumns(newCols);
    localStorage.setItem('mooncliq_lead_cols', JSON.stringify(newCols));
  };

  const handleDragStartCol = (e, idx) => {
    e.dataTransfer.setData('colIdx', idx);
  };
  const handleDropCol = (e, dropIdx) => {
    const dragIdx = parseInt(e.dataTransfer.getData('colIdx'));
    if (isNaN(dragIdx) || dragIdx === dropIdx) return;
    const newCols = [...visibleColumns];
    const [dragged] = newCols.splice(dragIdx, 1);
    newCols.splice(dropIdx, 0, dragged);
    setVisibleColumns(newCols);
    localStorage.setItem('mooncliq_lead_cols', JSON.stringify(newCols));
  };

  const getFieldInfo = (fieldName) => {
    const defaultLabels = {
      firstName: 'NAME', companyName: 'COMPANY', email: 'EMAIL', owner: 'OWNER', stage: 'STAGE', createdAt: 'CREATED'
    };
    if (defaultLabels[fieldName]) return defaultLabels[fieldName];
    const blueprintField = (blueprint?.fields || []).find(f => f.name === fieldName);
    return blueprintField ? blueprintField.label.toUpperCase() : fieldName.toUpperCase();
  };

  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [filterStageId, setFilterStageId] = useState("");

  const fileInputRef = useRef(null);
  const menuRef = useRef(null);

  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { getCurrentUser } = await import('aws-amplify/auth');
      await getCurrentUser();
      fetchData();
    } catch (err) {
      router.push('/sign-in');
    }
  };

  const getAuthToken = async () => {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const { tokens } = await fetchAuthSession();
    return tokens.idToken.toString();
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch User Profile
      const meRes = await fetch('/api/me', { headers });
      const meData = await meRes.json();
      setCurrentUser(meData);

      // Fetch Blueprint to get the dynamic stages
      const bpRes = await fetch('/api/blueprint?moduleType=Lead', { headers });
      const bpData = await bpRes.json();
      setBlueprint(bpData);

      // Fetch actual leads
      const leadsRes = await fetch('/api/leads', { headers });
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setLeads(leadsData);
      } else {
        setLeads([]);
      }

      // Fetch organization tags
      const tagsRes = await fetch('/api/tags?moduleType=Lead', { headers });
      if (tagsRes.ok) {
        setTags(await tagsRes.json());
      }
    } catch (err) {
      console.error("Failed to load CRM data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLead = async (newLeadPayload) => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newLeadPayload)
      });
      const savedLead = await res.json();
      setLeads((prev) => [savedLead, ...prev]);
    } catch (err) {
      console.error("Failed to save lead", err);
    }
  };

  const handleExport = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/leads/export', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'leads_export.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert("Failed to export leads.");
      }
    } catch (err) {
      console.error("Export error:", err);
    }
  };


  const fetchOnlyLeads = async (q = '') => {
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const { tokens } = await fetchAuthSession();
      const token = tokens.idToken.toString();
      const headers = { Authorization: `Bearer ${token}` };

      const url = q ? `/api/leads?q=${encodeURIComponent(q)}` : '/api/leads';
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (e) { console.error('Search fetch error:', e); }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchOnlyLeads(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const token = await getAuthToken();
          const res = await fetch('/api/leads/import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ rows: results.data })
          });
          const data = await res.json();
          if (data.success) {
            alert(`Successfully imported ${data.importedCount} leads!`);
            fetchData(); // Reload table
          } else {
            alert(data.error || "Failed to import leads.");
          }
        } catch (err) {
          console.error("Import error:", err);
          alert("An error occurred during import.");
        } finally {
          setIsImporting(false);
          // reset the input
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      },
      error: (error) => {
        console.error("CSV Parse Error:", error);
        alert("Failed to parse the CSV file.");
        setIsImporting(false);
      }
    });
  };

  const handleDragStart = (e, leadId) => {
    e.dataTransfer.setData("leadId", leadId);
  };

  const handleDrop = async (e, targetStageId) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");

    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stageId === targetStageId) return;

    // 1. Find valid transition
    const validTransition = blueprint.transitions.find(t =>
      (t.isGlobal || (t.fromStages && t.fromStages.some(s => s.id === lead.stageId))) && t.toStageId === targetStageId
    );

    if (!validTransition) {
      alert("Invalid transition! The Blueprint engine prevents moving to this stage directly.");
      return;
    }

    // 2. Open panel to enforce confirmation for all transitions
    setPendingTransition(validTransition);
    setSelectedLead(lead);
  };

  const handleTransition = async (leadId, toStageId, updatedCustomData, transitionId) => {
    const targetStage = blueprint?.stages?.find(s => s.id === toStageId);

    // Optimistic UI update
    setLeads(prevLeads => prevLeads.map(lead => {
      if (lead.id === leadId) {
        return { ...lead, stageId: toStageId, stage: targetStage || lead.stage, customData: updatedCustomData };
      }
      return lead;
    }));

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ leadId, stageId: toStageId, customData: updatedCustomData, transitionId })
      });

      if (res.ok) {
        const updatedLeadFromServer = await res.json();
        setLeads(prevLeads => prevLeads.map(lead =>
          lead.id === leadId ? updatedLeadFromServer : lead
        ));

        // Also update the selectedLead if it's currently open in the SlideOverPanel
        if (selectedLead && selectedLead.id === leadId) {
          setSelectedLead(updatedLeadFromServer);
        }
      }
    } catch (err) {
      console.error("Failed to transition lead", err);
    }
  };

  const handleLeadUpdate = (updatedLeadFromServer) => {
    setLeads(prevLeads => prevLeads.map(lead =>
      lead.id === updatedLeadFromServer.id ? updatedLeadFromServer : lead
    ));
    if (selectedLead && selectedLead.id === updatedLeadFromServer.id) {
      setSelectedLead(updatedLeadFromServer);
    }
  };

  const toggleLeadSelection = (leadId, e) => {
    e.stopPropagation();
    setSelectedLeadIds(prev => {
      if (prev.includes(leadId)) return prev.filter(id => id !== leadId);
      return [...prev, leadId];
    });
  };

  const selectAllLeads = (e) => {
    if (e.target.checked) {
      setSelectedLeadIds(leads.map(l => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleBulkTagApply = async (tag) => {
    if (selectedLeadIds.length === 0) return;
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/leads/bulk-tag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          leadIds: selectedLeadIds,
          tagId: tag.id
        })
      });
      if (res.ok) {
        // Refresh leads
        fetchData();
        setSelectedLeadIds([]);
        setIsBulkTagPickerOpen(false);
      }
    } catch (err) {
      console.error("Failed to apply bulk tag", err);
    }
  };

  const renderEmptyState = () => (
    <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center', height: '100%' }}>
      <div className="empty-state-content" style={{ maxWidth: '400px' }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Background decorative dots */}
            <circle cx="20" cy="30" r="4" fill="#f1f5f9" />
            <circle cx="100" cy="20" r="2" fill="#f1f5f9" />
            <circle cx="90" cy="100" r="6" fill="#f1f5f9" />
            <circle cx="10" cy="90" r="3" fill="#f1f5f9" />

            {/* Document shape */}
            <path d="M40 20H70C75.5228 20 80 24.4772 80 30V80C80 85.5228 75.5228 90 70 90H40C34.4772 90 30 85.5228 30 80V30C30 24.4772 34.4772 20 40 20Z" fill="white" stroke="#cbd5e1" strokeWidth="3" strokeLinejoin="round" />
            <path d="M35 25H65C70.5228 25 75 29.4772 75 35V85C75 90.5228 70.5228 95 65 95H35C29.4772 95 25 90.5228 25 85V35C25 29.4772 29.4772 25 35 25Z" fill="white" stroke="#cbd5e1" strokeWidth="3" strokeLinejoin="round" />

            {/* Document lines */}
            <rect x="40" y="40" width="25" height="4" rx="2" fill="#e2e8f0" />
            <rect x="40" y="55" width="15" height="4" rx="2" fill="#e2e8f0" />
            <rect x="40" y="70" width="20" height="4" rx="2" fill="#e2e8f0" />

            {/* Magnifying Glass */}
            <circle cx="75" cy="70" r="15" fill="white" stroke="#cbd5e1" strokeWidth="3" />
            <path d="M85 80L95 90" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />

            {/* X inside magnifying glass */}
            <path d="M70 65L80 75" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            <path d="M80 65L70 75" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>There are no records in this view.</h3>
        <p className="text-muted" style={{ marginBottom: '1.5rem', color: '#64748b' }}>Get started by creating your first lead in the pipeline.</p>
        {(currentUser?.profile?.canAccessSettings || currentUser?.profile?.permissions?.Lead?.create) && (
          <button className="btn-primary" onClick={() => setIsFormOpen(true)}>
            + Add First Lead
          </button>
        )}
      </div>
    </div>
  );




  // Apply Filters
  const filteredLeads = leads.filter(lead => {
    let cData = {};
    try { cData = typeof lead.customData === 'string' ? JSON.parse(lead.customData) : (lead.customData || {}); } catch (e) { }

    let passesSearch = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      passesSearch =
        (lead.firstName || '').toLowerCase().includes(q) ||
        (lead.lastName || '').toLowerCase().includes(q) ||
        (lead.email || '').toLowerCase().includes(q);
    }
    if (!passesSearch) return false;

    let passesOldStage = filterStageId === "" || lead.stageId === filterStageId;
    if (!passesOldStage) return false;

    if (activeFilters.length === 0) return true;

    const evaluateFilter = (filter) => {
      const isCustom = !(blueprint?.fields?.find(f => f.name === filter.field) === undefined) && !['firstName', 'lastName', 'email', 'phone', 'owner', 'stage'].includes(filter.field);
      let leadValue = isCustom ? (cData[filter.field] || '') : (lead[filter.field] || '');
      if (filter.field === 'stage') leadValue = lead.stage?.name || '';

      let lVal = String(leadValue).toLowerCase();
      let fVal = String(filter.value).toLowerCase();

      switch (filter.operator) {
        case 'is': return lVal === fVal;
        case 'isNot': return lVal !== fVal;
        case 'contains': return lVal.includes(fVal);
        case 'notContains': return !lVal.includes(fVal);
        case 'startsWith': return lVal.startsWith(fVal);
        case 'endsWith': return lVal.endsWith(fVal);
        case 'like': return lVal.includes(fVal);
        case 'isEmpty': return lVal === '' || lVal === 'undefined' || lVal === 'null';
        case 'isNotEmpty': return lVal !== '' && lVal !== 'undefined' && lVal !== 'null';
        default: return true;
      }
    };

    if (filterLogic === 'AND') {
      return activeFilters.every(evaluateFilter);
    } else {
      return activeFilters.some(evaluateFilter);
    }
  }).sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];

    const standardFields = ['firstName', 'lastName', 'email', 'phone', 'owner', 'createdAt'];
    if (!standardFields.includes(sortConfig.key)) {
      try { aVal = (typeof a.customData === 'string' ? JSON.parse(a.customData) : (a.customData || {}))[sortConfig.key]; } catch (e) { }
      try { bVal = (typeof b.customData === 'string' ? JSON.parse(b.customData) : (b.customData || {}))[sortConfig.key]; } catch (e) { }
    }

    if (aVal === bVal) return 0;
    if (!aVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (!bVal) return sortConfig.direction === 'asc' ? 1 : -1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const dateA = new Date(aVal);
      const dateB = new Date(bVal);
      if (!isNaN(dateA) && !isNaN(dateB)) {
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return sortConfig.direction === 'asc' ? aVal.toLowerCase().localeCompare(bVal.toLowerCase()) : bVal.toLowerCase().localeCompare(aVal.toLowerCase());
    }
    return sortConfig.direction === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });



  const renderKanbanView = () => {
    if (!blueprint?.stages) return null;

    // Pata lagao ki kya user ne koi bhi filter lagaya hai?
    const isFilterActive = searchQuery !== "" || filterStageId !== "" || activeFilters.length > 0;

    const columns = blueprint.stages.map(stage => {
      // Yahan humne `leads` ki jagah `filteredLeads` kar diya (Filter Fix)
      const columnLeads = filteredLeads.filter(lead => lead.stageId === stage.id);

      return {
        stage,
        leads: columnLeads,
        // Agar filter active hai aur column me 0 leads hain, toh ise collapse kar do!
        isCollapsed: isFilterActive && columnLeads.length === 0
      };
    });

    return (
      <div className="kanban-board">
        {columns.map(col => {

          // Agar column collapsed hai, toh patli vertical line dikhao
          if (col.isCollapsed) {
            return (
              <div
                key={col.stage.id}
                onDrop={(e) => handleDrop(e, col.stage.id)}
                onDragOver={(e) => e.preventDefault()}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  minWidth: '60px', maxWidth: '60px',
                  backgroundColor: '#f8fafc', border: '2px dashed #e2e8f0', borderRadius: '16px',
                  padding: '1rem 0', margin: '0 0.5rem', opacity: 0.6, cursor: 'not-allowed'
                }}
              >
                <div style={{
                  writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)',
                  color: getColumnColor(col.stage.color), fontWeight: 700, fontSize: '0.9rem',
                  letterSpacing: '1.5px', whiteSpace: 'nowrap', marginTop: '10px'
                }}>
                  {col.stage.name} (0)
                </div>
              </div>
            );
          }

          // Agar collapsed nahi hai, toh normal bada column dikhao
          return (
            <div

              key={col.stage.id}
              className="kanban-column"
              onDrop={(e) => handleDrop(e, col.stage.id)}
              onDragOver={(e) => e.preventDefault()}
              style={{ padding: '0 0.5rem', border: 'none', display: 'flex', flexDirection: 'column', minWidth: '320px' }}
            >
              <div className="kanban-column-header" style={{ backgroundColor: getColumnColor(col.stage.color), borderRadius: '24px', color: '#ffffff', border: 'none', padding: '0.75rem 1.25rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1rem', fontWeight: 600 }}>{col.stage.name}</h3>
                <span className="kanban-count" style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)', color: '#ffffff', border: 'none', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600 }}>{col.leads.length}</span>
              </div>
              <div className="kanban-cards" style={{ backgroundColor: col.stage.color ? `${col.stage.color}15` : '#f8fafc', borderRadius: '16px', padding: '0.75rem', minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {col.leads.map(lead => {
                  const dateOptions = { day: 'numeric', month: 'short' };
                  const formattedDate = lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-US', dateOptions) : 'No due date';
                  const title = lead.customData?.companyName || `${lead.firstName} ${lead.lastName}`;
                  const subtitle = lead.customData?.industry || lead.email || 'Lead';
                  // Mock notification numbers for visual demonstration
                  const callCount = Math.floor(Math.random() * 4) + 1;
                  const attachCount = Math.floor(Math.random() * 3) + 1;

                  let leadTags = [];
                  try {
                    leadTags = Array.isArray(lead.tags) ? lead.tags : JSON.parse(lead.tags || "[]");
                  } catch (e) { }

                  return (
                    <div
                      key={lead.id}
                      className={`kanban-card ${selectedLeadIds.includes(lead.id) ? 'selected' : ''}`}
                      onClick={() => setSelectedLead(lead)}
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      style={{
                        border: selectedLeadIds.includes(lead.id) ? '2px solid var(--primary)' : '1px solid transparent',
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        padding: '1rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
                      }}
                    >
                      <div className="card-header-top" style={{ marginBottom: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.includes(lead.id)}
                            onChange={(e) => toggleLeadSelection(lead.id, e)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ cursor: 'pointer', marginTop: '6px' }}
                          />
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: col.stage.color ? `${col.stage.color}25` : '#e2e8f0', color: col.stage.color || '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 600, flexShrink: 0 }}>
                            {lead.firstName?.charAt(0)}{lead.lastName?.charAt(0)}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <h4 className="card-title" style={{ margin: 0, fontSize: '0.95rem', color: '#111827', fontWeight: 600 }}>{title}</h4>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>{subtitle}</span>
                          </div>
                        </div>
                        <button className="card-menu-btn" onClick={(e) => { e.stopPropagation(); }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                        </button>
                      </div>

                      {leadTags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                          {leadTags.map((t, i) => (
                            <span key={i} style={{ fontSize: '0.65rem', fontWeight: 600, color: 'white', background: t.color, padding: '0.15rem 0.4rem', borderRadius: '8px' }}>
                              {t.name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="card-footer-bottom" style={{ marginTop: '1rem', paddingTop: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="date-badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '0.25rem 0.6rem', borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 500 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                          {formattedDate}
                        </div>

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
                {col.leads.length === 0 && (
                  <div style={{ border: `2px dashed ${col.stage.color || '#cbd5e1'}`, borderRadius: '12px', padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: col.stage.color || '#64748b' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', opacity: 0.8 }}>
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span style={{ fontWeight: 600 }}>No leads here yet</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => {
    const getInitials = (name) => (name || '').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '?';

    const renderCellContent = (lead, colName) => {
      let cData = {};
      try { cData = typeof lead.customData === 'string' ? JSON.parse(lead.customData) : (lead.customData || {}); } catch (e) { }

      let val = '';
      const standardFields = ['id', 'firstName', 'lastName', 'email', 'phone', 'owner', 'stage', 'createdAt', 'updatedAt', 'organizationId'];

      if (colName === 'firstName') val = `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
      else if (colName === 'companyName') val = cData.companyName || '-';
      else if (colName === 'owner') return lead.owner ? (
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: getAvatarColor(lead.owner), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }} title={lead.owner}>
          {getInitials(lead.owner)}
        </div>
      ) : <span style={{ color: '#94a3b8' }}>-</span>;
      else if (colName === 'stage') return (
        <div style={{ display: 'inline-flex', padding: '4px 12px', borderRadius: '20px', backgroundColor: lead.stage?.color || '#3b82f6', color: '#ffffff', fontSize: '0.75rem', fontWeight: 600 }}>
          {lead.stage?.name || 'Unknown'}
        </div>
      );
      else if (colName === 'createdAt' || colName === 'updatedAt') val = new Date(lead[colName]).toLocaleDateString('en-GB');
      else if (standardFields.includes(colName)) val = lead[colName] || '-';
      else val = cData[colName] || '-';

      return (
        <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={val}>
          {val}
        </div>
      );
    };

    // Generate a consistent pastel color based on name
    const getAvatarColor = (name) => {
      const colors = ['#818cf8', '#38bdf8', '#fbbf24', '#f87171', '#34d399', '#a78bfa'];
      if (!name) return colors[0];
      let hash = 0;
      for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
      return colors[Math.abs(hash) % colors.length];
    };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#f8fafc', padding: '1.5rem', overflow: 'hidden' }}>

        {/* Table Container */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 10 }}>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: "0.75rem 1rem", width: "40px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length}
                      onChange={selectAllLeads}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                  </th>
                  {visibleColumns.map((colName, idx) => (
                    <th key={colName + idx} style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", letterSpacing: "0.05em", cursor: "pointer" }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {getFieldInfo(colName)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: selectedLeadIds.includes(lead.id) ? '#f8fafc' : 'transparent',
                      transition: 'background-color 0.15s',
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedLead(lead)}
                    onMouseEnter={(e) => { if (!selectedLeadIds.includes(lead.id)) e.currentTarget.style.background = '#f8fafc' }}
                    onMouseLeave={(e) => { if (!selectedLeadIds.includes(lead.id)) e.currentTarget.style.background = 'transparent' }}
                  >
                    <td
                      style={{ padding: '1rem', textAlign: 'center' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.includes(lead.id)}
                        onChange={(e) => toggleLeadSelection(lead.id, e)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </td>
                    {visibleColumns.map((colName, idx) => (
                      <td key={colName + idx} style={{ padding: "0.75rem 1rem", color: colName === 'firstName' ? '#0f172a' : '#64748b', fontWeight: colName === 'firstName' ? 600 : 400, fontSize: "0.9rem" }}>
                        {renderCellContent(lead, colName)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Pagination */}
          <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff' }}>
            <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
              Showing 1-{filteredLeads.length} of {leads.length}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', color: '#64748b' }}>{'<'}</button>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', margin: '0 0.5rem' }}>1 / 1</span>
              <button style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', color: '#64748b' }}>{'>'}</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const activeStage = blueprint?.stages?.find(s => s.id === filterStageId);

  return (
    <>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>Leads</h1>
          {/* Top Filter Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '0', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', position: 'relative', width: '380px' }}>
              <svg style={{ marginLeft: '12px', color: '#94a3b8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', border: 'none', outline: 'none', fontSize: '0.9rem', backgroundColor: 'transparent' }}
              />
              <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }}></div>

              <div style={{ position: 'relative' }} ref={filterBuilderRef}>
                <button
                  onClick={() => setIsFilterBuilderOpen(!isFilterBuilderOpen)}
                  style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: isFilterBuilderOpen ? '#d9f99d' : 'transparent', border: 'none', borderRadius: '0 8px 8px 0', cursor: 'pointer', color: isFilterBuilderOpen ? '#0f172a' : '#64748b', fontWeight: 500, fontSize: '0.85rem', transition: 'all 0.15s' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                  Filter
                </button>

                {isFilterBuilderOpen && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '320px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50, padding: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>Add Filter</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <CustomDropdown
                        value={fbField}
                        placeholder="Select Field..."
                        onChange={(val) => {
                          setFbField(val);
                          setFbValue('');
                          if (val === 'stage' || (blueprint?.fields || []).find(f => f.name === val)?.type === 'Select') {
                            setFbOperator('is');
                          } else {
                            setFbOperator('contains');
                          }
                        }}
                        options={[
                          { value: 'stage', label: 'Stage' },
                          ...(blueprint?.fields || []).map(f => ({ value: f.name, label: f.label }))
                        ]}

                      />

                      {fbField && (
                        <CustomDropdown
                          value={fbOperator}
                          placeholder="Select Operator..."
                          onChange={(val) => setFbOperator(val)}
                          options={
                            (fbField === 'stage' || (blueprint?.fields || []).find(f => f.name === fbField)?.type === 'Select') ? [
                              { value: 'is', label: 'Is' },
                              { value: 'isNot', label: 'Is Not' }
                            ] : [
                              { value: 'contains', label: 'Contains' },
                              { value: 'is', label: 'Is' },
                              { value: 'isNot', label: 'Is Not' },
                              { value: 'startsWith', label: 'Starts With' },
                              { value: 'endsWith', label: 'Ends With' },
                              { value: 'like', label: 'Like' },
                              { value: 'isEmpty', label: 'Is Empty' },
                              { value: 'isNotEmpty', label: 'Is Not Empty' },
                              { value: 'notContains', label: 'Not Contains' }
                            ]
                          }
                        />
                      )}

                      {fbField && !['isEmpty', 'isNotEmpty'].includes(fbOperator) && (
                        fbField === 'stage' ? (
                          <CustomDropdown
                            value={fbValue}
                            placeholder="Select Stage..."
                            onChange={(val) => setFbValue(val)}
                            options={(blueprint?.stages || []).map(s => ({ value: s.name, label: s.name }))}
                          />
                        ) : (blueprint?.fields || []).find(f => f.name === fbField)?.type === 'Select' ? (
                          <CustomDropdown
                            value={fbValue}
                            placeholder="Select Value..."
                            onChange={(val) => setFbValue(val)}
                            options={((blueprint?.fields || []).find(f => f.name === fbField)?.options || []).map(opt => ({ value: opt, label: opt }))}
                          />
                        ) : (
                          <input
                            type="text"
                            placeholder="Value..."
                            value={fbValue}
                            onChange={(e) => setFbValue(e.target.value)}
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#0f172a', outline: 'none', fontSize: '0.85rem', fontWeight: 500 }}
                          />
                        )
                      )}

                      <button
                        onClick={addFilter}
                        disabled={!fbField || !fbOperator || (!['isEmpty', 'isNotEmpty'].includes(fbOperator) && !fbValue)}
                        style={{ marginTop: '8px', padding: '8px', backgroundColor: (!fbField || !fbOperator || (!['isEmpty', 'isNotEmpty'].includes(fbOperator) && !fbValue)) ? '#f1f5f9' : '#d9f99d', color: '#0f172a', fontWeight: 600, border: 'none', borderRadius: '6px', cursor: (!fbField || !fbOperator || (!['isEmpty', 'isNotEmpty'].includes(fbOperator) && !fbValue)) ? 'not-allowed' : 'pointer', fontSize: '0.85rem', transition: 'background-color 0.15s' }}
                      >
                        Apply Filter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Active Filters Pills */}
            {activeFilters.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                {activeFilters.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input type="radio" checked={filterLogic === 'AND'} onChange={() => setFilterLogic('AND')} style={{ accentColor: '#84cc16' }} /> Match ALL (AND)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input type="radio" checked={filterLogic === 'OR'} onChange={() => setFilterLogic('OR')} style={{ accentColor: '#84cc16' }} /> Match ANY (OR)
                    </label>
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {activeFilters.map(f => {
                    const fieldLabel = f.field; // Can be enhanced with getFieldInfo if needed in scope
                    return (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#d9f99d', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 500, color: '#0f172a', border: '1px solid #bef264' }}>
                        <span>{fieldLabel} {f.operator} {['isEmpty', 'isNotEmpty'].includes(f.operator) ? '' : `"${f.value}"`}</span>
                        <span onClick={() => removeFilter(f.id)} style={{ cursor: 'pointer', opacity: 0.6, fontSize: '0.9rem', marginLeft: '2px', display: 'flex', alignItems: 'center' }}>✕</span>
                      </div>
                    );
                  })}
                  <span onClick={() => setActiveFilters([])} style={{ fontSize: '0.8rem', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '4px', fontWeight: 500 }}>Clear All</span>
                </div>
              </div>
            )}
          </div>
          <div className="header-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {(currentUser?.profile?.canAccessSettings || currentUser?.profile?.permissions?.Lead?.create) && (
              <>
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleImportFile}
                />
                <button className="btn-primary" onClick={() => setIsFormOpen(true)}>
                  + Add Lead
                </button>
              </>
            )}

            <div style={{ position: 'relative' }} ref={menuRef}>
              <button
                className="btn-outline"
                style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="12" cy="5" r="1"></circle>
                  <circle cx="12" cy="19" r="1"></circle>
                </svg>
              </button>

              {isMenuOpen && (
                <div
                  style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem',
                    backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', minWidth: '180px',
                    zIndex: 50, padding: '0.5rem'
                  }}
                >
                  {/* Section 1: View Mode */}
                  {leads.length > 0 && (
                    <div style={{ marginBottom: '4px' }}>
                      <div
                        onClick={(e) => { e.stopPropagation(); setOpenAccordion(openAccordion === 'view' ? null : 'view'); }}
                        style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: openAccordion === 'view' ? '#f1f5f9' : 'transparent', borderRadius: '4px' }}
                      >
                        <span>👁️ View Mode</span>
                        <span style={{ transform: openAccordion === 'view' ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.2s' }}>▶</span>
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

                  <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '0.5rem 0' }}></div>

                  {/* Section 2: Manage Data */}
                  <div style={{ marginBottom: '4px' }}>
                    <div
                      onClick={(e) => { e.stopPropagation(); setOpenAccordion(openAccordion === 'data' ? null : 'data'); setIsManageColsMenuOpen(false); setIsSortMenuOpen(false); }}
                      style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: openAccordion === 'data' ? '#f1f5f9' : 'transparent', borderRadius: '4px' }}
                    >
                      <span>⚙️ Manage Data</span>
                      <span style={{ transform: openAccordion === 'data' ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.2s' }}>▶</span>
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
                              <span>{isManageColsMenuOpen ? '▼' : '◀'}</span>
                            </button>

                            {/* Manage Columns Popup Logic Remains Same */}
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
                      Sort Leads
                      <span>{isSortMenuOpen ? '▼' : '◀'}</span>
                    </button>

                    {/* Sort Leads Popup Logic Remains Same */}
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

                  {/* Section 3: Imports/Exports */}
              {(currentUser?.profile?.canAccessSettings || currentUser?.profile?.permissions?.Lead?.create || currentUser?.profile?.permissions?.Lead?.view) && (
                <>
                  <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '0.5rem 0' }}></div>
                  <div style={{ marginBottom: '4px' }}>
                    <div
                      onClick={(e) => { e.stopPropagation(); setOpenAccordion(openAccordion === 'actions' ? null : 'actions'); }}
                      style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: openAccordion === 'actions' ? '#f1f5f9' : 'transparent', borderRadius: '4px' }}
                    >
                      <span>📁 Actions</span>
                      <span style={{ transform: openAccordion === 'actions' ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.2s' }}>▶</span>
                    </div>

                    {openAccordion === 'actions' && (
                      <div style={{ paddingLeft: '0.5rem', marginTop: '4px', borderLeft: '2px solid #e2e8f0', marginLeft: '6px' }}>
                        {(currentUser?.profile?.canAccessSettings || currentUser?.profile?.permissions?.Lead?.create) && (
                          <button
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem', borderRadius: '4px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                            onClick={() => { fileInputRef.current?.click(); setIsMenuOpen(false); }}
                            disabled={isImporting}
                          >
                            {isImporting ? 'Importing...' : '📥 Import Leads'}
                          </button>
                        )}

                        {(currentUser?.profile?.canAccessSettings || currentUser?.profile?.permissions?.Lead?.view) && (
                          <button
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem', borderRadius: '4px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                            onClick={() => { handleExport(); setIsMenuOpen(false); }}
                          >
                            📤 Export Leads
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
              )}

          </div>
        </div>
      </header>

      <div className="module-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {isLoading ? (
          <div className="p-8 text-center" style={{ margin: 'auto' }}>
            <TableSkeleton />
          </div>
        ) : leads.length === 0 ? (
          renderEmptyState()
        ) : (
          viewMode === 'kanban' ? renderKanbanView() : renderListView()
        )}
      </div>
    </main >

      <LeadIntakeForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleAddLead}
      />

      <SlideOverPanel
        isOpen={!!selectedLead}
        onClose={() => {
          setSelectedLead(null);
          setPendingTransition(null);
        }}
        lead={selectedLead}
        blueprint={blueprint}
        tags={tags}
        currentUser={currentUser}
        onTransition={handleTransition}
        onLeadUpdate={handleLeadUpdate}
        onEditClick={(lead) => {
          setSelectedLead(null);
          setIsEditModalOpen(true);
          setLeadToEdit(lead);
        }}
        pendingTransition={pendingTransition}
      />

  {/* FLOATING BULK ACTION BAR */ }
  {
    selectedLeadIds.length > 0 && (
      <div style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#0f172a',
        color: 'white',
        padding: '1rem 1.5rem',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            background: '#334155',
            color: 'white',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            {selectedLeadIds.length}
          </span>
          <span style={{ fontWeight: 500 }}>Leads Selected</span>
        </div>

        <div style={{ width: '1px', height: '24px', background: '#334155' }}></div>

        <div style={{ display: 'flex', gap: '0.75rem', position: 'relative' }}>
          <button
            onClick={() => setIsBulkTagPickerOpen(!isBulkTagPickerOpen)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
              fontWeight: 500
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
            Apply Tag
          </button>

          {isBulkTagPickerOpen && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 0.5rem)',
              left: 0,
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              width: '240px',
              maxHeight: '300px',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              color: '#0f172a'
            }}>
              <div style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9', fontWeight: 600, fontSize: '0.85rem', color: '#64748b' }}>
                SELECT A TAG
              </div>
              {tags.length === 0 ? (
                <div style={{ padding: '1rem', fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>
                  No tags available
                </div>
              ) : (
                tags.map(tag => (
                  <div
                    key={tag.id}
                    onClick={() => handleBulkTagApply(tag)}
                    style={{
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f8fafc'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: tag.color }}></div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{tag.name}</span>
                  </div>
                ))
              )}
            </div>
          )}

          <button
            onClick={() => setSelectedLeadIds([])}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              padding: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  {/* NEW: Edit Lead Modal */ }
  <EditLeadModal
    isOpen={isEditModalOpen}
    onClose={() => { setIsEditModalOpen(false); setLeadToEdit(null); }}
    lead={leadToEdit}
    blueprint={blueprint}
    currentUser={currentUser}
    onLeadUpdate={(updatedLead) => {
      // Update lead in state
      setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
      // If slide-over is open and viewing this lead, update it
      if (selectedLead && selectedLead.id === updatedLead.id) {
        setSelectedLead(updatedLead);
      }
    }}
  />
    </>
  );
}