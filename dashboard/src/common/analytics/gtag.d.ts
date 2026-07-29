// Explicit reference so the Gtag namespace is resolved in this module-mode file.
// @types/gtag.js uses a non-standard package name (with .js suffix) that
// TypeScript's auto-include heuristic may not pick up reliably.
/// <reference types="gtag.js" />

// Augment Window with gtag using the official @types/gtag.js definitions.
// The Gtag namespace (all 6 commands, 37 named events, all param interfaces)
// is provided by that package — no hand-written types needed here.
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: Gtag.Gtag;
  }
}

export {};
