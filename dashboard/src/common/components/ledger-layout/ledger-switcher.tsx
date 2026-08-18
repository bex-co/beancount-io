import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "@tanstack/react-router";
import { ChevronsUpDown, Check, Plus, LayoutGrid, User } from "lucide-react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  ListLedgersDocument,
  CreateLedgerDocument,
  GetCurrentUserDocument,
  type CreateLedgerMutationVariables,
} from "@/graphql/definitions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/common/components/ui/command";
import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { LedgerForm } from "@/features/ledger-list/components/ledger-form";
import { LedgerVisibilityIcon } from "./ledger-visibility-icon";
import { toast } from "sonner";
import { cn } from "@/common/lib/utils/utils";
import { decodeLedgerId, parseLedgerFullName } from "@/common/lib/utils/encode";
import { groupLedgersByOwner } from "@/common/lib/utils/ledger-utils";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { Authenticated } from "../authenticated";
import { useReactNativeContext } from "@/common/providers/react-native-bridge-provider";

interface LedgerSwitcherProps {
  currentLedgerId: string;
  currentLedgerName: string;
  currentLedgerFullName?: string;
}

interface LedgerSwitcherButtonContentProps {
  currentLedgerFullName: string;
  showSelectIcon?: boolean;
}

/**
 * Button content component for ledger switcher trigger
 * Displays ledger logo, name, and chevron icon
 */
function LedgerSwitcherButtonContent({
  currentLedgerFullName,
  showSelectIcon = true,
}: LedgerSwitcherButtonContentProps) {
  const { owner, repo } = parseLedgerFullName(currentLedgerFullName);

  return (
    <div className="w-full flex items-center justify-between gap-2 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
          <img src="/lgasset/logo.png" alt="" className="h-8 w-8 rounded" />
        </div>
        <div className="flex flex-col items-start min-w-0 group-data-[collapsible=icon]:hidden">
          <Link
            to="/ledger/$username"
            params={{ username: owner ?? "" }}
            className="text-xs text-muted-foreground truncate hover:text-foreground transition-colors"
          >
            {owner ?? ""}
          </Link>
          <span className="text-sm font-medium truncate">
            {repo || currentLedgerFullName}
          </span>
        </div>
      </div>
      {showSelectIcon && (
        <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden" />
      )}
    </div>
  );
}

/**
 * Ledger switcher dropdown component
 * Displays current ledger and allows switching between ledgers or creating new ones
 */
