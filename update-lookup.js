const fs = require('fs');

let content = fs.readFileSync('src/components/LookupInput.js', 'utf8');

// 1. Add imports
content = content.replace(
  "import React, { useState, useEffect, useRef } from 'react';",
  `import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import SlideOverPanel from './SlideOverPanel';

const AccountIntakeForm = dynamic(() => import('./AccountIntakeForm'), { ssr: false });
const LeadIntakeForm = dynamic(() => import('./LeadIntakeForm'), { ssr: false });
const DealIntakeForm = dynamic(() => import('./DealIntakeForm'), { ssr: false });
const ProductIntakeForm = dynamic(() => import('./ProductIntakeForm'), { ssr: false });
const TaskIntakeForm = dynamic(() => import('./TaskIntakeForm'), { ssr: false });
`
);

// 2. Add state for quick creating inside the component
content = content.replace(
  "const dropdownRef = useRef(null);",
  `const dropdownRef = useRef(null);
  const [isQuickCreating, setIsQuickCreating] = useState(false);`
);

// 3. Add evaluateFilters and inject it into searchRecords
const evaluateFiltersFunc = `
  const evaluateFilters = (record) => {
    if (!field.filters || !Array.isArray(field.filters) || field.filters.length === 0) return true;
    return field.filters.every(filter => {
      if (!filter.field || !filter.operator) return true;
      const recordValue = String(record[filter.field] || (record.customData && record.customData[filter.field]) || '').toLowerCase();
      const filterValue = String(filter.value || '').toLowerCase();
      
      switch (filter.operator) {
        case 'is': return recordValue === filterValue;
        case 'is_not': return recordValue !== filterValue;
        case 'contains': return recordValue.includes(filterValue);
        default: return true;
      }
    });
  };
`;

content = content.replace(
  /const searchRecords = async \(query\) => \{/,
  `${evaluateFiltersFunc}\n  const searchRecords = async (query) => {`
);

// Update local filtering in searchRecords to also evaluate filters
content = content.replace(
  "const nameToMatch = getDisplayValue(item);\n           return nameToMatch.toLowerCase().includes(query.toLowerCase());",
  "const nameToMatch = getDisplayValue(item);\n           const matchesQuery = nameToMatch.toLowerCase().includes(query.toLowerCase());\n           return matchesQuery && evaluateFilters(item);"
);

// 4. Add the + New Button inside the dropdown (before the closing div of the dropdown list)
const endOfMap = `);
          })}
        </div>
      )}`;

const newButtonBlock = `);
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
      )}`;

content = content.replace(endOfMap, newButtonBlock);

// 5. Add the Render block for SlideOverPanel at the very end of the component return
const renderForm = `
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

content = content.replace(
  /    <\/div>\n  \);\n\}\s*$/,
  `${renderForm}`
);

fs.writeFileSync('src/components/LookupInput.js', content, 'utf8');
console.log('LookupInput updated.');
