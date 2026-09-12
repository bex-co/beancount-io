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
  "ledgerEditor.copySshCloneUrl": {
    message: "کپی نشانی کلون SSH",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default faDirectoryBrowse;
