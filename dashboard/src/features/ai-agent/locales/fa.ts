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
  "aiAgent.readOnlyTitle": {
    message: "دستیار فقط‌خواندنی",
    description: "Title of the agent permission notice",
  },
  "aiAgent.readOnlyDescription": {
    message:
      "می‌توانید سؤال بپرسید و فایل‌ها را تحلیل کنید. تغییرات به دسترسی نوشتن نیاز دارند، اما می‌توانم آن‌ها را برایتان آماده کنم.",
    description: "Explanation shown when the agent cannot change the ledger",
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
  "aiAgent.quickAskPlaceholder": {
    message: "هر چیزی در مورد این دفتر کل بپرسید...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "بپرس",
    description: "Button text to submit quick question",
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
  "aiAgent.attachment": {
    message: "پیوست",
    description: "Fallback filename for an attachment",
  },
  "aiAgent.preparing": {
    message: "آماده سازی…",
    description: "Status while an AI tool is preparing",
  },
  "aiAgent.toolFailed": {
    message: "{tool} ناموفق بود",
    description: "Fallback error when an AI tool fails",
  },
  "aiAgent.toolList": {
    message: "فهرست",
    description: "Label for the list-files AI tool",
  },
  "aiAgent.toolRead": {
    message: "بخوانید",
    description: "Label for the read-file AI tool",
  },
  "aiAgent.checkingLedgerContext": {
    message: "بررسی زمینه دفتر کل",
    description: "Status while AI tools inspect a ledger",
  },
  "aiAgent.checkedFiles": {
    message: "فایل(های) {count} بررسی شد",
    description: "Summary of files inspected by AI tools",
  },
  "aiAgent.ranQueries": {
    message: "پرس و جو یا جستارهای {count} را اجرا کرد",
    description: "Summary of queries run by AI tools",
  },
  "aiAgent.usedTools": {
    message: "ابزار(های) {count} استفاده شده",
    description: "Summary of tools used by the AI",
  },
  "aiAgent.unknownBlock": {
    message: "بلوک ناشناخته",
    description: "Fallback label for an unsupported AI message block",
  },
  "aiAgent.editApproval.preparingChanges": {
    message: "در حال آماده سازی تغییرات…",
    description: "Status while AI file changes are prepared",
  },
  "aiAgent.editApproval.appliedOperations": {
    message: "عملیات (های) {count} اعمال شد",
    description: "Success status for applied AI file operations",
  },
  "aiAgent.editApproval.failed": {
    message: "ویرایش انجام نشد",
    description: "Fallback error for a failed AI file edit",
  },
};

export default faAiAgent;
