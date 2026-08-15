import type { TranslationEntry } from "@/i18n";

const faCommits: Record<string, TranslationEntry> = {
  "commits.versionHistory": {
    message: "تاریخچه نسخه‌ها",
    description: "Navigation menu item for version history/commits",
  },
  "commits.listTitle": {
    message: "کامیت‌ها",
    description: "Title for commits list page",
  },
  "commits.detailTitle": {
    message: "جزئیات کامیت",
    description: "Title for commit detail page",
  },
  "commits.filesChanged": {
    message: "فایل‌های تغییر یافته",
    description: "Label for number of files changed in commit",
  },
  "commits.changes": {
    message: "تغییرات",
    description: "Heading for commit changes/diff section",
  },
  "commits.noChanges": {
    message: "تغییری برای نمایش وجود ندارد",
    description: "Empty state when a commit has no diff content",
  },
  "commits.diffParseError": {
    message: "تفاوت قابل پردازش نیست. ممکن است ناقص باشد.",
    description: "Error shown when commit diff content cannot be parsed",
  },
  "commits.loadLargeDiff": {
    message: "بارگذاری تفاوت بزرگ",
    description: "Button to load and display large commit diff (1000+ lines)",
  },
  "commits.noCommits": {
    message: "کامیتی یافت نشد",
    description: "Empty state for commits list",
  },
  "commits.notFound": {
    message: "کامیت یافت نشد",
    description: "Error message when commit doesn't exist",
  },
  "commits.selectCommitToView": {
    message: "یک کامیت را انتخاب کنید تا جزئیات را مشاهده کنید",
    description: "Placeholder text shown when no commit is selected",
  },
  "commits.loadingDiff": {
    message: "در حال بارگذاری تفاوت...",
    description: "Loading state text when loading large diff",
  },
  "commits.largeDiffWarning": {
    message:
      "هشدار: این تفاوت بسیار بزرگ است ({totalLines} خط). برجسته‌سازی نحوی برای عملکرد غیرفعال خواهد شد.",
    description: "Warning message for very large diffs (10000+ lines)",
  },
  "commits.file": {
    message: "فایل",
    description: "Singular form of file count",
  },
  "commits.files": {
    message: "فایل‌ها",
    description: "Plural form of file count",
  },
  "commits.additions": {
    message: "+{count}",
    description: "Label showing number of lines added",
  },
  "commits.deletions": {
    message: "-{count}",
    description: "Label showing number of lines deleted",
  },
};

export default faCommits;
