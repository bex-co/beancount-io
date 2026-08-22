import { escapeHtml } from "../utils/url-validator";

/**
 * Shared email header component for Beancount.io
 */
export function renderEmailHeader(productName: string): string {
  // Escape product name to prevent XSS
  const safeProductName = escapeHtml(productName);

  return `
    <div style="background: #ffffff; padding: 35px 30px; text-align: center; border-radius: 12px 12px 0 0; border-bottom: 2px solid #e5e7eb;">
      <h1 style="color: #1a1a1a; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">${safeProductName}</h1>
    </div>
  `;
}
