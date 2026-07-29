import type { TranslationEntry } from "@/i18n";

const jaPullRequests: Record<string, TranslationEntry> = {
  "pullRequests.reviewPR": {
    message: "プルリクエストをレビュー",
    description: "Page title for PR review page",
  },
  "pullRequests.createPR": {
    message: "プルリクエストを作成",
    description: "Page title for create PR page",
  },
  "pullRequests.approve": {
    message: "承認してマージ",
    description: "Button text to approve and merge PR",
  },
  "pullRequests.reject": {
    message: "拒否してクローズ",
    description: "Button text to reject and close PR",
  },
  "pullRequests.approveSuccess": {
    message: "プルリクエストが承認されてマージされました",
    description: "Success message after approving PR",
  },
  "pullRequests.approveError": {
    message: "プルリクエストの承認に失敗しました",
    description: "Error message when PR approval fails",
  },
  "pullRequests.rejectSuccess": {
    message: "プルリクエストが正常にクローズされました",
    description: "Success message after rejecting PR",
  },
  "pullRequests.rejectError": {
    message: "プルリクエストのクローズに失敗しました",
    description: "Error message when PR rejection fails",
  },
  "pullRequests.changes": {
    message: "変更",
    description: "Label for diff viewer section",
  },
  "pullRequests.filesChanged": {
    message: "変更されたファイル",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "プルリクエストが見つかりません",
    description: "Error message when PR doesn't exist",
  },
  "pullRequests.loadingPR": {
    message: "プルリクエストの詳細を読み込み中...",
    description: "Loading message while fetching PR",
  },
};

export default jaPullRequests;
