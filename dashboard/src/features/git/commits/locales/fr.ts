import type { TranslationEntry } from "@/i18n";

const frCommits: Record<string, TranslationEntry> = {
  "commits.versionHistory": {
    message: "Historique des versions",
    description: "Navigation menu item for version history/commits",
  },
  "commits.listTitle": {
    message: "Commits",
    description: "Title for commits list page",
  },
  "commits.detailTitle": {
    message: "Détails du commit",
    description: "Title for commit detail page",
  },
  "commits.filesChanged": {
    message: "fichiers modifiés",
    description: "Label for number of files changed in commit",
  },
  "commits.changes": {
    message: "Modifications",
    description: "Heading for commit changes/diff section",
  },
  "commits.noChanges": {
    message: "Aucune modification à afficher",
    description: "Empty state when a commit has no diff content",
  },
  "commits.diffParseError": {
    message:
      "La différence n'a pas pu être lue. Elle est peut-être mal formée.",
    description: "Error shown when commit diff content cannot be parsed",
  },
  "commits.loadLargeDiff": {
    message: "Charger une grande différence",
    description: "Button to load and display large commit diff (1000+ lines)",
  },
  "commits.noCommits": {
    message: "Aucun commit trouvé",
    description: "Empty state for commits list",
  },
  "commits.notFound": {
    message: "Commit introuvable",
    description: "Error message when commit doesn't exist",
  },
  "commits.selectCommitToView": {
    message: "Sélectionnez un commit pour voir les détails",
    description: "Placeholder text shown when no commit is selected",
  },
  "commits.loadingDiff": {
    message: "Chargement de la différence...",
    description: "Loading state text when loading large diff",
  },
  "commits.largeDiffWarning": {
    message:
      "Attention: Cette différence est très grande ({totalLines} lignes). La coloration syntaxique sera désactivée pour les performances.",
    description: "Warning message for very large diffs (10000+ lines)",
  },
  "commits.file": {
    message: "fichier",
    description: "Singular form of file count",
  },
  "commits.files": {
    message: "fichiers",
    description: "Plural form of file count",
  },
  "commits.by": {
    message: "par",
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

export default frCommits;
