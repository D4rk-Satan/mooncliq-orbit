import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getDefaultBlueprintData } from '@/utils/blueprintDefaults';

export async function GET() {
  try {
    let fieldsCreated = 0;
    let blueprintsUpdated = 0;
    let stagesCreated = 0;

    // Saare blueprints nikal lo (Lead, Deal, Account)
    const allBlueprints = await prisma.blueprint.findMany();

    for (const blueprint of allBlueprints) {
      // 1. Purani 'firstName' & 'lastName' delete karna (Sirf Lead ke liye)
      if (blueprint.moduleType === 'Lead') {
        await prisma.field.deleteMany({
          where: {
            blueprintId: blueprint.id,
            name: { in: ['firstName', 'lastName'] }
          }
        });
      }

      // Central file se is module ke defaults uthao
      const defaults = getDefaultBlueprintData(blueprint.moduleType);

      if (defaults) {
        let isUpdated = false;

        // ----------------------------------------------------
        // 2. FORM FIELDS SYNC KARNA
        // ----------------------------------------------------
        if (defaults.fields && defaults.fields.create) {
          const requiredFields = defaults.fields.create;
          const existingFields = await prisma.field.findMany({ where: { blueprintId: blueprint.id } });
          const existingFieldNames = existingFields.map(f => f.name);

          for (const sysF of requiredFields) {
            if (!existingFieldNames.includes(sysF.name)) {
              await prisma.field.create({ data: { ...sysF, blueprintId: blueprint.id } });
              fieldsCreated++;
              isUpdated = true;
            }
          }
        }

        // ----------------------------------------------------
        // 3. STAGES SYNC KARNA
        // ----------------------------------------------------
        if (defaults.stages && defaults.stages.create) {
          const requiredStages = defaults.stages.create;
          const existingStages = await prisma.stage.findMany({ where: { blueprintId: blueprint.id } });
          const existingStageNames = existingStages.map(s => s.name);

          let nextOrderIndex = existingStages.length;

          for (const stage of requiredStages) {
            if (!existingStageNames.includes(stage.name)) {
              await prisma.stage.create({
                data: {
                  blueprintId: blueprint.id,
                  name: stage.name,
                  color: stage.color,
                  orderIndex: nextOrderIndex,
                  requiredFields: []
                }
              });
              nextOrderIndex++;
              stagesCreated++;
            }
          }
        }

        // Agar fields add hue hain, toh layout ko reset kar do taaki form update ho jaye
        if (isUpdated) {
          await prisma.blueprint.update({
            where: { id: blueprint.id },
            data: { layoutConfig: null }
          });
          blueprintsUpdated++;
        }
      }
    }

    return NextResponse.json({
      message: "Sync Complete! Single Source of Truth architecture is now active.",
      fieldsCreated,
      stagesCreated,
      blueprintsUpdated
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
