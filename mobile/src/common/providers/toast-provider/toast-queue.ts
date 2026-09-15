export type ToastType = "success" | "error" | "text" | "loading";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

/** How long a toast stays up when its caller does not say. */
export const DEFAULT_TOAST_DURATION = 2000;

/** A missing (or zero) duration falls back to the default. */
export const toastDuration = (message: Omit<ToastMessage, "id">): number =>
  message.duration || DEFAULT_TOAST_DURATION;

/** Queue a toast after the ones already showing. */
export const withToast = (
  messages: ToastMessage[],
  message: ToastMessage,
): ToastMessage[] => [...messages, message];

/** Dismiss one toast, leaving the rest in order. */
export const withoutToast = (
  messages: ToastMessage[],
  id: string,
): ToastMessage[] => messages.filter((message) => message.id !== id);
