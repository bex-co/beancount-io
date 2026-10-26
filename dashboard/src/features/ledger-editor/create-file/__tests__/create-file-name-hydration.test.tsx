import { act, fireEvent, waitFor } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * The new file's name field is server-rendered and autofocused, but typing
 * before hydration attaches onChange is wiped when React takes the field
 * over (w4/1100). It is read-only until then — still focusable, so the
 * autofocus lands — and the first name typed once ready is kept. Real SSR
 * markup, real hydration.
 */

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  // The real useHydrated: false on the server and through hydration's first
  // pass, true once hydrated.
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useParams: () => ({ ledgerOwner: "owner", ledgerName: "books", _splat: "" }),
  useNavigate: () => vi.fn(),
  useBlocker: () => ({ status: "idle", reset: vi.fn(), proceed: vi.fn() }),
}));

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({
    query: async () => ({ data: undefined }),
    cache: { evict: () => true, gc: () => [] },
  }),
  useMutation: () => [vi.fn()],
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
  }: {
    value: string;
    onChange?: (value: string | undefined) => void;
  }) => (
    <textarea
      aria-label="file-content"
      value={value}
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

import CreateFilePage from "../index";

describe("Create File name before and after hydration", () => {
  it("refuses early editing, then keeps the first name typed once ready", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(<CreateFilePage />);
    const name = container.querySelector<HTMLInputElement>(
      'input[placeholder="ledgerEditor.nameYourFile"]',
    )!;
    expect(name).not.toBeNull();
    expect(name).toHaveAttribute("readonly");
    expect(name).toHaveAttribute("autofocus");

    const recoverable = vi.fn();
    await act(async () => {
      hydrateRoot(container, <CreateFilePage />, {
        onRecoverableError: recoverable,
      });
    });
    await waitFor(() => expect(name).not.toHaveAttribute("readonly"));

    fireEvent.change(name, { target: { value: "first.bean" } });
    expect(name).toHaveValue("first.bean");
    expect(recoverable).not.toHaveBeenCalled();
    container.remove();
  });
});
