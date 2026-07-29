import { useCallback, useMemo, useSyncExternalStore } from "react";

export const DASHBOARD_WIDGET_IDS = [
  "financial-position",
  "money-movement",
  "recent-activity",
  "income-expenses",
  "balance-sheet",
  "cash-flow",
  "readme",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

export type DashboardLayout = {
  version: 1;
  order: DashboardWidgetId[];
  hidden: DashboardWidgetId[];
};

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  version: 1,
  order: [...DASHBOARD_WIDGET_IDS],
  hidden: [],
};

const DASHBOARD_LAYOUT_EVENT = "dashboard-layout-change";

function readStoredLayout(storageKey: string): string {
  try {
    return window.localStorage.getItem(storageKey) ?? "";
  } catch {
    return "";
  }
}

function parseStoredLayout(raw: string): DashboardLayout {
  if (!raw) return DEFAULT_DASHBOARD_LAYOUT;
  try {
    return normalizeDashboardLayout(JSON.parse(raw));
  } catch {
    return DEFAULT_DASHBOARD_LAYOUT;
  }
}

export function normalizeDashboardLayout(value: unknown): DashboardLayout {
  if (!value || typeof value !== "object") return DEFAULT_DASHBOARD_LAYOUT;
  const candidate = value as Partial<DashboardLayout>;
  const known = new Set<DashboardWidgetId>(DASHBOARD_WIDGET_IDS);
  const suppliedOrder = Array.isArray(candidate.order)
    ? candidate.order.filter(
        (id): id is DashboardWidgetId =>
          typeof id === "string" && known.has(id as DashboardWidgetId),
      )
    : [];
  const deduplicatedOrder = Array.from(new Set(suppliedOrder));
  const missing = DASHBOARD_WIDGET_IDS.filter(
    (id) => !deduplicatedOrder.includes(id),
  );
  const hidden = Array.isArray(candidate.hidden)
    ? Array.from(
        new Set(
          candidate.hidden.filter(
            (id): id is DashboardWidgetId =>
              typeof id === "string" && known.has(id as DashboardWidgetId),
          ),
        ),
      )
    : [];

  return {
    version: 1,
    order: [...deduplicatedOrder, ...missing],
    hidden,
  };
}

export function useDashboardLayout(ledgerId: string) {
  const storageKey = useMemo(
    () => `ledger.${ledgerId}.overview.layout.v1`,
    [ledgerId],
  );
  const localEventName = `${DASHBOARD_LAYOUT_EVENT}:${storageKey}`;
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handleStorage = (event: StorageEvent) => {
        if (event.key === storageKey) onStoreChange();
      };
      window.addEventListener("storage", handleStorage);
      window.addEventListener(localEventName, onStoreChange);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(localEventName, onStoreChange);
      };
    },
    [localEventName, storageKey],
  );
  const getSnapshot = useCallback(
    () => readStoredLayout(storageKey),
    [storageKey],
  );
  const rawLayout = useSyncExternalStore(subscribe, getSnapshot, () => "");
  const layout = useMemo(() => parseStoredLayout(rawLayout), [rawLayout]);

  const updateLayout = useCallback(
    (update: (current: DashboardLayout) => DashboardLayout) => {
      const next = update(parseStoredLayout(readStoredLayout(storageKey)));
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        return;
      }
      window.dispatchEvent(new Event(localEventName));
    },
    [localEventName, storageKey],
  );

  const setVisible = useCallback(
    (id: DashboardWidgetId, visible: boolean) => {
      updateLayout((current) => ({
        ...current,
        hidden: visible
          ? current.hidden.filter((hiddenId) => hiddenId !== id)
          : Array.from(new Set([...current.hidden, id])),
      }));
    },
    [updateLayout],
  );

  const move = useCallback(
    (id: DashboardWidgetId, direction: -1 | 1) => {
      updateLayout((current) => {
        const index = current.order.indexOf(id);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= current.order.length) {
          return current;
        }
        const order = [...current.order];
        [order[index], order[target]] = [order[target], order[index]];
        return { ...current, order };
      });
    },
    [updateLayout],
  );

  const reset = useCallback(() => {
    updateLayout(() => DEFAULT_DASHBOARD_LAYOUT);
  }, [updateLayout]);

  return {
    layout,
    setVisible,
    move,
    reset,
  };
}
