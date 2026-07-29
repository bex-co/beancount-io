export interface TranslationEntry {
  message: string;
  description: string;
}

const ruAuth: Record<string, TranslationEntry> = {
  "auth.alreadyHaveAccount": {
    message: "Уже есть аккаунт? Войти",
    description: "Prompt text asking if user already has account",
  },
  "auth.alreadyHaveAccountQuestion": {
    message: "Уже есть учётная запись?",
    description: "Prompt asking if user has existing account",
  },
  "auth.and": {
    message: "и",
    description: "Conjunction between terms and privacy links",
  },
  "auth.authenticating": {
    message: "Аутентификация...",
    description: "Message shown during authentication process",
  },
  "auth.authenticationError": {
    message: "Ошибка аутентификации",
    description: "Title for authentication error dialog",
  },
  "auth.authenticationErrorOccurred": {
    message: "Произошла ошибка при аутентификации",
    description: "Generic authentication error message",
  },
  "auth.authenticationFailed": {
    message: "Ошибка входа",
    description: "Error message when authentication fails",
  },
  "auth.backToSignIn": {
    message: "Назад к входу",
    description: "Link text to return to sign in page",
  },
  "auth.backToSignUp": {
    message: "Вернуться к Регистрации",
    description: "Link text to return to sign up page",
  },
  "auth.confirmNewPassword": {
    message: "Подтвердите новый пароль",
    description: "Label for confirm password field",
  },
  "auth.confirmPassword": {
    message: "Подтвердить пароль",
    description: "Label for password confirmation input field",
  },
  "auth.confirmPasswordRequired": {
    message: "Пожалуйста, подтвердите пароль",
    description: "Validation error when password confirmation is missing",
  },
  "auth.confirmYourNewPassword": {
    message: "Подтвердите новый пароль",
    description: "Placeholder for confirm password input",
  },
  "auth.confirmYourPassword": {
    message: "Подтвердите пароль",
    description: "Placeholder for password confirmation",
  },
  "auth.createAccount": {
    message: "Создать учётную запись",
    description: "Button to submit registration",
  },
  "auth.createYourAccount": {
    message: "Создание учётной записи",
    description: "Registration page title",
  },
  "auth.creatingAccount": {
    message: "Создание учётной записи...",
    description: "Button state while creating account",
  },
  "auth.didNotReceiveOtp": {
    message: "Не получили код?",
    description: "Prompt asking if user didn't receive OTP",
  },
  "auth.dontHaveAccount": {
    message: "Нет аккаунта?",
    description: "Prompt text asking if user doesn't have account",
  },
  "auth.email": {
    message: "Эл. почта",
    description: "Label for email input field",
  },
  "auth.emailAddress": {
    message: "Адрес электронной почты",
    description: "Email address field label",
  },
  "auth.emailInvalid": {
    message: "Введите корректный адрес электронной почты",
    description: "Validation error when email format is invalid",
  },
  "auth.emailRequired": {
    message: "Электронная почта обязательна",
    description: "Validation error when email is not provided",
  },
  "auth.emailSent": {
    message: "Письмо отправлено!",
    description: "Success title after email sent",
  },
  "auth.emailSentDescription": {
    message:
      "Мы отправили ссылку для сброса пароля на ваш адрес электронной почты. Пожалуйста, проверьте входящие письма и следуйте инструкциям для сброса пароля.",
    description: "Detailed success message after reset email sent",
  },
  "auth.enterCredentials": {
    message: "Введите учётные данные для доступа к панели управления",
    description: "Login page description",
  },
  "auth.enterDetailsToGetStarted": {
    message: "Введите данные для начала работы с панелью управления",
    description: "Registration page description",
  },
  "auth.enterEmailForReset": {
    message:
      "Введите адрес электронной почты, и мы отправим вам ссылку для сброса пароля",
    description: "Instructions on forgot password page",
  },
  "auth.enterFirstName": {
    message: "Введите имя",
    description: "Placeholder for first name input",
  },
  "auth.enterLastName": {
    message: "Введите фамилию",
    description: "Placeholder for last name input",
  },
  "auth.enterNewPasswordBelow": {
    message: "Введите новый пароль ниже",
    description: "Instruction for reset password form",
  },
  "auth.enterOtpCode": {
    message: "Введите код",
    description: "Label for OTP input field",
  },
  "auth.enterUsername": {
    message: "Введите имя пользователя (макс. 16 символов)",
    description: "Placeholder for username input with character limit",
  },
  "auth.enterYourEmail": {
    message: "Введите адрес электронной почты",
    description: "Placeholder for email input",
  },
  "auth.enterYourNewPassword": {
    message: "Введите новый пароль",
    description: "Placeholder for new password input",
  },
  "auth.enterYourPassword": {
    message: "Введите пароль (мин. 6 символов)",
    description: "Placeholder for password input with requirement",
  },
  "auth.failedToResetPassword": {
    message: "Не удалось сбросить пароль. Пожалуйста, попробуйте снова.",
    description: "Error message when password reset fails",
  },
  "auth.failedToSendResetEmail": {
    message:
      "Не удалось отправить письмо для сброса пароля. Пожалуйста, попробуйте снова.",
    description: "Error when reset email fails to send",
  },
  "auth.firstName": {
    message: "Имя",
    description: "Label for first name input field",
  },
  "auth.firstNameMaxLength": {
    message: "Имя должно содержать не более 50 символов",
    description: "Validation error when first name is too long",
  },
  "auth.forgotPassword": {
    message: "Забыли пароль?",
    description: "Link text for forgot password feature",
  },
  "auth.forgotYourPassword": {
    message: "Забыли пароль?",
    description: "Forgot password page title",
  },
  "auth.lastName": {
    message: "Фамилия",
    description: "Label for last name input field",
  },
  "auth.lastNameMaxLength": {
    message: "Фамилия должна содержать не более 50 символов",
    description: "Validation error when last name is too long",
  },
  "auth.loggingOut": {
    message: "Выход из системы",
    description: "Title shown while logging out",
  },
  "auth.loggingOutMessage": {
    message: "Пожалуйста, подождите, пока мы выполняем выход...",
    description: "Message shown while logging out",
  },
  "auth.login": {
    message: "Войти / Регистрация",
    description: "Button label for login or signup",
  },
  "auth.loginError": {
    message: "Произошла ошибка при входе",
    description: "Generic login error message",
  },
  "auth.loginFailed": {
    message: "Ошибка входа",
    description: "Error title when login fails",
  },
  "auth.logout": {
    message: "Выход",
    description: "Button label to log out",
  },
  "auth.logoutAlertCancel": {
    message: "Отмена",
    description: "Cancel button in logout confirmation dialog",
  },
  "auth.logoutAlertConfirm": {
    message: "Выйти",
    description: "Confirm button in logout confirmation dialog",
  },
  "auth.logoutAlertMsg": {
    message: "Вы уверены, что хотите выйти?",
    description: "Confirmation message asking user if they want to log out",
  },
  "auth.lovedByUsers": {
    message: "Любим пользователями",
    description: "Loved by users feature title",
  },
  "auth.lovedByUsersDescription": {
    message:
      "Присоединяйтесь к тысячам довольных пользователей, которые доверяют Beancount для своих бухгалтерских потребностей",
    description: "Loved by users feature description",
  },
  "auth.newPassword": {
    message: "Новый пароль",
    description: "Label for new password field",
  },
  "auth.newPasswordMinLength": {
    message: "Пароль должен содержать не менее 6 символов",
    description: "Validation error for password length",
  },
  "auth.newPasswordMaxLength": {
    message: "Пароль должен содержать не более 128 символов",
    description:
      "Validation error when new password exceeds the maximum length",
  },
  "auth.newPasswordRequired": {
    message: "Пароль обязателен",
    description: "Validation error for missing new password",
  },
  "auth.otpInvalidLength": {
    message: "Код OTP должен содержать 4 цифры",
    description: "Validation error when OTP length is invalid",
  },
  "auth.otpRequired": {
    message: "Требуется код OTP",
    description: "Validation error when OTP is missing",
  },
  "auth.otpSentToYourEmail": {
    message: "Мы отправили 4-значный код на ваш адрес электронной почты",
    description: "Message showing OTP was sent to email",
  },
  "auth.otpVerificationError": {
    message: "Произошла ошибка при проверке OTP",
    description: "Generic error message for OTP verification",
  },
  "auth.otpVerificationFailed": {
    message: "Проверка OTP не удалась",
    description: "Error message when OTP verification fails",
  },
  "auth.password": {
    message: "Пароль",
    description: "Label for password input field",
  },
  "auth.passwordMinLength": {
    message: "Пароль должен содержать не менее 6 символов",
    description: "Validation error when password is too short",
  },
  "auth.passwordMaxLength": {
    message: "Пароль должен содержать не более 128 символов",
    description: "Validation error when password exceeds the maximum length",
  },
  "auth.passwordRequired": {
    message: "Пароль обязателен",
    description: "Validation error when password is not provided",
  },
  "auth.passwordResetSuccessMessage": {
    message: "Ваш пароль сброшен. Перенаправление на страницу входа...",
    description: "Success message description",
  },
  "auth.passwordResetSuccessful": {
    message: "Пароль успешно сброшен!",
    description: "Success message title",
  },
  "auth.passwordsDoNotMatch": {
    message: "Пароли не совпадают",
    description: "Validation error when passwords don't match",
  },
  "auth.privacyPolicy": {
    message: "Политика конфиденциальности",
    description: "Link text for privacy policy",
  },
  "auth.realTimeInsights": {
    message: "Аналитика в реальном времени",
    description: "Real-time insights feature title",
  },
  "auth.realTimeInsightsDescription": {
    message:
      "Получите мгновенное представление о вашем финансовом положении и тенденциях",
    description: "Real-time insights feature description",
  },
  "auth.redirectingToLogin": {
    message: "Перенаправление на страницу входа...",
    description: "Message shown after successful logout",
  },
  "auth.registrationError": {
    message: "Произошла ошибка при регистрации",
    description: "Generic registration error",
  },
  "auth.registrationFailed": {
    message: "Ошибка регистрации",
    description: "Error when registration fails",
  },
  "auth.resetEmailError": {
    message: "Произошла ошибка при отправке письма для сброса пароля",
    description: "Generic error for reset email sending",
  },
  "auth.resetPassword": {
    message: "Сброс пароля",
    description: "Page title or button for password reset",
  },
  "auth.resetPasswordButton": {
    message: "Сбросить пароль",
    description: "Button text to reset password",
  },
  "auth.resetPasswordDescription": {
    message:
      "Введите адрес электронной почты, чтобы получить ссылку для сброса пароля.",
    description: "Instructions for password reset process",
  },
  "auth.resetPasswordEmailSent": {
    message:
      "Письмо отправлено на ваш адрес электронной почты. Пожалуйста, проверьте почту, чтобы сбросить пароль.",
    description: "Success message after password reset email is sent",
  },
  "auth.resetPasswordError": {
    message: "Произошла ошибка при сбросе пароля",
    description: "Generic error message for password reset",
  },
  "auth.resetYourPassword": {
    message: "Сброс пароля",
    description: "Title for reset password page",
  },
  "auth.resettingPassword": {
    message: "Сброс пароля...",
    description: "Button text while resetting password",
  },
  "auth.secureAccess": {
    message: "Безопасный доступ",
    description: "Secure access feature title",
  },
  "auth.secureAccessDescription": {
    message:
      "Ваши финансовые данные защищены безопасностью корпоративного уровня",
    description: "Secure access feature description",
  },
  "auth.sendResetLink": {
    message: "Отправить ссылку для сброса",
    description: "Button to send password reset link",
  },
  "auth.sendResetPasswordEmail": {
    message: "Отправить письмо для сброса пароля",
    description: "Button label to send password reset email",
  },
  "auth.sending": {
    message: "Отправка...",
    description: "Button state while sending email",
  },
  "auth.sessionExpired": {
    message: "Сессия Истекла",
    description: "Title when signup session is expired",
  },
  "auth.sessionExpiredDescription": {
    message: "Сессия регистрации истекла или недействительна",
    description: "Description when session is expired",
  },
  "auth.sessionExpiredMessage": {
    message:
      "Эта сессия регистрации истекла. Пожалуйста, начните процесс регистрации заново.",
    description: "Alert message for expired session",
  },
  "auth.signIn": {
    message: "Войти",
    description: "Button label for sign in action",
  },
  "auth.signInToAccount": {
    message: "Войдите в свой аккаунт Beancount",
    description: "Login page subtitle",
  },
  "auth.signUp": {
    message: "Регистрация",
    description: "Button label for sign up action",
  },
  "auth.termsAgreementPrefix": {
    message: 'Нажимая "Создать аккаунт", я соглашаюсь с условиями beancount.io',
    description: "Prefix text before terms and privacy links on sign up form",
  },
  "auth.termsOfUse": {
    message: "Условия использования",
    description: "Link text for terms of use",
  },
  "auth.tokenExpired": {
    message: "Срок действия токена истёк",
    description: "Title when reset token is expired",
  },
  "auth.tokenExpiredDescription": {
    message:
      "Срок действия токена сброса пароля истёк или токен недействителен",
    description: "Description when token is expired",
  },
  "auth.tokenExpiredMessage": {
    message:
      "Срок действия этого токена сброса пароля истёк. Пожалуйста, запросите новый.",
    description: "Alert message for expired token",
  },
  "auth.username": {
    message: "Имя пользователя",
    description: "Username field label",
  },
  "auth.usernameAlphanumeric": {
    message: "Имя пользователя может содержать только буквы и цифры",
    description: "Validation error when username contains invalid characters",
  },
  "auth.usernameLowercaseAlphanumeric": {
    message:
      "Имя пользователя может содержать только строчные буквы, цифры и подчеркивания",
    description:
      "Validation error when username contains invalid characters (must be lowercase)",
  },
  "auth.usernameMaxLength": {
    message: "Имя пользователя должно содержать не более 16 символов",
    description: "Validation error when username too long",
  },
  "auth.usernamePublicHint": {
    message: "Это имя пользователя является публичным и видимым для других",
    description: "Hint text explaining that username is publicly visible",
  },
  "auth.usernameRequired": {
    message: "Имя пользователя обязательно",
    description: "Validation error when username is missing",
  },
  "auth.verifyEmail": {
    message: "Подтвердить Email",
    description: "Button text to verify email with OTP",
  },
  "auth.verifyYourEmail": {
    message: "Подтвердите ваш email",
    description: "OTP verification page title",
  },
  "auth.verifying": {
    message: "Проверка...",
    description: "Button text while verifying OTP",
  },
  "auth.welcomeBack": {
    message: "Добро пожаловать обратно",
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
    message: "Срок действия вашей сессии истёк. Пожалуйста, войдите снова.",
    description:
      "Banner shown on the login page when redirected here because the previous session's token expired or was revoked",
  },
};
export default ruAuth;
