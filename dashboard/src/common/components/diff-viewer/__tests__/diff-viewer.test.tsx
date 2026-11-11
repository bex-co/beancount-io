import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  act,
  render as renderComponent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useEffect, useState } from "react";
import type { CSSProperties, ComponentType, ReactElement } from "react";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { DiffViewer } from "../diff-viewer";
import { getDiffFileId } from "../diff-file-id";

vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");

const scrollToRow = vi.fn();

/**
 * Models react-window ^2.2.4: the imperative handle exists as soon as the list
 * mounts, but its `element` is attached later. A scroll issued while `element`
 * is null silently no-ops, which is exactly the window the viewer must survive.
 */
const listHandle: { scrollToRow: typeof scrollToRow; element: Element | null } =
  {
    scrollToRow,
    element: null,
  };

let elementAttachMode: "async" | "sync" | "never" = "async";

vi.mock("react-window", () => ({
  useListRef: () => ({ current: listHandle }),
  List: ({
    rowCount,
    rowComponent: RowComponent,
    rowProps,
    style,
    listRef,
    className,
    onRowsRendered,
  }: {
    rowCount: number;
    rowComponent: ComponentType<{
      index: number;
      style: CSSProperties;
      ariaAttributes?: Record<string, unknown>;
    }>;
    rowProps: Record<string, unknown>;
    style?: CSSProperties;
    listRef?: { current: unknown };
    className?: string;
    onRowsRendered?: (range: { startIndex: number; stopIndex: number }) => void;
  }) => {
    const [startIndex, setStartIndex] = useState(0);
    if (listRef && "current" in listRef) {
      listRef.current = listHandle;
    }
    useEffect(() => {
      scrollToRow.mockImplementation(({ index }: { index: number }) => {
        setStartIndex(index);
      });
    }, []);
    useEffect(() => {
      onRowsRendered?.({
        startIndex,
        stopIndex: Math.min(rowCount - 1, startIndex + 19),
      });
    }, [onRowsRendered, rowCount, startIndex]);
    // Attach after commit, so the consumer's layout effect observes the handle
    // without an element first — the real sequencing.
    useEffect(() => {
      if (elementAttachMode === "never") return;
      if (elementAttachMode === "sync") {
        listHandle.element = document.createElement("div");
        return;
      }
      const timer = setTimeout(() => {
        listHandle.element = document.createElement("div");
      }, 0);
      return () => clearTimeout(timer);
    }, []);
    return (
      <div data-testid="virtualized-diff" style={style} className={className}>
        {Array.from(
          { length: Math.min(rowCount - startIndex, 20) },
          (_, offset) => (
            <RowComponent
              key={startIndex + offset}
              index={startIndex + offset}
              style={{ height: 22 }}
              ariaAttributes={{}}
              {...rowProps}
            />
          ),
        )}
      </div>
    );
  },
}));

function render(element: ReactElement, localization = createLocalization()) {
  return renderComponent(element, {
    wrapper: ({ children }) => (
      <LocalizationProvider localization={localization}>
        {children}
      </LocalizationProvider>
    ),
  });
}

const source = {
  comment: "; Comment remains first — یادداشت",
  open: "2024-01-25 open Assets:Cash USD",
  old: '2024-01-25 * "Coinbase" "قبلی"',
  added: '2024-01-25 * "Coinbase" "خرید سهام"',
  posting: "  Assets:Cash  -1.2300 USD",
};

function mixedSourceDiff(virtual: boolean) {
  const padding = virtual
    ? Array.from({ length: 1001 }, (_, index) => ` ; padding ${index}`)
    : [];
  return `diff --git a/transfers.bean b/transfers.bean
--- a/transfers.bean
+++ b/transfers.bean
@@ -12,${4 + padding.length} +12,${4 + padding.length} @@
 ${source.comment}
 ${source.open}
-${source.old}
+${source.added}
 ${source.posting}
${padding.join("\n")}`;
}

let stylesheet: HTMLStyleElement;

