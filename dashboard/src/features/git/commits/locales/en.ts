import type { TranslationEntry } from "@/i18n";

const enCommits: Record<string, TranslationEntry> = {
  "commits.versionHistory": {
    message: "Version History",
    description: "Navigation menu item for version history/commits",
  },
  "commits.listTitle": {
    message: "Commits",
    description: "Title for commits list page",
  },
  "commits.detailTitle": {
    message: "Commit Details",
    description: "Title for commit detail page",
  },
  "commits.filesChanged": {
    message: "files changed",
    description: "Label for number of files changed in commit",
  },
  "commits.changes": {
    message: "Changes",
    description: "Heading for commit changes/diff section",
  },
  "commits.noChanges": {
    message: "No changes to display",
    description: "Empty state when a commit has no diff content",
  },
  "commits.diffParseError": {
    message: "The diff could not be read. It may be malformed.",
    description: "Error shown when commit diff content cannot be parsed",
  },
  "commits.loadLargeDiff": {
    message: "Load Large Diff",
    description: "Button to load and display large commit diff (1000+ lines)",
  },
  "commits.noCommits": {
    message: "No commits found",
    description: "Empty state for commits list",
  },
  "commits.notFound": {
    message: "Commit not found",
    description: "Error message when commit doesn't exist",
  },
  "commits.selectCommitToView": {
    message: "Select a commit to view details",
    description: "Placeholder text shown when no commit is selected",
  },
  "commits.loadingDiff": {
    message: "Loading diff...",
    description: "Loading state text when loading large diff",
  },
  "commits.largeDiffWarning": {
    message:
      "Warning: This diff is very large ({totalLines} lines). Syntax highlighting will be disabled for performance.",
    description: "Warning message for very large diffs (10000+ lines)",
  },
  "commits.file": {
    message: "file",
    description: "Singular form of file count",
  },
  "commits.files": {
    message: "files",
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

export default enCommits;
