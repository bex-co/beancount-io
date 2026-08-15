export interface TranslationEntry {
  message: string;
  description: string;
}

const ruPullRequests: Record<string, TranslationEntry> = {
  "pullRequests.approve": {
    message: "Одобрить и слить",
    description: "Button text to approve and merge PR",
  },
  "pullRequests.reject": {
    message: "Отклонить и закрыть",
    description: "Button text to reject and close PR",
  },
  "pullRequests.approveSuccess": {
    message: "Запрос на слияние одобрен и успешно слит",
    description: "Success message after approving PR",
  },
  "pullRequests.approveError": {
    message: "Ошибка при одобрении запроса на слияние",
    description: "Error message when PR approval fails",
  },
  "pullRequests.rejectSuccess": {
    message: "Запрос на слияние успешно закрыт",
    description: "Success message after rejecting PR",
  },
  "pullRequests.rejectError": {
    message: "Ошибка при закрытии запроса на слияние",
    description: "Error message when PR rejection fails",
  },
  "pullRequests.filesChanged": {
    message: "Измененные файлы",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "Запрос на слияние не найден",
    description: "Error message when PR doesn't exist",
  },
};

export default ruPullRequests;
