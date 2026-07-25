import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';

export default function WorkflowBuilder({ organizationId }) {
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const triggerCategories = {
    'BeforeSubmit': [
      { id: 'Load of the form', label: 'Load of the form' },
      { id: 'User input of the field', label: 'User input of the field' },
      { id: 'Field Rules', label: 'Field Rules' },
      { id: 'Addition of a row', label: 'Addition of a row' },
      { id: 'Deletion of a row', label: 'Deletion of a row' }
    ],
    'OnSubmit': [
      { id: 'Validations on form submission', label: 'Validations on form submission' }
    ],
    'AfterSubmit': [
      { id: 'Successful form submission', label: 'Successful form submission' },
      { id: 'Update of a field', label: 'Update of a field' }
    ]
  };

  const getAuthToken = async () => {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const { tokens } = await fetchAuthSession();
    return tokens.idToken.toString();
  };

  const fetchWorkflows = async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/workflows', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleSave = async () => {
    if (!selectedWorkflow.name || !selectedWorkflow.moduleType || !selectedWorkflow.recordEvent) {
      alert("Name, Module, and Execution Timing are required.");
      return;
    }
    
    try {
      const token = await getAuthToken();
      const method = selectedWorkflow.id ? 'PUT' : 'POST';
      const url = selectedWorkflow.id ? `/api/workflows?id=${selectedWorkflow.id}` : '/api/workflows';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(selectedWorkflow)
      });
      
      if (res.ok) {
        setSelectedWorkflow(null);
        fetchWorkflows();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save workflow");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    if(!confirm("Are you sure you want to delete this workflow?")) return;
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/workflows?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if(res.ok) fetchWorkflows();
    } catch(e) {
      console.error(e);
    }
  };

  const defaultCode = `// The context object contains the current record
const record = context.record;

if (record) {
  // Add your logic here
  console.log("Processing record", record.id);
}

return { success: true };`;

  if (selectedWorkflow) {
    return (
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
            {selectedWorkflow.id ? 'Edit Workflow' : 'Create Workflow'}
          </h2>
          <button 
            onClick={() => setSelectedWorkflow(null)}
            style={{ background: 'none', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Workflow Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={selectedWorkflow.name}
              onChange={e => setSelectedWorkflow({...selectedWorkflow, name: e.target.value})}
              placeholder="e.g. Validate VAT Number"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Module</label>
            <select 
              className="form-input"
              value={selectedWorkflow.moduleType}
              onChange={e => setSelectedWorkflow({...selectedWorkflow, moduleType: e.target.value})}
            >
              <option value="">Select a Module</option>
              <option value="Lead">Lead</option>
              <option value="Deal">Deal</option>
              <option value="Account">Account</option>
              <option value="Task">Task</option>
              <option value="Product">Product</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>When a record is:</h3>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {['Created', 'Edited', 'CreatedOrEdited', 'Deleted'].map(evt => (
              <label key={evt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="recordEvent" 
                  value={evt}
                  checked={selectedWorkflow.recordEvent === evt}
                  onChange={e => setSelectedWorkflow({...selectedWorkflow, recordEvent: e.target.value})}
                />
                {evt === 'CreatedOrEdited' ? 'Created or Edited' : evt}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Trigger Category</label>
            <select 
              className="form-input"
              value={selectedWorkflow.triggerCategory}
              onChange={e => setSelectedWorkflow({...selectedWorkflow, triggerCategory: e.target.value, triggerEvent: ''})}
            >
              <option value="">Select Category</option>
              <option value="BeforeSubmit">Before form submission</option>
              <option value="OnSubmit">On form submission</option>
              <option value="AfterSubmit">After form submission</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Specific Trigger</label>
            <select 
              className="form-input"
              value={selectedWorkflow.triggerEvent}
              onChange={e => setSelectedWorkflow({...selectedWorkflow, triggerEvent: e.target.value})}
              disabled={!selectedWorkflow.triggerCategory}
            >
              <option value="">Select Trigger</option>
              {selectedWorkflow.triggerCategory && triggerCategories[selectedWorkflow.triggerCategory].map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>Custom Code</label>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>JavaScript (Node.js runtime)</span>
          </div>
          <div style={{ height: '400px', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
            <Editor
              height="100%"
              defaultLanguage="javascript"
              theme="vs-dark"
              value={selectedWorkflow.code}
              onChange={(val) => setSelectedWorkflow({...selectedWorkflow, code: val})}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on'
              }}
            />
          </div>
        </div>

        <button onClick={handleSave} className="btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
          Save Custom Workflow
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Custom Workflows & Scripts</h2>
        <button 
          className="btn-primary" 
          style={{ padding: '0.5rem 1rem' }}
          onClick={() => setSelectedWorkflow({
            name: '', moduleType: '', recordEvent: 'Created', 
            triggerCategory: 'AfterSubmit', triggerEvent: 'Successful form submission',
            targetFields: [], code: defaultCode, isActive: true
          })}
        >
          + New Workflow
        </button>
      </div>

      {isLoading ? (
        <p>Loading workflows...</p>
      ) : workflows.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>No custom workflows found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {workflows.map(wf => (
            <div key={wf.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 600 }}>{wf.name}</h3>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                  <span style={{ backgroundColor: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{wf.moduleType}</span>
                  <span>•</span>
                  <span>{wf.recordEvent}</span>
                  <span>•</span>
                  <span>{wf.triggerEvent}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={() => setSelectedWorkflow(wf)}
                  style={{ background: 'none', border: '1px solid #cbd5e1', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(wf.id)}
                  style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
