import { createFileRoute } from "@tanstack/react-router";
import LedgerFilePage from "@/features/ledger-editor/file-editor";
import { z } from "zod";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";

const blobSearchSchema = z.object({
  editMode: z.boolean().optional(),
  lineNumber: z.number().optional(),
});

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
)({
  component: LedgerFilePage,
  validateSearch: (search) => blobSearchSchema.parse(search),
  head: (args) =>
    createLedgerHead(args, "ledgerFiles", {
      noIndex: Boolean(args.match.search.editMode),
    }),
});
