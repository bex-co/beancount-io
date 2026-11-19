import { useQuery } from "@apollo/client/react";
import { useMemo } from "react";
import {
  Combobox,
  type ComboboxFieldProps,
  type ComboboxOption,
} from "@/common/components/ui/combobox";
import { Skeleton } from "@/common/components/ui/skeleton";
import {
  GetLedgerAccountsDocument,
  type GetLedgerAccountsQuery,
  type GetLedgerAccountsQueryVariables,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { useSuggestionsFallback } from "./use-suggestions-fallback";

interface AccountComboboxProps extends ComboboxFieldProps {
  ledgerId: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /**
   * The ledger's root names to list, under the names the ledger itself uses
   * (`option "name_assets"`). An account is listed when it is a root or sits
   * beneath one; `IncomeTax` is not under `Income`, the same rule as
   * `isUnderAccountRoot`.
   */
  filterRoots?: readonly string[];
}

/**
 * AccountCombobox component - searchable combobox for account selection
 * Uses GetLedgerAvailableAccounts GraphQL query to fetch non-closed accounts
 */
export function AccountCombobox({
  ledgerId,
  value,
  onValueChange,
  placeholder,
  disabled = false,
  className,
  filterRoots,
  ...fieldProps
}: AccountComboboxProps) {
  const { t } = useTranslations();
  const defaultPlaceholder = placeholder || t("journal.selectAccount");

  const query = useQuery<
    GetLedgerAccountsQuery,
    GetLedgerAccountsQueryVariables
  >(GetLedgerAccountsDocument, {
    variables: { ledgerId, status: "open" },
    skip: !ledgerId,
    notifyOnNetworkStatusChange: true,
  });
  const { data } = query;

  // Convert accounts to ComboboxOption format, optionally filtering by root
  const options: ComboboxOption[] = useMemo(() => {
    if (!data?.getLedgerAccounts) return [];

    const accounts = filterRoots
      ? data.getLedgerAccounts.filter((a) =>
          filterRoots.some((root) => a === root || a.startsWith(`${root}:`)),
        )
      : data.getLedgerAccounts;

    return accounts.map((account) => ({
      value: account,
      label: account,
      indent: account.split(":").length - 1, // Calculate indent based on colon separators
    }));
  }, [data, filterRoots]);

  const fallback = useSuggestionsFallback(
    query,
    Boolean(data?.getLedgerAccounts),
    fieldProps["aria-describedby"],
  );

  if (fallback.initialLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <Combobox
      options={fallback.failed ? [] : options}
      value={value}
      onValueChange={onValueChange}
      placeholder={defaultPlaceholder}
      allowCustom={true}
      emptyText={t("component.accountCombobox.noAccountsFound")}
      disabled={disabled}
      className={className}
      {...fieldProps}
      aria-describedby={fallback.describedBy}
      notice={fallback.notice}
    />
  );
}
