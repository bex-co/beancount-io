const frDirectoryBrowse: Record<
  string,
  { message: string; description: string }
> = {
  "ledgerEditor.cloneRepository": {
    message: "Cloner le dépôt",
    description: "Header for clone repository dialog",
  },
  "ledgerEditor.downloadZip": {
    message: "Télécharger en ZIP",
    description: "Menu item to download as ZIP",
  },
  "ledgerEditor.downloadZipFailed": {
    message: "Impossible de préparer le téléchargement. Veuillez réessayer.",
    description: "Error shown when preparing the ZIP download fails",
  },
  "ledgerEditor.manageSshKeys": {
    message: "Gérer les clés SSH",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "Ce répertoire est vide",
    description: "Message shown when directory has no contents",
  },
  "ledgerEditor.copyHttpCloneUrl": {
    message: "Copier l’URL de clonage HTTP",
    description: "Accessible name for copying the HTTP clone URL",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "Copier l’URL de clonage SSH",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default frDirectoryBrowse;
