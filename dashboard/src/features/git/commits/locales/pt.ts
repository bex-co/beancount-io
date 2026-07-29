import type { TranslationEntry } from "@/i18n";

const ptCommits: Record<string, TranslationEntry> = {
  "commits.versionHistory": {
    message: "Histórico de versões",
    description: "Navigation menu item for version history/commits",
  },
  "commits.listTitle": {
    message: "Commits",
    description: "Title for commits list page",
  },
  "commits.detailTitle": {
    message: "Detalhes do commit",
    description: "Title for commit detail page",
  },
  "commits.filesChanged": {
    message: "arquivos alterados",
    description: "Label for number of files changed in commit",
  },
  "commits.changes": {
    message: "Alterações",
    description: "Heading for commit changes/diff section",
  },
  "commits.noChanges": {
    message: "Nenhuma alteração para exibir",
    description: "Empty state when a commit has no diff content",
  },
  "commits.diffParseError": {
    message: "Não foi possível ler a diferença. Ela pode estar malformada.",
    description: "Error shown when commit diff content cannot be parsed",
  },
  "commits.loadLargeDiff": {
    message: "Carregar diferença grande",
    description: "Button to load and display large commit diff (1000+ lines)",
  },
  "commits.noCommits": {
    message: "Nenhum commit encontrado",
    description: "Empty state for commits list",
  },
  "commits.notFound": {
    message: "Commit não encontrado",
    description: "Error message when commit doesn't exist",
  },
  "commits.selectCommitToView": {
    message: "Selecione um commit para ver os detalhes",
    description: "Placeholder text shown when no commit is selected",
  },
  "commits.loadingDiff": {
    message: "Carregando diferença...",
    description: "Loading state text when loading large diff",
  },
  "commits.largeDiffWarning": {
    message:
      "Aviso: Esta diferença é muito grande ({totalLines} linhas). O destaque de sintaxe será desativado por desempenho.",
    description: "Warning message for very large diffs (10000+ lines)",
  },
  "commits.file": {
    message: "arquivo",
    description: "Singular form of file count",
  },
  "commits.files": {
    message: "arquivos",
    description: "Plural form of file count",
  },
  "commits.by": {
    message: "por",
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

export default ptCommits;
