export interface TranslationEntry {
  message: string;
  description: string;
}

const caAuth: Record<string, TranslationEntry> = {
  "auth.alreadyHaveAccountQuestion": {
    message: "Ja tens un compte?",
    description: "Prompt asking if user has existing account",
  },
  "auth.and": {
    message: "i",
    description: "Conjunction between terms and privacy links",
  },
  "auth.authenticating": {
    message: "Autenticant...",
    description: "Message shown during authentication process",
  },
  "auth.backToSignIn": {
    message: "Tornar a iniciar sessió",
    description: "Link text to return to sign in page",
  },
  "auth.backToSignUp": {
    message: "Tornar a Registre",
    description: "Link text to return to sign up page",
  },
  "auth.confirmNewPassword": {
    message: "Confirmar la contrasenya nova",
    description: "Label for confirm password field",
  },
  "auth.confirmPassword": {
    message: "Confirmar contrasenya",
    description: "Label for password confirmation input field",
  },
  "auth.confirmPasswordRequired": {
    message: "Si us plau, confirmeu la contrasenya",
    description: "Validation error when password confirmation is missing",
  },
  "auth.confirmYourNewPassword": {
    message: "Confirmeu la vostra contrasenya nova",
    description: "Placeholder for confirm password input",
  },
  "auth.confirmYourPassword": {
    message: "Confirmeu la vostra contrasenya",
    description: "Placeholder for password confirmation",
  },
  "auth.createAccount": {
    message: "Crear compte",
    description: "Button to submit registration",
  },
  "auth.createYourAccount": {
    message: "Crea el teu compte",
    description: "Registration page title",
  },
  "auth.creatingAccount": {
    message: "Creant compte...",
    description: "Button state while creating account",
  },
  "auth.didNotReceiveOtp": {
    message: "No has rebut el codi?",
    description: "Prompt asking if user didn't receive OTP",
  },
  "auth.dontHaveAccount": {
    message: "No tens un compte?",
    description: "Prompt text asking if user doesn't have account",
  },
  "auth.email": {
    message: "Correu electrònic",
    description: "Label for email input field",
  },
  "auth.emailAddress": {
    message: "Adreça de correu electrònic",
    description: "Email address field label",
  },
  "auth.emailInvalid": {
    message: "Si us plau, introduïu una adreça de correu electrònic vàlida",
    description: "Validation error when email format is invalid",
  },
  "auth.emailRequired": {
    message: "El correu electrònic és obligatori",
    description: "Validation error when email is not provided",
  },
  "auth.emailSent": {
    message: "Correu enviat!",
    description: "Success title after email sent",
  },
  "auth.emailSentDescription": {
    message:
      "Hem enviat un enllaç per restablir la contrasenya a la vostra adreça de correu. Si us plau, comproveu la safata d'entrada i seguiu les instruccions per restablir la contrasenya.",
    description: "Detailed success message after reset email sent",
  },
  "auth.enterDetailsToGetStarted": {
    message: "Introduïu les vostres dades per començar amb el tauler",
    description: "Registration page description",
  },
  "auth.enterEmailForReset": {
    message:
      "Introduïu la vostra adreça de correu electrònic i us enviarem un enllaç per restablir la contrasenya",
    description: "Instructions on forgot password page",
  },
  "auth.enterFirstName": {
    message: "Introduïu el vostre nom",
    description: "Placeholder for first name input",
  },
  "auth.enterLastName": {
    message: "Introduïu els vostres cognoms",
    description: "Placeholder for last name input",
  },
  "auth.enterNewPasswordBelow": {
    message: "Introduïu la vostra contrasenya nova a continuació",
    description: "Instruction for reset password form",
  },
  "auth.enterOtpCode": {
    message: "Introdueix el codi",
    description: "Label for OTP input field",
  },
  "auth.enterUsername": {
    message: "Introduïu el vostre nom d'usuari (màxim 16 caràcters)",
    description: "Placeholder for username input with character limit",
  },
  "auth.enterYourEmail": {
    message: "Introduïu el vostre correu electrònic",
    description: "Placeholder for email input",
  },
  "auth.enterYourNewPassword": {
    message: "Introduïu la vostra contrasenya nova",
    description: "Placeholder for new password input",
  },
  "auth.enterYourPassword": {
    message: "Introduïu la vostra contrasenya (mínim 6 caràcters)",
    description: "Placeholder for password input with requirement",
  },
  "auth.failedToResetPassword": {
    message:
      "Error en restablir la contrasenya. Si us plau, torneu-ho a intentar.",
    description: "Error message when password reset fails",
  },
  "auth.failedToSendResetEmail": {
    message:
      "Error en enviar el correu de restabliment de contrasenya. Si us plau, torneu-ho a intentar.",
    description: "Error when reset email fails to send",
  },
  "auth.firstName": {
    message: "Nom",
    description: "Label for first name input field",
  },
  "auth.firstNameMaxLength": {
    message: "El nom ha de tenir com a màxim 50 caràcters",
    description: "Validation error when first name is too long",
  },
  "auth.forgotPassword": {
    message: "Heu oblidat la contrasenya?",
    description: "Link text for forgot password feature",
  },
  "auth.forgotYourPassword": {
    message: "Heu oblidat la contrasenya?",
    description: "Forgot password page title",
  },
  "auth.lastName": {
    message: "Cognoms",
    description: "Label for last name input field",
  },
  "auth.lastNameMaxLength": {
    message: "Els cognoms han de tenir com a màxim 50 caràcters",
    description: "Validation error when last name is too long",
  },
  "auth.loggingOut": {
    message: "Tancant sessió",
    description: "Title shown while logging out",
  },
  "auth.loggingOutMessage": {
    message: "Si us plau, espereu mentre tanquem la vostra sessió...",
    description: "Message shown while logging out",
  },
  "auth.login": {
    message: "Iniciar sessió / Registrar-se",
    description: "Button label for login or signup",
  },
  "auth.loginFailed": {
    message: "L'inici de sessió ha fallat",
    description: "Error title when login fails",
  },
  "auth.logout": {
    message: "Tancar sessió",
    description: "Button label to log out",
  },
  "auth.lovedByUsers": {
    message: "Estimat pels usuaris",
    description: "Loved by users feature title",
  },
  "auth.lovedByUsersDescription": {
    message:
      "Uneix-te a milers d'usuaris satisfets que confien en Beancount per a les seves necessitats comptables",
    description: "Loved by users feature description",
  },
  "auth.newPassword": {
    message: "Contrasenya nova",
    description: "Label for new password field",
  },
  "auth.newPasswordMinLength": {
    message: "La contrasenya ha de tenir almenys 6 caràcters",
    description: "Validation error for password length",
  },
  "auth.newPasswordMaxLength": {
    message: "La contrasenya ha de tenir com a màxim 128 caràcters",
    description:
      "Validation error when new password exceeds the maximum length",
  },
  "auth.newPasswordRequired": {
    message: "La contrasenya és obligatòria",
    description: "Validation error for missing new password",
  },
  "auth.otpInvalidLength": {
    message: "El codi OTP ha de tenir 4 dígits",
    description: "Validation error when OTP length is invalid",
  },
  "auth.otpRequired": {
    message: "El codi OTP és obligatori",
    description: "Validation error when OTP is missing",
  },
  "auth.otpSentToYourEmail": {
    message:
      "Hem enviat un codi de 4 dígits a la teva adreça de correu electrònic",
    description: "Message showing OTP was sent to email",
  },
  "auth.otpVerificationError": {
    message: "S'ha produït un error durant la verificació OTP",
    description: "Generic error message for OTP verification",
  },
  "auth.otpVerificationFailed": {
    message: "La verificació OTP ha fallat",
    description: "Error message when OTP verification fails",
  },
  "auth.password": {
    message: "Contrasenya",
    description: "Label for password input field",
  },
  "auth.passwordMinLength": {
    message: "La contrasenya ha de tenir almenys 6 caràcters",
    description: "Validation error when password is too short",
  },
  "auth.passwordMaxLength": {
    message: "La contrasenya ha de tenir com a màxim 128 caràcters",
    description: "Validation error when password exceeds the maximum length",
  },
  "auth.passwordRequired": {
    message: "La contrasenya és obligatòria",
    description: "Validation error when password is not provided",
  },
  "auth.passwordResetSuccessMessage": {
    message:
      "La vostra contrasenya s'ha restablert. Redirigint a l'inici de sessió...",
    description: "Success message description",
  },
  "auth.passwordResetSuccessful": {
    message: "Contrasenya restablerta correctament!",
    description: "Success message title",
  },
  "auth.passwordsDoNotMatch": {
    message: "Les contrasenyes no coincideixen",
    description: "Validation error when passwords don't match",
  },
  "auth.privacyPolicy": {
    message: "Política de Privacitat",
    description: "Link text for privacy policy",
  },
  "auth.realTimeInsights": {
    message: "Informació en temps real",
    description: "Real-time insights feature title",
  },
  "auth.realTimeInsightsDescription": {
    message:
      "Obtén visibilitat instantània de la teva posició financera i tendències",
    description: "Real-time insights feature description",
  },
  "auth.redirectingToLogin": {
    message: "Redirigint a la pàgina d'inici de sessió...",
    description: "Message shown after successful logout",
  },
  "auth.registrationFailed": {
    message: "El registre ha fallat",
    description: "Error when registration fails",
  },
  "auth.resetPasswordButton": {
    message: "Restablir contrasenya",
    description: "Button text to reset password",
  },
  "auth.resetYourPassword": {
    message: "Restableix la teva contrasenya",
    description: "Title for reset password page",
  },
  "auth.resettingPassword": {
    message: "Restablint contrasenya...",
    description: "Button text while resetting password",
  },
  "auth.secureAccess": {
    message: "Accés segur",
    description: "Secure access feature title",
  },
  "auth.secureAccessDescription": {
    message:
      "Les teves dades financeres estan protegides amb seguretat de nivell empresarial",
    description: "Secure access feature description",
  },
  "auth.sendResetLink": {
    message: "Enviar enllaç de restabliment",
    description: "Button to send password reset link",
  },
  "auth.sending": {
    message: "Enviant...",
    description: "Button state while sending email",
  },
  "auth.sessionExpired": {
    message: "Sessió Caducada",
    description: "Title when signup session is expired",
  },
  "auth.sessionExpiredDescription": {
    message: "La sessió de registre ha caducat o és invàlida",
    description: "Description when session is expired",
  },
  "auth.sessionExpiredMessage": {
    message:
      "Aquesta sessió de registre ha caducat. Si us plau, inicia el procés de registre de nou.",
    description: "Alert message for expired session",
  },
  "auth.signIn": {
    message: "Iniciar sessió",
    description: "Button label for sign in action",
  },
  "auth.signInToAccount": {
    message: "Inicia sessió al teu compte de Beancount",
    description: "Login page subtitle",
  },
  "auth.signUp": {
    message: "Registrar-se",
    description: "Button label for sign up action",
  },
  "auth.termsAgreementPrefix": {
    message: 'En fer clic a "Crear compte", accepto de beancount.io',
    description: "Prefix text before terms and privacy links on sign up form",
  },
  "auth.termsOfUse": {
    message: "Termes d'Ús",
    description: "Link text for terms of use",
  },
  "auth.tokenExpired": {
    message: "El token ha caducat",
    description: "Title when reset token is expired",
  },
  "auth.tokenExpiredDescription": {
    message: "El token de restabliment de contrasenya ha caducat o és invàlid",
    description: "Description when token is expired",
  },
  "auth.tokenExpiredMessage": {
    message:
      "Aquest token de restabliment de contrasenya ha caducat. Si us plau, sol·liciteu-ne un de nou.",
    description: "Alert message for expired token",
  },
  "auth.username": {
    message: "Nom d'usuari",
    description: "Username field label",
  },
  "auth.usernameLowercaseAlphanumeric": {
    message:
      "El nom d'usuari només pot contenir lletres minúscules, números i guions baixos",
    description:
      "Validation error when username contains invalid characters (must be lowercase)",
  },
  "auth.usernameMaxLength": {
    message: "El nom d'usuari ha de tenir com a màxim 16 caràcters",
    description: "Validation error when username too long",
  },
  "auth.usernamePublicHint": {
    message: "Aquest nom d'usuari és públic i visible per a altres",
    description: "Hint text explaining that username is publicly visible",
  },
  "auth.usernameRequired": {
    message: "El nom d'usuari és obligatori",
    description: "Validation error when username is missing",
  },
  "auth.verifyEmail": {
    message: "Verificar Correu Electrònic",
    description: "Button text to verify email with OTP",
  },
  "auth.verifyYourEmail": {
    message: "Verifica el teu correu electrònic",
    description: "OTP verification page title",
  },
  "auth.verifying": {
    message: "Verificant...",
    description: "Button text while verifying OTP",
  },
  "auth.welcomeBack": {
    message: "Benvingut de nou",
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
    message: "La teva sessió ha caducat. Si us plau, torna a iniciar sessió.",
    description:
      "Banner shown on the login page when redirected here because the previous session's token expired or was revoked",
  },
  "auth.cliAuthTitle": {
    message: "Autoritza l'accés de la CLI",
    description: "Title of the CLI device authorization card",
  },
  "auth.cliAuthDescription": {
    message: "La CLI de Beancount sol·licita accés al teu compte.",
    description: "Description under the CLI authorization title",
  },
  "auth.cliAuthPermissionsIntro": {
    message: "Això permetrà a la CLI:",
    description: "Intro line above the list of CLI permissions",
  },
  "auth.cliAuthPermissionLedgers": {
    message: "Llegir i escriure els teus llibres",
    description: "CLI permission list item for reading and writing ledgers",
  },
  "auth.cliAuthPermissionAccount": {
    message: "Accedir a la informació del teu compte",
    description: "CLI permission list item for accessing account information",
  },
  "auth.cliAuthAuthorize": {
    message: "Autoritza",
    description: "Button to authorize the CLI session",
  },
  "auth.cliAuthAuthorizing": {
    message: "S'està autoritzant...",
    description: "Button text while the CLI session is being authorized",
  },
  "auth.cliAuthDeny": {
    message: "Denega",
    description: "Button to deny the CLI session",
  },
  "auth.cliAuthDenying": {
    message: "S'està denegant...",
    description: "Button text while the CLI session is being denied",
  },
  "auth.cliAuthSessionExpired": {
    message: "La sessió ha caducat o no s'ha trobat.",
    description: "Error shown when the CLI auth session is expired or missing",
  },
  "auth.cliAuthSuccessTitle": {
    message: "Autorització correcta",
    description: "Title shown after the CLI session was authorized",
  },
  "auth.cliAuthSuccessDescription": {
    message: "Pots tancar aquesta pestanya i tornar a la CLI.",
    description: "Hint shown after successful CLI authorization",
  },
  "auth.cliAuthDeniedTitle": {
    message: "Accés denegat",
    description: "Title shown after the CLI session was denied",
  },
  "auth.cliAuthDeniedDescription": {
    message: "Pots tancar aquesta pestanya.",
    description: "Hint shown after the CLI session was denied",
  },
  "auth.cliAuthCodeEntryTitle": {
    message: "Autoritza un dispositiu",
    description: "Title of the CLI device code entry card",
  },
  "auth.cliAuthCodeEntryDescription": {
    message: "Introdueix el codi d'un sol ús que es mostra al teu terminal.",
    description: "Description under the CLI device code entry title",
  },
  "auth.cliAuthCodeLabel": {
    message: "Codi d'un sol ús",
    description: "Label of the CLI one-time code input",
  },
  "auth.cliAuthCodeContinue": {
    message: "Continua",
    description: "Button to submit the entered CLI one-time code",
  },
  "auth.cliAuthCodeInvalid": {
    message: "Introdueix el codi de 8 caràcters que es mostra al teu terminal.",
    description: "Error shown when the entered CLI code is not the right shape",
  },
  "auth.cliAuthRequestedBy": {
    message: "Sol·licitat per",
    description: "Heading above the requesting device's reported details",
  },
  "auth.cliAuthClientLabel": {
    message: "Client",
    description: "Label for the requesting client's name",
  },
  "auth.cliAuthDeviceLabel": {
    message: "Dispositiu",
    description: "Label for the requesting device's machine name",
  },
  "auth.cliAuthPlatformLabel": {
    message: "Sistema",
    description: "Label for the requesting device's operating system",
  },
  "auth.cliAuthIpLabel": {
    message: "Adreça IP",
    description: "Label for the requesting device's IP address",
  },
  "auth.cliAuthSelfReported": {
    message:
      "Dades facilitades pel mateix dispositiu. Autoritza-ho només si és el terminal que acabes d'utilitzar.",
    description:
      "Warning that the requesting device's details are self-reported",
  },
  "auth.cliAuthUseAnotherCode": {
    message: "Fes servir un altre codi",
    description: "Button to enter a different CLI one-time code",
  },
  "auth.cliAuthPermissionExpiry": {
    message: "Mantenir la sessió iniciada en aquest dispositiu durant 30 dies",
    description:
      "CLI permission list item for how long the device stays signed in",
  },
  "auth.oauthIdentityWantsAccess": {
    message:
      "Una aplicació vol que iniciïs sessió amb el teu compte de Beancount.",
    description: "Identity OAuth consent page login step description",
  },
  "auth.oauthIdentityApproveTitle": {
    message: "Continua per iniciar sessió",
    description: "Identity OAuth consent page approve step title",
  },
  "auth.oauthIdentityApproveDescription": {
    message:
      "Això compartirà el teu nom, correu electrònic i nom d'usuari amb l'aplicació.",
    description: "Identity OAuth consent page approve step description",
  },
  "auth.oauthIdentitySignedInAs": {
    message: "Sessió iniciada com a {email}",
    description:
      "Identity OAuth consent page approve step — shows which account is authorizing",
  },
  "auth.hidePassword": {
    message: "Amaga la contrasenya",
    description: "Accessible label for hiding a password",
  },
  "auth.showPassword": {
    message: "Mostra la contrasenya",
    description: "Accessible label for showing a password",
  },
  "auth.oauthLedgerRequired": {
    message: "Seleccioneu un llibre major.",
    description: "Validation shown when OAuth consent has no selected ledger",
  },
  "auth.oauthMobileSignInTitle": {
    message: "Inicia la sessió a Beancount",
    description:
      "Mobile OAuth login step title — first-party app, so it names the product rather than asking for access",
  },
  "auth.oauthMobileRegisterTitle": {
    message: "Crea el teu compte de Beancount",
    description: "Mobile OAuth register step title",
  },
  "auth.oauthMobileChooseAccountTitle": {
    message: "Quin compte ha d'utilitzar l'aplicació?",
    description:
      "Mobile OAuth step shown when the browser is signed in but the app's Sign Up button started the flow",
  },
  "auth.oauthMobileContinueAs": {
    message: "Continua com a {email}",
    description:
      "Mobile OAuth button that keeps the signed-in browser account; {email} is the account",
  },
  "auth.oauthMobileCreateDifferentAccount": {
    message: "Crea un compte diferent",
    description:
      "Mobile OAuth button that signs the browser out and opens registration",
  },
  "auth.oauthMobileAllowTitle": {
    message: "Vols permetre Beancount Mobile?",
    description: "Mobile OAuth approval title",
  },
  "auth.oauthMobileGrantDescription": {
    message: "Aquesta subvenció per a tot el compte permet a l'aplicació:",
    description: "Introduction to mobile OAuth permissions",
  },
  "auth.oauthSwitchAccountFailed": {
    message: "No s'ha pogut canviar de compte. Si us plau, torna-ho a provar.",
    description: "Error shown when OAuth account switching fails",
  },
  "auth.oauthUseAnotherAccount": {
    message: "Utilitzeu un altre compte",
    description: "Button for switching OAuth accounts",
  },
  "auth.oauthMobileScopeIdentity": {
    message: "Identifiqueu el compte que aproveu",
    description: "Description of the OpenID mobile permission",
  },
  "auth.oauthMobileScopeOfflineAccess": {
    message:
      "Manteniu la sessió iniciada de manera segura fins que revoqueu l'accés",
    description: "Description of the offline access mobile permission",
  },
  "auth.oauthMobileScopeRead": {
    message: "Llegeix els teus llibres",
    description: "Description of the ledger read mobile permission",
  },
  "auth.oauthMobileScopeWrite": {
    message: "Crear i actualitzar les dades del llibre major",
    description: "Description of the ledger write mobile permission",
  },
  "auth.oauthMobileScopeAdmin": {
    message: "Gestionar llibres i col·laboradors",
    description: "Description of the ledger admin mobile permission",
  },
};

export default caAuth;
