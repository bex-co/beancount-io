import { renderEmailWrapper } from "../components/email-wrapper";
import { EMAIL_STYLES } from "../components/email-theme";
import { escapeHtml, validateEmailUrl } from "../utils/url-validator";

/**
 * SendGrid fills this in with the link that leaves the mail's unsubscribe
 * group; it works in both the HTML and the text part.
 */
export const GROUP_UNSUBSCRIBE_URL = "<%asm_group_unsubscribe_raw_url%>";

/**
 * The one reminder after an unpaid Checkout expires (ADR027 D7): three lines,
 * no images, nothing else on offer.
 */
export interface CheckoutRecoveryEmailParams {
  /** "Premium" */
  tier: string;
  /** "Premium · Yearly" */
  plan: string;
  interval: "month" | "year";
  /** The single-use promotion code. */
  code: string;
  /** Stripe's recovery URL, or the pricing page. */
  checkoutUrl: string;
}

function copy(params: CheckoutRecoveryEmailParams) {
  return {
    subject: `Your ${params.tier} plan is still waiting`,
    saved: `You left Checkout before finishing — your ${params.plan} plan is still saved.`,
    offer: [
      "Use ",
      params.code,
      ` for 20% off your first ${params.interval} — it expires in 48 hours.`,
    ] as const,
    action: "Finish checkout",
  };
}

export function checkoutRecoveryEmailSubject(
  params: CheckoutRecoveryEmailParams,
): string {
  return copy(params).subject;
}

export function renderCheckoutRecoveryHtml(
  params: CheckoutRecoveryEmailParams,
): string {
  const checkoutUrl = validateEmailUrl(params.checkoutUrl);
  const text = copy(params);
  const [before, code, after] = text.offer;
  const content = `
    <p class="email-body-copy" style="${EMAIL_STYLES.paragraph}">
      ${escapeHtml(text.saved)}
    </p>

    <p class="email-body-copy" style="${EMAIL_STYLES.paragraph}">
      ${escapeHtml(before)}<strong>${escapeHtml(code)}</strong>${escapeHtml(after)}
    </p>

    <table role="presentation" class="email-action-row" width="100%" cellpadding="0" cellspacing="0" border="0" style="${EMAIL_STYLES.actionRow}">
      <tr>
        <td align="center">
          <a class="email-action" href="${checkoutUrl}" style="${EMAIL_STYLES.primaryAction}">${escapeHtml(text.action)}</a>
        </td>
      </tr>
    </table>
  `;

  return renderEmailWrapper({
    title: `${text.subject} - Beancount.io`,
    productName: "Beancount.io",
    content,
    footer: { unsubscribeUrl: GROUP_UNSUBSCRIBE_URL },
  });
}

export function renderCheckoutRecoveryText(
  params: CheckoutRecoveryEmailParams,
): string {
  const text = copy(params);
  return `
Beancount.io
================

${text.saved}
${text.offer.join("")}
${text.action}: ${params.checkoutUrl}

--
Powered by Beancount.io
Unsubscribe: ${GROUP_UNSUBSCRIBE_URL}
  `.trim();
}
