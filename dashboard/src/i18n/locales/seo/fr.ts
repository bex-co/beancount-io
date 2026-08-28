export interface TranslationEntry {
  message: string;
  description: string;
}

const frSeo: Record<string, TranslationEntry> = {
  "seo.authCallback.description": {
    message: "Finalisation de votre connexion à Beancount.",
    description: "Auth callback page meta description",
  },
  "seo.authCallback.title": {
    message: "Connexion en Cours",
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
      "Votre tableau de bord Beancount. Accédez à vos livres comptables et gérez vos données financières.",
    description: "Dashboard page meta description",
  },
  "seo.dashboard.title": {
    message: "Tableau de Bord",
    description: "Dashboard page title",
  },
  "seo.error.description": {
    message:
      "Une erreur s'est produite lors du chargement de cette page. Veuillez réessayer ou retourner à la page d'accueil.",
    description: "Error page meta description",
  },
  "seo.error.title": {
    message: "Erreur",
    description: "Error page title",
  },
  "seo.forgotPassword.description": {
    message:
      "Réinitialisez votre mot de passe Beancount.io en toute sécurité. Nous vous enverrons un lien unique — puis retour à vos livres.",
    description: "Forgot password page meta description",
  },
  "seo.forgotPassword.title": {
    message: "Réinitialiser le mot de passe Beancount — Accès sécurisé",
    description: "Forgot password page title",
  },
  "seo.home.description": {
    message:
      "Comptabilité professionnelle en texte brut avec Beancount. Suivez vos finances, gérez vos livres comptables et générez des rapports avec une comptabilité puissante, précise et vérifiable.",
    description: "Home page meta description",
  },
  "seo.home.title": {
    message: "Beancount Dashboard - Comptabilité en Texte Brut",
    description: "Home page title",
  },
  "seo.ledgerAccount.description": {
    message:
      "Détails du compte et historique des transactions pour {accountName} dans {ledgerName}.",
    description: "Account detail page meta description",
  },
  "seo.ledgerAccount.title": {
    message: "{accountName} - {ledgerName}",
    description: "Account detail page title with account and ledger name",
  },
  "seo.ledgerAsk.description": {
    message:
      "Posez des questions sur les données financières de {ledgerName} en utilisant l'IA. Analysez les transactions, explorez les soldes des comptes, comprenez les tendances et obtenez des informations comptables instantanées.",
    description: "Ask AI page meta description for SEO",
  },
  "seo.ledgerAsk.title": {
    message: "Questions sur {ledgerName} - Assistant financier IA",
    description: "Ask AI page title with ledger name for SEO",
  },
  "seo.ledgerBalanceSheet.description": {
    message:
      "Rapport de bilan pour {ledgerName}. Visualisez les actifs, les passifs et les capitaux propres d'un coup d'œil.",
    description: "Balance sheet page meta description",
  },
  "seo.ledgerBalanceSheet.title": {
    message: "Bilan - {ledgerName}",
    description: "Balance sheet page title with ledger name",
  },
  "seo.ledgerCashFlow.description": {
    message:
      "État des flux de trésorerie de {ledgerName}. Suivez les flux de trésorerie opérationnels, d'investissement et de financement au fil du temps.",
    description: "Cash flow page meta description",
  },
  "seo.ledgerCashFlow.title": {
    message: "Flux de trésorerie - {ledgerName}",
    description: "Cash flow page title with ledger name",
  },
  "seo.ledgerCommodities.description": {
    message:
      "Liste des produits et prix pour {ledgerName}. Suivez les devises, les actions et autres actifs.",
    description: "Commodities page meta description",
  },
  "seo.ledgerCommodities.title": {
    message: "Produits - {ledgerName}",
    description: "Commodities page title with ledger name",
  },
  "seo.ledgerCommits.description": {
    message:
      "Afficher l'historique des commits et le contrôle de version pour {ledgerName}. Suivre les modifications de vos fichiers comptables.",
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

  "seo.ledgerDocuments.description": {
    message:
      "Pièces jointes et reçus pour {ledgerName}. Organisez les fichiers justificatifs de vos transactions.",
    description: "Documents page meta description",
  },
  "seo.ledgerDocuments.title": {
    message: "Documents - {ledgerName}",
    description: "Documents page title with ledger name",
  },
  "seo.ledgerErrors.description": {
    message:
      "Erreurs de validation et avertissements pour {ledgerName}. Examinez et corrigez les problèmes dans votre livre comptable.",
    description: "Errors page meta description",
  },
  "seo.ledgerErrors.title": {
    message: "Erreurs - {ledgerName}",
    description: "Errors page title with ledger name",
  },
  "seo.ledgerEvents.description": {
    message:
      "Chronologie des événements pour {ledgerName}. Suivez les événements financiers importants et les jalons.",
    description: "Events page meta description",
  },
  "seo.ledgerEvents.title": {
    message: "Événements - {ledgerName}",
    description: "Events page title with ledger name",
  },
  "seo.ledgerFiles.description": {
    message: "Parcourez les fichiers comptables Beancount de {ledgerName}.",
    description: "Ledger file browser meta description",
  },
  "seo.ledgerFiles.title": {
    message: "Fichiers - {ledgerName}",
    description: "File editor page title with ledger name",
  },
  "seo.ledgerFilesCreate.description": {
    message:
      "Créez un nouveau fichier dans {ledgerName}. Ajoutez des comptes, des transactions ou d'autres entrées Beancount.",
    description: "Create file page meta description",
  },
  "seo.ledgerFilesCreate.title": {
    message: "Créer un Fichier - {ledgerName}",
    description: "Create file page title with ledger name",
  },
  "seo.ledgerFilesUpload.description": {
    message:
      "Téléchargez des fichiers vers {ledgerName}. Importez des fichiers ou documents Beancount existants.",
    description: "Upload files page meta description",
  },
  "seo.ledgerFilesUpload.title": {
    message: "Télécharger des Fichiers - {ledgerName}",
    description: "Upload files page title with ledger name",
  },
  "seo.ledgerGallery.description": {
    message:
      "Parcourez les exemples et modèles publics de livres comptables Beancount. Trouvez l'inspiration pour votre propre configuration de suivi financier.",
    description: "Ledger gallery page meta description",
  },
  "seo.ledgerGallery.title": {
    message: "Galerie de Livres Comptables",
    description: "Ledger gallery page title",
  },
  "seo.ledgerHoldings.description": {
    message:
      "Participations d'investissement et portefeuille pour {ledgerName}. Visualisez les positions actuelles et les valorisations.",
    description: "Holdings page meta description",
  },
  "seo.ledgerHoldings.title": {
    message: "Participations - {ledgerName}",
    description: "Holdings page title with ledger name",
  },
  "seo.ledgerImport.description": {
    message:
      "Importez des transactions dans {ledgerName} depuis CSV, PDF, OFX ou images. Analyse par IA pour les relevés bancaires et reçus.",
    description: "Import page meta description",
  },
  "seo.ledgerImport.title": {
    message: "Import intelligent - {ledgerName}",
    description: "Import page title with ledger name",
  },
  "seo.ledgerIncomeStatement.description": {
    message:
      "Rapport de compte de résultat pour {ledgerName}. Suivez les revenus, les dépenses et le revenu net au fil du temps.",
    description: "Income statement page meta description",
  },
  "seo.ledgerIncomeStatement.title": {
    message: "Compte de Résultat - {ledgerName}",
    description: "Income statement page title with ledger name",
  },
  "seo.ledgerJournal.description": {
    message:
      "Journal des transactions pour {ledgerName}. Visualisez, recherchez et filtrez toutes vos écritures comptables.",
    description: "Journal page meta description",
  },
  "seo.ledgerJournal.title": {
    message: "Journal - {ledgerName}",
    description: "Journal page title with ledger name",
  },
  "seo.ledgerOverview.description": {
    message:
      "Aperçu financier et rapports pour {ledgerName}. Visualisez la valeur nette, les revenus, les dépenses et la répartition des actifs.",
    description: "Ledger overview page meta description",
  },
  "seo.ledgerOverview.title": {
    message: "Aperçu - {ledgerName}",
    description: "Ledger overview page title with ledger name",
  },
  "seo.ledgerPullRequest.description": {
    message:
      "Examiner les modifications de la demande de fusion pour {ledgerName}. Approuver ou rejeter les modifications proposées à votre comptabilité.",
    description: "Pull request page meta description",
  },
  "seo.ledgerPullRequest.title": {
    message: "Demande de fusion #{prNumber} - {ledgerName}",
    description: "Pull request page title with PR number and ledger name",
  },
  "seo.plaidSettings.description": {
    message:
      "Connectez des comptes bancaires à {ledgerName} avec Plaid. Importez automatiquement les transactions et synchronisez les données financières.",
    description: "Plaid settings page meta description",
  },
  "seo.plaidSettings.title": {
    message: "Comptes connectés - {ledgerName}",
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
      "Interrogez {ledgerName} avec la syntaxe BQL. Exécutez des requêtes personnalisées et analysez vos données financières.",
    description: "BQL query page meta description",
  },
  "seo.ledgerQuery.title": {
    message: "Requête BQL - {ledgerName}",
    description: "BQL query page title with ledger name",
  },
  "seo.ledgerSettings.description": {
    message:
      "Configurez les paramètres du livre {ledgerName}. Gérez les préférences, l'accès et les options du livre comptable.",
    description: "Ledger settings page meta description",
  },
  "seo.ledgerSettings.title": {
    message: "Paramètres du livre - {ledgerName}",
    description: "Ledger settings page title with ledger name",
  },
  "seo.ledgerStatistics.description": {
    message:
      "Analyse statistique pour {ledgerName}. Visualisez les métriques, tendances et aperçus de vos données financières.",
    description: "Statistics page meta description",
  },
  "seo.ledgerStatistics.title": {
    message: "Statistiques - {ledgerName}",
    description: "Statistics page title with ledger name",
  },
  "seo.ledgerTrialBalance.description": {
    message:
      "Rapport de balance de vérification pour {ledgerName}. Vérifiez l'égalité des débits et des crédits dans vos comptes.",
    description: "Trial balance page meta description",
  },
  "seo.ledgerTrialBalance.title": {
    message: "Balance de Vérification - {ledgerName}",
    description: "Trial balance page title with ledger name",
  },
  "seo.login.description": {
    message:
      "Connectez-vous à Beancount.io — comptabilité en texte brut open-source, soutenue par Git. Gérez vos livres, importez vos banques et gardez vos comptes auditables.",
    description: "Login page meta description",
  },
  "seo.login.title": {
    message: "Se connecter à Beancount — Comptabilité en texte brut gratuite",
    description: "Login page title",
  },
  "seo.logout.description": {
    message: "Déconnexion de votre compte Beancount.",
    description: "Logout page meta description",
  },
  "seo.logout.title": {
    message: "Se Déconnecter",
    description: "Logout page title",
  },
  "seo.notFound.description": {
    message:
      "La page que vous recherchez n'existe pas. Elle a peut-être été déplacée ou supprimée.",
    description: "404 page meta description",
  },
  "seo.notFound.title": {
    message: "Page non trouvée",
    description: "404 page title",
  },
  "seo.resetPassword.description": {
    message: "Créez un nouveau mot de passe pour votre compte Beancount.",
    description: "Reset password page meta description",
  },
  "seo.resetPassword.title": {
    message: "Réinitialiser le Mot de Passe",
    description: "Reset password page title",
  },
  "seo.settingsGeneral.description": {
    message:
      "Mettez à jour vos informations de profil, préférences linguistiques et paramètres généraux du compte.",
    description: "General settings page meta description",
  },
  "seo.settingsGeneral.title": {
    message: "Paramètres Généraux",
    description: "General settings page title",
  },
  "seo.settingsSshKeys.description": {
    message:
      "Gérez les clés SSH pour un accès sécurisé à vos livres comptables Beancount via Git.",
    description: "SSH keys settings page meta description",
  },
  "seo.settingsSshKeys.title": {
    message: "Clés SSH",
    description: "SSH keys settings page title",
  },
  "seo.settingsDangerZone.title": {
    message: "Zone dangereuse",
    description: "Danger zone settings page title",
  },
  "seo.settingsDangerZone.description": {
    message:
      "Gérez les actions destructives du compte comme la suppression permanente de votre compte et de toutes les données.",
    description: "Danger zone settings page meta description",
  },
  "seo.signUp.description": {
    message:
      "Créez votre compte Beancount.io gratuit. Suivez vos finances avec des livres en texte brut, rapports Fava, import bancaire et contrôle de version — sans dépendance.",
    description: "Sign up page meta description",
  },
  "seo.signUp.title": {
    message: "Créer un compte Beancount gratuit — Comptabilité Git",
    description: "Sign up page title",
  },
  "seo.signUpOtp.description": {
    message:
      "Vérifiez votre adresse e-mail pour terminer l'inscription de votre compte Beancount.",
    description: "OTP verification page meta description",
  },
  "seo.signUpOtp.title": {
    message: "Vérifier l'E-mail",
    description: "OTP verification page title",
  },
  "seo.welcome.description": {
    message:
      "Bienvenue to Beancount! Get started with plain-text accounting and financial management.",
    description: "Welcome page meta description",
  },
  "seo.welcome.title": {
    message: "Bienvenue",
    description: "Welcome page title",
  },
};

export default frSeo;
