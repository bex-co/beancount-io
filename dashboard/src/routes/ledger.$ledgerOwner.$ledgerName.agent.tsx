import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import AgentPage from "@/features/ai-agent/pages/agent";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";

const searchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/agent")({
  component: AgentPage,
  validateSearch: searchSchema,
  head: (args) =>
    createLedgerHead(args, "ledgerAsk", {
      noIndex: Boolean(args.match.search.q),
    }),
});