function LedgerAuthenticatedSwitcher({
  currentLedgerId,
  currentLedgerName,
  currentLedgerFullName,
}: LedgerSwitcherProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Derive fullName from ledgerId if not provided
  const fullName =
    currentLedgerFullName ||
    decodeLedgerId(currentLedgerId).ledgerOwner + "/" + currentLedgerName;

  const { data, loading } = useQuery(ListLedgersDocument, {
    skip: !open,
    fetchPolicy: "cache-and-network",
  });
  const [createLedgerMutation, { loading: createLoading }] = useMutation(
    CreateLedgerDocument,
    {
      refetchQueries: [ListLedgersDocument, GetCurrentUserDocument],
    },
  );

  const ledgers = data?.listLedgers || [];
  const groupedLedgers = groupLedgersByOwner(ledgers);
  // Sort alphabetically by owner for consistent display
  const sortedGroups = Array.from(groupedLedgers.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  const handleSelectLedger = (ledgerId: string) => {
    if (ledgerId !== currentLedgerId) {
      // Extract the current page path after /ledger/owner/name/
      const currentPath = location.pathname;
      const pathMatch = currentPath.match(/^\/ledger\/[^/]+\/[^/]+(.*)$/);
      const pagePath = pathMatch?.[1] || "";

      // Decode ledger ID to get owner and name
      const { ledgerOwner, ledgerName } = decodeLedgerId(ledgerId);

      // Construct new path with same page but different ledger
      const newPath = `/ledger/${ledgerOwner}/${ledgerName}${pagePath}`;

      // Navigate preserving the current search params
      void navigate({
        to: newPath,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        search: (prev: any) => prev,
      });
    }
    setOpen(false);
  };

  const handleSelectOwner = (owner: string) => {
    void navigate({ to: `/ledger/${owner}` });
    setOpen(false);
  };

  const handleManageLedgers = () => {
    void navigate({ to: "/ledger" });
    setOpen(false);
  };

  const handleCreateLedger = async (data: CreateLedgerMutationVariables) => {
    try {
      const result = await createLedgerMutation({ variables: data });
      setIsCreateDialogOpen(false);
      setOpen(false);
      toast.success(t("page.dashboard.ledgerCreatedSuccess"));

      // Navigate to the new ledger
      if (result.data?.createLedger?.id) {
        const { ledgerOwner, ledgerName } = decodeLedgerId(
          result.data.createLedger.id,
        );
        void navigate({
          to: `/ledger/${ledgerOwner}/${ledgerName}`,
        });
      }
    } catch (error) {
      toast.error(formatError(error));
      console.error("Failed to create ledger:", error);
    }
  };

  const { owner, repo } = parseLedgerFullName(fullName);

  return (
    <>
      <div className="w-full flex items-center gap-2 min-w-0">
        {/* Part 1: Logo - Link to /ledger */}
        <Link
          to="/ledger"
          aria-label={t("page.dashboard.goToDashboard")}
          className="shrink-0 cursor-pointer"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-80 transition-opacity">
            <img src="/lgasset/logo.png" alt="" className="h-8 w-8 rounded" />
          </div>
        </Link>

        {/* Parts 2 & 3: Owner link and Repo popover trigger.
            Hidden when the sidebar is collapsed to the icon rail. */}
        <div className="flex flex-col justify-center min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          {owner && (
            <Link
              to="/ledger/$username"
              params={{ username: owner }}
              className="text-xs text-muted-foreground truncate hover:text-foreground transition-colors"
            >
              {owner}
            </Link>
          )}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                role="combobox"
                aria-expanded={open}
                aria-label={t("page.dashboard.selectLedger")}
                className="justify-start min-w-0 px-0 py-0 h-auto has-[>svg]:px-0 hover:bg-transparent"
              >
                <span className="text-sm font-medium truncate">
                  {repo || fullName}
                </span>
                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder={t("page.dashboard.searchLedgers")} />
                <CommandList>
                  <CommandEmpty>
                    {loading
                      ? t("page.dashboard.loadingLedgers")
                      : t("page.dashboard.noLedgersFound")}
                  </CommandEmpty>

                  {sortedGroups.map(([owner, ownedLedgers], groupIndex) => (
                    <React.Fragment key={owner}>
                      <CommandGroup>
                        {/* Owner-level item - clickable, navigates to account page */}
                        <CommandItem
                          value={owner}
                          onSelect={() => handleSelectOwner(owner)}
                          className="font-semibold"
                          aria-label={t("page.dashboard.goToAccount", {
                            owner,
                          })}
                        >
                          <User className="mr-2 h-4 w-4" />
                          <span>{owner}</span>
                        </CommandItem>

                        {/* Repository items under this owner - indented */}
                        {ownedLedgers.map((ledger) => {
                          const { repo } = parseLedgerFullName(ledger.fullName);
                          return (
                            <CommandItem
                              key={ledger.id}
                              value={`${ledger.fullName} ${ledger.name}`}
                              onSelect={() => handleSelectLedger(ledger.id)}
                              className="pl-6"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  currentLedgerId === ledger.id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <span className="text-sm truncate">
                                {repo || ledger.name}
                              </span>
                              <LedgerVisibilityIcon
                                isPrivate={ledger.private}
                                className="ml-auto"
                              />
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>

                      {/* Separator between owner groups (not after last) */}
                      {groupIndex < sortedGroups.length - 1 && (
                        <CommandSeparator />
                      )}
                    </React.Fragment>
                  ))}

                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setOpen(false);
                        setIsCreateDialogOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {t("page.dashboard.createLedger")}
                    </CommandItem>
                    <CommandItem onSelect={handleManageLedgers}>
                      <LayoutGrid className="mr-2 h-4 w-4" />
                      {t("page.dashboard.manageLedgers")}
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Create Ledger Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
    </>
  );
}

export function LedgerSwitcher({
  currentLedgerId,
  currentLedgerName,
  currentLedgerFullName,
}: LedgerSwitcherProps) {
  // Derive fullName from ledgerId if not provided
  const fullName =
    currentLedgerFullName ||
    decodeLedgerId(currentLedgerId).ledgerOwner + "/" + currentLedgerName;

  const { isReactNative } = useReactNativeContext();
  if (isReactNative) {
    return (
      <LedgerSwitcherButtonContent
        currentLedgerFullName={fullName}
        showSelectIcon={false}
      />
    );
  }
  return (
    <Authenticated
      fallback={
        <LedgerSwitcherButtonContent
          currentLedgerFullName={fullName}
          showSelectIcon={false}
        />
      }
    >
      <LedgerAuthenticatedSwitcher
        currentLedgerId={currentLedgerId}
        currentLedgerName={currentLedgerName}
        currentLedgerFullName={fullName}
      />
    </Authenticated>
  );
}
