import { createFileRoute, notFound } from "@tanstack/react-router";

/**
 * Unknown sub-routes under a matched ledger. Throw so SSR answers 404 instead
 * of rendering the not-found page under a successful 200 match.
 */
export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/$")({
  loader: () => {
    throw notFound();
  },
});
