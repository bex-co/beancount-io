export interface TranslationEntry {
  message: string;
  description: string;
}

const ukAuth: Record<string, TranslationEntry> = {
  "auth.alreadyHaveAccountQuestion": {
    message: "Вже маєте обліковий запис?",
    description: "Prompt asking if user has existing account",
  },
  "auth.and": {
    message: "та",
    description: "Conjunction between terms and privacy links",
  },
  "auth.authenticating": {
    message: "Автентифікація...",
    description: "Message shown during authentication process",
  },
  "auth.backToSignIn": {
    message: "Назад to Sign in",
    description: "Link text to return to sign in page",
  },
  "auth.backToSignUp": {
    message: "Повернутися до реєстрації",
    description: "Link text to return to sign up page",
  },
  "auth.confirmNewPassword": {
    message: "Підтвердіть новий пароль",
    description: "Label for confirm password field",
  },
  "auth.confirmPassword": {
    message: "Підтвердіть пароль",
    description: "Label for password confirmation input field",
  },
  "auth.confirmPasswordRequired": {
    message: "Будь ласка, підтвердіть свій пароль",
    description: "Validation error when password confirmation is missing",
  },
  "auth.confirmYourNewPassword": {
    message: "Підтвердіть ваш новий пароль",
    description: "Placeholder for confirm password input",
  },
  "auth.confirmYourPassword": {
    message: "Підтвердіть ваш пароль",
    description: "Placeholder for password confirmation",
  },
  "auth.createAccount": {
    message: "Створити обліковий запис",
    description: "Button to submit registration",
  },
  "auth.createYourAccount": {
    message: "Створіть свій обліковий запис",
    description: "Registration page title",
  },
  "auth.creatingAccount": {
    message: "Створення облікового запису...",
    description: "Button state while creating account",
  },
  "auth.didNotReceiveOtp": {
    message: "Не отримали код?",
    description: "Prompt asking if user didn't receive OTP",
  },
  "auth.dontHaveAccount": {
    message: "Немає облікового запису?",
    description: "Prompt text asking if user doesn't have account",
  },
  "auth.email": {
    message: "Електронна пошта",
    description: "Label for email input field",
  },
  "auth.emailAddress": {
    message: "Електронна пошта address",
    description: "Email address field label",
  },
  "auth.emailInvalid": {
    message: "Будь ласка, введіть дійсну адресу електронної пошти",
    description: "Validation error when email format is invalid",
  },
  "auth.emailRequired": {
    message: "Електронна пошта is required",
    description: "Validation error when email is not provided",
  },
  "auth.emailSent": {
    message: "Електронна пошта sent!",
    description: "Success title after email sent",
  },
  "auth.emailSentDescription": {
    message:
      "Ми надіслали посилання для скидання пароля на вашу електронну адресу. Перевірте свою поштову скриньку та дотримуйтесь інструкцій для скидання пароля.",
    description: "Detailed success message after reset email sent",
  },
  "auth.enterDetailsToGetStarted": {
    message: "Введіть свої дані, щоб почати роботу з панеллю",
    description: "Registration page description",
  },
  "auth.enterEmailForReset": {
    message:
      "Введіть свою електронну пошту address and we'll send you a link to reset your password",
    description: "Instructions on forgot password page",
  },
  "auth.enterFirstName": {
    message: "Введіть своє ім'я",
    description: "Placeholder for first name input",
  },
  "auth.enterLastName": {
    message: "Введіть своє прізвище",
    description: "Placeholder for last name input",
  },
  "auth.enterNewPasswordBelow": {
    message: "Введіть новий пароль below",
    description: "Instruction for reset password form",
  },
  "auth.enterOtpCode": {
    message: "Введіть код",
    description: "Label for OTP input field",
  },
  "auth.enterUsername": {
    message: "Введіть ім'я користувача (максимум 16 символів)",
    description: "Placeholder for username input with character limit",
  },
  "auth.enterYourEmail": {
    message: "Введіть свою електронну пошту",
    description: "Placeholder for email input",
  },
  "auth.enterYourNewPassword": {
    message: "Введіть новий пароль",
    description: "Placeholder for new password input",
  },
  "auth.enterYourPassword": {
    message: "Введіть пароль (мінімум 6 символів)",
    description: "Placeholder for password input with requirement",
  },
  "auth.failedToResetPassword": {
    message: "Не вдалося скинути пароль. Спробуйте ще раз.",
    description: "Error message when password reset fails",
  },
  "auth.failedToSendResetEmail": {
    message: "Не вдалося надіслати лист для скидання пароля. Спробуйте ще раз.",
    description: "Error when reset email fails to send",
  },
  "auth.firstName": {
    message: "Ім'я",
    description: "Label for first name input field",
  },
  "auth.firstNameMaxLength": {
    message: "Ім'я має містити не більше 50 символів",
    description: "Validation error when first name is too long",
  },
  "auth.forgotPassword": {
    message: "Забули пароль?",
    description: "Link text for forgot password feature",
  },
  "auth.forgotYourPassword": {
    message: "Забули свій пароль?",
    description: "Forgot password page title",
  },
  "auth.lastName": {
    message: "Прізвище",
    description: "Label for last name input field",
  },
  "auth.lastNameMaxLength": {
    message: "Прізвище має містити не більше 50 символів",
    description: "Validation error when last name is too long",
  },
  "auth.loggingOut": {
    message: "Пogging Out",
    description: "Title shown while logging out",
  },
  "auth.loggingOutMessage": {
    message:
      "Будь ласка, зачекайте, поки ми виходимо з вашого облікового запису...",
    description: "Message shown while logging out",
  },
  "auth.login": {
    message: "Увійти / Реєстрація",
    description: "Button label for login or signup",
  },
  "auth.loginFailed": {
    message: "Пogin failed",
    description: "Error title when login fails",
  },
  "auth.logout": {
    message: "Вихід",
    description: "Button label to log out",
  },
  "auth.lovedByUsers": {
    message: "Улюблений користувачами",
    description: "Loved by users feature title",
  },
  "auth.lovedByUsersDescription": {
    message:
      "Приєднуйтесь до тисяч задоволених користувачів, які довіряють Beancount для своїх облікових потреб",
    description: "Loved by users feature description",
  },
  "auth.newPassword": {
    message: "Новий пароль",
    description: "Label for new password field",
  },
  "auth.newPasswordMinLength": {
    message: "Пароль must be at least 6 characters",
    description: "Validation error for password length",
  },
  "auth.newPasswordMaxLength": {
    message: "Пароль must be at most 128 characters",
    description:
      "Validation error when new password exceeds the maximum length",
  },
  "auth.newPasswordRequired": {
    message: "Пароль is required",
    description: "Validation error for missing new password",
  },
  "auth.otpInvalidLength": {
    message: "Код OTP повинен містити 4 цифри",
    description: "Validation error when OTP length is invalid",
  },
  "auth.otpRequired": {
    message: "Потрібен код OTP",
    description: "Validation error when OTP is missing",
  },
  "auth.otpSentToYourEmail": {
    message: "Ми надіслали 4-значний код на вашу електронну адресу",
    description: "Message showing OTP was sent to email",
  },
  "auth.otpVerificationError": {
    message: "Сталася помилка під час перевірки OTP",
    description: "Generic error message for OTP verification",
  },
  "auth.otpVerificationFailed": {
    message: "Перевірка OTP не вдалася",
    description: "Error message when OTP verification fails",
  },
  "auth.password": {
    message: "Пароль",
    description: "Label for password input field",
  },
  "auth.passwordMinLength": {
    message: "Пароль must be at least 6 characters",
    description: "Validation error when password is too short",
  },
  "auth.passwordMaxLength": {
    message: "Пароль must be at most 128 characters",
    description: "Validation error when password exceeds the maximum length",
  },
  "auth.passwordRequired": {
    message: "Пароль is required",
    description: "Validation error when password is not provided",
  },
  "auth.passwordResetSuccessMessage": {
    message: "Ваш пароль скинуто. Перенаправлення на сторінку входу...",
    description: "Success message description",
  },
  "auth.passwordResetSuccessful": {
    message: "Пароль reset successful!",
    description: "Success message title",
  },
  "auth.passwordsDoNotMatch": {
    message: "Парольs do not match",
    description: "Validation error when passwords don't match",
  },
  "auth.privacyPolicy": {
    message: "Політика конфіденційності",
    description: "Link text for privacy policy",
  },
  "auth.realTimeInsights": {
    message: "Аналітика в реальному часі",
    description: "Real-time insights feature title",
  },
  "auth.realTimeInsightsDescription": {
    message: "Отримайте миттєвий огляд вашого фінансового стану та тенденцій",
    description: "Real-time insights feature description",
  },
  "auth.redirectingToLogin": {
    message: "Перенаправлення на сторінку входу...",
    description: "Message shown after successful logout",
  },
  "auth.registrationFailed": {
    message: "Реєстрація не вдалася",
    description: "Error when registration fails",
  },
  "auth.resetPasswordButton": {
    message: "Скинути пароль",
    description: "Button text to reset password",
  },
  "auth.resetYourPassword": {
    message: "Скиньте свій пароль",
    description: "Title for reset password page",
  },
  "auth.resettingPassword": {
    message: "Скидання пароля...",
    description: "Button text while resetting password",
  },
  "auth.secureAccess": {
    message: "Безпечний доступ",
    description: "Secure access feature title",
  },
  "auth.secureAccessDescription": {
    message: "Ваші фінансові дані захищені безпекою корпоративного рівня",
    description: "Secure access feature description",
  },
  "auth.sendResetLink": {
    message: "Надіслати посилання для скидання",
    description: "Button to send password reset link",
  },
  "auth.sending": {
    message: "Надсилання...",
    description: "Button state while sending email",
  },
  "auth.sessionExpired": {
    message: "Сесія закінчилася",
    description: "Title when signup session is expired",
  },
  "auth.sessionExpiredDescription": {
    message: "Сесія реєстрації закінчилася або недійсна",
    description: "Description when session is expired",
  },
  "auth.sessionExpiredMessage": {
    message:
      "Ця сесія реєстрації закінчилася. Будь ласка, почніть процес реєстрації знову.",
    description: "Alert message for expired session",
  },
  "auth.signIn": {
    message: "Увійти",
    description: "Button label for sign in action",
  },
  "auth.signInToAccount": {
    message: "Увійдіть у свій обліковий запис Beancount",
    description: "Login page subtitle",
  },
  "auth.signUp": {
    message: "Реєстрація",
    description: "Button label for sign up action",
  },
  "auth.termsAgreementPrefix": {
    message:
      'Натискаючи "Створити обліковий запис", я погоджуюсь з умовами beancount.io',
    description: "Prefix text before terms and privacy links on sign up form",
  },
  "auth.termsOfUse": {
    message: "Умови використання",
    description: "Link text for terms of use",
  },
  "auth.tokenExpired": {
    message: "Комуken Expired",
    description: "Title when reset token is expired",
  },
  "auth.tokenExpiredDescription": {
    message: "Токен скидання пароля прострочений або недійсний",
    description: "Description when token is expired",
  },
  "auth.tokenExpiredMessage": {
    message:
      "Цей токен скидання пароля прострочений. Будь ласка, запросіть новий.",
    description: "Alert message for expired token",
  },
  "auth.username": {
    message: "Користувачname",
    description: "Username field label",
  },
  "auth.usernameLowercaseAlphanumeric": {
    message:
      "Ім'я користувача може містити лише малі літери, цифри та підкреслення",
    description:
      "Validation error when username contains invalid characters (must be lowercase)",
  },
  "auth.usernameMaxLength": {
    message: "Користувачname must be at most 16 characters",
    description: "Validation error when username too long",
  },
  "auth.usernamePublicHint": {
    message: "Це ім'я користувача є публічним і видимим для інших",
    description: "Hint text explaining that username is publicly visible",
  },
  "auth.usernameRequired": {
    message: "Користувачname is required",
    description: "Validation error when username is missing",
  },
  "auth.verifyEmail": {
    message: "Підтвердити електронну пошту",
    description: "Button text to verify email with OTP",
  },
  "auth.verifyYourEmail": {
    message: "Підтвердіть вашу електронну пошту",
    description: "OTP verification page title",
  },
  "auth.verifying": {
    message: "Перевірка...",
    description: "Button text while verifying OTP",
  },
  "auth.welcomeBack": {
    message: "Ласкаво просимо назад",
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
    message: "Термін дії вашої сесії закінчився. Будь ласка, увійдіть знову.",
    description:
      "Banner shown on the login page when redirected here because the previous session's token expired or was revoked",
  },
  "auth.cliAuthTitle": {
    message: "Дозволити доступ CLI",
    description: "Title of the CLI device authorization card",
  },
  "auth.cliAuthDescription": {
    message: "Beancount CLI запитує доступ до вашого облікового запису.",
    description: "Description under the CLI authorization title",
  },
  "auth.cliAuthPermissionsIntro": {
    message: "Це дозволить CLI:",
    description: "Intro line above the list of CLI permissions",
  },
  "auth.cliAuthPermissionLedgers": {
    message: "Читати та записувати ваші книги",
    description: "CLI permission list item for reading and writing ledgers",
  },
  "auth.cliAuthPermissionAccount": {
    message: "Отримувати доступ до даних вашого облікового запису",
    description: "CLI permission list item for accessing account information",
  },
  "auth.cliAuthAuthorize": {
    message: "Дозволити",
    description: "Button to authorize the CLI session",
  },
  "auth.cliAuthAuthorizing": {
    message: "Надання дозволу...",
    description: "Button text while the CLI session is being authorized",
  },
  "auth.cliAuthDeny": {
    message: "Відхилити",
    description: "Button to deny the CLI session",
  },
  "auth.cliAuthDenying": {
    message: "Відхилення...",
    description: "Button text while the CLI session is being denied",
  },
  "auth.cliAuthSessionExpired": {
    message: "Сеанс завершився або не знайдений.",
    description: "Error shown when the CLI auth session is expired or missing",
  },
  "auth.cliAuthSuccessTitle": {
    message: "Авторизація успішна",
    description: "Title shown after the CLI session was authorized",
  },
  "auth.cliAuthSuccessDescription": {
    message: "Можете закрити цю вкладку та повернутися до CLI.",
    description: "Hint shown after successful CLI authorization",
  },
  "auth.cliAuthDeniedTitle": {
    message: "Доступ відхилено",
    description: "Title shown after the CLI session was denied",
  },
  "auth.cliAuthDeniedDescription": {
    message: "Можете закрити цю вкладку.",
    description: "Hint shown after the CLI session was denied",
  },
};

export default ukAuth;
