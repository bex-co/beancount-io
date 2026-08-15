export interface TranslationEntry {
  message: string;
  description: string;
}

const faCollaboration: Record<string, TranslationEntry> = {
  "collaboration.admin": {
    message: "مدیر",
    description: "Badge text for admin user",
  },
  "collaboration.permission": {
    message: "مجوز",
    description: "Label for permission selector",
  },
  "collaboration.read": {
    message: "خواندن",
    description: "Read permission level",
  },
  "collaboration.write": {
    message: "نوشتن",
    description: "Write permission level",
  },
  "collaboration.collaboratorAddedSuccess": {
    message: "همکار با موفقیت اضافه شد",
    description: "Success message when collaborator is added",
  },
  "collaboration.collaboratorRemovedSuccess": {
    message: "همکار با موفقیت حذف شد",
    description: "Success message when collaborator is removed",
  },
  "collaboration.collaborators": {
    message: "همکاران",
    description: "People who can access the ledger",
  },
  "collaboration.errorLoadingCollaborators": {
    message: "خطا در بارگذاری همکاران",
    description: "Error title when collaborators fail to load",
  },
  "collaboration.failedToAddCollaborator": {
    message: "افزودن همکار ناموفق بود",
    description: "Error message when adding collaborator fails",
  },
  "collaboration.failedToRemoveCollaborator": {
    message: "حذف همکار ناموفق بود",
    description: "Error message when removing collaborator fails",
  },
  "collaboration.leftLedgerSuccess": {
    message: "با موفقیت از مخزن خارج شدید",
    description: "Success message when user exits the repository",
  },
  "collaboration.failedToLeaveLedger": {
    message: "خروج از مخزن ناموفق بود",
    description: "Error message when exiting repository fails",
  },
  "collaboration.leaveLedger": {
    message: "خروج از دفتر کل",
    description: "Dialog title for leaving a shared ledger",
  },
  "collaboration.leaveLedgerConfirmation": {
    message:
      "آیا مطمئن هستید که می‌خواهید از این دفتر کل خارج شوید؟ دسترسی خود را از دست می‌دهید و برای بازیابی دسترسی باید دوباره دعوت شوید.",
    description: "Confirmation message for leaving a shared ledger",
  },
  "collaboration.confirmLeave": {
    message: "خروج از دفتر کل",
    description: "Button text to confirm leaving the ledger",
  },
  "collaboration.inviteCollaborator": {
    message: "دعوت همکار",
    description: "Button text to invite single collaborator",
  },
  "collaboration.inviteCollaborators": {
    message: "دعوت همکاران",
    description: "Dialog title for inviting collaborators",
  },
  "collaboration.inviteCollaboratorsDescription": {
    message:
      "کاربران را جستجو و انتخاب کنید تا به عنوان همکار به این دفتر دعوت شوند.",
    description: "Dialog description for inviting collaborators",
  },
  "collaboration.joined": {
    message: "تاریخ عضویت",
    description: "Table column header for join date",
  },
  "collaboration.noCollaborators": {
    message: "همکاری وجود ندارد",
    description: "Empty state title when no collaborators exist",
  },
  "collaboration.noCollaboratorsDescription": {
    message: "این دفتر هنوز هیچ همکاری ندارد.",
    description: "Empty state description for collaborators",
  },
  "collaboration.noEmail": {
    message: "ایمیل ندارد",
    description: "Label when user has no email",
  },
  "collaboration.noUsersFound": {
    message: "کاربری یافت نشد",
    description: "Message when search returns no results",
  },
  "collaboration.removeCollaborator": {
    message: "حذف همکار",
    description: "Dialog title and button text for removing collaborator",
  },
  "collaboration.removeCollaboratorConfirmationPrefix": {
    message: "آیا مطمئن هستید که می‌خواهید",
    description: "Prefix for remove collaborator confirmation",
  },
  "collaboration.removeCollaboratorConfirmationSuffix": {
    message: "را از این دفتر حذف کنید؟ این عمل قابل بازگشت نیست.",
    description: "Suffix for remove collaborator confirmation",
  },
  "collaboration.searchUsers": {
    message: "جستجوی کاربران",
    description: "Label for user search input",
  },
  "collaboration.searching": {
    message: "در حال جستجو...",
    description: "Loading message while searching users",
  },
  "collaboration.selectedUsers": {
    message: "کاربران انتخاب شده",
    description: "Label for selected users list",
  },
  "collaboration.thisUser": {
    message: "این کاربر",
    description: "Fallback text for unknown user",
  },
  "collaboration.typeAtLeast2Characters": {
    message: "برای جستجو حداقل ۲ کاراکتر تایپ کنید",
    description: "Message prompting user to enter more characters",
  },
  "collaboration.typeToSearchUsers": {
    message: "برای جستجوی کاربران تایپ کنید...",
    description: "Placeholder for user search input",
  },
  "collaboration.unknownUser": {
    message: "کاربر ناشناس",
    description: "Label for unknown user",
  },
  "collaboration.user": {
    message: "کاربر",
    description: "Table column header for user",
  },
};

export default faCollaboration;
