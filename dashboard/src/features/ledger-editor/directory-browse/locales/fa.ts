const faDirectoryBrowse: Record<
  string,
  { message: string; description: string }
> = {
  "ledgerEditor.cloneRepository": {
    message: "کپی مخزن",
    description: "Header for clone repository dialog",
  },
  "ledgerEditor.downloadZip": {
    message: "دانلود ZIP",
    description: "Menu item to download as ZIP",
  },
  "ledgerEditor.downloadZipBlocked": {
    message:
      "مرورگر شما دانلود را مسدود کرد. برای شروع آن از پیوند زیر استفاده کنید.",
    description:
      "Shown when the browser blocks the automatic ZIP download popup",
  },
  "ledgerEditor.downloadZipFailed": {
    message: "آماده‌سازی دانلود ممکن نشد. لطفاً دوباره تلاش کنید.",
    description: "Error shown when preparing the ZIP download fails",
  },
  "ledgerEditor.manageSshKeys": {
    message: "مدیریت کلیدهای SSH",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "این پوشه خالی است",
    description: "Message shown when directory has no contents",
  },
  "ledgerEditor.copyHttpCloneUrl": {
    message: "کپی نشانی کلون HTTP",
    description: "Accessible name for copying the HTTP clone URL",
  },
  "ledgerEditor.httpsBeaHint": {
    message:
      "با خط فرمان bea یک بار {command} را اجرا کنید تا Git به\u200cجای شما وارد شود. بدون آن:",
    description:
      "Above the username and password hint under the HTTPS clone URL, on a self-hosted server only: the bea CLI command that makes Git sign in by itself. {command} is the literal command `bea cloud git setup`",
  },
  "ledgerEditor.httpsCredentialHint": {
    message:
      "نام کاربری: هر چیزی. گذرواژه: یک توکن دسترسی شخصی، نه گذرواژه حساب شما.",
    description:
      "Under the HTTPS clone URL: what to type when git asks for a username and password",
  },
  "ledgerEditor.createAccessToken": {
    message: "ایجاد توکن دسترسی شخصی",
    description:
      "Link from the HTTPS clone option to the personal access token settings page",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "کپی نشانی کلون SSH",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default faDirectoryBrowse;
