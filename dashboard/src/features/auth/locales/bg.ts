export interface TranslationEntry {
  message: string;
  description: string;
}

const bgAuth: Record<string, TranslationEntry> = {
  "auth.alreadyHaveAccountQuestion": {
    message: "Вече имате профил?",
    description: "Prompt asking if user has existing account",
  },
  "auth.and": {
    message: "и",
    description: "Conjunction between terms and privacy links",
  },
  "auth.authenticating": {
    message: "Удостоверяване...",
    description: "Message shown during authentication process",
  },
  "auth.backToSignIn": {
    message: "Обратно към вход",
    description: "Link text to return to sign in page",
  },
  "auth.backToSignUp": {
    message: "Обратно към Регистрация",
    description: "Link text to return to sign up page",
  },
  "auth.confirmNewPassword": {
    message: "Потвърдете новата парола",
    description: "Label for confirm password field",
  },
  "auth.confirmPassword": {
    message: "Потвърдете паролата",
    description: "Label for password confirmation input field",
  },
  "auth.confirmPasswordRequired": {
    message: "Моля, потвърдете паролата си",
    description: "Validation error when password confirmation is missing",
  },
  "auth.confirmYourNewPassword": {
    message: "Потвърдете новата си парола",
    description: "Placeholder for confirm password input",
  },
  "auth.confirmYourPassword": {
    message: "Потвърдете паролата си",
    description: "Placeholder for password confirmation",
  },
  "auth.chooseYourPassword": {
    message: "Изберете парола (мин. 8 символа)",
    description:
      "Placeholder for the password a new account chooses, with the minimum length",
  },
  "auth.createAccount": {
    message: "Създаване на профил",
    description: "Button to submit registration",
  },
  "auth.createYourAccount": {
    message: "Създайте своя профил",
    description: "Registration page title",
  },
  "auth.creatingAccount": {
    message: "Създаване на профил...",
    description: "Button state while creating account",
  },
  "auth.didNotReceiveOtp": {
    message: "Не получихте кода?",
    description: "Prompt asking if user didn't receive OTP",
  },
  "auth.dontHaveAccount": {
    message: "Нямате профил?",
    description: "Prompt text asking if user doesn't have account",
  },
  "auth.email": {
    message: "Имейл",
    description: "Label for email input field",
  },
  "auth.emailAddress": {
    message: "Имейл адрес",
    description: "Email address field label",
  },
  "auth.emailInvalid": {
    message: "Моля, въведете валиден имейл адрес",
    description: "Validation error when email format is invalid",
  },
  "auth.emailRequired": {
    message: "Имейлът е задължителен",
    description: "Validation error when email is not provided",
  },
  "auth.emailSent": {
    message: "Имейлът е изпратен!",
    description: "Success title after email sent",
  },
  "auth.emailSentDescription": {
    message:
      "Изпратихме връзка за нулиране на паролата на вашия имейл адрес. Моля, проверете входящата си поща и следвайте инструкциите за нулиране на паролата.",
    description: "Detailed success message after reset email sent",
  },
  "auth.emailUnavailable": {
    message: "Този сървър не може да изпраща имейли",
    description:
      "Title on the forgot-password page when the server has no mail provider",
  },
  "auth.emailUnavailableDescription": {
    message:
      "Имейлите за нулиране на паролата не могат да бъдат изпратени от този сървър. Помолете човека, който поддържа този сървър на Beancount.io (неговия оператор), за еднократна връзка за нулиране на паролата.",
    description:
      "Forgot-password page text when the server cannot send email; tells the user to ask the server operator for a reset link",
  },
  "auth.enterDetailsToGetStarted": {
    message: "Въведете данните си, за да започнете работа с таблото",
    description: "Registration page description",
  },
  "auth.enterEmailForReset": {
    message:
      "Въведете имейл адреса си и ще ви изпратим връзка за нулиране на паролата",
    description: "Instructions on forgot password page",
  },
  "auth.enterFirstName": {
    message: "Въведете собственото си име",
    description: "Placeholder for first name input",
  },
  "auth.enterLastName": {
    message: "Въведете фамилията си",
    description: "Placeholder for last name input",
  },
  "auth.enterNewPasswordBelow": {
    message: "Въведете новата си парола по-долу",
    description: "Instruction for reset password form",
  },
  "auth.enterOtpCode": {
    message: "Въведете кода",
    description: "Label for OTP input field",
  },
  "auth.enterUsername": {
    message: "Въведете потребителското си име (макс. 20 символа)",
    description: "Placeholder for username input with character limit",
  },
  "auth.enterYourEmail": {
    message: "Въведете имейла си",
    description: "Placeholder for email input",
  },
  "auth.enterYourNewPassword": {
    message: "Въведете новата си парола",
    description: "Placeholder for new password input",
  },
  "auth.enterYourPassword": {
    message: "Въведете паролата си",
    description: "Placeholder for password input with requirement",
  },
  "auth.failedToResetPassword": {
    message: "Неуспешно нулиране на паролата. Моля, опитайте отново.",
    description: "Error message when password reset fails",
  },
  "auth.failedToSendResetEmail": {
    message:
      "Неуспешно изпращане на имейл за нулиране на парола. Моля, опитайте отново.",
    description: "Error when reset email fails to send",
  },
  "auth.firstName": {
    message: "Собствено име",
    description: "Label for first name input field",
  },
  "auth.firstNameMaxLength": {
    message: "Собственото име трябва да бъде най-много 50 символа",
    description: "Validation error when first name is too long",
  },
  "auth.forgotPassword": {
    message: "Забравена парола?",
    description: "Link text for forgot password feature",
  },
  "auth.forgotYourPassword": {
    message: "Забравена парола?",
    description: "Forgot password page title",
  },
  "auth.lastName": {
    message: "Фамилия",
    description: "Label for last name input field",
  },
  "auth.lastNameMaxLength": {
    message: "Фамилията трябва да бъде най-много 50 символа",
    description: "Validation error when last name is too long",
  },
  "auth.loggingOut": {
    message: "Излизане",
    description: "Title shown while logging out",
  },
  "auth.loggingOutMessage": {
    message: "Моля, изчакайте, докато ви излезем от системата...",
    description: "Message shown while logging out",
  },
  "auth.login": {
    message: "Вход / Регистрация",
    description: "Button label for login or signup",
  },
  "auth.loginFailed": {
    message: "Неуспешен вход",
    description: "Error title when login fails",
  },
  "auth.loginRateLimited": {
    message:
      "Твърде много опити за вход. Изчакайте няколко минути и опитайте отново или нулирайте паролата си.",
    description:
      "Shown on any password sign-in form when sign-in is rate limited, by address or by too many wrong passwords for the account",
  },
  "auth.logout": {
    message: "Изход",
    description: "Button label to log out",
  },
  "auth.lovedByUsers": {
    message: "Обичан от потребителите",
    description: "Loved by users feature title",
  },
  "auth.lovedByUsersDescription": {
    message:
      "Присъединете се към хиляди доволни потребители, които се доверяват на Beancount за своите счетоводни нужди",
    description: "Loved by users feature description",
  },
  "auth.selfHosted": {
    message: "Самостоятелно хостван",
    description:
      "Feature title beside the sign-in and sign-up forms of a self-hosted deployment, in place of the hosted service's security claim",
  },
  "auth.selfHostedDescription": {
    message:
      "Този Beancount.io се поддържа от своя собственик, а не от услугата Beancount.io. Вашето счетоводство се съхранява на неговия собствен сървър.",
    description:
      "Feature description on a self-hosted deployment: who runs it, and where the books are stored",
  },
  "auth.plainTextBooks": {
    message: "Счетоводство в обикновен текст",
    description:
      "Feature title beside the sign-in and sign-up forms of a self-hosted deployment, in place of the hosted service's user count",
  },
  "auth.plainTextBooksDescription": {
    message:
      "Вашият леджър е обикновен текст на Beancount в Git хранилище, така че можете да го клонирате, архивирате или преместите, когато пожелаете.",
    description:
      "Feature description on a self-hosted deployment: the ledger is plain text in Git the user can take",
  },
  "auth.newPassword": {
    message: "Нова парола",
    description: "Label for new password field",
  },
  "auth.newPasswordMinLength": {
    message: "Паролата трябва да бъде поне 8 символа",
    description: "Validation error for password length",
  },
  "auth.newPasswordMaxLength": {
    message:
      "Паролата е твърде дълга. Използвайте най-много 72 символа; буквите с диакритика, нелатинските букви и емоджитата се броят за 2 до 4 всяко.",
    description:
      "Validation error when new password exceeds the maximum length",
  },
  "auth.newPasswordRequired": {
    message: "Паролата е задължителна",
    description: "Validation error for missing new password",
  },
  "auth.otpInvalidLength": {
    message: "Кодът OTP трябва да съдържа 4 цифри",
    description: "Validation error when OTP length is invalid",
  },
  "auth.otpRequired": {
    message: "Кодът OTP е задължителен",
    description: "Validation error when OTP is missing",
  },
  "auth.otpSentToYourEmail": {
    message: "Изпратихме 4-цифрен код на вашия имейл адрес",
    description: "Message showing OTP was sent to email",
  },
  "auth.otpVerificationError": {
    message: "Възникна грешка по време на проверката на OTP",
    description: "Generic error message for OTP verification",
  },
  "auth.otpVerificationFailed": {
    message: "Проверката на OTP не бе успешна",
    description: "Error message when OTP verification fails",
  },
  "auth.password": {
    message: "Парола",
    description: "Label for password input field",
  },
  "auth.passwordMaxLength": {
    message: "Паролата трябва да бъде най-много 128 символа",
    description: "Validation error when password exceeds the maximum length",
  },
  "auth.passwordRequired": {
    message: "Паролата е задължителна",
    description: "Validation error when password is not provided",
  },
  "auth.passwordBreached": {
    message:
      "Тази парола е открита при изтичане на данни. Изберете парола, която не използвате никъде другаде.",
    description:
      "Error when the server finds the new password in a known data breach (Have I Been Pwned)",
  },
  "auth.passwordTooSimilar": {
    message: "Паролата е твърде сходна с вашия имейл или потребителско име.",
    description:
      "Error when the new password is too close to the account's email or username",
  },
  "auth.passwordResetSuccessMessage": {
    message:
      "Вашата парола беше нулирана и излязохте от профила си на всички устройства и в свързаните приложения. Пренасочване към страницата за вход...",
    description: "Success message description",
  },
  "auth.passwordResetSuccessful": {
    message: "Успешно нулиране на паролата!",
    description: "Success message title",
  },
  "auth.passwordsDoNotMatch": {
    message: "Паролите не съвпадат",
    description: "Validation error when passwords don't match",
  },
  "auth.privacyPolicy": {
    message: "Политика за поверителност",
    description: "Link text for privacy policy",
  },
  "auth.realTimeInsights": {
    message: "Анализ в реално време",
    description: "Real-time insights feature title",
  },
  "auth.realTimeInsightsDescription": {
    message:
      "Получете незабавна видимост на вашето финансово състояние и тенденции",
    description: "Real-time insights feature description",
  },
  "auth.redirectingToLogin": {
    message: "Пренасочване към страницата за вход...",
    description: "Message shown after successful logout",
  },
  "auth.registrationFailed": {
    message: "Неуспешна регистрация",
    description: "Error when registration fails",
  },
  "auth.resetPasswordButton": {
    message: "Нулиране на парола",
    description: "Button text to reset password",
  },
  "auth.resetYourPassword": {
    message: "Нулирайте паролата си",
    description: "Title for reset password page",
  },
  "auth.resettingPassword": {
    message: "Нулиране на парола...",
    description: "Button text while resetting password",
  },
  "auth.secureAccess": {
    message: "Сигурен достъп",
    description: "Secure access feature title",
  },
  "auth.secureAccessDescription": {
    message: "Вашите финансови данни са защитени с корпоративна сигурност",
    description: "Secure access feature description",
  },
  "auth.sendResetLink": {
    message: "Изпрати връзка за нулиране",
    description: "Button to send password reset link",
  },
  "auth.sending": {
    message: "Изпращане...",
    description: "Button state while sending email",
  },
  "auth.sessionExpired": {
    message: "Сесията Изтече",
    description: "Title when signup session is expired",
  },
  "auth.sessionExpiredDescription": {
    message: "Сесията за регистрация е изтекла или е невалидна",
    description: "Description when session is expired",
  },
  "auth.sessionExpiredMessage": {
    message:
      "Тази сесия за регистрация е изтекла. Моля, започнете процеса на регистрация отново.",
    description: "Alert message for expired session",
  },
  "auth.scriptRequired": {
    message:
      "Влизането изисква JavaScript. Включете го и презаредете страницата.",
    description:
      "Notice shown in place of the submit button when JavaScript is unavailable, explaining why sign-in and registration cannot be completed. Rendered inside <noscript>.",
  },
  "auth.signIn": {
    message: "Вход",
    description: "Button label for sign in action",
  },
  "auth.signInWith": {
    message: "Вход с {name}",
    description:
      "Button label to sign in with the identity provider set up by the operator; {name} is its name",
  },
  "auth.oidcErrorEmailInUse": {
    message:
      "Вече има акаунт с този имейл. Влезте с паролата си и го свържете от Настройки.",
    description:
      "Error after provider sign-in when the email already belongs to an account",
  },
  "auth.oidcErrorEmailUnverified": {
    message: "Доставчикът за вход не е потвърдил имейла ви.",
    description:
      "Error after provider sign-in when the provider has not verified the email",
  },
  "auth.oidcErrorBlocked": {
    message: "Този акаунт е блокиран.",
    description: "Error after provider sign-in when the account is blocked",
  },
  "auth.oidcErrorAlreadyLinked": {
    message: "Този вход вече е свързан с друг акаунт.",
    description:
      "Error when the provider identity is already linked to another account",
  },
  "auth.oidcErrorAccountLinked": {
    message: "Този акаунт вече е свързан с друг вход.",
    description:
      "Error when the account is already linked to a different provider identity",
  },
  "auth.oidcErrorNotAllowed": {
    message: "С този имейл не може да се влиза тук.",
    description:
      "Error when the operator has not allowed this email to sign in with the provider",
  },
  "auth.oidcErrorFailed": {
    message: "Входът не бе успешен. Опитайте отново.",
    description: "Generic error when provider sign-in fails",
  },
  "auth.oidcLinked": {
    message: "Акаунтът ви е свързан. Можете да влизате с {name}.",
    description:
      "Settings text when the account is linked to the provider; {name} is its name",
  },
  "auth.oidcNotLinked": {
    message: "Свържете акаунта си в {name}, за да влизате с него.",
    description:
      "Settings text when the account is not linked to the provider; {name} is its name",
  },
  "auth.oidcLink": {
    message: "Свързване",
    description: "Settings button to link the provider",
  },
  "auth.oidcUnlink": {
    message: "Прекратяване на връзката",
    description: "Settings button to unlink the provider",
  },
  "auth.oidcUnlinkNeedsPassword": {
    message:
      "Акаунтът ви няма парола. Задайте такава чрез „Забравена парола“, преди да прекратите връзката.",
    description: "Error when unlinking an account that has no password",
  },
  "auth.signInToAccount": {
    message: "Влезте в своя акаунт Beancount",
    description: "Login page subtitle",
  },
  "auth.signUp": {
    message: "Регистрация",
    description: "Button label for sign up action",
  },
  "auth.termsAgreementPrefix": {
    message:
      'С натискане на "Създаване на профил" се съгласявам с beancount.io',
    description: "Prefix text before terms and privacy links on sign up form",
  },
  "auth.termsOfUse": {
    message: "Условия за ползване",
    description: "Link text for terms of use",
  },
  "auth.tokenExpired": {
    message: "Изтекъл токен",
    description: "Title when reset token is expired",
  },
  "auth.tokenExpiredDescription": {
    message: "Токенът за нулиране на парола е изтекъл или невалиден",
    description: "Description when token is expired",
  },
  "auth.tokenValidationUnavailable": {
    message: "Връзката за нулиране не можа да бъде проверена",
    description: "Title when the reset-token validation request itself fails",
  },
  "auth.tokenValidationUnavailableDescription": {
    message:
      "Не успяхме да се свържем със сървъра, за да проверим връзката за нулиране на паролата. Възможно е връзката още да е валидна — опитайте отново.",
    description: "Explanation shown when reset-token validation is unavailable",
  },
  "auth.tokenExpiredMessage": {
    message: "Този токен за нулиране на парола е изтекъл. Моля, поискайте нов.",
    description: "Alert message for expired token",
  },
  "auth.username": {
    message: "Потребителско име",
    description: "Username field label",
  },
  "auth.usernameLowercaseAlphanumeric": {
    message:
      "Потребителското име може да съдържа само малки букви, цифри и долни черти",
    description:
      "Validation error when username contains invalid characters (must be lowercase)",
  },
  "auth.usernameMaxLength": {
    message: "Потребителското име трябва да бъде най-много 20 символа",
    description: "Validation error when username too long",
  },
  "auth.usernamePublicHint": {
    message: "Това потребителско име е публично и видимо за другите",
    description: "Hint text explaining that username is publicly visible",
  },
  "auth.usernameRequired": {
    message: "Потребителското име е задължително",
    description: "Validation error when username is missing",
  },
  "auth.verifyEmail": {
    message: "Потвърдете Имейл",
    description: "Button text to verify email with OTP",
  },
  "auth.verifyYourEmail": {
    message: "Потвърдете вашия имейл",
    description: "OTP verification page title",
  },
  "auth.verifying": {
    message: "Проверяване...",
    description: "Button text while verifying OTP",
  },
  "auth.welcomeBack": {
    message: "Добре дошли отново",
    description: "Login page welcome title",
  },
  "auth.oauthSignInToContinue": {
    message: "Вход за продължаване",
    description: "OAuth consent page login step title",
  },
  "auth.oauthAppWantsAccess": {
    message: "Приложение иска достъп до вашата книга в Beancount.",
    description: "OAuth consent page login step description",
  },
  "auth.oauthRequesterHeading": {
    message: "Кой иска достъп",
    description:
      "OAuth consent: label of the section naming the requesting app",
  },
  "auth.oauthRequesterRedirect": {
    message: "След одобрение ще се върнете към {host}.",
    description:
      "OAuth consent: where the authorization code is sent ({host} is the redirect host)",
  },
  "auth.oauthRequesterName": {
    message:
      "Приложението се представя като „{name}“. Приложенията сами избират името си, затова проверете адреса по-горе.",
    description:
      "OAuth consent: the app's self-asserted name ({name}), labelled as its own claim",
  },
  "auth.oauthRequesterUnnamed": {
    message: "Приложението не е посочило име. Проверете адреса по-горе.",
    description: "OAuth consent: shown when the app gave no name",
  },
  "auth.oauthRequesterVouchedBy": {
    message: "Данните му се публикуват от {host}.",
    description:
      "OAuth consent: the domain publishing a CIMD client's metadata ({host})",
  },
  "auth.oauthRequesterLoopbackWarning": {
    message:
      "Това приложение връща само към вашия собствен компютър. Всяка програма на него може да е стартирала тази заявка — одобрете само ако току-що сте започнали да свързвате приложение.",
    description:
      "OAuth consent: warning when every redirect is the user's own computer (loopback)",
  },
  "auth.oauthRequesterUnavailable": {
    message:
      "Тази заявка не може да бъде разпозната. Може да е изтекла — върнете се в приложението и се свържете отново.",
    description:
      "OAuth consent: the requesting app could not be identified; approval is disabled",
  },
  "auth.oauthAllLedgers": {
    message: "Всички достъпни книги",
    description: "MCP account-wide consent option",
  },
  "auth.oauthAllLedgersDescription": {
    message:
      "Разрешете заявените действия във всички книги, до които имате достъп сега или в бъдеще, и операциите с профила, разрешени от тези права.",
    description: "MCP account-wide consent explanation",
  },
  "auth.oauthChooseLedger": {
    message: "Изберете книга",
    description: "OAuth consent page ledger step title",
  },
  "auth.oauthSelectLedger": {
    message: "Изберете към коя книга да дадете достъп.",
    description: "OAuth consent page ledger step description",
  },
  "auth.oauthApproveAccess": {
    message: "Разрешаване на достъп",
    description: "OAuth consent page approve button",
  },
  "auth.oauthNoLedgersMessage": {
    message: "Няма намерени книги.",
    description: "OAuth consent page empty ledger state message",
  },
  "auth.oauthRegisterToContinue": {
    message: "Създайте профил, за да продължите",
    description: "OAuth consent page register step title",
  },
  "auth.oauthVerifyEmailToContinue": {
    message: "Потвърдете имейла си, за да продължите",
    description: "OAuth consent page OTP step title",
  },
  "auth.loginSessionExpiredMessage": {
    message: "Сесията ви изтече. Моля, влезте отново.",
    description:
      "Banner shown on the login page when redirected here because the previous session's token expired or was revoked",
  },
  "auth.cliAuthTitle": {
    message: "Разрешаване на CLI достъп",
    description: "Title of the CLI device authorization card",
  },
  "auth.cliAuthDescription": {
    message: "Beancount CLI иска достъп до вашия профил.",
    description: "Description under the CLI authorization title",
  },
  "auth.cliAuthPermissionsIntro": {
    message: "Това ще позволи на CLI да:",
    description: "Intro line above the list of CLI permissions",
  },
  "auth.cliAuthPermissionLedgers": {
    message: "Чете и записва вашите книги",
    description: "CLI permission list item for reading and writing ledgers",
  },
  "auth.cliAuthPermissionAccount": {
    message: "Достъп до информацията за вашия профил",
    description: "CLI permission list item for accessing account information",
  },
  "auth.cliAuthAuthorize": {
    message: "Разрешаване",
    description: "Button to authorize the CLI session",
  },
  "auth.cliAuthAuthorizing": {
    message: "Разрешаване...",
    description: "Button text while the CLI session is being authorized",
  },
  "auth.cliAuthDeny": {
    message: "Отказ",
    description: "Button to deny the CLI session",
  },
  "auth.cliAuthDenying": {
    message: "Отказване...",
    description: "Button text while the CLI session is being denied",
  },
  "auth.cliAuthSessionExpired": {
    message: "Сесията е изтекла или не е намерена.",
    description: "Error shown when the CLI auth session is expired or missing",
  },
  "auth.cliAuthCodeUnknown": {
    message:
      "Този код е непознат или е изтекъл. Изпълнете отново `bea login` в терминала, за да получите нов код.",
    description:
      "Error when the entered CLI one-time code is unknown or expired; tells the user to rerun bea login",
  },
  "auth.cliAuthSuccessTitle": {
    message: "Успешно разрешаване",
    description: "Title shown after the CLI session was authorized",
  },
  "auth.cliAuthSuccessDescription": {
    message: "Можете да затворите този раздел и да се върнете към CLI.",
    description: "Hint shown after successful CLI authorization",
  },
  "auth.cliAuthDeniedTitle": {
    message: "Достъпът е отказан",
    description: "Title shown after the CLI session was denied",
  },
  "auth.cliAuthDeniedDescription": {
    message: "Можете да затворите този раздел.",
    description: "Hint shown after the CLI session was denied",
  },
  "auth.cliAuthCodeEntryTitle": {
    message: "Оторизиране на устройство",
    description: "Title of the CLI device code entry card",
  },
  "auth.cliAuthCodeEntryDescription": {
    message: "Въведете еднократния код, показан във вашия терминал.",
    description: "Description under the CLI device code entry title",
  },
  "auth.cliAuthCodeLabel": {
    message: "Еднократен код",
    description: "Label of the CLI one-time code input",
  },
  "auth.cliAuthCodeContinue": {
    message: "Продължи",
    description: "Button to submit the entered CLI one-time code",
  },
  "auth.cliAuthCodeInvalid": {
    message: "Въведете 8-символния код от вашия терминал.",
    description: "Error shown when the entered CLI code is not the right shape",
  },
  "auth.cliAuthRequestedBy": {
    message: "Заявено от",
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
    message: "IP адрес",
    description: "Label for the requesting device's IP address",
  },
  "auth.cliAuthSelfReported": {
    message:
      "Тези данни са съобщени от самото устройство. Одобрете само ако това е терминалът, който току-що използвахте.",
    description:
      "Warning that the requesting device's details are self-reported",
  },
  "auth.cliAuthUseAnotherCode": {
    message: "Използване на друг код",
    description: "Button to enter a different CLI one-time code",
  },
  "auth.cliAuthPermissionExpiry": {
    message: "Оставане в профила на това устройство за 30 дни",
    description:
      "CLI permission list item for how long the device stays signed in",
  },
  "auth.oauthIdentityWantsAccess": {
    message: "Приложение иска да влезете с акаунта си в Beancount.",
    description: "Identity OAuth consent page login step description",
  },
  "auth.oauthIdentityApproveTitle": {
    message: "Продължи към вход",
    description: "Identity OAuth consent page approve step title",
  },
  "auth.oauthIdentityApproveDescription": {
    message:
      "Това ще сподели вашето име, имейл и потребителско име с приложението.",
    description: "Identity OAuth consent page approve step description",
  },
  "auth.oauthIdentitySignedInAs": {
    message: "Влязохте като {email}",
    description:
      "Identity OAuth consent page approve step — shows which account is authorizing",
  },
  "auth.hidePassword": {
    message: "Скриване на паролата",
    description: "Accessible label for hiding a password",
  },
  "auth.showPassword": {
    message: "Показване на парола",
    description: "Accessible label for showing a password",
  },
  "auth.oauthLedgerRequired": {
    message: "Моля, изберете счетоводна книга.",
    description: "Validation shown when OAuth consent has no selected ledger",
  },
  "auth.oauthMobileSignInTitle": {
    message: "Влезте в Beancount",
    description:
      "Mobile OAuth login step title — first-party app, so it names the product rather than asking for access",
  },
  "auth.oauthMobileRegisterTitle": {
    message: "Създайте своя акаунт в Beancount",
    description: "Mobile OAuth register step title",
  },
  "auth.oauthMobileChooseAccountTitle": {
    message: "Кой акаунт да използва приложението?",
    description:
      "Mobile OAuth step shown when the browser is signed in but the app's Sign Up button started the flow",
  },
  "auth.oauthMobileContinueAs": {
    message: "Продължете като {email}",
    description:
      "Mobile OAuth button that keeps the signed-in browser account; {email} is the account",
  },
  "auth.oauthMobileCreateDifferentAccount": {
    message: "Създайте друг акаунт",
    description:
      "Mobile OAuth button that signs the browser out and opens registration",
  },
  "auth.oauthMobileAllowTitle": {
    message: "Разрешаване на Beancount Mobile?",
    description: "Mobile OAuth approval title",
  },
  "auth.oauthMobileGrantDescription": {
    message: "Това разрешение за целия акаунт позволява на приложението:",
    description: "Introduction to mobile OAuth permissions",
  },
  "auth.oauthSwitchAccountFailed": {
    message: "Не можах да превключа акаунта. Моля, опитайте отново.",
    description: "Error shown when OAuth account switching fails",
  },
  "auth.oauthUseAnotherAccount": {
    message: "Използвайте друг акаунт",
    description: "Button for switching OAuth accounts",
  },
  "auth.oauthMobileScopeIdentity": {
    message: "Идентифицирайте акаунта, който одобрявате",
    description: "Description of the OpenID mobile permission",
  },
  "auth.oauthMobileScopeOfflineAccess": {
    message: "Останете сигурно влезли, докато не отмените достъпа",
    description: "Description of the offline access mobile permission",
  },
  "auth.oauthMobileScopeRead": {
    message: "Четете счетоводните си книги",
    description: "Description of the ledger read mobile permission",
  },
  "auth.oauthMobileScopeWrite": {
    message: "Създаване и актуализиране на данни в счетоводната книга",
    description: "Description of the ledger write mobile permission",
  },
  "auth.oauthMobileScopeAdmin": {
    message: "Управлявайте счетоводни книги и сътрудници",
    description: "Description of the ledger admin mobile permission",
  },
  "auth.recoveryTitle": {
    message: "Потвърдете имейла си, за да влезете",
    description:
      "Title of the email ownership verification step for sign-in recovery",
  },
  "auth.recoveryDescription": {
    message:
      "Отворете връзката в имейла за възстановяване на достъпа, след което въведете кода от него и текущата си парола.",
    description: "Instructions for continuing from the sign-in recovery email",
  },
  "auth.recoverySendEmail": {
    message: "Изпращане на имейл за възстановяване",
    description: "Button requesting a sign-in recovery email",
  },
  "auth.recoverySending": {
    message: "Изпращане на имейл за възстановяване...",
    description: "Pending state while requesting a sign-in recovery email",
  },
  "auth.recoverySent": {
    message:
      "Ако има акаунт с този адрес, скоро ще получите имейл за възстановяване на достъпа. Отворете връзката в него, за да продължите. Скорошен имейл за възстановяване все още е валиден.",
    description:
      "Uniform confirmation after requesting recovery; previous valid recovery emails remain usable",
  },
  "auth.recoveryResend": {
    message: "Изпращане на нов имейл за възстановяване",
    description: "Button requesting another sign-in recovery email",
  },
  "auth.recoveryRetryAt": {
    message: "Опитайте отново в {time}.",
    description:
      "Absolute local retry time after throttling; {time} is formatted using the active locale",
  },
  "auth.recoveryCode": {
    message: "Шестцифрен код за потвърждение",
    description: "Accessible label for the sign-in recovery email code",
  },
  "auth.recoveryCodeInvalid": {
    message: "Въведете шестцифрения код от имейла за възстановяване.",
    description:
      "Validation error when the recovery code is not exactly six digits",
  },
  "auth.recoveryFailed": {
    message:
      "Имейлът, кодът или паролата са неправилни или кодът е изтекъл. Можете да поискате нов имейл за възстановяване.",
    description:
      "Uniform invalid-credentials or expired-code error during sign-in recovery",
  },
  "auth.recoveryRequestFailed": {
    message: "Неуспешна заявка за имейл за възстановяване. Опитайте отново.",
    description: "Error when requesting a sign-in recovery email fails",
  },
  "auth.recoveryUnavailable": {
    message: "Влизането временно не е достъпно. Опитайте отново.",
    description: "Temporary service outage during sign-in recovery",
  },
  "auth.recoveryExpiry": {
    message:
      "Кодът изтича след 10 минути и важи за един опит за въвеждане на парола.",
    description:
      "Explains the expiry and single password-attempt limit of a recovery code",
  },
  "auth.recoverySubmit": {
    message: "Потвърждаване и вход",
    description: "Button submitting the recovery code and current password",
  },
  "auth.recoveryVerifying": {
    message: "Потвърждаване...",
    description: "Pending state while verifying the recovery code and password",
  },
};

export default bgAuth;
