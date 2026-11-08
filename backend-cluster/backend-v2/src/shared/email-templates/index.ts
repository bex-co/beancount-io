/**
 * Email templates for Beancount.io
 *
 * All email templates export two functions:
 * - render*Html() - Returns formatted HTML email
 * - render*Text() - Returns plain text version
 */

export {
  renderWelcomeHtml,
  renderWelcomeText,
} from "./templates/welcome.template";

export {
  renderPasswordResetHtml,
  renderPasswordResetText,
} from "./templates/password-reset.template";

export {
  renderSignupOtpHtml,
  renderSignupOtpText,
} from "./templates/signup-otp.template";

export {
  planChangeEmailSubject,
  renderPlanChangeHtml,
  renderPlanChangeText,
  type PlanChangeEmailParams,
} from "./templates/plan-change.template";

export {
  renewalEmailSubject,
  renderRenewalHtml,
  renderRenewalText,
  type RenewalEmailParams,
} from "./templates/renewal.template";

export {
  checkoutRecoveryEmailSubject,
  renderCheckoutRecoveryHtml,
  renderCheckoutRecoveryText,
  type CheckoutRecoveryEmailParams,
} from "./templates/checkout-recovery.template";
