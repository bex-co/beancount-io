export interface TranslationEntry {
  message: string;
  description: string;
}

const deUserProfile: Record<string, TranslationEntry> = {
  "userProfile.errorLoadingProfile": {
    message: "Fehler beim Laden des Profils",
    description: "Error title when profile fails to load",
  },
  "userProfile.followError": {
    message: "Benutzer konnte nicht gefolgt werden",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.followSuccess": {
    message: "Sie folgen jetzt {username}",
    description: "Success toast message after following a user",
  },
  "userProfile.joined": {
    message: "Beigetreten",
    description: "Label for account creation date",
  },
  "userProfile.noActivity": {
    message: "Keine aktuellen Aktivitäten",
    description: "Message shown when user has no recent activity",
  },
  "userProfile.noRepositories": {
    message: "Keine Repositories",
    description: "Message shown when user has no repositories",
  },
  "userProfile.private": {
    message: "Privat",
    description: "Badge label for private repositories",
  },
  "userProfile.public": {
    message: "Öffentlich",
    description: "Badge label for public repositories",
  },
  "userProfile.recentActivity": {
    message: "Letzte Aktivität",
    description: "Heading for recent activity section",
  },
  "userProfile.repositories": {
    message: "Bücher",
    description: "Heading for repositories section",
  },
  "userProfile.follow": {
    message: "Folgen",
    description: "Button label to follow a user",
  },
  "userProfile.unfollowError": {
    message: "Benutzer konnte nicht entfolgt werden",
    description: "Error toast message when unfollow operation fails",
  },
  "userProfile.unfollowSuccess": {
    message: "Sie folgen {username} nicht mehr",
    description: "Success toast message after unfollowing a user",
  },
  "userProfile.unfollow": {
    message: "Nicht mehr folgen",
    description: "Button label to unfollow a user",
  },
  "userProfile.updated": {
    message: "Aktualisiert",
    description: "Label prefix for last updated timestamp",
  },
  "userProfile.userNotFound": {
    message: "Benutzer nicht gefunden",
    description: "Error title when user profile does not exist",
  },
  "userProfile.userNotFoundMessage": {
    message: "Der Benutzer @{username} konnte nicht gefunden werden.",
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
    message: "Bücher",
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
    message: "Konten, Buchungen und Finanzberichte entdecken.",
    description: "Public profile: ledgerDescription",
  },
  "userProfile.browseDescription": {
    message: "Ein Buch finden. Den Zahlen folgen.",
    description: "Public profile: browseDescription",
  },
  "userProfile.searchLedgers": {
    message: "Bücher durchsuchen…",
    description: "Public profile: searchLedgers",
  },
  "userProfile.clearSearch": {
    message: "Suche löschen",
    description: "Public profile: clearSearch",
  },
  "userProfile.sortLedgers": {
    message: "Bücher sortieren",
    description: "Public profile: sortLedgers",
  },
  "userProfile.recentlyUpdated": {
    message: "Zuletzt aktualisiert",
    description: "Public profile: recentlyUpdated",
  },
  "userProfile.nameAZ": {
    message: "Name (A–Z)",
    description: "Public profile: nameAZ",
  },
  "userProfile.noMatches": {
    message:
      "Keine Bücher passen zu Ihrer Suche. Versuchen Sie einen anderen Namen oder Suchbegriff.",
    description: "Public profile: noMatches",
  },
  "userProfile.results": {
    message: "{shown} von {total} Büchern angezeigt",
    description: "Public profile: results",
  },
  "userProfile.showMoreLedgers": {
    message: "Weitere Bücher anzeigen",
    description: "Public profile: showMoreLedgers",
  },
  "userProfile.newToBeancount": {
    message: "Neu bei Beancount?",
    description: "Public profile: newToBeancount",
  },
  "userProfile.startExample": {
    message: "Mit einem Beispiel beginnen",
    description: "Public profile: startExample",
  },
  "userProfile.exampleDescription": {
    message:
      "Lernen Sie die Bücher kennen. Entdecken Sie ein Beispielbuch mit Konten, Buchungen und Berichten.",
    description: "Public profile: exampleDescription",
  },
  "userProfile.openExample": {
    message: "Beispiel erkunden",
    description: "Public profile: openExample",
  },
  "userProfile.showLessActivity": {
    message: "Weniger Aktivitäten anzeigen",
    description: "Public profile: showLessActivity",
  },
  "userProfile.showAllActivity": {
    message: "Alle Aktivitäten anzeigen",
    description: "Public profile: showAllActivity",
  },
  "userProfile.linkCopied": {
    message: "Profillink kopiert",
    description: "Public profile: linkCopied",
  },
  "userProfile.copyLinkError": {
    message:
      "Der Link konnte nicht kopiert werden. Sie können ihn aus der Adressleiste kopieren.",
    description: "Public profile: copyLinkError",
  },
  "userProfile.tryAgain": {
    message: "Erneut versuchen",
    description: "Public profile: tryAgain",
  },
  "userProfile.collectionLabel": {
    message: "Eine Sammlung offener Bücher",
    description: "Public profile: collectionLabel",
  },
  "userProfile.collectionDescription": {
    message:
      "Echte Finanzen frei erkunden. Entdecken Sie Unternehmensbücher und praktische Beispiele, um Beancount in Aktion zu erleben.",
    description: "Public profile: collectionDescription",
  },
  "userProfile.copyLink": {
    message: "Link kopieren",
    description: "Public profile: copyLink",
  },
  "userProfile.followDescription": {
    message: "Fügen Sie dieses Profil Ihrer Folgen-Liste hinzu.",
    description: "Public profile: followDescription",
  },
  "userProfile.footer": {
    message: "Offene Bücher. Klarere Finanzen. Mit Beancount.",
    description: "Public profile: footer",
  },
  "userProfile.openLedgerName": {
    message: "Open Ledger",
    description:
      "Proper name of the Open Ledger collection; keep the name unchanged",
  },
};

export default deUserProfile;
