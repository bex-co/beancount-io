const faUploadFiles: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.addFilesViaUpload": {
      message: "افزودن فایل‌ها از طریق بارگذاری",
      description: "Placeholder for commit message when uploading files",
    },
    "ledgerEditor.chooseYourFiles": {
      message: "انتخاب فایل‌ها",
      description: "Button label to choose files for upload",
    },
    "ledgerEditor.commitMessage": {
      message: "نظر بارگذاری (اختیاری)",
      description: "Label for upload comment field when uploading files",
    },
    "ledgerEditor.dragFilesHere": {
      message: "فایل‌ها را اینجا بکشید تا به مخزن شما اضافه شوند",
      description: "Instruction text in drag and drop upload area",
    },
    "ledgerEditor.exceedsFileSizeLimit": {
      message: "از حد 1MB تجاوز می‌کند",
      description: "Warning message when file size exceeds the maximum limit",
    },
    "ledgerEditor.failedToUploadFiles": {
      message: "بارگذاری فایل‌ها ناموفق بود",
      description: "Error message when file upload fails",
    },
    "ledgerEditor.maximumFileSize": {
      message: "حداکثر اندازه فایل: 1MB",
      description: "Maximum file size limit text in upload area",
    },
    "ledgerEditor.or": {
      message: "یا",
      description:
        "Conjunction word between drag and drop and file picker options",
    },
    "ledgerEditor.selectedFiles": {
      message: "فایل‌های انتخاب شده ({count})",
      description:
        "Label for selected files list (contains {count} placeholder)",
    },
    "ledgerEditor.uploading": {
      message: "در حال بارگذاری...",
      description: "Message shown during file upload",
    },
  };

export default faUploadFiles;
