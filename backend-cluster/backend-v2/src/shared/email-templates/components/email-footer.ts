import { EMAIL_STYLES, EMAIL_THEME } from "./email-theme";

/**
 * Shared email footer component for Beancount.io
 */
export interface EmailFooterParams {
  includeUnsubscribe?: boolean;
  /**
   * Adds an unsubscribe link. Inserted as is, because it is usually a mail
   * provider's substitution tag rather than a URL: pass trusted values only.
   */
  unsubscribeUrl?: string;
  isTransactional?: boolean;
}

export function renderEmailFooter(params: EmailFooterParams = {}): string {
  const { light } = EMAIL_THEME;
  const unsubscribe = params.unsubscribeUrl
    ? `
        <p class="email-muted" style="margin: 8px 0 0; ${EMAIL_STYLES.mutedText} font-size: 12px;">
          <a href="${params.unsubscribeUrl}" style="color: ${light.mutedForeground};">Unsubscribe from these emails</a>
        </p>`
    : "";

  return `
    <tr>
      <td class="email-footer" style="text-align: center; padding: 22px 40px; background-color: ${light.muted}; border-top: 1px solid ${light.border};">
        <p class="email-muted" style="margin: 0; ${EMAIL_STYLES.mutedText} font-size: 12px;">
          Powered by Beancount.io
        </p>
${unsubscribe}
      </td>
    </tr>
  `;
}
