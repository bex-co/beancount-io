export interface TranslationEntry {
  message: string;
  description: string;
}

const esDangerZoneSection: Record<string, TranslationEntry> = {
  "page.settings.deleteLedgerConfirmationSuffix": {
    message: "y todos sus datos.",
    description: "Suffix for delete confirmation message",
  },
  "page.settings.deleteLedgerDialogDescription": {
    message:
      "Esta acción no se puede deshacer. Esto eliminará permanentemente el libro mayor y todos los datos asociados.",
    description: "Dialog description for ledger deletion",
  },
  "page.settings.warning": {
    message: "Advertencia",
    description: "Warning alert title",
  },
  "page.settings.toConfirm": {
    message: "para confirmar",
    description: "Label suffix for type to confirm",
  },
  "page.settings.dangerZoneDescription": {
    message: "Acciones irreversibles que pueden causar pérdida de datos",
    description: "Description for danger zone section",
  },
  "page.settings.typeToConfirm": {
    message: "Escriba",
    description: "Label prefix for type to confirm",
  },
  "page.settings.deleteLedgerWarning": {
    message:
      "Eliminar un libro mayor es permanente y no se puede deshacer. Todos los datos, incluidas las transacciones, documentos e historial se perderán.",
    description: "Warning message about ledger deletion consequences",
  },
  "page.settings.deleteLedgerConfirmationPrefix": {
    message: "Esto eliminará permanentemente",
    description: "Prefix for delete confirmation message",
  },
};

export default esDangerZoneSection;
