import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider, useQuery } from "@apollo/client/react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  retainSearchParams,
  RouterProvider,
  useParams,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GetLedgerAttributesDocument,
  GetLedgerIncomeStatementDocument,
  type GetLedgerAttributesQuery,
  type GetLedgerIncomeStatementQuery,
} from "@/graphql/definitions";
import { ledgerFilterSearchSchema } from "@/common/lib/ledger-search-params/schema";
import {
  LedgerSearchParamsProvider,
  useLedgerSearchParams,
} from "@/common/providers/ledger-search-params-provider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/common/components/ui/sheet";
import { createLocalization } from "@/i18n/init";
import en from "@/i18n/locales/en";
import { LocalizationProvider } from "@/i18n/provider";
import { LedgerSearchControls } from "../index";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

type QueryData = GetLedgerAttributesQuery | GetLedgerIncomeStatementQuery;
interface ReadRequest {
  name: string;
  variables: Record<string, unknown>;
  resolve: (data: QueryData) => void;
  reject: () => void;
}

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
});

function attributes(prefix = "First"): GetLedgerAttributesQuery {
  return {
    getLedgerAttributes: {
      __typename: "LedgerAttributes",
      accounts: [`Expenses:${prefix}Travel`, `Assets:${prefix}Cash`],
      years: ["2017", "2018"],
      tags: [`${prefix.toLowerCase()}-tag`],
      links: [`${prefix.toLowerCase()}-link`],
      payees: [`${prefix} Vendor`],
      currencies: ["USD"],
    },
  };
}

function statement(): GetLedgerIncomeStatementQuery {
  const hierarchy = (account: string) => ({
    __typename: "SerializableTreeNode" as const,
    account,
    balance: {},
    balanceChildren: {},
    cost: null,
    costChildren: null,
    hasTxns: true,
    children: [],
  });
  return {
    getLedgerAccounts: ["Expenses"],
    getLedgerIncomeStatement: {
      __typename: "IncomeStatementData",
      incomeData: [],
      expensesData: [],
      netProfitData: [
        {
          __typename: "DateAndBalance",
          date: "2017-09-30",
          balance: { USD: "-2354.89", VACHR: "-5" },
        },
      ],
      incomeHierarchyData: hierarchy("Income"),
      expensesHierarchyData: hierarchy("Expenses"),
    },
  };
}

// A primary read consumes the real provider scope alongside the optional
// suggestions component. Only the network link is controlled, not useQuery,
// the controls, field events, provider callbacks, or router navigation.
function PrimaryRead({ ledgerId }: { ledgerId: string }) {
  const { searchParams } = useLedgerSearchParams();
  const { data, loading, error } = useQuery(GetLedgerIncomeStatementDocument, {
    variables: {
      ledgerId,
      ...searchParams,
      interval: "monthly",
      conversion: "units",
    },
  });
  return (
    <output data-testid="primary-read">
      {loading
        ? "pending"
        : error
          ? "failed"
          : String(
              data?.getLedgerIncomeStatement.netProfitData[0]?.balance.USD,
            )}
    </output>
  );
}

async function mountControls(layout: "inline" | "stack" = "inline") {
  const requests: ReadRequest[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          requests.push({
            name: operation.operationName,
            variables: { ...operation.variables },
            resolve: (data) => {
              observer.next({ data });
              observer.complete();
            },
            reject: () =>
              observer.error(new Error("Attributes network unavailable")),
          });
        }),
    ),
  });
  clients.push(client);
  const rootRoute = createRootRoute({ component: Outlet });
  const ledgerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/ledger/$ledgerOwner/$ledgerName",
    validateSearch: (search) => ledgerFilterSearchSchema.parse(search),
    search: {
      middlewares: [retainSearchParams(["account", "filter", "time"])],
    },
    component: () => (
      <LedgerSearchParamsProvider>
        <Outlet />
      </LedgerSearchParamsProvider>
    ),
  });
  function ControlsPage() {
    const params = useParams({ strict: false });
    const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
    return (
      <>
        {layout === "stack" ? (
          <Sheet defaultOpen>
            <SheetContent side="bottom">
              <SheetTitle>
                {en["component.searchControls.filtersTitle"]}
              </SheetTitle>
              <SheetDescription>
                {en["component.searchControls.filtersDescription"]}
              </SheetDescription>
              <LedgerSearchControls ledgerId={ledgerId} layout="stack" />
            </SheetContent>
          </Sheet>
        ) : (
          <LedgerSearchControls ledgerId={ledgerId} />
        )}
        <PrimaryRead ledgerId={ledgerId} />
      </>
    );
  }
  const reportRoute = createRoute({
    getParentRoute: () => ledgerRoute,
    path: "/income-statement",
    validateSearch: (search) => ({
      view: typeof search.view === "string" ? search.view : "accounts",
    }),
    component: ControlsPage,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([ledgerRoute.addChildren([reportRoute])]),
    history: createMemoryHistory({
      initialEntries: [
        "/ledger/open_ledger/example/income-statement?time=2017-09&account=Expenses&filter=%23already&view=accounts",
      ],
    }),
  });
  await router.load();
  const { container } = render(
    <LocalizationProvider localization={createLocalization()}>
      <ApolloProvider client={client}>
        <RouterProvider router={router} />
      </ApolloProvider>
    </LocalizationProvider>,
  );
  const attributeReads = () =>
    requests.filter((request) => request.name === "GetLedgerAttributes");
  const primaryReads = () =>
    requests.filter((request) => request.name === "GetLedgerIncomeStatement");
  await waitFor(() => {
    expect(attributeReads()).toHaveLength(1);
    expect(primaryReads()).toHaveLength(1);
  });
  return { client, router, container, attributeReads, primaryReads };
}

