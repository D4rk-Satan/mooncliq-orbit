const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixLeadStages() {
  try {
    const leadBlueprints = await prisma.blueprint.findMany({
      where: { moduleType: 'Lead' }
    });

    console.log(`Found ${leadBlueprints.length} Lead blueprints.`);
    
    // Valid stages for Lead
    const validStageNames = ['New', 'Contacted', 'Qualified', 'Close Won', 'Close Lost', 'Junk'];

    for (const bp of leadBlueprints) {
      let stages = [];
      if (typeof bp.stages === 'string') {
        stages = JSON.parse(bp.stages);
      } else if (Array.isArray(bp.stages)) {
        stages = bp.stages;
      } else if (bp.stages && bp.stages.create) {
        stages = bp.stages.create;
      }

      const initialCount = stages.length;
      
      // Filter out invalid stages
      const filteredStages = stages.filter(stage => validStageNames.includes(stage.name));
      
      console.log(`Blueprint ${bp.id}: Removing ${initialCount - filteredStages.length} invalid stages.`);

      let newStagesObj = bp.stages;
      if (typeof bp.stages === 'string' || Array.isArray(bp.stages)) {
        newStagesObj = filteredStages;
      } else if (bp.stages && bp.stages.create) {
        newStagesObj = { ...bp.stages, create: filteredStages };
      }

      await prisma.blueprint.update({
        where: { id: bp.id },
        data: {
          stages: newStagesObj
        }
      });
      
      console.log(`Updated Blueprint ${bp.id} successfully.`);
    }

    console.log("All Lead blueprints fixed.");
  } catch (error) {
    console.error("Error fixing lead stages:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLeadStages();
