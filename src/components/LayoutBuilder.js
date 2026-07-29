import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { fetchAuthSession } from 'aws-amplify/auth';

export default function LayoutBuilder({ selectedModule }) {
  const [fields, setFields] = useState([]);
  const [sections, setSections] = useState([{ id: 'default', name: 'General Information' }]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFields();
  }, [selectedModule]);

  const fetchFields = async () => {
    setIsLoading(true);
    try {
      const { tokens } = await fetchAuthSession();
      const token = tokens.idToken.toString();

      const res = await fetch(`/api/blueprint?moduleType=${selectedModule}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data && data.fields) {
        setFields(data.fields);
        
        // Extract unique sections
        const uniqueSections = [...new Set(data.fields.map(f => f.sectionName || 'General Information'))];
        if (uniqueSections.length > 0) {
           setSections(uniqueSections.map(name => ({
               id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
               name
           })));
        }
      }
    } catch (e) {
      console.error("Failed to load fields", e);
    }
    setIsLoading(false);
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const draggedField = fields.find(f => f.id === draggableId);
    if (!draggedField) return;

    const sourceSection = sections.find(s => s.id === source.droppableId);
    const destSection = sections.find(s => s.id === destination.droppableId);

    // Create a new array of fields
    const newFields = Array.from(fields);
    
    // Remove from old position
    const sourceFields = newFields.filter(f => (f.sectionName || 'General Information') === sourceSection.name).sort((a,b) => (a.sectionOrder || 0) - (b.sectionOrder || 0));
    const destFields = source.droppableId === destination.droppableId 
      ? sourceFields 
      : newFields.filter(f => (f.sectionName || 'General Information') === destSection.name).sort((a,b) => (a.sectionOrder || 0) - (b.sectionOrder || 0));

    // Remove item
    const [movedItem] = sourceFields.splice(source.index, 1);
    
    // Add item to new position
    if (source.droppableId === destination.droppableId) {
       sourceFields.splice(destination.index, 0, movedItem);
    } else {
       destFields.splice(destination.index, 0, movedItem);
       movedItem.sectionName = destSection.name;
    }

    // Update sectionOrder for all affected items
    if (source.droppableId === destination.droppableId) {
        sourceFields.forEach((f, idx) => f.sectionOrder = idx);
    } else {
        sourceFields.forEach((f, idx) => f.sectionOrder = idx);
        destFields.forEach((f, idx) => f.sectionOrder = idx);
    }

    setFields([...newFields]);

    // Make API call to save order and section for ALL affected fields
    try {
        const { tokens } = await fetchAuthSession();
        const token = tokens.idToken.toString();

        const fieldsToUpdate = source.droppableId === destination.droppableId 
            ? sourceFields 
            : [...sourceFields, ...destFields];

        // Update all changed fields in parallel
        await Promise.all(fieldsToUpdate.map(f => 
            fetch(`/api/settings/fields/${f.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    sectionName: f.sectionName,
                    sectionOrder: f.sectionOrder
                })
            })
        ));
    } catch(e) {
        console.error("Failed to save field placements", e);
    }
  };

  const addSection = () => {
      const name = prompt("Enter section name:");
      if (name) {
          setSections([...sections, { id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'), name }]);
      }
  };

  if (isLoading) return <div style={{ padding: '2rem' }}>Loading Layout Builder...</div>;

  return (
    <div style={{ backgroundColor: '#f8fafc', padding: '2rem', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{selectedModule} - Layout Builder</h2>
        <button onClick={addSection} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>+ Add Section</button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        {sections.map(section => {
          const sectionFields = fields.filter(f => (f.sectionName || 'General Information') === section.name).sort((a,b) => (a.sectionOrder || 0) - (b.sectionOrder || 0));
          
          return (
            <div key={section.id} style={{ marginBottom: '2rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#334155' }}>
                {section.name}
              </div>
              
              <Droppable droppableId={section.id}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    style={{
                      padding: '1rem',
                      minHeight: '100px',
                      backgroundColor: snapshot.isDraggingOver ? '#f8fafc' : 'white',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '1rem'
                    }}
                  >
                    {sectionFields.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '6px' }}>
                            Drag fields here
                        </div>
                    )}
                    
                    {sectionFields.map((field, index) => (
                      <Draggable key={field.id} draggableId={field.id} index={index}>
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
                              gap: '0.75rem',
                              opacity: field.isHidden ? 0.6 : 1
                            }}
                          >
                            <div {...provided.dragHandleProps} style={{ color: '#94a3b8', cursor: 'grab', display: 'flex' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                            </div>
                            <div style={{ flex: 1, fontWeight: 500, color: '#334155' }}>
                                {field.label}
                                {field.isSystemField && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '10px' }}>System</span>}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {field.type}
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
          );
        })}
      </DragDropContext>
    </div>
  );
}
