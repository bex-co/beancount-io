export interface TranslationEntry {
  message: string;
  description: string;
}

const ukPullRequests: Record<string, TranslationEntry> = {
  "pullRequests.approve": {
    message: "Схвалити і злити",
    description: "Button text to approve and merge PR",
  },
  "pullRequests.reject": {
    message: "Відхилити і закрити",
    description: "Button text to reject and close PR",
  },
  "pullRequests.approveSuccess": {
    message: "Запит на злиття схвалено і успішно злито",
    description: "Success message after approving PR",
  },
  "pullRequests.approveError": {
    message: "Помилка при схваленні запиту на злиття",
    description: "Error message when PR approval fails",
  },
  "pullRequests.rejectSuccess": {
    message: "Запит на злиття успішно закрито",
    description: "Success message after rejecting PR",
  },
  "pullRequests.rejectError": {
    message: "Помилка при закритті запиту на злиття",
    description: "Error message when PR rejection fails",
  },
  "pullRequests.filesChanged": {
    message: "Змінені файли",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "Запит на злиття не знайдено",
    description: "Error message when PR doesn't exist",
  },
};

export default ukPullRequests;
