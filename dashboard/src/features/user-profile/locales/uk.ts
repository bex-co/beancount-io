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
    message: "Книги",
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
    message: "Спільнота",
    description: "Public profile: community",
  },
  "userProfile.ledgerDescription": {
    message: "Досліджуйте рахунки, транзакції та фінансові звіти.",
    description: "Public profile: ledgerDescription",
  },
  "userProfile.browseDescription": {
    message: "Знайдіть книгу. Простежте за цифрами.",
    description: "Public profile: browseDescription",
  },
  "userProfile.searchLedgers": {
    message: "Пошук книг…",
    description: "Public profile: searchLedgers",
  },
  "userProfile.clearSearch": {
    message: "Очистити пошук",
    description: "Public profile: clearSearch",
  },
  "userProfile.sortLedgers": {
    message: "Сортування книг",
    description: "Public profile: sortLedgers",
  },
  "userProfile.recentlyUpdated": {
    message: "Нещодавно оновлені",
    description: "Public profile: recentlyUpdated",
  },
  "userProfile.nameAZ": {
    message: "Назва (A–Z)",
    description: "Public profile: nameAZ",
  },
  "userProfile.noMatches": {
    message:
      "Немає книг, що відповідають запиту. Спробуйте іншу назву або ключове слово.",
    description: "Public profile: noMatches",
  },
  "userProfile.results": {
    message: "Показано {shown} із {total} книг",
    description: "Public profile: results",
  },
  "userProfile.showMoreLedgers": {
    message: "Показати більше книг",
    description: "Public profile: showMoreLedgers",
  },
  "userProfile.newToBeancount": {
    message: "Уперше в Beancount?",
    description: "Public profile: newToBeancount",
  },
  "userProfile.startExample": {
    message: "Почніть із прикладу",
    description: "Public profile: startExample",
  },
  "userProfile.exampleDescription": {
    message:
      "Ознайомтеся з будовою книг. Дослідіть приклад із рахунками, транзакціями та звітами.",
    description: "Public profile: exampleDescription",
  },
  "userProfile.openExample": {
    message: "Переглянути приклад",
    description: "Public profile: openExample",
  },
  "userProfile.showLessActivity": {
    message: "Згорнути активність",
    description: "Public profile: showLessActivity",
  },
  "userProfile.showAllActivity": {
    message: "Показати всю активність",
    description: "Public profile: showAllActivity",
  },
  "userProfile.linkCopied": {
    message: "Посилання на профіль скопійовано",
    description: "Public profile: linkCopied",
  },
  "userProfile.copyLinkError": {
    message:
      "Не вдалося скопіювати посилання. Ви можете скопіювати його з адресного рядка.",
    description: "Public profile: copyLinkError",
  },
  "userProfile.tryAgain": {
    message: "Спробувати ще раз",
    description: "Public profile: tryAgain",
  },
  "userProfile.collectionLabel": {
    message: "Колекція відкритих книг",
    description: "Public profile: collectionLabel",
  },
  "userProfile.collectionDescription": {
    message:
      "Реальні фінанси, відкриті для дослідження. Переглядайте книги компаній і практичні приклади, щоб побачити Beancount у дії.",
    description: "Public profile: collectionDescription",
  },
  "userProfile.copyLink": {
    message: "Копіювати посилання",
    description: "Public profile: copyLink",
  },
  "userProfile.followDescription": {
    message: "Додайте цей профіль до списку підписок.",
    description: "Public profile: followDescription",
  },
  "userProfile.footer": {
    message: "Відкриті книги. Зрозумілі фінанси. На основі Beancount.",
    description: "Public profile: footer",
  },
  "userProfile.openLedgerName": {
    message: "Open Ledger",
    description:
      "Proper name of the Open Ledger collection; keep the name unchanged",
  },
};

export default ukUserProfile;
