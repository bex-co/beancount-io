export interface TranslationEntry {
  message: string;
  description: string;
}

const nlPullRequests: Record<string, TranslationEntry> = {
  "pullRequests.reviewPR": {
    message: "Pull Request beoordelen",
    description: "Page title for PR review page",
  },
  "pullRequests.createPR": {
    message: "Pull Request aanmaken",
    description: "Page title for create PR page",
  },
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
  "pullRequests.changes": {
    message: "Wijzigingen",
    description: "Label for diff viewer section",
  },
  "pullRequests.filesChanged": {
    message: "Gewijzigde bestanden",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "Pull Request niet gevonden",
    description: "Error message when PR doesn't exist",
  },
  "pullRequests.loadingPR": {
    message: "Pull Request details laden...",
    description: "Loading message while fetching PR",
  },
};

export default nlPullRequests;
