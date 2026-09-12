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
  "ledgerEditor.downloadZipFailed": {
    message: "Stiahnutie sa nepodarilo pripraviť. Skúste to znova.",
    description: "Error shown when preparing the ZIP download fails",
  },
  "ledgerEditor.manageSshKeys": {
    message: "Spravovať SSH kľúče",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "Tento priečinok je prázdny",
    description: "Message shown when directory has no contents",
  },
  "ledgerEditor.copyHttpCloneUrl": {
    message: "Kopírovať HTTP URL klonu",
    description: "Accessible name for copying the HTTP clone URL",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "Kopírovať SSH URL klonu",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default skDirectoryBrowse;
