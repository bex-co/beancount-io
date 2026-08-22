import { renderEmailWrapper } from "../components/email-wrapper";

export interface SignupOtpParams {
  otp: string;
}

export function renderSignupOtpHtml(params: SignupOtpParams): string {
  const content = `
    <h2 style="margin-top: 0; color: #1e293b;">Verify Your Email Address</h2>

    <p style="margin-bottom: 16px; font-size: 16px;">
      Thank you for signing up for Beancount.io! To complete your registration, please verify your email address using the one-time password below.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <div style="background-color: #f1f5f9; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; display: inline-block;">
        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
          Your Verification Code
        </p>
        <p style="margin: 0; color: #1e293b; font-size: 32px; font-weight: 700; letter-spacing: 8px; font-family: monospace;">
          ${params.otp}
        </p>
      </div>
    </div>

    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
        Security Note
      </p>
      <p style="margin: 0; color: #64748b; font-size: 14px;">
        This code will expire in 10 minutes. Don't share this code with anyone. If you didn't request this code, please ignore this email.
      </p>
    </div>

    <p style="margin-bottom: 16px; color: #64748b; font-size: 15px;">
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
