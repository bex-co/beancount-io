import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { EditModeToolbar } from "../file-edit-mode";

const blockerState = vi.hoisted(() => ({
  status: "idle" as "idle" | "blocked",
  reset: vi.fn(),
  proceed: vi.fn(),
  shouldBlockFn: null as null | ((args: unknown) => boolean),
  enableBeforeUnload: null as null | boolean | (() => boolean),
}));

vi.mock("@tanstack/react-router", () => ({
  useBlocker: (opts: {
    shouldBlockFn: (args: unknown) => boolean;
    enableBeforeUnload?: boolean | (() => boolean);
  }) => {
    blockerState.shouldBlockFn = opts.shouldBlockFn;
    blockerState.enableBeforeUnload = opts.enableBeforeUnload ?? null;
    return blockerState;
  },
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

const DEPARTURE = {
  current: { routeId: "r", pathname: "/f", params: {}, search: {} },
  next: { routeId: "r", pathname: "/other", params: {}, search: {} },
};

describe("EditModeToolbar draft guard", () => {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  const onDiscard = vi.fn();
  const editorRef = { current: null };

  beforeEach(() => {
    vi.clearAllMocks();
    blockerState.status = "idle";
    blockerState.shouldBlockFn = null;
    blockerState.enableBeforeUnload = null;
  });

  it("arms beforeunload only while the draft differs from the saved content", () => {
    const { rerender } = render(
      <EditModeToolbar
        editorRef={editorRef}
        editedContent="saved body"
        plainContent="saved body"
        onSave={onSave}
        onCancel={onCancel}
        onDiscard={onDiscard}
        isSaving={false}
      />,
    );

    expect(blockerState.shouldBlockFn?.(DEPARTURE)).toBe(false);
    expect(
      typeof blockerState.enableBeforeUnload === "function"
        ? blockerState.enableBeforeUnload()
        : blockerState.enableBeforeUnload,
    ).toBe(false);

    rerender(
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

    expect(blockerState.shouldBlockFn?.(DEPARTURE)).toBe(true);
    expect(
      typeof blockerState.enableBeforeUnload === "function"
        ? blockerState.enableBeforeUnload()
        : blockerState.enableBeforeUnload,
    ).toBe(true);
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

    expect(
      screen.getByRole("button", { name: "common.edit" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "common.save" }),
    ).toBeInTheDocument();
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

/**
 * Cancelling the departure resumes editing (w4/964). The editor ref is backed
 * by a real focusable input, so typing after the choice closes shows where
 * focus actually landed; the dialog is the real Radix one.
 */
describe("EditModeToolbar returns to the editor after Stay", () => {
  function renderBlocked() {
    const input = document.createElement("textarea");
    input.setAttribute("aria-label", "editor input");
    input.value = "draft";
    document.body.appendChild(input);
    const editorRef = {
      current: { focus: () => input.focus() },
    } as unknown as Parameters<typeof EditModeToolbar>[0]["editorRef"];
    blockerState.status = "blocked";
    const props = {
      editorRef,
      editedContent: "draft",
      plainContent: "saved",
      onSave: vi.fn(),
      onCancel: vi.fn(),
      onDiscard: vi.fn(),
      isSaving: false,
    };
    const view = render(<EditModeToolbar {...props} />);
    // The router's reset or proceed unblocks; the dialog then closes.
    const unblock = () => {
      blockerState.status = "idle";
      view.rerender(<EditModeToolbar {...props} />);
    };
    blockerState.reset.mockImplementation(unblock);
    blockerState.proceed.mockImplementation(unblock);
    return { input, props };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it.each([
    ["Enter on Stay", "stay"],
    ["Escape", "escape"],
  ])("puts typing back into the retained draft after %s", async (_, via) => {
    const user = userEvent.setup();
    const { input, props } = renderBlocked();
    expect(
      await screen.findByRole("dialog", {
        name: "ledgerEditor.unsavedChanges",
      }),
    ).toBeInTheDocument();

    if (via === "stay") {
      screen.getByRole("button", { name: "ledgerEditor.stay" }).focus();
      await user.keyboard("{Enter}");
    } else {
      await user.keyboard("{Escape}");
    }

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(blockerState.reset).toHaveBeenCalled();
    expect(blockerState.proceed).not.toHaveBeenCalled();
    expect(props.onDiscard).not.toHaveBeenCalled();
    await waitFor(() => expect(input).toHaveFocus());
    await user.keyboard("x");
    expect(input).toHaveValue("draftx");
  });

  it("leaves focus to the departure after Leave without saving", async () => {
    const user = userEvent.setup();
    const { input, props } = renderBlocked();
    await user.click(
      await screen.findByRole("button", {
        name: "ledgerEditor.leaveWithoutSaving",
      }),
    );

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(props.onDiscard).toHaveBeenCalledTimes(1);
    expect(blockerState.proceed).toHaveBeenCalledTimes(1);
    expect(input).not.toHaveFocus();
  });
});

/** A failed Save hands focus back to the control it locked (w4/970). */
describe("EditModeToolbar focus after a failed Save", () => {
  const editorRef = { current: null };
  const props = {
    editorRef,
    editedContent: "draft body",
    plainContent: "saved body",
    onCancel: vi.fn(),
    onDiscard: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    blockerState.status = "idle";
    document.body.innerHTML = "";
  });

  function dropFocus() {
    const away = document.createElement("button");
    document.body.appendChild(away);
    away.focus();
    away.remove();
  }

  function renderToolbar() {
    const onSave = vi.fn();
    const view = render(
      <EditModeToolbar {...props} onSave={onSave} isSaving={false} />,
    );
    const setSaving = (isSaving: boolean) =>
      view.rerender(
        <EditModeToolbar {...props} onSave={onSave} isSaving={isSaving} />,
      );
    return { onSave, setSaving };
  }

  it("returns focus to Save when the failed save unlocks it, ready for a retry", async () => {
    const user = userEvent.setup();
    const { onSave, setSaving } = renderToolbar();
    screen.getByRole("button", { name: "common.save" }).focus();
    await user.keyboard("{Enter}");
    expect(onSave).toHaveBeenCalledWith("draft body");

    setSaving(true);
    const pending = screen.getByRole("button", { name: "common.saving" });
    expect(pending).toBeDisabled();
    // The browser drops focus from the control it just disabled; jsdom keeps
    // it there, so lose it the same way a removed element does.
    dropFocus();
    expect(document.body).toHaveFocus();

    setSaving(false);
    const save = screen.getByRole("button", { name: "common.save" });
    expect(save).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it("leaves focus where the reader moved it during the save", async () => {
    const user = userEvent.setup();
    const { setSaving } = renderToolbar();
    await user.click(screen.getByRole("button", { name: "common.save" }));
    setSaving(true);
    const cancel = screen.getByRole("button", { name: "common.cancel" });
    cancel.focus();

    setSaving(false);
    expect(cancel).toHaveFocus();
  });

  it("does not take focus for a save started elsewhere, such as Cmd+S in the editor", () => {
    const { setSaving } = renderToolbar();
    setSaving(true);
    dropFocus();

    setSaving(false);
    expect(
      screen.getByRole("button", { name: "common.save" }),
    ).not.toHaveFocus();
  });
});
