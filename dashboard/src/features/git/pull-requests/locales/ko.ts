import type { TranslationEntry } from "@/i18n";

const koPullRequests: Record<string, TranslationEntry> = {
  "pullRequests.approve": {
    message: "승인 및 병합",
    description: "Button text to approve and merge PR",
  },
  "pullRequests.reject": {
    message: "거부 및 닫기",
    description: "Button text to reject and close PR",
  },
  "pullRequests.approveSuccess": {
    message: "풀 리퀘스트가 승인되고 병합되었습니다",
    description: "Success message after approving PR",
  },
  "pullRequests.approveError": {
    message: "풀 리퀘스트 승인에 실패했습니다",
    description: "Error message when PR approval fails",
  },
  "pullRequests.rejectSuccess": {
    message: "풀 리퀘스트가 성공적으로 닫혔습니다",
    description: "Success message after rejecting PR",
  },
  "pullRequests.rejectError": {
    message: "풀 리퀘스트 닫기에 실패했습니다",
    description: "Error message when PR rejection fails",
  },
  "pullRequests.filesChanged": {
    message: "변경된 파일",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "풀 리퀘스트를 찾을 수 없습니다",
    description: "Error message when PR doesn't exist",
  },
};

export default koPullRequests;
