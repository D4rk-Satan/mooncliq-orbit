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
 * @param {string} inviterName - The name or email of the person who invited them.
 * @param {string} orgLogo - The URL of the organization's logo (optional).
 */
export async function sendInvitationEmail(toEmail, inviteLink, organizationName, profileName, inviterName, orgLogo) {
  const senderEmail = process.env.AWS_SES_FROM_EMAIL;
  
  if (!senderEmail) {
    console.warn("AWS_SES_FROM_EMAIL is not set. SES email dispatch skipped.");
    return false;
  }

  const subject = `You've been invited to join ${organizationName} on Mooncliq Orbit!`;
  const logoHtml = orgLogo ? `<img src="${orgLogo}" alt="${organizationName} Logo" style="max-height: 50px; display: block; margin: 0 auto 20px auto;" />` : '';

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="background-color: #f8fafc; padding: 40px 0; font-family: Arial, sans-serif; margin: 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 40px;">
              <tr>
                <td align="center" style="padding-bottom: 20px;">
                  ${logoHtml}
                  <h2 style="color: #0f172a; margin: 0; font-size: 24px;">Join ${organizationName}</h2>
                </td>
              </tr>
              <tr>
                <td style="color: #334155; font-size: 16px; line-height: 1.5; padding-bottom: 20px;">
                  Hi there,<br><br>
                  <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> as a <strong>${profileName}</strong> on Mooncliq Orbit.
                </td>
              </tr>
              <tr>
                <td style="color: #334155; font-size: 16px; line-height: 1.5; padding-bottom: 30px;">
                  Click the button below to accept your invitation and set up your account. This link will expire in 7 days.
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-bottom: 30px;">
                  <a href="${inviteLink}" style="background-color: #3b82f6; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
                    Accept Invitation
                  </a>
                </td>
              </tr>
              <tr>
                <td style="color: #64748b; font-size: 14px; line-height: 1.5; padding-bottom: 30px; border-bottom: 1px solid #e2e8f0;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="${inviteLink}" style="color: #3b82f6; word-break: break-all;">${inviteLink}</a>
                </td>
              </tr>
              <tr>
                <td align="center" style="color: #94a3b8; font-size: 12px; padding-top: 20px;">
                  If you did not expect this invitation, you can safely ignore this email.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
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
