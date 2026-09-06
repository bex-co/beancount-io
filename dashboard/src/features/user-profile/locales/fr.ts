export interface TranslationEntry {
  message: string;
  description: string;
}

const frUserProfile: Record<string, TranslationEntry> = {
  "userProfile.errorLoadingProfile": {
    message: "Erreur lors du chargement du profil",
    description: "Error title when profile fails to load",
  },
  "userProfile.followError": {
    message: "Impossible de suivre l'utilisateur",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.followSuccess": {
    message: "Vous suivez maintenant {username}",
    description: "Success toast message after following a user",
  },
  "userProfile.joined": {
    message: "Inscrit",
    description: "Label for account creation date",
  },
  "userProfile.noActivity": {
    message: "Aucune activité récente",
    description: "Message shown when user has no recent activity",
  },
  "userProfile.noRepositories": {
    message: "Aucun dépôt",
    description: "Message shown when user has no repositories",
  },
  "userProfile.private": {
    message: "Privé",
    description: "Badge label for private repositories",
  },
  "userProfile.public": {
    message: "Public",
    description: "Badge label for public repositories",
  },
  "userProfile.recentActivity": {
    message: "Activité Récente",
    description: "Heading for recent activity section",
  },
  "userProfile.repositories": {
    message: "Livres",
    description: "Heading for repositories section",
  },
  "userProfile.follow": {
    message: "Suivre",
    description: "Button label to follow a user",
  },
  "userProfile.unfollowError": {
    message: "Impossible de ne plus suivre l'utilisateur",
    description: "Error toast message when unfollow operation fails",
  },
  "userProfile.unfollowSuccess": {
    message: "Vous ne suivez plus {username}",
    description: "Success toast message after unfollowing a user",
  },
  "userProfile.unfollow": {
    message: "Ne plus suivre",
    description: "Button label to unfollow a user",
  },
  "userProfile.updated": {
    message: "Mis à jour",
    description: "Label prefix for last updated timestamp",
  },
  "userProfile.userNotFound": {
    message: "Utilisateur introuvable",
    description: "Error title when user profile does not exist",
  },
  "userProfile.userNotFoundMessage": {
    message: "L'utilisateur @{username} est introuvable.",
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
    message: "Livres",
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
    message: "Communauté",
    description: "Public profile: community",
  },
  "userProfile.ledgerDescription": {
    message:
      "Explorez les comptes, les transactions et les rapports financiers.",
    description: "Public profile: ledgerDescription",
  },
  "userProfile.browseDescription": {
    message: "Trouvez un livre. Suivez les chiffres.",
    description: "Public profile: browseDescription",
  },
  "userProfile.searchLedgers": {
    message: "Rechercher des livres…",
    description: "Public profile: searchLedgers",
  },
  "userProfile.clearSearch": {
    message: "Effacer la recherche",
    description: "Public profile: clearSearch",
  },
  "userProfile.sortLedgers": {
    message: "Trier les livres",
    description: "Public profile: sortLedgers",
  },
  "userProfile.recentlyUpdated": {
    message: "Mis à jour récemment",
    description: "Public profile: recentlyUpdated",
  },
  "userProfile.nameAZ": {
    message: "Nom (A–Z)",
    description: "Public profile: nameAZ",
  },
  "userProfile.noMatches": {
    message:
      "Aucun livre ne correspond à votre recherche. Essayez un autre nom ou mot-clé.",
    description: "Public profile: noMatches",
  },
  "userProfile.results": {
    message: "{shown} livres affichés sur {total}",
    description: "Public profile: results",
  },
  "userProfile.showMoreLedgers": {
    message: "Afficher plus de livres",
    description: "Public profile: showMoreLedgers",
  },
  "userProfile.newToBeancount": {
    message: "Vous découvrez Beancount ?",
    description: "Public profile: newToBeancount",
  },
  "userProfile.startExample": {
    message: "Commencez par un exemple",
    description: "Public profile: startExample",
  },
  "userProfile.exampleDescription": {
    message:
      "Découvrez le fonctionnement des livres avec un exemple contenant des comptes, des transactions et des rapports.",
    description: "Public profile: exampleDescription",
  },
  "userProfile.openExample": {
    message: "Explorer l’exemple",
    description: "Public profile: openExample",
  },
  "userProfile.showLessActivity": {
    message: "Réduire l’activité",
    description: "Public profile: showLessActivity",
  },
  "userProfile.showAllActivity": {
    message: "Afficher toute l’activité",
    description: "Public profile: showAllActivity",
  },
  "userProfile.linkCopied": {
    message: "Lien du profil copié",
    description: "Public profile: linkCopied",
  },
  "userProfile.copyLinkError": {
    message:
      "Impossible de copier le lien. Vous pouvez le copier dans la barre d’adresse.",
    description: "Public profile: copyLinkError",
  },
  "userProfile.tryAgain": {
    message: "Réessayer",
    description: "Public profile: tryAgain",
  },
  "userProfile.collectionLabel": {
    message: "Une collection de livres ouverts",
    description: "Public profile: collectionLabel",
  },
  "userProfile.collectionDescription": {
    message:
      "Des finances réelles à explorer librement. Parcourez des livres d’entreprises et des exemples pratiques pour découvrir Beancount en action.",
    description: "Public profile: collectionDescription",
  },
  "userProfile.copyLink": {
    message: "Copier le lien",
    description: "Public profile: copyLink",
  },
  "userProfile.followDescription": {
    message: "Ajoutez ce profil à votre liste d’abonnements.",
    description: "Public profile: followDescription",
  },
  "userProfile.footer": {
    message:
      "Des livres ouverts. Des finances plus claires. Propulsé par Beancount.",
    description: "Public profile: footer",
  },
  "userProfile.openLedgerName": {
    message: "Open Ledger",
    description:
      "Proper name of the Open Ledger collection; keep the name unchanged",
  },
};

export default frUserProfile;
