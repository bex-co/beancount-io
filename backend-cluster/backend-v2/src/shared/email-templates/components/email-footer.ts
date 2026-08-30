import { EMAIL_STYLES, EMAIL_THEME } from "./email-theme";

/**
 * Shared email footer component for Beancount.io
 */
export interface EmailFooterParams {
  includeUnsubscribe?: boolean;
  unsubscribeUrl?: string;
  isTransactional?: boolean;
}

export function renderEmailFooter(_params: EmailFooterParams = {}): string {
  void _params; // Reserved for future use (unsubscribe links, subscription IDs, etc.)
  const { light } = EMAIL_THEME;

  return `
    <tr>
      <td class="email-footer" style="text-align: center; padding: 22px 40px; background-color: ${light.muted}; border-top: 1px solid ${light.border};">
        <p class="email-muted" style="margin: 0; ${EMAIL_STYLES.mutedText} font-size: 12px;">
          Powered by Beancount.io
        </p>
      </td>
    </tr>
  `;
}
