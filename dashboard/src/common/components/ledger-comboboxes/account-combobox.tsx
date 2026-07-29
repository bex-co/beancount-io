import { useQuery } from "@apollo/client/react";
import { useMemo } from "react";
import { Combobox, type ComboboxOption } from "@/common/components/ui/combobox";
import { Skeleton } from "@/common/components/ui/skeleton";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import {
  GetLedgerAccountsDocument,
  type GetLedgerAccountsQuery,
  type GetLedgerAccountsQueryVariables,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";

interface AccountComboboxProps {
  ledgerId: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  filterPrefix?: string;
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
  filterPrefix,
}: AccountComboboxProps) {
  const { t } = useTranslations();
  const defaultPlaceholder = placeholder || t("journal.selectAccount");

  const { data, loading, error } = useQuery<
    GetLedgerAccountsQuery,
    GetLedgerAccountsQueryVariables
  >(GetLedgerAccountsDocument, {
    variables: { ledgerId, status: "open" },
    skip: !ledgerId,
  });

  // Convert accounts to ComboboxOption format, optionally filtering by prefix
  const options: ComboboxOption[] = useMemo(() => {
    if (!data?.getLedgerAccounts) return [];

    const accounts = filterPrefix
      ? data.getLedgerAccounts.filter((a) => a.startsWith(filterPrefix))
      : data.getLedgerAccounts;

    return accounts.map((account) => ({
      value: account,
      label: account,
      indent: account.split(":").length - 1, // Calculate indent based on colon separators
    }));
  }, [data, filterPrefix]);

  if (loading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t(getErrorMessageKey(error))}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Combobox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={defaultPlaceholder}
      allowCustom={true}
      emptyText={t("component.accountCombobox.noAccountsFound")}
      disabled={disabled}
      className={className}
    />
  );
}
