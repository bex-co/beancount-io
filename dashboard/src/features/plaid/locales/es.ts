export interface TranslationEntry {
  message: string;
  description: string;
}

const esPlaid: Record<string, TranslationEntry> = {
  // Common
  "plaid.connectedSuccessfully": {
    message: "✓ Conectado Exitosamente",
    description: "Success message shown when bank is connected",
  },
  "plaid.sidebar.label": {
    message: "Sincronización bancaria",
    description:
      "Main ledger sidebar nav label for the bank/Plaid page — a stable noun that covers both the not-yet-connected (connect a bank) and already-connected (review bank transactions) states, unlike an action phrase such as 'Connect Bank'",
  },

  // Onboarding State - Header
  "plaid.onboarding.title": {
    message: "Conectar una cuenta",
    description: "Main title for onboarding page",
  },
  "plaid.onboarding.subtitle": {
    message:
      "Importa transacciones automáticamente con cifrado de nivel bancario",
    description: "Subtitle for onboarding page",
  },

  // Onboarding State - Hero Section
  "plaid.onboarding.hero.title": {
    message: "Optimiza Tu Flujo de Trabajo Contable",
    description: "Hero section title",
  },
  "plaid.onboarding.hero.description": {
    message:
      "Conecta tus cuentas bancarias a través de Plaid para importar transacciones automáticamente, ahorrar horas de entrada manual de datos y mantener tu libro mayor actualizado en tiempo real.",
    description: "Hero section description",
  },
  "plaid.onboarding.hero.institutionsCount": {
    message: "Más de 11,000 instituciones",
    description: "Feature highlight - number of supported institutions",
  },
  "plaid.onboarding.hero.bankLevelSecurity": {
    message: "Seguridad de nivel bancario",
    description: "Feature highlight - security feature",
  },
  "plaid.onboarding.hero.realTimeSync": {
    message: "Sincronización en tiempo real",
    description: "Feature highlight - real-time syncing",
  },
  "plaid.onboarding.getStarted": {
    message: "Comenzar",
    description: "Button text to start connecting bank",
  },

  // Onboarding State - Benefits
  "plaid.onboarding.benefits.title": {
    message: "¿Por Qué Conectar Tu Banco?",
    description: "Benefits section title",
  },
  "plaid.onboarding.benefits.automaticImport.title": {
    message: "Importación Automática",
    description: "Benefit card title for automatic import",
  },
  "plaid.onboarding.benefits.automaticImport.description": {
    message:
      "Ahorra horas de entrada manual importando transacciones automáticamente desde tus cuentas bancarias en tiempo real. Concéntrate en el análisis, no en la entrada de datos.",
    description: "Benefit card description for automatic import",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.title": {
    message: "Seguridad de Nivel Bancario",
    description: "Benefit card title for security",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.description": {
    message:
      "Plaid usa cifrado de 256 bits y es confiable para miles de instituciones financieras. Tus credenciales nunca se almacenan en nuestros servidores.",
    description: "Benefit card description for security",
  },
  "plaid.onboarding.benefits.privacyFirst.title": {
    message: "Privacidad Primero",
    description: "Benefit card title for privacy",
  },
  "plaid.onboarding.benefits.privacyFirst.description": {
    message:
      "Nunca almacenamos tus credenciales bancarias ni vendemos tus datos. Tu información financiera está protegida por estándares de privacidad líderes en la industria.",
    description: "Benefit card description for privacy",
  },

  // Onboarding State - How It Works
  "plaid.onboarding.howItWorks.title": {
    message: "Cómo Funciona",
    description: "How it works section title",
  },
  "plaid.onboarding.howItWorks.description": {
    message: "Conecta tu cuenta bancaria en solo unos simples pasos",
    description: "How it works section description",
  },
  "plaid.onboarding.howItWorks.step1.title": {
    message: "Selecciona Tu Banco",
    description: "Step 1 title",
  },
  "plaid.onboarding.howItWorks.step1.description": {
    message: "Busca entre más de 11,000 instituciones financieras compatibles",
    description: "Step 1 description",
  },
  "plaid.onboarding.howItWorks.step2.title": {
    message: "Autenticación Segura",
    description: "Step 2 title",
  },
  "plaid.onboarding.howItWorks.step2.description": {
    message:
      "Inicia sesión de forma segura a través del sistema de autenticación de tu banco",
    description: "Step 2 description",
  },
  "plaid.onboarding.howItWorks.step3.title": {
    message: "Comenzar a Importar",
    description: "Step 3 title",
  },
  "plaid.onboarding.howItWorks.step3.description": {
    message:
      "Tus transacciones se sincronizarán automáticamente con tu libro mayor",
    description: "Step 3 description",
  },

  // Management State
  "plaid.management.connectAnother": {
    message: "Conectar Otro Banco",
    description:
      "Button text to connect another bank, shown when at least one bank is already connected",
  },
  "plaid.management.connectBank": {
    message: "Conectar Banco",
    description:
      "Button text to connect a bank, shown on the connections page when no bank is connected yet",
  },
  "plaid.management.connectionsTitle": {
    message: "Bank Connections",
    description: "Section title for the list of connected banks",
  },
  "plaid.management.connectionsSubtitle": {
    message: "Manage account mappings, sync, and disconnect banks.",
    description: "Section subtitle for the list of connected banks",
  },
  "plaid.management.noConnectionsTitle": {
    message: "No Hay Bancos Conectados",
    description:
      "Empty state title on the connections page when no bank is connected",
  },
  "plaid.management.noConnectionsDescription": {
    message: "Conecta un banco para importar transacciones automáticamente.",
    description:
      "Empty state description on the connections page when no bank is connected",
  },
  "plaid.management.sync": {
    message: "Sync",
    description: "Button text to sync transactions across every connected bank",
  },
  "plaid.management.syncing": {
    message: "Syncing...",
    description: "Button text while syncing every connected bank",
  },
  "plaid.management.manageBanks": {
    message: "Manage Banks",
    description:
      "Button text linking to the dedicated bank-connection management page",
  },
  "plaid.management.backToTransactions": {
    message: "Back to Transactions",
    description:
      "Back button text on the manage-banks page, returning to the transaction review page",
  },
  "plaid.management.toast.error": {
    message: "Error",
    description: "Generic error toast title",
  },
  "plaid.management.toast.syncAllComplete": {
    message: "Sync Complete",
    description: "Toast title after syncing every connected bank",
  },
  "plaid.management.toast.syncAllCompleteDescription": {
    message:
      "{count} new transaction(s) synced across {institutionCount} bank(s).",
    description:
      "Toast description after syncing every connected bank - interpolation: {count}, {institutionCount}",
  },
  "plaid.management.toast.syncAllSkipped": {
    message: "{count} bank(s) need reconnecting",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count}",
  },
  "plaid.management.toast.syncAllFailedDescription": {
    message: "Failed to sync transactions. Please try again.",
    description: "Toast description when Sync All fails",
  },

  // Bank Account List
  "plaid.bankAccount.linkedOn": {
    message: "Vinculado el {date}",
    description:
      "Date when bank was linked - interpolation: {date} for formatted date",
  },
  "plaid.bankAccount.status.active": {
    message: "Activo",
    description: "Status badge for active bank connection",
  },
  "plaid.bankAccount.status.reauthRequired": {
    message: "Se Requiere Reautenticación",
    description: "Status badge when reauthentication is required",
  },
  "plaid.bankAccount.status.disabled": {
    message: "Deshabilitado",
    description: "Status badge for disabled bank connection",
  },

  // Institution Detail - Header
  "plaid.institutionDetail.lastSynced": {
    message: "Última sincronización",
    description: "Label for last sync timestamp",
  },
  "plaid.institutionDetail.transactionsCount": {
    message: "{count} transacciones",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.syncFailed": {
    message: "Falló",
    description: "Label when sync fails",
  },
  "plaid.institutionDetail.reconnecting": {
    message: "Reconectando...",
    description: "Button text while reconnecting",
  },
  "plaid.institutionDetail.reconnectBank": {
    message: "Reconectar Banco",
    description: "Button text to reconnect bank",
  },
  "plaid.institutionDetail.disconnecting": {
    message: "Desconectando...",
    description: "Button text while disconnecting",
  },
  "plaid.institutionDetail.disconnect": {
    message: "Desconectar",
    description: "Button text to disconnect bank",
  },
  "plaid.institutionDetail.disconnectTitle": {
    message: "Desconectar Cuenta Bancaria",
    description: "Alert dialog title for disconnect confirmation",
  },
  "plaid.institutionDetail.disconnectDescription": {
    message:
      "¿Estás seguro de que quieres desconectar {institutionName}? Esto eliminará todas las cuentas conectadas y detendrá la sincronización automática de transacciones.",
    description:
      "Alert dialog description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.cancel": {
    message: "Cancelar",
    description: "Cancel button text",
  },

  // Institution Detail - Toast Messages
  "plaid.institutionDetail.toast.bankDisconnected": {
    message: "Banco Desconectado",
    description: "Toast title when bank is disconnected",
  },
  "plaid.institutionDetail.toast.bankDisconnectedDescription": {
    message: "{institutionName} ha sido desconectado.",
    description:
      "Toast description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.toast.error": {
    message: "Error",
    description: "Generic error toast title",
  },
  "plaid.institutionDetail.toast.disconnectError": {
    message: "Error al desconectar la cuenta bancaria.",
    description: "Toast description for disconnect error",
  },

  // Account Mapping
  "plaid.accountMapping.selectAccount": {
    message: "Selecciona una cuenta bancaria para configurar mapeos de cuentas",
    description: "Placeholder message when no account is selected",
  },
  "plaid.accountMapping.noAccounts": {
    message: "No se encontraron cuentas para este banco",
    description: "Message when no accounts are available",
  },
  "plaid.accountMapping.manageAccounts": {
    message: "Gestionar cuentas",
    description:
      "Button that opens Plaid Link so the user can add or remove accounts under a bank",
  },
  "plaid.accountMapping.manageAccountsHint": {
    message: "Añade o elimina cuentas compartidas por este banco",
    description: "Tooltip explaining what the manage accounts button does",
  },
  "plaid.accountMapping.manageAccountsRequiresReauth": {
    message: "Vuelve a conectar este banco primero",
    description:
      "Tooltip shown when the manage accounts button is disabled because the bank needs reauthentication",
  },
  "plaid.accountMapping.addAccounts": {
    message: "Añadir cuentas",
    description:
      "Button shown in the empty state that opens Plaid Link to share accounts",
  },
  "plaid.accountMapping.manageAccountsLoading": {
    message: "Actualizando cuentas...",
    description: "Loading label while the manage accounts flow is running",
  },
  "plaid.accountMapping.manageAccountsPreparing": {
    message: "Preparando...",
    description: "Loading label while the Plaid link token is being created",
  },
  "plaid.accountMapping.manageAccountsWaiting": {
    message: "Esperando a tu banco...",
    description: "Loading label while the user is inside the Plaid Link dialog",
  },
  "plaid.accountMapping.manageAccountsReconciling": {
    message: "Aplicando cambios...",
    description: "Loading label while the account list is being reconciled",
  },
  "plaid.accountMapping.manageAccountsUpdatedTitle": {
    message: "Cuentas actualizadas",
    description: "Toast title after the account list changed",
  },
  "plaid.accountMapping.manageAccountsUpdated": {
    message: "{added} añadidas, {removed} eliminadas.",
    description: "Toast body summarising how the account list changed",
  },
  "plaid.accountMapping.manageAccountsNoChangesTitle": {
    message: "Sin cambios en las cuentas",
    description: "Toast title when the account list came back identical",
  },
  "plaid.accountMapping.manageAccountsNoChanges": {
    message:
      "No cambió nada. Algunos bancos solo permiten cambiar qué cuentas se comparten desde su propia app o sitio web.",
    description:
      "Toast body when Plaid completed without offering account selection",
  },
  "plaid.accountMapping.manageAccountsFailedTitle": {
    message: "No se pudieron actualizar las cuentas",
    description: "Toast title when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsFailed": {
    message:
      "Es posible que tu banco haya guardado el cambio. Vuelve a abrir Gestionar cuentas para intentarlo de nuevo.",
    description: "Toast body when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsCancelledTitle": {
    message: "Cambios de cuentas cancelados",
    description: "Toast title when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.manageAccountsCancelled": {
    message: "Plaid Link se cerró sin cambiar ninguna cuenta.",
    description: "Toast body when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.title": {
    message: "Cuentas",
    description:
      "Section label for the account mapping list within a bank card",
  },
  "plaid.accountMapping.currency": {
    message: "Moneda",
    description: "Label for the account's ledger currency selector",
  },
  "plaid.accountMapping.beancountAccount": {
    message: "Cuenta de Beancount",
    description: "Label for beancount account input",
  },
  "plaid.accountMapping.placeholder": {
    message: "Assets:Checking",
    description: "Placeholder for account input",
  },
  "plaid.accountMapping.saving": {
    message: "Guardando...",
    description: "Button text while saving",
  },
  "plaid.accountMapping.save": {
    message: "Guardar",
    description: "Save button text",
  },
  "plaid.accountMapping.cancel": {
    message: "Cancelar",
    description: "Cancel button text",
  },
  "plaid.accountMapping.notMapped": {
    message: "No mapeado",
    description: "Label for unmapped account",
  },
  "plaid.accountMapping.edit": {
    message: "Editar",
    description: "Edit button text",
  },
  "plaid.accountMapping.setMapping": {
    message: "Establecer Mapeo",
    description: "Button text to set mapping for unmapped account",
  },
  "plaid.accountMapping.aiSuggested": {
    message: "AI suggested",
    description: "Badge/hint shown next to an AI-prefilled account mapping",
  },
  "plaid.accountMapping.suggestedAccount": {
    message: "AI suggests: {account}",
    description:
      "Inline hint showing the AI-suggested account for an unmapped account - interpolation: {account}",
  },
  "plaid.accountMapping.suggesting": {
    message: "Getting AI suggestions...",
    description: "Loading label while AI mapping suggestions are fetched",
  },
  "plaid.accountMapping.acceptAllSuggestions": {
    message: "Accept All Suggestions ({count})",
    description:
      "Button text to accept every AI-suggested mapping at once - interpolation: {count}",
  },
  "plaid.accountMapping.accepting": {
    message: "Accepting...",
    description: "Button text while accepting all suggestions",
  },

  // Account Mapping - Toast Messages
  "plaid.accountMapping.toast.invalidAccount": {
    message: "Cuenta Inválida",
    description: "Toast title for invalid account",
  },
  "plaid.accountMapping.toast.invalidAccountDescription": {
    message: "Por favor, ingresa un nombre de cuenta de Beancount válido.",
    description: "Toast description for invalid account",
  },
  "plaid.accountMapping.toast.mappingSaved": {
    message: "Mapeo Guardado",
    description: "Toast title for successful mapping save",
  },
  "plaid.accountMapping.toast.mappingSavedDescription": {
    message: "{accountName} mapeado a {ledgerAccount} ({currency})",
    description:
      "Toast description for mapping save - interpolation: {accountName}, {ledgerAccount}, {currency}",
  },
  "plaid.accountMapping.toast.error": {
    message: "Error",
    description: "Generic error toast title",
  },
  "plaid.accountMapping.toast.errorDescription": {
    message: "Error al guardar el mapeo de cuenta.",
    description: "Toast description for save error",
  },
  "plaid.accountMapping.toast.acceptedAll": {
    message: "Suggestions Accepted",
    description: "Toast title after accepting all AI mapping suggestions",
  },
  "plaid.accountMapping.toast.acceptedAllDescription": {
    message: "Mapped {count} account(s) using AI suggestions.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count}",
  },

  // Account Detail Page

  // Transaction Review Table
  "plaid.transactionReview.noPendingTitle": {
    message: "No Hay Transacciones Bancarias",
    description:
      "Title shown when there are no unsynced bank transactions awaiting review",
  },
  "plaid.transactionReview.noPendingDescription": {
    message:
      "Todas las transacciones han sido sincronizadas con tu libro mayor o no hay transacciones nuevas.",
    description: "Description when no pending transactions",
  },
  "plaid.transactionReview.title": {
    message: "Transacciones Bancarias",
    description:
      "Card title for the list of unsynced bank transactions awaiting review before submission to the ledger",
  },
  "plaid.transactionReview.description": {
    message: "Revisa y envía {count} transacción{plural} a tu libro mayor",
    description:
      "Card description - interpolation: {count} for number, {plural} for 's' or empty",
  },
  "plaid.transactionReview.submitting": {
    message: "Enviando...",
    description: "Button text while submitting",
  },
  "plaid.transactionReview.submit": {
    message: "Enviar",
    description: "Submit button text",
  },
  "plaid.transactionReview.searchPlaceholder": {
    message: "Buscar por comerciante o descripción...",
    description: "Search input placeholder",
  },
  "plaid.transactionReview.filterByBank": {
    message: "Filtrar por banco",
    description:
      "Accessible name for the dropdown that narrows the table to one connected bank",
  },
  "plaid.transactionReview.allBanks": {
    message: "Todos los bancos",
    description: "Bank filter option that turns bank filtering off",
  },
  "plaid.transactionReview.filterByAccount": {
    message: "Filtrar por cuenta bancaria",
    description:
      "Accessible name for the dropdown that narrows the table to one bank account (the Plaid account, not the Beancount ledger account)",
  },
  "plaid.transactionReview.allAccounts": {
    message: "Todas las cuentas bancarias",
    description: "Bank account filter option that turns account filtering off",
  },
  "plaid.transactionReview.accountsSelected": {
    message: "{count} cuentas seleccionadas",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.noMatchingTransactions": {
    message: "Ninguna transacción coincide con los filtros actuales.",
    description:
      "Shown in place of table rows when the search box or the bank/account filters exclude every transaction",
  },
  "plaid.transactionReview.clearFilters": {
    message: "Borrar filtros",
    description:
      "Button that resets the search box and the bank and account filters",
  },
  "plaid.transactionReview.hiddenSelectedNotice": {
    message:
      "{count} transacción(es) seleccionada(s) están ocultas por los filtros actuales, pero aun así se enviarán o se eliminarán.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count}",
  },
  "plaid.transactionReview.selectFilePlaceholder": {
    message: "Elige en qué archivo importar",
    description: "Placeholder for the target ledger file picker",
  },
  "plaid.transactionReview.missingAccountsAlert": {
    message:
      "{count} transacción(es) seleccionada(s) necesita(n) cuentas de destino antes del envío.",
    description:
      "Alert message for missing target accounts - interpolation: {count}",
  },
  "plaid.transactionReview.selectAll": {
    message: "Seleccionar todo",
    description: "Checkbox label to select all transactions",
  },
  "plaid.transactionReview.date": {
    message: "Fecha",
    description: "Table header for date column",
  },
  "plaid.transactionReview.source": {
    message: "Bank",
    description: "Table header for the source institution/account column",
  },
  "plaid.transactionReview.sourceAccount": {
    message: "Source Account",
    description:
      "Table header for the editable Beancount source-account column, defaults from the account mapping",
  },
  "plaid.transactionReview.merchant": {
    message: "Comerciante",
    description: "Table header for merchant column",
  },
  "plaid.transactionReview.descriptionColumn": {
    message: "Descripción",
    description: "Table header for description column",
  },
  "plaid.transactionReview.amount": {
    message: "Monto",
    description: "Table header for amount column",
  },
  "plaid.transactionReview.targetAccount": {
    message: "Cuenta de Destino",
    description: "Table header for target account column",
  },
  "plaid.transactionReview.aiProcessing": {
    message: "IA...",
    description: "Button text while AI is processing",
  },
  "plaid.transactionReview.aiFill": {
    message: "Autocompletar con IA",
    description: "Button text for AI categorization",
  },
  "plaid.transactionReview.selectAccountPlaceholder": {
    message: "Seleccionar cuenta...",
    description: "Placeholder for account selection dropdown",
  },

  // Transaction Review - Toast Messages
  "plaid.transactionReview.toast.categorizationComplete": {
    message: "Categorización Completa",
    description: "Toast title when AI categorization completes",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription": {
    message: "IA sugirió cuentas para {count} transacciones.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationFailed": {
    message: "Categorización Fallida",
    description: "Toast title when AI categorization fails",
  },
  "plaid.transactionReview.toast.categorizationFailedDescription": {
    message:
      "Error al categorizar transacciones. Por favor, inténtalo de nuevo.",
    description: "Toast description for categorization failure",
  },
  "plaid.transactionReview.toast.noTransactionsSelected": {
    message: "No Hay Transacciones Seleccionadas",
    description: "Toast title when no transactions are selected",
  },
  "plaid.transactionReview.toast.noTransactionsSelectedDescription": {
    message: "Por favor, selecciona al menos una transacción para enviar.",
    description: "Toast description for no transactions selected",
  },
  "plaid.transactionReview.toast.missingTargetAccounts": {
    message: "Faltan Cuentas de Destino",
    description: "Toast title for missing target accounts",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription": {
    message:
      "{count} transacción(es) seleccionada(s) necesita(n) cuentas de destino.",
    description:
      "Toast description for missing accounts - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmitted": {
    message: "Transacciones Enviadas",
    description: "Toast title when transactions are submitted",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription": {
    message: "{count} transacciones agregadas a tu libro mayor.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.submissionFailed": {
    message: "Envío Fallido",
    description: "Toast title when submission fails",
  },
  "plaid.transactionReview.toast.submissionFailedDescription": {
    message: "Error al enviar transacciones. Por favor, inténtalo de nuevo.",
    description: "Toast description for submission failure",
  },
  "plaid.transactionReview.delete": {
    message: "Eliminar",
    description: "Delete button text",
  },
  "plaid.transactionReview.deleting": {
    message: "Eliminando...",
    description: "Button text while deleting",
  },
  "plaid.transactionReview.deleteConfirmTitle": {
    message: "¿Eliminar transacciones?",
    description: "Confirmation dialog title for bulk-deleting transactions",
  },
  "plaid.transactionReview.deleteConfirmDescription": {
    message:
      "Esto eliminará permanentemente de esta lista las {count} transacciones seleccionadas. Esta acción no se puede deshacer.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsDeleted": {
    message: "Transacciones eliminadas",
    description: "Toast title when transactions are deleted",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription": {
    message: "Se eliminaron {count} transacciones de esta lista.",
    description:
      "Toast description for deleted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.deletionFailed": {
    message: "Error al eliminar",
    description: "Toast title when deletion fails",
  },
  "plaid.transactionReview.toast.deletionFailedDescription": {
    message: "No se pudieron eliminar las transacciones. Inténtalo de nuevo.",
    description: "Toast description for deletion failure",
  },
};

export default esPlaid;
