import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OAuthConsentPage from "../consent";

const state = vi.hoisted(() => ({
  scope: "openid ledger.read",
  ledgers: [{ id: "1", fullName: "ada/personal", name: "Personal" }],
  requester: null as Record<string, unknown> | null,
}));

const CURSOR = {
  redirect: "cursor://anysphere.cursor-mcp",
  clientName: "Cursor",
  vouchedBy: null,
  loopbackOnly: false,
};
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

/** The requester summary has loaded; approval depends on it. */
function whoIsAsking() {
  return screen.findByRole("region", { name: "Who is asking" });
}

function approvalForm() {
  return screen
    .getByRole("button", { name: "Approve access" })
    .closest("form")!;
}

describe("MCP consent", () => {
  beforeEach(() => {
    state.scope = "openid ledger.read";
    state.ledgers = [{ id: "1", fullName: "ada/personal", name: "Personal" }];
    state.requester = CURSOR;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toBe("/oauth/consent/requester?uid=interaction-1");
        return state.requester
          ? Response.json(state.requester)
          : Response.json(null, { status: 404 });
      }),
    );
  });

  it("requires a choice and submits exactly the selected restriction", async () => {
    render(<OAuthConsentPage />);
    await whoIsAsking();
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

  it("allows explicit account-wide consent before a ledger exists", async () => {
    state.ledgers = [];
    render(<OAuthConsentPage />);
    await whoIsAsking();
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

  it("keeps cancellation separate from the selected authority", async () => {
    render(<OAuthConsentPage />);
    await whoIsAsking();
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

  it("preserves old ledger-only links without offering undisclosed broader scopes", async () => {
    state.scope = "";
    render(<OAuthConsentPage />);
    await whoIsAsking();
    expect(
      screen.queryByRole("radio", { name: /All accessible ledgers/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Personal/ }));
    expect(Object.fromEntries(new FormData(approvalForm()))).toEqual({
      ledgerId: "ada/personal",
    });
  });
});

describe("MCP consent names who is asking (ADR 019 D4)", () => {
  beforeEach(() => {
    state.scope = "openid ledger.read";
    state.ledgers = [{ id: "1", fullName: "ada/personal", name: "Personal" }];
  });

  function serve(requester: Record<string, unknown> | null) {
    state.requester = requester;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        requester
          ? Response.json(requester)
          : Response.json(null, { status: 404 }),
      ),
    );
  }

  it("shows where the code goes and labels the name as the app's own", async () => {
    serve(CURSOR);
    render(<OAuthConsentPage />);
    const region = await whoIsAsking();
    expect(region).toHaveTextContent(
      "you return to cursor://anysphere.cursor-mcp",
    );
    expect(region).toHaveTextContent("It calls itself “Cursor”");
    expect(region).not.toHaveTextContent("published by");
  });

  it("names the vouching domain of a metadata-document client", async () => {
    serve({
      ...CURSOR,
      redirect: "claude.ai",
      clientName: "Claude",
      vouchedBy: "claude.ai",
    });
    render(<OAuthConsentPage />);
    expect(await whoIsAsking()).toHaveTextContent("published by claude.ai");
  });

  it("says when the app gave no name", async () => {
    serve({ ...CURSOR, clientName: null });
    render(<OAuthConsentPage />);
    expect(await whoIsAsking()).toHaveTextContent("did not give a name");
  });

  it("warns when every redirect is this computer", async () => {
    serve({ ...CURSOR, redirect: "127.0.0.1:61000", loopbackOnly: true });
    render(<OAuthConsentPage />);
    expect(await whoIsAsking()).toHaveTextContent(
      "only returns to your own computer",
    );
  });

  it("keeps approval disabled when the requester cannot be identified", async () => {
    serve(null);
    render(<OAuthConsentPage />);
    expect(
      await screen.findByText(/could not be identified/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Personal/ }));
    expect(
      screen.getByRole("button", { name: "Approve access" }),
    ).toBeDisabled();
  });
});
