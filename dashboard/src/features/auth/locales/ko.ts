import type { TranslationEntry } from "@/i18n";

const koAuth: Record<string, TranslationEntry> = {
  "auth.alreadyHaveAccountQuestion": {
    message: "이미 계정이 있으신가요?",
    description: "Prompt asking if user has existing account",
  },
  "auth.backToSignIn": {
    message: "로그인으로 돌아가기",
    description: "Link text to return to sign in page",
  },
  "auth.confirmNewPassword": {
    message: "새 비밀번호 확인",
    description: "Label for confirm password field",
  },
  "auth.confirmPassword": {
    message: "비밀번호 확인",
    description: "Label for password confirmation input field",
  },
  "auth.confirmPasswordRequired": {
    message: "비밀번호를 확인해 주세요",
    description: "Validation error when password confirmation is missing",
  },
  "auth.confirmYourNewPassword": {
    message: "새 비밀번호를 확인해 주세요",
    description: "Placeholder for confirm password input",
  },
  "auth.confirmYourPassword": {
    message: "비밀번호를 확인해 주세요",
    description: "Placeholder for password confirmation",
  },
  "auth.createAccount": {
    message: "계정 만들기",
    description: "Button to submit registration",
  },
  "auth.createYourAccount": {
    message: "계정을 만드세요",
    description: "Registration page title",
  },
  "auth.creatingAccount": {
    message: "계정 생성 중...",
    description: "Button state while creating account",
  },
  "auth.dontHaveAccount": {
    message: "계정이 없으신가요?",
    description: "Prompt text asking if user doesn't have account",
  },
  "auth.email": {
    message: "이메일",
    description: "Label for email input field",
  },
  "auth.emailAddress": {
    message: "이메일 주소",
    description: "Email address field label",
  },
  "auth.emailInvalid": {
    message: "유효한 이메일 주소를 입력해 주세요",
    description: "Validation error when email format is invalid",
  },
  "auth.emailRequired": {
    message: "이메일은 필수입니다",
    description: "Validation error when email is not provided",
  },
  "auth.emailSent": {
    message: "이메일을 보냈습니다!",
    description: "Success title after email sent",
  },
  "auth.emailSentDescription": {
    message:
      "이메일 주소로 비밀번호 재설정 링크를 보냈습니다. 받은 편지함을 확인하고 안내에 따라 비밀번호를 재설정해 주세요.",
    description: "Detailed success message after reset email sent",
  },
  "auth.enterDetailsToGetStarted": {
    message: "대시보드를 시작하기 위해 정보를 입력하세요",
    description: "Registration page description",
  },
  "auth.enterEmailForReset": {
    message: "이메일 주소를 입력하면 비밀번호 재설정 링크를 보내드립니다",
    description: "Instructions on forgot password page",
  },
  "auth.enterNewPasswordBelow": {
    message: "아래에 새 비밀번호를 입력하세요",
    description: "Instruction for reset password form",
  },
  "auth.enterUsername": {
    message: "사용자 이름을 입력하세요 (소문자, 최대 20자)",
    description: "Placeholder for username input with character limit",
  },
  "auth.enterYourEmail": {
    message: "이메일을 입력하세요",
    description: "Placeholder for email input",
  },
  "auth.enterYourNewPassword": {
    message: "새 비밀번호를 입력하세요",
    description: "Placeholder for new password input",
  },
  "auth.enterYourPassword": {
    message: "비밀번호를 입력하세요 (최소 6자)",
    description: "Placeholder for password input with requirement",
  },
  "auth.firstName": {
    message: "이름",
    description: "Label for first name input field",
  },
  "auth.lastName": {
    message: "성",
    description: "Label for last name input field",
  },
  "auth.enterFirstName": {
    message: "이름을 입력하세요",
    description: "Placeholder for first name input",
  },
  "auth.enterLastName": {
    message: "성을 입력하세요",
    description: "Placeholder for last name input",
  },
  "auth.firstNameMaxLength": {
    message: "이름은 최대 50자까지 입력할 수 있습니다",
    description: "Validation error when first name is too long",
  },
  "auth.lastNameMaxLength": {
    message: "성은 최대 50자까지 입력할 수 있습니다",
    description: "Validation error when last name is too long",
  },
  "auth.failedToResetPassword": {
    message: "비밀번호 재설정에 실패했습니다. 다시 시도해 주세요.",
    description: "Error message when password reset fails",
  },
  "auth.failedToSendResetEmail": {
    message: "비밀번호 재설정 이메일 전송에 실패했습니다. 다시 시도해 주세요.",
    description: "Error when reset email fails to send",
  },
  "auth.forgotPassword": {
    message: "비밀번호를 잊으셨나요?",
    description: "Link text for forgot password feature",
  },
  "auth.forgotYourPassword": {
    message: "비밀번호를 잊으셨나요?",
    description: "Forgot password page title",
  },
  "auth.loggingOut": {
    message: "로그아웃 중",
    description: "Title shown while logging out",
  },
  "auth.loggingOutMessage": {
    message: "로그아웃 중입니다. 잠시 기다려 주세요...",
    description: "Message shown while logging out",
  },
  "auth.login": {
    message: "로그인 / 회원가입",
    description: "Button label for login or signup",
  },
  "auth.loginFailed": {
    message: "로그인에 실패했습니다",
    description: "Error title when login fails",
  },
  "auth.logout": {
    message: "로그아웃",
    description: "Button label to log out",
  },
  "auth.newPassword": {
    message: "새 비밀번호",
    description: "Label for new password field",
  },
  "auth.newPasswordMinLength": {
    message: "비밀번호는 최소 6자 이상이어야 합니다",
    description: "Validation error for password length",
  },
  "auth.newPasswordMaxLength": {
    message: "비밀번호는 최대 128자 이하여야 합니다",
    description:
      "Validation error when new password exceeds the maximum length",
  },
  "auth.newPasswordRequired": {
    message: "비밀번호는 필수입니다",
    description: "Validation error for missing new password",
  },
  "auth.password": {
    message: "비밀번호",
    description: "Label for password input field",
  },
  "auth.passwordMinLength": {
    message: "비밀번호는 최소 6자 이상이어야 합니다",
    description: "Validation error when password is too short",
  },
  "auth.passwordMaxLength": {
    message: "비밀번호는 최대 128자 이하여야 합니다",
    description: "Validation error when password exceeds the maximum length",
  },
  "auth.passwordRequired": {
    message: "비밀번호는 필수입니다",
    description: "Validation error when password is not provided",
  },
  "auth.passwordResetSuccessMessage": {
    message: "비밀번호가 재설정되었습니다. 로그인 페이지로 이동 중...",
    description: "Success message description",
  },
  "auth.passwordResetSuccessful": {
    message: "비밀번호 재설정 완료!",
    description: "Success message title",
  },
  "auth.passwordsDoNotMatch": {
    message: "비밀번호가 일치하지 않습니다",
    description: "Validation error when passwords don't match",
  },
  "auth.redirectingToLogin": {
    message: "로그인 페이지로 이동 중...",
    description: "Message shown after successful logout",
  },
  "auth.registrationFailed": {
    message: "등록에 실패했습니다",
    description: "Error when registration fails",
  },
  "auth.resetPasswordButton": {
    message: "비밀번호 재설정",
    description: "Button text to reset password",
  },
  "auth.resetYourPassword": {
    message: "비밀번호를 재설정하세요",
    description: "Title for reset password page",
  },
  "auth.resettingPassword": {
    message: "비밀번호 재설정 중...",
    description: "Button text while resetting password",
  },
  "auth.sendResetLink": {
    message: "재설정 링크 보내기",
    description: "Button to send password reset link",
  },
  "auth.sending": {
    message: "전송 중...",
    description: "Button state while sending email",
  },
  "auth.signIn": {
    message: "로그인",
    description: "Button label for sign in action",
  },
  "auth.signUp": {
    message: "회원가입",
    description: "Button label for sign up action",
  },
  "auth.tokenExpired": {
    message: "토큰 만료",
    description: "Title when reset token is expired",
  },
  "auth.tokenExpiredDescription": {
    message: "비밀번호 재설정 토큰이 만료되었거나 유효하지 않습니다",
    description: "Description when token is expired",
  },
  "auth.tokenExpiredMessage": {
    message:
      "이 비밀번호 재설정 토큰이 만료되었습니다. 새 토큰을 요청해 주세요.",
    description: "Alert message for expired token",
  },
  "auth.username": {
    message: "사용자 이름",
    description: "Username field label",
  },
  "auth.usernameLowercaseAlphanumeric": {
    message: "사용자 이름은 소문자, 숫자, 밑줄만 포함할 수 있습니다",
    description:
      "Validation error when username contains invalid characters (must be lowercase)",
  },
  "auth.usernameMaxLength": {
    message: "사용자 이름은 최대 20자까지 입력할 수 있습니다",
    description: "Validation error when username too long",
  },
  "auth.usernameRequired": {
    message: "사용자 이름은 필수입니다",
    description: "Validation error when username is missing",
  },
  "auth.usernamePublicHint": {
    message: "이 사용자 이름은 공개되어 다른 사람들에게 표시됩니다",
    description: "Hint text explaining that username is publicly visible",
  },
  "auth.welcomeBack": {
    message: "다시 오셨군요",
    description: "Login page welcome title",
  },
  "auth.signInToAccount": {
    message: "Beancount 계정에 로그인",
    description: "Login page subtitle",
  },
  "auth.secureAccess": {
    message: "안전한 접근",
    description: "Secure access feature title",
  },
  "auth.secureAccessDescription": {
    message: "귀하의 재무 데이터는 엔터프라이즈급 보안으로 보호됩니다",
    description: "Secure access feature description",
  },
  "auth.realTimeInsights": {
    message: "실시간 인사이트",
    description: "Real-time insights feature title",
  },
  "auth.realTimeInsightsDescription": {
    message: "재무 상황과 트렌드를 즉시 파악하세요",
    description: "Real-time insights feature description",
  },
  "auth.lovedByUsers": {
    message: "사용자들의 사랑을 받는",
    description: "Loved by users feature title",
  },
  "auth.lovedByUsersDescription": {
    message:
      "회계 요구에 Beancount를 신뢰하는 수천 명의 만족한 사용자들과 함께하세요",
    description: "Loved by users feature description",
  },
  "auth.verifyYourEmail": {
    message: "이메일을 확인하세요",
    description: "OTP verification page title",
  },
  "auth.otpSentToYourEmail": {
    message: "이메일 주소로 4자리 코드를 보냈습니다",
    description: "Message showing OTP was sent to email",
  },
  "auth.enterOtpCode": {
    message: "코드를 입력하세요",
    description: "Label for OTP input field",
  },
  "auth.otpRequired": {
    message: "OTP 코드는 필수입니다",
    description: "Validation error when OTP is missing",
  },
  "auth.otpInvalidLength": {
    message: "OTP 코드는 4자리여야 합니다",
    description: "Validation error when OTP length is invalid",
  },
  "auth.otpVerificationFailed": {
    message: "OTP 인증에 실패했습니다",
    description: "Error message when OTP verification fails",
  },
  "auth.otpVerificationError": {
    message: "OTP 인증 중 오류가 발생했습니다",
    description: "Generic error message for OTP verification",
  },
  "auth.sessionExpired": {
    message: "세션 만료",
    description: "Title when signup session is expired",
  },
  "auth.sessionExpiredDescription": {
    message: "회원가입 세션이 만료되었거나 유효하지 않습니다",
    description: "Description when session is expired",
  },
  "auth.sessionExpiredMessage": {
    message:
      "이 회원가입 세션이 만료되었습니다. 등록 과정을 처음부터 다시 시작해 주세요.",
    description: "Alert message for expired session",
  },
  "auth.backToSignUp": {
    message: "회원가입으로 돌아가기",
    description: "Link text to return to sign up page",
  },
  "auth.didNotReceiveOtp": {
    message: "코드를 받지 못하셨나요?",
    description: "Prompt asking if user didn't receive OTP",
  },
  "auth.verifying": {
    message: "확인 중...",
    description: "Button text while verifying OTP",
  },
  "auth.verifyEmail": {
    message: "이메일 확인",
    description: "Button text to verify email with OTP",
  },
  "auth.termsAgreementPrefix": {
    message: '"계정 만들기"를 클릭하면 beancount.io의',
    description: "Prefix text before terms and privacy links on sign up form",
  },
  "auth.termsOfUse": {
    message: "이용약관",
    description: "Link text for terms of use",
  },
  "auth.privacyPolicy": {
    message: "개인정보처리방침",
    description: "Link text for privacy policy",
  },
  "auth.and": {
    message: "및",
    description: "Conjunction between terms and privacy links",
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
    message: "세션이 만료되었습니다. 다시 로그인해 주세요.",
    description:
      "Banner shown on the login page when redirected here because the previous session's token expired or was revoked",
  },
  "auth.cliAuthTitle": {
    message: "CLI 액세스 승인",
    description: "Title of the CLI device authorization card",
  },
  "auth.cliAuthDescription": {
    message: "Beancount CLI가 계정에 대한 액세스를 요청하고 있습니다.",
    description: "Description under the CLI authorization title",
  },
  "auth.cliAuthPermissionsIntro": {
    message: "CLI에 다음 작업이 허용됩니다:",
    description: "Intro line above the list of CLI permissions",
  },
  "auth.cliAuthPermissionLedgers": {
    message: "장부 읽기 및 쓰기",
    description: "CLI permission list item for reading and writing ledgers",
  },
  "auth.cliAuthPermissionAccount": {
    message: "계정 정보 액세스",
    description: "CLI permission list item for accessing account information",
  },
  "auth.cliAuthAuthorize": {
    message: "승인",
    description: "Button to authorize the CLI session",
  },
  "auth.cliAuthAuthorizing": {
    message: "승인 중...",
    description: "Button text while the CLI session is being authorized",
  },
  "auth.cliAuthDeny": {
    message: "거부",
    description: "Button to deny the CLI session",
  },
  "auth.cliAuthDenying": {
    message: "거부 중...",
    description: "Button text while the CLI session is being denied",
  },
  "auth.cliAuthSessionExpired": {
    message: "세션이 만료되었거나 찾을 수 없습니다.",
    description: "Error shown when the CLI auth session is expired or missing",
  },
  "auth.cliAuthSuccessTitle": {
    message: "승인이 완료되었습니다",
    description: "Title shown after the CLI session was authorized",
  },
  "auth.cliAuthSuccessDescription": {
    message: "이 탭을 닫고 CLI로 돌아갈 수 있습니다.",
    description: "Hint shown after successful CLI authorization",
  },
  "auth.cliAuthDeniedTitle": {
    message: "액세스가 거부되었습니다",
    description: "Title shown after the CLI session was denied",
  },
  "auth.cliAuthDeniedDescription": {
    message: "이 탭을 닫아도 됩니다.",
    description: "Hint shown after the CLI session was denied",
  },
  "auth.oauthIdentityWantsAccess": {
    message: "앱이 Beancount 계정으로 로그인하기를 요청합니다.",
    description: "Identity OAuth consent page login step description",
  },
  "auth.oauthIdentityApproveTitle": {
    message: "계속해서 로그인",
    description: "Identity OAuth consent page approve step title",
  },
  "auth.oauthIdentityApproveDescription": {
    message: "이름, 이메일, 사용자 이름이 앱과 공유됩니다.",
    description: "Identity OAuth consent page approve step description",
  },
  "auth.oauthIdentitySignedInAs": {
    message: "{email}(으)로 로그인됨",
    description:
      "Identity OAuth consent page approve step — shows which account is authorizing",
  },
  "auth.hidePassword": {
    message: "비밀번호 숨기기",
    description: "Accessible label for hiding a password",
  },
  "auth.showPassword": {
    message: "비밀번호 표시",
    description: "Accessible label for showing a password",
  },
  "auth.oauthLedgerRequired": {
    message: "원장을 선택해주세요.",
    description: "Validation shown when OAuth consent has no selected ledger",
  },
  "auth.oauthMobileSignInTitle": {
    message: "Beancount에 로그인",
    description:
      "Mobile OAuth login step title — first-party app, so it names the product rather than asking for access",
  },
  "auth.oauthMobileRegisterTitle": {
    message: "Beancount 계정 만들기",
    description: "Mobile OAuth register step title",
  },
  "auth.oauthMobileChooseAccountTitle": {
    message: "앱에서 사용할 계정을 선택하세요",
    description:
      "Mobile OAuth step shown when the browser is signed in but the app's Sign Up button started the flow",
  },
  "auth.oauthMobileContinueAs": {
    message: "{email}(으)로 계속",
    description:
      "Mobile OAuth button that keeps the signed-in browser account; {email} is the account",
  },
  "auth.oauthMobileCreateDifferentAccount": {
    message: "다른 계정 만들기",
    description:
      "Mobile OAuth button that signs the browser out and opens registration",
  },
  "auth.oauthMobileAllowTitle": {
    message: "빈카운트 모바일을 허용하시겠습니까?",
    description: "Mobile OAuth approval title",
  },
  "auth.oauthMobileGrantDescription": {
    message: "이 계정 전체 권한 부여를 통해 앱은 다음을 수행할 수 있습니다.",
    description: "Introduction to mobile OAuth permissions",
  },
  "auth.oauthSwitchAccountFailed": {
    message: "계정을 전환할 수 없습니다. 다시 시도해 주세요.",
    description: "Error shown when OAuth account switching fails",
  },
  "auth.oauthUseAnotherAccount": {
    message: "다른 계정 사용",
    description: "Button for switching OAuth accounts",
  },
  "auth.oauthMobileScopeIdentity": {
    message: "승인한 계정을 식별하세요.",
    description: "Description of the OpenID mobile permission",
  },
  "auth.oauthMobileScopeOfflineAccess": {
    message: "액세스를 취소할 때까지 안전하게 로그인 상태를 유지하세요",
    description: "Description of the offline access mobile permission",
  },
  "auth.oauthMobileScopeRead": {
    message: "장부를 읽으세요",
    description: "Description of the ledger read mobile permission",
  },
  "auth.oauthMobileScopeWrite": {
    message: "원장 데이터 생성 및 업데이트",
    description: "Description of the ledger write mobile permission",
  },
  "auth.oauthMobileScopeAdmin": {
    message: "원장 및 협력자 관리",
    description: "Description of the ledger admin mobile permission",
  },
};

export default koAuth;
