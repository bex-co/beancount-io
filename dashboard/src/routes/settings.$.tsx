import { createFileRoute, notFound } from "@tanstack/react-router";

/**
 * Unknown `/settings/...` sub-routes. Throw so SSR answers 404 instead of
 * rendering the not-found page under a successful 200 match.
 */
export const Route = createFileRoute("/settings/$")({
  loader: () => {
    throw notFound();
  },
});
