export interface TranslationEntry {
  message: string;
  description: string;
}

const faUserSettings: Record<string, TranslationEntry> = {
  "userSettings.accessUntil": {
    message: "دسترسی تا",
    description: "Label for access remaining until date",
  },
  "userSettings.accountDeleted": {
    message: "حساب با موفقیت حذف شد",
    description: "Success message when account is deleted",
  },
  "userSettings.accountSettings": {
    message: "حساب",
    description: "Section header for account settings",
  },
  "userSettings.addNewKey": {
    message: "افزودن کلید جدید",
    description: "Button text to add new key",
  },
  "userSettings.added": {
    message: "افزوده شده",
    description: "Label for when key was added",
  },
  "userSettings.allDocumentsAndAttachments": {
    message: "تمام اسناد و پیوست‌های بارگذاری شده",
    description: "Item in delete account list",
  },
  "userSettings.allLedgersAndTransactions": {
    message: "تمام دفاتر و تاریخچه تراکنش‌های شما",
    description: "Item in delete account list",
  },
  "userSettings.allPreferencesAndSettings": {
    message: "تمام ترجیحات و تنظیمات",
    description: "Item in delete account list",
  },
  "userSettings.allTransactionsAndRecords": {
    message: "تمام تراکنش‌ها و سوابق",
    description: "Item in delete account list",
  },
  "userSettings.appSettings": {
    message: "تنظیمات برنامه",
    description: "Section header for application settings",
  },
  "userSettings.appearance": {
    message: "ظاهر",
    description: "Appearance settings section label",
  },
  "userSettings.cancelSubscription": {
    message: "لغو اشتراک",
    description: "Button text to cancel subscription",
  },
  "userSettings.cancelSubscriptionDescription": {
    message:
      "آیا مطمئن هستید که می‌خواهید اشتراک خود را لغو کنید؟ شما تا پایان دوره فعلی صورت‌حساب به دسترسی ادامه خواهید داد.",
    description: "Confirmation dialog description for canceling subscription",
  },
  "userSettings.cancelSubscriptionTitle": {
    message: "لغو اشتراک؟",
    description: "Confirmation dialog title for canceling subscription",
  },
  "userSettings.canceling": {
    message: "در حال لغو...",
    description: "Button text while canceling subscription",
  },
  "userSettings.cannotBeUndone": {
    message: "این عملیات قابل بازگشت نیست.",
    description: "Warning that action is irreversible",
  },
  "userSettings.changeLanguage": {
    message: "تغییر",
    description: "Button to change language",
  },
  "userSettings.changeName": {
    message: "تغییر نام",
    description: "Dialog title for changing name",
  },
  "userSettings.changeUsername": {
    message: "تغییر نام کاربری",
    description: "Dialog title for changing username",
  },
  "userSettings.confirmCancel": {
    message: "بله، اشتراک را لغو کنید",
    description: "Button text to confirm subscription cancellation",
  },
  "userSettings.createKey": {
    message: "ایجاد کلید",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "ایجاد کلید API جدید",
    description: "Dialog title for creating API key",
  },
  "userSettings.createNewApiKeyDescription": {
    message: "یک کلید عمومی جدید برای احراز هویت با API Beancount اضافه کنید.",
    description: "Dialog description for creating API key",
  },
  "userSettings.createNewKey": {
    message: "ایجاد کلید جدید",
    description: "Button text to create new key",
  },
  "userSettings.creating": {
    message: "در حال ایجاد...",
    description: "Button text while creating key",
  },
  "userSettings.currentLanguage": {
    message: "زبان",
    description: "Label showing current language selection",
  },
  "userSettings.currentPeriodEnds": {
    message: "پایان دوره فعلی",
    description: "Label for subscription period end date",
  },
  "userSettings.currentVersion": {
    message: "نسخه",
    description: "Label showing current app version",
  },
  "userSettings.customizeAppearance": {
    message: "سفارشی‌سازی ظاهر و احساس برنامه",
    description: "Description for appearance settings",
  },
  "userSettings.dangerZone": {
    message: "منطقه خطر",
    description: "Section title for dangerous account actions",
  },
  "userSettings.dark": {
    message: "تیره",
    description: "Dark theme option",
  },
  "userSettings.deleteAccount": {
    message: "حذف حساب",
    description: "Button or menu item to delete user account",
  },
  "userSettings.deleteAccountAlertCancel": {
    message: "لغو",
    description: "Cancel button in account deletion dialog",
  },
  "userSettings.deleteAccountAlertConfirm": {
    message: "حذف حساب",
    description: "Confirm button in account deletion dialog",
  },
  "userSettings.deleteAccountAlertMsg": {
    message:
      "آیا مطمئن هستید که می‌خواهید حساب خود را حذف کنید؟ این عملیات قابل بازگشت نیست و تمام داده‌های شما به‌طور دائمی حذف خواهند شد.",
    description: "Warning message in account deletion confirmation dialog",
  },
  "userSettings.deleteAccountConfirmMessage": {
    message: 'برای تأیید، نام کاربری خود "{username}" را در زیر تایپ کنید:',
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPhrase": {
    message: "sudo delete my account",
    description: "Exact phrase user must type to confirm deletion",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "نام کاربری خود را وارد کنید",
    description: "Placeholder text for deletion confirmation input",
  },
  "userSettings.deleteAccountConfirmTitle": {
    message: "تأیید حذف حساب",
    description: "Title of account deletion confirmation step",
  },
  "userSettings.deleteAccountDescription": {
    message: "حذف دائمی حساب و داده‌ها",
    description: "Description of what account deletion does",
  },
  "userSettings.deleteAccountDialogDescription": {
    message:
      "این عملیات قابل بازگشت نیست. حساب شما و تمام داده‌هایتان از سرورهای ما به‌طور دائمی حذف خواهند شد.",
    description: "Detailed warning in delete account dialog",
  },
  "userSettings.deleteAccountQuestion": {
    message: "حذف حساب؟",
    description: "Dialog title confirming account deletion",
  },
  "userSettings.deleteAccountWarning": {
    message:
      "حذف دائمی حساب و تمام داده‌های مرتبط. این عملیات قابل بازگشت نیست.",
    description: "Warning text for account deletion",
  },
  "userSettings.deleteKey": {
    message: "حذف کلید",
    description: "Button text to delete key",
  },
  "userSettings.deleteSshKey": {
    message: "حذف کلید SSH",
    description: "Dialog title for deleting SSH key",
  },
  "userSettings.deleteSshKeyConfirmation": {
    message: "آیا مطمئن هستید که می‌خواهید این کلید را حذف کنید",
    description: "Confirmation message for deleting SSH key",
  },
  "userSettings.deletingKey": {
    message: "در حال حذف...",
    description: "Button text while deleting key",
  },
  "userSettings.enterNewName": {
    message: "نام خود را در زیر وارد کنید",
    description: "Instructions in change name dialog",
  },
  "userSettings.enterNewUsername": {
    message: "نام کاربری جدید خود را در زیر وارد کنید",
    description: "Instructions in change username dialog",
  },
  "userSettings.enterNewUsernamePlaceholder": {
    message: "نام کاربری جدید را وارد کنید",
    description: "Placeholder for new username input",
  },
  "userSettings.errorCreatingKey": {
    message: "خطا در ایجاد کلید",
    description: "Error title when key creation fails",
  },
  "userSettings.errorLoadingSettings": {
    message: "خطا در بارگذاری تنظیمات",
    description: "Error message when settings fail to load",
  },
  "userSettings.failedToCancelSubscription": {
    message: "خطا در لغو اشتراک",
    description: "Error message when canceling subscription fails",
  },
  "userSettings.resumeSubscription": {
    message: "از سرگیری اشتراک",
    description: "Button text to resume a subscription scheduled to cancel",
  },
  "userSettings.resumeSubscriptionTitle": {
    message: "[TODO] Resume Subscription?",
    description: "Confirmation dialog title for resuming subscription",
  },
  "userSettings.resumeSubscriptionDescription": {
    message:
      "[TODO] Are you sure you want to resume your subscription? Your subscription will continue to renew automatically and you will be billed again at the end of your current billing period.",
    description: "Confirmation dialog description for resuming subscription",
  },
  "userSettings.confirmResume": {
    message: "[TODO] Yes, Resume Subscription",
    description: "Button text to confirm subscription resumption",
  },
  "userSettings.resuming": {
    message: "در حال از سرگیری...",
    description: "Button text while resuming subscription",
  },
  "userSettings.subscriptionResumedSuccess": {
    message: "اشتراک با موفقیت از سر گرفته شد",
    description: "Success message after resuming subscription",
  },
  "userSettings.failedToResumeSubscription": {
    message: "خطا در از سرگیری اشتراک",
    description: "Error message when resuming subscription fails",
  },
  "userSettings.failedToCreateCheckoutSession": {
    message: "ایجاد جلسه پرداخت ناموفق بود. لطفاً دوباره تلاش کنید.",
    description: "Error message when creating checkout session fails",
  },
  "userSettings.failedToCreateKey": {
    message: "ایجاد کلید ناموفق بود. لطفاً دوباره تلاش کنید.",
    description: "Error message when key creation fails",
  },
  "userSettings.failedToDeleteAccount": {
    message: "حذف حساب ناموفق بود",
    description: "Error message when account deletion fails",
  },
  "userSettings.failedToLoadKeys": {
    message: "بارگذاری کلیدها ناموفق بود",
    description: "Error title when keys fail to load",
  },
  "userSettings.failedToLoadKeysDescription": {
    message:
      "خطایی در بارگذاری کلیدهای SSH شما رخ داد. لطفاً دوباره تلاش کنید.",
    description: "Error description when keys fail to load",
  },
  "userSettings.failedToLoadSettings": {
    message: "بارگذاری تنظیمات ناموفق بود",
    description: "Error heading when settings page fails",
  },
  "userSettings.failedToLoadSubscription": {
    message: "بارگذاری وضعیت اشتراک ناموفق بود",
    description: "Error message when subscription fails to load",
  },
  "userSettings.firstName": {
    message: "نام",
    description: "Label for first name field",
  },
  "userSettings.followingWillBeDeleted": {
    message: "موارد زیر به‌طور دائمی حذف خواهند شد:",
    description: "Heading before list of items to be deleted",
  },
  "userSettings.general": {
    message: "عمومی",
    description: "General settings section label",
  },
  "userSettings.helpCenter": {
    message: "مرکز کمک",
    description: "Link to help center",
  },
  "userSettings.inputKeyword": {
    message: "لطفاً کلمه کلیدی وارد کنید",
    description: "Placeholder prompting user to enter keyword",
  },
  "userSettings.invite": {
    message: "دعوت",
    description: "Invite action button",
  },
  "userSettings.inviteFriends": {
    message: "دعوت دوستان",
    description: "Button or section title for inviting friends",
  },
  "userSettings.inviteSummary": {
    message:
      "این ابزار حرفه‌ای مدیریت مالی را به اشتراک بگذارید و به دیگران کمک کنید تا آینده مالی خود را بسازند.",
    description: "Summary description of invite feature",
  },
  "userSettings.irreversibleActions": {
    message: "عملیات‌های غیرقابل بازگشت و مخرب",
    description: "Description for danger zone",
  },
  "userSettings.keyTitle": {
    message: "عنوان کلید",
    description: "Label for key title field",
  },
  "userSettings.keyTitleDescription": {
    message: "یک نام توصیفی برای این کلید تا بعداً بتوانید آن را شناسایی کنید.",
    description: "Description for key title field",
  },
  "userSettings.keyTitlePlaceholder": {
    message: "مثلاً کلید توسعه من",
    description: "Placeholder for key title input",
  },
  "userSettings.lastName": {
    message: "نام خانوادگی",
    description: "Label for last name field",
  },
  "userSettings.lastUsed3Months": {
    message: "آخرین استفاده در ۳ ماه گذشته",
    description: "Status when key was used within last 3 months",
  },
  "userSettings.lastUsed3Weeks": {
    message: "آخرین استفاده در ۳ هفته گذشته",
    description: "Status when key was used within last 3 weeks",
  },
  "userSettings.lastUsedLongAgo": {
    message: "آخرین استفاده بیش از ۳ ماه پیش",
    description: "Status when key was used long ago",
  },
  "userSettings.lastUsedWeek": {
    message: "آخرین استفاده در هفته گذشته",
    description: "Status when key was used within last week",
  },
  "userSettings.light": {
    message: "روشن",
    description: "Light theme option",
  },
  "userSettings.loadingAccountInformation": {
    message: "در حال بارگذاری اطلاعات حساب شما...",
    description: "Loading message for account information",
  },
  "userSettings.loadingAccountOptions": {
    message: "در حال بارگذاری گزینه‌های حساب...",
    description: "Loading message for account options",
  },
  "userSettings.loadingSessionInformation": {
    message: "در حال بارگذاری اطلاعات نشست...",
    description: "Loading message for session data",
  },
  "userSettings.loadingSshKeys": {
    message: "در حال بارگذاری کلیدهای SSH شما...",
    description: "Loading state message for SSH keys",
  },
  "userSettings.loadingSubscriptionDetails": {
    message: "در حال بارگذاری جزئیات اشتراک...",
    description: "Loading message for subscription info",
  },
  "userSettings.loadingThemePreferences": {
    message: "در حال بارگذاری ترجیحات تم...",
    description: "Loading message for theme settings",
  },
  "userSettings.manage": {
    message: "مدیریت",
    description: "Button to manage subscription",
  },
  "userSettings.manageActiveSession": {
    message: "مدیریت نشست فعال خود",
    description: "Description for session section",
  },
  "userSettings.manageBilling": {
    message: "مدیریت صورت‌حساب",
    description: "Button text to manage billing portal",
  },
  "userSettings.manageSubscription": {
    message: "مدیریت اشتراک و صورتحساب خود",
    description: "Description for subscription section",
  },
  "userSettings.monthly": {
    message: "ماهانه",
    description: "Monthly frequency option",
  },
  "userSettings.name": {
    message: "نام",
    description: "Label for combined name field",
  },
  "userSettings.neverUsed": {
    message: "هرگز استفاده نشده",
    description: "Status when key has never been used",
  },
  "userSettings.newSshKey": {
    message: "کلید SSH جدید",
    description: "Button text to create new SSH key",
  },
  "userSettings.noActiveSubscription": {
    message: "اشتراک فعالی وجود ندارد",
    description: "Label when user has no subscription",
  },
  "userSettings.noContactPermission": {
    message: "مجوز دسترسی به مخاطبین وجود ندارد.",
    description: "Error when contacts permission is denied",
  },
  "userSettings.noSshKeys": {
    message: "کلید SSH وجود ندارد",
    description: "Empty state title when no SSH keys exist",
  },
  "userSettings.noSshKeysDescription": {
    message:
      "هنوز کلید SSH ایجاد نکرده‌اید. اولین کلید خود را ایجاد کنید تا دسترسی امن به مخزن را آغاز کنید.",
    description: "Empty state description for SSH keys",
  },
  "userSettings.notSet": {
    message: "تنظیم نشده",
    description: "Placeholder when a field has no value",
  },
  "userSettings.off": {
    message: "خاموش",
    description: "Off state for toggles or subscriptions",
  },
  "userSettings.opening": {
    message: "در حال باز کردن...",
    description: "Button text while opening billing portal",
  },
  "userSettings.processing": {
    message: "در حال پردازش...",
    description: "Button text while processing checkout",
  },
  "userSettings.publicKey": {
    message: "کلید عمومی",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      'محتوای کلید عمومی خود را اینجا جایگذاری کنید. باید با "-----BEGIN PUBLIC KEY-----" شروع شود.',
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message:
      "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "کلید عمومی الزامی است",
    description: "Validation error for missing public key",
  },
  "userSettings.recommend": {
    message:
      "می‌خواهم این ابزار حرفه‌ای مدیریت مالی را که به من در سازماندهی امور مالی‌ام کمک کرده است به اشتراک بگذارم.",
    description: "Pre-written recommendation message for sharing",
  },
  "userSettings.referral": {
    message: "معرفی",
    description: "Referral program label",
  },
  "userSettings.renewsOn": {
    message: "تمدید در",
    description: "Label for subscription renewal date",
  },
  "userSettings.reviewApp": {
    message: "دوستش دارید؟ نظر بدهید :)",
    description: "Prompt to review the app",
  },
  "userSettings.rewardDetail": {
    message:
      "این ابزار حرفه‌ای مدیریت مالی را به اشتراک بگذارید و به دیگران کمک کنید تا آینده مالی خود را بسازند.",
    description: "Detailed description of referral rewards",
  },
  "userSettings.rewardSummary": {
    message: "دعوت دوستان",
    description: "Summary of referral rewards",
  },
  "userSettings.selectColorTheme": {
    message: "تم رنگی مورد نظر خود را انتخاب کنید",
    description: "Label for theme selection",
  },
  "userSettings.selectLanguage": {
    message: "زبان مورد نظر خود را انتخاب کنید",
    description: "Label for language selection",
  },
  "userSettings.session": {
    message: "نشست",
    description: "Session management section title",
  },
  "userSettings.settingsErrorMessage": {
    message:
      "خطایی در بارگذاری تنظیمات شما رخ داد. لطفاً اتصال خود را بررسی کرده و دوباره تلاش کنید.",
    description: "Detailed error message for settings loading failure",
  },
  "userSettings.shareError": {
    message: "اشتراک‌گذاری ناموفق",
    description: "Error message when sharing fails",
  },
  "userSettings.signOutDescription": {
    message: "خروج از حساب خود و پاک کردن نشست.",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "کلیدهای SSH",
    description: "Page title for SSH keys",
  },
  "userSettings.subscribe": {
    message: "گزارش ایمیل",
    description: "Email report subscription feature label",
  },
  "userSettings.subscription": {
    message: "اشتراک",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceled": {
    message: "اشتراک لغو شده است",
    description: "Message when subscription is already canceled",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "اشتراک با موفقیت لغو شد",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "اشتراک با موفقیت ارتقا یافت",
    description: "Success message after upgrading subscription",
  },
  "userSettings.paymentRequiresAuth": {
    message:
      "پرداخت شما نیاز به احراز هویت اضافی دارد. لطفاً ایمیل یا صادرکننده کارت خود را بررسی کنید.",
    description:
      "Message when 3DS authentication is needed for subscription upgrade",
  },
  "userSettings.supportSettings": {
    message: "پشتیبانی",
    description: "Section header for support settings",
  },
  "userSettings.system": {
    message: "سیستم",
    description: "System theme option",
  },
  "userSettings.testMode": {
    message: "حالت آزمایشی",
    description: "Label indicating Stripe is in test/development mode",
  },
  "userSettings.thanksShare": {
    message: "از اشتراک‌گذاری متشکریم!!",
    description: "Thank you message after sharing",
  },
  "userSettings.theme": {
    message: "تم",
    description: "Label for theme selection",
  },
  "userSettings.themeDark": {
    message: "تیره",
    description: "Dark theme option",
  },
  "userSettings.themeLight": {
    message: "روشن",
    description: "Light theme option",
  },
  "userSettings.themeSystem": {
    message: "سیستم",
    description: "System theme option (follows OS preference)",
  },
  "userSettings.titleMaxLength": {
    message: "عنوان باید کمتر از ۱۰۰ کاراکتر باشد",
    description: "Validation error for title too long",
  },
  "userSettings.titleRequired": {
    message: "عنوان الزامی است",
    description: "Validation error for missing title",
  },
  "userSettings.trialProPlan": {
    message: "ارتقا به پریمیوم",
    description: "Button text for premium subscription upgrade",
  },
  "userSettings.trialProPlanComingSoon": {
    message: "قابلیت طرح پریمیوم آزمایشی به‌زودی!",
    description: "Toast message when trial Pro plan is clicked",
  },
  "userSettings.unableToOpenBillingPortal": {
    message:
      "امکان باز کردن پورتال صورت‌حساب وجود ندارد. لطفاً بعداً دوباره تلاش کنید.",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "طرح نامشخص",
    description: "Fallback when plan name is not available",
  },
  "userSettings.updateFailed": {
    message: "به‌روزرسانی اشتراک ناموفق",
    description: "Error message when update fails",
  },
  "userSettings.updateSuccess": {
    message: "اشتراک با موفقیت به‌روزرسانی شد",
    description: "Success message after updating subscription",
  },
  "userSettings.upgradeToProDescription": {
    message:
      "برای دسترسی به امکانات پریمیوم و دسترسی نامحدود، به نسخه پرو ارتقا یابید.",
    description: "Description encouraging subscription upgrade",
  },
  "userSettings.userProfile": {
    message: "پروفایل کاربر",
    description: "Section title for user profile settings",
  },
  "userSettings.usernameUpdatedSuccess": {
    message: "نام کاربری با موفقیت به‌روزرسانی شد",
    description: "Success message after updating username",
  },
  "userSettings.weekly": {
    message: "هفتگی",
    description: "Weekly frequency option",
  },
  "userSettings.yesDeleteMyAccount": {
    message: "بله، حساب من را حذف کن",
    description: "Confirmation button for account deletion",
  },
  "userSettings.yourAccountInformation": {
    message: "اطلاعات حساب شما",
    description: "Description for user profile section",
  },
  "userSettings.aiCfoUsage": {
    message: "AI Tokens",
    description: "Label for AI CFO usage section",
  },
  "userSettings.aiCfoUsageDescription": {
    message: "Monthly AI token usage for your current billing period",
    description: "Description for AI CFO usage section",
  },
  "userSettings.aiCfoUsageCount": {
    message: "{used} / {max} tokens used this month",
    description: "AI CFO usage count display",
  },
  "userSettings.aiCfoUsageUnlimited": {
    message: "{used} tokens used this month (Unlimited)",
    description: "AI CFO usage display for unlimited tier",
  },
  "userSettings.currentPlan": {
    message: "Current Plan",
    description: "Badge label for the user's current subscription tier",
  },
  "userSettings.freePlan": {
    message: "Free Plan",
    description: "Display name for the free tier",
  },
  "userSettings.enterprisePlan": {
    message: "Enterprise",
    description: "Display name for the enterprise tier",
  },
  "userSettings.customPricing": {
    message: "Custom pricing",
    description: "Price label for enterprise tier",
  },
  "userSettings.usage": {
    message: "Usage",
    description: "Section header for usage overview",
  },
  "userSettings.ledgers": {
    message: "Ledgers",
    description: "Label for ledger usage metric",
  },
  "userSettings.ledgerUsageCount": {
    message: "{used} / {max} ledgers",
    description: "Ledger usage count display",
  },
  "userSettings.collaboratorLimit": {
    message: "Up to {max} collaborators per ledger",
    description: "Collaborator limit description",
  },
  "userSettings.collaboratorLimitUnlimited": {
    message: "Unlimited collaborators per ledger",
    description: "Collaborator limit for unlimited tiers",
  },
  "userSettings.upgradeYourPlan": {
    message: "Upgrade Your Plan",
    description: "Section header for upgrade tier cards",
  },
  "userSettings.billing": {
    message: "Billing",
    description: "Section header for billing management",
  },
  "userSettings.unlimited": {
    message: "Unlimited",
    description: "Label for unlimited usage",
  },
  "userSettings.perMonth": {
    message: "/month",
    description: "Price interval suffix",
  },
  "userSettings.planFeatureSummary": {
    message:
      "{tokens} AI tokens · {ledgers} ledgers · {collaborators} collaborators",
    description: "Summary of plan features in the current plan banner",
  },
};

export default faUserSettings;
