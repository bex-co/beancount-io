import { apiKeyTranslations } from "../pages/api-keys/translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const faUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.fa,
  "userSettings.accountDeleted": {
    message: "حساب با موفقیت حذف شد",
    description: "Success message when account is deleted",
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
  "userSettings.appearance": {
    message: "ظاهر",
    description: "Appearance settings section label",
  },
  "userSettings.cancelSubscription": {
    message: "لغو اشتراک",
    description: "Button text to cancel subscription",
  },
  "userSettings.canceling": {
    message: "در حال لغو...",
    description: "Button text while canceling subscription",
  },
  "userSettings.cannotBeUndone": {
    message: "این عملیات قابل بازگشت نیست.",
    description: "Warning that action is irreversible",
  },
  "userSettings.changeName": {
    message: "تغییر نام",
    description: "Dialog title for changing name",
  },
  "userSettings.changeUsername": {
    message: "تغییر نام کاربری",
    description: "Dialog title for changing username",
  },
  "userSettings.createKey": {
    message: "ایجاد کلید",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "ایجاد کلید SSH جدید",
    description: "Dialog title for creating an SSH public key",
  },
  "userSettings.createNewApiKeyDescription": {
    message: "یک کلید عمومی SSH جدید برای دسترسی به مخزن Git اضافه کنید.",
    description:
      "Dialog description for creating an SSH public key for Git access",
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
  "userSettings.deleteAccountConfirmMessage": {
    message: 'برای تأیید، نام کاربری خود "{username}" را در زیر تایپ کنید:',
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "نام کاربری خود را وارد کنید",
    description: "Placeholder text for deletion confirmation input",
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
    message: "اشتراک از سر گرفته شود؟",
    description: "Confirmation dialog title for resuming subscription",
  },
  "userSettings.resumeSubscriptionDescription": {
    message:
      "آیا مطمئن هستید که می‌خواهید اشتراک خود را از سر بگیرید؟ اشتراک شما همچنان به‌طور خودکار تمدید می‌شود و در پایان دوره صورتحساب فعلی دوباره از شما هزینه دریافت خواهد شد.",
    description: "Confirmation dialog description for resuming subscription",
  },
  "userSettings.confirmResume": {
    message: "بله، اشتراک را از سر بگیر",
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
  "userSettings.invite": {
    message: "دعوت",
    description: "Invite action button",
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
  "userSettings.opening": {
    message: "در حال باز کردن...",
    description: "Button text while opening billing portal",
  },
  "userSettings.publicKey": {
    message: "کلید عمومی",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      "کلید عمومی خود را اینجا جایگذاری کنید. معمولاً با ssh-ed25519 یا ssh-rsa شروع می‌شود؛ با cat ~/.ssh/id_ed25519.pub می‌توانید آن را نمایش دهید. کلیدهای عمومی PEM نیز پذیرفته می‌شوند.",
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA…",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "کلید عمومی الزامی است",
    description: "Validation error for missing public key",
  },
  "userSettings.renewsOn": {
    message: "تمدید در",
    description: "Label for subscription renewal date",
  },
  "userSettings.deferredStartAppStore": {
    message:
      "طرح App Store شما در {date} پایان می‌یابد. این طرح از همان زمان شروع می‌شود.",
    description: "A Stripe plan that starts when an App Store plan ends",
  },
  "userSettings.deferredStartGooglePlay": {
    message:
      "طرح Google Play شما در {date} پایان می‌یابد. این طرح از همان زمان شروع می‌شود.",
    description: "A Stripe plan that starts when a Google Play plan ends",
  },
  "userSettings.overlapAppStore": {
    message:
      "طرح App Store شما تا {date} ادامه دارد و هزینه این طرح امروز دریافت می‌شود.",
    description: "A Stripe plan charged today beside a running App Store plan",
  },
  "userSettings.overlapGooglePlay": {
    message:
      "طرح Google Play شما تا {date} ادامه دارد و هزینه این طرح امروز دریافت می‌شود.",
    description:
      "A Stripe plan charged today beside a running Google Play plan",
  },
  "userSettings.billedByStripe": {
    message: "پرداخت از طریق Stripe",
    description: "Billing source on the plan card: Stripe",
  },
  "userSettings.billedByAppStore": {
    message: "پرداخت از طریق App Store",
    description: "Billing source on the plan card: the App Store",
  },
  "userSettings.billedByGooglePlay": {
    message: "پرداخت از طریق Google Play",
    description: "Billing source on the plan card: Google Play",
  },
  "userSettings.appStoreManagePath": {
    message:
      "آن را در iPhone یا iPad خود مدیریت کنید: تنظیمات ← نام شما ← اشتراک‌ها.",
    description:
      "Where an App Store plan is managed; Apple has no web page for it",
  },
  "userSettings.manageOnGooglePlay": {
    message: "مدیریت در Google Play",
    description: "Link to Google Play's subscriptions page",
  },
  "userSettings.planEndsOn": {
    message: "پایان در {date}",
    description: "Plan card: a store plan that will not renew",
  },
  "userSettings.planChangesOn": {
    message: "در {date} به {plan} تغییر می‌کند",
    description: "Plan card: a store plan with a scheduled change",
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
  "userSettings.signOutDescription": {
    message: "خروج از حساب خود و پاک کردن نشست.",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "کلیدهای SSH",
    description: "Page title for SSH keys",
  },
  "userSettings.subscriptionStatus.active": {
    message: "فعال",
    description:
      "Billing badge for a subscription whose Stripe status is active: paid and current.",
  },
  "userSettings.subscriptionStatus.trialing": {
    message: "دورهٔ آزمایشی",
    description:
      "Billing badge for a subscription whose Stripe status is trialing: in a free trial.",
  },
  "userSettings.subscriptionStatus.past_due": {
    message: "سررسید گذشته",
    description:
      "Billing badge for a subscription whose Stripe status is past_due: the last renewal failed and Stripe is retrying.",
  },
  "userSettings.subscriptionStatus.unpaid": {
    message: "پرداخت‌نشده",
    description:
      "Billing badge for a subscription whose Stripe status is unpaid: Stripe stopped retrying a failed renewal.",
  },
  "userSettings.subscriptionStatus.incomplete": {
    message: "ناقص",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete: the first payment has not completed.",
  },
  "userSettings.subscriptionStatus.incomplete_expired": {
    message: "منقضی‌شده",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete_expired: the first payment never completed.",
  },
  "userSettings.subscriptionStatus.canceled": {
    message: "لغوشده",
    description:
      "Billing badge for a subscription whose Stripe status is canceled: ended.",
  },
  "userSettings.subscriptionStatus.paused": {
    message: "متوقف‌شده",
    description:
      "Billing badge for a subscription whose Stripe status is paused: paused.",
  },
  "userSettings.subscription": {
    message: "اشتراک",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "اشتراک با موفقیت لغو شد",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "اشتراک با موفقیت ارتقا یافت",
    description: "Success message after upgrading subscription",
  },
  "userSettings.system": {
    message: "سیستم",
    description: "System theme option",
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
  "userSettings.unableToOpenBillingPortal": {
    message:
      "امکان باز کردن پورتال صورت‌حساب وجود ندارد. لطفاً بعداً دوباره تلاش کنید.",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "طرح نامشخص",
    description: "Fallback when plan name is not available",
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
    message: "توکن‌های هوش مصنوعی",
    description: "Label for AI CFO usage section",
  },
  "userSettings.aiCfoUsageCount": {
    message: "{used} / {max} توکن در این ماه استفاده شده",
    description: "AI CFO usage count display",
  },
  "userSettings.aiCfoUsageUnlimited": {
    message: "{used} توکن در این ماه استفاده شده (نامحدود)",
    description: "AI CFO usage display for unlimited tier",
  },
  "userSettings.aiCfoUsageUnavailable": {
    message: "میزان استفاده در حال حاضر در دسترس نیست.",
    description: "Shown in place of AI token usage when its read fails",
  },
  "userSettings.currentPlan": {
    message: "طرح فعلی",
    description: "Badge label for the user's current subscription tier",
  },
  "userSettings.freePlan": {
    message: "طرح رایگان",
    description: "Display name for the free tier",
  },
  "userSettings.enterprisePlan": {
    message: "سازمانی",
    description: "Display name for the enterprise tier",
  },
  "userSettings.usage": {
    message: "میزان استفاده",
    description: "Section header for usage overview",
  },
  "userSettings.ledgers": {
    message: "دفاتر",
    description: "Label for ledger usage metric",
  },
  "userSettings.ledgerUsageCount": {
    message: "{used} / {max} دفتر",
    description: "Ledger usage count display",
  },
  "userSettings.billing": {
    message: "صورتحساب",
    description: "Section header for billing management",
  },
  "userSettings.unlimited": {
    message: "نامحدود",
    description: "Label for unlimited usage",
  },
  "userSettings.perMonth": {
    message: "/ماه",
    description: "Price interval suffix",
  },
  "userSettings.aiTokensPerMonth": {
    message: "{count} توکن هوش مصنوعی / ماه",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedAiTokens": {
    message: "توکن‌های هوش مصنوعی نامحدود",
    description: "Unlimited AI token allowance",
  },
  "userSettings.unlimitedLedgers": {
    message: "دفتر کل نامحدود",
    description: "Unlimited ledger allowance",
  },
  "userSettings.includedLedgers": {
    message: "{formattedCount} دفتر",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.includedLedgers_one": {
    message: "{formattedCount} دفتر",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.includedLedgers_other": {
    message: "{formattedCount} دفتر",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - plural form",
  },
  "userSettings.unlimitedDirectives": {
    message: "دستورالعمل‌های نامحدود",
    description: "Unlimited directive allowance",
  },
  "userSettings.includedDirectives": {
    message: "{count} دستورالعمل",
    description: "Directive allowance for a subscription tier",
  },
  "userSettings.unlimitedCollaborators": {
    message: "همکاران نامحدود",
    description: "Unlimited collaborator allowance",
  },
  "userSettings.collaboratorsPerLedger": {
    message: "حداکثر {formattedCount} همکار در هر دفتر",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.collaboratorsPerLedger_one": {
    message: "حداکثر {formattedCount} همکار در هر دفتر",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.collaboratorsPerLedger_other": {
    message: "حداکثر {formattedCount} همکار در هر دفتر",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - plural form",
  },
  "userSettings.aiUsageUpgradeNudge": {
    message:
      "شما از {percentage}٪ از توکن‌های ماهانه هوش مصنوعی خود استفاده می‌کنید. برای جلوگیری از وقفه، ارتقا دهید.",
    description: "Upgrade suggestion when AI token usage is high",
  },
  "userSettings.fingerprint": {
    message: "اثر انگشت",
    description: "Label for an SSH key fingerprint",
  },
  "userSettings.yearly": {
    message: "سالانه",
    description: "Yearly billing option in the billing-cycle toggle",
  },
  "userSettings.billingCycle": {
    message: "دوره صورت‌حساب",
    description: "Accessible label for the monthly/yearly billing-cycle toggle",
  },
  "userSettings.plans": {
    message: "طرح‌ها",
    description: "Section header above every plan on the Billing page",
  },
  "userSettings.switchToYearly": {
    message: "تغییر به پرداخت سالانه",
    description: "Button that moves a monthly subscription to yearly billing",
  },
  "userSettings.switchToMonthly": {
    message: "تغییر به پرداخت ماهانه",
    description: "Button that moves a yearly subscription to monthly billing",
  },
  "userSettings.downgrade": {
    message: "کاهش طرح",
    description: "Button for moving to a lower plan",
  },
  "userSettings.contactUs": {
    message: "تماس با ما",
    description: "Enterprise plan call to action and price label",
  },
  "userSettings.billedYearly": {
    message: "{amount} با پرداخت سالانه",
    description: "Total charged once a year; {amount} is a formatted price",
  },
  "userSettings.saveYearlyPercent": {
    message: "{percent}٪ صرفه‌جویی",
    description: "Badge with the yearly saving; {percent} is a whole number",
  },
  "userSettings.payYearlyOffer": {
    message:
      "پرداخت سالانه: {yearly} در سال به‌جای {monthlyTotal} — سالانه {saving} صرفه‌جویی کنید.",
    description:
      "Offer on a monthly plan; {yearly}, {monthlyTotal} and {saving} are formatted prices",
  },
  "userSettings.perYear": {
    message: "/سال",
    description: "Price interval suffix for yearly prices",
  },
  "userSettings.legacyPrice": {
    message: "قیمت قدیمی",
    description: "Label for an older price an existing subscriber keeps",
  },
  "userSettings.checkoutConfirming": {
    message: "در حال تأیید پرداخت شما…",
    description:
      "Shown while waiting for Stripe to confirm a just-completed checkout",
  },
  "userSettings.checkoutDone": {
    message: "اکنون طرح شما {plan} است",
    description:
      "Confirmation after checkout; {plan} is a plan name and billing cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.checkoutRenews": {
    message:
      "در تاریخ {date} با مبلغ {amount} تمدید می‌شود. رسید از طریق ایمیل برایتان ارسال می‌شود.",
    description:
      "Renewal line after checkout; {date} is a formatted date and {amount} a formatted price",
  },
  "userSettings.checkoutUnlocked": {
    message: "اکنون شامل: {limits}",
    description: "What the new plan includes; {limits} is a list of quotas",
  },
  "userSettings.checkoutPending": {
    message:
      "پرداخت دریافت شد. طرح شما تا یک دقیقه دیگر نمایش داده می‌شود؛ برای بررسی صفحه را تازه کنید.",
    description:
      "Shown when the payment is done but the subscription is not recorded yet",
  },
  "userSettings.refresh": {
    message: "تازه‌سازی",
    description: "Button that reloads the subscription status",
  },
  "userSettings.backToWork": {
    message: "بازگشت به صفحه قبلی",
    description: "Button that returns to the page where the purchase began",
  },
  "userSettings.startUsingPlan": {
    message: "شروع استفاده از {plan}",
    description:
      "Primary button on the checkout confirmation when the purchase did not start at an in-product prompt; opens the ledgers. {plan} is the plan name, e.g. Premium",
  },
  "userSettings.checkoutCanceled": {
    message: "پرداخت لغو شد. هیچ مبلغی کسر نشد.",
    description:
      "Notice on Billing after the customer leaves Stripe Checkout without paying",
  },
  "userSettings.viewBilling": {
    message: "مشاهده صورت‌حساب",
    description:
      "Button that closes the checkout confirmation and shows billing settings",
  },
  "userSettings.planChangeTitle": {
    message: "تغییر به {plan}",
    description:
      "Title of the plan-change sheet; {plan} is a plan and cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.planChangePreviewing": {
    message: "در حال محاسبه هزینه این تغییر…",
    description: "Shown while the server prices a plan change",
  },
  "userSettings.planChangePreviewFailed": {
    message: "نتوانستیم هزینه این تغییر را محاسبه کنیم. دوباره تلاش کنید.",
    description: "Shown when the plan-change price could not be loaded",
  },
  "userSettings.planChangeStartsToday": {
    message: "از امروز شروع می‌شود.",
    description: "The plan change takes effect immediately",
  },
  "userSettings.planChangeDueToday": {
    message: "مبلغ قابل پرداخت امروز",
    description: "Label for the amount charged today",
  },
  "userSettings.planChangeCredit": {
    message: "شامل اعتبار {credit} برای زمان استفاده‌نشده طرح فعلی شماست.",
    description: "Credit for unused time; {credit} is a formatted price",
  },
  "userSettings.planChangeNext": {
    message: "سپس {amount}، پرداخت بعدی در {date}.",
    description:
      "Next charge; {amount} is a price with its interval and {date} a formatted date",
  },
  "userSettings.planChangeChargedTo": {
    message: "از {card} پرداخت می‌شود",
    description:
      "Card the change is charged to; {card} is a card brand and its last four digits",
  },
  "userSettings.planChangeWhatYouGet": {
    message: "آنچه دریافت می‌کنید",
    description: "Heading above what the new plan adds",
  },
  "userSettings.planChangePayAndSwitch": {
    message: "پرداخت {amount} و تغییر",
    description:
      "Confirm button; {amount} is the formatted amount charged today",
  },
  "userSettings.planChangeContinueToCheckout": {
    message: "ادامه به پرداخت",
    description: "Confirm button that opens Stripe Checkout",
  },
  "userSettings.planChangeNotNow": {
    message: "اکنون نه",
    description:
      "Button that closes the plan-change sheet without changing anything",
  },
  "userSettings.planChangeCreditNote": {
    message:
      "زمان استفاده‌نشده همیشه محاسبه و کسر می‌شود؛ هرگز دو بار پرداخت نمی‌کنید.",
    description: "Reassurance under the confirm button",
  },
  "userSettings.planChangeRefusalCurrent": {
    message: "شما همین حالا این طرح را دارید.",
    description: "The chosen plan is the one the customer already has",
  },
  "userSettings.planChangeRefusalSameTier": {
    message:
      "این طرح را با قیمت قدیمی‌تر و کمتر نگه می‌دارید؛ تغییر فقط آن را افزایش می‌دهد.",
    description:
      "The customer keeps an older, cheaper price for the same plan and cycle",
  },
  "userSettings.planChangeRefusalMultiple": {
    message:
      "حساب شما بیش از یک اشتراک فعال دارد. برای تغییر طرح با پشتیبانی تماس بگیرید.",
    description: "The account has duplicate subscriptions and needs support",
  },
  "userSettings.planChangeRefusalNoSubscription": {
    message:
      "اشتراک فعالی برای تغییر وجود ندارد. صفحه را تازه\u200cسازی کنید تا طرحی انتخاب کنید.",
    description: "The subscription ended before the change was confirmed",
  },
  "userSettings.planChangeRefusalPastDue": {
    message:
      "آخرین پرداخت تمدید شما انجام نشد. روش پرداخت را در «مدیریت صورت‌حساب» به‌روز کنید و سپس طرح را تغییر دهید.",
    description:
      "A plan change is refused until a failed renewal payment is fixed",
  },
  "userSettings.planChangeStartsOn": {
    message: "از {date} شروع می‌شود. تا آن زمان {plan} را نگه می‌دارید.",
    description:
      "When a scheduled change takes effect and the plan kept until then",
  },
  "userSettings.planChangeNothingToday": {
    message: "امروز چیزی برای پرداخت نیست.",
    description: "A scheduled change charges nothing today",
  },
  "userSettings.planChangeWhatChanges": {
    message: "آنچه در {date} تغییر می‌کند",
    description:
      "Heading for the limits and features that change on the effective date",
  },
  "userSettings.planChangeLimitCollaborators": {
    message: "همکاران در هر دفتر",
    description: "Row label: collaborators allowed per ledger",
  },
  "userSettings.planChangeLimitAiTokens": {
    message: "توکن‌های هوش مصنوعی در ماه",
    description: "Row label: AI tokens allowed per month",
  },
  "userSettings.planChangeYouHave": {
    message: "{count} دارید",
    description: "The reader's current usage beside a limit row",
  },
  "userSettings.planChangeOverLimit": {
    message:
      "همهٔ دفترهای شما متعلق به شما می‌مانند و کار می‌کنند. تا زمانی که زیر سقف جدید {max} نباشید، نمی‌توانید دفتر تازه‌ای بسازید.",
    description:
      "Explains what happens when usage is above the lower plan's ledger limit",
  },
  "userSettings.planChangeScheduleDowngrade": {
    message: "زمان‌بندی کاهش طرح",
    description:
      "Button that schedules a downgrade for the end of the paid period",
  },
  "userSettings.planChangeScheduleSwitch": {
    message: "زمان‌بندی تغییر",
    description:
      "Button that schedules a billing-cycle switch for the end of the paid period",
  },
  "userSettings.planChangeKeep": {
    message: "نگه‌داشتن {plan}",
    description: "Button that keeps the current plan and closes the sheet",
  },
  "userSettings.planChangeScheduled": {
    message: "برای {date} زمان‌بندی شد. تا آن زمان چیزی تغییر نمی‌کند.",
    description: "Toast after a change was scheduled",
  },
  "userSettings.planChangeReplacesScheduled": {
    message: "این جایگزین تغییر زمان‌بندی‌شدهٔ شما به {plan} در {date} می‌شود.",
    description: "Note that this choice replaces an already scheduled change",
  },
  "userSettings.planChangeWithdrawsCancellation": {
    message:
      "این کار لغو اشتراک شما را هم پس می‌گیرد، پس اشتراک ادامه می‌یابد.",
    description: "Note that this choice withdraws a pending cancellation",
  },
  "userSettings.planChangeLegacyEnds": {
    message: "قیمت فعلی شما دیگر ارائه نمی‌شود و با این تغییر به پایان می‌رسد.",
    description: "Note for a subscriber on a price that is no longer offered",
  },
  "userSettings.planChangeSplitIntro": {
    message:
      "{plan} با پرداخت ماهانه می‌تواند از تمدید شما در {date} شروع شود. {plan} را از امروز می‌خواهید؟",
    description:
      "Introduces the two options when choosing a higher tier on monthly while on yearly",
  },
  "userSettings.planChangeSplitNow": {
    message: "دریافت {plan} از امروز با پرداخت سالانه — اکنون {amount}",
    description:
      "Option: the higher tier today on yearly billing, with the amount due now",
  },
  "userSettings.planChangeSplitLater": {
    message: "تغییر به {plan} ماهانه در {date} — امروز هیچ",
    description: "Option: the higher tier on monthly from the renewal date",
  },
  "userSettings.planChangeAtRenewal": {
    message: "از زمان تمدید اعمال می‌شود",
    description:
      "Under a plan card whose change waits for the end of the paid period",
  },
  "userSettings.planChangeFeaturesEnd": {
    message: "دیگر شامل نمی‌شود",
    description:
      "Heading above the plan features the lower plan does not include",
  },
  "userSettings.planChangeLimitDirectives": {
    message: "دستورالعمل‌ها",
    description: "Row label: entries (Beancount directives) allowed in total",
  },
  "userSettings.scheduledHeading": {
    message: "زمان‌بندی‌شده",
    description:
      "Heading of the panel listing what happens at the end of the paid period",
  },
  "userSettings.scheduledChangesTo": {
    message: "در {date} به {plan} تغییر می‌کند.",
    description: "A scheduled plan change and its date",
  },
  "userSettings.scheduledEnds": {
    message: "{plan} در {date} به پایان می‌رسد.",
    description: "A pending cancellation and the date the plan ends",
  },
  "userSettings.scheduledKeepCurrent": {
    message: "نگه‌داشتن طرح فعلی",
    description: "Button that undoes a scheduled plan change",
  },
  "userSettings.scheduledKept": {
    message: "طرح شما همان‌طور که هست می‌ماند.",
    description: "Toast after undoing a scheduled plan change",
  },
  "userSettings.scheduledKeepFailed": {
    message: "تغییر زمان‌بندی‌شدهٔ شما لغو نشد. دوباره تلاش کنید.",
    description: "Toast when undoing a scheduled plan change fails",
  },
  "userSettings.cancelSheetTitle": {
    message: "{plan} لغو شود؟",
    description: "Title of the sheet shown before cancelling",
  },
  "userSettings.cancelSheetKeepUntil": {
    message:
      "{plan} را تا {date} نگه می‌دارید. پس از آن روی طرح رایگان هستید: {limits}.",
    description:
      "What the reader keeps until the period ends, and the Free limits afterwards",
  },
  "userSettings.cancelSheetPlainText": {
    message:
      "دفترهای شما متن ساده‌اند — هر زمان خواستید خروجی بگیرید. چیزی حذف نمی‌شود.",
    description: "Reassurance that cancelling deletes nothing",
  },
  "userSettings.cancelSheetOtherOptions": {
    message: "گزینه‌های دیگر",
    description: "Heading above the cheaper alternative to cancelling",
  },
  "userSettings.cancelSheetSwitchToYearly": {
    message: "تغییر به سالانه — {price} در ماه",
    description:
      "Alternative to cancelling: switch to yearly at the per-month price",
  },
  "userSettings.cancelSheetDowngradeTo": {
    message: "کاهش به {plan}",
    description: "Alternative to cancelling: the next lower plan",
  },
  "userSettings.cancelSheetReason": {
    message: "دلیل اصلی چیست؟ (اختیاری)",
    description: "Optional question about why the reader cancels",
  },
  "userSettings.cancelReasonTooExpensive": {
    message: "خیلی گران است",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonMissingFeatures": {
    message: "یک قابلیت کم است",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonUnused": {
    message: "از آن استفاده نمی‌کنم",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonSwitchedService": {
    message: "به ابزار دیگری می‌روم",
    description: "Cancellation reason: moving to another tool",
  },
  "userSettings.cancelReasonOther": {
    message: "دیگر",
    description: "Cancellation reason",
  },
  "userSettings.planChangeRequiresAction": {
    message:
      "بانک شما باید این پرداخت را تأیید کند. تا آن زمان چیزی تغییر نمی‌کند؛ پس از تأیید، این صفحه را تازه کنید.",
    description: "The bank must approve the payment before the change applies",
  },
  "userSettings.planChangeApproving": {
    message: "در انتظار تأیید پرداخت توسط بانک شما…",
    description:
      "Shown while Stripe asks the bank to approve a plan change's payment",
  },
  "userSettings.planChangeApprovePayment": {
    message: "تأیید پرداخت",
    description: "Button that opens Stripe's page to approve the payment",
  },
  "userSettings.planChangeFailed": {
    message: "بانک شما پرداخت را تأیید نکرد. چیزی تغییر نکرد.",
    description: "The payment was declined and the plan did not change",
  },
  "userSettings.planChangeUseAnotherCard": {
    message: "استفاده از کارت دیگر",
    description: "Button that opens billing settings to change the card",
  },
  "userSettings.featureAutomaticBackups": {
    message: "پشتیبان‌گیری خودکار",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureAutomationIntegrations": {
    message: "خودکارسازی و یکپارچه‌سازی پیشرفته",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureOidcSso": {
    message: "ورود یکپارچه (SSO) با OIDC",
    description:
      "Plan feature from the pricing table; OIDC and SSO stay as written",
  },
  "userSettings.featureMultiEntity": {
    message: "تجمیع چند نهاد",
    description: "Plan feature from the pricing table",
  },
};

export default faUserSettings;
