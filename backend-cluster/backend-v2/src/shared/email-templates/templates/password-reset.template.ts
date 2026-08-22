import { renderEmailWrapper } from "../components/email-wrapper";
import { validateEmailUrl } from "../utils/url-validator";

export interface PasswordResetParams {
  resetLink: string;
}

export function renderPasswordResetHtml(params: PasswordResetParams): string {
  // Validate URLs to prevent XSS attacks
  const resetLink = validateEmailUrl(params.resetLink);

  const content = `
    <h2 style="margin-top: 0; color: #1e293b;">Reset Your Password</h2>

    <p style="margin-bottom: 16px; font-size: 16px;">
      Hi, we've received a request to reset your password. If you didn't make the request, just ignore this message.
    </p>

    <p style="margin-bottom: 16px; font-size: 16px;">
      Otherwise, you can reset your password using the button below:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Reset Password
      </a>
    </div>

    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
        Security Note
      </p>
      <p style="margin: 0; color: #64748b; font-size: 14px;">
        This link will expire in 24 hours. Don't share this link with anyone.
      </p>
    </div>

    <p style="margin-bottom: 16px; color: #64748b; font-size: 15px;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>

    <p style="margin-bottom: 16px; color: #64748b; font-size: 13px; word-break: break-all;">
      ${resetLink}
    </p>
  `;

  return renderEmailWrapper({
    title: "Reset Your Password - Beancount.io",
    productName: "Beancount.io",
    content,
  });
}

export function renderPasswordResetText(params: PasswordResetParams): string {
  return `
Beancount.io
================

Reset Your Password

Hi, we've received a request to reset your password. If you didn't make the request, just ignore this message.

Otherwise, you can reset your password using this link:

${params.resetLink}

Security Note:
This link will expire in 24 hours. Don't share this link with anyone.

--
Powered by Beancount.io
  `.trim();
}
