export interface TranslationEntry {
  message: string;
  description: string;
}

const caUserProfile: Record<string, TranslationEntry> = {
  "userProfile.title": {
    message: "Perfil d'usuari",
    description: "Header title for user profile page",
  },
  "userProfile.errorLoadingProfile": {
    message: "Error en carregar el perfil",
    description: "Error title when profile fails to load",
  },
  "userProfile.errorMessage": {
    message:
      "Alguna cosa ha anat malament en carregar aquest perfil. Si us plau, torneu-ho a intentar més tard.",
    description: "Generic error message for profile loading failures",
  },
  "userProfile.followError": {
    message: "No s'ha pogut seguir l'usuari",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.followSuccess": {
    message: "Heu seguit {username} correctament",
    description: "Success toast message after following a user",
  },
  "userProfile.followers": {
    message: "seguidors",
    description: "Label for followers count",
  },
  "userProfile.following": {
    message: "seguint",
    description: "Label for following count",
  },
  "userProfile.joined": {
    message: "Unit",
    description: "Label for account creation date",
  },
  "userProfile.noActivity": {
    message: "Sense activitat recent",
    description: "Message shown when user has no recent activity",
  },
  "userProfile.noRepositories": {
    message: "Sense repositoris",
    description: "Message shown when user has no repositories",
  },
  "userProfile.private": {
    message: "Privat",
    description: "Badge label for private repositories",
  },
  "userProfile.public": {
    message: "Públic",
    description: "Badge label for public repositories",
  },
  "userProfile.recentActivity": {
    message: "Activitat Recent",
    description: "Heading for recent activity section",
  },
  "userProfile.repositories": {
    message: "Repositoris",
    description: "Heading for repositories section",
  },
  "userProfile.follow": {
    message: "Segueix",
    description: "Button label to follow a user",
  },
  "userProfile.starredRepos": {
    message: "repositoris marcats amb estrella",
    description: "Label for starred repositories count",
  },
  "userProfile.unfollowError": {
    message: "No s'ha pogut deixar de seguir l'usuari",
    description: "Error toast message when unfollow operation fails",
  },
  "userProfile.unfollowSuccess": {
    message: "Heu deixat de seguir {username} correctament",
    description: "Success toast message after unfollowing a user",
  },
  "userProfile.unfollow": {
    message: "Deixa de seguir",
    description: "Button label to unfollow a user",
  },
  "userProfile.updated": {
    message: "Actualitzat",
    description: "Label prefix for last updated timestamp",
  },
  "userProfile.userNotFound": {
    message: "Usuari no trobat",
    description: "Error title when user profile does not exist",
  },
  "userProfile.userNotFoundMessage": {
    message: "L'usuari @{username} no s'ha pogut trobar.",
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

export default caUserProfile;
