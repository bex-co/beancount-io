import type { TranslationEntry } from "@/i18n";

const esCommits: Record<string, TranslationEntry> = {
  "commits.versionHistory": {
    message: "Historial de versiones",
    description: "Navigation menu item for version history/commits",
  },
  "commits.listTitle": {
    message: "Commits",
    description: "Title for commits list page",
  },
  "commits.detailTitle": {
    message: "Detalles del commit",
    description: "Title for commit detail page",
  },
  "commits.filesChanged": {
    message: "archivos modificados",
    description: "Label for number of files changed in commit",
  },
  "commits.changes": {
    message: "Cambios",
    description: "Heading for commit changes/diff section",
  },
  "commits.noChanges": {
    message: "No hay cambios para mostrar",
    description: "Empty state when a commit has no diff content",
  },
  "commits.diffParseError": {
    message: "No se pudo interpretar la diferencia. Puede estar dañada.",
    description: "Error shown when commit diff content cannot be parsed",
  },
  "commits.loadLargeDiff": {
    message: "Cargar diferencia grande",
    description: "Button to load and display large commit diff (1000+ lines)",
  },
  "commits.noCommits": {
    message: "No se encontraron commits",
    description: "Empty state for commits list",
  },
  "commits.notFound": {
    message: "Commit no encontrado",
    description: "Error message when commit doesn't exist",
  },
  "commits.selectCommitToView": {
    message: "Seleccione un commit para ver los detalles",
    description: "Placeholder text shown when no commit is selected",
  },
  "commits.loadingDiff": {
    message: "Cargando diferencia...",
    description: "Loading state text when loading large diff",
  },
  "commits.largeDiffWarning": {
    message:
      "Advertencia: Esta diferencia es muy grande ({totalLines} líneas). El resaltado de sintaxis se desactivará por rendimiento.",
    description: "Warning message for very large diffs (10000+ lines)",
  },
  "commits.file": {
    message: "archivo",
    description: "Singular form of file count",
  },
  "commits.files": {
    message: "archivos",
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

export default esCommits;
