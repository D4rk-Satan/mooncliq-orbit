import { NextResponse } from 'next/server';
import { getAuthUser, clearUserCache } from '@/lib/auth';
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
            gstNumber,
            industry,
            teamSize
        } = body;

        const companyName = (body.companyName || body.orgName || '').trim();

        // 2.3 GST Number Validation and Uniqueness Check
        let normalizedGst = null;
        if (gstNumber && typeof gstNumber === 'string' && gstNumber.trim()) {
            normalizedGst = gstNumber.trim().toUpperCase();
            const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            if (!gstRegex.test(normalizedGst)) {
                return NextResponse.json(
                    { error: "Invalid GST Number format. It should be 15 characters (e.g., 24AAACC1206D1ZH)." },
                    { status: 400 }
                );
            }

            const existingOrgWithGst = await prisma.organization.findFirst({
                where: {
                    gstNumber: normalizedGst,
                    id: { not: session.organizationId }
                }
            });

            if (existingOrgWithGst) {
                return NextResponse.json(
                    { error: `GST Number "${normalizedGst}" is already registered with another organization.` },
                    { status: 400 }
                );
            }
        }

        // 2.5 Unique Nickname Validation (Org Level Check)
        if (nickname) {
            const existingNickname = await prisma.profile.findFirst({
                where: {
                    organizationId: session.organizationId,
                    nickname: { equals: nickname.trim(), mode: 'insensitive' },
                    id: { not: session.profileId } // Khud ka purana profile exclude
                }
            });

            if (existingNickname) {
                return NextResponse.json(
                    { error: `Nickname "${nickname}" is already taken in your organization. Please choose another.` },
                    { status: 400 }
                );
            }
        }

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

        // 4. Update Organization Details (Company Name from signup onboarding, GST, Logo, Industry, Team Size)
        const orgUpdate = {};
        if (logoUrl !== undefined) orgUpdate.logoUrl = logoUrl;
        if (industry !== undefined) orgUpdate.industry = industry;
        if (teamSize !== undefined) orgUpdate.teamSize = teamSize;
        if (gstNumber !== undefined) orgUpdate.gstNumber = normalizedGst;
        if (companyName && typeof companyName === 'string' && companyName.trim()) {
            orgUpdate.name = companyName.trim();
        }

        if (Object.keys(orgUpdate).length > 0) {
            await prisma.organization.update({
                where: { id: session.organizationId },
                data: orgUpdate
            });
        }

        // 5. Invalidate cache so next /api/me call gets fresh data!
        clearUserCache(session.id);

        return NextResponse.json({ success: true, message: "Onboarding saved successfully!" });

    } catch (error) {
        console.error('Onboarding update error:', error);
        return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 });
    }
}
