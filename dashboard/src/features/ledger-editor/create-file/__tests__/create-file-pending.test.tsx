import {
  act,
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const create = vi.hoisted(() => ({
  mutate: vi.fn(),
  navigate: vi.fn(),
  refresh: vi.fn(async () => ({ data: undefined })),
}));

const blockerState = vi.hoisted(() => ({
  status: "idle" as "idle" | "blocked",
  reset: vi.fn(),
  proceed: vi.fn(),
  shouldBlockFn: null as null | ((args: unknown) => boolean),
  enableBeforeUnload: null as null | boolean | (() => boolean),
}));

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({
    ledgerOwner: "owner",
    ledgerName: "books",
    _splat: "",
  }),
  useNavigate: () => create.navigate,
  useBlocker: (opts: {
    shouldBlockFn: (args: unknown) => boolean;
    enableBeforeUnload?: boolean | (() => boolean);
  }) => {
    blockerState.shouldBlockFn = opts.shouldBlockFn;
    blockerState.enableBeforeUnload = opts.enableBeforeUnload ?? null;
    return blockerState;
  },
}));

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({
    query: create.refresh,
    cache: { evict: () => true, gc: () => [] },
  }),
  useMutation: () => [create.mutate],
  // The folder has been read and holds nothing yet.
  useQuery: () => ({ data: { getLedgerDirContent: [] } }),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => (error: unknown) => String(error),
}));

vi.mock("@/common/hooks/use-theme", () => ({
  useIsDarkTheme: () => false,
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "books" }),
}));

// Drafting is writer-only behaviour; this suite is about the draft guard.
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({
    canWrite: true,
    canRead: true,
    isAdmin: false,
  }),
}));

