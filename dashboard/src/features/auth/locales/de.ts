export interface TranslationEntry {
  message: string;
  description: string;
}

const deAuth: Record<string, TranslationEntry> = {
  "auth.alreadyHaveAccount": {
    message: "Bereits ein Konto? Anmelden",
    description: "Prompt text asking if user already has account",
  },
  "auth.alreadyHaveAccountQuestion": {
    message: "Haben Sie bereits ein Konto?",
    description: "Prompt asking if user has existing account",
  },
  "auth.and": {
    message: "und",
    description: "Conjunction between terms and privacy links",
  },
  "auth.authenticating": {
    message: "Authentifizierung läuft...",
    description: "Message shown during authentication process",
  },
  "auth.authenticationError": {
    message: "Authentifizierungsfehler",
    description: "Title for authentication error dialog",
  },
  "auth.authenticationErrorOccurred": {
    message: "Ein Fehler ist aufgetreten during authentication",
    description: "Generic authentication error message",
  },
  "auth.authenticationFailed": {
    message: "Authentifizierung fehlgeschlagen",
    description: "Error message when authentication fails",
  },
  "auth.backToSignIn": {
    message: "Zurück zur Anmeldung",
    description: "Link text to return to sign in page",
  },
  "auth.backToSignUp": {
    message: "Zurück zur Registrierung",
    description: "Link text to return to sign up page",
  },
  "auth.confirmNewPassword": {
    message: "Neues Passwort bestätigen",
    description: "Label for confirm password field",
  },
  "auth.confirmPassword": {
    message: "Passwort bestätigen",
    description: "Label for password confirmation input field",
  },
  "auth.confirmPasswordRequired": {
    message: "Bitte bestätigen Sie Ihr Passwort",
    description: "Validation error when password confirmation is missing",
  },
  "auth.confirmYourNewPassword": {
    message: "Bestätigen Sie Ihr neues Passwort",
    description: "Placeholder for confirm password input",
  },
  "auth.confirmYourPassword": {
    message: "Bestätigen Sie Ihr Passwort",
    description: "Placeholder for password confirmation",
  },
  "auth.createAccount": {
    message: "Konto erstellen",
    description: "Button to submit registration",
  },
  "auth.createYourAccount": {
    message: "Erstellen Sie Ihr Konto",
    description: "Registration page title",
  },
  "auth.creatingAccount": {
    message: "Konto wird erstellt...",
    description: "Button state while creating account",
  },
  "auth.didNotReceiveOtp": {
    message: "Code nicht erhalten?",
    description: "Prompt asking if user didn't receive OTP",
  },
  "auth.dontHaveAccount": {
    message: "Noch kein Konto?",
    description: "Prompt text asking if user doesn't have account",
  },
  "auth.email": {
    message: "E-Mail",
    description: "Label for email input field",
  },
  "auth.emailAddress": {
    message: "E-Mail-Adresse",
    description: "Email address field label",
  },
  "auth.emailInvalid": {
    message: "Bitte geben Sie eine gültige E-Mail-Adresse ein",
    description: "Validation error when email format is invalid",
  },
  "auth.emailRequired": {
    message: "E-Mail ist erforderlich",
    description: "Validation error when email is not provided",
  },
  "auth.emailSent": {
    message: "E-Mail gesendet!",
    description: "Success title after email sent",
  },
  "auth.emailSentDescription": {
    message:
      "Wir haben einen Link zum Zurücksetzen des Passworts an Ihre E-Mail-Adresse gesendet. Bitte prüfen Sie Ihren Posteingang und folgen Sie den Anweisungen zum Zurücksetzen Ihres Passworts.",
    description: "Detailed success message after reset email sent",
  },
  "auth.enterCredentials": {
    message:
      "Geben Sie Ihre Zugangsdaten ein, um auf Ihr Dashboard zuzugreifen",
    description: "Login page description",
  },
  "auth.enterDetailsToGetStarted": {
    message: "Geben Sie Ihre Daten ein, um mit Ihrem Dashboard zu beginnen",
    description: "Registration page description",
  },
  "auth.enterEmailForReset": {
    message:
      "Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts",
    description: "Instructions on forgot password page",
  },
  "auth.enterFirstName": {
    message: "Geben Sie Ihren Vornamen ein",
    description: "Placeholder for first name input",
  },
  "auth.enterLastName": {
    message: "Geben Sie Ihren Nachnamen ein",
    description: "Placeholder for last name input",
  },
  "auth.enterNewPasswordBelow": {
    message: "Geben Sie unten Ihr neues Passwort ein",
    description: "Instruction for reset password form",
  },
  "auth.enterOtpCode": {
    message: "Geben Sie den Code ein",
    description: "Label for OTP input field",
  },
  "auth.enterUsername": {
    message: "Geben Sie Ihren Benutzernamen ein (max. 16 Zeichen)",
    description: "Placeholder for username input with character limit",
  },
  "auth.enterYourEmail": {
    message: "Geben Sie Ihre E-Mail ein",
    description: "Placeholder for email input",
  },
  "auth.enterYourNewPassword": {
    message: "Geben Sie Ihr neues Passwort ein",
    description: "Placeholder for new password input",
  },
  "auth.enterYourPassword": {
    message: "Geben Sie Ihr Passwort ein (mind. 6 Zeichen)",
    description: "Placeholder for password input with requirement",
  },
  "auth.failedToResetPassword": {
    message:
      "Passwort konnte nicht zurückgesetzt werden. Bitte versuchen Sie es erneut.",
    description: "Error message when password reset fails",
  },
  "auth.failedToSendResetEmail": {
    message:
      "Passwort-Reset-E-Mail konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
    description: "Error when reset email fails to send",
  },
  "auth.firstName": {
    message: "Vorname",
    description: "Label for first name input field",
  },
  "auth.firstNameMaxLength": {
    message: "Der Vorname darf maximal 50 Zeichen lang sein",
    description: "Validation error when first name is too long",
  },
  "auth.forgotPassword": {
    message: "Passwort vergessen?",
    description: "Link text for forgot password feature",
  },
  "auth.forgotYourPassword": {
    message: "Haben Sie Ihr Passwort vergessen?",
    description: "Forgot password page title",
  },
  "auth.lastName": {
    message: "Nachname",
    description: "Label for last name input field",
  },
  "auth.lastNameMaxLength": {
    message: "Der Nachname darf maximal 50 Zeichen lang sein",
    description: "Validation error when last name is too long",
  },
  "auth.loggingOut": {
    message: "Abmeldung läuft",
    description: "Title shown while logging out",
  },
  "auth.loggingOutMessage": {
    message: "Bitte warten Sie, während wir Sie abmelden...",
    description: "Message shown while logging out",
  },
  "auth.login": {
    message: "Anmelden / Registrieren",
    description: "Button label for login or signup",
  },
  "auth.loginError": {
    message: "Ein Fehler ist aufgetreten during login",
    description: "Generic login error message",
  },
  "auth.loginFailed": {
    message: "Anmeldung fehlgeschlagen",
    description: "Error title when login fails",
  },
  "auth.logout": {
    message: "Abmelden",
    description: "Button label to log out",
  },
  "auth.logoutAlertCancel": {
    message: "Abbrechen",
    description: "Cancel button in logout confirmation dialog",
  },
  "auth.logoutAlertConfirm": {
    message: "Abmelden",
    description: "Confirm button in logout confirmation dialog",
  },
  "auth.logoutAlertMsg": {
    message: "Sind Sie sicher, dass Sie sich abmelden möchten?",
    description: "Confirmation message asking user if they want to log out",
  },
  "auth.lovedByUsers": {
    message: "Von Benutzern geliebt",
    description: "Loved by users feature title",
  },
  "auth.lovedByUsersDescription": {
    message:
      "Schließen Sie sich Tausenden zufriedener Benutzer an, die Beancount für ihre Buchhaltungsanforderungen vertrauen",
    description: "Loved by users feature description",
  },
  "auth.newPassword": {
    message: "Neues Passwort",
    description: "Label for new password field",
  },
  "auth.newPasswordMinLength": {
    message: "Das Passwort muss mindestens 6 Zeichen lang sein",
    description: "Validation error for password length",
  },
  "auth.newPasswordMaxLength": {
    message: "Das Passwort darf höchstens 128 Zeichen lang sein",
    description:
      "Validation error when new password exceeds the maximum length",
  },
  "auth.newPasswordRequired": {
    message: "Passwort ist erforderlich",
    description: "Validation error for missing new password",
  },
  "auth.otpInvalidLength": {
    message: "Der OTP-Code muss 4 Ziffern enthalten",
    description: "Validation error when OTP length is invalid",
  },
  "auth.otpRequired": {
    message: "OTP-Code ist erforderlich",
    description: "Validation error when OTP is missing",
  },
  "auth.otpSentToYourEmail": {
    message: "Wir haben einen 4-stelligen Code an Ihre E-Mail-Adresse gesendet",
    description: "Message showing OTP was sent to email",
  },
  "auth.otpVerificationError": {
    message: "Bei der OTP-Verifizierung ist ein Fehler aufgetreten",
    description: "Generic error message for OTP verification",
  },
  "auth.otpVerificationFailed": {
    message: "OTP-Verifizierung fehlgeschlagen",
    description: "Error message when OTP verification fails",
  },
  "auth.password": {
    message: "Passwort",
    description: "Label for password input field",
  },
  "auth.passwordMinLength": {
    message: "Das Passwort muss mindestens 6 Zeichen lang sein",
    description: "Validation error when password is too short",
  },
  "auth.passwordMaxLength": {
    message: "Das Passwort darf höchstens 128 Zeichen lang sein",
    description: "Validation error when password exceeds the maximum length",
  },
  "auth.passwordRequired": {
    message: "Passwort ist erforderlich",
    description: "Validation error when password is not provided",
  },
  "auth.passwordResetSuccessMessage": {
    message: "Ihr Passwort wurde zurückgesetzt. Weiterleitung zur Anmeldung...",
    description: "Success message description",
  },
  "auth.passwordResetSuccessful": {
    message: "Passwort erfolgreich zurückgesetzt!",
    description: "Success message title",
  },
  "auth.passwordsDoNotMatch": {
    message: "Die Passwörter stimmen nicht überein",
    description: "Validation error when passwords don't match",
  },
  "auth.privacyPolicy": {
    message: "Datenschutzrichtlinie",
    description: "Link text for privacy policy",
  },
  "auth.realTimeInsights": {
    message: "Echtzeit-Einblicke",
    description: "Real-time insights feature title",
  },
  "auth.realTimeInsightsDescription": {
    message: "Erhalten Sie sofortige Einblicke in Ihre Finanzlage und Trends",
    description: "Real-time insights feature description",
  },
  "auth.redirectingToLogin": {
    message: "Weiterleitung zur Anmeldeseite...",
    description: "Message shown after successful logout",
  },
  "auth.registrationError": {
    message: "Ein Fehler ist aufgetreten during registration",
    description: "Generic registration error",
  },
  "auth.registrationFailed": {
    message: "Registrierung fehlgeschlagen",
    description: "Error when registration fails",
  },
  "auth.resetEmailError": {
    message:
      "Ein Fehler ist aufgetreten while sending the password reset email",
    description: "Generic error for reset email sending",
  },
  "auth.resetPassword": {
    message: "Passwort zurücksetzen",
    description: "Page title or button for password reset",
  },
  "auth.resetPasswordButton": {
    message: "Passwort zurücksetzen",
    description: "Button text to reset password",
  },
  "auth.resetPasswordDescription": {
    message:
      "Geben Sie Ihre E-Mail-Adresse ein, um einen Link zum Zurücksetzen Ihres Passworts zu erhalten.",
    description: "Instructions for password reset process",
  },
  "auth.resetPasswordEmailSent": {
    message:
      "Eine E-Mail wurde an Ihre E-Mail-Adresse gesendet. Bitte prüfen Sie Ihre E-Mails, um Ihr Passwort zurückzusetzen.",
    description: "Success message after password reset email is sent",
  },
  "auth.resetPasswordError": {
    message: "Ein Fehler ist aufgetreten while resetting your password",
    description: "Generic error message for password reset",
  },
  "auth.resetYourPassword": {
    message: "Setzen Sie Ihr Passwort zurück",
    description: "Title for reset password page",
  },
  "auth.resettingPassword": {
    message: "Passwort wird zurückgesetzt...",
    description: "Button text while resetting password",
  },
  "auth.secureAccess": {
    message: "Sicherer Zugriff",
    description: "Secure access feature title",
  },
  "auth.secureAccessDescription": {
    message:
      "Ihre Finanzdaten sind durch Sicherheit auf Unternehmensebene geschützt",
    description: "Secure access feature description",
  },
  "auth.sendResetLink": {
    message: "Reset-Link senden",
    description: "Button to send password reset link",
  },
  "auth.sendResetPasswordEmail": {
    message: "Passwort-Reset-E-Mail senden",
    description: "Button label to send password reset email",
  },
  "auth.sending": {
    message: "Wird gesendet...",
    description: "Button state while sending email",
  },
  "auth.sessionExpired": {
    message: "Sitzung Abgelaufen",
    description: "Title when signup session is expired",
  },
  "auth.sessionExpiredDescription": {
    message: "Die Registrierungssitzung ist abgelaufen oder ungültig",
    description: "Description when session is expired",
  },
  "auth.sessionExpiredMessage": {
    message:
      "Diese Registrierungssitzung ist abgelaufen. Bitte starten Sie den Registrierungsprozess erneut.",
    description: "Alert message for expired session",
  },
  "auth.signIn": {
    message: "Anmelden",
    description: "Button label for sign in action",
  },
  "auth.signInToAccount": {
    message: "Melden Sie sich bei Ihrem Beancount-Konto an",
    description: "Login page subtitle",
  },
  "auth.signUp": {
    message: "Registrieren",
    description: "Button label for sign up action",
  },
  "auth.termsAgreementPrefix": {
    message:
      'Durch Klicken auf "Konto erstellen" stimme ich beancount.io\'s zu',
    description: "Prefix text before terms and privacy links on sign up form",
  },
  "auth.termsOfUse": {
    message: "Nutzungsbedingungen",
    description: "Link text for terms of use",
  },
  "auth.tokenExpired": {
    message: "Token abgelaufen",
    description: "Title when reset token is expired",
  },
  "auth.tokenExpiredDescription": {
    message: "Der Passwort-Reset-Token ist abgelaufen oder ungültig",
    description: "Description when token is expired",
  },
  "auth.tokenExpiredMessage": {
    message:
      "Dieser Passwort-Reset-Token ist abgelaufen. Bitte fordern Sie einen neuen an.",
    description: "Alert message for expired token",
  },
  "auth.username": {
    message: "Benutzername",
    description: "Username field label",
  },
  "auth.usernameAlphanumeric": {
    message: "Benutzername can only contain letters and numbers",
    description: "Validation error when username contains invalid characters",
  },
  "auth.usernameLowercaseAlphanumeric": {
    message:
      "Benutzername darf nur Kleinbuchstaben, Zahlen und Unterstriche enthalten",
    description:
      "Validation error when username contains invalid characters (must be lowercase)",
  },
  "auth.usernameMaxLength": {
    message: "Benutzername must be at most 16 characters",
    description: "Validation error when username too long",
  },
  "auth.usernamePublicHint": {
    message: "Dieser Benutzername ist öffentlich und für andere sichtbar",
    description: "Hint text explaining that username is publicly visible",
  },
  "auth.usernameRequired": {
    message: "Benutzername is required",
    description: "Validation error when username is missing",
  },
  "auth.verifyEmail": {
    message: "E-Mail bestätigen",
    description: "Button text to verify email with OTP",
  },
  "auth.verifyYourEmail": {
    message: "Bestätigen Sie Ihre E-Mail",
    description: "OTP verification page title",
  },
  "auth.verifying": {
    message: "Wird überprüft...",
    description: "Button text while verifying OTP",
  },
  "auth.welcomeBack": {
    message: "Willkommen zurück",
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
    message: "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.",
    description:
      "Banner shown on the login page when redirected here because the previous session's token expired or was revoked",
  },
};
export default deAuth;
