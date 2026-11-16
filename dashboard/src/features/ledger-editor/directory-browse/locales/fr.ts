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
  "ledgerEditor.downloadZipBlocked": {
    message:
      "Votre navigateur a bloqué le téléchargement. Utilisez le lien ci-dessous pour le lancer.",
    description:
      "Shown when the browser blocks the automatic ZIP download popup",
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
  "ledgerEditor.httpsCredentialHint": {
    message:
      "Nom d'utilisateur : n'importe lequel. Mot de passe : un jeton d'accès personnel, pas le mot de passe de votre compte.",
    description:
      "Under the HTTPS clone URL: what to type when git asks for a username and password",
  },
  "ledgerEditor.createAccessToken": {
    message: "Créer un jeton d'accès personnel",
    description:
      "Link from the HTTPS clone option to the personal access token settings page",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "Copier l’URL de clonage SSH",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default frDirectoryBrowse;
