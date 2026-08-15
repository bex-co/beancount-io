export interface TranslationEntry {
  message: string;
  description: string;
}

const nlPullRequests: Record<string, TranslationEntry> = {
  "pullRequests.approve": {
    message: "Goedkeuren & samenvoegen",
    description: "Button text to approve and merge PR",
  },
  "pullRequests.reject": {
    message: "Afwijzen & sluiten",
    description: "Button text to reject and close PR",
  },
  "pullRequests.approveSuccess": {
    message: "Pull Request succesvol goedgekeurd en samengevoegd",
    description: "Success message after approving PR",
  },
  "pullRequests.approveError": {
    message: "Fout bij goedkeuren van pull request",
    description: "Error message when PR approval fails",
  },
  "pullRequests.rejectSuccess": {
    message: "Pull Request succesvol gesloten",
    description: "Success message after rejecting PR",
  },
  "pullRequests.rejectError": {
    message: "Fout bij sluiten van pull request",
    description: "Error message when PR rejection fails",
  },
  "pullRequests.filesChanged": {
    message: "Gewijzigde bestanden",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "Pull Request niet gevonden",
    description: "Error message when PR doesn't exist",
  },
};

export default nlPullRequests;
