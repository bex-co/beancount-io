import { useQuery } from "@apollo/client/react";
import { useMemo } from "react";
import { Combobox, type ComboboxOption } from "@/common/components/ui/combobox";
import { Skeleton } from "@/common/components/ui/skeleton";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import {
  GetLedgerPayeesDocument,
  type GetLedgerPayeesQuery,
  type GetLedgerPayeesQueryVariables,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";

interface PayeesComboboxProps {
  ledgerId: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
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
}: PayeesComboboxProps) {
  const { t } = useTranslations();
  const defaultPlaceholder = placeholder || t("journal.selectPayee");

  const { data, loading, error } = useQuery<
    GetLedgerPayeesQuery,
    GetLedgerPayeesQueryVariables
  >(GetLedgerPayeesDocument, {
    variables: { ledgerId },
    skip: !ledgerId,
  });

  // Convert payees to ComboboxOption format
  const options: ComboboxOption[] = useMemo(() => {
    if (!data?.getLedgerPayees) return [];

    return data.getLedgerPayees.map((payee) => ({
      value: payee,
      label: payee,
    }));
  }, [data]);

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
      emptyText={t("journal.noPayeesFound")}
      disabled={disabled}
      className={className}
    />
  );
}
