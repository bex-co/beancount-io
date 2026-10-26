import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { CommodityPriceHistory as ControlledHistory } from "../commodity-price-history";
import type { CommodityPairWithPrices } from "@/graphql/definitions";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (key === "page.commodities.showPriceHistory") {
        return `Show price history for ${params?.pair}`;
      }
      if (key === "page.commodities.hidePriceHistory") {
        return `Hide price history for ${params?.pair}`;
      }
      if (key === "page.commodities.priceHistoryDate") return "Date";
      if (key === "page.commodities.priceHistoryPrice") {
        return `Price (${params?.quote})`;
      }
      return key;
    },
  }),
}));

const btcUsd: CommodityPairWithPrices = {
  __typename: "CommodityPairWithPrices",
  base: "BTC",
  quote: "USD",
  prices: [
    { __typename: "PricePoint", date: "2024-12-31", value: "93500.00" },
    { __typename: "PricePoint", date: "2025-02-01", value: "98000.00" },
  ],
};

const cusdc: CommodityPairWithPrices = {
  __typename: "CommodityPairWithPrices",
  base: "CUSDC",
  quote: "USD",
  prices: [
    { __typename: "PricePoint", date: "2025-01-01", value: "0.0225" },
    { __typename: "PricePoint", date: "2025-01-02", value: "0.0227" },
    { __typename: "PricePoint", date: "2025-01-03", value: "0.0230" },
  ],
};

/** The page owns the open state; here a local owner stands in for it. */
function CommodityPriceHistory({
  commodity,
}: {
  commodity: CommodityPairWithPrices;
}) {
  const [open, setOpen] = useState(false);
  return (
    <ControlledHistory
      commodity={commodity}
      open={open}
      onOpenChange={setOpen}
    />
  );
}

describe("CommodityPriceHistory", () => {
  it("lets keyboard users open dated prices for a pair", async () => {
    const user = userEvent.setup();
    render(<CommodityPriceHistory commodity={btcUsd} />);

    const toggle = screen.getByRole("button", {
      name: "Show price history for BTC/USD",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("2024-12-31")).toBeInTheDocument();
    expect(screen.getByText("93500.00")).toBeInTheDocument();
    expect(screen.getByText("2025-02-01")).toBeInTheDocument();
    expect(screen.getByText("98000.00")).toBeInTheDocument();

    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("button", {
        name: "Show price history for BTC/USD",
      }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("93500.00")).not.toBeInTheDocument();
  });

  it("keeps distinct low-price decimals for CUSDC", async () => {
    const user = userEvent.setup();
    render(<CommodityPriceHistory commodity={cusdc} />);
    await user.click(
      screen.getByRole("button", {
        name: "Show price history for CUSDC/USD",
      }),
    );
    expect(screen.getByText("0.0225")).toBeInTheDocument();
    expect(screen.getByText("0.0227")).toBeInTheDocument();
    expect(screen.getByText("0.0230")).toBeInTheDocument();
  });

  it("lets the long pair label wrap instead of pinning the button width", () => {
    render(<CommodityPriceHistory commodity={btcUsd} />);
    const toggle = screen.getByRole("button", {
      name: "Show price history for BTC/USD",
    });

    // The shared Button base pins `whitespace-nowrap` and `size="sm"` pins
    // `h-8`; tailwind-merge drops both only while this component overrides
    // them, so their absence is what keeps a long pair from widening its card.
    const classes = toggle.className.split(/\s+/);
    expect(classes).toContain("whitespace-normal");
    expect(classes).not.toContain("whitespace-nowrap");
    expect(classes).toContain("h-auto");
    expect(classes).not.toContain("h-8");
    expect(classes).toContain("min-h-8");
    expect(classes).toContain("max-w-full");
  });
});

// w4/1055: in Persian the history read "37.63-" for a -37.63 price.
describe("CommodityPriceHistory on a right-to-left page", () => {
  const qaoil: CommodityPairWithPrices = {
    __typename: "CommodityPairWithPrices",
    base: "QAOIL",
    quote: "USD",
    prices: [
      { __typename: "PricePoint", date: "2026-10-01", value: "-37.63" },
      { __typename: "PricePoint", date: "2026-10-02", value: "-5.250" },
      { __typename: "PricePoint", date: "2026-10-03", value: "0.00" },
      { __typename: "PricePoint", date: "2026-10-04", value: "12.50" },
    ],
  };

  it("runs each exact price left to right and leaves dates alone", async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <CommodityPriceHistory commodity={qaoil} />
      </div>,
    );
    const toggle = screen.getByRole("button", {
      name: "Show price history for QAOIL/USD",
    });
    toggle.focus();
    await user.keyboard("{Enter}");

    for (const value of ["-37.63", "-5.250", "0.00", "12.50"]) {
      const run = screen.getByText(value);
      expect(run.tagName).toBe("BDI");
      expect(run).toHaveAttribute("dir", "ltr");
    }
    expect(screen.getByText("2026-10-01").closest("bdi")).toBeNull();

    await user.keyboard("{Enter}");
    expect(screen.queryByText("-37.63")).toBeNull();
    expect(toggle).toHaveFocus();
  });
});
