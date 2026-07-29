const deDirectoryBrowse: Record<
  string,
  { message: string; description: string }
> = {
  "ledgerEditor.cloneRepository": {
    message: "Repository klonen",
    description: "Header for clone repository dialog",
  },
  "ledgerEditor.downloadZip": {
    message: "ZIP herunterladen",
    description: "Menu item to download as ZIP",
  },
  "ledgerEditor.loadingDirectoryContents": {
    message: "Verzeichnisinhalt wird geladen...",
    description: "Loading message for directory",
  },
  "ledgerEditor.manageSshKeys": {
    message: "SSH-Schlüssel verwalten",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "Dieses Verzeichnis ist leer",
    description: "Message shown when directory has no contents",
  },
};

export default deDirectoryBrowse;
