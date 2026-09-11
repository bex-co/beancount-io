import {
  createFileRoute,
  notFound,
  redirect,
  retainSearchParams,
} from "@tanstack/react-router";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { LedgerLayout } from "@/common/components/ledger-layout";
import { LedgerRouteError } from "@/common/components/ledger-layout/ledger-route-error";
import { getSafeRedirectPath } from "@/common/lib/auth/auth";
import { ledgerFilterSearchSchema } from "@/common/lib/ledger-search-params";
import { GetLedgerDocument } from "@/graphql/definitions";

function ledgerAccessCode(error: unknown): string | undefined {
  if (!CombinedGraphQLErrors.is(error)) return undefined;
  for (const gqlError of error.errors) {
    const code = gqlError.extensions?.code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName")({
  component: LedgerLayout,
  errorComponent: LedgerRouteError,
  validateSearch: (search) => ledgerFilterSearchSchema.parse(search),
  search: {
    // Keep account/filter/time across same-ledger report navigation (Related
    // Pages, sidebar). Explicit clears set the keys to undefined so retention
    // does not restore them. Ledger switches clear these in the switcher.
    middlewares: [retainSearchParams(["account", "filter", "time"])],
  },
  loader: async ({ params, context, location }) => {
    const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
    // Only the ledger itself gates the route: its failure (not found,
    // private) surfaces as the route error. Sidebar counts belong to the
    // panels that show them — DirectiveUsageIndicator owns its directive
    // count and renders nothing until the real number exists — so they never
    // delay primary content and never flash a false zero.
    //
    // Map known access denials to router redirect/notFound *before* the
    // SSR boundary: Seroval's ShallowErrorPlugin keeps only Error.message,
    // stripping Apollo's CombinedGraphQLErrors brand so the errorComponent
    // cannot classify UNAUTHENTICATED vs FORBIDDEN after hydration.
    try {
      await context.client.query({
        query: GetLedgerDocument,
        variables: { ledgerId },
      });
    } catch (error) {
      const code = ledgerAccessCode(error);
      if (code === "UNAUTHENTICATED") {
        const next = getSafeRedirectPath(
          `${location.pathname}${location.searchStr ?? ""}${location.hash ?? ""}`,
        );
        throw redirect({
          to: "/auth/login",
          search: { next },
        });
      }
      if (code === "FORBIDDEN" || code === "NOT_FOUND") {
        throw notFound();
      }
      throw error;
    }
  },
});
