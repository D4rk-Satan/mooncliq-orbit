import { NextResponse } from 'next/server';

// Meta Webhook Verification
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // In production, you would check this against a secure env variable
  // e.g. process.env.META_WEBHOOK_VERIFY_TOKEN
  const VERIFY_TOKEN = "mooncliq_whatsapp_secret";

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      return new NextResponse(challenge, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
    }
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

// Receive Incoming Messages from Meta
export async function POST(request) {
  try {
    const body = await request.json();

    // Check if it's a WhatsApp API event
    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
        const from = body.entry[0].changes[0].value.messages[0].from; // Customer's phone number
        const msgBody = body.entry[0].changes[0].value.messages[0].text?.body; // Text message content
        
        console.log(`[Meta Webhook] Received message from ${from} to PhoneNumberId ${phoneNumberId}: "${msgBody}"`);
        
        // TODO: Map the phoneNumberId to an Organization in the database
        // and save the message in the ChatMessage table (Phase 2.2b)
      }
      
      // Return a 200 OK to Meta so they know we received it, otherwise they retry repeatedly
      return NextResponse.json({ status: 'success' }, { status: 200 });
    }

    return NextResponse.json({ error: 'Event not supported' }, { status: 404 });
  } catch (error) {
    console.error('WhatsApp Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
