import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// Helper function to generate default blueprint for any Custom Module
function getCustomModuleBlueprintDefaults() {
    return {
        stages: {
            create: [
                { name: 'New', orderIndex: 1, color: '#3b82f6', isSystem: true },
                { name: 'In Progress', orderIndex: 2, color: '#eab308', isSystem: true },
                { name: 'Completed', orderIndex: 3, color: '#10b981', isSystem: true }
            ]
        },
        fields: {
            create: [
                { name: 'name', label: 'Record Name', type: 'Text', isRequired: true, isSystemField: true, sectionName: 'General Information', orderIndex: 1 },
                { name: 'owner', label: 'Owner', type: 'User', isRequired: true, isSystemField: true, sectionName: 'General Information', orderIndex: 2 },
                { name: 'createdAt', label: 'Created Date', type: 'Datetime', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 3, isHidden: true },
                { name: 'lastActivityDate', label: 'Last Activity Date', type: 'Datetime', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 4, isHidden: true },
                { name: 'lastModifiedById', label: 'Last Modified By', type: 'User', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 5, isHidden: true }
            ]
        }
    };
}

export async function GET(request) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(request.url);
        const fetchAll = url.searchParams.get('all') === 'true';

        const customModules = await prisma.customModule.findMany({
            where: {
                organizationId: user.organizationId,
                ...(fetchAll ? {} : { isActive: true }) // fetch all if ?all=true, else only active
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(customModules);
    } catch (error) {
        console.error("Error fetching custom modules:", error);
        return NextResponse.json({ error: 'Failed to fetch custom modules' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, singularName, icon } = await request.json();

        if (!name || !singularName) {
            return NextResponse.json({ error: 'Name and singularName are required' }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create the custom module
            const customModule = await tx.customModule.create({
                data: {
                    organizationId: user.organizationId,
                    name,
                    singularName,
                    icon: icon || 'Box'
                }
            });

            // 2. Fetch inline default layout
            const defaultData = getCustomModuleBlueprintDefaults();

            // 3. Create Blueprint
            const blueprint = await tx.blueprint.create({
                data: {
                    organizationId: user.organizationId,
                    moduleType: customModule.id, // Link to custom module ID
                    name: `${name} Pipeline`,
                    layoutConfig: {}
                }
            });

            // 4. Create Stages
            if (defaultData.stages?.create) {
                for (const stage of defaultData.stages.create) {
                    await tx.stage.create({
                        data: {
                            ...stage,
                            blueprintId: blueprint.id
                        }
                    });
                }
            }

            // 5. Create Fields
            if (defaultData.fields?.create) {
                for (const field of defaultData.fields.create) {
                    await tx.field.create({
                        data: {
                            ...field,
                            blueprintId: blueprint.id
                        }
                    });
                }
            }

            return customModule;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("Error creating custom module:", error);
        return NextResponse.json({ error: 'Failed to create custom module' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, name, singularName, icon } = body;

        if (!id || !name) {
            return NextResponse.json({ error: 'ID and Name are required' }, { status: 400 });
        }

        const updatedModule = await prisma.customModule.update({
            where: {
                id: id,
                organizationId: user.organizationId
            },
            data: {
                name,
                singularName,
                icon
            }
        });

        return NextResponse.json(updatedModule);
    } catch (error) {
        console.error('Error updating custom module:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
