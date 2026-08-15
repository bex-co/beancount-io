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
    message: "Repositories",
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

export default deUserProfile;
