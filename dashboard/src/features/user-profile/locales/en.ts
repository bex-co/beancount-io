export interface TranslationEntry {
  message: string;
  description: string;
}

const enUserProfile: Record<string, TranslationEntry> = {
  "userProfile.title": {
    message: "User Profile",
    description: "Header title for user profile page",
  },
  "userProfile.followers": {
    message: "followers",
    description: "Label for followers count",
  },
  "userProfile.following": {
    message: "following",
    description: "Label for following count",
  },
  "userProfile.starredRepos": {
    message: "starred repos",
    description: "Label for starred repositories count",
  },
  "userProfile.follow": {
    message: "Follow",
    description: "Button label to follow a user",
  },
  "userProfile.unfollow": {
    message: "Unfollow",
    description: "Button label to unfollow a user",
  },
  "userProfile.recentActivity": {
    message: "Recent Activity",
    description: "Heading for recent activity section",
  },
  "userProfile.noActivity": {
    message: "No recent activity",
    description: "Message shown when user has no recent activity",
  },
  "userProfile.repositories": {
    message: "Repositories",
    description: "Heading for repositories section",
  },
  "userProfile.noRepositories": {
    message: "No repositories",
    description: "Message shown when user has no repositories",
  },
  "userProfile.joined": {
    message: "Joined",
    description: "Label for account creation date",
  },
  "userProfile.userNotFound": {
    message: "User not found",
    description: "Error title when user profile does not exist",
  },
  "userProfile.userNotFoundMessage": {
    message: "The user @{username} could not be found.",
    description: "Error message explaining user was not found",
  },
  "userProfile.followSuccess": {
    message: "Successfully followed {username}",
    description: "Success toast message after following a user",
  },
  "userProfile.unfollowSuccess": {
    message: "Successfully unfollowed {username}",
    description: "Success toast message after unfollowing a user",
  },
  "userProfile.followError": {
    message: "Failed to follow user",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.unfollowError": {
    message: "Failed to unfollow user",
    description: "Error toast message when unfollow operation fails",
  },
  "userProfile.private": {
    message: "Private",
    description: "Badge label for private repositories",
  },
  "userProfile.public": {
    message: "Public",
    description: "Badge label for public repositories",
  },
  "userProfile.updated": {
    message: "Updated",
    description: "Label prefix for last updated timestamp",
  },
  "userProfile.errorLoadingProfile": {
    message: "Error loading profile",
    description: "Error title when profile fails to load",
  },
  "userProfile.errorMessage": {
    message:
      "Something went wrong while loading this profile. Please try again later.",
    description: "Generic error message for profile loading failures",
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

export default enUserProfile;
