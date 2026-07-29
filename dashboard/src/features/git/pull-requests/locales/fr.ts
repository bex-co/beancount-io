export interface TranslationEntry {
  message: string;
  description: string;
}

const frPullRequests: Record<string, TranslationEntry> = {
  "pullRequests.reviewPR": {
    message: "Réviser la demande de fusion",
    description: "Page title for PR review page",
  },
  "pullRequests.createPR": {
    message: "Créer une demande de fusion",
    description: "Page title for create PR page",
  },
  "pullRequests.approve": {
    message: "Approuver et fusionner",
    description: "Button text to approve and merge PR",
  },
  "pullRequests.reject": {
    message: "Rejeter et fermer",
    description: "Button text to reject and close PR",
  },
  "pullRequests.approveSuccess": {
    message: "Demande de fusion approuvée et fusionnée avec succès",
    description: "Success message after approving PR",
  },
  "pullRequests.approveError": {
    message: "Échec de l'approbation de la demande de fusion",
    description: "Error message when PR approval fails",
  },
  "pullRequests.rejectSuccess": {
    message: "Demande de fusion fermée avec succès",
    description: "Success message after rejecting PR",
  },
  "pullRequests.rejectError": {
    message: "Échec de la fermeture de la demande de fusion",
    description: "Error message when PR rejection fails",
  },
  "pullRequests.changes": {
    message: "Modifications",
    description: "Label for diff viewer section",
  },
  "pullRequests.filesChanged": {
    message: "Fichiers modifiés",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "Demande de fusion introuvable",
    description: "Error message when PR doesn't exist",
  },
  "pullRequests.loadingPR": {
    message: "Chargement des détails de la demande de fusion...",
    description: "Loading message while fetching PR",
  },
};

export default frPullRequests;
