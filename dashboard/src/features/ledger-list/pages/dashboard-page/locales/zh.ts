export interface TranslationEntry {
  message: string;
  description: string;
}

const zhDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.createLedger": {
    message: "创建账本",
    description: "Button to create new ledger",
  },
  "page.dashboard.createNewLedger": {
    message: "创建新账本",
    description: "Dialog title for creating ledger",
  },
  "page.dashboard.createNewLedgerDescription": {
    message: "创建一个新的 Beancount 账本来开始管理你的财务。",
    description: "Description in create ledger dialog",
  },
  "page.dashboard.dashboard": {
    message: "仪表板",
    description: "Dashboard page title shown in sidebar header",
  },
  "page.dashboard.goToDashboard": {
    message: "前往仪表板",
    description:
      "Aria label for the home/logo button navigating to the dashboard",
  },
  "page.dashboard.deleteLedger": {
    message: "删除账本",
    description: "Button tooltip or action for deleting ledger",
  },
  "page.dashboard.deleteLedgerConfirm": {
    message: '你确定要删除 \\"{name}\\" 吗？此操作无法撤销。',
    description:
      "Confirmation message for ledger deletion (contains {name} placeholder)",
  },
  "page.dashboard.deleting": {
    message: "删除中...",
    description: "Button state while deleting",
  },
  "page.dashboard.descriptionOptional": {
    message: "描述（可选）",
    description: "Description field label with optional indicator",
  },
  "page.dashboard.editLedger": {
    message: "编辑账本",
    description: "Button tooltip for editing ledger",
  },
  "page.dashboard.editLedgerSettings": {
    message: "编辑账本设置",
    description: "Dialog title for editing ledger",
  },
  "page.dashboard.enterDescription": {
    message: "输入描述",
    description: "Placeholder for description input",
  },
  "page.dashboard.enterLedgerName": {
    message: "输入账本名称",
    description: "Placeholder for ledger name input",
  },
  "page.dashboard.failedToLoadLedgers": {
    message: "加载账本失败",
    description: "Error title when ledgers fail to load",
  },
  "page.dashboard.feedError": {
    message: "加载动态失败",
    description: "Error message when feed fails to load",
  },
  "page.dashboard.ledgerCreatedSuccess": {
    message: "账本创建成功",
    description: "Toast notification when ledger created",
  },
  "page.dashboard.ledgerDeletedSuccess": {
    message: "账本删除成功",
    description: "Toast notification when ledger deleted",
  },
  "page.dashboard.ledgerLimitReached": {
    message: "你已达到账本数量上限。升级以创建更多账本。",
    description: "Tooltip shown when save button is disabled due to limit",
  },
  "page.dashboard.ledgerName": {
    message: "账本名称",
    description: "Form label for ledger name field",
  },
  "page.dashboard.ledgerSettingsFor": {
    message: "{ledger} 的设置",
    description:
      "Accessible name and tooltip for a ledger's settings menu; {ledger} is its displayed name",
  },
  "page.dashboard.ledgerUpdatedSuccess": {
    message: "账本更新成功",
    description: "Toast notification when ledger updated",
  },
  "page.dashboard.loadingLedgers": {
    message: "加载账本中...",
    description: "Message shown while loading ledgers",
  },
  "page.dashboard.manageLedgers": {
    message: "管理你的 Beancount 账本",
    description: "Description of ledger management",
  },
  "page.dashboard.nameInvalid": {
    message: "请至少使用一个拉丁字母 (A–Z) 或数字：名称会成为账本的网址。",
    description: "Validation error when name contains only special characters",
  },
  "page.dashboard.nameMaxLength": {
    message: "名称必须少于100个字符",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "名称为必填项",
    description: "Validation error when name is missing",
  },
  "page.dashboard.presetPersonal": {
    message: "个人账簿",
    description: "Name of the personal setup preset",
  },
  "page.dashboard.presetPersonalOutcome": {
    message: "记录一笔购买，了解其对剩余资金的影响。",
    description: "Outcome of the personal setup preset",
  },
  "page.dashboard.presetFreelance": {
    message: "自由职业账簿",
    description: "Name of the freelance setup preset",
  },
  "page.dashboard.presetFreelanceOutcome": {
    message: "记录客户收入，或查看未付款客户还欠多少。",
    description: "Outcome of the freelance setup preset",
  },
  "page.dashboard.presetBusiness": {
    message: "企业账簿",
    description: "Name of the business setup preset",
  },
  "page.dashboard.presetBusinessOutcome": {
    message: "建立期初头寸，区分融资与收入。",
    description: "Outcome of the business setup preset",
  },
  "page.dashboard.presetPortfolio": {
    message: "投资组合账簿",
    description: "Name of the portfolio setup preset",
  },
  "page.dashboard.presetPortfolioOutcome": {
    message: "记录一笔买入，核对单位、取得记录和现金流动。",
    description: "Outcome of the portfolio setup preset",
  },
  "page.dashboard.presetRental": {
    message: "租赁账簿",
    description: "Name of the rental setup preset",
  },
  "page.dashboard.presetRentalOutcome": {
    message: "记录收款，区分租金与可退押金。",
    description: "Outcome of the rental setup preset",
  },
  "page.dashboard.presetShared": {
    message: "共同支出账簿",
    description: "Name of the shared expenses setup preset",
  },
  "page.dashboard.presetSharedOutcome": {
    message: "记录一笔垫付，查看谁欠谁。",
    description: "Outcome of the shared expenses setup preset",
  },
  "page.dashboard.presetCommunity": {
    message: "社区账簿",
    description: "Name of the community setup preset",
  },
  "page.dashboard.presetCommunityOutcome": {
    message: "说明会费、项目支出和剩余资金。",
    description: "Outcome of the community setup preset",
  },
  "page.dashboard.presetBlank": {
    message: "空白账簿",
    description: "Name of the blank setup preset",
  },
  "page.dashboard.presetBlankOutcome": {
    message: "添加所选结构，无需删除不需要的类别。",
    description: "Outcome of the blank setup preset",
  },
  "page.dashboard.setupAmountInvalid": {
    message: "输入如 100 或 -30.50 的金额",
    description: "Validation error for the opening balance amount",
  },
  "page.dashboard.setupCurrency": {
    message: "运营货币",
    description: "Label for the currency field in staged ledger creation",
  },
  "page.dashboard.setupHistoryStart": {
    message: "账簿开始日期",
    description: "Label for the history start date in staged ledger creation",
  },
  "page.dashboard.setupOpeningAccount": {
    message: "开户账户",
    description: "Label for the first account in staged ledger creation",
  },
  "page.dashboard.setupOpeningAmount": {
    message: "期初余额（可选）",
    description: "Label for the optional opening balance in staged creation",
  },
  "page.dashboard.setupOpeningNone": {
    message: "稍后决定",
    description: "Choice to skip the opening balance in staged creation",
  },
  "page.dashboard.setupReview": {
    message: "检查",
    description: "Heading for the review step in staged ledger creation",
  },
  "page.dashboard.setupReviewDescription": {
    message: "将创建的正是这些内容。返回可修改。",
    description: "Description for the review step in staged ledger creation",
  },
  "page.dashboard.setupAccounts": {
    message: "账户",
    description: "Label for the account list in the creation review step",
  },
  "page.dashboard.setupStep": {
    message: "第 {step} 步，共 {total} 步",
    description: "Progress label in staged ledger creation",
  },
  "page.dashboard.noLedgersFound": {
    message: "未找到账本",
    description: "Message when user has no ledgers",
  },
  "page.dashboard.noLedgersDescription": {
    message: "创建你的第一个账本，开始记录你的财务。",
    description:
      "Empty state description prompting the user to create their first ledger",
  },
  "page.dashboard.private": {
    message: "私有",
    description: "Privacy status: private/not public",
  },
  "page.dashboard.privateAccess": {
    message: "仅你和协作者可以访问",
    description: "Description of private access level",
  },
  "page.dashboard.public": {
    message: "公开",
    description: "Privacy status: public/visible to all",
  },
  "page.dashboard.publicWarning": {
    message: "任何有链接的人都可以查看你的财务数据",
    description: "Warning about public access level",
  },
  "page.dashboard.repositoryName": {
    message: "仓库名称",
    description: "Label for the slugified repository name preview",
  },
  "page.dashboard.retry": {
    message: "重试",
    description: "Button to retry failed operation",
  },
  "page.dashboard.searchLedgers": {
    message: "搜索账本...",
    description: "Placeholder for ledger search input",
  },
  "page.dashboard.selectLedger": {
    message: "选择账本",
    description: "Accessible name for the ledger selection dialog",
  },
  "page.dashboard.switchLedgerFrom": {
    message: "{ledger} — 切换账本",
    description:
      "Accessible name for the ledger switcher, starting with the visible ledger name ({ledger})",
  },
  "page.dashboard.showMore": {
    message: "显示更多",
    description: "Button text to load more feed items",
  },
  "page.dashboard.updateLedgerDetails": {
    message: "更新账本的详细信息。",
    description: "Description in edit ledger dialog",
  },
  "page.dashboard.yourLedgers": {
    message: "我的账本",
    description: "Section title for user's ledgers list",
  },
  "page.dashboard.goToAccount": {
    message: "转到 {owner} 的账户",
    description: "Tooltip for navigating to owner's account page",
  },
  "page.dashboard.activity": {
    message: "动态",
    description:
      "Heading of the user's ledger activity feed on the dashboard home",
  },
  "page.dashboard.activityEmpty": {
    message: "你的账本提交记录会显示在这里。",
    description:
      "Empty state of the activity feed when the user has no ledger commits yet",
  },
  "page.dashboard.activityDescription": {
    message: "你能看到的所有账本的提交",
    description: "Description under the Activity heading on the dashboard home",
  },
  "page.dashboard.activityRefreshFailed": {
    message: "无法刷新动态，正在显示之前加载的内容。",
    description:
      "Notice above the activity cards when refreshing them failed; the cards shown are from an earlier load",
  },
};

export default zhDashboardPage;
