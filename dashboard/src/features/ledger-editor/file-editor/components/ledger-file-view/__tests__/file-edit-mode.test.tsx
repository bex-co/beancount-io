import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { EditModeToolbar } from "../file-edit-mode";

const blockerState = vi.hoisted(() => ({
  status: "idle" as "idle" | "blocked",
  reset: vi.fn(),
  proceed: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useBlocker: () => blockerState,
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../hooks/use-platform", () => ({
  useIsMac: () => true,
}));

vi.mock("../text-editor-utils", () => ({
  alignAmounts: vi.fn(),
  toggleComment: vi.fn(),
  foldAll: vi.fn(),
  unfoldAll: vi.fn(),
}));

describe("EditModeToolbar draft guard", () => {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  const onDiscard = vi.fn();
  const editorRef = { current: null };

  beforeEach(() => {
    vi.clearAllMocks();
    blockerState.status = "idle";
  });

  it("keeps Edit, Save and Cancel named while saving", () => {
    const { rerender } = render(
      <EditModeToolbar
        editorRef={editorRef}
        editedContent="draft body"
        plainContent="saved body"
        onSave={onSave}
        onCancel={onCancel}
        onDiscard={onDiscard}
        isSaving={false}
      />,
    );

    expect(screen.getByRole("button", { name: "common.edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "common.save" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "common.cancel" }),
    ).toBeInTheDocument();

    rerender(
      <EditModeToolbar
        editorRef={editorRef}
        editedContent="draft body"
        plainContent="saved body"
        onSave={onSave}
        onCancel={onCancel}
        onDiscard={onDiscard}
        isSaving
      />,
    );

    expect(
      screen.getByRole("button", { name: "common.saving" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "common.save" }),
    ).not.toBeInTheDocument();
  });

  it("does not wipe the draft when Cancel is clicked", () => {
    render(
      <EditModeToolbar
        editorRef={editorRef}
        editedContent="draft body"
        plainContent="saved body"
        onSave={onSave}
        onCancel={onCancel}
        onDiscard={onDiscard}
        isSaving={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /common.cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it("discards only when Leave without saving is confirmed", () => {
    blockerState.status = "blocked";

    render(
      <EditModeToolbar
        editorRef={editorRef}
        editedContent="draft body"
        plainContent="saved body"
        onSave={onSave}
        onCancel={onCancel}
        onDiscard={onDiscard}
        isSaving={false}
      />,
    );

    expect(screen.getByText("ledgerEditor.unsavedChanges")).toBeInTheDocument();

    fireEvent.click(screen.getByText("ledgerEditor.stay"));
    expect(blockerState.reset).toHaveBeenCalled();
    expect(onDiscard).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("ledgerEditor.leaveWithoutSaving"));
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(blockerState.proceed).toHaveBeenCalled();
  });
});
