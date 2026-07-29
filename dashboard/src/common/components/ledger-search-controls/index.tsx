import { useContext, useMemo } from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/common/components/ui/button.tsx";
import { Skeleton } from "@/common/components/ui/skeleton.tsx";
import { Alert, AlertDescription } from "@/common/components/ui/alert.tsx";
import { useQuery } from "@apollo/client/react";
// import { useLocation } from "@tanstack/react-router";
import { cn } from "@/common/lib/utils/utils.ts";
import { GetLedgerAttributesDocument } from "@/graphql/definitions.ts";
import {
  LedgerSearchParamsContext,
  type LedgerSearchParams,
} from "@/common/providers/ledger-search-params-provider";
import {
  Combobox,
  type ComboboxOption,
} from "@/common/components/ui/combobox.tsx";
import { getIndentLevel } from "./utils.ts";
import { generateAllAccountPaths } from "@/common/lib/utils/account-utils.ts";
import { useTranslations } from "@/common/hooks/use-translations.ts";

interface SearchControlComboboxProps {
  items: string[];
  selected: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  allowCustom?: boolean;
  hierarchical?: boolean;
  triggerOn?: "change" | "blur";
}

/**
 * SearchControlCombobox component - searchable combobox for searchParams
 */
export const SearchControlCombobox = ({
  items,
  selected,
  onChange,
  placeholder,
  className,
  allowCustom = true,
  hierarchical = false,
  triggerOn = "change",
}: SearchControlComboboxProps) => {
  const { t } = useTranslations();
  const defaultPlaceholder = placeholder || t("component.combobox.placeholder");
  // Convert items to ComboboxOption format
  const options: ComboboxOption[] = useMemo(() => {
    return items.map((item) => ({
      value: item,
      label: item,
      indent: hierarchical ? getIndentLevel(item) : 0,
    }));
  }, [items, hierarchical]);

  return (
    <div className={cn("", className)}>
      <Combobox
        options={options}
        value={selected}
        onValueChange={onChange}
        placeholder={defaultPlaceholder}
        allowCustom={allowCustom}
        emptyText={t("component.combobox.noMatchesFound")}
        triggerOn={triggerOn}
      />
    </div>
  );
};

export const LedgerSearchControls = ({ ledgerId }: { ledgerId: string }) => {
  const { t } = useTranslations();
  const { searchParams, setSearchParams } = useContext(
    LedgerSearchParamsContext,
  );
  const { data, loading, error } = useQuery(GetLedgerAttributesDocument, {
    variables: { ledgerId },
  });

  const handleFilterChange = (
    filterType: keyof LedgerSearchParams,
    value: string,
  ) => {
    setSearchParams({
      ...searchParams,
      [filterType]: value,
    });
  };

  const handleClearAll = () => {
    setSearchParams({
      account: "",
      filter: "",
      time: "",
    });
  };

  const hasActiveFilters = Object.values(searchParams).some(
    (value) => value !== "",
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert className="w-auto">
        <AlertDescription className="text-sm">
          {t("component.searchControls.failedToLoad")}
        </AlertDescription>
      </Alert>
    );
  }

  // No data state
  if (!data?.getLedgerAttributes) {
    return null;
  }

  const { accounts, tags, years, links, payees } = data.getLedgerAttributes;

  // Generate all partial account paths and sort hierarchically
  const sortedAccounts = generateAllAccountPaths(accounts);

  const fql_filter_suggestions = [
    ...tags.map((tag) => `#${tag}`),
    ...links.map((link) => `^${link}`),
    ...payees.map((payee) => `payee:"${payee}"`),
  ];

  return (
    <div className="flex items-center gap-3">
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          className="h-9 px-2 text-muted-foreground hover:text-foreground"
        >
          <XIcon className="h-3 w-3 mr-1" />
          {t("component.searchControls.clearAll")}
        </Button>
      )}

      <div className="flex items-center gap-2">
        {/* Time Filter - Accepts flexible date formats */}
        <SearchControlCombobox
          items={years}
          selected={searchParams.time}
          onChange={(value) => handleFilterChange("time", value)}
          placeholder={t("component.searchControls.time")}
          className="min-w-[160px]"
          allowCustom={true}
          hierarchical={false}
          triggerOn="blur"
        />

        {/* Account Filter - Hierarchical with colon separators */}
        <SearchControlCombobox
          items={sortedAccounts}
          selected={searchParams.account}
          onChange={(value) => handleFilterChange("account", value)}
          placeholder={t("component.searchControls.account")}
          className="min-w-[180px]"
          allowCustom={true}
          hierarchical={true}
          triggerOn="blur"
        />

        {/* Filter - Tags, Payees, Links */}
        <SearchControlCombobox
          items={fql_filter_suggestions}
          selected={searchParams.filter}
          onChange={(value) => handleFilterChange("filter", value)}
          placeholder={t("component.searchControls.filterByTagPayee")}
          className="min-w-[180px]"
          allowCustom={true}
          hierarchical={false}
          triggerOn="blur"
        />
      </div>
    </div>
  );
};
