export interface TranslationEntry {
  message: string;
  description: string;
}

const zhAuth: Record<string, TranslationEntry> = {
  "auth.alreadyHaveAccountQuestion": {
    message: "已有账户？",
    description: "Prompt asking if user has existing account",
  },
  "auth.and": {
    message: "和",
    description: "Conjunction between terms and privacy links",
  },
  "auth.authenticating": {
    message: "验证中...",
    description: "Message shown during authentication process",
  },
  "auth.backToSignIn": {
    message: "返回登录",
    description: "Link text to return to sign in page",
  },
  "auth.backToSignUp": {
    message: "返回注册",
    description: "Link text to return to sign up page",
  },
  "auth.confirmNewPassword": {
    message: "确认新密码",
    description: "Label for confirm password field",
  },
  "auth.confirmPassword": {
    message: "确认密码",
    description: "Label for password confirmation input field",
  },
  "auth.confirmPasswordRequired": {
    message: "请确认你的密码",
    description: "Validation error when password confirmation is missing",
  },
  "auth.confirmYourNewPassword": {
    message: "确认你的新密码",
    description: "Placeholder for confirm password input",
  },
  "auth.confirmYourPassword": {
    message: "确认你的密码",
    description: "Placeholder for password confirmation",
  },
  "auth.createAccount": {
    message: "创建账户",
    description: "Button to submit registration",
  },
  "auth.createYourAccount": {
    message: "创建你的账户",
    description: "Registration page title",
  },
  "auth.creatingAccount": {
    message: "创建账户中...",
    description: "Button state while creating account",
  },
  "auth.didNotReceiveOtp": {
    message: "没有收到验证码？",
    description: "Prompt asking if user didn't receive OTP",
  },
  "auth.dontHaveAccount": {
    message: "没有账号？",
    description: "Prompt text asking if user doesn't have account",
  },
  "auth.email": {
    message: "邮箱",
    description: "Label for email input field",
  },
  "auth.emailAddress": {
    message: "邮箱地址",
    description: "Email address field label",
  },
  "auth.emailInvalid": {
    message: "请输入有效的邮箱地址",
    description: "Validation error when email format is invalid",
  },
  "auth.emailRequired": {
    message: "需要输入邮箱",
    description: "Validation error when email is not provided",
  },
  "auth.emailSent": {
    message: "邮件已发送！",
    description: "Success title after email sent",
  },
  "auth.emailSentDescription": {
    message:
      "我们已向你的邮箱发送了密码重置链接。请检查你的收件箱并按照说明重置密码。",
    description: "Detailed success message after reset email sent",
  },
  "auth.enterDetailsToGetStarted": {
    message: "输入你的详细信息以开始使用仪表板",
    description: "Registration page description",
  },
  "auth.enterEmailForReset": {
    message: "输入你的邮箱地址，我们会向你发送重置密码的链接",
    description: "Instructions on forgot password page",
  },
  "auth.enterFirstName": {
    message: "输入你的名字",
    description: "Placeholder for first name input",
  },
  "auth.enterLastName": {
    message: "输入你的姓氏",
    description: "Placeholder for last name input",
  },
  "auth.enterNewPasswordBelow": {
    message: "在下方输入你的新密码",
    description: "Instruction for reset password form",
  },
  "auth.enterOtpCode": {
    message: "输入验证码",
    description: "Label for OTP input field",
  },
  "auth.enterUsername": {
    message: "输入你的用户名（最多16个字符）",
    description: "Placeholder for username input with character limit",
  },
  "auth.enterYourEmail": {
    message: "输入你的邮箱",
    description: "Placeholder for email input",
  },
  "auth.enterYourNewPassword": {
    message: "输入你的新密码",
    description: "Placeholder for new password input",
  },
  "auth.enterYourPassword": {
    message: "输入你的密码（至少6个字符）",
    description: "Placeholder for password input with requirement",
  },
  "auth.failedToResetPassword": {
    message: "重置密码失败。请重试。",
    description: "Error message when password reset fails",
  },
  "auth.failedToSendResetEmail": {
    message: "发送密码重置邮件失败。请重试。",
    description: "Error when reset email fails to send",
  },
  "auth.firstName": {
    message: "名",
    description: "Label for first name input field",
  },
  "auth.firstNameMaxLength": {
    message: "名字最多50个字符",
    description: "Validation error when first name is too long",
  },
  "auth.forgotPassword": {
    message: "忘记密码？",
    description: "Link text for forgot password feature",
  },
  "auth.forgotYourPassword": {
    message: "忘记密码？",
    description: "Forgot password page title",
  },
  "auth.lastName": {
    message: "姓",
    description: "Label for last name input field",
  },
  "auth.lastNameMaxLength": {
    message: "姓氏最多50个字符",
    description: "Validation error when last name is too long",
  },
  "auth.loggingOut": {
    message: "登出中",
    description: "Title shown while logging out",
  },
  "auth.loggingOutMessage": {
    message: "请稍候，正在退出登录...",
    description: "Message shown while logging out",
  },
  "auth.login": {
    message: "登录 / 注册",
    description: "Button label for login or signup",
  },
  "auth.loginFailed": {
    message: "登录失败",
    description: "Error title when login fails",
  },
  "auth.logout": {
    message: "登出",
    description: "Button label to log out",
  },
  "auth.lovedByUsers": {
    message: "深受用户喜爱",
    description: "Loved by users feature title",
  },
  "auth.lovedByUsersDescription": {
    message: "加入数千名信任 Beancount 满足其会计需求的满意用户",
    description: "Loved by users feature description",
  },
  "auth.newPassword": {
    message: "新密码",
    description: "Label for new password field",
  },
  "auth.newPasswordMinLength": {
    message: "密码至少需要6个字符",
    description: "Validation error for password length",
  },
  "auth.newPasswordMaxLength": {
    message: "密码最多不能超过128个字符",
    description:
      "Validation error when new password exceeds the maximum length",
  },
  "auth.newPasswordRequired": {
    message: "密码为必填项",
    description: "Validation error for missing new password",
  },
  "auth.otpInvalidLength": {
    message: "验证码必须是4位数字",
    description: "Validation error when OTP length is invalid",
  },
  "auth.otpRequired": {
    message: "需要输入验证码",
    description: "Validation error when OTP is missing",
  },
  "auth.otpSentToYourEmail": {
    message: "我们已向你的邮箱地址发送了4位验证码",
    description: "Message showing OTP was sent to email",
  },
  "auth.otpVerificationError": {
    message: "验证码验证过程中发生错误",
    description: "Generic error message for OTP verification",
  },
  "auth.otpVerificationFailed": {
    message: "验证码验证失败",
    description: "Error message when OTP verification fails",
  },
  "auth.password": {
    message: "密码",
    description: "Label for password input field",
  },
  "auth.passwordMinLength": {
    message: "密码至少需要6个字符",
    description: "Validation error when password is too short",
  },
  "auth.passwordMaxLength": {
    message: "密码最多不能超过128个字符",
    description: "Validation error when password exceeds the maximum length",
  },
  "auth.passwordRequired": {
    message: "需要输入密码",
    description: "Validation error when password is not provided",
  },
  "auth.passwordResetSuccessMessage": {
    message: "你的密码已重置。正在跳转到登录页面...",
    description: "Success message description",
  },
  "auth.passwordResetSuccessful": {
    message: "密码重置成功！",
    description: "Success message title",
  },
  "auth.passwordsDoNotMatch": {
    message: "密码不匹配",
    description: "Validation error when passwords don't match",
  },
  "auth.privacyPolicy": {
    message: "隐私政策",
    description: "Link text for privacy policy",
  },
  "auth.realTimeInsights": {
    message: "实时洞察",
    description: "Real-time insights feature title",
  },
  "auth.realTimeInsightsDescription": {
    message: "即时了解你的财务状况和趋势",
    description: "Real-time insights feature description",
  },
  "auth.redirectingToLogin": {
    message: "正在跳转到登录页面...",
    description: "Message shown after successful logout",
  },
  "auth.registrationFailed": {
    message: "注册失败",
    description: "Error when registration fails",
  },
  "auth.resetPasswordButton": {
    message: "重置密码",
    description: "Button text to reset password",
  },
  "auth.resetYourPassword": {
    message: "重置你的密码",
    description: "Title for reset password page",
  },
  "auth.resettingPassword": {
    message: "重置密码中...",
    description: "Button text while resetting password",
  },
  "auth.secureAccess": {
    message: "安全访问",
    description: "Secure access feature title",
  },
  "auth.secureAccessDescription": {
    message: "你的财务数据受到企业级安全保护",
    description: "Secure access feature description",
  },
  "auth.sendResetLink": {
    message: "发送重置链接",
    description: "Button to send password reset link",
  },
  "auth.sending": {
    message: "发送中...",
    description: "Button state while sending email",
  },
  "auth.sessionExpired": {
    message: "会话已过期",
    description: "Title when signup session is expired",
  },
  "auth.sessionExpiredDescription": {
    message: "注册会话已过期或无效",
    description: "Description when session is expired",
  },
  "auth.sessionExpiredMessage": {
    message: "此注册会话已过期。请重新开始注册流程。",
    description: "Alert message for expired session",
  },
  "auth.signIn": {
    message: "登录",
    description: "Button label for sign in action",
  },
  "auth.signInToAccount": {
    message: "登录你的 Beancount 账户",
    description: "Login page subtitle",
  },
  "auth.signUp": {
    message: "注册",
    description: "Button label for sign up action",
  },
  "auth.termsAgreementPrefix": {
    message: '点击"创建账户"即表示我同意 beancount.io 的',
    description: "Prefix text before terms and privacy links on sign up form",
  },
  "auth.termsOfUse": {
    message: "使用条款",
    description: "Link text for terms of use",
  },
  "auth.tokenExpired": {
    message: "令牌已过期",
    description: "Title when reset token is expired",
  },
  "auth.tokenExpiredDescription": {
    message: "密码重置令牌已过期或无效",
    description: "Description when token is expired",
  },
  "auth.tokenExpiredMessage": {
    message: "此密码重置令牌已过期。请请求新的令牌。",
    description: "Alert message for expired token",
  },
  "auth.username": {
    message: "用户名",
    description: "Username field label",
  },
  "auth.usernameLowercaseAlphanumeric": {
    message: "用户名只能包含小写字母、数字和下划线",
    description:
      "Validation error when username contains invalid characters (must be lowercase)",
  },
  "auth.usernameMaxLength": {
    message: "用户名最多16个字符",
    description: "Validation error when username too long",
  },
  "auth.usernamePublicHint": {
    message: "此用户名是公开的，对其他人可见",
    description: "Hint text explaining that username is publicly visible",
  },
  "auth.usernameRequired": {
    message: "用户名为必填项",
    description: "Validation error when username is missing",
  },
  "auth.verifyEmail": {
    message: "验证邮箱",
    description: "Button text to verify email with OTP",
  },
  "auth.verifyYourEmail": {
    message: "验证你的邮箱",
    description: "OTP verification page title",
  },
  "auth.verifying": {
    message: "验证中...",
    description: "Button text while verifying OTP",
  },
  "auth.welcomeBack": {
    message: "欢迎回来",
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
    message: "登录会话已过期，请重新登录。",
    description:
      "Banner shown on the login page when redirected here because the previous session's token expired or was revoked",
  },
  "auth.cliAuthTitle": {
    message: "授权 CLI 访问",
    description: "Title of the CLI device authorization card",
  },
  "auth.cliAuthDescription": {
    message: "Beancount CLI 正在请求访问你的账户。",
    description: "Description under the CLI authorization title",
  },
  "auth.cliAuthPermissionsIntro": {
    message: "这将允许 CLI:",
    description: "Intro line above the list of CLI permissions",
  },
  "auth.cliAuthPermissionLedgers": {
    message: "读取和写入你的账本",
    description: "CLI permission list item for reading and writing ledgers",
  },
  "auth.cliAuthPermissionAccount": {
    message: "访问你的账户信息",
    description: "CLI permission list item for accessing account information",
  },
  "auth.cliAuthAuthorize": {
    message: "授权",
    description: "Button to authorize the CLI session",
  },
  "auth.cliAuthAuthorizing": {
    message: "授权中...",
    description: "Button text while the CLI session is being authorized",
  },
  "auth.cliAuthDeny": {
    message: "拒绝",
    description: "Button to deny the CLI session",
  },
  "auth.cliAuthDenying": {
    message: "拒绝中...",
    description: "Button text while the CLI session is being denied",
  },
  "auth.cliAuthSessionExpired": {
    message: "会话已过期或不存在。",
    description: "Error shown when the CLI auth session is expired or missing",
  },
  "auth.cliAuthSuccessTitle": {
    message: "授权成功",
    description: "Title shown after the CLI session was authorized",
  },
  "auth.cliAuthSuccessDescription": {
    message: "你可以关闭此标签页并返回 CLI。",
    description: "Hint shown after successful CLI authorization",
  },
  "auth.cliAuthDeniedTitle": {
    message: "访问被拒绝",
    description: "Title shown after the CLI session was denied",
  },
  "auth.cliAuthDeniedDescription": {
    message: "你可以关闭此标签页。",
    description: "Hint shown after the CLI session was denied",
  },
  "auth.oauthIdentityWantsAccess": {
    message: "一个应用想要你使用 Beancount 账号登录。",
    description: "Identity OAuth consent page login step description",
  },
  "auth.oauthIdentityApproveTitle": {
    message: "继续登录",
    description: "Identity OAuth consent page approve step title",
  },
  "auth.oauthIdentityApproveDescription": {
    message: "这将与该应用共享你的姓名、邮箱和用户名。",
    description: "Identity OAuth consent page approve step description",
  },
  "auth.oauthIdentitySignedInAs": {
    message: "已登录为 {email}",
    description:
      "Identity OAuth consent page approve step — shows which account is authorizing",
  },
};

export default zhAuth;
