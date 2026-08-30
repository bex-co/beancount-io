import { renderEmailWrapper } from "../components/email-wrapper";
import { EMAIL_STYLES } from "../components/email-theme";
import { validateEmailUrl } from "../utils/url-validator";

export interface PasswordResetParams {
  resetLink: string;
}

export function renderPasswordResetHtml(params: PasswordResetParams): string {
  const resetLink = validateEmailUrl(params.resetLink);

  const content = `
    <h2 class="email-heading" style="${EMAIL_STYLES.heading}">Reset Your Password</h2>

    <p class="email-body-copy" style="${EMAIL_STYLES.paragraph}">
      Hi, we've received a request to reset your password. If you didn't make the request, just ignore this message.
    </p>

    <p class="email-body-copy" style="${EMAIL_STYLES.paragraph}">
      Otherwise, you can reset your password using the button below:
    </p>

    <table role="presentation" class="email-action-row" width="100%" cellpadding="0" cellspacing="0" border="0" style="${EMAIL_STYLES.actionRow}">
      <tr>
        <td align="center">
          <a class="email-action" href="${resetLink}" style="${EMAIL_STYLES.primaryAction}">Reset Password</a>
        </td>
      </tr>
    </table>

    <div class="email-callout" style="${EMAIL_STYLES.callout}">
      <p class="email-callout-title" style="${EMAIL_STYLES.calloutTitle}">
        Security Note
      </p>
      <p class="email-muted" style="margin: 0; ${EMAIL_STYLES.mutedText}">
        This link will expire in 24 hours. Don't share this link with anyone.
      </p>
    </div>

    <p class="email-muted" style="margin: 0 0 10px; ${EMAIL_STYLES.mutedText} font-size: 15px;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>

    <p class="email-muted email-breakable" style="${EMAIL_STYLES.breakableUrl}">
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
