import { useQuery } from "@apollo/client/react";
import { useMemo } from "react";
import { Combobox, type ComboboxOption } from "@/common/components/ui/combobox";
import { Skeleton } from "@/common/components/ui/skeleton";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import {
  GetLedgerOperatingCurrenciesDocument,
  type GetLedgerOperatingCurrenciesQuery,
  type GetLedgerOperatingCurrenciesQueryVariables,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";

interface OperatingCurrencyComboboxProps {
  ledgerId: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * OperatingCurrencyCombobox component - searchable combobox scoped to the
 * ledger's declared `operating_currency` option, unlike CurrencyCombobox
 * (which lists every commodity ever used in the ledger, including stocks
 * and crypto). Use this where a value must be a real transaction currency
 * (e.g. a Plaid-linked account's currency), not any ledger commodity.
 */
export function OperatingCurrencyCombobox({
  ledgerId,
  value,
  onValueChange,
  placeholder,
  disabled = false,
  className,
}: OperatingCurrencyComboboxProps) {
  const { t } = useTranslations();
  const defaultPlaceholder = placeholder || t("journal.selectCurrency");

  const { data, loading, error } = useQuery<
    GetLedgerOperatingCurrenciesQuery,
    GetLedgerOperatingCurrenciesQueryVariables
  >(GetLedgerOperatingCurrenciesDocument, {
    variables: { ledgerId },
    skip: !ledgerId,
  });

  const options: ComboboxOption[] = useMemo(() => {
    const operatingCurrency = data?.getLedger.options.operatingCurrency;
    const currencies =
      operatingCurrency && operatingCurrency.length > 0
        ? operatingCurrency
        : ["USD"];

    return currencies.map((currency) => ({
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
