const nlDirectoryBrowse: Record<
  string,
  { message: string; description: string }
> = {
  "ledgerEditor.cloneRepository": {
    message: "Repository klonen",
    description: "Header for clone repository dialog",
  },
  "ledgerEditor.downloadZip": {
    message: "ZIP downloaden",
    description: "Menu item to download as ZIP",
  },
  "ledgerEditor.loadingDirectoryContents": {
    message: "Mapinhoud laden...",
    description: "Loading message for directory",
  },
  "ledgerEditor.manageSshKeys": {
    message: "SSH-sleutels beheren",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "Deze map is leeg",
    description: "Message shown when directory has no contents",
  },
};

export default nlDirectoryBrowse;
