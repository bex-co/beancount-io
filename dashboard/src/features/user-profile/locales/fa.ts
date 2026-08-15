export interface TranslationEntry {
  message: string;
  description: string;
}

const faUserProfile: Record<string, TranslationEntry> = {
  "userProfile.errorLoadingProfile": {
    message: "خطا در بارگذاری پروفایل",
    description: "Error title when profile fails to load",
  },
  "userProfile.followError": {
    message: "دنبال کردن کاربر ناموفق بود",
    description: "Error toast message when follow operation fails",
  },
  "userProfile.followSuccess": {
    message: "شما {username} را دنبال کردید",
    description: "Success toast message after following a user",
  },
  "userProfile.joined": {
    message: "پیوسته",
    description: "Label for account creation date",
  },
  "userProfile.noActivity": {
    message: "فعالیت اخیری وجود ندارد",
    description: "Message shown when user has no recent activity",
  },
  "userProfile.noRepositories": {
    message: "مخزنی وجود ندارد",
    description: "Message shown when user has no repositories",
  },
  "userProfile.private": {
    message: "خصوصی",
    description: "Badge label for private repositories",
  },
  "userProfile.public": {
    message: "عمومی",
    description: "Badge label for public repositories",
  },
  "userProfile.recentActivity": {
    message: "فعالیت اخیر",
    description: "Heading for recent activity section",
  },
  "userProfile.repositories": {
    message: "مخزن‌ها",
    description: "Heading for repositories section",
  },
  "userProfile.follow": {
    message: "دنبال کردن",
    description: "Button label to follow a user",
  },
  "userProfile.unfollowError": {
    message: "لغو دنبال کردن کاربر ناموفق بود",
    description: "Error toast message when unfollow operation fails",
  },
  "userProfile.unfollowSuccess": {
    message: "دنبال کردن {username} را لغو کردید",
    description: "Success toast message after unfollowing a user",
  },
  "userProfile.unfollow": {
    message: "لغو دنبال کردن",
    description: "Button label to unfollow a user",
  },
  "userProfile.updated": {
    message: "به‌روزرسانی شده",
    description: "Label prefix for last updated timestamp",
  },
  "userProfile.userNotFound": {
    message: "کاربر یافت نشد",
    description: "Error title when user profile does not exist",
  },
  "userProfile.userNotFoundMessage": {
    message: "کاربر @{username} یافت نشد.",
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

export default faUserProfile;
