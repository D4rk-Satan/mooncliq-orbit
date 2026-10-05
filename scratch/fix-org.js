const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const prisma = require('../src/lib/prisma').default;

async function fixTestingOrg() {
  try {
    // Delete all blueprints (this will CASCADE and delete empty fields and stages too)
    const deleted = await prisma.blueprint.deleteMany({});
    console.log(`Successfully deleted ${deleted.count} corrupted blueprints.`);
    console.log(`Ab apna Mooncliq CRM ka dashboard refresh kijiye, naye blueprints saari fields ke sath auto-generate ho jayenge!`);
  } catch (err) {
    console.error("Error cleaning up:", err);
  }
}

fixTestingOrg().finally(() => prisma.$disconnect());
