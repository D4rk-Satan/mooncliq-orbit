"use client";

import React, { useEffect, useState } from "react";
import DynamicField from "./FieldRegistry";
import { evaluateExecutionCriteria } from "../utils/ruleEngine";
import { useConfirm } from "../contexts/ConfirmContext";
import toast from "react-hot-toast";

export default function SlideOverPanel({ isOpen, onClose, lead, blueprint, tags = [], currentUser, onTransition, onLeadUpdate, pendingTransition, onEditClick, onDeleteClick, onNext, onPrev, hasNext, hasPrev }) {
  const { showConfirm } = useConfirm();
  const [modalMode, setModalMode] = useState(null); // null | 'missing' | 'security' | 'confirm'
  const [activeTransition, setActiveTransition] = useState(null);
  const [formData, setFormData] = useState({});
  const [securityData, setSecurityData] = useState({});
  const [securityError, setSecurityError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [checklistState, setChecklistState] = useState({});
  const [tagBuilder, setTagBuilder] = useState({ isOpen: false });
  const [localTags, setLocalTags] = useState([]);
  const [activeTab, setActiveTab] = useState('Details');

  // Paginated Activity Logs State (10 records per page, lazy-loaded on Activity Tab click)
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivity, setHasMoreActivity] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [totalActivityCount, setTotalActivityCount] = useState(0);

  const [newNoteText, setNewNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const [usersMap, setUsersMap] = useState({});

  // Fetch users map once to resolve any user IDs to nicknames
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        if (!token) return;

        const res = await fetch('/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const list = await res.json();
          const map = {};
          list.forEach(u => {
            const nick = u.nickname || u.profile?.nickname || u.name || u.email?.split('@')[0] || u.email;
            if (u.id) map[u.id] = nick;
            if (u.email) map[u.email] = nick;
          });
          setUsersMap(map);
        }
      } catch (e) {
        console.error("Error loading users in SlideOverPanel:", e);
      }
    };
    loadUsers();
  }, []);

  // Fetch paginated audit history when user switches to 'Activity' tab (Lazy-load 10 records)
  useEffect(() => {
    if (activeTab === 'Activity' && lead?.id) {
      // If no logs yet for this record, fetch page 1
      fetchActivityLogs(1, true);
    }
  }, [activeTab, lead?.id]);

  const fetchActivityLogs = async (pageNum = 1, isReset = false) => {
    if (!lead?.id) return;
    setIsLoadingActivity(true);
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (!token) return;

      const res = await fetch(`/api/audit-logs?recordId=${lead.id}&page=${pageNum}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setActivityLogs(prev => isReset ? data.logs : [...prev, ...data.logs]);
        setTotalActivityCount(data.totalCount || 0);
        setHasMoreActivity(data.hasMore || false);
        setActivityPage(pageNum);
      }
    } catch (err) {
      console.error("Failed to load audit activity logs:", err);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const handleLoadMoreActivity = () => {
    if (!isLoadingActivity && hasMoreActivity) {
      fetchActivityLogs(activityPage + 1, false);
    }
  };

  // Helper to get human friendly action labels and colors
  const getActionBadge = (actionType) => {
    const act = (actionType || '').toUpperCase();
    if (act.includes('AUTO')) return { label: 'Automated', color: '#059669', bg: '#ecfdf5', icon: '🤖' };
    if (act.includes('CREATE')) return { label: 'Created', color: '#10b981', bg: '#ecfdf5', icon: '✨' };
    if (act.includes('DELETE')) return { label: 'Deleted', color: '#ef4444', bg: '#fef2f2', icon: '🗑️' };
    if (act.includes('RECURR')) return { label: 'Recurred', color: '#6366f1', bg: '#e0e7ff', icon: '🔁' };
    if (act.includes('STAGE') || act.includes('TRANSITION')) return { label: 'Stage Changed', color: '#8b5cf6', bg: '#f5f3ff', icon: '🔄' };
    return { label: 'Updated', color: '#3b82f6', bg: '#eff6ff', icon: '✏️' };
  };

  // Parse existing notes (handles JSON array or legacy raw string)
  const getTimelineNotes = () => {
    if (!lead || !lead.notes) return [];
    if (Array.isArray(lead.notes)) return lead.notes;

    const fallbackAuthor = lead.owner || lead.assignedByName || (lead.assignedBy && usersMap[lead.assignedBy]) || currentUser?.profile?.nickname || currentUser?.name || 'Team Member';

    try {
      const parsed = JSON.parse(lead.notes);
      if (Array.isArray(parsed)) return parsed;
      return [{ id: 'legacy-1', text: String(lead.notes), author: fallbackAuthor, createdAt: lead.updatedAt || lead.createdAt || new Date().toISOString() }];
    } catch (e) {
      return [{ id: 'legacy-1', text: String(lead.notes), author: fallbackAuthor, createdAt: lead.updatedAt || lead.createdAt || new Date().toISOString() }];
    }
  };

  const handleAddTimelineNote = async () => {
    if (!newNoteText.trim() || isSavingNote || !lead?.id) return;
    setIsSavingNote(true);

    const authorName = currentUser?.profile?.nickname || currentUser?.profile?.name || currentUser?.name || currentUser?.email?.split('@')[0] || 'User';

    const currentNotes = getTimelineNotes();
    const newEntry = {
      id: 'note_' + Date.now(),
      text: newNoteText.trim(),
      author: authorName,
      authorEmail: currentUser?.email || '',
      createdAt: new Date().toISOString()
    };

    const updatedNotesList = [newEntry, ...currentNotes];
    const notesJsonString = JSON.stringify(updatedNotesList);

    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      // Determine endpoint based on blueprint or record type (defaults to /api/leads)
      const moduleType = (blueprint?.moduleType || 'lead').toLowerCase();
      let endpoint = '/api/leads';
      let payload = { leadId: lead.id, notes: notesJsonString };

      if (moduleType === 'deal') {
        endpoint = '/api/deals';
        payload = { dealId: lead.id, notes: notesJsonString };
      } else if (moduleType === 'task') {
        endpoint = '/api/tasks';
        payload = { taskId: lead.id, notes: notesJsonString };
      }

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updatedRecord = await res.json();
        // Optimistic local state update on the lead object
        lead.notes = notesJsonString;
        setNewNoteText("");
        if (onLeadUpdate) onLeadUpdate(updatedRecord);
      } else {
        alert("Failed to save note. Please try again.");
      }
    } catch (err) {
      console.error("Error adding note:", err);
      alert("Error saving note: " + err.message);
    } finally {
      setIsSavingNote(false);
    }
  };


  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
      setModalMode(null);
      setActiveTransition(null);
      setActiveTab('Details');
    }

    if (lead) {
      try {
        setLocalTags(Array.isArray(lead.tags) ? lead.tags : JSON.parse(lead.tags || "[]"));
      } catch (e) {
        setLocalTags([]);
      }
    }
  }, [isOpen, lead]);

  useEffect(() => {
    if (isOpen && lead && pendingTransition && pendingTransition.id !== activeTransition?.id) {
      handleTransitionClick(pendingTransition);
    }
  }, [isOpen, lead, pendingTransition]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (hasNext && onNext) onNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (hasPrev && onPrev) onPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasNext, hasPrev, onNext, onPrev]);


  if (!isOpen || !lead || !blueprint) return null;

  const currentStageId = lead.stageId;
  const currentStage = blueprint.stages.find(s => s.id === currentStageId);
  const stageColor = currentStage?.color || '#0ea5e9';
  const stageName = currentStage?.name || "Unknown";

  const getDisplayName = (record) => {
    if (!record) return "Unknown";

    let cData = {};
    try {
      cData = typeof record.customData === 'string' ? JSON.parse(record.customData) : (record.customData || {});
    } catch (e) { }

    // Generic name handler for all modules
    let name = record.fullName || record.dealName || record.taskName || record.name || record.accountName || `${record.firstName || ''} ${record.lastName || ''}`.trim();

    if (!name) {
      name = cData.companyName || cData.name || cData.fullName || cData.title || cData.taskName || cData.dealName;
    }

    return name || "Unknown";
  };

  const getInitials = (nameStr) => {
    if (!nameStr || nameStr === "Unknown") return "?";
    const parts = nameStr.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  };

  const displayName = getDisplayName(lead);


  const availableTransitions = blueprint.transitions.filter(t => {
    // 0. Permission Check
    if (currentUser && !currentUser.profile?.canAccessSettings && !currentUser.profile?.permissions?.[blueprint.moduleType]?.edit) {
      return false;
    }

    // 1. Stage Check
    const validStage = t.isGlobal || (t.fromStages && t.fromStages.some(s => s.id === currentStageId));
    if (!validStage) return false;

    // 2. Execution Criteria Check
    if (t.executionCriteria && t.executionCriteria.conditions && t.executionCriteria.conditions.length > 0) {
      return evaluateExecutionCriteria(lead, t.executionCriteria);
    }

    return true; // If no criteria, button is visible
  });

  const executeTransition = (transition, finalData) => {
    onTransition(lead.id, transition.toStageId, finalData, transition.id);
    setModalMode(null);
    onClose();
  };

  const handleTransitionClick = (transition) => {
    setActiveTransition(transition);
    setFormData(lead.customData || {});
    setSecurityData({});
    setSecurityError("");
    setChecklistState((transition.checklists || []).reduce((acc, _, idx) => ({ ...acc, [idx]: false }), {}));

    const requiredFields = transition.requiredFields || [];
    const necessaryFields = transition.necessaryFields || [];
    const visibleFields = transition.visibleFields || [];
    const checklists = transition.checklists || [];
    const customMessage = transition.customMessage;

    if (requiredFields.length > 0 || visibleFields.length > 0 || checklists.length > 0) {
      setModalMode('missing');
      return;
    }

    if (necessaryFields.length > 0) {
      setModalMode('security');
      return;
    }

    setModalMode('confirm');
  };

  const handleMissingSubmit = (e) => {
    e.preventDefault();

    const checklists = activeTransition.checklists || [];
    for (let i = 0; i < checklists.length; i++) {
      if (!checklistState[i]) {
        alert("Please complete all checklist items before proceeding.");
        return;
      }
    }

    const requiredFields = activeTransition.requiredFields || [];
    const currentData = { ...lead.customData, ...formData };
    for (let fieldName of requiredFields) {
      if (!currentData[fieldName] || String(currentData[fieldName]).trim() === "") {
        alert(`Please fill out the required field: ${fieldName}`);
        return;
      }
    }

    if ((activeTransition.necessaryFields || []).length > 0) {
      setModalMode('security');
    } else {
      setModalMode('confirm');
    }
  };

  const handleSecuritySubmit = (e) => {
    e.preventDefault();
    setSecurityError("");
    const necessaryFields = activeTransition.necessaryFields || [];
    const currentData = { ...lead.customData, ...formData };

    for (let fieldName of necessaryFields) {
      const expected = String(currentData[fieldName] || "").toLowerCase().trim();
      const actual = String(securityData[fieldName] || "").toLowerCase().trim();
      if (expected !== actual) {
        setSecurityError(`Verification Failed: The value entered does not match the saved data.`);
        return;
      }
    }

    setModalMode('confirm');
  };

  const handleConfirmSubmit = (e) => {
    if (e) e.preventDefault();
    setConfirmError("");
    const finalData = { ...lead.customData, ...formData };

    onTransition(lead.id, activeTransition.toStageId, finalData, activeTransition.id);
    setModalMode(null);
  };

  const handleTransitionFieldChange = (name, value, record = null, mappings = [], isSecurity = false) => {
    const targetData = isSecurity ? securityData : formData;
    const setTargetData = isSecurity ? setSecurityData : setFormData;

    let newData = { ...targetData, [name]: value };

    if (record && mappings && mappings.length > 0) {
      mappings.forEach(mapping => {
        if (!mapping.sourceField || !mapping.targetField) return;
        let cData = {};
        try {
          cData = typeof record.customData === 'string' ? JSON.parse(record.customData || '{}') : (record.customData || {});
        } catch (e) { }
        const sourceVal = record[mapping.sourceField] || cData[mapping.sourceField];
        if (sourceVal !== undefined) {
          newData[mapping.targetField] = sourceVal;
        }
      });
    }
    setTargetData(newData);
  };



  const renderTabContent = () => {
    if (activeTab === 'Activity') {
      const createdDate = new Date(lead.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
      const updatedDate = new Date(lead.lastActivityDate || lead.updatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
      const currentNick = currentUser?.profile?.nickname || currentUser?.profile?.name || currentUser?.name || currentUser?.email?.split('@')[0];
      const modifiedBy = lead.lastModifiedByName ||
        usersMap[lead.lastModifiedById] ||
        (lead.lastModifiedById === currentUser?.id ? currentNick : null) ||
        lead.assignedByName ||
        lead.assignedBy ||
        currentNick ||
        "Team User";

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Top Summary Card */}
          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created On</div>
              <div style={{ fontSize: '0.9rem', color: '#0f172a', marginTop: '0.35rem', fontWeight: 500 }}>{createdDate}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Modified By</div>
              <div style={{ fontSize: '0.9rem', color: '#0f172a', marginTop: '0.35rem', fontWeight: 500 }}>{modifiedBy}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Activity</div>
              <div style={{ fontSize: '0.9rem', color: '#0f172a', marginTop: '0.35rem', fontWeight: 500 }}>{updatedDate}</div>
            </div>
          </div>

          {/* Real-time Paginated Audit Trail Timeline */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                Activity History {totalActivityCount > 0 ? `(${totalActivityCount})` : ''}
              </h3>
              {isLoadingActivity && (
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Refreshing history...</span>
              )}
            </div>

            {isLoadingActivity && activityLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
                <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Loading activity logs...</p>
              </div>
            ) : activityLogs.length === 0 ? (
              /* Fallback to default creation & update timestamps if no audit logs found */
              <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid #e2e8f0', marginLeft: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-1.85rem', top: '0.25rem', width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6', border: '2px solid #fff' }}></div>
                  <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500 }}>Record Updated</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>by <strong>{modifiedBy}</strong> on {updatedDate}</div>
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-1.85rem', top: '0.25rem', width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', border: '2px solid #fff' }}></div>
                  <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500 }}>Record Created</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>on {createdDate}</div>
                </div>
              </div>
            ) : (
              /* Live Dynamic Audit Trail (Latest on Top, 10 per batch) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid #e2e8f0', marginLeft: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  {activityLogs.map((log, lIdx) => {
                    const badge = getActionBadge(log.actionType);
                    let formattedLogDate = log.createdAt;
                    try {
                      formattedLogDate = new Date(log.createdAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: true
                      });
                    } catch (e) { }

                    // Format modified fields snippet if available in details
                    let changeSummary = null;
                    if (log.details && typeof log.details === 'object') {
                      const keys = Object.keys(log.details).filter(k => !['customData', 'stageId', 'taskId', 'leadId', 'dealId'].includes(k));
                      if (keys.length > 0) {
                        changeSummary = keys.slice(0, 3).map(k => `${k}: ${String(log.details[k])}`).join(', ');
                        if (keys.length > 3) changeSummary += ` (+${keys.length - 3} more)`;
                      } else if (log.details.stageId) {
                        changeSummary = `Stage updated`;
                      }
                    }

                    return (
                      <div key={log.id || lIdx} style={{ position: 'relative' }}>
                        {/* Dot on Timeline */}
                        <div style={{
                          position: 'absolute', left: '-1.85rem', top: '0.25rem',
                          width: '12px', height: '12px', borderRadius: '50%',
                          background: badge.color, border: '2px solid #fff'
                        }}></div>

                        {/* Event Content */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px',
                            background: badge.bg, color: badge.color, display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}>
                            <span>{badge.icon}</span>
                            {badge.label}
                          </span>
                          <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>
                            by {log.authorName}
                          </span>
                        </div>

                        {changeSummary && (
                          <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.35rem', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #f1f5f9', display: 'inline-block' }}>
                            {changeSummary}
                          </div>
                        )}

                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                          {formattedLogDate}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Load More Button for Pagination (10 per batch) */}
                {hasMoreActivity && (
                  <div style={{ textAlign: 'center', paddingTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={handleLoadMoreActivity}
                      disabled={isLoadingActivity}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '20px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: isLoadingActivity ? 'not-allowed' : 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                    >
                      {isLoadingActivity ? (
                        <span>Loading next 10...</span>
                      ) : (
                        <span>Load older activity ({activityLogs.length} of {totalActivityCount}) ↓</span>
                      )}
                    </button>
                  </div>
                )}

                {!hasMoreActivity && activityLogs.length >= 10 && (
                  <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', paddingTop: '0.5rem' }}>
                    ✨ Reached beginning of record history
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === 'Details') {
      const EXCLUDED_FIELDS = [
        'notes',
        'createdat',
        'createddate',
        'lastmodifiedbyid',
        'lastmodifieddate',
        'lastmodifiedby',
        'updatedat',
        'lastactivitydate',
        'stage',
        'stageid'
      ];

      // 1. Blueprint ke sections nikalna (LayoutConfig se ya fields ke sectionName se)
      const allSections = (blueprint?.layoutConfig && Array.isArray(blueprint.layoutConfig) && blueprint.layoutConfig.length > 0)
        ? [...blueprint.layoutConfig].sort((a, b) => (a.order || 0) - (b.order || 0))
        : [...new Set((blueprint?.fields || []).map(f => f.sectionName || 'General Information'))].map(name => ({ name, columns: 2 }));

      // 2. Sirf wahi sections aur fields filter karna jisme ASLI DATA hai!
      const populatedSections = allSections.map(sec => {
        const secFields = (blueprint?.fields || []).filter(field => {
          const fName = (field.name || '').toLowerCase();
          if (EXCLUDED_FIELDS.includes(fName) || (field.isHidden && fName !== 'completionsource')) return false;
          const sName = field.sectionName || 'General Information';
          return sName === sec.name;
        });

        const validFields = [];
        secFields.forEach(field => {
          let value = field.name in lead ? lead[field.name] : lead.customData?.[field.name];
          if (field.name === 'lastModifiedById' && lead.lastModifiedByName) value = lead.lastModifiedByName;
          // Resolve assignedBy or any User type field from ID to Nickname
          if (field.name === 'assignedBy' || field.type?.toLowerCase() === 'user') {
            if (lead.assignedByName && field.name === 'assignedBy') {
              value = lead.assignedByName;
            } else if (usersMap[value]) {
              value = usersMap[value];
            } else if (currentUser && (value === currentUser.id || value === currentUser.email)) {
              value = currentUser.profile?.nickname || currentUser.name || currentUser.email?.split('@')[0];
            }
          }
          // Agar value khali ya empty ya "-" hai toh SKIP karo!
          if (value === undefined || value === null || value === '' || value === '-' || (typeof value === 'object' && Object.keys(value).length === 0)) {
            return;
          }

          // Date & Time formatting
          if (field.type?.toLowerCase() === 'datetime' || field.type?.toLowerCase() === 'date') {
            try {
              const dateObj = new Date(value);
              if (!isNaN(dateObj.getTime())) {
                value = dateObj.toLocaleString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit', hour12: true
                });
              }
            } catch (e) { }
          }

          // Address formatting
          if (field.type?.toLowerCase() === 'address') {
            let addrObj = null;
            try { addrObj = typeof value === 'string' ? JSON.parse(value) : value; } catch (e) { }
            if (!addrObj && (lead.street || lead.city || lead.state || lead.zipCode)) {
              addrObj = { street: lead.street, city: lead.city, state: lead.state, zip: lead.zipCode, country: lead.country };
            }
            if (addrObj && typeof addrObj === 'object') {
              const parts = [addrObj.street, addrObj.city, addrObj.state, addrObj.zip ? `PIN: ${addrObj.zip}` : '', addrObj.country].filter(Boolean);
              if (parts.length === 0) return; // Skip if empty address
              value = parts.join(', ');
            }
          }

          validFields.push({ field, formattedValue: value });
        });

        return {
          sectionName: sec.name,
          columns: sec.columns || 2,
          fields: validFields
        };
      }).filter(sec => sec.fields.length > 0); // AGAR SAARI FIELDS EMPTY HAIN TOH SECTION BHI HIDE!

      if (populatedSections.length === 0) {
        return (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
            No populated details available for this record.
          </div>
        );
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {populatedSections.map((sec, secIdx) => (
            <div key={secIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Section Header */}
              <div style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ width: '4px', height: '14px', backgroundColor: '#3b82f6', borderRadius: '2px' }}></span>
                {sec.sectionName}
              </div>

              {/* 2-Columns Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${sec.columns || 2}, 1fr)`,
                gap: '1rem 1.25rem'
              }}>
                {sec.fields.map(({ field, formattedValue }) => {
                  const isFullWidth = field.type?.toLowerCase() === 'address' ||
                    field.type?.toLowerCase() === 'textarea' ||
                    field.type?.toLowerCase() === 'geolocation' ||
                    field.type?.toLowerCase() === 'audio' ||
                    field.name?.toLowerCase().includes('location') ||
                    field.fullWidth;
                  return (
                    <div
                      key={field.id || field.name}
                      style={{
                        gridColumn: isFullWidth ? '1 / -1' : 'auto',
                        background: '#f8fafc',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #f1f5f9'
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                        {field.label}
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', wordBreak: 'break-word' }}>
                        {field.name === 'completionSource' ? (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '3px 10px',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            marginTop: '2px',
                            backgroundColor: (String(formattedValue).toLowerCase().includes('auto') || String(formattedValue).toLowerCase().includes('system')) ? '#ecfdf5' : '#f0f9ff',
                            color: (String(formattedValue).toLowerCase().includes('auto') || String(formattedValue).toLowerCase().includes('system')) ? '#047857' : '#0369a1',
                            border: `1px solid ${(String(formattedValue).toLowerCase().includes('auto') || String(formattedValue).toLowerCase().includes('system')) ? '#a7f3d0' : '#bae6fd'}`
                          }}>
                            <span>{(String(formattedValue).toLowerCase().includes('auto') || String(formattedValue).toLowerCase().includes('system')) ? '🤖' : '👤'}</span>
                            <span>{String(formattedValue)}</span>
                          </div>
                        ) : (field.type?.toLowerCase() === 'audio' || String(formattedValue).includes('/audio/')) ? (
                          <audio controls src={formattedValue} style={{ width: '100%', height: '36px', marginTop: '6px' }} />
                        ) : (field.type?.toLowerCase() === 'geolocation' || field.name?.toLowerCase().includes('location')) ? (() => {
                          let g = null;
                          try { g = typeof formattedValue === 'string' ? JSON.parse(formattedValue) : formattedValue; } catch (e) { }
                          if (g && (g.lat || g.address)) {
                            return (
                              <div style={{ marginTop: '6px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                                {g.address && (
                                  <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500, lineHeight: 1.4 }}>
                                    📍 {g.address}
                                  </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.75rem', color: '#64748b', flexWrap: 'wrap', gap: '8px' }}>
                                  {g.lat && <span>GPS: {g.lat}, {g.lng} {g.accuracy ? `(±${g.accuracy}m)` : ''}</span>}
                                  {g.lat && (
                                    <a
                                      href={`https://www.google.com/maps?q=${g.lat},${g.lng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      Open Map ↗
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return String(formattedValue);
                        })() : (
                          String(formattedValue)
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'Notes') {
      const notesList = getTimelineNotes();

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top Add Note Box */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
              Add a Comment
            </label>
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Write an internal note, call summary, or customer update..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
              <button
                type="button"
                onClick={handleAddTimelineNote}
                disabled={isSavingNote || !newNoteText.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  backgroundColor: !newNoteText.trim() || isSavingNote ? '#cbd5e1' : '#0f172a',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: !newNoteText.trim() || isSavingNote ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                {isSavingNote ? 'Saving...' : '+ Post Comment '}
              </button>
            </div>
          </div>

          {/* Timeline Feed */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', margin: '0 0 1rem 0' }}>
              Timeline ({notesList.length})
            </h4>

            {notesList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#94a3b8' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No notes yet. Post the first update above.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {notesList.map((n, idx) => {
                  const authorName = n.author || 'User';
                  const initials = authorName.slice(0, 2).toUpperCase();
                  let formattedDate = n.createdAt;
                  try {
                    const d = new Date(n.createdAt);
                    if (!isNaN(d.getTime())) {
                      formattedDate = d.toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: true
                      });
                    }
                  } catch (e) { }

                  return (
                    <div
                      key={n.id || idx}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '1rem',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: '#e0e7ff',
                            color: '#3730a3',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {initials}
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                            {authorName}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {formattedDate}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap', paddingLeft: '2rem' }}>
                        {n.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === 'Files') {
      // Extract all file/audio/image assets from current record
      const extractedAssets = [];

      // 1. Scan standard and customData fields
      const scanField = (fieldName, fieldLabel, val) => {
        if (!val || typeof val !== 'string') return;
        const lowerVal = val.toLowerCase();

        // Audio files
        if (lowerVal.endsWith('.mp3') || lowerVal.endsWith('.wav') || lowerVal.endsWith('.webm') || lowerVal.endsWith('.ogg') || lowerVal.endsWith('.m4a') || lowerVal.includes('/audio/')) {
          extractedAssets.push({
            type: 'audio',
            name: fieldLabel || fieldName || 'Voice Note',
            url: val,
            icon: '🎙️'
          });
        }
        // Image files
        else if (lowerVal.endsWith('.jpg') || lowerVal.endsWith('.jpeg') || lowerVal.endsWith('.png') || lowerVal.endsWith('.webp') || lowerVal.endsWith('.svg') || lowerVal.includes('/products/') || lowerVal.includes('/avatars/') || lowerVal.includes('/logos/')) {
          extractedAssets.push({
            type: 'image',
            name: fieldLabel || fieldName || 'Image Attachment',
            url: val,
            icon: '🖼️'
          });
        }
        // Document / PDF / Sheet files
        else if (lowerVal.endsWith('.pdf') || lowerVal.endsWith('.xlsx') || lowerVal.endsWith('.xls') || lowerVal.endsWith('.csv') || lowerVal.endsWith('.doc') || lowerVal.endsWith('.docx')) {
          extractedAssets.push({
            type: 'document',
            name: fieldLabel || fieldName || 'Document',
            url: val,
            icon: lowerVal.endsWith('.pdf') ? '📄' : '📊'
          });
        }
      };

      // Scan root fields
      Object.entries(lead || {}).forEach(([k, v]) => {
        if (k !== 'customData') scanField(k, k, v);
      });

      // Scan customData fields
      if (lead?.customData && typeof lead.customData === 'object') {
        Object.entries(lead.customData).forEach(([k, v]) => {
          scanField(k, k, v);
        });
      }

      // Scan blueprint fields to get human labels if available
      if (blueprint?.fields) {
        blueprint.fields.forEach(f => {
          if (f.type?.toLowerCase() === 'audio' || f.type?.toLowerCase() === 'image' || f.type?.toLowerCase() === 'file') {
            const rawVal = lead[f.name] || lead.customData?.[f.name];
            if (rawVal && typeof rawVal === 'string') {
              const existing = extractedAssets.find(a => a.url === rawVal);
              if (existing) {
                existing.name = f.label || existing.name;
              }
            }
          }
        });
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header Summary */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📁</span>
              <span>Attachments & Media ({extractedAssets.length})</span>
            </h4>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Read-only Viewer
            </span>
          </div>

          {extractedAssets.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3.5rem 1.5rem',
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '12px',
              color: '#94a3b8'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📂</div>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>No media or files attached</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>Audio recordings, product images, or documents attached to this record will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {extractedAssets.map((asset, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  {/* Top Bar: Title & Action Link */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{asset.icon}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                        {asset.name}
                      </span>
                    </div>

                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#2563eb',
                        textDecoration: 'none',
                        background: '#eff6ff',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>Open ↗</span>
                    </a>
                  </div>

                  {/* Inline Audio Player for Audio Files */}
                  {asset.type === 'audio' && (
                    <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <audio controls src={asset.url} style={{ width: '100%', height: '36px' }} />
                    </div>
                  )}

                  {/* Image Thumbnail Preview */}
                  {asset.type === 'image' && (
                    <div style={{ borderRadius: '8px', overflow: 'hidden', background: '#f8fafc', border: '1px solid #f1f5f9', maxHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        src={asset.url}
                        alt={asset.name}
                        style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'contain', display: 'block' }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'Related') {
      // Collect only pure Lookup fields defined in blueprint
      const lookupFieldDefs = (blueprint?.fields || []).filter(
        f => f.type?.toLowerCase() === 'lookup'
      );

      const relatedRecords = [];

      lookupFieldDefs.forEach(fieldDef => {
        // Value can be in root or customData
        const rawValue = lead[fieldDef.name] !== undefined ? lead[fieldDef.name] : lead?.customData?.[fieldDef.name];
        if (!rawValue) return;

        const items = Array.isArray(rawValue) ? rawValue : [rawValue];

        items.forEach((item, index) => {
          if (!item) return;

          let recordId = '';
          let displayName = '';

          if (typeof item === 'object') {
            recordId = item.id || item._id || '';
            displayName = item.name || item.taskName || item.displayName || item.title || item.companyName || (item.firstName ? `${item.firstName} ${item.lastName || ''}`.trim() : '') || item.id || 'Linked Record';
          } else if (typeof item === 'string' || typeof item === 'number') {
            recordId = String(item);
            displayName = String(item);
          }

          if (displayName || recordId) {
            const targetModule = fieldDef.targetModule || 'Record';
            let moduleRoute = `/${targetModule.toLowerCase()}`;
            if (targetModule.toLowerCase() === 'product') moduleRoute = '/products';

            relatedRecords.push({
              key: `${fieldDef.name}-${recordId || index}`,
              fieldName: fieldDef.name,
              fieldLabel: fieldDef.label || fieldDef.name,
              targetModule,
              moduleRoute,
              recordId,
              displayName
            });
          }
        });
      });

      // Target module badge colors
      const getModuleBadgeStyle = (mod) => {
        const m = (mod || '').toLowerCase();
        if (m.includes('lead')) return { bg: '#eef2ff', color: '#4f46e5', border: '#c7d2fe', icon: '🎯' };
        if (m.includes('account')) return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', icon: '🏢' };
        if (m.includes('deal')) return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', icon: '💼' };
        if (m.includes('task')) return { bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff', icon: '📋' };
        if (m.includes('product')) return { bg: '#fffbeb', color: '#d97706', border: '#fde68a', icon: '📦' };
        return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', icon: '🔗' };
      };

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header Summary */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
                Lookup Relationships
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Fields connected to other modules via Lookup
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '12px' }}>
              {relatedRecords.length} Linked
            </span>
          </div>

          {/* List or Empty State */}
          {relatedRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔗</div>
              <h5 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>
                No Linked Records
              </h5>
              <p style={{ margin: 0, fontSize: '0.825rem', color: '#64748b', maxWidth: '300px', marginInline: 'auto' }}>
                No lookup relationship fields are currently populated for this record.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {relatedRecords.map((rel) => {
                const badge = getModuleBadgeStyle(rel.targetModule);
                const hasValidTarget = rel.moduleRoute && rel.recordId;

                return (
                  <div
                    key={rel.key}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      padding: '0.9rem 1rem',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                  >
                    {/* Top Row: Module Badge + Field Label */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          padding: '2px 7px',
                          borderRadius: '6px'
                        }}
                      >
                        <span>{badge.icon}</span>
                        <span>{rel.targetModule}</span>
                      </span>

                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                        Field: <strong style={{ color: '#475569' }}>{rel.fieldLabel}</strong>
                      </span>
                    </div>

                    {/* Middle Row: Record Display Name & ID */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                      <div style={{ minWidth: 0, flex: 1, paddingRight: '0.75rem' }}>
                        <div
                          style={{
                            fontSize: '0.925rem',
                            fontWeight: 600,
                            color: '#0f172a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={rel.displayName}
                        >
                          {rel.displayName}
                        </div>
                        {rel.recordId && rel.recordId !== rel.displayName && (
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', fontFamily: 'monospace' }}>
                            ID: {rel.recordId}
                          </div>
                        )}
                      </div>

                      {/* Action Button: Open in target module */}
                      {hasValidTarget ? (
                        <a
                          href={`${rel.moduleRoute}?id=${encodeURIComponent(rel.recordId)}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#2563eb',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer'
                          }}
                        >
                          Open ↗
                        </a>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            color: '#94a3b8',
                            background: '#f8fafc',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #f1f5f9'
                          }}
                        >
                          Linked
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
        <p>No data available for {activeTab}</p>
      </div>
    );
  };

  return (
    <>


      <div className={`slide-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose} style={{ zIndex: 990 }}></div>

      {/* TAG BUILDER MODAL */}
      {tagBuilder.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setTagBuilder({ ...tagBuilder, isOpen: false })}></div>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', position: 'relative', zIndex: 10 }}>
            <h3 style={{ marginTop: 0, fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
              Add Tags
              <button onClick={() => setTagBuilder({ ...tagBuilder, isOpen: false })} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </h3>

            <div style={{ marginBottom: '2rem' }}>
              {tags.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No tags available. Please define tags in Settings Hub.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {tags.map(tag => (
                    <div
                      key={tag.id}
                      onClick={async () => {
                        if (localTags.find(t => t.id === tag.id)) {
                          setTagBuilder({ ...tagBuilder, isOpen: false });
                          return;
                        }
                        const newTags = [...localTags, tag];
                        setLocalTags(newTags);
                        setTagBuilder({ ...tagBuilder, isOpen: false });

                        try {
                          const { fetchAuthSession } = await import('aws-amplify/auth');
                          const session = await fetchAuthSession();
                          const token = session.tokens?.idToken?.toString();

                          const res = await fetch('/api/leads', {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': token ? `Bearer ${token}` : ''
                            },
                            body: JSON.stringify({ leadId: lead.id, tags: newTags.map(t => t.id) })
                          });

                          if (res.ok && onLeadUpdate) {
                            const updatedLead = await res.json();
                            onLeadUpdate(updatedLead);
                          }
                        } catch (e) {
                          console.error("Failed to save tag", e);
                        }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = tag.color}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                    >
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: tag.color }}></div>
                      <span style={{ fontWeight: 500, color: '#334155' }}>{tag.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn-outline" onClick={() => setTagBuilder({ ...tagBuilder, isOpen: false })}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className={`modal-card ${isOpen ? 'open' : ''}`} style={{
        display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff',
        width: '100%', maxWidth: '600px', right: isOpen ? '0' : '-100%',
        top: 0, bottom: 0, height: '100dvh', maxHeight: '100dvh', borderRadius: '0',
        left: 'auto', transform: 'none', /* Override modal-card centering */
        boxShadow: '-4px 0 24px rgba(0,0,0,0.1)', zIndex: 995, position: 'fixed',
        transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '2rem 2rem 0 2rem' }}>

          {/* 👇 Ye wala wrapper div delete ho gaya tha */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1rem' }}>

            {/* Left Side: Name & Stage */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {displayName}
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: stageColor, backgroundColor: `${stageColor}15`, padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                    {stageName}
                  </span>
                  {lead.completionSource && (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      backgroundColor: (lead.completionSource.toLowerCase().includes('auto') || lead.completionSource.toLowerCase().includes('system')) ? '#ecfdf5' : '#f0f9ff',
                      color: (lead.completionSource.toLowerCase().includes('auto') || lead.completionSource.toLowerCase().includes('system')) ? '#047857' : '#0369a1',
                      border: `1px solid ${(lead.completionSource.toLowerCase().includes('auto') || lead.completionSource.toLowerCase().includes('system')) ? '#a7f3d0' : '#bae6fd'}`
                    }}>
                      <span>{(lead.completionSource.toLowerCase().includes('auto') || lead.completionSource.toLowerCase().includes('system')) ? '🤖' : '👤'}</span>
                      {lead.completionSource}
                    </span>
                  )}
                </h2>
              </div>
            </div>

            {/* Right Side: Navigation & Close Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                <button
                  onClick={onPrev}
                  disabled={!hasPrev}
                  style={{ background: 'none', border: 'none', cursor: hasPrev ? 'pointer' : 'not-allowed', color: hasPrev ? '#64748b' : '#cbd5e1', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Previous Lead"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <div style={{ width: '1px', background: '#e2e8f0' }}></div>
                <button
                  onClick={onNext}
                  disabled={!hasNext}
                  style={{ background: 'none', border: 'none', cursor: hasNext ? 'pointer' : 'not-allowed', color: hasNext ? '#64748b' : '#cbd5e1', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Next Lead"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              </div>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.25rem', padding: '0.25rem' }}
                onClick={onClose}
                title="Close"
              >✕</button>
            </div>

          </div>
          {/* 👆 Wrapper div yaha close hua */}



          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            {onEditClick && (
              <button
                onClick={() => onEditClick(lead)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1.25rem', height: '36px', borderRadius: '18px', border: 'none', backgroundColor: '#0f172a', color: '#ffffff', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Edit
              </button>
            )}
            {onDeleteClick && (() => {
              const isTask = (blueprint?.moduleType || '').toLowerCase().includes('task');
              const currentStageObj = blueprint?.stages?.find(s => s.id === (lead?.stageId || lead?.stage?.id));
              const currentStageName = (lead?.stage?.name || lead?.stageName || currentStageObj?.name || '').toLowerCase().trim();
              const isCompleted = isTask && currentStageName === 'completed';

              const currentUserId = currentUser?.id || '';
              const currentUserEmail = (currentUser?.email || '').toLowerCase();
              const currentNick = (currentUser?.profile?.nickname || '').toLowerCase();
              const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
              const taskAssignedBy = String(lead?.assignedBy || '').toLowerCase();
              const isCreator = taskAssignedBy && (taskAssignedBy === currentUserId.toLowerCase() || taskAssignedBy === currentUserEmail || taskAssignedBy === currentNick);

              // If task is completed -> NO ONE can delete. Otherwise Admin or Creator can delete.
              const hasDeletePermission = !isTask ? true : (!isCompleted && (isAdmin || isCreator));

              return (
                <button
                  onClick={() => {
                    if (isCompleted) {
                      toast.error("Action Denied: Completed tasks are permanently locked and cannot be deleted.", {
                        icon: '🔒',
                        duration: 4000
                      });
                      return;
                    }
                    if (!hasDeletePermission) {
                      toast.error("Permission Denied: Only Task Creator or Org Admin can delete this task.", {
                        icon: '🔒',
                        duration: 4000
                      });
                      return;
                    }
                    showConfirm({
                      title: "Delete Record",
                      message: `Are you sure you want to permanently delete this ${blueprint?.moduleType || 'record'}?`,
                      onConfirm: () => onDeleteClick(lead)
                    });
                  }}
                  title={isCompleted ? "Completed tasks cannot be deleted" : (!hasDeletePermission ? "Only Creator or Admin can delete" : "Delete record")}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1.25rem', height: '36px',
                    borderRadius: '18px',
                    border: hasDeletePermission ? '1px solid #f87171' : '1px solid #cbd5e1',
                    backgroundColor: hasDeletePermission ? '#fef2f2' : '#f1f5f9',
                    color: hasDeletePermission ? '#ef4444' : '#94a3b8',
                    fontWeight: 600,
                    cursor: hasDeletePermission ? 'pointer' : 'not-allowed',
                    fontSize: '0.9rem',
                    opacity: hasDeletePermission ? 1 : 0.7
                  }}
                >
                  {hasDeletePermission ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  ) : (
                    <span>🔒</span>
                  )}
                  Delete
                </button>
              );
            })()}
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            {['Details', 'Activity', 'Notes', 'Files', 'Related'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none', border: 'none', padding: '0.75rem 0', cursor: 'pointer',
                  fontSize: '0.9rem', fontWeight: activeTab === tab ? 600 : 500,
                  color: activeTab === tab ? '#0f172a' : '#64748b',
                  borderBottom: activeTab === tab ? '2px solid #0f172a' : '2px solid transparent',
                  marginBottom: '-1px', transition: 'all 0.2s', whiteSpace: 'nowrap'
                }}
              >
                {tab} {tab === 'Files' || tab === 'Related'}
              </button>
            ))}
          </div>
        </div>

        <div className="slide-content" style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          {renderTabContent()}

          {localTags.length > 0 && (
            <div style={{ marginTop: '2.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.75rem' }}>Tags</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {localTags.map((t, idx) => (
                  <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', background: `${t.color}20`, border: `1px solid ${t.color}`, padding: '0.25rem 0.75rem', borderRadius: '16px' }}>
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="slide-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '1.25rem 2rem', background: '#ffffff', flexShrink: 0 }}>
          {availableTransitions.length === 0 ? (
            <p className="text-muted text-sm" style={{ width: '100%', textAlign: 'center', margin: 0 }}>No transitions available for this stage.</p>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '4px' }}>
              {availableTransitions.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTransitionClick(t)}
                  style={{
                    flex: '1 0 auto', padding: '0.6rem 1.2rem', borderRadius: '8px',
                    fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                    background: t.isGlobal ? '#f8fafc' : '#0f172a',
                    color: t.isGlobal ? '#334155' : '#ffffff',
                    border: t.isGlobal ? '1px solid #e2e8f0' : 'none',
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div >

      {/* MISSING FIELDS MODAL */}
      {
        modalMode === 'missing' && activeTransition && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setModalMode(null)}></div>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', position: 'relative', zIndex: 10 }}>
              <h3 style={{ marginTop: 0, fontSize: '1.25rem', marginBottom: '1rem' }}>Update Prompts</h3>
              <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                {activeTransition.customMessage ? activeTransition.customMessage : (
                  <>Please review and confirm the required data below to execute <strong>{activeTransition.name}</strong>.</>
                )}
              </p>
              <form onSubmit={handleMissingSubmit}>
                {(activeTransition.checklists || []).length > 0 && (
                  <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', color: '#334155' }}>Checklist</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {(activeTransition.checklists || []).map((item, idx) => (
                        <label key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                          <input type="checkbox" style={{ marginTop: '0.2rem' }} checked={checklistState[idx] || false} onChange={e => setChecklistState({ ...checklistState, [idx]: e.target.checked })} />
                          <span style={{ color: checklistState[idx] ? '#94a3b8' : '#0f172a', textDecoration: checklistState[idx] ? 'line-through' : 'none' }}>{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {(activeTransition.visibleFields || []).map(fieldName => {
                  const fieldDef = blueprint.fields.find(f => f.name === fieldName);
                  if (!fieldDef) return null;
                  return (
                    <div key={fieldName} style={{ marginBottom: '1rem' }}>
                      <DynamicField
                        field={fieldDef}
                        value={formData[fieldName]}
                        onChange={(name, value, record, mappings) => handleTransitionFieldChange(name, value, record, mappings, false)}
                      />
                    </div>
                  );
                })}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="button" className="btn-outline" onClick={() => setModalMode(null)}>Cancel</button>
                  <button type="submit" className="btn-primary">Save & Continue</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* SECURITY CHECKPOINT MODAL */}
      {
        modalMode === 'security' && activeTransition && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setModalMode(null)}></div>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', position: 'relative', zIndex: 10 }}>
              <h3 style={{ marginTop: 0, fontSize: '1.25rem', marginBottom: '1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🔒 Security Checkpoint
              </h3>
              <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Please verify the following data to proceed with <strong>{activeTransition.name}</strong>.
              </p>
              {securityError && (
                <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid #fecaca' }}>
                  {securityError}
                </div>
              )}
              <form onSubmit={handleSecuritySubmit}>
                {(activeTransition.necessaryFields || []).map(fieldName => {
                  const fieldDef = blueprint.fields.find(f => f.name === fieldName);
                  if (!fieldDef) return null;
                  return (
                    <div key={fieldName} style={{ marginBottom: '1rem' }}>
                      <DynamicField
                        field={fieldDef}
                        value={securityData[fieldName]}
                        onChange={(name, value, record, mappings) => handleTransitionFieldChange(name, value, record, mappings, true)}
                      />
                    </div>
                  );
                })}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="button" className="btn-outline" onClick={() => setModalMode(null)}>Cancel</button>
                  <button type="submit" className="btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }}>Verify</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* FINAL CONFIRMATION MODAL */}
      {
        modalMode === 'confirm' && activeTransition && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setModalMode(null)}></div>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', position: 'relative', zIndex: 10, textAlign: 'center' }}>
              <h3 style={{ marginTop: 0, fontSize: '1.25rem', marginBottom: '1rem' }}>Are you sure?</h3>
              <p className="text-muted" style={{ marginBottom: '2rem', fontSize: '1rem' }}>
                {activeTransition.customMessage ? activeTransition.customMessage : (
                  <>You are about to execute <strong>{activeTransition.name}</strong>. Do you want to proceed?</>
                )}
              </p>
              {confirmError && (
                <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid #fecaca' }}>
                  {confirmError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button type="button" className="btn-outline" onClick={() => setModalMode(null)}>Cancel</button>
                <button type="button" className="btn-primary" onClick={handleConfirmSubmit}>Yes, Proceed</button>
              </div>
            </div>
          </div>
        )
      }
    </>
  );
}