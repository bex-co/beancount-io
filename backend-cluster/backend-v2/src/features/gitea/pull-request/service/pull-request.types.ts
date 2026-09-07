export interface PRFileChange {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
}
export interface PullRequestDetails {
  number: number;
  title: string;
  description: string;
  state: string;
  author: string;
  headBranch: string;
  baseBranch: string;
  files: PRFileChange[];
  diff?: string;
}
