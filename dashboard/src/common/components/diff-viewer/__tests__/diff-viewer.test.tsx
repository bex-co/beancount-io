import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import type { CSSProperties, ComponentType } from "react";
import { DiffViewer } from "../diff-viewer";
import { getDiffFileId } from "../diff-file-id";

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
  }) => {
    if (listRef && "current" in listRef) {
      listRef.current = listHandle;
    }
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
      <div data-testid="virtualized-diff" style={style}>
        {Array.from({ length: Math.min(rowCount, 20) }, (_, index) => (
          <RowComponent
            key={index}
            index={index}
            style={{ height: 22 }}
            ariaAttributes={{}}
            {...rowProps}
          />
        ))}
      </div>
    );
  },
}));

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

describe("DiffViewer", () => {
  beforeEach(() => {
    scrollToRow.mockClear();
    listHandle.element = null;
    elementAttachMode = "async";
  });

  afterEach(() => {
    elementAttachMode = "async";
  });

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
