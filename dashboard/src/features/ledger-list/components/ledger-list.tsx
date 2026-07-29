import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Edit, Trash2, AlertCircle, RefreshCw } from "lucide-react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Skeleton } from "@/common/components/ui/skeleton";
import { Button } from "@/common/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Badge } from "@/common/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/ui/dialog";
import {
  ListLedgersDocument,
  CreateLedgerDocument,
  UpdateLedgerDocument,
  DeleteLedgerDocument,
  GetCurrentUserDocument,
  type ListLedgersQuery,
} from "@/graphql/definitions";
import { formatDistance } from "date-fns";
import { type CreateLedgerMutationVariables } from "@/graphql/definitions";
import { LedgerForm } from "./ledger-form";
import { toast } from "sonner";
import { useApolloCacheClear } from "@/common/hooks/use-apollo-cache";
import { decodeLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { getClickableRowProps } from "@/common/components/clickable-row";
import { EmptyState } from "@/common/components/empty-state";

type ListLedgerItem = ListLedgersQuery["listLedgers"][number];
/**
 * Loading skeleton for ledger list table
 */
function LedgerListSkeleton() {
  const { t } = useTranslations();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("page.dashboard.yourLedgers")}</CardTitle>
        <CardDescription>{t("page.dashboard.manageLedgers")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("common.owner")}</TableHead>
              <TableHead>{t("common.lastUpdated")}</TableHead>
              <TableHead className="text-right">
                {t("common.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-24" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-8 w-16 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/**
 * Error state component for ledger list
 */
function LedgerListError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslations();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("page.dashboard.yourLedgers")}</CardTitle>
        <CardDescription>{t("page.dashboard.manageLedgers")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg">
              {t("page.dashboard.failedToLoadLedgers")}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t("page.dashboard.failedToLoadLedgersDescription")}
            </p>
          </div>
          <Button onClick={onRetry} variant="outline" className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("page.dashboard.retry")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Ledger list component with CRUD operations
 * Displays all user ledgers in a table format with create, edit, delete, and view actions
 */
export function LedgerList() {
  const navigate = useNavigate();
  const cleanCache = useApolloCacheClear();
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLedger, setEditingLedger] = useState<ListLedgerItem | null>(
    null,
  );
  const [deletingLedger, setDeletingLedger] = useState<ListLedgerItem | null>(
    null,
  );

  const {
    data,
    loading: isLoading,
    error,
    refetch,
  } = useQuery(ListLedgersDocument, { fetchPolicy: "cache-and-network" });
  const [createLedgerMutation, { loading: createLoading }] = useMutation(
    CreateLedgerDocument,
    {
      refetchQueries: [ListLedgersDocument, GetCurrentUserDocument],
    },
  );
  const [updateLedgerMutation, { loading: updateLoading }] = useMutation(
    UpdateLedgerDocument,
    {
      refetchQueries: [ListLedgersDocument],
      update: (cache, { data }) => {
        // If ledger ID changed (due to name change), evict old cache entries
        if (data?.updateLedger && editingLedger) {
          const oldId = editingLedger.id;
          const newId = data.updateLedger.id;

          if (oldId !== newId) {
            // Evict all cached queries for the old ledger ID
            cache.evict({ id: `Ledger:${oldId}` });
            cache.gc(); // Garbage collect to remove orphaned entries
          }
        }
      },
    },
  );
  const [deleteLedgerMutation, { loading: deleteLoading }] = useMutation(
    DeleteLedgerDocument,
    {
      refetchQueries: [ListLedgersDocument, GetCurrentUserDocument],
    },
  );

  const ledgers = data?.listLedgers || [];

  const handleCreateLedger = async (data: CreateLedgerMutationVariables) => {
    try {
      await createLedgerMutation({ variables: data });
      setIsCreateDialogOpen(false);
      toast.success(t("page.dashboard.ledgerCreatedSuccess"));
    } catch (error) {
      toast.error(formatError(error));
      console.error("Failed to create ledger:", error);
    }
  };

  const handleDeleteLedger = async (ledger: ListLedgerItem) => {
    try {
      await deleteLedgerMutation({ variables: { ledgerId: ledger.id } });
      setDeletingLedger(null);
      cleanCache(); // Clear all cache after mutation completes
      toast.success(t("page.dashboard.ledgerDeletedSuccess"));
    } catch (error) {
      toast.error(formatError(error));
      console.error("Failed to delete ledger:", error);
    }
  };

  const handleViewLedger = (ledger: ListLedgerItem) => {
    const { ledgerOwner, ledgerName } = decodeLedgerId(ledger.id);
    void navigate({ to: `/ledger/${ledgerOwner}/${ledgerName}` });
  };

  if (isLoading) {
    return <LedgerListSkeleton />;
  }

  if (error) {
    return <LedgerListError onRetry={() => refetch()} />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="hidden md:block">
            <CardTitle>{t("page.dashboard.yourLedgers")}</CardTitle>
            <CardDescription>
              {t("page.dashboard.manageLedgersDescription")}
            </CardDescription>
          </div>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            {ledgers.length > 0 ? (
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("page.dashboard.createLedger")}
                </Button>
              </DialogTrigger>
            ) : null}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("page.dashboard.createNewLedger")}</DialogTitle>
                <DialogDescription>
                  {t("page.dashboard.createNewLedgerDescription")}
                </DialogDescription>
              </DialogHeader>
              <LedgerForm
                onSubmit={handleCreateLedger}
                isLoading={createLoading}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!ledgers || ledgers.length === 0 ? (
          <EmptyState
            title={t("page.dashboard.noLedgersFound")}
            description={t("page.dashboard.createNewLedgerDescription")}
            iconName="BookOpen"
            className="border-0 shadow-none"
            action={
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 size-4" />
                {t("page.dashboard.createLedger")}
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("common.owner")}</TableHead>
                <TableHead>{t("common.lastUpdated")}</TableHead>
                <TableHead className="text-right">
                  {t("common.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgers.map((ledger: ListLedgerItem) => {
                return (
                  <TableRow
                    key={ledger.id}
                    {...getClickableRowProps<HTMLTableRowElement>(
                      () => handleViewLedger(ledger),
                      {
                        className:
                          "hover:bg-accent transition-colors duration-200",
                      },
                    )}
                  >
                    <TableCell className="font-medium">{ledger.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {ledger.private
                          ? t("page.dashboard.private")
                          : t("page.dashboard.public")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {ledger.fullName.split("/")[0]}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {formatDistance(
                          new Date(ledger.updatedAt),
                          new Date(),
                          {
                            addSuffix: true,
                          },
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {ledger.permissions?.admin ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingLedger(ledger);
                            }}
                            title={t("page.dashboard.editLedger")}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingLedger(ledger);
                            }}
                            title={t("page.dashboard.deleteLedger")}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="font-medium text-muted-foreground">
                          -
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingLedger}
        onOpenChange={() => setEditingLedger(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("page.dashboard.editLedgerSettings")}</DialogTitle>
            <DialogDescription>
              {t("page.dashboard.updateLedgerDetails")}
            </DialogDescription>
          </DialogHeader>
          {editingLedger && (
            <LedgerForm
              initialData={{
                name: editingLedger.name,
                description: editingLedger.description || undefined,
                private: editingLedger.private,
              }}
              onSubmit={async (data) => {
                try {
                  const result = await updateLedgerMutation({
                    variables: {
                      ledgerId: editingLedger.id,
                      name: data.name,
                      description: data.description,
                      private: data.private,
                    },
                  });

                  setEditingLedger(null);
                  toast.success(t("page.dashboard.ledgerUpdatedSuccess"));

                  // If ledger ID changed (name was updated) and user is viewing this ledger, redirect
                  if (result.data?.updateLedger) {
                    const newId = result.data.updateLedger.id;
                    if (newId !== editingLedger.id) {
                      // Check if user is currently viewing the edited ledger
                      const { ledgerOwner: oldOwner, ledgerName: oldName } =
                        decodeLedgerId(editingLedger.id);
                      if (
                        window.location.pathname.includes(
                          `/ledger/${oldOwner}/${oldName}`,
                        )
                      ) {
                        // Navigate to the renamed ledger
                        const { ledgerOwner, ledgerName } =
                          decodeLedgerId(newId);
                        void navigate({
                          to: `/ledger/${ledgerOwner}/${ledgerName}`,
                        });
                      }
                    }
                  }
                } catch (error) {
                  toast.error(formatError(error));
                  console.error("Failed to update ledger:", error);
                }
              }}
              isLoading={updateLoading}
              onCancel={() => setEditingLedger(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingLedger}
        onOpenChange={() => setDeletingLedger(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("page.dashboard.deleteLedger")}</DialogTitle>
            <DialogDescription>
              {t("page.dashboard.deleteLedgerConfirm", {
                name: deletingLedger?.name || "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingLedger(null)}
              disabled={deleteLoading}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deletingLedger && handleDeleteLedger(deletingLedger)
              }
              disabled={deleteLoading}
            >
              {deleteLoading
                ? t("page.dashboard.deleting")
                : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
