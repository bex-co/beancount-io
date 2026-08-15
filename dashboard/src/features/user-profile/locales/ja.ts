import type { TranslationEntry } from "@/i18n";

const jaUserProfile: Record<string, TranslationEntry> = {
  "userProfile.follow": {
    message: "フォロー",
    description: "Button label to follow a user",
  },
  "userProfile.unfollow": {
    message: "フォロー解除",
    description: "Button label to unfollow a user",
  },
  "userProfile.recentActivity": {
    message: "最近のアクティビティ",
    description: "Heading for recent activity section",
  },
  "userProfile.noActivity": {
    message: "最近のアクティビティはありません",
    description: "Message shown when user has no recent activity",
  },
  "userProfile.repositories": {
    message: "リポジトリ",
    description: "Heading for repositories section",
  },
  "userProfile.noRepositories": {
    message: "リポジトリがありません",
    description: "Message shown when user has no repositories",
  },
  "userProfile.joined": {
    message: "参加日",
    description: "Label for account creation date",
  },
  "userProfile.userNotFound": {
    message: "ユーザーが見つかりません",
    description: "Error title when user profile does not exist",
  },
  "userProfile.userNotFoundMessage": {
    message: "ユーザー @{username} が見つかりませんでした。",
    description: "Error message explaining user was not found",
  },
  "userProfile.followSuccess": {
    message: "{username}をフォローしました",
    description: "Success toast message after following a user",
  },
  "userProfile.unfollowSuccess": {
    message: "{username}のフォローを解除しました",
    description: "Success toast message after unfollowing a user",
  },
  "userProfile.followError": {
    message: "ユーザーのフォローに失敗しました",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.unfollowError": {
    message: "ユーザーのフォロー解除に失敗しました",
    description: "Error toast message when unfollow operation fails",
  },
  "userProfile.private": {
    message: "非公開",
    description: "Badge label for private repositories",
  },
  "userProfile.public": {
    message: "公開",
    description: "Badge label for public repositories",
  },
  "userProfile.updated": {
    message: "更新日",
    description: "Label prefix for last updated timestamp",
  },
  "userProfile.errorLoadingProfile": {
    message: "プロファイルの読み込みエラー",
    description: "Error title when profile fails to load",
  },
  "seo.userProfile.title": {
    message: "{username} - ユーザープロファイル",
    description: "SEO title for user profile page",
  },
  "seo.userProfile.description": {
    message:
      "beancount.ioで{username}のプロファイル、リポジトリ、アクティビティを表示。",
    description: "SEO description for user profile page",
  },
  "userProfile.tabs.overview": {
    message: "概要",
    description: "Tab label for overview section",
  },
  "userProfile.tabs.followers": {
    message: "フォロワー",
    description: "Tab label for followers list",
  },
  "userProfile.tabs.following": {
    message: "フォロー中",
    description: "Tab label for following list",
  },
  "userProfile.tabs.starred": {
    message: "スター",
    description: "Tab label for starred repositories",
  },
  "userProfile.noFollowers": {
    message: "まだフォロワーがいません",
    description: "Message shown when user has no followers",
  },
  "userProfile.noFollowing": {
    message: "まだ誰もフォローしていません",
    description: "Message shown when user is not following anyone",
  },
  "userProfile.noStarredRepos": {
    message: "スターリポジトリがありません",
    description: "Message shown when user has no starred repos",
  },
};

export default jaUserProfile;
