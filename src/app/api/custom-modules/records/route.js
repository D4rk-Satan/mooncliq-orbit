import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(request) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const moduleId = searchParams.get('moduleId');

        if (!moduleId) {
            return NextResponse.json({ error: 'moduleId is required' }, { status: 400 });
        }

        const records = await prisma.customRecord.findMany({
            where: {
                organizationId: user.organizationId,
                customModuleId: moduleId
            },
            include: {
                stage: true // Include stage data for Kanban views
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(records);
    } catch (error) {
        console.error("Error fetching custom records:", error);
        return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();
        const { customModuleId, blueprintId, stageId, owner, ...customData } = data;

        if (!customModuleId || !blueprintId || !stageId) {
            return NextResponse.json({ error: 'Module, Blueprint, and Stage IDs are required' }, { status: 400 });
        }

        // --- AUTO-NUMBER LOGIC START ---
        // Fetch blueprint to check for autonumber fields and get their current sequence
        const blueprint = await prisma.blueprint.findUnique({
            where: { id: blueprintId }
        });

        if (blueprint && blueprint.layoutConfig) {
            let layoutConfig = blueprint.layoutConfig;
            let layoutChanged = false;

            // Iterate over sections and fields to find autonumber fields
            if (layoutConfig.sections) {
                layoutConfig.sections.forEach(section => {
                    if (section.fields) {
                        section.fields.forEach(field => {
                            if (field.type === 'autonumber') {
                                const prefix = field.prefix || '';
                                const suffix = field.suffix || '';
                                const nextNum = field.nextNumber || 1;
                                
                                // Generate the autonumber value
                                const generatedValue = `${prefix}${nextNum}${suffix}`;
                                
                                // Insert into customData (overriding whatever client sent)
                                customData[field.name] = generatedValue;

                                // Increment the counter in the blueprint config
                                field.nextNumber = nextNum + 1;
                                layoutChanged = true;
                            }
                        });
                    }
                });
            }

            // Save the updated blueprint if sequences were incremented
            if (layoutChanged) {
                await prisma.blueprint.update({
                    where: { id: blueprintId },
                    data: { layoutConfig }
                });
            }
        }
        // --- AUTO-NUMBER LOGIC END ---

        const newRecord = await prisma.customRecord.create({
            data: {
                organizationId: user.organizationId,
                customModuleId,
                blueprintId,
                stageId,
                owner: owner || user.email,
                customData, // All dynamic fields including generated auto-numbers go here
                lastActivityDate: new Date(),
                lastModifiedById: user.id
            }
        });

        return NextResponse.json(newRecord, { status: 201 });
    } catch (error) {
        console.error("Error creating custom record:", error);
        return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
    }
}
