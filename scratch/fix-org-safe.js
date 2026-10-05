const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const prisma = require('../src/lib/prisma').default;

async function fixTestingOrgSafe() {
  try {
    // Sirf unhi Blueprints ko find karenge jinki fields nahi bani thi (corrupted hain)
    const allBlueprints = await prisma.blueprint.findMany({
      include: { fields: true }
    });
    
    const corruptedBlueprints = allBlueprints.filter(bp => bp.fields.length === 0);
    
    console.log(`Found ${corruptedBlueprints.length} corrupted blueprints with 0 fields.`);
    
    for (const bp of corruptedBlueprints) {
      await prisma.blueprint.delete({
        where: { id: bp.id }
      });
    }
    
    console.log(`Success: Only empty/corrupted blueprints were deleted. Safe for other orgs!`);
    console.log(`Ab apna Mooncliq CRM ka dashboard refresh kijiye!`);
  } catch (err) {
    console.error("Error cleaning up:", err);
  }
}

fixTestingOrgSafe().finally(() => prisma.$disconnect());
