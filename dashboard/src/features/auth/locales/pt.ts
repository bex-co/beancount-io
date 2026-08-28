export interface TranslationEntry {
  message: string;
  description: string;
}

const ptAuth: Record<string, TranslationEntry> = {
  "auth.alreadyHaveAccountQuestion": {
    message: "Já tem uma conta?",
    description: "Prompt asking if user has existing account",
  },
  "auth.and": {
    message: "e",
    description: "Conjunction between terms and privacy links",
  },
  "auth.authenticating": {
    message: "Autenticando...",
    description: "Message shown during authentication process",
  },
  "auth.backToSignIn": {
    message: "Voltar ao login",
    description: "Link text to return to sign in page",
  },
  "auth.backToSignUp": {
    message: "Voltar para Cadastro",
    description: "Link text to return to sign up page",
  },
  "auth.confirmNewPassword": {
    message: "Confirmar Nova Senha",
    description: "Label for confirm password field",
  },
  "auth.confirmPassword": {
    message: "Confirmar Senha",
    description: "Label for password confirmation input field",
  },
  "auth.confirmPasswordRequired": {
    message: "Por favor, confirme sua senha",
    description: "Validation error when password confirmation is missing",
  },
  "auth.confirmYourNewPassword": {
    message: "Confirme sua nova senha",
    description: "Placeholder for confirm password input",
  },
  "auth.confirmYourPassword": {
    message: "Confirme sua senha",
    description: "Placeholder for password confirmation",
  },
  "auth.createAccount": {
    message: "Criar conta",
    description: "Button to submit registration",
  },
  "auth.createYourAccount": {
    message: "Crie sua conta",
    description: "Registration page title",
  },
  "auth.creatingAccount": {
    message: "Criando conta...",
    description: "Button state while creating account",
  },
  "auth.didNotReceiveOtp": {
    message: "Não recebeu o código?",
    description: "Prompt asking if user didn't receive OTP",
  },
  "auth.dontHaveAccount": {
    message: "Não tem uma conta?",
    description: "Prompt text asking if user doesn't have account",
  },
  "auth.email": {
    message: "E-mail",
    description: "Label for email input field",
  },
  "auth.emailAddress": {
    message: "Endereço de e-mail",
    description: "Email address field label",
  },
  "auth.emailInvalid": {
    message: "Por favor, insira um endereço de e-mail válido",
    description: "Validation error when email format is invalid",
  },
  "auth.emailRequired": {
    message: "E-mail é obrigatório",
    description: "Validation error when email is not provided",
  },
  "auth.emailSent": {
    message: "E-mail enviado!",
    description: "Success title after email sent",
  },
  "auth.emailSentDescription": {
    message:
      "Enviamos um link de redefinição de senha para seu endereço de e-mail. Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.",
    description: "Detailed success message after reset email sent",
  },
  "auth.enterDetailsToGetStarted": {
    message: "Digite seus dados para começar com seu painel",
    description: "Registration page description",
  },
  "auth.enterEmailForReset": {
    message:
      "Digite seu endereço de e-mail e enviaremos um link para redefinir sua senha",
    description: "Instructions on forgot password page",
  },
  "auth.enterFirstName": {
    message: "Digite seu nome",
    description: "Placeholder for first name input",
  },
  "auth.enterLastName": {
    message: "Digite seu sobrenome",
    description: "Placeholder for last name input",
  },
  "auth.enterNewPasswordBelow": {
    message: "Digite sua nova senha abaixo",
    description: "Instruction for reset password form",
  },
  "auth.enterOtpCode": {
    message: "Digite o código",
    description: "Label for OTP input field",
  },
  "auth.enterUsername": {
    message: "Digite seu nome de usuário (máx. 16 caracteres)",
    description: "Placeholder for username input with character limit",
  },
  "auth.enterYourEmail": {
    message: "Digite seu e-mail",
    description: "Placeholder for email input",
  },
  "auth.enterYourNewPassword": {
    message: "Digite sua nova senha",
    description: "Placeholder for new password input",
  },
  "auth.enterYourPassword": {
    message: "Digite sua senha (mín. 6 caracteres)",
    description: "Placeholder for password input with requirement",
  },
  "auth.failedToResetPassword": {
    message: "Falha ao redefinir senha. Por favor, tente novamente.",
    description: "Error message when password reset fails",
  },
  "auth.failedToSendResetEmail": {
    message:
      "Falha ao enviar e-mail de redefinição de senha. Por favor, tente novamente.",
    description: "Error when reset email fails to send",
  },
  "auth.firstName": {
    message: "Nome",
    description: "Label for first name input field",
  },
  "auth.firstNameMaxLength": {
    message: "O nome deve ter no máximo 50 caracteres",
    description: "Validation error when first name is too long",
  },
  "auth.forgotPassword": {
    message: "Esqueceu a Senha?",
    description: "Link text for forgot password feature",
  },
  "auth.forgotYourPassword": {
    message: "Esqueceu sua senha?",
    description: "Forgot password page title",
  },
  "auth.lastName": {
    message: "Sobrenome",
    description: "Label for last name input field",
  },
  "auth.lastNameMaxLength": {
    message: "O sobrenome deve ter no máximo 50 caracteres",
    description: "Validation error when last name is too long",
  },
  "auth.loggingOut": {
    message: "Saindo",
    description: "Title shown while logging out",
  },
  "auth.loggingOutMessage": {
    message: "Por favor, aguarde enquanto fazemos seu logout...",
    description: "Message shown while logging out",
  },
  "auth.login": {
    message: "Entrar / Registrar",
    description: "Button label for login or signup",
  },
  "auth.loginFailed": {
    message: "Login falhou",
    description: "Error title when login fails",
  },
  "auth.logout": {
    message: "Sair",
    description: "Button label to log out",
  },
  "auth.lovedByUsers": {
    message: "Amado pelos usuários",
    description: "Loved by users feature title",
  },
  "auth.lovedByUsersDescription": {
    message:
      "Junte-se a milhares de usuários satisfeitos que confiam no Beancount para suas necessidades contábeis",
    description: "Loved by users feature description",
  },
  "auth.newPassword": {
    message: "Nova Senha",
    description: "Label for new password field",
  },
  "auth.newPasswordMinLength": {
    message: "A senha deve ter pelo menos 6 caracteres",
    description: "Validation error for password length",
  },
  "auth.newPasswordMaxLength": {
    message: "A senha deve ter no máximo 128 caracteres",
    description:
      "Validation error when new password exceeds the maximum length",
  },
  "auth.newPasswordRequired": {
    message: "Senha é obrigatória",
    description: "Validation error for missing new password",
  },
  "auth.otpInvalidLength": {
    message: "O código OTP deve ter 4 dígitos",
    description: "Validation error when OTP length is invalid",
  },
  "auth.otpRequired": {
    message: "O código OTP é obrigatório",
    description: "Validation error when OTP is missing",
  },
  "auth.otpSentToYourEmail": {
    message: "Enviamos um código de 4 dígitos para o seu endereço de e-mail",
    description: "Message showing OTP was sent to email",
  },
  "auth.otpVerificationError": {
    message: "Ocorreu um erro durante a verificação do OTP",
    description: "Generic error message for OTP verification",
  },
  "auth.otpVerificationFailed": {
    message: "A verificação do OTP falhou",
    description: "Error message when OTP verification fails",
  },
  "auth.password": {
    message: "Senha",
    description: "Label for password input field",
  },
  "auth.passwordMinLength": {
    message: "A senha deve ter pelo menos 6 caracteres",
    description: "Validation error when password is too short",
  },
  "auth.passwordMaxLength": {
    message: "A senha deve ter no máximo 128 caracteres",
    description: "Validation error when password exceeds the maximum length",
  },
  "auth.passwordRequired": {
    message: "Senha é obrigatória",
    description: "Validation error when password is not provided",
  },
  "auth.passwordResetSuccessMessage": {
    message: "Sua senha foi redefinida. Redirecionando para login...",
    description: "Success message description",
  },
  "auth.passwordResetSuccessful": {
    message: "Redefinição de senha bem-sucedida!",
    description: "Success message title",
  },
  "auth.passwordsDoNotMatch": {
    message: "As senhas não coincidem",
    description: "Validation error when passwords don't match",
  },
  "auth.privacyPolicy": {
    message: "Política de Privacidade",
    description: "Link text for privacy policy",
  },
  "auth.realTimeInsights": {
    message: "Insights em tempo real",
    description: "Real-time insights feature title",
  },
  "auth.realTimeInsightsDescription": {
    message:
      "Obtenha visibilidade instantânea da sua posição financeira e tendências",
    description: "Real-time insights feature description",
  },
  "auth.redirectingToLogin": {
    message: "Redirecionando para a página de login...",
    description: "Message shown after successful logout",
  },
  "auth.registrationFailed": {
    message: "Registro falhou",
    description: "Error when registration fails",
  },
  "auth.resetPasswordButton": {
    message: "Redefinir senha",
    description: "Button text to reset password",
  },
  "auth.resetYourPassword": {
    message: "Redefina sua senha",
    description: "Title for reset password page",
  },
  "auth.resettingPassword": {
    message: "Redefinindo senha...",
    description: "Button text while resetting password",
  },
  "auth.secureAccess": {
    message: "Acesso seguro",
    description: "Secure access feature title",
  },
  "auth.secureAccessDescription": {
    message:
      "Seus dados financeiros estão protegidos com segurança de nível empresarial",
    description: "Secure access feature description",
  },
  "auth.sendResetLink": {
    message: "Enviar link de redefinição",
    description: "Button to send password reset link",
  },
  "auth.sending": {
    message: "Enviando...",
    description: "Button state while sending email",
  },
  "auth.sessionExpired": {
    message: "Sessão Expirada",
    description: "Title when signup session is expired",
  },
  "auth.sessionExpiredDescription": {
    message: "A sessão de registro expirou ou é inválida",
    description: "Description when session is expired",
  },
  "auth.sessionExpiredMessage": {
    message:
      "Esta sessão de registro expirou. Por favor, inicie o processo de registro novamente.",
    description: "Alert message for expired session",
  },
  "auth.signIn": {
    message: "Entrar",
    description: "Button label for sign in action",
  },
  "auth.signInToAccount": {
    message: "Entre na sua conta Beancount",
    description: "Login page subtitle",
  },
  "auth.signUp": {
    message: "Registrar",
    description: "Button label for sign up action",
  },
  "auth.termsAgreementPrefix": {
    message:
      'Ao clicar em "Criar conta", concordo com os termos da beancount.io',
    description: "Prefix text before terms and privacy links on sign up form",
  },
  "auth.termsOfUse": {
    message: "Termos de Uso",
    description: "Link text for terms of use",
  },
  "auth.tokenExpired": {
    message: "Token Expirado",
    description: "Title when reset token is expired",
  },
  "auth.tokenExpiredDescription": {
    message: "O token de redefinição de senha está expirado ou inválido",
    description: "Description when token is expired",
  },
  "auth.tokenExpiredMessage": {
    message:
      "Este token de redefinição de senha está expirado. Por favor, solicite um novo.",
    description: "Alert message for expired token",
  },
  "auth.username": {
    message: "Usuárioname",
    description: "Username field label",
  },
  "auth.usernameLowercaseAlphanumeric": {
    message:
      "O nome de usuário pode conter apenas letras minúsculas, números e sublinhados",
    description:
      "Validation error when username contains invalid characters (must be lowercase)",
  },
  "auth.usernameMaxLength": {
    message: "Usuárioname must be at most 16 characters",
    description: "Validation error when username too long",
  },
  "auth.usernamePublicHint": {
    message: "Este nome de usuário é público e visível para outros",
    description: "Hint text explaining that username is publicly visible",
  },
  "auth.usernameRequired": {
    message: "Usuárioname is required",
    description: "Validation error when username is missing",
  },
  "auth.verifyEmail": {
    message: "Verificar E-mail",
    description: "Button text to verify email with OTP",
  },
  "auth.verifyYourEmail": {
    message: "Verifique seu e-mail",
    description: "OTP verification page title",
  },
  "auth.verifying": {
    message: "Verificando...",
    description: "Button text while verifying OTP",
  },
  "auth.welcomeBack": {
    message: "Bem-vindo de volta",
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
    message: "Sua sessão expirou. Por favor, faça login novamente.",
    description:
      "Banner shown on the login page when redirected here because the previous session's token expired or was revoked",
  },
  "auth.cliAuthTitle": {
    message: "Autorizar acesso da CLI",
    description: "Title of the CLI device authorization card",
  },
  "auth.cliAuthDescription": {
    message: "A CLI do Beancount está solicitando acesso à sua conta.",
    description: "Description under the CLI authorization title",
  },
  "auth.cliAuthPermissionsIntro": {
    message: "Isso permitirá que a CLI:",
    description: "Intro line above the list of CLI permissions",
  },
  "auth.cliAuthPermissionLedgers": {
    message: "Ler e gravar seus livros-razão",
    description: "CLI permission list item for reading and writing ledgers",
  },
  "auth.cliAuthPermissionAccount": {
    message: "Acessar as informações da sua conta",
    description: "CLI permission list item for accessing account information",
  },
  "auth.cliAuthAuthorize": {
    message: "Autorizar",
    description: "Button to authorize the CLI session",
  },
  "auth.cliAuthAuthorizing": {
    message: "Autorizando...",
    description: "Button text while the CLI session is being authorized",
  },
  "auth.cliAuthDeny": {
    message: "Negar",
    description: "Button to deny the CLI session",
  },
  "auth.cliAuthDenying": {
    message: "Negando...",
    description: "Button text while the CLI session is being denied",
  },
  "auth.cliAuthSessionExpired": {
    message: "Sessão expirada ou não encontrada.",
    description: "Error shown when the CLI auth session is expired or missing",
  },
  "auth.cliAuthSuccessTitle": {
    message: "Autorização concluída",
    description: "Title shown after the CLI session was authorized",
  },
  "auth.cliAuthSuccessDescription": {
    message: "Você pode fechar esta aba e voltar para a CLI.",
    description: "Hint shown after successful CLI authorization",
  },
  "auth.cliAuthDeniedTitle": {
    message: "Acesso negado",
    description: "Title shown after the CLI session was denied",
  },
  "auth.cliAuthDeniedDescription": {
    message: "Você pode fechar esta aba.",
    description: "Hint shown after the CLI session was denied",
  },
  "auth.oauthIdentityWantsAccess": {
    message: "Um aplicativo quer que você entre com sua conta Beancount.",
    description: "Identity OAuth consent page login step description",
  },
  "auth.oauthIdentityApproveTitle": {
    message: "Continuar para entrar",
    description: "Identity OAuth consent page approve step title",
  },
  "auth.oauthIdentityApproveDescription": {
    message:
      "Isso compartilhará seu nome, e-mail e nome de usuário com o aplicativo.",
    description: "Identity OAuth consent page approve step description",
  },
  "auth.oauthIdentitySignedInAs": {
    message: "Conectado como {email}",
    description:
      "Identity OAuth consent page approve step — shows which account is authorizing",
  },
  "auth.hidePassword": {
    message: "Ocultar senha",
    description: "Accessible label for hiding a password",
  },
  "auth.showPassword": {
    message: "Mostrar senha",
    description: "Accessible label for showing a password",
  },
  "auth.oauthLedgerRequired": {
    message: "Selecione um razão.",
    description: "Validation shown when OAuth consent has no selected ledger",
  },
  "auth.oauthMobileSignInTitle": {
    message: "Entrar no Beancount",
    description:
      "Mobile OAuth login step title — first-party app, so it names the product rather than asking for access",
  },
  "auth.oauthMobileRegisterTitle": {
    message: "Crie a sua conta Beancount",
    description: "Mobile OAuth register step title",
  },
  "auth.oauthMobileChooseAccountTitle": {
    message: "Qual conta o aplicativo deve usar?",
    description:
      "Mobile OAuth step shown when the browser is signed in but the app's Sign Up button started the flow",
  },
  "auth.oauthMobileContinueAs": {
    message: "Continuar como {email}",
    description:
      "Mobile OAuth button that keeps the signed-in browser account; {email} is the account",
  },
  "auth.oauthMobileCreateDifferentAccount": {
    message: "Criar uma conta diferente",
    description:
      "Mobile OAuth button that signs the browser out and opens registration",
  },
  "auth.oauthMobileAllowTitle": {
    message: "Permitir Beancount Mobile?",
    description: "Mobile OAuth approval title",
  },
  "auth.oauthMobileGrantDescription": {
    message: "Esta concessão para toda a conta permite que o aplicativo:",
    description: "Introduction to mobile OAuth permissions",
  },
  "auth.oauthSwitchAccountFailed": {
    message: "Não foi possível trocar de conta. Por favor, tente novamente.",
    description: "Error shown when OAuth account switching fails",
  },
  "auth.oauthUseAnotherAccount": {
    message: "Usar outra conta",
    description: "Button for switching OAuth accounts",
  },
  "auth.oauthMobileScopeIdentity": {
    message: "Identifique a conta que você aprova",
    description: "Description of the OpenID mobile permission",
  },
  "auth.oauthMobileScopeOfflineAccess": {
    message: "Permaneça conectado com segurança até revogar o acesso",
    description: "Description of the offline access mobile permission",
  },
  "auth.oauthMobileScopeRead": {
    message: "Leia seus livros contábeis",
    description: "Description of the ledger read mobile permission",
  },
  "auth.oauthMobileScopeWrite": {
    message: "Criar e atualizar dados contábeis",
    description: "Description of the ledger write mobile permission",
  },
  "auth.oauthMobileScopeAdmin": {
    message: "Gerenciar livros contábeis e colaboradores",
    description: "Description of the ledger admin mobile permission",
  },
};

export default ptAuth;
