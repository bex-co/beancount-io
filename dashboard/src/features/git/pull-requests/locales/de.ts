export interface TranslationEntry {
  message: string;
  description: string;
}

const dePullRequests: Record<string, TranslationEntry> = {
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
  "pullRequests.filesChanged": {
    message: "Geänderte Dateien",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "Pull Request nicht gefunden",
    description: "Error message when PR doesn't exist",
  },
};

export default dePullRequests;
