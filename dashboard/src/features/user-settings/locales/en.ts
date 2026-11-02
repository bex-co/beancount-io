import { apiKeyTranslations } from "../pages/api-keys/translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const enUserSettings: Record<string, TranslationEntry> = {
  ...apiKeyTranslations.en,
  "userSettings.accountDeleted": {
    message: "Account deleted successfully",
    description: "Success message when account is deleted",
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
  "userSettings.appearance": {
    message: "Appearance",
    description: "Appearance settings section label",
  },
  "userSettings.cannotBeUndone": {
    message: "This action cannot be undone.",
    description: "Warning that action is irreversible",
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
    message: "Create New SSH Key",
    description: "Dialog title for creating an SSH public key",
  },
  "userSettings.createNewApiKeyDescription": {
    message: "Add a new SSH public key for Git repository access.",
    description:
      "Dialog description for creating an SSH public key for Git access",
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
  "userSettings.deleteAccountConfirmMessage": {
    message: 'To confirm, type your username "{username}" below:',
    description:
      "Instructions for confirming account deletion by typing username",
  },
  "userSettings.deleteAccountConfirmPlaceholder": {
    message: "Enter your username",
    description: "Placeholder text for deletion confirmation input",
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
  "userSettings.invite": {
    message: "Invite",
    description: "Invite action button",
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
  "userSettings.cancelSubscription": {
    message: "Cancel Subscription",
    description: "Button text to cancel subscription",
  },
  "userSettings.canceling": {
    message: "Canceling...",
    description: "Button text while canceling subscription",
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
  "userSettings.opening": {
    message: "Opening...",
    description: "Button text while opening billing portal",
  },
  "userSettings.publicKey": {
    message: "Public Key",
    description: "Label for public key field",
  },
  "userSettings.publicKeyDescription": {
    message:
      "Paste your public key here. It usually starts with ssh-ed25519 or ssh-rsa; print it with cat ~/.ssh/id_ed25519.pub. PEM public keys are also accepted.",
    description: "Description for public key field",
  },
  "userSettings.publicKeyPlaceholder": {
    message: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA…",
    description: "Placeholder for public key textarea",
  },
  "userSettings.publicKeyRequired": {
    message: "Public key is required",
    description: "Validation error for missing public key",
  },
  "userSettings.renewsOn": {
    message: "Renews on",
    description: "Label for subscription renewal date",
  },
  "userSettings.billedByStripe": {
    message: "Stripe billing",
    description: "Billing source on the plan card: Stripe",
  },
  "userSettings.billedByAppStore": {
    message: "App Store billing",
    description: "Billing source on the plan card: the App Store",
  },
  "userSettings.billedByGooglePlay": {
    message: "Google Play billing",
    description: "Billing source on the plan card: Google Play",
  },
  "userSettings.appStoreManagePath": {
    message:
      "Manage it on your iPhone or iPad: Settings → your name → Subscriptions.",
    description:
      "Where an App Store plan is managed; Apple has no web page for it",
  },
  "userSettings.manageOnGooglePlay": {
    message: "Manage on Google Play",
    description: "Link to Google Play's subscriptions page",
  },
  "userSettings.planEndsOn": {
    message: "Ends on {date}",
    description: "Plan card: a store plan that will not renew",
  },
  "userSettings.planChangesOn": {
    message: "Changes to {plan} on {date}",
    description: "Plan card: a store plan with a scheduled change",
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
  "userSettings.signOutDescription": {
    message: "Sign out of your account and clear your session.",
    description: "Description for logout action",
  },
  "userSettings.sshKeys": {
    message: "SSH Keys",
    description: "Page title for SSH keys",
  },
  "userSettings.subscriptionStatus.active": {
    message: "Active",
    description:
      "Billing badge for a subscription whose Stripe status is active: paid and current.",
  },
  "userSettings.subscriptionStatus.trialing": {
    message: "Trial",
    description:
      "Billing badge for a subscription whose Stripe status is trialing: in a free trial.",
  },
  "userSettings.subscriptionStatus.past_due": {
    message: "Past due",
    description:
      "Billing badge for a subscription whose Stripe status is past_due: the last renewal failed and Stripe is retrying.",
  },
  "userSettings.subscriptionStatus.unpaid": {
    message: "Unpaid",
    description:
      "Billing badge for a subscription whose Stripe status is unpaid: Stripe stopped retrying a failed renewal.",
  },
  "userSettings.subscriptionStatus.incomplete": {
    message: "Incomplete",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete: the first payment has not completed.",
  },
  "userSettings.subscriptionStatus.incomplete_expired": {
    message: "Expired",
    description:
      "Billing badge for a subscription whose Stripe status is incomplete_expired: the first payment never completed.",
  },
  "userSettings.subscriptionStatus.canceled": {
    message: "Canceled",
    description:
      "Billing badge for a subscription whose Stripe status is canceled: ended.",
  },
  "userSettings.subscriptionStatus.paused": {
    message: "Paused",
    description:
      "Billing badge for a subscription whose Stripe status is paused: paused.",
  },
  "userSettings.subscription": {
    message: "Subscription",
    description: "Subscription section title",
  },
  "userSettings.subscriptionCanceledSuccess": {
    message: "Subscription canceled successfully",
    description: "Success message after canceling subscription",
  },
  "userSettings.subscriptionUpgraded": {
    message: "Subscription upgraded successfully",
    description: "Success message after upgrading subscription",
  },
  "userSettings.system": {
    message: "System",
    description: "System theme option",
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
  "userSettings.unableToOpenBillingPortal": {
    message: "Unable to open billing portal. Please try again later.",
    description: "Error message when billing portal fails to open",
  },
  "userSettings.unknownPlan": {
    message: "Unknown Plan",
    description: "Fallback when plan name is not available",
  },
  "userSettings.usernameUpdatedSuccess": {
    message: "Username updated successfully",
    description: "Success message after updating username",
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
  "userSettings.aiCfoUsageCount": {
    message: "{used} / {max} tokens used this month",
    description: "AI CFO usage count display",
  },
  "userSettings.aiCfoUsageUnlimited": {
    message: "{used} tokens used this month (Unlimited)",
    description: "AI CFO usage display for unlimited tier",
  },
  "userSettings.aiCfoUsageUnavailable": {
    message: "Usage is unavailable right now.",
    description: "Shown in place of AI token usage when its read fails",
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
  "userSettings.aiTokensPerMonth": {
    message: "{count} AI tokens / month",
    description: "AI token allowance for a subscription tier",
  },
  "userSettings.unlimitedAiTokens": {
    message: "Unlimited AI tokens",
    description: "Unlimited AI token allowance",
  },
  "userSettings.unlimitedLedgers": {
    message: "Unlimited ledgers",
    description: "Unlimited ledger allowance",
  },
  "userSettings.includedLedgers": {
    message: "{formattedCount} ledgers",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.includedLedgers_one": {
    message: "{formattedCount} ledger",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.includedLedgers_other": {
    message: "{formattedCount} ledgers",
    description:
      "Ledger allowance for a subscription tier - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - plural form",
  },
  "userSettings.unlimitedDirectives": {
    message: "Unlimited directives",
    description: "Unlimited directive allowance",
  },
  "userSettings.includedDirectives": {
    message: "{count} directives",
    description: "Directive allowance for a subscription tier",
  },
  "userSettings.unlimitedCollaborators": {
    message: "Unlimited collaborators",
    description: "Unlimited collaborator allowance",
  },
  "userSettings.collaboratorsPerLedger": {
    message: "Up to {formattedCount} collaborators per ledger",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form (base key for pluralization)",
  },
  "userSettings.collaboratorsPerLedger_one": {
    message: "Up to {formattedCount} collaborator per ledger",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - singular form",
  },
  "userSettings.collaboratorsPerLedger_other": {
    message: "Up to {formattedCount} collaborators per ledger",
    description:
      "Collaborator allowance for each ledger - interpolation: {formattedCount} is the count formatted in the app language; {count} selects the plural form - plural form",
  },
  "userSettings.aiUsageUpgradeNudge": {
    message:
      "You're using {percentage}% of your monthly AI tokens. Upgrade to avoid interruptions.",
    description: "Upgrade suggestion when AI token usage is high",
  },
  "userSettings.fingerprint": {
    message: "fingerprint",
    description: "Label for an SSH key fingerprint",
  },
  "userSettings.yearly": {
    message: "Yearly",
    description: "Yearly billing option in the billing-cycle toggle",
  },
  "userSettings.billingCycle": {
    message: "Billing cycle",
    description: "Accessible label for the monthly/yearly billing-cycle toggle",
  },
  "userSettings.plans": {
    message: "Plans",
    description: "Section header above every plan on the Billing page",
  },
  "userSettings.switchToYearly": {
    message: "Switch to yearly",
    description: "Button that moves a monthly subscription to yearly billing",
  },
  "userSettings.switchToMonthly": {
    message: "Switch to monthly",
    description: "Button that moves a yearly subscription to monthly billing",
  },
  "userSettings.downgrade": {
    message: "Downgrade",
    description: "Button for moving to a lower plan",
  },
  "userSettings.contactUs": {
    message: "Contact us",
    description: "Enterprise plan call to action and price label",
  },
  "userSettings.billedYearly": {
    message: "{amount} billed yearly",
    description: "Total charged once a year; {amount} is a formatted price",
  },
  "userSettings.saveYearlyPercent": {
    message: "Save {percent}%",
    description: "Badge with the yearly saving; {percent} is a whole number",
  },
  "userSettings.payYearlyOffer": {
    message:
      "Pay yearly: {yearly}/yr instead of {monthlyTotal} — save {saving} a year.",
    description:
      "Offer on a monthly plan; {yearly}, {monthlyTotal} and {saving} are formatted prices",
  },
  "userSettings.perYear": {
    message: "/year",
    description: "Price interval suffix for yearly prices",
  },
  "userSettings.legacyPrice": {
    message: "Legacy price",
    description: "Label for an older price an existing subscriber keeps",
  },
  "userSettings.checkoutConfirming": {
    message: "Confirming your payment…",
    description:
      "Shown while waiting for Stripe to confirm a just-completed checkout",
  },
  "userSettings.checkoutDone": {
    message: "You're on {plan}",
    description:
      "Confirmation after checkout; {plan} is a plan name and billing cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.checkoutRenews": {
    message: "Renews {date} for {amount}. Your receipt arrives by email.",
    description:
      "Renewal line after checkout; {date} is a formatted date and {amount} a formatted price",
  },
  "userSettings.checkoutUnlocked": {
    message: "Now unlocked: {limits}",
    description: "What the new plan includes; {limits} is a list of quotas",
  },
  "userSettings.checkoutPending": {
    message:
      "Payment received. Your plan will appear in a minute; refresh to check.",
    description:
      "Shown when the payment is done but the subscription is not recorded yet",
  },
  "userSettings.refresh": {
    message: "Refresh",
    description: "Button that reloads the subscription status",
  },
  "userSettings.backToWork": {
    message: "Back to where you were",
    description: "Button that returns to the page where the purchase began",
  },
  "userSettings.startUsingPlan": {
    message: "Start using {plan}",
    description:
      "Primary button on the checkout confirmation when the purchase did not start at an in-product prompt; opens the ledgers. {plan} is the plan name, e.g. Premium",
  },
  "userSettings.checkoutCanceled": {
    message: "Checkout was canceled. Nothing was charged.",
    description:
      "Notice on Billing after the customer leaves Stripe Checkout without paying",
  },
  "userSettings.viewBilling": {
    message: "View billing",
    description:
      "Button that closes the checkout confirmation and shows billing settings",
  },
  "userSettings.planChangeTitle": {
    message: "Change to {plan}",
    description:
      "Title of the plan-change sheet; {plan} is a plan and cycle such as 'Premium \u00b7 Yearly'",
  },
  "userSettings.planChangePreviewing": {
    message: "Working out what this change costs…",
    description: "Shown while the server prices a plan change",
  },
  "userSettings.planChangePreviewFailed": {
    message: "We couldn't price this change. Try again.",
    description: "Shown when the plan-change price could not be loaded",
  },
  "userSettings.planChangeStartsToday": {
    message: "Starts today.",
    description: "The plan change takes effect immediately",
  },
  "userSettings.planChangeDueToday": {
    message: "Due today",
    description: "Label for the amount charged today",
  },
  "userSettings.planChangeCredit": {
    message: "Includes a {credit} credit for unused time on your current plan.",
    description: "Credit for unused time; {credit} is a formatted price",
  },
  "userSettings.planChangeNext": {
    message: "Then {amount}, next on {date}.",
    description:
      "Next charge; {amount} is a price with its interval and {date} a formatted date",
  },
  "userSettings.planChangeChargedTo": {
    message: "Charged to {card}",
    description:
      "Card the change is charged to; {card} is a card brand and its last four digits",
  },
  "userSettings.planChangeWhatYouGet": {
    message: "What you get",
    description: "Heading above what the new plan adds",
  },
  "userSettings.planChangePayAndSwitch": {
    message: "Pay {amount} and switch",
    description:
      "Confirm button; {amount} is the formatted amount charged today",
  },
  "userSettings.planChangeContinueToCheckout": {
    message: "Continue to checkout",
    description: "Confirm button that opens Stripe Checkout",
  },
  "userSettings.planChangeNotNow": {
    message: "Not now",
    description:
      "Button that closes the plan-change sheet without changing anything",
  },
  "userSettings.planChangeCreditNote": {
    message: "Unused time is always credited — you never pay twice.",
    description: "Reassurance under the confirm button",
  },
  "userSettings.planChangeRefusalCurrent": {
    message: "You're already on this plan.",
    description: "The chosen plan is the one the customer already has",
  },
  "userSettings.planChangeRefusalSameTier": {
    message:
      "You keep this plan at an older, lower price; switching would only raise it.",
    description:
      "The customer keeps an older, cheaper price for the same plan and cycle",
  },
  "userSettings.planChangeRefusalMultiple": {
    message:
      "Your account has more than one active subscription. Contact support to change plans.",
    description: "The account has duplicate subscriptions and needs support",
  },
  "userSettings.planChangeRefusalNoSubscription": {
    message:
      "There is no active subscription to change. Refresh the page to choose a plan.",
    description: "The subscription ended before the change was confirmed",
  },
  "userSettings.planChangeRefusalPastDue": {
    message:
      "Your last renewal payment didn't go through. Update your payment method in Manage Billing, then change plans.",
    description:
      "A plan change is refused until a failed renewal payment is fixed",
  },
  "userSettings.planChangeStartsOn": {
    message: "Starts {date}. You keep {plan} until then.",
    description:
      "When a scheduled change takes effect and the plan kept until then",
  },
  "userSettings.planChangeNothingToday": {
    message: "Nothing to pay today.",
    description: "A scheduled change charges nothing today",
  },
  "userSettings.planChangeWhatChanges": {
    message: "What changes on {date}",
    description:
      "Heading for the limits and features that change on the effective date",
  },
  "userSettings.planChangeLimitCollaborators": {
    message: "Collaborators per ledger",
    description: "Row label: collaborators allowed per ledger",
  },
  "userSettings.planChangeLimitAiTokens": {
    message: "AI tokens per month",
    description: "Row label: AI tokens allowed per month",
  },
  "userSettings.planChangeYouHave": {
    message: "you have {count}",
    description: "The reader's current usage beside a limit row",
  },
  "userSettings.planChangeOverLimit": {
    message:
      "Every ledger stays yours and keeps working. You can't create a new one until you're below the new limit of {max}.",
    description:
      "Explains what happens when usage is above the lower plan's ledger limit",
  },
  "userSettings.planChangeScheduleDowngrade": {
    message: "Schedule downgrade",
    description:
      "Button that schedules a downgrade for the end of the paid period",
  },
  "userSettings.planChangeScheduleSwitch": {
    message: "Schedule switch",
    description:
      "Button that schedules a billing-cycle switch for the end of the paid period",
  },
  "userSettings.planChangeKeep": {
    message: "Keep {plan}",
    description: "Button that keeps the current plan and closes the sheet",
  },
  "userSettings.planChangeScheduled": {
    message: "Scheduled for {date}. Nothing changes until then.",
    description: "Toast after a change was scheduled",
  },
  "userSettings.planChangeReplacesScheduled": {
    message: "This replaces your scheduled change to {plan} on {date}.",
    description: "Note that this choice replaces an already scheduled change",
  },
  "userSettings.planChangeWithdrawsCancellation": {
    message:
      "This also withdraws your cancellation, so your subscription continues.",
    description: "Note that this choice withdraws a pending cancellation",
  },
  "userSettings.planChangeLegacyEnds": {
    message:
      "Your current price is no longer offered, so it ends with this change.",
    description: "Note for a subscriber on a price that is no longer offered",
  },
  "userSettings.planChangeSplitIntro": {
    message:
      "{plan} on monthly billing can start at your renewal on {date}. Want {plan} today?",
    description:
      "Introduces the two options when choosing a higher tier on monthly while on yearly",
  },
  "userSettings.planChangeSplitNow": {
    message: "Get {plan} today on yearly billing — {amount} now",
    description:
      "Option: the higher tier today on yearly billing, with the amount due now",
  },
  "userSettings.planChangeSplitLater": {
    message: "Switch to {plan} monthly on {date} — nothing today",
    description: "Option: the higher tier on monthly from the renewal date",
  },
  "userSettings.planChangeAtRenewal": {
    message: "Takes effect at your renewal",
    description:
      "Under a plan card whose change waits for the end of the paid period",
  },
  "userSettings.planChangeFeaturesEnd": {
    message: "No longer included",
    description:
      "Heading above the plan features the lower plan does not include",
  },
  "userSettings.planChangeLimitDirectives": {
    message: "Directives",
    description: "Row label: entries (Beancount directives) allowed in total",
  },
  "userSettings.scheduledHeading": {
    message: "Scheduled",
    description:
      "Heading of the panel listing what happens at the end of the paid period",
  },
  "userSettings.scheduledChangesTo": {
    message: "Changes to {plan} on {date}.",
    description: "A scheduled plan change and its date",
  },
  "userSettings.scheduledEnds": {
    message: "{plan} ends {date}.",
    description: "A pending cancellation and the date the plan ends",
  },
  "userSettings.scheduledKeepCurrent": {
    message: "Keep current",
    description: "Button that undoes a scheduled plan change",
  },
  "userSettings.scheduledKept": {
    message: "Your plan stays as it is.",
    description: "Toast after undoing a scheduled plan change",
  },
  "userSettings.scheduledKeepFailed": {
    message: "Your scheduled change couldn't be undone. Try again.",
    description: "Toast when undoing a scheduled plan change fails",
  },
  "userSettings.cancelSheetTitle": {
    message: "Cancel {plan}?",
    description: "Title of the sheet shown before cancelling",
  },
  "userSettings.cancelSheetKeepUntil": {
    message: "You keep {plan} until {date}. Then you're on Free: {limits}.",
    description:
      "What the reader keeps until the period ends, and the Free limits afterwards",
  },
  "userSettings.cancelSheetPlainText": {
    message: "Your books are plain text — export anytime. Nothing is deleted.",
    description: "Reassurance that cancelling deletes nothing",
  },
  "userSettings.cancelSheetOtherOptions": {
    message: "Other options",
    description: "Heading above the cheaper alternative to cancelling",
  },
  "userSettings.cancelSheetSwitchToYearly": {
    message: "Switch to yearly — {price}/mo",
    description:
      "Alternative to cancelling: switch to yearly at the per-month price",
  },
  "userSettings.cancelSheetDowngradeTo": {
    message: "Downgrade to {plan}",
    description: "Alternative to cancelling: the next lower plan",
  },
  "userSettings.cancelSheetReason": {
    message: "What's the main reason? (optional)",
    description: "Optional question about why the reader cancels",
  },
  "userSettings.cancelReasonTooExpensive": {
    message: "Too expensive",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonMissingFeatures": {
    message: "Missing a feature",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonUnused": {
    message: "Not using it",
    description: "Cancellation reason",
  },
  "userSettings.cancelReasonSwitchedService": {
    message: "Switching tools",
    description: "Cancellation reason: moving to another tool",
  },
  "userSettings.cancelReasonOther": {
    message: "Other",
    description: "Cancellation reason",
  },
  "userSettings.planChangeRequiresAction": {
    message:
      "Your bank needs to approve this payment. Nothing changes until it does; after approving, refresh this page.",
    description: "The bank must approve the payment before the change applies",
  },
  "userSettings.planChangeApproving": {
    message: "Waiting for your bank to approve the payment…",
    description:
      "Shown while Stripe asks the bank to approve a plan change's payment",
  },
  "userSettings.planChangeApprovePayment": {
    message: "Approve payment",
    description: "Button that opens Stripe's page to approve the payment",
  },
  "userSettings.planChangeFailed": {
    message: "Your bank didn't approve the payment. Nothing changed.",
    description: "The payment was declined and the plan did not change",
  },
  "userSettings.planChangeUseAnotherCard": {
    message: "Use another card",
    description: "Button that opens billing settings to change the card",
  },
  "userSettings.featureAutomaticBackups": {
    message: "Automatic backups",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureAutomationIntegrations": {
    message: "Advanced automation & integrations",
    description: "Plan feature from the pricing table",
  },
  "userSettings.featureOidcSso": {
    message: "OIDC single sign-on (SSO)",
    description:
      "Plan feature from the pricing table; OIDC and SSO stay as written",
  },
  "userSettings.featureMultiEntity": {
    message: "Multi-entity consolidation",
    description: "Plan feature from the pricing table",
  },
};

export default enUserSettings;
