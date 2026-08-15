export interface TranslationEntry {
  message: string;
  description: string;
}

const enCollaboration: Record<string, TranslationEntry> = {
  "collaboration.admin": {
    message: "Admin",
    description: "Badge text for admin user",
  },
  "collaboration.permission": {
    message: "Permission",
    description: "Label for permission selector",
  },
  "collaboration.read": {
    message: "Read",
    description: "Read permission level",
  },
  "collaboration.write": {
    message: "Write",
    description: "Write permission level",
  },
  "collaboration.collaboratorAddedSuccess": {
    message: "Collaborator added successfully",
    description: "Success message when collaborator is added",
  },
  "collaboration.collaboratorRemovedSuccess": {
    message: "Collaborator removed successfully",
    description: "Success message when collaborator is removed",
  },
  "collaboration.collaborators": {
    message: "Collaborators",
    description: "People who can access the ledger",
  },
  "collaboration.errorLoadingCollaborators": {
    message: "Error Loading Collaborators",
    description: "Error title when collaborators fail to load",
  },
  "collaboration.failedToAddCollaborator": {
    message: "Failed to add collaborator",
    description: "Error message when adding collaborator fails",
  },
  "collaboration.failedToRemoveCollaborator": {
    message: "Failed to remove collaborator",
    description: "Error message when removing collaborator fails",
  },
  "collaboration.leftLedgerSuccess": {
    message: "Successfully left the ledger",
    description: "Success message when user leaves the ledger",
  },
  "collaboration.failedToLeaveLedger": {
    message: "Failed to leave ledger",
    description: "Error message when leaving ledger fails",
  },
  "collaboration.leaveLedger": {
    message: "Leave Ledger",
    description: "Dialog title for leaving a shared ledger",
  },
  "collaboration.leaveLedgerConfirmation": {
    message:
      "Are you sure you want to leave this ledger? You will lose access and will need to be invited again to regain access.",
    description: "Confirmation message for leaving a shared ledger",
  },
  "collaboration.confirmLeave": {
    message: "Leave Ledger",
    description: "Button text to confirm leaving the ledger",
  },
  "collaboration.inviteCollaborator": {
    message: "Invite Collaborator",
    description: "Button text to invite single collaborator",
  },
  "collaboration.inviteCollaborators": {
    message: "Invite Collaborators",
    description: "Dialog title for inviting collaborators",
  },
  "collaboration.inviteCollaboratorsDescription": {
    message:
      "Search and select users to invite as collaborators to this ledger.",
    description: "Dialog description for inviting collaborators",
  },
  "collaboration.joined": {
    message: "Joined",
    description: "Table column header for join date",
  },
  "collaboration.noCollaborators": {
    message: "No Collaborators",
    description: "Empty state title when no collaborators exist",
  },
  "collaboration.noCollaboratorsDescription": {
    message: "This ledger doesn't have any collaborators yet.",
    description: "Empty state description for collaborators",
  },
  "collaboration.noEmail": {
    message: "No email",
    description: "Label when user has no email",
  },
  "collaboration.noUsersFound": {
    message: "No users found",
    description: "Message when search returns no results",
  },
  "collaboration.removeCollaborator": {
    message: "Remove Collaborator",
    description: "Dialog title and button text for removing collaborator",
  },
  "collaboration.removeCollaboratorConfirmationPrefix": {
    message: "Are you sure you want to remove",
    description: "Prefix for remove collaborator confirmation",
  },
  "collaboration.removeCollaboratorConfirmationSuffix": {
    message: "from this ledger? This action cannot be undone.",
    description: "Suffix for remove collaborator confirmation",
  },
  "collaboration.searchUsers": {
    message: "Search Users",
    description: "Label for user search input",
  },
  "collaboration.searching": {
    message: "Searching...",
    description: "Loading message while searching users",
  },
  "collaboration.selectedUsers": {
    message: "Selected Users",
    description: "Label for selected users list",
  },
  "collaboration.thisUser": {
    message: "this user",
    description: "Fallback text for unknown user",
  },
  "collaboration.typeAtLeast2Characters": {
    message: "Type at least 2 characters to search",
    description: "Message prompting user to enter more characters",
  },
  "collaboration.typeToSearchUsers": {
    message: "Type to search users...",
    description: "Placeholder for user search input",
  },
  "collaboration.unknownUser": {
    message: "Unknown User",
    description: "Label for unknown user",
  },
  "collaboration.user": {
    message: "User",
    description: "Table column header for user",
  },
};

export default enCollaboration;
