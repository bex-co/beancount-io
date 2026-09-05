import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import AgentPage from "@/features/ai-agent/pages/agent";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

const searchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/agent")({
  component: AgentPage,
  validateSearch: searchSchema,
  head: ({ params, match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.ledgerAsk.title",
        "seo.ledgerAsk.description",
        {
          ledgerName: params.ledgerName,
        },
      ),
      { noIndex: Boolean(match.search.q) },
    ),
});
