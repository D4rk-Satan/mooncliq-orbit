const fs = require('fs');

let content = fs.readFileSync('src/components/LookupInput.js', 'utf8');

// I will carefully replace the exact lines at the end of the file.
// Currently it ends with:
/*
                {isSelected && <span style={{ color: '#10b981', fontSize: '0.875rem' }}>Selected</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
*/

const oldEnd = `                {isSelected && <span style={{ color: '#10b981', fontSize: '0.875rem' }}>Selected</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}`;

const newEnd = `                {isSelected && <span style={{ color: '#10b981', fontSize: '0.875rem' }}>Selected</span>}
              </div>
            );
          })}
          {field.targetModule && (
            <div 
              style={{ padding: '0.75rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem' }}
              onClick={() => { setIsOpen(false); setIsQuickCreating(true); }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
            >
              <span>+ New {field.targetModule}</span>
            </div>
          )}
        </div>
      )}
      {isQuickCreating && (
        <SlideOverPanel title={\`New \${field.targetModule}\`} onClose={() => setIsQuickCreating(false)}>
          {field.targetModule === 'Account' && <AccountIntakeForm onSuccess={(newRecord) => { setIsQuickCreating(false); handleSelect(newRecord); }} />}
          {field.targetModule === 'Lead' && <LeadIntakeForm onSuccess={(newRecord) => { setIsQuickCreating(false); handleSelect(newRecord); }} />}
          {field.targetModule === 'Deal' && <DealIntakeForm onSuccess={(newRecord) => { setIsQuickCreating(false); handleSelect(newRecord); }} />}
          {field.targetModule === 'Product' && <ProductIntakeForm onSuccess={(newRecord) => { setIsQuickCreating(false); handleSelect(newRecord); }} />}
          {field.targetModule === 'Task' && <TaskIntakeForm onSuccess={(newRecord) => { setIsQuickCreating(false); handleSelect(newRecord); }} />}
        </SlideOverPanel>
      )}
    </div>
  );
}`;

// Normalize line endings in case of Windows CRLF vs LF
const normalizedContent = content.replace(/\r\n/g, '\n');
content = normalizedContent.replace(oldEnd.replace(/\r\n/g, '\n'), newEnd);

fs.writeFileSync('src/components/LookupInput.js', content, 'utf8');
console.log('LookupInput end block updated successfully.');
