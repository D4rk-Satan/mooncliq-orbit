const { Pool } = require('pg');
require('dotenv').config();

// Old DB (Supabase)
const srcPool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL
});

// New DB (AWS)
const destPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const tables = [
  'Organization',
  'Blueprint',
  'Stage',
  'Field',
  'Transition',
  '_FromStages',
  'Lead',
  'AuditLog'
];

async function migrateTable(tableName) {
  console.log(`Migrating table: ${tableName}`);
  
  // 1. Fetch all rows from source
  const result = await srcPool.query(`SELECT * FROM "${tableName}"`);
  const rows = result.rows;
  
  if (rows.length === 0) {
    console.log(`No records found in ${tableName}. Skipping.`);
    return;
  }
  
  console.log(`Found ${rows.length} records in ${tableName}. Inserting to AWS...`);
  
  // 2. Insert into destination
  // We process rows one by one to avoid massive query string issues, or in batches.
  // Since CRM data is likely small for now, one by one is safe and easy.
  for (const row of rows) {
    const columns = Object.keys(row).map(col => `"${col}"`).join(', ');
    const values = Object.values(row);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const query = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
    
    try {
      await destPool.query(query, values);
    } catch (err) {
      console.error(`Error inserting into ${tableName}:`, err);
    }
  }
  console.log(`Finished ${tableName}.`);
}

async function run() {
  try {
    for (const table of tables) {
      await migrateTable(table);
    }
    console.log("Migration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    srcPool.end();
    destPool.end();
  }
}

run();
