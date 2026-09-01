import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getAuthUser } from '../../../../lib/auth';

export async function PUT(request) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { blueprints } = await request.json();

        // blueprints is expected to be an array of objects: [{ id: "uuid", executionOrder: 1 }, ...]
        if (!Array.isArray(blueprints)) {
            return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
        }

        // Run a transaction to update all execution orders safely
        await prisma.$transaction(
            blueprints.map((bp) =>
                prisma.blueprint.update({
                    where: {
                        id: bp.id,
                        organizationId: user.organizationId // security check
                    },
                    data: { executionOrder: bp.executionOrder },
                })
            )
        );

        return NextResponse.json({ success: true, message: "Order updated successfully" });
    } catch (error) {
        console.error("Failed to reorder blueprints:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
