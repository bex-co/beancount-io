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
    message: "Repozitáre",
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

export default skUserProfile;
