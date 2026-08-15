export interface TranslationEntry {
  message: string;
  description: string;
}

const zhDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.blogFeed": {
    message: "最新动态",
    description: "Title for blog feed section on dashboard",
  },
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
  "page.dashboard.failedToLoadLedgersDescription": {
    message: "无法获取你的账本。请检查你的连接后重试。",
    description: "Detailed error description for ledger loading failure",
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
    message: "你已达到分类账限制。升级以创建更多分类账。",
    description: "Tooltip shown when save button is disabled due to limit",
  },
  "page.dashboard.ledgerName": {
    message: "账本名称",
    description: "Form label for ledger name field",
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
  "page.dashboard.manageLedgersDescription": {
    message: "管理你的 Beancount 账本。点击账本查看详细信息。",
    description: "Detailed description with click instruction",
  },
  "page.dashboard.nameInvalid": {
    message: "名称必须至少包含一个字母或数字",
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
  "page.dashboard.noFeedItems": {
    message: "暂无动态",
    description: "Empty state message when no feed items exist",
  },
  "page.dashboard.noLedgersFound": {
    message: "未找到账本",
    description: "Message when user has no ledgers",
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
    description: "Aria label for ledger switcher button",
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
};

export default zhDashboardPage;
