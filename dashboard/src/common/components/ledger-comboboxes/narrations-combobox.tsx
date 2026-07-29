import { useQuery } from "@apollo/client/react";
import { useMemo } from "react";
import { Combobox, type ComboboxOption } from "@/common/components/ui/combobox";
import { Skeleton } from "@/common/components/ui/skeleton";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import {
  GetLedgerNarrationsDocument,
  type GetLedgerNarrationsQuery,
  type GetLedgerNarrationsQueryVariables,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";

interface NarrationsComboboxProps {
  ledgerId: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * NarrationsCombobox component - searchable combobox for narration selection
 * Uses GetLedgerNarrations GraphQL query to fetch available narrations
 */
export function NarrationsCombobox({
  ledgerId,
  value,
  onValueChange,
  placeholder,
  disabled = false,
  className,
}: NarrationsComboboxProps) {
  const { t } = useTranslations();
  const defaultPlaceholder = placeholder || t("journal.selectNarration");

  const { data, loading, error } = useQuery<
    GetLedgerNarrationsQuery,
    GetLedgerNarrationsQueryVariables
  >(GetLedgerNarrationsDocument, {
    variables: { ledgerId },
    skip: !ledgerId,
  });

  // Convert narrations to ComboboxOption format
  const options: ComboboxOption[] = useMemo(() => {
    if (!data?.getLedgerNarrations) return [];

    return data.getLedgerNarrations.map((narration) => ({
      value: narration,
      label: narration,
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
      emptyText={t("journal.noNarrationsFound")}
      disabled={disabled}
      className={className}
    />
  );
}
