export interface TranslationEntry {
  message: string;
  description: string;
}

const ruUserProfile: Record<string, TranslationEntry> = {
  "userProfile.title": {
    message: "Профиль пользователя",
    description: "Header title for user profile page",
  },
  "userProfile.errorLoadingProfile": {
    message: "Ошибка загрузки профиля",
    description: "Error title when profile fails to load",
  },
  "userProfile.errorMessage": {
    message:
      "Произошла ошибка при загрузке этого профиля. Пожалуйста, попробуйте позже.",
    description: "Generic error message for profile loading failures",
  },
  "userProfile.followError": {
    message: "Не удалось подписаться на пользователя",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.followSuccess": {
    message: "Вы подписались на {username}",
    description: "Success toast message after following a user",
  },
  "userProfile.followers": {
    message: "подписчики",
    description: "Label for followers count",
  },
  "userProfile.following": {
    message: "подписки",
    description: "Label for following count",
  },
  "userProfile.joined": {
    message: "Присоединился",
    description: "Label for account creation date",
  },
  "userProfile.noActivity": {
    message: "Нет недавней активности",
    description: "Message shown when user has no recent activity",
  },
  "userProfile.noRepositories": {
    message: "Нет репозиториев",
    description: "Message shown when user has no repositories",
  },
  "userProfile.private": {
    message: "Приватный",
    description: "Badge label for private repositories",
  },
  "userProfile.public": {
    message: "Публичный",
    description: "Badge label for public repositories",
  },
  "userProfile.recentActivity": {
    message: "Недавняя активность",
    description: "Heading for recent activity section",
  },
  "userProfile.repositories": {
    message: "Репозитории",
    description: "Heading for repositories section",
  },
  "userProfile.follow": {
    message: "Подписаться",
    description: "Button label to follow a user",
  },
  "userProfile.starredRepos": {
    message: "отмеченные репозитории",
    description: "Label for starred repositories count",
  },
  "userProfile.unfollowError": {
    message: "Не удалось отписаться от пользователя",
    description: "Error toast message when unfollow operation fails",
  },
  "userProfile.unfollowSuccess": {
    message: "Вы отписались от {username}",
    description: "Success toast message after unfollowing a user",
  },
  "userProfile.unfollow": {
    message: "Отписаться",
    description: "Button label to unfollow a user",
  },
  "userProfile.updated": {
    message: "Обновлено",
    description: "Label prefix for last updated timestamp",
  },
  "userProfile.userNotFound": {
    message: "Пользователь не найден",
    description: "Error title when user profile does not exist",
  },
  "userProfile.userNotFoundMessage": {
    message: "Пользователь @{username} не найден.",
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

export default ruUserProfile;
