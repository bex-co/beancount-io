import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import LedgerUploadFilesPage from "@/features/ledger-editor/upload-files";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";

// Empty search schema - this route uses path params only
const searchSchema = z.object({});

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/files/upload/$branch/$",
)({
  component: LedgerUploadFilesPage,
  validateSearch: (search) => searchSchema.parse(search),
  head: (args) =>
    createLedgerHead(args, "ledgerFilesUpload", { noIndex: true }),
});
