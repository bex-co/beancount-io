export interface TranslationEntry {
  message: string;
  description: string;
}

const caPullRequests: Record<string, TranslationEntry> = {
  "pullRequests.approve": {
    message: "Aprovar i fusionar",
    description: "Button text to approve and merge PR",
  },
  "pullRequests.reject": {
    message: "Rebutjar i tancar",
    description: "Button text to reject and close PR",
  },
  "pullRequests.approveSuccess": {
    message: "Sol·licitud de fusió aprovada i fusionada amb èxit",
    description: "Success message after approving PR",
  },
  "pullRequests.approveError": {
    message: "Error en aprovar la sol·licitud de fusió",
    description: "Error message when PR approval fails",
  },
  "pullRequests.rejectSuccess": {
    message: "Sol·licitud de fusió tancada amb èxit",
    description: "Success message after rejecting PR",
  },
  "pullRequests.rejectError": {
    message: "Error en tancar la sol·licitud de fusió",
    description: "Error message when PR rejection fails",
  },
  "pullRequests.filesChanged": {
    message: "Fitxers modificats",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "Sol·licitud de fusió no trobada",
    description: "Error message when PR doesn't exist",
  },
};

export default caPullRequests;
