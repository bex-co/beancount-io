import type { TranslationEntry } from "@/i18n";

const deCommits: Record<string, TranslationEntry> = {
  "commits.versionHistory": {
    message: "Versionsverlauf",
    description: "Navigation menu item for version history/commits",
  },
  "commits.listTitle": {
    message: "Commits",
    description: "Title for commits list page",
  },
  "commits.detailTitle": {
    message: "Commit-Details",
    description: "Title for commit detail page",
  },
  "commits.filesChanged": {
    message: "geänderte Dateien",
    description: "Label for number of files changed in commit",
  },
  "commits.changes": {
    message: "Änderungen",
    description: "Heading for commit changes/diff section",
  },
  "commits.noChanges": {
    message: "Keine Änderungen anzuzeigen",
    description: "Empty state when a commit has no diff content",
  },
  "commits.diffParseError": {
    message:
      "Die Differenz konnte nicht gelesen werden. Sie ist möglicherweise fehlerhaft.",
    description: "Error shown when commit diff content cannot be parsed",
  },
  "commits.loadLargeDiff": {
    message: "Große Differenz laden",
    description: "Button to load and display large commit diff (1000+ lines)",
  },
  "commits.noCommits": {
    message: "Keine Commits gefunden",
    description: "Empty state for commits list",
  },
  "commits.notFound": {
    message: "Commit nicht gefunden",
    description: "Error message when commit doesn't exist",
  },
  "commits.selectCommitToView": {
    message: "Wählen Sie einen Commit aus, um Details anzuzeigen",
    description: "Placeholder text shown when no commit is selected",
  },
  "commits.loadingDiff": {
    message: "Differenz wird geladen...",
    description: "Loading state text when loading large diff",
  },
  "commits.largeDiffWarning": {
    message:
      "Warnung: Diese Differenz ist sehr groß ({totalLines} Zeilen). Syntaxhervorhebung wird aus Leistungsgründen deaktiviert.",
    description: "Warning message for very large diffs (10000+ lines)",
  },
  "commits.file": {
    message: "Datei",
    description: "Singular form of file count",
  },
  "commits.files": {
    message: "Dateien",
    description: "Plural form of file count",
  },
  "commits.by": {
    message: "von",
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

export default deCommits;
