export interface TranslationEntry {
  message: string;
  description: string;
}

const enUserProfile: Record<string, TranslationEntry> = {
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
    message: "Ledgers",
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
    message: "Ledgers",
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
    message: "Explore accounts, transactions, and financial reports.",
    description: "Public profile: ledgerDescription",
  },
  "userProfile.browseDescription": {
    message: "Find a ledger. Follow the numbers.",
    description: "Public profile: browseDescription",
  },
  "userProfile.searchLedgers": {
    message: "Search ledgers…",
    description: "Public profile: searchLedgers",
  },
  "userProfile.clearSearch": {
    message: "Clear search",
    description: "Public profile: clearSearch",
  },
  "userProfile.sortLedgers": {
    message: "Sort ledgers",
    description: "Public profile: sortLedgers",
  },
  "userProfile.recentlyUpdated": {
    message: "Recently updated",
    description: "Public profile: recentlyUpdated",
  },
  "userProfile.nameAZ": {
    message: "Name (A–Z)",
    description: "Public profile: nameAZ",
  },
  "userProfile.noMatches": {
    message: "No ledgers match your search. Try another name or keyword.",
    description: "Public profile: noMatches",
  },
  "userProfile.results": {
    message: "Showing {shown} of {total} ledgers",
    description: "Public profile: results",
  },
  "userProfile.showMoreLedgers": {
    message: "Show more ledgers",
    description: "Public profile: showMoreLedgers",
  },
  "userProfile.newToBeancount": {
    message: "New to Beancount?",
    description: "Public profile: newToBeancount",
  },
  "userProfile.startExample": {
    message: "Start with an example",
    description: "Public profile: startExample",
  },
  "userProfile.exampleDescription": {
    message:
      "Get a feel for the books. Explore a sample ledger with accounts, transactions, and reports.",
    description: "Public profile: exampleDescription",
  },
  "userProfile.openExample": {
    message: "Explore the example",
    description: "Public profile: openExample",
  },
  "userProfile.showLessActivity": {
    message: "Show less activity",
    description: "Public profile: showLessActivity",
  },
  "userProfile.showAllActivity": {
    message: "Show all activity",
    description: "Public profile: showAllActivity",
  },
  "userProfile.linkCopied": {
    message: "Profile link copied",
    description: "Public profile: linkCopied",
  },
  "userProfile.copyLinkError": {
    message: "Could not copy the link. You can copy it from your address bar.",
    description: "Public profile: copyLinkError",
  },
  "userProfile.tryAgain": {
    message: "Try again",
    description: "Public profile: tryAgain",
  },
  "userProfile.collectionLabel": {
    message: "A collection of open books",
    description: "Public profile: collectionLabel",
  },
  "userProfile.collectionDescription": {
    message:
      "Real-world finances, open for exploration. Browse company books and practical examples to see Beancount in action.",
    description: "Public profile: collectionDescription",
  },
  "userProfile.copyLink": {
    message: "Copy link",
    description: "Public profile: copyLink",
  },
  "userProfile.followDescription": {
    message: "Add this profile to your following list.",
    description: "Public profile: followDescription",
  },
  "userProfile.footer": {
    message: "Open books. Clearer finances. Powered by Beancount.",
    description: "Public profile: footer",
  },
  "userProfile.openLedgerName": {
    message: "Open Ledger",
    description:
      "Proper name of the Open Ledger collection; keep the name unchanged",
  },
};

export default enUserProfile;
