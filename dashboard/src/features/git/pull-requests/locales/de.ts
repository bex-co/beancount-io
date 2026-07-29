export interface TranslationEntry {
  message: string;
  description: string;
}

const dePullRequests: Record<string, TranslationEntry> = {
  "pullRequests.reviewPR": {
    message: "Pull Request überprüfen",
    description: "Page title for PR review page",
  },
  "pullRequests.createPR": {
    message: "Pull Request erstellen",
    description: "Page title for create PR page",
  },
  "pullRequests.approve": {
    message: "Genehmigen & zusammenführen",
    description: "Button text to approve and merge PR",
  },
  "pullRequests.reject": {
    message: "Ablehnen & schließen",
    description: "Button text to reject and close PR",
  },
  "pullRequests.approveSuccess": {
    message: "Pull Request erfolgreich genehmigt und zusammengeführt",
    description: "Success message after approving PR",
  },
  "pullRequests.approveError": {
    message: "Fehler beim Genehmigen des Pull Requests",
    description: "Error message when PR approval fails",
  },
  "pullRequests.rejectSuccess": {
    message: "Pull Request erfolgreich geschlossen",
    description: "Success message after rejecting PR",
  },
  "pullRequests.rejectError": {
    message: "Fehler beim Schließen des Pull Requests",
    description: "Error message when PR rejection fails",
  },
  "pullRequests.changes": {
    message: "Änderungen",
    description: "Label for diff viewer section",
  },
  "pullRequests.filesChanged": {
    message: "Geänderte Dateien",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "Pull Request nicht gefunden",
    description: "Error message when PR doesn't exist",
  },
  "pullRequests.loadingPR": {
    message: "Lade Pull Request Details...",
    description: "Loading message while fetching PR",
  },
};

export default dePullRequests;
