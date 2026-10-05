const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://mooncliq:mooncliq1122@localhost:5432/postgres' });
pool.query('SELECT b.id, b."moduleType", count(f.id) as fields_count FROM "Blueprint" b LEFT JOIN "Field" f ON b.id = f."blueprintId" GROUP BY b.id, b."moduleType"')
  .then(res => { console.table(res.rows); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
