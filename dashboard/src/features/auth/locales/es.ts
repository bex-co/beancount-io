export interface TranslationEntry {
  message: string;
  description: string;
}

const esAuth: Record<string, TranslationEntry> = {
  "auth.alreadyHaveAccount": {
    message: "¿Ya tienes una cuenta? Inicia sesión",
    description: "Prompt text asking if user already has account",
  },
  "auth.alreadyHaveAccountQuestion": {
    message: "¿Ya tienes una cuenta?",
    description: "Prompt asking if user has existing account",
  },
  "auth.and": {
    message: "y",
    description: "Conjunction between terms and privacy links",
  },
  "auth.authenticating": {
    message: "Autenticando...",
    description: "Message shown during authentication process",
  },
  "auth.authenticationError": {
    message: "Error de Autenticación",
    description: "Title for authentication error dialog",
  },
  "auth.authenticationErrorOccurred": {
    message: "Ocurrió un error durante la autenticación",
    description: "Generic authentication error message",
  },
  "auth.authenticationFailed": {
    message: "Falló la autenticación",
    description: "Error message when authentication fails",
  },
  "auth.backToSignIn": {
    message: "Volver a iniciar sesión",
    description: "Link text to return to sign in page",
  },
  "auth.backToSignUp": {
    message: "Volver a Registrarse",
    description: "Link text to return to sign up page",
  },
  "auth.confirmNewPassword": {
    message: "Confirmar Nueva Contraseña",
    description: "Label for confirm password field",
  },
  "auth.confirmPassword": {
    message: "Confirmar Contraseña",
    description: "Label for password confirmation input field",
  },
  "auth.confirmPasswordRequired": {
    message: "Por favor confirme su contraseña",
    description: "Validation error when password confirmation is missing",
  },
  "auth.confirmYourNewPassword": {
    message: "Confirme su nueva contraseña",
    description: "Placeholder for confirm password input",
  },
  "auth.confirmYourPassword": {
    message: "Confirme su contraseña",
    description: "Placeholder for password confirmation",
  },
  "auth.createAccount": {
    message: "Crear cuenta",
    description: "Button to submit registration",
  },
  "auth.createYourAccount": {
    message: "Cree su cuenta",
    description: "Registration page title",
  },
  "auth.creatingAccount": {
    message: "Creando cuenta...",
    description: "Button state while creating account",
  },
  "auth.didNotReceiveOtp": {
    message: "¿No recibiste el código?",
    description: "Prompt asking if user didn't receive OTP",
  },
  "auth.dontHaveAccount": {
    message: "¿No tienes cuenta?",
    description: "Prompt text asking if user doesn't have account",
  },
  "auth.email": {
    message: "Correo electrónico",
    description: "Label for email input field",
  },
  "auth.emailAddress": {
    message: "Dirección de correo electrónico",
    description: "Email address field label",
  },
  "auth.emailInvalid": {
    message: "Por favor ingrese una dirección de correo electrónico válida",
    description: "Validation error when email format is invalid",
  },
  "auth.emailRequired": {
    message: "Se requiere el correo electrónico",
    description: "Validation error when email is not provided",
  },
  "auth.emailSent": {
    message: "¡Correo electrónico enviado!",
    description: "Success title after email sent",
  },
  "auth.emailSentDescription": {
    message:
      "Hemos enviado un enlace para restablecer la contraseña a su dirección de correo electrónico. Por favor revise su bandeja de entrada y siga las instrucciones para restablecer su contraseña.",
    description: "Detailed success message after reset email sent",
  },
  "auth.enterCredentials": {
    message: "Ingrese sus credenciales para acceder a su panel",
    description: "Login page description",
  },
  "auth.enterDetailsToGetStarted": {
    message: "Ingrese sus datos para comenzar con su panel",
    description: "Registration page description",
  },
  "auth.enterEmailForReset": {
    message:
      "Ingrese su dirección de correo electrónico y le enviaremos un enlace para restablecer su contraseña",
    description: "Instructions on forgot password page",
  },
  "auth.enterFirstName": {
    message: "Ingrese su nombre",
    description: "Placeholder for first name input",
  },
  "auth.enterLastName": {
    message: "Ingrese su apellido",
    description: "Placeholder for last name input",
  },
  "auth.enterNewPasswordBelow": {
    message: "Ingrese su nueva contraseña a continuación",
    description: "Instruction for reset password form",
  },
  "auth.enterOtpCode": {
    message: "Ingresa el código",
    description: "Label for OTP input field",
  },
  "auth.enterUsername": {
    message: "Ingrese su nombre de usuario (máximo 16 caracteres)",
    description: "Placeholder for username input with character limit",
  },
  "auth.enterYourEmail": {
    message: "Ingrese su correo electrónico",
    description: "Placeholder for email input",
  },
  "auth.enterYourNewPassword": {
    message: "Ingrese su nueva contraseña",
    description: "Placeholder for new password input",
  },
  "auth.enterYourPassword": {
    message: "Ingrese su contraseña (mínimo 6 caracteres)",
    description: "Placeholder for password input with requirement",
  },
  "auth.failedToResetPassword": {
    message:
      "Error al restablecer la contraseña. Por favor, inténtelo de nuevo.",
    description: "Error message when password reset fails",
  },
  "auth.failedToSendResetEmail": {
    message:
      "Error al enviar el correo electrónico de restablecimiento de contraseña. Por favor, inténtelo de nuevo.",
    description: "Error when reset email fails to send",
  },
  "auth.firstName": {
    message: "Nombre",
    description: "Label for first name input field",
  },
  "auth.firstNameMaxLength": {
    message: "El nombre debe tener como máximo 50 caracteres",
    description: "Validation error when first name is too long",
  },
  "auth.forgotPassword": {
    message: "¿Olvidaste tu contraseña?",
    description: "Link text for forgot password feature",
  },
  "auth.forgotYourPassword": {
    message: "¿Olvidó su contraseña?",
    description: "Forgot password page title",
  },
  "auth.lastName": {
    message: "Apellido",
    description: "Label for last name input field",
  },
  "auth.lastNameMaxLength": {
    message: "El apellido debe tener como máximo 50 caracteres",
    description: "Validation error when last name is too long",
  },
  "auth.loggingOut": {
    message: "Cerrando Sesión",
    description: "Title shown while logging out",
  },
  "auth.loggingOutMessage": {
    message: "Por favor espere mientras cerramos su sesión...",
    description: "Message shown while logging out",
  },
  "auth.login": {
    message: "Iniciar sesión / Registrarse",
    description: "Button label for login or signup",
  },
  "auth.loginError": {
    message: "Ocurrió un error during login",
    description: "Generic login error message",
  },
  "auth.loginFailed": {
    message: "Falló el inicio de sesión",
    description: "Error title when login fails",
  },
  "auth.logout": {
    message: "Cerrar sesión",
    description: "Button label to log out",
  },
  "auth.logoutAlertCancel": {
    message: "Cancelar",
    description: "Cancel button in logout confirmation dialog",
  },
  "auth.logoutAlertConfirm": {
    message: "Cerrar sesión",
    description: "Confirm button in logout confirmation dialog",
  },
  "auth.logoutAlertMsg": {
    message: "¿Seguro que quieres salir?",
    description: "Confirmation message asking user if they want to log out",
  },
  "auth.lovedByUsers": {
    message: "Amado por los usuarios",
    description: "Loved by users feature title",
  },
  "auth.lovedByUsersDescription": {
    message:
      "Únete a miles de usuarios satisfechos que confían en Beancount para sus necesidades contables",
    description: "Loved by users feature description",
  },
  "auth.newPassword": {
    message: "Nueva Contraseña",
    description: "Label for new password field",
  },
  "auth.newPasswordMinLength": {
    message: "La contraseña debe tener al menos 6 caracteres",
    description: "Validation error for password length",
  },
  "auth.newPasswordMaxLength": {
    message: "La contraseña debe tener como máximo 128 caracteres",
    description:
      "Validation error when new password exceeds the maximum length",
  },
  "auth.newPasswordRequired": {
    message: "Se requiere la contraseña",
    description: "Validation error for missing new password",
  },
  "auth.otpInvalidLength": {
    message: "El código OTP debe tener 4 dígitos",
    description: "Validation error when OTP length is invalid",
  },
  "auth.otpRequired": {
    message: "El código OTP es obligatorio",
    description: "Validation error when OTP is missing",
  },
  "auth.otpSentToYourEmail": {
    message:
      "Hemos enviado un código de 4 dígitos a tu dirección de correo electrónico",
    description: "Message showing OTP was sent to email",
  },
  "auth.otpVerificationError": {
    message: "Ocurrió un error durante la verificación OTP",
    description: "Generic error message for OTP verification",
  },
  "auth.otpVerificationFailed": {
    message: "La verificación OTP falló",
    description: "Error message when OTP verification fails",
  },
  "auth.password": {
    message: "Contraseña",
    description: "Label for password input field",
  },
  "auth.passwordMinLength": {
    message: "La contraseña debe tener al menos 6 caracteres",
    description: "Validation error when password is too short",
  },
  "auth.passwordMaxLength": {
    message: "La contraseña debe tener como máximo 128 caracteres",
    description: "Validation error when password exceeds the maximum length",
  },
  "auth.passwordRequired": {
    message: "Se requiere la contraseña",
    description: "Validation error when password is not provided",
  },
  "auth.passwordResetSuccessMessage": {
    message:
      "Su contraseña ha sido restablecida. Redirigiendo al inicio de sesión...",
    description: "Success message description",
  },
  "auth.passwordResetSuccessful": {
    message: "¡Contraseña restablecida exitosamente!",
    description: "Success message title",
  },
  "auth.passwordsDoNotMatch": {
    message: "Las contraseñas no coinciden",
    description: "Validation error when passwords don't match",
  },
  "auth.privacyPolicy": {
    message: "Política de Privacidad",
    description: "Link text for privacy policy",
  },
  "auth.realTimeInsights": {
    message: "Información en tiempo real",
    description: "Real-time insights feature title",
  },
  "auth.realTimeInsightsDescription": {
    message:
      "Obtén visibilidad instantánea de tu posición financiera y tendencias",
    description: "Real-time insights feature description",
  },
  "auth.redirectingToLogin": {
    message: "Redirigiendo a la página de inicio de sesión...",
    description: "Message shown after successful logout",
  },
  "auth.registrationError": {
    message: "Ocurrió un error during registration",
    description: "Generic registration error",
  },
  "auth.registrationFailed": {
    message: "Falló el registro",
    description: "Error when registration fails",
  },
  "auth.resetEmailError": {
    message: "Ocurrió un error while sending the password reset email",
    description: "Generic error for reset email sending",
  },
  "auth.resetPassword": {
    message: "Restablecer contraseña",
    description: "Page title or button for password reset",
  },
  "auth.resetPasswordButton": {
    message: "Restablecer contraseña",
    description: "Button text to reset password",
  },
  "auth.resetPasswordDescription": {
    message:
      "Ingrese su dirección de correo electrónico para recibir un enlace para restablecer su contraseña.",
    description: "Instructions for password reset process",
  },
  "auth.resetPasswordEmailSent": {
    message:
      "Se ha enviado un correo electrónico a su dirección de correo electrónico. Por favor revise su correo electrónico para restablecer su contraseña.",
    description: "Success message after password reset email is sent",
  },
  "auth.resetPasswordError": {
    message: "Ocurrió un error while resetting your password",
    description: "Generic error message for password reset",
  },
  "auth.resetYourPassword": {
    message: "Restablezca su contraseña",
    description: "Title for reset password page",
  },
  "auth.resettingPassword": {
    message: "Restableciendo contraseña...",
    description: "Button text while resetting password",
  },
  "auth.secureAccess": {
    message: "Acceso seguro",
    description: "Secure access feature title",
  },
  "auth.secureAccessDescription": {
    message:
      "Tus datos financieros están protegidos con seguridad de nivel empresarial",
    description: "Secure access feature description",
  },
  "auth.sendResetLink": {
    message: "Enviar enlace de restablecimiento",
    description: "Button to send password reset link",
  },
  "auth.sendResetPasswordEmail": {
    message: "Enviar correo de restablecimiento",
    description: "Button label to send password reset email",
  },
  "auth.sending": {
    message: "Enviando...",
    description: "Button state while sending email",
  },
  "auth.sessionExpired": {
    message: "Sesión Expirada",
    description: "Title when signup session is expired",
  },
  "auth.sessionExpiredDescription": {
    message: "La sesión de registro ha expirado o es inválida",
    description: "Description when session is expired",
  },
  "auth.sessionExpiredMessage": {
    message:
      "Esta sesión de registro ha expirado. Por favor, inicia el proceso de registro nuevamente.",
    description: "Alert message for expired session",
  },
  "auth.signIn": {
    message: "Iniciar sesión",
    description: "Button label for sign in action",
  },
  "auth.signInToAccount": {
    message: "Inicia sesión en tu cuenta de Beancount",
    description: "Login page subtitle",
  },
  "auth.signUp": {
    message: "Registrarse",
    description: "Button label for sign up action",
  },
  "auth.termsAgreementPrefix": {
    message:
      'Al hacer clic en "Crear cuenta", acepto los términos de beancount.io',
    description: "Prefix text before terms and privacy links on sign up form",
  },
  "auth.termsOfUse": {
    message: "Términos de Uso",
    description: "Link text for terms of use",
  },
  "auth.tokenExpired": {
    message: "Token Expirado",
    description: "Title when reset token is expired",
  },
  "auth.tokenExpiredDescription": {
    message:
      "El token de restablecimiento de contraseña está expirado o no es válido",
    description: "Description when token is expired",
  },
  "auth.tokenExpiredMessage": {
    message:
      "Este token de restablecimiento de contraseña está expirado. Por favor solicite uno nuevo.",
    description: "Alert message for expired token",
  },
  "auth.username": {
    message: "Usuarioname",
    description: "Username field label",
  },
  "auth.usernameAlphanumeric": {
    message: "Usuarioname can only contain letters and numbers",
    description: "Validation error when username contains invalid characters",
  },
  "auth.usernameLowercaseAlphanumeric": {
    message:
      "El nombre de usuario solo puede contener letras minúsculas, números y guiones bajos",
    description:
      "Validation error when username contains invalid characters (must be lowercase)",
  },
  "auth.usernameMaxLength": {
    message: "Usuarioname must be at most 16 characters",
    description: "Validation error when username too long",
  },
  "auth.usernamePublicHint": {
    message: "Este nombre de usuario es público y visible para otros",
    description: "Hint text explaining that username is publicly visible",
  },
  "auth.usernameRequired": {
    message: "Usuarioname is required",
    description: "Validation error when username is missing",
  },
  "auth.verifyEmail": {
    message: "Verificar Correo Electrónico",
    description: "Button text to verify email with OTP",
  },
  "auth.verifyYourEmail": {
    message: "Verifica tu correo electrónico",
    description: "OTP verification page title",
  },
  "auth.verifying": {
    message: "Verificando...",
    description: "Button text while verifying OTP",
  },
  "auth.welcomeBack": {
    message: "Bienvenido de nuevo",
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
    message: "Tu sesión ha expirado. Por favor, inicia sesión de nuevo.",
    description:
      "Banner shown on the login page when redirected here because the previous session's token expired or was revoked",
  },
};
export default esAuth;
