import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { useQuery } from "@apollo/client/react";
import { Calendar } from "lucide-react";
import { EmptyState } from "@/common/components/empty-state";
import { QueryView } from "@/common/components/query-view";
import {
  GetLedgerDocumentsDocument,
  type GetLedgerDocumentsQuery,
} from "@/graphql/definitions";
import { useParams } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { Badge } from "@/common/components/ui/badge";
import { Skeleton } from "@/common/components/ui/skeleton";
import { formatDateISO } from "@/common/lib/format/format-date-iso";
import { useFileNavigate } from "@/common/hooks/use-file-navigate";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLedger } from "@/common/hooks/use-ledger";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";
import { getClickableRowProps } from "@/common/components/clickable-row";

type LedgerDocument = GetLedgerDocumentsQuery["getLedgerDocuments"][number];

interface DocumentRowProps {
  document: LedgerDocument;
  onActivate: () => void;
}

export function DocumentRow({ document, onActivate }: DocumentRowProps) {
  return (
    <TableRow
      {...getClickableRowProps<HTMLTableRowElement>(onActivate, {
        className: "hover:bg-muted/30",
      })}
    >
      <TableCell className="w-64 font-medium text-primary hover:text-primary/80 px-2 sm:px-3 py-1.5 sm:py-2">
        {document.filename}
      </TableCell>
      <TableCell className="w-40 px-2 sm:px-3 py-1.5 sm:py-2">
        {document.account}
      </TableCell>
      <TableCell className="w-28 text-sm text-muted-foreground px-2 sm:px-3 py-1.5 sm:py-2">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDateISO(document.date)}
        </div>
      </TableCell>
      <TableCell className="w-32 px-2 sm:px-3 py-1.5 sm:py-2">
        <div className="flex flex-wrap gap-1">
          {document.tags && document.tags.length > 0 ? (
            document.tags.map((tag, tagIndex) => (
              <Badge key={tagIndex} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>
      </TableCell>
      <TableCell className="w-32 px-2 sm:px-3 py-1.5 sm:py-2">
        <div className="flex flex-wrap gap-1">
          {document.links && document.links.length > 0 ? (
            document.links.map((link, linkIndex) => (
              <Badge key={linkIndex} variant="outline" className="text-xs">
                {link}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>
      </TableCell>
      <TableCell className="w-40 px-2 sm:px-3 py-1.5 sm:py-2">
        {document.meta && Object.keys(document.meta).length > 0 ? (
          <div className="truncate text-sm text-muted-foreground">
            {JSON.stringify(document.meta)}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
    </TableRow>
  );
}

/**
 * Ledger Documents Page Component
 * Displays a list of documents from the ledger with proper loading and error states
 */
export default function LedgerDocumentsPage() {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/documents",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const { ledgerName: ledgerDisplayName } = useLedger();
  const fileNavigate = useFileNavigate();

  const { data, loading, error } = useQuery(GetLedgerDocumentsDocument, {
    variables: {
      ledgerId: ledgerId,
    },
  });

  const documents = data?.getLedgerDocuments || [];

  return (
    <div className="space-y-4">
      <LedgerPageSEO seoKey="ledgerDocuments" />
      <PageHeader
        title={t("page.documents.documents")}
        description={t("common.pageDescription.documents", {
          ledgerName: ledgerDisplayName ?? ledgerName,
        })}
      />

      <QueryView
        loading={loading}
        error={error}
        data={documents}
        loadingSlot={
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">
                    {t("page.documents.filename")}
                  </TableHead>
                  <TableHead className="w-40">
                    {t("component.searchControls.account")}
                  </TableHead>
                  <TableHead className="w-28">{t("journal.date")}</TableHead>
                  <TableHead className="w-32">
                    {t("page.documents.tags")}
                  </TableHead>
                  <TableHead className="w-32">
                    {t("page.documents.links")}
                  </TableHead>
                  <TableHead className="w-40">
                    {t("page.documents.meta")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="w-64">
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="w-40">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="w-28">
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="w-32">
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="w-32">
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="w-40">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        }
        isEmpty={(d) => d.length === 0}
        emptySlot={
          <EmptyState
            iconName="FileText"
            title={t("page.documents.noDocumentsFound")}
            description={t("page.documents.noDocumentsFoundDescription")}
          />
        }
      >
        {(docs) => (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64 px-2 sm:px-3 py-1.5 sm:py-2">
                    {t("page.documents.filename")}
                  </TableHead>
                  <TableHead className="w-40 px-2 sm:px-3 py-1.5 sm:py-2">
                    {t("component.searchControls.account")}
                  </TableHead>
                  <TableHead className="w-28 px-2 sm:px-3 py-1.5 sm:py-2">
                    {t("journal.date")}
                  </TableHead>
                  <TableHead className="w-32 px-2 sm:px-3 py-1.5 sm:py-2">
                    {t("page.documents.tags")}
                  </TableHead>
                  <TableHead className="w-32 px-2 sm:px-3 py-1.5 sm:py-2">
                    {t("page.documents.links")}
                  </TableHead>
                  <TableHead className="w-40 px-2 sm:px-3 py-1.5 sm:py-2">
                    {t("page.documents.meta")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((document, index) => (
                  <DocumentRow
                    key={`${document.filename}-${index}`}
                    document={document}
                    onActivate={() =>
                      fileNavigate(ledgerId, "file", document.filename)
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </QueryView>

      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.journal"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/journal`,
          },
          {
            label: t("common.relatedLinks.files"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/files`,
          },
          {
            label: t("common.relatedLinks.events"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/events`,
          },
        ]}
      />
    </div>
  );
}
