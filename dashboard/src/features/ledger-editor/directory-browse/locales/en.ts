const enDirectoryBrowse: Record<
  string,
  { message: string; description: string }
> = {
  "ledgerEditor.cloneRepository": {
    message: "Clone Repository",
    description: "Header for clone repository dialog",
  },
  "ledgerEditor.downloadZip": {
    message: "Download ZIP",
    description: "Menu item to download as ZIP",
  },
  "ledgerEditor.downloadZipBlocked": {
    message:
      "Your browser blocked the download. Use the link below to start it.",
    description:
      "Shown when the browser blocks the automatic ZIP download popup",
  },
  "ledgerEditor.downloadZipFailed": {
    message: "Could not prepare the download. Please try again.",
    description: "Error shown when preparing the ZIP download fails",
  },
  "ledgerEditor.manageSshKeys": {
    message: "Manage SSH Keys",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "This directory is empty",
    description: "Message shown when directory has no contents",
  },
  "ledgerEditor.copyHttpCloneUrl": {
    message: "Copy HTTP clone URL",
    description: "Accessible name for copying the HTTP clone URL",
  },
  "ledgerEditor.httpsBeaHint": {
    message:
      "With the bea command line, run {command} once and Git signs in for you. Without it:",
    description:
      "Above the username and password hint under the HTTPS clone URL, on a self-hosted server only: the bea CLI command that makes Git sign in by itself. {command} is the literal command `bea cloud git setup`",
  },
  "ledgerEditor.httpsCredentialHint": {
    message:
      "Username: anything. Password: a personal access token, not your account password.",
    description:
      "Under the HTTPS clone URL: what to type when git asks for a username and password",
  },
  "ledgerEditor.createAccessToken": {
    message: "Create a personal access token",
    description:
      "Link from the HTTPS clone option to the personal access token settings page",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "Copy SSH clone URL",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default enDirectoryBrowse;
