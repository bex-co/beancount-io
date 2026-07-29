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
  "commits.diffParseError": {
    message: "Не вдалося прочитати різницю. Можливо, її формат пошкоджено.",
    description: "Error shown when commit diff content cannot be parsed",
  },
  "commits.loadLargeDiff": {
    message: "Завантажити велику різницю",
    description: "Button to load and display large commit diff (1000+ lines)",
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
  "commits.by": {
    message: "від",
    description: "Preposition before commit author name",
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
