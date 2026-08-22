import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import AskAgentPage from "@/features/ai-agent/pages/ask-agent";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

const searchSchema = z.object({
  q: z.string().optional(),
  mode: z.enum(["sandbox", "agent"]).optional(),
});

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/ask")({
  // Sandbox Ask-AI (ADR 0005 / m17): ?mode=sandbox|agent renders the harness
  // chat surface, which streams UIMessage from /api-gateway/ask-agent →
  // HarnessAgent → Claude Code in a Cloudflare Sandbox. Mode-less ?q= deep-links
  // still belong to the in-process agent surface.
  beforeLoad: ({ params, search }) => {
    if (!search.mode) {
      throw redirect({
        to: "/ledger/$ledgerOwner/$ledgerName/agent",
        params,
        search: search.q ? { q: search.q } : {},
        replace: true,
      });
    }
  },
  component: AskAgentPage,
  validateSearch: searchSchema,
  head: ({ params, match }) => ({
    ...createHeadMeta(
      getSEOMetadata("seo.ledgerAsk.title", "seo.ledgerAsk.description", {
        ledgerName: params.ledgerName,
      }),
      { noIndex: Boolean(match.search.q) },
    ),
    links: [
      {
        rel: "canonical",
        href: `https://beancount.io/ledger/${encodeURIComponent(params.ledgerOwner)}/${encodeURIComponent(params.ledgerName)}/agent`,
      },
    ],
  }),
});