vi.mock("@/common/components/monaco-editor", () => ({
  MonacoEditor: ({
    value,
    onChange,
    options,
  }: {
    value: string;
    onChange?: (value: string | undefined) => void;
    options?: { readOnly?: boolean };
  }) => (
    <textarea
      aria-label="file-content"
      value={value}
      readOnly={options?.readOnly}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

vi.mock("@/common/lib/editor/monaco-beancount-language", () => ({
  registerBeancountLanguage: vi.fn(),
}));

vi.mock("@/common/components/page-header", () => ({
  PageHeader: () => <div>header</div>,
}));

vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { toast } from "sonner";
import CreateFilePage from "../index";

/**
 * A pending Create File accepts no newer name or text: success leaves with
 * exactly the submitted draft, which is what it wrote (w4/247).
 */
describe("CreateFilePage while creating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    blockerState.shouldBlockFn = null;
  });

  const name = () => screen.getByPlaceholderText("ledgerEditor.nameYourFile");
  const text = () => screen.getByLabelText("file-content");

  async function draftAndSave() {
    render(<CreateFilePage />);
    fireEvent.change(name(), { target: { value: "qa-create.txt" } });
    fireEvent.change(text(), { target: { value: "saved revision\n" } });
    fireEvent.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(create.mutate).toHaveBeenCalledTimes(1));
  }

  it("locks both fields until the create settles, then leaves once", async () => {
    let finish!: () => void;
    create.mutate.mockImplementation(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    await draftAndSave();

    expect(name()).toHaveAttribute("readonly");
    expect(text()).toHaveAttribute("readonly");
    fireEvent.change(name(), { target: { value: "qa-create-newer.txt" } });
    fireEvent.change(text(), { target: { value: "NEWER unsaved\n" } });
    expect(name()).toHaveValue("qa-create.txt");
    expect(text()).toHaveValue("saved revision\n");

    await act(async () => finish());
    expect(create.navigate).toHaveBeenCalledTimes(1);
    expect(create.mutate.mock.calls[0]![0].variables.path).toBe(
      "qa-create.txt",
    );
    // The departure is the submitted draft's own, so it is not blocked.
    expect(
      blockerState.shouldBlockFn?.({
        current: { routeId: "r", pathname: "/f", params: {}, search: {} },
        next: { routeId: "r", pathname: "/o", params: {}, search: {} },
      }),
    ).toBe(false);
  });

  it("keeps the draft editable after a failed create", async () => {
    create.mutate.mockRejectedValue(new Error("offline"));
    await draftAndSave();

    await waitFor(() => expect(name()).not.toHaveAttribute("readonly"));
    expect(text()).not.toHaveAttribute("readonly");
    fireEvent.change(text(), { target: { value: "retry revision\n" } });
    expect(text()).toHaveValue("retry revision\n");
    expect(create.navigate).not.toHaveBeenCalled();
    expect(
      blockerState.shouldBlockFn?.({
        current: { routeId: "r", pathname: "/f", params: {}, search: {} },
        next: { routeId: "r", pathname: "/o", params: {}, search: {} },
      }),
    ).toBe(true);
  });

  it("completes a create whose folder refresh fails afterwards (w4/248)", async () => {
    create.mutate.mockResolvedValue({ data: {} });
    create.refresh.mockRejectedValueOnce(new Error("refresh offline"));
    await draftAndSave();

    await waitFor(() => expect(create.navigate).toHaveBeenCalledTimes(1));
    expect(create.mutate).toHaveBeenCalledTimes(1);
    expect(vi.mocked(toast.error)).not.toHaveBeenCalled();
  });

  /**
   * Leave Without Saving during a pending create reached Journal, then the
   * old success navigated to Files anyway, taking the reader back (w4/304).
   * Leaving unmounts the page, as the route change does.
   */
  describe("after the reader leaves", () => {
    it("lets a held create finish without taking the reader away", async () => {
      let finish!: () => void;
      create.mutate.mockImplementation(
        () => new Promise<void>((resolve) => (finish = resolve)),
      );
      render(<CreateFilePage />);
      fireEvent.change(name(), { target: { value: "qa-create.txt" } });
      fireEvent.change(text(), { target: { value: "saved revision\n" } });
      fireEvent.click(screen.getByRole("button", { name: "common.save" }));
      await waitFor(() => expect(create.mutate).toHaveBeenCalledTimes(1));
      cleanup();

      await act(async () => finish());
      expect(create.refresh).toHaveBeenCalled();
      expect(create.navigate).not.toHaveBeenCalled();
      expect(create.mutate).toHaveBeenCalledTimes(1);
    });

    it("does not navigate when the folder refresh lands after leaving", async () => {
      create.mutate.mockResolvedValue({ data: {} });
      let refreshed!: () => void;
      create.refresh.mockImplementationOnce(
        () =>
          new Promise(
            (resolve) => (refreshed = () => resolve({ data: undefined })),
          ),
      );
      await draftAndSave();
      await waitFor(() => expect(create.refresh).toHaveBeenCalled());
      cleanup();

      await act(async () => refreshed());
      expect(create.navigate).not.toHaveBeenCalled();
    });

    it("keeps an older create from redirecting a later draft", async () => {
      let finishOld!: () => void;
      create.mutate.mockImplementationOnce(
        () => new Promise<void>((resolve) => (finishOld = resolve)),
      );
      await draftAndSave();
      cleanup();

      // The reader comes back and starts again before the old save lands.
      render(<CreateFilePage />);
      fireEvent.change(name(), { target: { value: "qa-later.txt" } });
      await act(async () => finishOld());
      expect(create.navigate).not.toHaveBeenCalled();
      expect(name()).toHaveValue("qa-later.txt");
      expect(name()).not.toHaveAttribute("readonly");

      // The later journey's own save still leaves once.
      create.mutate.mockResolvedValueOnce({ data: {} });
      fireEvent.click(screen.getByRole("button", { name: "common.save" }));
      await waitFor(() => expect(create.navigate).toHaveBeenCalledTimes(1));
    });
  });
});
