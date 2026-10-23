import { type ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  LedgerProviderContext,
  type LedgerProviderContextType,
} from "@/common/providers/ledger-provider/context";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import type { SerializableTreeNode } from "@/graphql/definitions";

/**
 * Setup for Overview chart tests that run the real components, formatter and
 * translations. Each test file keeps its own `react-echarts` mock, which
 * captures the option the chart was given.
 */
export function node(
  account: string,
  balance: Record<string, unknown> = {},
  children: SerializableTreeNode[] = [],
): SerializableTreeNode {
  return {
    __typename: "SerializableTreeNode",
    account,
    balance,
    balanceChildren: {},
    cost: null,
    costChildren: null,
    hasTxns: true,
    children,
  };
}

/** Render inside a ledger with `render_commas` on, in `language`. */
export async function renderInLedger(children: ReactNode, language = "en") {
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const ledger = {
    ledgerData: { options: { renderCommas: true } },
  } as unknown as LedgerProviderContextType;
  render(
    <LocalizationProvider localization={localization}>
      <LedgerProviderContext.Provider value={ledger}>
        {children}
      </LedgerProviderContext.Provider>
    </LocalizationProvider>,
  );
}

/** Open a chart's data disclosure and return its table. */
export async function table(name: string, summary: string) {
  await userEvent
    .setup()
    .click(screen.getByText(summary, { selector: "summary" }));
  return screen.getByRole("table", { name: `${name} ${summary}` });
}

/** Body rows as cell text. */
export const rows = (element: HTMLElement) =>
  within(element)
    .getAllByRole("row")
    .slice(1)
    .map((row) => Array.from(row.children).map((cell) => cell.textContent));
