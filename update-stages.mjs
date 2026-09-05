import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const systemStageNames = [
  'New', 'Contacted', 'Qualified', 'Close Won', 'Close Lost', 'Junk', 
  'Qualification', 'Proposal', 'Negotiation', 
  'Active', 'In-Active', 
  'Pending', 'Overdue', 'Completed'
];

async function main() {
  console.log("Connecting to database directly to update stages...");
  const client = await pool.connect();
  
  try {
    const placeholders = systemStageNames.map((_, i) => `$${i + 1}`).join(', ');
    const query = `UPDATE "Stage" SET "isSystem" = true WHERE name IN (${placeholders})`;
    
    const res = await client.query(query, systemStageNames);
    console.log(`Success! Updated ${res.rowCount} existing stages to be system-locked.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
