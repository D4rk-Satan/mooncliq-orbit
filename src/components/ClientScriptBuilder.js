"use client";

import React, { useState, useEffect } from 'react';
import Editor, { useMonaco } from "@monaco-editor/react";

export default function ClientScriptBuilder() {
  const monaco = useMonaco();
  const [scripts, setScripts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedScript, setSelectedScript] = useState(null);
  const [moduleFields, setModuleFields] = useState([]);

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

const defaultClientCode = `// The FormAPI object gives you access to the UI
const value = FormAPI.getValue('yourFieldName');

if (value === 'Some Condition') {
  // Add your real-time UI logic here
  FormAPI.hideField('otherField');
  FormAPI.setMandatory('otherField', false);
} else {
  FormAPI.showField('otherField');
}`;

const defaultServerCode = `// The context object gives you access to the record data
const { record, event } = context;

if (event === 'Created') {
  console.log('A new record was created!', record);
  // Example: await fetch('https://webhook.site/...', { method: 'POST', body: JSON.stringify(record) });
}`;

  useEffect(() => {
    if (selectedScript?.moduleType) {
      const loadFields = async () => {
         try {
           const token = await getAuthToken();
           const res = await fetch(`/api/blueprint?moduleType=${selectedScript.moduleType}`, {
              headers: { Authorization: `Bearer ${token}` }
           });
           if (res.ok) {
             const data = await res.json();
             const fields = data.fields ? data.fields.map(f => f.name) : [];
             const stdFields = ["name", "sku", "firstName", "lastName", "email", "phone", "owner", "stageId", "companyName", "gstNo", "website", "address", "contactPerson", "taskName", "startDateTime", "dueDateTime", "endDateTime", "repeat", "alert", "notes"];
             setModuleFields([...new Set([...stdFields, ...fields])]);
           }
         } catch (e) {
           console.error('Failed to load fields for intellisense');
         }
      };
      loadFields();
    }
  }, [selectedScript?.moduleType]);

  useEffect(() => {
    if (monaco) {
      const provider = monaco.languages.registerCompletionItemProvider('javascript', {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          
          const lineContent = model.getLineContent(position.lineNumber);
          let suggestions = [];
          
          // Case 1: FormAPI. -> suggest methods (Frontend only)
          if (lineContent.substring(0, word.startColumn - 1).endsWith('FormAPI.')) {
            suggestions.push(
                { label: 'getValue', kind: monaco.languages.CompletionItemKind.Method, insertText: "getValue('${1:fieldName}')", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Gets the current value of a field.', range: range },
                { label: 'setValue', kind: monaco.languages.CompletionItemKind.Method, insertText: "setValue('${1:fieldName}', ${2:value})", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Sets the value of a field programmatically.', range: range },
                { label: 'hideField', kind: monaco.languages.CompletionItemKind.Method, insertText: "hideField('${1:fieldName}')", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Hides a field from the UI.', range: range },
                { label: 'showField', kind: monaco.languages.CompletionItemKind.Method, insertText: "showField('${1:fieldName}')", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Shows a previously hidden field.', range: range },
                { label: 'setMandatory', kind: monaco.languages.CompletionItemKind.Method, insertText: "setMandatory('${1:fieldName}', ${2:true/false})", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Makes a field mandatory or optional.', range: range },
                { label: 'showFieldError', kind: monaco.languages.CompletionItemKind.Method, insertText: "showFieldError('${1:fieldName}', '${2:message}')", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Displays a validation error under a specific field.', range: range },
                { label: 'setReadOnly', kind: monaco.languages.CompletionItemKind.Method, insertText: "setReadOnly('${1:fieldName}', ${2:true/false})", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Makes a field read-only and uneditable.', range: range },
                { label: 'showToast', kind: monaco.languages.CompletionItemKind.Method, insertText: "showToast('${1:message}', '${2:success/error/info}')", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Displays a non-blocking toast notification.', range: range },
                { label: 'fetch', kind: monaco.languages.CompletionItemKind.Method, insertText: "await fetch('${1:url}')", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Fetches data from an external API via backend proxy.', range: range },
                { label: 'context', kind: monaco.languages.CompletionItemKind.Property, insertText: 'context', documentation: 'Access current user, record, and module data.', range: range }
            );
          }

          // Case 1.5: orbit. -> suggest SDK methods (Both Frontend & Backend)
          if (lineContent.substring(0, word.startColumn - 1).endsWith('orbit.')) {
            suggestions.push(
                { label: 'getRecord', kind: monaco.languages.CompletionItemKind.Method, insertText: "await getRecord('${1:moduleType}', '${2:id}')", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Fetches a specific record by ID.', range: range },
                { label: 'createRecord', kind: monaco.languages.CompletionItemKind.Method, insertText: "await createRecord('${1:moduleType}', ${2:{ data }})", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Creates a new record.', range: range },
                { label: 'updateRecord', kind: monaco.languages.CompletionItemKind.Method, insertText: "await updateRecord('${1:moduleType}', '${2:id}', ${3:{ data }})", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Updates an existing record.', range: range },
                { label: 'deleteRecord', kind: monaco.languages.CompletionItemKind.Method, insertText: "await deleteRecord('${1:moduleType}', '${2:id}')", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Deletes a record by ID.', range: range },
                { label: 'sendEmail', kind: monaco.languages.CompletionItemKind.Method, insertText: "await sendEmail('${1:to}', '${2:subject}', '${3:body}')", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Sends an email using AWS SES.', range: range },
                { label: 'aggregateRecords', kind: monaco.languages.CompletionItemKind.Method, insertText: "await aggregateRecords('${1:moduleType}', ${2:{ filters }}, '${3:sum}', '${4:fieldName}')", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Aggregates values (e.g. sum, count) for filtered records.', range: range },
                { label: 'addNote', kind: monaco.languages.CompletionItemKind.Method, insertText: "await addNote('${1:moduleType}', '${2:recordId}', '${3:content}')", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Adds a timeline note/comment to a record.', range: range }
            );
          }
          
          // Case 2: record. -> suggest module fields (Backend)
          if (lineContent.substring(0, word.startColumn - 1).endsWith('record.')) {
              if (moduleFields.length > 0) {
                 suggestions.push(...moduleFields.map(f => ({
                    label: f,
                    kind: monaco.languages.CompletionItemKind.Field,
                    insertText: f,
                    documentation: `Field name: ${f}`,
                    range: range
                  })));
              }
          }

          // Case 3: context. -> suggest properties
          if (lineContent.substring(0, word.startColumn - 1).endsWith('context.')) {
              suggestions.push(
                { label: 'record', kind: monaco.languages.CompletionItemKind.Property, insertText: 'record', documentation: 'The record data object.', range: range },
                { label: 'event', kind: monaco.languages.CompletionItemKind.Property, insertText: 'event', documentation: 'The event that triggered the script (e.g. Created).', range: range }
              )
          }
          
          // Case 4: Field name suggestions inside quotes
          const textUntilPosition = lineContent.substring(0, position.column - 1);
          const inQuotes = (textUntilPosition.match(/['"]/g) || []).length % 2 === 1;
          
          if (inQuotes && moduleFields.length > 0) {
              suggestions.push(...moduleFields.map(f => ({
                label: f,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: f,
                documentation: `Field name: ${f}`,
                range: range
              })));
          }

          if (suggestions.length > 0) {
            return { suggestions };
          }
          return { suggestions: [] };
        }
      });
      
      return () => provider.dispose();
    }
  }, [monaco, moduleFields]);

  const getAuthToken = async () => {
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const { tokens } = await fetchAuthSession();
      return tokens?.idToken?.toString() || '';
    } catch (error) {
      console.warn('Failed to get auth token:', error);
      return '';
    }
  };

  const fetchScripts = async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const resClient = await fetch('/api/client-scripts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      let clientScripts = [];
      if (resClient.ok) clientScripts = await resClient.json();
      
      const resServer = await fetch('/api/workflows', {
        headers: { Authorization: `Bearer ${token}` }
      });
      let serverScripts = [];
      if (resServer.ok) {
          serverScripts = await resServer.json();
      }

      const combined = [
          ...clientScripts.map(s => ({ ...s, scriptType: 'frontend' })),
          ...serverScripts.map(s => ({ ...s, scriptType: 'backend' }))
      ];
      
      combined.sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setScripts(combined);
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
    const isBackend = selectedScript.scriptType === 'backend';

    if (!selectedScript.name || !selectedScript.moduleType) {
      alert("Name and Module are required.");
      return;
    }

    if (isBackend) {
        if (!selectedScript.recordEvent || !selectedScript.triggerCategory || !selectedScript.triggerEvent) {
             alert("Execution Timing and Trigger selections are required for Backend Scripts.");
             return;
        }
    } else {
        if (!selectedScript.triggerEvent) {
            alert("Trigger Event is required for Frontend Scripts.");
            return;
        }
    }

    try {
      const token = await getAuthToken();
      const method = selectedScript.id ? 'PUT' : 'POST';
      
      let url = isBackend ? '/api/workflows' : '/api/client-scripts';
      if (selectedScript.id) {
          url += isBackend ? `?id=${selectedScript.id}` : `/${selectedScript.id}`;
      }

      const payload = { ...selectedScript };
      delete payload.scriptType; 

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Script saved successfully!');
        setSelectedScript(null);
        fetchScripts();
      } else {
        alert('Failed to save script.');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving script.');
    }
  };

  const handleDelete = async (script) => {
    if (!confirm('Are you sure you want to delete this script?')) return;

    try {
      const token = await getAuthToken();
      const isBackend = script.scriptType === 'backend';
      const url = isBackend ? `/api/workflows?id=${script.id}` : `/api/client-scripts/${script.id}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        alert('Script deleted successfully!');
        fetchScripts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (selectedScript) {
    const isBackend = selectedScript.scriptType === 'backend';

    return (
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
              <button
                onClick={() => setSelectedScript(null)}
                style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, fontSize: '0.875rem', fontWeight: 500, marginBottom: '1rem' }}
              >
                &larr; Back to Custom Scripts
              </button>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
                {selectedScript.id ? 'Edit Script' : 'Create Custom Script'}
              </h2>
          </div>
          
          {!selectedScript.id && (
              <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
                <button
                    onClick={() => setSelectedScript({...selectedScript, scriptType: 'frontend', code: defaultClientCode, triggerEvent: 'onLoad'})}
                    style={{ 
                        padding: '0.5rem 1rem', 
                        border: 'none', 
                        borderRadius: '6px',
                        background: !isBackend ? 'white' : 'transparent',
                        boxShadow: !isBackend ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        color: !isBackend ? '#0f172a' : '#64748b',
                        fontWeight: 500,
                        cursor: 'pointer'
                    }}
                >
                    💻 Frontend (UI Logic)
                </button>
                <button
                    onClick={() => setSelectedScript({...selectedScript, scriptType: 'backend', code: defaultServerCode, recordEvent: 'Created', triggerCategory: 'AfterSubmit', triggerEvent: 'Successful form submission'})}
                    style={{ 
                        padding: '0.5rem 1rem', 
                        border: 'none', 
                        borderRadius: '6px',
                        background: isBackend ? 'white' : 'transparent',
                        boxShadow: isBackend ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        color: isBackend ? '#0f172a' : '#64748b',
                        fontWeight: 500,
                        cursor: 'pointer'
                    }}
                >
                    ☁️ Backend (Automation)
                </button>
              </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Script Name</label>
            <input
              className="form-input"
              placeholder={isBackend ? "e.g. Send Welcome Email" : "e.g. Hide Fields on Close"}
              value={selectedScript.name}
              onChange={(e) => setSelectedScript({ ...selectedScript, name: e.target.value })}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Module Type</label>
            <select
              className="form-input"
              value={selectedScript.moduleType}
              onChange={(e) => setSelectedScript({ ...selectedScript, moduleType: e.target.value })}
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

        {isBackend ? (
            <>
                <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>When a record is:</h3>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    {['Created', 'Edited', 'CreatedOrEdited', 'Deleted'].map(evt => (
                      <label key={evt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name="recordEvent" 
                          value={evt}
                          checked={selectedScript.recordEvent === evt}
                          onChange={e => setSelectedScript({...selectedScript, recordEvent: e.target.value})}
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
                      value={selectedScript.triggerCategory || ''}
                      onChange={e => setSelectedScript({...selectedScript, triggerCategory: e.target.value, triggerEvent: ''})}
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
                      value={selectedScript.triggerEvent || ''}
                      onChange={e => setSelectedScript({...selectedScript, triggerEvent: e.target.value})}
                      disabled={!selectedScript.triggerCategory}
                    >
                      <option value="">Select Trigger</option>
                      {selectedScript.triggerCategory && triggerCategories[selectedScript.triggerCategory].map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
            </>
        ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Trigger Event</label>
                <select
                  className="form-input"
                  value={selectedScript.triggerEvent}
                  onChange={(e) => setSelectedScript({ ...selectedScript, triggerEvent: e.target.value, targetField: '' })}
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
                  onChange={(e) => setSelectedScript({ ...selectedScript, targetField: e.target.value })}
                  disabled={selectedScript.triggerEvent !== 'onChange'}
                >
                  <option value="">Select Field</option>
                  {moduleFields.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
        )}

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>Code Snippet</label>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {isBackend ? 'Node.js (AWS Lambda)' : 'JavaScript (Browser Runtime)'}
            </span>
          </div>
          <div style={{ height: '400px', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
            <Editor
              height="100%"
              defaultLanguage="javascript"
              theme="vs-dark"
              value={selectedScript.code}
              onChange={(val) => setSelectedScript({ ...selectedScript, code: val })}
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
            onChange={(e) => setSelectedScript({ ...selectedScript, isActive: e.target.checked })}
            style={{ width: '1rem', height: '1rem', accentColor: '#1e3a8a' }}
          />
          <label htmlFor="isActiveScript" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Script is Active</label>
        </div>

        <button onClick={handleSave} className="btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
          Save Script
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button
          className="btn-primary"
          style={{ padding: '0.5rem 1rem' }}
          onClick={() => setSelectedScript({
            name: '', moduleType: '', triggerEvent: 'onLoad', targetField: '', code: defaultClientCode, isActive: true, scriptType: 'frontend'
          })}
        >
          + New Script
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: '#64748b' }}>Loading scripts...</p>
      ) : scripts.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>No custom scripts found.</p>
          <button
            className="btn-outline"
            onClick={() => setSelectedScript({
              name: '', moduleType: '', triggerEvent: 'onLoad', targetField: '', code: defaultClientCode, isActive: true, scriptType: 'frontend'
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
                  <span style={{ fontSize: '1.25rem' }}>
                      {script.scriptType === 'backend' ? '☁️' : '💻'}
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{script.name}</h3>
                  <span style={{ padding: '0.125rem 0.5rem', backgroundColor: script.isActive ? '#dcfce7' : '#f1f5f9', color: script.isActive ? '#166534' : '#475569', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 500 }}>
                    {script.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span style={{ padding: '0.125rem 0.5rem', backgroundColor: '#e0e7ff', color: '#3730a3', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                    {script.moduleType}
                  </span>
                  <span style={{ padding: '0.125rem 0.5rem', backgroundColor: script.scriptType === 'backend' ? '#ffedd5' : '#e0f2fe', color: script.scriptType === 'backend' ? '#9a3412' : '#0369a1', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                    {script.scriptType === 'backend' ? 'Backend' : 'Frontend'}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', display: 'flex', gap: '0.5rem' }}>
                  Trigger: <strong>
                  {script.scriptType === 'backend' ? 
                     `${script.recordEvent} / ${script.triggerCategory} - ${script.triggerEvent}`
                     : script.triggerEvent}
                  </strong> {script.targetField ? `(${script.targetField})` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-outline" onClick={() => setSelectedScript(script)}>Edit</button>
                <button className="btn-outline" style={{ color: '#ef4444', borderColor: '#fee2e2' }} onClick={() => handleDelete(script)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
