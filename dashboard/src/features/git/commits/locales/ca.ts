import type { TranslationEntry } from "@/i18n";

const caCommits: Record<string, TranslationEntry> = {
  "commits.versionHistory": {
    message: "Historial de versions",
    description: "Navigation menu item for version history/commits",
  },
  "commits.listTitle": {
    message: "Commits",
    description: "Title for commits list page",
  },
  "commits.detailTitle": {
    message: "Detalls del commit",
    description: "Title for commit detail page",
  },
  "commits.filesChanged": {
    message: "fitxers modificats",
    description: "Label for number of files changed in commit",
  },
  "commits.changes": {
    message: "Canvis",
    description: "Heading for commit changes/diff section",
  },
  "commits.noChanges": {
    message: "No hi ha canvis per mostrar",
    description: "Empty state when a commit has no diff content",
  },
  "commits.renamedWithoutChanges": {
    message: "Fitxer reanomenat sense canvis",
    description:
      "Body of a diff file section for a file that was renamed with no content changes",
  },
  "commits.noLineChanges": {
    message: "No hi ha canvis de línies per mostrar",
    description:
      "Body of a diff file section with no text changes, such as a file-mode or binary change",
  },
  "commits.diffParseError": {
    message: "No s'ha pogut interpretar la diferència. Pot estar malmesa.",
    description: "Error shown when commit diff content cannot be parsed",
  },
  "commits.loadLargeDiff": {
    message: "Carregar diferència gran",
    description: "Button to load and display large commit diff (1000+ lines)",
  },
  "commits.loadOlder": {
    message: "Carregar commits més antics",
    description: "Button to load the next page of older commits",
  },
  "commits.selectedOutsideHistory": {
    message: "El commit seleccionat és fora de l'historial carregat.",
    description:
      "Notice when the selected commit is absent from loaded history",
  },
  "commits.loadedOlder_one": {
    message: "S'ha carregat {count} commit més antic",
    description:
      "Polite announcement after older commits are appended (one form)",
  },
  "commits.loadedOlder_many": {
    message: "S'han carregat {count} commits més antics",
    description:
      "Polite announcement after older commits are appended (many form)",
  },
  "commits.loadedOlder_other": {
    message: "S'han carregat {count} commits més antics",
    description:
      "Polite announcement after older commits are appended (other form)",
  },
  "commits.noCommits": {
    message: "No s'han trobat commits",
    description: "Empty state for commits list",
  },
  "commits.notFound": {
    message: "Commit no trobat",
    description: "Error message when commit doesn't exist",
  },
  "commits.selectCommitToView": {
    message: "Seleccioneu un commit per veure'n els detalls",
    description: "Placeholder text shown when no commit is selected",
  },
  "commits.loadingDiff": {
    message: "Carregant diferència...",
    description: "Loading state text when loading large diff",
  },
  "commits.largeDiffWarning": {
    message:
      "Atenció: Aquesta diferència és molt gran ({totalLines} línies). El ressaltat de sintaxi es desactivarà per al rendiment.",
    description: "Warning message for very large diffs (10000+ lines)",
  },
  "commits.file": {
    message: "fitxer",
    description: "Singular form of file count",
  },
  "commits.files": {
    message: "fitxers",
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

export default caCommits;
