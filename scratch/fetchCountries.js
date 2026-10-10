const fs = require('fs');
const https = require('https');

https.get('https://restcountries.com/v3.1/all', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    try {
      const countries = JSON.parse(data);
      let formatted = countries.map(c => ({
        name: c.name.common,
        code: c.cca2,
        dial_code: c.idd.root ? (c.idd.root + (c.idd.suffixes ? c.idd.suffixes[0] : '')) : '',
        emoji: c.flag
      }));
      // Sort alphabetically by name
      formatted.sort((a, b) => a.name.localeCompare(b.name));
      // Put India, USA, UK, Canada at top
      const topCodes = ['IN', 'US', 'GB', 'CA'];
      const topCountries = topCodes.map(code => formatted.find(c => c.code === code)).filter(Boolean);
      const otherCountries = formatted.filter(c => !topCodes.includes(c.code));
      
      const finalCountries = [...topCountries, ...otherCountries];

      fs.writeFileSync('src/utils/countries.json', JSON.stringify(finalCountries, null, 2));
      console.log('Successfully written ' + finalCountries.length + ' countries.');
    } catch (e) {
      console.error(e);
    }
  });
}).on('error', (err) => {
  console.log("Error: " + err.message);
});
