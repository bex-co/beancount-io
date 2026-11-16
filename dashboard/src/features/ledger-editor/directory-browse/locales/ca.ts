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
  "ledgerEditor.downloadZipBlocked": {
    message:
      "El navegador ha blocat la baixada. Utilitzeu l'enllaç següent per iniciar-la.",
    description:
      "Shown when the browser blocks the automatic ZIP download popup",
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
  "ledgerEditor.httpsCredentialHint": {
    message:
      "Usuari: qualsevol. Contrasenya: un testimoni d'accés personal, no la contrasenya del compte.",
    description:
      "Under the HTTPS clone URL: what to type when git asks for a username and password",
  },
  "ledgerEditor.createAccessToken": {
    message: "Crea un testimoni d'accés personal",
    description:
      "Link from the HTTPS clone option to the personal access token settings page",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "Copia l’URL de clonatge SSH",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default caDirectoryBrowse;
