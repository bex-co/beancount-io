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
  "auth.authenticating": {
    message: "Overujem...",
    description: "Message shown during authentication process",
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
  "auth.chooseYourPassword": {
    message: "Zvoľte heslo (min 8 znakov)",
    description:
      "Placeholder for the password a new account chooses, with the minimum length",
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
  "auth.emailUnavailable": {
    message: "Tento server nemôže posielať e-maily",
    description:
      "Title on the forgot-password page when the server has no mail provider",
  },
  "auth.emailUnavailableDescription": {
    message:
      "Z tohto servera nemožno odoslať e-mail na resetovanie hesla. Požiadajte osobu, ktorá tento server Beancount.io spravuje (jeho prevádzkovateľa), o jednorazový odkaz na resetovanie hesla.",
    description:
      "Forgot-password page text when the server cannot send email; tells the user to ask the server operator for a reset link",
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
    message: "Zadajte používateľské meno (max 20 znakov)",
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
    message: "Zadajte heslo",
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
  "auth.loginRateLimited": {
    message:
      "Príliš veľa pokusov o prihlásenie. Počkajte niekoľko minút a skúste to znova, alebo si resetujte heslo.",
    description:
      "Shown on any password sign-in form when sign-in is rate limited, by address or by too many wrong passwords for the account",
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
  "auth.selfHosted": {
    message: "Vlastný hosting",
    description:
      "Feature title beside the sign-in and sign-up forms of a self-hosted deployment, in place of the hosted service's security claim",
  },
  "auth.selfHostedDescription": {
    message:
      "Tento Beancount.io prevádzkuje jeho vlastník, nie služba Beancount.io. Vaše účtovníctvo je uložené na jeho vlastnom serveri.",
    description:
      "Feature description on a self-hosted deployment: who runs it, and where the books are stored",
  },
  "auth.plainTextBooks": {
    message: "Účtovníctvo v čistom texte",
    description:
      "Feature title beside the sign-in and sign-up forms of a self-hosted deployment, in place of the hosted service's user count",
  },
  "auth.plainTextBooksDescription": {
    message:
      "Vaša účtovná kniha je čistý text Beancount v repozitári Git, takže ju môžete kedykoľvek naklonovať, zálohovať alebo presunúť.",
    description:
      "Feature description on a self-hosted deployment: the ledger is plain text in Git the user can take",
  },
  "auth.newPassword": {
    message: "Nové heslo",
    description: "Label for new password field",
  },
  "auth.newPasswordMinLength": {
    message: "Heslo musí mať aspoň 8 znakov",
    description: "Validation error for password length",
  },
  "auth.newPasswordMaxLength": {
    message:
      "Heslo je príliš dlhé. Použite najviac 72 znakov; písmená s diakritikou, nelatinské písma a emoji sa počítajú ako 2 až 4 znaky.",
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
  "auth.passwordMaxLength": {
    message: "Heslo musí mať najviac 128 znakov",
    description: "Validation error when password exceeds the maximum length",
  },
  "auth.passwordRequired": {
    message: "Heslo je povinné",
    description: "Validation error when password is not provided",
  },
  "auth.passwordBreached": {
    message:
      "Toto heslo sa objavilo pri úniku údajov. Zvoľte heslo, ktoré nepoužívate nikde inde.",
    description:
      "Error when the server finds the new password in a known data breach (Have I Been Pwned)",
  },
  "auth.passwordTooSimilar": {
    message: "Heslo sa príliš podobá na váš e-mail alebo používateľské meno.",
    description:
      "Error when the new password is too close to the account's email or username",
  },
  "auth.passwordResetSuccessMessage": {
    message:
      "Vaše heslo bolo resetované a na všetkých zariadeniach a v pripojených aplikáciách ste boli odhlásení. Presmerovávam na prihlásenie...",
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
  "auth.requestNewResetLink": {
    message: "Požiadať o nový odkaz",
    description:
      "Link to request a new password reset after an expired or invalid token",
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
  "auth.scriptRequired": {
    message:
      "Prihlásenie vyžaduje JavaScript. Zapnite ho a znova načítajte stránku.",
    description:
      "Notice shown in place of the submit button when JavaScript is unavailable, explaining why sign-in and registration cannot be completed. Rendered inside <noscript>.",
  },
  "auth.signIn": {
    message: "Prihlásiť",
    description: "Button label for sign in action",
  },
  "auth.signInWith": {
    message: "Prihlásiť sa cez {name}",
    description:
      "Button label to sign in with the identity provider set up by the operator; {name} is its name",
  },
  "auth.oidcErrorEmailInUse": {
    message:
      "Tento e-mail už používa iný účet. Prihláste sa heslom a potom ho prepojte v Nastaveniach.",
    description:
      "Error after provider sign-in when the email already belongs to an account",
  },
  "auth.oidcErrorEmailUnverified": {
    message: "Váš poskytovateľ prihlásenia neoveril váš e-mail.",
    description:
      "Error after provider sign-in when the provider has not verified the email",
  },
  "auth.oidcErrorBlocked": {
    message: "Tento účet je zablokovaný.",
    description: "Error after provider sign-in when the account is blocked",
  },
  "auth.oidcErrorAlreadyLinked": {
    message: "Toto prihlásenie je už prepojené s iným účtom.",
    description:
      "Error when the provider identity is already linked to another account",
  },
  "auth.oidcErrorAccountLinked": {
    message: "Tento účet je už prepojený s iným prihlásením.",
    description:
      "Error when the account is already linked to a different provider identity",
  },
  "auth.oidcErrorNotAllowed": {
    message: "S týmto e-mailom sa tu nedá prihlásiť.",
    description:
      "Error when the operator has not allowed this email to sign in with the provider",
  },
  "auth.oidcErrorFailed": {
    message: "Prihlásenie zlyhalo. Skúste to znova.",
    description: "Generic error when provider sign-in fails",
  },
  "auth.oidcLinked": {
    message: "Váš účet je prepojený. Môžete sa prihlásiť cez {name}.",
    description:
      "Settings text when the account is linked to the provider; {name} is its name",
  },
  "auth.oidcNotLinked": {
    message: "Prepojte svoj účet {name}, aby ste sa ním mohli prihlásiť.",
    description:
      "Settings text when the account is not linked to the provider; {name} is its name",
  },
  "auth.oidcLink": {
    message: "Prepojiť",
    description: "Settings button to link the provider",
  },
  "auth.oidcUnlink": {
    message: "Zrušiť prepojenie",
    description: "Settings button to unlink the provider",
  },
  "auth.oidcUnlinkNeedsPassword": {
    message:
      "Váš účet nemá heslo. Pred zrušením prepojenia si ho nastavte cez „Zabudnuté heslo“.",
    description: "Error when unlinking an account that has no password",
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
  "auth.tokenValidationUnavailable": {
    message: "Odkaz na obnovenie sa nepodarilo overiť",
    description: "Title when the reset-token validation request itself fails",
  },
  "auth.tokenValidationUnavailableDescription": {
    message:
      "Nepodarilo sa nám spojiť so serverom a overiť váš odkaz na obnovenie hesla. Odkaz môže byť stále platný – skúste to znova.",
    description: "Explanation shown when reset-token validation is unavailable",
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
    message: "Používateľské meno môže mať maximálne 20 znakov",
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
    message: "Prihláste sa a pokračujte",
    description: "OAuth consent page login step title",
  },
  "auth.oauthAppWantsAccess": {
    message: "Aplikácia chce získať prístup k vašej knihe Beancount.",
    description: "OAuth consent page login step description",
  },
  "auth.oauthRequesterHeading": {
    message: "Kto žiada o prístup",
    description:
      "OAuth consent: label of the section naming the requesting app",
  },
  "auth.oauthRequesterRedirect": {
    message: "Po schválení sa vrátite na {host}.",
    description:
      "OAuth consent: where the authorization code is sent ({host} is the redirect host)",
  },
  "auth.oauthRequesterName": {
    message:
      "Aplikácia sa nazýva „{name}“. Aplikácie si názov volia samy, preto skontrolujte adresu vyššie.",
    description:
      "OAuth consent: the app's self-asserted name ({name}), labelled as its own claim",
  },
  "auth.oauthRequesterUnnamed": {
    message: "Aplikácia neuviedla názov. Skontrolujte adresu vyššie.",
    description: "OAuth consent: shown when the app gave no name",
  },
  "auth.oauthRequesterVouchedBy": {
    message: "Jej údaje zverejňuje {host}.",
    description:
      "OAuth consent: the domain publishing a CIMD client's metadata ({host})",
  },
  "auth.oauthRequesterLoopbackWarning": {
    message:
      "Táto aplikácia sa vracia iba do vášho vlastného počítača. Túto požiadavku mohol spustiť akýkoľvek program, ktorý na ňom beží — schváľte ju, iba ak ste práve začali pripájať aplikáciu.",
    description:
      "OAuth consent: warning when every redirect is the user's own computer (loopback)",
  },
  "auth.oauthRequesterUnavailable": {
    message:
      "Túto požiadavku sa nepodarilo identifikovať. Možno vypršala — vráťte sa do aplikácie a pripojte sa znova.",
    description:
      "OAuth consent: the requesting app could not be identified; approval is disabled",
  },
  "auth.oauthAllLedgers": {
    message: "Všetky dostupné knihy",
    description: "MCP account-wide consent option",
  },
  "auth.oauthAllLedgersDescription": {
    message:
      "Povoliť požadované akcie v knihách dostupných teraz alebo v budúcnosti a operácie účtu povolené týmito oprávneniami.",
    description: "MCP account-wide consent explanation",
  },
  "auth.oauthChooseLedger": {
    message: "Vyberte knihu",
    description: "OAuth consent page ledger step title",
  },
  "auth.oauthSelectLedger": {
    message: "Vyberte, ku ktorej knihe udeliť prístup.",
    description: "OAuth consent page ledger step description",
  },
  "auth.oauthApproveAccess": {
    message: "Povoliť prístup",
    description: "OAuth consent page approve button",
  },
  "auth.oauthNoLedgersMessage": {
    message: "Nenašli sa žiadne knihy.",
    description: "OAuth consent page empty ledger state message",
  },
  "auth.oauthRegisterToContinue": {
    message: "Vytvorte si účet a pokračujte",
    description: "OAuth consent page register step title",
  },
  "auth.oauthVerifyEmailToContinue": {
    message: "Overte svoj e-mail a pokračujte",
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
  "auth.cliAuthCodeUnknown": {
    message:
      "Tento kód je neznámy alebo jeho platnosť vypršala. Znova spustite `bea login` v termináli a získajte nový kód.",
    description:
      "Error when the entered CLI one-time code is unknown or expired; tells the user to rerun bea login",
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
  "auth.cliAuthCodeEntryTitle": {
    message: "Autorizovať zariadenie",
    description: "Title of the CLI device code entry card",
  },
  "auth.cliAuthCodeEntryDescription": {
    message: "Zadajte jednorazový kód zobrazený vo vašom termináli.",
    description: "Description under the CLI device code entry title",
  },
  "auth.cliAuthCodeLabel": {
    message: "Jednorazový kód",
    description: "Label of the CLI one-time code input",
  },
  "auth.cliAuthCodeContinue": {
    message: "Pokračovať",
    description: "Button to submit the entered CLI one-time code",
  },
  "auth.cliAuthCodeInvalid": {
    message: "Zadajte 8-znakový kód zobrazený vo vašom termináli.",
    description: "Error shown when the entered CLI code is not the right shape",
  },
  "auth.cliAuthRequestedBy": {
    message: "Požiadavka od",
    description: "Heading above the requesting device's reported details",
  },
  "auth.cliAuthClientLabel": {
    message: "Klient",
    description: "Label for the requesting client's name",
  },
  "auth.cliAuthDeviceLabel": {
    message: "Zariadenie",
    description: "Label for the requesting device's machine name",
  },
  "auth.cliAuthPlatformLabel": {
    message: "Systém",
    description: "Label for the requesting device's operating system",
  },
  "auth.cliAuthIpLabel": {
    message: "IP adresa",
    description: "Label for the requesting device's IP address",
  },
  "auth.cliAuthSelfReported": {
    message:
      "Tieto údaje uviedlo samotné zariadenie. Potvrďte len vtedy, ak ide o terminál, ktorý ste práve použili.",
    description:
      "Warning that the requesting device's details are self-reported",
  },
  "auth.cliAuthUseAnotherCode": {
    message: "Použiť iný kód",
    description: "Button to enter a different CLI one-time code",
  },
  "auth.cliAuthPermissionExpiry": {
    message: "Zostať prihlásený na tomto zariadení 30 dní",
    description:
      "CLI permission list item for how long the device stays signed in",
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
  "auth.recoveryTitle": {
    message: "Overte e-mail a prihláste sa",
    description:
      "Title of the email ownership verification step for sign-in recovery",
  },
  "auth.recoveryDescription": {
    message:
      "Otvorte odkaz v e-maile na obnovenie prístupu a zadajte kód z e-mailu a svoje aktuálne heslo.",
    description: "Instructions for continuing from the sign-in recovery email",
  },
  "auth.recoverySendEmail": {
    message: "Odoslať e-mail na obnovenie prístupu",
    description: "Button requesting a sign-in recovery email",
  },
  "auth.recoverySending": {
    message: "Odosiela sa e-mail na obnovenie prístupu...",
    description: "Pending state while requesting a sign-in recovery email",
  },
  "auth.recoverySent": {
    message:
      "Ak k tejto adrese existuje účet, čoskoro dostanete e-mail na obnovenie prístupu. Pokračujte otvorením odkazu v e-maile. Nedávno doručený e-mail na obnovenie prístupu je stále platný.",
    description:
      "Uniform confirmation after requesting recovery; previous valid recovery emails remain usable",
  },
  "auth.recoveryResend": {
    message: "Odoslať ďalší e-mail na obnovenie prístupu",
    description: "Button requesting another sign-in recovery email",
  },
  "auth.recoveryRetryAt": {
    message: "Skúste to znova o {time}.",
    description:
      "Absolute local retry time after throttling; {time} is formatted using the active locale",
  },
  "auth.recoveryCode": {
    message: "Šesťmiestny overovací kód",
    description: "Accessible label for the sign-in recovery email code",
  },
  "auth.recoveryCodeInvalid": {
    message: "Zadajte šesťmiestny kód z e-mailu na obnovenie prístupu.",
    description:
      "Validation error when the recovery code is not exactly six digits",
  },
  "auth.recoveryFailed": {
    message:
      "E-mail, kód alebo heslo je nesprávne, alebo platnosť kódu vypršala. Môžete požiadať o nový e-mail na obnovenie prístupu.",
    description:
      "Uniform invalid-credentials or expired-code error during sign-in recovery",
  },
  "auth.recoveryRequestFailed": {
    message:
      "Nepodarilo sa vyžiadať e-mail na obnovenie prístupu. Skúste to znova.",
    description: "Error when requesting a sign-in recovery email fails",
  },
  "auth.recoveryUnavailable": {
    message: "Prihlásenie je dočasne nedostupné. Skúste to znova.",
    description: "Temporary service outage during sign-in recovery",
  },
  "auth.recoveryExpiry": {
    message:
      "Platnosť kódu vyprší po 10 minútach a umožňuje jeden pokus o zadanie hesla.",
    description:
      "Explains the expiry and single password-attempt limit of a recovery code",
  },
  "auth.recoverySubmit": {
    message: "Overiť a prihlásiť sa",
    description: "Button submitting the recovery code and current password",
  },
  "auth.recoveryVerifying": {
    message: "Overuje sa...",
    description: "Pending state while verifying the recovery code and password",
  },
};

export default skAuth;
