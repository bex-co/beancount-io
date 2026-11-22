import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { searchString } from "@/common/lib/search-params/tolerant";

const searchSchema = z.object({
  q: searchString(),
});

/**
 * `/ask` is an old address for Ask AI, still used by the quick-ask box and
 * by `?q=` deep links. It always lands on `/agent`, keeping the question.
 */
export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/ask")({
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: "/ledger/$ledgerOwner/$ledgerName/agent",
      params,
      search: search.q ? { q: search.q } : {},
      replace: true,
    });
  },
  validateSearch: searchSchema,
});
