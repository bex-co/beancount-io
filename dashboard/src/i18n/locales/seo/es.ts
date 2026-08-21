export interface TranslationEntry {
  message: string;
  description: string;
}

const esSeo: Record<string, TranslationEntry> = {
  "seo.authCallback.description": {
    message: "Completando su inicio de sesión en Beancount.",
    description: "Auth callback page meta description",
  },
  "seo.authCallback.title": {
    message: "Iniciando Sesión",
    description: "Auth callback page title",
  },
  "seo.deviceAuth.description": {
    message: "Authorize CLI access to your Beancount account.",
    description: "Device auth page meta description",
  },
  "seo.deviceAuth.title": {
    message: "Authorize CLI Access",
    description: "Device auth page title",
  },
  "seo.dashboard.description": {
    message:
      "Su panel de control de Beancount. Acceda a sus libros contables y gestione sus datos financieros.",
    description: "Dashboard page meta description",
  },
  "seo.dashboard.title": {
    message: "Panel de Control",
    description: "Dashboard page title",
  },
  "seo.error.description": {
    message:
      "Se produjo un error al cargar esta página. Por favor, inténtelo de nuevo o vuelva a la página principal.",
    description: "Error page meta description",
  },
  "seo.error.title": {
    message: "Error",
    description: "Error page title",
  },
  "seo.forgotPassword.description": {
    message:
      "Restablezca la contraseña de su cuenta de Beancount ingresando su dirección de correo electrónico.",
    description: "Forgot password page meta description",
  },
  "seo.forgotPassword.title": {
    message: "Olvidé mi Contraseña",
    description: "Forgot password page title",
  },
  "seo.home.description": {
    message:
      "Contabilidad profesional en texto plano con Beancount. Realice seguimiento de finanzas, gestione libros contables y genere informes con contabilidad potente, precisa y auditable.",
    description: "Home page meta description",
  },
  "seo.home.title": {
    message: "Beancount Dashboard - Contabilidad en Texto Plano",
    description: "Home page title",
  },
  "seo.ledgerAccount.description": {
    message:
      "Detalles de cuenta e historial de transacciones de {accountName} en {ledgerName}.",
    description: "Account detail page meta description",
  },
  "seo.ledgerAccount.title": {
    message: "{accountName} - {ledgerName}",
    description: "Account detail page title with account and ledger name",
  },
  "seo.ledgerAsk.description": {
    message:
      "Haz preguntas sobre los datos financieros de {ledgerName} usando IA. Analiza transacciones, explora saldos de cuentas, comprende tendencias y obtén información contable instantánea.",
    description: "Ask AI page meta description for SEO",
  },
  "seo.ledgerAsk.title": {
    message: "Preguntar sobre {ledgerName} - Asistente financiero IA",
    description: "Ask AI page title with ledger name for SEO",
  },
  "seo.ledgerBalanceSheet.description": {
    message:
      "Informe de balance general de {ledgerName}. Vea activos, pasivos y patrimonio de un vistazo.",
    description: "Balance sheet page meta description",
  },
  "seo.ledgerBalanceSheet.title": {
    message: "Balance General - {ledgerName}",
    description: "Balance sheet page title with ledger name",
  },
  "seo.ledgerCommodities.description": {
    message:
      "Lista de productos y precios de {ledgerName}. Realice seguimiento de monedas, acciones y otros activos.",
    description: "Commodities page meta description",
  },
  "seo.ledgerCommodities.title": {
    message: "Productos - {ledgerName}",
    description: "Commodities page title with ledger name",
  },
  "seo.ledgerCommits.description": {
    message:
      "Ver historial de commits y control de versiones de {ledgerName}. Seguimiento de cambios en tus archivos de libro mayor.",
    description: "Commits page meta description with ledger name",
  },
  "seo.ledgerCommits.title": {
    message: "Commits - {ledgerName}",
    description: "Commits page title with ledger name",
  },
  "seo.ledgerDashboard.description": {
    message:
      "Vea y gestione todos sus libros contables de Beancount. Cree nuevos libros, acceda a los existentes y organice sus registros financieros.",
    description: "Ledger dashboard page meta description",
  },
  "seo.ledgerDashboard.title": {
    message: "Mis Libros Contables",
    description: "Ledger dashboard page title",
  },
  "seo.ledgerDocuments.description": {
    message:
      "Adjuntos de documentos y recibos de {ledgerName}. Organice archivos de respaldo para sus transacciones.",
    description: "Documents page meta description",
  },
  "seo.ledgerDocuments.title": {
    message: "Documentos - {ledgerName}",
    description: "Documents page title with ledger name",
  },
  "seo.ledgerErrors.description": {
    message:
      "Errores de validación y advertencias de {ledgerName}. Revise y corrija problemas en su libro contable.",
    description: "Errors page meta description",
  },
  "seo.ledgerErrors.title": {
    message: "Errores - {ledgerName}",
    description: "Errors page title with ledger name",
  },
  "seo.ledgerEvents.description": {
    message:
      "Línea de tiempo de eventos de {ledgerName}. Realice seguimiento de eventos financieros importantes e hitos.",
    description: "Events page meta description",
  },
  "seo.ledgerEvents.title": {
    message: "Eventos - {ledgerName}",
    description: "Events page title with ledger name",
  },
  "seo.ledgerFiles.description": {
    message: "Explore los archivos contables de Beancount de {ledgerName}.",
    description: "Ledger file browser meta description",
  },
  "seo.ledgerFiles.title": {
    message: "Archivos - {ledgerName}",
    description: "File editor page title with ledger name",
  },
  "seo.ledgerFilesCreate.description": {
    message:
      "Cree un nuevo archivo en {ledgerName}. Agregue cuentas, transacciones u otras entradas de Beancount.",
    description: "Create file page meta description",
  },
  "seo.ledgerFilesCreate.title": {
    message: "Crear Archivo - {ledgerName}",
    description: "Create file page title with ledger name",
  },
  "seo.ledgerFilesUpload.description": {
    message:
      "Suba archivos a {ledgerName}. Importe archivos o documentos de Beancount existentes.",
    description: "Upload files page meta description",
  },
  "seo.ledgerFilesUpload.title": {
    message: "Subir Archivos - {ledgerName}",
    description: "Upload files page title with ledger name",
  },
  "seo.ledgerGallery.description": {
    message:
      "Explore ejemplos y plantillas públicas de libros contables de Beancount. Encuentre inspiración para su propia configuración de seguimiento financiero.",
    description: "Ledger gallery page meta description",
  },
  "seo.ledgerGallery.title": {
    message: "Galería de Libros Contables",
    description: "Ledger gallery page title",
  },
  "seo.ledgerHoldings.description": {
    message:
      "Tenencias de inversión y cartera de {ledgerName}. Vea posiciones actuales y valoraciones.",
    description: "Holdings page meta description",
  },
  "seo.ledgerHoldings.title": {
    message: "Tenencias - {ledgerName}",
    description: "Holdings page title with ledger name",
  },
  "seo.ledgerImport.description": {
    message:
      "Importe transacciones a {ledgerName} desde CSV, PDF, OFX o imágenes. Análisis con IA para extractos bancarios y recibos.",
    description: "Import page meta description",
  },
  "seo.ledgerImport.title": {
    message: "Importación inteligente - {ledgerName}",
    description: "Import page title with ledger name",
  },
  "seo.ledgerIncomeStatement.description": {
    message:
      "Informe de estado de resultados de {ledgerName}. Realice seguimiento de ingresos, gastos e ingreso neto a lo largo del tiempo.",
    description: "Income statement page meta description",
  },
  "seo.ledgerIncomeStatement.title": {
    message: "Estado de Resultados - {ledgerName}",
    description: "Income statement page title with ledger name",
  },
  "seo.ledgerJournal.description": {
    message:
      "Diario de transacciones de {ledgerName}. Vea, busque y filtre todas sus entradas contables.",
    description: "Journal page meta description",
  },
  "seo.ledgerJournal.title": {
    message: "Diario - {ledgerName}",
    description: "Journal page title with ledger name",
  },
  "seo.ledgerOverview.description": {
    message:
      "Resumen financiero e informes de {ledgerName}. Vea patrimonio neto, ingresos, gastos y distribución de activos.",
    description: "Ledger overview page meta description",
  },
  "seo.ledgerOverview.title": {
    message: "Resumen - {ledgerName}",
    description: "Ledger overview page title with ledger name",
  },
  "seo.ledgerPullRequest.description": {
    message:
      "Revisar cambios de solicitud de extracción para {ledgerName}. Aprobar o rechazar modificaciones propuestas a tu libro mayor.",
    description: "Pull request page meta description",
  },
  "seo.ledgerPullRequest.title": {
    message: "Pull Request #{prNumber} - {ledgerName}",
    description: "Pull request page title with PR number and ledger name",
  },
  "seo.plaidSettings.description": {
    message:
      "Conecta cuentas bancarias a {ledgerName} usando Plaid. Importa transacciones automáticamente y sincroniza datos financieros.",
    description: "Plaid settings page meta description",
  },
  "seo.plaidSettings.title": {
    message: "Cuentas conectadas - {ledgerName}",
    description: "Plaid settings page title with ledger name",
  },
  "seo.plaidConnections.description": {
    message:
      "Manage your connected bank accounts for {ledgerName} — link new banks, update account mappings, sync, or disconnect.",
    description: "Plaid connections management page meta description",
  },
  "seo.plaidConnections.title": {
    message: "Manage Bank Connections - {ledgerName}",
    description: "Plaid connections management page title with ledger name",
  },
  "seo.ledgerQuery.description": {
    message:
      "Consulte {ledgerName} con sintaxis BQL. Ejecute consultas personalizadas y analice sus datos financieros.",
    description: "BQL query page meta description",
  },
  "seo.ledgerQuery.title": {
    message: "Consulta BQL - {ledgerName}",
    description: "BQL query page title with ledger name",
  },
  "seo.ledgerSettings.description": {
    message:
      "Configure ajustes del libro {ledgerName}. Gestione preferencias, acceso y opciones del libro contable.",
    description: "Ledger settings page meta description",
  },
  "seo.ledgerSettings.title": {
    message: "Configuración del libro - {ledgerName}",
    description: "Ledger settings page title with ledger name",
  },
  "seo.ledgerStatistics.description": {
    message:
      "Análisis estadístico de {ledgerName}. Vea métricas, tendencias e información de sus datos financieros.",
    description: "Statistics page meta description",
  },
  "seo.ledgerStatistics.title": {
    message: "Estadísticas - {ledgerName}",
    description: "Statistics page title with ledger name",
  },
  "seo.ledgerTrialBalance.description": {
    message:
      "Informe de balance de comprobación de {ledgerName}. Verifique la igualdad de débitos y créditos en sus cuentas.",
    description: "Trial balance page meta description",
  },
  "seo.ledgerTrialBalance.title": {
    message: "Balance de Comprobación - {ledgerName}",
    description: "Trial balance page title with ledger name",
  },
  "seo.login.description": {
    message:
      "Inicie sesión en su cuenta de Beancount para gestionar sus libros contables y registros financieros.",
    description: "Login page meta description",
  },
  "seo.login.title": {
    message: "Iniciar Sesión",
    description: "Login page title",
  },
  "seo.logout.description": {
    message: "Cerrando sesión de su cuenta de Beancount.",
    description: "Logout page meta description",
  },
  "seo.logout.title": {
    message: "Cerrar Sesión",
    description: "Logout page title",
  },
  "seo.notFound.description": {
    message:
      "La página que busca no existe. Es posible que haya sido movida o eliminada.",
    description: "404 page meta description",
  },
  "seo.notFound.title": {
    message: "Página no encontrada",
    description: "404 page title",
  },
  "seo.resetPassword.description": {
    message: "Cree una nueva contraseña para su cuenta de Beancount.",
    description: "Reset password page meta description",
  },
  "seo.resetPassword.title": {
    message: "Restablecer Contraseña",
    description: "Reset password page title",
  },
  "seo.settingsGeneral.description": {
    message:
      "Actualice su información de perfil, preferencias de idioma y configuración general de la cuenta.",
    description: "General settings page meta description",
  },
  "seo.settingsGeneral.title": {
    message: "Configuración General",
    description: "General settings page title",
  },
  "seo.settingsSshKeys.description": {
    message:
      "Gestione las claves SSH para acceso seguro a sus libros contables de Beancount a través de Git.",
    description: "SSH keys settings page meta description",
  },
  "seo.settingsSshKeys.title": {
    message: "Claves SSH",
    description: "SSH keys settings page title",
  },
  "seo.settingsDangerZone.title": {
    message: "Zona de peligro",
    description: "Danger zone settings page title",
  },
  "seo.settingsDangerZone.description": {
    message:
      "Gestione acciones destructivas de la cuenta como eliminar permanentemente su cuenta y todos los datos.",
    description: "Danger zone settings page meta description",
  },
  "seo.signUp.description": {
    message:
      "Cree su cuenta gratuita de Beancount para comenzar a realizar seguimiento de sus finanzas con contabilidad en texto plano.",
    description: "Sign up page meta description",
  },
  "seo.signUp.title": {
    message: "Crear Cuenta",
    description: "Sign up page title",
  },
  "seo.signUpOtp.description": {
    message:
      "Verifique su dirección de correo electrónico para completar el registro de su cuenta de Beancount.",
    description: "OTP verification page meta description",
  },
  "seo.signUpOtp.title": {
    message: "Verificar Correo",
    description: "OTP verification page title",
  },
  "seo.welcome.description": {
    message:
      "¡Bienvenido a Beancount! Comience con la contabilidad en texto plano y la gestión financiera.",
    description: "Welcome page meta description",
  },
  "seo.welcome.title": {
    message: "Bienvenido",
    description: "Welcome page title",
  },
};

export default esSeo;
