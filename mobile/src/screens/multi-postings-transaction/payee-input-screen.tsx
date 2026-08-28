import { i18n } from "@/translations";
import { useLocalSearchParams } from "expo-router";
import { useReactiveVar } from "@apollo/client";
import { SelectedPayee } from "@/common/globalFnFactory";
import { ledgerVar } from "@/common/vars";
import {
  useGetLedgerJournalQuery,
  useGetLedgerPayeesQuery,
} from "@/generated-graphql/graphql";
import { TextInputScreen } from "@/components";
import {
  twoPostingPayees,
  type JournalEntryLike,
} from "@/common/suggestion-utils";

export function PayeeInputScreen(): JSX.Element {
  const { payee, simpleOnly } = useLocalSearchParams<{
    payee: string;
    simpleOnly?: string;
  }>();
  const onSaved = SelectedPayee.getFn();
  const ledgerId = useReactiveVar(ledgerVar);
  // Quick-add opens this picker with simpleOnly — list only payees that have a
  // simple two-posting transaction, matching quick-add's own FROM→TO model.
  // Other callers (e.g. the review screen) get the full payee list.
  const onlySimple = simpleOnly === "true";

  const payeesRes = useGetLedgerPayeesQuery({
    variables: { ledgerId: ledgerId ?? "" },
    skip: !ledgerId || onlySimple,
  });
  const journalRes = useGetLedgerJournalQuery({
    variables: { ledgerId: ledgerId ?? "", query: { limit: 500 } },
    skip: !ledgerId || !onlySimple,
    // network-only: payee suggestions must reflect the latest journal, not a
    // cold-start cache that may omit today's entries.
    fetchPolicy: "network-only",
  });

  const suggestions = onlySimple
    ? twoPostingPayees(
        (journalRes.data?.getLedgerJournal?.data ??
          []) as unknown as JournalEntryLike[],
      )
    : payeesRes.data?.getLedgerPayees;
  const loading = onlySimple ? journalRes.loading : payeesRes.loading;

  return (
    <TextInputScreen
      initialValue={payee || ""}
      headerTitle={i18n.t("payee")}
      multiline={false}
      onSave={onSaved}
      suggestions={suggestions}
      suggestionsLoading={loading}
    />
  );
}
