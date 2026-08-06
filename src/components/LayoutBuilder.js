import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { fetchAuthSession } from 'aws-amplify/auth';

export default function LayoutBuilder({ selectedModule }) {
  const [fields, setFields] = useState([]);
  const [sections, setSections] = useState([]);
  const [blueprint, setBlueprint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Field Creation State
  const [isAddingField, setIsAddingField] = useState(false);
  const [newField, setNewField] = useState({ name: "", label: "", type: "text", options: "", targetModule: "Account", isMultiSelect: false, isBiDirectional: false, targetDisplayField: "name", isPublic: true, relatedListLabel: "", filters: [], targetSection: "" });
  const [targetBlueprint, setTargetBlueprint] = useState(null);
  const [activeFieldMenu, setActiveFieldMenu] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.field-settings-menu')) {
        setActiveFieldMenu(null);
      }
    };
    if (activeFieldMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeFieldMenu]);


  useEffect(() => {
    if (newField.targetModule && newField.targetModule !== selectedModule) {
      const fetchTarget = async () => {
        try {
          const { tokens } = await fetchAuthSession();
          const token = tokens.idToken.toString();
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

  useEffect(() => {
    fetchBlueprintData();
  }, [selectedModule]);

  const fetchBlueprintData = async () => {
    setIsLoading(true);
    try {
      const { tokens } = await fetchAuthSession();
      const token = tokens.idToken.toString();

      const res = await fetch(`/api/blueprint?moduleType=${selectedModule}&t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      const data = await res.json();
      if (data && data.fields) {
        setBlueprint(data);
        setFields(data.fields);
        
        // Load layout config or generate defaults
        if (data.layoutConfig && Array.isArray(data.layoutConfig) && data.layoutConfig.length > 0) {
            setSections(data.layoutConfig.sort((a,b) => a.order - b.order));
        } else {
            // Fallback logic for legacy data
            const uniqueSections = [...new Set(data.fields.map(f => f.sectionName || 'General Information'))];
            const defaultSections = uniqueSections.map((name, idx) => ({
                id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                name,
                columns: 2,
                order: idx
            }));
            if (defaultSections.length === 0) {
                defaultSections.push({ id: 'general', name: 'General Information', columns: 2, order: 0 });
            }
            setSections(defaultSections);
        }
      }
    } catch (e) {
      console.error("Failed to load blueprint", e);
    }
    setIsLoading(false);
  };

  const saveLayoutState = async (newSections, newFields) => {
    try {
        const { tokens } = await fetchAuthSession();
        const token = tokens.idToken.toString();
        
        const payload = {
            blueprintId: blueprint.id,
            layoutConfig: newSections,
            fields: newFields
        };

        await fetch('/api/blueprint/layout', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
    } catch(e) {
        console.error("Failed to save layout", e);
    }
  };

  const handleDragEnd = (result) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;

    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Handle Section Reordering
    if (type === 'SECTION') {
        const newSections = Array.from(sections);
        const [movedSection] = newSections.splice(source.index, 1);
        newSections.splice(destination.index, 0, movedSection);
        
        // Update order property
        newSections.forEach((s, idx) => s.order = idx);
        setSections(newSections);
        saveLayoutState(newSections, null);
        return;
    }

    // Handle Field Reordering / Moving
    const draggedField = fields.find(f => f.id === draggableId);
    if (!draggedField) return;

    const sourceSection = sections.find(s => s.id === source.droppableId);
    const destSection = sections.find(s => s.id === destination.droppableId);

    const newFields = Array.from(fields);
    
    const sourceFields = newFields.filter(f => (f.sectionName || 'General Information') === sourceSection.name).sort((a,b) => (a.sectionOrder || 0) - (b.sectionOrder || 0));
    const destFields = source.droppableId === destination.droppableId 
      ? sourceFields 
      : newFields.filter(f => (f.sectionName || 'General Information') === destSection.name).sort((a,b) => (a.sectionOrder || 0) - (b.sectionOrder || 0));

    const [movedItem] = sourceFields.splice(source.index, 1);
    
    if (source.droppableId === destination.droppableId) {
       sourceFields.splice(destination.index, 0, movedItem);
    } else {
       destFields.splice(destination.index, 0, movedItem);
       movedItem.sectionName = destSection.name;
    }

    if (source.droppableId === destination.droppableId) {
        sourceFields.forEach((f, idx) => f.sectionOrder = idx);
    } else {
        sourceFields.forEach((f, idx) => f.sectionOrder = idx);
        destFields.forEach((f, idx) => f.sectionOrder = idx);
    }

    setFields([...newFields]);
    
    const fieldsToUpdate = source.droppableId === destination.droppableId ? sourceFields : [...sourceFields, ...destFields];
    saveLayoutState(sections, fieldsToUpdate);
  };

  const handleAddSection = () => {
      const name = prompt("Enter section name:");
      if (name) {
          const newSec = { 
              id: name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now(), 
              name, 
              columns: 2, 
              order: sections.length 
          };
          const newSections = [...sections, newSec];
          setSections(newSections);
          saveLayoutState(newSections, null);
      }
  };

  const handleUpdateSection = (sectionId, updates) => {
      const oldSection = sections.find(s => s.id === sectionId);
      const newSections = sections.map(s => s.id === sectionId ? { ...s, ...updates } : s);
      
      let fieldsToUpdate = [];
      let newFields = fields;
      
      if (updates.name && oldSection && oldSection.name !== updates.name) {
          newFields = fields.map(f => {
              if ((f.sectionName || 'General Information') === oldSection.name) {
                  const updatedField = { ...f, sectionName: updates.name };
                  fieldsToUpdate.push(updatedField);
                  return updatedField;
              }
              return f;
          });
          setFields(newFields);
      }
      
      setSections(newSections);
      saveLayoutState(newSections, fieldsToUpdate.length > 0 ? fieldsToUpdate : null);
  };

  const handleDeleteSection = (sectionId) => {
      if (!confirm("Delete this section and unassign its fields?")) return;
      const sectionToDelete = sections.find(s => s.id === sectionId);
      
      const newSections = sections.filter(s => s.id !== sectionId);
      newSections.forEach((s, idx) => s.order = idx);
      
      const defaultSection = newSections[0];
      
      // Move all fields to default section
      const fieldsToUpdate = [];
      const newFields = fields.map(f => {
          if (f.sectionName === sectionToDelete.name) {
              const updated = { ...f, sectionName: defaultSection ? defaultSection.name : 'General Information' };
              fieldsToUpdate.push(updated);
              return updated;
          }
          return f;
      });

      setSections(newSections);
      setFields(newFields);
      saveLayoutState(newSections, fieldsToUpdate.length > 0 ? fieldsToUpdate : null);
  };

  const handleAddField = async (e) => {
    e.preventDefault();
    if (!newField.label || !newField.type) return;

    const name = newField.label.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(' ').map((w, i) => i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)).join('');
    
    // Assign to a section
    const targetSection = newField.targetSection || (sections[0]?.name) || 'General Information';

    try {
      const { tokens } = await fetchAuthSession();
      const token = tokens.idToken.toString();
      
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
        blueprintId: blueprint.id,
        sectionName: targetSection,
        sectionOrder: 999
      };

      const res = await fetch('/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setNewField({ name: "", label: "", type: "text", options: "", targetModule: "Account", isMultiSelect: false, isBiDirectional: false, targetDisplayField: "name", isPublic: true, relatedListLabel: "", filters: [], targetSection: "" });
        setIsAddingField(false);
        fetchBlueprintData();
      }
    } catch (err) {
      console.error(err);
    }
  };


  const handleToggleMandatory = async (fieldId, currentStatus) => {
    try {
      const { tokens } = await fetchAuthSession();
      const token = tokens.idToken.toString();

      await fetch('/api/fields', {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: fieldId,
          isRequired: !currentStatus
        })
      });
      setActiveFieldMenu(null);
      fetchBlueprintData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteField = async (id) => {
    if (!confirm("Are you sure you want to delete this field?")) return;
    try {
      const res = await fetch(`/api/fields?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
          setFields(fields.filter(f => f.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <div style={{ padding: '2rem' }}>Loading Master Builder...</div>;

  return (
    <div style={{ display: 'flex', gap: '2rem', height: '100%', minHeight: '80vh' }}>
        {/* LEFT PANE: FIELD PALETTE */}
        <div style={{ width: '320px', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 }}>Available Fields</h3>
            
            <button 
                className="btn-primary" 
                style={{ width: '100%', marginBottom: '1.5rem' }}
                onClick={() => setIsAddingField(!isAddingField)}
            >
                {isAddingField ? 'Cancel' : '+ Create Custom Field'}
            </button>

                        

            <div style={{ flex: 1, overflowY: 'auto' }}>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>Manage all fields for {selectedModule}.</p>
                
                {fields.map(field => (
                    <div key={field.id} style={{ padding: '0.75rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{field.label}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{field.type} • {field.sectionName || 'General'}</div>
                        </div>
                        <button onClick={() => handleDeleteField(field.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '0.25rem' }}>✕</button>
                    </div>
                ))}
            </div>
        </div>

        {/* RIGHT PANE: CANVAS */}
        <div style={{ flex: 1, backgroundColor: '#f1f5f9', padding: '2rem', borderRadius: '12px', border: '1px dashed #cbd5e1', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>Form Canvas</h2>
            <button onClick={handleAddSection} className="btn-primary" style={{ padding: '0.5rem 1rem', backgroundColor: '#10b981' }}>+ Add Section</button>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="all-sections" type="SECTION">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {sections.map((section, index) => {
                    const sectionFields = fields.filter(f => (f.sectionName || 'General Information') === section.name).sort((a,b) => (a.sectionOrder || 0) - (b.sectionOrder || 0));
                    
                    return (
                      <Draggable key={section.id} draggableId={section.id} index={index}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef} 
                            {...provided.draggableProps}
                            style={{
                                backgroundColor: 'white', 
                                borderRadius: '8px', 
                                border: '1px solid #e2e8f0', 
                                overflow: 'hidden',
                                boxShadow: snapshot.isDragging ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none',
                                ...provided.draggableProps.style
                            }}
                          >
                            {/* SECTION HEADER */}
                            <div style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div {...provided.dragHandleProps} style={{ color: '#cbd5e1', cursor: 'grab' }}>⋮⋮</div>
                                <input 
                                    type="text" 
                                    value={section.name} 
                                    onChange={(e) => handleUpdateSection(section.id, { name: e.target.value })}
                                    style={{ fontWeight: 600, color: '#334155', border: 'none', background: 'transparent', outline: 'none', fontSize: '1rem', width: '250px' }}
                                />
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <select 
                                    value={section.columns} 
                                    onChange={(e) => handleUpdateSection(section.id, { columns: parseInt(e.target.value) })}
                                    style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                                >
                                    <option value={1}>1 Column</option>
                                    <option value={2}>2 Columns</option>
                                    <option value={3}>3 Columns</option>
                                </select>
                                <button onClick={() => handleDeleteSection(section.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                              </div>
                            </div>
                            
                            {/* SECTION FIELDS */}
                            <Droppable droppableId={section.id} type="FIELD">
                              {(provided, snapshot) => (
                                <div
                                  {...provided.droppableProps}
                                  ref={provided.innerRef}
                                  style={{
                                    padding: '1.5rem',
                                    minHeight: '80px',
                                    backgroundColor: snapshot.isDraggingOver ? '#f1f5f9' : 'white',
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${section.columns}, 1fr)`,
                                    gap: '1rem'
                                  }}
                                >
                                  {sectionFields.length === 0 && (
                                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1.5rem', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '6px' }}>
                                          Drag fields here or create new ones
                                      </div>
                                  )}
                                  
                                  {sectionFields.map((field, idx) => (
                                    <Draggable key={field.id} draggableId={field.id} index={idx}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          style={{
                                            ...provided.draggableProps.style,
                                            backgroundColor: snapshot.isDragging ? '#ffffff' : '#f8fafc',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            padding: '0.75rem',
                                            boxShadow: snapshot.isDragging ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem'
                                          }}
                                        >
                                          <div {...provided.dragHandleProps} style={{ color: '#94a3b8', cursor: 'grab', display: 'flex' }}>
                                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                                          </div>
                                          <div style={{ flex: 1, fontWeight: 500, color: '#334155', fontSize: '0.9rem' }}>
                                              {field.label} {field.isRequired && <span style={{color: '#ef4444'}}>*</span>}
                                          </div>
                                          
                                          {/* FIELD SETTINGS MENU */}
                                          <div className="field-settings-menu" style={{ position: 'relative' }}>
                                            <button type="button" onClick={() => setActiveFieldMenu(activeFieldMenu === field.id ? null : field.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.25rem' }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                            </button>
                                            
                                            {activeFieldMenu === field.id && (
                                              <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 50, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: '160px', overflow: 'hidden' }}>
                                                <button onClick={() => handleToggleMandatory(field.id, field.isRequired)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>
                                                  {field.isRequired ? 'Remove Mandatory' : 'Mark as Mandatory'}
                                                </button>
                                                {!field.isSystemField && (
                                                  <button onClick={() => { handleDeleteField(field.id); setActiveFieldMenu(null); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#ef4444', fontWeight: 500 }}>
                                                    Delete Field
                                                  </button>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        {isAddingField && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', width: '95%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>Create Custom Field</h2>
                    <button onClick={() => setIsAddingField(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#64748b', cursor: 'pointer' }}>&times;</button>
                </div>
                <form onSubmit={handleAddField} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

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
                                      }} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}>Γ£ò</button>
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
                                      <span style={{ color: '#64748b', fontSize: '1.2rem' }}>Γ₧ö</span>
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
                                      }} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}>Γ£ò</button>
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
                                    }} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}>Γ£ò</button>
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
                                                  <div style={{ gridColumn: '1 / -1', marginTop: '1rem', marginBottom: '1rem' }}>
                            <label className="form-label">Add to Section</label>
                            <select className="form-input bg-white" value={newField.targetSection} onChange={e => setNewField({...newField, targetSection: e.target.value})}>
                                {sections.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                          </div>
<button type="submit" className="btn-primary">Save Field</button>
                      
                </form>
            </div>
        </div>
    )}
</div>
    </div>
  );
}
