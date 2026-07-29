export type StreamingState =
  | "idle"
  | "connecting"
  | "streaming"
  | "finalizing"
  | "complete"
  | "error";

export interface StreamingStatus {
  state: StreamingState;
  error?: string | null;
}
