const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) return console.log('No org');

  const lead = await prisma.lead.findFirst({ where: { organizationId: org.id }});
  if (!lead) return console.log('No lead');

  const bp = await prisma.blueprint.findFirst({ where: { moduleType: 'Lead', organizationId: org.id }, include: { transitions: true }});
  if (!bp || bp.transitions.length === 0) return console.log('No blueprint or transitions');

  const transition = bp.transitions[0];
  console.log('Testing Transition:', transition.name);

  try {
    // 1. Simulate finding the blueprint for target module "Task"
    const targetBlueprint = await prisma.blueprint.findFirst({
      where: { organizationId: org.id, moduleType: 'Task' },
      include: { fields: true, stages: { orderBy: { orderIndex: 'asc' } } }
    });
    console.log('Target Blueprint found:', !!targetBlueprint);

    if (targetBlueprint) {
      let targetStageId = targetBlueprint.stages[0]?.id;
      if (!targetStageId) {
         console.log('No stage found, would create one.');
      } else {
         console.log('Target stage:', targetStageId);
      }
    }
    
    // Simulate updating Lead
    const updateData = { stageId: transition.toStageId };
    console.log('Update Data:', updateData);
    
    await prisma.lead.update({
      where: { id: lead.id },
      data: updateData
    });
    console.log('Lead updated successfully!');

  } catch (err) {
    console.error('Error during transition test:', err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
