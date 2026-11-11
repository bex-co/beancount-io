import type { TranslationEntry } from "@/i18n";

const ukCommits: Record<string, TranslationEntry> = {
  "commits.versionHistory": {
    message: "Історія версій",
    description: "Navigation menu item for version history/commits",
  },
  "commits.listTitle": {
    message: "Коміти",
    description: "Title for commits list page",
  },
  "commits.detailTitle": {
    message: "Деталі коміту",
    description: "Title for commit detail page",
  },
  "commits.filesChanged": {
    message: "змінених файлів",
    description: "Label for number of files changed in commit",
  },
  "commits.changes": {
    message: "Зміни",
    description: "Heading for commit changes/diff section",
  },
  "commits.noChanges": {
    message: "Немає змін для відображення",
    description: "Empty state when a commit has no diff content",
  },
  "commits.renamedWithoutChanges": {
    message: "Файл перейменовано без змін",
    description:
      "Body of a diff file section for a file that was renamed with no content changes",
  },
  "commits.noLineChanges": {
    message: "Немає змінених рядків для показу",
    description:
      "Body of a diff file section with no text changes, such as a file-mode or binary change",
  },
  "commits.diffParseError": {
    message: "Не вдалося прочитати різницю. Можливо, її формат пошкоджено.",
    description: "Error shown when commit diff content cannot be parsed",
  },
  "commits.loadLargeDiff": {
    message: "Завантажити велику різницю",
    description: "Button to load and display large commit diff (1000+ lines)",
  },
  "commits.loadOlder": {
    message: "Завантажити давніші коміти",
    description: "Button to load the next page of older commits",
  },
  "commits.selectedOutsideHistory": {
    message: "Вибраний коміт відсутній у завантаженій історії.",
    description:
      "Notice when the selected commit is absent from loaded history",
  },
  "commits.loadedOlder_one": {
    message: "Завантажено {count} давніший коміт",
    description:
      "Polite announcement after older commits are appended (one form)",
  },
  "commits.loadedOlder_few": {
    message: "Завантажено {count} давніші коміти",
    description:
      "Polite announcement after older commits are appended (few form)",
  },
  "commits.loadedOlder_many": {
    message: "Завантажено {count} давніших комітів",
    description:
      "Polite announcement after older commits are appended (many form)",
  },
  "commits.loadedOlder_other": {
    message: "Завантажено {count} давнішого коміту",
    description:
      "Polite announcement after older commits are appended (other form)",
  },
  "commits.noCommits": {
    message: "Коміти не знайдено",
    description: "Empty state for commits list",
  },
  "commits.notFound": {
    message: "Коміт не знайдено",
    description: "Error message when commit doesn't exist",
  },
  "commits.selectCommitToView": {
    message: "Виберіть коміт, щоб переглянути деталі",
    description: "Placeholder text shown when no commit is selected",
  },
  "commits.loadingDiff": {
    message: "Завантаження різниці...",
    description: "Loading state text when loading large diff",
  },
  "commits.largeDiffWarning": {
    message:
      "Увага: Ця різниця дуже велика ({totalLines} рядків). Підсвічування синтаксису буде вимкнено для продуктивності.",
    description: "Warning message for very large diffs (10000+ lines)",
  },
  "commits.file": {
    message: "файл",
    description: "Singular form of file count",
  },
  "commits.files": {
    message: "файлів",
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

export default ukCommits;
