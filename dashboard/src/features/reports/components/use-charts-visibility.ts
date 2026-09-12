import { useCookieStorageState } from "@/common/hooks/use-cookie-storage-state";

/**
 * Report keys used for the per-report charts-visibility cookie and the
 * collapsible section id the toggle button points at.
 */
export type ChartsReportKey =
  | "balanceSheet"
  | "incomeStatement"
  | "trialBalance"
  | "cashFlow";

/**
 * Shared charts-visibility state for report pages. The cookie keeps the user's
 * choice across visits; the section id wires the toggle button to the section
 * it controls (`aria-controls`).
 */
export function useChartsVisibility(reportKey: ChartsReportKey) {
  const [chartsVisible, setChartsVisible] = useCookieStorageState(
    `beancount.chartsVisible.${reportKey}`,
    true,
    {
      serializer: (v) => String(v),
      deserializer: (v) => v !== "false",
    },
  );

  return {
    chartsVisible,
    toggleChartsVisible: () => setChartsVisible((prev) => !prev),
    chartsSectionId: `${reportKey}-charts`,
  };
}
