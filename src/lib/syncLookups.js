import prisma from './prisma';

export async function executeBiDirectionalSync(organizationId, sourceModuleType, sourceRecord, blueprintId) {
  try {
    const blueprint = await prisma.blueprint.findUnique({
      where: { id: blueprintId },
      include: { fields: true }
    });

    if (!blueprint) return;

    const lookupFields = blueprint.fields.filter(f => f.type === 'lookup' && f.isBiDirectional && f.targetModule);

    for (const field of lookupFields) {
      const sourcePayload = sourceRecord.customData[field.name];
      if (!sourcePayload) continue;

      const targetRecords = Array.isArray(sourcePayload) ? sourcePayload : [sourcePayload];
      const targetIds = targetRecords.map(t => t.id).filter(id => !!id);

      if (targetIds.length === 0) continue;

      const targetBp = await prisma.blueprint.findFirst({
        where: { organizationId, moduleType: field.targetModule },
        include: { fields: true }
      });

      if (!targetBp) continue;

      const reverseField = targetBp.fields.find(f => 
        f.type === 'lookup' && 
        f.isBiDirectional &&
        f.targetModule === sourceModuleType &&
        Array.isArray(f.options) && 
        f.options.some(opt => opt.reverseOf === field.id)
      );

      if (!reverseField) continue;

      for (const targetId of targetIds) {
        const targetModelName = field.targetModule.toLowerCase();
        
        const targetDbRecord = await prisma[targetModelName].findUnique({
          where: { id: targetId }
        });

        if (targetDbRecord) {
          const currentCustomData = typeof targetDbRecord.customData === 'string' 
            ? JSON.parse(targetDbRecord.customData) 
            : targetDbRecord.customData || {};

          let reversePayload = currentCustomData[reverseField.name] || [];
          if (!Array.isArray(reversePayload)) {
            reversePayload = [reversePayload];
          }

          const alreadyLinked = reversePayload.some(r => r.id === sourceRecord.id);
          if (!alreadyLinked) {
            const displayName = sourceRecord.firstName 
              ? `${sourceRecord.firstName} ${sourceRecord.lastName || ''}`.trim()
              : sourceRecord.taskName || sourceRecord.name || sourceRecord.companyName || sourceRecord.id;

            reversePayload.push({
              id: sourceRecord.id,
              name: displayName
            });

            currentCustomData[reverseField.name] = reversePayload;

            await prisma[targetModelName].update({
              where: { id: targetId },
              data: { customData: currentCustomData }
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("Error executing Bi-Directional Sync:", err);
  }
}
