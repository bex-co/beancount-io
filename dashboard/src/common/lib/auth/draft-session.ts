import { useSyncExternalStore } from "react";

const drafts = new Set<symbol>();
const listeners = new Set<() => void>();
let signInRequired = false;

function setSignInRequired(next: boolean) {
  if (signInRequired === next) return;
  signInRequired = next;
  listeners.forEach((listener) => listener());
}

/** Track dirty, mounted drafts in this document without storing their contents. */
export function registerProtectedDraft() {
  const draft = Symbol();
  drafts.add(draft);
  return () => {
    drafts.delete(draft);
    if (!drafts.size) setSignInRequired(false);
  };
}

export function notifySignedOutDraft(): boolean {
  if (!drafts.size) return false;
  setSignInRequired(true);
  return true;
}

export function getDraftSignInRequired(): boolean {
  return signInRequired;
}

export function clearDraftSignInRequirement() {
  setSignInRequired(false);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDraftSignInRequired() {
  return useSyncExternalStore(subscribe, getDraftSignInRequired, () => false);
}
