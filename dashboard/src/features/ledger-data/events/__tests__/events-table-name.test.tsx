import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ledgerFilterSearchSchema } from "@/common/lib/ledger-search-params/schema";
import { LedgerSearchParamsProvider } from "@/common/providers/ledger-search-params-provider";
import {
  GetLedgerEventsDocument,
  type GetLedgerEventsQuery,
  type GetLedgerEventsQueryVariables,
} from "@/graphql/definitions";
import type { SupportedLanguage } from "@/i18n/config";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import LedgerEventsPage from "../index";
import en from "../locales/en";
import fa from "../locales/fa";

vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");
// The read-only page needs only the ledger display context; its query,
// localization, local controls, shared-filter provider and router are real.
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "example" }),
}));

// Four public example locations, plus a synthetic second type to exercise
// the owning page's type control without changing those dates or descriptions.
const events: GetLedgerEventsQuery["getLedgerEvents"] = [
  {
    __typename: "Event",
    date: "2016-04-11",
    type: "location",
    description: "Los Angeles",
  },
  {
    __typename: "Event",
    date: "2016-04-19",
    type: "location",
    description: "New Metropolis",
  },
  {
    __typename: "Event",
    date: "2016-11-16",
    type: "location",
    description: "Chicago",
  },
  {
    __typename: "Event",
    date: "2016-11-29",
    type: "location",
    description: "New Metropolis",
  },
  {
    __typename: "Event",
    date: "2016-12-01",
    type: "employer",
    description: "Acme",
  },
];

interface ReadRequest {
  variables: GetLedgerEventsQueryVariables;
  resolve: (data: GetLedgerEventsQuery["getLedgerEvents"]) => void;
  reject: () => void;
}
const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.stop());
});

async function setup(language: SupportedLanguage, time = "2016") {
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const requests: ReadRequest[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          requests.push({
            variables: operation.variables as GetLedgerEventsQueryVariables,
            resolve: (getLedgerEvents) => {
              observer.next({ data: { getLedgerEvents } });
              observer.complete();
            },
            reject: () =>
              observer.error(new Error("Events network unavailable")),
          });
        }),
    ),
  });
  clients.push(client);
  const root = createRootRoute({ component: Outlet });
  const ledger = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName",
    validateSearch: (search) => ledgerFilterSearchSchema.parse(search),
    component: () => (
      <LedgerSearchParamsProvider>
        <Outlet />
      </LedgerSearchParamsProvider>
    ),
  });
  const route = createRoute({
    getParentRoute: () => ledger,
    path: "/events",
    component: LedgerEventsPage,
  });
  const router = createRouter({
    routeTree: root.addChildren([ledger.addChildren([route])]),
    history: createMemoryHistory({
      initialEntries: [
        `/ledger/open_ledger/example/events${time ? `?time=${time}` : ""}`,
      ],
    }),
  });
  await router.load();
  render(
    <LocalizationProvider localization={localization}>
      <ApolloProvider client={client}>
        <RouterProvider router={router} />
      </ApolloProvider>
    </LocalizationProvider>,
  );
  await waitFor(() => expect(requests).toHaveLength(1));
  return { client, localization, requests, router, user: userEvent.setup() };
}

async function resolve(request: ReadRequest, data = events) {
  await act(async () => request.resolve(data));
}

