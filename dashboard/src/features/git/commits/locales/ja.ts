import type { TranslationEntry } from "@/i18n";

const jaCommits: Record<string, TranslationEntry> = {
  "commits.versionHistory": {
    message: "バージョン履歴",
    description: "Navigation menu item for version history/commits",
  },
  "commits.listTitle": {
    message: "コミット",
    description: "Title for commits list page",
  },
  "commits.detailTitle": {
    message: "コミット詳細",
    description: "Title for commit detail page",
  },
  "commits.filesChanged": {
    message: "ファイル変更",
    description: "Label for number of files changed in commit",
  },
  "commits.changes": {
    message: "変更",
    description: "Heading for commit changes/diff section",
  },
  "commits.noChanges": {
    message: "表示する変更はありません",
    description: "Empty state when a commit has no diff content",
  },
  "commits.renamedWithoutChanges": {
    message: "内容を変更せずにファイル名を変更しました",
    description:
      "Body of a diff file section for a file that was renamed with no content changes",
  },
  "commits.noLineChanges": {
    message: "表示する行の変更はありません",
    description:
      "Body of a diff file section with no text changes, such as a file-mode or binary change",
  },
  "commits.diffParseError": {
    message: "差分を読み取れませんでした。形式が正しくない可能性があります。",
    description: "Error shown when commit diff content cannot be parsed",
  },
  "commits.loadLargeDiff": {
    message: "大きな差分を読み込む",
    description: "Button to load and display large commit diff (1000+ lines)",
  },
  "commits.loadOlder": {
    message: "古いコミットを読み込む",
    description: "Button to load the next page of older commits",
  },
  "commits.selectedOutsideHistory": {
    message: "選択したコミットは読み込み済みの履歴に含まれていません。",
    description:
      "Notice when the selected commit is absent from loaded history",
  },
  "commits.loadedOlder_other": {
    message: "古いコミットを{count}件読み込みました",
    description:
      "Polite announcement after older commits are appended (other form)",
  },
  "commits.noCommits": {
    message: "コミットが見つかりません",
    description: "Empty state for commits list",
  },
  "commits.notFound": {
    message: "コミットが見つかりません",
    description: "Error message when commit doesn't exist",
  },
  "commits.selectCommitToView": {
    message: "詳細を表示するコミットを選択してください",
    description: "Placeholder text shown when no commit is selected",
  },
  "commits.loadingDiff": {
    message: "差分を読み込み中...",
    description: "Loading state text when loading large diff",
  },
  "commits.largeDiffWarning": {
    message:
      "警告：この差分は非常に大きいです（{totalLines}行）。パフォーマンスのためにシンタックスハイライトが無効になります。",
    description: "Warning message for very large diffs (10000+ lines)",
  },
  "commits.file": {
    message: "ファイル",
    description: "Singular form of file count",
  },
  "commits.files": {
    message: "ファイル",
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

export default jaCommits;
