export interface TranslationEntry {
  message: string;
  description: string;
}

const zhPlaid: Record<string, TranslationEntry> = {
  // Common
  "plaid.connectedSuccessfully": {
    message: "✓ 连接成功",
    description: "Success message shown when bank is connected",
  },
  "plaid.sidebar.label": {
    message: "银行同步",
    description:
      "Main ledger sidebar nav label for the bank/Plaid page — a stable noun that covers both the not-yet-connected (connect a bank) and already-connected (review bank transactions) states, unlike an action phrase such as 'Connect Bank'",
  },

  // Onboarding State - Header
  "plaid.onboarding.title": {
    message: "连接账户",
    description: "Main title for onboarding page",
  },
  "plaid.onboarding.subtitle": {
    message: "通过银行级安全加密自动导入交易",
    description: "Subtitle for onboarding page",
  },

  // Onboarding State - Hero Section
  "plaid.onboarding.hero.title": {
    message: "简化你的记账工作流程",
    description: "Hero section title",
  },
  "plaid.onboarding.hero.description": {
    message:
      "通过 Plaid 连接你的银行账户，自动导入交易，节省数小时的手动数据录入时间，并实时保持账本最新状态。",
    description: "Hero section description",
  },
  "plaid.onboarding.hero.institutionsCount": {
    message: "11,000+ 家机构",
    description: "Feature highlight - number of supported institutions",
  },
  "plaid.onboarding.hero.bankLevelSecurity": {
    message: "银行级安全",
    description: "Feature highlight - security feature",
  },
  "plaid.onboarding.hero.realTimeSync": {
    message: "实时同步",
    description: "Feature highlight - real-time syncing",
  },
  "plaid.onboarding.getStarted": {
    message: "开始使用",
    description: "Button text to start connecting bank",
  },

  // Onboarding State - Benefits
  "plaid.onboarding.benefits.title": {
    message: "为什么要连接你的银行？",
    description: "Benefits section title",
  },
  "plaid.onboarding.benefits.automaticImport.title": {
    message: "自动导入",
    description: "Benefit card title for automatic import",
  },
  "plaid.onboarding.benefits.automaticImport.description": {
    message:
      "通过实时自动导入银行账户交易，节省数小时的手动录入时间。专注于分析，而不是数据录入。",
    description: "Benefit card description for automatic import",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.title": {
    message: "银行级安全",
    description: "Benefit card title for security",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.description": {
    message:
      "Plaid 使用 256 位加密技术，受到数千家金融机构的信任。你的凭据永远不会存储在我们的服务器上。",
    description: "Benefit card description for security",
  },
  "plaid.onboarding.benefits.privacyFirst.title": {
    message: "隐私优先",
    description: "Benefit card title for privacy",
  },
  "plaid.onboarding.benefits.privacyFirst.description": {
    message:
      "我们从不存储你的银行凭据或出售你的数据。你的财务信息受到行业领先的隐私标准保护。",
    description: "Benefit card description for privacy",
  },

  // Onboarding State - How It Works
  "plaid.onboarding.howItWorks.title": {
    message: "工作原理",
    description: "How it works section title",
  },
  "plaid.onboarding.howItWorks.description": {
    message: "只需几个简单步骤即可连接你的银行账户",
    description: "How it works section description",
  },
  "plaid.onboarding.howItWorks.step1.title": {
    message: "选择你的银行",
    description: "Step 1 title",
  },
  "plaid.onboarding.howItWorks.step1.description": {
    message: "从超过 11,000 家支持的金融机构中搜索",
    description: "Step 1 description",
  },
  "plaid.onboarding.howItWorks.step2.title": {
    message: "安全认证",
    description: "Step 2 title",
  },
  "plaid.onboarding.howItWorks.step2.description": {
    message: "通过你银行的认证系统安全登录",
    description: "Step 2 description",
  },
  "plaid.onboarding.howItWorks.step3.title": {
    message: "开始导入",
    description: "Step 3 title",
  },
  "plaid.onboarding.howItWorks.step3.description": {
    message: "你的交易将自动同步到你的账本",
    description: "Step 3 description",
  },

  // Management State
  "plaid.management.connectAnother": {
    message: "连接其他银行",
    description:
      "Button text to connect another bank, shown when at least one bank is already connected",
  },
  "plaid.management.connectBank": {
    message: "连接银行",
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
    message: "未连接任何银行",
    description:
      "Empty state title on the connections page when no bank is connected",
  },
  "plaid.management.noConnectionsDescription": {
    message: "连接银行以自动导入交易。",
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
    message: "链接于 {date}",
    description:
      "Date when bank was linked - interpolation: {date} for formatted date",
  },
  "plaid.bankAccount.status.active": {
    message: "活跃",
    description: "Status badge for active bank connection",
  },
  "plaid.bankAccount.status.reauthRequired": {
    message: "需要重新认证",
    description: "Status badge when reauthentication is required",
  },
  "plaid.bankAccount.status.disabled": {
    message: "已禁用",
    description: "Status badge for disabled bank connection",
  },

  // Institution Detail - Header
  "plaid.institutionDetail.lastSynced": {
    message: "上次同步",
    description: "Label for last sync timestamp",
  },
  "plaid.institutionDetail.transactionsCount": {
    message: "{count} 笔交易",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.syncFailed": {
    message: "失败",
    description: "Label when sync fails",
  },
  "plaid.institutionDetail.reconnecting": {
    message: "重新连接中...",
    description: "Button text while reconnecting",
  },
  "plaid.institutionDetail.reconnectBank": {
    message: "重新连接银行",
    description: "Button text to reconnect bank",
  },
  "plaid.institutionDetail.disconnecting": {
    message: "断开连接中...",
    description: "Button text while disconnecting",
  },
  "plaid.institutionDetail.disconnect": {
    message: "断开连接",
    description: "Button text to disconnect bank",
  },
  "plaid.institutionDetail.disconnectTitle": {
    message: "断开银行账户连接",
    description: "Alert dialog title for disconnect confirmation",
  },
  "plaid.institutionDetail.disconnectDescription": {
    message:
      "你确定要断开与 {institutionName} 的连接吗？这将删除所有已连接的账户并停止自动交易同步。",
    description:
      "Alert dialog description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.cancel": {
    message: "取消",
    description: "Cancel button text",
  },

  // Institution Detail - Toast Messages
  "plaid.institutionDetail.toast.bankDisconnected": {
    message: "银行已断开连接",
    description: "Toast title when bank is disconnected",
  },
  "plaid.institutionDetail.toast.bankDisconnectedDescription": {
    message: "{institutionName} 已断开连接。",
    description:
      "Toast description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.toast.error": {
    message: "错误",
    description: "Generic error toast title",
  },
  "plaid.institutionDetail.toast.disconnectError": {
    message: "断开银行账户连接失败。",
    description: "Toast description for disconnect error",
  },

  // Account Mapping
  "plaid.accountMapping.selectAccount": {
    message: "选择一个银行账户以配置账户映射",
    description: "Placeholder message when no account is selected",
  },
  "plaid.accountMapping.noAccounts": {
    message: "未找到该银行的账户",
    description: "Message when no accounts are available",
  },
  "plaid.accountMapping.manageAccounts": {
    message: "管理账户",
    description:
      "Button that opens Plaid Link so the user can add or remove accounts under a bank",
  },
  "plaid.accountMapping.manageAccountsHint": {
    message: "添加或移除该银行共享的账户",
    description: "Tooltip explaining what the manage accounts button does",
  },
  "plaid.accountMapping.manageAccountsRequiresReauth": {
    message: "请先重新连接此银行",
    description:
      "Tooltip shown when the manage accounts button is disabled because the bank needs reauthentication",
  },
  "plaid.accountMapping.addAccounts": {
    message: "添加账户",
    description:
      "Button shown in the empty state that opens Plaid Link to share accounts",
  },
  "plaid.accountMapping.manageAccountsLoading": {
    message: "正在更新账户…",
    description: "Loading label while the manage accounts flow is running",
  },
  "plaid.accountMapping.manageAccountsPreparing": {
    message: "准备中…",
    description: "Loading label while the Plaid link token is being created",
  },
  "plaid.accountMapping.manageAccountsWaiting": {
    message: "正在等待你的银行…",
    description: "Loading label while the user is inside the Plaid Link dialog",
  },
  "plaid.accountMapping.manageAccountsReconciling": {
    message: "正在应用更改…",
    description: "Loading label while the account list is being reconciled",
  },
  "plaid.accountMapping.manageAccountsUpdatedTitle": {
    message: "账户已更新",
    description: "Toast title after the account list changed",
  },
  "plaid.accountMapping.manageAccountsUpdated": {
    message: "新增 {added} 个，移除 {removed} 个。",
    description: "Toast body summarising how the account list changed",
  },
  "plaid.accountMapping.manageAccountsNoChangesTitle": {
    message: "账户没有变化",
    description: "Toast title when the account list came back identical",
  },
  "plaid.accountMapping.manageAccountsNoChanges": {
    message:
      "没有任何变化。部分银行只允许在其自有 App 或网站上更改共享的账户。",
    description:
      "Toast body when Plaid completed without offering account selection",
  },
  "plaid.accountMapping.manageAccountsFailedTitle": {
    message: "无法更新账户",
    description: "Toast title when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsFailed": {
    message: "你的银行可能已保存该更改。请重新打开「管理账户」再试一次。",
    description: "Toast body when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsCancelledTitle": {
    message: "已取消账户更改",
    description: "Toast title when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.manageAccountsCancelled": {
    message: "Plaid Link 已关闭，未更改任何账户。",
    description: "Toast body when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.title": {
    message: "账户",
    description:
      "Section label for the account mapping list within a bank card",
  },
  "plaid.accountMapping.currency": {
    message: "货币",
    description: "Label for the account's ledger currency selector",
  },
  "plaid.accountMapping.beancountAccount": {
    message: "Beancount 账户",
    description: "Label for beancount account input",
  },
  "plaid.accountMapping.placeholder": {
    message: "Assets:Checking",
    description: "Placeholder for account input",
  },
  "plaid.accountMapping.saving": {
    message: "保存中...",
    description: "Button text while saving",
  },
  "plaid.accountMapping.save": {
    message: "保存",
    description: "Save button text",
  },
  "plaid.accountMapping.cancel": {
    message: "取消",
    description: "Cancel button text",
  },
  "plaid.accountMapping.notMapped": {
    message: "未映射",
    description: "Label for unmapped account",
  },
  "plaid.accountMapping.edit": {
    message: "编辑",
    description: "Edit button text",
  },
  "plaid.accountMapping.setMapping": {
    message: "设置映射",
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
    message: "无效账户",
    description: "Toast title for invalid account",
  },
  "plaid.accountMapping.toast.invalidAccountDescription": {
    message: "请输入有效的 Beancount 账户名称。",
    description: "Toast description for invalid account",
  },
  "plaid.accountMapping.toast.mappingSaved": {
    message: "映射已保存",
    description: "Toast title for successful mapping save",
  },
  "plaid.accountMapping.toast.mappingSavedDescription": {
    message: "{accountName} 已映射到 {ledgerAccount}（{currency}）",
    description:
      "Toast description for mapping save - interpolation: {accountName}, {ledgerAccount}, {currency}",
  },
  "plaid.accountMapping.toast.error": {
    message: "错误",
    description: "Generic error toast title",
  },
  "plaid.accountMapping.toast.errorDescription": {
    message: "保存账户映射失败。",
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
    message: "没有银行交易",
    description:
      "Title shown when there are no unsynced bank transactions awaiting review",
  },
  "plaid.transactionReview.noPendingDescription": {
    message: "所有交易已同步到你的账本，或没有新交易。",
    description: "Description when no pending transactions",
  },
  "plaid.transactionReview.title": {
    message: "银行交易",
    description:
      "Card title for the list of unsynced bank transactions awaiting review before submission to the ledger",
  },
  "plaid.transactionReview.description": {
    message: "审核并提交 {count} 笔交易{plural}到你的账本",
    description:
      "Card description - interpolation: {count} for number, {plural} for 's' or empty",
  },
  "plaid.transactionReview.submitting": {
    message: "提交中...",
    description: "Button text while submitting",
  },
  "plaid.transactionReview.submit": {
    message: "提交",
    description: "Submit button text",
  },
  "plaid.transactionReview.searchPlaceholder": {
    message: "按商家或描述搜索...",
    description: "Search input placeholder",
  },
  "plaid.transactionReview.filterByBank": {
    message: "按银行筛选",
    description:
      "Accessible name for the dropdown that narrows the table to one connected bank",
  },
  "plaid.transactionReview.allBanks": {
    message: "所有银行",
    description: "Bank filter option that turns bank filtering off",
  },
  "plaid.transactionReview.filterByAccount": {
    message: "按银行账户筛选",
    description:
      "Accessible name for the dropdown that narrows the table to one bank account (the Plaid account, not the Beancount ledger account)",
  },
  "plaid.transactionReview.allAccounts": {
    message: "所有银行账户",
    description: "Bank account filter option that turns account filtering off",
  },
  "plaid.transactionReview.accountsSelected": {
    message: "已选择 {count} 个账户",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.noMatchingTransactions": {
    message: "没有符合当前筛选条件的交易。",
    description:
      "Shown in place of table rows when the search box or the bank/account filters exclude every transaction",
  },
  "plaid.transactionReview.clearFilters": {
    message: "清除筛选",
    description:
      "Button that resets the search box and the bank and account filters",
  },
  "plaid.transactionReview.hiddenSelectedNotice": {
    message: "有 {count} 笔已选交易被当前筛选条件隐藏，但仍会被提交或删除。",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count}",
  },
  "plaid.transactionReview.selectFilePlaceholder": {
    message: "选择导入到哪个文件",
    description: "Placeholder for the target ledger file picker",
  },
  "plaid.transactionReview.missingAccountsAlert": {
    message: "{count} 笔已选交易需要目标账户才能提交。",
    description:
      "Alert message for missing target accounts - interpolation: {count}",
  },
  "plaid.transactionReview.selectAll": {
    message: "全选",
    description: "Checkbox label to select all transactions",
  },
  "plaid.transactionReview.date": {
    message: "日期",
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
    message: "商家",
    description: "Table header for merchant column",
  },
  "plaid.transactionReview.descriptionColumn": {
    message: "描述",
    description: "Table header for description column",
  },
  "plaid.transactionReview.amount": {
    message: "金额",
    description: "Table header for amount column",
  },
  "plaid.transactionReview.targetAccount": {
    message: "目标账户",
    description: "Table header for target account column",
  },
  "plaid.transactionReview.aiProcessing": {
    message: "AI 处理中...",
    description: "Button text while AI is processing",
  },
  "plaid.transactionReview.aiFill": {
    message: "AI 自动填充",
    description: "Button text for AI categorization",
  },
  "plaid.transactionReview.selectAccountPlaceholder": {
    message: "选择账户...",
    description: "Placeholder for account selection dropdown",
  },

  // Transaction Review - Toast Messages
  "plaid.transactionReview.toast.categorizationComplete": {
    message: "分类完成",
    description: "Toast title when AI categorization completes",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription": {
    message: "AI 为 {count} 笔交易建议了账户。",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationFailed": {
    message: "分类失败",
    description: "Toast title when AI categorization fails",
  },
  "plaid.transactionReview.toast.categorizationFailedDescription": {
    message: "分类交易失败。请重试。",
    description: "Toast description for categorization failure",
  },
  "plaid.transactionReview.toast.noTransactionsSelected": {
    message: "未选择交易",
    description: "Toast title when no transactions are selected",
  },
  "plaid.transactionReview.toast.noTransactionsSelectedDescription": {
    message: "请至少选择一笔交易以提交。",
    description: "Toast description for no transactions selected",
  },
  "plaid.transactionReview.toast.missingTargetAccounts": {
    message: "缺少目标账户",
    description: "Toast title for missing target accounts",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription": {
    message: "{count} 笔已选交易需要目标账户。",
    description:
      "Toast description for missing accounts - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmitted": {
    message: "交易已提交",
    description: "Toast title when transactions are submitted",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription": {
    message: "已将 {count} 笔交易添加到你的账本。",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.submissionFailed": {
    message: "提交失败",
    description: "Toast title when submission fails",
  },
  "plaid.transactionReview.toast.submissionFailedDescription": {
    message: "提交交易失败。请重试。",
    description: "Toast description for submission failure",
  },
  "plaid.transactionReview.delete": {
    message: "删除",
    description: "Delete button text",
  },
  "plaid.transactionReview.deleting": {
    message: "正在删除...",
    description: "Button text while deleting",
  },
  "plaid.transactionReview.deleteConfirmTitle": {
    message: "删除交易？",
    description: "Confirmation dialog title for bulk-deleting transactions",
  },
  "plaid.transactionReview.deleteConfirmDescription": {
    message: "这将从列表中永久移除选中的 {count} 笔交易。此操作无法撤销。",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsDeleted": {
    message: "交易已删除",
    description: "Toast title when transactions are deleted",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription": {
    message: "已从列表中移除 {count} 笔交易。",
    description:
      "Toast description for deleted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.deletionFailed": {
    message: "删除失败",
    description: "Toast title when deletion fails",
  },
  "plaid.transactionReview.toast.deletionFailedDescription": {
    message: "无法删除交易，请重试。",
    description: "Toast description for deletion failure",
  },
};

export default zhPlaid;
