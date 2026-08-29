import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getDefaultBlueprintData } from '@/utils/blueprintDefaults';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const allBlueprints = await prisma.blueprint.findMany();
    let updatedCount = 0;

    for (const blueprint of allBlueprints) {
      const defaults = getDefaultBlueprintData(blueprint.moduleType);
      
      if (defaults && defaults.stages && defaults.stages.create) {
        const defaultStages = defaults.stages.create;
        
        // Find existing stages for this blueprint
        const existingStages = await prisma.stage.findMany({ 
          where: { blueprintId: blueprint.id } 
        });

        for (const existingStage of existingStages) {
          // Find the default color for this stage name
          const defaultStageDef = defaultStages.find(ds => ds.name === existingStage.name);
          
          if (defaultStageDef && defaultStageDef.color && existingStage.color !== defaultStageDef.color) {
            await prisma.stage.update({
              where: { id: existingStage.id },
              data: { color: defaultStageDef.color }
            });
            updatedCount++;
          }
        }
      }
    }

    return NextResponse.json({ 
      message: "Successfully updated missing stage colors!", 
      stagesUpdated: updatedCount 
    });
  } catch (error) {
    console.error("Error updating colors:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
