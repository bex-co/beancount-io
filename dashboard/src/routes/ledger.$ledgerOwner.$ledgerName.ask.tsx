import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import SandboxAgentPage from "@/features/ai-agent/pages/sandbox-agent";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

const searchSchema = z.object({
  q: z.string().optional(),
  mode: z.enum(["sandbox", "agent"]).optional(),
});

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/ask")({
  // Sandbox Ask-AI (ADR 0005 / m17): ?mode=sandbox|agent renders the harness
  // chat surface, which streams UIMessage from /api-gateway/sandbox-agent →
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
  component: SandboxAgentPage,
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
