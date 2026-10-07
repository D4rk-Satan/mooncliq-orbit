import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

async function enrichWithUserNames(recordsOrRecord) {
    const isArray = Array.isArray(recordsOrRecord);
    const records = isArray ? recordsOrRecord : [recordsOrRecord];
    
    const userIds = [...new Set(records.map(r => r.lastModifiedById).filter(Boolean))];
    if (userIds.length === 0) return recordsOrRecord;

    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        include: { profile: true }
    });
    
    const userMap = {};
    users.forEach(u => {
        userMap[u.id] = u.profile?.nickname || u.email;
    });

    const mapped = records.map(r => ({
        ...r,
        lastModifiedByName: r.lastModifiedById ? userMap[r.lastModifiedById] : null
    }));

    return isArray ? mapped : mapped[0];
}

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

        const enrichedRecords = await enrichWithUserNames(records);
        return NextResponse.json(enrichedRecords);
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
        const { customModuleId, blueprintId, stageId, owner, customData, ...flatCustomData } = data;
        const finalCustomData = { ...(customData || {}), ...flatCustomData };

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
                                finalCustomData[field.name] = generatedValue;

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
                customData: finalCustomData, // Use the correctly extracted customData
                lastActivityDate: new Date(),
                lastModifiedById: user.id
            },
            include: {
                stage: true
            }
        });

        const enrichedNewRecord = await enrichWithUserNames(newRecord);
        return NextResponse.json(enrichedNewRecord, { status: 201 });
    } catch (error) {
        console.error("Error creating custom record:", error);
        return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        const data = await request.json();
        const { customData, stageId, owner } = data;

        // Fetch existing record to safely merge customData
        const existingRecord = await prisma.customRecord.findUnique({
            where: { id }
        });

        if (!existingRecord) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        // Merge the existing custom data with the new incoming custom data
        const mergedCustomData = {
            ...(existingRecord.customData || {}),
            ...(customData || {})
        };

        const updateData = {
            customData: mergedCustomData,
            lastActivityDate: new Date(),
            lastModifiedById: user.id
        };

        if (stageId) updateData.stageId = stageId;
        if (owner) updateData.owner = owner;

        const updatedRecord = await prisma.customRecord.update({
            where: {
                id: id,
                organizationId: user.organizationId // Security check
            },
            data: updateData,
            include: { stage: true }
        });

        const enrichedUpdatedRecord = await enrichWithUserNames(updatedRecord);
        return NextResponse.json(enrichedUpdatedRecord);
    } catch (error) {
        console.error("Error updating custom record:", error);
        return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
    }
}

export async function PATCH(request) {
    return PUT(request);
}
