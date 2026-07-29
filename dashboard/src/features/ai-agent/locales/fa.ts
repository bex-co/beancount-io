export interface TranslationEntry {
  message: string;
  description: string;
}

const faAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "از Beancount.io بپرسید",
    description: "Title for AI chat feature",
  },
  "aiAgent.subtitle": {
    message: "کمک هوش مصنوعی برای دفتر کل شما",
    description: "Subtitle for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "هر سوالی درباره Beancount بپرسید...",
    description: "Input placeholder text",
  },
  "aiAgent.send": {
    message: "ارسال",
    description: "Send button text",
  },
  "aiAgent.sending": {
    message: "در حال ارسال...",
    description: "Loading state text",
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
  "aiAgent.you": {
    message: "شما",
    description: "Label for user messages",
  },
  "aiAgent.assistant": {
    message: "دستیار هوش مصنوعی",
    description: "Label for AI assistant messages",
  },
  "aiAgent.prCreated": {
    message: "✓ Pull Request ایجاد شد",
    description: "Message shown when PR is created",
  },
  "aiAgent.viewPR": {
    message: "مشاهده PR #",
    description: "Link text to view pull request",
  },
  "aiAgent.status.connecting": {
    message: "در حال فکر کردن...",
    description: "Status badge text when connecting to AI",
  },
  "aiAgent.status.streaming": {
    message: "در حال جریان...",
    description: "Status badge text when receiving AI response",
  },
  "aiAgent.status.finalizing": {
    message: "در حال نهایی سازی...",
    description: "Status badge text when finalizing AI response",
  },
  "aiAgent.status.complete": {
    message: "تکمیل شد",
    description: "Status badge text when AI response is complete",
  },
  "aiAgent.status.error": {
    message: "خطا",
    description: "Status badge text when an error occurs",
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
  "aiAgent.editApproval.binaryContent": {
    message: "(binary content)",
    description:
      "Placeholder shown when file content is binary (image, PDF, etc.)",
  },
  "aiAgent.readFile.label": {
    message: "Read",
    description: "Label on the read-file tool step",
  },
  "aiAgent.listFiles.label": {
    message: "List",
    description: "Label on the list-files tool step",
  },
};

export default faAiAgent;
