import type { TranslationEntry } from "@/i18n";

const koPullRequests: Record<string, TranslationEntry> = {
  "pullRequests.reviewPR": {
    message: "풀 리퀘스트 검토",
    description: "Page title for PR review page",
  },
  "pullRequests.createPR": {
    message: "풀 리퀘스트 만들기",
    description: "Page title for create PR page",
  },
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
  "pullRequests.changes": {
    message: "변경사항",
    description: "Label for diff viewer section",
  },
  "pullRequests.filesChanged": {
    message: "변경된 파일",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "풀 리퀘스트를 찾을 수 없습니다",
    description: "Error message when PR doesn't exist",
  },
  "pullRequests.loadingPR": {
    message: "풀 리퀘스트 세부 정보 로딩 중...",
    description: "Loading message while fetching PR",
  },
};

export default koPullRequests;
