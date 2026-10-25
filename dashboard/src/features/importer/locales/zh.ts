export interface TranslationEntry {
  message: string;
  description: string;
}

const zhImporter: Record<string, TranslationEntry> = {
  "importer.access.signedOut": {
    message: "登录后即可向此账本导入交易。",
    description: "Explanation when a signed-out visitor opens the importer",
  },
  "importer.access.title": {
    message: "无法导入",
    description: "Title when the importer cannot be used",
  },
  "importer.access.readOnly": {
    message:
      "你对该账本仅有只读权限。导入交易需要写入权限。你仍可查看日记账、文件和查询。",
    description: "Explanation when the user cannot write to the ledger",
  },
  "importer.access.unresolved": {
    message: "无法确认写入权限。在确认你的账本权限之前，导入功能不可用。",
    description: "Explanation when ledger write permissions are unavailable",
  },
  // Premium Banner

  // File Upload
  "importer.upload.fileSizeError": {
    message: "此文件超过 10 MB 限制。请尝试较小的文件。",
    description: "Error message when file size exceeds limit",
  },
  "importer.upload.unsupportedFormatError": {
    message: "不支持此文件类型。请使用 CSV、PDF、OFX 或图像文件（PNG、JPG）。",
    description: "Error message for unsupported file format",
  },
  "importer.upload.parsingFile": {
    message: "正在读取你的文件\u2026",
    description: "Loading message while parsing file",
  },
  "importer.upload.chooseDifferentFile": {
    message: "选择其他文件",
    description: "Button to select a different file",
  },
  "importer.upload.dragAndDrop": {
    message: "将文件放在此处",
    description: "Instructions for drag and drop upload",
  },
  "importer.upload.supportedFormats": {
    message: "支持 CSV、PDF、OFX 和图像文件，最大 10 MB",
    description: "Supported file formats hint",
  },
  "importer.upload.chooseFile": {
    message: "浏览文件",
    description: "Button to open file picker",
  },
  "importer.upload.csvFormatExample": {
    message: "CSV 格式参考",
    description: "Label for CSV format example section",
  },
  "importer.upload.csvFormatHint": {
    message: "使用列：日期 (YYYY-MM-DD)、收款人、描述和金额。负值表示支出。",
    description: "Instructions for CSV file format",
  },
  "importer.upload.aiProcessingHint": {
    message: "PDF、OFX 文件和图像通过 AI 自动解析——无需手动格式化。",
    description: "Hint about AI processing for non-CSV files",
  },

  // Parsing Progress
  "importer.parsing.detectingFormat": {
    message: "正在检测文件格式...",
    description: "Message while detecting file format",
  },
  "importer.parsing.clientParsing": {
    message: "正在你的设备上解析CSV...",
    description: "Message during client-side CSV parsing",
  },
  "importer.parsing.serverParsing": {
    message: "使用AI处理中(可能需要5-15秒)...",
    description: "Message during server-side AI parsing",
  },
  "importer.parsing.processing": {
    message: "处理中...",
    description: "Generic processing message",
  },
  "importer.parsing.serverParsingDescription": {
    message: "使用AI从你的文件中提取交易数据",
    description: "Description of AI parsing process",
  },
  "importer.parsing.clientParsingDescription": {
    message: "标准CSV格式的快速本地处理",
    description: "Description of local CSV parsing",
  },

  // Parse Errors
  "importer.error.uploadDifferentFile": {
    message: "上传其他文件",
    description: "Button to upload a different file after error",
  },
  "importer.aiOffer.title": {
    message: "无法读取此 CSV 的列",
    description:
      "Title when a CSV's columns could not be read by the free client parser",
  },
  "importer.aiOffer.description": {
    message:
      "智能导入可免费读取包含日期、收款人、描述和金额列的 CSV 文件。此文件也可以用 AI 读取，但会消耗你的 AI 词元。",
    description:
      "Explains the free CSV format and that AI parsing spends AI tokens",
  },
  "importer.aiOffer.parseWithAi": {
    message: "用 AI 解析（消耗 AI 词元）",
    description:
      "Button that parses the unreadable CSV with AI, spending AI tokens",
  },
  "importer.error.aiQuotaReached": {
    message: "你已用完本月的 AI 词元",
    description:
      "Title when AI parsing of a CSV is refused because the month's AI tokens are used up",
  },
  "importer.error.aiQuotaReachedCsv": {
    message:
      "AI 解析将在下个月或开通 Premium 后恢复。包含日期、收款人、描述和金额列的 CSV 仍可免费导入。",
    description:
      "Explains when AI parsing returns and that a well-formed CSV still imports for free",
  },
  "importer.error.premiumRequired": {
    message: "需要高级功能",
    description: "Title for premium required error",
  },
  "importer.error.premiumRequiredDescription": {
    message: "当前文件类型需要AI分析",
    description: "Description of why premium is required",
  },
  "importer.error.upgradeToPlan": {
    message: "升级到{plan}",
    description:
      "Heading over the paywall's upgrade button; {plan} is the plan the button recommends (the next tier up).",
  },
  "importer.error.upgradePlan": {
    message: "升级你的计划",
    description:
      "Heading over the paywall's upgrade button when no higher self-serve plan exists.",
  },
  "importer.error.upgradeDescription": {
    message: "使用AI自动解析PDF、OFX和图像文件",
    description: "Description of premium parsing features",
  },
  "importer.error.upgradeNow": {
    message: "立即升级",
    description: "Button text to start upgrade process",
  },
  "importer.error.or": {
    message: "或",
    description: "Separator between upgrade and CSV options",
  },
  "importer.error.useCsvFormat": {
    message: "使用CSV格式",
    description: "Label for CSV alternative option",
  },
  "importer.error.csvFreeAccess": {
    message: "CSV文件可以免费解析，无需高级访问权限",
    description: "Description of free CSV parsing",
  },
  "importer.error.downloadCsvExample": {
    message: "下载CSV示例",
    description: "Button text to download CSV example file",
  },
  "importer.error.failedToParse": {
    message: "文件解析失败",
    description: "Title for parse failure error",
  },
  "importer.error.notUtf8": {
    message: "文件不是 UTF-8 文本",
    description: "Title when an uploaded CSV is not UTF-8 text",
  },
  "importer.error.notUtf8Description": {
    message:
      "此 CSV 包含无效的 UTF-8 字符，导入会改变收款方和描述文本。请在银行或电子表格应用中重新另存为 CSV UTF-8，然后上传该文件。",
    description: "How to re-save a CSV that is not UTF-8 text",
  },
  "importer.error.serverError": {
    message: "处理你的文件时发生服务器错误。请稍后几秒钟重试。",
    description: "Description of server error",
  },
  // Preview Table
  "importer.preview.title": {
    message: "预览导入的数据",
    description: "Title for preview table",
  },
  "importer.preview.description": {
    message: "在配置账户之前查看已解析的交易",
    description: "Description for preview table",
  },
  "importer.preview.validCount": {
    message: "{count} 有效",
    description: "Badge label for valid transaction count ({count} rows)",
  },
  "importer.preview.validCount_other": {
    message: "{count} 有效",
    description:
      "Badge label for valid transaction count, plural form for count category other",
  },
  "importer.preview.errorsCount": {
    message: "{count} 错误",
    description: "Badge label for error transaction count ({count} rows)",
  },
  "importer.preview.errorsCount_other": {
    message: "{count} 错误",
    description:
      "Badge label for error transaction count, plural form for count category other",
  },
  "importer.preview.row": {
    message: "行",
    description: "Table header for row number column",
  },
  "importer.preview.date": {
    message: "日期",
    description: "Table header for date column",
  },
  "importer.preview.payee": {
    message: "收款人",
    description: "Table header for payee column",
  },
  "importer.preview.description_column": {
    message: "描述",
    description: "Table header for description column",
  },
  "importer.preview.amount": {
    message: "金额",
    description: "Table header for amount column",
  },
  "importer.preview.noData": {
    message: "没有要显示的数据",
    description: "Empty state message when no transactions",
  },
  "importer.preview.validationErrorsTitle": {
    message: "发现验证错误",
    description: "Alert title for validation errors",
  },
  "importer.preview.recordWidthError": {
    message:
      "此记录不是恰好四个字段（日期、收款人、描述、金额）。请删除该行，或更正文件后重新上传。",
    description:
      "Shown on a preview row whose CSV record has more or fewer than the four importer fields; editing its cells cannot fix it",
  },
  "importer.preview.validationErrorsMessage": {
    message: "某些行存在验证错误。请在继续之前修复它们，否则在导入时将被跳过。",
    description: "Alert message explaining validation errors",
  },
  "importer.preview.uploadDifferentFile": {
    message: "上传其他文件",
    description: "Button to go back to upload step",
  },
  "importer.preview.continueToConfig": {
    message: "继续配置",
    description: "Button to proceed to configuration step",
  },
  "importer.preview.dateFormat": {
    message: "YYYY-MM-DD",
    description: "Placeholder for date input format",
  },
  "importer.preview.payeePlaceholder": {
    message: "收款人名称",
    description: "Placeholder for payee input",
  },
  "importer.preview.descriptionPlaceholder": {
    message: "描述",
    description: "Placeholder for description input",
  },
  "importer.preview.amountPlaceholder": {
    message: "0.00",
    description: "Placeholder for amount input",
  },
  "importer.preview.clickToEdit": {
    message: "点击编辑",
    description: "Placeholder text for editable cells",
  },
  "importer.preview.multilineHint": {
    message: "按 Enter 保存，按 Shift+Enter 换行。",
    description:
      "Hint under a multiline editable cell explaining the commit shortcut",
  },
  "importer.preview.actions": {
    message: "操作",
    description: "Table header for actions column",
  },
  "importer.preview.deleteRow": {
    message: "删除第 {row} 行",
    description: "Aria label for delete row button",
  },
  "importer.preview.emptyFileTitle": {
    message: "未找到交易",
    description: "Title when file is parsed but contains no data",
  },
  "importer.preview.emptyFileDescription": {
    message: "文件已成功解析，但未找到交易数据。请检查你的文件并重试。",
    description: "Description when file is parsed but contains no data",
  },
  "importer.preview.retryUpload": {
    message: "尝试其他文件",
    description: "Button text to retry file upload",
  },

  // Configure Step
  "importer.configure.title": {
    message: "配置导入设置",
    description: "Title for configuration step",
  },
  "importer.configure.description": {
    message: "为所有交易设置源账户和货币，然后为每行分配目标账户",
    description: "Description for configuration step",
  },
  "importer.configure.sourceAccount": {
    message: "源账户",
    description: "Label for source account field",
  },
  "importer.configure.sourceAccountPlaceholder": {
    message: "选择源账户...",
    description: "Placeholder for source account selector",
  },
  "importer.configure.sourceAccountHint": {
    message: "这些交易来自的银行账户",
    description: "Hint text for source account field",
  },
  "importer.configure.currency": {
    message: "货币",
    description: "Label for currency field",
  },
  "importer.configure.currencyHint": {
    message: "所有交易的货币",
    description: "Hint text for currency field",
  },
  "importer.configure.currencyConflict_other": {
    message:
      "{count} 行（{rows}）以 {symbol}（{currencies}）计价，但本次导入会将其记为 {currency}。",
    description:
      "Import refusal for several selected rows whose amounts carry a currency symbol other than the chosen import currency. {rows} lists their row numbers, possibly ending in …",
  },
  "importer.configure.currencyConflictRemedy": {
    message:
      "一次导入只能记一种货币。请选择这些行所用的货币，或取消选择它们并单独导入。尚未导入任何内容。",
    description:
      "How to resolve a currency conflict before importing: no conversion happens, so the user picks the matching currency or splits the file",
  },
  "importer.configure.assignTargetAccounts": {
    message: "分配目标账户",
    description: "Heading for account mapping section",
  },
  "importer.configure.back": {
    message: "返回",
    description: "Button to go back to previous step",
  },
  "importer.configure.importing": {
    message: "导入中...",
    description: "Button text while importing",
  },
  "importer.configure.importButton": {
    message: "导入{count}笔交易",
    description:
      "Button text to import transactions with count (base key for pluralization)",
  },
  "importer.configure.importButton_other": {
    message: "导入{count}笔交易",
    description: "Button text to import multiple transactions with count",
  },
  "importer.configure.sourceAccountRequired": {
    message: "源账户是必需的",
    description: "Validation error for missing source account",
  },
  "importer.configure.currencyRequired": {
    message: "货币是必需的",
    description: "Validation error for missing currency",
  },
  "importer.configure.atLeastOneTransaction": {
    message: "至少需要一笔交易",
    description: "Validation error when no transactions",
  },
  "importer.configure.allSelectedNeedAccount": {
    message: "所有选定的交易都必须有目标账户",
    description: "Validation error for selected transactions without account",
  },
  "importer.configure.atLeastOneSelected": {
    message: "必须至少选择一笔交易",
    description: "Validation error when no transactions selected",
  },

  // Account Mapping Table
  "importer.accountMapping.searchPlaceholder": {
    message: "按描述搜索...",
    description: "Placeholder for search input",
  },
  "importer.accountMapping.filterByAmount": {
    message: "按金额筛选",
    description: "Placeholder for amount filter",
  },
  "importer.accountMapping.allAmounts": {
    message: "所有金额",
    description: "Filter option for all amounts",
  },
  "importer.accountMapping.positiveOnly": {
    message: "零或正数",
    description:
      "Filter option for amounts of zero or more: zero amounts are included, negative ones are not",
  },
  "importer.accountMapping.negativeOnly": {
    message: "仅负数",
    description: "Filter option for negative amounts",
  },
  "importer.accountMapping.selectAll": {
    message: "选择所有可见行",
    description: "Aria label for select all checkbox",
  },
  "importer.accountMapping.targetAccount": {
    message: "目标账户",
    description: "Table header for target account column",
  },
  "importer.accountMapping.categorizing": {
    message: "分类中...",
    description: "Button text while AI is categorizing",
  },
  "importer.accountMapping.aiFill": {
    message: "AI填充",
    description: "Button text for AI categorization",
  },
  "importer.accountMapping.noMatch": {
    message: "没有与你的筛选条件匹配的交易",
    description: "Empty state when filters return no results",
  },
  "importer.accountMapping.noConfigure": {
    message: "没有要配置的交易",
    description: "Empty state when no transactions available",
  },
  "importer.accountMapping.selectTransaction": {
    message: "选择交易",
    description:
      "Aria label for transaction checkbox (number will be appended)",
  },
  "importer.accountMapping.selectAccountPlaceholder": {
    message: "选择账户...",
    description: "Placeholder for account selector",
  },
  "importer.accountMapping.requiredForSelected": {
    message: "选定行必填",
    description: "Validation error for missing target account",
  },
  "importer.accountMapping.missingAccountAlert": {
    message:
      "{count}笔交易缺少目标账户。请在导入之前为所有选定的行分配目标账户。",
    description:
      "Alert message for transactions missing target accounts (base key for pluralization)",
  },
  "importer.accountMapping.missingAccountAlert_other": {
    message:
      "{count}笔交易缺少目标账户。请在导入之前为所有选定的行分配目标账户。",
    description:
      "Alert message for multiple transactions missing target accounts",
  },
  "importer.accountMapping.aiSuccess": {
    message: "AI分类完成！",
    description: "Toast title for successful AI categorization",
  },
  "importer.accountMapping.aiSuccessDescription": {
    message: "成功分类了{count}笔交易",
    description:
      "Toast description for AI categorization (base key for pluralization)",
  },
  "importer.accountMapping.aiSuccessDescription_other": {
    message: "成功分类了{count}笔交易",
    description: "Toast description for multiple transactions categorization",
  },
  "importer.accountMapping.aiNoneApplied": {
    message: "没有足够可信的建议可用于填写目标账户。",
    description:
      "Toast description when AI Fill completed but no suggestion was confident enough to fill a target",
  },
  "importer.accountMapping.aiFailed": {
    message: "AI分类失败",
    description: "Toast title for failed AI categorization",
  },

  // Importing Step
  "importer.importing.title": {
    message: "正在导入交易...",
    description: "Title shown during import process",
  },
  "importer.importing.description": {
    message: "请稍候，我们正在将你的交易添加到账本",
    description: "Description shown during import process",
  },

  // Finish Step
  "importer.finish.successTitle": {
    message: "导入成功！",
    description: "Title for successful import",
  },
  "importer.finish.successMessage": {
    message: "成功导入了{count}笔交易",
    description:
      "Success message for transactions with count (base key for pluralization)",
  },
  "importer.finish.successMessage_other": {
    message: "成功导入了{count}笔交易",
    description: "Success message for multiple transactions with count",
  },
  "importer.finish.partialFailure": {
    message: "{count}笔交易导入失败",
    description:
      "Partial failure message for transactions (base key for pluralization)",
  },
  "importer.finish.partialFailure_other": {
    message: "{count}笔交易导入失败",
    description: "Partial failure message for multiple transactions",
  },
  "importer.finish.viewJournal": {
    message: "查看日记账",
    description: "Button to view journal after import",
  },
  "importer.finish.importMore": {
    message: "导入更多",
    description: "Button to import more transactions",
  },
  "importer.finish.failedTransactions": {
    message: "失败的交易：",
    description: "Alert header for failed transactions",
  },
  "importer.finish.rowPrefix": {
    message: "行",
    description:
      "Prefix for row number in error messages (e.g. 'Row 5: error')",
  },
  "importer.finish.failedTitle": {
    message: "导入失败",
    description: "Title for failed import",
  },
  "importer.finish.failedMessage": {
    message: "导入交易时发生错误",
    description: "Default error message for failed import",
  },
  "importer.finish.errorDetails": {
    message: "错误详情：",
    description: "Alert header for error details",
  },
  "importer.finish.startOver": {
    message: "重新开始",
    description: "Button to restart import process",
  },
  "page.importer.title": {
    message: "智能导入",
    description: "Page title for the importer page",
  },
  "importer.finish.note": {
    message: "注意",
    description: "Label before a partial import note",
  },
  "importer.finish.andMoreErrors": {
    message: "…以及 {count} 更多错误",
    description: "Count of additional import errors",
  },
  "importer.preview.editCellLabel": {
    message: "编辑 {field}，第 {row} 行。当前值：{value}",
    description: "Accessible label for an editable import cell",
  },
  "importer.preview.editFieldLabel": {
    message: "{field}，第 {row} 行",
    description: "Accessible label for the open editor of an import cell",
  },
  "importer.validation.dateRequired": {
    message: "日期为必填项",
    description: "Validation error for a missing import date",
  },
  "importer.validation.invalidDateFormat": {
    message: "日期格式无效。预计年-月-日",
    description: "Validation error for an invalid import date",
  },
  "importer.validation.payeeRequired": {
    message: "收款人为必填项",
    description: "Validation error for a missing import payee",
  },
  "importer.validation.descriptionRequired": {
    message: "需要描述",
    description: "Validation error for a missing import description",
  },
  "importer.validation.amountRequired": {
    message: "金额为必填项",
    description: "Validation error for a missing import amount",
  },
  "importer.validation.amountInvalid": {
    message: "金额必须是有效数字",
    description: "Validation error for an invalid import amount",
  },
  "importer.validation.amountMixedDecimals": {
    message:
      "此列混用了小数点（1,234.56）和小数逗号（1.234,56）。请在每列中只使用一种写法。",
    description:
      "Validation error when an import amount column mixes point and comma decimal marks",
  },
  "importer.validation.amountUnsupportedPrecision": {
    message: "此金额无法精确导入 — 请缩短位数以保留每一位数字",
    description:
      "Validation error when Number conversion would change the exact decimal value",
  },
};

export default zhImporter;
