const fs = require('fs');
const p = 'src/components/Sidebar.js';
let content = fs.readFileSync(p, 'utf8');

const regex = /<div className="sidebar-logo"[\s\S]*?<\/button>\s*<\/div>/;
const replacement = `<div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', padding: isCollapsed ? '1rem 0' : '0.85rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <img
              src="/mooncliq-puzzle-only.png"
              alt="moonCliq"
              style={{ height: '30px', width: 'auto', objectFit: 'contain', flexShrink: 0 }}
            />
            {!isCollapsed && (
              <img
                src="/mooncliq-text-only.png"
                alt="moonCliq CRM"
                style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
              />
            )}
          </div>
          <button
            onClick={toggleSidebar}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Toggle Sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        </div>`;

content = content.replace(regex, replacement);
fs.writeFileSync(p, content, 'utf8');
console.log('SIDEBAR_LOGO_UPDATED_SUCCESSFULLY');

