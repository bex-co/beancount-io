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
  return `
    <div style="text-align: center; margin-top: 30px; padding: 25px 20px; background: #f8f9fa; border-radius: 8px; border-top: 2px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; margin: 0; line-height: 1.6;">
        Powered by Beancount.io
      </p>
    </div>
  `;
}
