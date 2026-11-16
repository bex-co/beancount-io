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
  "ledgerEditor.downloadZipBlocked": {
    message:
      "Ihr Browser hat den Download blockiert. Verwenden Sie den Link unten, um ihn zu starten.",
    description:
      "Shown when the browser blocks the automatic ZIP download popup",
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
  "ledgerEditor.httpsCredentialHint": {
    message:
      "Benutzername: beliebig. Passwort: ein persönliches Zugriffstoken, nicht Ihr Kontopasswort.",
    description:
      "Under the HTTPS clone URL: what to type when git asks for a username and password",
  },
  "ledgerEditor.createAccessToken": {
    message: "Persönliches Zugriffstoken erstellen",
    description:
      "Link from the HTTPS clone option to the personal access token settings page",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "SSH-Klon-URL kopieren",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default deDirectoryBrowse;
