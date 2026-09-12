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
  "ledgerEditor.downloadZipFailed": {
    message: "Kan de download niet voorbereiden. Probeer het opnieuw.",
    description: "Error shown when preparing the ZIP download fails",
  },
  "ledgerEditor.manageSshKeys": {
    message: "SSH-sleutels beheren",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "Deze map is leeg",
    description: "Message shown when directory has no contents",
  },
  "ledgerEditor.copyHttpCloneUrl": {
    message: "HTTP-kloon-URL kopiëren",
    description: "Accessible name for copying the HTTP clone URL",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "SSH-kloon-URL kopiëren",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default nlDirectoryBrowse;
