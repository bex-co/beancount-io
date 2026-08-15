export interface TranslationEntry {
  message: string;
  description: string;
}

const faAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "از Beancount.io بپرسید",
    description: "Title for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "هر سوالی درباره Beancount بپرسید...",
    description: "Input placeholder text",
  },
  "aiAgent.welcome": {
    message:
      "سلام! من دستیار هوش مصنوعی Beancount شما هستم، اینجا برای کمک به حسابداری متنی ساده شما.\n\n" +
      "می‌توانم:\n" +
      "• نحو Beancount را توضیح دهم و خطاها را رفع کنم\n" +
      "• شما را در نوشتن تراکنش‌ها، حساب‌ها و دستورالعمل‌ها راهنمایی کنم\n" +
      "• به سوالات حسابداری و دفترداری پاسخ دهم\n" +
      "• با پرس‌وجوها، گزارش‌ها و بهترین شیوه‌ها کمک کنم\n\n" +
      "چه چیزی می‌خواهید بدانید؟",
    description: "Welcome message shown when chat loads",
  },
  "aiAgent.prCreated": {
    message: "✓ Pull Request ایجاد شد",
    description: "Message shown when PR is created",
  },
  "aiAgent.viewPR": {
    message: "مشاهده PR #",
    description: "Link text to view pull request",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "هر چیزی در مورد این دفتر کل بپرسید...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "بپرس",
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
    message: "درخواست‌های هوش مصنوعی رو به اتمام است",
    description: "Title for upgrade panel when near AI usage cap",
  },
  "aiAgent.upgradeDescription": {
    message:
      "شما {used} از {max} درخواست را در این ماه استفاده کرده‌اید. برای بیشتر ارتقا دهید.",
    description: "Description for upgrade panel showing usage",
  },
  "aiAgent.upgradeCta": {
    message: "ارتقا",
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
    message: "/ماه",
    description: "Per month pricing suffix",
  },
  "aiAgent.tokensPerMonth": {
    message: "{count} tokens / ماه",
    description: "Number of AI tokens included in a tier",
  },
  "aiAgent.popular": {
    message: "محبوب",
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
    message: "امتحان کنید:",
    description:
      "Heading above suggested example questions in the empty chat state",
  },
  "aiAgent.suggestions.diningLastMonth": {
    message: "ماه گذشته چقدر برای غذا خرج کردم؟",
    description: "Suggested question: dining spend last month",
  },
  "aiAgent.suggestions.netWorth": {
    message: "خالص دارایی فعلی من چقدر است؟",
    description: "Suggested question: current net worth",
  },
  "aiAgent.suggestions.topCategories": {
    message: "۵ دسته‌ی بزرگ هزینه‌های امسال من را نشان بده",
    description: "Suggested question: top 5 expense categories this year",
  },
  "aiAgent.suggestions.uncategorized": {
    message: "تراکنش دسته‌بندی‌نشده‌ای دارم؟",
    description: "Suggested question: uncategorized transactions",
  },
  "aiAgent.suggestions.monthOverMonth": {
    message: "هزینه‌های این ماه را با ماه گذشته مقایسه کن",
    description: "Suggested question: compare this month to last month",
  },
  "aiAgent.suggestions.largestExpense": {
    message: "بزرگ‌ترین هزینه‌ی من در این فصل چیست؟",
    description: "Suggested question: largest single expense this quarter",
  },
  "aiAgent.stop": {
    message: "توقف",
    description: "Button to stop an in-flight AI response",
  },
  "aiAgent.stopped": {
    message: "متوقف شد",
    description: "Label shown on an AI response the user stopped",
  },
  "aiAgent.retry": {
    message: "تلاش مجدد",
    description: "Button to resubmit the last question after an error",
  },
  "aiAgent.receiptApproval.title": {
    message: "ثبت تراکنش رسید",
    description: "Title of the receipt transaction approval card",
  },
  "aiAgent.receiptApproval.preparing": {
    message: "در حال آماده‌سازی تراکنش…",
    description: "Status while the receipt transaction is being prepared",
  },
  "aiAgent.receiptApproval.recorded": {
    message: "تراکنش ثبت شد",
    description: "Status after the receipt transaction was recorded",
  },
  "aiAgent.receiptApproval.failed": {
    message: "ثبت تراکنش ناموفق بود",
    description: "Error when recording the receipt transaction failed",
  },
  "aiAgent.receiptApproval.date": {
    message: "تاریخ",
    description: "Label for the receipt transaction date",
  },
  "aiAgent.receiptApproval.payee": {
    message: "دریافت‌کننده",
    description: "Label for the receipt transaction payee",
  },
  "aiAgent.receiptApproval.amount": {
    message: "مبلغ",
    description: "Label for the receipt transaction amount",
  },
  "aiAgent.receiptApproval.expense": {
    message: "هزینه",
    description: "Label for the receipt expense account",
  },
  "aiAgent.receiptApproval.payment": {
    message: "پرداخت",
    description: "Label for the receipt payment account",
  },
  "aiAgent.attachFile": {
    message: "پیوست فایل",
    description: "Aria label for the attach file button in the chat input",
  },
  "aiAgent.removeAttachment": {
    message: "حذف {fileName}",
    description:
      "Aria label for removing a staged attachment; {fileName} is the attachment file name",
  },
  "aiAgent.attachmentFailed": {
    message: "ناموفق",
    description: "Chip label when an attachment failed to upload",
  },
  "aiAgent.scrollToBottom": {
    message: "پیمایش به پایین",
    description: "Aria label for the scroll to bottom button in the chat",
  },
};

export default faAiAgent;
