const fs = require('fs');
let content = fs.readFileSync('src/app/settings/page.js', 'utf8');

// The regex will match from `<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>` 
// to `</select>\s*</div>` inside the `<header className="dashboard-header"` section.

content = content.replace(/<div style=\{\{ display: 'flex', alignItems: 'center', gap: '0\.75rem' \}\}>\s*<span style=\{\{ fontSize: '0\.875rem', fontWeight: 500, color: '#64748b' \}\}>Configure Module:<\/span>\s*<select[\s\S]*?<\/select>\s*<\/div>/, '');

fs.writeFileSync('src/app/settings/page.js', content, 'utf8');
console.log('Regex executed.');
