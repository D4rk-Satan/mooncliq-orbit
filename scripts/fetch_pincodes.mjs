import https from 'https';
import fs from 'fs';
import path from 'path';

const url = 'https://raw.githubusercontent.com/maclovin/indian-pincode-database/master/pincode.json';
const targetPath = path.join(process.cwd(), 'public', 'pincodes.json');

console.log('Downloading Indian Pincodes database...');

https.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const rawPincodes = JSON.parse(data);
      const optimizedMap = {};

      // Structure from maclovin: [{ "officeName": "...", "pincode": 400001, "districtName": "Mumbai", "stateName": "MAHARASHTRA" }]
      rawPincodes.forEach(p => {
        const code = p.pincode;
        const city = p.districtName;
        const state = p.stateName;

        if (code && city && state) {
            // Capitalize normally
            const formattedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
            const formattedState = state.charAt(0).toUpperCase() + state.slice(1).toLowerCase();
          optimizedMap[code.toString()] = { c: formattedCity, s: formattedState };
        }
      });

      fs.writeFileSync(targetPath, JSON.stringify(optimizedMap));
      console.log(`Success! Saved ${Object.keys(optimizedMap).length} pincodes to ${targetPath}`);
    } catch (e) {
      console.error('Error parsing JSON:', e.message);
    }
  });

}).on('error', (err) => {
  console.error('Error downloading:', err.message);
});
