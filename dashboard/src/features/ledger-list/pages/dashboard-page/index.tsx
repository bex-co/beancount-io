import { useRef, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "./components/dashboard-layout";
import { ActivityFeed } from "../../components/activity-feed";
import { WhatsNew } from "../../components/whats-new";
import { LedgerForm } from "../../components/ledger-form";
import {
  useCreateLedger,
  type CreateLedgerFormValues,
} from "../../hooks/use-create-ledger";
import { useLedgerFormDialog } from "../../hooks/use-ledger-form-dialog";
import { PageSEO } from "@/common/components/seo/page-seo";
import { LedgerPage, LedgerPageHeading } from "@/common/components/ledger-page";
import { LedgerVisibilityIcon } from "@/common/components/ledger-layout/ledger-visibility-icon";
import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { Skeleton } from "@/common/components/ui/skeleton";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { restoreFocusOnDialogClose } from "@/common/lib/focus/restore-focus-on-dialog-close";
import { decodeLedgerId } from "@/common/lib/utils/encode";
import {
  GetCurrentUserDocument,
  ListLedgersDocument,
} from "@/graphql/definitions";

/**
 * Quick-access ledger list shown in the main flow when the sidebar rests as a
 * drawer or collapsed rail (<xl), so phone and tablet visitors can open or
 * create a ledger directly from Dashboard home.
 */
function MobileLedgersSection() {
  const { t } = useTranslations();
  const navigate = useNavigate();
  const formatError = useErrorMessage();
  const { data, loading } = useQuery(ListLedgersDocument, {
    fetchPolicy: "cache-first",
  });
  const [createLedgerMutation, { loading: createLoading }] = useCreateLedger([
    ListLedgersDocument,
    GetCurrentUserDocument,
  ]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const createReturnFocusRef = useRef<HTMLElement | null>(null);
  const skipCreateFocusRestoreRef = useRef(false);
  const createDialog = useLedgerFormDialog(() => setIsCreateDialogOpen(false));
  const ledgers = data?.listLedgers ?? [];

  const handleCreateLedger = async (values: CreateLedgerFormValues) => {
    try {
      const result = await createLedgerMutation(values);
      setIsCreateDialogOpen(false);
      toast.success(t("page.dashboard.ledgerCreatedSuccess"));
      if (result.data?.createLedger) {
        const { ledgerOwner, ledgerName } = decodeLedgerId(
          result.data.createLedger.id,
        );
        skipCreateFocusRestoreRef.current = true;
        void navigate({
          to: "/ledger/$ledgerOwner/$ledgerName",
          params: { ledgerOwner, ledgerName },
        });
      }
      return true;
    } catch (error) {
      toast.error(formatError(error));
      console.error("Failed to create ledger:", error);
      return false;
    }
  };

  return (
    <section
      aria-labelledby="dashboard-ledgers-heading"
      className="min-h-[104px] space-y-3 xl:hidden"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="dashboard-ledgers-heading"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          {t("page.dashboard.yourLedgers")}
        </h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={(event) => {
            createReturnFocusRef.current = event.currentTarget;
            setIsCreateDialogOpen(true);
          }}
          className="shrink-0 gap-1.5 pointer-coarse:min-h-11 pointer-coarse:px-4"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>{t("page.dashboard.createLedger")}</span>
        </Button>
      </div>
      {loading && ledgers.length === 0 ? (
        <div
          aria-busy="true"
          className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
        >
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="hidden h-16 w-full rounded-xl sm:block" />
        </div>
      ) : ledgers.length > 0 ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {ledgers.map((ledger) => {
            const { ledgerOwner, ledgerName } = decodeLedgerId(ledger.id);
            const displayName = ledgerName || ledger.name;
            return (
              <Link
                key={ledger.id}
                to="/ledger/$ledgerOwner/$ledgerName"
                params={{ ledgerOwner, ledgerName }}
                className="group flex min-h-14 items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <LedgerVisibilityIcon isPrivate={ledger.private} />
                    <span
                      dir="auto"
                      className="truncate text-sm font-medium text-foreground"
                    >
                      {displayName}
                    </span>
                  </div>
                  {ledger.description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {ledger.description}
                    </p>
                  )}
                </div>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>
      ) : null}

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={createDialog.onOpenChange}
      >
        <DialogContent
          busy={createDialog.busy}
          onCloseAutoFocus={(event) => {
            if (skipCreateFocusRestoreRef.current) {
              skipCreateFocusRestoreRef.current = false;
              event.preventDefault();
            } else {
              restoreFocusOnDialogClose(event, createReturnFocusRef.current);
            }
            createReturnFocusRef.current = null;
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("page.dashboard.createNewLedger")}</DialogTitle>
            <DialogDescription>
              {t("page.dashboard.createNewLedgerDescription")}
            </DialogDescription>
          </DialogHeader>
          <LedgerForm
            onSubmit={handleCreateLedger}
            isLoading={createLoading}
            {...createDialog.formProps}
          />
          {createDialog.confirmation}
        </DialogContent>
      </Dialog>
    </section>
  );
}

/**
 * Dashboard page component
 *
 * Protected home, and deliberately only two sections: the releases we shipped
 * for this user, and the work this user did. The blog is written for search
 * visitors rather than signed-in customers — at roughly twenty posts a day and
 * none of them tagged `beancount`, no amount of collapsing makes it worth the
 * space here.
 */
export default function DashboardPage() {
  const { t } = useTranslations();
  return (
    <>
      <PageSEO
        titleKey="seo.dashboard.title"
        descriptionKey="seo.dashboard.description"
        noIndex
      />
      <DashboardLayout>
        <div
          data-scroll-restoration-id="ledger-content"
          className="flex-1 overflow-auto p-4 md:p-6"
        >
          <LedgerPage className="space-y-6">
            <LedgerPageHeading title={t("page.dashboard.dashboard")} />
            <MobileLedgersSection />
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,25rem)] lg:items-start">
              <ActivityFeed />
              <WhatsNew />
            </div>
          </LedgerPage>
        </div>
      </DashboardLayout>
    </>
  );
}
