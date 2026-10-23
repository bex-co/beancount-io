import { FeedSource } from "../../../../generated-graphql/types";
import fs from "fs";
import path from "path";
import {
  feedDateIsCalendarDay,
  feedQueryVariables,
  feedRowAction,
  feedRowDetail,
  feedSourceLabelKey,
  sortFeedItems,
} from "../feed-logic";

describe("feedSourceLabelKey", () => {
  it("labels every source, with releases no longer read as blog posts", () => {
    expect(feedSourceLabelKey(FeedSource.LedgerRss)).toBe("feedSourceLedger");
    expect(feedSourceLabelKey(FeedSource.Blog)).toBe("feedSourceBlog");
    expect(feedSourceLabelKey(FeedSource.Changelog)).toBe("feedSourceRelease");
  });
});

// w21/136: the card asked for the English feed whatever the app language.
describe("feedQueryVariables", () => {
  it("asks for the feed in the app's language", () => {
    expect(feedQueryVariables(5, "de")).toEqual({
      offset: 0,
      limit: 5,
      locale: "de",
    });
  });

  it("is what the card queries with, from the live locale", () => {
    const card = fs.readFileSync(
      path.join(__dirname, "..", "feed-card.tsx"),
      "utf8",
    );
    expect(card.includes("const { t, locale } = useTranslations();")).toBe(
      true,
    );
    expect(
      card.includes("variables: feedQueryVariables(FEED_LIMIT, locale),"),
    ).toBe(true);
    expect(card.includes('locale: "en"')).toBe(false);
  });
});

// w21/137: ledger activity rows carry relative links the row ignored.
describe("feedRowAction", () => {
  const server = "https://beancount.io/";

  it("opens a commit row's commit in the app", () => {
    const action = feedRowAction("/ledger/alice/books/commit/abc123", server);
    expect(JSON.stringify(action)).toBe(
      JSON.stringify({
        kind: "ledger",
        target: {
          ledgerFullName: "alice/books",
          href: {
            pathname: "/commit-detail",
            params: { sha: "abc123", ledger: "alice/books" },
          },
        },
        sourceUrl: "https://beancount.io/ledger/alice/books/commit/abc123",
      }),
    );
  });

  it("opens a ledger-level row's ledger", () => {
    const action = feedRowAction("/ledger/alice/books", server);
    expect(action?.kind === "ledger" && action.target.href).toBe("/");
  });

  it("links out for blog and release rows", () => {
    expect(feedRowAction("https://beancount.io/blog/post", server)).toEqual({
      kind: "external",
      url: "https://beancount.io/blog/post",
    });
  });

  it("is no action for a link that resolves to nothing", () => {
    expect(feedRowAction("/settings", server)).toBe(null);
    expect(feedRowAction("", server)).toBe(null);
  });
});

describe("the feed row", () => {
  it("acts on feedRowAction, opening ledger links in the app with a push", () => {
    const card = fs.readFileSync(
      path.join(__dirname, "..", "feed-card.tsx"),
      "utf8",
    );
    expect(card.includes("feedRowAction(link, getServerUrl())")).toBe(true);
    expect(card.includes('navigation: "push"')).toBe(true);
    expect(card.includes("disabled={!action}")).toBe(true);
  });
});

describe("feedDateIsCalendarDay", () => {
  it("reads blog and release dates as days, ledger activity as instants", () => {
    expect(feedDateIsCalendarDay(FeedSource.Blog)).toBe(true);
    expect(feedDateIsCalendarDay(FeedSource.Changelog)).toBe(true);
    expect(feedDateIsCalendarDay(FeedSource.LedgerRss)).toBe(false);
  });

  it("is what the row formats its date with", () => {
    const card = fs.readFileSync(
      path.join(__dirname, "..", "feed-card.tsx"),
      "utf8",
    );
    expect(card.includes("feedRowDate(publishedAt, source, locale)")).toBe(
      true,
    );
    const logic = fs.readFileSync(
      path.join(__dirname, "..", "feed-logic.ts"),
      "utf8",
    );
    expect(logic.includes("return feedDateIsCalendarDay(source)")).toBe(true);
  });
});

