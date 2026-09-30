import { NextResponse } from 'next/server';

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

    // Check if it's a WhatsApp status update or message
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          
          // Agar message status aaya (sent, delivered, read)
          if (change.value.statuses) {
            const status = change.value.statuses[0];
            console.log(`Message ${status.id} status updated to: ${status.status}`);
          }

          // Agar naya message aaya customer se
          if (change.value.messages) {
            const message = change.value.messages[0];
            const contact = change.value.contacts?.[0];
            
            const senderPhone = message.from;
            const senderName = contact?.profile?.name || 'Unknown';
            const messageText = message.text?.body || '[Non-text message]';

            console.log(`🟢 NAYA MESSAGE AAYA!`);
            console.log(`Sender: ${senderName} (${senderPhone})`);
            console.log(`Text: ${messageText}`);

            // TODO: Yahan par hum message ko Database (Prisma) me save karenge aage chalkar
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
