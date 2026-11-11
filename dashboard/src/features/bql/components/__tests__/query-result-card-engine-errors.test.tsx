import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { render as renderComponent, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { QueryResultCard } from "../query-result-card";

/**
 * The Query page replaced five of the engine's precise explanations with
 * "information provided is invalid" and a Try Again that re-ran the same
 * failing query (w2/111). The real catalogs render here.
 */
vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");
vi.mock("../query-result-chart", () => ({ QueryResultChart: () => null }));
vi.mock("../query-result-export", () => ({ QueryResultExport: () => null }));

function render(element: ReactElement) {
  return renderComponent(element, {
    wrapper: ({ children }) => (
      <LocalizationProvider localization={createLocalization()}>
        {children}
      </LocalizationProvider>
    ),
  });
}

const refused = (message: string) =>
  new CombinedGraphQLErrors({
    errors: [
      {
        message: `Invalid BQL query: ${message}`,
        extensions: { code: "BAD_USER_INPUT" },
      },
    ],
  });

function renderCard(error: unknown) {
  render(
    <QueryResultCard
      query="SELECT length(account, 2)"
      result={null}
      error={error as Error}
      isInitiallyOpen
      onExecute={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
}

describe("QueryResultCard engine diagnostics", () => {
  it.each([
    [
      'Bare column "position" is not grouped and not aggregated: this query engine would silently report each group\'s first-row value.',
      "“position” must be listed in GROUP BY or wrapped in an aggregate such as sum() or first().",
    ],
    [
      'Query execution error: no function matches "NOSUCHFN"',
      "There is no BQL function named “nosuchfn”. Check its spelling.",
    ],
    [
      "Query execution error: evaluation error: table '#nosuchtable' does not exist. Available system tables: #accounts, #balances",
      "There is no table named “#nosuchtable”. System tables start with #, such as #accounts or #prices.",
    ],
    [
      "Query execution error: invalid arguments for function LENGTH: expected 1 argument(s), got 2",
      "length() takes 1 argument, not 2.",
    ],
    [
      "Query execution error: invalid arguments for function ROUND: expected 2 argument(s), got 3",
      "round() takes 2 arguments, not 3.",
    ],
    [
      "Query execution error: type error: EMPTY expects an inventory",
      "A value has the wrong type for this comparison or function. Check what the column or function returns.",
    ],
  ])("explains %s without offering the same query again", (message, text) => {
    renderCard(refused(message));
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(
      screen.queryByText(/information provided is invalid/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Try Again" }),
    ).not.toBeInTheDocument();
  });

  it("still offers Try Again when the query could not reach the service", () => {
    renderCard(new TypeError("Failed to fetch"));
    expect(screen.getByRole("button", { name: "Try Again" })).toBeEnabled();
  });
});
