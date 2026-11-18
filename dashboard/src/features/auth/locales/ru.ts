export interface TranslationEntry {
  message: string;
  description: string;
}

const ruAuth: Record<string, TranslationEntry> = {
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
  "auth.chooseYourPassword": {
    message: "Придумайте пароль (мин. 8 символов)",
    description:
      "Placeholder for the password a new account chooses, with the minimum length",
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
  "auth.emailUnavailable": {
    message: "Этот сервер не может отправлять письма",
    description:
      "Title on the forgot-password page when the server has no mail provider",
  },
  "auth.emailUnavailableDescription": {
    message:
      "С этого сервера нельзя отправить письмо для сброса пароля. Попросите человека, который обслуживает этот сервер Beancount.io (его оператора), выдать одноразовую ссылку для сброса пароля.",
    description:
      "Forgot-password page text when the server cannot send email; tells the user to ask the server operator for a reset link",
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
    message: "Введите имя пользователя (макс. 20 символов)",
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
  "auth.loginFailed": {
    message: "Ошибка входа",
    description: "Error title when login fails",
  },
  "auth.loginRateLimited": {
    message:
      "Слишком много попыток входа. Подождите несколько минут и попробуйте снова или сбросьте пароль.",
    description:
      "Shown on any password sign-in form when sign-in is rate limited, by address or by too many wrong passwords for the account",
  },
  "auth.logout": {
    message: "Выход",
    description: "Button label to log out",
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
    message: "Пароль должен содержать не менее 8 символов",
    description: "Validation error for password length",
  },
  "auth.newPasswordMaxLength": {
    message:
      "Пароль слишком длинный: не более 72 символов, причём буквы с диакритикой, нелатинские буквы (включая кириллицу) и эмодзи считаются за 2–4 символа.",
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
  "auth.passwordBreached": {
    message:
      "Этот пароль обнаружен в утечке данных. Выберите пароль, который вы больше нигде не используете.",
    description:
      "Error when the server finds the new password in a known data breach (Have I Been Pwned)",
  },
  "auth.passwordTooSimilar": {
    message:
      "Пароль слишком похож на ваш адрес электронной почты или имя пользователя.",
    description:
      "Error when the new password is too close to the account's email or username",
  },
  "auth.passwordResetSuccessMessage": {
    message:
      "Ваш пароль сброшен, и вы вышли из аккаунта на всех устройствах и в подключённых приложениях. Перенаправление на страницу входа...",
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
  "auth.registrationFailed": {
    message: "Ошибка регистрации",
    description: "Error when registration fails",
  },
  "auth.resetPasswordButton": {
    message: "Сбросить пароль",
    description: "Button text to reset password",
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
  "auth.scriptRequired": {
    message:
      "Для входа нужен JavaScript. Включите его и перезагрузите страницу.",
    description:
      "Notice shown in place of the submit button when JavaScript is unavailable, explaining why sign-in and registration cannot be completed. Rendered inside <noscript>.",
  },
  "auth.signIn": {
    message: "Войти",
    description: "Button label for sign in action",
  },
  "auth.signInWith": {
    message: "Войти через {name}",
    description:
      "Button label to sign in with the identity provider set up by the operator; {name} is its name",
  },
  "auth.oidcErrorEmailInUse": {
    message:
      "Аккаунт с этим адресом уже есть. Войдите с паролем, затем привяжите его в настройках.",
    description:
      "Error after provider sign-in when the email already belongs to an account",
  },
  "auth.oidcErrorEmailUnverified": {
    message: "Ваш провайдер входа не подтвердил адрес почты.",
    description:
      "Error after provider sign-in when the provider has not verified the email",
  },
  "auth.oidcErrorBlocked": {
    message: "Этот аккаунт заблокирован.",
    description: "Error after provider sign-in when the account is blocked",
  },
  "auth.oidcErrorAlreadyLinked": {
    message: "Этот вход уже привязан к другому аккаунту.",
    description:
      "Error when the provider identity is already linked to another account",
  },
  "auth.oidcErrorAccountLinked": {
    message: "Этот аккаунт уже связан с другим входом.",
    description:
      "Error when the account is already linked to a different provider identity",
  },
  "auth.oidcErrorNotAllowed": {
    message: "С этим адресом здесь нельзя войти.",
    description:
      "Error when the operator has not allowed this email to sign in with the provider",
  },
  "auth.oidcErrorFailed": {
    message: "Не удалось войти. Попробуйте ещё раз.",
    description: "Generic error when provider sign-in fails",
  },
  "auth.oidcLinked": {
    message: "Аккаунт привязан. Вы можете входить через {name}.",
    description:
      "Settings text when the account is linked to the provider; {name} is its name",
  },
  "auth.oidcNotLinked": {
    message: "Привяжите аккаунт {name}, чтобы входить через него.",
    description:
      "Settings text when the account is not linked to the provider; {name} is its name",
  },
  "auth.oidcLink": {
    message: "Привязать",
    description: "Settings button to link the provider",
  },
  "auth.oidcUnlink": {
    message: "Отвязать",
    description: "Settings button to unlink the provider",
  },
  "auth.oidcUnlinkNeedsPassword": {
    message:
      "У аккаунта нет пароля. Задайте его через «Забыли пароль», прежде чем отвязывать.",
    description: "Error when unlinking an account that has no password",
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
  "auth.tokenValidationUnavailable": {
    message: "Не удалось проверить ссылку для сброса",
    description: "Title when the reset-token validation request itself fails",
  },
  "auth.tokenValidationUnavailableDescription": {
    message:
      "Не удалось связаться с сервером, чтобы проверить ссылку для сброса пароля. Возможно, ссылка ещё действительна — попробуйте снова.",
    description: "Explanation shown when reset-token validation is unavailable",
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
  "auth.usernameLowercaseAlphanumeric": {
    message:
      "Имя пользователя может содержать только строчные буквы, цифры и подчеркивания",
    description:
      "Validation error when username contains invalid characters (must be lowercase)",
  },
  "auth.usernameMaxLength": {
    message: "Имя пользователя должно содержать не более 20 символов",
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
    message: "Войдите, чтобы продолжить",
    description: "OAuth consent page login step title",
  },
  "auth.oauthAppWantsAccess": {
    message: "Приложение запрашивает доступ к вашей книге Beancount.",
    description: "OAuth consent page login step description",
  },
  "auth.oauthRequesterHeading": {
    message: "Кто запрашивает доступ",
    description:
      "OAuth consent: label of the section naming the requesting app",
  },
  "auth.oauthRequesterRedirect": {
    message: "После подтверждения вы вернётесь на {host}.",
    description:
      "OAuth consent: where the authorization code is sent ({host} is the redirect host)",
  },
  "auth.oauthRequesterName": {
    message:
      "Приложение называет себя «{name}». Приложения сами выбирают себе имя, поэтому проверьте адрес выше.",
    description:
      "OAuth consent: the app's self-asserted name ({name}), labelled as its own claim",
  },
  "auth.oauthRequesterUnnamed": {
    message: "Приложение не указало имя. Проверьте адрес выше.",
    description: "OAuth consent: shown when the app gave no name",
  },
  "auth.oauthRequesterVouchedBy": {
    message: "Его данные опубликованы {host}.",
    description:
      "OAuth consent: the domain publishing a CIMD client's metadata ({host})",
  },
  "auth.oauthRequesterLoopbackWarning": {
    message:
      "Это приложение возвращает только на ваш собственный компьютер. Этот запрос могла запустить любая программа на нём — подтверждайте, только если вы только что начали подключать приложение.",
    description:
      "OAuth consent: warning when every redirect is the user's own computer (loopback)",
  },
  "auth.oauthRequesterUnavailable": {
    message:
      "Не удалось определить этот запрос. Возможно, срок его действия истёк — вернитесь в приложение и подключитесь снова.",
    description:
      "OAuth consent: the requesting app could not be identified; approval is disabled",
  },
  "auth.oauthAllLedgers": {
    message: "Все доступные книги",
    description: "MCP account-wide consent option",
  },
  "auth.oauthAllLedgersDescription": {
    message:
      "Разрешить запрошенные действия с книгами, доступными сейчас или в будущем, и операции с аккаунтом, разрешённые этими правами.",
    description: "MCP account-wide consent explanation",
  },
  "auth.oauthChooseLedger": {
    message: "Выберите книгу",
    description: "OAuth consent page ledger step title",
  },
  "auth.oauthSelectLedger": {
    message: "Выберите, к какой книге предоставить доступ.",
    description: "OAuth consent page ledger step description",
  },
  "auth.oauthApproveAccess": {
    message: "Разрешить доступ",
    description: "OAuth consent page approve button",
  },
  "auth.oauthNoLedgersMessage": {
    message: "Книги не найдены.",
    description: "OAuth consent page empty ledger state message",
  },
  "auth.oauthRegisterToContinue": {
    message: "Создайте учётную запись, чтобы продолжить",
    description: "OAuth consent page register step title",
  },
  "auth.oauthVerifyEmailToContinue": {
    message: "Подтвердите электронную почту, чтобы продолжить",
    description: "OAuth consent page OTP step title",
  },
  "auth.loginSessionExpiredMessage": {
    message: "Срок действия вашей сессии истёк. Пожалуйста, войдите снова.",
    description:
      "Banner shown on the login page when redirected here because the previous session's token expired or was revoked",
  },
  "auth.cliAuthTitle": {
    message: "Разрешить доступ CLI",
    description: "Title of the CLI device authorization card",
  },
  "auth.cliAuthDescription": {
    message: "Beancount CLI запрашивает доступ к вашей учётной записи.",
    description: "Description under the CLI authorization title",
  },
  "auth.cliAuthPermissionsIntro": {
    message: "Это позволит CLI:",
    description: "Intro line above the list of CLI permissions",
  },
  "auth.cliAuthPermissionLedgers": {
    message: "Читать и изменять ваши книги",
    description: "CLI permission list item for reading and writing ledgers",
  },
  "auth.cliAuthPermissionAccount": {
    message: "Получать доступ к данным вашей учётной записи",
    description: "CLI permission list item for accessing account information",
  },
  "auth.cliAuthAuthorize": {
    message: "Разрешить",
    description: "Button to authorize the CLI session",
  },
  "auth.cliAuthAuthorizing": {
    message: "Разрешение...",
    description: "Button text while the CLI session is being authorized",
  },
  "auth.cliAuthDeny": {
    message: "Отклонить",
    description: "Button to deny the CLI session",
  },
  "auth.cliAuthDenying": {
    message: "Отклонение...",
    description: "Button text while the CLI session is being denied",
  },
  "auth.cliAuthSessionExpired": {
    message: "Сеанс истёк или не найден.",
    description: "Error shown when the CLI auth session is expired or missing",
  },
  "auth.cliAuthCodeUnknown": {
    message:
      "Этот код неизвестен или срок его действия истёк. Снова запустите `bea login` в терминале, чтобы получить новый код.",
    description:
      "Error when the entered CLI one-time code is unknown or expired; tells the user to rerun bea login",
  },
  "auth.cliAuthSuccessTitle": {
    message: "Авторизация выполнена",
    description: "Title shown after the CLI session was authorized",
  },
  "auth.cliAuthSuccessDescription": {
    message: "Можете закрыть эту вкладку и вернуться в CLI.",
    description: "Hint shown after successful CLI authorization",
  },
  "auth.cliAuthDeniedTitle": {
    message: "Доступ отклонён",
    description: "Title shown after the CLI session was denied",
  },
  "auth.cliAuthDeniedDescription": {
    message: "Можете закрыть эту вкладку.",
    description: "Hint shown after the CLI session was denied",
  },
  "auth.cliAuthCodeEntryTitle": {
    message: "Авторизация устройства",
    description: "Title of the CLI device code entry card",
  },
  "auth.cliAuthCodeEntryDescription": {
    message: "Введите одноразовый код, показанный в вашем терминале.",
    description: "Description under the CLI device code entry title",
  },
  "auth.cliAuthCodeLabel": {
    message: "Одноразовый код",
    description: "Label of the CLI one-time code input",
  },
  "auth.cliAuthCodeContinue": {
    message: "Продолжить",
    description: "Button to submit the entered CLI one-time code",
  },
  "auth.cliAuthCodeInvalid": {
    message: "Введите 8-символьный код из вашего терминала.",
    description: "Error shown when the entered CLI code is not the right shape",
  },
  "auth.cliAuthRequestedBy": {
    message: "Запрос от",
    description: "Heading above the requesting device's reported details",
  },
  "auth.cliAuthClientLabel": {
    message: "Клиент",
    description: "Label for the requesting client's name",
  },
  "auth.cliAuthDeviceLabel": {
    message: "Устройство",
    description: "Label for the requesting device's machine name",
  },
  "auth.cliAuthPlatformLabel": {
    message: "Система",
    description: "Label for the requesting device's operating system",
  },
  "auth.cliAuthIpLabel": {
    message: "IP-адрес",
    description: "Label for the requesting device's IP address",
  },
  "auth.cliAuthSelfReported": {
    message:
      "Эти данные сообщило само устройство. Подтверждайте только если это тот терминал, которым вы только что пользовались.",
    description:
      "Warning that the requesting device's details are self-reported",
  },
  "auth.cliAuthUseAnotherCode": {
    message: "Использовать другой код",
    description: "Button to enter a different CLI one-time code",
  },
  "auth.cliAuthPermissionExpiry": {
    message: "Оставаться в системе на этом устройстве 30 дней",
    description:
      "CLI permission list item for how long the device stays signed in",
  },
  "auth.oauthIdentityWantsAccess": {
    message: "Приложение хочет, чтобы вы вошли с учётной записью Beancount.",
    description: "Identity OAuth consent page login step description",
  },
  "auth.oauthIdentityApproveTitle": {
    message: "Продолжить вход",
    description: "Identity OAuth consent page approve step title",
  },
  "auth.oauthIdentityApproveDescription": {
    message:
      "Это позволит приложению получить доступ к вашему имени, email и имени пользователя.",
    description: "Identity OAuth consent page approve step description",
  },
  "auth.oauthIdentitySignedInAs": {
    message: "Вы вошли как {email}",
    description:
      "Identity OAuth consent page approve step — shows which account is authorizing",
  },
  "auth.hidePassword": {
    message: "Скрыть пароль",
    description: "Accessible label for hiding a password",
  },
  "auth.showPassword": {
    message: "Показать пароль",
    description: "Accessible label for showing a password",
  },
  "auth.oauthLedgerRequired": {
    message: "Пожалуйста, выберите бухгалтерскую книгу.",
    description: "Validation shown when OAuth consent has no selected ledger",
  },
  "auth.oauthMobileSignInTitle": {
    message: "Войти в Beancount",
    description:
      "Mobile OAuth login step title — first-party app, so it names the product rather than asking for access",
  },
  "auth.oauthMobileRegisterTitle": {
    message: "Создайте свой аккаунт Beancount",
    description: "Mobile OAuth register step title",
  },
  "auth.oauthMobileChooseAccountTitle": {
    message: "Какой аккаунт должно использовать приложение?",
    description:
      "Mobile OAuth step shown when the browser is signed in but the app's Sign Up button started the flow",
  },
  "auth.oauthMobileContinueAs": {
    message: "Продолжить как {email}",
    description:
      "Mobile OAuth button that keeps the signed-in browser account; {email} is the account",
  },
  "auth.oauthMobileCreateDifferentAccount": {
    message: "Создать другой аккаунт",
    description:
      "Mobile OAuth button that signs the browser out and opens registration",
  },
  "auth.oauthMobileAllowTitle": {
    message: "Разрешить Beancount Mobile?",
    description: "Mobile OAuth approval title",
  },
  "auth.oauthMobileGrantDescription": {
    message: "Этот грант на уровне аккаунта позволяет приложению:",
    description: "Introduction to mobile OAuth permissions",
  },
  "auth.oauthSwitchAccountFailed": {
    message: "Не удалось переключить аккаунты. Пожалуйста, попробуйте еще раз.",
    description: "Error shown when OAuth account switching fails",
  },
  "auth.oauthUseAnotherAccount": {
    message: "Используйте другую учетную запись",
    description: "Button for switching OAuth accounts",
  },
  "auth.oauthMobileScopeIdentity": {
    message: "Укажите учетную запись, которую вы одобряете.",
    description: "Description of the OpenID mobile permission",
  },
  "auth.oauthMobileScopeOfflineAccess": {
    message: "Оставайтесь в безопасности до тех пор, пока не отзовете доступ.",
    description: "Description of the offline access mobile permission",
  },
  "auth.oauthMobileScopeRead": {
    message: "Прочтите свои бухгалтерские книги",
    description: "Description of the ledger read mobile permission",
  },
  "auth.oauthMobileScopeWrite": {
    message: "Создание и обновление данных бухгалтерской книги",
    description: "Description of the ledger write mobile permission",
  },
  "auth.oauthMobileScopeAdmin": {
    message: "Управление реестрами и соавторами",
    description: "Description of the ledger admin mobile permission",
  },
  "auth.recoveryTitle": {
    message: "Подтвердите почту для входа",
    description:
      "Title of the email ownership verification step for sign-in recovery",
  },
  "auth.recoveryDescription": {
    message:
      "Откройте ссылку в письме для восстановления входа, затем введите код из письма и текущий пароль.",
    description: "Instructions for continuing from the sign-in recovery email",
  },
  "auth.recoverySendEmail": {
    message: "Отправить письмо для восстановления входа",
    description: "Button requesting a sign-in recovery email",
  },
  "auth.recoverySending": {
    message: "Отправка письма для восстановления входа...",
    description: "Pending state while requesting a sign-in recovery email",
  },
  "auth.recoverySent": {
    message:
      "Если для этого адреса есть аккаунт, скоро придёт письмо для восстановления входа. Откройте ссылку из письма, чтобы продолжить. Недавно полученное письмо всё ещё действительно.",
    description:
      "Uniform confirmation after requesting recovery; previous valid recovery emails remain usable",
  },
  "auth.recoveryResend": {
    message: "Отправить ещё одно письмо для восстановления входа",
    description: "Button requesting another sign-in recovery email",
  },
  "auth.recoveryRetryAt": {
    message: "Повторите попытку в {time}.",
    description:
      "Absolute local retry time after throttling; {time} is formatted using the active locale",
  },
  "auth.recoveryCode": {
    message: "Шестизначный код подтверждения",
    description: "Accessible label for the sign-in recovery email code",
  },
  "auth.recoveryCodeInvalid": {
    message: "Введите шестизначный код из письма для восстановления входа.",
    description:
      "Validation error when the recovery code is not exactly six digits",
  },
  "auth.recoveryFailed": {
    message:
      "Неверный адрес почты, код или пароль либо срок действия кода истёк. Вы можете запросить новое письмо для восстановления входа.",
    description:
      "Uniform invalid-credentials or expired-code error during sign-in recovery",
  },
  "auth.recoveryRequestFailed": {
    message:
      "Не удалось запросить письмо для восстановления входа. Попробуйте ещё раз.",
    description: "Error when requesting a sign-in recovery email fails",
  },
  "auth.recoveryUnavailable": {
    message: "Вход временно недоступен. Попробуйте ещё раз.",
    description: "Temporary service outage during sign-in recovery",
  },
  "auth.recoveryExpiry": {
    message:
      "Код действует 10 минут и позволяет выполнить одну попытку ввода пароля.",
    description:
      "Explains the expiry and single password-attempt limit of a recovery code",
  },
  "auth.recoverySubmit": {
    message: "Подтвердить и войти",
    description: "Button submitting the recovery code and current password",
  },
  "auth.recoveryVerifying": {
    message: "Проверка...",
    description: "Pending state while verifying the recovery code and password",
  },
};

export default ruAuth;