function createLargeDiff(lineCount: number) {
  const lines = Array.from(
    { length: lineCount },
    (_, index) => `+line ${index + 1}`,
  );
  return `diff --git a/large.bean b/large.bean
new file mode 100644
--- /dev/null
+++ b/large.bean
@@ -0,0 +1,${lineCount} @@
${lines.join("\n")}`;
}

function createMultiFileLargeDiff() {
  const first = Array.from({ length: 400 }, (_, i) => `+first ${i}`).join("\n");
  const second = Array.from({ length: 120 }, (_, i) => `+second ${i}`).join(
    "\n",
  );
  return `diff --git a/early.bean b/early.bean
new file mode 100644
--- /dev/null
+++ b/early.bean
@@ -0,0 +1,400 @@
${first}
diff --git a/FY2027/FY2027Q2.bean b/FY2027/FY2027Q2.bean
new file mode 100644
--- /dev/null
+++ b/FY2027/FY2027Q2.bean
@@ -0,0 +1,120 @@
${second}`;
}

const deletedPath = "archives/دفتر/deleting.bean";

function createDeletedDiff(filename = deletedPath, lineCount = 3) {
  const content = [
    '2024-01-25 * "Deleted Café" "حذف"',
    "  Expenses:Food  33.71 USD",
    "  Assets:Bank  -33.71 USD",
    ...Array.from(
      { length: Math.max(0, lineCount - 3) },
      (_, index) => `; removed ${index}`,
    ),
  ];
  return `diff --git a/${filename} b/${filename}
deleted file mode 100644
--- a/${filename}
+++ /dev/null
@@ -1,${content.length} +0,0 @@
${content.map((line) => `-${line}`).join("\n")}\n`;
}

const renamedPaths = { old: "old/ledger.bean", new: "new/ledger.bean" };
const renameDiff = `diff --git a/${renamedPaths.old} b/${renamedPaths.new}
similarity index 80%
rename from ${renamedPaths.old}
rename to ${renamedPaths.new}
--- a/${renamedPaths.old}
+++ b/${renamedPaths.new}
@@ -1 +1 @@
-2024-01-25 open Assets:Cash USD
+2024-01-26 open Assets:Cash USD
`;
const focusCases = [
  {
    kind: "deleted file",
    requested: deletedPath,
    displayed: deletedPath,
    heading: deletedPath,
    diff: createDeletedDiff(),
  },
  {
    kind: "renamed old-path alias",
    requested: renamedPaths.old,
    displayed: renamedPaths.new,
    heading: `${renamedPaths.old} → ${renamedPaths.new}`,
    diff: renameDiff,
  },
  {
    kind: "renamed new path",
    requested: renamedPaths.new,
    displayed: renamedPaths.new,
    heading: `${renamedPaths.old} → ${renamedPaths.new}`,
    diff: renameDiff,
  },
];
const renameWithReplacement = `${renameDiff
  .replaceAll(renamedPaths.old, "a.bean")
  .replaceAll(
    renamedPaths.new,
    "b.bean",
  )}\n${createLargeDiff(1).replaceAll("large.bean", "a.bean")}`;

