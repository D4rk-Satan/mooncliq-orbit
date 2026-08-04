import prisma from './prisma';
import { deductBalance } from './billingUtils';

const COST_PER_MESSAGE = 1.00; // Deduct ₹1 per outgoing message

/**
 * Sends a WhatsApp text message and deducts money from the organization's wallet.
 * @param {string} to - The recipient's phone number with country code (e.g. "919876543210")
 * @param {string} messageText - The text message to send
 * @param {string} organizationId - The ID of the organization sending the message
 * @returns {object} - { success: boolean, error?: string, messageId?: string }
 */
export async function sendWhatsAppMessage(to, messageText, organizationId) {
  try {
    // 1. Fetch Organization settings and wallet balance
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { 
        walletBalance: true,
        whatsappAccessToken: true,
        whatsappPhoneNumberId: true
      }
    });

    if (!org) {
      return { success: false, error: 'Organization not found' };
    }

    // 2. Validate Setup
    if (!org.whatsappAccessToken || !org.whatsappPhoneNumberId) {
      return { success: false, error: 'WhatsApp API is not configured. Please add keys in Settings.' };
    }

    // 3. Check Wallet Balance
    if (org.walletBalance < COST_PER_MESSAGE) {
      return { success: false, error: 'Insufficient wallet balance. Please recharge.' };
    }

    // 4. Hit Meta Graph API to send message
    const metaApiUrl = `https://graph.facebook.com/v19.0/${org.whatsappPhoneNumberId}/messages`;
    
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "text",
      text: {
        preview_url: false,
        body: messageText
      }
    };

    const response = await fetch(metaApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${org.whatsappAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Meta API Error:", data);
      return { success: false, error: data.error?.message || 'Failed to send WhatsApp message via Meta API' };
    }

    // 5. Deduct Wallet Balance since message was sent successfully
    await deductBalance(organizationId, COST_PER_MESSAGE, `WhatsApp Message sent to ${to}`);

    return { 
      success: true, 
      messageId: data.messages?.[0]?.id 
    };

  } catch (error) {
    console.error("sendWhatsAppMessage exception:", error);
    return { success: false, error: 'Internal server error while sending message' };
  }
}
