import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT name, "isSystem" FROM "Stage" LIMIT 10');
    console.table(res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
