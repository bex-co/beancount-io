export type DataSeries = Array<{
  date: string;
  balance: Record<string, unknown>;
}>;

export type IntervalDataSeries = Array<{
  date: string;
  balance: Record<string, unknown>;
  accountBalances: Record<string, unknown>;
}>;

export type HierarchyNode = {
  account: string;
  balance?: Record<string, unknown> | null;
  children?: HierarchyNode[];
};

export type CurrencyAmount = {
  currency: string;
  value: number;
};

export type AccountBalanceRow = {
  account: string;
  label: string;
  kind: "asset" | "liability";
  amounts: CurrencyAmount[];
  sortValue: number;
};

export type MovementCategory = {
  account: string;
  label: string;
  amounts: CurrencyAmount[];
  sortValue: number;
};

export type MovementSnapshot = {
  date: string;
  total: CurrencyAmount[];
  average: CurrencyAmount[];
  categories: MovementCategory[];
};

type OverviewData = {
  netWorthData?: DataSeries | null;
  assetsData?: DataSeries | null;
  liabilitiesData?: DataSeries | null;
  incomeIntervalData?: IntervalDataSeries | null;
  incomeData?: DataSeries | null;
  expensesIntervalData?: IntervalDataSeries | null;
  expensesData?: DataSeries | null;
  assetsHierarchyData?: unknown;
  liabilitiesHierarchyData?: unknown;
  incomeHierarchyData?: unknown;
  expensesHierarchyData?: unknown;
};

function toFiniteNumber(value: unknown): number | null {
  const numeric = typeof value === "string" ? Number(value) : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function hasNonZeroAmount(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).some((amount) => {
    const numeric = toFiniteNumber(amount);
    return numeric !== null && numeric !== 0;
  });
}

function hierarchyHasActivity(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hierarchyHasActivity);
  if (!value || typeof value !== "object") return false;

  const node = value as Record<string, unknown>;
  return (
    node.hasTxns === true ||
    hasNonZeroAmount(node.balance) ||
    hasNonZeroAmount(node.balanceChildren) ||
    hasNonZeroAmount(node.cost) ||
    hasNonZeroAmount(node.costChildren) ||
    hierarchyHasActivity(node.children)
  );
}

/**
 * Reports whether an overview contains financial activity worth charting.
 * Empty ledgers can still return zero-filled points and account-tree roots, so
 * array length alone is not sufficient for deciding whether to show charts.
 */
export function hasOverviewActivity(
  overview: OverviewData | null | undefined,
): boolean {
  if (!overview) return false;

  const series = [
    overview.netWorthData,
    overview.assetsData,
    overview.liabilitiesData,
    overview.incomeIntervalData,
    overview.incomeData,
    overview.expensesIntervalData,
    overview.expensesData,
  ];
  const hasSeriesActivity = series.some((points) =>
    points?.some(
      (point) =>
        hasNonZeroAmount(point.balance) ||
        ("accountBalances" in point && hasNonZeroAmount(point.accountBalances)),
    ),
  );

  return (
    hasSeriesActivity ||
    [
      overview.assetsHierarchyData,
      overview.liabilitiesHierarchyData,
      overview.incomeHierarchyData,
      overview.expensesHierarchyData,
    ].some(hierarchyHasActivity)
  );
}

export function getBalanceAmounts(
  balance: Record<string, unknown> | null | undefined,
  inverted = false,
): CurrencyAmount[] {
  if (!balance) return [];

  return Object.entries(balance)
    .map(([currency, value]) => {
      const numeric = toFiniteNumber(value);
      if (numeric === null) return null;
      return {
        currency,
        value: inverted ? -numeric : numeric,
      };
    })
    .filter((amount): amount is CurrencyAmount => amount !== null)
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

export function prioritizeCurrency(
  amounts: CurrencyAmount[],
  preferredCurrency: string,
): CurrencyAmount[] {
  return [...amounts].sort((a, b) => {
    if (a.currency === preferredCurrency) return -1;
    if (b.currency === preferredCurrency) return 1;
    return a.currency.localeCompare(b.currency);
  });
}

export function getComparableAmount(
  amounts: CurrencyAmount[],
  preferredCurrency: string,
): CurrencyAmount | null {
  return (
    amounts.find((amount) => amount.currency === preferredCurrency) ??
    (amounts.length === 1 ? amounts[0] : null)
  );
}

export function formatBalance(
  balance: Record<string, unknown> | null | undefined,
  currency: string,
  formatNum: (v: number) => string,
  inverted?: boolean,
) {
  if (!balance || Object.keys(balance).length === 0) {
    return "0";
  }

  const value = balance[currency] ?? Object.values(balance)[0];

  if (value === null || value === undefined) {
    return "0";
  }

  const numericValue =
    typeof value === "string" ? parseFloat(value) : Number(value);

  if (isNaN(numericValue)) {
    return "0";
  }

  const displayCurrency =
    balance[currency] !== undefined
      ? currency
      : (Object.keys(balance)[0] ?? currency);

  const displayValue = inverted ? -numericValue : numericValue;
  return `${formatNum(displayValue)} ${displayCurrency}`;
}

export function getLatest(series?: DataSeries) {
  if (!series || series.length === 0)
    return {
      balance: null as Record<string, unknown> | null,
      amount: null as number | null,
      trendPct: null as number | null,
    };
  const last = series[series.length - 1];
  const prev = series.length > 1 ? series[series.length - 2] : undefined;
  const pickAmount = (b?: Record<string, unknown> | null) => {
    if (!b) return null;
    return toFiniteNumber(Object.values(b)[0]);
  };
  const lastAmt = pickAmount(last.balance);
  const prevAmt = pickAmount(prev?.balance ?? null);
  let trendPct: number | null = null;
  if (lastAmt != null && prevAmt != null && prevAmt !== 0) {
    trendPct = ((lastAmt - prevAmt) / Math.abs(prevAmt)) * 100;
  }
  return { balance: last.balance, amount: lastAmt, trendPct };
}

export function pickNumericAmount(
  balance?: Record<string, unknown> | null,
  inverse?: boolean,
) {
  if (!balance) return 0;
  const record = balance as Record<string, unknown>;
  const value = record["USD"] ?? Object.values(record)[0];
  if (value == null) return 0;
  const num = toFiniteNumber(value);
  return num === null ? 0 : inverse ? -num : num;
}

function flattenHierarchy(input?: unknown): HierarchyNode[] {
  if (!input) return [];
  const roots: HierarchyNode[] = Array.isArray(input)
    ? (input as HierarchyNode[])
    : [input as HierarchyNode];

  const leaves: HierarchyNode[] = [];
  const stack = [...roots];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    const children = Array.isArray(node.children) ? node.children : [];
    if (children.length === 0) {
      leaves.push(node);
    } else {
      stack.push(...children);
    }
  }
  return leaves;
}

