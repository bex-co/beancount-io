import { type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLedgerAccess } from "@/common/hooks/use-ledger-access";
import { useTranslations } from "@/common/hooks/use-translations";
import { useTheme } from "@/common/theme";
import { LoadingTile } from "@/components/loading-tile";

export function LedgerWriteGuard({ children }: { children: ReactNode }) {
  const { canWrite, loading, error, refetch } = useLedgerAccess();
  const { t } = useTranslations();
  const router = useRouter();
  const theme = useTheme().colorTheme;
  if (canWrite) return children;
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: theme.white,
        padding: 24,
        justifyContent: "center",
      }}
    >
      <Stack.Screen options={{ title: t("ledger") }} />
      {loading ? (
        <View>
          <LoadingTile height={24} width={220} />
          <LoadingTile height={16} width={160} style={{ marginTop: 12 }} />
        </View>
      ) : (
        <>
          <Text style={{ color: theme.text01 }}>
            {t(error ? "discoveryLoadError" : "ledgerReadOnly")}
          </Text>
          {error ? (
            <Pressable
              style={{ paddingVertical: 16 }}
              accessibilityRole="button"
              onPress={() => {
                void refetch().catch(() => {});
              }}
            >
              <Text style={{ color: theme.primary }}>
                {t("discoveryRetry")}
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
      <Pressable
        style={{ paddingVertical: 16 }}
        accessibilityRole="button"
        onPress={() => router.replace("/(app)/ledger-selection")}
      >
        <Text style={{ color: theme.primary }}>{t("discoveryTitle")}</Text>
      </Pressable>
    </SafeAreaView>
  );
}
