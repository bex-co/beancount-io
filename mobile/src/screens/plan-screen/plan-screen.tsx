import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useReactiveVar } from "@apollo/client";
import { selectCardLoadState } from "@/common/apollo/card-load-state";
import { contentColumn } from "@/common/content-column";
import { formatFeedDate } from "@/common/date-format";
import { useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";
import { contentPadding } from "@/common/screen-util";
import { localeVar } from "@/common/vars";
import { CardLoadFailure } from "@/components/card-load-failure";
import { LoadingTile } from "@/components/loading-tile";
import { useSubscriptionStatusQuery } from "@/generated-graphql/graphql";
import type { ColorTheme } from "@/types/theme-props";
import { planCard, type PlanCardStatus, type PlanPlatform } from "./plan-card";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: { backgroundColor: theme.white, flex: 1 },
    body: { ...contentColumn, padding: contentPadding, gap: 8 },
    plan: {
      color: theme.text01,
      fontSize: 22,
      fontWeight: "700",
      lineHeight: 30,
      textAlign: LEADING_TEXT_ALIGN,
    },
    line: {
      color: theme.black80,
      fontSize: 16,
      lineHeight: 24,
      textAlign: LEADING_TEXT_ALIGN,
    },
  });

function PlanSkeleton() {
  const styles = useThemeStyle(getStyles);
  return (
    <View style={styles.body}>
      <LoadingTile height={22} mx={0} width={120} />
      <LoadingTile height={16} mx={0} width={220} />
      <LoadingTile height={16} mx={0} width={180} />
    </View>
  );
}

const statusText = (
  status: PlanCardStatus,
  t: (key: string, options?: Record<string, string>) => string,
  locale: string,
) =>
  t(status.key, {
    date: formatFeedDate(status.date, locale),
    ...(status.planKey ? { plan: t(status.planKey) } : {}),
  });

/** The plan card in Settings. It reads the plan; it sells nothing yet (m8). */
export function PlanScreen() {
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const locale = useReactiveVar(localeVar);
  const { data, loading, error, refetch } = useSubscriptionStatusQuery();
  const state = selectCardLoadState({
    loading,
    hasData: Boolean(data),
    error,
  });

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <ScrollView>
        {state === "loading" && <PlanSkeleton />}
        {state === "failed" && <CardLoadFailure onRetry={refetch} />}
        {data && (
          <PlanDetails
            card={planCard(
              data.userProfile?.tier ?? "FREE",
              data.subscriptionStatus,
              Platform.OS as PlanPlatform,
            )}
            statusLine={(status) => statusText(status, t, locale)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanDetails({
  card,
  statusLine,
}: {
  card: ReturnType<typeof planCard>;
  statusLine: (status: PlanCardStatus) => string;
}) {
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  // Keys re-measure the Texts after a live text-size change (w22/025).
  const { fontScale } = useWindowDimensions();
  return (
    <View style={styles.body}>
      <Text key={`plan-${fontScale}`} style={styles.plan}>
        {t(card.planKey)}
      </Text>
      {card.cycleKey && (
        <Text key={`cycle-${fontScale}`} style={styles.line}>
          {t(card.cycleKey)}
        </Text>
      )}
      {card.status && (
        <Text key={`status-${fontScale}`} style={styles.line}>
          {statusLine(card.status)}
        </Text>
      )}
      {card.sourceKey && (
        <Text key={`source-${fontScale}`} style={styles.line}>
          {t(card.sourceKey)}
        </Text>
      )}
      {card.managedOnKey && (
        <Text key={`managed-${fontScale}`} style={styles.line}>
          {t(card.managedOnKey)}
        </Text>
      )}
    </View>
  );
}
