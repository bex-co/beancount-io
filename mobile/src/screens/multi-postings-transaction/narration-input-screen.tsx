import { i18n } from "@/translations";
import { SelectedNarration } from "@/common/globalFnFactory";
import { useLocalSearchParams } from "expo-router";
import { useReactiveVar } from "@apollo/client";
import { ledgerVar } from "@/common/vars";
import { useGetLedgerNarrationsQuery } from "@/generated-graphql/graphql";
import { TextInputScreen } from "@/components";

export function NarrationInputScreen(): JSX.Element {
  const { narration } = useLocalSearchParams<{
    narration: string;
  }>();
  const onSaved = SelectedNarration.getFn();
  const ledgerId = useReactiveVar(ledgerVar);
  const { data, loading } = useGetLedgerNarrationsQuery({
    variables: { ledgerId: ledgerId ?? "" },
    skip: !ledgerId,
  });

  return (
    <TextInputScreen
      initialValue={narration || ""}
      headerTitle={i18n.t("narration")}
      multiline={true}
      analyticsPageName="narration_input"
      analyticsSaveEventName="narration_input_save"
      onSave={onSaved}
      suggestions={data?.getLedgerNarrations}
      suggestionsLoading={loading}
    />
  );
}
