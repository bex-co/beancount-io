const faCreateFile: Record<string, { message: string; description: string }> = {
  "ledgerEditor.nameYourFile": {
    message: "نام فایل را وارد کنید...",
    description: "Placeholder for file name input",
  },
  "ledgerEditor.invalidFilePath": {
    message: "یک مسیر فایل معتبر بدون بخش\u200cهای . یا .. وارد کنید",
    description: "Validation error for unsafe create-file paths",
  },
  "ledgerEditor.fileAlreadyExists": {
    message: "فایلی با این نام از قبل وجود دارد",
    description: "Validation error when create-file name collides",
  },
};

export default faCreateFile;
