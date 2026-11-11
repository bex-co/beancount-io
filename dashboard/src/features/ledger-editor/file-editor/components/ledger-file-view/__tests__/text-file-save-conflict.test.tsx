import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { TextFileView } from "../text-file-view";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
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
vi.mock("../../non-text-file-views", () => ({
  FileMetadataBar: () => null,
  FileActionButtons: () => null,
}));
vi.mock("../text-editor", () => ({
  TextEditor: ({
    content,
    readOnly,
    setEditedContent,
  }: {
    content: string;
    readOnly?: boolean;
    setEditedContent?: (value: string) => void;
  }) => (
    <textarea
      aria-label="file-source"
      value={content}
      readOnly={readOnly}
      onChange={(event) => setEditedContent?.(event.target.value)}
    />
  ),
}));

/**
 * A save another write overtook was a 4-second toast telling the reader to
 * refresh, and both refreshes ended badly: a reload discarded the draft, and
 * Out of date → Refresh kept it bound to the stale revision, so it could
 * never be saved (w2/110). The editor now keeps the draft with a persistent
 * notice, Copy my edit, and Load latest.
 */
type Revision = { content: string; sha: string; size: number };

const OPENED: Revision = { content: "opened\n", sha: "sha-opened", size: 7 };
const LATEST: Revision = {
  content: "opened\n; written by an agent\n",
  sha: "sha-latest",
  size: 30,
};

const conflict = () =>
  new CombinedGraphQLErrors({
    errors: [
      {
        message: "This change conflicts with the current state",
        extensions: { code: "CONFLICT", resource: "File" },
      },
    ],
  });

/**
 * A file view whose parent holds the revision, as Apollo does. `publish`
 * decides when a reloaded revision reaches the view: with the read, or later.
 */
function setup({ publishWithRead = true } = {}) {
  const onSave = vi.fn(async (_content: string, _base: Revision) => {
    throw conflict();
  });
  const control: { publish?: () => void } = {};
  const onLoadLatest = vi.fn();
  const root = createRootRoute({ component: Outlet });
  const file = createRoute({
    getParentRoute: () => root,
    path: "/file",
    validateSearch: (search: Record<string, unknown>) => ({
      editMode: search.editMode === true || search.editMode === "true",
    }),
    component: function FileRoute() {
      const { editMode } = file.useSearch();
      const navigate = file.useNavigate();
      const [revision, setRevision] = useState(OPENED);
      control.publish = () => setRevision(LATEST);
      onLoadLatest.mockImplementation(async () => {
        if (publishWithRead) setRevision(LATEST);
        return LATEST;
      });
      return (
        <TextFileView
          filePath="main.bean"
          fileContent={revision as never}
          onSave={onSave as never}
          onLoadLatest={onLoadLatest as never}
          onDelete={vi.fn()}
          isSaving={false}
          isEditMode={editMode}
          onEnterEditMode={() => void navigate({ search: { editMode: true } })}
          onExitEditMode={() => void navigate({ search: { editMode: false } })}
        />
      );
    },
  });
  const router = createRouter({
    routeTree: root.addChildren([file]),
    history: createMemoryHistory({ initialEntries: ["/file?editMode=true"] }),
  });
  render(<RouterProvider router={router} />);
  return { router, onSave, onLoadLatest, control };
}

const editor = () => screen.getByLabelText("file-source");
const DRAFT = "opened\n; my edit\n";

async function conflictingSave() {
  fireEvent.change(await screen.findByLabelText("file-source"), {
    target: { value: DRAFT },
  });
  fireEvent.click(screen.getByRole("button", { name: "common.save" }));
  return screen.findByRole("alert");
}

beforeEach(() => {
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

describe("TextFileView save conflict", () => {
  it("keeps the draft in edit mode with a notice that stays", async () => {
    const { router, onSave } = setup();
    const notice = await conflictingSave();

    expect(notice).toHaveTextContent("ledgerEditor.saveConflict");
    expect(editor()).toHaveValue(DRAFT);
    expect(editor()).not.toHaveAttribute("readonly");
    expect(router.state.location.search).toEqual({ editMode: true });
    expect(onSave).toHaveBeenCalledWith(
      DRAFT,
      expect.objectContaining({ sha: "sha-opened" }),
    );

    // Saving again is refused the same way; the notice stays put.
    fireEvent.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "ledgerEditor.saveConflict",
    );
    expect(editor()).toHaveValue(DRAFT);
  });

  it("copies the draft, and says so when the clipboard refuses", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    setup();
    const notice = await conflictingSave();
    const copy = within(notice).getByRole("button", {
      name: "ledgerEditor.copyMyEdit",
    });

    fireEvent.click(copy);
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("common.copied"),
    );
    expect(writeText).toHaveBeenCalledWith(DRAFT);

    writeText.mockRejectedValueOnce(new Error("denied"));
    fireEvent.click(copy);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("common.copyFailed"),
    );
    expect(editor()).toHaveValue(DRAFT);
  });

  it("asks before Load latest replaces the draft, and Cancel keeps it", async () => {
    const { onLoadLatest } = setup();
    const notice = await conflictingSave();
    fireEvent.click(
      within(notice).getByRole("button", { name: "ledgerEditor.loadLatest" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("ledgerEditor.loadLatestTitle");

    fireEvent.click(
      within(dialog).getByRole("button", { name: "common.cancel" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onLoadLatest).not.toHaveBeenCalled();
    expect(editor()).toHaveValue(DRAFT);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it.each([
    { publishWithRead: true, when: "with the read" },
    { publishWithRead: false, when: "after the read settles" },
  ])(
    "opens the latest revision and saves against it when it arrives $when",
    async ({ publishWithRead }) => {
      const { onSave, onLoadLatest, control } = setup({ publishWithRead });
      const notice = await conflictingSave();
      fireEvent.click(
        within(notice).getByRole("button", { name: "ledgerEditor.loadLatest" }),
      );
      const dialog = await screen.findByRole("dialog");
      await act(async () =>
        fireEvent.click(
          within(dialog).getByRole("button", {
            name: "ledgerEditor.loadLatestConfirm",
          }),
        ),
      );
      expect(onLoadLatest).toHaveBeenCalledTimes(1);

      if (!publishWithRead) {
        // The read answered, but its revision has not reached the view: the
        // draft must not be swapped for the old file in the meantime.
        expect(editor()).toHaveValue(DRAFT);
        await act(async () => control.publish!());
      }

      await waitFor(() => expect(editor()).toHaveValue(LATEST.content));
      expect(screen.queryByRole("alert")).toBeNull();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

      // The next save goes against the latest revision.
      onSave.mockResolvedValueOnce(undefined);
      fireEvent.change(editor(), {
        target: { value: `${LATEST.content}; my edit\n` },
      });
      fireEvent.click(screen.getByRole("button", { name: "common.save" }));
      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
      expect(onSave).toHaveBeenLastCalledWith(
        `${LATEST.content}; my edit\n`,
        expect.objectContaining({ sha: "sha-latest" }),
      );
    },
  );

  it("shows no notice for a failure that is not a conflict", async () => {
    const { onSave } = setup();
    onSave.mockRejectedValueOnce(new Error("offline"));
    fireEvent.change(await screen.findByLabelText("file-source"), {
      target: { value: DRAFT },
    });
    fireEvent.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(editor()).not.toHaveAttribute("readonly"));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(editor()).toHaveValue(DRAFT);
  });
});
