import { Button } from "@/common/components/ui/button";
import { Label } from "@/common/components/ui/label";
import { Badge } from "@/common/components/ui/badge";
import {
  usePlaidAccountsForItem,
  useUpdateAccountMapping,
  useUpdateAccountCurrency,
  useSuggestPlaidAccountMapping,
  useBatchUpdateAccountMapping,
} from "../../../hooks/use-plaid-accounts";
import { Loader2, CreditCard, Sparkles, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/common/hooks/use-toast";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  AccountCombobox,
  OperatingCurrencyCombobox,
} from "@/common/components/ledger-comboboxes";

interface AccountMappingFormProps {
  itemId: string | null;
  ledgerId: string;
  /**
   * Opens Plaid's Account Select pane. Omitted when the item can't be managed
   * right now (e.g. it needs reauthentication first).
   */
  onManageAccounts?: () => void;
}

interface MappingSuggestion {
  suggestedAccount: string;
  confidence: number;
  reasoning?: string | null;
}

export function AccountMappingForm({
  itemId,
  ledgerId,
  onManageAccounts,
}: AccountMappingFormProps) {
  const { t } = useTranslations();
  const { accounts, loading, refetch } = usePlaidAccountsForItem(
    ledgerId,
    itemId,
  );
  const { updateMapping, loading: updating } = useUpdateAccountMapping();
  const { updateCurrency, loading: currencyUpdating } =
    useUpdateAccountCurrency();
  const { suggestAccountMapping, loading: suggesting } =
    useSuggestPlaidAccountMapping();
  const { updateMappings, loading: acceptingAll } =
    useBatchUpdateAccountMapping();
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [ledgerAccountValue, setLedgerAccountValue] = useState("");
  const [currencyValue, setCurrencyValue] = useState("");
  const [suggestions, setSuggestions] = useState<
    Map<string, MappingSuggestion>
  >(new Map());
  const [suggestionsFetchedForItem, setSuggestionsFetchedForItem] = useState<
    string | null
  >(null);
  const { toast } = useToast();

  const unmappedAccounts = accounts.filter((a) => !a.ledgerAccount);

  useEffect(() => {
    if (
      !itemId ||
      unmappedAccounts.length === 0 ||
      suggestionsFetchedForItem === itemId
    ) {
      return;
    }
    setSuggestionsFetchedForItem(itemId);
    void suggestAccountMapping(ledgerId, itemId).then((results) => {
      setSuggestions(
        new Map(
          results.map((r) => [
            r.accountId,
            {
              suggestedAccount: r.suggestedAccount,
              confidence: r.confidence,
              reasoning: r.reasoning,
            },
          ]),
        ),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, unmappedAccounts.length, suggestionsFetchedForItem]);

  const acceptableAccounts = unmappedAccounts.filter((a) =>
    suggestions.has(a.id),
  );

  const handleAcceptAll = async () => {
    if (acceptableAccounts.length === 0) return;
    try {
      await updateMappings(
        ledgerId,
        acceptableAccounts.map((a) => ({
          accountId: a.id,
          ledgerAccount: suggestions.get(a.id)!.suggestedAccount,
        })),
      );
      await refetch();
      toast({
        title: t("plaid.accountMapping.toast.acceptedAll"),
        description: t("plaid.accountMapping.toast.acceptedAllDescription", {
          count: acceptableAccounts.length,
        }),
      });
    } catch {
      toast({
        title: t("plaid.accountMapping.toast.error"),
        description: t("plaid.accountMapping.toast.errorDescription"),
        variant: "destructive",
      });
    }
  };

  const handleSave = async (account: {
    id: string;
    accountName: string;
    ledgerAccount?: string | null;
    currency: string;
  }) => {
    if (!ledgerAccountValue.trim()) {
      toast({
        title: t("plaid.accountMapping.toast.invalidAccount"),
        description: t("plaid.accountMapping.toast.invalidAccountDescription"),
        variant: "destructive",
      });
      return;
    }

    const mappingChanged = ledgerAccountValue !== (account.ledgerAccount ?? "");
    const currencyChanged = currencyValue !== account.currency;

    if (!mappingChanged && !currencyChanged) {
      setEditingAccountId(null);
      return;
    }

    try {
      await Promise.all([
        ...(mappingChanged
          ? [updateMapping(ledgerId, account.id, ledgerAccountValue)]
          : []),
        ...(currencyChanged
          ? [updateCurrency(ledgerId, account.id, currencyValue)]
          : []),
      ]);
      await refetch();
      toast({
        title: t("plaid.accountMapping.toast.mappingSaved"),
        description: t("plaid.accountMapping.toast.mappingSavedDescription", {
          accountName: account.accountName,
          ledgerAccount: ledgerAccountValue,
          currency: currencyValue,
        }),
      });
      setEditingAccountId(null);
      setLedgerAccountValue("");
      setCurrencyValue("");
    } catch {
      toast({
        title: t("plaid.accountMapping.toast.error"),
        description: t("plaid.accountMapping.toast.errorDescription"),
        variant: "destructive",
      });
    }
  };

  const startEditing = (
    accountId: string,
    currentMapping: string | undefined,
    currentCurrency: string,
  ) => {
    setEditingAccountId(accountId);
    setLedgerAccountValue(
      currentMapping || suggestions.get(accountId)?.suggestedAccount || "",
    );
    setCurrencyValue(currentCurrency);
  };

  if (!itemId) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        {t("plaid.accountMapping.selectAccount")}
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <p className="text-sm text-muted-foreground text-center">
          {t("plaid.accountMapping.noAccounts")}
        </p>
        {onManageAccounts && (
          <Button size="sm" variant="outline" onClick={onManageAccounts}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            {t("plaid.accountMapping.addAccounts")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("plaid.accountMapping.title")}
        </h3>
        {acceptableAccounts.length > 0 && (
          <Button
            size="sm"
            onClick={() => void handleAcceptAll()}
            disabled={acceptingAll}
          >
            {acceptingAll ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                {t("plaid.accountMapping.accepting")}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                {t("plaid.accountMapping.acceptAllSuggestions", {
                  count: acceptableAccounts.length,
                })}
              </>
            )}
          </Button>
        )}
      </div>
      <div className="divide-y divide-border">
        {accounts.map((account) => {
          const suggestion = suggestions.get(account.id);
          const isEditing = editingAccountId === account.id;
          const isSaving = updating || currencyUpdating;
          return (
            <div key={account.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CreditCard className="h-4 w-4" />
                    {account.accountName}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {account.accountType}{" "}
                    {account.mask && `•••• ${account.mask}`}
                  </div>
                </div>
                {!isEditing && (
                  <Badge
                    variant="secondary"
                    aria-label={t("plaid.accountMapping.currency")}
                  >
                    {account.currency}
                  </Badge>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor={`account-${account.id}`}>
                      {t("plaid.accountMapping.beancountAccount")}
                    </Label>
                    <AccountCombobox
                      ledgerId={ledgerId}
                      value={ledgerAccountValue}
                      onValueChange={setLedgerAccountValue}
                      placeholder={t("plaid.accountMapping.placeholder")}
                      className="mt-1"
                      disabled={isSaving}
                    />
                    {suggestion && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                        <Sparkles className="h-3 w-3" />
                        {t("plaid.accountMapping.aiSuggested")}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={`currency-${account.id}`}>
                      {t("plaid.accountMapping.currency")}
                    </Label>
                    <OperatingCurrencyCombobox
                      ledgerId={ledgerId}
                      value={currencyValue}
                      onValueChange={setCurrencyValue}
                      placeholder={t("plaid.accountMapping.currency")}
                      className="mt-1"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => void handleSave(account)}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          {t("plaid.accountMapping.saving")}
                        </>
                      ) : (
                        t("plaid.accountMapping.save")
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingAccountId(null);
                        setLedgerAccountValue("");
                        setCurrencyValue("");
                      }}
                      disabled={isSaving}
                    >
                      {t("plaid.accountMapping.cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    {account.ledgerAccount ? (
                      <span className="font-mono text-primary">
                        {account.ledgerAccount}
                      </span>
                    ) : suggestion ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Sparkles className="h-3.5 w-3.5" />
                        {t("plaid.accountMapping.suggestedAccount", {
                          account: suggestion.suggestedAccount,
                        })}
                      </span>
                    ) : suggesting ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground italic">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {t("plaid.accountMapping.suggesting")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">
                        {t("plaid.accountMapping.notMapped")}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      startEditing(
                        account.id,
                        account.ledgerAccount ?? undefined,
                        account.currency,
                      )
                    }
                  >
                    {account.ledgerAccount
                      ? t("plaid.accountMapping.edit")
                      : t("plaid.accountMapping.setMapping")}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
