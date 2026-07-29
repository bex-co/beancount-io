import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiffViewer } from "../diff-viewer";

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

describe("DiffViewer", () => {
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
    expect(screen.queryByText("line 501")).not.toBeInTheDocument();
  });

  it("localizes the syntax-highlighting safeguard for very large diffs", () => {
    render(<DiffViewer diff={createLargeDiff(1001)} />);

    expect(
      screen.getByText(/This diff is very large \(1001 lines\)/),
    ).toBeInTheDocument();
  });
});
