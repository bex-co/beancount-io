export interface TranslationEntry {
  message: string;
  description: string;
}

const nlUserProfile: Record<string, TranslationEntry> = {
  "userProfile.title": {
    message: "Gebruikersprofiel",
    description: "Header title for user profile page",
  },
  "userProfile.errorLoadingProfile": {
    message: "Fout bij het laden van profiel",
    description: "Error title when profile fails to load",
  },
  "userProfile.errorMessage": {
    message:
      "Er is iets misgegaan bij het laden van dit profiel. Probeer het later opnieuw.",
    description: "Generic error message for profile loading failures",
  },
  "userProfile.followError": {
    message: "Kan gebruiker niet volgen",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.followSuccess": {
    message: "Je volgt nu {username}",
    description: "Success toast message after following a user",
  },
  "userProfile.followers": {
    message: "volgers",
    description: "Label for followers count",
  },
  "userProfile.following": {
    message: "volgend",
    description: "Label for following count",
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
    message: "Repositories",
    description: "Heading for repositories section",
  },
  "userProfile.follow": {
    message: "Volgen",
    description: "Button label to follow a user",
  },
  "userProfile.starredRepos": {
    message: "repositories met ster",
    description: "Label for starred repositories count",
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

export default nlUserProfile;
