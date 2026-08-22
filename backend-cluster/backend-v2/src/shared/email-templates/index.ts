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
  type WelcomeParams,
} from "./templates/welcome.template";

export {
  renderPasswordResetHtml,
  renderPasswordResetText,
  type PasswordResetParams,
} from "./templates/password-reset.template";

export {
  renderSignupOtpHtml,
  renderSignupOtpText,
  type SignupOtpParams,
} from "./templates/signup-otp.template";
