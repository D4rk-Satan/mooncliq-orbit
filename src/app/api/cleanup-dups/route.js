import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function POST() {
  try {
    let logs = [];
    const blueprints = await prisma.blueprint.findMany({ where: { moduleType: 'Deal' } });
    
    for (const bp of blueprints) {
      const fields = await prisma.field.findMany({ where: { blueprintId: bp.id } });
      logs.push(`Blueprint ${bp.id} has ${fields.length} fields.`);
      
      const counts = {};
      for (const f of fields) {
        counts[f.name] = (counts[f.name] || 0) + 1;
      }
      
      const dups = Object.entries(counts).filter(([name, c]) => c > 1);
      if (dups.length > 0) {
        logs.push(`Duplicates found: ${JSON.stringify(dups)}`);
        for (const [name] of dups) {
          const dupFields = fields.filter(f => f.name === name);
          // keep one (the first one), delete the rest
          for (let i = 1; i < dupFields.length; i++) {
            await prisma.field.delete({ where: { id: dupFields[i].id } });
            logs.push(`Deleted duplicate field ${name} (id: ${dupFields[i].id})`);
          }
        }
      } else {
        logs.push('No duplicates found.');
      }
    }
    return NextResponse.json({ success: true, logs });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
