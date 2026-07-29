export interface TranslationEntry {
  message: string;
  description: string;
}

const enUserSettings: Record<string, TranslationEntry> = {
  "userSettings.accountDeleted": {
    message: "Account deleted successfully",
    description: "Success message when account is deleted",
  },
  "userSettings.accountSettings": {
    message: "Account",
    description: "Section header for account settings",
  },
  "userSettings.addNewKey": {
    message: "Add New Key",
    description: "Button text to add new key",
  },
  "userSettings.added": {
    message: "Added",
    description: "Label for when key was added",
  },
  "userSettings.allDocumentsAndAttachments": {
    message: "All uploaded documents and attachments",
    description: "Item in delete account list",
  },
  "userSettings.allLedgersAndTransactions": {
    message: "All your ledgers and transaction history",
    description: "Item in delete account list",
  },
  "userSettings.allPreferencesAndSettings": {
    message: "All preferences and settings",
    description: "Item in delete account list",
  },
  "userSettings.allTransactionsAndRecords": {
    message: "All transactions and records",
    description: "Item in delete account list",
  },
  "userSettings.appSettings": {
    message: "App Settings",
    description: "Section header for application settings",
  },
  "userSettings.appearance": {
    message: "Appearance",
    description: "Appearance settings section label",
  },
  "userSettings.cannotBeUndone": {
    message: "This action cannot be undone.",
    description: "Warning that action is irreversible",
  },
  "userSettings.changeLanguage": {
    message: "Change",
    description: "Button to change language",
  },
  "userSettings.changeUsername": {
    message: "Change Username",
    description: "Dialog title for changing username",
  },
  "userSettings.createKey": {
    message: "Create Key",
    description: "Button text to create key",
  },
  "userSettings.createNewApiKey": {
    message: "Create New API Key",
    description: "Dialog title for creating API key",
  },
  "userSettings.createNewApiKeyDescription": {
    message: "Add a new public key to authenticate with the Beancount API.",
    description: "Dialog description for creating API key",
  },
  "userSettings.createNewKey": {
    message: "Create New Key",
    description: "Button text to create new key",
  },
  "userSettings.creating": {
    message: "Creating...",
    description: "Button text while creating key",
  },
  "userSettings.currentLanguage": {
    message: "Language",
    description: "Label showing current language selection",
  },
  "userSettings.currentPeriodEnds": {
    message: "Current period ends",
    description: "Label for subscription period end date",
  },
  "userSettings.currentVersion": {
    message: "Version",
    description: "Label showing current app version",
  },
  "userSettings.customizeAppearance": {
    message: "Customize how the application looks and feels",
    description: "Description for appearance settings",
  },
  "userSettings.dangerZone": {
    message: "Danger Zone",
    description: "Section title for dangerous account actions",
  },
  "userSettings.dark": {
    message: "Dark",
    description: "Dark theme option",
  },
  "userSettings.deleteAccount": {
    message: "Delete Account",
    description: "Button or menu item to delete user account",
  },
  "userSettings.deleteAccountAlertCancel": {
    message: "Cancel",
    description: "Cancel button in account deletion dialog",
  },
  "userSettings.deleteAccountAlertConfirm": {
    message: "Delete Account",
    description: "Confirm button in account deletion dialog",
  },
  "userSettings.deleteAccountAlertMsg": {
    message:
      "Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.",
    description: "Warning message in account deletion confirmation dialog",
  },
  "userSettings.deleteAccountConfirmMessage": {
    message: 'To confirm, type your username "{username}" below:',
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPhrase": {
    message: "sudo delete my account",
    description: "Exact phrase user must type to confirm deletion",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "Enter your username",
    description: "Placeholder text for deletion confirmation input",
  },
  "userSettings.deleteAccountConfirmTitle": {
    message: "Confirm Account Deletion",
    description: "Title of account deletion confirmation step",
  },
  "userSettings.deleteAccountDescription": {
    message: "Permanently remove your account and data",
    description: "Description of what account deletion does",
  },
  "userSettings.deleteAccountDialogDescription": {
    message:
      "This action cannot be undone. This will permanently delete your account and remove all your data from our servers.",
    description: "Detailed warning in delete account dialog",
  },
  "userSettings.deleteAccountQuestion": {
    message: "Delete Account?",
    description: "Dialog title confirming account deletion",
  },
  "userSettings.deleteAccountWarning": {
    message:
      "Permanently delete your account and all associated data. This action cannot be undone.",
    description: "Warning text for account deletion",
  },
  "userSettings.deleteKey": {
    message: "Delete Key",
    description: "Button text to delete key",
  },
  "userSettings.deleteSshKey": {
    message: "Delete SSH Key",
    description: "Dialog title for deleting SSH key",
  },
  "userSettings.deleteSshKeyConfirmation": {
    message: "Are you sure you want to delete the key",
    description: "Confirmation message for deleting SSH key",
  },
  "userSettings.deletingKey": {
    message: "Deleting...",
    description: "Button text while deleting key",
  },
  "userSettings.enterNewUsername": {
    message: "Enter your new username below",
    description: "Instructions in change username dialog",
  },
  "userSettings.enterNewUsernamePlaceholder": {
    message: "Enter new username",
    description: "Placeholder for new username input",
  },
  "userSettings.errorCreatingKey": {
    message: "Error Creating Key",
    description: "Error title when key creation fails",
  },
  "userSettings.errorLoadingSettings": {
    message: "Error loading settings",
    description: "Error message when settings fail to load",
  },
  "userSettings.failedToCreateKey": {
    message: "Failed to create key. Please try again.",
    description: "Error message when key creation fails",
  },
  "userSettings.failedToDeleteAccount": {
    message: "Failed to delete account",
    description: "Error message when account deletion fails",
  },
  "userSettings.failedToLoadKeys": {
    message: "Failed to load keys",
    description: "Error title when keys fail to load",
  },
  "userSettings.failedToLoadKeysDescription": {
    message: "There was an error loading your SSH keys. Please try again.",
    description: "Error description when keys fail to load",
  },
  "userSettings.failedToLoadSettings": {
    message: "Failed to Load Settings",
    description: "Error heading when settings page fails",
  },
  "userSettings.failedToLoadSubscription": {
    message: "Failed to load subscription status",
    description: "Error message when subscription fails to load",
  },
  "userSettings.followingWillBeDeleted": {
    message: "The following will be permanently deleted:",
    description: "Heading before list of items to be deleted",
  },
  "userSettings.general": {
    message: "General",
    description: "General settings section label",
  },
  "userSettings.helpCenter": {
    message: "Help Center",
    description: "Link to help center",
  },
  "userSettings.inputKeyword": {
    message: "Please enter a keyword",
    description: "Placeholder prompting user to enter keyword",
  },
  "userSettings.invite": {
    message: "Invite",
    description: "Invite action button",
  },
  "userSettings.inviteFriends": {
    message: "Invite Friends",
    description: "Button or section title for inviting friends",
  },
  "userSettings.inviteSummary": {
    message:
      "Share this professional financial management tool and help others build their financial future.",
    description: "Summary description of invite feature",
  },
  "userSettings.irreversibleActions": {
    message: "Irreversible and destructive actions",
    description: "Description for danger zone",
  },
  "userSettings.keyTitle": {
    message: "Key Title",
    description: "Label for key title field",
  },
  "userSettings.keyTitleDescription": {
    message: "A descriptive name for this key to help you identify it later.",
    description: "Description for key title field",
  },
  "userSettings.keyTitlePlaceholder": {
    message: "e.g., My Development Key",
    description: "Placeholder for key title input",
  },
  "userSettings.lastUsed3Months": {
    message: "Last used within the last 3 months",
    description: "Status when key was used within last 3 months",
  },
  "userSettings.lastUsed3Weeks": {
    message: "Last used within the last 3 weeks",
    description: "Status when key was used within last 3 weeks",
  },
  "userSettings.lastUsedLongAgo": {
    message: "Last used more than 3 months ago",
    description: "Status when key was used long ago",
  },
  "userSettings.lastUsedWeek": {
    message: "Last used within the last week",
    description: "Status when key was used within last week",
  },
  "userSettings.light": {
    message: "Light",
    description: "Light theme option",
  },
  "userSettings.loadingAccountInformation": {
    message: "Loading your account information...",
    description: "Loading message for account information",
  },
  "userSettings.loadingAccountOptions": {
    message: "Loading account options...",
    description: "Loading message for account options",
  },
  "userSettings.loadingSessionInformation": {
    message: "Loading session information...",
    description: "Loading message for session data",
  },
  "userSettings.loadingSshKeys": {
    message: "Loading your SSH keys...",
    description: "Loading state message for SSH keys",
  },
  "userSettings.loadingSubscriptionDetails": {
    message: "Loading subscription details...",
    description: "Loading message for subscription info",
  },
  "userSettings.loadingThemePreferences": {
    message: "Loading theme preferences...",
    description: "Loading message for theme settings",
  },
  "userSettings.accessUntil": {
    message: "Access until",
    description: "Label for access remaining until date",
  },
  "userSettings.cancelSubscription": {
    message: "Cancel Subscription",
    description: "Button text to cancel subscription",
  },
  "userSettings.cancelSubscriptionDescription": {
    message:
      "Are you sure you want to cancel your subscription? You'll continue to have access until the end of your current billing period.",
    description: "Confirmation dialog description for canceling subscription",
  },
  "userSettings.cancelSubscriptionTitle": {
    message: "Cancel Subscription?",
    description: "Confirmation dialog title for canceling subscription",
  },
  "userSettings.canceling": {
    message: "Canceling...",
    description: "Button text while canceling subscription",
  },
  "userSettings.confirmCancel": {
    message: "Yes, Cancel Subscription",
    description: "Button text to confirm subscription cancellation",
  },
  "userSettings.failedToCancelSubscription": {
    message: "Failed to cancel subscription",
    description: "Error message when canceling subscription fails",
  },
  "userSettings.resumeSubscription": {
    message: "Resume Subscription",
    description: "Button text to resume a subscription scheduled to cancel",
  },
  "userSettings.resumeSubscriptionTitle": {
    message: "Resume Subscription?",
    description: "Confirmation dialog title for resuming subscription",
  },
  "userSettings.resumeSubscriptionDescription": {
    message:
      "Are you sure you want to resume your subscription? Your subscription will continue to renew automatically and you will be billed again at the end of your current billing period.",
    description: "Confirmation dialog description for resuming subscription",
  },
  "userSettings.confirmResume": {
    message: "Yes, Resume Subscription",
    description: "Button text to confirm subscription resumption",
  },
  "userSettings.resuming": {
    message: "Resuming...",
    description: "Button text while resuming subscription",
  },
  "userSettings.subscriptionResumedSuccess": {
    message: "Subscription resumed successfully",
    description: "Success message after resuming subscription",
  },
  "userSettings.failedToResumeSubscription": {
    message: "Failed to resume subscription",
    description: "Error message when resuming subscription fails",
  },
  "userSettings.failedToCreateCheckoutSession": {
    message: "Failed to create checkout session. Please try again.",
    description: "Error message when creating checkout session fails",
  },
  "userSettings.manage": {
    message: "Manage",
    description: "Button to manage subscription",
  },
  "userSettings.manageBilling": {
    message: "Manage Billing",
    description: "Button text to manage billing portal",
  },
  "userSettings.manageActiveSession": {
    message: "Manage your active session",
    description: "Description for session section",
  },
  "userSettings.manageSubscription": {
    message: "Manage your subscription and billing",
    description: "Description for subscription section",
  },
  "userSettings.monthly": {
    message: "Monthly",
    description: "Monthly frequency option",
  },
  "userSettings.neverUsed": {
    message: "Never used",
    description: "Status when key has never been used",
  },
  "userSettings.newSshKey": {
    message: "New SSH key",
    description: "Button text to create new SSH key",
  },
  "userSettings.noActiveSubscription": {
    message: "No Active Subscription",
    description: "Label when user has no subscription",
  },
  "userSettings.noContactPermission": {
    message: "Missing contacts permission.",
    description: "Error when contacts permission is denied",
  },
  "userSettings.noSshKeys": {
    message: "No SSH keys",
    description: "Empty state title when no SSH keys exist",
  },
  "userSettings.noSshKeysDescription": {
    message:
      "You haven't created any SSH keys yet. Create your first key to get started with secure repository access.",
    description: "Empty state description for SSH keys",
  },
  "userSettings.notSet": {
    message: "Not set",
    description: "Placeholder when a field has no value",
  },
  "userSettings.off": {
    message: "Off",
    description: "Off state for toggles or subscriptions",
  },
  "userSettings.opening": {
    message: "Opening...",
    description: "Button text while opening billing portal",
  },
  "userSettings.processing": {
    message: "Processing...",
    description: "Button text while processing checkout",
  },
  "userSettings.publicKey": {
    message: "Public Key",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      'Paste your public key content here. It should start with "-----BEGIN PUBLIC KEY-----".',
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message:
      "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "Public key is required",
    description: "Validation error for missing public key",
  },
  "userSettings.recommend": {
    message:
      "I'd like to share this professional financial management tool that has helped me organize my finances effectively.",
    description: "Pre-written recommendation message for sharing",
  },
  "userSettings.referral": {
    message: "Referral",
    description: "Referral program label",
  },
  "userSettings.renewsOn": {
    message: "Renews on",
    description: "Label for subscription renewal date",
  },
  "userSettings.reviewApp": {
    message: "Like it? Give it a review :)",
    description: "Prompt to review the app",
  },
  "userSettings.rewardDetail": {
    message:
      "Share this professional financial management tool and help others build their financial future.",
    description: "Detailed description of referral rewards",
  },
  "userSettings.rewardSummary": {
    message: "Invite Friends",
    description: "Summary of referral rewards",
  },
  "userSettings.selectColorTheme": {
    message: "Select your preferred color theme",
    description: "Label for theme selection",
  },
  "userSettings.selectLanguage": {
    message: "Select your preferred language",
    description: "Label for language selection",
  },
  "userSettings.session": {
    message: "Session",
    description: "Session management section title",
  },
  "userSettings.settingsErrorMessage": {
    message:
      "There was an error loading your settings. Please check your connection and try again.",
    description: "Detailed error message for settings loading failure",
  },
  "userSettings.shareError": {
    message: "Failed to share",
    description: "Error message when sharing fails",
  },
  "userSettings.signOutDescription": {
    message: "Sign out of your account and clear your session.",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "SSH Keys",
    description: "Page title for SSH keys",
  },
  "userSettings.subscribe": {
    message: "Email Report",
    description: "Email report subscription feature label",
  },
  "userSettings.subscription": {
    message: "Subscription",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceled": {
    message: "Subscription has been canceled",
    description: "Message when subscription is already canceled",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "Subscription canceled successfully",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Subscription upgraded successfully",
    description: "Success message after upgrading subscription",
  },
  "userSettings.paymentRequiresAuth": {
    message:
      "Your payment requires additional authentication. Please check your email or card issuer.",
    description:
      "Message when 3DS authentication is needed for subscription upgrade",
  },
  "userSettings.supportSettings": {
    message: "Support",
    description: "Section header for support settings",
  },
  "userSettings.system": {
    message: "System",
    description: "System theme option",
  },
  "userSettings.testMode": {
    message: "Test Mode",
    description: "Label indicating Stripe is in test/development mode",
  },
  "userSettings.thanksShare": {
    message: "Thanks for sharing!!",
    description: "Thank you message after sharing",
  },
  "userSettings.theme": {
    message: "Theme",
    description: "Label for theme selection",
  },
  "userSettings.themeDark": {
    message: "Dark",
    description: "Dark theme option",
  },
  "userSettings.themeLight": {
    message: "Light",
    description: "Light theme option",
  },
  "userSettings.themeSystem": {
    message: "System",
    description: "System theme option (follows OS preference)",
  },
  "userSettings.titleMaxLength": {
    message: "Title must be less than 100 characters",
    description: "Validation error for title too long",
  },
  "userSettings.titleRequired": {
    message: "Title is required",
    description: "Validation error for missing title",
  },
  "userSettings.trialProPlan": {
    message: "Upgrade to Premium",
    description: "Button text for premium subscription upgrade",
  },
  "userSettings.trialProPlanComingSoon": {
    message: "Trial Pro plan feature coming soon!",
    description: "Toast message when trial Pro plan is clicked",
  },
  "userSettings.unableToOpenBillingPortal": {
    message: "Unable to open billing portal. Please try again later.",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "Unknown Plan",
    description: "Fallback when plan name is not available",
  },
  "userSettings.updateFailed": {
    message: "Update subscription failed",
    description: "Error message when update fails",
  },
  "userSettings.updateSuccess": {
    message: "Subscription updated successfully",
    description: "Success message after updating subscription",
  },
  "userSettings.usernameUpdatedSuccess": {
    message: "Username updated successfully",
    description: "Success message after updating username",
  },
  "userSettings.upgradeToProDescription": {
    message: "Upgrade to Pro to unlock premium features and unlimited access.",
    description: "Description encouraging subscription upgrade",
  },
  "userSettings.userProfile": {
    message: "User Profile",
    description: "Section title for user profile settings",
  },
  "userSettings.weekly": {
    message: "Weekly",
    description: "Weekly frequency option",
  },
  "userSettings.yesDeleteMyAccount": {
    message: "Yes, Delete My Account",
    description: "Confirmation button for account deletion",
  },
  "userSettings.yourAccountInformation": {
    message: "Your account information",
    description: "Description for user profile section",
  },
  "userSettings.firstName": {
    message: "First Name",
    description: "Label for first name field",
  },
  "userSettings.lastName": {
    message: "Last Name",
    description: "Label for last name field",
  },
  "userSettings.name": {
    message: "Name",
    description: "Label for combined name field",
  },
  "userSettings.changeName": {
    message: "Change Name",
    description: "Dialog title for changing name",
  },
  "userSettings.enterNewName": {
    message: "Enter your name below",
    description: "Instructions in change name dialog",
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
    message: "Up to {max}/ledger",
    description: "Collaborator limit per ledger (concise count)",
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

export default enUserSettings;
