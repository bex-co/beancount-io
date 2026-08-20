export interface TranslationEntry {
  message: string;
  description: string;
}

const zhAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "询问 Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "询问我关于 Beancount 的任何问题...",
    description: "Input placeholder text",
  },
  "aiAgent.welcome": {
    message:
      "你好！我是你的 Beancount AI 助手，帮助你进行纯文本记账。\n\n" +
      "我可以：\n" +
      "• 解释 Beancount 语法并调试错误\n" +
      "• 指导你编写交易、账户和指令\n" +
      "• 回答会计和记账问题\n" +
      "• 帮助你进行查询、报表和最佳实践\n\n" +
      "你想知道什么？",
    description: "Welcome message shown when chat loads",
  },
  "aiAgent.prCreated": {
    message: "✓ Pull Request 已创建",
    description: "Message shown when PR is created",
  },
  "aiAgent.viewPR": {
    message: "查看 PR #",
    description: "Link text to view pull request",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "问我关于此账本的任何问题...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "询问",
    description: "Button text to submit quick question",
  },
  "aiAgent.limitReached": {
    message:
      "You've reached your monthly AI token limit ({max} tokens). Please upgrade your plan for more AI tokens, or wait until next month.",
    description: "Message when user hits AI CFO monthly limit",
  },
  "aiAgent.serviceUnavailable": {
    message:
      "The AI service is temporarily unavailable. Please try again in a few minutes.",
    description:
      "Message when AI CFO service is down or usage check fails (503)",
  },
  "aiAgent.upgradeTitle": {
    message: "AI 请求即将用完",
    description: "Title for upgrade panel when near AI usage cap",
  },
  "aiAgent.upgradeDescription": {
    message: "本月已使用 {used}/{max} 次请求。升级以获取更多。",
    description: "Description for upgrade panel showing usage",
  },
  "aiAgent.upgradeCta": {
    message: "升级",
    description: "Button text to upgrade plan",
  },
  "aiAgent.premiumTier": {
    message: "Premium",
    description: "Premium tier name",
  },
  "aiAgent.growthTier": {
    message: "Growth",
    description: "Growth tier name",
  },
  "aiAgent.organizationTier": {
    message: "Organization",
    description: "Organization tier name",
  },
  "aiAgent.perMonth": {
    message: "/月",
    description: "Per month pricing suffix",
  },
  "aiAgent.tokensPerMonth": {
    message: "每月 {count} 个令牌",
    description: "Number of AI tokens included in a tier",
  },
  "aiAgent.popular": {
    message: "热门",
    description: "Badge label for the most popular tier",
  },
  "aiAgent.editApproval.title": {
    message: "Edit Request",
    description: "Title for the file edit approval card",
  },
  "aiAgent.editApproval.approve": {
    message: "Approve",
    description: "Button to approve an AI file edit",
  },
  "aiAgent.editApproval.deny": {
    message: "Deny",
    description: "Button to deny an AI file edit",
  },
  "aiAgent.editApproval.approved": {
    message: "Approved",
    description: "Badge shown after user approved the edit",
  },
  "aiAgent.editApproval.denied": {
    message: "Denied",
    description: "Badge shown after user denied the edit",
  },
  "aiAgent.editApproval.newFile": {
    message: "New file",
    description: "Label in diff block when creating a new file",
  },
  "aiAgent.editApproval.replaceFile": {
    message: "Replace file",
    description: "Label in diff block when replacing an entire file",
  },
  "aiAgent.editApproval.deleteFile": {
    message: "Delete file",
    description: "Label in diff block when deleting a file",
  },
  "aiAgent.suggestionsTitle": {
    message: "试试提问：",
    description:
      "Heading above suggested example questions in the empty chat state",
  },
  "aiAgent.suggestions.diningLastMonth": {
    message: "我上个月在餐饮上花了多少钱？",
    description: "Suggested question: dining spend last month",
  },
  "aiAgent.suggestions.netWorth": {
    message: "我目前的净资产是多少？",
    description: "Suggested question: current net worth",
  },
  "aiAgent.suggestions.topCategories": {
    message: "显示我今年支出最多的 5 个类别",
    description: "Suggested question: top 5 expense categories this year",
  },
  "aiAgent.suggestions.uncategorized": {
    message: "有没有我还没分类的交易？",
    description: "Suggested question: uncategorized transactions",
  },
  "aiAgent.suggestions.monthOverMonth": {
    message: "比较这个月和上个月的支出",
    description: "Suggested question: compare this month to last month",
  },
  "aiAgent.suggestions.largestExpense": {
    message: "本季度我最大的一笔支出是什么？",
    description: "Suggested question: largest single expense this quarter",
  },
  "aiAgent.stop": {
    message: "停止",
    description: "Button to stop an in-flight AI response",
  },
  "aiAgent.stopped": {
    message: "已停止",
    description: "Label shown on an AI response the user stopped",
  },
  "aiAgent.answeredIn": {
    message: "用时 {duration}",
    description:
      "Shown under a completed AI answer; {duration} is a formatted elapsed time like 12.3s or 1m 5s",
  },
  "aiAgent.retry": {
    message: "重试",
    description: "Button to resubmit the last question after an error",
  },
  "aiAgent.receiptApproval.title": {
    message: "记录收据交易",
    description: "Title of the receipt transaction approval card",
  },
  "aiAgent.receiptApproval.preparing": {
    message: "正在准备交易…",
    description: "Status while the receipt transaction is being prepared",
  },
  "aiAgent.receiptApproval.recorded": {
    message: "交易已记录",
    description: "Status after the receipt transaction was recorded",
  },
  "aiAgent.receiptApproval.failed": {
    message: "记录交易失败",
    description: "Error when recording the receipt transaction failed",
  },
  "aiAgent.receiptApproval.date": {
    message: "日期",
    description: "Label for the receipt transaction date",
  },
  "aiAgent.receiptApproval.payee": {
    message: "收款方",
    description: "Label for the receipt transaction payee",
  },
  "aiAgent.receiptApproval.amount": {
    message: "金额",
    description: "Label for the receipt transaction amount",
  },
  "aiAgent.receiptApproval.expense": {
    message: "支出",
    description: "Label for the receipt expense account",
  },
  "aiAgent.receiptApproval.payment": {
    message: "付款",
    description: "Label for the receipt payment account",
  },
  "aiAgent.attachFile": {
    message: "附加文件",
    description: "Aria label for the attach file button in the chat input",
  },
  "aiAgent.removeAttachment": {
    message: "移除 {fileName}",
    description:
      "Aria label for removing a staged attachment; {fileName} is the attachment file name",
  },
  "aiAgent.attachmentFailed": {
    message: "失败",
    description: "Chip label when an attachment failed to upload",
  },
  "aiAgent.scrollToBottom": {
    message: "滚动到底部",
    description: "Aria label for the scroll to bottom button in the chat",
  },
};

export default zhAiAgent;
