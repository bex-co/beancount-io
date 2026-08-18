import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  RefreshCw,
  MoreVertical,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useMutation } from "@apollo/client/react";
import { Button, buttonVariants } from "@/common/components/ui/button";
import { EmptyState } from "@/common/components/empty-state";
import { LedgerVisibilityIcon } from "@/common/components/ledger-layout/ledger-visibility-icon";
import { cn } from "@/common/lib/utils/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSkeleton,
  SidebarRail,
} from "@/common/components/ui/sidebar.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/common/components/ui/alert-dialog";
import {
  ListLedgersDocument,
  CreateLedgerDocument,
  UpdateLedgerDocument,
  DeleteLedgerDocument,
  GetCurrentUserDocument,
  type ListLedgersQuery,
  type CreateLedgerMutationVariables,
} from "@/graphql/definitions";
import { LedgerForm } from "@/features/ledger-list/components/ledger-form";
import { toast } from "sonner";
import { useApolloCacheClear } from "@/common/hooks/use-apollo-cache";
import { decodeLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";

type ListLedgerItem = ListLedgersQuery["listLedgers"][number];

interface LedgerItemProps {
  ledger: ListLedgerItem;
  ledgerOwner: string;
  ledgerName: string;
  onView: (ledgerId: string) => void;
  onEdit: (ledgerId: string) => void;
  onDelete: (ledgerId: string, returnFocusTo?: HTMLElement | null) => void;
}

interface ErrorStateProps {
  onRetry: () => void;
}

interface LedgerListDataProps {
  ledgers: ListLedgerItem[];
  onView: (ledgerId: string) => void;
  onEdit: (ledgerId: string) => void;
  onDelete: (ledgerId: string, returnFocusTo?: HTMLElement | null) => void;
  onCreateLedger: () => void;
}

/**
 * Truncated text that reveals its full content in a tooltip on hover.
 * The span stays unfocusable on purpose: it lives inside the row button, so a
 * tab stop here would nest focusable content in a button and add two stops per
 * row. Keyboard and screen-reader users get the full text from the button's
 * accessible name instead.
 */
function TruncatedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("truncate", className)}>{text}</span>
      </TooltipTrigger>
      <TooltipContent side="right">{text}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Ledger item component for sidebar menu
 * Displays ledger name with a visibility badge, plus an owner/meta line.
 * Row navigation and the admin settings dropdown are sibling interactive
 * elements (SidebarMenuAction idiom), never nested.
 */
