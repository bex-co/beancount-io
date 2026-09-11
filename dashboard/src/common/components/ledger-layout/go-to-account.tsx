"use client";

import * as React from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/common/components/ui/command.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/ui/popover.tsx";
import { Button } from "@/common/components/ui/button.tsx";
import { useQuery } from "@apollo/client/react";
import { GetLedgerAccountsDocument } from "@/graphql/definitions.ts";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useCallback } from "react";
import { generateAllAccountPaths } from "@/common/lib/utils/account-utils.ts";
import { createLedgerId } from "@/common/lib/utils/encode.ts";
import { useTranslations } from "@/common/hooks/use-translations.ts";
import { useSidebar } from "@/common/components/ui/sidebar.tsx";

type AccountComboboxProps = {
  children: React.ReactNode;
};

export function AccountCombobox({ children }: AccountComboboxProps) {
  const { t } = useTranslations();
  const [open, setOpen] = React.useState(false);
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const navigate = useNavigate();
  const { setOpenMobile, isMobile } = useSidebar();
  const { data, loading, error, refetch } = useQuery(
    GetLedgerAccountsDocument,
    {
      variables: { ledgerId: ledgerId },
      skip: !ledgerId || !open,
    },
  );

  const onOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
  }, []);

  const accountsLoaded = data?.getLedgerAccounts !== undefined;
  const fullAccounts = data?.getLedgerAccounts ?? [];
  const accounts = generateAllAccountPaths(fullAccounts);
  const showLoading = loading && !accountsLoaded;
  const showError = Boolean(error) && !accountsLoaded && !loading;

  return (
    <div className="flex items-center space-x-4">
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          className={isMobile ? "w-[min(18rem,calc(100vw-1rem))] p-0" : "p-0"}
          side={isMobile ? "bottom" : "right"}
          align={isMobile ? "end" : "start"}
          collisionPadding={8}
        >
          <Command>
            <CommandInput
              placeholder={t("component.accountCombobox.placeholder")}
            />
            <CommandList>
              {showLoading ? (
                <div
                  className="py-6 text-center text-sm text-muted-foreground"
                  role="status"
                >
                  {t("common.loadingData")}
                </div>
              ) : showError ? (
                <div className="flex flex-col items-center gap-2 px-3 py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("common.failedToLoadData")}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void refetch();
                    }}
                  >
                    {t("common.tryAgain")}
                  </Button>
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    {t("component.accountCombobox.noAccountsFound")}
                  </CommandEmpty>
                  <CommandGroup>
                    {accounts.map((acc) => (
                      <CommandItem
                        key={acc}
                        value={acc}
                        onSelect={(value) => {
                          void navigate({
                            to: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
                            params: {
                              ledgerOwner: ledgerOwner,
                              ledgerName: ledgerName,
                              accountName: value,
                            },
                          });
                          setOpen(false);
                          // Close mobile sidebar after navigation
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                        }}
                      >
                        {acc}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
