import { useQuery } from "@apollo/client/react";
import { useMemo } from "react";
import { Combobox, type ComboboxOption } from "@/common/components/ui/combobox";
import { Skeleton } from "@/common/components/ui/skeleton";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import {
  GetLedgerCurrenciesDocument,
  type GetLedgerCurrenciesQuery,
  type GetLedgerCurrenciesQueryVariables,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";

interface CurrencyComboboxProps {
  ledgerId: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * CurrencyCombobox component - searchable combobox for currency selection
 * Uses GetLedgerCurrencies GraphQL query to fetch available currencies
 */
export function CurrencyCombobox({
  ledgerId,
  value,
  onValueChange,
  placeholder,
  disabled = false,
  className,
}: CurrencyComboboxProps) {
  const { t } = useTranslations();
  const defaultPlaceholder = placeholder || t("journal.selectCurrency");

  const { data, loading, error } = useQuery<
    GetLedgerCurrenciesQuery,
    GetLedgerCurrenciesQueryVariables
  >(GetLedgerCurrenciesDocument, {
    variables: { ledgerId },
    skip: !ledgerId,
  });

  // Convert currencies to ComboboxOption format
  const options: ComboboxOption[] = useMemo(() => {
    if (!data?.getLedgerCurrencies) return [];

    return data.getLedgerCurrencies.map((currency) => ({
      value: currency,
      label: currency,
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
      emptyText={t("journal.noCurrenciesFound")}
      disabled={disabled}
      className={className}
    />
  );
}
