export interface TranslationEntry {
  message: string;
  description: string;
}

const enPullRequests: Record<string, TranslationEntry> = {
  "pullRequests.reviewPR": {
    message: "Review Pull Request",
    description: "Page title for PR review page",
  },
  "pullRequests.createPR": {
    message: "Create Pull Request",
    description: "Page title for create PR page",
  },
  "pullRequests.approve": {
    message: "Approve & Merge",
    description: "Button text to approve and merge PR",
  },
  "pullRequests.reject": {
    message: "Reject & Close",
    description: "Button text to reject and close PR",
  },
  "pullRequests.approveSuccess": {
    message: "Pull request approved and merged successfully",
    description: "Success message after approving PR",
  },
  "pullRequests.approveError": {
    message: "Failed to approve pull request",
    description: "Error message when PR approval fails",
  },
  "pullRequests.rejectSuccess": {
    message: "Pull request closed successfully",
    description: "Success message after rejecting PR",
  },
  "pullRequests.rejectError": {
    message: "Failed to close pull request",
    description: "Error message when PR rejection fails",
  },
  "pullRequests.changes": {
    message: "Changes",
    description: "Label for diff viewer section",
  },
  "pullRequests.filesChanged": {
    message: "Files Changed",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "Pull request not found",
    description: "Error message when PR doesn't exist",
  },
  "pullRequests.loadingPR": {
    message: "Loading pull request details...",
    description: "Loading message while fetching PR",
  },
};

export default enPullRequests;
