export interface TranslationEntry {
  message: string;
  description: string;
}

const zhCommon: Record<string, TranslationEntry> = {
  "common.accountColumn": {
    message: "账户",
    description: "Table column header for account names",
  },
  "common.actions": {
    message: "交易记录",
    description: "Plural form of transaction",
  },
  "common.back": {
    message: "返回",
    description: "Button label to go back to previous page",
  },
  "common.beancountLogo": {
    message: "Beancount 标志",
    description: "Alt text for Beancount logo",
  },
  "common.cancel": {
    message: "取消",
    description: "Button label to cancel action",
  },
  "common.clearInput": {
    message: "清除",
    description: "Aria label for clear input button",
  },
  "common.closeDialog": {
    message: "关闭",
    description: "Screen reader label for close dialog button",
  },
  "common.collaboratorsLimit": {
    message: "协作者限制",
    description: "Title for collaborator limit information",
  },
  "common.collaboratorsLimitReached": {
    message: "协作者限制已达上限",
    description: "Title when collaborator limit is reached",
  },
  "common.copied": {
    message: "已复制",
    description: "Status message indicating content was copied",
  },
  "common.copy": {
    message: "复制",
    description: "Button label to copy content",
  },
  "common.delete": {
    message: "删除",
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
    message: "编辑",
    description: "Button label to edit item",
  },
  "common.errorDescription": {
    message: "我们遇到了意外错误。请重试或返回上一页。",
    description: "Error page description",
  },
  "common.errorDetails": {
    message: "错误详情",
    description: "Label for expandable error details section",
  },
  "common.errorOccurred": {
    message: "发生错误",
    description: "Generic error message for error pages",
  },
  "common.errorTitle": {
    message: "出错了",
    description: "Error page title",
  },
  "common.failedToLoadData": {
    message: "加载数据失败",
    description: "Error title when data fails to load",
  },
  "common.failedToLoadLedger": {
    message: "加载账本失败",
    description: "Error title when ledger fails to load",
  },
  "common.goBack": {
    message: "返回",
    description: "Button text to go back to previous page",
  },
  "common.goHome": {
    message: "返回首页",
    description: "Button text to return to home page",
  },
  "common.goToNextPage": {
    message: "转到下一页",
    description: "Aria label for next page button",
  },
  "common.goToPreviousPage": {
    message: "转到上一页",
    description: "Aria label for previous page button",
  },
  "common.import": {
    message: "导入",
    description: "Label for import dropdown button",
  },
  "common.manualImport": {
    message: "添加条目",
    description: "Label for add entry menu item (opens new entry dialog)",
  },
  "common.manualImportDesc": {
    message: "交易、余额或备注",
    description: "Description for add entry menu item",
  },
  "common.smartImport": {
    message: "智能导入",
    description: "Label for smart import menu item (navigates to import page)",
  },
  "common.smartImportDesc": {
    message: "银行账单、CSV、PDF 或扫描件",
    description: "Description for smart import menu item",
  },
  "common.linkImport": {
    message: "连接银行",
    description:
      "Label for link account menu item (navigates to Plaid bank linking page)",
  },
  "common.linkImportDesc": {
    message: "自动同步交易",
    description:
      "Description for link account menu item, emphasizing automatic sync via Plaid vs. manual/file import",
  },
  "common.uploadReceipt": {
    message: "上传收据",
    description:
      "Label for upload receipt menu item (navigates to receipt page)",
  },
  "common.uploadReceiptDesc": {
    message: "用 AI 扫描收据图片或 PDF",
    description: "Description for upload receipt menu item",
  },
  "common.invalidParameters": {
    message: "无效的 URL 参数",
    description: "Title for validation error page",
  },
  "common.invalidParametersDescription": {
    message: "提供的 URL 参数无效。请检查链接并重试。",
    description: "Description for validation error page",
  },
  "common.ledgerSettings": {
    message: "账本设置",
    description:
      "Navigation label for ledger-specific settings page in sidebar",
  },
  "common.ledgersLimit": {
    message: "账本限制",
    description: "Title for ledger limit information",
  },
  "common.ledgersLimitReached": {
    message: "账本限制已达上限",
    description: "Title when ledger limit is reached",
  },
  "common.loading": {
    message: "加载中...",
    description: "Loading state message",
  },
  "common.loadingData": {
    message: "正在加载数据...",
    description: "Generic loading state message",
  },
  "common.morePages": {
    message: "更多页面",
    description: "Screen reader label for pagination ellipsis",
  },
  "common.nearLimit": {
    message: "接近上限",
    description: "Indicator that user is close to their limit",
  },
  "common.networkConnectionFailed": {
    message: "网络连接失败",
    description: "Error title when network connection fails",
  },
  "common.networkErrorDescription": {
    message: "无法连接到服务器。请检查网络连接后重试。",
    description: "Detailed description of network error",
  },
  "common.next": {
    message: "下一步",
    description: "Button label to proceed to next step",
  },
  "common.nextPage": {
    message: "下一个",
    description: "Text label for next page button",
  },
  "common.noDataFound": {
    message: "未找到数据。",
    description: "Message when no data is available",
  },
  "common.noResultsFound": {
    message: "未找到结果。",
    description: "Message when search returns no results",
  },
  "common.otherColumn": {
    message: "其他",
    description: "Table column header for other currencies/amounts",
  },
  "common.pageNotFound": {
    message: "页面未找到",
    description: "Title for 404 page",
  },
  "common.pageNotFoundDescription": {
    message: "你查找的页面不存在或已移动到其他位置。",
    description: "Description for 404 page",
  },
  "common.paginationNav": {
    message: "分页",
    description: "Aria label for pagination navigation",
  },
  "common.previous": {
    message: "上一个",
    description: "Text label for previous page button",
  },
  "common.relatedPages": {
    message: "相关页面",
    description: "Aria label for related pages navigation",
  },
  "common.save": {
    message: "保存",
    description: "Button label to save changes",
  },
  "common.saving": {
    message: "保存...",
    description: "Saving state message",
  },
  "common.seeAlso": {
    message: "相关页面",
    description: "Heading for related pages navigation section",
  },
  "common.selectAView": {
    message: "选择视图",
    description: "Placeholder for responsive tab trigger",
  },
  "common.selectDate": {
    message: "选择日期",
    description: "Screen reader label for date picker button",
  },
  "common.settings": {
    message: "设置",
    description: "Navigation label for settings page",
  },
  "common.sidebar": {
    message: "侧边栏",
    description: "Title for sidebar",
  },
  "common.sidebarDescription": {
    message: "显示移动侧边栏。",
    description: "Description of mobile sidebar for screen readers",
  },
  "common.stars": {
    message: "星标",
    description: "Navigation label for starred ledgers page",
  },
  "common.status": {
    message: "状态",
    description: "Table column header for status",
  },
  "common.toggleSidebar": {
    message: "切换侧边栏",
    description: "Tooltip for toggle sidebar button",
  },
  "common.tryAgain": {
    message: "重试",
    description: "Button to retry failed action",
  },
  "common.unexpectedError": {
    message: "加载账本时发生意外错误。",
    description: "Generic unexpected error message",
  },
  "common.unknown": {
    message: "未知",
    description: "Placeholder for unknown or missing values",
  },
  "common.updating": {
    message: "更新...",
    description: "Updating state message",
  },
  "common.upgradeToPro": {
    message: "升级到 Pro",
    description:
      "Short CTA button shown in the sidebar directive-usage indicator once a ledger is approaching or over its free-tier directive limit",
  },
  "common.upgradeToUnlock": {
    message: "升级以解锁",
    description: "Button text to upgrade subscription",
  },
  "common.userEmailFallback": {
    message: "user@example.com",
    description: "Fallback email when user email is not available",
  },
  "common.userFallback": {
    message: "用户",
    description: "Fallback username when user data is not available",
  },
  "common.download": {
    message: "下载",
    description: "Auto-generated from code usage",
  },
  "common.moreActions": {
    message: "更多操作",
    description: "Label for dropdown menu with additional actions",
  },
  "common.learnMore": {
    message: "了解更多",
    description: "Link text to learn more about a topic",
  },
  "common.pageDescription.account": {
    message: "查看{ledgerName}的详细账户信息。分析交易、余额和账户历史。",
    description: "Description for account page",
  },
  "common.pageDescription.ask": {
    message:
      "使用AI询问关于{ledgerName}的财务数据。分析交易、查看账户余额、了解趋势并获得即时会计洞察。",
    description: "Description for AI ask page",
  },
  "common.pageDescription.balanceSheet": {
    message: "查看{ledgerName}的资产负债表。在任何时间点分析资产、负债和权益。",
    description: "Description for balance sheet page",
  },
  "common.pageDescription.cashFlow": {
    message:
      "查看{ledgerName}的现金流量表。追踪经营、投资和筹资活动产生的现金变动。",
    description: "Description for cash flow page",
  },
  "common.pageDescription.commodities": {
    message:
      "查看和管理{ledgerName}中使用的商品（货币、股票和资产）。跟踪汇率和价格历史。",
    description: "Description for commodities page",
  },
  "common.pageDescription.createFile": {
    message:
      "在{ledgerName}中创建新文件。将Beancount账本文件或文档添加到你的存储库。",
    description: "Description for create file page",
  },
  "common.pageDescription.documents": {
    message: "浏览{ledgerName}中附加到交易的文档。查看收据、发票和支持文档。",
    description: "Description for documents page",
  },
  "common.pageDescription.errors": {
    message:
      "查看{ledgerName}中的解析和验证错误。修复问题以确保准确的财务报告。",
    description: "Description for errors page",
  },
  "common.pageDescription.events": {
    message:
      "查看{ledgerName}中的重要事件和里程碑。跟踪账户开户、关户和生命周期事件。",
    description: "Description for events page",
  },
  "common.pageDescription.files": {
    message:
      "浏览和编辑{ledgerName}中的Beancount源文件。管理你的科目表和交易历史。",
    description: "Description for files page",
  },
  "common.pageDescription.holdings": {
    message:
      "分析你在{ledgerName}中的当前持仓和投资组合。查看资产配置、市场价值和未实现收益。",
    description: "Description for holdings page",
  },
  "common.pageDescription.import": {
    message:
      "从银行对账单、电子表格或收据添加交易到 {ledgerName}。支持 CSV、PDF、OFX 和图像文件，最大 10 MB。",
    description: "Description for import page",
  },
  "common.pageDescription.incomeStatement": {
    message:
      "查看{ledgerName}的收入和支出。跟踪收入、成本和盈利能力随时间的变化。",
    description: "Description for income statement page",
  },
  "common.pageDescription.journal": {
    message:
      "浏览和过滤{ledgerName}中的所有交易。按日期、账户、描述或收款人搜索。",
    description: "Description for journal page",
  },
  "common.pageDescription.overview": {
    message:
      "{ledgerName}的财务仪表板。查看账户余额、净资产趋势和收入/支出摘要。",
    description: "Description for overview page",
  },
  "common.pageDescription.query": {
    message:
      "对{ledgerName}运行BQL（Beancount查询语言）查询。使用类似SQL的语法过滤和分析你的财务数据。",
    description: "Description for query page",
  },
  "common.pageDescription.settings": {
    message: "配置{ledgerName}的设置。管理运营货币、协作者和隐私设置。",
    description: "Description for settings page",
  },
  "common.pageDescription.statistics": {
    message:
      "查看{ledgerName}的账本统计信息。分析交易计数、账户使用情况和数据质量指标。",
    description: "Description for statistics page",
  },
  "common.pageDescription.trialBalance": {
    message: "查看{ledgerName}的试算平衡表。验证所有账户的借方和贷方是否相等。",
    description: "Description for trial balance page",
  },
  "common.pageDescription.uploadFiles": {
    message: "上传文件到{ledgerName}。导入现有的Beancount文件或文档。",
    description: "Description for upload files page",
  },
  "common.postings": {
    message: "记账分录",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.balanceSheet": {
    message: "资产负债表",
    description: "Link label for balance sheet page",
  },
  "common.relatedLinks.cashFlow": {
    message: "现金流量表",
    description: "Link label for cash flow page",
  },
  "common.relatedLinks.commodities": {
    message: "商品",
    description: "Link label for commodities page",
  },
  "common.relatedLinks.createFile": {
    message: "创建文件",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.documents": {
    message: "文档",
    description: "Link label for documents page",
  },
  "common.relatedLinks.errors": {
    message: "错误",
    description: "Link label for errors page",
  },
  "common.relatedLinks.events": {
    message: "事件",
    description: "Link label for events page",
  },
  "common.relatedLinks.files": {
    message: "文件",
    description: "Link label for files page",
  },
  "common.relatedLinks.holdings": {
    message: "持仓",
    description: "Link label for holdings page",
  },
  "common.relatedLinks.import": {
    message: "导入",
    description: "Link label for import page",
  },
  "common.relatedLinks.incomeStatement": {
    message: "损益表",
    description: "Link label for income statement page",
  },
  "common.relatedLinks.journal": {
    message: "流水账",
    description: "Link label for journal page",
  },
  "common.relatedLinks.overview": {
    message: "概览",
    description: "Link label for overview page",
  },
  "common.relatedLinks.query": {
    message: "查询",
    description: "Link label for query page",
  },
  "common.relatedLinks.statistics": {
    message: "统计",
    description: "Link label for statistics page",
  },
  "common.relatedLinks.trialBalance": {
    message: "试算平衡表",
    description: "Link label for trial balance page",
  },
  "common.relatedLinks.uploadFiles": {
    message: "上传文件",
    description: "Link label for upload files page",
  },
  "common.relatedLinks.versionHistory": {
    message: "版本历史",
    description: "Link label for version history page",
  },
  "common.results": {
    message: "结果",
    description: "Auto-generated from code usage",
  },
  "common.rows": {
    message: "行",
    description: "Auto-generated from code usage",
  },
  "common.success": {
    message: "成功",
    description: "Auto-generated from code usage",
  },
  "common.assets": {
    message: "资产",
    description: "Assets category in accounting",
  },
  "component.conversionSelect.atCost": {
    message: "按成本",
    description: "Conversion option for cost-based display",
  },
  "component.conversionSelect.atMarketValue": {
    message: "按市值",
    description: "Conversion option for market value display",
  },
  "common.reports": {
    message: "报表",
    description: "Navigation group label for financial reports",
  },
  "common.advanced": {
    message: "高级",
    description: "Navigation group label for advanced ledger tools",
  },
  "common.helpAndSupport": {
    message: "帮助与支持",
    description: "Accessible label for the help and support menu",
  },
  "common.helpCenter": {
    message: "帮助中心",
    description: "Menu item linking to product documentation",
  },
  "common.helpCenterDescription": {
    message: "浏览指南和文档",
    description: "Description for the help center menu item",
  },
  "common.communitySupport": {
    message: "社区支持",
    description: "Menu item linking to the community support channel",
  },
  "common.communitySupportDescription": {
    message: "在 Telegram 上向社区提问",
    description: "Description for the community support menu item",
  },
  "common.requestFeature": {
    message: "功能请求",
    description: "Menu item linking to the feature request page on GitHub",
  },
  "common.requestFeatureDescription": {
    message: "在 GitHub 上分享想法或报告问题",
    description: "Description for the request a feature menu item",
  },
  "common.balanceSheet": {
    message: "资产负债表",
    description: "Navigation label for balance sheet financial report",
  },
  "component.searchControls.clearAll": {
    message: "清除 all",
    description: "Button text to clear all filters",
  },
  "component.conversionSelect.convertedTo": {
    message: "转换为",
    description: "Prefix for currency conversion option",
  },
  "component.intervalSelect.daily": {
    message: "每日",
    description: "Daily interval option",
  },
  "common.equity": {
    message: "权益",
    description: "Equity category in accounting",
  },
  "component.errorState.title": {
    message: "加载数据时出错",
    description: "Error message when data fails to load",
  },
  "common.expenses": {
    message: "开支",
    description: "Expenses category in accounting",
  },
  "component.searchControls.failedToLoad": {
    message: "加载筛选选项失败",
    description: "Error message when filter options fail to load",
  },
  "component.searchControls.filterByTagPayee": {
    message: "按标签、收款人等筛选...",
    description: "Placeholder for filter input with tags and payees",
  },
  "page.reports.hierarchyListDescription": {
    message: "{ledgerName}{sectionName}的详细分解，包括美元和其他商品价值",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "{sectionName}列表",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "{sectionName}层级",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "{ledgerName}{sectionName}组成的可视化表示",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "common.income": {
    message: "收入",
    description: "Income category in accounting",
  },
  "common.cashFlow": {
    message: "现金流量表",
    description: "Navigation label for cash flow financial report",
  },
  "common.incomeStatement": {
    message: "损益表",
    description: "Navigation label for income statement financial report",
  },
  "common.liabilities": {
    message: "负债",
    description: "Liabilities category in accounting",
  },
  "common.netProfit": {
    message: "净利润",
    description: "Label for net profit section",
  },
  "common.netWorth": {
    message: "净值",
    description: "Label for net worth section",
  },
  "component.accountCombobox.noAccountsFound": {
    message: "未找到账户",
    description: "Message when no accounts match search",
  },
  "component.sourceFileCombobox.placeholder": {
    message: "搜索文件...",
    description: "Placeholder for ledger file search",
  },
  "component.sourceFileCombobox.noFilesFound": {
    message: "未找到文件",
    description: "Message when no ledger files match search",
  },
  "component.emptyState.title": {
    message: "无可用数据",
    description: "Title when no data is available",
  },
  "component.emptyState.noDataForFilters": {
    message: "所选筛选条件无数据",
    description: "Auto-generated from code usage",
  },
  "component.combobox.noMatchesFound": {
    message: "未找到匹配项",
    description: "Message when search returns no results in combobox",
  },
  "common.overview": {
    message: "概览",
    description: "Navigation label for overview/dashboard page",
  },
  "component.errorState.retry": {
    message: "请稍后重试",
    description: "Generic retry message",
  },
  "component.intervalSelect.quarterly": {
    message: "每季度",
    description: "Quarterly interval option",
  },
  "component.accountCombobox.placeholder": {
    message: "搜索账户...",
    description: "Placeholder for account search",
  },
  "component.conversionSelect.placeholder": {
    message: "选择转换",
    description: "Placeholder for conversion select dropdown",
  },
  "component.intervalSelect.placeholder": {
    message: "选择时间段",
    description: "Placeholder for interval select dropdown",
  },
  "component.searchControls.time": {
    message: "时间",
    description: "Placeholder for time filter",
  },
  "common.trialBalance": {
    message: "试算平衡表",
    description: "Navigation label for trial balance report",
  },
  "component.combobox.placeholder": {
    message: "输入以搜索...",
    description: "Placeholder for search input in filter combobox",
  },
  "component.conversionSelect.units": {
    message: "单位",
    description: "Conversion option for unit display",
  },
  "component.intervalSelect.yearly": {
    message: "每年",
    description: "Yearly interval option",
  },
  "component.searchControls.account": {
    message: "账户",
    description: "Placeholder for account filter",
  },
  "common.error": {
    message: "错误",
    description: "Generic error label",
  },
  "common.sessionExpiredTitle": {
    message: "登录已过期",
    description:
      "Title shown when a page load fails because the auth session expired",
  },
  "common.sessionExpiredDescription": {
    message: "你的登录会话已过期，请重新登录以继续。",
    description:
      "Description shown when a page load fails because the auth session expired",
  },
  "common.errors.unauthenticated": {
    message: "请登录后继续。",
    description: "Error shown when the user must sign in (UNAUTHENTICATED)",
  },
  "common.errors.forbidden": {
    message: "你没有权限执行此操作。",
    description: "Error shown when the user lacks permission (FORBIDDEN)",
  },
  "common.errors.notFound": {
    message: "未找到请求的资源。",
    description: "Error shown when a resource does not exist (NOT_FOUND)",
  },
  "common.errors.badUserInput": {
    message: "部分输入信息无效，请检查后重试。",
    description: "Error shown for invalid client input (BAD_USER_INPUT)",
  },
  "common.errors.validationFailed": {
    message: "校验失败，请检查输入内容后重试。",
    description: "Error shown when input validation fails (VALIDATION_FAILED)",
  },
  "common.errors.conflict": {
    message: "此更改与当前状态冲突，请刷新页面后重试。",
    description:
      "Error shown when a change conflicts with current state (CONFLICT)",
  },
  "common.errors.rateLimited": {
    message: "请求过于频繁，请稍候再试。",
    description: "Error shown when the user is rate limited (RATE_LIMITED)",
  },
  "common.errors.internal": {
    message: "我们这边出了点问题，请稍后重试。",
    description:
      "Error shown for unexpected server errors (INTERNAL_SERVER_ERROR)",
  },
  "common.errors.serviceUnavailable": {
    message: "服务暂时不可用，请稍后重试。",
    description:
      "Error shown when a backing service is down (SERVICE_UNAVAILABLE)",
  },
  "common.errors.resourceLimitReached": {
    message: "你已达到当前套餐的上限，升级后可继续使用。",
    description:
      "Error shown when a plan resource limit is hit (RESOURCE_LIMIT_REACHED)",
  },
  "common.errors.operationNotAllowed": {
    message: "不允许执行此操作。",
    description:
      "Error shown when business rules forbid the action (OPERATION_NOT_ALLOWED)",
  },
  "common.errors.premiumRequired": {
    message: "此功能需要高级版订阅。",
    description:
      "Error shown when a feature needs a premium plan (PREMIUM_REQUIRED)",
  },
  "common.errors.network": {
    message: "连接出现问题，请检查网络连接后重试。",
    description:
      "Error shown when the network request itself fails (offline, DNS)",
  },
  "common.errors.generic": {
    message: "出了点问题，请重试。",
    description: "Generic fallback error message for unrecognized errors",
  },
  "common.errorBoundary.title": {
    message: "出了点问题",
    description: "Title of the error boundary fallback panel",
  },
  "common.errorBoundary.description": {
    message: "此区域无法显示，页面的其他部分应可正常使用。",
    description: "Body of the error boundary fallback panel",
  },
  "common.copyCode": {
    message: "复制代码",
    description: "Aria label for the copy button on code blocks",
  },
  "common.copiedToClipboard": {
    message: "已复制到剪贴板",
    description: "Toast after content was copied to the clipboard",
  },
  "common.copyFailed": {
    message: "复制失败",
    description: "Toast when copying to the clipboard failed",
  },
  "common.outOfDateRefresh": {
    message: "已过时 — 单击刷新",
    description: "Tooltip for refreshing a stale ledger",
  },
  "common.view": {
    message: "查看",
    description: "Accessible label for a view selector",
  },
  "common.today": {
    message: "今天",
    description: "Button that selects today's date",
  },
  "common.author": {
    message: "作者",
    description: "Label for an author",
  },
  "common.from": {
    message: "来自",
    description: "Label for a source branch or account",
  },
  "common.to": {
    message: "至",
    description: "Label for a destination branch or account",
  },
  "common.option": {
    message: "选项",
    description: "Table heading for an option name",
  },
  "common.value": {
    message: "价值",
    description: "Table heading for an option value",
  },
  "common.moreCount": {
    message: "+{count} 更多",
    description: "Count of additional hidden items",
  },
  "common.hideCharts": {
    message: "隐藏图表",
    description: "Accessible label for hiding report charts",
  },
  "common.showCharts": {
    message: "显示图表",
    description: "Accessible label for showing report charts",
  },
  "common.redirecting": {
    message: "重定向...",
    description: "Status while redirecting to another page",
  },
  "common.loadingLedger": {
    message: "加载你的账本",
    description: "Status while loading a ledger",
  },
  "component.combobox.useCustomValue": {
    message: "按 Enter 键以使用“{value}”",
    description: "Hint for accepting a custom combobox value",
  },
};

export default zhCommon;
