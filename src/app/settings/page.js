"use client";

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../../components/Sidebar";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import WorkflowBuilder from '../../components/WorkflowBuilder';
import LayoutBuilder from '../../components/LayoutBuilder';
import ClientScriptBuilder from '../../components/ClientScriptBuilder';
import WalletDashboard from '../../components/WalletDashboard';
import FormSkeleton from "../../components/skeletons/FormSkeleton";
import ConfirmModal from "../../components/ConfirmModal";


const DEFAULT_MODULE_FIELDS = {
  Lead: [
    { id: 'def_firstName', name: 'firstName', label: 'First Name' },
    { id: 'def_lastName', name: 'lastName', label: 'Last Name' },
    { id: 'def_email', name: 'email', label: 'Email' },
    { id: 'def_phone', name: 'phone', label: 'Phone' },
    { id: 'def_owner', name: 'owner', label: 'Owner' }
  ],
  Deal: [
    { id: 'def_firstName', name: 'firstName', label: 'First Name' },
    { id: 'def_lastName', name: 'lastName', label: 'Last Name' },
    { id: 'def_email', name: 'email', label: 'Email' },
    { id: 'def_phone', name: 'phone', label: 'Phone' },
    { id: 'def_amount', name: 'amount', label: 'Amount' }
  ],
  Account: [
    { id: 'def_companyName', name: 'companyName', label: 'Company Name' },
    { id: 'def_email', name: 'email', label: 'Email' },
    { id: 'def_gstNo', name: 'gstNo', label: 'GST No' },
    { id: 'def_website', name: 'website', label: 'Website' },
    { id: 'def_address', name: 'address', label: 'Address' },
    { id: 'def_contactPerson', name: 'contactPerson', label: 'Contact Person' }
  ],
  Product: [
    { id: 'def_name', name: 'name', label: 'Product Name' },
    { id: 'def_sku', name: 'sku', label: 'SKU' }
  ],
  Task: [
    { id: 'def_taskName', name: 'taskName', label: 'Task Name' },
    { id: 'def_startDateTime', name: 'startDateTime', label: 'Start Date & Time' },
    { id: 'def_dueDateTime', name: 'dueDateTime', label: 'Due Date & Time' },
    { id: 'def_endDateTime', name: 'endDateTime', label: 'End Date & Time' },
    { id: 'def_repeat', name: 'repeat', label: 'Repeat' },
    { id: 'def_alert', name: 'alert', label: 'Alert' },
    { id: 'def_notes', name: 'notes', label: 'Notes' }
  ]
};

