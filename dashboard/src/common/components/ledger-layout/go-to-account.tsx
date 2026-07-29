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
  const { data } = useQuery(GetLedgerAccountsDocument, {
    variables: { ledgerId: ledgerId },
    skip: !ledgerId || !open,
  });

  const onOpenChange = useCallback((open: boolean) => {
    setOpen(open);
  }, []);

  const fullAccounts = data?.getLedgerAccounts || [];
  const accounts = generateAllAccountPaths(fullAccounts);

  return (
    <div className="flex items-center space-x-4">
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent className="p-0" side="right" align="start">
          <Command>
            <CommandInput
              placeholder={t("component.accountCombobox.placeholder")}
            />
            <CommandList>
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
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
