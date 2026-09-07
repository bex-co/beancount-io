const TEXT_EXTENSIONS = new Set([
  "txt",
  "text",
  "md",
  "markdown",
  "rst",
  "csv",
  "tsv",
  "ledger",
  "journal",
  "qif",
  "ofx",
  "qfx",
  "json",
  "jsonc",
  "jsonl",
  "yaml",
  "yml",
  "toml",
  "ini",
  "cfg",
  "conf",
  "config",
  "xml",
  "html",
  "htm",
  "css",
  "scss",
  "svg",
  "py",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "sh",
  "bash",
  "zsh",
  "sql",
  "log",
  "env",
  "gitignore",
  "gitattributes",
  "editorconfig",
]);

const TEXT_FILENAMES = new Set([
  "readme",
  "license",
  "licence",
  "changelog",
  "authors",
  "notice",
  "makefile",
  "dockerfile",
  ".env.example",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
]);

export function isBeancountFile(path: string): boolean {
  return /\.(bean|beancount)$/i.test(path);
}

export function isEditableTextFile(path: string): boolean {
  const filename = path.split("/").pop()?.toLowerCase() ?? "";
  const extension = filename.slice(filename.lastIndexOf(".") + 1);
  return (
    isBeancountFile(filename) ||
    TEXT_FILENAMES.has(filename) ||
    (filename.includes(".") && TEXT_EXTENSIONS.has(extension))
  );
}
