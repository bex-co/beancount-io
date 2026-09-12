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
  "ledgerEditor.downloadZipFailed": {
    message:
      "Der Download konnte nicht vorbereitet werden. Bitte erneut versuchen.",
    description: "Error shown when preparing the ZIP download fails",
  },
  "ledgerEditor.manageSshKeys": {
    message: "SSH-Schlüssel verwalten",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "Dieses Verzeichnis ist leer",
    description: "Message shown when directory has no contents",
  },
  "ledgerEditor.copyHttpCloneUrl": {
    message: "HTTP-Klon-URL kopieren",
    description: "Accessible name for copying the HTTP clone URL",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "SSH-Klon-URL kopieren",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default deDirectoryBrowse;
