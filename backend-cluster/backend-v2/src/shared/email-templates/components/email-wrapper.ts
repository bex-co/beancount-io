import { renderEmailHeader } from "./email-header";
import { renderEmailFooter, type EmailFooterParams } from "./email-footer";
import { escapeHtml } from "../utils/url-validator";
import { EMAIL_THEME, EMAIL_THEME_CSS } from "./email-theme";

export interface EmailWrapperParams {
  title: string;
  productName: string;
  content: string;
  footer?: EmailFooterParams;
}

/**
 * Wraps email content with standard HTML structure, header, and footer
 */
export function renderEmailWrapper(params: EmailWrapperParams): string {
  const safeTitle = escapeHtml(params.title);
  const { light } = EMAIL_THEME;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <title>${safeTitle}</title>
        <style>
          ${EMAIL_THEME_CSS}
        </style>
      </head>
      <body class="email-body" style="margin: 0; padding: 0; min-width: 100%; width: 100%; font-family: ${EMAIL_THEME.fontFamily}; color: ${light.foreground}; background-color: ${light.canvas};">
        <table role="presentation" class="email-canvas" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; background-color: ${light.canvas};">
          <tr>
            <td class="email-canvas-cell" align="center" style="padding: 24px 12px;">
              <table role="presentation" class="email-card" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: ${EMAIL_THEME.maxWidth}; border-collapse: separate; border-spacing: 0; background-color: ${light.card}; border: 1px solid ${light.border}; border-radius: ${EMAIL_THEME.radius}; overflow: hidden;">
                ${renderEmailHeader(params.productName)}
                <tr>
                  <td class="email-content" style="background-color: ${light.card}; padding: 36px 40px;">
                    ${params.content}
                  </td>
                </tr>
                ${renderEmailFooter(params.footer)}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `.trim();
}
