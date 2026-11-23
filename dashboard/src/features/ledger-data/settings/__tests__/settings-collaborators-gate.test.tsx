import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  ListLedgerCollaboratorsDocument,
  type GetLedgerQuery,
} from "@/graphql/definitions";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { LedgerSettingsContent } from "../index";

const fixture = vi.hoisted(() => ({
  isAdmin: false,
  withCollaborator: false,
  listCollaboratorsQuery: vi.fn(),
}));

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ledgerOwner: "alice", ledgerName: "books" }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock("@/common/hooks/use-is-authenticated", () => ({
  useIsAuthenticated: () => true,
}));
vi.mock("@/common/hooks/use-auth-status", () => ({
  useAuthStatus: () => "signed-in",
}));
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ isAdmin: fixture.isAdmin }),
}));
vi.mock("@/common/hooks/use-user-limits", () => ({
  useUserLimits: () => ({ limits: null, tier: "GROWTH" }),
}));
vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({}),
  useMutation: () => [vi.fn(), { loading: false }],
  useQuery: (
    document: unknown,
    options?: { variables: { ledgerId: string } },
  ) => {
    if (document !== ListLedgerCollaboratorsDocument) return {};
    fixture.listCollaboratorsQuery(options?.variables.ledgerId);
    return {
      data: {
        listLedgerCollaborators: fixture.withCollaborator
          ? [
              {
                id: 1,
                login: "reader",
                fullName: "Ledger Reader",
                permission: "read",
              },
            ]
          : [],
      },
    };
  },
}));

async function mountSettings({
  isAdmin,
  withCollaborator = false,
}: {
  isAdmin: boolean;
  withCollaborator?: boolean;
}) {
  fixture.isAdmin = isAdmin;
  fixture.withCollaborator = withCollaborator;
  fixture.listCollaboratorsQuery.mockClear();
  const ledger = {
    id: "alice/books",
    name: "books",
    fullName: "alice/books",
    private: isAdmin,
    options: { title: "Books", operatingCurrency: ["USD"] },
    favaOptions: { fiscalYearEnd: { month: 12, day: 31 } },
  } as NonNullable<GetLedgerQuery["getLedger"]>;
  const localization = createLocalization();
  await localization.changeLanguage("en");
  render(
    <LocalizationProvider localization={localization}>
      <LedgerSettingsContent ledger={ledger} ledgerId={ledger.id} />
    </LocalizationProvider>,
  );
}

function headingOutline() {
  return screen
    .getAllByRole("heading")
    .map(
      (heading) => `${heading.tagName.toLowerCase()} ${heading.textContent}`,
    );
}

describe("Ledger Settings headings and collaborator permissions (w5/1156)", () => {
  it("exposes the admin sections and the selected options tab as headings", async () => {
    const user = userEvent.setup();
    await mountSettings({ isAdmin: true });
    const adminOutline = [
      "h1 Ledger Settings",
      "h2 General Settings",
      "h2 Visibility",
      "h2 Collaborators",
      "h3 No Collaborators",
      "h2 Danger Zone",
    ];
    expect(headingOutline()).toEqual([
      ...adminOutline,
      "h2 Beancount Options",
      "h2 Related Pages",
    ]);
    expect(
      screen.getByRole("table", { name: "Beancount Options" }),
    ).toBeInTheDocument();
    expect(fixture.listCollaboratorsQuery).toHaveBeenCalledWith("alice/books");

    await user.click(screen.getByRole("tab", { name: "Fava Options" }));
    expect(headingOutline()).toEqual([
      ...adminOutline,
      "h2 Fava Options",
      "h2 Related Pages",
    ]);
    expect(
      screen.getByRole("table", { name: "Fava Options" }),
    ).toBeInTheDocument();
  });

  it("exposes only the read-only sections to a signed-in public reader", async () => {
    await mountSettings({ isAdmin: false });
    expect(headingOutline()).toEqual([
      "h1 Ledger Settings",
      "h2 General Settings",
      "h2 Visibility",
      "h3 Public Sharing",
      "h2 Beancount Options",
      "h2 Related Pages",
    ]);
    expect(fixture.listCollaboratorsQuery).not.toHaveBeenCalled();
  });

  it("uses the Collaborators heading as the member table's accessible name", async () => {
    await mountSettings({ isAdmin: true, withCollaborator: true });
    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Collaborators",
    });
    expect(
      screen.getByRole("table", { name: "Collaborators" }),
    ).toHaveAttribute("aria-labelledby", heading.id);
  });
});
