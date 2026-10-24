import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { compileAppCss } from "@/test/tailwind";
import { TextFileView } from "../text-file-view";

/**
 * Keyboard focus on the read-only source shows on its frame (w4/1053). The
 * viewer hides Monaco's cursor, and the focused input is a 1px edit-context
 * node under the sticky headings, so Tab into the source painted nothing.
 * jsdom cannot paint or run Monaco, so this renders the real view around a
 * stand-in with Monaco's input structure and runs the frame's classes
 * through the app's Tailwind; the painted outline was measured in a real
 * browser in light and dark at 390px and 1440px.
 */
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: true }),
}));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));
vi.mock("@/common/lib/utils/encode", () => ({
  base64Decode: (value: string) => value,
}));
vi.mock("../../../../shared/components/ledger-file-breadcrumb", () => ({
  default: ({ path }: { path: string }) => <span>{path}</span>,
}));
vi.mock("../../../hooks/use-normalized-line-number", () => ({
  useNormalizedLineNumber: (line?: number) => line,
}));
vi.mock("../../../hooks/use-platform", () => ({ useIsMac: () => true }));
vi.mock("@tanstack/react-router", () => ({
  useBlocker: () => ({ status: "idle" }),
}));
vi.mock("../../non-text-file-views", () => ({
  FileMetadataBar: () => <div data-testid="file-meta" />,
  FileActionButtons: () => null,
}));
// Monaco's keyboard target: an edit-context div inside `.monaco-editor`.
vi.mock("../text-editor", () => ({
  TextEditor: ({ readOnly }: { readOnly?: boolean }) => (
    <div className="monaco-editor">
      <div
        className="native-edit-context"
        role="textbox"
        aria-label="Editor content"
        aria-readonly={readOnly}
        tabIndex={0}
      />
    </div>
  ),
}));

const FOCUS_SELECTOR =
  "&:has(*:is(.monaco-editor :is(textarea,.native-edit-context):focus-visible))";

function frameClasses(isEditMode: boolean) {
  const view = render(
    <TextFileView
      filePath="main.bean"
      fileContent={
        {
          content: 'option "title" "Example"\n',
          sha: "abc",
          size: 24,
          path: "main.bean",
        } as never
      }
      onSave={vi.fn().mockResolvedValue(undefined)}
      onDelete={vi.fn()}
      isSaving={false}
      isEditMode={isEditMode}
      onEnterEditMode={vi.fn()}
      onExitEditMode={vi.fn()}
    />,
  );
  const frame = screen
    .getByRole("textbox", { name: "Editor content" })
    .closest(".border") as HTMLElement;
  const classes = frame.className.split(/\s+/).filter(Boolean);
  view.unmount();
  return classes;
}

describe("Read-only source focus", () => {
  it("outlines the source frame while Monaco's input has keyboard focus", async () => {
    const classes = frameClasses(false);
    const focusClasses = classes.filter((name) => name.startsWith("has-["));
    expect(focusClasses.length).toBe(3);

    const css = await compileAppCss(focusClasses);
    // One rule per utility, each scoped to the frame holding a focused input.
    expect(css.split(FOCUS_SELECTOR).length - 1).toBe(3);
    expect(css).toContain("outline-width: 2px");
    expect(css).toContain("outline-offset: 2px");
    expect(css).toContain("outline-color: var(--ring)");
  });

  it("leaves the editable source, which shows its cursor, unmarked", () => {
    const classes = frameClasses(true);
    expect(classes.some((name) => name.startsWith("has-["))).toBe(false);
  });
});
