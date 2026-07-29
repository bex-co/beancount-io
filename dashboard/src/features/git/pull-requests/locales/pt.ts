export interface TranslationEntry {
  message: string;
  description: string;
}

const ptPullRequests: Record<string, TranslationEntry> = {
  "pullRequests.reviewPR": {
    message: "Revisar solicitação de mesclagem",
    description: "Page title for PR review page",
  },
  "pullRequests.createPR": {
    message: "Criar solicitação de mesclagem",
    description: "Page title for create PR page",
  },
  "pullRequests.approve": {
    message: "Aprovar e mesclar",
    description: "Button text to approve and merge PR",
  },
  "pullRequests.reject": {
    message: "Rejeitar e fechar",
    description: "Button text to reject and close PR",
  },
  "pullRequests.approveSuccess": {
    message: "Solicitação de mesclagem aprovada e mesclada com sucesso",
    description: "Success message after approving PR",
  },
  "pullRequests.approveError": {
    message: "Falha ao aprovar solicitação de mesclagem",
    description: "Error message when PR approval fails",
  },
  "pullRequests.rejectSuccess": {
    message: "Solicitação de mesclagem fechada com sucesso",
    description: "Success message after rejecting PR",
  },
  "pullRequests.rejectError": {
    message: "Falha ao fechar solicitação de mesclagem",
    description: "Error message when PR rejection fails",
  },
  "pullRequests.changes": {
    message: "Alterações",
    description: "Label for diff viewer section",
  },
  "pullRequests.filesChanged": {
    message: "Arquivos alterados",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "Solicitação de mesclagem não encontrada",
    description: "Error message when PR doesn't exist",
  },
  "pullRequests.loadingPR": {
    message: "Carregando detalhes da solicitação de mesclagem...",
    description: "Loading message while fetching PR",
  },
};

export default ptPullRequests;
