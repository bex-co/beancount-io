export interface TranslationEntry {
  message: string;
  description: string;
}

const caSeo: Record<string, TranslationEntry> = {
  "seo.authCallback.description": {
    message: "Completant el vostre inici de sessió a Beancount.",
    description: "Auth callback page meta description",
  },
  "seo.authCallback.title": {
    message: "Iniciant Sessió",
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
      "El vostre tauler de Beancount. Accediu als vostres llibres comptables i gestioneu les vostres dades financeres.",
    description: "Dashboard page meta description",
  },
  "seo.dashboard.title": {
    message: "Tauler",
    description: "Dashboard page title",
  },
  "seo.error.description": {
    message:
      "S'ha produït un error en carregar aquesta pàgina. Si us plau, torneu-ho a provar o torneu a la pàgina principal.",
    description: "Error page meta description",
  },
  "seo.error.title": {
    message: "Error",
    description: "Error page title",
  },
  "seo.forgotPassword.description": {
    message:
      "Restableix la teva contrasenya de Beancount.io de forma segura. T'enviarem un enllaç únic — després torna als teus llibres.",
    description: "Forgot password page meta description",
  },
  "seo.forgotPassword.title": {
    message: "Restableix la contrasenya de Beancount — Accés segur",
    description: "Forgot password page title",
  },
  "seo.home.description": {
    message:
      "Comptabilitat professional en text pla amb Beancount. Seguiu les finances, gestioneu llibres comptables i genereu informes amb comptabilitat potent, precisa i auditable.",
    description: "Home page meta description",
  },
  "seo.home.title": {
    message: "Beancount Dashboard - Comptabilitat en Text Pla",
    description: "Home page title",
  },
  "seo.ledgerAccount.description": {
    message:
      "Detalls del compte i historial de transaccions de {accountName} a {ledgerName}.",
    description: "Account detail page meta description",
  },
  "seo.ledgerAccount.title": {
    message: "{accountName} - {ledgerName}",
    description: "Account detail page title with account and ledger name",
  },
  "seo.ledgerAsk.description": {
    message:
      "Fes preguntes sobre les dades financeres de {ledgerName} utilitzant IA. Analitza transaccions, explora saldos de comptes, comprèn tendències i obtén informació comptable instantània.",
    description: "Ask AI page meta description for SEO",
  },
  "seo.ledgerAsk.title": {
    message: "Pregunteu sobre {ledgerName} - Assistent financer IA",
    description: "Ask AI page title with ledger name for SEO",
  },
  "seo.ledgerBalanceSheet.description": {
    message:
      "Informe de balanç de {ledgerName}. Visualitzeu actius, passius i patrimoni d'una ullada.",
    description: "Balance sheet page meta description",
  },
  "seo.ledgerBalanceSheet.title": {
    message: "Balanç - {ledgerName}",
    description: "Balance sheet page title with ledger name",
  },
  "seo.ledgerCashFlow.description": {
    message:
      "Estat de fluxos de caixa de {ledgerName}. Segueix els moviments de caixa operatius, d'inversió i de finançament al llarg del temps.",
    description: "Cash flow page meta description",
  },
  "seo.ledgerCashFlow.title": {
    message: "Flux de caixa - {ledgerName}",
    description: "Cash flow page title with ledger name",
  },
  "seo.ledgerCommodities.description": {
    message:
      "Llista de productes i preus de {ledgerName}. Seguiu monedes, accions i altres actius.",
    description: "Commodities page meta description",
  },
  "seo.ledgerCommodities.title": {
    message: "Productes - {ledgerName}",
    description: "Commodities page title with ledger name",
  },
  "seo.ledgerCommits.description": {
    message:
      "Visualitzeu l'historial de commits i el control de versions de {ledgerName}. Feu un seguiment dels canvis als fitxers del vostre llibre al llarg del temps.",
    description: "Commits page meta description with ledger name",
  },
  "seo.ledgerCommits.title": {
    message: "Commits - {ledgerName}",
    description: "Commits page title with ledger name",
  },
  "seo.ledgerCommit.description": {
    message:
      "Changes in commit {shortSha} for {ledgerName}. Review modified files and diffs.",
    description: "Commit detail page meta description",
  },
  "seo.ledgerCommit.title": {
    message: "Commit {shortSha} - {ledgerName}",
    description: "Commit detail page title with short hash and ledger name",
  },

  "seo.ledgerDashboard.description": {
    message:
      "Visualitzeu i gestioneu tots els vostres llibres comptables de Beancount. Creeu llibres nous, accediu als existents i organitzeu els vostres registres financers.",
    description: "Ledger dashboard page meta description",
  },
  "seo.ledgerDashboard.title": {
    message: "Els Meus Llibres Comptables",
    description: "Ledger dashboard page title",
  },
  "seo.ledgerDocuments.description": {
    message:
      "Adjuncions de documents i rebuts de {ledgerName}. Organitzeu fitxers de suport per a les vostres transaccions.",
    description: "Documents page meta description",
  },
  "seo.ledgerDocuments.title": {
    message: "Documents - {ledgerName}",
    description: "Documents page title with ledger name",
  },
  "seo.ledgerErrors.description": {
    message:
      "Errors de validació i avisos de {ledgerName}. Reviseu i corregiu problemes en el vostre llibre comptable.",
    description: "Errors page meta description",
  },
  "seo.ledgerErrors.title": {
    message: "Errors - {ledgerName}",
    description: "Errors page title with ledger name",
  },
  "seo.ledgerEvents.description": {
    message:
      "Línia temporal d'esdeveniments de {ledgerName}. Seguiu esdeveniments financers importants i fites.",
    description: "Events page meta description",
  },
  "seo.ledgerEvents.title": {
    message: "Esdeveniments - {ledgerName}",
    description: "Events page title with ledger name",
  },
  "seo.ledgerFiles.description": {
    message: "Exploreu els fitxers comptables de Beancount de {ledgerName}.",
    description: "Ledger file browser meta description",
  },
  "seo.ledgerFiles.title": {
    message: "Fitxers - {ledgerName}",
    description: "File editor page title with ledger name",
  },
  "seo.ledgerFilesCreate.description": {
    message:
      "Creeu un fitxer nou a {ledgerName}. Afegiu comptes, transaccions o altres entrades de Beancount.",
    description: "Create file page meta description",
  },
  "seo.ledgerFilesCreate.title": {
    message: "Crear Fitxer - {ledgerName}",
    description: "Create file page title with ledger name",
  },
  "seo.ledgerFilesUpload.description": {
    message:
      "Pugeu fitxers a {ledgerName}. Importeu fitxers o documents de Beancount existents.",
    description: "Upload files page meta description",
  },
  "seo.ledgerFilesUpload.title": {
    message: "Pujar Fitxers - {ledgerName}",
    description: "Upload files page title with ledger name",
  },
  "seo.ledgerGallery.description": {
    message:
      "Navegueu per exemples i plantilles públiques de llibres comptables de Beancount. Trobeu inspiració per a la vostra pròpia configuració de seguiment financer.",
    description: "Ledger gallery page meta description",
  },
  "seo.ledgerGallery.title": {
    message: "Galeria de Llibres Comptables",
    description: "Ledger gallery page title",
  },
  "seo.ledgerHoldings.description": {
    message:
      "Participacions d'inversió i cartera de {ledgerName}. Visualitzeu posicions actuals i valoracions.",
    description: "Holdings page meta description",
  },
  "seo.ledgerHoldings.title": {
    message: "Participacions - {ledgerName}",
    description: "Holdings page title with ledger name",
  },
  "seo.ledgerImport.description": {
    message:
      "Importeu transaccions a {ledgerName} des de CSV, PDF, OFX o imatges. Anàlisi amb IA per a extractes bancaris i rebuts.",
    description: "Import page meta description",
  },
  "seo.ledgerImport.title": {
    message: "Importació intel·ligent - {ledgerName}",
    description: "Import page title with ledger name",
  },
  "seo.ledgerIncomeStatement.description": {
    message:
      "Informe de compte de resultats de {ledgerName}. Seguiu ingressos, despeses i benefici net al llarg del temps.",
    description: "Income statement page meta description",
  },
  "seo.ledgerIncomeStatement.title": {
    message: "Compte de Resultats - {ledgerName}",
    description: "Income statement page title with ledger name",
  },
  "seo.ledgerJournal.description": {
    message:
      "Diari de transaccions de {ledgerName}. Visualitzeu, cerqueu i filtreu totes les vostres entrades comptables.",
    description: "Journal page meta description",
  },
  "seo.ledgerJournal.title": {
    message: "Diari - {ledgerName}",
    description: "Journal page title with ledger name",
  },
  "seo.ledgerOverview.description": {
    message:
      "Resum financer i informes de {ledgerName}. Visualitzeu el patrimoni net, ingressos, despeses i distribució d'actius.",
    description: "Ledger overview page meta description",
  },
  "seo.ledgerOverview.title": {
    message: "Resum - {ledgerName}",
    description: "Ledger overview page title with ledger name",
  },
  "seo.ledgerPullRequest.description": {
    message:
      "Reviseu els canvis del pull request per a {ledgerName}. Aproveu o rebutgeu les modificacions proposades al vostre llibre comptable.",
    description: "Pull request page meta description",
  },
  "seo.ledgerPullRequest.title": {
    message: "Pull Request #{prNumber} - {ledgerName}",
    description: "Pull request page title with PR number and ledger name",
  },
  "seo.plaidSettings.description": {
    message:
      "Connecta comptes bancaris a {ledgerName} amb Plaid. Importa transaccions automàticament i sincronitza dades financeres.",
    description: "Plaid settings page meta description",
  },
  "seo.plaidSettings.title": {
    message: "Comptes connectats - {ledgerName}",
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
      "Consulteu {ledgerName} amb sintaxi BQL. Executeu consultes personalitzades i analitzeu les vostres dades financeres.",
    description: "BQL query page meta description",
  },
  "seo.ledgerQuery.title": {
    message: "Consulta BQL - {ledgerName}",
    description: "BQL query page title with ledger name",
  },
  "seo.ledgerSettings.description": {
    message:
      "Configureu ajustos del llibre {ledgerName}. Gestioneu preferències, accés i opcions del llibre comptable.",
    description: "Ledger settings page meta description",
  },
  "seo.ledgerSettings.title": {
    message: "Configuració del llibre - {ledgerName}",
    description: "Ledger settings page title with ledger name",
  },
  "seo.ledgerStatistics.description": {
    message:
      "Anàlisi estadística de {ledgerName}. Visualitzeu mètriques, tendències i informació de les vostres dades financeres.",
    description: "Statistics page meta description",
  },
  "seo.ledgerStatistics.title": {
    message: "Estadístiques - {ledgerName}",
    description: "Statistics page title with ledger name",
  },
  "seo.ledgerTrialBalance.description": {
    message:
      "Informe de balanç de comprovació de {ledgerName}. Verifiqueu la igualtat de dèbits i crèdits en els vostres comptes.",
    description: "Trial balance page meta description",
  },
  "seo.ledgerTrialBalance.title": {
    message: "Balanç de Comprovació - {ledgerName}",
    description: "Trial balance page title with ledger name",
  },
  "seo.login.description": {
    message:
      "Inicia sessió a Beancount.io — comptabilitat en text pla de codi obert amb Git. Gestiona llibres, importa bancs i mantén els teus llibres auditables.",
    description: "Login page meta description",
  },
  "seo.login.title": {
    message: "Inicia sessió a Beancount — Comptabilitat en text pla gratuïta",
    description: "Login page title",
  },
  "seo.logout.description": {
    message: "Tancant la sessió del vostre compte de Beancount.",
    description: "Logout page meta description",
  },
  "seo.logout.title": {
    message: "Tancar Sessió",
    description: "Logout page title",
  },
  "seo.notFound.description": {
    message:
      "La pàgina que esteu buscant no existeix. Pot haver estat moguda o eliminada.",
    description: "404 page meta description",
  },
  "seo.notFound.title": {
    message: "Pàgina no trobada",
    description: "404 page title",
  },
  "seo.resetPassword.description": {
    message: "Creeu una contrasenya nova per al vostre compte de Beancount.",
    description: "Reset password page meta description",
  },
  "seo.resetPassword.title": {
    message: "Restablir Contrasenya",
    description: "Reset password page title",
  },
  "seo.settingsGeneral.description": {
    message:
      "Actualitzeu la informació del vostre perfil, preferències d'idioma i configuració general del compte.",
    description: "General settings page meta description",
  },
  "seo.settingsGeneral.title": {
    message: "Configuració General",
    description: "General settings page title",
  },
  "seo.settingsSshKeys.description": {
    message:
      "Gestioneu les claus SSH per a l'accés segur als vostres llibres comptables de Beancount a través de Git.",
    description: "SSH keys settings page meta description",
  },
  "seo.settingsSshKeys.title": {
    message: "Claus SSH",
    description: "SSH keys settings page title",
  },
  "seo.settingsDangerZone.title": {
    message: "Zona de perill",
    description: "Danger zone settings page title",
  },
  "seo.settingsDangerZone.description": {
    message:
      "Gestioneu accions destructives del compte com eliminar permanentment el vostre compte i totes les dades.",
    description: "Danger zone settings page meta description",
  },
  "seo.signUp.description": {
    message:
      "Crea el teu compte Beancount.io gratuït. Fes seguiment de les teves finances amb llibres en text pla, informes Fava, importació bancària i control de versions — sense dependència.",
    description: "Sign up page meta description",
  },
  "seo.signUp.title": {
    message: "Crea un compte Beancount gratuït — Comptabilitat amb Git",
    description: "Sign up page title",
  },
  "seo.signUpOtp.description": {
    message:
      "Verifiqueu la vostra adreça de correu electrònic per completar el registre del vostre compte de Beancount.",
    description: "OTP verification page meta description",
  },
  "seo.signUpOtp.title": {
    message: "Verificar Correu",
    description: "OTP verification page title",
  },
  "seo.welcome.description": {
    message:
      "Benvingut to Beancount! Get started with plain-text accounting and financial management.",
    description: "Welcome page meta description",
  },
  "seo.welcome.title": {
    message: "Benvingut",
    description: "Welcome page title",
  },
};

export default caSeo;
