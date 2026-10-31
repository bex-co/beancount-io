import { getSafeRedirectPath } from "@/common/lib/auth/auth";

const KEY = "beancount.billing.approval";

/** A plan change whose payment the bank is approving, as `landed` needs it. */
export interface PendingApproval {
  invoiceId: string | null;
  amountCharged: number | null;
  currency: string | null;
  priceId: string;
  /** A safe path back to where the prompt was. */
  returnTo: string | null;
}

/** A client secret is `<PaymentIntent id>_secret_<secret>`. */
function paymentIntentId(clientSecret: string): string {
  return clientSecret.split("_secret_")[0];
}

/**
 * Remember a plan change before Stripe.js approves its payment, since a
 * redirect-only bank method leaves the page and returns to Billing with only
 * the PaymentIntent in the URL. Kept per tab, like the Checkout return path.
 */
export function rememberPendingApproval(
  clientSecret: string,
  pending: PendingApproval,
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      KEY,
      JSON.stringify({ ...pending, id: paymentIntentId(clientSecret) }),
    );
  } catch {
    // Without storage, a redirect comes back to Billing uncelebrated.
  }
}

/**
 * Read and forget the remembered change. It is returned only for the
 * PaymentIntent the bank returned from, so a stale entry never celebrates
 * another payment.
 */
export function takePendingApproval(
  returnedPaymentIntent: string,
): PendingApproval | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    if (!stored) return null;
    const { id, ...pending } = JSON.parse(stored) as PendingApproval & {
      id?: string;
    };
    if (id !== returnedPaymentIntent || typeof pending.priceId !== "string") {
      return null;
    }
    return {
      ...pending,
      returnTo: getSafeRedirectPath(pending.returnTo ?? undefined) ?? null,
    };
  } catch {
    return null;
  }
}

/** Forget the remembered change once its approval settled in place. */
export function forgetPendingApproval(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing was stored.
  }
}
