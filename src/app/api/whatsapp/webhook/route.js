import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Yeh token aap kuch bhi set kar sakte hain, bas Meta me setup karte waqt yahi token daalna hoga
const VERIFY_TOKEN = 'mooncliq_whatsapp_secret_123';

// 1. GET request - Meta isse call karta hai aapke webhook ko verify karne ke liye
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    return new NextResponse(challenge, { status: 200 });
  } else {
    return new NextResponse('Forbidden', { status: 403 });
  }
}

// 2. POST request - Meta ispar customers ke naye messages bhejta hai
export async function POST(req) {
  try {
    const body = await req.json();

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          
          // Meta bhejta hai ki kis Phone ID par message aaya hai
          const phoneNumberId = change.value.metadata?.phone_number_id;

          if (change.value.messages) {
            const message = change.value.messages[0];
            const senderPhone = message.from;
            const messageText = message.text?.body || '[Non-text message]';

            // 1. Ek default Organization dhoondhte hain (Local DB ke liye)
            const org = await prisma.organization.findFirst({
              where: { whatsappPhoneNumberId: phoneNumberId }
            }) || await prisma.organization.findFirst(); // Agar Phone ID se nahi mili toh pehli Org le lo

            if (org) {
              // 2. Message ko Database (ChatMessage table) me save kar do
              await prisma.chatMessage.create({
                data: {
                  organizationId: org.id,
                  direction: 'inbound', // Customer ne bheja hai isliye inbound
                  toPhone: phoneNumberId || 'system',
                  fromPhone: senderPhone,
                  body: messageText,
                  status: 'received',
                }
              });
              console.log(`✅ Message saved in DB from: ${senderPhone}`);
            } else {
              console.log('⚠️ Organization not found in DB!');
            }
          }
        }
      }
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json({ success: false }, { status: 404 });
    }
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
