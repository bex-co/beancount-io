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
    message: "نام کاربری خود را وارد کنید (حداکثر ۱۶ کاراکتر)",
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
    message: "رمز عبور باید حداقل ۶ کاراکتر باشد",
    description: "Validation error for password length",
  },
  "auth.newPasswordMaxLength": {
    message: "رمز عبور باید حداکثر ۱۲۸ کاراکتر باشد",
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
  "auth.passwordResetSuccessMessage": {
    message: "رمز عبور شما بازنشانی شد. در حال هدایت به صفحه ورود...",
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
  "auth.signIn": {
    message: "ورود",
    description: "Button label for sign in action",
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
    message: "نام کاربری باید حداکثر ۱۶ کاراکتر باشد",
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
};

export default faAuth;
