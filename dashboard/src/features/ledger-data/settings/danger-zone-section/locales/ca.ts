export interface TranslationEntry {
  message: string;
  description: string;
}

const caDangerZoneSection: Record<string, TranslationEntry> = {
  "page.settings.deleteLedgerConfirmationSuffix": {
    message: "i totes les seves dades.",
    description: "Suffix for delete confirmation message",
  },
  "page.settings.deleteLedgerDialogDescription": {
    message:
      "Aquesta acció no es pot desfer. Això eliminarà permanentment el llibre i totes les dades associades.",
    description: "Dialog description for ledger deletion",
  },
  "page.settings.warning": {
    message: "Advertència",
    description: "Warning alert title",
  },
  "page.settings.toConfirm": {
    message: "per confirmar",
    description: "Label suffix for type to confirm",
  },
  "page.settings.dangerZoneDescription": {
    message: "Accions irreversibles que poden causar pèrdua de dades",
    description: "Description for danger zone section",
  },
  "page.settings.typeToConfirm": {
    message: "Escriu",
    description: "Label prefix for type to confirm",
  },
  "page.settings.deleteLedgerWarning": {
    message:
      "Eliminar un llibre és permanent i no es pot desfer. Totes les dades, incloent transaccions, documents i historial es perdran.",
    description: "Warning message about ledger deletion consequences",
  },
  "page.settings.deleteLedgerConfirmationPrefix": {
    message: "Això eliminarà permanentment",
    description: "Prefix for delete confirmation message",
  },
};

export default caDangerZoneSection;
