export interface TranslationEntry {
  message: string;
  description: string;
}

const enPullRequests: Record<string, TranslationEntry> = {
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
  "pullRequests.filesChanged": {
    message: "Files Changed",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "Pull request not found",
    description: "Error message when PR doesn't exist",
  },
};

export default enPullRequests;