function LedgerItem({
  ledger,
  ledgerOwner,
  ledgerName,
  onView,
  onEdit,
  onDelete,
}: LedgerItemProps) {
  const { t } = useTranslations();
  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const displayName = ledgerName || ledger.name;
  const meta =
    ledger.description ||
    formatDistanceToNow(new Date(ledger.updatedAt), { addSuffix: true });
  const metaLine = ledgerOwner ? `${ledgerOwner} · ${meta}` : meta;
  return (
    <SidebarMenuItem data-testid="ledger-item">
      <SidebarMenuButton
        onClick={() => onView(ledger.id)}
        className="flex flex-col items-start h-auto py-2 pr-8"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <LedgerVisibilityIcon isPrivate={ledger.private} />
          <TruncatedText text={displayName} className="text-sm" />
        </div>
        <TruncatedText
          text={metaLine}
          className="text-xs text-muted-foreground"
        />
      </SidebarMenuButton>
      {ledger.permissions?.admin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction
              ref={settingsTriggerRef}
              aria-label={t("common.settings")}
              title={t("common.settings")}
              data-testid="ledger-settings-btn"
              className="top-1/2 -translate-y-1/2 peer-data-[size=default]/menu-button:top-1/2 right-2 h-6 w-6"
            >
              <MoreVertical />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right">
            <DropdownMenuItem onClick={() => onEdit(ledger.id)}>
              <Edit className="h-4 w-4 mr-2" />
              {t("page.dashboard.editLedger")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(ledger.id, settingsTriggerRef.current)}
              className="text-destructive focus:text-destructive"
              data-testid="delete-ledger-menu-item"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("page.dashboard.deleteLedger")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </SidebarMenuItem>
  );
}

/**
 * Loading skeleton for sidebar ledger list
 * Row count approximates the user's real ledger count when known
 */
function SidebarLedgerSkeleton({ count }: { count: number }) {
  return (
    <div aria-busy="true">
      <SidebarMenu aria-hidden="true">
        {Array.from({ length: count }).map((_, i) => (
          <SidebarMenuSkeleton key={i} showIcon={false} />
        ))}
      </SidebarMenu>
    </div>
  );
}

/**
 * Error state for sidebar ledger list with retry
 */
function SidebarLedgerError({ onRetry }: ErrorStateProps) {
  const { t } = useTranslations();
  return (
    <div className="p-4 text-center">
      <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
      <p className="text-sm mb-2 text-muted-foreground">
        {t("page.dashboard.failedToLoadLedgers")}
      </p>
      <Button onClick={onRetry} size="sm" variant="outline">
        <RefreshCw className="h-4 w-4 mr-2" />
        {t("page.dashboard.retry")}
      </Button>
    </div>
  );
}

/**
 * Ledger list data component
 * Displays the list of ledgers or empty state
 */
function LedgerListData({
  ledgers,
  onView,
  onEdit,
  onDelete,
  onCreateLedger,
}: LedgerListDataProps) {
  const { t } = useTranslations();

  // Empty state
  if (ledgers.length === 0) {
    return (
      <div className="px-2">
        <EmptyState
          iconName="BookOpen"
          title={t("page.dashboard.noLedgersFound")}
          description={t("page.dashboard.noLedgersDescription")}
          action={
            <Button
              onClick={onCreateLedger}
              size="sm"
              variant="outline"
              data-testid="empty-state-create-ledger-btn"
            >
              <Plus className="h-4 w-4" />
              {t("page.dashboard.createLedger")}
            </Button>
          }
          className="border-0 bg-transparent shadow-none"
        />
      </div>
    );
  }

  // Data state with ledgers
  return (
    <SidebarMenu>
      {ledgers.map((ledger: ListLedgerItem) => {
        const { ledgerOwner, ledgerName } = decodeLedgerId(ledger.id);

        return (
          <LedgerItem
            key={ledger.id}
            ledger={ledger}
            ledgerOwner={ledgerOwner}
            ledgerName={ledgerName}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        );
      })}
    </SidebarMenu>
  );
}

/**
 * Dashboard sidebar component
 * Manages data fetching, mutations, and state
 * Delegates UI rendering to child components
 */
export function DashboardSidebar() {
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
  const deleteReturnFocusRef = useRef<HTMLElement | null>(null);

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
      const result = await createLedgerMutation({ variables: data });
      setIsCreateDialogOpen(false);
      toast.success(t("page.dashboard.ledgerCreatedSuccess"));

      // Navigate to the newly created ledger
      if (result.data?.createLedger) {
        const { ledgerOwner, ledgerName } = decodeLedgerId(
          result.data.createLedger.id,
        );
        void navigate({ to: `/ledger/${ledgerOwner}/${ledgerName}` });
      }
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

  const handleViewLedger = (ledgerId: string) => {
    const { ledgerOwner, ledgerName } = decodeLedgerId(ledgerId);
    void navigate({ to: `/ledger/${ledgerOwner}/${ledgerName}` });
  };

  const handleEditLedger = (ledgerId: string) => {
    const ledger = ledgers.find((l) => l.id === ledgerId);
    if (ledger) setEditingLedger(ledger);
  };

  const handleSetDeletingLedger = (
    ledgerId: string,
    returnFocusTo?: HTMLElement | null,
  ) => {
    const ledger = ledgers.find((l) => l.id === ledgerId);
    if (ledger) {
      // Remember the opening trigger so the delete dialog can return focus
      // to it on close (Radix can't: the menu item that opened it unmounts).
      deleteReturnFocusRef.current = returnFocusTo ?? null;
      setDeletingLedger(ledger);
    }
  };

  return (
    <>
      <Sidebar>
        <SidebarHeader className="h-16 shrink-0 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 flex flex-row items-center p-2">
          {/* Logo + "Dashboard" text (clickable) */}
          <button
            onClick={() => navigate({ to: "/ledger" })}
            aria-label={t("page.dashboard.goToDashboard")}
            className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <img src="/lgasset/logo.png" alt="" className="h-8 w-8 rounded" />
            </div>
            <span className="font-semibold truncate">
              {t("page.dashboard.dashboard")}
            </span>
          </button>
        </SidebarHeader>

        <SidebarContent>
          {/* Create Ledger Section */}
          <SidebarGroup className="pb-0">
            <SidebarGroupContent>
              <div className="px-2">
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  data-testid="create-ledger-btn"
                >
                  <Plus className="h-4 w-4" />
                  {t("page.dashboard.createLedger")}
                </Button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>
              {t("page.dashboard.yourLedgers")}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              {isLoading && (
                <SidebarLedgerSkeleton count={ledgers.length || 3} />
              )}
              {error && <SidebarLedgerError onRetry={() => refetch()} />}
              {!isLoading && !error && (
                <LedgerListData
                  ledgers={ledgers}
                  onView={handleViewLedger}
                  onEdit={handleEditLedger}
                  onDelete={handleSetDeletingLedger}
                  onCreateLedger={() => setIsCreateDialogOpen(true)}
                />
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent data-testid="create-ledger-dialog">
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
      <AlertDialog
        open={!!deletingLedger}
        onOpenChange={() => setDeletingLedger(null)}
      >
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            const trigger = deleteReturnFocusRef.current;
            deleteReturnFocusRef.current = null;
            if (trigger && document.contains(trigger)) {
              event.preventDefault();
              trigger.focus();
            }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("page.dashboard.deleteLedger")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("page.dashboard.deleteLedgerConfirm", {
                name: deletingLedger?.name || "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeletingLedger(null)}
              disabled={deleteLoading}
            >
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Keep the dialog open (showing the deleting state) until the
                // mutation completes; handleDeleteLedger closes it on success.
                e.preventDefault();
                if (deletingLedger) void handleDeleteLedger(deletingLedger);
              }}
              disabled={deleteLoading}
              data-testid="delete-ledger-confirm-btn"
              className={buttonVariants({ variant: "destructive" })}
            >
              {deleteLoading
                ? t("page.dashboard.deleting")
                : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
