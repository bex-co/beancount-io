import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/common/components/page-header";
import { Button } from "@/common/components/ui/button";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";
import { useLedger } from "@/common/hooks/use-ledger";
import { useTranslations } from "@/common/hooks/use-translations";
import { createLedgerId } from "@/common/lib/utils/encode";
import { getLedgerEntryCanonicalUrl } from "@/common/lib/seo/indexability";
import { EntryContextPanel } from "@/features/journal/components/entry-context-panel";

/**
 * Canonical destination for native Share/Copy entry URLs
 * (`/ledger/<owner>/<ledger>/entry/<hash>`). Reuses journal entry-context
 * presentation without paging the whole journal.
 */
export default function EntryPage() {
  const { t } = useTranslations();
  const navigate = useNavigate();
  const { ledgerOwner, ledgerName, entryHash } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/entry/$entryHash",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const { ledgerName: ledgerDisplayName } = useLedger();

  const journalHref = {
    to: "/ledger/$ledgerOwner/$ledgerName/journal" as const,
    params: { ledgerOwner, ledgerName },
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <LedgerPageSEO
        seoKey="ledgerEntry"
        canonicalUrl={getLedgerEntryCanonicalUrl({
          ledgerOwner,
          ledgerName,
          entryHash,
        })}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={t("journal.entryPageTitle")}
          description={t("journal.entryPageDescription", {
            ledgerName: ledgerDisplayName ?? ledgerName,
          })}
        />
        <Button variant="outline" size="sm" className="self-start" asChild>
          <Link {...journalHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("journal.backToJournal")}
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card p-4 shadow-sm sm:p-6">
        <EntryContextPanel
          key={`${ledgerId}:${entryHash}`}
          entryHash={entryHash}
          ledgerId={ledgerId}
          onDeleted={() => {
            void navigate(journalHref);
          }}
        />
      </div>
    </div>
  );
}
