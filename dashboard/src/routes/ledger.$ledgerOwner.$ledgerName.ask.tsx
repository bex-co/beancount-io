import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import AskAIPage from "@/features/ai-agent/pages/ask-ai";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

const searchSchema = z.object({
  q: z.string().optional(),
  mode: z.enum(["bql", "sandbox"]).optional(),
});

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/ask")({
  component: AskAIPage,
  validateSearch: searchSchema,
  head: ({ params }) => ({
    ...createHeadMeta(
      getSEOMetadata("seo.ledgerAsk.title", "seo.ledgerAsk.description", {
        ledgerName: params.ledgerName,
      }),
    ),
  }),
});
