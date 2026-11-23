const skDirectoryBrowse: Record<
  string,
  { message: string; description: string }
> = {
  "ledgerEditor.cloneRepository": {
    message: "Klonovať repozitár",
    description: "Header for clone repository dialog",
  },
  "ledgerEditor.downloadZip": {
    message: "Stiahnuť ZIP",
    description: "Menu item to download as ZIP",
  },
  "ledgerEditor.downloadZipBlocked": {
    message:
      "Prehliadač zablokoval sťahovanie. Spustite ho pomocou odkazu nižšie.",
    description:
      "Shown when the browser blocks the automatic ZIP download popup",
  },
  "ledgerEditor.downloadZipFailed": {
    message: "Stiahnutie sa nepodarilo pripraviť. Skúste to znova.",
    description: "Error shown when preparing the ZIP download fails",
  },
  "ledgerEditor.manageSshKeys": {
    message: "Spravovať SSH kľúče",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.folderNotFound": {
    message: "Priečinok sa nenašiel: {path}",
    description:
      "Shown when a ledger folder path does not exist (contains {path})",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "Tento priečinok je prázdny",
    description: "Message shown when directory has no contents",
  },
  "ledgerEditor.copyHttpCloneUrl": {
    message: "Kopírovať HTTP URL klonu",
    description: "Accessible name for copying the HTTP clone URL",
  },
  "ledgerEditor.httpsBeaHint": {
    message:
      "S príkazovým riadkom bea spustite raz {command} a Git sa prihlási za vás. Bez neho:",
    description:
      "Above the username and password hint under the HTTPS clone URL, on a self-hosted server only: the bea CLI command that makes Git sign in by itself. {command} is the literal command `bea cloud git setup`",
  },
  "ledgerEditor.httpsCredentialHint": {
    message:
      "Používateľské meno: ľubovoľné. Heslo: osobný prístupový token, nie heslo k účtu.",
    description:
      "Under the HTTPS clone URL: what to type when git asks for a username and password",
  },
  "ledgerEditor.createAccessToken": {
    message: "Vytvoriť osobný prístupový token",
    description:
      "Link from the HTTPS clone option to the personal access token settings page",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "Kopírovať SSH URL klonu",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default skDirectoryBrowse;
