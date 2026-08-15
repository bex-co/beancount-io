export interface TranslationEntry {
  message: string;
  description: string;
}

const bgPullRequests: Record<string, TranslationEntry> = {
  "pullRequests.approve": {
    message: "Одобри и слей",
    description: "Button text to approve and merge PR",
  },
  "pullRequests.reject": {
    message: "Отхвърли и затвори",
    description: "Button text to reject and close PR",
  },
  "pullRequests.approveSuccess": {
    message: "Заявката за сливане е одобрена и слята успешно",
    description: "Success message after approving PR",
  },
  "pullRequests.approveError": {
    message: "Неуспешно одобряване на заявката за сливане",
    description: "Error message when PR approval fails",
  },
  "pullRequests.rejectSuccess": {
    message: "Заявката за сливане е затворена успешно",
    description: "Success message after rejecting PR",
  },
  "pullRequests.rejectError": {
    message: "Неуспешно затваряне на заявката за сливане",
    description: "Error message when PR rejection fails",
  },
  "pullRequests.filesChanged": {
    message: "Променени файлове",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "Заявката за сливане не е намерена",
    description: "Error message when PR doesn't exist",
  },
};

export default bgPullRequests;
