import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OAuthConsentPage from "../consent";

const state = vi.hoisted(() => ({
  scope: "openid ledger.read",
  ledgers: [{ id: "1", fullName: "ada/personal", name: "Personal" }],
}));
vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({ data: { listLedgers: state.ledgers }, loading: false }),
  useApolloClient: () => ({}),
}));
vi.mock("@tanstack/react-router", () => ({
  getRouteApi: () => ({
    useSearch: () => ({ uid: "interaction-1", scope: state.scope }),
    useLoaderData: () => ({ initialStep: "ledger" }),
  }),
  Link: ({
    children,
    to,
    search,
  }: {
    children: React.ReactNode;
    to: string;
    search: Record<string, string>;
  }) => <a href={`${to}?${new URLSearchParams(search)}`}>{children}</a>,
}));

function approvalForm() {
  return screen
    .getByRole("button", { name: "Approve access" })
    .closest("form")!;
}

describe("MCP consent", () => {
  beforeEach(() => {
    state.scope = "openid ledger.read";
    state.ledgers = [{ id: "1", fullName: "ada/personal", name: "Personal" }];
  });

  it("requires a choice and submits exactly the selected restriction", () => {
    render(<OAuthConsentPage />);
    const approve = screen.getByRole("button", { name: "Approve access" });
    expect(approve).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /Personal/ }));
    expect(approve).toBeEnabled();
    expect(Object.fromEntries(new FormData(approvalForm()))).toEqual({
      ledgerId: "ada/personal",
      scope: "openid ledger.read",
    });
    fireEvent.click(
      screen.getByRole("radio", { name: /All accessible ledgers/ }),
    );
    expect(Object.fromEntries(new FormData(approvalForm()))).toEqual({
      accountWide: "true",
      scope: "openid ledger.read",
    });
    fireEvent.click(screen.getByRole("radio", { name: /Personal/ }));
    expect(new FormData(approvalForm()).has("accountWide")).toBe(false);
    expect(approvalForm().getAttribute("action")).toBe(
      "/oauth/consent?uid=interaction-1",
    );
  });

  it("allows explicit account-wide consent before a ledger exists", () => {
    state.ledgers = [];
    render(<OAuthConsentPage />);
    const createLink = screen.getByRole("link", { name: "Create Ledger" });
    expect(createLink.getAttribute("href")).toBe(
      "/auth/welcome?oauthUid=interaction-1&oauthScope=openid+ledger.read",
    );
    expect(
      screen.getByRole("button", { name: "Approve access" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("radio", { name: /All accessible ledgers/ }),
    );
    expect(
      screen.getByRole("button", { name: "Approve access" }),
    ).toBeEnabled();
    expect(new FormData(approvalForm()).get("accountWide")).toBe("true");
  });

  it("keeps cancellation separate from the selected authority", () => {
    render(<OAuthConsentPage />);
    const cancel = screen.getByRole("button", {
      name: "Cancel",
    }) as HTMLButtonElement;
    expect(cancel.name).toBe("decision");
    expect(cancel.value).toBe("cancel");
    expect(cancel.form).not.toBe(approvalForm());
    expect(cancel.form?.getAttribute("action")).toBe(
      "/oauth/consent?uid=interaction-1",
    );
  });

  it("preserves old ledger-only links without offering undisclosed broader scopes", () => {
    state.scope = "";
    render(<OAuthConsentPage />);
    expect(
      screen.queryByRole("radio", { name: /All accessible ledgers/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Personal/ }));
    expect(Object.fromEntries(new FormData(approvalForm()))).toEqual({
      ledgerId: "ada/personal",
    });
  });
});
