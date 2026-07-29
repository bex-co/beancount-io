export interface TranslationEntry {
  message: string;
  description: string;
}

const nlAuth: Record<string, TranslationEntry> = {
  "auth.alreadyHaveAccount": {
    message: "Heeft u al een account? Inloggen",
    description: "Prompt text asking if user already has account",
  },
  "auth.alreadyHaveAccountQuestion": {
    message: "Heeft u al een account?",
    description: "Prompt asking if user has existing account",
  },
  "auth.and": {
    message: "en",
    description: "Conjunction between terms and privacy links",
  },
  "auth.authenticating": {
    message: "Authenticeren...",
    description: "Message shown during authentication process",
  },
  "auth.authenticationError": {
    message: "Authenticatiefout",
    description: "Title for authentication error dialog",
  },
  "auth.authenticationErrorOccurred": {
    message: "Er is een fout opgetreden during authentication",
    description: "Generic authentication error message",
  },
  "auth.authenticationFailed": {
    message: "Authenticatie mislukt",
    description: "Error message when authentication fails",
  },
  "auth.backToSignIn": {
    message: "Terug to Sign in",
    description: "Link text to return to sign in page",
  },
  "auth.backToSignUp": {
    message: "Terug naar Registreren",
    description: "Link text to return to sign up page",
  },
  "auth.confirmNewPassword": {
    message: "Bevestig nieuw wachtwoord",
    description: "Label for confirm password field",
  },
  "auth.confirmPassword": {
    message: "Bevestig wachtwoord",
    description: "Label for password confirmation input field",
  },
  "auth.confirmPasswordRequired": {
    message: "Bevestig uw wachtwoord alstublieft",
    description: "Validation error when password confirmation is missing",
  },
  "auth.confirmYourNewPassword": {
    message: "Bevestig uw nieuwe wachtwoord",
    description: "Placeholder for confirm password input",
  },
  "auth.confirmYourPassword": {
    message: "Bevestig uw wachtwoord",
    description: "Placeholder for password confirmation",
  },
  "auth.createAccount": {
    message: "Account aanmaken",
    description: "Button to submit registration",
  },
  "auth.createYourAccount": {
    message: "Maak uw account aan",
    description: "Registration page title",
  },
  "auth.creatingAccount": {
    message: "Account aanmaken...",
    description: "Button state while creating account",
  },
  "auth.didNotReceiveOtp": {
    message: "Code niet ontvangen?",
    description: "Prompt asking if user didn't receive OTP",
  },
  "auth.dontHaveAccount": {
    message: "Heeft u nog geen account?",
    description: "Prompt text asking if user doesn't have account",
  },
  "auth.email": {
    message: "E-mail",
    description: "Label for email input field",
  },
  "auth.emailAddress": {
    message: "E-mailadres",
    description: "Email address field label",
  },
  "auth.emailInvalid": {
    message: "Voer een geldig e-mailadres in",
    description: "Validation error when email format is invalid",
  },
  "auth.emailRequired": {
    message: "E-mail is verplicht",
    description: "Validation error when email is not provided",
  },
  "auth.emailSent": {
    message: "E-mail verzonden!",
    description: "Success title after email sent",
  },
  "auth.emailSentDescription": {
    message:
      "We hebben een link om uw wachtwoord te resetten naar uw e-mailadres verzonden. Controleer uw inbox en volg de instructies om uw wachtwoord te resetten.",
    description: "Detailed success message after reset email sent",
  },
  "auth.enterCredentials": {
    message: "Voer uw inloggegevens in om toegang te krijgen tot uw dashboard",
    description: "Login page description",
  },
  "auth.enterDetailsToGetStarted": {
    message: "Voer uw gegevens in om aan de slag te gaan met uw dashboard",
    description: "Registration page description",
  },
  "auth.enterEmailForReset": {
    message:
      "Voer uw e-mailadres in en we sturen u een link om uw wachtwoord te resetten",
    description: "Instructions on forgot password page",
  },
  "auth.enterFirstName": {
    message: "Voer uw voornaam in",
    description: "Placeholder for first name input",
  },
  "auth.enterLastName": {
    message: "Voer uw achternaam in",
    description: "Placeholder for last name input",
  },
  "auth.enterNewPasswordBelow": {
    message: "Voer hieronder uw nieuwe wachtwoord in",
    description: "Instruction for reset password form",
  },
  "auth.enterOtpCode": {
    message: "Voer de code in",
    description: "Label for OTP input field",
  },
  "auth.enterUsername": {
    message: "Voer uw gebruikersnaam in (max. 16 tekens)",
    description: "Placeholder for username input with character limit",
  },
  "auth.enterYourEmail": {
    message: "Voer uw e-mailadres in",
    description: "Placeholder for email input",
  },
  "auth.enterYourNewPassword": {
    message: "Voer uw nieuwe wachtwoord in",
    description: "Placeholder for new password input",
  },
  "auth.enterYourPassword": {
    message: "Voer uw wachtwoord in (min. 6 tekens)",
    description: "Placeholder for password input with requirement",
  },
  "auth.failedToResetPassword": {
    message: "Wachtwoord resetten mislukt. Probeer het opnieuw.",
    description: "Error message when password reset fails",
  },
  "auth.failedToSendResetEmail": {
    message:
      "Verzenden van wachtwoord reset e-mail mislukt. Probeer het opnieuw.",
    description: "Error when reset email fails to send",
  },
  "auth.firstName": {
    message: "Voornaam",
    description: "Label for first name input field",
  },
  "auth.firstNameMaxLength": {
    message: "Voornaam mag maximaal 50 tekens bevatten",
    description: "Validation error when first name is too long",
  },
  "auth.forgotPassword": {
    message: "Wachtwoord vergeten?",
    description: "Link text for forgot password feature",
  },
  "auth.forgotYourPassword": {
    message: "Wachtwoord vergeten?",
    description: "Forgot password page title",
  },
  "auth.lastName": {
    message: "Achternaam",
    description: "Label for last name input field",
  },
  "auth.lastNameMaxLength": {
    message: "Achternaam mag maximaal 50 tekens bevatten",
    description: "Validation error when last name is too long",
  },
  "auth.loggingOut": {
    message: "Uitloggen",
    description: "Title shown while logging out",
  },
  "auth.loggingOutMessage": {
    message: "Een moment geduld terwijl we u uitloggen...",
    description: "Message shown while logging out",
  },
  "auth.login": {
    message: "Inloggen / Registreren",
    description: "Button label for login or signup",
  },
  "auth.loginError": {
    message: "Er is een fout opgetreden during login",
    description: "Generic login error message",
  },
  "auth.loginFailed": {
    message: "Inloggen mislukt",
    description: "Error title when login fails",
  },
  "auth.logout": {
    message: "Uitloggen",
    description: "Button label to log out",
  },
  "auth.logoutAlertCancel": {
    message: "Annuleren",
    description: "Cancel button in logout confirmation dialog",
  },
  "auth.logoutAlertConfirm": {
    message: "Uitloggen",
    description: "Confirm button in logout confirmation dialog",
  },
  "auth.logoutAlertMsg": {
    message: "Weet je zeker dat je wilt uitloggen?",
    description: "Confirmation message asking user if they want to log out",
  },
  "auth.lovedByUsers": {
    message: "Geliefd bij gebruikers",
    description: "Loved by users feature title",
  },
  "auth.lovedByUsersDescription": {
    message:
      "Sluit u aan bij duizenden tevreden gebruikers die Beancount vertrouwen voor hun boekhoudbehoeften",
    description: "Loved by users feature description",
  },
  "auth.newPassword": {
    message: "Nieuw wachtwoord",
    description: "Label for new password field",
  },
  "auth.newPasswordMinLength": {
    message: "Wachtwoord moet minimaal 6 tekens bevatten",
    description: "Validation error for password length",
  },
  "auth.newPasswordMaxLength": {
    message: "Wachtwoord mag maximaal 128 tekens bevatten",
    description:
      "Validation error when new password exceeds the maximum length",
  },
  "auth.newPasswordRequired": {
    message: "Wachtwoord is verplicht",
    description: "Validation error for missing new password",
  },
  "auth.otpInvalidLength": {
    message: "OTP-code moet 4 cijfers bevatten",
    description: "Validation error when OTP length is invalid",
  },
  "auth.otpRequired": {
    message: "OTP-code is verplicht",
    description: "Validation error when OTP is missing",
  },
  "auth.otpSentToYourEmail": {
    message: "We hebben een 4-cijferige code naar uw e-mailadres gestuurd",
    description: "Message showing OTP was sent to email",
  },
  "auth.otpVerificationError": {
    message: "Er is een fout opgetreden tijdens de OTP-verificatie",
    description: "Generic error message for OTP verification",
  },
  "auth.otpVerificationFailed": {
    message: "OTP-verificatie mislukt",
    description: "Error message when OTP verification fails",
  },
  "auth.password": {
    message: "Wachtwoord",
    description: "Label for password input field",
  },
  "auth.passwordMinLength": {
    message: "Wachtwoord moet minimaal 6 tekens bevatten",
    description: "Validation error when password is too short",
  },
  "auth.passwordMaxLength": {
    message: "Wachtwoord mag maximaal 128 tekens bevatten",
    description: "Validation error when password exceeds the maximum length",
  },
  "auth.passwordRequired": {
    message: "Wachtwoord is verplicht",
    description: "Validation error when password is not provided",
  },
  "auth.passwordResetSuccessMessage": {
    message: "Uw wachtwoord is gereset. Doorverwijzen naar inlogpagina...",
    description: "Success message description",
  },
  "auth.passwordResetSuccessful": {
    message: "Wachtwoord succesvol gereset!",
    description: "Success message title",
  },
  "auth.passwordsDoNotMatch": {
    message: "Wachtwoorden komen niet overeen",
    description: "Validation error when passwords don't match",
  },
  "auth.privacyPolicy": {
    message: "Privacybeleid",
    description: "Link text for privacy policy",
  },
  "auth.realTimeInsights": {
    message: "Real-time inzichten",
    description: "Real-time insights feature title",
  },
  "auth.realTimeInsightsDescription": {
    message: "Krijg direct inzicht in uw financiële positie en trends",
    description: "Real-time insights feature description",
  },
  "auth.redirectingToLogin": {
    message: "Doorverwijzen naar inlogpagina...",
    description: "Message shown after successful logout",
  },
  "auth.registrationError": {
    message: "Er is een fout opgetreden during registration",
    description: "Generic registration error",
  },
  "auth.registrationFailed": {
    message: "Registratie mislukt",
    description: "Error when registration fails",
  },
  "auth.resetEmailError": {
    message: "Er is een fout opgetreden while sending the password reset email",
    description: "Generic error for reset email sending",
  },
  "auth.resetPassword": {
    message: "Wachtwoord resetten",
    description: "Page title or button for password reset",
  },
  "auth.resetPasswordButton": {
    message: "Wachtwoord resetten",
    description: "Button text to reset password",
  },
  "auth.resetPasswordDescription": {
    message:
      "Voer uw e-mailadres in om een link te ontvangen om uw wachtwoord te resetten.",
    description: "Instructions for password reset process",
  },
  "auth.resetPasswordEmailSent": {
    message:
      "Er is een e-mail verzonden naar uw e-mailadres. Controleer uw e-mail om uw wachtwoord te resetten.",
    description: "Success message after password reset email is sent",
  },
  "auth.resetPasswordError": {
    message: "Er is een fout opgetreden while resetting your password",
    description: "Generic error message for password reset",
  },
  "auth.resetYourPassword": {
    message: "Reset uw wachtwoord",
    description: "Title for reset password page",
  },
  "auth.resettingPassword": {
    message: "Wachtwoord resetten...",
    description: "Button text while resetting password",
  },
  "auth.secureAccess": {
    message: "Veilige toegang",
    description: "Secure access feature title",
  },
  "auth.secureAccessDescription": {
    message:
      "Uw financiële gegevens zijn beschermd met beveiliging op bedrijfsniveau",
    description: "Secure access feature description",
  },
  "auth.sendResetLink": {
    message: "Verstuur resetlink",
    description: "Button to send password reset link",
  },
  "auth.sendResetPasswordEmail": {
    message: "Verstuur wachtwoord reset e-mail",
    description: "Button label to send password reset email",
  },
  "auth.sending": {
    message: "Verzenden...",
    description: "Button state while sending email",
  },
  "auth.sessionExpired": {
    message: "Sessie Verlopen",
    description: "Title when signup session is expired",
  },
  "auth.sessionExpiredDescription": {
    message: "De registratiesessie is verlopen of ongeldig",
    description: "Description when session is expired",
  },
  "auth.sessionExpiredMessage": {
    message:
      "Deze registratiesessie is verlopen. Start het registratieproces opnieuw.",
    description: "Alert message for expired session",
  },
  "auth.signIn": {
    message: "Inloggen",
    description: "Button label for sign in action",
  },
  "auth.signInToAccount": {
    message: "Log in op uw Beancount-account",
    description: "Login page subtitle",
  },
  "auth.signUp": {
    message: "Registreren",
    description: "Button label for sign up action",
  },
  "auth.termsAgreementPrefix": {
    message:
      'Door op "Account aanmaken" te klikken, ga ik akkoord met beancount.io\'s',
    description: "Prefix text before terms and privacy links on sign up form",
  },
  "auth.termsOfUse": {
    message: "Gebruiksvoorwaarden",
    description: "Link text for terms of use",
  },
  "auth.tokenExpired": {
    message: "Token verlopen",
    description: "Title when reset token is expired",
  },
  "auth.tokenExpiredDescription": {
    message: "De wachtwoord reset token is verlopen of ongeldig",
    description: "Description when token is expired",
  },
  "auth.tokenExpiredMessage": {
    message: "Deze wachtwoord reset token is verlopen. Vraag een nieuwe aan.",
    description: "Alert message for expired token",
  },
  "auth.username": {
    message: "Gebruikername",
    description: "Username field label",
  },
  "auth.usernameAlphanumeric": {
    message: "Gebruikername can only contain letters and numbers",
    description: "Validation error when username contains invalid characters",
  },
  "auth.usernameLowercaseAlphanumeric": {
    message:
      "Gebruikersnaam mag alleen kleine letters, cijfers en underscores bevatten",
    description:
      "Validation error when username contains invalid characters (must be lowercase)",
  },
  "auth.usernameMaxLength": {
    message: "Gebruikername must be at most 16 characters",
    description: "Validation error when username too long",
  },
  "auth.usernamePublicHint": {
    message: "Deze gebruikersnaam is openbaar en zichtbaar voor anderen",
    description: "Hint text explaining that username is publicly visible",
  },
  "auth.usernameRequired": {
    message: "Gebruikername is required",
    description: "Validation error when username is missing",
  },
  "auth.verifyEmail": {
    message: "E-mail Verifiëren",
    description: "Button text to verify email with OTP",
  },
  "auth.verifyYourEmail": {
    message: "Verifieer uw e-mail",
    description: "OTP verification page title",
  },
  "auth.verifying": {
    message: "Verifiëren...",
    description: "Button text while verifying OTP",
  },
  "auth.welcomeBack": {
    message: "Welkom terug",
    description: "Login page welcome title",
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
  "auth.oauthDontHaveAccount": {
    message: "Don't have an account?",
    description: "OAuth consent page link to register",
  },
  "auth.oauthAlreadyHaveAccount": {
    message: "Already have an account?",
    description: "OAuth consent page link back to sign in",
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
    message: "Uw sessie is verlopen. Log opnieuw in.",
    description:
      "Banner shown on the login page when redirected here because the previous session's token expired or was revoked",
  },
};
export default nlAuth;
