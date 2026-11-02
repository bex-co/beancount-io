import { apiKeyTranslations } from "../pages/api-keys/translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const ptUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.pt,
  "userSettings.accountDeleted": {
    message: "Conta excluída com sucesso",
    description: "Success message when account is deleted",
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
  "userSettings.appearance": {
    message: "Aparência",
    description: "Appearance settings section label",
  },
  "userSettings.cancelSubscription": {
    message: "Cancelar assinatura",
    description: "Button text to cancel subscription",
  },
  "userSettings.canceling": {
    message: "Cancelando...",
    description: "Button text while canceling subscription",
  },
  "userSettings.cannotBeUndone": {
    message: "Esta ação não pode ser desfeita.",
    description: "Warning that action is irreversible",
  },
  "userSettings.changeName": {
    message: "Alterar nome",
    description: "Dialog title for changing name",
  },
  "userSettings.changeUsername": {
    message: "Alterar Nome de Usuário",
    description: "Dialog title for changing username",
  },
  "userSettings.createKey": {
    message: "Criar Chave",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "Criar nova chave SSH",
    description: "Dialog title for creating an SSH public key",
  },
  "userSettings.createNewApiKeyDescription": {
    message:
      "Adicione uma nova chave pública SSH para acesso ao repositório Git.",
    description:
      "Dialog description for creating an SSH public key for Git access",
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
  "userSettings.deleteAccountConfirmMessage": {
    message: 'Para confirmar, digite seu nome de usuário "{username}" abaixo:',
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "Digite seu nome de usuário",
    description: "Placeholder text for deletion confirmation input",
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
    message: "Retomar assinatura?",
    description: "Confirmation dialog title for resuming subscription",
  },
  "userSettings.resumeSubscriptionDescription": {
    message:
      "Tem certeza de que deseja retomar sua assinatura? Ela continuará sendo renovada automaticamente e você receberá uma nova cobrança ao final do período de faturamento atual.",
    description: "Confirmation dialog description for resuming subscription",
  },
  "userSettings.confirmResume": {
    message: "Sim, retomar assinatura",
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
  "userSettings.invite": {
    message: "Convidar",
    description: "Invite action button",
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
  "userSettings.opening": {
    message: "Abrindo...",
    description: "Button text while opening billing portal",
  },
  "userSettings.publicKey": {
    message: "Chave Pública",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      "Cole sua chave pública aqui. Ela normalmente começa com ssh-ed25519 ou ssh-rsa; exiba-a com cat ~/.ssh/id_ed25519.pub. Chaves públicas PEM também são aceitas.",
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA…",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "Chave pública é obrigatória",
    description: "Validation error for missing public key",
  },
  "userSettings.renewsOn": {
    message: "Renova em",
    description: "Label for subscription renewal date",
  },
  "userSettings.deferredStartAppStore": {
    message:
      "Seu plano da App Store termina em {date}. Este plano começa então.",
    description: "A Stripe plan that starts when an App Store plan ends",
  },
  "userSettings.deferredStartGooglePlay": {
    message:
      "Seu plano do Google Play termina em {date}. Este plano começa então.",
    description: "A Stripe plan that starts when a Google Play plan ends",
  },
  "userSettings.overlapAppStore": {
    message:
      "Seu plano da App Store continua até {date}, e este plano é cobrado hoje.",
    description: "A Stripe plan charged today beside a running App Store plan",
  },
  "userSettings.overlapGooglePlay": {
    message:
      "Seu plano do Google Play continua até {date}, e este plano é cobrado hoje.",
    description:
      "A Stripe plan charged today beside a running Google Play plan",
  },
  "userSettings.billedByStripe": {
    message: "Faturado pela Stripe",
    description: "Billing source on the plan card: Stripe",
  },
  "userSettings.billedByAppStore": {
    message: "Faturado pela App Store",
    description: "Billing source on the plan card: the App Store",
  },
  "userSettings.billedByGooglePlay": {
    message: "Faturado pelo Google Play",
    description: "Billing source on the plan card: Google Play",
  },
  "userSettings.appStoreManagePath": {
    message:
      "Gerencie no seu iPhone ou iPad: Ajustes → seu nome → Assinaturas.",
    description:
      "Where an App Store plan is managed; Apple has no web page for it",
  },
  "userSettings.manageOnGooglePlay": {
    message: "Gerenciar no Google Play",
    description: "Link to Google Play's subscriptions page",
  },
  "userSettings.planEndsOn": {
    message: "Termina em {date}",
    description: "Plan card: a store plan that will not renew",
  },
  "userSettings.planChangesOn": {
    message: "Muda para {plan} em {date}",
    description: "Plan card: a store plan with a scheduled change",
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
  "userSettings.signOutDescription": {
    message: "Sair da sua conta e limpar sua sessão.",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "Chaves SSH",
    description: "Page title for SSH keys",
  },
  "userSettings.subscriptionStatus.active": {
    message: "Ativa",
    description:
      "Billing badge for a subscription whose Stripe status is active: paid and current.",
  },
  "userSettings.subscriptionStatus.trialing": {
    message: "Avaliação",
    description:
      "Billing badge for a subscription whose Stripe status is trialing: in a free trial.",
  },
  "userSettings.subscriptionStatus.past_due": {
    message: "Pagamento em atraso",
    description:
      "Billing badge for a subscription whose Stripe status is past_due: the last renewal failed and Stripe is retrying.",
  },
  "userSettings.subscriptionStatus.unpaid": {
    message: "Não paga",
    description:
      "Billing badge for a subscription whose Stripe status is unpaid: Stripe stopped retrying a failed renewal.",
  },
  "userSettings.subscriptionStatus.incomplete": {
    message: "Incompleta",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete: the first payment has not completed.",
  },
  "userSettings.subscriptionStatus.incomplete_expired": {
    message: "Expirada",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete_expired: the first payment never completed.",
  },
  "userSettings.subscriptionStatus.canceled": {
    message: "Cancelada",
    description:
      "Billing badge for a subscription whose Stripe status is canceled: ended.",
  },
  "userSettings.subscriptionStatus.paused": {
    message: "Pausada",
    description:
      "Billing badge for a subscription whose Stripe status is paused: paused.",
  },
  "userSettings.subscription": {
    message: "Assinatura",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "Assinatura cancelada com sucesso",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Assinatura atualizada com sucesso",
    description: "Success message after upgrading subscription",
  },
  "userSettings.system": {
    message: "Sistema",
    description: "System theme option",
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
  "userSettings.unableToOpenBillingPortal": {
    message:
      "Não foi possível abrir o portal de faturamento. Por favor, tente novamente mais tarde.",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "Plano Desconhecido",
    description: "Fallback when plan name is not available",
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
    message: "Tokens de IA",
    description: "Label for AI CFO usage section",
  },
  "userSettings.aiCfoUsageCount": {
    message: "{used} / {max} tokens usados este mês",
    description: "AI CFO usage count display",
  },
  "userSettings.aiCfoUsageUnlimited": {
    message: "{used} tokens usados este mês (ilimitado)",
    description: "AI CFO usage display for unlimited tier",
  },
  "userSettings.aiCfoUsageUnavailable": {
    message: "O uso não está disponível no momento.",
    description: "Shown in place of AI token usage when its read fails",
  },
  "userSettings.currentPlan": {
    message: "Plano atual",
    description: "Badge label for the user's current subscription tier",
  },
  "userSettings.freePlan": {
    message: "Plano gratuito",
    description: "Display name for the free tier",
  },
  "userSettings.enterprisePlan": {
    message: "Empresarial",
    description: "Display name for the enterprise tier",
  },
  "userSettings.usage": {
    message: "Uso",
    description: "Section header for usage overview",
  },
  "userSettings.ledgers": {
    message: "Livros-razão",
    description: "Label for ledger usage metric",
  },
  "userSettings.ledgerUsageCount": {
    message: "{used} / {max} livros-razão",
    description: "Ledger usage count display",
  },
  "userSettings.billing": {
    message: "Faturamento",
    description: "Section header for billing management",
  },
  "userSettings.unlimited": {
    message: "Ilimitado",
    description: "Label for unlimited usage",
  },
  "userSettings.perMonth": {
    message: "/mês",
    description: "Price interval suffix",
  },
  "userSettings.aiTokensPerMonth": {
    message: "{count} tokens de IA/mês",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedAiTokens": {
    message: "Tokens de IA ilimitados",
    description: "Unlimited AI token allowance",
  },
  "userSettings.unlimitedLedgers": {
    message: "Razões ilimitadas",
    description: "Unlimited ledger allowance",
  },
  "userSettings.includedLedgers": {
    message: "{formattedCount} livros",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.includedLedgers_one": {
    message: "{formattedCount} livro",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.includedLedgers_many": {
    message: "{formattedCount} livros",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for large round counts such as millions",
  },
  "userSettings.includedLedgers_other": {
    message: "{formattedCount} livros",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - plural form",
  },
  "userSettings.unlimitedDirectives": {
    message: "Diretivas ilimitadas",
    description: "Unlimited directive allowance",
  },
  "userSettings.includedDirectives": {
    message: "{count} diretivas",
    description: "Directive allowance for a subscription tier",
  },
  "userSettings.unlimitedCollaborators": {
    message: "Colaboradores ilimitados",
    description: "Unlimited collaborator allowance",
  },
  "userSettings.collaboratorsPerLedger": {
    message: "Até {formattedCount} colaboradores por livro",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.collaboratorsPerLedger_one": {
    message: "Até {formattedCount} colaborador por livro",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.collaboratorsPerLedger_many": {
    message: "Até {formattedCount} colaboradores por livro",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - form for large round counts such as millions",
  },
  "userSettings.collaboratorsPerLedger_other": {
    message: "Até {formattedCount} colaboradores por livro",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - plural form",
  },
  "userSettings.aiUsageUpgradeNudge": {
    message:
      "Você está usando {percentage}% dos seus tokens mensais de IA. Atualize para evitar interrupções.",
    description: "Upgrade suggestion when AI token usage is high",
  },
  "userSettings.fingerprint": {
    message: "impressão digital",
    description: "Label for an SSH key fingerprint",
  },
  "userSettings.yearly": {
    message: "Anual",
    description: "Yearly billing option in the billing-cycle toggle",
  },
  "userSettings.billingCycle": {
    message: "Ciclo de cobrança",
    description: "Accessible label for the monthly/yearly billing-cycle toggle",
  },
  "userSettings.plans": {
    message: "Planos",
    description: "Section header above every plan on the Billing page",
  },
  "userSettings.switchToYearly": {
    message: "Mudar para anual",
    description: "Button that moves a monthly subscription to yearly billing",
  },
  "userSettings.switchToMonthly": {
    message: "Mudar para mensal",
    description: "Button that moves a yearly subscription to monthly billing",
  },
  "userSettings.downgrade": {
    message: "Mudar para um plano inferior",
    description: "Button for moving to a lower plan",
  },
  "userSettings.contactUs": {
    message: "Fale conosco",
    description: "Enterprise plan call to action and price label",
  },
  "userSettings.billedYearly": {
    message: "{amount} cobrados anualmente",
    description: "Total charged once a year; {amount} is a formatted price",
  },
  "userSettings.saveYearlyPercent": {
    message: "Economize {percent}%",
    description: "Badge with the yearly saving; {percent} is a whole number",
  },
  "userSettings.payYearlyOffer": {
    message:
      "Pague anualmente: {yearly} por ano em vez de {monthlyTotal} — economize {saving} por ano.",
    description:
      "Offer on a monthly plan; {yearly}, {monthlyTotal} and {saving} are formatted prices",
  },
  "userSettings.perYear": {
    message: "/ano",
    description: "Price interval suffix for yearly prices",
  },
  "userSettings.legacyPrice": {
    message: "Preço antigo",
    description: "Label for an older price an existing subscriber keeps",
  },
  "userSettings.checkoutConfirming": {
    message: "Confirmando seu pagamento…",
    description:
      "Shown while waiting for Stripe to confirm a just-completed checkout",
  },
  "userSettings.checkoutDone": {
    message: "Agora você está no {plan}",
    description:
      "Confirmation after checkout; {plan} is a plan name and billing cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.checkoutRenews": {
    message:
      "Renova em {date} por {amount}. Você receberá o recibo por e-mail.",
    description:
      "Renewal line after checkout; {date} is a formatted date and {amount} a formatted price",
  },
  "userSettings.checkoutUnlocked": {
    message: "Agora inclui: {limits}",
    description: "What the new plan includes; {limits} is a list of quotas",
  },
  "userSettings.checkoutPending": {
    message:
      "Pagamento recebido. Seu plano aparecerá em um minuto; atualize para conferir.",
    description:
      "Shown when the payment is done but the subscription is not recorded yet",
  },
  "userSettings.refresh": {
    message: "Atualizar",
    description: "Button that reloads the subscription status",
  },
  "userSettings.backToWork": {
    message: "Voltar para onde você estava",
    description: "Button that returns to the page where the purchase began",
  },
  "userSettings.startUsingPlan": {
    message: "Começar a usar o {plan}",
    description:
      "Primary button on the checkout confirmation when the purchase did not start at an in-product prompt; opens the ledgers. {plan} is the plan name, e.g. Premium",
  },
  "userSettings.checkoutCanceled": {
    message: "O pagamento foi cancelado. Nada foi cobrado.",
    description:
      "Notice on Billing after the customer leaves Stripe Checkout without paying",
  },
  "userSettings.viewBilling": {
    message: "Ver faturamento",
    description:
      "Button that closes the checkout confirmation and shows billing settings",
  },
  "userSettings.planChangeTitle": {
    message: "Mudar para {plan}",
    description:
      "Title of the plan-change sheet; {plan} is a plan and cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.planChangePreviewing": {
    message: "Calculando quanto custa esta mudança…",
    description: "Shown while the server prices a plan change",
  },
  "userSettings.planChangePreviewFailed": {
    message: "Não conseguimos calcular o preço desta mudança. Tente novamente.",
    description: "Shown when the plan-change price could not be loaded",
  },
  "userSettings.planChangeStartsToday": {
    message: "Começa hoje.",
    description: "The plan change takes effect immediately",
  },
  "userSettings.planChangeDueToday": {
    message: "A pagar hoje",
    description: "Label for the amount charged today",
  },
  "userSettings.planChangeCredit": {
    message:
      "Inclui um crédito de {credit} pelo tempo não usado do seu plano atual.",
    description: "Credit for unused time; {credit} is a formatted price",
  },
  "userSettings.planChangeNext": {
    message: "Depois {amount}, com a próxima cobrança em {date}.",
    description:
      "Next charge; {amount} is a price with its interval and {date} a formatted date",
  },
  "userSettings.planChangeChargedTo": {
    message: "Cobrado em {card}",
    description:
      "Card the change is charged to; {card} is a card brand and its last four digits",
  },
  "userSettings.planChangeWhatYouGet": {
    message: "O que você ganha",
    description: "Heading above what the new plan adds",
  },
  "userSettings.planChangePayAndSwitch": {
    message: "Pagar {amount} e mudar",
    description:
      "Confirm button; {amount} is the formatted amount charged today",
  },
  "userSettings.planChangeContinueToCheckout": {
    message: "Continuar para o pagamento",
    description: "Confirm button that opens Stripe Checkout",
  },
  "userSettings.planChangeNotNow": {
    message: "Agora não",
    description:
      "Button that closes the plan-change sheet without changing anything",
  },
  "userSettings.planChangeCreditNote": {
    message:
      "O tempo não usado é sempre creditado — você nunca paga duas vezes.",
    description: "Reassurance under the confirm button",
  },
  "userSettings.planChangeRefusalCurrent": {
    message: "Você já está neste plano.",
    description: "The chosen plan is the one the customer already has",
  },
  "userSettings.planChangeRefusalSameTier": {
    message:
      "Você mantém este plano por um preço antigo e menor; mudar só o aumentaria.",
    description:
      "The customer keeps an older, cheaper price for the same plan and cycle",
  },
  "userSettings.planChangeRefusalMultiple": {
    message:
      "Sua conta tem mais de uma assinatura ativa. Fale com o suporte para mudar de plano.",
    description: "The account has duplicate subscriptions and needs support",
  },
  "userSettings.planChangeRefusalNoSubscription": {
    message:
      "Não há uma assinatura ativa para alterar. Atualize a página para escolher um plano.",
    description: "The subscription ended before the change was confirmed",
  },
  "userSettings.planChangeRefusalPastDue": {
    message:
      "Seu último pagamento de renovação não foi concluído. Atualize sua forma de pagamento em Gerenciar faturamento e depois mude de plano.",
    description:
      "A plan change is refused until a failed renewal payment is fixed",
  },
  "userSettings.planChangeStartsOn": {
    message: "Começa em {date}. Você mantém {plan} até lá.",
    description:
      "When a scheduled change takes effect and the plan kept until then",
  },
  "userSettings.planChangeNothingToday": {
    message: "Nada a pagar hoje.",
    description: "A scheduled change charges nothing today",
  },
  "userSettings.planChangeWhatChanges": {
    message: "O que muda em {date}",
    description:
      "Heading for the limits and features that change on the effective date",
  },
  "userSettings.planChangeLimitCollaborators": {
    message: "Colaboradores por livro",
    description: "Row label: collaborators allowed per ledger",
  },
  "userSettings.planChangeLimitAiTokens": {
    message: "Tokens de IA por mês",
    description: "Row label: AI tokens allowed per month",
  },
  "userSettings.planChangeYouHave": {
    message: "você tem {count}",
    description: "The reader's current usage beside a limit row",
  },
  "userSettings.planChangeOverLimit": {
    message:
      "Todos os seus livros continuam seus e funcionando. Você não poderá criar um novo até ficar abaixo do novo limite de {max}.",
    description:
      "Explains what happens when usage is above the lower plan's ledger limit",
  },
  "userSettings.planChangeScheduleDowngrade": {
    message: "Agendar mudança para plano inferior",
    description:
      "Button that schedules a downgrade for the end of the paid period",
  },
  "userSettings.planChangeScheduleSwitch": {
    message: "Agendar a troca",
    description:
      "Button that schedules a billing-cycle switch for the end of the paid period",
  },
  "userSettings.planChangeKeep": {
    message: "Manter {plan}",
    description: "Button that keeps the current plan and closes the sheet",
  },
  "userSettings.planChangeScheduled": {
    message: "Agendado para {date}. Nada muda até lá.",
    description: "Toast after a change was scheduled",
  },
  "userSettings.planChangeReplacesScheduled": {
    message: "Isso substitui sua mudança agendada para {plan} em {date}.",
    description: "Note that this choice replaces an already scheduled change",
  },
  "userSettings.planChangeWithdrawsCancellation": {
    message:
      "Isso também retira o seu cancelamento, então sua assinatura continua.",
    description: "Note that this choice withdraws a pending cancellation",
  },
  "userSettings.planChangeLegacyEnds": {
    message:
      "Seu preço atual não é mais oferecido, então ele termina com esta mudança.",
    description: "Note for a subscriber on a price that is no longer offered",
  },
  "userSettings.planChangeSplitIntro": {
    message:
      "{plan} com cobrança mensal pode começar na sua renovação em {date}. Quer {plan} hoje?",
    description:
      "Introduces the two options when choosing a higher tier on monthly while on yearly",
  },
  "userSettings.planChangeSplitNow": {
    message: "Ter {plan} hoje com cobrança anual — {amount} agora",
    description:
      "Option: the higher tier today on yearly billing, with the amount due now",
  },
  "userSettings.planChangeSplitLater": {
    message: "Mudar para {plan} mensal em {date} — nada hoje",
    description: "Option: the higher tier on monthly from the renewal date",
  },
  "userSettings.planChangeAtRenewal": {
    message: "Vale a partir da renovação",
    description:
      "Under a plan card whose change waits for the end of the paid period",
  },
  "userSettings.planChangeFeaturesEnd": {
    message: "Não incluído mais",
    description:
      "Heading above the plan features the lower plan does not include",
  },
  "userSettings.planChangeLimitDirectives": {
    message: "Diretivas",
    description: "Row label: entries (Beancount directives) allowed in total",
  },
  "userSettings.scheduledHeading": {
    message: "Agendado",
    description:
      "Heading of the panel listing what happens at the end of the paid period",
  },
  "userSettings.scheduledChangesTo": {
    message: "Muda para {plan} em {date}.",
    description: "A scheduled plan change and its date",
  },
  "userSettings.scheduledEnds": {
    message: "{plan} termina em {date}.",
    description: "A pending cancellation and the date the plan ends",
  },
  "userSettings.scheduledKeepCurrent": {
    message: "Manter o atual",
    description: "Button that undoes a scheduled plan change",
  },
  "userSettings.scheduledKept": {
    message: "Seu plano continua como está.",
    description: "Toast after undoing a scheduled plan change",
  },
  "userSettings.scheduledKeepFailed": {
    message: "Não foi possível desfazer sua mudança agendada. Tente de novo.",
    description: "Toast when undoing a scheduled plan change fails",
  },
  "userSettings.cancelSheetTitle": {
    message: "Cancelar {plan}?",
    description: "Title of the sheet shown before cancelling",
  },
  "userSettings.cancelSheetKeepUntil": {
    message:
      "Você mantém {plan} até {date}. Depois passa para o plano gratuito: {limits}.",
    description:
      "What the reader keeps until the period ends, and the Free limits afterwards",
  },
  "userSettings.cancelSheetPlainText": {
    message:
      "Seus livros são texto simples — exporte quando quiser. Nada é apagado.",
    description: "Reassurance that cancelling deletes nothing",
  },
  "userSettings.cancelSheetOtherOptions": {
    message: "Outras opções",
    description: "Heading above the cheaper alternative to cancelling",
  },
  "userSettings.cancelSheetSwitchToYearly": {
    message: "Mudar para anual — {price}/mês",
    description:
      "Alternative to cancelling: switch to yearly at the per-month price",
  },
  "userSettings.cancelSheetDowngradeTo": {
    message: "Mudar para {plan}",
    description: "Alternative to cancelling: the next lower plan",
  },
  "userSettings.cancelSheetReason": {
    message: "Qual é o principal motivo? (opcional)",
    description: "Optional question about why the reader cancels",
  },
  "userSettings.cancelReasonTooExpensive": {
    message: "Caro demais",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonMissingFeatures": {
    message: "Falta um recurso",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonUnused": {
    message: "Não estou usando",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonSwitchedService": {
    message: "Vou mudar de ferramenta",
    description: "Cancellation reason: moving to another tool",
  },
  "userSettings.cancelReasonOther": {
    message: "Outro",
    description: "Cancellation reason",
  },
  "userSettings.planChangeRequiresAction": {
    message:
      "Seu banco precisa aprovar este pagamento. Nada muda até lá; depois de aprovar, atualize esta página.",
    description: "The bank must approve the payment before the change applies",
  },
  "userSettings.planChangeApproving": {
    message: "Aguardando seu banco aprovar o pagamento…",
    description:
      "Shown while Stripe asks the bank to approve a plan change's payment",
  },
  "userSettings.planChangeApprovePayment": {
    message: "Aprovar pagamento",
    description: "Button that opens Stripe's page to approve the payment",
  },
  "userSettings.planChangeFailed": {
    message: "Seu banco não aprovou o pagamento. Nada mudou.",
    description: "The payment was declined and the plan did not change",
  },
  "userSettings.planChangeUseAnotherCard": {
    message: "Usar outro cartão",
    description: "Button that opens billing settings to change the card",
  },
  "userSettings.featureAutomaticBackups": {
    message: "Backups automáticos",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureAutomationIntegrations": {
    message: "Automação e integrações avançadas",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureOidcSso": {
    message: "Login único (SSO) com OIDC",
    description:
      "Plan feature from the pricing table; OIDC and SSO stay as written",
  },
  "userSettings.featureMultiEntity": {
    message: "Consolidação de várias entidades",
    description: "Plan feature from the pricing table",
  },
};

export default ptUserSettings;
