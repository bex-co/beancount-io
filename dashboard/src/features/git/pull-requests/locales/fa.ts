export interface TranslationEntry {
  message: string;
  description: string;
}

const faPullRequests: Record<string, TranslationEntry> = {
  "pullRequests.reviewPR": {
    message: "بررسی درخواست ادغام",
    description: "Page title for PR review page",
  },
  "pullRequests.createPR": {
    message: "ایجاد درخواست ادغام",
    description: "Page title for create PR page",
  },
  "pullRequests.approve": {
    message: "تایید و ادغام",
    description: "Button text to approve and merge PR",
  },
  "pullRequests.reject": {
    message: "رد و بستن",
    description: "Button text to reject and close PR",
  },
  "pullRequests.approveSuccess": {
    message: "درخواست ادغام با موفقیت تایید و ادغام شد",
    description: "Success message after approving PR",
  },
  "pullRequests.approveError": {
    message: "خطا در تایید درخواست ادغام",
    description: "Error message when PR approval fails",
  },
  "pullRequests.rejectSuccess": {
    message: "درخواست ادغام با موفقیت بسته شد",
    description: "Success message after rejecting PR",
  },
  "pullRequests.rejectError": {
    message: "خطا در بستن درخواست ادغام",
    description: "Error message when PR rejection fails",
  },
  "pullRequests.changes": {
    message: "تغییرات",
    description: "Label for diff viewer section",
  },
  "pullRequests.filesChanged": {
    message: "فایل‌های تغییر یافته",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "درخواست ادغام یافت نشد",
    description: "Error message when PR doesn't exist",
  },
  "pullRequests.loadingPR": {
    message: "بارگذاری جزئیات درخواست ادغام...",
    description: "Loading message while fetching PR",
  },
};

export default faPullRequests;
