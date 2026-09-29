import { ScrollView, StyleSheet, Text, View } from "react-native";
import { EXAMPLE_IDS, type ExampleId } from "@/common/guest/guest-state";
import { useTranslations } from "@/common/hooks/use-translations";
import { useTheme } from "@/common/theme";
import { Button } from "@/components/button";
import { LoadingTile } from "@/components/loading-tile";
import { PressableScale } from "@/components/pressable-scale";

import type { ExampleAvailability } from "./use-example-catalog";
const titles = ["guestExample0", "guestExample1", "guestExample2"];
const descriptions = [
  "guestExampleDescription0",
  "guestExampleDescription1",
  "guestExampleDescription2",
];

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16, flexGrow: 1 },
  description: { fontSize: 16, lineHeight: 24 },
  card: {
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 102,
  },
  name: { fontSize: 18, fontWeight: "600", lineHeight: 26 },
  caption: { fontSize: 14, lineHeight: 20 },
});

export function ExampleSelector({
  onSelect,
  availability,
  onRetry,
  serverUrl,
}: {
  onSelect: (id: ExampleId) => void;
  availability: ExampleAvailability[] | null;
  onRetry: () => void;
  serverUrl: string;
}) {
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  const hasConnectionError = availability?.includes("connection");
  const noneAvailable = availability && !availability.includes("available");
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.description, { color: theme.black80 }]}>
        {t("guestIntroduction")}
      </Text>
      <Text style={[styles.caption, { color: theme.black80 }]}>
        {t("guestReadOnly")} · {serverUrl}
      </Text>
      {EXAMPLE_IDS.map((id, index) => (
        <PressableScale
          key={id}
          testID={`guest-example-${index}`}
          accessibilityRole="button"
          accessibilityLabel={t("discoveryOpen", {
            name: t(titles[index]),
          })}
          accessibilityState={{
            disabled: availability?.[index] !== "available",
          }}
          disabled={availability?.[index] !== "available"}
          onPress={() => onSelect(id)}
          style={[
            styles.card,
            { backgroundColor: theme.white, borderColor: theme.black20 },
          ]}
        >
          <Text style={[styles.name, { color: theme.text01 }]}>
            {t(titles[index])}
          </Text>
          {!availability ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Text style={[styles.caption, { opacity: 0 }]}>
                {t(descriptions[index])}
              </Text>
              <LoadingTile
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: `${[92, 84, 88][index]}%`,
                }}
              />
            </View>
          ) : (
            <Text style={[styles.caption, { color: theme.black80 }]}>
              {availability[index] === "available"
                ? t(descriptions[index])
                : t(
                    availability[index] === "connection"
                      ? "guestConnectionError"
                      : "guestUnavailable",
                  )}
            </Text>
          )}
        </PressableScale>
      ))}
      {noneAvailable && (
        <Text style={[styles.description, { color: theme.black80 }]}>
          {t(hasConnectionError ? "guestConnectionError" : "guestNoExamples")}
        </Text>
      )}
      {availability?.some((value) => value !== "available") && (
        <Button type="outline" onPress={onRetry}>
          {t("discoveryRetry")}
        </Button>
      )}
    </ScrollView>
  );
}
