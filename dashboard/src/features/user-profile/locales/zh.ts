export interface TranslationEntry {
  message: string;
  description: string;
}

const zhUserProfile: Record<string, TranslationEntry> = {
  "userProfile.errorLoadingProfile": {
    message: "加载个人资料时出错",
    description: "Error title when profile fails to load",
  },
  "userProfile.followError": {
    message: "关注用户失败",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.followSuccess": {
    message: "你现在关注了 {username}",
    description: "Success toast message after following a user",
  },
  "userProfile.joined": {
    message: "加入时间",
    description: "Label for account creation date",
  },
  "userProfile.noActivity": {
    message: "没有最近的活动",
    description: "Message shown when user has no recent activity",
  },
  "userProfile.noRepositories": {
    message: "没有仓库",
    description: "Message shown when user has no repositories",
  },
  "userProfile.private": {
    message: "私有",
    description: "Badge label for private repositories",
  },
  "userProfile.public": {
    message: "公开",
    description: "Badge label for public repositories",
  },
  "userProfile.recentActivity": {
    message: "最近活动",
    description: "Heading for recent activity section",
  },
  "userProfile.repositories": {
    message: "账簿",
    description: "Heading for repositories section",
  },
  "userProfile.follow": {
    message: "关注",
    description: "Button label to follow a user",
  },
  "userProfile.unfollowError": {
    message: "取消关注用户失败",
    description: "Error toast message when unfollow operation fails",
  },
  "userProfile.unfollowSuccess": {
    message: "你已取消关注 {username}",
    description: "Success toast message after unfollowing a user",
  },
  "userProfile.unfollow": {
    message: "取消关注",
    description: "Button label to unfollow a user",
  },
  "userProfile.updated": {
    message: "已更新",
    description: "Label prefix for last updated timestamp",
  },
  "userProfile.userNotFound": {
    message: "用户未找到",
    description: "Error title when user profile does not exist",
  },
  "userProfile.userNotFoundMessage": {
    message: "找不到用户 @{username}。",
    description: "Error message explaining user was not found",
  },
  "seo.userProfile.title": {
    message: "{username} - User Profile",
    description: "SEO title for user profile page",
  },
  "seo.userProfile.description": {
    message:
      "View {username}'s profile, repositories, and activity on beancount.io.",
    description: "SEO description for user profile page",
  },
  "userProfile.tabs.overview": {
    message: "账簿",
    description: "Tab label for overview section",
  },
  "userProfile.tabs.followers": {
    message: "Followers",
    description: "Tab label for followers list",
  },
  "userProfile.tabs.following": {
    message: "Following",
    description: "Tab label for following list",
  },
  "userProfile.tabs.starred": {
    message: "Starred",
    description: "Tab label for starred repositories",
  },
  "userProfile.noFollowers": {
    message: "No followers yet",
    description: "Message shown when user has no followers",
  },
  "userProfile.noFollowing": {
    message: "Not following anyone yet",
    description: "Message shown when user is not following anyone",
  },
  "userProfile.noStarredRepos": {
    message: "No starred repositories",
    description: "Message shown when user has no starred repos",
  },
  "userProfile.community": {
    message: "社区",
    description: "Public profile: community",
  },
  "userProfile.ledgerDescription": {
    message: "探索账户、交易和财务报表。",
    description: "Public profile: ledgerDescription",
  },
  "userProfile.browseDescription": {
    message: "找到一本账簿，读懂数字背后的故事。",
    description: "Public profile: browseDescription",
  },
  "userProfile.searchLedgers": {
    message: "搜索账簿…",
    description: "Public profile: searchLedgers",
  },
  "userProfile.clearSearch": {
    message: "清除搜索",
    description: "Public profile: clearSearch",
  },
  "userProfile.sortLedgers": {
    message: "账簿排序",
    description: "Public profile: sortLedgers",
  },
  "userProfile.recentlyUpdated": {
    message: "最近更新",
    description: "Public profile: recentlyUpdated",
  },
  "userProfile.nameAZ": {
    message: "名称（A–Z）",
    description: "Public profile: nameAZ",
  },
  "userProfile.noMatches": {
    message: "没有找到匹配的账簿，请尝试其他名称或关键词。",
    description: "Public profile: noMatches",
  },
  "userProfile.results": {
    message: "显示 {total} 本账簿中的 {shown} 本",
    description: "Public profile: results",
  },
  "userProfile.showMoreLedgers": {
    message: "显示更多账簿",
    description: "Public profile: showMoreLedgers",
  },
  "userProfile.newToBeancount": {
    message: "初次使用 Beancount？",
    description: "Public profile: newToBeancount",
  },
  "userProfile.startExample": {
    message: "从示例开始",
    description: "Public profile: startExample",
  },
  "userProfile.exampleDescription": {
    message: "了解账簿的运作方式。探索包含账户、交易和报表的示例账簿。",
    description: "Public profile: exampleDescription",
  },
  "userProfile.openExample": {
    message: "探索示例",
    description: "Public profile: openExample",
  },
  "userProfile.showLessActivity": {
    message: "收起动态",
    description: "Public profile: showLessActivity",
  },
  "userProfile.showAllActivity": {
    message: "查看全部动态",
    description: "Public profile: showAllActivity",
  },
  "userProfile.linkCopied": {
    message: "个人主页链接已复制",
    description: "Public profile: linkCopied",
  },
  "userProfile.copyLinkError": {
    message: "无法复制链接。你可以从地址栏复制。",
    description: "Public profile: copyLinkError",
  },
  "userProfile.tryAgain": {
    message: "重试",
    description: "Public profile: tryAgain",
  },
  "userProfile.collectionLabel": {
    message: "开放账簿集",
    description: "Public profile: collectionLabel",
  },
  "userProfile.collectionDescription": {
    message:
      "真实财务，开放探索。浏览公司账簿和实用示例，了解 Beancount 的实际应用。",
    description: "Public profile: collectionDescription",
  },
  "userProfile.copyLink": {
    message: "复制链接",
    description: "Public profile: copyLink",
  },
  "userProfile.followDescription": {
    message: "将此主页添加到你的关注列表。",
    description: "Public profile: followDescription",
  },
  "userProfile.footer": {
    message: "开放账簿，清晰财务。由 Beancount 驱动。",
    description: "Public profile: footer",
  },
  "userProfile.openLedgerName": {
    message: "Open Ledger",
    description:
      "Proper name of the Open Ledger collection; keep the name unchanged",
  },
};

export default zhUserProfile;
