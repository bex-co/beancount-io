import { createFileRoute } from "@tanstack/react-router";
import ImportPage from "@/features/importer/pages/import-page";
import { createLedgerHead } from "@/common/lib/seo/ledger-head";

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/import")(
  {
    component: ImportPage,
    head: (args) => createLedgerHead(args, "ledgerImport", { noIndex: true }),
  },
);
