import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { to, type = 'template', templateName = 'hello_world', textBody } = await req.json();

    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
    const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
      return NextResponse.json({ error: 'WhatsApp credentials missing in .env' }, { status: 500 });
    }

    // Format phone number (remove +, spaces, dashes)
    const formattedTo = to.replace(/[^0-9]/g, '');

    // Prepare message payload
    let messageData = {
      messaging_product: 'whatsapp',
      to: formattedTo,
    };

    if (type === 'template') {
      messageData.type = 'template';
      messageData.template = {
        name: templateName,
        language: { code: 'en_US' }
      };
    } else if (type === 'text') {
      messageData.type = 'text';
      messageData.text = { body: textBody };
    }

    // Call Meta API
    const response = await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Meta API Error:", data);
      return NextResponse.json({ error: 'Failed to send message', details: data }, { status: response.status });
    }

    return NextResponse.json({ success: true, messageId: data.messages?.[0]?.id, data });

  } catch (error) {
    console.error('WhatsApp Send API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
