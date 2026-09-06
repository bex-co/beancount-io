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
    message: "دفترها",
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
    message: "دفترها",
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
    message: "انجمن",
    description: "Public profile: community",
  },
  "userProfile.ledgerDescription": {
    message: "حساب‌ها، تراکنش‌ها و گزارش‌های مالی را بررسی کنید.",
    description: "Public profile: ledgerDescription",
  },
  "userProfile.browseDescription": {
    message: "دفتری پیدا کنید و اعداد را دنبال کنید.",
    description: "Public profile: browseDescription",
  },
  "userProfile.searchLedgers": {
    message: "جستجوی دفترها…",
    description: "Public profile: searchLedgers",
  },
  "userProfile.clearSearch": {
    message: "پاک کردن جستجو",
    description: "Public profile: clearSearch",
  },
  "userProfile.sortLedgers": {
    message: "مرتب‌سازی دفترها",
    description: "Public profile: sortLedgers",
  },
  "userProfile.recentlyUpdated": {
    message: "به‌تازگی به‌روزشده",
    description: "Public profile: recentlyUpdated",
  },
  "userProfile.nameAZ": {
    message: "نام (A–Z)",
    description: "Public profile: nameAZ",
  },
  "userProfile.noMatches": {
    message:
      "دفتری مطابق جستجوی شما یافت نشد. نام یا کلیدواژه دیگری را امتحان کنید.",
    description: "Public profile: noMatches",
  },
  "userProfile.results": {
    message: "نمایش {shown} از {total} دفتر",
    description: "Public profile: results",
  },
  "userProfile.showMoreLedgers": {
    message: "نمایش دفترهای بیشتر",
    description: "Public profile: showMoreLedgers",
  },
  "userProfile.newToBeancount": {
    message: "تازه با Beancount آشنا شده‌اید؟",
    description: "Public profile: newToBeancount",
  },
  "userProfile.startExample": {
    message: "با یک نمونه شروع کنید",
    description: "Public profile: startExample",
  },
  "userProfile.exampleDescription": {
    message:
      "با ساختار دفترها آشنا شوید. یک دفتر نمونه با حساب‌ها، تراکنش‌ها و گزارش‌ها را بررسی کنید.",
    description: "Public profile: exampleDescription",
  },
  "userProfile.openExample": {
    message: "بررسی نمونه",
    description: "Public profile: openExample",
  },
  "userProfile.showLessActivity": {
    message: "نمایش فعالیت کمتر",
    description: "Public profile: showLessActivity",
  },
  "userProfile.showAllActivity": {
    message: "نمایش همه فعالیت‌ها",
    description: "Public profile: showAllActivity",
  },
  "userProfile.linkCopied": {
    message: "پیوند نمایه کپی شد",
    description: "Public profile: linkCopied",
  },
  "userProfile.copyLinkError": {
    message: "کپی پیوند ممکن نشد. می‌توانید آن را از نوار نشانی کپی کنید.",
    description: "Public profile: copyLinkError",
  },
  "userProfile.tryAgain": {
    message: "تلاش دوباره",
    description: "Public profile: tryAgain",
  },
  "userProfile.collectionLabel": {
    message: "مجموعه‌ای از دفترهای باز",
    description: "Public profile: collectionLabel",
  },
  "userProfile.collectionDescription": {
    message:
      "امور مالی واقعی، آماده بررسی. دفترهای شرکت‌ها و نمونه‌های کاربردی را ببینید تا با Beancount در عمل آشنا شوید.",
    description: "Public profile: collectionDescription",
  },
  "userProfile.copyLink": {
    message: "کپی پیوند",
    description: "Public profile: copyLink",
  },
  "userProfile.followDescription": {
    message: "این نمایه را به فهرست دنبال‌شوندگان خود اضافه کنید.",
    description: "Public profile: followDescription",
  },
  "userProfile.footer": {
    message: "دفترهای باز. امور مالی شفاف‌تر. با Beancount.",
    description: "Public profile: footer",
  },
  "userProfile.openLedgerName": {
    message: "Open Ledger",
    description:
      "Proper name of the Open Ledger collection; keep the name unchanged",
  },
};

export default faUserProfile;
