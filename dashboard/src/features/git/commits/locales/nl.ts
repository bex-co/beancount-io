import type { TranslationEntry } from "@/i18n";

const nlCommits: Record<string, TranslationEntry> = {
  "commits.versionHistory": {
    message: "Versiegeschiedenis",
    description: "Navigation menu item for version history/commits",
  },
  "commits.listTitle": {
    message: "Commits",
    description: "Title for commits list page",
  },
  "commits.detailTitle": {
    message: "Commitdetails",
    description: "Title for commit detail page",
  },
  "commits.filesChanged": {
    message: "gewijzigde bestanden",
    description: "Label for number of files changed in commit",
  },
  "commits.changes": {
    message: "Wijzigingen",
    description: "Heading for commit changes/diff section",
  },
  "commits.noChanges": {
    message: "Geen wijzigingen om weer te geven",
    description: "Empty state when a commit has no diff content",
  },
  "commits.diffParseError": {
    message: "Het verschil kon niet worden gelezen. Het is mogelijk ongeldig.",
    description: "Error shown when commit diff content cannot be parsed",
  },
  "commits.loadLargeDiff": {
    message: "Groot verschil laden",
    description: "Button to load and display large commit diff (1000+ lines)",
  },
  "commits.noCommits": {
    message: "Geen commits gevonden",
    description: "Empty state for commits list",
  },
  "commits.notFound": {
    message: "Commit niet gevonden",
    description: "Error message when commit doesn't exist",
  },
  "commits.selectCommitToView": {
    message: "Selecteer een commit om details te bekijken",
    description: "Placeholder text shown when no commit is selected",
  },
  "commits.loadingDiff": {
    message: "Verschil laden...",
    description: "Loading state text when loading large diff",
  },
  "commits.largeDiffWarning": {
    message:
      "Waarschuwing: Dit verschil is zeer groot ({totalLines} regels). Syntaxismarkering wordt uitgeschakeld voor prestaties.",
    description: "Warning message for very large diffs (10000+ lines)",
  },
  "commits.file": {
    message: "bestand",
    description: "Singular form of file count",
  },
  "commits.files": {
    message: "bestanden",
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

export default nlCommits;