describe("DiffViewer", () => {
  beforeEach(() => {
    scrollToRow.mockReset();
    listHandle.element = null;
    elementAttachMode = "async";
    const require = createRequire(`${process.cwd()}/`);
    stylesheet = document.createElement("style");
    stylesheet.textContent =
      readFileSync(require.resolve("react-diff-view/style/index.css"), "utf8") +
      readFileSync(
        "src/common/components/diff-viewer/diff-viewer.css",
        "utf8",
      ).replace(/^@import\s+[^;]+;/gm, "");
    document.head.appendChild(stylesheet);
  });

  afterEach(() => {
    elementAttachMode = "async";
    stylesheet.remove();
  });

  it.each([
    {
      kind: "added",
      filename: "nested/created.bean",
      diff: createLargeDiff(3).replaceAll("large.bean", "nested/created.bean"),
    },
    {
      kind: "modified",
      filename: "transfers.bean",
      diff: mixedSourceDiff(false),
    },
    { kind: "deleted", filename: deletedPath, diff: createDeletedDiff() },
  ])(
    "keeps the real $kind path as the file heading and encoded anchor",
    ({ filename, diff }) => {
      render(<DiffViewer diff={diff} />);
      const section = document.getElementById(getDiffFileId(filename));
      expect(section).not.toBeNull();
      expect(section?.firstElementChild).toHaveTextContent(filename);
      expect(screen.getByText(filename, { exact: true })).toBeInTheDocument();
      expect(document.getElementById(getDiffFileId("/dev/null"))).toBeNull();
      expect(
        screen.queryByText("/dev/null", { exact: true }),
      ).not.toBeInTheDocument();
    },
  );

  it("tokenizes deleted Beancount source with the real syntax highlighter", () => {
    const { container } = render(<DiffViewer diff={createDeletedDiff()} />);
    const removed = container.querySelector(".diff-code-delete")!;
    expect(removed.textContent).toBe('2024-01-25 * "Deleted Café" "حذف"');
    expect(removed.querySelector(".token.date")).toHaveTextContent(
      "2024-01-25",
    );
    expect(
      Array.from(removed.querySelectorAll(".token.string")).map(
        (token) => token.textContent,
      ),
    ).toEqual(['"Deleted Café"', '"حذف"']);
  });

  it.each(focusCases)(
    "reveals the canonical small-diff section for a $kind focus request",
    ({ requested, displayed, diff }) => {
      const scrollIntoView = vi
        .spyOn(Element.prototype, "scrollIntoView")
        .mockClear();
      try {
        render(
          <DiffViewer
            diff={diff}
            focusRequest={{ fileId: getDiffFileId(requested), token: 31 }}
          />,
        );
        const target = document.getElementById(getDiffFileId(displayed));
        expect(target).not.toBeNull();
        expect(target?.firstElementChild).toHaveTextContent(displayed);
        expect(scrollIntoView.mock.contexts).toEqual([target]);
        expect(scrollIntoView).toHaveBeenCalledWith({
          block: "start",
          behavior: "auto",
        });
      } finally {
        scrollIntoView.mockRestore();
      }
    },
  );

  it.each(focusCases)(
    "waits for the virtual list before revealing a $kind and updating the current filename",
    async ({ requested, displayed, heading, diff }) => {
      const focusRequest = { fileId: getDiffFileId(requested), token: 41 };
      const combined = `${createLargeDiff(500)}\n${diff}`;
      const { rerender } = render(
        <DiffViewer diff={combined} focusRequest={focusRequest} />,
      );
      expect(listHandle.element).toBeNull();
      expect(scrollToRow).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(scrollToRow).toHaveBeenCalledWith({
          index: 501,
          align: "start",
          behavior: "auto",
        }),
      );
      const list = screen.getByTestId("virtualized-diff");
      const header = await within(list).findByText(heading, { exact: true });
      // The section id stays on the real (new) path; a rename's heading
      // names both sides (w2/109).
      expect(header).toHaveAttribute("id", getDiffFileId(displayed));
      // The active virtual header and the persistent filename agree.
      await waitFor(() =>
        expect(screen.getAllByText(heading, { exact: true })).toHaveLength(2),
      );
      expect(
        screen.queryByText("/dev/null", { exact: true }),
      ).not.toBeInTheDocument();
      expect(scrollToRow).toHaveBeenCalledTimes(1);
      rerender(<DiffViewer diff={combined} focusRequest={focusRequest} />);
      expect(scrollToRow).toHaveBeenCalledTimes(1);
    },
  );

  it("prefers a replacement file's canonical path over an earlier rename alias in a small diff", () => {
    const scrollIntoView = vi
      .spyOn(Element.prototype, "scrollIntoView")
      .mockClear();
    try {
      render(
        <DiffViewer
          diff={renameWithReplacement}
          focusRequest={{ fileId: getDiffFileId("a.bean"), token: 61 }}
        />,
      );
      const replacement = document.getElementById(getDiffFileId("a.bean"));
      const renamed = document.getElementById(getDiffFileId("b.bean"));
      expect(replacement).not.toBeNull();
      expect(renamed).not.toBeNull();
      expect(scrollIntoView.mock.contexts).toEqual([replacement]);
      expect(scrollIntoView.mock.contexts).not.toContain(renamed);
    } finally {
      scrollIntoView.mockRestore();
    }
  });

  it("prefers the replacement's canonical header over a rename alias after virtual readiness", async () => {
    render(
      <DiffViewer
        diff={`${createLargeDiff(500)}\n${renameWithReplacement}`}
        focusRequest={{ fileId: getDiffFileId("a.bean"), token: 62 }}
      />,
    );
    expect(listHandle.element).toBeNull();
    expect(scrollToRow).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(scrollToRow).toHaveBeenCalledWith({
        index: 504, // 501 rows for large.bean, then a rename header and its two lines.
        align: "start",
        behavior: "auto",
      }),
    );
    expect(
      screen.getByTestId("virtualized-diff").firstElementChild,
    ).toHaveAttribute("id", getDiffFileId("a.bean"));
    await waitFor(() =>
      expect(screen.getAllByText("a.bean", { exact: true })).toHaveLength(2),
    );
    expect(scrollToRow).toHaveBeenCalledTimes(1);
  });

  it.each([
    { fileId: getDiffFileId("/dev/null"), virtual: false },
    { fileId: "diff-file-", virtual: false },
    { fileId: getDiffFileId("/dev/null"), virtual: true },
    { fileId: "diff-file-", virtual: true },
  ])(
    "ignores non-file focus $fileId in virtual=$virtual mode",
    async ({ fileId, virtual }) => {
      const scrollIntoView = vi
        .spyOn(Element.prototype, "scrollIntoView")
        .mockClear();
      try {
        const diff = virtual
          ? `${createLargeDiff(500)}\n${createDeletedDiff()}`
          : createDeletedDiff();
        render(<DiffViewer diff={diff} focusRequest={{ fileId, token: 51 }} />);
        if (virtual)
          await waitFor(() => expect(listHandle.element).not.toBeNull());
        expect(scrollToRow).not.toHaveBeenCalled();
        expect(scrollIntoView).not.toHaveBeenCalled();
      } finally {
        scrollIntoView.mockRestore();
      }
    },
  );

  it.each(["en", "fa"] as const)(
    "isolates the actual small %s source table while preserving tokenized content, gutters and interface direction",
    async (language) => {
      const localization = createLocalization();
      await localization.changeLanguage(language);
      const direction = localization.i18n.dir();
      const { container } = render(
        <main lang={language} dir={direction} style={{ direction }}>
          <DiffViewer diff={mixedSourceDiff(false)} />
        </main>,
        localization,
      );
      const table = screen.getByRole("table");
      expect(table.tagName).toBe("TABLE");
      expect(getComputedStyle(table).direction).toBe("ltr");
      expect(getComputedStyle(table).unicodeBidi).toBe("isolate");
      expect(screen.queryByTestId("virtualized-diff")).not.toBeInTheDocument();
      const heading = screen.getByRole("heading", {
        name: localization.i18n.t("commits.changes"),
      });
      expect(heading.closest(".diff-source")).toBeNull();
      expect(getComputedStyle(container.querySelector("main")!).direction).toBe(
        direction,
      );
      const rows = Array.from(table.querySelectorAll(".diff-line"));
      expect(
        rows.map((row) => row.querySelector(".diff-code")!.textContent),
      ).toEqual([
        source.comment,
        source.open,
        source.old,
        source.added,
        source.posting,
      ]);
      expect(
        rows.map((row) =>
          Array.from(row.querySelectorAll("td")).map((cell) =>
            cell.classList.contains("diff-gutter")
              ? cell.textContent
              : "source",
          ),
        ),
      ).toEqual([
        ["12", "12", "source"],
        ["13", "13", "source"],
        ["14", "", "source"],
        ["", "14", "source"],
        ["15", "15", "source"],
      ]);
      expect(rows[2].querySelector(".diff-code-delete")).not.toBeNull();
      expect(rows[3].querySelector(".diff-code-insert")).not.toBeNull();
      expect(rows[3].querySelector(".token.date")).toHaveTextContent(
        "2024-01-25",
      );
      expect(
        Array.from(rows[3].querySelectorAll(".token.string")).map(
          (token) => token.textContent,
        ),
      ).toEqual(['"Coinbase"', '"خرید سهام"']);
      expect(rows[0].querySelector(".token.comment")).toHaveTextContent(
        source.comment,
      );
    },
  );

  it.each(["en", "fa"] as const)(
    "isolates the virtual %s source and keeps markers, whitespace and localized warnings outside the boundary",
    async (language) => {
      const localization = createLocalization();
      await localization.changeLanguage(language);
      const direction = localization.i18n.dir();
      const { container } = render(
        <main lang={language} dir={direction} style={{ direction }}>
          <DiffViewer diff={mixedSourceDiff(true)} />
        </main>,
        localization,
      );
      const list = screen.getByTestId("virtualized-diff");
      expect(getComputedStyle(list).direction).toBe("ltr");
      expect(getComputedStyle(list).unicodeBidi).toBe("isolate");
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      const sourceRows = Array.from(list.children).slice(1, 6);
      expect(
        sourceRows.map((row) =>
          Array.from(row.children).map((span) => span.textContent),
        ),
      ).toEqual([
        ["12", " ", source.comment],
        ["13", " ", source.open],
        ["14", "-", source.old],
        ["14", "+", source.added],
        ["15", " ", source.posting],
      ]);
      const heading = screen.getByRole("heading", {
        name: localization.i18n.t("commits.changes"),
      });
      const warning = screen.getByRole("alert");
      expect(warning).toHaveTextContent(
        localization.i18n.t("commits.largeDiffWarning", {
          totalLines: 1006,
        }),
      );
      expect(heading.closest(".diff-source")).toBeNull();
      expect(warning.closest(".diff-source")).toBeNull();
      expect(getComputedStyle(container.querySelector("main")!).direction).toBe(
        direction,
      );
      expect(list.querySelector(".token")).toBeNull();
    },
  );

  it("renders empty state when diff is empty", () => {
    render(<DiffViewer diff="" />);
    expect(screen.getByText("No changes to display")).toBeInTheDocument();
  });

  it("renders unified diff with additions and deletions", () => {
    const diff = `diff --git a/test.bean b/test.bean
index 1234567..abcdefg 100644
--- a/test.bean
+++ b/test.bean
@@ -1,3 +1,3 @@
 2024-01-01 open Assets:Checking USD
-2024-01-02 * "Old transaction"
+2024-01-02 * "New transaction"
   Assets:Checking  100.00 USD
`;
    const { container } = render(<DiffViewer diff={diff} />);
    expect(screen.getByText("Changes")).toBeInTheDocument();
    expect(screen.getByText("test.bean")).toBeInTheDocument();
    expect(
      container.querySelector(".diff-viewer-container .overflow-auto"),
    ).toBeNull();
    expect(
      container.ownerDocument.getElementById("diff-file-test.bean")
        ?.firstElementChild,
    ).toHaveClass("sticky");
  });

  it("handles invalid diff gracefully", () => {
    render(<DiffViewer diff="invalid diff content" />);
    expect(screen.getByText("Changes")).toBeInTheDocument();
    expect(
      screen.getByText("The diff could not be read. It may be malformed."),
    ).toBeInTheDocument();
  });

  it("renders multiple files correctly", () => {
    const diff = `diff --git a/file1.bean b/file1.bean
index 1234567..abcdefg 100644
--- a/file1.bean
+++ b/file1.bean
@@ -1 +1 @@
-old
+new
diff --git a/file2.bean b/file2.bean
index 7654321..gfedcba 100644
--- a/file2.bean
+++ b/file2.bean
@@ -1 +1 @@
-old
+new
`;
    render(<DiffViewer diff={diff} />);
    expect(screen.getByText("file1.bean")).toBeInTheDocument();
    expect(screen.getByText("file2.bean")).toBeInTheDocument();
  });

  it("virtualizes large diffs while keeping the current filename visible", () => {
    render(<DiffViewer diff={createLargeDiff(501)} />);

    expect(screen.getByTestId("virtualized-diff")).toBeInTheDocument();
    expect(screen.getAllByText("large.bean").length).toBeGreaterThan(0);
  });

  it("localizes the syntax-highlighting safeguard for very large diffs", () => {
    render(<DiffViewer diff={createLargeDiff(1001)} />);

    expect(
      screen.getByText(/This diff is very large \(1001 lines\)/),
    ).toBeInTheDocument();
  });

  it("scrolls a virtualized list to the requested file header", async () => {
    const fileId = getDiffFileId("FY2027/FY2027Q2.bean");
    render(
      <DiffViewer
        diff={createMultiFileLargeDiff()}
        focusRequest={{ fileId, token: 1 }}
      />,
    );

    await waitFor(() => {
      expect(scrollToRow).toHaveBeenCalledWith({
        index: 401, // 1 header + 400 lines for early.bean
        align: "start",
        behavior: "auto",
      });
    });
  });

  it("keeps the initial focus token until the list can actually scroll", async () => {
    const fileId = getDiffFileId("FY2027/FY2027Q2.bean");
    const focusRequest = { fileId, token: 11 };
    const { rerender } = render(
      <DiffViewer
        diff={createMultiFileLargeDiff()}
        focusRequest={focusRequest}
      />,
    );

    // The handle exists but its element does not yet: nothing may be consumed.
    expect(listHandle.element).toBeNull();
    expect(scrollToRow).not.toHaveBeenCalled();

    // Once the element attaches, the still-pending token lands the scroll.
    await waitFor(() => {
      expect(scrollToRow).toHaveBeenCalledWith({
        index: 401,
        align: "start",
        behavior: "auto",
      });
    });
    expect(scrollToRow).toHaveBeenCalledTimes(1);

    // And it is consumed exactly once: a re-render with the same token is a no-op.
    rerender(
      <DiffViewer
        diff={createMultiFileLargeDiff()}
        focusRequest={focusRequest}
      />,
    );
    expect(scrollToRow).toHaveBeenCalledTimes(1);

    // A new token scrolls again.
    rerender(
      <DiffViewer
        diff={createMultiFileLargeDiff()}
        focusRequest={{ fileId, token: 12 }}
      />,
    );
    await waitFor(() => {
      expect(scrollToRow).toHaveBeenCalledTimes(2);
    });
  });

  it("gives up without spinning when the list never becomes scrollable", async () => {
    elementAttachMode = "never";
    const fileId = getDiffFileId("FY2027/FY2027Q2.bean");
    render(
      <DiffViewer
        diff={createMultiFileLargeDiff()}
        focusRequest={{ fileId, token: 21 }}
      />,
    );

    // Let the retry budget run down; the frames must stop on their own.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(scrollToRow).not.toHaveBeenCalled();
    expect(screen.getByTestId("virtualized-diff")).toBeInTheDocument();
  });

  it("scrolls a small-diff file into view when a focus request arrives", () => {
    const scrollIntoView = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;

    try {
      const fileId = getDiffFileId("file2.bean");
      const diff = `diff --git a/file1.bean b/file1.bean
--- a/file1.bean
+++ b/file1.bean
@@ -1 +1 @@
-old
+new
diff --git a/file2.bean b/file2.bean
--- a/file2.bean
+++ b/file2.bean
@@ -1 +1 @@
-old
+new
`;
      render(<DiffViewer diff={diff} focusRequest={{ fileId, token: 7 }} />);

      expect(scrollIntoView).toHaveBeenCalled();
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it("ignores unknown focus targets without throwing", () => {
    render(
      <DiffViewer
        diff={createLargeDiff(501)}
        focusRequest={{ fileId: "diff-file-missing.bean", token: 3 }}
      />,
    );
    expect(scrollToRow).not.toHaveBeenCalled();
  });
});

/**
 * Git writes a TAB after a `---`/`+++` path that contains whitespace; the
 * parsed path must not keep it, or the file's section and its link differ
 * (w4/263). These patches carry the recorded separator byte.
 */
describe("DiffViewer header tab separator", () => {
  const spaced = "qa-20261020-diff spaced.txt";
  const unicode = "qa-20261020-中文 & ?# +.txt";
  const added = (name: string, separator = "\t") =>
    [
      `diff --git a/${name} b/${name}`,
      "new file mode 100644",
      "index 0000000..1111111",
      "--- /dev/null",
      `+++ b/${name}${separator}`,
      "@@ -0,0 +1,2 @@",
      "+line 1",
      "+line 2",
      "",
    ].join("\n");
  const deleted = (name: string) =>
    [
      `diff --git a/${name} b/${name}`,
      "deleted file mode 100644",
      "index 1111111..0000000",
      `--- a/${name}\t`,
      "+++ /dev/null",
      "@@ -1,1 +0,0 @@",
      "-line 1",
      "",
    ].join("\n");

  it.each([
    ["an added spaced name", spaced, added(spaced)],
    ["a deleted spaced name", spaced, deleted(spaced)],
    ["an added Unicode/punctuation name", unicode, added(unicode)],
    [
      "a plain-name control",
      "qa-20261020-diff-plain.txt",
      added("qa-20261020-diff-plain.txt", ""),
    ],
  ])("anchors %s at its real file name", (_case, name, diff) => {
    const scrollIntoView = vi
      .spyOn(Element.prototype, "scrollIntoView")
      .mockClear();
    try {
      render(
        <DiffViewer
          diff={diff}
          focusRequest={{ fileId: getDiffFileId(name), token: 263 }}
        />,
      );
      const section = document.getElementById(getDiffFileId(name));
      expect(section).not.toBeNull();
      expect(section?.firstElementChild).toHaveTextContent(name);
      expect(document.getElementById(getDiffFileId(`${name}\t`))).toBeNull();
      expect(scrollIntoView.mock.contexts).toEqual([section]);
    } finally {
      scrollIntoView.mockRestore();
    }
  });
});

/**
 * A pure rename — what `renameLedgerFile` commits — showed only the new path
 * over an empty body, with no sign it was a rename or what the old path was
 * (w2/109). This is the recorded patch for that commit.
 */
describe("DiffViewer renamed and line-free files", () => {
  const renamePatch = [
    "diff --git a/main.bean b/main.bean",
    "index 1111111..2222222 100644",
    "--- a/main.bean",
    "+++ b/main.bean",
    "@@ -1,1 +1,1 @@",
    '-include "qa-20261110/r2.bean"',
    '+include "qa-20261110/r.bean"',
    "diff --git a/qa-20261110/r2.bean b/qa-20261110/r.bean",
    "similarity index 100%",
    "rename from qa-20261110/r2.bean",
    "rename to qa-20261110/r.bean",
    "",
  ].join("\n");
  const heading = "qa-20261110/r2.bean → qa-20261110/r.bean";

  it("names both paths and says the rename changed nothing (small diff)", () => {
    render(<DiffViewer diff={renamePatch} />);
    const section = document.getElementById(
      getDiffFileId("qa-20261110/r.bean"),
    );
    expect(section).not.toBeNull();
    expect(section?.firstElementChild).toHaveTextContent(heading);
    expect(section).toHaveTextContent("File renamed without changes");
    // The old path is not a section of its own, and an edited file has no note.
    expect(
      document.getElementById(getDiffFileId("qa-20261110/r2.bean")),
    ).toBeNull();
    const main = document.getElementById(getDiffFileId("main.bean"));
    expect(main?.firstElementChild).toHaveTextContent(/^main\.bean$/);
    expect(main).not.toHaveTextContent("File renamed without changes");
    expect(main).not.toHaveTextContent("No line changes to show");
  });

  it("names both paths and says the rename changed nothing (virtual diff)", async () => {
    render(
      <DiffViewer
        diff={`${createLargeDiff(500)}\n${renamePatch}`}
        focusRequest={{
          fileId: getDiffFileId("qa-20261110/r.bean"),
          token: 109,
        }}
      />,
    );
    // 501 rows for large.bean, 3 for main.bean, then the rename's header.
    await waitFor(() =>
      expect(scrollToRow).toHaveBeenCalledWith({
        index: 504,
        align: "start",
        behavior: "auto",
      }),
    );
    const list = screen.getByTestId("virtualized-diff");
    const header = await within(list).findByText(heading, { exact: true });
    expect(header).toHaveAttribute("id", getDiffFileId("qa-20261110/r.bean"));
    expect(header.nextElementSibling).toHaveTextContent(
      "File renamed without changes",
    );
    // The persistent current-file bar names the rename too.
    await waitFor(() =>
      expect(screen.getAllByText(heading, { exact: true })).toHaveLength(2),
    );
  });

  it("gives a mode-only change a body instead of nothing", () => {
    render(
      <DiffViewer
        diff={[
          "diff --git a/scripts/run.sh b/scripts/run.sh",
          "old mode 100644",
          "new mode 100755",
          "",
        ].join("\n")}
      />,
    );
    const section = document.getElementById(getDiffFileId("scripts/run.sh"));
    expect(section?.firstElementChild).toHaveTextContent(/^scripts\/run\.sh$/);
    expect(section).toHaveTextContent("No line changes to show");
  });

  it("keeps an edited rename's lines and names both paths", () => {
    render(<DiffViewer diff={renameDiff} />);
    const section = document.getElementById(getDiffFileId(renamedPaths.new));
    expect(section?.firstElementChild).toHaveTextContent(
      `${renamedPaths.old} → ${renamedPaths.new}`,
    );
    expect(section).toHaveTextContent("2024-01-26 open Assets:Cash USD");
    expect(section).not.toHaveTextContent("File renamed without changes");
  });
});

/**
 * A posting to an account with a Persian segment drew as
 * `Assets:Qa:1.00 ……… ملی USD`: the Persian word, the spaces and the amount
 * formed one right-to-left run inside the LTR line (w2/118). Each RTL word
 * now sits in its own `<bdi>`, and the amount follows it outside.
 */
describe("DiffViewer right-to-left words in source", () => {
  const POSTING = "  Assets:Qa:ملی                               1.00 USD";
  const patch = (path: string, extra: string[] = []) =>
    [
      `diff --git a/${path} b/${path}`,
      "index 1111111..2222222 100644",
      `--- a/${path}`,
      `+++ b/${path}`,
      `@@ -1,1 +1,${2 + extra.length} @@`,
      ' 2026-11-10 * "QA"',
      `+${POSTING}`,
      ...extra.map((line) => `+${line}`),
      "",
    ].join("\n");

  const expectIsolated = (cell: Element) => {
    expect(cell.textContent).toContain(POSTING.trim());
    const bdis = Array.from(cell.querySelectorAll("bdi"));
    expect(bdis.map((bdi) => bdi.textContent)).toEqual(["ملی"]);
    // The amount is not inside the isolate.
    expect(bdis[0]!.textContent).not.toContain("1.00");
  };

  it.each(["main.bean", "notes.txt"])(
    "isolates the Persian segment in %s",
    (path) => {
      const { container } = render(<DiffViewer diff={patch(path)} />);
      expectIsolated(container.querySelector(".diff-code-insert")!);
    },
  );

  it("keeps highlighting while isolating", () => {
    const { container } = render(<DiffViewer diff={patch("main.bean")} />);
    const cell = container.querySelector(".diff-code-insert")!;
    expect(cell.querySelector(".token")).not.toBeNull();
  });

  it("isolates the Persian segment in a virtualized diff", () => {
    const padding = Array.from({ length: 600 }, (_, i) => `; padding ${i}`);
    render(<DiffViewer diff={patch("main.bean", padding)} />);
    const row = screen.getByText((_, element) =>
      Boolean(
        element?.tagName === "SPAN" &&
        element.classList.contains("whitespace-pre") &&
        element.textContent === POSTING,
      ),
    );
    expectIsolated(row);
  });

  it("adds no element to a line without RTL letters", () => {
    const { container } = render(<DiffViewer diff={mixedSourceDiff(false)} />);
    const inserted = container.querySelector(".diff-code-insert")!;
    // The added line holds Persian; the unchanged open line holds none.
    expect(inserted.querySelector("bdi")).not.toBeNull();
    const openLine = Array.from(
      container.querySelectorAll(".diff-code-normal"),
    ).find((cell) => cell.textContent?.includes("open Assets:Cash"));
    expect(openLine?.querySelector("bdi")).toBeNull();
  });
});
