export interface TranslationEntry {
  message: string;
  description: string;
}

const ruUserProfile: Record<string, TranslationEntry> = {
  "userProfile.errorLoadingProfile": {
    message: "Ошибка загрузки профиля",
    description: "Error title when profile fails to load",
  },
  "userProfile.followError": {
    message: "Не удалось подписаться на пользователя",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.followSuccess": {
    message: "Вы подписались на {username}",
    description: "Success toast message after following a user",
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
    message: "Книги",
    description: "Heading for repositories section",
  },
  "userProfile.follow": {
    message: "Подписаться",
    description: "Button label to follow a user",
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
    message: "Книги",
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
    message: "Сообщество",
    description: "Public profile: community",
  },
  "userProfile.ledgerDescription": {
    message: "Изучайте счета, транзакции и финансовые отчёты.",
    description: "Public profile: ledgerDescription",
  },
  "userProfile.browseDescription": {
    message: "Найдите книгу. Проследите за цифрами.",
    description: "Public profile: browseDescription",
  },
  "userProfile.searchLedgers": {
    message: "Поиск книг…",
    description: "Public profile: searchLedgers",
  },
  "userProfile.clearSearch": {
    message: "Очистить поиск",
    description: "Public profile: clearSearch",
  },
  "userProfile.sortLedgers": {
    message: "Сортировка книг",
    description: "Public profile: sortLedgers",
  },
  "userProfile.recentlyUpdated": {
    message: "Недавно обновлённые",
    description: "Public profile: recentlyUpdated",
  },
  "userProfile.nameAZ": {
    message: "Название (A–Z)",
    description: "Public profile: nameAZ",
  },
  "userProfile.noMatches": {
    message:
      "Нет книг, соответствующих запросу. Попробуйте другое название или ключевое слово.",
    description: "Public profile: noMatches",
  },
  "userProfile.results": {
    message: "Показано {shown} из {total} книг",
    description: "Public profile: results",
  },
  "userProfile.showMoreLedgers": {
    message: "Показать больше книг",
    description: "Public profile: showMoreLedgers",
  },
  "userProfile.newToBeancount": {
    message: "Впервые в Beancount?",
    description: "Public profile: newToBeancount",
  },
  "userProfile.startExample": {
    message: "Начните с примера",
    description: "Public profile: startExample",
  },
  "userProfile.exampleDescription": {
    message:
      "Познакомьтесь с устройством книг. Изучите пример со счетами, транзакциями и отчётами.",
    description: "Public profile: exampleDescription",
  },
  "userProfile.openExample": {
    message: "Посмотреть пример",
    description: "Public profile: openExample",
  },
  "userProfile.showLessActivity": {
    message: "Свернуть активность",
    description: "Public profile: showLessActivity",
  },
  "userProfile.showAllActivity": {
    message: "Показать всю активность",
    description: "Public profile: showAllActivity",
  },
  "userProfile.linkCopied": {
    message: "Ссылка на профиль скопирована",
    description: "Public profile: linkCopied",
  },
  "userProfile.copyLinkError": {
    message:
      "Не удалось скопировать ссылку. Вы можете скопировать её из адресной строки.",
    description: "Public profile: copyLinkError",
  },
  "userProfile.tryAgain": {
    message: "Повторить",
    description: "Public profile: tryAgain",
  },
  "userProfile.collectionLabel": {
    message: "Коллекция открытых книг",
    description: "Public profile: collectionLabel",
  },
  "userProfile.collectionDescription": {
    message:
      "Реальные финансы, открытые для изучения. Просматривайте книги компаний и практические примеры, чтобы увидеть Beancount в действии.",
    description: "Public profile: collectionDescription",
  },
  "userProfile.copyLink": {
    message: "Копировать ссылку",
    description: "Public profile: copyLink",
  },
  "userProfile.followDescription": {
    message: "Добавьте этот профиль в список подписок.",
    description: "Public profile: followDescription",
  },
  "userProfile.footer": {
    message: "Открытые книги. Понятные финансы. На базе Beancount.",
    description: "Public profile: footer",
  },
  "userProfile.openLedgerName": {
    message: "Open Ledger",
    description:
      "Proper name of the Open Ledger collection; keep the name unchanged",
  },
};

export default ruUserProfile;
