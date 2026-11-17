export interface TranslationEntry {
  message: string;
  description: string;
}

const frAuth: Record<string, TranslationEntry> = {
  "auth.alreadyHaveAccountQuestion": {
    message: "Vous avez déjà un compte ?",
    description: "Prompt asking if user has existing account",
  },
  "auth.and": {
    message: "et",
    description: "Conjunction between terms and privacy links",
  },
  "auth.authenticating": {
    message: "Authentification en cours...",
    description: "Message shown during authentication process",
  },
  "auth.backToSignIn": {
    message: "Retour à la connexion",
    description: "Link text to return to sign in page",
  },
  "auth.backToSignUp": {
    message: "Retour à l'inscription",
    description: "Link text to return to sign up page",
  },
  "auth.confirmNewPassword": {
    message: "Confirmer le nouveau mot de passe",
    description: "Label for confirm password field",
  },
  "auth.confirmPassword": {
    message: "Confirmer le mot de passe",
    description: "Label for password confirmation input field",
  },
  "auth.confirmPasswordRequired": {
    message: "Veuillez confirmer votre mot de passe",
    description: "Validation error when password confirmation is missing",
  },
  "auth.confirmYourNewPassword": {
    message: "Confirmez votre nouveau mot de passe",
    description: "Placeholder for confirm password input",
  },
  "auth.confirmYourPassword": {
    message: "Confirmez votre mot de passe",
    description: "Placeholder for password confirmation",
  },
  "auth.chooseYourPassword": {
    message: "Choisissez un mot de passe (minimum 8 caractères)",
    description:
      "Placeholder for the password a new account chooses, with the minimum length",
  },
  "auth.createAccount": {
    message: "Créer un compte",
    description: "Button to submit registration",
  },
  "auth.createYourAccount": {
    message: "Créez votre compte",
    description: "Registration page title",
  },
  "auth.creatingAccount": {
    message: "Création du compte en cours...",
    description: "Button state while creating account",
  },
  "auth.didNotReceiveOtp": {
    message: "Vous n'avez pas reçu le code ?",
    description: "Prompt asking if user didn't receive OTP",
  },
  "auth.dontHaveAccount": {
    message: "Pas de compte ?",
    description: "Prompt text asking if user doesn't have account",
  },
  "auth.email": {
    message: "E-mail",
    description: "Label for email input field",
  },
  "auth.emailAddress": {
    message: "Adresse e-mail",
    description: "Email address field label",
  },
  "auth.emailInvalid": {
    message: "Veuillez saisir une adresse e-mail valide",
    description: "Validation error when email format is invalid",
  },
  "auth.emailRequired": {
    message: "L'e-mail est requis",
    description: "Validation error when email is not provided",
  },
  "auth.emailSent": {
    message: "E-mail envoyé !",
    description: "Success title after email sent",
  },
  "auth.emailSentDescription": {
    message:
      "Nous avons envoyé un lien de réinitialisation de mot de passe à votre adresse e-mail. Veuillez consulter votre boîte de réception et suivre les instructions pour réinitialiser votre mot de passe.",
    description: "Detailed success message after reset email sent",
  },
  "auth.emailUnavailable": {
    message: "Ce serveur ne peut pas envoyer d'e-mails",
    description:
      "Title on the forgot-password page when the server has no mail provider",
  },
  "auth.emailUnavailableDescription": {
    message:
      "Ce serveur ne peut pas envoyer d'e-mails de réinitialisation de mot de passe. Demandez à la personne qui gère ce serveur Beancount.io (son opérateur) un lien de réinitialisation à usage unique.",
    description:
      "Forgot-password page text when the server cannot send email; tells the user to ask the server operator for a reset link",
  },
  "auth.enterDetailsToGetStarted": {
    message:
      "Saisissez vos informations pour commencer avec votre tableau de bord",
    description: "Registration page description",
  },
  "auth.enterEmailForReset": {
    message:
      "Saisissez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe",
    description: "Instructions on forgot password page",
  },
  "auth.enterFirstName": {
    message: "Saisissez votre prénom",
    description: "Placeholder for first name input",
  },
  "auth.enterLastName": {
    message: "Saisissez votre nom de famille",
    description: "Placeholder for last name input",
  },
  "auth.enterNewPasswordBelow": {
    message: "Saisissez votre nouveau mot de passe ci-dessous",
    description: "Instruction for reset password form",
  },
  "auth.enterOtpCode": {
    message: "Entrez le code",
    description: "Label for OTP input field",
  },
  "auth.enterUsername": {
    message: "Saisissez votre nom d'utilisateur (maximum 20 caractères)",
    description: "Placeholder for username input with character limit",
  },
  "auth.enterYourEmail": {
    message: "Saisissez votre e-mail",
    description: "Placeholder for email input",
  },
  "auth.enterYourNewPassword": {
    message: "Saisissez votre nouveau mot de passe",
    description: "Placeholder for new password input",
  },
  "auth.enterYourPassword": {
    message: "Saisissez votre mot de passe (minimum 6 caractères)",
    description: "Placeholder for password input with requirement",
  },
  "auth.failedToResetPassword": {
    message:
      "Échec de la réinitialisation du mot de passe. Veuillez réessayer.",
    description: "Error message when password reset fails",
  },
  "auth.failedToSendResetEmail": {
    message:
      "Échec de l'envoi de l'e-mail de réinitialisation du mot de passe. Veuillez réessayer.",
    description: "Error when reset email fails to send",
  },
  "auth.firstName": {
    message: "Prénom",
    description: "Label for first name input field",
  },
  "auth.firstNameMaxLength": {
    message: "Le prénom doit contenir au maximum 50 caractères",
    description: "Validation error when first name is too long",
  },
  "auth.forgotPassword": {
    message: "Mot de passe oublié ?",
    description: "Link text for forgot password feature",
  },
  "auth.forgotYourPassword": {
    message: "Mot de passe oublié ?",
    description: "Forgot password page title",
  },
  "auth.lastName": {
    message: "Nom de famille",
    description: "Label for last name input field",
  },
  "auth.lastNameMaxLength": {
    message: "Le nom de famille doit contenir au maximum 50 caractères",
    description: "Validation error when last name is too long",
  },
  "auth.loggingOut": {
    message: "Déconnexion en cours",
    description: "Title shown while logging out",
  },
  "auth.loggingOutMessage": {
    message: "Veuillez patienter pendant que nous vous déconnectons...",
    description: "Message shown while logging out",
  },
  "auth.login": {
    message: "Se connecter / S'inscrire",
    description: "Button label for login or signup",
  },
  "auth.loginFailed": {
    message: "Échec de la connexion",
    description: "Error title when login fails",
  },
  "auth.loginRateLimited": {
    message:
      "Trop de tentatives de connexion. Patientez quelques minutes et réessayez, ou réinitialisez votre mot de passe.",
    description:
      "Shown on any password sign-in form when sign-in is rate limited, by address or by too many wrong passwords for the account",
  },
  "auth.logout": {
    message: "Déconnexion",
    description: "Button label to log out",
  },
  "auth.lovedByUsers": {
    message: "Apprécié par les utilisateurs",
    description: "Loved by users feature title",
  },
  "auth.lovedByUsersDescription": {
    message:
      "Rejoignez des milliers d'utilisateurs satisfaits qui font confiance à Beancount pour leurs besoins comptables",
    description: "Loved by users feature description",
  },
  "auth.newPassword": {
    message: "Nouveau mot de passe",
    description: "Label for new password field",
  },
  "auth.newPasswordMinLength": {
    message: "Le mot de passe doit contenir au moins 8 caractères",
    description: "Validation error for password length",
  },
  "auth.newPasswordMaxLength": {
    message:
      "Le mot de passe est trop long. Utilisez au maximum 72 caractères ; les lettres accentuées, les alphabets non latins et les emojis comptent chacun pour 2 à 4.",
    description:
      "Validation error when new password exceeds the maximum length",
  },
  "auth.newPasswordRequired": {
    message: "Le mot de passe est requis",
    description: "Validation error for missing new password",
  },
  "auth.otpInvalidLength": {
    message: "Le code OTP doit contenir 4 chiffres",
    description: "Validation error when OTP length is invalid",
  },
  "auth.otpRequired": {
    message: "Le code OTP est requis",
    description: "Validation error when OTP is missing",
  },
  "auth.otpSentToYourEmail": {
    message: "Nous avons envoyé un code à 4 chiffres à votre adresse e-mail",
    description: "Message showing OTP was sent to email",
  },
  "auth.otpVerificationError": {
    message: "Une erreur s'est produite lors de la vérification OTP",
    description: "Generic error message for OTP verification",
  },
  "auth.otpVerificationFailed": {
    message: "La vérification OTP a échoué",
    description: "Error message when OTP verification fails",
  },
  "auth.password": {
    message: "Mot de passe",
    description: "Label for password input field",
  },
  "auth.passwordMinLength": {
    message: "Le mot de passe doit contenir au moins 6 caractères",
    description: "Validation error when password is too short",
  },
  "auth.passwordMaxLength": {
    message: "Le mot de passe doit contenir au maximum 128 caractères",
    description: "Validation error when password exceeds the maximum length",
  },
  "auth.passwordRequired": {
    message: "Le mot de passe est requis",
    description: "Validation error when password is not provided",
  },
  "auth.passwordBreached": {
    message:
      "Ce mot de passe est apparu dans une fuite de données. Choisissez-en un que vous n'utilisez nulle part ailleurs.",
    description:
      "Error when the server finds the new password in a known data breach (Have I Been Pwned)",
  },
  "auth.passwordTooSimilar": {
    message:
      "Le mot de passe ressemble trop à votre adresse e-mail ou à votre nom d'utilisateur.",
    description:
      "Error when the new password is too close to the account's email or username",
  },
  "auth.passwordResetSuccessMessage": {
    message:
      "Votre mot de passe a été réinitialisé, et vos sessions ont été fermées sur tous vos appareils et applications connectées. Redirection vers la connexion...",
    description: "Success message description",
  },
  "auth.passwordResetSuccessful": {
    message: "Réinitialisation du mot de passe réussie !",
    description: "Success message title",
  },
  "auth.passwordsDoNotMatch": {
    message: "Les mots de passe ne correspondent pas",
    description: "Validation error when passwords don't match",
  },
  "auth.privacyPolicy": {
    message: "Politique de Confidentialité",
    description: "Link text for privacy policy",
  },
  "auth.realTimeInsights": {
    message: "Insights en temps réel",
    description: "Real-time insights feature title",
  },
  "auth.realTimeInsightsDescription": {
    message:
      "Obtenez une visibilité instantanée sur votre situation financière et vos tendances",
    description: "Real-time insights feature description",
  },
  "auth.redirectingToLogin": {
    message: "Redirection vers la page de connexion...",
    description: "Message shown after successful logout",
  },
  "auth.registrationFailed": {
    message: "Échec de l'inscription",
    description: "Error when registration fails",
  },
  "auth.resetPasswordButton": {
    message: "Réinitialiser le mot de passe",
    description: "Button text to reset password",
  },
  "auth.resetYourPassword": {
    message: "Réinitialisez votre mot de passe",
    description: "Title for reset password page",
  },
  "auth.resettingPassword": {
    message: "Réinitialisation du mot de passe en cours...",
    description: "Button text while resetting password",
  },
  "auth.secureAccess": {
    message: "Accès sécurisé",
    description: "Secure access feature title",
  },
  "auth.secureAccessDescription": {
    message:
      "Vos données financières sont protégées par une sécurité de niveau entreprise",
    description: "Secure access feature description",
  },
  "auth.sendResetLink": {
    message: "Envoyer le lien de réinitialisation",
    description: "Button to send password reset link",
  },
  "auth.sending": {
    message: "Envoi en cours...",
    description: "Button state while sending email",
  },
  "auth.sessionExpired": {
    message: "Session Expirée",
    description: "Title when signup session is expired",
  },
  "auth.sessionExpiredDescription": {
    message: "La session d'inscription a expiré ou est invalide",
    description: "Description when session is expired",
  },
  "auth.sessionExpiredMessage": {
    message:
      "Cette session d'inscription a expiré. Veuillez recommencer le processus d'inscription.",
    description: "Alert message for expired session",
  },
  "auth.scriptRequired": {
    message:
      "La connexion nécessite JavaScript. Veuillez l'activer puis recharger la page.",
    description:
      "Notice shown in place of the submit button when JavaScript is unavailable, explaining why sign-in and registration cannot be completed. Rendered inside <noscript>.",
  },
  "auth.signIn": {
    message: "Se connecter",
    description: "Button label for sign in action",
  },
  "auth.signInWith": {
    message: "Se connecter avec {name}",
    description:
      "Button label to sign in with the identity provider set up by the operator; {name} is its name",
  },
  "auth.oidcErrorEmailInUse": {
    message:
      "Un compte utilise déjà cet e-mail. Connectez-vous avec votre mot de passe, puis liez-le dans les Paramètres.",
    description:
      "Error after provider sign-in when the email already belongs to an account",
  },
  "auth.oidcErrorEmailUnverified": {
    message: "Votre fournisseur de connexion n'a pas vérifié votre e-mail.",
    description:
      "Error after provider sign-in when the provider has not verified the email",
  },
  "auth.oidcErrorBlocked": {
    message: "Ce compte est bloqué.",
    description: "Error after provider sign-in when the account is blocked",
  },
  "auth.oidcErrorAlreadyLinked": {
    message: "Cette connexion est déjà liée à un autre compte.",
    description:
      "Error when the provider identity is already linked to another account",
  },
  "auth.oidcErrorAccountLinked": {
    message: "Ce compte est déjà associé à une autre connexion.",
    description:
      "Error when the account is already linked to a different provider identity",
  },
  "auth.oidcErrorFailed": {
    message: "La connexion a échoué. Veuillez réessayer.",
    description: "Generic error when provider sign-in fails",
  },
  "auth.oidcLinked": {
    message: "Votre compte est lié. Vous pouvez vous connecter avec {name}.",
    description:
      "Settings text when the account is linked to the provider; {name} is its name",
  },
  "auth.oidcNotLinked": {
    message: "Liez votre compte {name} pour vous connecter avec.",
    description:
      "Settings text when the account is not linked to the provider; {name} is its name",
  },
  "auth.oidcLink": {
    message: "Lier",
    description: "Settings button to link the provider",
  },
  "auth.oidcUnlink": {
    message: "Dissocier",
    description: "Settings button to unlink the provider",
  },
  "auth.oidcUnlinkNeedsPassword": {
    message:
      "Votre compte n'a pas de mot de passe. Définissez-en un via « Mot de passe oublié » avant de dissocier.",
    description: "Error when unlinking an account that has no password",
  },
  "auth.signInToAccount": {
    message: "Connectez-vous à votre compte Beancount",
    description: "Login page subtitle",
  },
  "auth.signUp": {
    message: "S'inscrire",
    description: "Button label for sign up action",
  },
  "auth.termsAgreementPrefix": {
    message:
      'En cliquant sur "Créer un compte", j\'accepte les conditions de beancount.io',
    description: "Prefix text before terms and privacy links on sign up form",
  },
  "auth.termsOfUse": {
    message: "Conditions d'Utilisation",
    description: "Link text for terms of use",
  },
  "auth.tokenExpired": {
    message: "Jeton expiré",
    description: "Title when reset token is expired",
  },
  "auth.tokenExpiredDescription": {
    message:
      "Le jeton de réinitialisation du mot de passe est expiré ou invalide",
    description: "Description when token is expired",
  },
  "auth.tokenValidationUnavailable": {
    message: "Impossible de vérifier votre lien de réinitialisation",
    description: "Title when the reset-token validation request itself fails",
  },
  "auth.tokenValidationUnavailableDescription": {
    message:
      "Nous n'avons pas pu joindre le serveur pour vérifier votre lien de réinitialisation de mot de passe. Il est peut-être encore valide : veuillez réessayer.",
    description: "Explanation shown when reset-token validation is unavailable",
  },
  "auth.tokenExpiredMessage": {
    message:
      "Ce jeton de réinitialisation du mot de passe est expiré. Veuillez en demander un nouveau.",
    description: "Alert message for expired token",
  },
  "auth.username": {
    message: "Nom d'utilisateur",
    description: "Username field label",
  },
  "auth.usernameLowercaseAlphanumeric": {
    message:
      "Le nom d'utilisateur ne peut contenir que des lettres minuscules, des chiffres et des traits de soulignement",
    description:
      "Validation error when username contains invalid characters (must be lowercase)",
  },
  "auth.usernameMaxLength": {
    message: "Le nom d'utilisateur doit contenir au maximum 20 caractères",
    description: "Validation error when username too long",
  },
  "auth.usernamePublicHint": {
    message: "Ce nom d'utilisateur est public et visible par les autres",
    description: "Hint text explaining that username is publicly visible",
  },
  "auth.usernameRequired": {
    message: "Le nom d'utilisateur est requis",
    description: "Validation error when username is missing",
  },
  "auth.verifyEmail": {
    message: "Vérifier l'e-mail",
    description: "Button text to verify email with OTP",
  },
  "auth.verifyYourEmail": {
    message: "Vérifiez votre e-mail",
    description: "OTP verification page title",
  },
  "auth.verifying": {
    message: "Vérification...",
    description: "Button text while verifying OTP",
  },
  "auth.welcomeBack": {
    message: "Bon retour",
    description: "Login page welcome title",
  },
  "auth.oauthSignInToContinue": {
    message: "Connectez-vous pour continuer",
    description: "OAuth consent page login step title",
  },
  "auth.oauthAppWantsAccess": {
    message: "Une application souhaite accéder à votre grand livre Beancount.",
    description: "OAuth consent page login step description",
  },
  "auth.oauthRequesterHeading": {
    message: "Qui fait la demande",
    description:
      "OAuth consent: label of the section naming the requesting app",
  },
  "auth.oauthRequesterRedirect": {
    message: "Après votre approbation, vous serez renvoyé vers {host}.",
    description:
      "OAuth consent: where the authorization code is sent ({host} is the redirect host)",
  },
  "auth.oauthRequesterName": {
    message:
      "L’application se présente comme « {name} ». Les applications choisissent leur propre nom : vérifiez l’adresse ci-dessus.",
    description:
      "OAuth consent: the app's self-asserted name ({name}), labelled as its own claim",
  },
  "auth.oauthRequesterUnnamed": {
    message:
      "L’application n’a pas indiqué de nom. Vérifiez l’adresse ci-dessus.",
    description: "OAuth consent: shown when the app gave no name",
  },
  "auth.oauthRequesterVouchedBy": {
    message: "Ses informations sont publiées par {host}.",
    description:
      "OAuth consent: the domain publishing a CIMD client's metadata ({host})",
  },
  "auth.oauthRequesterLoopbackWarning": {
    message:
      "Cette application ne renvoie que vers votre propre ordinateur. N’importe quel programme qui y tourne a pu lancer cette demande : n’approuvez que si vous venez de connecter une application.",
    description:
      "OAuth consent: warning when every redirect is the user's own computer (loopback)",
  },
  "auth.oauthRequesterUnavailable": {
    message:
      "Impossible d’identifier cette demande. Elle a peut-être expiré : revenez à votre application et reconnectez-vous.",
    description:
      "OAuth consent: the requesting app could not be identified; approval is disabled",
  },
  "auth.oauthAllLedgers": {
    message: "Tous les livres accessibles",
    description: "MCP account-wide consent option",
  },
  "auth.oauthAllLedgersDescription": {
    message:
      "Autorise les actions demandées sur les livres accessibles maintenant ou plus tard, ainsi que les opérations du compte permises par ces autorisations.",
    description: "MCP account-wide consent explanation",
  },
  "auth.oauthChooseLedger": {
    message: "Choisissez un grand livre",
    description: "OAuth consent page ledger step title",
  },
  "auth.oauthSelectLedger": {
    message: "Choisissez le grand livre auquel donner accès.",
    description: "OAuth consent page ledger step description",
  },
  "auth.oauthApproveAccess": {
    message: "Autoriser l'accès",
    description: "OAuth consent page approve button",
  },
  "auth.oauthNoLedgersMessage": {
    message: "Aucun livre trouvé.",
    description: "OAuth consent page empty ledger state message",
  },
  "auth.oauthRegisterToContinue": {
    message: "Créez un compte pour continuer",
    description: "OAuth consent page register step title",
  },
  "auth.oauthVerifyEmailToContinue": {
    message: "Vérifiez votre e-mail pour continuer",
    description: "OAuth consent page OTP step title",
  },
  "auth.loginSessionExpiredMessage": {
    message: "Votre session a expiré. Veuillez vous reconnecter.",
    description:
      "Banner shown on the login page when redirected here because the previous session's token expired or was revoked",
  },
  "auth.cliAuthTitle": {
    message: "Autoriser l'accès de la CLI",
    description: "Title of the CLI device authorization card",
  },
  "auth.cliAuthDescription": {
    message: "La CLI Beancount demande l'accès à votre compte.",
    description: "Description under the CLI authorization title",
  },
  "auth.cliAuthPermissionsIntro": {
    message: "Cela permettra à la CLI de :",
    description: "Intro line above the list of CLI permissions",
  },
  "auth.cliAuthPermissionLedgers": {
    message: "Lire et modifier vos grands livres",
    description: "CLI permission list item for reading and writing ledgers",
  },
  "auth.cliAuthPermissionAccount": {
    message: "Accéder aux informations de votre compte",
    description: "CLI permission list item for accessing account information",
  },
  "auth.cliAuthAuthorize": {
    message: "Autoriser",
    description: "Button to authorize the CLI session",
  },
  "auth.cliAuthAuthorizing": {
    message: "Autorisation en cours...",
    description: "Button text while the CLI session is being authorized",
  },
  "auth.cliAuthDeny": {
    message: "Refuser",
    description: "Button to deny the CLI session",
  },
  "auth.cliAuthDenying": {
    message: "Refus en cours...",
    description: "Button text while the CLI session is being denied",
  },
  "auth.cliAuthSessionExpired": {
    message: "Session expirée ou introuvable.",
    description: "Error shown when the CLI auth session is expired or missing",
  },
  "auth.cliAuthCodeUnknown": {
    message:
      "Ce code est inconnu ou a expiré. Relancez `bea login` dans votre terminal pour obtenir un nouveau code.",
    description:
      "Error when the entered CLI one-time code is unknown or expired; tells the user to rerun bea login",
  },
  "auth.cliAuthSuccessTitle": {
    message: "Autorisation réussie",
    description: "Title shown after the CLI session was authorized",
  },
  "auth.cliAuthSuccessDescription": {
    message: "Vous pouvez fermer cet onglet et revenir à la CLI.",
    description: "Hint shown after successful CLI authorization",
  },
  "auth.cliAuthDeniedTitle": {
    message: "Accès refusé",
    description: "Title shown after the CLI session was denied",
  },
  "auth.cliAuthDeniedDescription": {
    message: "Vous pouvez fermer cet onglet.",
    description: "Hint shown after the CLI session was denied",
  },
  "auth.cliAuthCodeEntryTitle": {
    message: "Autoriser un appareil",
    description: "Title of the CLI device code entry card",
  },
  "auth.cliAuthCodeEntryDescription": {
    message: "Saisissez le code à usage unique affiché dans votre terminal.",
    description: "Description under the CLI device code entry title",
  },
  "auth.cliAuthCodeLabel": {
    message: "Code à usage unique",
    description: "Label of the CLI one-time code input",
  },
  "auth.cliAuthCodeContinue": {
    message: "Continuer",
    description: "Button to submit the entered CLI one-time code",
  },
  "auth.cliAuthCodeInvalid": {
    message: "Saisissez le code de 8 caractères affiché dans votre terminal.",
    description: "Error shown when the entered CLI code is not the right shape",
  },
  "auth.cliAuthRequestedBy": {
    message: "Demandé par",
    description: "Heading above the requesting device's reported details",
  },
  "auth.cliAuthClientLabel": {
    message: "Client",
    description: "Label for the requesting client's name",
  },
  "auth.cliAuthDeviceLabel": {
    message: "Appareil",
    description: "Label for the requesting device's machine name",
  },
  "auth.cliAuthPlatformLabel": {
    message: "Système",
    description: "Label for the requesting device's operating system",
  },
  "auth.cliAuthIpLabel": {
    message: "Adresse IP",
    description: "Label for the requesting device's IP address",
  },
  "auth.cliAuthSelfReported": {
    message:
      "Informations déclarées par l'appareil lui-même. N'autorisez que s'il s'agit du terminal que vous venez d'utiliser.",
    description:
      "Warning that the requesting device's details are self-reported",
  },
  "auth.cliAuthUseAnotherCode": {
    message: "Utiliser un autre code",
    description: "Button to enter a different CLI one-time code",
  },
  "auth.cliAuthPermissionExpiry": {
    message: "Rester connecté sur cet appareil pendant 30 jours",
    description:
      "CLI permission list item for how long the device stays signed in",
  },
  "auth.oauthIdentityWantsAccess": {
    message:
      "Une application souhaite que vous vous connectiez avec votre compte Beancount.",
    description: "Identity OAuth consent page login step description",
  },
  "auth.oauthIdentityApproveTitle": {
    message: "Continuer pour se connecter",
    description: "Identity OAuth consent page approve step title",
  },
  "auth.oauthIdentityApproveDescription": {
    message:
      "Cela partagera votre nom, votre e-mail et votre nom d'utilisateur avec l'application.",
    description: "Identity OAuth consent page approve step description",
  },
  "auth.oauthIdentitySignedInAs": {
    message: "Connecté en tant que {email}",
    description:
      "Identity OAuth consent page approve step — shows which account is authorizing",
  },
  "auth.hidePassword": {
    message: "Masquer le mot de passe",
    description: "Accessible label for hiding a password",
  },
  "auth.showPassword": {
    message: "Afficher le mot de passe",
    description: "Accessible label for showing a password",
  },
  "auth.oauthLedgerRequired": {
    message: "Veuillez sélectionner un grand livre.",
    description: "Validation shown when OAuth consent has no selected ledger",
  },
  "auth.oauthMobileSignInTitle": {
    message: "Se connecter à Beancount",
    description:
      "Mobile OAuth login step title — first-party app, so it names the product rather than asking for access",
  },
  "auth.oauthMobileRegisterTitle": {
    message: "Créez votre compte Beancount",
    description: "Mobile OAuth register step title",
  },
  "auth.oauthMobileChooseAccountTitle": {
    message: "Quel compte l'application doit-elle utiliser ?",
    description:
      "Mobile OAuth step shown when the browser is signed in but the app's Sign Up button started the flow",
  },
  "auth.oauthMobileContinueAs": {
    message: "Continuer en tant que {email}",
    description:
      "Mobile OAuth button that keeps the signed-in browser account; {email} is the account",
  },
  "auth.oauthMobileCreateDifferentAccount": {
    message: "Créer un autre compte",
    description:
      "Mobile OAuth button that signs the browser out and opens registration",
  },
  "auth.oauthMobileAllowTitle": {
    message: "Autoriser Beancount Mobile ?",
    description: "Mobile OAuth approval title",
  },
  "auth.oauthMobileGrantDescription": {
    message: "Cette subvention à l'échelle du compte permet à l'application :",
    description: "Introduction to mobile OAuth permissions",
  },
  "auth.oauthSwitchAccountFailed": {
    message: "Impossible de changer de compte. Veuillez réessayer.",
    description: "Error shown when OAuth account switching fails",
  },
  "auth.oauthUseAnotherAccount": {
    message: "Utiliser un autre compte",
    description: "Button for switching OAuth accounts",
  },
  "auth.oauthMobileScopeIdentity": {
    message: "Identifiez le compte que vous approuvez",
    description: "Description of the OpenID mobile permission",
  },
  "auth.oauthMobileScopeOfflineAccess": {
    message:
      "Restez connecté en toute sécurité jusqu'à ce que vous révoquiez l'accès",
    description: "Description of the offline access mobile permission",
  },
  "auth.oauthMobileScopeRead": {
    message: "Lisez vos grands livres",
    description: "Description of the ledger read mobile permission",
  },
  "auth.oauthMobileScopeWrite": {
    message: "Créer et mettre à jour les données du grand livre",
    description: "Description of the ledger write mobile permission",
  },
  "auth.oauthMobileScopeAdmin": {
    message: "Gérer les grands livres et les collaborateurs",
    description: "Description of the ledger admin mobile permission",
  },
  "auth.recoveryTitle": {
    message: "Vérifiez votre adresse e-mail pour vous connecter",
    description:
      "Title of the email ownership verification step for sign-in recovery",
  },
  "auth.recoveryDescription": {
    message:
      "Ouvrez le lien de votre e-mail de récupération, puis saisissez le code qu’il contient et votre mot de passe actuel.",
    description: "Instructions for continuing from the sign-in recovery email",
  },
  "auth.recoverySendEmail": {
    message: "Envoyer un e-mail de récupération",
    description: "Button requesting a sign-in recovery email",
  },
  "auth.recoverySending": {
    message: "Envoi de l’e-mail de récupération...",
    description: "Pending state while requesting a sign-in recovery email",
  },
  "auth.recoverySent": {
    message:
      "Si cette adresse est associée à un compte, vous recevrez bientôt un e-mail de récupération. Ouvrez son lien pour continuer. Un e-mail de récupération récent reste valable.",
    description:
      "Uniform confirmation after requesting recovery; previous valid recovery emails remain usable",
  },
  "auth.recoveryResend": {
    message: "Envoyer un autre e-mail de récupération",
    description: "Button requesting another sign-in recovery email",
  },
  "auth.recoveryRetryAt": {
    message: "Réessayez à {time}.",
    description:
      "Absolute local retry time after throttling; {time} is formatted using the active locale",
  },
  "auth.recoveryCode": {
    message: "Code de vérification à six chiffres",
    description: "Accessible label for the sign-in recovery email code",
  },
  "auth.recoveryCodeInvalid": {
    message:
      "Saisissez le code à six chiffres de votre e-mail de récupération.",
    description:
      "Validation error when the recovery code is not exactly six digits",
  },
  "auth.recoveryFailed": {
    message:
      "L’adresse e-mail, le code ou le mot de passe est incorrect, ou le code a expiré. Vous pouvez demander un nouvel e-mail de récupération.",
    description:
      "Uniform invalid-credentials or expired-code error during sign-in recovery",
  },
  "auth.recoveryRequestFailed": {
    message:
      "Impossible de demander un e-mail de récupération. Veuillez réessayer.",
    description: "Error when requesting a sign-in recovery email fails",
  },
  "auth.recoveryUnavailable": {
    message:
      "La connexion est temporairement indisponible. Veuillez réessayer.",
    description: "Temporary service outage during sign-in recovery",
  },
  "auth.recoveryExpiry": {
    message:
      "Le code expire au bout de 10 minutes et permet une seule tentative de mot de passe.",
    description:
      "Explains the expiry and single password-attempt limit of a recovery code",
  },
  "auth.recoverySubmit": {
    message: "Vérifier et se connecter",
    description: "Button submitting the recovery code and current password",
  },
  "auth.recoveryVerifying": {
    message: "Vérification...",
    description: "Pending state while verifying the recovery code and password",
  },
};

export default frAuth;
