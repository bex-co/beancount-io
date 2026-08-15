export interface TranslationEntry {
  message: string;
  description: string;
}

const ukUserProfile: Record<string, TranslationEntry> = {
  "userProfile.errorLoadingProfile": {
    message: "Помилка завантаження профілю",
    description: "Error title when profile fails to load",
  },
  "userProfile.followError": {
    message: "Не вдалося підписатися на користувача",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.followSuccess": {
    message: "Ви підписалися на {username}",
    description: "Success toast message after following a user",
  },
  "userProfile.joined": {
    message: "Приєднався",
    description: "Label for account creation date",
  },
  "userProfile.noActivity": {
    message: "Немає нещодавньої активності",
    description: "Message shown when user has no recent activity",
  },
  "userProfile.noRepositories": {
    message: "Немає репозиторіїв",
    description: "Message shown when user has no repositories",
  },
  "userProfile.private": {
    message: "Приватний",
    description: "Badge label for private repositories",
  },
  "userProfile.public": {
    message: "Публічний",
    description: "Badge label for public repositories",
  },
  "userProfile.recentActivity": {
    message: "Нещодавня активність",
    description: "Heading for recent activity section",
  },
  "userProfile.repositories": {
    message: "Репозиторії",
    description: "Heading for repositories section",
  },
  "userProfile.follow": {
    message: "Підписатися",
    description: "Button label to follow a user",
  },
  "userProfile.unfollowError": {
    message: "Не вдалося відписатися від користувача",
    description: "Error toast message when unfollow operation fails",
  },
  "userProfile.unfollowSuccess": {
    message: "Ви відписалися від {username}",
    description: "Success toast message after unfollowing a user",
  },
  "userProfile.unfollow": {
    message: "Відписатися",
    description: "Button label to unfollow a user",
  },
  "userProfile.updated": {
    message: "Оновлено",
    description: "Label prefix for last updated timestamp",
  },
  "userProfile.userNotFound": {
    message: "Користувача не знайдено",
    description: "Error title when user profile does not exist",
  },
  "userProfile.userNotFoundMessage": {
    message: "Користувача @{username} не знайдено.",
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

export default ukUserProfile;
