export interface TranslationEntry {
  message: string;
  description: string;
}

const zhSeo: Record<string, TranslationEntry> = {
  "seo.authCallback.description": {
    message: "正在完成你的Beancount登录。",
    description: "Auth callback page meta description",
  },
  "seo.authCallback.title": {
    message: "正在登录",
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
    message: "你的Beancount仪表板。访问你的账本并管理你的财务数据。",
    description: "Dashboard page meta description",
  },
  "seo.dashboard.title": {
    message: "仪表板",
    description: "Dashboard page title",
  },
  "seo.error.description": {
    message: "页面加载时发生错误。请重试或返回首页。",
    description: "Error page meta description",
  },
  "seo.error.title": {
    message: "错误",
    description: "Error page title",
  },
  "seo.forgotPassword.description": {
    message:
      "安全地重置你的 Beancount.io 账户密码。我们将向你的注册邮箱发送一次性安全验证链接 — 验证通过后即可立即返回你的账本继续记账工作，整个过程安全加密。",
    description: "Forgot password page meta description",
  },
  "seo.forgotPassword.title": {
    message: "重置 Beancount 密码 — 安全访问、快速恢复与重设",
    description: "Forgot password page title",
  },
  "seo.home.description": {
    message:
      "使用Beancount进行专业的纯文本记账。跟踪财务、管理账本并生成强大、精确、可审计的会计报告。",
    description: "Home page meta description",
  },
  "seo.home.title": {
    message: "Beancount Dashboard - 纯文本记账",
    description: "Home page title",
  },
  "seo.ledgerAccount.description": {
    message: "{ledgerName}中{accountName}的账户详情和交易历史。",
    description: "Account detail page meta description",
  },
  "seo.ledgerAccount.title": {
    message: "{accountName} - {ledgerName}",
    description: "Account detail page title with account and ledger name",
  },
  "seo.ledgerAsk.description": {
    message:
      "使用AI询问关于{ledgerName}的财务数据。分析交易、查看账户余额、了解趋势并获得即时会计洞察。",
    description: "Ask AI page meta description for SEO",
  },
  "seo.ledgerAsk.title": {
    message: "询问关于{ledgerName} - AI财务助手",
    description: "Ask AI page title with ledger name for SEO",
  },
  "seo.ledgerBalanceSheet.description": {
    message: "{ledgerName}的资产负债表报告。一目了然地查看资产、负债和权益。",
    description: "Balance sheet page meta description",
  },
  "seo.ledgerBalanceSheet.title": {
    message: "资产负债表 - {ledgerName}",
    description: "Balance sheet page title with ledger name",
  },
  "seo.ledgerCommodities.description": {
    message: "{ledgerName}的商品列表和价格。跟踪货币、股票和其他资产。",
    description: "Commodities page meta description",
  },
  "seo.ledgerCommodities.title": {
    message: "商品 - {ledgerName}",
    description: "Commodities page title with ledger name",
  },
  "seo.ledgerCommits.description": {
    message: "查看{ledgerName}的提交历史和版本控制。跟踪账本文件的历史变更。",
    description: "Commits page meta description with ledger name",
  },
  "seo.ledgerCommits.title": {
    message: "提交记录 - {ledgerName}",
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
      "查看和管理你的所有Beancount账本。创建新账本、访问现有账本并整理你的财务记录。",
    description: "Ledger dashboard page meta description",
  },
  "seo.ledgerDashboard.title": {
    message: "我的账本",
    description: "Ledger dashboard page title",
  },
  "seo.ledgerDocuments.description": {
    message: "{ledgerName}的文档附件和收据。整理交易的支持文件。",
    description: "Documents page meta description",
  },
  "seo.ledgerDocuments.title": {
    message: "文档 - {ledgerName}",
    description: "Documents page title with ledger name",
  },
  "seo.ledgerErrors.description": {
    message: "{ledgerName}的验证错误和警告。审查并修复账本中的问题。",
    description: "Errors page meta description",
  },
  "seo.ledgerErrors.title": {
    message: "错误 - {ledgerName}",
    description: "Errors page title with ledger name",
  },
  "seo.ledgerEvents.description": {
    message: "{ledgerName}的事件时间线。跟踪重要的财务事件和里程碑。",
    description: "Events page meta description",
  },
  "seo.ledgerEvents.title": {
    message: "事件 - {ledgerName}",
    description: "Events page title with ledger name",
  },
  "seo.ledgerFiles.description": {
    message: "浏览{ledgerName}的 Beancount 会计文件。",
    description: "Ledger file browser meta description",
  },
  "seo.ledgerFiles.title": {
    message: "文件 - {ledgerName}",
    description: "File editor page title with ledger name",
  },
  "seo.ledgerFilesCreate.description": {
    message: "在{ledgerName}中创建新文件。添加账户、交易或其他Beancount条目。",
    description: "Create file page meta description",
  },
  "seo.ledgerFilesCreate.title": {
    message: "创建文件 - {ledgerName}",
    description: "Create file page title with ledger name",
  },
  "seo.ledgerFilesUpload.description": {
    message: "上传文件到{ledgerName}。导入现有的Beancount文件或文档。",
    description: "Upload files page meta description",
  },
  "seo.ledgerFilesUpload.title": {
    message: "上传文件 - {ledgerName}",
    description: "Upload files page title with ledger name",
  },
  "seo.ledgerGallery.description": {
    message:
      "浏览公开的Beancount账本示例和模板。为你自己的财务跟踪设置寻找灵感。",
    description: "Ledger gallery page meta description",
  },
  "seo.ledgerGallery.title": {
    message: "账本画廊",
    description: "Ledger gallery page title",
  },
  "seo.ledgerHoldings.description": {
    message: "{ledgerName}的投资持仓和投资组合。查看当前头寸和估值。",
    description: "Holdings page meta description",
  },
  "seo.ledgerHoldings.title": {
    message: "持仓 - {ledgerName}",
    description: "Holdings page title with ledger name",
  },
  "seo.ledgerImport.description": {
    message:
      "从 CSV、PDF、OFX 或图像文件导入交易到 {ledgerName}。AI 驱动的银行对账单和收据解析。",
    description: "Import page meta description",
  },
  "seo.ledgerImport.title": {
    message: "智能导入 - {ledgerName}",
    description: "Import page title with ledger name",
  },
  "seo.ledgerIncomeStatement.description": {
    message: "{ledgerName}的损益表报告。跟踪收入、支出和净收益随时间的变化。",
    description: "Income statement page meta description",
  },
  "seo.ledgerIncomeStatement.title": {
    message: "损益表 - {ledgerName}",
    description: "Income statement page title with ledger name",
  },
  "seo.ledgerJournal.description": {
    message: "{ledgerName}的交易流水账。查看、搜索和筛选你的所有会计分录。",
    description: "Journal page meta description",
  },
  "seo.ledgerJournal.title": {
    message: "流水账 - {ledgerName}",
    description: "Journal page title with ledger name",
  },
  "seo.ledgerOverview.description": {
    message: "{ledgerName}的财务概览和报告。查看净资产、收入、支出和资产分布。",
    description: "Ledger overview page meta description",
  },
  "seo.ledgerOverview.title": {
    message: "概览 - {ledgerName}",
    description: "Ledger overview page title with ledger name",
  },
  "seo.ledgerPullRequest.description": {
    message: "审核{ledgerName}的合并请求变更。批准或拒绝账本的修改提案。",
    description: "Pull request page meta description",
  },
  "seo.ledgerPullRequest.title": {
    message: "合并请求 #{prNumber} - {ledgerName}",
    description: "Pull request page title with PR number and ledger name",
  },
  "seo.plaidSettings.description": {
    message:
      "使用 Plaid 将银行账户连接到 {ledgerName}。自动导入交易并同步财务数据。",
    description: "Plaid settings page meta description",
  },
  "seo.plaidSettings.title": {
    message: "已连接账户 - {ledgerName}",
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
    message: "使用BQL语法查询{ledgerName}。运行自定义查询并分析你的财务数据。",
    description: "BQL query page meta description",
  },
  "seo.ledgerQuery.title": {
    message: "BQL查询 - {ledgerName}",
    description: "BQL query page title with ledger name",
  },
  "seo.ledgerSettings.description": {
    message: "配置{ledgerName}的账本设置。管理账本偏好、访问权限和选项。",
    description: "Ledger settings page meta description",
  },
  "seo.ledgerSettings.title": {
    message: "账本设置 - {ledgerName}",
    description: "Ledger settings page title with ledger name",
  },
  "seo.ledgerStatistics.description": {
    message: "{ledgerName}的统计分析。查看财务数据的指标、趋势和见解。",
    description: "Statistics page meta description",
  },
  "seo.ledgerStatistics.title": {
    message: "统计 - {ledgerName}",
    description: "Statistics page title with ledger name",
  },
  "seo.ledgerTrialBalance.description": {
    message: "{ledgerName}的试算平衡表报告。验证账户中借方和贷方的相等性。",
    description: "Trial balance page meta description",
  },
  "seo.ledgerTrialBalance.title": {
    message: "试算平衡表 - {ledgerName}",
    description: "Trial balance page title with ledger name",
  },
  "seo.login.description": {
    message:
      "登录 Beancount.io — 开源、基于 Git 的纯文本记账系统。轻松管理账本、批量导入银行流水，并保持每一笔账目都清晰可审计、安全可靠且易于版本控制。",
    description: "Login page meta description",
  },
  "seo.login.title": {
    message: "登录 Beancount — 免费开源纯文本记账系统，基于 Git 版本控制",
    description: "Login page title",
  },
  "seo.logout.description": {
    message: "正在退出你的Beancount账户。",
    description: "Logout page meta description",
  },
  "seo.logout.title": {
    message: "退出登录",
    description: "Logout page title",
  },
  "seo.notFound.description": {
    message: "你要查找的页面不存在。它可能已被移动或删除。",
    description: "404 page meta description",
  },
  "seo.notFound.title": {
    message: "找不到页面",
    description: "404 page title",
  },
  "seo.resetPassword.description": {
    message: "为你的Beancount账户创建新密码。",
    description: "Reset password page meta description",
  },
  "seo.resetPassword.title": {
    message: "重置密码",
    description: "Reset password page title",
  },
  "seo.settingsGeneral.description": {
    message: "更新你的个人资料信息、语言偏好和常规账户设置。",
    description: "General settings page meta description",
  },
  "seo.settingsGeneral.title": {
    message: "常规设置",
    description: "General settings page title",
  },
  "seo.settingsSshKeys.description": {
    message: "管理SSH密钥以通过Git安全访问你的Beancount账本。",
    description: "SSH keys settings page meta description",
  },
  "seo.settingsSshKeys.title": {
    message: "SSH密钥",
    description: "SSH keys settings page title",
  },
  "seo.settingsDangerZone.title": {
    message: "危险区域",
    description: "Danger zone settings page title",
  },
  "seo.settingsDangerZone.description": {
    message: "管理危险的账户操作，如永久删除你的账户和所有数据。",
    description: "Danger zone settings page meta description",
  },
  "seo.signUp.description": {
    message:
      "创建免费的 Beancount.io 账户。使用纯文本账本、Fava 财务报表、银行流水导入和 Git 版本控制来全面跟踪个人与家庭财务 — 无任何锁定，随时可导出与备份。",
    description: "Sign up page meta description",
  },
  "seo.signUp.title": {
    message: "创建免费 Beancount 账户 — 基于 Git 的纯文本记账",
    description: "Sign up page title",
  },
  "seo.signUpOtp.description": {
    message: "验证你的邮箱地址以完成Beancount账户注册。",
    description: "OTP verification page meta description",
  },
  "seo.signUpOtp.title": {
    message: "验证邮箱",
    description: "OTP verification page title",
  },
  "seo.welcome.description": {
    message: "欢迎来到Beancount！开始使用纯文本记账和财务管理。",
    description: "Welcome page meta description",
  },
  "seo.welcome.title": {
    message: "欢迎",
    description: "Welcome page title",
  },
};

export default zhSeo;
