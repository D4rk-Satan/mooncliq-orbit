import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request) {
    try {
        // 1. Check user login
        const session = await getAuthUser(request);
        if (!session?.organizationId || !session?.profileId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Frontend Modal se aane wala data read karna
        const body = await request.json();
        const {
            avatarUrl,
            nickname,
            role,
            logoUrl,
            industry,
            teamSize
        } = body;

        // 3. User ki Personal Profile (Avatar, Nickname) update karna
        await prisma.profile.update({
            where: { id: session.profileId },
            data: {
                avatarUrl,
                nickname,
                role,
                onboardingCompleted: true // Yahan hum true kar dete hain taki Modal dubara kabhi na khule!
            }
        });

        // 4. Agar user Super Admin hai aur usne Logo/Industry dala hai, toh Company bhi update kardo
        if (logoUrl || industry || teamSize) {
            await prisma.organization.update({
                where: { id: session.organizationId },
                data: {
                    logoUrl,
                    industry,
                    teamSize
                }
            });
        }

        return NextResponse.json({ success: true, message: "Onboarding saved successfully!" });

    } catch (error) {
        console.error('Onboarding update error:', error);
        return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 });
    }
}
