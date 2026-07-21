import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Ensure you have these environment variables set in your .env:
// AWS_ACCESS_KEY_ID
// AWS_SECRET_ACCESS_KEY
// AWS_REGION (e.g., ap-south-1, us-east-1)
// AWS_SES_FROM_EMAIL (e.g., no-reply@yourdomain.com)

const sesClient = new SESClient({
  region: process.env.AWS_REGION || "ap-south-1",
  // In development, AWS SDK automatically picks up AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
  // from the environment variables. If you deploy to EC2/Vercel with an IAM role, it will use that automatically.
});

/**
 * Sends an RBAC Invitation Email using AWS SES.
 * @param {string} toEmail - The recipient's email address.
 * @param {string} inviteLink - The unique link containing the generated token.
 * @param {string} organizationName - The name of the organization inviting the user.
 * @param {string} profileName - The RBAC profile they will be assigned.
 */
export async function sendInvitationEmail(toEmail, inviteLink, organizationName, profileName) {
  const senderEmail = process.env.AWS_SES_FROM_EMAIL;
  
  if (!senderEmail) {
    console.warn("AWS_SES_FROM_EMAIL is not set. SES email dispatch skipped.");
    return false;
  }

  const subject = `You've been invited to join ${organizationName} on Mooncliq Orbit!`;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a;">Join ${organizationName}</h2>
      <p style="color: #334155; font-size: 16px;">
        You have been invited to join <strong>${organizationName}</strong> as a <strong>${profileName}</strong>.
      </p>
      <p style="color: #334155; font-size: 16px;">
        Click the button below to accept your invitation and set up your account. This link will expire in 7 days.
      </p>
      <div style="text-align: center; margin-top: 30px; margin-bottom: 30px;">
        <a href="${inviteLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
          Accept Invitation
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 20px; margin-bottom: 20px;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">
        If you did not expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `;

  const params = {
    Source: senderEmail,
    Destination: {
      ToAddresses: [toEmail],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: "UTF-8",
        },
      },
    },
  };

  try {
    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);
    console.log(`SES Email successfully sent to ${toEmail}. MessageId: ${response.MessageId}`);
    return true;
  } catch (error) {
    console.error("Error sending SES email:", error);
    return false;
  }
}
