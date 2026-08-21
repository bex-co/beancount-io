import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { useQuery } from "@apollo/client/react";
import { GetLedgerErrorsDocument } from "@/graphql/definitions";
import { useParams } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { Skeleton } from "@/common/components/ui/skeleton";
import { AlertCircle, FileText, Hash } from "lucide-react";
import { useFileNavigate } from "@/common/hooks/use-file-navigate";
import { useCallback } from "react";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLedger } from "@/common/hooks/use-ledger";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";
import { QueryView } from "@/common/components/query-view";

export default function LedgerErrorsPage() {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/errors",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const { ledgerName: ledgerDisplayName } = useLedger();
  const fileNavigate = useFileNavigate();
  const { data, loading, error } = useQuery(GetLedgerErrorsDocument, {
    variables: {
      ledgerId: ledgerId,
    },
  });

  const handleGoToFile = useCallback(
    (filename: string, lineNumber: number) => {
      fileNavigate(ledgerId, "file", filename, { lineNumber, editMode: true });
    },
    [fileNavigate, ledgerId],
  );

  const rows = data?.getLedgerErrors ?? [];

  return (
    <div className="space-y-4">
      <LedgerPageSEO seoKey="ledgerErrors" noIndex />
      <PageHeader
        title={t("page.errors.errors")}
        description={t("common.pageDescription.errors", {
          ledgerName: ledgerDisplayName ?? ledgerName,
        })}
      />

      <QueryView
        loading={loading}
        error={error}
        data={rows}
        loadingSlot={
          <div className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("page.errors.errorMessage")}</TableHead>
                    <TableHead>{t("page.documents.filename")}</TableHead>
                    <TableHead>{t("page.errors.line")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        }
        errorMessage={t("page.errors.failedToLoadErrors")}
        isEmpty={(r) => r.length === 0}
        emptySlot={
          <div className="space-y-4">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {t("page.errors.noErrorsFound")}
                </h3>
                <p className="text-muted-foreground">
                  {t("page.errors.allEntriesParsedSuccessfully")}
                </p>
              </div>
            </div>
          </div>
        }
      >
        {(r) => (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60%] px-2 sm:px-3 py-1.5 sm:py-2">
                    {t("page.errors.errorMessage")}
                  </TableHead>
                  <TableHead className="w-[25%] px-2 sm:px-3 py-1.5 sm:py-2">
                    {t("page.documents.filename")}
                  </TableHead>
                  <TableHead className="w-[15%] px-2 sm:px-3 py-1.5 sm:py-2">
                    {t("page.errors.line")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.map((err, index) => (
                  <TableRow
                    key={`${err.filename ?? ""}-${String(err.lineno ?? 0)}-${index}`}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() =>
                      handleGoToFile(err.filename || "", err.lineno || 0)
                    }
                  >
                    <TableCell className="font-medium px-2 sm:px-3 py-1.5 sm:py-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <span className="text-sm">{err.message}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 sm:px-3 py-1.5 sm:py-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span className="truncate">
                          {err.filename || t("page.errors.unknownFile")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 sm:px-3 py-1.5 sm:py-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Hash className="h-4 w-4" />
                        <span>
                          {err.lineno
                            ? `${t("page.errors.line")} ${err.lineno}`
                            : t("common.unknown")}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </QueryView>

      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.files"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/files`,
          },
          {
            label: t("common.relatedLinks.statistics"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/statistics`,
          },
          {
            label: t("common.relatedLinks.journal"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/journal`,
          },
        ]}
      />
    </div>
  );
}
