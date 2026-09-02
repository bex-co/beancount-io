import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { TextEditor } from "../ledger-file-view/text-editor";

// Capture the language/theme props the real TextEditor passes to Monaco
vi.mock("@monaco-editor/react", () => ({
  default: ({ language, theme }: { language?: string; theme?: string }) => (
    <div
      data-testid="monaco-editor"
      data-language={language}
      data-theme={theme}
    />
  ),
}));

vi.mock("@/common/hooks/use-theme", () => ({
  useIsDarkTheme: () => false,
}));

describe("TextEditor language selection", () => {
  afterEach(() => {
    cleanup();
  });

  const renderEditor = async (filename: string) => {
    render(<TextEditor content="content" filename={filename} readOnly />);
    return screen.findByTestId("monaco-editor");
  };

  it("uses Monaco's markdown language id for .md files", async () => {
    const editor = await renderEditor("README.md");
    expect(editor).toHaveAttribute("data-language", "markdown");
    expect(editor).toHaveAttribute("data-theme", "light");
  });

  it("maps extensions to registered language ids, not raw extensions", async () => {
    expect(await renderEditor("config.yml")).toHaveAttribute(
      "data-language",
      "yaml",
    );
  });

  it("keeps the beancount language and theme for ledger files", async () => {
    const editor = await renderEditor("main.beancount");
    expect(editor).toHaveAttribute("data-language", "beancount");
    expect(editor).toHaveAttribute("data-theme", "beancount-light");
  });

  it("highlights well-known extensionless files by basename", async () => {
    expect(await renderEditor("Makefile")).toHaveAttribute(
      "data-language",
      "makefile",
    );
  });

  it("falls back to plaintext for unknown extensions", async () => {
    expect(await renderEditor("notes.txt")).toHaveAttribute(
      "data-language",
      "plaintext",
    );
  });
});
