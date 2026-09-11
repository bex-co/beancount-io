import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TextFileView } from "../text-file-view";

const mocks = vi.hoisted(() => ({
  canWrite: true,
}));

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: mocks.canWrite }),
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

vi.mock("../../../hooks/use-platform", () => ({
  useIsMac: () => true,
}));

vi.mock("@tanstack/react-router", () => ({
  useBlocker: () => ({ status: "idle" }),
}));

vi.mock("../../non-text-file-views", () => ({
  FileMetadataBar: () => <div data-testid="file-meta" />,
  FileActionButtons: ({
    canEdit,
    onEdit,
  }: {
    canEdit?: boolean;
    onEdit?: () => void;
  }) =>
    canEdit && onEdit ? (
      <button type="button" onClick={onEdit}>
        common.edit
      </button>
    ) : null,
}));

vi.mock("../text-editor", () => ({
  TextEditor: ({
    content,
    readOnly,
    setEditedContent,
    onSave,
  }: {
    content: string;
    readOnly?: boolean;
    setEditedContent?: (value: string) => void;
    onSave?: () => void;
  }) => (
    <textarea
      aria-label="file-source"
      value={content}
      readOnly={readOnly}
      onChange={(event) => setEditedContent?.(event.target.value)}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "s") {
          onSave?.();
        }
      }}
    />
  ),
}));

describe("TextFileView write permission", () => {
  const fileContent = {
    content: 'option "title" "Books"\n',
    sha: "abc",
    size: 20,
    path: "accounts.bean",
  } as never;

  const renderView = (
    overrides: Partial<ComponentProps<typeof TextFileView>> = {},
  ) => {
    const onEnterEditMode = vi.fn();
    const onExitEditMode = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onDelete = vi.fn();
    render(
      <TextFileView
        filePath="accounts.bean"
        fileContent={fileContent}
        onSave={onSave}
        onDelete={onDelete}
        isSaving={false}
        onEnterEditMode={onEnterEditMode}
        onExitEditMode={onExitEditMode}
        {...overrides}
      />,
    );
    return { onEnterEditMode, onExitEditMode, onSave, onDelete };
  };

  beforeEach(() => {
    mocks.canWrite = true;
  });

  it("lets writers enter edit mode via shortcut and edit the buffer", () => {
    const { onEnterEditMode } = renderView({ isEditMode: false });

    fireEvent.keyDown(document, { key: "e", metaKey: true });
    expect(onEnterEditMode).toHaveBeenCalledTimes(1);

    const { onSave } = renderView({ isEditMode: true });
    const editor = screen.getAllByLabelText("file-source").at(-1)!;
    expect(editor).not.toHaveAttribute("readonly");
    fireEvent.change(editor, {
      target: { value: "; writer draft\n" },
    });
    expect(editor).toHaveValue("; writer draft\n");
    expect(screen.getByText("common.save")).toBeInTheDocument();
    fireEvent.click(screen.getByText("common.save"));
    expect(onSave).toHaveBeenCalled();
  });

  it("keeps readers read-only for shortcuts and editMode URLs", () => {
    mocks.canWrite = false;
    const { onEnterEditMode, onExitEditMode, onSave } = renderView({
      isEditMode: true,
    });

    expect(onExitEditMode).toHaveBeenCalled();
    const editor = screen.getByLabelText("file-source");
    expect(editor).toHaveAttribute("readonly");
    expect(screen.queryByText("common.save")).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "e", metaKey: true });
    expect(onEnterEditMode).not.toHaveBeenCalled();

    fireEvent.change(editor, {
      target: { value: "; qa-local-unsaved-shortcut-probe\n" },
    });
    expect(editor).toHaveValue('option "title" "Books"\n');
    expect(onSave).not.toHaveBeenCalled();
  });

  it("blocks save and further edits when write permission is lost mid-draft", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onExitEditMode = vi.fn();
    const { rerender } = render(
      <TextFileView
        filePath="accounts.bean"
        fileContent={fileContent}
        onSave={onSave}
        onDelete={vi.fn()}
        isSaving={false}
        isEditMode
        onEnterEditMode={vi.fn()}
        onExitEditMode={onExitEditMode}
      />,
    );

    const editor = screen.getByLabelText("file-source");
    fireEvent.change(editor, {
      target: { value: "; draft-to-keep\n" },
    });
    expect(editor).toHaveValue("; draft-to-keep\n");

    mocks.canWrite = false;
    rerender(
      <TextFileView
        filePath="accounts.bean"
        fileContent={fileContent}
        onSave={onSave}
        onDelete={vi.fn()}
        isSaving={false}
        isEditMode
        onEnterEditMode={vi.fn()}
        onExitEditMode={onExitEditMode}
      />,
    );

    expect(onExitEditMode).toHaveBeenCalled();
    expect(screen.getByLabelText("file-source")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("file-source")).toHaveValue(
      "; draft-to-keep\n",
    );
    expect(screen.queryByText("common.save")).not.toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shares one in-flight save across toolbar and keyboard until settlement", async () => {
    let releaseSave!: () => void;
    const pendingSave = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    const onSave = vi.fn(() => pendingSave);
    const onExitEditMode = vi.fn();

    render(
      <TextFileView
        filePath="accounts.bean"
        fileContent={fileContent}
        onSave={onSave}
        onDelete={vi.fn()}
        isSaving={false}
        isEditMode
        onEnterEditMode={vi.fn()}
        onExitEditMode={onExitEditMode}
      />,
    );

    const editor = screen.getByLabelText("file-source");
    fireEvent.change(editor, {
      target: { value: "; qa-20260908-file-save-pending\n" },
    });

    fireEvent.click(screen.getByText("common.save"));
    fireEvent.keyDown(editor, { key: "s", metaKey: true });
    fireEvent.click(screen.getByText("common.save"));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onExitEditMode).not.toHaveBeenCalled();

    releaseSave();
    await pendingSave;
    await Promise.resolve();

    expect(onExitEditMode).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("file-source"), {
      target: { value: "; deliberate-retry\n" },
    });
    fireEvent.keyDown(screen.getByLabelText("file-source"), {
      key: "s",
      metaKey: true,
    });
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it("retains the draft and allows retry after a failed save", async () => {
    const onSave = vi
      .fn()
      .mockImplementationOnce(async () => {
        throw new Error("network");
      })
      .mockImplementationOnce(async () => undefined);
    const onExitEditMode = vi.fn();

    render(
      <TextFileView
        filePath="accounts.bean"
        fileContent={fileContent}
        onSave={onSave}
        onDelete={vi.fn()}
        isSaving={false}
        isEditMode
        onEnterEditMode={vi.fn()}
        onExitEditMode={onExitEditMode}
      />,
    );

    const editor = screen.getByLabelText("file-source");
    fireEvent.change(editor, {
      target: { value: "; keep-on-failure\n" },
    });

    fireEvent.click(screen.getByText("common.save"));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    expect(onExitEditMode).not.toHaveBeenCalled();
    expect(screen.getByLabelText("file-source")).toHaveValue(
      "; keep-on-failure\n",
    );

    fireEvent.click(screen.getByText("common.save"));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(2);
      expect(onExitEditMode).toHaveBeenCalledTimes(1);
    });
  });
});
