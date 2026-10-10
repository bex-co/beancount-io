import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { compile } from "tailwindcss";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { CommitFileList } from "../commit-file-list";

const files = [
  { filename: "accounts/税 #%.bean", additions: 4, deletions: 2 },
  { filename: "main.bean", additions: 0, deletions: 1 },
];

let classes: Record<"summary" | "link", string[]>;
let rules: Map<string, string>;

// Compile the owning component's actual rendered classes. Browser checks,
// rather than jsdom, verify the resulting outline geometry and pixels.
beforeAll(async () => {
  const { container } = render(<CommitFileList files={files} />);
  classes = {
    summary: Array.from(container.querySelector("summary")!.classList),
    link: Array.from(container.querySelector("a")!.classList),
  };
  cleanup();
  const require = createRequire(`${process.cwd()}/`);
  const compiler = await compile('@import "tailwindcss";', {
    base: process.cwd(),
    loadStylesheet: async (id: string, base: string) => {
      const path = require.resolve(
        id === "tailwindcss" ? "tailwindcss/index.css" : id,
      );
      return { path, base, content: readFileSync(path, "utf8") };
    },
  });
  const css = compiler.build([
    ...new Set([...classes.summary, ...classes.link]),
  ]);
  rules = new Map();
  const selector = /\.((?:[^\s{},\\]|\\.)+)\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = selector.exec(css)) !== null) {
    let depth = 1;
    let end = selector.lastIndex;
    for (; end < css.length && depth > 0; end++) {
      if (css[end] === "{") depth++;
      else if (css[end] === "}") depth--;
    }
    rules.set(
      match[1].replace(/\\/g, ""),
      css.slice(selector.lastIndex, end - 1),
    );
  }
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", window.location.pathname);
});

describe("CommitFileList", () => {
  it.each(["summary", "link"] as const)(
    "emits an inset system-color keyboard outline for the %s under forced colors",
    (element) => {
      const forced = classes[element]
        .map((name) => rules.get(name) ?? "")
        .filter((css) => css.includes("forced-colors: active"));
      expect(forced.length).toBeGreaterThan(0);
      expect(forced.every((css) => css.includes(":focus-visible"))).toBe(true);
      const css = forced.join("\n");
      expect(css).toMatch(/outline-style:\s*solid/);
      expect(css).toMatch(/outline-width:\s*2px/);
      expect(css).toMatch(/outline-color:\s*CanvasText/);
      expect(css).toMatch(/outline-offset:\s*(?:-2px|calc\(2px \* -1\))/);
      expect(css).not.toMatch(/forced-color-adjust:\s*none/);
    },
  );

  it("retains both ordinary inset rings outside the forced-colors query", () => {
    for (const element of ["summary", "link"] as const) {
      const ordinary = classes[element]
        .filter((name) => name.startsWith("focus-visible:"))
        .map((name) => rules.get(name) ?? "")
        .join("\n");
      expect(ordinary).toContain(":focus-visible");
      expect(ordinary).toMatch(/--tw-ring-shadow:.*2px/);
      expect(ordinary).toMatch(/--tw-ring-inset:\s*inset/);
      expect(ordinary).toMatch(/box-shadow:/);
      expect(ordinary).not.toContain("forced-colors: active");
    }
  });

  it("is collapsed by default and links files to matching diff anchors", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CommitFileList
        files={[
          {
            filename: "accounts/main.bean",
            additions: 4,
            deletions: 2,
          },
        ]}
      />,
    );

    const disclosure = container.querySelector("details");
    expect(disclosure).not.toHaveAttribute("open");

    await user.click(screen.getByText("files changed"));
    expect(disclosure).toHaveAttribute("open");
    expect(
      screen.getByRole("link", { name: /accounts\/main\.bean/ }),
    ).toHaveAttribute("href", "#diff-file-accounts%2Fmain.bean");
    expect(screen.getByText("+4")).toBeInTheDocument();
    expect(screen.getByText("-2")).toBeInTheDocument();
  });

  it("retains file keyboard order, encoded fragments and repeated activation", async () => {
    const user = userEvent.setup();
    const onFileSelect = vi.fn();
    const { container } = render(
      <CommitFileList files={files} onFileSelect={onFileSelect} />,
    );
    const summary = screen.getByText("files changed");
    const disclosure = container.querySelector("details");
    expect(disclosure).not.toHaveAttribute("open");
    // jsdom does not implement summary's native keyboard focus. Browser
    // controls cover Tab/Enter on the disclosure; its actual click opens here.
    await user.click(summary);
    expect(disclosure).toHaveAttribute("open");
    expect(
      screen.getByRole("navigation", { name: "files changed" }),
    ).toBeInTheDocument();
    const first = screen.getByRole("link", {
      name: /^accounts\/税 #%\.bean\s*\+4\s*-2$/,
    });
    const fragment = "#diff-file-accounts%2F%E7%A8%8E%20%23%25.bean";
    expect(first).toHaveAttribute("href", fragment);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    await user.tab();
    expect(first).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(window.location.hash).toBe(fragment));
    expect(onFileSelect).toHaveBeenCalledExactlyOnceWith(files[0].filename);
    await user.keyboard("{Enter}");
    await user.click(first);
    expect(onFileSelect.mock.calls).toEqual([
      [files[0].filename],
      [files[0].filename],
      [files[0].filename],
    ]);
    expect(window.location.hash).toBe(fragment);
    await user.tab();
    expect(
      screen.getByRole("link", { name: /^main\.bean\s*\+0\s*-1$/ }),
    ).toHaveFocus();
    await user.tab({ shift: true });
    expect(first).toHaveFocus();
    await user.click(summary);
    expect(disclosure).not.toHaveAttribute("open");
  });
});
