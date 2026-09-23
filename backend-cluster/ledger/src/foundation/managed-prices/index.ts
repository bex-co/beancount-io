/**
 * Managed price includes (ADR 015). The loader overlays validated feeds as
 * read-only virtual files; services guard writes and counts with the helpers
 * below. Modules that need a specific piece (policy, fetch, cache) import it
 * directly.
 */
export {
  assertNotManagedPricePath,
  managedPriceDirectiveMatcher,
  overlayManagedPrices,
  type ManagedPriceSource,
} from "./managed-price-overlay";
export {
  requestManagedPriceRefresh,
  type ManagedPriceFeedDeps,
} from "./managed-price-cache";
