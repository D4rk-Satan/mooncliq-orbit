"use client";

import React, { useState, useEffect } from 'react';
import Editor from "@monaco-editor/react";

export default function ClientScriptBuilder() {
  const [scripts, setScripts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedScript, setSelectedScript] = useState(null);
  const [moduleFields, setModuleFields] = useState([]);

  const defaultCode = `// The FormAPI object gives you access to the UI
const value = FormAPI.getValue('yourFieldName');

if (value === 'Some Condition') {
  // Add your real-time UI logic here
  FormAPI.hideField('otherField');
  FormAPI.setMandatory('otherField', false);
} else {
  FormAPI.showField('otherField');
}`;

  const getAuthToken = async () => {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const { tokens } = await fetchAuthSession();
    return tokens.idToken.toString();
  };

  const fetchScripts = async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/client-scripts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setScripts(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScripts();
  }, []);

  useEffect(() => {
    if (selectedScript && selectedScript.moduleType) {
      const fetchFields = async () => {
        try {
          const token = await getAuthToken();
          const res = await fetch(`/api/blueprint?moduleType=${selectedScript.moduleType}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            let stdFields = ['stageId'];
            
            if (selectedScript.moduleType === 'Lead' || selectedScript.moduleType === 'Deal') {
              stdFields.push('firstName', 'lastName', 'email', 'phone', 'owner');
            } else if (selectedScript.moduleType === 'Account') {
              stdFields.push('companyName', 'email', 'gstNo', 'website', 'address', 'contactPerson');
            } else if (selectedScript.moduleType === 'Product') {
              stdFields.push('name', 'sku');
            } else if (selectedScript.moduleType === 'Task') {
              stdFields.push('taskName', 'startDateTime', 'dueDateTime', 'endDateTime', 'repeat', 'alert', 'notes');
            }

            const dynFields = (data.fields || []).map(f => f.name);
            setModuleFields([...new Set([...stdFields, ...dynFields])].sort());
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchFields();
    } else {
      setModuleFields([]);
    }
  }, [selectedScript?.moduleType]);

  const handleSave = async () => {
    if (!selectedScript.name || !selectedScript.moduleType || !selectedScript.triggerEvent) {
      alert("Name, Module, and Trigger Event are required.");
      return;
    }
    
    try {
      const token = await getAuthToken();
      const method = selectedScript.id ? 'PUT' : 'POST';
      const url = selectedScript.id ? `/api/client-scripts/${selectedScript.id}` : '/api/client-scripts';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(selectedScript)
      });
      
      if (res.ok) {
        alert('Client Script saved successfully!');
        setSelectedScript(null);
        fetchScripts();
      } else {
        alert('Failed to save Client Script.');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving Client Script.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this script?')) return;
    
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/client-scripts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        alert('Client Script deleted successfully!');
        fetchScripts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (selectedScript) {
    return (
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <button 
            onClick={() => setSelectedScript(null)} 
            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, fontSize: '0.875rem', fontWeight: 500, marginBottom: '1rem' }}
          >
            &larr; Back to Client Scripts
          </button>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
            {selectedScript.id ? 'Edit Client Script' : 'Create Client Script'}
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Script Name</label>
            <input 
              className="form-input" 
              placeholder="e.g. Hide Fields on Close"
              value={selectedScript.name}
              onChange={(e) => setSelectedScript({...selectedScript, name: e.target.value})}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Module Type</label>
            <select 
              className="form-input"
              value={selectedScript.moduleType}
              onChange={(e) => setSelectedScript({...selectedScript, moduleType: e.target.value})}
            >
              <option value="">Select Module</option>
              <option value="Lead">Lead</option>
              <option value="Deal">Deal</option>
              <option value="Account">Account</option>
              <option value="Product">Product</option>
              <option value="Task">Task</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Trigger Event</label>
            <select 
              className="form-input"
              value={selectedScript.triggerEvent}
              onChange={(e) => setSelectedScript({...selectedScript, triggerEvent: e.target.value, targetField: ''})}
            >
              <option value="">Select Trigger</option>
              <option value="onLoad">onLoad (When form opens)</option>
              <option value="onChange">onChange (When field value changes)</option>
              <option value="onSave">onSave (Before form is submitted)</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem', color: selectedScript.triggerEvent === 'onChange' ? 'inherit' : '#94a3b8' }}>
              Target Field to Watch
            </label>
            <select 
              className="form-input"
              value={selectedScript.targetField || ''}
              onChange={(e) => setSelectedScript({...selectedScript, targetField: e.target.value})}
              disabled={selectedScript.triggerEvent !== 'onChange'}
            >
              <option value="">Select Field</option>
              {moduleFields.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>Client Code Snippet</label>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>JavaScript (Browser Runtime)</span>
          </div>
          <div style={{ height: '400px', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
            <Editor
              height="100%"
              defaultLanguage="javascript"
              theme="vs-dark"
              value={selectedScript.code}
              onChange={(val) => setSelectedScript({...selectedScript, code: val})}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input 
            type="checkbox" 
            id="isActiveScript"
            checked={selectedScript.isActive}
            onChange={(e) => setSelectedScript({...selectedScript, isActive: e.target.checked})}
            style={{ width: '1rem', height: '1rem', accentColor: '#1e3a8a' }}
          />
          <label htmlFor="isActiveScript" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Script is Active</label>
        </div>

        <button onClick={handleSave} className="btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
          Save Client Script
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Client UI Scripts</h2>
        <button 
          className="btn-primary" 
          style={{ padding: '0.5rem 1rem' }}
          onClick={() => setSelectedScript({
            name: '', moduleType: '', triggerEvent: 'onLoad', targetField: '', code: defaultCode, isActive: true
          })}
        >
          + New Script
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: '#64748b' }}>Loading scripts...</p>
      ) : scripts.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>No client scripts found.</p>
          <button 
            className="btn-outline"
            onClick={() => setSelectedScript({
              name: '', moduleType: '', triggerEvent: 'onLoad', targetField: '', code: defaultCode, isActive: true
            })}
          >
            Create your first script
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {scripts.map(script => (
            <div key={script.id} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{script.name}</h3>
                  <span style={{ padding: '0.125rem 0.5rem', backgroundColor: script.isActive ? '#dcfce7' : '#f1f5f9', color: script.isActive ? '#166534' : '#475569', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 500 }}>
                    {script.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span style={{ padding: '0.125rem 0.5rem', backgroundColor: '#e0e7ff', color: '#3730a3', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                    {script.moduleType}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                  Trigger: <strong>{script.triggerEvent}</strong> {script.targetField ? `(${script.targetField})` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-outline" onClick={() => setSelectedScript(script)}>Edit</button>
                <button className="btn-outline" style={{ color: '#ef4444', borderColor: '#fee2e2' }} onClick={() => handleDelete(script.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
