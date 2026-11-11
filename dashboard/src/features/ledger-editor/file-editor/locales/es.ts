const esFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.rootFileCannotBeDeleted": {
    message: "{filename} es el archivo raíz del libro y no se puede eliminar",
    description:
      "Why Delete is unavailable for the ledger's root file, which the server refuses to delete; {filename} is main.bean",
  },
  "ledgerEditor.fileDownloadFailed": {
    message:
      "No se pudo preparar {filename} para la descarga. Inténtalo de nuevo.",
    description:
      "Error toast when the browser could not generate a file's local download; the file is unchanged and Download can be tried again. {filename} is the file's name",
  },
  "ledgerEditor.alignAmounts": {
    message: "Alinear Montos",
    description: "Menu item to align amounts in editor",
  },
  "ledgerEditor.deleteFileConfirmation": {
    message:
      '¿Está seguro de que desea eliminar "{filename}"? Esta acción no se puede deshacer.',
    description:
      "Confirmation message for file deletion (contains {filename} placeholder)",
  },
  "ledgerEditor.deleteFileTitle": {
    message: "Eliminar archivo",
    description: "Dialog title for file deletion",
  },
  "ledgerEditor.deleteFileIncluded": {
    message:
      "El archivo «{filename}» está incluido en {includers}. ¿Quitar la inclusión y eliminar el archivo? Esta acción no se puede deshacer.",
    description:
      "Confirmation shown when a file other ledger files still include is deleted; {filename} is the file, {includers} the files that include it",
  },
  "ledgerEditor.deleteFileRemoveInclude": {
    message: "Quitar inclusión y eliminar",
    description:
      "Button that deletes a file and also removes the include lines that point at it",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "Error al cargar el contenido del archivo",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileNotFound": {
    message: "Archivo no encontrado: {path}",
    description:
      "Mensaje cuando una ruta de archivo del libro no existe (contiene {path})",
  },
  "ledgerEditor.browseParentDirectory": {
    message: "Explorar directorio superior",
    description:
      "Botón para abrir el directorio Files superior tras un archivo ausente",
  },
  "ledgerEditor.fileDeletedSuccess": {
    message: "Archivo eliminado exitosamente",
    description: "Success message when file is deleted",
  },
  "ledgerEditor.fileSavedSuccess": {
    message: "Archivo guardado exitosamente",
    description: "Success message when file is saved",
  },
  "ledgerEditor.saveConflict": {
    message:
      "Este archivo cambió desde que lo abrió, así que su edición no se guardó. Copie su edición, cargue la versión más reciente y aplíquela allí.",
    description:
      "Inline notice when a file save was refused because another write changed the file since it was opened",
  },
  "ledgerEditor.copyMyEdit": {
    message: "Copiar mi edición",
    description:
      "Copies the unsaved file edit to the clipboard after a conflicting save",
  },
  "ledgerEditor.loadLatest": {
    message: "Cargar la más reciente",
    description:
      "Opens a confirmation to replace the unsaved edit with the file's latest revision",
  },
  "ledgerEditor.loadLatestTitle": {
    message: "¿Reemplazar su edición por la versión más reciente?",
    description:
      "Title of the confirmation before replacing the unsaved edit with the latest revision",
  },
  "ledgerEditor.loadLatestDescription": {
    message:
      "El editor mostrará el archivo tal como está ahora. Su edición sin guardar se perderá si no la copió.",
    description:
      "Explains that loading the latest revision replaces the unsaved edit",
  },
  "ledgerEditor.loadLatestConfirm": {
    message: "Reemplazar mi edición",
    description: "Confirms replacing the unsaved edit with the latest revision",
  },
  "ledgerEditor.foldAll": {
    message: "Plegar Todo",
    description: "Menu item to fold all sections in editor",
  },
  "ledgerEditor.leaveWithoutSaving": {
    message: "Salir Sin Guardar",
    description: "Button to leave page without saving changes",
  },
  "ledgerEditor.loadingFileContent": {
    message: "Cargando contenido del archivo...",
    description: "Loading message while fetching file content",
  },
  "ledgerEditor.stay": {
    message: "Permanecer",
    description: "Button to stay on current page with unsaved changes",
  },
  "ledgerEditor.toggleComment": {
    message: "Alternar Comentario",
    description: "Menu item to toggle comment in editor",
  },
  "ledgerEditor.unfoldAll": {
    message: "Desplegar Todo",
    description: "Menu item to unfold all sections in editor",
  },
  "ledgerEditor.unsavedChanges": {
    message: "Cambios Sin Guardar",
    description: "Dialog title for unsaved changes warning",
  },
  "ledgerEditor.unsavedChangesMessage": {
    message:
      "Tiene cambios sin guardar. ¿Está seguro de que desea salir? Sus cambios se perderán.",
    description: "Warning message about losing unsaved changes",
  },
  "ledgerEditor.unsupportedFileFormat": {
    message: "Formato de archivo no compatible",
    description: "Message shown for files that cannot be displayed",
  },
};

export default esFileEditor;
