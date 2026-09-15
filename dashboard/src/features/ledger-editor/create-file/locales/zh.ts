const zhCreateFile: Record<string, { message: string; description: string }> = {
  "ledgerEditor.nameYourFile": {
    message: "命名你的文件...",
    description: "Placeholder for file name input",
  },
  "ledgerEditor.invalidFilePath": {
    message: "请输入有效的文件路径，不能包含 . 或 .. 段",
    description: "Validation error for unsafe create-file paths",
  },
  "ledgerEditor.fileAlreadyExists": {
    message: "已存在同名文件",
    description: "Validation error when create-file name collides",
  },
};

export default zhCreateFile;
