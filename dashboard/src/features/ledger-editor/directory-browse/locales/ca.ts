const caDirectoryBrowse: Record<
  string,
  { message: string; description: string }
> = {
  "ledgerEditor.cloneRepository": {
    message: "Clonar repositori",
    description: "Header for clone repository dialog",
  },
  "ledgerEditor.downloadZip": {
    message: "Descarregar ZIP",
    description: "Menu item to download as ZIP",
  },
  "ledgerEditor.downloadZipFailed": {
    message: "No s'ha pogut preparar la baixada. Torna-ho a provar.",
    description: "Error shown when preparing the ZIP download fails",
  },
  "ledgerEditor.manageSshKeys": {
    message: "Gestionar claus SSH",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "Aquest directori està buit",
    description: "Message shown when directory has no contents",
  },
  "ledgerEditor.copyHttpCloneUrl": {
    message: "Copia l’URL de clonatge HTTP",
    description: "Accessible name for copying the HTTP clone URL",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "Copia l’URL de clonatge SSH",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default caDirectoryBrowse;
