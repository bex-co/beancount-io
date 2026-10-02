import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import LedgerQueryPage from "@/features/bql/pages";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";

const searchSchema = z.object({
  query: z.string().optional(),
});

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/query")({
  component: LedgerQueryPage,
  validateSearch: searchSchema,
  ssr: false,
  remountDeps: ({ params }) => ({
    ledgerOwner: params.ledgerOwner,
    ledgerName: params.ledgerName,
  }),
  head: (args) => createLedgerHead(args, "ledgerQuery", { noIndex: true }),
});
