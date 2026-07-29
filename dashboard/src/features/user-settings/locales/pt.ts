export interface TranslationEntry {
  message: string;
  description: string;
}

const ptUserSettings: Record<string, TranslationEntry> = {
  "userSettings.accessUntil": {
    message: "Acesso até",
    description: "Label for access remaining until date",
  },
  "userSettings.accountDeleted": {
    message: "Conta excluída com sucesso",
    description: "Success message when account is deleted",
  },
  "userSettings.accountSettings": {
    message: "Conta",
    description: "Section header for account settings",
  },
  "userSettings.addNewKey": {
    message: "Adicionar Nova Chave",
    description: "Button text to add new key",
  },
  "userSettings.added": {
    message: "Adicionado",
    description: "Label for when key was added",
  },
  "userSettings.allDocumentsAndAttachments": {
    message: "Todos os documentos e anexos carregados",
    description: "Item in delete account list",
  },
  "userSettings.allLedgersAndTransactions": {
    message: "Todos os seus livros-razão e histórico de transações",
    description: "Item in delete account list",
  },
  "userSettings.allPreferencesAndSettings": {
    message: "Todas as preferências e configurações",
    description: "Item in delete account list",
  },
  "userSettings.allTransactionsAndRecords": {
    message: "Todas as transações e registros",
    description: "Item in delete account list",
  },
  "userSettings.appSettings": {
    message: "Configurações do aplicativo",
    description: "Section header for application settings",
  },
  "userSettings.appearance": {
    message: "Aparência",
    description: "Appearance settings section label",
  },
  "userSettings.cancelSubscription": {
    message: "Cancelar assinatura",
    description: "Button text to cancel subscription",
  },
  "userSettings.cancelSubscriptionDescription": {
    message:
      "Tem certeza de que deseja cancelar sua assinatura? Você continuará a ter acesso até o final do período de faturamento atual.",
    description: "Confirmation dialog description for canceling subscription",
  },
  "userSettings.cancelSubscriptionTitle": {
    message: "Cancelar assinatura?",
    description: "Confirmation dialog title for canceling subscription",
  },
  "userSettings.canceling": {
    message: "Cancelando...",
    description: "Button text while canceling subscription",
  },
  "userSettings.cannotBeUndone": {
    message: "Esta ação não pode ser desfeita.",
    description: "Warning that action is irreversible",
  },
  "userSettings.changeLanguage": {
    message: "Alterar",
    description: "Button to change language",
  },
  "userSettings.changeName": {
    message: "Alterar nome",
    description: "Dialog title for changing name",
  },
  "userSettings.changeUsername": {
    message: "Alterar Nome de Usuário",
    description: "Dialog title for changing username",
  },
  "userSettings.confirmCancel": {
    message: "Sim, cancelar assinatura",
    description: "Button text to confirm subscription cancellation",
  },
  "userSettings.createKey": {
    message: "Criar Chave",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "Criar Nova Chave de API",
    description: "Dialog title for creating API key",
  },
  "userSettings.createNewApiKeyDescription": {
    message:
      "Adicione uma nova chave pública para autenticar com a API Beancount.",
    description: "Dialog description for creating API key",
  },
  "userSettings.createNewKey": {
    message: "Criar Nova Chave",
    description: "Button text to create new key",
  },
  "userSettings.creating": {
    message: "Criando...",
    description: "Button text while creating key",
  },
  "userSettings.currentLanguage": {
    message: "Idioma",
    description: "Label showing current language selection",
  },
  "userSettings.currentPeriodEnds": {
    message: "Período atual termina em",
    description: "Label for subscription period end date",
  },
  "userSettings.currentVersion": {
    message: "Versão",
    description: "Label showing current app version",
  },
  "userSettings.customizeAppearance": {
    message: "Personalize a aparência e o comportamento da aplicação",
    description: "Description for appearance settings",
  },
  "userSettings.dangerZone": {
    message: "Zona de Perigo",
    description: "Section title for dangerous account actions",
  },
  "userSettings.dark": {
    message: "Escuro",
    description: "Dark theme option",
  },
  "userSettings.deleteAccount": {
    message: "Excluir conta",
    description: "Button or menu item to delete user account",
  },
  "userSettings.deleteAccountAlertCancel": {
    message: "Cancelar",
    description: "Cancel button in account deletion dialog",
  },
  "userSettings.deleteAccountAlertConfirm": {
    message: "Excluir conta",
    description: "Confirm button in account deletion dialog",
  },
  "userSettings.deleteAccountAlertMsg": {
    message:
      "Tem certeza de que deseja excluir sua conta? Esta ação não pode ser desfeita e excluirá permanentemente todos os seus dados.",
    description: "Warning message in account deletion confirmation dialog",
  },
  "userSettings.deleteAccountConfirmMessage": {
    message: 'Para confirmar, digite seu nome de usuário "{username}" abaixo:',
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPhrase": {
    message: "sudo delete my account",
    description: "Exact phrase user must type to confirm deletion",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "Digite seu nome de usuário",
    description: "Placeholder text for deletion confirmation input",
  },
  "userSettings.deleteAccountConfirmTitle": {
    message: "Confirmar exclusão da conta",
    description: "Title of account deletion confirmation step",
  },
  "userSettings.deleteAccountDescription": {
    message: "Remover permanentemente a conta e os dados",
    description: "Description of what account deletion does",
  },
  "userSettings.deleteAccountDialogDescription": {
    message:
      "Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta e removerá todos os seus dados de nossos servidores.",
    description: "Detailed warning in delete account dialog",
  },
  "userSettings.deleteAccountQuestion": {
    message: "Excluir Conta?",
    description: "Dialog title confirming account deletion",
  },
  "userSettings.deleteAccountWarning": {
    message:
      "Excluir permanentemente sua conta e todos os dados associados. Esta ação não pode ser desfeita.",
    description: "Warning text for account deletion",
  },
  "userSettings.deleteKey": {
    message: "Excluir Chave",
    description: "Button text to delete key",
  },
  "userSettings.deleteSshKey": {
    message: "Excluir Chave SSH",
    description: "Dialog title for deleting SSH key",
  },
  "userSettings.deleteSshKeyConfirmation": {
    message: "Tem certeza de que deseja excluir a chave",
    description: "Confirmation message for deleting SSH key",
  },
  "userSettings.deletingKey": {
    message: "Excluindo...",
    description: "Button text while deleting key",
  },
  "userSettings.enterNewName": {
    message: "Digite seu nome abaixo",
    description: "Instructions in change name dialog",
  },
  "userSettings.enterNewUsername": {
    message: "Digite seu novo nome de usuário abaixo",
    description: "Instructions in change username dialog",
  },
  "userSettings.enterNewUsernamePlaceholder": {
    message: "Digite o novo nome de usuário",
    description: "Placeholder for new username input",
  },
  "userSettings.errorCreatingKey": {
    message: "Erro ao criar chave",
    description: "Error title when key creation fails",
  },
  "userSettings.errorLoadingSettings": {
    message: "Erro ao carregar configurações",
    description: "Error message when settings fail to load",
  },
  "userSettings.failedToCancelSubscription": {
    message: "Falha ao cancelar assinatura",
    description: "Error message when canceling subscription fails",
  },
  "userSettings.resumeSubscription": {
    message: "Retomar assinatura",
    description: "Button text to resume a subscription scheduled to cancel",
  },
  "userSettings.resumeSubscriptionTitle": {
    message: "[TODO] Resume Subscription?",
    description: "Confirmation dialog title for resuming subscription",
  },
  "userSettings.resumeSubscriptionDescription": {
    message:
      "[TODO] Are you sure you want to resume your subscription? Your subscription will continue to renew automatically and you will be billed again at the end of your current billing period.",
    description: "Confirmation dialog description for resuming subscription",
  },
  "userSettings.confirmResume": {
    message: "[TODO] Yes, Resume Subscription",
    description: "Button text to confirm subscription resumption",
  },
  "userSettings.resuming": {
    message: "Retomando...",
    description: "Button text while resuming subscription",
  },
  "userSettings.subscriptionResumedSuccess": {
    message: "Assinatura retomada com sucesso",
    description: "Success message after resuming subscription",
  },
  "userSettings.failedToResumeSubscription": {
    message: "Falha ao retomar assinatura",
    description: "Error message when resuming subscription fails",
  },
  "userSettings.failedToCreateCheckoutSession": {
    message: "Falha ao criar sessão de checkout. Por favor, tente novamente.",
    description: "Error message when creating checkout session fails",
  },
  "userSettings.failedToCreateKey": {
    message: "Falha ao criar chave. Por favor, tente novamente.",
    description: "Error message when key creation fails",
  },
  "userSettings.failedToDeleteAccount": {
    message: "Falha ao excluir conta",
    description: "Error message when account deletion fails",
  },
  "userSettings.failedToLoadKeys": {
    message: "Falha ao carregar chaves",
    description: "Error title when keys fail to load",
  },
  "userSettings.failedToLoadKeysDescription": {
    message:
      "Ocorreu um erro ao carregar suas chaves SSH. Por favor, tente novamente.",
    description: "Error description when keys fail to load",
  },
  "userSettings.failedToLoadSettings": {
    message: "Falha ao Carregar Configurações",
    description: "Error heading when settings page fails",
  },
  "userSettings.failedToLoadSubscription": {
    message: "Falha ao carregar status da assinatura",
    description: "Error message when subscription fails to load",
  },
  "userSettings.firstName": {
    message: "Nome",
    description: "Label for first name field",
  },
  "userSettings.followingWillBeDeleted": {
    message: "Os seguintes itens serão excluídos permanentemente:",
    description: "Heading before list of items to be deleted",
  },
  "userSettings.general": {
    message: "Geral",
    description: "General settings section label",
  },
  "userSettings.helpCenter": {
    message: "Central de ajuda",
    description: "Link to help center",
  },
  "userSettings.inputKeyword": {
    message: "Por favor, insira uma palavra-chave",
    description: "Placeholder prompting user to enter keyword",
  },
  "userSettings.invite": {
    message: "Convidar",
    description: "Invite action button",
  },
  "userSettings.inviteFriends": {
    message: "Convidar amigos",
    description: "Button or section title for inviting friends",
  },
  "userSettings.inviteSummary": {
    message:
      "Compartilhe esta ferramenta profissional de gestão financeira e ajude outros a construir seu futuro financeiro.",
    description: "Summary description of invite feature",
  },
  "userSettings.irreversibleActions": {
    message: "Ações irreversíveis e destrutivas",
    description: "Description for danger zone",
  },
  "userSettings.keyTitle": {
    message: "Título da Chave",
    description: "Label for key title field",
  },
  "userSettings.keyTitleDescription": {
    message:
      "Um nome descritivo para esta chave para ajudá-lo a identificá-la posteriormente.",
    description: "Description for key title field",
  },
  "userSettings.keyTitlePlaceholder": {
    message: "ex.: Minha Chave de Desenvolvimento",
    description: "Placeholder for key title input",
  },
  "userSettings.lastName": {
    message: "Sobrenome",
    description: "Label for last name field",
  },
  "userSettings.lastUsed3Months": {
    message: "Usado pela última vez nos últimos 3 meses",
    description: "Status when key was used within last 3 months",
  },
  "userSettings.lastUsed3Weeks": {
    message: "Usado pela última vez nas últimas 3 semanas",
    description: "Status when key was used within last 3 weeks",
  },
  "userSettings.lastUsedLongAgo": {
    message: "Usado pela última vez há mais de 3 meses",
    description: "Status when key was used long ago",
  },
  "userSettings.lastUsedWeek": {
    message: "Usado pela última vez na última semana",
    description: "Status when key was used within last week",
  },
  "userSettings.light": {
    message: "Claro",
    description: "Light theme option",
  },
  "userSettings.loadingAccountInformation": {
    message: "Carregando informações da sua conta...",
    description: "Loading message for account information",
  },
  "userSettings.loadingAccountOptions": {
    message: "Carregando opções da conta...",
    description: "Loading message for account options",
  },
  "userSettings.loadingSessionInformation": {
    message: "Carregando informações da sessão...",
    description: "Loading message for session data",
  },
  "userSettings.loadingSshKeys": {
    message: "Carregando suas chaves SSH...",
    description: "Loading state message for SSH keys",
  },
  "userSettings.loadingSubscriptionDetails": {
    message: "Carregando detalhes da assinatura...",
    description: "Loading message for subscription info",
  },
  "userSettings.loadingThemePreferences": {
    message: "Carregando preferências de tema...",
    description: "Loading message for theme settings",
  },
  "userSettings.manage": {
    message: "Gerenciar",
    description: "Button to manage subscription",
  },
  "userSettings.manageActiveSession": {
    message: "Gerencie sua sessão ativa",
    description: "Description for session section",
  },
  "userSettings.manageBilling": {
    message: "Gerenciar faturamento",
    description: "Button text to manage billing portal",
  },
  "userSettings.manageSubscription": {
    message: "Gerencie sua assinatura e faturamento",
    description: "Description for subscription section",
  },
  "userSettings.monthly": {
    message: "Mensal",
    description: "Monthly frequency option",
  },
  "userSettings.name": {
    message: "Nome",
    description: "Label for combined name field",
  },
  "userSettings.neverUsed": {
    message: "Nunca usado",
    description: "Status when key has never been used",
  },
  "userSettings.newSshKey": {
    message: "Nova chave SSH",
    description: "Button text to create new SSH key",
  },
  "userSettings.noActiveSubscription": {
    message: "Nenhuma Assinatura Ativa",
    description: "Label when user has no subscription",
  },
  "userSettings.noContactPermission": {
    message: "Permissão de contatos em falta.",
    description: "Error when contacts permission is denied",
  },
  "userSettings.noSshKeys": {
    message: "Nenhuma chave SSH",
    description: "Empty state title when no SSH keys exist",
  },
  "userSettings.noSshKeysDescription": {
    message:
      "Você ainda não criou nenhuma chave SSH. Crie sua primeira chave para começar com acesso seguro ao repositório.",
    description: "Empty state description for SSH keys",
  },
  "userSettings.notSet": {
    message: "Não definido",
    description: "Placeholder when a field has no value",
  },
  "userSettings.off": {
    message: "Desligado",
    description: "Off state for toggles or subscriptions",
  },
  "userSettings.opening": {
    message: "Abrindo...",
    description: "Button text while opening billing portal",
  },
  "userSettings.processing": {
    message: "Processando...",
    description: "Button text while processing checkout",
  },
  "userSettings.publicKey": {
    message: "Chave Pública",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      'Cole o conteúdo da sua chave pública aqui. Deve começar com "-----BEGIN PUBLIC KEY-----".',
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message:
      "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "Chave pública é obrigatória",
    description: "Validation error for missing public key",
  },
  "userSettings.recommend": {
    message:
      "Gostaria de compartilhar esta ferramenta profissional de gestão financeira que me ajudou a organizar minhas finanças de forma eficaz.",
    description: "Pre-written recommendation message for sharing",
  },
  "userSettings.referral": {
    message: "Indicação",
    description: "Referral program label",
  },
  "userSettings.renewsOn": {
    message: "Renova em",
    description: "Label for subscription renewal date",
  },
  "userSettings.reviewApp": {
    message: "Gostou? Deixe uma avaliação :)",
    description: "Prompt to review the app",
  },
  "userSettings.rewardDetail": {
    message:
      "Compartilhe esta ferramenta profissional de gestão financeira e ajude outros a construir seu futuro financeiro.",
    description: "Detailed description of referral rewards",
  },
  "userSettings.rewardSummary": {
    message: "Convidar amigos",
    description: "Summary of referral rewards",
  },
  "userSettings.selectColorTheme": {
    message: "Selecione seu tema de cores preferido",
    description: "Label for theme selection",
  },
  "userSettings.selectLanguage": {
    message: "Selecione seu idioma preferido",
    description: "Label for language selection",
  },
  "userSettings.session": {
    message: "Sessão",
    description: "Session management section title",
  },
  "userSettings.settingsErrorMessage": {
    message:
      "Ocorreu um erro ao carregar suas configurações. Verifique sua conexão e tente novamente.",
    description: "Detailed error message for settings loading failure",
  },
  "userSettings.shareError": {
    message: "Falha ao compartilhar",
    description: "Error message when sharing fails",
  },
  "userSettings.signOutDescription": {
    message: "Sair da sua conta e limpar sua sessão.",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "Chaves SSH",
    description: "Page title for SSH keys",
  },
  "userSettings.subscribe": {
    message: "Relatório por e-mail",
    description: "Email report subscription feature label",
  },
  "userSettings.subscription": {
    message: "Assinatura",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceled": {
    message: "A assinatura foi cancelada",
    description: "Message when subscription is already canceled",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "Assinatura cancelada com sucesso",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Assinatura atualizada com sucesso",
    description: "Success message after upgrading subscription",
  },
  "userSettings.paymentRequiresAuth": {
    message:
      "Seu pagamento requer autenticação adicional. Verifique seu e-mail ou entre em contato com o emissor do seu cartão.",
    description:
      "Message when 3DS authentication is needed for subscription upgrade",
  },
  "userSettings.supportSettings": {
    message: "Suporte",
    description: "Section header for support settings",
  },
  "userSettings.system": {
    message: "Sistema",
    description: "System theme option",
  },
  "userSettings.testMode": {
    message: "Modo de teste",
    description: "Label indicating Stripe is in test/development mode",
  },
  "userSettings.thanksShare": {
    message: "Obrigado por compartilhar!!",
    description: "Thank you message after sharing",
  },
  "userSettings.theme": {
    message: "Tema",
    description: "Label for theme selection",
  },
  "userSettings.themeDark": {
    message: "Escuro",
    description: "Dark theme option",
  },
  "userSettings.themeLight": {
    message: "Claro",
    description: "Light theme option",
  },
  "userSettings.themeSystem": {
    message: "Sistema",
    description: "System theme option (follows OS preference)",
  },
  "userSettings.titleMaxLength": {
    message: "O título deve ter menos de 100 caracteres",
    description: "Validation error for title too long",
  },
  "userSettings.titleRequired": {
    message: "O título é obrigatório",
    description: "Validation error for missing title",
  },
  "userSettings.trialProPlan": {
    message: "Atualizar para Premium",
    description: "Button text for premium subscription upgrade",
  },
  "userSettings.trialProPlanComingSoon": {
    message: "Funcionalidade do plano Pro de teste em breve!",
    description: "Toast message when trial Pro plan is clicked",
  },
  "userSettings.unableToOpenBillingPortal": {
    message:
      "Não foi possível abrir o portal de faturamento. Por favor, tente novamente mais tarde.",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "Plano Desconhecido",
    description: "Fallback when plan name is not available",
  },
  "userSettings.updateFailed": {
    message: "Falha ao atualizar assinatura",
    description: "Error message when update fails",
  },
  "userSettings.updateSuccess": {
    message: "Assinatura atualizada com sucesso",
    description: "Success message after updating subscription",
  },
  "userSettings.upgradeToProDescription": {
    message:
      "Faça upgrade para Pro para desbloquear recursos premium e acesso ilimitado.",
    description: "Description encouraging subscription upgrade",
  },
  "userSettings.userProfile": {
    message: "Perfil do Usuário",
    description: "Section title for user profile settings",
  },
  "userSettings.usernameUpdatedSuccess": {
    message: "Nome de usuário atualizado com sucesso",
    description: "Success message after updating username",
  },
  "userSettings.weekly": {
    message: "Semanal",
    description: "Weekly frequency option",
  },
  "userSettings.yesDeleteMyAccount": {
    message: "Sim, Excluir Minha Conta",
    description: "Confirmation button for account deletion",
  },
  "userSettings.yourAccountInformation": {
    message: "Informações da sua conta",
    description: "Description for user profile section",
  },
  "userSettings.aiCfoUsage": {
    message: "AI Tokens",
    description: "Label for AI CFO usage section",
  },
  "userSettings.aiCfoUsageDescription": {
    message: "Monthly AI token usage for your current billing period",
    description: "Description for AI CFO usage section",
  },
  "userSettings.aiCfoUsageCount": {
    message: "{used} / {max} tokens used this month",
    description: "AI CFO usage count display",
  },
  "userSettings.aiCfoUsageUnlimited": {
    message: "{used} tokens used this month (Unlimited)",
    description: "AI CFO usage display for unlimited tier",
  },
  "userSettings.currentPlan": {
    message: "Current Plan",
    description: "Badge label for the user's current subscription tier",
  },
  "userSettings.freePlan": {
    message: "Free Plan",
    description: "Display name for the free tier",
  },
  "userSettings.enterprisePlan": {
    message: "Enterprise",
    description: "Display name for the enterprise tier",
  },
  "userSettings.customPricing": {
    message: "Custom pricing",
    description: "Price label for enterprise tier",
  },
  "userSettings.usage": {
    message: "Usage",
    description: "Section header for usage overview",
  },
  "userSettings.ledgers": {
    message: "Ledgers",
    description: "Label for ledger usage metric",
  },
  "userSettings.ledgerUsageCount": {
    message: "{used} / {max} ledgers",
    description: "Ledger usage count display",
  },
  "userSettings.collaboratorLimit": {
    message: "Up to {max} collaborators per ledger",
    description: "Collaborator limit description",
  },
  "userSettings.collaboratorLimitUnlimited": {
    message: "Unlimited collaborators per ledger",
    description: "Collaborator limit for unlimited tiers",
  },
  "userSettings.upgradeYourPlan": {
    message: "Upgrade Your Plan",
    description: "Section header for upgrade tier cards",
  },
  "userSettings.billing": {
    message: "Billing",
    description: "Section header for billing management",
  },
  "userSettings.unlimited": {
    message: "Unlimited",
    description: "Label for unlimited usage",
  },
  "userSettings.perMonth": {
    message: "/month",
    description: "Price interval suffix",
  },
  "userSettings.planFeatureSummary": {
    message:
      "{tokens} AI tokens · {ledgers} ledgers · {collaborators} collaborators",
    description: "Summary of plan features in the current plan banner",
  },
};

export default ptUserSettings;
