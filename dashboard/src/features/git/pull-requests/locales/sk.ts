export interface TranslationEntry {
  message: string;
  description: string;
}

const skPullRequests: Record<string, TranslationEntry> = {
  "pullRequests.reviewPR": {
    message: "Skontrolovať žiadosť o zlúčenie",
    description: "Page title for PR review page",
  },
  "pullRequests.createPR": {
    message: "Vytvoriť žiadosť o zlúčenie",
    description: "Page title for create PR page",
  },
  "pullRequests.approve": {
    message: "Schváliť a zlúčiť",
    description: "Button text to approve and merge PR",
  },
  "pullRequests.reject": {
    message: "Zamietnuť a zavrieť",
    description: "Button text to reject and close PR",
  },
  "pullRequests.approveSuccess": {
    message: "Žiadosť o zlúčenie úspešne schválená a zlúčená",
    description: "Success message after approving PR",
  },
  "pullRequests.approveError": {
    message: "Chyba pri schvaľovaní žiadosti o zlúčenie",
    description: "Error message when PR approval fails",
  },
  "pullRequests.rejectSuccess": {
    message: "Žiadosť o zlúčenie úspešne zatvorená",
    description: "Success message after rejecting PR",
  },
  "pullRequests.rejectError": {
    message: "Chyba pri zatváraní žiadosti o zlúčenie",
    description: "Error message when PR rejection fails",
  },
  "pullRequests.changes": {
    message: "Zmeny",
    description: "Label for diff viewer section",
  },
  "pullRequests.filesChanged": {
    message: "Zmenené súbory",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "Žiadosť o zlúčenie nenájdená",
    description: "Error message when PR doesn't exist",
  },
  "pullRequests.loadingPR": {
    message: "Načítanie podrobností žiadosti o zlúčenie...",
    description: "Loading message while fetching PR",
  },
};

export default skPullRequests;
