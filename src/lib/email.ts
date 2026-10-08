import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL || "THER-INV <noreply@expedai.us>";

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface SendInvitationEmailParams {
  to: string;
  role: string;
  agentType?: "PT" | "PTA";
  invitationUrl: string;
  invitedByName?: string;
}

export async function sendInvitationEmail({
  to,
  role,
  agentType,
  invitationUrl,
  invitedByName = "El equipo de THER-INV",
}: SendInvitationEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!resend) {
    console.warn("[RESEND] RESEND_API_KEY no está configurado en las variables de entorno. Omitiendo envío real de correo.");
    return {
      success: false,
      error: "RESEND_API_KEY is not configured",
    };
  }

  const roleLabels: Record<string, string> = {
    agent: agentType ? `Clinical Agent (${agentType})` : "Clinical Agent",
    manager: "Manager",
    viewer: "Viewer",
    admin: "Administrator",
  };

  const roleDisplay = roleLabels[role] || role;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Invitation to THER-INV</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <!-- Header -->
        <tr>
          <td style="background-color: #1e40af; padding: 28px 32px; text-align: left;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">
              THER-INV
            </h1>
            <p style="color: #bfdbfe; margin: 4px 0 0 0; font-size: 13px;">
              Medical & Therapy Staff Billing Portal
            </p>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding: 32px;">
            <h2 style="font-size: 19px; font-weight: 700; color: #0f172a; margin: 0 0 14px 0;">
              You have been invited to join THER-INV
            </h2>

            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
              Hello, <strong>${invitedByName}</strong> has invited you to join the THER-INV platform with the role of <strong style="color: #2563eb;">${roleDisplay}</strong>.
            </p>

            <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 16px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0; font-size: 13.5px; color: #1e40af; font-weight: 600;">
                ⏱️ This personal invitation link will expire in <strong>24 hours</strong>.
              </p>
            </div>

            <p style="font-size: 14.5px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
              Click the button below to activate your account and set up your password:
            </p>

            <!-- Call to action button -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="padding: 8px 0 28px 0;">
                  <a href="${invitationUrl}" target="_blank" style="background-color: #2563eb; color: #ffffff; display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(37,99,235,0.25);">
                    Set Password & Accept Invitation
                  </a>
                </td>
              </tr>
            </table>

            <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0 0 8px 0;">
              If the button does not work, copy and paste the following link directly into your browser:
            </p>
            <p style="font-size: 12px; color: #2563eb; word-break: break-all; margin: 0 0 24px 0; background-color: #f8fafc; padding: 10px; border-radius: 6px; border: 1px dashed #cbd5e1;">
              <a href="${invitationUrl}" target="_blank" style="color: #2563eb; text-decoration: underline;">
                ${invitationUrl}
              </a>
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

            <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">
              If you did not expect to receive this invitation, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #f8fafc; padding: 18px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="font-size: 12px; color: #64748b; margin: 0;">
              © ${new Date().getFullYear()} THER-INV Portal. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    const data = await resend.emails.send({
      from: resendFromEmail,
      to,
      subject: `Invitation to THER-INV - Set Your Password (${roleDisplay})`,
      html: htmlContent,
    });

    if (data.error) {
      console.error("[RESEND] Error sending email:", data.error);
      return {
        success: false,
        error: data.error.message,
      };
    }

    return {
      success: true,
      id: data.data?.id,
    };
  } catch (error: any) {
    console.error("[RESEND] Exception sending email:", error);
    return {
      success: false,
      error: error?.message || "Failed to send email via Resend",
    };
  }
}
