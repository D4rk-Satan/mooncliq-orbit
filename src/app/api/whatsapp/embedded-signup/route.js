import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req) {
  try {
    const session = await getAuthUser(req);
    if (!session?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      return NextResponse.json({ 
        error: 'Meta App configuration missing on server (META_APP_ID / META_APP_SECRET)' 
      }, { status: 500 });
    }

    console.log(`[Embedded Signup] Exchanging code for organization: ${session.organizationId}...`);

    // 1. Exchange short-lived auth code for Meta Access Token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` + 
      new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        code: code
      });

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[Embedded Signup] Token exchange error:', tokenData);
      return NextResponse.json({ 
        error: tokenData.error?.message || 'Failed to exchange authorization code with Meta' 
      }, { status: 400 });
    }

    const accessToken = tokenData.access_token;

    // 2. Query debug_token to get granular details (WABA ID & shared assets)
    const debugUrl = `https://graph.facebook.com/v19.0/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`;
    const debugRes = await fetch(debugUrl);
    const debugData = await debugRes.json();

    console.log('[Embedded Signup] Debug Token Info:', JSON.stringify(debugData, null, 2));

    // Extract granular scopes and WABA IDs from debug token or shared accounts
    let wabaId = null;
    let phoneNumberId = null;
    let displayPhoneNumber = null;

    if (debugData?.data?.granular_scopes) {
      const wabaScope = debugData.data.granular_scopes.find(
        s => s.scope === 'whatsapp_business_management'
      );
      if (wabaScope?.target_ids?.length > 0) {
        wabaId = wabaScope.target_ids[0];
      }
    }

    // Fallback: If granular_scopes didn't yield WABA ID, fetch from /me/accounts or client WABA endpoint
    if (!wabaId) {
      const meAccountsRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,accounts{id,name}&access_token=${accessToken}`);
      const meData = await meAccountsRes.json();
      console.log('[Embedded Signup] /me data:', JSON.stringify(meData, null, 2));
    }

    // 3. If we have WABA ID, fetch its registered Phone Numbers
    if (wabaId) {
      const phoneRes = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?access_token=${accessToken}`);
      const phoneData = await phoneRes.json();
      console.log('[Embedded Signup] Phone numbers:', JSON.stringify(phoneData, null, 2));

      if (phoneData?.data?.length > 0) {
        phoneNumberId = phoneData.data[0].id;
        displayPhoneNumber = phoneData.data[0].display_phone_number;
      }

      // 4. Auto-subscribe our Webhook to this client WABA
      try {
        await fetch(`https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        console.log(`[Embedded Signup] Successfully subscribed webhooks to WABA: ${wabaId}`);
      } catch (subErr) {
        console.warn('[Embedded Signup] Webhook subscription warning:', subErr);
      }
    }

    // 5. Update Organization in Database
    const updatedOrg = await prisma.organization.update({
      where: { id: session.organizationId },
      data: {
        whatsappAccessToken: accessToken,
        whatsappPhoneNumberId: phoneNumberId || '',
        whatsappWabaId: wabaId || ''
      }
    });

    console.log(`[Embedded Signup] Successfully connected WABA ${wabaId} for org ${session.organizationId}`);

    return NextResponse.json({
      success: true,
      wabaId,
      phoneNumberId,
      displayPhoneNumber
    });

  } catch (error) {
    console.error('[Embedded Signup] Internal Server Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