describe("Events table identity", () => {
  it.each([
    ["en", en, "fa", fa],
    ["fa", fa, "en", en],
  ] as const)(
    "names the %s native table through filtering, a live language change and a shared-period reset",
    async (language, labels, nextLanguage, nextLabels) => {
      const { localization, requests, router, user } = await setup(language);
      await resolve(requests[0]);
      const name = labels["page.events.events"].message;
      const table = await screen.findByRole("table", { name });
      expect(table.tagName).toBe("TABLE");
      expect(within(table).getAllByRole("columnheader")).toHaveLength(3);
      expect(
        within(table).getByRole("columnheader", {
          name: localization.i18n.t("journal.date"),
        }),
      ).toBeInTheDocument();
      expect(
        within(table).getByRole("columnheader", {
          name: localization.i18n.t("page.accounts.type"),
        }),
      ).toBeInTheDocument();
      expect(
        within(table).getByRole("columnheader", {
          name: labels["page.events.description"].message,
        }),
      ).toBeInTheDocument();
      expect(
        within(table)
          .getAllByRole("row")
          .slice(1)
          .map((row) =>
            within(row)
              .getAllByRole("cell")
              .map((cell) => cell.textContent?.trim()),
          ),
      ).toEqual(
        events.map((event) => [event.date, event.type, event.description]),
      );
      expect(requests[0].variables).toEqual({
        ledgerId: "open_ledger/example",
        time: "2016",
        account: "",
        filter: "",
      });

      const search = screen.getByPlaceholderText(
        labels["page.events.searchEvents"].message,
      );
      await user.type(search, "mEtRoPoLiS");
      expect(
        within(screen.getByRole("table", { name })).getAllByRole("row"),
      ).toHaveLength(3);
      await act(async () => {
        await localization.changeLanguage(nextLanguage);
      });
      const nextName = nextLabels["page.events.events"].message;
      expect(screen.getByRole("table", { name: nextName })).toBe(table);
      expect(screen.queryByRole("table", { name })).not.toBeInTheDocument();
      expect(search).toHaveValue("mEtRoPoLiS");
      expect(requests).toHaveLength(1);
      await user.clear(search);
      await user.click(
        screen.getByRole("button", {
          name: localization.i18n.t("page.accounts.allTypes"),
        }),
      );
      await user.click(screen.getByRole("menuitem", { name: "location" }));
      expect(
        within(screen.getByRole("table", { name: nextName })).getAllByRole(
          "row",
        ),
      ).toHaveLength(5);
      expect(screen.queryByText("Acme")).not.toBeInTheDocument();
      await user.type(search, "no-such-location");
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: nextLabels["page.events.noEventsFound"].message,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          nextLabels["page.events.noEventsMatchFilters"].message,
        ),
      ).toBeInTheDocument();

      await act(async () => {
        await router.navigate({
          to: ".",
          search: { time: 2017 },
          replace: true,
        });
      });
      await waitFor(() => expect(requests).toHaveLength(2));
      expect(requests[1].variables).toEqual({
        ledgerId: "open_ledger/example",
        time: "2017",
        account: "",
        filter: "",
      });
      await resolve(requests[1], [{ ...events[4], date: "2017-01-01" }]);
      const resetTable = await screen.findByRole("table", { name: nextName });
      expect(
        screen.getByPlaceholderText(
          nextLabels["page.events.searchEvents"].message,
        ),
      ).toHaveValue("");
      expect(
        screen.getByRole("button", {
          name: localization.i18n.t("page.accounts.allTypes"),
        }),
      ).toBeInTheDocument();
      expect(
        within(resetTable).getByRole("cell", { name: "Acme" }),
      ).toBeInTheDocument();
      expect(router.state.location.search).toEqual({ time: 2017 });
    },
  );

  it("keeps pending, failed and genuinely empty reads table-free, then names a recovered read", async () => {
    const { client, localization, requests, router } = await setup("fa", "");
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(
      screen.queryByRole("table", { hidden: true }),
    ).not.toBeInTheDocument();
    await act(async () => requests[0].reject());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      localization.i18n.t("component.errorState.title"),
    );
    expect(
      screen.queryByText("Events network unavailable"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("table", { hidden: true }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(fa["page.events.noEventsFoundForLedger"].message),
    ).not.toBeInTheDocument();

    const retry = client.refetchQueries({ include: [GetLedgerEventsDocument] });
    await waitFor(() => expect(requests).toHaveLength(2));
    await act(async () => {
      requests[1].resolve([]);
      await retry;
    });
    expect(
      await screen.findByText(fa["page.events.noEventsFoundForLedger"].message),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("table", { hidden: true }),
    ).not.toBeInTheDocument();
    await act(async () => {
      await router.navigate({ to: ".", search: { time: 2016 } });
    });
    await waitFor(() => expect(requests).toHaveLength(3));
    await resolve(requests[2], []);
    expect(
      await screen.findByText(fa["page.events.noEventsMatchFilters"].message),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("table", { hidden: true }),
    ).not.toBeInTheDocument();

    const recovery = client.refetchQueries({
      include: [GetLedgerEventsDocument],
    });
    await waitFor(() => expect(requests).toHaveLength(4));
    await act(async () => {
      requests[3].resolve(events);
      await recovery;
    });
    const table = await screen.findByRole("table", {
      name: fa["page.events.events"].message,
    });
    expect(within(table).getAllByRole("row")).toHaveLength(6);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

/**
 * An authored event type spelled "all", or an empty type, is a real type:
 * it stays distinct from the global All Types action and filters exactly
 * (w4/271).
 */
describe("Events type filter with colliding and empty types", () => {
  const colliding: GetLedgerEventsQuery["getLedgerEvents"] = [
    {
      __typename: "Event",
      date: "2026-10-20",
      type: "all",
      description: "qa-20261020 event type all",
    },
    {
      __typename: "Event",
      date: "2026-10-20",
      type: "qa-20261020-other",
      description: "qa-20261020 event type other",
    },
    {
      __typename: "Event",
      date: "2026-10-20",
      type: "",
      description: "qa-20261020 event type empty",
    },
  ];

  const rowsShown = () =>
    within(screen.getByRole("table", { name: "Events" }))
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("cell")[2]!.textContent?.trim());

  async function choose(
    user: ReturnType<typeof userEvent.setup>,
    from: RegExp,
    item: string,
  ) {
    await user.click(screen.getByRole("button", { name: from }));
    await user.click(await screen.findByRole("menuitem", { name: item }));
  }

  it("offers one All Types action and the literal types, and filters exactly", async () => {
    const { requests, user } = await setup("en", "");
    await resolve(requests[0], colliding);
    await screen.findByRole("table", { name: "Events" });

    await user.click(screen.getByRole("button", { name: /All Types/ }));
    const items = (await screen.findAllByRole("menuitem")).map((item) =>
      item.textContent?.trim(),
    );
    expect(items).toEqual([
      "All Types",
      "(no type)",
      "all",
      "qa-20261020-other",
    ]);
    await user.click(screen.getByRole("menuitem", { name: "all" }));
    await waitFor(() =>
      expect(rowsShown()).toEqual(["qa-20261020 event type all"]),
    );
    expect(screen.getByText("Events: 1 / 3")).toBeInTheDocument();

    await choose(user, /^all$/, "(no type)");
    await waitFor(() =>
      expect(rowsShown()).toEqual(["qa-20261020 event type empty"]),
    );
    expect(
      screen.getByRole("button", { name: /\(no type\)/ }),
    ).toBeInTheDocument();

    await choose(user, /\(no type\)/, "All Types");
    await waitFor(() => expect(rowsShown()).toHaveLength(3));
  });
});

describe("Events dates in a zone that skipped a day (w4/285)", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it.each(["UTC", "America/Los_Angeles", "Pacific/Apia"])(
    "shows each source date exactly in %s",
    async (timeZone) => {
      process.env.TZ = timeZone;
      const skipped = [29, 30, 31].map((day) => ({
        __typename: "Event" as const,
        date: `2011-12-${day}`,
        type: "qa-20261020-calendar-display",
        description: `day${day}`,
      }));
      const { requests } = await setup("en", "2011");
      await resolve(requests[0], skipped);

      const table = await screen.findByRole("table", {
        name: en["page.events.events"].message,
      });
      await waitFor(() =>
        expect(
          within(table)
            .getAllByRole("row")
            .slice(1)
            .map((row) =>
              within(row)
                .getAllByRole("cell")
                .map((cell) => cell.textContent?.trim()),
            )
            .map(([date, , description]) => [date, description])
            .sort(),
        ).toEqual([
          ["2011-12-29", "day29"],
          ["2011-12-30", "day30"],
          ["2011-12-31", "day31"],
        ]),
      );
    },
  );
});

/**
 * Valid authored types that read as blank, or exactly like the filter's own
 * choices, left unnamed or identical menu items and triggers (w4/1016).
 */
describe("Events type filter with blank and look-alike types", () => {
  const event = (type: string, description: string) => ({
    __typename: "Event" as const,
    date: "2026-10-23",
    type,
    description,
  });
  const lookalikes: GetLedgerEventsQuery["getLedgerEvents"] = [
    event(" ", "qa one space"),
    event("\t", "qa tab"),
    event("", "qa empty"),
    event("All Types", "qa literal all types"),
    event("(no type)", "qa literal no type"),
    event("qa-control", "qa ordinary"),
  ];

  const rowsShown = () =>
    within(screen.getByRole("table", { name: "Events" }))
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("cell")[2]!.textContent?.trim());

  it("names every choice distinctly and filters each to its own row", async () => {
    const { requests, user } = await setup("en", "");
    await resolve(requests[0], lookalikes);
    await screen.findByRole("table", { name: "Events" });

    const trigger = () =>
      screen.getByRole("button", {
        name: /^All Types$|^"|\(no type\)|qa-control/,
      });
    await user.click(trigger());
    const names = (await screen.findAllByRole("menuitem")).map((item) =>
      item.textContent?.trim(),
    );
    expect(names).toEqual([
      "All Types",
      "(no type)",
      '"\\t"',
      '"\\u0020"',
      '"(no type)"',
      '"All Types"',
      "qa-control",
    ]);
    expect(new Set(names).size).toBe(names.length);
    await user.keyboard("{Escape}");

    for (const [item, row] of [
      ['"\\u0020"', "qa one space"],
      ['"\\t"', "qa tab"],
      ["(no type)", "qa empty"],
      ['"All Types"', "qa literal all types"],
      ['"(no type)"', "qa literal no type"],
      ["qa-control", "qa ordinary"],
    ]) {
      await user.click(trigger());
      await user.click(await screen.findByRole("menuitem", { name: item }));
      await waitFor(() => expect(rowsShown()).toEqual([row]));
      // The selected trigger is named by that same distinct label.
      expect(screen.getByRole("button", { name: item })).toBeInTheDocument();
    }

    await user.click(trigger());
    await user.click(
      await screen.findByRole("menuitem", { name: "All Types" }),
    );
    await waitFor(() => expect(rowsShown()).toHaveLength(6));
  });
});
