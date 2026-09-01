export interface TranslationEntry {
  message: string;
  description: string;
}

const skAuth: Record<string, TranslationEntry> = {
  "auth.alreadyHaveAccountQuestion": {
    message: "Už máte účet?",
    description: "Prompt asking if user has existing account",
  },
  "auth.and": {
    message: "a",
    description: "Conjunction between terms and privacy links",
  },
  "auth.backToSignIn": {
    message: "Späť na prihlásenie",
    description: "Link text to return to sign in page",
  },
  "auth.backToSignUp": {
    message: "Späť na registráciu",
    description: "Link text to return to sign up page",
  },
  "auth.confirmNewPassword": {
    message: "Potvrďte nové heslo",
    description: "Label for confirm password field",
  },
  "auth.confirmPassword": {
    message: "Potvrdiť heslo",
    description: "Label for password confirmation input field",
  },
  "auth.confirmPasswordRequired": {
    message: "Prosím potvrďte svoje heslo",
    description: "Validation error when password confirmation is missing",
  },
  "auth.confirmYourNewPassword": {
    message: "Potvrďte svoje nové heslo",
    description: "Placeholder for confirm password input",
  },
  "auth.confirmYourPassword": {
    message: "Potvrďte heslo",
    description: "Placeholder for password confirmation",
  },
  "auth.createAccount": {
    message: "Vytvoriť účet",
    description: "Button to submit registration",
  },
  "auth.createYourAccount": {
    message: "Vytvorte si účet",
    description: "Registration page title",
  },
  "auth.creatingAccount": {
    message: "Vytváram účet...",
    description: "Button state while creating account",
  },
  "auth.didNotReceiveOtp": {
    message: "Nedostali ste kód?",
    description: "Prompt asking if user didn't receive OTP",
  },
  "auth.dontHaveAccount": {
    message: "Nemáte účet?",
    description: "Prompt text asking if user doesn't have account",
  },
  "auth.email": {
    message: "E-mail",
    description: "Label for email input field",
  },
  "auth.emailAddress": {
    message: "E-mailová adresa",
    description: "Email address field label",
  },
  "auth.emailInvalid": {
    message: "Zadajte platnú e-mailovú adresu",
    description: "Validation error when email format is invalid",
  },
  "auth.emailRequired": {
    message: "E-mail je povinný",
    description: "Validation error when email is not provided",
  },
  "auth.emailSent": {
    message: "E-mail odoslaný!",
    description: "Success title after email sent",
  },
  "auth.emailSentDescription": {
    message:
      "Odoslali sme odkaz na resetovanie hesla na vašu e-mailovú adresu. Skontrolujte si prosím doručenú poštu a postupujte podľa pokynov.",
    description: "Detailed success message after reset email sent",
  },
  "auth.enterDetailsToGetStarted": {
    message: "Zadajte svoje údaje pre začiatok práce s ovládacím panelom",
    description: "Registration page description",
  },
  "auth.enterEmailForReset": {
    message:
      "Zadajte svoju e-mailovú adresu a pošleme vám odkaz na resetovanie hesla",
    description: "Instructions on forgot password page",
  },
  "auth.enterFirstName": {
    message: "Zadajte vaše krstné meno",
    description: "Placeholder for first name input",
  },
  "auth.enterLastName": {
    message: "Zadajte vaše priezvisko",
    description: "Placeholder for last name input",
  },
  "auth.enterNewPasswordBelow": {
    message: "Zadajte svoje nové heslo nižšie",
    description: "Instruction for reset password form",
  },
  "auth.enterOtpCode": {
    message: "Zadajte kód",
    description: "Label for OTP input field",
  },
  "auth.enterUsername": {
    message: "Zadajte používateľské meno (max 16 znakov)",
    description: "Placeholder for username input with character limit",
  },
  "auth.enterYourEmail": {
    message: "Zadajte váš e-mail",
    description: "Placeholder for email input",
  },
  "auth.enterYourNewPassword": {
    message: "Zadajte svoje nové heslo",
    description: "Placeholder for new password input",
  },
  "auth.enterYourPassword": {
    message: "Zadajte heslo (min 6 znakov)",
    description: "Placeholder for password input with requirement",
  },
  "auth.failedToResetPassword": {
    message: "Resetovanie hesla zlyhalo. Prosím skúste to znova.",
    description: "Error message when password reset fails",
  },
  "auth.failedToSendResetEmail": {
    message:
      "Odoslanie e-mailu na resetovanie hesla zlyhalo. Prosím skúste to znova.",
    description: "Error when reset email fails to send",
  },
  "auth.firstName": {
    message: "Krstné meno",
    description: "Label for first name input field",
  },
  "auth.firstNameMaxLength": {
    message: "Krstné meno môže mať maximálne 50 znakov",
    description: "Validation error when first name is too long",
  },
  "auth.forgotPassword": {
    message: "Zabudli ste heslo?",
    description: "Link text for forgot password feature",
  },
  "auth.forgotYourPassword": {
    message: "Zabudli ste heslo?",
    description: "Forgot password page title",
  },
  "auth.lastName": {
    message: "Priezvisko",
    description: "Label for last name input field",
  },
  "auth.lastNameMaxLength": {
    message: "Priezvisko môže mať maximálne 50 znakov",
    description: "Validation error when last name is too long",
  },
  "auth.loggingOut": {
    message: "Odhlasovanie",
    description: "Title shown while logging out",
  },
  "auth.loggingOutMessage": {
    message: "Prosím počkajte, kým vás odhlásime...",
    description: "Message shown while logging out",
  },
  "auth.login": {
    message: "Prihlásiť / Registrovať",
    description: "Button label for login or signup",
  },
  "auth.loginFailed": {
    message: "Prihlásenie zlyhalo",
    description: "Error title when login fails",
  },
  "auth.logout": {
    message: "Odhlásiť",
    description: "Button label to log out",
  },
  "auth.lovedByUsers": {
    message: "Obľúbený používateľmi",
    description: "Loved by users feature title",
  },
  "auth.lovedByUsersDescription": {
    message:
      "Pridajte sa k tisíckam spokojných používateľov, ktorí dôverujú Beancount pre svoje účtovné potreby",
    description: "Loved by users feature description",
  },
  "auth.newPassword": {
    message: "Nové heslo",
    description: "Label for new password field",
  },
  "auth.newPasswordMinLength": {
    message: "Heslo musí mať aspoň 6 znakov",
    description: "Validation error for password length",
  },
  "auth.newPasswordMaxLength": {
    message: "Heslo musí mať najviac 128 znakov",
    description:
      "Validation error when new password exceeds the maximum length",
  },
  "auth.newPasswordRequired": {
    message: "Heslo je povinné",
    description: "Validation error for missing new password",
  },
  "auth.otpInvalidLength": {
    message: "Kód OTP musí mať 4 číslice",
    description: "Validation error when OTP length is invalid",
  },
  "auth.otpRequired": {
    message: "Kód OTP je povinný",
    description: "Validation error when OTP is missing",
  },
  "auth.otpSentToYourEmail": {
    message: "Poslali sme 4-miestny kód na vašu e-mailovú adresu",
    description: "Message showing OTP was sent to email",
  },
  "auth.otpVerificationError": {
    message: "Počas overovania OTP došlo k chybe",
    description: "Generic error message for OTP verification",
  },
  "auth.otpVerificationFailed": {
    message: "Overenie OTP zlyhalo",
    description: "Error message when OTP verification fails",
  },
  "auth.password": {
    message: "Heslo",
    description: "Label for password input field",
  },
  "auth.passwordMinLength": {
    message: "Heslo musí mať aspoň 6 znakov",
    description: "Validation error when password is too short",
  },
  "auth.passwordMaxLength": {
    message: "Heslo musí mať najviac 128 znakov",
    description: "Validation error when password exceeds the maximum length",
  },
  "auth.passwordRequired": {
    message: "Heslo je povinné",
    description: "Validation error when password is not provided",
  },
  "auth.passwordResetSuccessMessage": {
    message: "Vaše heslo bolo resetované. Presmerovávam na prihlásenie...",
    description: "Success message description",
  },
  "auth.passwordResetSuccessful": {
    message: "Heslo bolo úspešne resetované!",
    description: "Success message title",
  },
  "auth.passwordsDoNotMatch": {
    message: "Heslá sa nezhodujú",
    description: "Validation error when passwords don't match",
  },
  "auth.privacyPolicy": {
    message: "Zásady ochrany osobných údajov",
    description: "Link text for privacy policy",
  },
  "auth.realTimeInsights": {
    message: "Pohľady v reálnom čase",
    description: "Real-time insights feature title",
  },
  "auth.realTimeInsightsDescription": {
    message: "Získajte okamžitý prehľad o vašej finančnej pozícii a trendoch",
    description: "Real-time insights feature description",
  },
  "auth.redirectingToLogin": {
    message: "Presmerovávam na prihlasovaciu stránku...",
    description: "Message shown after successful logout",
  },
  "auth.registrationFailed": {
    message: "Registrácia zlyhala",
    description: "Error when registration fails",
  },
  "auth.resetPasswordButton": {
    message: "Resetovať heslo",
    description: "Button text to reset password",
  },
  "auth.resetYourPassword": {
    message: "Resetovať heslo",
    description: "Title for reset password page",
  },
  "auth.resettingPassword": {
    message: "Resetujem heslo...",
    description: "Button text while resetting password",
  },
  "auth.secureAccess": {
    message: "Zabezpečený prístup",
    description: "Secure access feature title",
  },
  "auth.secureAccessDescription": {
    message: "Vaše finančné údaje sú chránené podnikovým zabezpečením",
    description: "Secure access feature description",
  },
  "auth.sendResetLink": {
    message: "Odoslať odkaz na resetovanie",
    description: "Button to send password reset link",
  },
  "auth.sending": {
    message: "Odosielam...",
    description: "Button state while sending email",
  },
  "auth.sessionExpired": {
    message: "Relácia vypršala",
    description: "Title when signup session is expired",
  },
  "auth.sessionExpiredDescription": {
    message: "Registračná relácia vypršala alebo je neplatná",
    description: "Description when session is expired",
  },
  "auth.sessionExpiredMessage": {
    message:
      "Táto registračná relácia vypršala. Prosím začnite proces registrácie znova.",
    description: "Alert message for expired session",
  },
  "auth.signIn": {
    message: "Prihlásiť",
    description: "Button label for sign in action",
  },
  "auth.signInToAccount": {
    message: "Prihláste sa do svojho účtu Beancount",
    description: "Login page subtitle",
  },
  "auth.signUp": {
    message: "Registrovať",
    description: "Button label for sign up action",
  },
  "auth.termsAgreementPrefix": {
    message: 'Kliknutím na "Vytvoriť účet" súhlasím s podmienkami beancount.io',
    description: "Prefix text before terms and privacy links on sign up form",
  },
  "auth.termsOfUse": {
    message: "Podmienky používania",
    description: "Link text for terms of use",
  },
  "auth.tokenExpired": {
    message: "Token expiroval",
    description: "Title when reset token is expired",
  },
  "auth.tokenExpiredDescription": {
    message: "Token na resetovanie hesla vypršal alebo je neplatný",
    description: "Description when token is expired",
  },
  "auth.tokenExpiredMessage": {
    message:
      "Tento token na resetovanie hesla vypršal. Prosím požiadajte o nový.",
    description: "Alert message for expired token",
  },
  "auth.username": {
    message: "Používateľské meno",
    description: "Username field label",
  },
  "auth.usernameLowercaseAlphanumeric": {
    message:
      "Používateľské meno môže obsahovať iba malé písmená, číslice a podčiarknutia",
    description:
      "Validation error when username contains invalid characters (must be lowercase)",
  },
  "auth.usernameMaxLength": {
    message: "Používateľské meno môže mať maximálne 16 znakov",
    description: "Validation error when username too long",
  },
  "auth.usernamePublicHint": {
    message: "Toto používateľské meno je verejné a viditeľné pre ostatných",
    description: "Hint text explaining that username is publicly visible",
  },
  "auth.usernameRequired": {
    message: "Používateľské meno je povinné",
    description: "Validation error when username is missing",
  },
  "auth.verifyEmail": {
    message: "Overiť e-mail",
    description: "Button text to verify email with OTP",
  },
  "auth.verifyYourEmail": {
    message: "Overte svoj e-mail",
    description: "OTP verification page title",
  },
  "auth.verifying": {
    message: "Overujem...",
    description: "Button text while verifying OTP",
  },
  "auth.welcomeBack": {
    message: "Vitajte späť",
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
  "auth.oauthRegisterToContinue": {
    message: "Create an account to continue",
    description: "OAuth consent page register step title",
  },
  "auth.oauthVerifyEmailToContinue": {
    message: "Verify your email to continue",
    description: "OAuth consent page OTP step title",
  },
  "auth.loginSessionExpiredMessage": {
    message: "Vaša relácia vypršala. Prihláste sa znova, prosím.",
    description:
      "Banner shown on the login page when redirected here because the previous session's token expired or was revoked",
  },
  "auth.cliAuthTitle": {
    message: "Autorizovať prístup CLI",
    description: "Title of the CLI device authorization card",
  },
  "auth.cliAuthDescription": {
    message: "Beancount CLI žiada o prístup k vášmu účtu.",
    description: "Description under the CLI authorization title",
  },
  "auth.cliAuthPermissionsIntro": {
    message: "Toto umožní CLI:",
    description: "Intro line above the list of CLI permissions",
  },
  "auth.cliAuthPermissionLedgers": {
    message: "Čítať a zapisovať vaše knihy",
    description: "CLI permission list item for reading and writing ledgers",
  },
  "auth.cliAuthPermissionAccount": {
    message: "Pristupovať k informáciám o vašom účte",
    description: "CLI permission list item for accessing account information",
  },
  "auth.cliAuthAuthorize": {
    message: "Autorizovať",
    description: "Button to authorize the CLI session",
  },
  "auth.cliAuthAuthorizing": {
    message: "Autorizuje sa...",
    description: "Button text while the CLI session is being authorized",
  },
  "auth.cliAuthDeny": {
    message: "Zamietnuť",
    description: "Button to deny the CLI session",
  },
  "auth.cliAuthDenying": {
    message: "Zamieta sa...",
    description: "Button text while the CLI session is being denied",
  },
  "auth.cliAuthSessionExpired": {
    message: "Relácia vypršala alebo sa nenašla.",
    description: "Error shown when the CLI auth session is expired or missing",
  },
  "auth.cliAuthSuccessTitle": {
    message: "Autorizácia úspešná",
    description: "Title shown after the CLI session was authorized",
  },
  "auth.cliAuthSuccessDescription": {
    message: "Túto kartu môžete zavrieť a vrátiť sa do CLI.",
    description: "Hint shown after successful CLI authorization",
  },
  "auth.cliAuthDeniedTitle": {
    message: "Prístup zamietnutý",
    description: "Title shown after the CLI session was denied",
  },
  "auth.cliAuthDeniedDescription": {
    message: "Túto kartu môžete zavrieť.",
    description: "Hint shown after the CLI session was denied",
  },
  "auth.oauthIdentityWantsAccess": {
    message:
      "Aplikácia chce, aby ste sa prihlásili pomocou svojho účtu Beancount.",
    description: "Identity OAuth consent page login step description",
  },
  "auth.oauthIdentityApproveTitle": {
    message: "Pokračovať v prihlásení",
    description: "Identity OAuth consent page approve step title",
  },
  "auth.oauthIdentityApproveDescription": {
    message:
      "Tým sa s aplikáciou zdieľa vaše meno, e-mail a používateľské meno.",
    description: "Identity OAuth consent page approve step description",
  },
  "auth.oauthIdentitySignedInAs": {
    message: "Prihlásený ako {email}",
    description:
      "Identity OAuth consent page approve step — shows which account is authorizing",
  },
  "auth.hidePassword": {
    message: "Skryť heslo",
    description: "Accessible label for hiding a password",
  },
  "auth.showPassword": {
    message: "Zobraziť heslo",
    description: "Accessible label for showing a password",
  },
  "auth.oauthLedgerRequired": {
    message: "Vyberte účtovnú knihu.",
    description: "Validation shown when OAuth consent has no selected ledger",
  },
  "auth.oauthMobileSignInTitle": {
    message: "Prihlásiť sa do Beancountu",
    description:
      "Mobile OAuth login step title — first-party app, so it names the product rather than asking for access",
  },
  "auth.oauthMobileRegisterTitle": {
    message: "Vytvorte si účet Beancount",
    description: "Mobile OAuth register step title",
  },
  "auth.oauthMobileChooseAccountTitle": {
    message: "Ktorý účet má aplikácia použiť?",
    description:
      "Mobile OAuth step shown when the browser is signed in but the app's Sign Up button started the flow",
  },
  "auth.oauthMobileContinueAs": {
    message: "Pokračovať ako {email}",
    description:
      "Mobile OAuth button that keeps the signed-in browser account; {email} is the account",
  },
  "auth.oauthMobileCreateDifferentAccount": {
    message: "Vytvoriť iný účet",
    description:
      "Mobile OAuth button that signs the browser out and opens registration",
  },
  "auth.oauthMobileAllowTitle": {
    message: "Povoliť Beancount Mobile?",
    description: "Mobile OAuth approval title",
  },
  "auth.oauthMobileGrantDescription": {
    message: "Tento grant pre celý účet umožňuje aplikácii:",
    description: "Introduction to mobile OAuth permissions",
  },
  "auth.oauthSwitchAccountFailed": {
    message: "Nepodarilo sa prepnúť účty. Skúste to znova.",
    description: "Error shown when OAuth account switching fails",
  },
  "auth.oauthUseAnotherAccount": {
    message: "Použite iný účet",
    description: "Button for switching OAuth accounts",
  },
  "auth.oauthMobileScopeIdentity": {
    message: "Identifikujte účet, ktorý schvaľujete",
    description: "Description of the OpenID mobile permission",
  },
  "auth.oauthMobileScopeOfflineAccess": {
    message: "Zostaňte bezpečne prihlásení, kým nezrušíte prístup",
    description: "Description of the offline access mobile permission",
  },
  "auth.oauthMobileScopeRead": {
    message: "Prečítajte si svoje účtovné knihy",
    description: "Description of the ledger read mobile permission",
  },
  "auth.oauthMobileScopeWrite": {
    message: "Vytvárajte a aktualizujte údaje účtovnej knihy",
    description: "Description of the ledger write mobile permission",
  },
  "auth.oauthMobileScopeAdmin": {
    message: "Spravujte účtovné knihy a spolupracovníkov",
    description: "Description of the ledger admin mobile permission",
  },
};

export default skAuth;
