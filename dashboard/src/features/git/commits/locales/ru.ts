import type { TranslationEntry } from "@/i18n";

const ruCommits: Record<string, TranslationEntry> = {
  "commits.versionHistory": {
    message: "История версий",
    description: "Navigation menu item for version history/commits",
  },
  "commits.listTitle": {
    message: "Коммиты",
    description: "Title for commits list page",
  },
  "commits.detailTitle": {
    message: "Детали коммита",
    description: "Title for commit detail page",
  },
  "commits.filesChanged": {
    message: "изменённых файлов",
    description: "Label for number of files changed in commit",
  },
  "commits.changes": {
    message: "Изменения",
    description: "Heading for commit changes/diff section",
  },
  "commits.noChanges": {
    message: "Нет изменений для отображения",
    description: "Empty state when a commit has no diff content",
  },
  "commits.renamedWithoutChanges": {
    message: "Файл переименован без изменений",
    description:
      "Body of a diff file section for a file that was renamed with no content changes",
  },
  "commits.noLineChanges": {
    message: "Нет изменённых строк для показа",
    description:
      "Body of a diff file section with no text changes, such as a file-mode or binary change",
  },
  "commits.diffParseError": {
    message: "Не удалось прочитать разницу. Возможно, её формат повреждён.",
    description: "Error shown when commit diff content cannot be parsed",
  },
  "commits.loadLargeDiff": {
    message: "Загрузить большую разницу",
    description: "Button to load and display large commit diff (1000+ lines)",
  },
  "commits.loadOlder": {
    message: "Загрузить более ранние коммиты",
    description: "Button to load the next page of older commits",
  },
  "commits.selectedOutsideHistory": {
    message: "Выбранный коммит отсутствует в загруженной истории.",
    description:
      "Notice when the selected commit is absent from loaded history",
  },
  "commits.loadedOlder_one": {
    message: "Загружен {count} более ранний коммит",
    description:
      "Polite announcement after older commits are appended (one form)",
  },
  "commits.loadedOlder_few": {
    message: "Загружено {count} более ранних коммита",
    description:
      "Polite announcement after older commits are appended (few form)",
  },
  "commits.loadedOlder_many": {
    message: "Загружено {count} более ранних коммитов",
    description:
      "Polite announcement after older commits are appended (many form)",
  },
  "commits.loadedOlder_other": {
    message: "Загружено {count} более раннего коммита",
    description:
      "Polite announcement after older commits are appended (other form)",
  },
  "commits.noCommits": {
    message: "Коммиты не найдены",
    description: "Empty state for commits list",
  },
  "commits.notFound": {
    message: "Коммит не найден",
    description: "Error message when commit doesn't exist",
  },
  "commits.selectCommitToView": {
    message: "Выберите коммит, чтобы просмотреть детали",
    description: "Placeholder text shown when no commit is selected",
  },
  "commits.loadingDiff": {
    message: "Загрузка разницы...",
    description: "Loading state text when loading large diff",
  },
  "commits.largeDiffWarning": {
    message:
      "Внимание: Эта разница очень большая ({totalLines} строк). Подсветка синтаксиса будет отключена для производительности.",
    description: "Warning message for very large diffs (10000+ lines)",
  },
  "commits.file": {
    message: "файл",
    description: "Singular form of file count",
  },
  "commits.files": {
    message: "файлов",
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

export default ruCommits;
