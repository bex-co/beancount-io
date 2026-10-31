import { z } from "zod";
import { UPGRADE_SURFACES } from "@/common/analytics";
import { getSafeRedirectPath } from "@/common/lib/auth/auth";
import { searchEnum, searchString } from "@/common/lib/search-params/tolerant";
import {
  BILLING_CYCLES,
  SUBSCRIPTION_TIERS,
} from "@/features/user-settings/pages/general/stripe-config";

/**
 * `/settings/billing` search parameters; the contract is documented beside the
 * route. A mistyped value renders Billing as if the parameter were absent
 * rather than failing the page, and `return` is kept only as a same-origin
 * path.
 */
export const billingSearchSchema = z.object({
  checkout: searchEnum(["success", "canceled"] as const),
  session_id: searchString(),
  // Stripe.js returning from a redirect-only bank approval of a plan change.
  payment_intent: searchString(),
  redirect_status: searchString(),
  return: searchString()
    .transform((path) => getSafeRedirectPath(path))
    .optional(),
  plan: searchEnum(SUBSCRIPTION_TIERS),
  billing: searchEnum(BILLING_CYCLES),
  // A surface this app does not know (the pricing page's) is a plain deep link.
  from: searchEnum(UPGRADE_SURFACES),
});

export type BillingSearch = z.infer<typeof billingSearchSchema>;
