import { i18n } from "@/translations";
import { SelectedNarration } from "@/common/globalFnFactory";
import { useLocalSearchParams } from "expo-router";
import { TextInputScreen } from "@/components";

export function NarrationInputScreen(): JSX.Element {
  const { narration } = useLocalSearchParams<{
    narration: string;
  }>();
  const onSaved = SelectedNarration.getFn();

  return (
    <TextInputScreen
      initialValue={narration || ""}
      headerTitle={i18n.t("narration")}
      multiline={true}
      analyticsPageName="narration_input"
      analyticsSaveEventName="narration_input_save"
      onSave={onSaved}
    />
  );
}
