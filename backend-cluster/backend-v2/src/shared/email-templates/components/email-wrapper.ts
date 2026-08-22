import { renderEmailHeader } from "./email-header";
import { renderEmailFooter, type EmailFooterParams } from "./email-footer";
import { escapeHtml } from "../utils/url-validator";

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
  // Escape title to prevent XSS in the <title> tag
  const safeTitle = escapeHtml(params.title);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${safeTitle}</title>
        <style>
          @media only screen and (max-width: 600px) {
            .email-content { padding: 20px !important; }
            h2 { font-size: 22px !important; }
          }
        </style>
      </head>
      <body class="email-body" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.7; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f7fa;">
        ${renderEmailHeader(params.productName)}

        <div class="email-content" style="background: #ffffff; padding: 40px; border: 1px solid #e8eaf0; border-top: none; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
          ${params.content}
        </div>

        ${renderEmailFooter(params.footer)}
      </body>
    </html>
  `.trim();
}
