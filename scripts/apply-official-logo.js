const fs = require('fs');
const p = 'public/landing-mockup.html';
let html = fs.readFileSync(p, 'utf8');

// 1. Add favicon
if (!html.includes('mooncliq-crm-official.png')) {
  html = html.replace(
    '<title>Mooncliq Orbit — Enterprise CRM & Sales Operating System</title>',
    '<title>Mooncliq Orbit — Enterprise CRM & Sales Operating System</title>\n  <link rel="icon" type="image/png" href="mooncliq-crm-official.png">'
  );

  // 2. Add logo class
  html = html.replace(
    '.brand {',
    '.brand-logo-img {\n      height: 48px;\n      width: auto;\n      object-fit: contain;\n      display: block;\n    }\n\n    .brand {'
  );

  // 3. Navbar Logo replacement
  const navTarget = `<a href="/" class="brand">
      <div class="brand-cube">M</div>
      Mooncliq Orbit
    </a>`;
  const navReplace = `<a href="/" class="brand" style="display: flex; align-items: center; gap: 0.5rem;">
      <img src="mooncliq-crm-official.png" alt="moonCliq CRM" class="brand-logo-img">
    </a>`;
  html = html.replace(navTarget, navReplace);

  // 4. Footer Logo replacement
  const footerTarget = `<a href="/" class="brand" style="color: #fff; margin-bottom: 1rem; display: inline-flex;">
            <div class="brand-cube" style="background: #fff; color: #0F172A;">M</div>
            Mooncliq Orbit
          </a>`;
  const footerReplace = `<a href="/" class="brand" style="margin-bottom: 1.25rem; display: inline-flex; background: #ffffff; padding: 6px 14px; border-radius: 10px;">
            <img src="mooncliq-crm-official.png" alt="moonCliq CRM" style="height: 40px; width: auto; object-fit: contain;">
          </a>`;
  html = html.replace(footerTarget, footerReplace);

  fs.writeFileSync(p, html, 'utf8');
  console.log('SUCCESS_LOGO_UPDATED');
} else {
  console.log('ALREADY_HAS_LOGO');
}

