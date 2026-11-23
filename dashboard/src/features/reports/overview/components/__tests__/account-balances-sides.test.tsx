import { cleanup, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountBalancesCard } from "../account-balances-card";
import { node, renderInLedger } from "./overview-chart-test-utils";

/**
 * The Accounts card as a balance sheet in brief: assets and liabilities each
 * a total over its largest accounts, shares taken of that side alone. Real
 * card, formatter and translations.
 */
vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");
vi.mock("@/common/hooks/use-ledger", async (original) => ({
  ...(await original<typeof import("@/common/hooks/use-ledger")>()),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title?: string;
  }) => <a title={title}>{children}</a>,
}));
afterEach(cleanup);

const side = (name: "Assets" | "Liabilities") =>
  screen.getByRole("region", { name });

const card = (props: {
  assets: unknown;
  liabilities: unknown;
  summary?: React.ReactNode;
}) => (
  <AccountBalancesCard
    {...props}
    primaryCurrency="USD"
    invertLiabilities={false}
    ledgerOwner="owner"
    ledgerName="book"
  />
);

describe("Accounts card sides", () => {
  it("totals each side exactly, keeping an unpriced unit apart", async () => {
    await renderInLedger(
      card({
        assets: node("Assets", {}, [
          node("Assets:Bank", { USD: "0.1" }),
          node("Assets:Broker", { USD: "0.2" }),
          node("Assets:Leave", { VACHR: "-18" }),
        ]),
        liabilities: node("Liabilities", {}, [
          node("Liabilities:Card", { USD: "-80" }),
        ]),
      }),
    );

    // 0.1 + 0.2 is 0.3 here, not 0.30000000000000004.
    const assets = within(side("Assets"));
    expect(assets.getByText(/^0\.30 USD$/)).toBeInTheDocument();
    // Beside the total, quieter, not added into it; the row names it too.
    const [unpriced] = assets.getAllByText(/^-18 VACHR$/);
    expect(unpriced.parentElement).toHaveClass("text-muted-foreground");
    expect(within(side("Liabilities")).getAllByText(/-80\.00/)).toHaveLength(2);
  });

  it("gives shares of a side only where it has two accounts or more", async () => {
    await renderInLedger(
      card({
        assets: node("Assets", {}, [
          node("Assets:Bank", { USD: "300" }),
          node("Assets:Broker", { USD: "100" }),
        ]),
        liabilities: node("Liabilities", {}, [
          node("Liabilities:Card", { USD: "-80" }),
        ]),
      }),
    );

    expect(screen.getByTitle("Assets:Bank").textContent).toContain("75%");
    expect(screen.getByTitle("Assets:Broker").textContent).toContain("25%");
    // A side of one account is all of itself: no 100%, no bar.
    expect(screen.getByTitle("Liabilities:Card").textContent).not.toContain(
      "%",
    );
  });

  it("names the side's unit once, on its total, while each row is still read with it", async () => {
    await renderInLedger(
      card({
        assets: node("Assets", {}, [
          node("Assets:Bank", { USD: "300" }),
          node("Assets:Leave", { USD: "5", VACHR: "12" }),
        ]),
        liabilities: undefined,
      }),
    );

    const bank = screen.getByTitle("Assets:Bank");
    // Heard as "300.00 USD"; seen as the figure alone.
    expect(bank.textContent).toContain("300.00 USD");
    expect(within(bank).getByText("USD")).toHaveClass("sr-only");
    // Another unit keeps its name on the row.
    expect(screen.getByTitle("Assets:Leave").textContent).toContain("12 VACHR");
  });

  it("lists a side's largest five and counts the rest", async () => {
    await renderInLedger(
      card({
        assets: node(
          "Assets",
          {},
          [700, 600, 500, 400, 300, 200, 100].map((amount) =>
            node(`Assets:A${amount}`, { USD: String(amount) }),
          ),
        ),
        liabilities: undefined,
      }),
    );

    expect(screen.getByTitle("Assets:A300")).toBeInTheDocument();
    expect(screen.queryByTitle("Assets:A200")).toBeNull();
    expect(screen.getByText("2 more accounts")).toBeInTheDocument();
  });

  it("says nothing is owed rather than dropping the side", async () => {
    await renderInLedger(
      card({
        assets: node("Assets", {}, [node("Assets:Bank", { USD: "300" })]),
        liabilities: node("Liabilities", {}, []),
      }),
    );

    expect(within(side("Liabilities")).getByText("Nothing owed")).toBeVisible();
  });

  it("heads the card with the figure the sides make, in place of its title", async () => {
    await renderInLedger(
      card({
        assets: node("Assets", {}, [node("Assets:Bank", { USD: "300" })]),
        liabilities: undefined,
        summary: <p>Net worth figure</p>,
      }),
    );

    expect(screen.getByText("Net worth figure")).toBeInTheDocument();
    expect(screen.queryByText("Accounts")).toBeNull();
    // The card's one way on, named for where it goes.
    expect(screen.getByText("View all accounts")).toBeVisible();
  });
});
