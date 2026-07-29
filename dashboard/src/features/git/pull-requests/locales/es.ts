export interface TranslationEntry {
  message: string;
  description: string;
}

const esPullRequests: Record<string, TranslationEntry> = {
  "pullRequests.reviewPR": {
    message: "Revisar solicitud de fusión",
    description: "Page title for PR review page",
  },
  "pullRequests.createPR": {
    message: "Crear solicitud de fusión",
    description: "Page title for create PR page",
  },
  "pullRequests.approve": {
    message: "Aprobar y fusionar",
    description: "Button text to approve and merge PR",
  },
  "pullRequests.reject": {
    message: "Rechazar y cerrar",
    description: "Button text to reject and close PR",
  },
  "pullRequests.approveSuccess": {
    message: "Solicitud de fusión aprobada y fusionada exitosamente",
    description: "Success message after approving PR",
  },
  "pullRequests.approveError": {
    message: "Error al aprobar la solicitud de fusión",
    description: "Error message when PR approval fails",
  },
  "pullRequests.rejectSuccess": {
    message: "Solicitud de fusión cerrada exitosamente",
    description: "Success message after rejecting PR",
  },
  "pullRequests.rejectError": {
    message: "Error al cerrar la solicitud de fusión",
    description: "Error message when PR rejection fails",
  },
  "pullRequests.changes": {
    message: "Cambios",
    description: "Label for diff viewer section",
  },
  "pullRequests.filesChanged": {
    message: "Archivos modificados",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "Solicitud de fusión no encontrada",
    description: "Error message when PR doesn't exist",
  },
  "pullRequests.loadingPR": {
    message: "Cargando detalles de la solicitud de fusión...",
    description: "Loading message while fetching PR",
  },
};

export default esPullRequests;
