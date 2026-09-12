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
  "ledgerEditor.copySshCloneUrl": {
    message: "Copy SSH clone URL",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default enDirectoryBrowse;
