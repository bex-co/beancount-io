export interface TranslationEntry {
  message: string;
  description: string;
}

const skPullRequests: Record<string, TranslationEntry> = {
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
  "pullRequests.filesChanged": {
    message: "Zmenené súbory",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "Žiadosť o zlúčenie nenájdená",
    description: "Error message when PR doesn't exist",
  },
};

export default skPullRequests;
