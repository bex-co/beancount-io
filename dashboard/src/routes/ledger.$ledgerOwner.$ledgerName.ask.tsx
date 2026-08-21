import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import AskAIPage from "@/features/ai-agent/pages/ask-ai";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

const searchSchema = z.object({
  q: z.string().optional(),
  mode: z.enum(["bql", "sandbox"]).optional(),
});

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/ask")({
  // Ask AI posts to /api-gateway/chat, re-registered on the backend alongside
  // the restored Cloudflare-sandbox path (?mode=sandbox streams through the
  // claude-code-sandbox worker; ?mode=bql keeps the local LLM+BQL handler).
  // Plain ?q= deep-links (no explicit mode) still belong to agent mode.
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
  component: AskAIPage,
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
