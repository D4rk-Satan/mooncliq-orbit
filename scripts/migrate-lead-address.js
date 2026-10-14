const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log("Starting DB migration: Consolidating Lead address fields to Address block...");

  // 1. Fetch all Lead blueprints
  const bpRes = await pool.query(`SELECT id, "organizationId" FROM "Blueprint" WHERE "moduleType" = 'Lead'`);
  const blueprints = bpRes.rows;

  if (blueprints.length === 0) {
    console.log("No existing Lead blueprints found.");
    return;
  }

  const legacyNames = ['street', 'city', 'state', 'country', 'zipCode'];

  for (const bp of blueprints) {
    console.log(`\nProcessing Blueprint: ${bp.id} (Org: ${bp.organizationId})`);

    // Fetch existing fields for this blueprint
    const fieldsRes = await pool.query(
      `SELECT id, name, "sectionName", "sectionOrder", "orderIndex" FROM "Field" WHERE "blueprintId" = $1`,
      [bp.id]
    );
    const fields = fieldsRes.rows;
    const hasLegacy = fields.some(f => legacyNames.includes(f.name));
    const hasAddress = fields.some(f => f.name === 'address');

    console.log(` - Has legacy address fields: ${hasLegacy}`);
    console.log(` - Already has unified 'address' field: ${hasAddress}`);

    if (hasLegacy || !hasAddress) {
      const refField = fields.find(f => f.name === 'street') || fields.find(f => legacyNames.includes(f.name));
      const sectionName = refField?.sectionName || 'Identification';
      const sectionOrder = refField?.sectionOrder ?? 0;
      const orderIndex = refField?.orderIndex ?? 3;

      // Delete the legacy fields
      const delRes = await pool.query(
        `DELETE FROM "Field" WHERE "blueprintId" = $1 AND name = ANY($2::text[])`,
        [bp.id, legacyNames]
      );
      console.log(` - Deleted ${delRes.rowCount} legacy address fields`);

      if (!hasAddress) {
        // Create standard Address field
        const crypto = require('crypto');
        const newId = crypto.randomUUID();
        await pool.query(
          `INSERT INTO "Field" ("id", "blueprintId", "name", "label", "type", "isRequired", "isSystemField", "sectionName", "sectionOrder", "orderIndex", "options")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [newId, bp.id, 'address', 'Address', 'Address', false, true, sectionName, sectionOrder, orderIndex, []]
        );
        console.log(` - Inserted unified 'Address' field (type: Address)`);
      } else {
        await pool.query(
          `UPDATE "Field" SET "type" = 'Address', "label" = 'Address', "isSystemField" = true WHERE "blueprintId" = $1 AND name = 'address'`,
          [bp.id]
        );
        console.log(` - Updated existing 'address' field to Address`);
      }
    } else {
      console.log(` - Blueprint ${bp.id} is already using unified Address field.`);
    }
  }

  console.log("\nMigration completed successfully!");
}

main()
  .catch(err => {
    console.error("Migration error:", err);
  })
  .finally(() => {
    pool.end();
  });
