import { renderEmailWrapper } from "../components/email-wrapper";
import { EMAIL_STYLES, EMAIL_THEME } from "../components/email-theme";
import { escapeHtml, validateEmailUrl } from "../utils/url-validator";

export interface WelcomeParams {
  firstName?: string;
  dashboardUrl: string;
  mobileAppUrl: string;
  helpCenterUrl: string;
}

export function renderWelcomeHtml(params: WelcomeParams): string {
  const dashboardUrl = validateEmailUrl(params.dashboardUrl);
  const mobileAppUrl = validateEmailUrl(params.mobileAppUrl);
  const helpCenterUrl = validateEmailUrl(params.helpCenterUrl);
  const greeting = params.firstName
    ? `Welcome, ${escapeHtml(params.firstName)}!`
    : "Welcome to Beancount.io!";

  const content = `
    <h2 class="email-heading" style="${EMAIL_STYLES.heading}">${greeting}</h2>

    <p class="email-body-copy" style="${EMAIL_STYLES.paragraph}">
      Your account is ready. Start tracking your finances in under 2 minutes.
    </p>

    <table role="presentation" class="email-action-row" width="100%" cellpadding="0" cellspacing="0" border="0" style="${EMAIL_STYLES.actionRow}">
      <tr>
        <td align="center">
          <a class="email-action" href="${dashboardUrl}" style="${EMAIL_STYLES.primaryAction}">Open Your Dashboard</a>
        </td>
      </tr>
    </table>

    <table role="presentation" class="email-secondary-links" width="100%" cellpadding="0" cellspacing="0" border="0" style="${EMAIL_STYLES.secondaryLinks}">
        <tr>
          <td style="padding: 14px 16px;">
            <a class="email-link" href="${mobileAppUrl}" style="${EMAIL_STYLES.link} font-size: 14px;">Download Mobile App</a>
            <span class="email-muted" style="${EMAIL_STYLES.mutedText}"> &mdash; Track your finances on the go</span>
          </td>
        </tr>
        <tr>
          <td class="email-divider" style="padding: 14px 16px; border-top: 1px solid ${EMAIL_THEME.light.border};">
            <a class="email-link" href="${helpCenterUrl}" style="${EMAIL_STYLES.link} font-size: 14px;">Help Center</a>
            <span class="email-muted" style="${EMAIL_STYLES.mutedText}"> &mdash; Guides and tutorials to get you started</span>
          </td>
        </tr>
    </table>

    <p class="email-muted" style="text-align: center; margin: 26px 0 0; ${EMAIL_STYLES.mutedText}">
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
