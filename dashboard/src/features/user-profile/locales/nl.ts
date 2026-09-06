export interface TranslationEntry {
  message: string;
  description: string;
}

const nlUserProfile: Record<string, TranslationEntry> = {
  "userProfile.errorLoadingProfile": {
    message: "Fout bij het laden van profiel",
    description: "Error title when profile fails to load",
  },
  "userProfile.followError": {
    message: "Kan gebruiker niet volgen",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.followSuccess": {
    message: "Je volgt nu {username}",
    description: "Success toast message after following a user",
  },
  "userProfile.joined": {
    message: "Lid sinds",
    description: "Label for account creation date",
  },
  "userProfile.noActivity": {
    message: "Geen recente activiteit",
    description: "Message shown when user has no recent activity",
  },
  "userProfile.noRepositories": {
    message: "Geen repositories",
    description: "Message shown when user has no repositories",
  },
  "userProfile.private": {
    message: "Privé",
    description: "Badge label for private repositories",
  },
  "userProfile.public": {
    message: "Openbaar",
    description: "Badge label for public repositories",
  },
  "userProfile.recentActivity": {
    message: "Recente Activiteit",
    description: "Heading for recent activity section",
  },
  "userProfile.repositories": {
    message: "Boekhoudingen",
    description: "Heading for repositories section",
  },
  "userProfile.follow": {
    message: "Volgen",
    description: "Button label to follow a user",
  },
  "userProfile.unfollowError": {
    message: "Kan gebruiker niet ontvolgen",
    description: "Error toast message when unfollow operation fails",
  },
  "userProfile.unfollowSuccess": {
    message: "Je volgt {username} niet meer",
    description: "Success toast message after unfollowing a user",
  },
  "userProfile.unfollow": {
    message: "Ontvolgen",
    description: "Button label to unfollow a user",
  },
  "userProfile.updated": {
    message: "Bijgewerkt",
    description: "Label prefix for last updated timestamp",
  },
  "userProfile.userNotFound": {
    message: "Gebruiker niet gevonden",
    description: "Error title when user profile does not exist",
  },
  "userProfile.userNotFoundMessage": {
    message: "De gebruiker @{username} kon niet worden gevonden.",
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
    message: "Boekhoudingen",
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
    message: "Community",
    description: "Public profile: community",
  },
  "userProfile.ledgerDescription": {
    message: "Ontdek rekeningen, transacties en financiële rapporten.",
    description: "Public profile: ledgerDescription",
  },
  "userProfile.browseDescription": {
    message: "Vind een boekhouding. Volg de cijfers.",
    description: "Public profile: browseDescription",
  },
  "userProfile.searchLedgers": {
    message: "Boekhoudingen zoeken…",
    description: "Public profile: searchLedgers",
  },
  "userProfile.clearSearch": {
    message: "Zoekopdracht wissen",
    description: "Public profile: clearSearch",
  },
  "userProfile.sortLedgers": {
    message: "Boekhoudingen sorteren",
    description: "Public profile: sortLedgers",
  },
  "userProfile.recentlyUpdated": {
    message: "Recent bijgewerkt",
    description: "Public profile: recentlyUpdated",
  },
  "userProfile.nameAZ": {
    message: "Naam (A–Z)",
    description: "Public profile: nameAZ",
  },
  "userProfile.noMatches": {
    message:
      "Geen boekhoudingen gevonden. Probeer een andere naam of zoekterm.",
    description: "Public profile: noMatches",
  },
  "userProfile.results": {
    message: "{shown} van {total} boekhoudingen weergegeven",
    description: "Public profile: results",
  },
  "userProfile.showMoreLedgers": {
    message: "Meer boekhoudingen tonen",
    description: "Public profile: showMoreLedgers",
  },
  "userProfile.newToBeancount": {
    message: "Nieuw bij Beancount?",
    description: "Public profile: newToBeancount",
  },
  "userProfile.startExample": {
    message: "Begin met een voorbeeld",
    description: "Public profile: startExample",
  },
  "userProfile.exampleDescription": {
    message:
      "Maak kennis met de boeken. Verken een voorbeeldboekhouding met rekeningen, transacties en rapporten.",
    description: "Public profile: exampleDescription",
  },
  "userProfile.openExample": {
    message: "Voorbeeld verkennen",
    description: "Public profile: openExample",
  },
  "userProfile.showLessActivity": {
    message: "Minder activiteit tonen",
    description: "Public profile: showLessActivity",
  },
  "userProfile.showAllActivity": {
    message: "Alle activiteit tonen",
    description: "Public profile: showAllActivity",
  },
  "userProfile.linkCopied": {
    message: "Profiellink gekopieerd",
    description: "Public profile: linkCopied",
  },
  "userProfile.copyLinkError": {
    message:
      "De link kon niet worden gekopieerd. U kunt deze uit de adresbalk kopiëren.",
    description: "Public profile: copyLinkError",
  },
  "userProfile.tryAgain": {
    message: "Opnieuw proberen",
    description: "Public profile: tryAgain",
  },
  "userProfile.collectionLabel": {
    message: "Een verzameling open boekhoudingen",
    description: "Public profile: collectionLabel",
  },
  "userProfile.collectionDescription": {
    message:
      "Echte financiën, vrij te verkennen. Bekijk bedrijfsboekhoudingen en praktische voorbeelden om Beancount in actie te zien.",
    description: "Public profile: collectionDescription",
  },
  "userProfile.copyLink": {
    message: "Link kopiëren",
    description: "Public profile: copyLink",
  },
  "userProfile.followDescription": {
    message: "Voeg dit profiel toe aan uw lijst met gevolgde profielen.",
    description: "Public profile: followDescription",
  },
  "userProfile.footer": {
    message: "Open boeken. Heldere financiën. Met Beancount.",
    description: "Public profile: footer",
  },
  "userProfile.openLedgerName": {
    message: "Open Ledger",
    description:
      "Proper name of the Open Ledger collection; keep the name unchanged",
  },
};

export default nlUserProfile;
