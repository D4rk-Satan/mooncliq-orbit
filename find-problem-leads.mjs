import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const validStageNames = ['New', 'Contacted', 'Qualified', 'Close Won', 'Close Lost', 'Junk'];
  
  // Find all stages that are invalid for Lead
  const invalidStages = await prisma.stage.findMany({
    where: {
      blueprint: { moduleType: 'Lead' },
      name: { notIn: validStageNames }
    }
  });

  const invalidStageIds = invalidStages.map(s => s.id);
  
  // Find leads that use these stages
  const problemLeads = await prisma.lead.findMany({
    where: {
      stageId: { in: invalidStageIds }
    },
    include: { stage: true }
  });

  console.log("Total invalid stages found:", invalidStages.length);
  console.log("Problem leads blocking deletion:", JSON.stringify(problemLeads, null, 2));
}

main().finally(() => prisma.$disconnect());
