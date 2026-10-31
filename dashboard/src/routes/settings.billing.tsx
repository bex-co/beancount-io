import { createFileRoute } from "@tanstack/react-router";
import BillingSettingsPage from "@/features/user-settings/pages/billing";
import { billingSearchSchema } from "@/features/user-settings/lib/billing-search";
import { createNoIndexHead } from "@/common/lib/seo/seo-helpers";

/**
 * Settings → Billing. Its search parameters are a public contract: in-product
 * prompts link here, and so does the marketing pricing page for subscribers.
 *
 * - `plan=premium|growth|organization` opens the change sheet on that plan,
 *   which previews the charge before anything is confirmed.
 * - `billing=monthly|yearly` picks the cycle for `plan`; yearly when absent.
 * - `from=<surface>` names the prompt that sent the reader, for analytics.
 * - `return=<path>` is where the reader was. It is offered back once the
 *   change lands or Checkout returns, and only as a same-origin path
 *   (`getSafeRedirectPath`); anything else is dropped.
 * - `checkout=success|canceled&session_id=…` is Stripe Checkout coming back;
 *   a success shows the confirmation and opens no sheet.
 * - `payment_intent=…&redirect_status=…` is a bank's redirect-only approval
 *   of a plan change coming back; a success announces the change once.
 *
 * Values are read leniently (`billingSearchSchema`): an unknown plan or cycle
 * renders Billing without a sheet rather than failing the page.
 */
export const Route = createFileRoute("/settings/billing")({
  component: BillingSettingsPage,
  validateSearch: (search) => billingSearchSchema.parse(search),
  head: createNoIndexHead,
});
