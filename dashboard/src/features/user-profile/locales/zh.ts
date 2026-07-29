export interface TranslationEntry {
  message: string;
  description: string;
}

const zhUserProfile: Record<string, TranslationEntry> = {
  "userProfile.title": {
    message: "用户资料",
    description: "Header title for user profile page",
  },
  "userProfile.errorLoadingProfile": {
    message: "加载个人资料时出错",
    description: "Error title when profile fails to load",
  },
  "userProfile.errorMessage": {
    message: "加载此个人资料时出现问题。请稍后再试。",
    description: "Generic error message for profile loading failures",
  },
  "userProfile.followError": {
    message: "关注用户失败",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.followSuccess": {
    message: "你现在关注了 {username}",
    description: "Success toast message after following a user",
  },
  "userProfile.followers": {
    message: "关注者",
    description: "Label for followers count",
  },
  "userProfile.following": {
    message: "正在关注",
    description: "Label for following count",
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
    message: "仓库",
    description: "Heading for repositories section",
  },
  "userProfile.follow": {
    message: "关注",
    description: "Button label to follow a user",
  },
  "userProfile.starredRepos": {
    message: "已加星标的仓库",
    description: "Label for starred repositories count",
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
    message: "Overview",
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
};

export default zhUserProfile;
