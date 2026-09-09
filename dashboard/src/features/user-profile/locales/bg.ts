export interface TranslationEntry {
  message: string;
  description: string;
}

const bgUserProfile: Record<string, TranslationEntry> = {
  "userProfile.errorLoadingProfile": {
    message: "Грешка при зареждане на профила",
    description: "Error title when profile fails to load",
  },
  "userProfile.followError": {
    message: "Неуспешно следване на потребител",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.followSuccess": {
    message: "Успешно последвахте {username}",
    description: "Success toast message after following a user",
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
    message: "Книги",
    description: "Heading for repositories section",
  },
  "userProfile.follow": {
    message: "Следвай",
    description: "Button label to follow a user",
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
    message: "Общност",
    description: "Public profile: community",
  },
  "userProfile.ledgerDescription": {
    message: "Разгледайте сметки, транзакции и финансови отчети.",
    description: "Public profile: ledgerDescription",
  },
  "userProfile.browseDescription": {
    message: "Намерете книга. Проследете числата.",
    description: "Public profile: browseDescription",
  },
  "userProfile.searchLedgers": {
    message: "Търсене на книги…",
    description: "Public profile: searchLedgers",
  },
  "userProfile.clearSearch": {
    message: "Изчистване на търсенето",
    description: "Public profile: clearSearch",
  },
  "userProfile.sortLedgers": {
    message: "Сортиране на книги",
    description: "Public profile: sortLedgers",
  },
  "userProfile.recentlyUpdated": {
    message: "Наскоро обновени",
    description: "Public profile: recentlyUpdated",
  },
  "userProfile.nameAZ": {
    message: "Име (A–Z)",
    description: "Public profile: nameAZ",
  },
  "userProfile.noMatches": {
    message:
      "Няма книги, съответстващи на търсенето. Опитайте друго име или ключова дума.",
    description: "Public profile: noMatches",
  },
  "userProfile.results": {
    message: "Показани са {shown} от {total} книги",
    description: "Public profile: results",
  },
  "userProfile.showMore": {
    message: "Покажи още",
    description: "Public profile: show more social list items",
  },
  "userProfile.loadMoreError": {
    message: "Неуспешно зареждане на още резултати.",
    description: "Public profile: failed to load the next social page",
  },
  "userProfile.showMoreLedgers": {
    message: "Показване на още книги",
    description: "Public profile: showMoreLedgers",
  },
  "userProfile.newToBeancount": {
    message: "За първи път в Beancount?",
    description: "Public profile: newToBeancount",
  },
  "userProfile.startExample": {
    message: "Започнете с пример",
    description: "Public profile: startExample",
  },
  "userProfile.exampleDescription": {
    message:
      "Запознайте се с книгите. Разгледайте примерна книга със сметки, транзакции и отчети.",
    description: "Public profile: exampleDescription",
  },
  "userProfile.openExample": {
    message: "Разглеждане на примера",
    description: "Public profile: openExample",
  },
  "userProfile.showLessActivity": {
    message: "По-малко активност",
    description: "Public profile: showLessActivity",
  },
  "userProfile.showAllActivity": {
    message: "Показване на цялата активност",
    description: "Public profile: showAllActivity",
  },
  "userProfile.linkCopied": {
    message: "Връзката към профила е копирана",
    description: "Public profile: linkCopied",
  },
  "userProfile.copyLinkError": {
    message:
      "Връзката не може да бъде копирана. Можете да я копирате от адресната лента.",
    description: "Public profile: copyLinkError",
  },
  "userProfile.tryAgain": {
    message: "Опитайте отново",
    description: "Public profile: tryAgain",
  },
  "userProfile.collectionLabel": {
    message: "Колекция от отворени книги",
    description: "Public profile: collectionLabel",
  },
  "userProfile.collectionDescription": {
    message:
      "Реални финанси, достъпни за разглеждане. Разгледайте фирмени книги и практически примери, за да видите Beancount в действие.",
    description: "Public profile: collectionDescription",
  },
  "userProfile.copyLink": {
    message: "Копиране на връзката",
    description: "Public profile: copyLink",
  },
  "userProfile.followDescription": {
    message: "Добавете този профил към списъка си със следвани профили.",
    description: "Public profile: followDescription",
  },
  "userProfile.footer": {
    message: "Отворени книги. По-ясни финанси. С Beancount.",
    description: "Public profile: footer",
  },
  "userProfile.openLedgerName": {
    message: "Open Ledger",
    description:
      "Proper name of the Open Ledger collection; keep the name unchanged",
  },
};

export default bgUserProfile;