export default function SettingsPage() {
  const [blueprint, setBlueprint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [targetBlueprintFields, setTargetBlueprintFields] = useState([]);
  const [currentView, setCurrentView] = useState("hub");
  const [selectedModule, setSelectedModule] = useState("Lead");
  const [isLayoutDirty, setIsLayoutDirty] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(0);

  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

  const showConfirm = (title, message, onConfirm, isDestructive = true, confirmText = 'Delete', cancelText = 'Cancel') => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      isDestructive,
      confirmText,
      cancelText,
      onConfirm: () => {
        onConfirm();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setConfirmState(prev => ({ ...prev, isOpen: false }))
    });
  };

  const [activeFeature, setActiveFeature] = useState(null);

  // New Field State
  const [newField, setNewField] = useState({ name: "", label: "", type: "text", options: "", targetModule: "Account", isMultiSelect: false, isBiDirectional: false, targetDisplayField: "name", isPublic: true, relatedListLabel: "", filters: [] });
  const [isAddingField, setIsAddingField] = useState(false);

  // New Stage State
  const [newStage, setNewStage] = useState({ name: "", color: "#fde68a" });
  const [isAddingStage, setIsAddingStage] = useState(false);

  // Rules Manager State
  const [selectedRule, setSelectedRule] = useState(null);
  const [activeRuleTab, setActiveRuleTab] = useState('before');
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isFieldMenuOpen, setIsFieldMenuOpen] = useState(false);
  const addMenuRef = useRef(null);


  useEffect(() => {
    function handleClickOutside(event) {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) {
        setIsAddMenuOpen(false);
        setIsFieldMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [tagBuilder, setTagBuilder] = useState({ isOpen: false, name: '', color: '#ef4444' });
  const [fieldUpdateBuilder, setFieldUpdateBuilder] = useState({ isOpen: false, field: '', value: '' });
  const [createRecordBuilder, setCreateRecordBuilder] = useState({ isOpen: false, targetModule: 'Task', autoLink: true, mappings: [] });
  useEffect(() => {
    if (createRecordBuilder.isOpen && createRecordBuilder.targetModule) {
      const fetchTargetBlueprint = async () => {
        try {
          const token = await getAuthToken();
          const res = await fetch(`/api/blueprint?moduleType=${createRecordBuilder.targetModule}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setTargetBlueprintFields(data.fields || []);
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchTargetBlueprint();
    }
  }, [createRecordBuilder.isOpen, createRecordBuilder.targetModule]);

  // Prevent navigation when layout is dirty
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (isLayoutDirty) {
        const targetLink = e.target.closest('a');
        if (targetLink) {
          e.preventDefault();
          e.stopPropagation();
          setShakeTrigger(prev => prev + 1);
        }
      }
    };

    const handleBeforeUnload = (e) => {
      if (isLayoutDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    document.addEventListener('click', handleGlobalClick, { capture: true });
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('click', handleGlobalClick, { capture: true });
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isLayoutDirty]);


  const tagColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#8b5cf6', '#ec4899', '#64748b', '#84cc16'];

  // Tag Manager State
  const [tags, setTags] = useState([]);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState({ name: "", color: "#ef4444", customColor: false });
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
  // selectedRule schema: { id, name, toStageId, fromStageIds: [], isGlobal: boolean, requiredFields: [], necessaryFields: [] }

  useEffect(() => {
    fetchBlueprint();
    fetchTags();
    fetchProfiles();
  }, [selectedModule]);

  const getAuthToken = async () => {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const { tokens } = await fetchAuthSession();
    return tokens.idToken.toString();
  };

  const [targetBlueprint, setTargetBlueprint] = useState(null);

  useEffect(() => {
    if (newField.targetModule && newField.targetModule !== selectedModule) {
      const fetchTarget = async () => {
        try {
          const token = await getAuthToken();
          const res = await fetch(`/api/blueprint?moduleType=${newField.targetModule}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) setTargetBlueprint(data);
        } catch (e) {
          console.error(e);
        }
      };
      fetchTarget();
    } else {
      setTargetBlueprint(blueprint);
    }
  }, [newField.targetModule, selectedModule, blueprint]);

  const getNativeFields = (moduleType) => {
    if (moduleType === 'Lead' || moduleType === 'Deal') return [{ name: 'firstName', label: 'First Name' }, { name: 'lastName', label: 'Last Name' }, { name: 'email', label: 'Email' }, { name: 'phone', label: 'Phone' }, { name: 'owner', label: 'Owner' }];
    if (moduleType === 'Account') return [{ name: 'companyName', label: 'Company Name' }, { name: 'email', label: 'Email' }, { name: 'gstNo', label: 'GST No' }, { name: 'website', label: 'Website' }, { name: 'address', label: 'Address' }, { name: 'contactPerson', label: 'Contact Person' }];
    if (moduleType === 'Task') return [{ name: 'taskName', label: 'Task Name' }, { name: 'startDateTime', label: 'Start Date/Time' }, { name: 'dueDateTime', label: 'Due Date/Time' }, { name: 'endDateTime', label: 'End Date/Time' }];
    if (moduleType === 'Product') return [{ name: 'name', label: 'Product Name' }, { name: 'sku', label: 'SKU' }];
    return [{ name: 'name', label: 'Name / Default' }];
  };


  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', profileId: '' });
  const [inviteStatus, setInviteStatus] = useState(null);

  const fetchBlueprint = async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/blueprint?moduleType=${selectedModule}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setBlueprint({ error: data.error });
      } else {
        setBlueprint(data);
      }
    } catch (err) {
      console.error("Failed to load blueprint", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/profiles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setProfiles(await res.json());
      }
    } catch (err) {
      console.error("Failed to load profiles", err);
    }
  };

  const fetchTags = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/tags?moduleType=${selectedModule}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTags(await res.json());
      }
    } catch (err) {
      console.error("Failed to load tags", err);
    }
  };


  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!inviteData.email || !inviteData.profileId) return;
    setInviteStatus('sending');
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ email: inviteData.email, profileId: inviteData.profileId })
      });
      if (res.ok) {
        setInviteStatus('success');
        setTimeout(() => {
          setIsInviteModalOpen(false);
          setInviteData({ email: '', profileId: '' });
          setInviteStatus(null);
        }, 2000);
      } else {
        const data = await res.json();
        setInviteStatus(`Error: ${data.error || 'Failed to send invite'}`);
      }
    } catch (err) {
      setInviteStatus(`Error: ${err.message}`);
    }
  };

  // --- Field Handlers ---
  const handleAddField = async (e) => {
    e.preventDefault();
    if (!newField.label || !newField.type) return;

    const name = newField.label.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(' ').map((w, i) => i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)).join('');

    try {
      const token = await getAuthToken();
      const payload = {
        name,
        label: newField.label,
        type: newField.type,
        options: newField.type === 'select' && newField.options ? newField.options.split(',').map(s => s.trim()).filter(Boolean) : [],
        targetModule: newField.type === 'lookup' ? newField.targetModule : null,
        targetDisplayField: newField.type === 'lookup' ? newField.targetDisplayField : null,
        isMultiSelect: newField.type === 'lookup' ? newField.isMultiSelect : false,
        isBiDirectional: newField.type === 'lookup' ? newField.isBiDirectional : false,
        relatedListLabel: newField.type === 'lookup' ? newField.relatedListLabel : null,
        isPublic: newField.type === 'lookup' ? (newField.isPublic !== false) : true,
        filters: newField.type === 'lookup' ? (newField.filters || []) : [],
        mappings: newField.type === 'lookup' ? (newField.mappings || []) : [],
        subformFields: newField.type === 'subform' ? (newField.subformFields || []) : null,
        blueprintId: blueprint.id
      };

      const res = await fetch('/api/fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setNewField({ name: "", label: "", type: "text", options: "", targetModule: "Account", isMultiSelect: false, isBiDirectional: false });
        setIsAddingField(false);
        fetchBlueprint();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteField = (id) => {
    showConfirm("Delete Field", "Are you sure you want to delete this field? This action cannot be undone.", async () => {
      try {
        const res = await fetch(`/api/fields?id=${id}`, { method: 'DELETE' });
        if (res.ok) fetchBlueprint();
      } catch (err) {
        console.error(err);
      }
    });
  };

  // --- Stage Handlers ---
  const handleAddStage = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newStage,
        blueprintId: blueprint.id
      };

      const res = await fetch('/api/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setNewStage({ name: "", color: "#fde68a" });
        setIsAddingStage(false);
        fetchBlueprint();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStage = (id) => {
    showConfirm("Delete Stage", "Are you sure you want to delete this stage? This action cannot be undone.", async () => {
      try {
        const res = await fetch(`/api/stages?id=${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || "Failed to delete stage.");
        } else {
          fetchBlueprint();
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleAddTag = async (e) => {
    e.preventDefault();
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...newTag, moduleType: selectedModule })
      });
      if (res.ok) {
        setNewTag({ name: "", color: "#ef4444", customColor: false });
        setIsAddingTag(false);
        fetchTags();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTag = (id) => {
    showConfirm("Delete Tag", "Are you sure you want to delete this tag? It will be removed from all associated records.", async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch(`/api/tags?id=${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          fetchTags();
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleSaveProfile = async () => {
    try {
      const token = await getAuthToken();
      const method = selectedProfile.id ? 'PUT' : 'POST';
      const url = selectedProfile.id ? `/api/profiles?id=${selectedProfile.id}` : '/api/profiles';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(selectedProfile)
      });

      if (res.ok) {
        setIsProfileModalOpen(false);
        fetchProfiles();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save profile");
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
    }
  };

  const handleDeleteProfile = (id) => {
    showConfirm("Delete Profile", "Are you sure you want to delete this profile?", async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch(`/api/profiles?id=${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          fetchProfiles();
        } else {
          const data = await res.json();
          alert(data.error || "Failed to delete profile");
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(blueprint.stages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((stage, index) => ({
      ...stage,
      orderIndex: index
    }));

    // Optimistic UI update
    setBlueprint({ ...blueprint, stages: updatedItems });

    // API Call
    try {
      await fetch('/api/stages/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: updatedItems.map(s => ({ id: s.id, orderIndex: s.orderIndex }))
        })
      });
    } catch (err) {
      console.error(err);
      fetchBlueprint(); // rollback
    }
  };

  // --- Rule Handlers ---
  const openRuleModal = (existingRule = null) => {
    setActiveRuleTab('before');
    setIsAddMenuOpen(false);
    if (existingRule) {
      setSelectedRule({
        id: existingRule.id,
        name: existingRule.name,
        toStageId: existingRule.toStageId,
        fromStageIds: existingRule.fromStages?.map(s => s.id) || [],
        isGlobal: existingRule.isGlobal,
        requiredFields: existingRule.requiredFields || [],
        necessaryFields: existingRule.necessaryFields || [],
        visibleFields: existingRule.visibleFields || [],
        executionCriteria: existingRule.executionCriteria || { type: 'all', conditions: [] },
        customMessage: existingRule.customMessage || "",
        hasCustomMessage: !!existingRule.customMessage,
        checklists: existingRule.checklists || [],
        afterActions: existingRule.afterActions || { emails: [], calls: [], fieldUpdates: [], createRecords: [], webhooks: [], customActions: [], tags: [] }
      });
    } else {
      setSelectedRule({
        id: null,
        name: "",
        toStageId: "",
        fromStageIds: [],
        isGlobal: false,
        requiredFields: [],
        necessaryFields: [],
        visibleFields: [],
        executionCriteria: { type: 'all', conditions: [] },
        customMessage: "",
        hasCustomMessage: false,
        checklists: [],
        afterActions: { emails: [], calls: [], fieldUpdates: [], createRecords: [], webhooks: [], customActions: [], tags: [] }
      });
    }
  };

  const handleSaveRule = async () => {
    if (!selectedRule.name || !selectedRule.toStageId) {
      alert("Button Name and Destination Stage are required");
      return;
    }

    try {
      if (selectedRule.id) {
        await fetch(`/api/transitions?id=${selectedRule.id}`, { method: 'DELETE' });
      }

      const res = await fetch('/api/transitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blueprintId: blueprint.id,
          name: selectedRule.name,
          toStageId: selectedRule.toStageId,
          fromStageIds: selectedRule.fromStageIds,
          isGlobal: selectedRule.isGlobal,
          visibleFields: selectedRule.visibleFields,
          requiredFields: selectedRule.requiredFields,
          necessaryFields: selectedRule.necessaryFields,
          executionCriteria: selectedRule.executionCriteria,
          customMessage: selectedRule.hasCustomMessage ? selectedRule.customMessage : null,
          checklists: selectedRule.checklists,
          afterActions: selectedRule.afterActions
        })
      });

      if (res.ok) {
        setSelectedRule(null);
        fetchBlueprint();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRule = () => {
    if (!selectedRule.id) return;
    showConfirm("Delete Rule", "Are you sure you want to remove this rule?", async () => {
      try {
        const res = await fetch(`/api/transitions?id=${selectedRule.id}`, { method: 'DELETE' });
        if (res.ok) {
          setSelectedRule(null);
          fetchBlueprint();
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  const toggleArrayItem = (array, item) => {
    if (array.includes(item)) return array.filter(i => i !== item);
    return [...array, item];
  };


  const renderModuleSelector = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#64748b' }}>Configure Module:</span>
      <select
        value={selectedModule}
        onChange={(e) => setSelectedModule(e.target.value)}
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          backgroundColor: 'white',
          fontWeight: 600,
          color: 'var(--primary)',
          fontSize: '1rem',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        <option value="Lead">Lead</option>
        <option value="Deal">Deal</option>
        <option value="Account">Account</option>
        <option value="Product">Product</option>
        <option value="Task">Task</option>
      </select>
    </div>
  );

  return (
    <>

      <main className="dashboard-main" style={{ height: '100vh', overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Admin Settings</h1>
          </div>
        </header>

        <div className="module-content" style={{ padding: '1rem', maxWidth: '1200px', overflowY: 'auto', flex: 1 }}>
          {isLoading ? (
            <FormSkeleton />
          ) : !blueprint || blueprint.error ? (
            <div>Failed to load blueprint: {blueprint?.error || "Unknown error"}</div>
          ) : currentView === 'hub' ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>

                {/* Customization Card */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: '#f3f4f6', padding: '0.5rem', borderRadius: '8px', color: '#475569' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" /><path d="m14 7 3 3" /><path d="M5 6v4" /><path d="M19 14v4" /><path d="M10 2v2" /><path d="M7 8H3" /><path d="M21 16h-4" /><path d="M11 3H9" /></svg>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Customization</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <button onClick={() => { setActiveFeature('layout-builder'); setCurrentView('module-list'); }} style={{ textAlign: 'left', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', borderRadius: '6px', transition: 'all 0.2s', fontWeight: 500 }} onMouseEnter={e => e.target.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}>
                      Form Layout Builder
                    </button>
                    <button onClick={() => { setActiveFeature('tags'); setCurrentView('module-list'); }} style={{ textAlign: 'left', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', borderRadius: '6px', transition: 'all 0.2s', fontWeight: 500 }} onMouseEnter={e => e.target.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}>
                      Manage Tags
                    </button>
                    <button onClick={() => { setActiveFeature('blueprint'); setCurrentView('module-list'); }} style={{ textAlign: 'left', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', borderRadius: '6px', transition: 'all 0.2s', fontWeight: 500 }} onMouseEnter={e => e.target.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}>
                      Blueprint Engine
                    </button>
                  </div>
                </div>

                {/* Developer Tools Card */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: '#f3f4f6', padding: '0.5rem', borderRadius: '8px', color: '#475569' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Developer</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <button onClick={() => setCurrentView('workflows')} style={{ textAlign: 'left', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', borderRadius: '6px', transition: 'all 0.2s', fontWeight: 500 }} onMouseEnter={e => e.target.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}>
                      Webhook Engine
                    </button>
                    <button onClick={() => setCurrentView('client-scripts')} style={{ textAlign: 'left', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', borderRadius: '6px', transition: 'all 0.2s', fontWeight: 500 }} onMouseEnter={e => e.target.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}>
                      Custom Scripts
                    </button>
                  </div>
                </div>

                {/* Users and Control Card */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: '#f3f4f6', padding: '0.5rem', borderRadius: '8px', color: '#475569' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Users & Control</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <button onClick={() => setCurrentView('profiles')} style={{ textAlign: 'left', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', borderRadius: '6px', transition: 'all 0.2s', fontWeight: 500 }} onMouseEnter={e => e.target.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}>
                      Roles & Profiles
                    </button>
                    <button onClick={() => setCurrentView('users')} style={{ textAlign: 'left', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', borderRadius: '6px', transition: 'all 0.2s', fontWeight: 500 }} onMouseEnter={e => e.target.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}>
                      Users & Invites
                    </button>
                  </div>
                </div>

                {/* Billing & Wallet Card */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: '#f3f4f6', padding: '0.5rem', borderRadius: '8px', color: '#475569' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Billing & Add-ons</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <button onClick={() => setCurrentView('billing')} style={{ textAlign: 'left', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', borderRadius: '6px', transition: 'all 0.2s', fontWeight: 500 }} onMouseEnter={e => e.target.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}>
                      Wallet & API Usage
                    </button>
                    <button onClick={() => window.location.href = '/settings/whatsapp'} style={{ textAlign: 'left', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.95rem', borderRadius: '6px', transition: 'all 0.2s', fontWeight: 500 }} onMouseEnter={e => e.target.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}>
                      WhatsApp API Setup
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="settings-container" style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)' }}>

              <div style={{ display: 'flex', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <button
                  onClick={() => {
                    if (isLayoutDirty) {
                      setShakeTrigger(prev => prev + 1);
                      return;
                    }
                    if (currentView === 'module-list') {
                      setCurrentView('hub');
                      setActiveFeature(null);
                    } else if (['layout-builder', 'blueprint', 'tags'].includes(currentView)) {
                      setCurrentView('module-list');
                    } else {
                      setCurrentView('hub');
                    }
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}
                >
                  ← Back to {currentView === 'module-list' ? 'Setup' : 'Modules'}
                </button>
                <div style={{ width: '1px', height: '24px', backgroundColor: '#cbd5e1', margin: '0 1.5rem' }}></div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
                    {currentView === 'module-list' && (
                      activeFeature === 'layout-builder' ? 'Form Layout Builder' :
                        activeFeature === 'tags' ? 'Manage Tags' :
                          activeFeature === 'blueprint' ? 'Blueprint Engine' :
                            'Select Module'
                    )}

                    {currentView === 'blueprint' && "Pipelines & Blueprint"}
                    {currentView === 'fields' && "Modules and Fields"}
                    {currentView === 'tags' && "Tag Definitions"}
                    {currentView === 'users' && "Users & Invitations"}
                    {currentView === 'workflows' && "Webhook Engine"}
                    {currentView === 'client-scripts' && "Custom Scripts"}
                    {currentView === 'layout-builder' && "Form Layout Builder"}
                    {currentView === 'billing' && "Billing & Wallet"}
                  </h2>

                </div>
              </div>

              <div style={{ padding: '1rem' }}>


                {/* MODULE LIST TAB */}
                {currentView === 'module-list' && (
                  <div>
                    <p style={{ color: '#475569', marginBottom: '1.5rem', fontSize: '0.95rem' }}>Select a module to customize its {activeFeature === 'tags' ? 'tags' : activeFeature === 'layout-builder' ? 'layout' : 'blueprint'}.</p>

                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <tr>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Module Name</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Last Modified</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Status</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['Lead', 'Deal', 'Account', 'Product', 'Task'].map((mod, idx) => (
                            <tr key={mod} style={{ borderBottom: idx === 4 ? 'none' : '1px solid #e2e8f0', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                              <td style={{ padding: '1rem', color: '#0f172a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: '0.35rem', borderRadius: '6px' }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                                </div>
                                {mod}
                              </td>
                              <td style={{ padding: '1rem', color: '#475569', fontSize: '0.9rem' }}>Just now</td>
                              <td style={{ padding: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                  <div style={{ position: 'relative', width: '36px', height: '20px', backgroundColor: '#10b981', borderRadius: '10px' }}>
                                    <div style={{ position: 'absolute', top: '2px', left: '18px', width: '16px', height: '16px', backgroundColor: 'white', borderRadius: '50%', transition: 'all 0.2s' }}></div>
                                  </div>
                                  <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>Active</span>
                                </label>
                              </td>
                              <td style={{ padding: '1rem', textAlign: 'right' }}>
                                <button
                                  onClick={() => { setSelectedModule(mod); setCurrentView(activeFeature); }}
                                  style={{ padding: '0.4rem 1rem', backgroundColor: 'white', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                                  onMouseEnter={e => e.target.style.backgroundColor = '#f8fafc'}
                                  onMouseLeave={e => e.target.style.backgroundColor = 'white'}
                                >
                                  Customize
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* WORKFLOWS TAB */}
                {currentView === 'workflows' && (
                  <WorkflowBuilder />
                )}

                {/* CLIENT SCRIPTS TAB */}
                {currentView === 'client-scripts' && (
                  <ClientScriptBuilder />
                )}

                {/* USERS TAB */}
                {currentView === 'users' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                      <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Users in Organization</h2>
                        <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Manage active members and pending AWS SES invitations.</p>
                      </div>
                      <button onClick={() => setIsInviteModalOpen(true)} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                        Invite User
                      </button>
                    </div>

                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <tr>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Email Address</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>RBAC Profile</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Status</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '1rem', color: '#0f172a', fontWeight: 500 }}>gaurav.test@gmail.com</td>
                            <td style={{ padding: '1rem' }}><span style={{ backgroundColor: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Admin</span></td>
                            <td style={{ padding: '1rem' }}><span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>● Active</span></td>
                            <td style={{ padding: '1rem' }}>
                              <button style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>Revoke Access</button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* BLUEPRINT TAB */}
                {currentView === 'blueprint' && (
                  <div>
                    <div style={{ marginBottom: '2rem' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Live Pipeline Preview</h2>
                      {/* CSS Pipeline Visualization (Read-Only) */}
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0', padding: '1rem 0', overflowX: 'auto', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', paddingLeft: '1rem' }}>
                        {blueprint.stages.map((stage, index) => {
                          const nextStage = blueprint.stages[index + 1];
                          return (
                            <React.Fragment key={stage.id}>
                              <div style={{
                                border: '2px solid #e2e8f0', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600,
                                backgroundColor: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)', flexShrink: 0
                              }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: stage.color }}></div>
                                {stage.name}
                              </div>
                              {nextStage && (
                                <div style={{ flex: 1, minWidth: '40px', height: '3px', background: '#cbd5e1', position: 'relative', margin: '0 4px' }}>
                                  <div style={{ position: 'absolute', right: 0, top: '-4.5px', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: `8px solid #cbd5e1` }}></div>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                        {blueprint.stages.length === 0 && <span style={{ color: '#94a3b8' }}>No stages created yet.</span>}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                      {/* STAGE MANAGER (Drag & Drop) */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>1. Stage Manager</h3>
                          <button className="btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }} onClick={() => setIsAddingStage(!isAddingStage)}>
                            {isAddingStage ? 'Cancel' : '+ Add Stage'}
                          </button>
                        </div>

                        {isAddingStage && (
                          <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                            <input required type="text" placeholder="Stage Name" className="form-input bg-white" style={{ marginBottom: '0.5rem' }} value={newStage.name} onChange={e => setNewStage({ ...newStage, name: e.target.value })} />
                            <select className="form-input bg-white" style={{ marginBottom: '1rem' }} value={newStage.color} onChange={e => setNewStage({ ...newStage, color: e.target.value })}>
                              <option value="#fde68a">Yellow</option>
                              <option value="#fed7aa">Orange</option>
                              <option value="#c4b5fd">Purple</option>
                              <option value="#fbcfe8">Pink</option>
                              <option value="#a7f3d0">Green</option>
                              <option value="#bfdbfe">Blue</option>
                              <option value="#fca5a5">Red</option>
                            </select>
                            <button onClick={handleAddStage} className="btn-primary" style={{ width: '100%' }}>Save Stage</button>
                          </div>
                        )}

                        <DragDropContext onDragEnd={handleDragEnd}>
                          <Droppable droppableId="stages">
                            {(provided) => (
                              <div {...provided.droppableProps} ref={provided.innerRef}>
                                {blueprint.stages.map((stage, index) => (
                                  <Draggable key={stage.id} draggableId={stage.id} index={index}>
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        style={{
                                          padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px',
                                          marginBottom: '0.5rem', background: 'white', display: 'flex',
                                          justifyContent: 'space-between', alignItems: 'center',
                                          ...provided.draggableProps.style
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                          <div style={{ cursor: 'grab', color: '#cbd5e1' }}>⋮⋮</div>
                                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: stage.color }}></div>
                                          <span style={{ fontWeight: 500 }}>{stage.name}</span>
                                        </div>
                                        <button onClick={() => handleDeleteStage(stage.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </DragDropContext>
                      </div>

                      {/* RULES MANAGER */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>2. Rules Manager</h3>
                          <button className="btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', background: '#10b981' }} onClick={() => openRuleModal()}>
                            + Create Rule
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {blueprint.transitions.length === 0 && <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No transition rules created.</p>}
                          {blueprint.transitions.map(t => {
                            const destStage = blueprint.stages.find(s => s.id === t.toStageId);
                            return (
                              <div
                                key={t.id}
                                onClick={() => openRuleModal(t)}
                                style={{ padding: '1rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                              >
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '0.25rem' }}>{t.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    {t.isGlobal ? "From Any Stage" : `From ${t.fromStages?.length || 0} Stage(s)`} ➔ To {destStage?.name || "Unknown"}
                                  </div>
                                </div>
                                <div style={{ color: '#cbd5e1' }}>➔</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* LAYOUT BUILDER TAB */}
                {currentView === 'layout-builder' && (
                  <LayoutBuilder selectedModule={selectedModule} onDirtyChange={setIsLayoutDirty} shakeTrigger={shakeTrigger} />
                )}

                {/* FIELDS TAB */}
                {currentView === 'fields' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{selectedModule} Fields</h2>
                      <button className="btn-primary" onClick={() => setIsAddingField(!isAddingField)}>
                        {isAddingField ? 'Cancel' : '+ Add Field'}
                      </button>
                    </div>

                    {isAddingField && (
                      <form onSubmit={handleAddField} style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                          <div>
                            <label className="form-label">Field Label (e.g. Lead Source)</label>
                            <input required type="text" className="form-input bg-white" value={newField.label} onChange={e => setNewField({ ...newField, label: e.target.value })} />
                          </div>
                          <div>
                            <label className="form-label">Field Type</label>
                            <select className="form-input bg-white" value={newField.type} onChange={e => setNewField({ ...newField, type: e.target.value })}>
                              <option value="text">Short Text</option>
                              <option value="textarea">Long Text (Text area)</option>
                              <option value="number">Number</option>
                              <option value="currency">Currency</option>
                              <option value="date">Date</option>
                              <option value="checkbox">Checkbox (True/False)</option>
                              <option value="select">Dropdown (Select)</option>
                              <option value="lookup">Lookup (Relationship)</option>
                              <option value="subform">Subform</option>
                            </select>
                          </div>
                          {newField.type === 'select' && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <label className="form-label">Dropdown Options (Comma Separated)</label>
                              <input
                                required
                                type="text"
                                className="form-input bg-white"
                                placeholder="e.g. Enterprise, Mid-Market, Startup"
                                value={newField.options || ''}
                                onChange={e => setNewField({ ...newField, options: e.target.value })}
                              />
                            </div>
                          )}

                          {newField.type === 'lookup' && (
                            <div style={{ gridColumn: '1 / -1', padding: '1.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                              <h4 style={{ fontWeight: 600, fontSize: '1rem', color: '#334155', margin: 0 }}>Advanced Lookup Configuration</h4>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                  <label className="form-label">Target Module (Which module to link to?)</label>
                                  <select className="form-input bg-white" value={newField.targetModule || 'Account'} onChange={e => setNewField({ ...newField, targetModule: e.target.value })}>
                                    {['Lead', 'Deal', 'Account', 'Product', 'Task'].map(m => (
                                      <option key={m} value={m}>{m}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="form-label">Public Read/Write</label>
                                  <div style={{ display: 'flex', alignItems: 'center', height: '42px', gap: '0.5rem' }}>
                                    <input type="checkbox" checked={newField.isPublic !== false} onChange={e => setNewField({ ...newField, isPublic: e.target.checked })} style={{ width: '1.25rem', height: '1.25rem' }} />
                                    <span style={{ fontSize: '0.875rem', color: '#475569' }}>Allow all users to view/select</span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                  <label className="form-label">Bi-Directional Related List</label>
                                  <div style={{ display: 'flex', alignItems: 'center', height: '42px', gap: '0.5rem' }}>
                                    <input type="checkbox" checked={newField.isBiDirectional || false} onChange={e => setNewField({ ...newField, isBiDirectional: e.target.checked })} style={{ width: '1.25rem', height: '1.25rem' }} />
                                    <span style={{ fontSize: '0.875rem', color: '#475569' }}>Show on Target Module</span>
                                  </div>
                                </div>
                                {newField.isBiDirectional && (
                                  <div>
                                    <label className="form-label">Related List Title</label>
                                    <input required type="text" className="form-input bg-white" placeholder="e.g. Associated Deals" value={newField.relatedListLabel || ''} onChange={e => setNewField({ ...newField, relatedListLabel: e.target.value })} />
                                  </div>
                                )}
                              </div>

                              {/* NEW: Filter Builder */}
                              <div>
                                <label className="form-label">Filter Lookup Records (Optional)</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  {(newField.filters || []).map((filter, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                      {/* Target Module Field Dropdown */}
                                      <select className="form-input bg-white" style={{ flex: 1 }} value={filter.field || ''} onChange={e => {
                                        const f = [...(newField.filters || [])];
                                        f[idx].field = e.target.value;
                                        setNewField({ ...newField, filters: f });
                                      }}>
                                        <option value="" disabled>Select Target Field...</option>
                                        <optgroup label="Standard Fields">
                                          {getNativeFields(newField.targetModule).map(tf => (
                                            <option key={tf.name} value={tf.name}>{tf.label}</option>
                                          ))}
                                        </optgroup>
                                        <optgroup label="Custom Fields">
                                          {(targetBlueprint?.fields || []).map(tf => (
                                            <option key={tf.name} value={tf.name}>{tf.label}</option>
                                          ))}
                                        </optgroup>
                                      </select>

                                      {/* Operator Dropdown */}
                                      <select className="form-input bg-white" style={{ width: '130px' }} value={filter.operator || 'is'} onChange={e => {
                                        const f = [...(newField.filters || [])];
                                        f[idx].operator = e.target.value;
                                        setNewField({ ...newField, filters: f });
                                      }}>
                                        <option value="is">Is</option>
                                        <option value="is_not">Isn't</option>
                                        <option value="contains">Contains</option>
                                        <option value="does_not_contain">Doesn't Contain</option>
                                        <option value="starts_with">Starts With</option>
                                        <option value="ends_with">Ends With</option>
                                      </select>

                                      {/* Match Type Dropdown */}
                                      <select className="form-input bg-white" style={{ width: '100px' }} value={filter.matchType || 'value'} onChange={e => {
                                        const f = [...(newField.filters || [])];
                                        f[idx].matchType = e.target.value;
                                        f[idx].value = ''; // Reset value when switching type
                                        setNewField({ ...newField, filters: f });
                                      }}>
                                        <option value="value">Value</option>
                                        <option value="field">Field</option>
                                      </select>

                                      {/* Value Input OR Current Module Field Dropdown */}
                                      {filter.matchType === 'field' ? (
                                        <select className="form-input bg-white" style={{ flex: 1 }} value={filter.value || ''} onChange={e => {
                                          const f = [...(newField.filters || [])];
                                          f[idx].value = e.target.value;
                                          setNewField({ ...newField, filters: f });
                                        }}>
                                          <option value="" disabled>Select Current Field...</option>
                                          <optgroup label="Standard Fields">
                                            {getNativeFields(selectedModule).map(cf => (
                                              <option key={cf.name} value={cf.name}>{cf.label}</option>
                                            ))}
                                          </optgroup>
                                          <optgroup label="Custom Fields">
                                            {(blueprint?.fields || []).map(cf => (
                                              <option key={cf.name} value={cf.name}>{cf.label}</option>
                                            ))}
                                          </optgroup>
                                        </select>
                                      ) : (
                                        <input type="text" className="form-input bg-white" style={{ flex: 1 }} placeholder="Value (e.g. Active)" value={filter.value || ''} onChange={e => {
                                          const f = [...(newField.filters || [])];
                                          f[idx].value = e.target.value;
                                          setNewField({ ...newField, filters: f });
                                        }} />
                                      )}

                                      <button type="button" onClick={() => {
                                        const f = [...(newField.filters || [])];
                                        f.splice(idx, 1);
                                        setNewField({ ...newField, filters: f });
                                      }} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}>✕</button>
                                    </div>
                                  ))}
                                  <button type="button" onClick={() => {
                                    const f = [...(newField.filters || [])];
                                    f.push({ field: '', operator: 'is', matchType: 'value', value: '' });
                                    setNewField({ ...newField, filters: f });
                                  }} style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '0.25rem' }}>
                                    + Add Filter Rule
                                  </button>
                                </div>
                              </div>

                              {/* NEW: Mappings Builder */}
                              <div>
                                <label className="form-label">Auto-Fill Mappings</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  {(newField.mappings || []).map((mapping, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                      <select className="form-input bg-white" style={{ flex: 1 }} value={mapping.sourceField || ''} onChange={e => {
                                        const m = [...(newField.mappings || [])];
                                        m[idx].sourceField = e.target.value;
                                        setNewField({ ...newField, mappings: m });
                                      }}>
                                        <option value="" disabled>Select Target Module Field...</option>
                                        <optgroup label="Standard Fields">
                                          {getNativeFields(newField.targetModule).map(tf => (
                                            <option key={tf.name} value={tf.name}>{tf.label}</option>
                                          ))}
                                        </optgroup>
                                        <optgroup label="Custom Fields">
                                          {(targetBlueprint?.fields || []).map(tf => (
                                            <option key={tf.name} value={tf.name}>{tf.label}</option>
                                          ))}
                                        </optgroup>
                                      </select>
                                      <span style={{ color: '#64748b', fontSize: '1.2rem' }}>➔</span>
                                      <select className="form-input bg-white" style={{ flex: 1 }} value={mapping.targetField || ''} onChange={e => {
                                        const m = [...(newField.mappings || [])];
                                        m[idx].targetField = e.target.value;
                                        setNewField({ ...newField, mappings: m });
                                      }}>
                                        <option value="" disabled>Select Current Module Field...</option>
                                        <optgroup label="Standard Fields">
                                          {getNativeFields(selectedModule).map(cf => (
                                            <option key={cf.name} value={cf.name}>{cf.label}</option>
                                          ))}
                                        </optgroup>
                                        <optgroup label="Custom Fields">
                                          {(blueprint?.fields || []).map(cf => (
                                            <option key={cf.name} value={cf.name}>{cf.label}</option>
                                          ))}
                                        </optgroup>
                                      </select>
                                      <button type="button" onClick={() => {
                                        const m = [...(newField.mappings || [])];
                                        m.splice(idx, 1);
                                        setNewField({ ...newField, mappings: m });
                                      }} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}>✕</button>
                                    </div>
                                  ))}
                                  <button type="button" onClick={() => {
                                    const m = [...(newField.mappings || [])];
                                    m.push({ sourceField: '', targetField: '' });
                                    setNewField({ ...newField, mappings: m });
                                  }} style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '0.25rem' }}>
                                    + Add Auto-Fill Mapping
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {newField.type === 'subform' && (
                            <div style={{ gridColumn: '1 / -1', padding: '1.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                              <h4 style={{ fontWeight: 600, fontSize: '1rem', color: '#334155', margin: '0 0 1rem 0' }}>Subform Column Builder</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {(newField.subformFields || []).map((col, idx) => (
                                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: 'white', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                    <input
                                      type="text"
                                      className="form-input"
                                      placeholder="Column Label (e.g. Quantity)"
                                      value={col.label || ''}
                                      style={{ flex: 1 }}
                                      onChange={e => {
                                        const sf = [...(newField.subformFields || [])];
                                        sf[idx].label = e.target.value;
                                        // Auto-generate name from label if name is empty
                                        if (!sf[idx].name || sf[idx].name === sf[idx].label.toLowerCase().replace(/ /g, '_').substring(0, sf[idx].label.length - 1)) {
                                          sf[idx].name = e.target.value.toLowerCase().replace(/ /g, '_');
                                        }
                                        setNewField({ ...newField, subformFields: sf });
                                      }}
                                    />
                                    <input
                                      type="text"
                                      className="form-input"
                                      placeholder="API Name (e.g. quantity)"
                                      value={col.name || ''}
                                      style={{ flex: 1 }}
                                      onChange={e => {
                                        const sf = [...(newField.subformFields || [])];
                                        sf[idx].name = e.target.value.toLowerCase().replace(/ /g, '_');
                                        setNewField({ ...newField, subformFields: sf });
                                      }}
                                    />
                                    <select
                                      className="form-input"
                                      value={col.type || 'text'}
                                      style={{ flex: 1 }}
                                      onChange={e => {
                                        const sf = [...(newField.subformFields || [])];
                                        sf[idx].type = e.target.value;
                                        setNewField({ ...newField, subformFields: sf });
                                      }}
                                    >
                                      <option value="text">Short Text</option>
                                      <option value="number">Number</option>
                                      <option value="currency">Currency</option>
                                      <option value="date">Date</option>
                                      <option value="checkbox">Checkbox (True/False)</option>
                                      <option value="select">Dropdown (Select)</option>
                                    </select>
                                    {col.type === 'select' && (
                                      <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Options (Comma separated)"
                                        value={col.options ? col.options.join(', ') : ''}
                                        style={{ flex: 1 }}
                                        onChange={e => {
                                          const sf = [...(newField.subformFields || [])];
                                          sf[idx].options = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                                          setNewField({ ...newField, subformFields: sf });
                                        }}
                                      />
                                    )}
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                                      <input
                                        type="checkbox"
                                        checked={col.isRequired || false}
                                        onChange={e => {
                                          const sf = [...(newField.subformFields || [])];
                                          sf[idx].isRequired = e.target.checked;
                                          setNewField({ ...newField, subformFields: sf });
                                        }}
                                      />
                                      Required
                                    </label>
                                    <button type="button" onClick={() => {
                                      const sf = [...(newField.subformFields || [])];
                                      sf.splice(idx, 1);
                                      setNewField({ ...newField, subformFields: sf });
                                    }} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}>✕</button>
                                  </div>
                                ))}
                                <button type="button" onClick={() => {
                                  const sf = [...(newField.subformFields || [])];
                                  sf.push({ name: '', label: '', type: 'text', isRequired: false });
                                  setNewField({ ...newField, subformFields: sf });
                                }} style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '0.25rem' }}>
                                  + Add Column
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        <button type="submit" className="btn-primary">Save Field</button>
                      </form>
                    )}

                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 500 }}>Label</th>
                          <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 500 }}>Database ID</th>
                          <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 500 }}>Type</th>
                          <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blueprint.fields.map(field => (
                          <tr key={field.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '1rem', fontWeight: 500 }}>{field.label}</td>
                            <td style={{ padding: '1rem', color: '#64748b', fontFamily: 'monospace' }}>{field.name}</td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{ backgroundColor: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem' }}>{field.type}</span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                              <button onClick={() => handleDeleteField(field.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* TAGS TAB */}
                {currentView === 'tags' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Tag Definitions</h2>
                      <button className="btn-primary" onClick={() => setIsAddingTag(!isAddingTag)}>
                        {isAddingTag ? 'Cancel' : '+ Add Tag'}
                      </button>
                    </div>

                    {isAddingTag && (
                      <form onSubmit={handleAddTag} style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                          <div>
                            <label className="form-label">Tag Name (e.g. VIP)</label>
                            <input required type="text" className="form-input bg-white" value={newTag.name} onChange={e => setNewTag({ ...newTag, name: e.target.value })} />
                          </div>
                          <div>
                            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Tag Color</span>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontWeight: 'normal', fontSize: '0.85rem' }}>
                                <input type="checkbox" checked={newTag.customColor} onChange={e => setNewTag({ ...newTag, customColor: e.target.checked })} />
                                Use Custom Color
                              </label>
                            </label>
                            {newTag.customColor ? (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input type="color" value={newTag.color} onChange={e => setNewTag({ ...newTag, color: e.target.value })} style={{ height: '42px', padding: '0', cursor: 'pointer' }} />
                                <input type="text" className="form-input bg-white" value={newTag.color} onChange={e => setNewTag({ ...newTag, color: e.target.value })} style={{ flex: 1 }} />
                              </div>
                            ) : (
                              <select className="form-input bg-white" value={newTag.color} onChange={e => setNewTag({ ...newTag, color: e.target.value })}>
                                <option value="#ef4444">Red</option>
                                <option value="#f97316">Orange</option>
                                <option value="#eab308">Yellow</option>
                                <option value="#22c55e">Green</option>
                                <option value="#0ea5e9">Blue</option>
                                <option value="#8b5cf6">Purple</option>
                                <option value="#ec4899">Pink</option>
                                <option value="#64748b">Slate</option>
                              </select>
                            )}
                          </div>
                        </div>
                        <button type="submit" className="btn-primary">Save Tag</button>
                      </form>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                      {tags.length === 0 && <p style={{ color: '#64748b' }}>No tags defined yet.</p>}
                      {tags.map(tag => (
                        <div key={tag.id} style={{ padding: '1rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: tag.color }}></div>
                            <span style={{ fontWeight: 500 }}>{tag.name}</span>
                          </div>
                          <button onClick={() => handleDeleteTag(tag.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PROFILES TAB */}
                {currentView === 'profiles' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Roles & Profiles</h2>
                      <button className="btn-primary" onClick={() => {
                        setSelectedProfile({
                          name: '',
                          canAccessSettings: false,
                          canExportData: false,
                          permissions: {
                            Lead: { view: false, create: false, edit: false, delete: false },
                            Account: { view: false, create: false, edit: false, delete: false },
                            Task: { view: false, create: false, edit: false, delete: false },
                            Product: { view: false, create: false, edit: false, delete: false }
                          }
                        });
                        setIsProfileModalOpen(true);
                      }}>+ New Profile</button>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {profiles.map(profile => (
                        <div key={profile.id} style={{ padding: '1.5rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#0f172a' }}>{profile.name}</h3>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
                              <span>Admin: {profile.canAccessSettings ? 'Yes' : 'No'}</span>
                              <span>Export: {profile.canExportData ? 'Yes' : 'No'}</span>
                            </div>
                          </div>
                          <button className="btn-outline" onClick={() => {
                            setSelectedProfile(profile);
                            setIsProfileModalOpen(true);
                          }}>Edit Permissions</button>
                        </div>
                      ))}
                      {profiles.length === 0 && <p>No profiles found.</p>}
                    </div>
                  </div>
                )}

                {/* BILLING TAB */}
                {currentView === 'billing' && (
                  <WalletDashboard />
                )}

              </div>
            </div>
          )}
        </div>
      </main>

      {/* RULE MODAL */}
      {selectedRule && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '2.5rem', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>{selectedRule.id ? 'Edit Rule' : 'Create New Rule'}</h2>
              <button onClick={() => setSelectedRule(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Button Name</label>
                <input type="text" className="form-input" placeholder="e.g. Qualify Lead" value={selectedRule.name} onChange={e => setSelectedRule({ ...selectedRule, name: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 600 }}>

                  <span>From Stage(s)</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: 'var(--primary)' }}>
                    <input type="checkbox" checked={selectedRule.isGlobal} onChange={e => setSelectedRule({ ...selectedRule, isGlobal: e.target.checked })} />
                    Global (All)
                  </label>
                </label>

                {!selectedRule.isGlobal && (
                  <div style={{ position: 'relative' }}>

                    <div
                      onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
                      style={{
                        border: '1px solid #e2e8f0', padding: '0.5rem 1rem', borderRadius: '8px',
                        background: 'white', cursor: 'pointer', display: 'flex',
                        justifyContent: 'space-between', alignItems: 'center', minHeight: '42px'
                      }}
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {selectedRule.fromStageIds.length === 0 ? (
                          <span style={{ color: '#94a3b8' }}>Select stages...</span>
                        ) : (
                          selectedRule.fromStageIds.map(id => {
                            const stage = blueprint.stages.find(s => s.id === id);
                            return stage ? (
                              <span key={id} style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid #e2e8f0' }}>
                                {stage.name}
                              </span>
                            ) : null;
                          })
                        )}
                      </div>
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>▼</span>
                    </div>

                    {isStageDropdownOpen && (
                      <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setIsStageDropdownOpen(false)}></div>
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.25rem',
                          background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 20,
                          maxHeight: '200px', overflowY: 'auto', padding: '0.5rem'
                        }}>
                          {blueprint.stages.map(stage => {
                            const isDisabled = stage.id === selectedRule.toStageId;
                            return (
                              <label key={stage.id} style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem',
                                cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.5 : 1,
                                borderRadius: '4px', transition: 'background 0.2s', margin: 0
                              }} onMouseEnter={e => { if (!isDisabled) e.currentTarget.style.background = '#f8fafc' }} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <input
                                  type="checkbox"
                                  disabled={isDisabled}
                                  checked={selectedRule.fromStageIds.includes(stage.id)}
                                  onChange={() => setSelectedRule({ ...selectedRule, fromStageIds: toggleArrayItem(selectedRule.fromStageIds, stage.id) })}
                                />
                                <span style={{ fontSize: '0.875rem' }}>{stage.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Destination Stage (To)</label>
                <select className="form-input" value={selectedRule.toStageId || ""} onChange={e => {
                  const newToId = e.target.value;
                  const newFromIds = selectedRule.fromStageIds.filter(id => id !== newToId);
                  setSelectedRule({ ...selectedRule, toStageId: newToId, fromStageIds: newFromIds });
                }}>
                  <option value="" disabled>Select Destination Stage</option>
                  {blueprint.stages.map(s => (
                    <option
                      key={s.id}
                      value={s.id}
                      disabled={selectedRule.fromStageIds.includes(s.id)}
                    >
                      {s.name} {selectedRule.fromStageIds.includes(s.id) ? "(Selected in From)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <button
                onClick={() => setActiveRuleTab('before')}
                style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeRuleTab === 'before' ? '2px solid var(--primary)' : '2px solid transparent', color: activeRuleTab === 'before' ? 'var(--primary)' : '#64748b', fontWeight: 600, cursor: 'pointer' }}
              >
                Before
              </button>
              <button
                onClick={() => setActiveRuleTab('during')}
                style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeRuleTab === 'during' ? '2px solid var(--primary)' : '2px solid transparent', color: activeRuleTab === 'during' ? 'var(--primary)' : '#64748b', fontWeight: 600, cursor: 'pointer' }}
              >
                During
              </button>
              <button
                onClick={() => setActiveRuleTab('after')}
                style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeRuleTab === 'after' ? '2px solid var(--primary)' : '2px solid transparent', color: activeRuleTab === 'after' ? 'var(--primary)' : '#64748b', fontWeight: 600, cursor: 'pointer' }}
              >
                After
              </button>
            </div>

            <div style={{ minHeight: '300px' }}>

              {activeRuleTab === 'before' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>



                  <div style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Execution Criteria</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {(selectedRule.executionCriteria.conditions || []).length === 0 && (
                        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0, fontStyle: 'italic' }}>
                          This rule currently applies to all records. Add a condition to restrict it.
                        </p>
                      )}

                      {(selectedRule.executionCriteria.conditions || []).map((cond, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {idx > 0 && (
                            <div style={{ paddingLeft: '2rem' }}>
                              <select
                                className="form-input"
                                style={{ width: '80px', padding: '0.1rem 0.5rem', fontSize: '0.8rem', background: '#f8fafc' }}
                                value={cond.logical || 'AND'}
                                onChange={e => {
                                  const newConds = [...(selectedRule.executionCriteria.conditions || [])];
                                  newConds[idx].logical = e.target.value;
                                  setSelectedRule({ ...selectedRule, executionCriteria: { ...selectedRule.executionCriteria, conditions: newConds } });
                                }}
                              >
                                <option value="AND">AND</option>
                                <option value="OR">OR</option>
                              </select>
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <select className="form-input" style={{ width: '200px' }} value={cond.field} onChange={e => {
                              const newConds = [...(selectedRule.executionCriteria.conditions || [])];
                              newConds[idx].field = e.target.value;
                              setSelectedRule({ ...selectedRule, executionCriteria: { ...selectedRule.executionCriteria, conditions: newConds } });
                            }}>
                              <option value="">Select Field</option>
                              <optgroup label="Standard Fields">
                                <option value="firstName">First Name</option>
                                <option value="lastName">Last Name</option>
                                <option value="email">Email</option>
                                <option value="phone">Phone</option>
                                <option value="owner">Owner</option>
                              </optgroup>
                              {blueprint.fields.length > 0 && (
                                <optgroup label="Custom Fields">
                                  {blueprint.fields.map(f => <option key={f.id} value={f.name}>{f.label}</option>)}
                                </optgroup>
                              )}
                            </select>
                            <select className="form-input" style={{ width: '150px' }} value={cond.operator} onChange={e => {
                              const newConds = [...(selectedRule.executionCriteria.conditions || [])];
                              newConds[idx].operator = e.target.value;
                              setSelectedRule({ ...selectedRule, executionCriteria: { ...selectedRule.executionCriteria, conditions: newConds } });
                            }}>
                              <option value="is">is</option>
                              <option value="isn't">isn't</option>
                              <option value="contains">contains</option>
                              <option value="doesn't contain">doesn't contain</option>
                              <option value="starts with">starts with</option>
                              <option value="ends with">ends with</option>
                              <option value="is empty">is empty</option>
                              <option value="is not empty">is not empty</option>
                            </select>
                            {!['is empty', 'is not empty'].includes(cond.operator) && (
                              <input type="text" className="form-input" style={{ flex: 1 }} placeholder="Value" value={cond.value} onChange={e => {
                                const newConds = [...(selectedRule.executionCriteria.conditions || [])];
                                newConds[idx].value = e.target.value;
                                setSelectedRule({ ...selectedRule, executionCriteria: { ...selectedRule.executionCriteria, conditions: newConds } });
                              }} />
                            )}
                            <button onClick={() => {
                              const newConds = (selectedRule.executionCriteria.conditions || []).filter((_, i) => i !== idx);
                              setSelectedRule({ ...selectedRule, executionCriteria: { ...selectedRule.executionCriteria, conditions: newConds } });
                            }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
                          </div>
                        </div>
                      ))}
                      <button onClick={() => {
                        const newConds = [...(selectedRule.executionCriteria.conditions || []), { field: '', operator: 'is', value: '' }];
                        setSelectedRule({ ...selectedRule, executionCriteria: { ...selectedRule.executionCriteria, conditions: newConds } });
                      }} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 500, padding: 0 }}>+ Add Condition</button>
                    </div>
                  </div>
                </div>
              )}

              {activeRuleTab === 'during' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem', position: 'relative' }} ref={addMenuRef}>
                    <button onClick={() => { setIsAddMenuOpen(!isAddMenuOpen); setIsFieldMenuOpen(false); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>+</span> Add
                    </button>
                    {isAddMenuOpen && (
                      <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10, padding: '0.5rem', width: '200px', display: 'flex', flexDirection: 'column' }}>
                        <button onClick={() => {
                          if (!selectedRule.hasCustomMessage) setSelectedRule({ ...selectedRule, hasCustomMessage: true });
                          setIsAddMenuOpen(false);
                          setIsFieldMenuOpen(false);
                        }} style={{ padding: '0.5rem', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '4px' }} onMouseEnter={e => e.target.style.background = '#f8fafc'} onMouseLeave={e => e.target.style.background = 'transparent'}>Message</button>
                        <button onClick={() => {
                          setSelectedRule({ ...selectedRule, checklists: [...selectedRule.checklists, ""] });
                          setIsAddMenuOpen(false);
                          setIsFieldMenuOpen(false);
                        }} style={{ padding: '0.5rem', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '4px' }} onMouseEnter={e => e.target.style.background = '#f8fafc'} onMouseLeave={e => e.target.style.background = 'transparent'}>Checklists</button>

                        {/* New Add Field Button */}
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => setIsFieldMenuOpen(!isFieldMenuOpen)}
                            style={{ padding: '0.5rem', textAlign: 'left', background: isFieldMenuOpen ? '#f8fafc' : 'none', border: 'none', cursor: 'pointer', borderRadius: '4px', width: '100%' }}
                            onMouseEnter={e => e.target.style.background = '#f8fafc'}
                            onMouseLeave={e => e.target.style.background = isFieldMenuOpen ? '#f8fafc' : 'transparent'}
                          >
                            Field Requirements
                          </button>
                          {/* Dropdown for fields not yet added */}
                          {isFieldMenuOpen && (
                            <div style={{ position: 'absolute', top: 0, right: '100%', marginRight: '0.5rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 11, padding: '0.5rem', width: '200px', display: 'flex', flexDirection: 'column', maxHeight: '250px', overflowY: 'auto' }}>
                              {blueprint.fields.length === 0 ? (
                                <div style={{ padding: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>No fields available</div>
                              ) : (
                                blueprint.fields.map(f => {
                                  const isChecked = (selectedRule.visibleFields || []).includes(f.name);
                                  return (
                                    <label key={f.name} style={{
                                      display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem',
                                      cursor: 'pointer', borderRadius: '4px', transition: 'background 0.2s', margin: 0
                                    }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          let newVisible = toggleArrayItem(selectedRule.visibleFields || [], f.name);
                                          let newMandatory = selectedRule.requiredFields || [];
                                          let newDoubleVerify = selectedRule.necessaryFields || [];
                                          if (!newVisible.includes(f.name)) {
                                            newMandatory = newMandatory.filter(n => n !== f.name);
                                            newDoubleVerify = newDoubleVerify.filter(n => n !== f.name);
                                          }
                                          setSelectedRule({ ...selectedRule, visibleFields: newVisible, requiredFields: newMandatory, necessaryFields: newDoubleVerify });
                                        }}
                                      />
                                      <span style={{ userSelect: 'none' }}>{f.label}</span>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedRule.hasCustomMessage && (
                    <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', position: 'relative' }}>
                      <button onClick={() => setSelectedRule({ ...selectedRule, hasCustomMessage: false, customMessage: "" })} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                      <label className="form-label">Custom Message</label>
                      <input type="text" className="form-input bg-white" placeholder="e.g. Please verify the following details before proceeding." value={selectedRule.customMessage} onChange={e => setSelectedRule({ ...selectedRule, customMessage: e.target.value })} />
                    </div>
                  )}

                  {selectedRule.checklists?.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label className="form-label">Checklists</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {selectedRule.checklists.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <div style={{ color: '#cbd5e1' }}>⋮⋮</div>
                            <input type="text" className="form-input bg-white" style={{ flex: 1 }} placeholder="Checklist item (e.g. Verify ID)" value={item} onChange={e => {
                              const newLists = [...selectedRule.checklists];
                              newLists[idx] = e.target.value;
                              setSelectedRule({ ...selectedRule, checklists: newLists });
                            }} />
                            <button onClick={() => {
                              const newLists = selectedRule.checklists.filter((_, i) => i !== idx);
                              setSelectedRule({ ...selectedRule, checklists: newLists });
                            }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(selectedRule.visibleFields || []).length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label className="form-label">Field Requirements (High-Friction Engine)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                        {(selectedRule.visibleFields || []).map(fieldName => {
                          const field = blueprint.fields.find(f => f.name === fieldName);
                          if (!field) return null;
                          const isRequired = selectedRule.requiredFields?.includes(field.name) || false;
                          const isNecessary = selectedRule.necessaryFields?.includes(field.name) || false;
                          return (
                            <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: '2rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                              <div style={{ width: '150px', fontWeight: 500 }}>{field.label}</div>

                              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Always Visible</span>

                              {/* 2. MANDATORY CHECKBOX */}
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={isRequired}
                                  onChange={() => {
                                    let newMandatory = toggleArrayItem(selectedRule.requiredFields, field.name);
                                    let newDoubleVerify = selectedRule.necessaryFields;

                                    // If unchecking Mandatory, force uncheck DoubleVerify
                                    if (!newMandatory.includes(field.name)) {
                                      newDoubleVerify = newDoubleVerify.filter(n => n !== field.name);
                                    }
                                    setSelectedRule({ ...selectedRule, requiredFields: newMandatory, necessaryFields: newDoubleVerify });
                                  }}
                                />
                                Mandatory
                              </label>

                              {/* 3. DOUBLE-VERIFY CHECKBOX */}
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isRequired ? 'pointer' : 'not-allowed', fontSize: '0.875rem', opacity: isRequired ? 1 : 0.5 }}>
                                <input
                                  type="checkbox"
                                  disabled={!isRequired}
                                  checked={isNecessary}
                                  onChange={() => setSelectedRule({ ...selectedRule, necessaryFields: toggleArrayItem(selectedRule.necessaryFields, field.name) })}
                                />
                                Double-Verify
                              </label>

                              <button onClick={() => {
                                let newVisible = (selectedRule.visibleFields || []).filter(n => n !== field.name);
                                let newMandatory = (selectedRule.requiredFields || []).filter(n => n !== field.name);
                                let newDoubleVerify = (selectedRule.necessaryFields || []).filter(n => n !== field.name);
                                setSelectedRule({ ...selectedRule, visibleFields: newVisible, requiredFields: newMandatory, necessaryFields: newDoubleVerify });
                              }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeRuleTab === 'after' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {[
                    { id: 'emails', label: 'Email Notifications' },
                    { id: 'calls', label: 'Calls' },
                    { id: 'fieldUpdates', label: 'Field Updates' },
                    { id: 'createRecords', label: 'Create Records' },
                    { id: 'webhooks', label: 'Webhooks' },
                    { id: 'customActions', label: 'Custom Actions' },
                    { id: 'tags', label: 'TAGS' }
                  ].map(actionDef => (
                    <div key={actionDef.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#000000ff', letterSpacing: '0.5px' }}>{actionDef.label}</span>
                        <button onClick={() => {
                          if (actionDef.id === 'tags') {
                            setTagBuilder({ isOpen: true, name: '', color: tagColors[0] });
                          } else if (actionDef.id === 'fieldUpdates') {
                            setFieldUpdateBuilder({ isOpen: true, field: 'firstName', value: '' });
                          } else if (actionDef.id === 'createRecords') {
                            setCreateRecordBuilder({ isOpen: true, targetModule: 'Task', autoLink: true, mappings: [{ targetField: 'name', sourceField: '' }] });
                          } else {
                            const newActions = { ...selectedRule.afterActions };
                            newActions[actionDef.id] = [...(newActions[actionDef.id] || []), `New ${actionDef.label} Action`];
                            setSelectedRule({ ...selectedRule, afterActions: newActions });
                          }
                        }} style={{ background: 'none', border: 'none', color: '#000000ff', fontSize: '1.25rem', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        {actionDef.badge && (
                          <span style={{ fontSize: '0.75rem', background: '#334155', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '12px' }}>{actionDef.badge}</span>
                        )}
                      </div>

                      {selectedRule.afterActions?.[actionDef.id]?.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                          {selectedRule.afterActions[actionDef.id].map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px' }}>
                              {actionDef.id === 'tags' ? (
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'white', background: item.color, padding: '0.25rem 0.75rem', borderRadius: '12px' }}>{item.name}</span>
                              ) : actionDef.id === 'fieldUpdates' ? (
                                <span style={{ fontSize: '0.875rem', color: '#334155' }}>Update <strong>{item.field}</strong> to <strong>{item.value}</strong></span>
                              ) : actionDef.id === 'createRecords' ? (
                                <span style={{ fontSize: '0.875rem', color: '#334155' }}>Create <strong>{item.targetModule}</strong> {item.autoLink ? '(Auto-Linked)' : ''} with {item.mappings?.length || 0} mappings</span>
                              ) : (
                                <span style={{ fontSize: '0.875rem', color: '#334155' }}>{item} {idx + 1}</span>
                              )}
                              <button onClick={() => {
                                const newActions = { ...selectedRule.afterActions };
                                newActions[actionDef.id] = newActions[actionDef.id].filter((_, i) => i !== idx);
                                setSelectedRule({ ...selectedRule, afterActions: newActions });
                              }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TAG BUILDER MODAL */}
              {tagBuilder.isOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setTagBuilder({ ...tagBuilder, isOpen: false })}></div>
                  <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', position: 'relative', zIndex: 10 }}>
                    <h3 style={{ marginTop: 0, fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                      Select Tag
                      <button onClick={() => setTagBuilder({ ...tagBuilder, isOpen: false })} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                    </h3>

                    <div style={{ marginBottom: '2rem' }}>
                      {tags.length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No tags available. Create tags in the Tag Definitions menu first.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {tags.map(tag => (
                            <div
                              key={tag.id}
                              onClick={() => {
                                const newActions = { ...selectedRule.afterActions };
                                // Store the tag object (at least id, name, color)
                                if (!newActions.tags?.find(t => t.id === tag.id)) {
                                  newActions.tags = [...(newActions.tags || []), { id: tag.id, name: tag.name, color: tag.color }];
                                  setSelectedRule({ ...selectedRule, afterActions: newActions });
                                }
                                setTagBuilder({ ...tagBuilder, isOpen: false });
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

              {/* FIELD UPDATE BUILDER MODAL */}
              {fieldUpdateBuilder.isOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setFieldUpdateBuilder({ ...fieldUpdateBuilder, isOpen: false })}></div>
                  <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', position: 'relative', zIndex: 10 }}>
                    <h3 style={{ marginTop: 0, fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                      Configure Field Update
                      <button onClick={() => setFieldUpdateBuilder({ ...fieldUpdateBuilder, isOpen: false })} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                    </h3>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Select Field to Update</label>
                      <select
                        value={fieldUpdateBuilder.field}
                        onChange={(e) => setFieldUpdateBuilder({ ...fieldUpdateBuilder, field: e.target.value })}
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '1rem', outline: 'none' }}
                      >
                        <option value="firstName">First Name</option>
                        <option value="lastName">Last Name</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="owner">Owner</option>
                        {blueprint?.fields?.map(f => (
                          <option key={f.name} value={f.name}>{f.label} (Custom)</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>New Value</label>
                      <input
                        type="text"
                        value={fieldUpdateBuilder.value}
                        onChange={(e) => setFieldUpdateBuilder({ ...fieldUpdateBuilder, value: e.target.value })}
                        placeholder="e.g. Qualified, High, 1000"
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '1rem', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                      <button className="btn-outline" onClick={() => setFieldUpdateBuilder({ ...fieldUpdateBuilder, isOpen: false })}>Cancel</button>
                      <button className="btn-primary" onClick={() => {
                        if (!fieldUpdateBuilder.field || !fieldUpdateBuilder.value.trim()) return;
                        const newActions = { ...selectedRule.afterActions };
                        newActions.fieldUpdates = [...(newActions.fieldUpdates || []), { field: fieldUpdateBuilder.field, value: fieldUpdateBuilder.value.trim() }];
                        setSelectedRule({ ...selectedRule, afterActions: newActions });
                        setFieldUpdateBuilder({ ...fieldUpdateBuilder, isOpen: false });
                      }}>Save Field Update</button>
                    </div>
                  </div>
                </div>
              )}



              {/* CREATE RECORD BUILDER MODAL */}
              {createRecordBuilder.isOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setCreateRecordBuilder({ ...createRecordBuilder, isOpen: false })}></div>
                  <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '600px', position: 'relative', zIndex: 10, maxHeight: '90vh', overflowY: 'auto' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                      Auto-Create Record
                      <button onClick={() => setCreateRecordBuilder({ ...createRecordBuilder, isOpen: false })} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div>
                        <label className="form-label">Target Module</label>
                        <select
                          className="form-input bg-white"
                          value={createRecordBuilder.targetModule}
                          onChange={e => setCreateRecordBuilder({ ...createRecordBuilder, targetModule: e.target.value })}
                        >
                          <option value="Lead">Lead</option>
                          <option value="Deal">Deal</option>
                          <option value="Account">Account</option>
                          <option value="Product">Product</option>
                          <option value="Task">Task</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: '#334155' }}>
                          <input type="checkbox" checked={createRecordBuilder.autoLink} onChange={e => setCreateRecordBuilder({ ...createRecordBuilder, autoLink: e.target.checked })} />
                          Auto-Link to Current {selectedModule}
                        </label>
                      </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <label className="form-label" style={{ margin: 0 }}>Field Mappings</label>
                        <button onClick={() => {
                          setCreateRecordBuilder({
                            ...createRecordBuilder,
                            mappings: [...createRecordBuilder.mappings, { targetField: '', sourceField: '' }]
                          });
                        }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}>+ Add Mapping</button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {createRecordBuilder.mappings.length === 0 && (
                          <div style={{ padding: '1rem', background: '#f8fafc', color: '#64748b', textAlign: 'center', borderRadius: '6px' }}>No field mappings. Blank record will be created.</div>
                        )}
                        {createRecordBuilder.mappings.map((mapping, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#f8fafc', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <div style={{ flex: 1 }}>
                              <select
                                className="form-input bg-white"
                                value={mapping.targetField}
                                onChange={e => {
                                  const newMappings = [...createRecordBuilder.mappings];
                                  newMappings[idx].targetField = e.target.value;
                                  setCreateRecordBuilder({ ...createRecordBuilder, mappings: newMappings });
                                }}
                              >
                                <option value="">Select Target Field...</option>
                                {[...(DEFAULT_MODULE_FIELDS[createRecordBuilder.targetModule] || []), ...targetBlueprintFields].map(f => (
                                  <option key={f.id} value={f.name}>{f.label || f.name} {f.isRequired ? '*' : ''}</option>
                                ))}
                              </select>
                            </div>
                            <div style={{ color: '#94a3b8' }}>←</div>
                            <div style={{ flex: 1 }}>
                              <select
                                className="form-input bg-white"
                                value={mapping.sourceField.replace(`{{${selectedModule}.`, '').replace('}}', '')}
                                onChange={e => {
                                  const newMappings = [...createRecordBuilder.mappings];
                                  newMappings[idx].sourceField = `{{${selectedModule}.${e.target.value}}}`;
                                  setCreateRecordBuilder({ ...createRecordBuilder, mappings: newMappings });
                                }}
                              >
                                <option value="">Select Source Field...</option>
                                {[...(DEFAULT_MODULE_FIELDS[selectedModule] || []), ...blueprint.fields].map(f => (
                                  <option key={f.id} value={f.name}>{f.label || f.name}</option>
                                ))}
                              </select>
                            </div>
                            <button onClick={() => {
                              const newMappings = createRecordBuilder.mappings.filter((_, i) => i !== idx);
                              setCreateRecordBuilder({ ...createRecordBuilder, mappings: newMappings });
                            }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.25rem', padding: '0 0.5rem' }}>✕</button>
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                        Tip: You can use dynamic variables like {"{{"}{selectedModule}.firstName{"}}"} or static text.
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                      <button className="btn-outline" onClick={() => setCreateRecordBuilder({ ...createRecordBuilder, isOpen: false })}>Cancel</button>
                      <button className="btn-primary" onClick={() => {
                        if (!createRecordBuilder.targetModule) return;
                        const newActions = { ...selectedRule.afterActions };
                        const payload = {
                          targetModule: createRecordBuilder.targetModule,
                          autoLink: createRecordBuilder.autoLink,
                          mappings: createRecordBuilder.mappings.filter(m => m.targetField && m.sourceField)
                        };
                        newActions.createRecords = [...(newActions.createRecords || []), payload];
                        setSelectedRule({ ...selectedRule, afterActions: newActions });
                        setCreateRecordBuilder({ ...createRecordBuilder, isOpen: false });
                      }}>Save Auto-Create</button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              {selectedRule.id && (
                <button onClick={handleDeleteRule} style={{ padding: '0.5rem 1rem', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', fontWeight: 500, marginRight: 'auto' }}>Delete Rule</button>
              )}
              <button onClick={() => setSelectedRule(null)} style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 500 }}>Cancel</button>
              <button onClick={handleSaveRule} className="btn-primary">Save Rule</button>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {isProfileModalOpen && selectedProfile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '2.5rem', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>{selectedProfile.id ? 'Edit Profile' : 'Create New Profile'}</h2>
              <button onClick={() => setIsProfileModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Profile Name</label>
              <input type="text" className="form-input" placeholder="e.g. Sales Representative" value={selectedProfile.name} onChange={e => setSelectedProfile({ ...selectedProfile, name: e.target.value })} />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Global Permissions</h3>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
                  <input type="checkbox" checked={selectedProfile.canAccessSettings} onChange={e => setSelectedProfile({ ...selectedProfile, canAccessSettings: e.target.checked })} />
                  Administrator (Access to Setup & Settings)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
                  <input type="checkbox" checked={selectedProfile.canExportData} onChange={e => setSelectedProfile({ ...selectedProfile, canExportData: e.target.checked })} />
                  Can Export Data
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Module Permissions Matrix</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>MODULE</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>VIEW</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>CREATE</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>EDIT</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>DELETE</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.85rem' }}>DATA ACCESS</th>
                  </tr>
                </thead>
                <tbody>
                  {['Lead', 'Deal', 'Account', 'Task', 'Product'].map(mod => (
                    <tr key={mod} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 500 }}>{mod}</td>
                      {['view', 'create', 'edit', 'delete'].map(action => (
                        <td key={action} style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedProfile.permissions?.[mod]?.[action] || false}
                            onChange={(e) => {
                              const newPerms = { ...selectedProfile.permissions };
                              if (!newPerms[mod]) newPerms[mod] = { view: false, create: false, edit: false, delete: false, visibility: 'public' };
                              newPerms[mod][action] = e.target.checked;

                              // Auto-check View if others are selected
                              if (e.target.checked && action !== 'view') {
                                newPerms[mod]['view'] = true;
                              }
                              // Auto-uncheck others if View is unchecked
                              if (!e.target.checked && action === 'view') {
                                newPerms[mod]['create'] = false;
                                newPerms[mod]['edit'] = false;
                                newPerms[mod]['delete'] = false;
                              }

                              setSelectedProfile({ ...selectedProfile, permissions: newPerms });
                            }}
                          />
                        </td>
                      ))}
                      <td style={{ padding: '0.75rem' }}>
                        <select
                          className="form-input"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                          value={selectedProfile.permissions?.[mod]?.visibility || 'public'}
                          onChange={(e) => {
                            const newPerms = { ...selectedProfile.permissions };
                            if (!newPerms[mod]) newPerms[mod] = { view: false, create: false, edit: false, delete: false, visibility: 'public' };
                            newPerms[mod].visibility = e.target.value;
                            setSelectedProfile({ ...selectedProfile, permissions: newPerms });
                          }}
                        >
                          <option value="public">Public Read/Write</option>
                          <option value="private">Private (Owner Only)</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              {selectedProfile.id && (
                <button onClick={() => handleDeleteProfile(selectedProfile.id)} style={{ padding: '0.5rem 1rem', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', fontWeight: 500, marginRight: 'auto' }}>Delete Profile</button>
              )}
              <button onClick={() => setIsProfileModalOpen(false)} style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 500 }}>Cancel</button>
              <button onClick={handleSaveProfile} className="btn-primary">Save Profile</button>
            </div>
          </div>
        </div>
      )}


      {/* INVITE USER MODAL */}
      {isInviteModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setIsInviteModalOpen(false)}></div>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', position: 'relative', zIndex: 10 }}>
            <h3 style={{ marginTop: 0, fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Invite User
              <button onClick={() => setIsInviteModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </h3>
            <form onSubmit={handleInviteUser}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input bg-white"
                  placeholder="colleague@company.com"
                  value={inviteData.email}
                  onChange={e => setInviteData({ ...inviteData, email: e.target.value })}
                  required
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Assign Profile (Role)</label>
                <select
                  className="form-input bg-white"
                  value={inviteData.profileId}
                  onChange={e => setInviteData({ ...inviteData, profileId: e.target.value })}
                  required
                >
                  <option value="">Select a Profile...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {inviteStatus === 'success' ? (
                <div style={{ padding: '1rem', background: '#dcfce3', color: '#166534', borderRadius: '8px', textAlign: 'center', fontWeight: 500, marginBottom: '1rem' }}>
                  ✓ Invitation Sent Successfully!
                </div>
              ) : inviteStatus && inviteStatus.startsWith('Error') ? (
                <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', textAlign: 'center', fontWeight: 500, marginBottom: '1rem' }}>
                  {inviteStatus}
                </div>
              ) : null}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setIsInviteModalOpen(false)} style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={inviteStatus === 'sending'} className="btn-primary" style={{ cursor: inviteStatus === 'sending' ? 'not-allowed' : 'pointer' }}>
                  {inviteStatus === 'sending' ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal {...confirmState} />
    </>
  );
}
