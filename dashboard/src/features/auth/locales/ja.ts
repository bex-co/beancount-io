import type { TranslationEntry } from "@/i18n";

const jaAuth: Record<string, TranslationEntry> = {
  "auth.alreadyHaveAccountQuestion": {
    message: "すでにアカウントをお持ちですか？",
    description: "Prompt asking if user has existing account",
  },
  "auth.backToSignIn": {
    message: "サインインに戻る",
    description: "Link text to return to sign in page",
  },
  "auth.confirmNewPassword": {
    message: "新しいパスワードの確認",
    description: "Label for confirm password field",
  },
  "auth.confirmPassword": {
    message: "パスワードの確認",
    description: "Label for password confirmation input field",
  },
  "auth.confirmPasswordRequired": {
    message: "パスワードを確認してください",
    description: "Validation error when password confirmation is missing",
  },
  "auth.confirmYourNewPassword": {
    message: "新しいパスワードを確認してください",
    description: "Placeholder for confirm password input",
  },
  "auth.confirmYourPassword": {
    message: "パスワードを確認してください",
    description: "Placeholder for password confirmation",
  },
  "auth.createAccount": {
    message: "アカウントを作成",
    description: "Button to submit registration",
  },
  "auth.createYourAccount": {
    message: "アカウントを作成する",
    description: "Registration page title",
  },
  "auth.creatingAccount": {
    message: "アカウント作成中...",
    description: "Button state while creating account",
  },
  "auth.dontHaveAccount": {
    message: "アカウントをお持ちでないですか？",
    description: "Prompt text asking if user doesn't have account",
  },
  "auth.email": {
    message: "メールアドレス",
    description: "Label for email input field",
  },
  "auth.emailAddress": {
    message: "メールアドレス",
    description: "Email address field label",
  },
  "auth.emailInvalid": {
    message: "有効なメールアドレスを入力してください",
    description: "Validation error when email format is invalid",
  },
  "auth.emailRequired": {
    message: "メールアドレスは必須です",
    description: "Validation error when email is not provided",
  },
  "auth.emailSent": {
    message: "メールを送信しました！",
    description: "Success title after email sent",
  },
  "auth.emailSentDescription": {
    message:
      "パスワードリセットのリンクをメールアドレスに送信しました。受信トレイを確認し、手順に従ってパスワードをリセットしてください。",
    description: "Detailed success message after reset email sent",
  },
  "auth.enterDetailsToGetStarted": {
    message: "ダッシュボードを始めるために詳細を入力してください",
    description: "Registration page description",
  },
  "auth.enterEmailForReset": {
    message:
      "メールアドレスを入力すると、パスワードリセット用のリンクをお送りします",
    description: "Instructions on forgot password page",
  },
  "auth.enterNewPasswordBelow": {
    message: "以下に新しいパスワードを入力してください",
    description: "Instruction for reset password form",
  },
  "auth.enterUsername": {
    message: "ユーザー名を入力してください（小文字、最大20文字）",
    description: "Placeholder for username input with character limit",
  },
  "auth.enterYourEmail": {
    message: "メールアドレスを入力してください",
    description: "Placeholder for email input",
  },
  "auth.enterYourNewPassword": {
    message: "新しいパスワードを入力してください",
    description: "Placeholder for new password input",
  },
  "auth.enterYourPassword": {
    message: "パスワードを入力してください（最低6文字）",
    description: "Placeholder for password input with requirement",
  },
  "auth.firstName": {
    message: "名",
    description: "Label for first name input field",
  },
  "auth.lastName": {
    message: "姓",
    description: "Label for last name input field",
  },
  "auth.enterFirstName": {
    message: "名を入力してください",
    description: "Placeholder for first name input",
  },
  "auth.enterLastName": {
    message: "姓を入力してください",
    description: "Placeholder for last name input",
  },
  "auth.firstNameMaxLength": {
    message: "名は50文字以内で入力してください",
    description: "Validation error when first name is too long",
  },
  "auth.lastNameMaxLength": {
    message: "姓は50文字以内で入力してください",
    description: "Validation error when last name is too long",
  },
  "auth.failedToResetPassword": {
    message: "パスワードのリセットに失敗しました。もう一度お試しください。",
    description: "Error message when password reset fails",
  },
  "auth.failedToSendResetEmail": {
    message:
      "パスワードリセットメールの送信に失敗しました。もう一度お試しください。",
    description: "Error when reset email fails to send",
  },
  "auth.forgotPassword": {
    message: "パスワードをお忘れですか？",
    description: "Link text for forgot password feature",
  },
  "auth.forgotYourPassword": {
    message: "パスワードをお忘れですか？",
    description: "Forgot password page title",
  },
  "auth.loggingOut": {
    message: "ログアウト中",
    description: "Title shown while logging out",
  },
  "auth.loggingOutMessage": {
    message: "サインアウト中です。しばらくお待ちください...",
    description: "Message shown while logging out",
  },
  "auth.login": {
    message: "ログイン / サインアップ",
    description: "Button label for login or signup",
  },
  "auth.loginFailed": {
    message: "ログインに失敗しました",
    description: "Error title when login fails",
  },
  "auth.logout": {
    message: "ログアウト",
    description: "Button label to log out",
  },
  "auth.newPassword": {
    message: "新しいパスワード",
    description: "Label for new password field",
  },
  "auth.newPasswordMinLength": {
    message: "パスワードは6文字以上で入力してください",
    description: "Validation error for password length",
  },
  "auth.newPasswordMaxLength": {
    message: "パスワードは128文字以下で入力してください",
    description:
      "Validation error when new password exceeds the maximum length",
  },
  "auth.newPasswordRequired": {
    message: "パスワードは必須です",
    description: "Validation error for missing new password",
  },
  "auth.password": {
    message: "パスワード",
    description: "Label for password input field",
  },
  "auth.passwordMinLength": {
    message: "パスワードは6文字以上で入力してください",
    description: "Validation error when password is too short",
  },
  "auth.passwordMaxLength": {
    message: "パスワードは128文字以下で入力してください",
    description: "Validation error when password exceeds the maximum length",
  },
  "auth.passwordRequired": {
    message: "パスワードは必須です",
    description: "Validation error when password is not provided",
  },
  "auth.passwordResetSuccessMessage": {
    message:
      "パスワードがリセットされました。ログインページにリダイレクト中...",
    description: "Success message description",
  },
  "auth.passwordResetSuccessful": {
    message: "パスワードのリセットが完了しました！",
    description: "Success message title",
  },
  "auth.passwordsDoNotMatch": {
    message: "パスワードが一致しません",
    description: "Validation error when passwords don't match",
  },
  "auth.redirectingToLogin": {
    message: "ログインページにリダイレクト中...",
    description: "Message shown after successful logout",
  },
  "auth.registrationFailed": {
    message: "登録に失敗しました",
    description: "Error when registration fails",
  },
  "auth.resetPasswordButton": {
    message: "パスワードをリセット",
    description: "Button text to reset password",
  },
  "auth.resetYourPassword": {
    message: "パスワードをリセットする",
    description: "Title for reset password page",
  },
  "auth.resettingPassword": {
    message: "パスワードをリセット中...",
    description: "Button text while resetting password",
  },
  "auth.sendResetLink": {
    message: "リセットリンクを送信",
    description: "Button to send password reset link",
  },
  "auth.sending": {
    message: "送信中...",
    description: "Button state while sending email",
  },
  "auth.signIn": {
    message: "サインイン",
    description: "Button label for sign in action",
  },
  "auth.signUp": {
    message: "サインアップ",
    description: "Button label for sign up action",
  },
  "auth.tokenExpired": {
    message: "トークンの有効期限切れ",
    description: "Title when reset token is expired",
  },
  "auth.tokenExpiredDescription": {
    message: "パスワードリセットトークンの有効期限が切れているか無効です",
    description: "Description when token is expired",
  },
  "auth.tokenExpiredMessage": {
    message:
      "このパスワードリセットトークンの有効期限が切れています。新しいトークンをリクエストしてください。",
    description: "Alert message for expired token",
  },
  "auth.username": {
    message: "ユーザー名",
    description: "Username field label",
  },
  "auth.usernameLowercaseAlphanumeric": {
    message: "ユーザー名には小文字、数字、アンダースコアのみ使用できます",
    description:
      "Validation error when username contains invalid characters (must be lowercase)",
  },
  "auth.usernameMaxLength": {
    message: "ユーザー名は20文字以内で入力してください",
    description: "Validation error when username too long",
  },
  "auth.usernameRequired": {
    message: "ユーザー名は必須です",
    description: "Validation error when username is missing",
  },
  "auth.usernamePublicHint": {
    message: "このユーザー名は公開され、他のユーザーに表示されます",
    description: "Hint text explaining that username is publicly visible",
  },
  "auth.welcomeBack": {
    message: "おかえりなさい",
    description: "Login page welcome title",
  },
  "auth.signInToAccount": {
    message: "Beancountアカウントにサインイン",
    description: "Login page subtitle",
  },
  "auth.secureAccess": {
    message: "セキュアアクセス",
    description: "Secure access feature title",
  },
  "auth.secureAccessDescription": {
    message:
      "あなたの財務データはエンタープライズグレードのセキュリティで保護されています",
    description: "Secure access feature description",
  },
  "auth.realTimeInsights": {
    message: "リアルタイムインサイト",
    description: "Real-time insights feature title",
  },
  "auth.realTimeInsightsDescription": {
    message: "財務状況とトレンドを即座に把握できます",
    description: "Real-time insights feature description",
  },
  "auth.lovedByUsers": {
    message: "ユーザーに愛されています",
    description: "Loved by users feature title",
  },
  "auth.lovedByUsersDescription": {
    message:
      "会計ニーズにBeancountを信頼する何千人もの満足ユーザーに加わりましょう",
    description: "Loved by users feature description",
  },
  "auth.verifyYourEmail": {
    message: "メールアドレスを確認する",
    description: "OTP verification page title",
  },
  "auth.otpSentToYourEmail": {
    message: "メールアドレスに4桁のコードを送信しました",
    description: "Message showing OTP was sent to email",
  },
  "auth.enterOtpCode": {
    message: "コードを入力してください",
    description: "Label for OTP input field",
  },
  "auth.otpRequired": {
    message: "OTPコードは必須です",
    description: "Validation error when OTP is missing",
  },
  "auth.otpInvalidLength": {
    message: "OTPコードは4桁でなければなりません",
    description: "Validation error when OTP length is invalid",
  },
  "auth.otpVerificationFailed": {
    message: "OTP検証に失敗しました",
    description: "Error message when OTP verification fails",
  },
  "auth.otpVerificationError": {
    message: "OTP検証中にエラーが発生しました",
    description: "Generic error message for OTP verification",
  },
  "auth.sessionExpired": {
    message: "セッションの有効期限切れ",
    description: "Title when signup session is expired",
  },
  "auth.sessionExpiredDescription": {
    message: "サインアップセッションの有効期限が切れているか無効です",
    description: "Description when session is expired",
  },
  "auth.sessionExpiredMessage": {
    message:
      "このサインアップセッションの有効期限が切れています。登録プロセスを最初からやり直してください。",
    description: "Alert message for expired session",
  },
  "auth.backToSignUp": {
    message: "サインアップに戻る",
    description: "Link text to return to sign up page",
  },
  "auth.didNotReceiveOtp": {
    message: "コードが届きませんでしたか？",
    description: "Prompt asking if user didn't receive OTP",
  },
  "auth.verifying": {
    message: "検証中...",
    description: "Button text while verifying OTP",
  },
  "auth.verifyEmail": {
    message: "メールを確認",
    description: "Button text to verify email with OTP",
  },
  "auth.termsAgreementPrefix": {
    message: "「アカウントを作成」をクリックすることで、beancount.ioの",
    description: "Prefix text before terms and privacy links on sign up form",
  },
  "auth.termsOfUse": {
    message: "利用規約",
    description: "Link text for terms of use",
  },
  "auth.privacyPolicy": {
    message: "プライバシーポリシー",
    description: "Link text for privacy policy",
  },
  "auth.and": {
    message: "および",
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
    message: "セッションの有効期限が切れました。もう一度ログインしてください。",
    description:
      "Banner shown on the login page when redirected here because the previous session's token expired or was revoked",
  },
  "auth.cliAuthTitle": {
    message: "CLIアクセスを許可",
    description: "Title of the CLI device authorization card",
  },
  "auth.cliAuthDescription": {
    message: "Beancount CLIがアカウントへのアクセスを要求しています。",
    description: "Description under the CLI authorization title",
  },
  "auth.cliAuthPermissionsIntro": {
    message: "CLIに以下を許可します:",
    description: "Intro line above the list of CLI permissions",
  },
  "auth.cliAuthPermissionLedgers": {
    message: "台帳の読み取りと書き込み",
    description: "CLI permission list item for reading and writing ledgers",
  },
  "auth.cliAuthPermissionAccount": {
    message: "アカウント情報へのアクセス",
    description: "CLI permission list item for accessing account information",
  },
  "auth.cliAuthAuthorize": {
    message: "許可",
    description: "Button to authorize the CLI session",
  },
  "auth.cliAuthAuthorizing": {
    message: "許可中...",
    description: "Button text while the CLI session is being authorized",
  },
  "auth.cliAuthDeny": {
    message: "拒否",
    description: "Button to deny the CLI session",
  },
  "auth.cliAuthDenying": {
    message: "拒否中...",
    description: "Button text while the CLI session is being denied",
  },
  "auth.cliAuthSessionExpired": {
    message: "セッションの有効期限が切れているか、見つかりません。",
    description: "Error shown when the CLI auth session is expired or missing",
  },
  "auth.cliAuthSuccessTitle": {
    message: "許可が完了しました",
    description: "Title shown after the CLI session was authorized",
  },
  "auth.cliAuthSuccessDescription": {
    message: "このタブを閉じてCLIに戻ることができます。",
    description: "Hint shown after successful CLI authorization",
  },
  "auth.cliAuthDeniedTitle": {
    message: "アクセスが拒否されました",
    description: "Title shown after the CLI session was denied",
  },
  "auth.cliAuthDeniedDescription": {
    message: "このタブを閉じて構いません。",
    description: "Hint shown after the CLI session was denied",
  },
  "auth.oauthIdentityWantsAccess": {
    message:
      "アプリがあなたのBeancountアカウントでのサインインを求めています。",
    description: "Identity OAuth consent page login step description",
  },
  "auth.oauthIdentityApproveTitle": {
    message: "サインインを続ける",
    description: "Identity OAuth consent page approve step title",
  },
  "auth.oauthIdentityApproveDescription": {
    message:
      "これにより、あなたの名前、メールアドレス、ユーザー名がアプリと共有されます。",
    description: "Identity OAuth consent page approve step description",
  },
  "auth.oauthIdentitySignedInAs": {
    message: "{email} としてサインイン中",
    description:
      "Identity OAuth consent page approve step — shows which account is authorizing",
  },
  "auth.hidePassword": {
    message: "パスワードを隠す",
    description: "Accessible label for hiding a password",
  },
  "auth.showPassword": {
    message: "パスワードを表示",
    description: "Accessible label for showing a password",
  },
  "auth.oauthLedgerRequired": {
    message: "元帳を選択してください。",
    description: "Validation shown when OAuth consent has no selected ledger",
  },
  "auth.oauthMobileSignInTitle": {
    message: "Beancount にサインイン",
    description:
      "Mobile OAuth login step title — first-party app, so it names the product rather than asking for access",
  },
  "auth.oauthMobileRegisterTitle": {
    message: "Beancount アカウントを作成",
    description: "Mobile OAuth register step title",
  },
  "auth.oauthMobileChooseAccountTitle": {
    message: "アプリで使用するアカウントを選んでください",
    description:
      "Mobile OAuth step shown when the browser is signed in but the app's Sign Up button started the flow",
  },
  "auth.oauthMobileContinueAs": {
    message: "{email} として続行",
    description:
      "Mobile OAuth button that keeps the signed-in browser account; {email} is the account",
  },
  "auth.oauthMobileCreateDifferentAccount": {
    message: "別のアカウントを作成",
    description:
      "Mobile OAuth button that signs the browser out and opens registration",
  },
  "auth.oauthMobileAllowTitle": {
    message: "Beancount モバイルを許可しますか?",
    description: "Mobile OAuth approval title",
  },
  "auth.oauthMobileGrantDescription": {
    message:
      "このアカウント全体の許可により、アプリは次のことが可能になります。",
    description: "Introduction to mobile OAuth permissions",
  },
  "auth.oauthSwitchAccountFailed": {
    message:
      "アカウントを切り替えることができませんでした。もう一度試してください。",
    description: "Error shown when OAuth account switching fails",
  },
  "auth.oauthUseAnotherAccount": {
    message: "別のアカウントを使用する",
    description: "Button for switching OAuth accounts",
  },
  "auth.oauthMobileScopeIdentity": {
    message: "承認するアカウントを特定します",
    description: "Description of the OpenID mobile permission",
  },
  "auth.oauthMobileScopeOfflineAccess": {
    message: "アクセスを取り消すまで安全にサインインしたままにする",
    description: "Description of the offline access mobile permission",
  },
  "auth.oauthMobileScopeRead": {
    message: "台帳を読む",
    description: "Description of the ledger read mobile permission",
  },
  "auth.oauthMobileScopeWrite": {
    message: "台帳データの作成と更新",
    description: "Description of the ledger write mobile permission",
  },
  "auth.oauthMobileScopeAdmin": {
    message: "台帳と共同作業者を管理する",
    description: "Description of the ledger admin mobile permission",
  },
};

export default jaAuth;
