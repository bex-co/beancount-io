export interface TranslationEntry {
  message: string;
  description: string;
}

const ukPullRequests: Record<string, TranslationEntry> = {
  "pullRequests.reviewPR": {
    message: "Переглянути запит на злиття",
    description: "Page title for PR review page",
  },
  "pullRequests.createPR": {
    message: "Створити запит на злиття",
    description: "Page title for create PR page",
  },
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
  "pullRequests.changes": {
    message: "Зміни",
    description: "Label for diff viewer section",
  },
  "pullRequests.filesChanged": {
    message: "Змінені файли",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "Запит на злиття не знайдено",
    description: "Error message when PR doesn't exist",
  },
  "pullRequests.loadingPR": {
    message: "Завантаження деталей запиту на злиття...",
    description: "Loading message while fetching PR",
  },
};

export default ukPullRequests;
