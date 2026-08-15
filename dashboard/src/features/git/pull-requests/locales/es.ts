export interface TranslationEntry {
  message: string;
  description: string;
}

const esPullRequests: Record<string, TranslationEntry> = {
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
  "pullRequests.filesChanged": {
    message: "Archivos modificados",
    description: "Label for changed files section",
  },
  "pullRequests.prNotFound": {
    message: "Solicitud de fusión no encontrada",
    description: "Error message when PR doesn't exist",
  },
};

export default esPullRequests;
