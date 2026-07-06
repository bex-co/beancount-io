import { i18n } from "@/translations";
import { useLocalSearchParams } from "expo-router";
import { SelectedPayee } from "@/common/globalFnFactory";
import { TextInputScreen } from "@/components";

export function PayeeInputScreen(): JSX.Element {
  const { payee } = useLocalSearchParams<{
    payee: string;
  }>();
  const onSaved = SelectedPayee.getFn();

  return (
    <TextInputScreen
      initialValue={payee || ""}
      headerTitle={i18n.t("payee")}
      multiline={false}
      analyticsPageName="payee_input"
      analyticsSaveEventName="payee_input_save"
      onSave={onSaved}
    />
  );
}
