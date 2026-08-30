import { renderEmailWrapper } from "../components/email-wrapper";
import { EMAIL_STYLES } from "../components/email-theme";

export interface SignupOtpParams {
  otp: string;
}

export function renderSignupOtpHtml(params: SignupOtpParams): string {
  const content = `
    <h2 class="email-heading" style="${EMAIL_STYLES.heading}">Verify Your Email Address</h2>

    <p class="email-body-copy" style="${EMAIL_STYLES.paragraph}">
      Thank you for signing up for Beancount.io! To complete your registration, please verify your email address using the one-time password below.
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <div class="email-code-box" style="display: inline-block; max-width: 100%; box-sizing: border-box; ${EMAIL_STYLES.codeBox}">
        <p class="email-code-label" style="${EMAIL_STYLES.codeLabel}">
          Your Verification Code
        </p>
        <p class="email-code-value" style="${EMAIL_STYLES.codeValue}">
          ${params.otp}
        </p>
      </div>
    </div>

    <div class="email-callout" style="${EMAIL_STYLES.callout}">
      <p class="email-callout-title" style="${EMAIL_STYLES.calloutTitle}">
        Security Note
      </p>
      <p class="email-muted" style="margin: 0; ${EMAIL_STYLES.mutedText}">
        This code will expire in 10 minutes. Don't share this code with anyone. If you didn't request this code, please ignore this email.
      </p>
    </div>

    <p class="email-muted" style="margin: 0; ${EMAIL_STYLES.mutedText} font-size: 15px;">
      Enter this code in the signup form to complete your registration.
    </p>
  `;

  return renderEmailWrapper({
    title: "Verify Your Email - Beancount.io",
    productName: "Beancount.io",
    content,
  });
}

export function renderSignupOtpText(params: SignupOtpParams): string {
  return `
Beancount.io
================

Verify Your Email Address

Thank you for signing up for Beancount.io! To complete your registration, please verify your email address using the one-time password below.

Your Verification Code: ${params.otp}

Security Note:
This code will expire in 10 minutes. Don't share this code with anyone. If you didn't request this code, please ignore this email.

Enter this code in the signup form to complete your registration.

--
Powered by Beancount.io
  `.trim();
}
