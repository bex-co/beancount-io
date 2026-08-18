import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import AskAIPage from "@/features/ai-agent/pages/ask-ai";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

const searchSchema = z.object({
  q: z.string().optional(),
  mode: z.enum(["bql", "sandbox"]).optional(),
});

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/ask")({
  // Ask AI ("Ask me anything about this ledger…") now lives in agent mode.
  // The legacy /ask surface POSTed to /api-gateway/chat, which the backend
  // unregistered in #1656 ("use agent mode as primary mode") — so redirect the
  // whole route to /agent, carrying the ?q= deep-link through (the agent page
  // auto-submits it).
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: "/ledger/$ledgerOwner/$ledgerName/agent",
      params,
      search: search.q ? { q: search.q } : {},
      replace: true,
    });
  },
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
