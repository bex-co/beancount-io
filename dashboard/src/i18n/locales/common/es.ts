export interface TranslationEntry {
  message: string;
  description: string;
}

const esCommon: Record<string, TranslationEntry> = {
  "common.accountColumn": {
    message: "Cuenta",
    description: "Table column header for account names",
  },
  "common.actions": {
    message: "Transacciones",
    description: "Plural form of transaction",
  },
  "common.back": {
    message: "Atrás",
    description: "Button label to go back to previous page",
  },
  "common.beancountLogo": {
    message: "Logo de Beancount",
    description: "Alt text for Beancount logo",
  },
  "common.cancel": {
    message: "Cancelar",
    description: "Button label to cancel action",
  },
  "common.clearInput": {
    message: "Limpiar",
    description: "Aria label for clear input button",
  },
  "common.closeDialog": {
    message: "Cerrar",
    description: "Screen reader label for close dialog button",
  },
  "common.collaboratorsLimit": {
    message: "Límite de colaboradores",
    description: "Title for collaborator limit information",
  },
  "common.collaboratorsLimitReached": {
    message: "Límite de colaboradores alcanzado",
    description: "Title when collaborator limit is reached",
  },
  "common.copied": {
    message: "Copiado",
    description: "Status message indicating content was copied",
  },
  "common.copy": {
    message: "Copiar",
    description: "Button label to copy content",
  },
  "common.delete": {
    message: "Eliminar",
    description: "Button label to delete item",
  },
  "common.directives": {
    message: "directives",
    description:
      "Unit label for beancount directive count (e.g. '842 / 1000 directives')",
  },
  "common.directivesLimitApproaching": {
    message: "Approaching your free plan limit",
    description:
      "Secondary text shown when a ledger's directive usage is between 90% and 100% of the free-tier limit",
  },
  "common.directivesLimitReached": {
    message: "Free plan limit reached",
    description:
      "Secondary text shown when a ledger's directive usage is at or over the free-tier limit",
  },
  "common.edit": {
    message: "Editar",
    description: "Button label to edit item",
  },
  "common.errorDescription": {
    message:
      "Encontramos un error inesperado. Por favor, inténtelo de nuevo o regrese a la página anterior.",
    description: "Error page description",
  },
  "common.errorDetails": {
    message: "Detalles del error",
    description: "Label for expandable error details section",
  },
  "common.errorOccurred": {
    message: "Ocurrió un error",
    description: "Generic error message for error pages",
  },
  "common.errorTitle": {
    message: "Algo salió mal",
    description: "Error page title",
  },
  "common.failedToLoadData": {
    message: "Error al cargar datos",
    description: "Error title when data fails to load",
  },
  "common.failedToLoadLedger": {
    message: "Error al cargar el libro mayor",
    description: "Error title when ledger fails to load",
  },
  "common.goBack": {
    message: "Volver",
    description: "Button text to go back to previous page",
  },
  "common.goHome": {
    message: "Ir al inicio",
    description: "Button text to return to home page",
  },
  "common.goToNextPage": {
    message: "Ir a la página siguiente",
    description: "Aria label for next page button",
  },
  "common.goToPreviousPage": {
    message: "Ir a la página anterior",
    description: "Aria label for previous page button",
  },
  "common.import": {
    message: "Importar",
    description: "Label for import dropdown button",
  },
  "common.manualImport": {
    message: "Agregar entrada",
    description: "Label for add entry menu item (opens new entry dialog)",
  },
  "common.manualImportDesc": {
    message: "Transacción, saldo o nota",
    description: "Description for add entry menu item",
  },
  "common.smartImport": {
    message: "Importación inteligente",
    description: "Label for smart import menu item (navigates to import page)",
  },
  "common.smartImportDesc": {
    message: "Extractos bancarios, CSV, PDF o escaneos",
    description: "Description for smart import menu item",
  },
  "common.linkImport": {
    message: "Conectar banco",
    description:
      "Label for link account menu item (navigates to Plaid bank linking page)",
  },
  "common.linkImportDesc": {
    message: "Sincronizar transacciones automáticamente",
    description:
      "Description for link account menu item, emphasizing automatic sync via Plaid vs. manual/file import",
  },
  "common.uploadReceipt": {
    message: "Subir recibo",
    description:
      "Label for upload receipt menu item (navigates to receipt page)",
  },
  "common.uploadReceiptDesc": {
    message: "Escanear recibo con IA",
    description: "Description for upload receipt menu item",
  },
  "common.invalidParameters": {
    message: "Parámetros de URL no válidos",
    description: "Title for validation error page",
  },
  "common.invalidParametersDescription": {
    message:
      "Los parámetros de URL proporcionados no son válidos. Por favor, verifique el enlace e inténtelo de nuevo.",
    description: "Description for validation error page",
  },
  "common.lastUpdated": {
    message: "Última actualización",
    description: "Table column header for last update time",
  },
  "common.ledgerSettings": {
    message: "Configuración del libro",
    description:
      "Navigation label for ledger-specific settings page in sidebar",
  },
  "common.ledgersLimit": {
    message: "Límite de libros",
    description: "Title for ledger limit information",
  },
  "common.ledgersLimitReached": {
    message: "Límite de libros alcanzado",
    description: "Title when ledger limit is reached",
  },
  "common.loading": {
    message: "cargando...",
    description: "Loading state message",
  },
  "common.loadingData": {
    message: "Cargando datos...",
    description: "Generic loading state message",
  },
  "common.morePages": {
    message: "Más páginas",
    description: "Screen reader label for pagination ellipsis",
  },
  "common.name": {
    message: "Nombre",
    description: "Table column header for name",
  },
  "common.nearLimit": {
    message: "cerca del límite",
    description: "Indicator that user is close to their limit",
  },
  "common.networkConnectionFailed": {
    message: "Fallo en la conexión de red",
    description: "Error title when network connection fails",
  },
  "common.networkErrorDescription": {
    message:
      "No se puede conectar al servidor. Por favor verifique su conexión a Internet e intente nuevamente.",
    description: "Detailed description of network error",
  },
  "common.next": {
    message: "Siguiente",
    description: "Button label to proceed to next step",
  },
  "common.nextPage": {
    message: "Siguiente",
    description: "Text label for next page button",
  },
  "common.noDataFound": {
    message: "No se encontraron datos.",
    description: "Message when no data is available",
  },
  "common.noResultsFound": {
    message: "No se encontraron resultados.",
    description: "Message when search returns no results",
  },
  "common.otherColumn": {
    message: "Otro",
    description: "Table column header for other currencies/amounts",
  },
  "common.owner": {
    message: "Propietario",
    description: "Table column header for owner",
  },
  "common.pageNotFound": {
    message: "Página no encontrada",
    description: "Title for 404 page",
  },
  "common.pageNotFoundDescription": {
    message: "La página que busca no existe o ha sido movida a otra ubicación.",
    description: "Description for 404 page",
  },
  "common.paginationNav": {
    message: "paginación",
    description: "Aria label for pagination navigation",
  },
  "common.previous": {
    message: "Anterior",
    description: "Text label for previous page button",
  },
  "common.relatedPages": {
    message: "Páginas relacionadas",
    description: "Aria label for related pages navigation",
  },
  "common.save": {
    message: "Guardar",
    description: "Button label to save changes",
  },
  "common.saving": {
    message: "Guardando...",
    description: "Saving state message",
  },
  "common.seeAlso": {
    message: "Páginas relacionadas",
    description: "Heading for related pages navigation section",
  },
  "common.selectAView": {
    message: "Seleccionar una vista",
    description: "Placeholder for responsive tab trigger",
  },
  "common.selectDate": {
    message: "Seleccionar fecha",
    description: "Screen reader label for date picker button",
  },
  "common.settings": {
    message: "Configuración",
    description: "Navigation label for settings page",
  },
  "common.sidebar": {
    message: "Barra lateral",
    description: "Title for sidebar",
  },
  "common.sidebarDescription": {
    message: "Muestra la barra lateral móvil.",
    description: "Description of mobile sidebar for screen readers",
  },
  "common.stars": {
    message: "Estrellas",
    description: "Navigation label for starred ledgers page",
  },
  "common.status": {
    message: "Estado",
    description: "Table column header for status",
  },
  "common.toggleSidebar": {
    message: "Alternar barra lateral",
    description: "Tooltip for toggle sidebar button",
  },
  "common.tryAgain": {
    message: "Intentar de nuevo",
    description: "Button to retry failed action",
  },
  "common.unexpectedError": {
    message: "Ocurrió un error inesperado al cargar el libro mayor.",
    description: "Generic unexpected error message",
  },
  "common.unknown": {
    message: "Desconocido",
    description: "Placeholder for unknown or missing values",
  },
  "common.updating": {
    message: "actualizando...",
    description: "Updating state message",
  },
  "common.upgradeToPro": {
    message: "Actualizar a Pro",
    description:
      "Short CTA button shown in the sidebar directive-usage indicator once a ledger is approaching or over its free-tier directive limit",
  },
  "common.upgradeToUnlock": {
    message: "Actualizar para desbloquear",
    description: "Button text to upgrade subscription",
  },
  "common.userEmailFallback": {
    message: "usuario@ejemplo.com",
    description: "Fallback email when user email is not available",
  },
  "common.userFallback": {
    message: "Usuario",
    description: "Fallback username when user data is not available",
  },
  "common.download": {
    message: "Descargar",
    description: "Auto-generated from code usage",
  },
  "common.moreActions": {
    message: "Más acciones",
    description: "Label for dropdown menu with additional actions",
  },
  "common.learnMore": {
    message: "Más información",
    description: "Link text to learn more about a topic",
  },
  "common.pageDescription.account": {
    message:
      "Vista de detalles de cuenta para {ledgerName}. Analice transacciones, saldos e historial de la cuenta.",
    description: "Description for account page",
  },
  "common.pageDescription.ask": {
    message:
      "Haz preguntas sobre los datos financieros de {ledgerName} usando IA. Analiza transacciones, explora saldos de cuentas, comprende tendencias y obtén información contable instantánea.",
    description: "Description for AI ask page",
  },
  "common.pageDescription.balanceSheet": {
    message:
      "Vista del balance general para {ledgerName}. Analice activos, pasivos y patrimonio en cualquier momento.",
    description: "Description for balance sheet page",
  },
  "common.pageDescription.commodities": {
    message:
      "Visualice y gestione materias primas (divisas, acciones y activos) utilizadas en {ledgerName}. Realice un seguimiento de tipos de cambio e historial de precios.",
    description: "Description for commodities page",
  },
  "common.pageDescription.createFile": {
    message:
      "Cree un nuevo archivo en {ledgerName}. Agregue archivos del libro mayor de Beancount o documentos a su repositorio.",
    description: "Description for create file page",
  },
  "common.pageDescription.documents": {
    message:
      "Visualice documentos adjuntos a transacciones en {ledgerName}. Revise recibos, facturas y documentación de respaldo.",
    description: "Description for documents page",
  },
  "common.pageDescription.errors": {
    message:
      "Vista de errores de análisis y validación en {ledgerName}. Solucione problemas para garantizar informes financieros precisos.",
    description: "Description for errors page",
  },
  "common.pageDescription.events": {
    message:
      "Visualice eventos e hitos importantes en {ledgerName}. Realice un seguimiento de aperturas y cierres de cuentas y eventos del ciclo de vida.",
    description: "Description for events page",
  },
  "common.pageDescription.files": {
    message:
      "Visualice y edite archivos fuente de Beancount en {ledgerName}. Gestione su plan de cuentas e historial de transacciones.",
    description: "Description for files page",
  },
  "common.pageDescription.holdings": {
    message:
      "Analice sus participaciones actuales y cartera en {ledgerName}. Visualice asignación de activos, valores de mercado y ganancias no realizadas.",
    description: "Description for holdings page",
  },
  "common.pageDescription.import": {
    message:
      "Agregue transacciones a {ledgerName} desde extractos bancarios, hojas de cálculo o recibos. Compatible con CSV, PDF, OFX e imágenes de hasta 10 MB.",
    description: "Description for import page",
  },
  "common.pageDescription.incomeStatement": {
    message:
      "Vista de ingresos y gastos para {ledgerName}. Realice un seguimiento de ingresos, gastos y rentabilidad a lo largo del tiempo.",
    description: "Description for income statement page",
  },
  "common.pageDescription.journal": {
    message:
      "Visualice y filtre todas las transacciones en {ledgerName}. Busque por fecha, cuenta, descripción o beneficiario.",
    description: "Description for journal page",
  },
  "common.pageDescription.overview": {
    message:
      "Panel financiero para {ledgerName}. Revise saldos de cuentas, tendencias de patrimonio neto y resúmenes de ingresos/gastos.",
    description: "Description for overview page",
  },
  "common.pageDescription.query": {
    message:
      "Ejecute consultas BQL (Beancount Query Language) contra {ledgerName}. Filtre y analice sus datos financieros con sintaxis similar a SQL.",
    description: "Description for query page",
  },
  "common.pageDescription.settings": {
    message:
      "Configure ajustes para {ledgerName}. Gestione divisas operativas, colaboradores y configuración de privacidad.",
    description: "Description for settings page",
  },
  "common.pageDescription.statistics": {
    message:
      "Vista de estadísticas del libro mayor para {ledgerName}. Analice recuentos de transacciones, uso de cuentas y métricas de calidad de datos.",
    description: "Description for statistics page",
  },
  "common.pageDescription.trialBalance": {
    message:
      "Vista del balance de comprobación para {ledgerName}. Verifique débitos y créditos en todas las cuentas.",
    description: "Description for trial balance page",
  },
  "common.pageDescription.uploadFiles": {
    message:
      "Cargue archivos a {ledgerName}. Importe archivos o documentos de Beancount existentes.",
    description: "Description for upload files page",
  },
  "common.postings": {
    message: "Asientos",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.balanceSheet": {
    message: "Balance",
    description: "Link label for balance sheet page",
  },
  "common.relatedLinks.commodities": {
    message: "Materias primas",
    description: "Link label for commodities page",
  },
  "common.relatedLinks.createFile": {
    message: "Crear archivo",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.documents": {
    message: "Documentos",
    description: "Link label for documents page",
  },
  "common.relatedLinks.errors": {
    message: "Errores",
    description: "Link label for errors page",
  },
  "common.relatedLinks.events": {
    message: "Eventos",
    description: "Link label for events page",
  },
  "common.relatedLinks.files": {
    message: "Archivos",
    description: "Link label for files page",
  },
  "common.relatedLinks.holdings": {
    message: "Participaciones",
    description: "Link label for holdings page",
  },
  "common.relatedLinks.import": {
    message: "Importar",
    description: "Link label for import page",
  },
  "common.relatedLinks.incomeStatement": {
    message: "Estado de resultados",
    description: "Link label for income statement page",
  },
  "common.relatedLinks.journal": {
    message: "Diario",
    description: "Link label for journal page",
  },
  "common.relatedLinks.overview": {
    message: "Resumen",
    description: "Link label for overview page",
  },
  "common.relatedLinks.query": {
    message: "Consulta",
    description: "Link label for query page",
  },
  "common.relatedLinks.statistics": {
    message: "Estadísticas",
    description: "Link label for statistics page",
  },
  "common.relatedLinks.trialBalance": {
    message: "Balance de comprobación",
    description: "Link label for trial balance page",
  },
  "common.relatedLinks.uploadFiles": {
    message: "Cargar archivos",
    description: "Link label for upload files page",
  },
  "common.relatedLinks.versionHistory": {
    message: "Historial de versiones",
    description: "Link label for version history page",
  },
  "common.results": {
    message: "Resultados",
    description: "Auto-generated from code usage",
  },
  "common.rows": {
    message: "Filas",
    description: "Auto-generated from code usage",
  },
  "common.success": {
    message: "Éxito",
    description: "Auto-generated from code usage",
  },
  "common.assets": {
    message: "Activos",
    description: "Assets category in accounting",
  },
  "component.conversionSelect.atCost": {
    message: "Al Costo",
    description: "Conversion option for cost-based display",
  },
  "component.conversionSelect.atMarketValue": {
    message: "A Valor de Mercado",
    description: "Conversion option for market value display",
  },
  "common.reports": {
    message: "Informes",
    description: "Navigation group label for financial reports",
  },
  "common.advanced": {
    message: "Avanzado",
    description: "Navigation group label for advanced ledger tools",
  },
  "common.helpAndSupport": {
    message: "Ayuda y soporte",
    description: "Accessible label for the help and support menu",
  },
  "common.helpCenter": {
    message: "Centro de ayuda",
    description: "Menu item linking to product documentation",
  },
  "common.helpCenterDescription": {
    message: "Consulta guías y documentación",
    description: "Description for the help center menu item",
  },
  "common.communitySupport": {
    message: "Soporte de la comunidad",
    description: "Menu item linking to the community support channel",
  },
  "common.communitySupportDescription": {
    message: "Pregunta a la comunidad en Telegram",
    description: "Description for the community support menu item",
  },
  "common.requestFeature": {
    message: "Sugerir una función",
    description: "Menu item linking to the feature request page on GitHub",
  },
  "common.requestFeatureDescription": {
    message: "Comparte ideas o reporta errores en GitHub",
    description: "Description for the request a feature menu item",
  },
  "common.balanceSheet": {
    message: "Balance General",
    description: "Navigation label for balance sheet financial report",
  },
  "component.searchControls.clearAll": {
    message: "Limpiar all",
    description: "Button text to clear all filters",
  },
  "component.conversionSelect.convertedTo": {
    message: "Convertido a",
    description: "Prefix for currency conversion option",
  },
  "component.intervalSelect.daily": {
    message: "Diario",
    description: "Daily interval option",
  },
  "common.equity": {
    message: "Patrimonio",
    description: "Equity category in accounting",
  },
  "component.errorState.title": {
    message: "Error al cargar datos",
    description: "Error message when data fails to load",
  },
  "common.expenses": {
    message: "Gastos",
    description: "Expenses category in accounting",
  },
  "component.searchControls.failedToLoad": {
    message: "Error al cargar las opciones de filtro",
    description: "Error message when filter options fail to load",
  },
  "component.searchControls.filterByTagPayee": {
    message: "Filtrar por etiqueta, beneficiario, ...",
    description: "Placeholder for filter input with tags and payees",
  },
  "page.reports.hierarchyListDescription": {
    message:
      "Desglose detallado de {ledgerName} {sectionName} con valores en USD y otras materias primas",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "Lista de {sectionName}",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "Jerarquía de {sectionName}",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message:
      "Representación visual de la composición de {ledgerName} {sectionName}",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "common.income": {
    message: "Ingresos",
    description: "Income category in accounting",
  },
  "common.incomeStatement": {
    message: "Estado de Resultados",
    description: "Navigation label for income statement financial report",
  },
  "common.liabilities": {
    message: "Pasivos",
    description: "Liabilities category in accounting",
  },
  "common.netProfit": {
    message: "Beneficio Neto",
    description: "Label for net profit section",
  },
  "common.netWorth": {
    message: "Patrimonio Neto",
    description: "Label for net worth section",
  },
  "component.accountCombobox.noAccountsFound": {
    message: "No se encontraron cuentas",
    description: "Message when no accounts match search",
  },
  "component.sourceFileCombobox.placeholder": {
    message: "Buscar archivos...",
    description: "Placeholder for ledger file search",
  },
  "component.sourceFileCombobox.noFilesFound": {
    message: "No se encontraron archivos",
    description: "Message when no ledger files match search",
  },
  "component.emptyState.title": {
    message: "No Hay Datos Disponibles",
    description: "Title when no data is available",
  },
  "component.emptyState.noDataForFilters": {
    message: "No hay datos para los filtros seleccionados",
    description: "Auto-generated from code usage",
  },
  "component.combobox.noMatchesFound": {
    message: "No se encontraron coincidencias",
    description: "Message when search returns no results in combobox",
  },
  "common.overview": {
    message: "Vista General",
    description: "Navigation label for overview/dashboard page",
  },
  "component.errorState.retry": {
    message: "Por favor intente nuevamente más tarde",
    description: "Generic retry message",
  },
  "component.intervalSelect.quarterly": {
    message: "Trimestral",
    description: "Quarterly interval option",
  },
  "component.accountCombobox.placeholder": {
    message: "Buscar cuentas...",
    description: "Placeholder for account search",
  },
  "component.conversionSelect.placeholder": {
    message: "Seleccionar conversión",
    description: "Placeholder for conversion select dropdown",
  },
  "component.intervalSelect.placeholder": {
    message: "Seleccionar período de tiempo",
    description: "Placeholder for interval select dropdown",
  },
  "component.searchControls.time": {
    message: "Tiempo",
    description: "Placeholder for time filter",
  },
  "common.trialBalance": {
    message: "Balance de Comprobación",
    description: "Navigation label for trial balance report",
  },
  "component.combobox.placeholder": {
    message: "Escriba para buscar...",
    description: "Placeholder for search input in filter combobox",
  },
  "component.conversionSelect.units": {
    message: "Unidades",
    description: "Conversion option for unit display",
  },
  "component.intervalSelect.yearly": {
    message: "Anual",
    description: "Yearly interval option",
  },
  "component.searchControls.account": {
    message: "Cuenta",
    description: "Placeholder for account filter",
  },
  "common.error": {
    message: "Error",
    description: "Generic error label",
  },
  "common.sessionExpiredTitle": {
    message: "Sesión Expirada",
    description:
      "Title shown when a page load fails because the auth session expired",
  },
  "common.sessionExpiredDescription": {
    message:
      "Tu sesión de inicio ha expirado. Inicia sesión de nuevo para continuar.",
    description:
      "Description shown when a page load fails because the auth session expired",
  },
  "common.errors.unauthenticated": {
    message: "Inicia sesión para continuar.",
    description: "Error shown when the user must sign in (UNAUTHENTICATED)",
  },
  "common.errors.forbidden": {
    message: "No tienes permiso para realizar esta acción.",
    description: "Error shown when the user lacks permission (FORBIDDEN)",
  },
  "common.errors.notFound": {
    message: "No se encontró el recurso solicitado.",
    description: "Error shown when a resource does not exist (NOT_FOUND)",
  },
  "common.errors.badUserInput": {
    message:
      "Parte de la información proporcionada no es válida. Revísala e inténtalo de nuevo.",
    description: "Error shown for invalid client input (BAD_USER_INPUT)",
  },
  "common.errors.validationFailed": {
    message: "La validación falló. Revisa los datos e inténtalo de nuevo.",
    description: "Error shown when input validation fails (VALIDATION_FAILED)",
  },
  "common.errors.conflict": {
    message:
      "Este cambio entra en conflicto con el estado actual. Actualiza la página e inténtalo de nuevo.",
    description:
      "Error shown when a change conflicts with current state (CONFLICT)",
  },
  "common.errors.rateLimited": {
    message: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
    description: "Error shown when the user is rate limited (RATE_LIMITED)",
  },
  "common.errors.internal": {
    message: "Algo salió mal por nuestra parte. Inténtalo de nuevo más tarde.",
    description:
      "Error shown for unexpected server errors (INTERNAL_SERVER_ERROR)",
  },
  "common.errors.serviceUnavailable": {
    message:
      "El servicio no está disponible temporalmente. Inténtalo de nuevo en breve.",
    description:
      "Error shown when a backing service is down (SERVICE_UNAVAILABLE)",
  },
  "common.errors.resourceLimitReached": {
    message:
      "Has alcanzado el límite de tu plan. Mejora tu plan para continuar.",
    description:
      "Error shown when a plan resource limit is hit (RESOURCE_LIMIT_REACHED)",
  },
  "common.errors.operationNotAllowed": {
    message: "Esta acción no está permitida.",
    description:
      "Error shown when business rules forbid the action (OPERATION_NOT_ALLOWED)",
  },
  "common.errors.premiumRequired": {
    message: "Esta función requiere una suscripción Premium.",
    description:
      "Error shown when a feature needs a premium plan (PREMIUM_REQUIRED)",
  },
  "common.errors.network": {
    message:
      "Problema de conexión. Comprueba tu conexión a internet e inténtalo de nuevo.",
    description:
      "Error shown when the network request itself fails (offline, DNS)",
  },
  "common.errors.generic": {
    message: "Algo salió mal. Inténtalo de nuevo.",
    description: "Generic fallback error message for unrecognized errors",
  },
  "common.errorBoundary.title": {
    message: "Algo salió mal",
    description: "Title of the error boundary fallback panel",
  },
  "common.errorBoundary.description": {
    message:
      "No se pudo mostrar esta sección. El resto de la página debería seguir funcionando.",
    description: "Body of the error boundary fallback panel",
  },
  "common.copyCode": {
    message: "Copiar código",
    description: "Aria label for the copy button on code blocks",
  },
  "common.copiedToClipboard": {
    message: "Copiado al portapapeles",
    description: "Toast after content was copied to the clipboard",
  },
  "common.copyFailed": {
    message: "No se pudo copiar",
    description: "Toast when copying to the clipboard failed",
  },
};

export default esCommon;
