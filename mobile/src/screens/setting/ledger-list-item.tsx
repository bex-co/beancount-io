import { useMemo } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslations } from "@/common/hooks/use-translations";
import { useTheme } from "@/common/theme";
import { useListLedgersQuery } from "@/generated-graphql/graphql";
import { ListItemHorizontal } from "./list-item";
import { useLedgerGuard } from "@/components/ledger-guard";

export const LedgerListItem = () => {
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  const ledgerId = useLedgerGuard();
  const { data } = useListLedgersQuery();

  const ledgerFullName = useMemo(() => {
    const ledgers = data?.listLedgers || [];
    const currentLedger = ledgers.find((ledger) => ledger.id === ledgerId);
    return currentLedger?.fullName || "";
  }, [data?.listLedgers, ledgerId]);

  return (
    <ListItemHorizontal
      icon={<Ionicons name="folder" size={22} color={theme.black80} />}
      title={t("ledger")}
      description={ledgerFullName}
      onPress={() => {
        router.push("/(app)/ledger-selection");
      }}
    />
  );
};
