export interface TranslationEntry {
  message: string;
  description: string;
}

const enAuth: Record<string, TranslationEntry> = {
  "auth.alreadyHaveAccountQuestion": {
    message: "Already have an account?",
    description: "Prompt asking if user has existing account",
  },
  "auth.authenticating": {
    message: "Authenticating...",
    description: "Message shown during authentication process",
  },
  "auth.backToSignIn": {
    message: "Back to Sign in",
    description: "Link text to return to sign in page",
  },
  "auth.confirmNewPassword": {
    message: "Confirm New Password",
    description: "Label for confirm password field",
  },
  "auth.confirmPassword": {
    message: "Confirm Password",
    description: "Label for password confirmation input field",
  },
  "auth.confirmPasswordRequired": {
    message: "Please confirm your password",
    description: "Validation error when password confirmation is missing",
  },
  "auth.confirmYourNewPassword": {
    message: "Confirm your new password",
    description: "Placeholder for confirm password input",
  },
  "auth.confirmYourPassword": {
    message: "Confirm your password",
    description: "Placeholder for password confirmation",
  },
  "auth.createAccount": {
    message: "Create account",
    description: "Button to submit registration",
  },
  "auth.createYourAccount": {
    message: "Create your account",
    description: "Registration page title",
  },
  "auth.creatingAccount": {
    message: "Creating account...",
    description: "Button state while creating account",
  },
  "auth.dontHaveAccount": {
    message: "Don't have an account?",
    description: "Prompt text asking if user doesn't have account",
  },
  "auth.email": {
    message: "Email",
    description: "Label for email input field",
  },
  "auth.emailAddress": {
    message: "Email address",
    description: "Email address field label",
  },
  "auth.emailInvalid": {
    message: "Please enter a valid email address",
    description: "Validation error when email format is invalid",
  },
  "auth.emailRequired": {
    message: "Email is required",
    description: "Validation error when email is not provided",
  },
  "auth.emailSent": {
    message: "Email sent!",
    description: "Success title after email sent",
  },
  "auth.emailSentDescription": {
    message:
      "We've sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.",
    description: "Detailed success message after reset email sent",
  },
  "auth.enterDetailsToGetStarted": {
    message: "Enter your details to get started with your dashboard",
    description: "Registration page description",
  },
  "auth.enterEmailForReset": {
    message:
      "Enter your email address and we'll send you a link to reset your password",
    description: "Instructions on forgot password page",
  },
  "auth.enterNewPasswordBelow": {
    message: "Enter your new password below",
    description: "Instruction for reset password form",
  },
  "auth.enterUsername": {
    message: "Enter your username (lowercase, max 20 characters)",
    description: "Placeholder for username input with character limit",
  },
  "auth.enterYourEmail": {
    message: "Enter your email",
    description: "Placeholder for email input",
  },
  "auth.enterYourNewPassword": {
    message: "Enter your new password",
    description: "Placeholder for new password input",
  },
  "auth.enterYourPassword": {
    message: "Enter your password (min 6 characters)",
    description: "Placeholder for password input with requirement",
  },
  "auth.firstName": {
    message: "First Name",
    description: "Label for first name input field",
  },
  "auth.lastName": {
    message: "Last Name",
    description: "Label for last name input field",
  },
  "auth.enterFirstName": {
    message: "Enter your first name",
    description: "Placeholder for first name input",
  },
  "auth.enterLastName": {
    message: "Enter your last name",
    description: "Placeholder for last name input",
  },
  "auth.firstNameMaxLength": {
    message: "First name must be at most 50 characters",
    description: "Validation error when first name is too long",
  },
  "auth.lastNameMaxLength": {
    message: "Last name must be at most 50 characters",
    description: "Validation error when last name is too long",
  },
  "auth.failedToResetPassword": {
    message: "Failed to reset password. Please try again.",
    description: "Error message when password reset fails",
  },
  "auth.failedToSendResetEmail": {
    message: "Failed to send password reset email. Please try again.",
    description: "Error when reset email fails to send",
  },
  "auth.forgotPassword": {
    message: "Forgot Password?",
    description: "Link text for forgot password feature",
  },
  "auth.forgotYourPassword": {
    message: "Forgot your password?",
    description: "Forgot password page title",
  },
  "auth.loggingOut": {
    message: "Logging Out",
    description: "Title shown while logging out",
  },
  "auth.loggingOutMessage": {
    message: "Please wait while we sign you out...",
    description: "Message shown while logging out",
  },
  "auth.login": {
    message: "Log In / Sign Up",
    description: "Button label for login or signup",
  },
  "auth.loginFailed": {
    message: "Login failed",
    description: "Error title when login fails",
  },
  "auth.logout": {
    message: "Logout",
    description: "Button label to log out",
  },
  "auth.newPassword": {
    message: "New Password",
    description: "Label for new password field",
  },
  "auth.newPasswordMinLength": {
    message: "Password must be at least 6 characters",
    description: "Validation error for password length",
  },
  "auth.newPasswordMaxLength": {
    message: "Password must be at most 128 characters",
    description:
      "Validation error when new password exceeds the maximum length",
  },
  "auth.newPasswordRequired": {
    message: "Password is required",
    description: "Validation error for missing new password",
  },
  "auth.password": {
    message: "Password",
    description: "Label for password input field",
  },
  "auth.passwordMinLength": {
    message: "Password must be at least 6 characters",
    description: "Validation error when password is too short",
  },
  "auth.passwordMaxLength": {
    message: "Password must be at most 128 characters",
    description: "Validation error when password exceeds the maximum length",
  },
  "auth.passwordRequired": {
    message: "Password is required",
    description: "Validation error when password is not provided",
  },
  "auth.passwordResetSuccessMessage": {
    message: "Your password has been reset. Redirecting to login...",
    description: "Success message description",
  },
  "auth.passwordResetSuccessful": {
    message: "Password reset successful!",
    description: "Success message title",
  },
  "auth.passwordsDoNotMatch": {
    message: "Passwords do not match",
    description: "Validation error when passwords don't match",
  },
  "auth.redirectingToLogin": {
    message: "Redirecting to login page...",
    description: "Message shown after successful logout",
  },
  "auth.registrationFailed": {
    message: "Registration failed",
    description: "Error when registration fails",
  },
  "auth.resetPasswordButton": {
    message: "Reset password",
    description: "Button text to reset password",
  },
  "auth.resetYourPassword": {
    message: "Reset your password",
    description: "Title for reset password page",
  },
  "auth.resettingPassword": {
    message: "Resetting password...",
    description: "Button text while resetting password",
  },
  "auth.sendResetLink": {
    message: "Send reset link",
    description: "Button to send password reset link",
  },
  "auth.sending": {
    message: "Sending...",
    description: "Button state while sending email",
  },
  "auth.signIn": {
    message: "Sign In",
    description: "Button label for sign in action",
  },
  "auth.signUp": {
    message: "Sign Up",
    description: "Button label for sign up action",
  },
  "auth.tokenExpired": {
    message: "Token Expired",
    description: "Title when reset token is expired",
  },
  "auth.tokenExpiredDescription": {
    message: "The password reset token is expired or invalid",
    description: "Description when token is expired",
  },
  "auth.tokenExpiredMessage": {
    message: "This password reset token is expired. Please request a new one.",
    description: "Alert message for expired token",
  },
  "auth.username": {
    message: "Username",
    description: "Username field label",
  },
  "auth.usernameLowercaseAlphanumeric": {
    message:
      "Username can only contain lowercase letters, numbers, and underscores",
    description:
      "Validation error when username contains invalid characters (must be lowercase)",
  },
  "auth.usernameMaxLength": {
    message: "Username must be at most 20 characters",
    description: "Validation error when username too long",
  },
  "auth.usernameRequired": {
    message: "Username is required",
    description: "Validation error when username is missing",
  },
  "auth.usernamePublicHint": {
    message: "This username is public and visible to others",
    description: "Hint text explaining that username is publicly visible",
  },
  "auth.welcomeBack": {
    message: "Welcome back",
    description: "Login page welcome title",
  },
  "auth.signInToAccount": {
    message: "Sign in to your Beancount account",
    description: "Login page subtitle",
  },
  "auth.secureAccess": {
    message: "Secure Access",
    description: "Secure access feature title",
  },
  "auth.secureAccessDescription": {
    message: "Your financial data is protected with enterprise-grade security",
    description: "Secure access feature description",
  },
  "auth.realTimeInsights": {
    message: "Real-time Insights",
    description: "Real-time insights feature title",
  },
  "auth.realTimeInsightsDescription": {
    message: "Get instant visibility into your financial position and trends",
    description: "Real-time insights feature description",
  },
  "auth.lovedByUsers": {
    message: "Loved by Users",
    description: "Loved by users feature title",
  },
  "auth.lovedByUsersDescription": {
    message:
      "Join thousands of satisfied users who trust Beancount for their accounting needs",
    description: "Loved by users feature description",
  },
  "auth.verifyYourEmail": {
    message: "Verify your email",
    description: "OTP verification page title",
  },
  "auth.otpSentToYourEmail": {
    message: "We've sent a 4-digit code to your email address",
    description: "Message showing OTP was sent to email",
  },
  "auth.enterOtpCode": {
    message: "Enter the code",
    description: "Label for OTP input field",
  },
  "auth.otpRequired": {
    message: "OTP code is required",
    description: "Validation error when OTP is missing",
  },
  "auth.otpInvalidLength": {
    message: "OTP code must be 4 digits",
    description: "Validation error when OTP length is invalid",
  },
  "auth.otpVerificationFailed": {
    message: "OTP verification failed",
    description: "Error message when OTP verification fails",
  },
  "auth.otpVerificationError": {
    message: "An error occurred during OTP verification",
    description: "Generic error message for OTP verification",
  },
  "auth.sessionExpired": {
    message: "Session Expired",
    description: "Title when signup session is expired",
  },
  "auth.sessionExpiredDescription": {
    message: "The signup session is expired or invalid",
    description: "Description when session is expired",
  },
  "auth.sessionExpiredMessage": {
    message:
      "This signup session is expired. Please start the registration process again.",
    description: "Alert message for expired session",
  },
  "auth.backToSignUp": {
    message: "Back to Sign Up",
    description: "Link text to return to sign up page",
  },
  "auth.didNotReceiveOtp": {
    message: "Didn't receive the code?",
    description: "Prompt asking if user didn't receive OTP",
  },
  "auth.verifying": {
    message: "Verifying...",
    description: "Button text while verifying OTP",
  },
  "auth.verifyEmail": {
    message: "Verify Email",
    description: "Button text to verify email with OTP",
  },
  "auth.termsAgreementPrefix": {
    message: 'By clicking "Create account", I agree to beancount.io\'s',
    description: "Prefix text before terms and privacy links on sign up form",
  },
  "auth.termsOfUse": {
    message: "Terms of Use",
    description: "Link text for terms of use",
  },
  "auth.privacyPolicy": {
    message: "Privacy Policy",
    description: "Link text for privacy policy",
  },
  "auth.and": {
    message: "and",
    description: "Conjunction between terms and privacy links",
  },
  "auth.oauthSignInToContinue": {
    message: "Sign in to continue",
    description: "OAuth consent page login step title",
  },
  "auth.oauthAppWantsAccess": {
    message: "An app wants to access your Beancount ledger.",
    description: "OAuth consent page login step description",
  },
  "auth.oauthChooseLedger": {
    message: "Choose a ledger",
    description: "OAuth consent page ledger step title",
  },
  "auth.oauthSelectLedger": {
    message: "Select which ledger to grant access to.",
    description: "OAuth consent page ledger step description",
  },
  "auth.oauthApproveAccess": {
    message: "Approve access",
    description: "OAuth consent page approve button",
  },
  "auth.oauthNoLedgersMessage": {
    message: "No ledgers found. Please create one first.",
    description: "OAuth consent page empty ledger state message",
  },
  "auth.oauthRegisterToContinue": {
    message: "Create an account to continue",
    description: "OAuth consent page register step title",
  },
  "auth.oauthVerifyEmailToContinue": {
    message: "Verify your email to continue",
    description: "OAuth consent page OTP step title",
  },
  "auth.loginSessionExpiredMessage": {
    message: "Your session has expired. Please log in again.",
    description:
      "Banner shown on the login page when redirected here because the previous session's token expired or was revoked",
  },
  "auth.cliAuthTitle": {
    message: "Authorize CLI Access",
    description: "Title of the CLI device authorization card",
  },
  "auth.cliAuthDescription": {
    message: "The Beancount CLI is requesting access to your account.",
    description: "Description under the CLI authorization title",
  },
  "auth.cliAuthPermissionsIntro": {
    message: "This will allow the CLI to:",
    description: "Intro line above the list of CLI permissions",
  },
  "auth.cliAuthPermissionLedgers": {
    message: "Read and write your ledgers",
    description: "CLI permission list item for reading and writing ledgers",
  },
  "auth.cliAuthPermissionAccount": {
    message: "Access your account information",
    description: "CLI permission list item for accessing account information",
  },
  "auth.cliAuthAuthorize": {
    message: "Authorize",
    description: "Button to authorize the CLI session",
  },
  "auth.cliAuthAuthorizing": {
    message: "Authorizing...",
    description: "Button text while the CLI session is being authorized",
  },
  "auth.cliAuthDeny": {
    message: "Deny",
    description: "Button to deny the CLI session",
  },
  "auth.cliAuthDenying": {
    message: "Denying...",
    description: "Button text while the CLI session is being denied",
  },
  "auth.cliAuthSessionExpired": {
    message: "Session expired or not found.",
    description: "Error shown when the CLI auth session is expired or missing",
  },
  "auth.cliAuthSuccessTitle": {
    message: "Authorization successful",
    description: "Title shown after the CLI session was authorized",
  },
  "auth.cliAuthSuccessDescription": {
    message: "You can close this tab and return to the CLI.",
    description: "Hint shown after successful CLI authorization",
  },
  "auth.cliAuthDeniedTitle": {
    message: "Access denied",
    description: "Title shown after the CLI session was denied",
  },
  "auth.cliAuthDeniedDescription": {
    message: "You can close this tab.",
    description: "Hint shown after the CLI session was denied",
  },
  "auth.cliAuthCodeEntryTitle": {
    message: "Authorize a device",
    description: "Title of the CLI device code entry card",
  },
  "auth.cliAuthCodeEntryDescription": {
    message: "Enter the one-time code shown in your terminal.",
    description: "Description under the CLI device code entry title",
  },
  "auth.cliAuthCodeLabel": {
    message: "One-time code",
    description: "Label of the CLI one-time code input",
  },
  "auth.cliAuthCodeContinue": {
    message: "Continue",
    description: "Button to submit the entered CLI one-time code",
  },
  "auth.cliAuthCodeInvalid": {
    message: "Enter the 8-character code shown in your terminal.",
    description: "Error shown when the entered CLI code is not the right shape",
  },
  "auth.cliAuthRequestedBy": {
    message: "Requested by",
    description: "Heading above the requesting device's reported details",
  },
  "auth.cliAuthClientLabel": {
    message: "Client",
    description: "Label for the requesting client's name",
  },
  "auth.cliAuthDeviceLabel": {
    message: "Device",
    description: "Label for the requesting device's machine name",
  },
  "auth.cliAuthPlatformLabel": {
    message: "System",
    description: "Label for the requesting device's operating system",
  },
  "auth.cliAuthIpLabel": {
    message: "IP address",
    description: "Label for the requesting device's IP address",
  },
  "auth.cliAuthSelfReported": {
    message:
      "Reported by the device itself. Approve only if this is the terminal you just used.",
    description:
      "Warning that the requesting device's details are self-reported",
  },
  "auth.cliAuthUseAnotherCode": {
    message: "Use a different code",
    description: "Button to enter a different CLI one-time code",
  },
  "auth.cliAuthPermissionExpiry": {
    message: "Stay signed in on that device for 30 days",
    description:
      "CLI permission list item for how long the device stays signed in",
  },
  "auth.oauthIdentityWantsAccess": {
    message: "An app wants you to sign in with your Beancount account.",
    description: "Identity OAuth consent page login step description",
  },
  "auth.oauthIdentityApproveTitle": {
    message: "Continue to sign in",
    description: "Identity OAuth consent page approve step title",
  },
  "auth.oauthIdentityApproveDescription": {
    message: "This will share your name, email, and username with the app.",
    description: "Identity OAuth consent page approve step description",
  },
  "auth.oauthIdentitySignedInAs": {
    message: "Signed in as {email}",
    description:
      "Identity OAuth consent page approve step — shows which account is authorizing",
  },
  "auth.hidePassword": {
    message: "Hide password",
    description: "Accessible label for hiding a password",
  },
  "auth.showPassword": {
    message: "Show password",
    description: "Accessible label for showing a password",
  },
  "auth.oauthLedgerRequired": {
    message: "Please select a ledger.",
    description: "Validation shown when OAuth consent has no selected ledger",
  },
  "auth.oauthMobileSignInTitle": {
    message: "Sign in to Beancount",
    description:
      "Mobile OAuth login step title — first-party app, so it names the product rather than asking for access",
  },
  "auth.oauthMobileRegisterTitle": {
    message: "Create your Beancount account",
    description: "Mobile OAuth register step title",
  },
  "auth.oauthMobileChooseAccountTitle": {
    message: "Which account should the app use?",
    description:
      "Mobile OAuth step shown when the browser is signed in but the app's Sign Up button started the flow",
  },
  "auth.oauthMobileContinueAs": {
    message: "Continue as {email}",
    description:
      "Mobile OAuth button that keeps the signed-in browser account; {email} is the account",
  },
  "auth.oauthMobileCreateDifferentAccount": {
    message: "Create a different account",
    description:
      "Mobile OAuth button that signs the browser out and opens registration",
  },
  "auth.oauthMobileAllowTitle": {
    message: "Allow Beancount Mobile?",
    description: "Mobile OAuth approval title",
  },
  "auth.oauthMobileGrantDescription": {
    message: "This account-wide grant lets the app:",
    description: "Introduction to mobile OAuth permissions",
  },
  "auth.oauthSwitchAccountFailed": {
    message: "Could not switch accounts. Please try again.",
    description: "Error shown when OAuth account switching fails",
  },
  "auth.oauthUseAnotherAccount": {
    message: "Use another account",
    description: "Button for switching OAuth accounts",
  },
  "auth.oauthMobileScopeIdentity": {
    message: "Identify the account you approve",
    description: "Description of the OpenID mobile permission",
  },
  "auth.oauthMobileScopeOfflineAccess": {
    message: "Stay signed in securely until you revoke access",
    description: "Description of the offline access mobile permission",
  },
  "auth.oauthMobileScopeRead": {
    message: "Read your ledgers",
    description: "Description of the ledger read mobile permission",
  },
  "auth.oauthMobileScopeWrite": {
    message: "Create and update ledger data",
    description: "Description of the ledger write mobile permission",
  },
  "auth.oauthMobileScopeAdmin": {
    message: "Manage ledgers and collaborators",
    description: "Description of the ledger admin mobile permission",
  },
};

export default enAuth;
