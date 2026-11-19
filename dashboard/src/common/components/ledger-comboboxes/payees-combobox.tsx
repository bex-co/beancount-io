import { useQuery } from "@apollo/client/react";
import { useMemo } from "react";
import {
  Combobox,
  type ComboboxFieldProps,
  type ComboboxOption,
} from "@/common/components/ui/combobox";
import { Skeleton } from "@/common/components/ui/skeleton";
import {
  GetLedgerPayeesDocument,
  type GetLedgerPayeesQuery,
  type GetLedgerPayeesQueryVariables,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { useSuggestionsFallback } from "./use-suggestions-fallback";

interface PayeesComboboxProps extends ComboboxFieldProps {
  ledgerId: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** See `Combobox`: off where the form focuses the field itself. */
  openOnFocus?: boolean;
}

/**
 * PayeesCombobox component - searchable combobox for payee selection
 * Uses GetLedgerPayees GraphQL query to fetch available payees
 */
export function PayeesCombobox({
  ledgerId,
  value,
  onValueChange,
  placeholder,
  disabled = false,
  className,
  openOnFocus,
  ...fieldProps
}: PayeesComboboxProps) {
  const { t } = useTranslations();
  const defaultPlaceholder = placeholder || t("journal.selectPayee");

  const query = useQuery<GetLedgerPayeesQuery, GetLedgerPayeesQueryVariables>(
    GetLedgerPayeesDocument,
    {
      variables: { ledgerId },
      skip: !ledgerId,
      notifyOnNetworkStatusChange: true,
    },
  );
  const { data } = query;

  // Convert payees to ComboboxOption format
  const options: ComboboxOption[] = useMemo(() => {
    if (!data?.getLedgerPayees) return [];

    return data.getLedgerPayees.map((payee) => ({
      value: payee,
      label: payee,
    }));
  }, [data]);

  const fallback = useSuggestionsFallback(
    query,
    Boolean(data?.getLedgerPayees),
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
      emptyText={t("journal.noPayeesFound")}
      disabled={disabled}
      className={className}
      openOnFocus={openOnFocus}
      {...fieldProps}
      aria-describedby={fallback.describedBy}
      notice={fallback.notice}
    />
  );
}
