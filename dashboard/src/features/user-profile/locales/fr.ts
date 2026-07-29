export interface TranslationEntry {
  message: string;
  description: string;
}

const frUserProfile: Record<string, TranslationEntry> = {
  "userProfile.title": {
    message: "Profil utilisateur",
    description: "Header title for user profile page",
  },
  "userProfile.errorLoadingProfile": {
    message: "Erreur lors du chargement du profil",
    description: "Error title when profile fails to load",
  },
  "userProfile.errorMessage": {
    message:
      "Une erreur s'est produite lors du chargement de ce profil. Veuillez réessayer plus tard.",
    description: "Generic error message for profile loading failures",
  },
  "userProfile.followError": {
    message: "Impossible de suivre l'utilisateur",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.followSuccess": {
    message: "Vous suivez maintenant {username}",
    description: "Success toast message after following a user",
  },
  "userProfile.followers": {
    message: "abonnés",
    description: "Label for followers count",
  },
  "userProfile.following": {
    message: "abonnements",
    description: "Label for following count",
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
    message: "Dépôts",
    description: "Heading for repositories section",
  },
  "userProfile.follow": {
    message: "Suivre",
    description: "Button label to follow a user",
  },
  "userProfile.starredRepos": {
    message: "dépôts suivis",
    description: "Label for starred repositories count",
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

export default frUserProfile;
