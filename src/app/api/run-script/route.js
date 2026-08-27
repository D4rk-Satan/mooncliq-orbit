import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getDefaultBlueprintData } from '../../../utils/blueprintDefaults';

export async function POST() {
  try {
    // Deal aur Product dono ke defaults uthayenge
    const dealDefaults = getDefaultBlueprintData('Deal');
    const productDefaults = getDefaultBlueprintData('Product');
    const taskDefaults = getDefaultBlueprintData('Task');
    const accountDefaults = getDefaultBlueprintData('Account');
    const dealFields = dealDefaults.fields.create;
    const productFields = productDefaults.fields.create;
    const taskFields = taskDefaults.fields.create;
    const accountFields = accountDefaults.fields.create;

    const organizations = await prisma.organization.findMany();
    let logs = [];

    for (const org of organizations) {
      logs.push(`Processing org: ${org.id}`);

      // Dono modules ('Deal', 'Product') par ek loop chalayenge
      const modules = [
        { name: 'Deal', defaults: dealFields },
        { name: 'Product', defaults: productFields },
        { name: 'Task', defaults: taskFields },
        { name: 'Account', defaults: accountFields },
      ];

      for (const mod of modules) {
        let blueprint = await prisma.blueprint.findFirst({
          where: { organizationId: org.id, moduleType: mod.name }
        });

        if (!blueprint) continue;

        const deleted = await prisma.field.deleteMany({
          where: { blueprintId: blueprint.id }
        });
        logs.push(`Deleted ${deleted.count} old fields.`);

        const fieldsData = mod.defaults.map(f => {
          let mappings = undefined;
          if (f.mappings) mappings = JSON.stringify(f.mappings);
          return {
            name: f.name,
            label: f.label,
            type: f.type,
            options: f.options || [],
            isRequired: f.isRequired || false,
            isSystemField: f.isSystemField || false,
            isHidden: f.isHidden || false,
            sectionName: f.sectionName || 'General',
            orderIndex: f.orderIndex || 0,
            blueprintId: blueprint.id,
            targetModule: f.targetModule,
            subformFields: f.subformFields,
            mappings: mappings
          };
        });

        const created = await prisma.field.createMany({ data: fieldsData });
        logs.push(`Created ${created.count} new fields for org ${org.id}.`);
      }
    }
    return NextResponse.json({ success: true, logs });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}


