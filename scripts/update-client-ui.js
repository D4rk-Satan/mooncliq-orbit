const fs = require('fs');

let content = fs.readFileSync('src/components/ClientScriptBuilder.js', 'utf8');

// Replace the edit view UI
content = content.replace(
  /if \(selectedScript\) \{[\s\S]*?return \([\s\S]*?<div>/,
  `if (selectedScript) {
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
            <input 
              className="form-input" 
              placeholder="e.g. status"
              value={selectedScript.targetField || ''}
              onChange={(e) => setSelectedScript({...selectedScript, targetField: e.target.value})}
              disabled={selectedScript.triggerEvent !== 'onChange'}
            />
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
    <div>`
);

// Replace the list view UI
content = content.replace(
  /<button \n          className="btn-primary"[\s\S]*?\+ Create Client Script\n        <\/button>/,
  `<button 
          className="btn-primary" 
          style={{ padding: '0.5rem 1rem' }}
          onClick={() => setSelectedScript({
            name: '', moduleType: '', triggerEvent: 'onLoad', targetField: '', code: defaultCode, isActive: true
          })}
        >
          + New Script
        </button>`
);

content = content.replace(
  /<div style={{ backgroundColor: 'white', padding: '3rem 2rem', textAlign: 'center', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>[\s\S]*?<\/div>/,
  `<div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>No client scripts found.</p>
          <button 
            className="btn-outline"
            onClick={() => setSelectedScript({
              name: '', moduleType: '', triggerEvent: 'onLoad', targetField: '', code: defaultCode, isActive: true
            })}
          >
            Create your first script
          </button>
        </div>`
);

fs.writeFileSync('src/components/ClientScriptBuilder.js', content);
