import { useQuery } from "@apollo/client/react";
import { useMemo } from "react";
import { Combobox, type ComboboxOption } from "@/common/components/ui/combobox";
import { Skeleton } from "@/common/components/ui/skeleton";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import {
  GetLedgerSourceFilesDocument,
  type GetLedgerSourceFilesQuery,
  type GetLedgerSourceFilesQueryVariables,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";

interface SourceFileComboboxProps {
  ledgerId: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * SourceFileCombobox component - searchable combobox for picking a ledger file
 * Uses GetLedgerSourceFiles to list main.bean and every file it includes.
 *
 * Custom values are disallowed: writing into a file the ledger does not include
 * would silently hide the entries, so the backend rejects unknown paths too.
 */
export function SourceFileCombobox({
  ledgerId,
  value,
  onValueChange,
  placeholder,
  disabled = false,
  className,
}: SourceFileComboboxProps) {
  const { t } = useTranslations();
  const defaultPlaceholder =
    placeholder || t("component.sourceFileCombobox.placeholder");

  const { data, loading, error } = useQuery<
    GetLedgerSourceFilesQuery,
    GetLedgerSourceFilesQueryVariables
  >(GetLedgerSourceFilesDocument, {
    variables: { ledgerId },
    skip: !ledgerId,
  });

  const options: ComboboxOption[] = useMemo(
    () =>
      (data?.getLedgerSourceFiles ?? []).map((path) => ({
        value: path,
        label: path,
      })),
    [data],
  );

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
      allowCustom={false}
      emptyText={t("component.sourceFileCombobox.noFilesFound")}
      disabled={disabled}
      className={className}
    />
  );
}
