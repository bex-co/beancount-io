const koCreateFile: Record<string, { message: string; description: string }> = {
  "ledgerEditor.nameYourFile": {
    message: "파일 이름 입력...",
    description: "Placeholder for file name input",
  },
  "ledgerEditor.invalidFilePath": {
    message: ". 또는 .. 세그먼트 없는 유효한 파일 경로를 입력하세요",
    description: "Validation error for unsafe create-file paths",
  },
  "ledgerEditor.fileAlreadyExists": {
    message: "같은 이름의 파일이 이미 있습니다",
    description: "Validation error when create-file name collides",
  },
};

export default koCreateFile;