export function buildAccountBalanceRows({
  assets,
  liabilities,
  preferredCurrency,
  invertLiabilities,
}: {
  assets?: unknown;
  liabilities?: unknown;
  preferredCurrency: string;
  invertLiabilities: boolean;
}): AccountBalanceRow[] {
  const buildRows = (
    input: unknown,
    kind: AccountBalanceRow["kind"],
    inverted: boolean,
  ) =>
    flattenHierarchy(input)
      .map((node): AccountBalanceRow => {
        const amounts = prioritizeCurrency(
          getBalanceAmounts(node.balance, inverted),
          preferredCurrency,
        );
        const comparable = getComparableAmount(amounts, preferredCurrency);
        const fallbackMagnitude = Math.max(
          0,
          ...amounts.map((amount) => Math.abs(amount.value)),
        );
        return {
          account: node.account,
          label: node.account.split(":").pop() ?? node.account,
          kind,
          amounts,
          sortValue: Math.abs(comparable?.value ?? fallbackMagnitude),
        };
      })
      .filter((row) => row.amounts.some((amount) => amount.value !== 0));

  return [
    ...buildRows(assets, "asset", false),
    ...buildRows(liabilities, "liability", invertLiabilities),
  ].sort(
    (a, b) => b.sortValue - a.sortValue || a.account.localeCompare(b.account),
  );
}

export function getIntervalDates(
  income: IntervalDataSeries,
  expenses: IntervalDataSeries,
): string[] {
  return Array.from(
    new Set([
      ...income.map((point) => point.date),
      ...expenses.map((point) => point.date),
    ]),
  ).sort((a, b) => a.localeCompare(b));
}

function averageBalances(
  points: IntervalDataSeries,
  inverted: boolean,
  preferredCurrency: string,
): CurrencyAmount[] {
  if (points.length === 0) return [];
  const totals = new Map<string, number>();
  for (const point of points) {
    for (const amount of getBalanceAmounts(point.balance, inverted)) {
      totals.set(
        amount.currency,
        (totals.get(amount.currency) ?? 0) + amount.value,
      );
    }
  }
  return prioritizeCurrency(
    Array.from(totals, ([currency, value]) => ({
      currency,
      value: Number((value / points.length).toFixed(2)),
    })),
    preferredCurrency,
  );
}

export function getMovementSnapshot({
  series,
  date,
  preferredCurrency,
  inverted,
}: {
  series: IntervalDataSeries;
  date: string;
  preferredCurrency: string;
  inverted: boolean;
}): MovementSnapshot {
  const point = series.find((candidate) => candidate.date === date);
  const previousPoints = series
    .filter((candidate) => candidate.date < date)
    .slice(-3);

  const categories = Object.entries(point?.accountBalances ?? {})
    .map(([account, rawBalance]): MovementCategory => {
      const balance =
        rawBalance && typeof rawBalance === "object"
          ? (rawBalance as Record<string, unknown>)
          : {};
      const amounts = prioritizeCurrency(
        getBalanceAmounts(balance, inverted),
        preferredCurrency,
      );
      const comparable = getComparableAmount(amounts, preferredCurrency);
      const fallbackMagnitude = Math.max(
        0,
        ...amounts.map((amount) => Math.abs(amount.value)),
      );
      return {
        account,
        label: account.split(":").pop() ?? account,
        amounts,
        sortValue: Math.abs(comparable?.value ?? fallbackMagnitude),
      };
    })
    .filter((category) => category.amounts.some((amount) => amount.value !== 0))
    .sort(
      (a, b) => b.sortValue - a.sortValue || a.account.localeCompare(b.account),
    );

  return {
    date,
    total: prioritizeCurrency(
      getBalanceAmounts(point?.balance, inverted),
      preferredCurrency,
    ),
    average: averageBalances(previousPoints, inverted, preferredCurrency),
    categories,
  };
}

export function isPartialMonthlyPeriod(
  date: string,
  now = new Date(),
): boolean {
  const period = new Date(`${date}T00:00:00`);
  if (Number.isNaN(period.getTime())) return false;
  return (
    period.getFullYear() === now.getFullYear() &&
    period.getMonth() === now.getMonth() &&
    now.getDate() < period.getDate()
  );
}

export function buildDistributionData(
  input?: unknown,
  inverse?: boolean,
): Array<{ name: string; label: string; value: number }> {
  if (!input) return [];
  return flattenHierarchy(input)
    .map((n) => ({
      name: n.account,
      label: (n.account.split(":")?.pop() ?? "Unnamed") as string,
      value: pickNumericAmount(n.balance, inverse),
    }))
    .filter((d) => Number.isFinite(d.value) && d.value !== 0);
}
