import { i18n } from "@/translations";
import { useLocalSearchParams } from "expo-router";
import { useReactiveVar } from "@apollo/client";
import { SelectedPayee } from "@/common/globalFnFactory";
import { ledgerVar } from "@/common/vars";
import { useGetLedgerPayeesQuery } from "@/generated-graphql/graphql";
import { TextInputScreen } from "@/components";

export function PayeeInputScreen(): JSX.Element {
  const { payee } = useLocalSearchParams<{
    payee: string;
  }>();
  const onSaved = SelectedPayee.getFn();
  const ledgerId = useReactiveVar(ledgerVar);
  const { data, loading } = useGetLedgerPayeesQuery({
    variables: { ledgerId: ledgerId ?? "" },
    skip: !ledgerId,
  });

  return (
    <TextInputScreen
      initialValue={payee || ""}
      headerTitle={i18n.t("payee")}
      multiline={false}
      analyticsPageName="payee_input"
      analyticsSaveEventName="payee_input_save"
      onSave={onSaved}
      suggestions={data?.getLedgerPayees}
      suggestionsLoading={loading}
    />
  );
}