// w21/417: an empty feed (any RSS outage) drew a "Latest Updates" header over a
// blank card.
describe("feedCardIsEmpty", () => {
  const { feedCardIsEmpty } = require("../feed-logic");

  it("hides the card when the feed came back empty", () => {
    expect(
      feedCardIsEmpty({ failed: false, loading: false, itemCount: 0 }),
    ).toBe(true);
  });

  it("keeps it for updates, a load in flight and a failure", () => {
    expect(
      feedCardIsEmpty({ failed: false, loading: false, itemCount: 3 }),
    ).toBe(false);
    expect(
      feedCardIsEmpty({ failed: false, loading: true, itemCount: 0 }),
    ).toBe(false);
    expect(
      feedCardIsEmpty({ failed: true, loading: false, itemCount: 0 }),
    ).toBe(false);
  });

  it("is what the card renders, ahead of its header", () => {
    const src = require("fs")
      .readFileSync(
        require("path").join(__dirname, "..", "feed-card.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    const hidden = src.indexOf("returnnull;");
    expect(
      hidden > -1 && hidden < src.indexOf('title={t("latestUpdates")}'),
    ).toBe(true);
    expect(src.includes('feedCardIsEmpty({failed:loadState==="failed",')).toBe(
      true,
    );
  });
});

// w21/598: a commit at 18:30 Pacific on the 21st (01:30Z on the 22nd) sorted
// above the 22nd's posts, so the shown dates read Oct 21 over Oct 22.
describe("sortFeedItems", () => {
  const post = (id: string, publishedAt: string, source = FeedSource.Blog) => ({
    id,
    publishedAt,
    source,
  });
  const ids = (items: { id: string }[]) => items.map((item) => item.id);

  it("puts a post's day above an earlier commit day, whatever the instants say", () => {
    // Local noon on the 21st is the 21st in any zone.
    const commit = post(
      "commit",
      new Date(2026, 9, 21, 12, 0).toISOString(),
      FeedSource.LedgerRss,
    );
    const blog = post("blog", "2026-10-22T00:00:00.000Z");
    expect(ids(sortFeedItems([commit, blog]))).toEqual(["blog", "commit"]);
  });

  it("orders rows within a displayed day by time, and later days first", () => {
    const early = post(
      "early",
      new Date(2026, 9, 21, 9, 0).toISOString(),
      FeedSource.LedgerRss,
    );
    const late = post(
      "late",
      new Date(2026, 9, 21, 17, 0).toISOString(),
      FeedSource.LedgerRss,
    );
    const next = post("next", "2026-10-22T00:00:00.000Z");
    const older = post("older", "2026-10-20T00:00:00.000Z");
    expect(ids(sortFeedItems([older, early, next, late]))).toEqual([
      "next",
      "late",
      "early",
      "older",
    ]);
  });

  it("never shows the dates going up as you read down", () => {
    const rows = [
      post("a", "2026-10-22T00:00:00.000Z"),
      post(
        "b",
        new Date(2026, 9, 21, 18, 30).toISOString(),
        FeedSource.LedgerRss,
      ),
      post("c", "2026-10-21T00:00:00.000Z"),
      post(
        "d",
        new Date(2026, 9, 22, 8, 0).toISOString(),
        FeedSource.LedgerRss,
      ),
    ];
    const shown = sortFeedItems(rows).map((row) =>
      row.source === FeedSource.LedgerRss
        ? new Date(row.publishedAt).toDateString()
        : new Date(`${row.publishedAt.slice(0, 10)}T12:00:00`).toDateString(),
    );
    const times = shown.map((day) => Date.parse(day));
    expect(times.every((time, i) => i === 0 || times[i - 1]! >= time)).toBe(
      true,
    );
  });

  it("keeps a row with an unreadable date after the rest, in place", () => {
    const rows = [
      post("bad", "not a date"),
      post("ok", "2026-10-22T00:00:00.000Z"),
    ];
    expect(ids(sortFeedItems(rows))).toEqual(["ok", "bad"]);
  });
});

// w21/599: every save read "Committed to books", so several in a day looked
// duplicated, and a collaborator's commit could not be told from yours.
describe("feedRowDetail", () => {
  const commit = (summary: string | null, author: string | null) => ({
    source: FeedSource.LedgerRss,
    summary,
    author,
  });
  const me = { username: "alice", names: ["Alice Smith"] };

  it("shows each save's message under its row", () => {
    expect(
      feedRowDetail(commit("Add October rent", "alice"), me).subtitle,
    ).toBe("Add October rent");
    expect(feedRowDetail(commit("  Fix payee  ", "alice"), me).subtitle).toBe(
      "Fix payee",
    );
    expect(feedRowDetail(commit("", "alice"), me).subtitle).toBe(null);
  });

  it("names a collaborator, and not you however your name is written", () => {
    expect(feedRowDetail(commit("m", "bob"), me).byline).toBe("bob");
    expect(feedRowDetail(commit("m", "alice"), me).byline).toBe(null);
    expect(feedRowDetail(commit("m", "ALICE"), me).byline).toBe(null);
    expect(feedRowDetail(commit("m", "Alice Smith"), me).byline).toBe(null);
    expect(feedRowDetail(commit("m", null), me).byline).toBe(null);
  });

  it("names the author when it is unknown who is signed in", () => {
    expect(feedRowDetail(commit("m", "bob")).byline).toBe("bob");
  });

  it("leaves blog and release rows to their titles", () => {
    expect(
      feedRowDetail(
        { source: FeedSource.Blog, summary: "An excerpt", author: "Staff" },
        me,
      ),
    ).toEqual({ subtitle: null, byline: null });
  });
});

// w21/715: Latest Updates dated each row only, so two commits with one message
// on one day read as the same row.
describe("feedRowDate", () => {
  const { feedRowDate } = require("../feed-logic");
  const { FeedSource } = require("../../../../generated-graphql/types");

  it("gives a commit its time, so same-day commits differ", () => {
    const morning = feedRowDate(
      "2026-10-23T16:05:00Z",
      FeedSource.LedgerRss,
      "en",
      "America/Los_Angeles",
    );
    const afternoon = feedRowDate(
      "2026-10-23T21:40:00Z",
      FeedSource.LedgerRss,
      "en",
      "America/Los_Angeles",
    );
    expect(morning).toBe("Oct 23, 2026, 9:05 AM");
    expect(afternoon).toBe("Oct 23, 2026, 2:40 PM");
  });

  it("keeps a post's calendar day without a time", () => {
    expect(feedRowDate("2026-10-23T00:00:00Z", FeedSource.Blog, "en")).toBe(
      "Oct 23, 2026",
    );
  });
});

// w21/716: a five-commit push read "Import statement 5 / 4 / 3 / +2 more
// commit(s)" in two visible lines, so its count was cut off, in English.
describe("pushSummary", () => {
  const { pushSummary } = require("../feed-logic");

  it("reads how many commits a push holds, and its newest", () => {
    expect(
      pushSummary(
        "Import statement 5\nImport statement 4\nImport statement 3\n+2 more commit(s)",
      ),
    ).toEqual({ newest: "Import statement 5", total: 5 });
  });

  it("leaves a summary that lists every commit, or anything else, alone", () => {
    expect(pushSummary("Import statement 2\nImport statement 1")).toBe(null);
    expect(pushSummary("#12: Fix the budget")).toBe(null);
    expect(pushSummary("Release notes\n+2 more")).toBe(null);
    expect(pushSummary("+2 more commit(s)")).toBe(null);
  });

  it("is what the row shows first, in the app's language", () => {
    const card = fs
      .readFileSync(path.join(__dirname, "..", "feed-card.tsx"), "utf8")
      .replace(/\s+/g, "");
    expect(
      card.includes(
        '`${t("feedPushCommits",{count:push.total})}\\n${push.newest}`',
      ),
    ).toBe(true);
    expect(card.includes("{shownSubtitle}")).toBe(true);
  });
});

// w21/718: in German, a ledger commit row read "Committed to mcp-agent-eval".
describe("feedRowTitle", () => {
  const { feedRowTitle } = require("../feed-logic");
  const { de } = require("../../../../translations/de");
  const { en } = require("../../../../translations/en");
  const say =
    (strings: Record<string, string>) =>
    (key: string, params?: Record<string, string>) =>
      strings[key]!.replace("{{ledger}}", params?.ledger ?? "");
  const iso = (name: string) => `⁦${name}⁩`;

  it("says a commit and a new ledger in the app's language", () => {
    expect(
      feedRowTitle(
        "Committed to mcp-agent-eval",
        FeedSource.LedgerRss,
        say(de),
      ),
    ).toBe(`Commit in ${iso("mcp-agent-eval")}`);
    expect(
      feedRowTitle("Created repository books", FeedSource.LedgerRss, say(de)),
    ).toBe(`Hauptbuch ${iso("books")} erstellt`);
    // English reads as the server wrote it.
    expect(
      feedRowTitle("Committed to books", FeedSource.LedgerRss, say(en)),
    ).toBe(`Committed to ${iso("books")}`);
  });

  it("keeps any other title, and every post's, as the server wrote it", () => {
    expect(
      feedRowTitle(
        "Merged pull request in books",
        FeedSource.LedgerRss,
        say(de),
      ),
    ).toBe("Merged pull request in books");
    expect(
      feedRowTitle("Committed to the blog", FeedSource.Blog, say(de)),
    ).toBe("Committed to the blog");
  });

  it("is what the row shows", () => {
    const card = fs.readFileSync(
      path.join(__dirname, "..", "feed-card.tsx"),
      "utf8",
    );
    expect(card.includes("{feedRowTitle(title, source, t)}")).toBe(true);
  });
});
