import type { TranslationEntry } from "@/i18n";

const koCommits: Record<string, TranslationEntry> = {
  "commits.versionHistory": {
    message: "버전 기록",
    description: "Navigation menu item for version history/commits",
  },
  "commits.listTitle": {
    message: "커밋",
    description: "Title for commits list page",
  },
  "commits.detailTitle": {
    message: "커밋 세부 정보",
    description: "Title for commit detail page",
  },
  "commits.filesChanged": {
    message: "파일 변경됨",
    description: "Label for number of files changed in commit",
  },
  "commits.changes": {
    message: "변경사항",
    description: "Heading for commit changes/diff section",
  },
  "commits.noChanges": {
    message: "표시할 변경사항이 없습니다",
    description: "Empty state when a commit has no diff content",
  },
  "commits.diffParseError": {
    message: "차이를 읽을 수 없습니다. 형식이 잘못되었을 수 있습니다.",
    description: "Error shown when commit diff content cannot be parsed",
  },
  "commits.loadLargeDiff": {
    message: "큰 차이 로드",
    description: "Button to load and display large commit diff (1000+ lines)",
  },
  "commits.noCommits": {
    message: "커밋을 찾을 수 없습니다",
    description: "Empty state for commits list",
  },
  "commits.notFound": {
    message: "커밋을 찾을 수 없습니다",
    description: "Error message when commit doesn't exist",
  },
  "commits.selectCommitToView": {
    message: "세부 정보를 볼 커밋을 선택하세요",
    description: "Placeholder text shown when no commit is selected",
  },
  "commits.loadingDiff": {
    message: "차이 로딩 중...",
    description: "Loading state text when loading large diff",
  },
  "commits.largeDiffWarning": {
    message:
      "경고: 이 차이는 매우 큽니다({totalLines}줄). 성능을 위해 구문 강조가 비활성화됩니다.",
    description: "Warning message for very large diffs (10000+ lines)",
  },
  "commits.file": {
    message: "파일",
    description: "Singular form of file count",
  },
  "commits.files": {
    message: "파일",
    description: "Plural form of file count",
  },
  "commits.by": {
    message: "작성자",
    description: "Preposition before commit author name",
  },
  "commits.additions": {
    message: "+{count}",
    description: "Label showing number of lines added",
  },
  "commits.deletions": {
    message: "-{count}",
    description: "Label showing number of lines deleted",
  },
};

export default koCommits;