async function resolve(request: ReadRequest, data: QueryData) {
  await act(async () => request.resolve(data));
}

function fields() {
  return {
    time: screen.getByPlaceholderText(en["component.searchControls.time"]),
    account: screen.getByPlaceholderText(
      en["component.searchControls.account"],
    ),
    filter: screen.getByPlaceholderText(
      en["component.searchControls.filterByTagPayee"],
    ),
  };
}

describe("LedgerSearchControls when suggestions fail", () => {
  it.each(["inline", "stack"] as const)(
    "keeps applied %s fields editable and clears the actual URL while the primary read succeeds",
    async (layout) => {
      const { router, attributeReads, primaryReads } =
        await mountControls(layout);
      const user = userEvent.setup();
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(
        document.querySelector('[data-slot="skeleton"]'),
      ).toBeInTheDocument();
      expect(attributeReads()[0].variables).toEqual({
        ledgerId: "open_ledger/example",
      });
      await resolve(primaryReads()[0], statement());
      expect(screen.getByTestId("primary-read")).toHaveTextContent("-2354.89");
      await act(async () => attributeReads()[0].reject());

      expect(await screen.findByRole("alert")).toHaveTextContent(
        en["component.searchControls.failedToLoad"],
      );
      expect(screen.getAllByRole("combobox")).toHaveLength(3);
      const { time, account, filter } = fields();
      expect(time).toHaveValue("2017-09");
      expect(account).toHaveValue("Expenses");
      expect(filter).toHaveValue("#already");
      expect(
        screen.getByRole("button", {
          name: en["component.searchControls.clearAll"],
        }),
      ).toBeEnabled();
      expect(router.state.location.search).toMatchObject({
        time: "2017-09",
        account: "Expenses",
        filter: "#already",
      });

      await user.click(time);
      await user.clear(time);
      const period = "2017-01-01 - 2017-03-31";
      await user.type(time, period);
      expect(screen.queryByRole("option")).not.toBeInTheDocument();
      expect(router.state.location.search.time).toBe("2017-09");
      await user.keyboard("{Escape}");
      expect(time).toHaveFocus();
      expect(time).toHaveAttribute("aria-expanded", "false");
      expect(router.state.location.search.time).toBe("2017-09");
      if (layout === "stack")
        expect(
          screen.getByRole("dialog", {
            name: en["component.searchControls.filtersTitle"],
          }),
        ).toBeVisible();
      await user.keyboard("{Enter}");
      await waitFor(() =>
        expect(router.state.location.search.time).toBe(period),
      );
      await waitFor(() => expect(primaryReads()).toHaveLength(2));
      expect(primaryReads()[1].variables).toMatchObject({
        time: period,
        account: "Expenses",
        filter: "#already",
        conversion: "units",
      });
      await resolve(primaryReads()[1], statement());
      expect(screen.getByTestId("primary-read")).toHaveTextContent("-2354.89");

      await user.click(account);
      await user.clear(account);
      await user.type(account, "Expenses:Custom");
      expect(router.state.location.search.account).toBe("Expenses");
      await user.click(filter); // intentional blur commits the custom account
      await waitFor(() =>
        expect(router.state.location.search.account).toBe("Expenses:Custom"),
      );
      await waitFor(() => expect(primaryReads()).toHaveLength(3));
      expect(primaryReads()[2].variables).toMatchObject({
        time: period,
        account: "Expenses:Custom",
        filter: "#already",
      });
      await resolve(primaryReads()[2], statement());
      await user.clear(filter);
      await user.type(filter, "#manual");
      expect(router.state.location.search.filter).toBe("#already");
      await user.keyboard("{Enter}");
      await waitFor(() =>
        expect(router.state.location.search.filter).toBe("#manual"),
      );
      await waitFor(() => expect(primaryReads()).toHaveLength(4));
      expect(primaryReads()[3].variables).toMatchObject({
        time: period,
        account: "Expenses:Custom",
        filter: "#manual",
      });
      await resolve(primaryReads()[3], statement());

      await user.click(
        screen.getByRole("button", {
          name: en["component.searchControls.clearAll"],
        }),
      );
      await waitFor(() => {
        expect(time).toHaveValue("");
        expect(account).toHaveValue("");
        expect(filter).toHaveValue("");
      });
      const url = new URL(
        router.state.location.href,
        "https://example.invalid",
      );
      for (const name of ["account", "filter", "time"])
        expect(url.searchParams.has(name)).toBe(false);
      expect(url.searchParams.get("view")).toBe("accounts");
      expect(
        screen.queryByRole("button", {
          name: en["component.searchControls.clearAll"],
        }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(
        en["component.searchControls.failedToLoad"],
      );
      expect(attributeReads()).toHaveLength(1);
      await waitFor(() => expect(primaryReads()).toHaveLength(5));
      expect(primaryReads()[4].variables).toMatchObject({
        time: "",
        account: "",
        filter: "",
        conversion: "units",
      });
      await resolve(primaryReads()[4], statement());
      expect(screen.getByTestId("primary-read")).toHaveTextContent("-2354.89");
    },
  );

  it("removes the warning on a successful reread and commits genuine recovered suggestions without the draft blur overwriting selection", async () => {
    const { client, router, attributeReads, primaryReads } =
      await mountControls();
    const user = userEvent.setup();
    await resolve(primaryReads()[0], statement());
    await act(async () => attributeReads()[0].reject());
    expect(await screen.findByRole("alert")).toBeVisible();
    await user.click(fields().account);
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    await user.keyboard("{Escape}");

    const recovery = client.refetchQueries({
      include: [GetLedgerAttributesDocument],
    });
    await waitFor(() => expect(attributeReads()).toHaveLength(2));
    await act(async () => {
      attributeReads()[1].resolve(attributes());
      await recovery;
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const { account, filter, time } = fields();
    expect(account).toHaveValue("Expenses");
    expect(time).toHaveValue("2017-09");
    expect(filter).toHaveValue("#already");
    await user.click(account);
    await user.clear(account);
    await user.type(account, "FirstTravel");
    expect(
      await screen.findByRole("option", { name: "Expenses:FirstTravel" }),
    ).toBeVisible();
    await user.keyboard("{ArrowDown}{Enter}");
    await waitFor(() =>
      expect(router.state.location.search.account).toBe("Expenses:FirstTravel"),
    );
    await user.click(filter);
    expect(router.state.location.search.account).toBe("Expenses:FirstTravel");
    await user.clear(filter);
    const values = screen
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(values).toEqual([
      "#first-tag",
      "^first-link",
      'payee:"First Vendor"',
    ]);
    await user.keyboard("{Escape}");
    await user.click(time);
    await user.clear(time);
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["2017", "2018"]);
    await user.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => expect(router.state.location.search.time).toBe(2017));
    await user.tab();
    expect(router.state.location.search.time).toBe(2017);
  });

  it("withholds another ledger's cached suggestions on failure and restores only the new ledger's options", async () => {
    const { client, router, attributeReads, primaryReads } =
      await mountControls();
    const user = userEvent.setup();
    await resolve(attributeReads()[0], attributes("Old"));
    await resolve(primaryReads()[0], statement());
    await user.click(fields().account);
    await user.clear(fields().account);
    expect(
      await screen.findByRole("option", { name: "Assets:OldCash" }),
    ).toBeVisible();
    await user.keyboard("{Escape}");
    await act(async () =>
      router.navigate({
        to: "/ledger/$ledgerOwner/$ledgerName/income-statement",
        params: { ledgerOwner: "other", ledgerName: "books" },
        search: {
          time: "2026",
          account: "Expenses",
          filter: "",
          view: "accounts",
        },
      }),
    );
    await waitFor(() => expect(attributeReads()).toHaveLength(2));
    expect(attributeReads()[1].variables).toEqual({ ledgerId: "other/books" });
    expect(
      screen.queryByRole("option", { name: /Old/ }),
    ).not.toBeInTheDocument();
    await resolve(primaryReads()[1], statement());
    await act(async () => attributeReads()[1].reject());
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(fields().time).toHaveValue("2026");
    await user.click(fields().account);
    await user.clear(fields().account);
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    await user.keyboard("{Escape}");

    const recovery = client.refetchQueries({
      include: [GetLedgerAttributesDocument],
    });
    await waitFor(() => expect(attributeReads()).toHaveLength(3));
    expect(attributeReads()[2].variables).toEqual({ ledgerId: "other/books" });
    await act(async () => {
      attributeReads()[2].resolve(attributes("New"));
      await recovery;
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(fields().account);
    await user.clear(fields().account);
    const options = screen
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).toHaveLength(4);
    expect(options).toEqual(
      expect.arrayContaining([
        "Assets",
        "Assets:NewCash",
        "Expenses",
        "Expenses:NewTravel",
      ]),
    );
    expect(
      screen.queryByRole("option", { name: /Old/ }),
    ).not.toBeInTheDocument();
  });
});
