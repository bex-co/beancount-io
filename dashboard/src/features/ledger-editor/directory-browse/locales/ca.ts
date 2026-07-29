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
  "ledgerEditor.loadingDirectoryContents": {
    message: "Carregant el contingut del directori...",
    description: "Loading message for directory",
  },
  "ledgerEditor.manageSshKeys": {
    message: "Gestionar claus SSH",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "Aquest directori està buit",
    description: "Message shown when directory has no contents",
  },
};

export default caDirectoryBrowse;
