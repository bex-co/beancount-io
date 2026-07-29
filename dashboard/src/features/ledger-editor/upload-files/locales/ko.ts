const koUploadFiles: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.addFilesViaUpload": {
      message: "업로드로 파일 추가",
      description: "Placeholder for commit message when uploading files",
    },
    "ledgerEditor.chooseYourFiles": {
      message: "파일 선택",
      description: "Button label to choose files for upload",
    },
    "ledgerEditor.commitMessage": {
      message: "업로드 코멘트 (선택사항)",
      description: "Label for upload comment field when uploading files",
    },
    "ledgerEditor.dragFilesHere": {
      message: "파일을 여기에 드래그하여 저장소에 추가",
      description: "Instruction text in drag and drop upload area",
    },
    "ledgerEditor.exceedsFileSizeLimit": {
      message: "1MB 제한 초과",
      description: "Warning message when file size exceeds the maximum limit",
    },
    "ledgerEditor.failedToUploadFiles": {
      message: "파일 업로드 실패",
      description: "Error message when file upload fails",
    },
    "ledgerEditor.maximumFileSize": {
      message: "최대 파일 크기: 1MB",
      description: "Maximum file size limit text in upload area",
    },
    "ledgerEditor.or": {
      message: "또는",
      description:
        "Conjunction word between drag and drop and file picker options",
    },
    "ledgerEditor.selectedFiles": {
      message: "선택된 파일 ({count}개)",
      description:
        "Label for selected files list (contains {count} placeholder)",
    },
    "ledgerEditor.uploading": {
      message: "업로드 중...",
      description: "Message shown during file upload",
    },
  };

export default koUploadFiles;
