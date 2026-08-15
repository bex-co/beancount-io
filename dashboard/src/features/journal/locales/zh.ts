export interface TranslationEntry {
  message: string;
  description: string;
}

const zhJournal: Record<string, TranslationEntry> = {
  "journal.account": {
    message: "账户",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPlaceholder": {
    message: "账户 (e.g., Assets:Bank:Checking)",
    description: "Placeholder for account field",
  },
  "journal.accountRequired": {
    message: "账户为必填项",
    description: "Validation error when account is missing",
  },
  "journal.accounts": {
    message: "账户",
    description: "Plural form of account",
  },
  "journal.addNewJournalEntry": {
    message: "添加新日记账条目",
    description: "Aria label for add new journal entry button",
  },
  "journal.amountMustBeNumber": {
    message: "金额必须是有效数字",
    description: "Validation error when amount is not numeric",
  },
  "journal.amountPlaceholder": {
    message: "金额（例如：100.00）",
    description: "Placeholder for amount field",
  },
  "journal.amountRequired": {
    message: "金额为必填项",
    description: "Validation error when amount is missing",
  },
  "journal.atLeastTwoPostings": {
    message: "至少需要两个分录",
    description: "Validation error when less than two postings exist",
  },
  "journal.balance": {
    message: "余额",
    description: "Balance entry type",
  },
  "journal.balanceHeader": {
    message: "余额",
    description: "Table header for balance column",
  },
  "journal.balancesAfterEntry": {
    message: "交易后余额",
    description: "Section header showing account balances after transaction",
  },
  "journal.balancesBeforeEntry": {
    message: "交易前余额",
    description: "Section header showing account balances before transaction",
  },
  "journal.budget": {
    message: "预算",
    description: "Label for budget custom subtype filter",
  },
  "journal.budgetEntries": {
    message: "预算条目",
    description: "Filter tooltip for budget entries",
  },
  "journal.change": {
    message: "变更",
    description: "Table header for change column in account journal",
  },
  "journal.cleared": {
    message: "*",
    description: "Label for cleared transaction subtype filter",
  },
  "journal.clearedTransactions": {
    message: "已清除的交易",
    description: "Filter tooltip for cleared transactions",
  },
  "journal.close": {
    message: "关闭",
    description: "Close account entry type filter",
  },
  "journal.createNewJournalEntry": {
    message: "为此账本创建新日记账条目",
    description: "Dialog description for new entry",
  },
  "journal.createAccountEntry": {
    message: "创建账户条目",
    description:
      "Button text to create an open account entry in the new directive dialog",
  },
  "journal.createBalanceEntry": {
    message: "创建余额条目",
    description: "Button text to create balance entry",
  },
  "journal.createNoteEntry": {
    message: "创建备注条目",
    description: "Button text to create note entry",
  },
  "journal.createTransactionEntry": {
    message: "创建交易条目",
    description: "Button text to create transaction entry",
  },
  "journal.currencyPlaceholder": {
    message: "货币（例如：USD）",
    description: "Placeholder for currency field",
  },
  "journal.currencyRequired": {
    message: "货币为必填项",
    description: "Validation error when currency is missing",
  },
  "journal.custom": {
    message: "自定义",
    description: "Custom entry type filter",
  },
  "journal.date": {
    message: "日期",
    description: "Label for date field",
  },
  "journal.discovered": {
    message: "发现",
    description: "Label for discovered document subtype filter",
  },
  "journal.discoveredDocuments": {
    message: "发现的文档",
    description: "Filter tooltip for discovered documents",
  },
  "journal.document": {
    message: "文档",
    description: "Document entry type filter",
  },
  "journal.downloadFilteredEntries": {
    message: "将当前筛选的条目下载为 Beancount 文件",
    description: "Description for export journal dialog",
  },
  "journal.entryContext": {
    message: "条目上下文",
    description: "Dialog title for entry context",
  },
  "journal.entryCreatedSuccess": {
    message: "条目创建成功",
    description: "Success message after creating entry",
  },
  "journal.entryLocation": {
    message: "位置：",
    description: "Label for entry location in file",
  },
  "journal.errorLoadingJournalEntries": {
    message: "加载日记账条目时出错",
    description: "Error message prefix for journal loading failures",
  },
  "journal.export": {
    message: "导出",
    description: "Button label to export",
  },
  "journal.exportJournal": {
    message: "导出日记账",
    description: "Dialog title for exporting journal",
  },
  "journal.exporting": {
    message: "导出中...",
    description: "Button state while exporting",
  },
  "journal.failedToCreateBalance": {
    message: "创建余额条目失败",
    description: "Error message when balance entry creation fails",
  },
  "journal.failedToCreateNote": {
    message: "创建备注条目失败",
    description: "Error message when note entry creation fails",
  },
  "journal.failedToCreateTransaction": {
    message: "创建交易失败",
    description: "Error message when transaction creation fails",
  },
  "journal.failedToExportJournal": {
    message: "导出日记账失败",
    description: "Error message when journal export fails",
  },
  "journal.journal": {
    message: "流水",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "日记账导出成功",
    description: "Success message after exporting journal",
  },
  "journal.linked": {
    message: "链接",
    description: "Label for linked document subtype filter",
  },
  "journal.linkedDocuments": {
    message: "链接的文档",
    description: "Filter tooltip for linked documents",
  },
  "journal.loadingEntryContext": {
    message: "加载条目上下文...",
    description: "Loading message while fetching entry context",
  },
  "journal.metadata": {
    message: "元数据",
    description: "Label for metadata toggle filter",
  },
  "journal.narrationPlaceholder": {
    message: "备注",
    description: "Placeholder for narration field",
  },
  "journal.newEntry": {
    message: "新建条目",
    description: "Dialog title for creating new journal entry",
  },
  "journal.noCurrenciesFound": {
    message: "未找到货币",
    description: "Message when no currencies match search",
  },
  "journal.noJournalEntriesFound": {
    message: "未找到符合当前筛选条件的日记账条目。",
    description: "Message when journal has no entries matching filters",
  },
  "journal.noNarrationsFound": {
    message: "未找到备注",
    description: "Message when no narrations match search",
  },
  "journal.noPayeesFound": {
    message: "未找到收款人",
    description: "Message when no payees match search",
  },
  "journal.note": {
    message: "备注",
    description: "Note entry type",
  },
  "journal.noteContent": {
    message: "备注内容",
    description: "Placeholder for note content field",
  },
  "journal.noteContentRequired": {
    message: "备注内容为必填项",
    description: "Validation error when note content is missing",
  },
  "journal.open": {
    message: "开立",
    description: "Open account entry type filter",
  },
  "journal.other": {
    message: "其他",
    description: "Label for other transaction subtype filter",
  },
  "journal.otherTransactions": {
    message: "其他交易",
    description: "Filter tooltip for other transactions",
  },
  "journal.pad": {
    message: "补平",
    description: "Pad entry type filter",
  },
  "journal.payeeNarration": {
    message: "收款人/备注",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "收款人",
    description: "Placeholder for payee field",
  },
  "journal.pending": {
    message: "待处理",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "待处理的交易",
    description: "Filter tooltip for pending transactions",
  },
  "journal.postings": {
    message: "过账条目",
    description: "Label for postings toggle filter",
  },
  "journal.price": {
    message: "价格",
    description: "Price entry type filter",
  },
  "journal.selectAccount": {
    message: "选择账户...",
    description: "Placeholder for account selection combobox",
  },
  "journal.selectBalanceDate": {
    message: "选择余额日期",
    description: "Placeholder for balance date picker",
  },
  "journal.selectCurrency": {
    message: "选择货币...",
    description: "Placeholder for currency selection combobox",
  },
  "journal.selectNarration": {
    message: "选择描述...",
    description: "Placeholder for narration selection combobox",
  },
  "journal.selectNoteDate": {
    message: "选择备注日期",
    description: "Placeholder for note date picker",
  },
  "journal.selectPayee": {
    message: "选择收款人...",
    description: "Placeholder for payee selection combobox",
  },
  "journal.toggleMetadata": {
    message: "切换元数据",
    description: "Filter tooltip to show/hide metadata",
  },
  "journal.togglePostings": {
    message: "切换过账",
    description: "Filter tooltip to show/hide postings",
  },
  "journal.transaction": {
    message: "交易",
    description: "Singular form of transaction",
  },
  "journal.transactions": {
    message: "交易记录",
    description: "Plural form of transaction",
  },
  "journal.unitsHeader": {
    message: "单位",
    description: "Table header for units column",
  },
  "journal.unknownDirectiveType": {
    message: "未知指令类型",
    description: "Message shown for unrecognized beancount directive types",
  },
};

export default zhJournal;
