import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import LedgerQueryPage from "@/features/bql/pages";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

const searchSchema = z.object({
  query: z.string().optional(),
});

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/query")({
  component: LedgerQueryPage,
  validateSearch: searchSchema,
  ssr: false,
  head: ({ params }) =>
    createHeadMeta(
      getSEOMetadata("seo.ledgerQuery.title", "seo.ledgerQuery.description", {
        ledgerName: params.ledgerName,
      }),
    ),
});
