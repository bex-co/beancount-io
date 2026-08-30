import { escapeHtml } from "../utils/url-validator";
import { EMAIL_THEME } from "./email-theme";

/**
 * Shared email header component for Beancount.io
 */
export function renderEmailHeader(productName: string): string {
  const safeProductName = escapeHtml(productName);
  const { light } = EMAIL_THEME;

  return `
    <tr>
      <td class="email-header" style="background-color: ${light.card}; padding: 30px 40px; text-align: center; border-bottom: 1px solid ${light.border};">
        <h1 class="email-brand" style="color: ${light.foreground}; margin: 0; font-size: 26px; line-height: 1.25; font-weight: 700; letter-spacing: -0.5px;">${safeProductName}</h1>
        <div class="email-brand-mark" aria-hidden="true" style="width: 40px; height: 3px; margin: 12px auto 0; background-color: ${light.primary}; border-radius: 999px;"></div>
      </td>
    </tr>
  `;
}
