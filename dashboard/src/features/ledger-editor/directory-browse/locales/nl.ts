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
  "ledgerEditor.downloadZipBlocked": {
    message:
      "Uw browser heeft de download geblokkeerd. Gebruik de onderstaande link om te starten.",
    description:
      "Shown when the browser blocks the automatic ZIP download popup",
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
  "ledgerEditor.httpsBeaHint": {
    message:
      "Met de bea-opdrachtregel voer je {command} één keer uit en meldt Git zich voor je aan. Zonder:",
    description:
      "Above the username and password hint under the HTTPS clone URL, on a self-hosted server only: the bea CLI command that makes Git sign in by itself. {command} is the literal command `bea cloud git setup`",
  },
  "ledgerEditor.httpsCredentialHint": {
    message:
      "Gebruikersnaam: willekeurig. Wachtwoord: een persoonlijk toegangstoken, niet je accountwachtwoord.",
    description:
      "Under the HTTPS clone URL: what to type when git asks for a username and password",
  },
  "ledgerEditor.createAccessToken": {
    message: "Persoonlijk toegangstoken aanmaken",
    description:
      "Link from the HTTPS clone option to the personal access token settings page",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "SSH-kloon-URL kopiëren",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default nlDirectoryBrowse;
