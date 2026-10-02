import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import SandboxAgentPage from "@/features/ai-agent/pages/sandbox-agent";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";

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
  head: (args) =>
    createLedgerHead(args, "ledgerAsk", {
      noIndex: Boolean(args.match.search.q),
    }),
});
