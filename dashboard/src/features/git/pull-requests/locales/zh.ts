export interface TranslationEntry {
  message: string;
  description: string;
}

const zhPullRequests: Record<string, TranslationEntry> = {
  "pullRequests.reviewPR": {
    message: "审查拉取请求",
    description: "Page title for PR review page",
  },
  "pullRequests.createPR": {
    message: "创建拉取请求",
    description: "Page title for create PR page",
  },
  "pullRequests.approve": {
    message: "批准并合并",
    description: "Button text to approve and merge PR",
  },
  "pullRequests.reject": {
    message: "拒绝并关闭",
    description: "Button text to reject and close PR",
  },
  "pullRequests.approveSuccess": {
    message: "拉取请求已成功批准并合并",
    description: "Success message after approving PR",
  },
  "pullRequests.approveError": {
    message: "批准拉取请求失败",
    description: "Error message when PR approval fails",
  },
  "pullRequests.rejectSuccess": {
    message: "拉取请求已成功关闭",
    description: "Success message after rejecting PR",
  },
  "pullRequests.rejectError": {
    message: "关闭拉取请求失败",
    description: "Error message when PR rejection fails",
  },
  "pullRequests.changes": {
    message: "更改",
    description: "Label for diff viewer section",
  },
  "pullRequests.filesChanged": {
    message: "已更改文件",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "未找到拉取请求",
    description: "Error message when PR doesn't exist",
  },
  "pullRequests.loadingPR": {
    message: "正在加载拉取请求详情...",
    description: "Loading message while fetching PR",
  },
};

export default zhPullRequests;
