/**
 * Stand-in for `expo-haptics`, which is a native module and cannot load in the
 * test runner. Records what was asked for so a test can assert the intent→call
 * mapping, and can be told to reject so the wrapper's guard is exercised.
 */

export type HapticCall = { method: string; argument?: string };

export const ImpactFeedbackStyle = {
  Light: "light",
  Medium: "medium",
  Heavy: "heavy",
  Rigid: "rigid",
  Soft: "soft",
} as const;

export const NotificationFeedbackType = {
  Success: "success",
  Warning: "warning",
  Error: "error",
} as const;

export const calls: HapticCall[] = [];

/** When true, every call returns a rejected promise. */
export const state = { rejectEverything: false, throwSynchronously: false };

export function reset(): void {
  calls.length = 0;
  state.rejectEverything = false;
  state.throwSynchronously = false;
}

function record(method: string, argument?: string): Promise<void> {
  if (state.throwSynchronously) {
    throw new Error("native module unavailable");
  }
  calls.push({ method, argument });
  return state.rejectEverything
    ? Promise.reject(new Error("haptics unavailable"))
    : Promise.resolve();
}

export function selectionAsync(): Promise<void> {
  return record("selectionAsync");
}

export function impactAsync(style: string): Promise<void> {
  return record("impactAsync", style);
}

export function notificationAsync(type: string): Promise<void> {
  return record("notificationAsync", type);
}
