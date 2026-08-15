import type { TranslationEntry } from "@/i18n";

const zhCommits: Record<string, TranslationEntry> = {
  "commits.versionHistory": {
    message: "版本历史",
    description: "Navigation menu item for version history/commits",
  },
  "commits.listTitle": {
    message: "提交记录",
    description: "Title for commits list page",
  },
  "commits.detailTitle": {
    message: "提交详情",
    description: "Title for commit detail page",
  },
  "commits.filesChanged": {
    message: "更改的文件",
    description: "Label for number of files changed in commit",
  },
  "commits.changes": {
    message: "变更",
    description: "Heading for commit changes/diff section",
  },
  "commits.noChanges": {
    message: "没有可显示的变更",
    description: "Empty state when a commit has no diff content",
  },
  "commits.diffParseError": {
    message: "无法读取差异内容，其格式可能有误。",
    description: "Error shown when commit diff content cannot be parsed",
  },
  "commits.loadLargeDiff": {
    message: "加载大型差异",
    description: "Button to load and display large commit diff (1000+ lines)",
  },
  "commits.noCommits": {
    message: "未找到提交记录",
    description: "Empty state for commits list",
  },
  "commits.notFound": {
    message: "未找到提交",
    description: "Error message when commit doesn't exist",
  },
  "commits.selectCommitToView": {
    message: "选择一个提交以查看详情",
    description: "Placeholder text shown when no commit is selected",
  },
  "commits.loadingDiff": {
    message: "正在加载差异...",
    description: "Loading state text when loading large diff",
  },
  "commits.largeDiffWarning": {
    message:
      "警告：此差异非常大（{totalLines} 行）。为了性能，将禁用语法高亮。",
    description: "Warning message for very large diffs (10000+ lines)",
  },
  "commits.file": {
    message: "个文件",
    description: "Singular form of file count",
  },
  "commits.files": {
    message: "个文件",
    description: "Plural form of file count",
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

export default zhCommits;
