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
  "commits.renamedWithoutChanges": {
    message: "Fichier renommé sans modification",
    description:
      "Body of a diff file section for a file that was renamed with no content changes",
  },
  "commits.noLineChanges": {
    message: "Aucune modification de ligne à afficher",
    description:
      "Body of a diff file section with no text changes, such as a file-mode or binary change",
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
  "commits.loadOlder": {
    message: "Charger les commits plus anciens",
    description: "Button to load the next page of older commits",
  },
  "commits.selectedOutsideHistory": {
    message: "Le commit sélectionné ne figure pas dans l'historique chargé.",
    description:
      "Notice when the selected commit is absent from loaded history",
  },
  "commits.loadedOlder_one": {
    message: "{count} commit plus ancien chargé",
    description:
      "Polite announcement after older commits are appended (one form)",
  },
  "commits.loadedOlder_many": {
    message: "{count} commits plus anciens chargés",
    description:
      "Polite announcement after older commits are appended (many form)",
  },
  "commits.loadedOlder_other": {
    message: "{count} commits plus anciens chargés",
    description:
      "Polite announcement after older commits are appended (other form)",
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
