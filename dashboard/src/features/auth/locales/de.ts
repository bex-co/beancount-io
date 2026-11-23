export interface TranslationEntry {
  message: string;
  description: string;
}

const deAuth: Record<string, TranslationEntry> = {
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
  "auth.chooseYourPassword": {
    message: "Wählen Sie ein Passwort (mind. 8 Zeichen)",
    description:
      "Placeholder for the password a new account chooses, with the minimum length",
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
  "auth.emailUnavailable": {
    message: "Dieser Server kann keine E-Mails senden",
    description:
      "Title on the forgot-password page when the server has no mail provider",
  },
  "auth.emailUnavailableDescription": {
    message:
      "Von diesem Server können keine E-Mails zum Zurücksetzen des Passworts versendet werden. Bitten Sie die Person, die diesen Beancount.io-Server betreibt (den Betreiber), um einen einmaligen Link zum Zurücksetzen Ihres Passworts.",
    description:
      "Forgot-password page text when the server cannot send email; tells the user to ask the server operator for a reset link",
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
    message: "Geben Sie Ihren Benutzernamen ein (max. 20 Zeichen)",
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
    message: "Geben Sie Ihr Passwort ein",
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
  "auth.loginFailed": {
    message: "Anmeldung fehlgeschlagen",
    description: "Error title when login fails",
  },
  "auth.loginRateLimited": {
    message:
      "Zu viele Anmeldeversuche. Warten Sie einige Minuten und versuchen Sie es erneut, oder setzen Sie Ihr Passwort zurück.",
    description:
      "Shown on any password sign-in form when sign-in is rate limited, by address or by too many wrong passwords for the account",
  },
  "auth.logout": {
    message: "Abmelden",
    description: "Button label to log out",
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
  "auth.selfHosted": {
    message: "Selbst gehostet",
    description:
      "Feature title beside the sign-in and sign-up forms of a self-hosted deployment, in place of the hosted service's security claim",
  },
  "auth.selfHostedDescription": {
    message:
      "Dieses Beancount.io wird von seinem Eigentümer betrieben, nicht vom Dienst Beancount.io. Ihre Buchhaltung liegt auf seinem eigenen Server.",
    description:
      "Feature description on a self-hosted deployment: who runs it, and where the books are stored",
  },
  "auth.plainTextBooks": {
    message: "Bücher als reiner Text",
    description:
      "Feature title beside the sign-in and sign-up forms of a self-hosted deployment, in place of the hosted service's user count",
  },
  "auth.plainTextBooksDescription": {
    message:
      "Ihr Hauptbuch ist reiner Beancount-Text in einem Git-Repository. Sie können es jederzeit klonen, sichern oder umziehen.",
    description:
      "Feature description on a self-hosted deployment: the ledger is plain text in Git the user can take",
  },
  "auth.newPassword": {
    message: "Neues Passwort",
    description: "Label for new password field",
  },
  "auth.newPasswordMinLength": {
    message: "Das Passwort muss mindestens 8 Zeichen lang sein",
    description: "Validation error for password length",
  },
  "auth.newPasswordMaxLength": {
    message:
      "Das Passwort ist zu lang. Verwenden Sie höchstens 72 Zeichen; Buchstaben mit Akzent, nichtlateinische Schriften und Emojis zählen jeweils als 2 bis 4.",
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
  "auth.passwordMaxLength": {
    message: "Das Passwort darf höchstens 128 Zeichen lang sein",
    description: "Validation error when password exceeds the maximum length",
  },
  "auth.passwordRequired": {
    message: "Passwort ist erforderlich",
    description: "Validation error when password is not provided",
  },
  "auth.passwordBreached": {
    message:
      "Dieses Passwort ist bei einem Datenleck aufgetaucht. Wählen Sie eines, das Sie nirgendwo sonst verwenden.",
    description:
      "Error when the server finds the new password in a known data breach (Have I Been Pwned)",
  },
  "auth.passwordTooSimilar": {
    message:
      "Das Passwort ist Ihrer E-Mail-Adresse oder Ihrem Benutzernamen zu ähnlich.",
    description:
      "Error when the new password is too close to the account's email or username",
  },
  "auth.passwordResetSuccessMessage": {
    message:
      "Ihr Passwort wurde zurückgesetzt, und Sie wurden auf allen Geräten und in verbundenen Apps abgemeldet. Weiterleitung zur Anmeldung...",
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
  "auth.registrationFailed": {
    message: "Registrierung fehlgeschlagen",
    description: "Error when registration fails",
  },
  "auth.resetPasswordButton": {
    message: "Passwort zurücksetzen",
    description: "Button text to reset password",
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
  "auth.requestNewResetLink": {
    message: "Neuen Link anfordern",
    description:
      "Link to request a new password reset after an expired or invalid token",
  },
  "auth.sendResetLink": {
    message: "Reset-Link senden",
    description: "Button to send password reset link",
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
  "auth.scriptRequired": {
    message:
      "Für die Anmeldung wird JavaScript benötigt. Bitte aktivieren Sie es und laden Sie die Seite neu.",
    description:
      "Notice shown in place of the submit button when JavaScript is unavailable, explaining why sign-in and registration cannot be completed. Rendered inside <noscript>.",
  },
  "auth.signIn": {
    message: "Anmelden",
    description: "Button label for sign in action",
  },
  "auth.signInWith": {
    message: "Mit {name} anmelden",
    description:
      "Button label to sign in with the identity provider set up by the operator; {name} is its name",
  },
  "auth.oidcErrorEmailInUse": {
    message:
      "Diese E-Mail gehört bereits zu einem Konto. Melde dich mit deinem Passwort an und verknüpfe es dann in den Einstellungen.",
    description:
      "Error after provider sign-in when the email already belongs to an account",
  },
  "auth.oidcErrorEmailUnverified": {
    message: "Dein Anmeldeanbieter hat deine E-Mail nicht bestätigt.",
    description:
      "Error after provider sign-in when the provider has not verified the email",
  },
  "auth.oidcErrorBlocked": {
    message: "Dieses Konto ist gesperrt.",
    description: "Error after provider sign-in when the account is blocked",
  },
  "auth.oidcErrorAlreadyLinked": {
    message: "Diese Anmeldung ist bereits mit einem anderen Konto verknüpft.",
    description:
      "Error when the provider identity is already linked to another account",
  },
  "auth.oidcErrorAccountLinked": {
    message: "Dieses Konto ist bereits mit einer anderen Anmeldung verknüpft.",
    description:
      "Error when the account is already linked to a different provider identity",
  },
  "auth.oidcErrorNotAllowed": {
    message: "Mit dieser E-Mail ist hier keine Anmeldung erlaubt.",
    description:
      "Error when the operator has not allowed this email to sign in with the provider",
  },
  "auth.oidcErrorFailed": {
    message: "Anmeldung fehlgeschlagen. Bitte versuche es erneut.",
    description: "Generic error when provider sign-in fails",
  },
  "auth.oidcLinked": {
    message: "Dein Konto ist verknüpft. Du kannst dich mit {name} anmelden.",
    description:
      "Settings text when the account is linked to the provider; {name} is its name",
  },
  "auth.oidcNotLinked": {
    message: "Verknüpfe dein {name}-Konto, um dich damit anzumelden.",
    description:
      "Settings text when the account is not linked to the provider; {name} is its name",
  },
  "auth.oidcLink": {
    message: "Verknüpfen",
    description: "Settings button to link the provider",
  },
  "auth.oidcUnlink": {
    message: "Trennen",
    description: "Settings button to unlink the provider",
  },
  "auth.oidcUnlinkNeedsPassword": {
    message:
      "Dein Konto hat kein Passwort. Lege über „Passwort vergessen“ eines fest, bevor du trennst.",
    description: "Error when unlinking an account that has no password",
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
  "auth.tokenValidationUnavailable": {
    message: "Zurücksetzungs-Link konnte nicht geprüft werden",
    description: "Title when the reset-token validation request itself fails",
  },
  "auth.tokenValidationUnavailableDescription": {
    message:
      "Der Server war nicht erreichbar, um Ihren Link zum Zurücksetzen des Passworts zu prüfen. Der Link ist möglicherweise noch gültig – bitte erneut versuchen.",
    description: "Explanation shown when reset-token validation is unavailable",
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
  "auth.usernameLowercaseAlphanumeric": {
    message:
      "Benutzername darf nur Kleinbuchstaben, Zahlen und Unterstriche enthalten",
    description:
      "Validation error when username contains invalid characters (must be lowercase)",
  },
  "auth.usernameMaxLength": {
    message: "Der Benutzername darf höchstens 20 Zeichen lang sein",
    description: "Validation error when username too long",
  },
  "auth.usernamePublicHint": {
    message: "Dieser Benutzername ist öffentlich und für andere sichtbar",
    description: "Hint text explaining that username is publicly visible",
  },
  "auth.usernameRequired": {
    message: "Benutzername ist erforderlich",
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
    message: "Zum Fortfahren anmelden",
    description: "OAuth consent page login step title",
  },
  "auth.oauthAppWantsAccess": {
    message: "Eine App möchte auf Ihr Beancount-Hauptbuch zugreifen.",
    description: "OAuth consent page login step description",
  },
  "auth.oauthRequesterHeading": {
    message: "Wer fragt an",
    description:
      "OAuth consent: label of the section naming the requesting app",
  },
  "auth.oauthRequesterRedirect": {
    message: "Nach der Freigabe kehren Sie zu {host} zurück.",
    description:
      "OAuth consent: where the authorization code is sent ({host} is the redirect host)",
  },
  "auth.oauthRequesterName": {
    message:
      "Die App nennt sich „{name}“. Apps wählen ihren Namen selbst – prüfen Sie daher die Adresse oben.",
    description:
      "OAuth consent: the app's self-asserted name ({name}), labelled as its own claim",
  },
  "auth.oauthRequesterUnnamed": {
    message: "Die App hat keinen Namen angegeben. Prüfen Sie die Adresse oben.",
    description: "OAuth consent: shown when the app gave no name",
  },
  "auth.oauthRequesterVouchedBy": {
    message: "Ihre Angaben werden von {host} veröffentlicht.",
    description:
      "OAuth consent: the domain publishing a CIMD client's metadata ({host})",
  },
  "auth.oauthRequesterLoopbackWarning": {
    message:
      "Diese App kehrt nur zu Ihrem eigenen Computer zurück. Jedes dort laufende Programm könnte diese Anfrage gestartet haben – geben Sie sie nur frei, wenn Sie gerade eine App verbinden.",
    description:
      "OAuth consent: warning when every redirect is the user's own computer (loopback)",
  },
  "auth.oauthRequesterUnavailable": {
    message:
      "Diese Anfrage konnte nicht zugeordnet werden. Sie ist möglicherweise abgelaufen – kehren Sie zu Ihrer App zurück und verbinden Sie erneut.",
    description:
      "OAuth consent: the requesting app could not be identified; approval is disabled",
  },
  "auth.oauthAllLedgers": {
    message: "Alle zugänglichen Bücher",
    description: "MCP account-wide consent option",
  },
  "auth.oauthAllLedgersDescription": {
    message:
      "Erlaubt die angeforderten Aktionen für jetzt oder künftig zugängliche Bücher sowie die durch diese Berechtigungen erlaubten Kontoaktionen.",
    description: "MCP account-wide consent explanation",
  },
  "auth.oauthChooseLedger": {
    message: "Hauptbuch auswählen",
    description: "OAuth consent page ledger step title",
  },
  "auth.oauthSelectLedger": {
    message: "Wählen Sie, für welches Hauptbuch der Zugriff gelten soll.",
    description: "OAuth consent page ledger step description",
  },
  "auth.oauthApproveAccess": {
    message: "Zugriff erlauben",
    description: "OAuth consent page approve button",
  },
  "auth.oauthNoLedgersMessage": {
    message: "Keine Bücher gefunden.",
    description: "OAuth consent page empty ledger state message",
  },
  "auth.oauthRegisterToContinue": {
    message: "Zum Fortfahren ein Konto erstellen",
    description: "OAuth consent page register step title",
  },
  "auth.oauthVerifyEmailToContinue": {
    message: "Zum Fortfahren E-Mail bestätigen",
    description: "OAuth consent page OTP step title",
  },
  "auth.loginSessionExpiredMessage": {
    message: "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.",
    description:
      "Banner shown on the login page when redirected here because the previous session's token expired or was revoked",
  },
  "auth.cliAuthTitle": {
    message: "CLI-Zugriff autorisieren",
    description: "Title of the CLI device authorization card",
  },
  "auth.cliAuthDescription": {
    message: "Die Beancount-CLI fordert Zugriff auf Ihr Konto an.",
    description: "Description under the CLI authorization title",
  },
  "auth.cliAuthPermissionsIntro": {
    message: "Damit kann die CLI:",
    description: "Intro line above the list of CLI permissions",
  },
  "auth.cliAuthPermissionLedgers": {
    message: "Ihre Hauptbücher lesen und schreiben",
    description: "CLI permission list item for reading and writing ledgers",
  },
  "auth.cliAuthPermissionAccount": {
    message: "Auf Ihre Kontoinformationen zugreifen",
    description: "CLI permission list item for accessing account information",
  },
  "auth.cliAuthAuthorize": {
    message: "Autorisieren",
    description: "Button to authorize the CLI session",
  },
  "auth.cliAuthAuthorizing": {
    message: "Wird autorisiert...",
    description: "Button text while the CLI session is being authorized",
  },
  "auth.cliAuthDeny": {
    message: "Ablehnen",
    description: "Button to deny the CLI session",
  },
  "auth.cliAuthDenying": {
    message: "Wird abgelehnt...",
    description: "Button text while the CLI session is being denied",
  },
  "auth.cliAuthSessionExpired": {
    message: "Sitzung abgelaufen oder nicht gefunden.",
    description: "Error shown when the CLI auth session is expired or missing",
  },
  "auth.cliAuthCodeUnknown": {
    message:
      "Dieser Code ist unbekannt oder abgelaufen. Führen Sie `bea login` im Terminal erneut aus, um einen neuen Code zu erhalten.",
    description:
      "Error when the entered CLI one-time code is unknown or expired; tells the user to rerun bea login",
  },
  "auth.cliAuthSuccessTitle": {
    message: "Autorisierung erfolgreich",
    description: "Title shown after the CLI session was authorized",
  },
  "auth.cliAuthSuccessDescription": {
    message: "Sie können diesen Tab schließen und zur CLI zurückkehren.",
    description: "Hint shown after successful CLI authorization",
  },
  "auth.cliAuthDeniedTitle": {
    message: "Zugriff abgelehnt",
    description: "Title shown after the CLI session was denied",
  },
  "auth.cliAuthDeniedDescription": {
    message: "Sie können diesen Tab schließen.",
    description: "Hint shown after the CLI session was denied",
  },
  "auth.cliAuthCodeEntryTitle": {
    message: "Gerät autorisieren",
    description: "Title of the CLI device code entry card",
  },
  "auth.cliAuthCodeEntryDescription": {
    message:
      "Geben Sie den Einmalcode ein, der in Ihrem Terminal angezeigt wird.",
    description: "Description under the CLI device code entry title",
  },
  "auth.cliAuthCodeLabel": {
    message: "Einmalcode",
    description: "Label of the CLI one-time code input",
  },
  "auth.cliAuthCodeContinue": {
    message: "Weiter",
    description: "Button to submit the entered CLI one-time code",
  },
  "auth.cliAuthCodeInvalid": {
    message: "Geben Sie den 8-stelligen Code aus Ihrem Terminal ein.",
    description: "Error shown when the entered CLI code is not the right shape",
  },
  "auth.cliAuthRequestedBy": {
    message: "Angefragt von",
    description: "Heading above the requesting device's reported details",
  },
  "auth.cliAuthClientLabel": {
    message: "Client",
    description: "Label for the requesting client's name",
  },
  "auth.cliAuthDeviceLabel": {
    message: "Gerät",
    description: "Label for the requesting device's machine name",
  },
  "auth.cliAuthPlatformLabel": {
    message: "System",
    description: "Label for the requesting device's operating system",
  },
  "auth.cliAuthIpLabel": {
    message: "IP-Adresse",
    description: "Label for the requesting device's IP address",
  },
  "auth.cliAuthSelfReported": {
    message:
      "Diese Angaben stammen vom Gerät selbst. Bestätigen Sie nur, wenn dies das Terminal ist, das Sie gerade verwendet haben.",
    description:
      "Warning that the requesting device's details are self-reported",
  },
  "auth.cliAuthUseAnotherCode": {
    message: "Anderen Code verwenden",
    description: "Button to enter a different CLI one-time code",
  },
  "auth.cliAuthPermissionExpiry": {
    message: "30 Tage lang auf diesem Gerät angemeldet bleiben",
    description:
      "CLI permission list item for how long the device stays signed in",
  },
  "auth.oauthIdentityWantsAccess": {
    message:
      "Eine App möchte, dass du dich mit deinem Beancount-Konto anmeldest.",
    description: "Identity OAuth consent page login step description",
  },
  "auth.oauthIdentityApproveTitle": {
    message: "Weiter zur Anmeldung",
    description: "Identity OAuth consent page approve step title",
  },
  "auth.oauthIdentityApproveDescription": {
    message:
      "Dadurch werden dein Name, deine E-Mail-Adresse und dein Benutzername an die App weitergegeben.",
    description: "Identity OAuth consent page approve step description",
  },
  "auth.oauthIdentitySignedInAs": {
    message: "Angemeldet als {email}",
    description:
      "Identity OAuth consent page approve step — shows which account is authorizing",
  },
  "auth.hidePassword": {
    message: "Passwort verbergen",
    description: "Accessible label for hiding a password",
  },
  "auth.showPassword": {
    message: "Passwort anzeigen",
    description: "Accessible label for showing a password",
  },
  "auth.oauthLedgerRequired": {
    message: "Bitte wählen Sie ein Hauptbuch aus.",
    description: "Validation shown when OAuth consent has no selected ledger",
  },
  "auth.oauthMobileSignInTitle": {
    message: "Bei Beancount anmelden",
    description:
      "Mobile OAuth login step title — first-party app, so it names the product rather than asking for access",
  },
  "auth.oauthMobileRegisterTitle": {
    message: "Erstellen Sie Ihr Beancount-Konto",
    description: "Mobile OAuth register step title",
  },
  "auth.oauthMobileChooseAccountTitle": {
    message: "Welches Konto soll die App verwenden?",
    description:
      "Mobile OAuth step shown when the browser is signed in but the app's Sign Up button started the flow",
  },
  "auth.oauthMobileContinueAs": {
    message: "Weiter als {email}",
    description:
      "Mobile OAuth button that keeps the signed-in browser account; {email} is the account",
  },
  "auth.oauthMobileCreateDifferentAccount": {
    message: "Ein anderes Konto erstellen",
    description:
      "Mobile OAuth button that signs the browser out and opens registration",
  },
  "auth.oauthMobileAllowTitle": {
    message: "Beancount Mobile zulassen?",
    description: "Mobile OAuth approval title",
  },
  "auth.oauthMobileGrantDescription": {
    message: "Diese kontoweite Bewilligung ermöglicht der App:",
    description: "Introduction to mobile OAuth permissions",
  },
  "auth.oauthSwitchAccountFailed": {
    message:
      "Das Konto konnte nicht gewechselt werden. Bitte versuchen Sie es erneut.",
    description: "Error shown when OAuth account switching fails",
  },
  "auth.oauthUseAnotherAccount": {
    message: "Verwenden Sie ein anderes Konto",
    description: "Button for switching OAuth accounts",
  },
  "auth.oauthMobileScopeIdentity": {
    message: "Identifizieren Sie das Konto, das Sie genehmigen",
    description: "Description of the OpenID mobile permission",
  },
  "auth.oauthMobileScopeOfflineAccess": {
    message: "Bleiben Sie sicher angemeldet, bis Sie den Zugriff widerrufen",
    description: "Description of the offline access mobile permission",
  },
  "auth.oauthMobileScopeRead": {
    message: "Lesen Sie Ihre Geschäftsbücher",
    description: "Description of the ledger read mobile permission",
  },
  "auth.oauthMobileScopeWrite": {
    message: "Hauptbuchdaten erstellen und aktualisieren",
    description: "Description of the ledger write mobile permission",
  },
  "auth.oauthMobileScopeAdmin": {
    message: "Hauptbücher und Mitarbeiter verwalten",
    description: "Description of the ledger admin mobile permission",
  },
  "auth.recoveryTitle": {
    message: "E-Mail-Adresse zum Anmelden bestätigen",
    description:
      "Title of the email ownership verification step for sign-in recovery",
  },
  "auth.recoveryDescription": {
    message:
      "Öffne den Link in deiner E-Mail zur Anmeldehilfe und gib anschließend den darin enthaltenen Code und dein aktuelles Passwort ein.",
    description: "Instructions for continuing from the sign-in recovery email",
  },
  "auth.recoverySendEmail": {
    message: "Anmeldehilfe per E-Mail senden",
    description: "Button requesting a sign-in recovery email",
  },
  "auth.recoverySending": {
    message: "E-Mail zur Anmeldehilfe wird gesendet...",
    description: "Pending state while requesting a sign-in recovery email",
  },
  "auth.recoverySent": {
    message:
      "Falls für diese Adresse ein Konto besteht, erhältst du in Kürze eine E-Mail zur Anmeldehilfe. Öffne den Link darin, um fortzufahren. Eine kürzlich erhaltene E-Mail zur Anmeldehilfe ist weiterhin gültig.",
    description:
      "Uniform confirmation after requesting recovery; previous valid recovery emails remain usable",
  },
  "auth.recoveryResend": {
    message: "Weitere E-Mail zur Anmeldehilfe senden",
    description: "Button requesting another sign-in recovery email",
  },
  "auth.recoveryRetryAt": {
    message: "Versuche es um {time} erneut.",
    description:
      "Absolute local retry time after throttling; {time} is formatted using the active locale",
  },
  "auth.recoveryCode": {
    message: "Sechsstelliger Bestätigungscode",
    description: "Accessible label for the sign-in recovery email code",
  },
  "auth.recoveryCodeInvalid": {
    message: "Gib den sechsstelligen Code aus der E-Mail zur Anmeldehilfe ein.",
    description:
      "Validation error when the recovery code is not exactly six digits",
  },
  "auth.recoveryFailed": {
    message:
      "E-Mail-Adresse, Code oder Passwort sind falsch oder der Code ist abgelaufen. Du kannst eine neue E-Mail zur Anmeldehilfe anfordern.",
    description:
      "Uniform invalid-credentials or expired-code error during sign-in recovery",
  },
  "auth.recoveryRequestFailed": {
    message:
      "Die E-Mail zur Anmeldehilfe konnte nicht angefordert werden. Versuche es erneut.",
    description: "Error when requesting a sign-in recovery email fails",
  },
  "auth.recoveryUnavailable": {
    message:
      "Die Anmeldung ist vorübergehend nicht verfügbar. Versuche es erneut.",
    description: "Temporary service outage during sign-in recovery",
  },
  "auth.recoveryExpiry": {
    message:
      "Der Code läuft nach 10 Minuten ab und gilt für einen Passwortversuch.",
    description:
      "Explains the expiry and single password-attempt limit of a recovery code",
  },
  "auth.recoverySubmit": {
    message: "Bestätigen und anmelden",
    description: "Button submitting the recovery code and current password",
  },
  "auth.recoveryVerifying": {
    message: "Wird bestätigt...",
    description: "Pending state while verifying the recovery code and password",
  },
};

export default deAuth;
