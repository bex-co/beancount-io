import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  useParams,
} from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { CommitMetadata } from "../commit-metadata";
import { CommitListItem } from "../commit-list-item";

vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");
vi.unmock("@/common/hooks/use-date-locale");

const commits = [
  {
    sha: "1234567890abcdef",
    message: "Synthetic initial commit",
    author: {
      name: "Ada",
      email: "ada@example.com",
      date: "2026-02-27T04:18:24.000Z",
    },
  },
  {
    sha: "abcdef1234567890",
    message: "Synthetic second commit",
    author: {
      name: "Ada",
      email: "ada@example.com",
      date: "2026-03-01T06:10:00.000Z",
    },
  },
];

const exactMetadataTime = (date: string, language: string) =>
  new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "long",
  }).format(new Date(date));

beforeEach(() => {
  // Freeze only the clock; Radix focus/tooltip and router timers remain real.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-09T12:00:00.000Z"));
  vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");
  vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-US"]);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function setup() {
  const localization = createLocalization();
  await localization.changeLanguage("de");
  const onSelect = vi.fn();
  function History() {
    const { commitSha } = useParams({ strict: false });
    const current = commits.find((commit) => commit.sha === commitSha)!;
    return (
      <LocalizationProvider localization={localization}>
        <CommitMetadata
          {...current}
          fileCount={1}
          stats={{ additions: 1, deletions: 0, total: 1 }}
        />
        <nav aria-label="Synthetic commit history">
          {commits.map((commit) => (
            <CommitListItem
              key={commit.sha}
              commit={commit}
              ledgerId="alice/books"
              isSelected={commit.sha === commitSha}
              onSelect={onSelect}
            />
          ))}
        </nav>
      </LocalizationProvider>
    );
  }
  const root = createRootRoute({ component: History });
  const commitRoute = createRoute({
    getParentRoute: () => root,
    path: "/ledger/$ledgerOwner/$ledgerName/commit/$commitSha",
    component: () => null,
  });
  const router = createRouter({
    routeTree: root.addChildren([commitRoute]),
    history: createMemoryHistory({
      initialEntries: [`/ledger/alice/books/commit/${commits[0].sha}`],
    }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  await screen.findByTestId("commit-metadata");
  return { localization, router, onSelect, user: userEvent.setup() };
}

describe("commit exact times follow the active application language", () => {
  it("updates both real Intl consumers and the keyboard tooltip without changing the instant or selection", async () => {
    const { localization, router, onSelect, user } = await setup();
    const date = commits[0].author.date;
    const metadata = screen.getByTestId("commit-metadata");
    const time = metadata.querySelector("time")!;
    const link = screen.getByRole("link", { name: /Synthetic initial commit/ });
    const historyTime = link.querySelector("time")!;
    const germanExact = exactMetadataTime(date, "de");
    const englishExact = exactMetadataTime(date, "en");
    expect(navigator.language).toBe("en-US");
    expect(germanExact).not.toBe(englishExact);
    expect(new Intl.DateTimeFormat().resolvedOptions().locale).toMatch(/^en\b/);
    expect.soft(time).toHaveAccessibleName(germanExact);
    expect
      .soft(historyTime)
      .toHaveAttribute("title", new Date(date).toLocaleString("de"));
    for (const timestamp of [time, historyTime]) {
      expect(timestamp).toHaveAttribute("datetime", date);
      expect(timestamp).toHaveTextContent("vor 7 Monaten");
    }
    expect(link).toHaveAttribute("aria-current", "page");
    await user.tab();
    expect(time).toHaveFocus();
    expect
      .soft(await screen.findByRole("tooltip"))
      .toHaveTextContent(germanExact);

    await act(async () => {
      await localization.changeLanguage("en");
    });
    expect(metadata.querySelector("time")).toBe(time);
    expect(link.querySelector("time")).toBe(historyTime);
    expect(time).toHaveAccessibleName(englishExact);
    expect(screen.getByRole("tooltip")).toHaveTextContent(englishExact);
    expect(time).toHaveFocus();
    expect(historyTime).toHaveAttribute(
      "title",
      new Date(date).toLocaleString("en"),
    );
    for (const timestamp of [time, historyTime]) {
      expect(timestamp).toHaveAttribute("datetime", date);
      expect(timestamp).toHaveTextContent("7 months ago");
    }
    expect(link).toHaveAttribute("aria-current", "page");
    expect(onSelect).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
    );
    await user.tab(); // Copy SHA
    await user.tab(); // Selected history entry
    await user.tab(); // Next history entry
    const next = screen.getByRole("link", { name: /Synthetic second commit/ });
    expect(next).toHaveFocus();
    expect(next).not.toHaveAttribute("aria-current");
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        `/ledger/alice/books/commit/${commits[1].sha}`,
      ),
    );
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(commits[1].sha);
    expect(next).toHaveAttribute("aria-current", "page");
    expect(link).not.toHaveAttribute("aria-current");
    expect(metadata.querySelector("time")).toHaveAttribute(
      "datetime",
      commits[1].author.date,
    );
    expect(metadata.querySelector("time")).toHaveAccessibleName(
      exactMetadataTime(commits[1].author.date, "en"),
    );
  });
});
