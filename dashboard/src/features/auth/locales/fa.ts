export interface TranslationEntry {
  message: string;
  description: string;
}

const faAuth: Record<string, TranslationEntry> = {
  "auth.alreadyHaveAccountQuestion": {
    message: "قبلاً حساب کاربری دارید؟",
    description: "Prompt asking if user has existing account",
  },
  "auth.and": {
    message: "و",
    description: "Conjunction between terms and privacy links",
  },
  "auth.authenticating": {
    message: "در حال احراز هویت...",
    description: "Message shown during authentication process",
  },
  "auth.backToSignIn": {
    message: "بازگشت به صفحه ورود",
    description: "Link text to return to sign in page",
  },
  "auth.backToSignUp": {
    message: "بازگشت به ثبت‌نام",
    description: "Link text to return to sign up page",
  },
  "auth.confirmNewPassword": {
    message: "تأیید رمز عبور جدید",
    description: "Label for confirm password field",
  },
  "auth.confirmPassword": {
    message: "تأیید رمز عبور",
    description: "Label for password confirmation input field",
  },
  "auth.confirmPasswordRequired": {
    message: "لطفاً رمز عبور خود را تأیید کنید",
    description: "Validation error when password confirmation is missing",
  },
  "auth.confirmYourNewPassword": {
    message: "رمز عبور جدید خود را تأیید کنید",
    description: "Placeholder for confirm password input",
  },
  "auth.confirmYourPassword": {
    message: "رمز عبور خود را تأیید کنید",
    description: "Placeholder for password confirmation",
  },
  "auth.chooseYourPassword": {
    message: "یک رمز عبور انتخاب کنید (حداقل ۸ کاراکتر)",
    description:
      "Placeholder for the password a new account chooses, with the minimum length",
  },
  "auth.createAccount": {
    message: "ایجاد حساب کاربری",
    description: "Button to submit registration",
  },
  "auth.createYourAccount": {
    message: "حساب کاربری خود را ایجاد کنید",
    description: "Registration page title",
  },
  "auth.creatingAccount": {
    message: "در حال ایجاد حساب کاربری...",
    description: "Button state while creating account",
  },
  "auth.didNotReceiveOtp": {
    message: "کد را دریافت نکردید؟",
    description: "Prompt asking if user didn't receive OTP",
  },
  "auth.dontHaveAccount": {
    message: "حساب کاربری ندارید؟",
    description: "Prompt text asking if user doesn't have account",
  },
  "auth.email": {
    message: "ایمیل",
    description: "Label for email input field",
  },
  "auth.emailAddress": {
    message: "آدرس ایمیل",
    description: "Email address field label",
  },
  "auth.emailInvalid": {
    message: "لطفاً یک آدرس ایمیل معتبر وارد کنید",
    description: "Validation error when email format is invalid",
  },
  "auth.emailRequired": {
    message: "ایمیل الزامی است",
    description: "Validation error when email is not provided",
  },
  "auth.emailSent": {
    message: "ایمیل ارسال شد!",
    description: "Success title after email sent",
  },
  "auth.emailSentDescription": {
    message:
      "لینک بازنشانی رمز عبور به آدرس ایمیل شما ارسال شد. لطفاً صندوق ورودی خود را بررسی کنید و دستورالعمل‌ها را برای بازنشانی رمز عبور دنبال کنید.",
    description: "Detailed success message after reset email sent",
  },
  "auth.emailUnavailable": {
    message: "این سرور نمی‌تواند ایمیل ارسال کند",
    description:
      "Title on the forgot-password page when the server has no mail provider",
  },
  "auth.emailUnavailableDescription": {
    message:
      "ایمیل بازنشانی رمز عبور از این سرور ارسال نمی‌شود. از شخصی که این سرور Beancount.io را اداره می‌کند (اپراتور آن) یک لینک یک‌بارمصرف برای بازنشانی رمز عبور بخواهید.",
    description:
      "Forgot-password page text when the server cannot send email; tells the user to ask the server operator for a reset link",
  },
  "auth.enterDetailsToGetStarted": {
    message: "اطلاعات خود را برای شروع کار با داشبورد وارد کنید",
    description: "Registration page description",
  },
  "auth.enterEmailForReset": {
    message:
      "آدرس ایمیل خود را وارد کنید و ما لینک بازنشانی رمز عبور را برای شما ارسال خواهیم کرد",
    description: "Instructions on forgot password page",
  },
  "auth.enterFirstName": {
    message: "نام خود را وارد کنید",
    description: "Placeholder for first name input",
  },
  "auth.enterLastName": {
    message: "نام خانوادگی خود را وارد کنید",
    description: "Placeholder for last name input",
  },
  "auth.enterNewPasswordBelow": {
    message: "رمز عبور جدید خود را در زیر وارد کنید",
    description: "Instruction for reset password form",
  },
  "auth.enterOtpCode": {
    message: "کد را وارد کنید",
    description: "Label for OTP input field",
  },
  "auth.enterUsername": {
    message: "نام کاربری خود را وارد کنید (حداکثر ۲۰ کاراکتر)",
    description: "Placeholder for username input with character limit",
  },
  "auth.enterYourEmail": {
    message: "ایمیل خود را وارد کنید",
    description: "Placeholder for email input",
  },
  "auth.enterYourNewPassword": {
    message: "رمز عبور جدید خود را وارد کنید",
    description: "Placeholder for new password input",
  },
  "auth.enterYourPassword": {
    message: "رمز عبور خود را وارد کنید (حداقل ۶ کاراکتر)",
    description: "Placeholder for password input with requirement",
  },
  "auth.failedToResetPassword": {
    message: "بازنشانی رمز عبور ناموفق بود. لطفاً دوباره تلاش کنید.",
    description: "Error message when password reset fails",
  },
  "auth.failedToSendResetEmail": {
    message:
      "ارسال ایمیل بازنشانی رمز عبور ناموفق بود. لطفاً دوباره تلاش کنید.",
    description: "Error when reset email fails to send",
  },
  "auth.firstName": {
    message: "نام",
    description: "Label for first name input field",
  },
  "auth.firstNameMaxLength": {
    message: "نام باید حداکثر ۵۰ کاراکتر باشد",
    description: "Validation error when first name is too long",
  },
  "auth.forgotPassword": {
    message: "رمز عبور را فراموش کرده‌اید؟",
    description: "Link text for forgot password feature",
  },
  "auth.forgotYourPassword": {
    message: "رمز عبور خود را فراموش کرده‌اید؟",
    description: "Forgot password page title",
  },
  "auth.lastName": {
    message: "نام خانوادگی",
    description: "Label for last name input field",
  },
  "auth.lastNameMaxLength": {
    message: "نام خانوادگی باید حداکثر ۵۰ کاراکتر باشد",
    description: "Validation error when last name is too long",
  },
  "auth.loggingOut": {
    message: "در حال خروج",
    description: "Title shown while logging out",
  },
  "auth.loggingOutMessage": {
    message: "لطفاً منتظر بمانید تا از سیستم خارج شوید...",
    description: "Message shown while logging out",
  },
  "auth.login": {
    message: "ورود / ثبت نام",
    description: "Button label for login or signup",
  },
  "auth.loginFailed": {
    message: "ورود ناموفق بود",
    description: "Error title when login fails",
  },
  "auth.loginRateLimited": {
    message:
      "تعداد تلاش‌های ورود بیش از حد است. چند دقیقه صبر کنید و دوباره امتحان کنید، یا رمز عبور خود را بازنشانی کنید.",
    description:
      "Shown on any password sign-in form when sign-in is rate limited, by address or by too many wrong passwords for the account",
  },
  "auth.logout": {
    message: "خروج",
    description: "Button label to log out",
  },
  "auth.lovedByUsers": {
    message: "محبوب کاربران",
    description: "Loved by users feature title",
  },
  "auth.lovedByUsersDescription": {
    message:
      "به هزاران کاربر راضی بپیوندید که به Beancount برای نیازهای حسابداری خود اعتماد دارند",
    description: "Loved by users feature description",
  },
  "auth.newPassword": {
    message: "رمز عبور جدید",
    description: "Label for new password field",
  },
  "auth.newPasswordMinLength": {
    message: "رمز عبور باید حداقل ۸ کاراکتر باشد",
    description: "Validation error for password length",
  },
  "auth.newPasswordMaxLength": {
    message:
      "رمز عبور خیلی طولانی است. حداکثر ۷۲ کاراکتر استفاده کنید؛ حروف دارای اعراب، خط‌های غیرلاتین (از جمله فارسی) و ایموجی‌ها هر کدام ۲ تا ۴ کاراکتر حساب می‌شوند.",
    description:
      "Validation error when new password exceeds the maximum length",
  },
  "auth.newPasswordRequired": {
    message: "رمز عبور الزامی است",
    description: "Validation error for missing new password",
  },
  "auth.otpInvalidLength": {
    message: "کد OTP باید 4 رقم باشد",
    description: "Validation error when OTP length is invalid",
  },
  "auth.otpRequired": {
    message: "کد OTP الزامی است",
    description: "Validation error when OTP is missing",
  },
  "auth.otpSentToYourEmail": {
    message: "ما یک کد 4 رقمی به آدرس ایمیل شما ارسال کرده‌ایم",
    description: "Message showing OTP was sent to email",
  },
  "auth.otpVerificationError": {
    message: "در طول تأیید OTP خطایی رخ داد",
    description: "Generic error message for OTP verification",
  },
  "auth.otpVerificationFailed": {
    message: "تأیید OTP ناموفق بود",
    description: "Error message when OTP verification fails",
  },
  "auth.password": {
    message: "رمز عبور",
    description: "Label for password input field",
  },
  "auth.passwordMinLength": {
    message: "رمز عبور باید حداقل ۶ کاراکتر باشد",
    description: "Validation error when password is too short",
  },
  "auth.passwordMaxLength": {
    message: "رمز عبور باید حداکثر ۱۲۸ کاراکتر باشد",
    description: "Validation error when password exceeds the maximum length",
  },
  "auth.passwordRequired": {
    message: "رمز عبور الزامی است",
    description: "Validation error when password is not provided",
  },
  "auth.passwordBreached": {
    message:
      "این رمز عبور در یک نشت اطلاعات دیده شده است. رمزی را انتخاب کنید که در هیچ جای دیگری از آن استفاده نمی‌کنید.",
    description:
      "Error when the server finds the new password in a known data breach (Have I Been Pwned)",
  },
  "auth.passwordTooSimilar": {
    message: "رمز عبور بیش از حد به ایمیل یا نام کاربری شما شبیه است.",
    description:
      "Error when the new password is too close to the account's email or username",
  },
  "auth.passwordResetSuccessMessage": {
    message:
      "رمز عبور شما بازنشانی شد و از همه دستگاه‌ها و برنامه‌های متصل خارج شدید. در حال هدایت به صفحه ورود...",
    description: "Success message description",
  },
  "auth.passwordResetSuccessful": {
    message: "بازنشانی رمز عبور موفقیت‌آمیز بود!",
    description: "Success message title",
  },
  "auth.passwordsDoNotMatch": {
    message: "رمزهای عبور مطابقت ندارند",
    description: "Validation error when passwords don't match",
  },
  "auth.privacyPolicy": {
    message: "سیاست حفظ حریم خصوصی",
    description: "Link text for privacy policy",
  },
  "auth.realTimeInsights": {
    message: "بینش‌های لحظه‌ای",
    description: "Real-time insights feature title",
  },
  "auth.realTimeInsightsDescription": {
    message: "دید فوری از وضعیت مالی و روندهای خود دریافت کنید",
    description: "Real-time insights feature description",
  },
  "auth.redirectingToLogin": {
    message: "در حال هدایت به صفحه ورود...",
    description: "Message shown after successful logout",
  },
  "auth.registrationFailed": {
    message: "ثبت نام ناموفق بود",
    description: "Error when registration fails",
  },
  "auth.resetPasswordButton": {
    message: "بازنشانی رمز عبور",
    description: "Button text to reset password",
  },
  "auth.resetYourPassword": {
    message: "رمز عبور خود را بازنشانی کنید",
    description: "Title for reset password page",
  },
  "auth.resettingPassword": {
    message: "در حال بازنشانی رمز عبور...",
    description: "Button text while resetting password",
  },
  "auth.secureAccess": {
    message: "دسترسی امن",
    description: "Secure access feature title",
  },
  "auth.secureAccessDescription": {
    message: "داده‌های مالی شما با امنیت در سطح سازمانی محافظت می‌شوند",
    description: "Secure access feature description",
  },
  "auth.sendResetLink": {
    message: "ارسال لینک بازنشانی",
    description: "Button to send password reset link",
  },
  "auth.sending": {
    message: "در حال ارسال...",
    description: "Button state while sending email",
  },
  "auth.sessionExpired": {
    message: "جلسه منقضی شده",
    description: "Title when signup session is expired",
  },
  "auth.sessionExpiredDescription": {
    message: "جلسه ثبت‌نام منقضی شده یا نامعتبر است",
    description: "Description when session is expired",
  },
  "auth.sessionExpiredMessage": {
    message:
      "این جلسه ثبت‌نام منقضی شده است. لطفاً فرآیند ثبت‌نام را دوباره شروع کنید.",
    description: "Alert message for expired session",
  },
  "auth.scriptRequired": {
    message:
      "ورود به JavaScript نیاز دارد. لطفاً آن را فعال کنید و صفحه را دوباره بارگذاری کنید.",
    description:
      "Notice shown in place of the submit button when JavaScript is unavailable, explaining why sign-in and registration cannot be completed. Rendered inside <noscript>.",
  },
  "auth.signIn": {
    message: "ورود",
    description: "Button label for sign in action",
  },
  "auth.signInWith": {
    message: "ورود با {name}",
    description:
      "Button label to sign in with the identity provider set up by the operator; {name} is its name",
  },
  "auth.oidcErrorEmailInUse": {
    message:
      "حسابی با این ایمیل از قبل وجود دارد. با رمز عبور خود وارد شوید و سپس آن را در تنظیمات پیوند دهید.",
    description:
      "Error after provider sign-in when the email already belongs to an account",
  },
  "auth.oidcErrorEmailUnverified": {
    message: "ارائه‌دهندهٔ ورود، ایمیل شما را تأیید نکرده است.",
    description:
      "Error after provider sign-in when the provider has not verified the email",
  },
  "auth.oidcErrorBlocked": {
    message: "این حساب مسدود است.",
    description: "Error after provider sign-in when the account is blocked",
  },
  "auth.oidcErrorAlreadyLinked": {
    message: "این ورود قبلاً به حساب دیگری پیوند داده شده است.",
    description:
      "Error when the provider identity is already linked to another account",
  },
  "auth.oidcErrorAccountLinked": {
    message: "این حساب از قبل به ورود دیگری متصل است.",
    description:
      "Error when the account is already linked to a different provider identity",
  },
  "auth.oidcErrorFailed": {
    message: "ورود ناموفق بود. لطفاً دوباره تلاش کنید.",
    description: "Generic error when provider sign-in fails",
  },
  "auth.oidcLinked": {
    message: "حساب شما پیوند داده شده است. می‌توانید با {name} وارد شوید.",
    description:
      "Settings text when the account is linked to the provider; {name} is its name",
  },
  "auth.oidcNotLinked": {
    message: "حساب {name} خود را پیوند دهید تا با آن وارد شوید.",
    description:
      "Settings text when the account is not linked to the provider; {name} is its name",
  },
  "auth.oidcLink": {
    message: "پیوند",
    description: "Settings button to link the provider",
  },
  "auth.oidcUnlink": {
    message: "لغو پیوند",
    description: "Settings button to unlink the provider",
  },
  "auth.oidcUnlinkNeedsPassword": {
    message:
      "حساب شما رمز عبور ندارد. پیش از لغو پیوند، با «فراموشی رمز عبور» یکی تنظیم کنید.",
    description: "Error when unlinking an account that has no password",
  },
  "auth.signInToAccount": {
    message: "وارد حساب Beancount خود شوید",
    description: "Login page subtitle",
  },
  "auth.signUp": {
    message: "ثبت نام",
    description: "Button label for sign up action",
  },
  "auth.termsAgreementPrefix": {
    message:
      'با کلیک بر روی "ایجاد حساب کاربری"، با شرایط beancount.io موافقت می‌کنم',
    description: "Prefix text before terms and privacy links on sign up form",
  },
  "auth.termsOfUse": {
    message: "شرایط استفاده",
    description: "Link text for terms of use",
  },
  "auth.tokenExpired": {
    message: "توکن منقضی شده",
    description: "Title when reset token is expired",
  },
  "auth.tokenExpiredDescription": {
    message: "توکن بازنشانی رمز عبور منقضی یا نامعتبر است",
    description: "Description when token is expired",
  },
  "auth.tokenValidationUnavailable": {
    message: "بررسی پیوند بازنشانی ممکن نشد",
    description: "Title when the reset-token validation request itself fails",
  },
  "auth.tokenValidationUnavailableDescription": {
    message:
      "برای بررسی پیوند بازنشانی گذرواژه نتوانستیم به سرور دسترسی پیدا کنیم. ممکن است پیوند شما هنوز معتبر باشد — لطفاً دوباره تلاش کنید.",
    description: "Explanation shown when reset-token validation is unavailable",
  },
  "auth.tokenExpiredMessage": {
    message:
      "این توکن بازنشانی رمز عبور منقضی شده است. لطفاً یک توکن جدید درخواست کنید.",
    description: "Alert message for expired token",
  },
  "auth.username": {
    message: "نام کاربری",
    description: "Username field label",
  },
  "auth.usernameLowercaseAlphanumeric": {
    message: "نام کاربری فقط می‌تواند شامل حروف کوچک، اعداد و خط زیرین باشد",
    description:
      "Validation error when username contains invalid characters (must be lowercase)",
  },
  "auth.usernameMaxLength": {
    message: "نام کاربری باید حداکثر ۲۰ کاراکتر باشد",
    description: "Validation error when username too long",
  },
  "auth.usernamePublicHint": {
    message: "این نام کاربری عمومی است و برای دیگران قابل مشاهده است",
    description: "Hint text explaining that username is publicly visible",
  },
  "auth.usernameRequired": {
    message: "نام کاربری الزامی است",
    description: "Validation error when username is missing",
  },
  "auth.verifyEmail": {
    message: "تأیید ایمیل",
    description: "Button text to verify email with OTP",
  },
  "auth.verifyYourEmail": {
    message: "ایمیل خود را تأیید کنید",
    description: "OTP verification page title",
  },
  "auth.verifying": {
    message: "در حال تأیید...",
    description: "Button text while verifying OTP",
  },
  "auth.welcomeBack": {
    message: "خوش آمدید",
    description: "Login page welcome title",
  },
  "auth.oauthSignInToContinue": {
    message: "برای ادامه وارد شوید",
    description: "OAuth consent page login step title",
  },
  "auth.oauthAppWantsAccess": {
    message: "یک برنامه می‌خواهد به دفتر Beancount شما دسترسی پیدا کند.",
    description: "OAuth consent page login step description",
  },
  "auth.oauthRequesterHeading": {
    message: "چه کسی درخواست می‌دهد",
    description:
      "OAuth consent: label of the section naming the requesting app",
  },
  "auth.oauthRequesterRedirect": {
    message: "پس از تأیید، به {host} بازمی‌گردید.",
    description:
      "OAuth consent: where the authorization code is sent ({host} is the redirect host)",
  },
  "auth.oauthRequesterName": {
    message:
      "این برنامه خود را «{name}» می‌نامد. برنامه‌ها نام خود را خودشان انتخاب می‌کنند، پس نشانی بالا را بررسی کنید.",
    description:
      "OAuth consent: the app's self-asserted name ({name}), labelled as its own claim",
  },
  "auth.oauthRequesterUnnamed": {
    message: "این برنامه نامی ارائه نکرده است. نشانی بالا را بررسی کنید.",
    description: "OAuth consent: shown when the app gave no name",
  },
  "auth.oauthRequesterVouchedBy": {
    message: "اطلاعات آن توسط {host} منتشر می‌شود.",
    description:
      "OAuth consent: the domain publishing a CIMD client's metadata ({host})",
  },
  "auth.oauthRequesterLoopbackWarning": {
    message:
      "این برنامه فقط به رایانهٔ خود شما بازمی‌گردد. هر برنامه‌ای که روی آن اجرا می‌شود ممکن است این درخواست را آغاز کرده باشد — فقط اگر همین حالا اتصال برنامه‌ای را شروع کرده‌اید تأیید کنید.",
    description:
      "OAuth consent: warning when every redirect is the user's own computer (loopback)",
  },
  "auth.oauthRequesterUnavailable": {
    message:
      "این درخواست شناسایی نشد. ممکن است منقضی شده باشد — به برنامهٔ خود برگردید و دوباره متصل شوید.",
    description:
      "OAuth consent: the requesting app could not be identified; approval is disabled",
  },
  "auth.oauthAllLedgers": {
    message: "همه دفترهای قابل دسترسی",
    description: "MCP account-wide consent option",
  },
  "auth.oauthAllLedgersDescription": {
    message:
      "اقدامات درخواستی را در دفترهایی که اکنون یا در آینده به آنها دسترسی دارید، و عملیات حساب مجاز با این دسترسی‌ها، اجازه دهید.",
    description: "MCP account-wide consent explanation",
  },
  "auth.oauthChooseLedger": {
    message: "یک دفتر انتخاب کنید",
    description: "OAuth consent page ledger step title",
  },
  "auth.oauthSelectLedger": {
    message: "انتخاب کنید به کدام دفتر دسترسی داده شود.",
    description: "OAuth consent page ledger step description",
  },
  "auth.oauthApproveAccess": {
    message: "تأیید دسترسی",
    description: "OAuth consent page approve button",
  },
  "auth.oauthNoLedgersMessage": {
    message: "هیچ دفتری یافت نشد.",
    description: "OAuth consent page empty ledger state message",
  },
  "auth.oauthRegisterToContinue": {
    message: "برای ادامه یک حساب کاربری بسازید",
    description: "OAuth consent page register step title",
  },
  "auth.oauthVerifyEmailToContinue": {
    message: "برای ادامه ایمیل خود را تأیید کنید",
    description: "OAuth consent page OTP step title",
  },
  "auth.loginSessionExpiredMessage": {
    message: "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.",
    description:
      "Banner shown on the login page when redirected here because the previous session's token expired or was revoked",
  },
  "auth.cliAuthTitle": {
    message: "مجوز دسترسی CLI",
    description: "Title of the CLI device authorization card",
  },
  "auth.cliAuthDescription": {
    message:
      "رابط خط فرمان Beancount درخواست دسترسی به حساب کاربری شما را دارد.",
    description: "Description under the CLI authorization title",
  },
  "auth.cliAuthPermissionsIntro": {
    message: "این کار به CLI اجازه می‌دهد:",
    description: "Intro line above the list of CLI permissions",
  },
  "auth.cliAuthPermissionLedgers": {
    message: "خواندن و نوشتن دفاتر کل شما",
    description: "CLI permission list item for reading and writing ledgers",
  },
  "auth.cliAuthPermissionAccount": {
    message: "دسترسی به اطلاعات حساب کاربری شما",
    description: "CLI permission list item for accessing account information",
  },
  "auth.cliAuthAuthorize": {
    message: "مجاز کردن",
    description: "Button to authorize the CLI session",
  },
  "auth.cliAuthAuthorizing": {
    message: "در حال مجاز کردن...",
    description: "Button text while the CLI session is being authorized",
  },
  "auth.cliAuthDeny": {
    message: "رد کردن",
    description: "Button to deny the CLI session",
  },
  "auth.cliAuthDenying": {
    message: "در حال رد کردن...",
    description: "Button text while the CLI session is being denied",
  },
  "auth.cliAuthSessionExpired": {
    message: "جلسه منقضی شده یا یافت نشد.",
    description: "Error shown when the CLI auth session is expired or missing",
  },
  "auth.cliAuthCodeUnknown": {
    message:
      "این کد ناشناخته است یا منقضی شده است. برای گرفتن کد جدید، دوباره `bea login` را در ترمینال اجرا کنید.",
    description:
      "Error when the entered CLI one-time code is unknown or expired; tells the user to rerun bea login",
  },
  "auth.cliAuthSuccessTitle": {
    message: "مجوز با موفقیت انجام شد",
    description: "Title shown after the CLI session was authorized",
  },
  "auth.cliAuthSuccessDescription": {
    message: "می‌توانید این برگه را ببندید و به CLI بازگردید.",
    description: "Hint shown after successful CLI authorization",
  },
  "auth.cliAuthDeniedTitle": {
    message: "دسترسی رد شد",
    description: "Title shown after the CLI session was denied",
  },
  "auth.cliAuthDeniedDescription": {
    message: "می‌توانید این برگه را ببندید.",
    description: "Hint shown after the CLI session was denied",
  },
  "auth.cliAuthCodeEntryTitle": {
    message: "مجاز کردن یک دستگاه",
    description: "Title of the CLI device code entry card",
  },
  "auth.cliAuthCodeEntryDescription": {
    message: "کد یک‌بارمصرف نمایش‌داده‌شده در ترمینال خود را وارد کنید.",
    description: "Description under the CLI device code entry title",
  },
  "auth.cliAuthCodeLabel": {
    message: "کد یک‌بارمصرف",
    description: "Label of the CLI one-time code input",
  },
  "auth.cliAuthCodeContinue": {
    message: "ادامه",
    description: "Button to submit the entered CLI one-time code",
  },
  "auth.cliAuthCodeInvalid": {
    message: "کد ۸ نویسه‌ای نمایش‌داده‌شده در ترمینال خود را وارد کنید.",
    description: "Error shown when the entered CLI code is not the right shape",
  },
  "auth.cliAuthRequestedBy": {
    message: "درخواست از",
    description: "Heading above the requesting device's reported details",
  },
  "auth.cliAuthClientLabel": {
    message: "کلاینت",
    description: "Label for the requesting client's name",
  },
  "auth.cliAuthDeviceLabel": {
    message: "دستگاه",
    description: "Label for the requesting device's machine name",
  },
  "auth.cliAuthPlatformLabel": {
    message: "سیستم",
    description: "Label for the requesting device's operating system",
  },
  "auth.cliAuthIpLabel": {
    message: "نشانی IP",
    description: "Label for the requesting device's IP address",
  },
  "auth.cliAuthSelfReported": {
    message:
      "این اطلاعات را خود دستگاه گزارش کرده است. تنها در صورتی تأیید کنید که همان ترمینالی باشد که همین حالا استفاده کردید.",
    description:
      "Warning that the requesting device's details are self-reported",
  },
  "auth.cliAuthUseAnotherCode": {
    message: "استفاده از کد دیگر",
    description: "Button to enter a different CLI one-time code",
  },
  "auth.cliAuthPermissionExpiry": {
    message: "۳۰ روز روی آن دستگاه وارد بمانید",
    description:
      "CLI permission list item for how long the device stays signed in",
  },
  "auth.oauthIdentityWantsAccess": {
    message: "یک برنامه می‌خواهد با حساب Beancount خود وارد شوید.",
    description: "Identity OAuth consent page login step description",
  },
  "auth.oauthIdentityApproveTitle": {
    message: "ادامه برای ورود",
    description: "Identity OAuth consent page approve step title",
  },
  "auth.oauthIdentityApproveDescription": {
    message:
      "این کار نام، ایمیل و نام کاربری شما را با برنامه به اشتراک می‌گذارد.",
    description: "Identity OAuth consent page approve step description",
  },
  "auth.oauthIdentitySignedInAs": {
    message: "وارد شده به‌عنوان {email}",
    description:
      "Identity OAuth consent page approve step — shows which account is authorizing",
  },
  "auth.hidePassword": {
    message: "پنهان کردن رمز عبور",
    description: "Accessible label for hiding a password",
  },
  "auth.showPassword": {
    message: "نمایش رمز عبور",
    description: "Accessible label for showing a password",
  },
  "auth.oauthLedgerRequired": {
    message: "لطفا یک دفتر کل انتخاب کنید.",
    description: "Validation shown when OAuth consent has no selected ledger",
  },
  "auth.oauthMobileSignInTitle": {
    message: "ورود به Beancount",
    description:
      "Mobile OAuth login step title — first-party app, so it names the product rather than asking for access",
  },
  "auth.oauthMobileRegisterTitle": {
    message: "حساب Beancount خود را بسازید",
    description: "Mobile OAuth register step title",
  },
  "auth.oauthMobileChooseAccountTitle": {
    message: "برنامه از کدام حساب استفاده کند؟",
    description:
      "Mobile OAuth step shown when the browser is signed in but the app's Sign Up button started the flow",
  },
  "auth.oauthMobileContinueAs": {
    message: "ادامه به عنوان {email}",
    description:
      "Mobile OAuth button that keeps the signed-in browser account; {email} is the account",
  },
  "auth.oauthMobileCreateDifferentAccount": {
    message: "ساخت حساب دیگر",
    description:
      "Mobile OAuth button that signs the browser out and opens registration",
  },
  "auth.oauthMobileAllowTitle": {
    message: "Beancount Mobile مجاز است؟",
    description: "Mobile OAuth approval title",
  },
  "auth.oauthMobileGrantDescription": {
    message: "این کمک هزینه در کل حساب به برنامه اجازه می دهد:",
    description: "Introduction to mobile OAuth permissions",
  },
  "auth.oauthSwitchAccountFailed": {
    message: "تغییر حساب انجام نشد. لطفا دوباره امتحان کنید.",
    description: "Error shown when OAuth account switching fails",
  },
  "auth.oauthUseAnotherAccount": {
    message: "از حساب دیگری استفاده کنید",
    description: "Button for switching OAuth accounts",
  },
  "auth.oauthMobileScopeIdentity": {
    message: "حساب مورد تایید خود را شناسایی کنید",
    description: "Description of the OpenID mobile permission",
  },
  "auth.oauthMobileScopeOfflineAccess": {
    message: "تا زمانی که دسترسی را لغو نکنید، به طور ایمن وارد سیستم بمانید",
    description: "Description of the offline access mobile permission",
  },
  "auth.oauthMobileScopeRead": {
    message: "دفتر کل خود را بخوانید",
    description: "Description of the ledger read mobile permission",
  },
  "auth.oauthMobileScopeWrite": {
    message: "داده های دفتر کل را ایجاد و به روز کنید",
    description: "Description of the ledger write mobile permission",
  },
  "auth.oauthMobileScopeAdmin": {
    message: "دفتر کل و همکاران را مدیریت کنید",
    description: "Description of the ledger admin mobile permission",
  },
  "auth.recoveryTitle": {
    message: "برای ورود، ایمیل خود را تأیید کنید",
    description:
      "Title of the email ownership verification step for sign-in recovery",
  },
  "auth.recoveryDescription": {
    message:
      "پیوند موجود در ایمیل بازیابی را باز کنید، سپس کد آن و گذرواژهٔ فعلی خود را وارد کنید.",
    description: "Instructions for continuing from the sign-in recovery email",
  },
  "auth.recoverySendEmail": {
    message: "ارسال ایمیل بازیابی",
    description: "Button requesting a sign-in recovery email",
  },
  "auth.recoverySending": {
    message: "در حال ارسال ایمیل بازیابی...",
    description: "Pending state while requesting a sign-in recovery email",
  },
  "auth.recoverySent": {
    message:
      "اگر حسابی با این نشانی وجود داشته باشد، به‌زودی ایمیل بازیابی دریافت می‌کنید. برای ادامه، پیوند آن را باز کنید. ایمیل بازیابی که به‌تازگی دریافت کرده‌اید همچنان معتبر است.",
    description:
      "Uniform confirmation after requesting recovery; previous valid recovery emails remain usable",
  },
  "auth.recoveryResend": {
    message: "ارسال دوبارهٔ ایمیل بازیابی",
    description: "Button requesting another sign-in recovery email",
  },
  "auth.recoveryRetryAt": {
    message: "در ساعت {time} دوباره تلاش کنید.",
    description:
      "Absolute local retry time after throttling; {time} is formatted using the active locale",
  },
  "auth.recoveryCode": {
    message: "کد تأیید شش‌رقمی",
    description: "Accessible label for the sign-in recovery email code",
  },
  "auth.recoveryCodeInvalid": {
    message: "کد شش‌رقمی ایمیل بازیابی را وارد کنید.",
    description:
      "Validation error when the recovery code is not exactly six digits",
  },
  "auth.recoveryFailed": {
    message:
      "ایمیل، کد یا گذرواژه نادرست است، یا کد منقضی شده است. می‌توانید ایمیل بازیابی جدیدی درخواست کنید.",
    description:
      "Uniform invalid-credentials or expired-code error during sign-in recovery",
  },
  "auth.recoveryRequestFailed": {
    message: "درخواست ایمیل بازیابی انجام نشد. دوباره تلاش کنید.",
    description: "Error when requesting a sign-in recovery email fails",
  },
  "auth.recoveryUnavailable": {
    message: "ورود به حساب موقتاً در دسترس نیست. دوباره تلاش کنید.",
    description: "Temporary service outage during sign-in recovery",
  },
  "auth.recoveryExpiry": {
    message:
      "کد پس از ۱۰ دقیقه منقضی می‌شود و فقط برای یک بار وارد کردن گذرواژه معتبر است.",
    description:
      "Explains the expiry and single password-attempt limit of a recovery code",
  },
  "auth.recoverySubmit": {
    message: "تأیید و ورود",
    description: "Button submitting the recovery code and current password",
  },
  "auth.recoveryVerifying": {
    message: "در حال تأیید...",
    description: "Pending state while verifying the recovery code and password",
  },
};

export default faAuth;
