import type { TranslationEntry } from "@/i18n";

const bgCommits: Record<string, TranslationEntry> = {
  "commits.versionHistory": {
    message: "История на версиите",
    description: "Navigation menu item for version history/commits",
  },
  "commits.listTitle": {
    message: "Къмити",
    description: "Title for commits list page",
  },
  "commits.detailTitle": {
    message: "Детайли за къмита",
    description: "Title for commit detail page",
  },
  "commits.filesChanged": {
    message: "променени файлове",
    description: "Label for number of files changed in commit",
  },
  "commits.changes": {
    message: "Промени",
    description: "Heading for commit changes/diff section",
  },
  "commits.noChanges": {
    message: "Няма промени за показване",
    description: "Empty state when a commit has no diff content",
  },
  "commits.renamedWithoutChanges": {
    message: "Файлът е преименуван без промени",
    description:
      "Body of a diff file section for a file that was renamed with no content changes",
  },
  "commits.noLineChanges": {
    message: "Няма промени в редовете за показване",
    description:
      "Body of a diff file section with no text changes, such as a file-mode or binary change",
  },
  "commits.diffParseError": {
    message: "Разликата не можа да бъде прочетена. Възможно е да е повредена.",
    description: "Error shown when commit diff content cannot be parsed",
  },
  "commits.loadLargeDiff": {
    message: "Зареди голяма разлика",
    description: "Button to load and display large commit diff (1000+ lines)",
  },
  "commits.loadOlder": {
    message: "Зареди по-стари къмити",
    description: "Button to load the next page of older commits",
  },
  "commits.selectedOutsideHistory": {
    message: "Избраният къмит е извън заредената история.",
    description:
      "Notice when the selected commit is absent from loaded history",
  },
  "commits.loadedOlder_one": {
    message: "Зареден е {count} по-стар къмит",
    description:
      "Polite announcement after older commits are appended (one form)",
  },
  "commits.loadedOlder_other": {
    message: "Заредени са {count} по-стари къмита",
    description:
      "Polite announcement after older commits are appended (other form)",
  },
  "commits.noCommits": {
    message: "Не са намерени къмити",
    description: "Empty state for commits list",
  },
  "commits.notFound": {
    message: "Къмитът не е намерен",
    description: "Error message when commit doesn't exist",
  },
  "commits.selectCommitToView": {
    message: "Изберете къмит, за да видите детайли",
    description: "Placeholder text shown when no commit is selected",
  },
  "commits.loadingDiff": {
    message: "Зареждане на разликата...",
    description: "Loading state text when loading large diff",
  },
  "commits.largeDiffWarning": {
    message:
      "Внимание: Тази разлика е много голяма ({totalLines} реда). Синтактичното оцветяване ще бъде деактивирано за производителност.",
    description: "Warning message for very large diffs (10000+ lines)",
  },
  "commits.file": {
    message: "файл",
    description: "Singular form of file count",
  },
  "commits.files": {
    message: "файлове",
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

export default bgCommits;
