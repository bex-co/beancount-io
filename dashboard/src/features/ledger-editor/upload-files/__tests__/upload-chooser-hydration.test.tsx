import { act, waitFor } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The Files uploader's chooser is server-rendered, but its click handler only
 * exists after hydration, and an early click or Enter is dropped rather than
 * replayed (w4/1096). It must look unavailable until then — real SSR markup,
 * real hydration, the real hidden-input click — like the Import and Receipt
 * pickers (w4/266).
 */

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  // The real useHydrated: false on the server and through hydration's first
  // pass, true once hydrated.
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useParams: () => ({
    ledgerOwner: "owner",
    ledgerName: "books",
    _splat: "transactions",
  }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({
    query: async () => ({ data: undefined }),
    cache: { evict: () => true, gc: () => [] },
  }),
  useMutation: () => [vi.fn()],
  useQuery: () => ({ data: { getLedgerDirContent: [] } }),
}));

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({
    canWrite: true,
    canRead: true,
    isAdmin: false,
  }),
}));

vi.mock("@/common/hooks/use-is-authenticated", () => ({
  useIsAuthenticated: () => true,
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "books" }),
}));

vi.mock("@/common/components/page-header", () => ({
  PageHeader: () => <div>header</div>,
}));

vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import UploadFilesPage from "@/features/ledger-editor/upload-files";

afterEach(() => vi.restoreAllMocks());

describe("Files upload chooser before and after hydration", () => {
  it("is unavailable in server markup and opens the chooser once hydrated", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(<UploadFilesPage />);
    const button = [...container.querySelectorAll("button")].find(
      (candidate) => candidate.textContent === "ledgerEditor.chooseYourFiles",
    )!;
    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]')!;

    // Before hydration: honestly unavailable, with its instructions readable.
    expect(button).toBeDisabled();
    expect(input).toBeDisabled();
    expect(container).toHaveTextContent("ledgerEditor.dragFilesHere");

    const recoverable = vi.fn();
    await act(async () => {
      hydrateRoot(container, <UploadFilesPage />, {
        onRecoverableError: recoverable,
      });
    });
    await waitFor(() => expect(button).toBeEnabled());
    expect(input).toBeEnabled();

    const choose = vi.spyOn(HTMLInputElement.prototype, "click");
    button.click();
    expect(choose.mock.contexts).toEqual([input]);
    expect(recoverable).not.toHaveBeenCalled();
    container.remove();
  });
});
