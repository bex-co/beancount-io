import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { useCallback, useState, useMemo, useEffect, useRef } from "react";
import {
  type DataSeries,
  formatBalance,
  getLatest,
} from "../lib/overview-utils";

export function OverviewStatCard({
  label,
  dataSeries,
  currency,
  inverted,
  variant = "card",
  dotColor,
}: {
  label: string;
  dataSeries: DataSeries;
  currency: string;
  inverted?: boolean;
  variant?: "card" | "cell" | "row";
  dotColor?: string;
}) {
  const formatNum = useFormatNumber();
  const latest = getLatest(dataSeries);

  const availableCurrencies = useMemo(() => {
    if (!latest.balance || Object.keys(latest.balance).length === 0) {
      return [currency];
    }
    return Object.keys(latest.balance);
  }, [latest.balance, currency]);

  const [selectedCurrency, setSelectedCurrency] = useState(currency);

  const currencyKey = useMemo(
    () => JSON.stringify({ currency, availableCurrencies }),
    [currency, availableCurrencies],
  );
  const previousCurrencyKeyRef = useRef(currencyKey);

  useEffect(() => {
    if (previousCurrencyKeyRef.current !== currencyKey) {
      previousCurrencyKeyRef.current = currencyKey;
      queueMicrotask(() => {
        if (availableCurrencies.includes(currency)) {
          setSelectedCurrency(currency);
        } else if (availableCurrencies.length > 0) {
          setSelectedCurrency(availableCurrencies[0]);
        }
      });
    }
  }, [currencyKey, currency, availableCurrencies]);

  const value = formatBalance(
    latest.balance,
    selectedCurrency,
    formatNum,
    inverted,
  );

  const handleClick = useCallback(() => {
    if (availableCurrencies.length <= 1) return;

    const currentIndex = availableCurrencies.indexOf(selectedCurrency);
    const nextIndex = (currentIndex + 1) % availableCurrencies.length;
    setSelectedCurrency(availableCurrencies[nextIndex]);
  }, [availableCurrencies, selectedCurrency]);

  const toggleTitle =
    availableCurrencies.length > 1
      ? `Click to toggle currency (${availableCurrencies.join(", ")})`
      : undefined;

  const lastSpace = value.lastIndexOf(" ");
  const numericPart = lastSpace > -1 ? value.slice(0, lastSpace) : value;
  const currencyPart = lastSpace > -1 ? value.slice(lastSpace + 1) : "";

  if (variant === "row") {
    return (
      <div
        className="group flex min-h-16 cursor-pointer select-none items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/40"
        onClick={handleClick}
        title={toggleTitle}
      >
        {dotColor && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted transition-transform group-hover:scale-105">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: dotColor }}
            />
          </span>
        )}
        <span className="flex-1 text-sm text-muted-foreground">{label}</span>
        <div className="text-right shrink-0">
          <span className="text-sm font-semibold tracking-tight tabular-nums">
            {numericPart}
          </span>
          {currencyPart && (
            <span className="text-xs text-muted-foreground ml-1">
              {currencyPart}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === "cell") {
    return (
      <div
        className="p-4 space-y-1 cursor-pointer select-none"
        onClick={handleClick}
        title={toggleTitle}
      >
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div>
          <span className="text-xl font-semibold tabular-nums">
            {numericPart}
          </span>
          {currencyPart && (
            <span className="text-xs text-muted-foreground ml-1">
              {currencyPart}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="@container/stat">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className="text-base font-semibold tabular-nums @[200px]/stat:text-lg @[240px]/stat:text-xl @[280px]/stat:text-2xl cursor-pointer select-none"
          onClick={handleClick}
          title={toggleTitle}
        >
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
