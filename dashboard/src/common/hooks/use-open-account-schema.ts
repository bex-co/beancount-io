import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import {
  GetLedgerAccountDirectivesDocument,
  GetLedgerDocument,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  accountExistsMessage,
  accountProblemMessage,
  buildOpenAccountSchema,
} from "@/common/lib/beancount/open-account-schema";

/**
 * The validation both Open Account forms share — the Accounts dialog and the
 * New Entry "Account" tab — built from the ledger's root names and the
 * accounts it already opens, so neither form can drift from the other.
 */
export function useOpenAccountSchema(ledgerId: string) {
  const { t } = useTranslations();
  const { data: ledgerData } = useQuery(GetLedgerDocument, {
    variables: { ledgerId },
    skip: !ledgerId,
  });
  // Refreshed on mount so an account opened a moment ago is already known.
  const { data: accountData } = useQuery(GetLedgerAccountDirectivesDocument, {
    variables: { ledgerId },
    skip: !ledgerId,
    fetchPolicy: "cache-and-network",
  });

  const accountPrefixes = useMemo(() => {
    const opts = ledgerData?.getLedger?.options;
    if (!opts) return [];
    return [
      opts.nameAssets,
      opts.nameLiabilities,
      opts.nameEquity,
      opts.nameIncome,
      opts.nameExpenses,
    ].filter(Boolean);
  }, [ledgerData]);

  const existing = useMemo(
    () =>
      new Map(
        (accountData?.getLedgerAccountDirectives ?? []).map((item) => [
          item.account,
          item,
        ]),
      ),
    [accountData],
  );

  const schema = useMemo(
    () =>
      buildOpenAccountSchema(
        accountPrefixes,
        {
          required: t("page.accounts.accountNameRequired"),
          mustStartWith: t("page.accounts.accountMustStartWith", {
            prefixes: accountPrefixes.join(", "),
          }),
          needsChild: (root) =>
            t("page.accounts.accountNeedsChild", {
              root,
              example: `${root}:Bank`,
            }),
          invalid: accountProblemMessage(t),
          exists: accountExistsMessage(t),
        },
        existing,
      ),
    [accountPrefixes, existing, t],
  );

  return { accountPrefixes, schema };
}
