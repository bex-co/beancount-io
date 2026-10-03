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

function parseStoredLayout(
  raw: string,
  defaultLayout: DashboardLayout,
): DashboardLayout {
  if (!raw) return defaultLayout;
  try {
    return normalizeDashboardLayout(JSON.parse(raw), defaultLayout);
  } catch {
    return defaultLayout;
  }
}

export function normalizeDashboardLayout(
  value: unknown,
  defaultLayout = DEFAULT_DASHBOARD_LAYOUT,
): DashboardLayout {
  if (!value || typeof value !== "object") return defaultLayout;
  const candidate = value as Partial<DashboardLayout>;
  const known = new Set<DashboardWidgetId>(DASHBOARD_WIDGET_IDS);
  const suppliedOrder = Array.isArray(candidate.order)
    ? candidate.order.filter(
        (id): id is DashboardWidgetId =>
          typeof id === "string" && known.has(id as DashboardWidgetId),
      )
    : [];
  const deduplicatedOrder = Array.from(new Set(suppliedOrder));
  const missing = defaultLayout.order.filter(
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
  const defaultLayout = DEFAULT_DASHBOARD_LAYOUT;
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
  const layout = useMemo(
    () => parseStoredLayout(rawLayout, defaultLayout),
    [rawLayout, defaultLayout],
  );

  const updateLayout = useCallback(
    (update: (current: DashboardLayout) => DashboardLayout) => {
      const current = parseStoredLayout(
        readStoredLayout(storageKey),
        defaultLayout,
      );
      const next = update(current);
      if (next === current) return;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        return;
      }
      window.dispatchEvent(new Event(localEventName));
    },
    [localEventName, storageKey, defaultLayout],
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
    updateLayout(() => defaultLayout);
  }, [updateLayout, defaultLayout]);

  return {
    layout,
    setVisible,
    move,
    reset,
  };
}
