export interface TranslationEntry {
  message: string;
  description: string;
}

const bgUserProfile: Record<string, TranslationEntry> = {
  "userProfile.title": {
    message: "Потребителски профил",
    description: "Header title for user profile page",
  },
  "userProfile.errorLoadingProfile": {
    message: "Грешка при зареждане на профила",
    description: "Error title when profile fails to load",
  },
  "userProfile.errorMessage": {
    message:
      "Нещо се обърка при зареждането на този профил. Моля, опитайте отново по-късно.",
    description: "Generic error message for profile loading failures",
  },
  "userProfile.followError": {
    message: "Неуспешно следване на потребител",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.followSuccess": {
    message: "Успешно последвахте {username}",
    description: "Success toast message after following a user",
  },
  "userProfile.followers": {
    message: "последователи",
    description: "Label for followers count",
  },
  "userProfile.following": {
    message: "следвани",
    description: "Label for following count",
  },
  "userProfile.joined": {
    message: "Присъединен",
    description: "Label for account creation date",
  },
  "userProfile.noActivity": {
    message: "Няма скорошна активност",
    description: "Message shown when user has no recent activity",
  },
  "userProfile.noRepositories": {
    message: "Няма хранилища",
    description: "Message shown when user has no repositories",
  },
  "userProfile.private": {
    message: "Частно",
    description: "Badge label for private repositories",
  },
  "userProfile.public": {
    message: "Публично",
    description: "Badge label for public repositories",
  },
  "userProfile.recentActivity": {
    message: "Скорошна активност",
    description: "Heading for recent activity section",
  },
  "userProfile.repositories": {
    message: "Хранилища",
    description: "Heading for repositories section",
  },
  "userProfile.follow": {
    message: "Следвай",
    description: "Button label to follow a user",
  },
  "userProfile.starredRepos": {
    message: "отбелязани хранилища",
    description: "Label for starred repositories count",
  },
  "userProfile.unfollowError": {
    message: "Неуспешно спиране на следване",
    description: "Error toast message when unfollow operation fails",
  },
  "userProfile.unfollowSuccess": {
    message: "Успешно спряхте да следвате {username}",
    description: "Success toast message after unfollowing a user",
  },
  "userProfile.unfollow": {
    message: "Спри да следваш",
    description: "Button label to unfollow a user",
  },
  "userProfile.updated": {
    message: "Обновено",
    description: "Label prefix for last updated timestamp",
  },
  "userProfile.userNotFound": {
    message: "Потребителят не е намерен",
    description: "Error title when user profile does not exist",
  },
  "userProfile.userNotFoundMessage": {
    message: "Потребителят @{username} не може да бъде намерен.",
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

export default bgUserProfile;
