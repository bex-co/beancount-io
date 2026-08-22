import { renderEmailWrapper } from "../components/email-wrapper";
import { escapeHtml, validateEmailUrl } from "../utils/url-validator";

export interface WelcomeParams {
  firstName?: string;
  dashboardUrl: string;
  mobileAppUrl: string;
  helpCenterUrl: string;
}

export function renderWelcomeHtml(params: WelcomeParams): string {
  // Validate URLs to prevent XSS attacks
  const dashboardUrl = validateEmailUrl(params.dashboardUrl);
  const mobileAppUrl = validateEmailUrl(params.mobileAppUrl);
  const helpCenterUrl = validateEmailUrl(params.helpCenterUrl);
  const greeting = params.firstName
    ? `Welcome, ${escapeHtml(params.firstName)}!`
    : "Welcome to Beancount.io!";

  const content = `
    <h2 style="margin-top: 0; color: #1e293b;">${greeting}</h2>

    <p style="margin-bottom: 24px; font-size: 16px;">
      Your account is ready. Start tracking your finances in under 2 minutes.
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${dashboardUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px;">
        Open Your Dashboard
      </a>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0 16px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 0;">
            <a href="${mobileAppUrl}" style="color: #2563eb; text-decoration: none; font-weight: 600; font-size: 14px;">
              Download Mobile App
            </a>
            <span style="color: #64748b; font-size: 13px;"> &mdash; Track your finances on the go</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-top: 1px solid #e2e8f0;">
            <a href="${helpCenterUrl}" style="color: #2563eb; text-decoration: none; font-weight: 600; font-size: 14px;">
              Help Center
            </a>
            <span style="color: #64748b; font-size: 13px;"> &mdash; Guides and tutorials to get you started</span>
          </td>
        </tr>
      </table>
    </div>

    <p style="text-align: center; color: #64748b; font-size: 14px; margin-top: 28px;">
      Happy accounting!
    </p>
  `;

  return renderEmailWrapper({
    title: "Welcome to Beancount.io!",
    productName: "Beancount.io",
    content,
  });
}

export function renderWelcomeText(params: WelcomeParams): string {
  const greeting = params.firstName
    ? `Welcome, ${params.firstName}!`
    : "Welcome to Beancount.io!";

  return `
Beancount.io
================

${greeting}

Your account is ready. Start tracking your finances in under 2 minutes.

Open Your Dashboard: ${params.dashboardUrl}

- Download Mobile App: ${params.mobileAppUrl}
  Track your finances on the go

- Help Center: ${params.helpCenterUrl}
  Guides and tutorials to get you started

Happy accounting!

--
Powered by Beancount.io
  `.trim();
}
