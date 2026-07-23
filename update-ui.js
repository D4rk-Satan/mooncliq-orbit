const fs = require('fs');

let content = fs.readFileSync('src/app/settings/page.js', 'utf8');

// 1. Update newField state definition
content = content.replace(
  /const \[newField, setNewField\] = useState\(\{[\s\S]*?\}\);/,
  `const [newField, setNewField] = useState({ name: "", label: "", type: "text", options: "", targetModule: "Account", isMultiSelect: false, isBiDirectional: false, targetDisplayField: "name", isPublic: true, relatedListLabel: "", filters: [] });`
);

// 2. Update handleAddField API Payload
const handleAddTarget = `targetModule: newField.type === 'lookup' ? newField.targetModule : null,
        targetDisplayField: newField.type === 'lookup' ? newField.targetDisplayField : null,
        isMultiSelect: newField.type === 'lookup' ? newField.isMultiSelect : false,
        isBiDirectional: newField.type === 'lookup' ? newField.isBiDirectional : false,
        mappings: newField.type === 'lookup' ? (newField.mappings || []) : [],`;

const handleAddReplacement = `targetModule: newField.type === 'lookup' ? newField.targetModule : null,
        targetDisplayField: newField.type === 'lookup' ? newField.targetDisplayField : null,
        isMultiSelect: newField.type === 'lookup' ? newField.isMultiSelect : false,
        isBiDirectional: newField.type === 'lookup' ? newField.isBiDirectional : false,
        relatedListLabel: newField.type === 'lookup' ? newField.relatedListLabel : null,
        isPublic: newField.type === 'lookup' ? newField.isPublic : true,
        filters: newField.type === 'lookup' ? newField.filters : [],
        mappings: newField.type === 'lookup' ? (newField.mappings || []) : [],`;

content = content.replace(handleAddTarget, handleAddReplacement);

// 3. Remove Relationships tab from sidebar
content = content.replace(
  /<\!-- RELATIONSHIPS TAB -->[\s\S]*?<\/div>\s*<\/div>/,
  `<!-- RELATIONSHIPS TAB REMOVED - Zoho Style Lookups -->\n          </div>`
);
// In case the HTML comment wasn't there, let's target the exact div block for Lookups sidebar item
const lookupsSidebar = `<div 
            className={\`sidebar-item \${currentView === 'lookups' ? 'active' : ''}\`}
            onClick={() => setCurrentView('lookups')}
          >
            <span className="material-symbols-outlined">account_tree</span>
            <span>Relationships & Lookups</span>
          </div>`;
content = content.replace(lookupsSidebar, '');


// 4. Update Field Type select to include lookup
const selectFieldType = `<select className="form-input bg-white" value={newField.type} onChange={e => setNewField({ ...newField, type: e.target.value })}>
                              <option value="text">Short Text</option>
                              <option value="textarea">Long Text</option>
                              <option value="number">Number</option>
                              <option value="currency">Currency</option>
                              <option value="select">Dropdown Select</option>
                              <option value="date">Date</option>
                              <option value="boolean">Checkbox</option>
                              <option value="url">URL</option>
                            </select>`;

const selectFieldTypeReplacement = `<select className="form-input bg-white" value={newField.type} onChange={e => setNewField({ ...newField, type: e.target.value })}>
                              <option value="text">Short Text</option>
                              <option value="textarea">Long Text</option>
                              <option value="number">Number</option>
                              <option value="currency">Currency</option>
                              <option value="select">Dropdown Select</option>
                              <option value="date">Date</option>
                              <option value="boolean">Checkbox</option>
                              <option value="url">URL</option>
                              <option value="lookup">Lookup (Relationship)</option>
                            </select>`;

content = content.replace(selectFieldType, selectFieldTypeReplacement);


// 5. Inject Advanced Lookup UI inside the Fields form
const fieldOptionsBlock = `{newField.type === 'select' && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <label className="form-label">Dropdown Options (comma separated)</label>
                              <input type="text" className="form-input bg-white" placeholder="Option 1, Option 2, Option 3" value={newField.options} onChange={e => setNewField({ ...newField, options: e.target.value })} />
                            </div>
                          )}`;

const advancedLookupBlock = `{newField.type === 'select' && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <label className="form-label">Dropdown Options (comma separated)</label>
                              <input type="text" className="form-input bg-white" placeholder="Option 1, Option 2, Option 3" value={newField.options} onChange={e => setNewField({ ...newField, options: e.target.value })} />
                            </div>
                          )}
                          
                          {newField.type === 'lookup' && (
                            <div style={{ gridColumn: '1 / -1', padding: '1rem', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              <h4 style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>Advanced Lookup Configuration</h4>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                  <label className="form-label">Target Module</label>
                                  <select className="form-input bg-white" value={newField.targetModule} onChange={e => setNewField({ ...newField, targetModule: e.target.value })}>
                                    {['Lead', 'Deal', 'Account', 'Product', 'Task'].map(m => (
                                      <option key={m} value={m}>{m}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="form-label">Public Read/Write</label>
                                  <div style={{ display: 'flex', alignItems: 'center', height: '42px', gap: '0.5rem' }}>
                                    <input type="checkbox" checked={newField.isPublic} onChange={e => setNewField({ ...newField, isPublic: e.target.checked })} style={{ width: '1.25rem', height: '1.25rem' }} />
                                    <span style={{ fontSize: '0.875rem', color: '#475569' }}>Allow all users to view/select</span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                  <label className="form-label">Bi-Directional Related List</label>
                                  <div style={{ display: 'flex', alignItems: 'center', height: '42px', gap: '0.5rem' }}>
                                    <input type="checkbox" checked={newField.isBiDirectional} onChange={e => setNewField({ ...newField, isBiDirectional: e.target.checked })} style={{ width: '1.25rem', height: '1.25rem' }} />
                                    <span style={{ fontSize: '0.875rem', color: '#475569' }}>Show on Target Module</span>
                                  </div>
                                </div>
                                {newField.isBiDirectional && (
                                  <div>
                                    <label className="form-label">Related List Title</label>
                                    <input type="text" className="form-input bg-white" placeholder="e.g. Associated Deals" value={newField.relatedListLabel} onChange={e => setNewField({ ...newField, relatedListLabel: e.target.value })} />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}`;

content = content.replace(fieldOptionsBlock, advancedLookupBlock);


// 6. Delete the entire Relationships & Lookups View Block
// We will match `{currentView === 'lookups' ? (` and everything inside it up to the next view which is probably `) : null}`
// I will write a regex that safely slices out that section.
const viewRegex = /\{\s*currentView\s*===\s*'lookups'\s*\?\s*\([\s\S]*?\)\s*:\s*null\s*\}/g;
content = content.replace(viewRegex, '{/* Lookups View Deprecated */}');

// Just in case it was part of a ternary chain like `) : currentView === 'lookups' ? (...) : currentView === 'profiles'`
// Let's replace the whole nested ternary block carefully.
content = content.replace(
  /\)\s*:\s*currentView\s*===\s*'lookups'\s*\?\s*\([\s\S]*?\n\s*\)\s*:\s*(currentView\s*===|null)/g,
  (match, p1) => `) : ${p1}`
);


fs.writeFileSync('src/app/settings/page.js', content, 'utf8');
console.log('Update script completed.');
