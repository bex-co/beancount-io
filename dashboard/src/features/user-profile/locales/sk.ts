export interface TranslationEntry {
  message: string;
  description: string;
}

const skUserProfile: Record<string, TranslationEntry> = {
  "userProfile.errorLoadingProfile": {
    message: "Chyba pri načítavaní profilu",
    description: "Error title when profile fails to load",
  },
  "userProfile.followError": {
    message: "Nepodarilo sa sledovať používateľa",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.followSuccess": {
    message: "Teraz sledujete {username}",
    description: "Success toast message after following a user",
  },
  "userProfile.joined": {
    message: "Pridal sa",
    description: "Label for account creation date",
  },
  "userProfile.noActivity": {
    message: "Žiadna nedávna aktivita",
    description: "Message shown when user has no recent activity",
  },
  "userProfile.noRepositories": {
    message: "Žiadne repozitáre",
    description: "Message shown when user has no repositories",
  },
  "userProfile.private": {
    message: "Súkromný",
    description: "Badge label for private repositories",
  },
  "userProfile.public": {
    message: "Verejný",
    description: "Badge label for public repositories",
  },
  "userProfile.recentActivity": {
    message: "Nedávna aktivita",
    description: "Heading for recent activity section",
  },
  "userProfile.repositories": {
    message: "Knihy",
    description: "Heading for repositories section",
  },
  "userProfile.follow": {
    message: "Sledovať",
    description: "Button label to follow a user",
  },
  "userProfile.unfollowError": {
    message: "Nepodarilo sa prestať sledovať používateľa",
    description: "Error toast message when unfollow operation fails",
  },
  "userProfile.unfollowSuccess": {
    message: "Prestali ste sledovať {username}",
    description: "Success toast message after unfollowing a user",
  },
  "userProfile.unfollow": {
    message: "Prestať sledovať",
    description: "Button label to unfollow a user",
  },
  "userProfile.updated": {
    message: "Aktualizované",
    description: "Label prefix for last updated timestamp",
  },
  "userProfile.userNotFound": {
    message: "Používateľ nebol nájdený",
    description: "Error title when user profile does not exist",
  },
  "userProfile.userNotFoundMessage": {
    message: "Používateľ @{username} nebol nájdený.",
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
    message: "Knihy",
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
    message: "Komunita",
    description: "Public profile: community",
  },
  "userProfile.ledgerDescription": {
    message: "Preskúmajte účty, transakcie a finančné výkazy.",
    description: "Public profile: ledgerDescription",
  },
  "userProfile.browseDescription": {
    message: "Nájdite knihu. Sledujte čísla.",
    description: "Public profile: browseDescription",
  },
  "userProfile.searchLedgers": {
    message: "Hľadať knihy…",
    description: "Public profile: searchLedgers",
  },
  "userProfile.clearSearch": {
    message: "Vymazať vyhľadávanie",
    description: "Public profile: clearSearch",
  },
  "userProfile.sortLedgers": {
    message: "Zoradiť knihy",
    description: "Public profile: sortLedgers",
  },
  "userProfile.recentlyUpdated": {
    message: "Nedávno aktualizované",
    description: "Public profile: recentlyUpdated",
  },
  "userProfile.nameAZ": {
    message: "Názov (A–Z)",
    description: "Public profile: nameAZ",
  },
  "userProfile.noMatches": {
    message:
      "Žiadne knihy nezodpovedajú vyhľadávaniu. Skúste iný názov alebo kľúčové slovo.",
    description: "Public profile: noMatches",
  },
  "userProfile.results": {
    message: "Zobrazených {shown} z {total} kníh",
    description: "Public profile: results",
  },
  "userProfile.showMore": {
    message: "Zobraziť viac",
    description: "Public profile: show more social list items",
  },
  "userProfile.loadMoreError": {
    message: "Ďalšie výsledky sa nepodarilo načítať.",
    description: "Public profile: failed to load the next social page",
  },
  "userProfile.showMoreLedgers": {
    message: "Zobraziť ďalšie knihy",
    description: "Public profile: showMoreLedgers",
  },
  "userProfile.newToBeancount": {
    message: "Ste v Beancount noví?",
    description: "Public profile: newToBeancount",
  },
  "userProfile.startExample": {
    message: "Začnite príkladom",
    description: "Public profile: startExample",
  },
  "userProfile.exampleDescription": {
    message:
      "Spoznajte knihy. Preskúmajte vzorovú knihu s účtami, transakciami a výkazmi.",
    description: "Public profile: exampleDescription",
  },
  "userProfile.openExample": {
    message: "Preskúmať príklad",
    description: "Public profile: openExample",
  },
  "userProfile.showLessActivity": {
    message: "Zobraziť menej aktivít",
    description: "Public profile: showLessActivity",
  },
  "userProfile.showAllActivity": {
    message: "Zobraziť všetky aktivity",
    description: "Public profile: showAllActivity",
  },
  "userProfile.linkCopied": {
    message: "Odkaz na profil bol skopírovaný",
    description: "Public profile: linkCopied",
  },
  "userProfile.copyLinkError": {
    message:
      "Odkaz sa nepodarilo skopírovať. Môžete ho skopírovať z panela s adresou.",
    description: "Public profile: copyLinkError",
  },
  "userProfile.tryAgain": {
    message: "Skúsiť znova",
    description: "Public profile: tryAgain",
  },
  "userProfile.collectionLabel": {
    message: "Zbierka otvorených kníh",
    description: "Public profile: collectionLabel",
  },
  "userProfile.collectionDescription": {
    message:
      "Skutočné financie otvorené na preskúmanie. Prezrite si firemné knihy a praktické príklady a objavte Beancount v praxi.",
    description: "Public profile: collectionDescription",
  },
  "userProfile.copyLink": {
    message: "Kopírovať odkaz",
    description: "Public profile: copyLink",
  },
  "userProfile.followDescription": {
    message: "Pridajte tento profil do zoznamu sledovaných.",
    description: "Public profile: followDescription",
  },
  "userProfile.footer": {
    message: "Otvorené knihy. Prehľadnejšie financie. S Beancount.",
    description: "Public profile: footer",
  },
  "userProfile.openLedgerName": {
    message: "Open Ledger",
    description:
      "Proper name of the Open Ledger collection; keep the name unchanged",
  },
};

export default skUserProfile;
