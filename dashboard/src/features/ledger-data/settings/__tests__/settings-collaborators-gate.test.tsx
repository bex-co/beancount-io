import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LedgerSettingsContent } from "../index";

const permissionState = vi.hoisted(() => ({ isAdmin: false }));

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({
    ledgerOwner: "open_ledger",
    ledgerName: "example",
  }),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("@/common/components/authenticated", () => ({
  Authenticated: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/common/components/ledger-permission/admin", () => ({
  LedgerAdminPermission: ({ children }: { children: ReactNode }) =>
    permissionState.isAdmin ? <>{children}</> : null,
}));

vi.mock("@/common/components/seo/ledger-page-seo", () => ({
  LedgerPageSEO: () => null,
}));

vi.mock("@/common/components/page-header", () => ({
  PageHeader: () => <div>page-header</div>,
}));

vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));

vi.mock("../general-settings-section", () => ({
  GeneralSettingsSection: () => <div>general-settings</div>,
}));

vi.mock("../visibility-section", () => ({
  VisibilitySection: () => <div>visibility-section</div>,
}));

vi.mock("../beancount-options-section", () => ({
  BeancountOptionsSection: () => <div>beancount-options</div>,
}));

vi.mock("../fava-options-section", () => ({
  FavaOptionsSection: () => <div>fava-options</div>,
}));

vi.mock("../danger-zone-section", () => ({
  DangerZoneSection: () => <div>danger-zone</div>,
}));

const listCollaboratorsQuery = vi.fn();

vi.mock("../collaborators-section", () => ({
  CollaboratorsSection: ({ ledgerId }: { ledgerId: string }) => {
    listCollaboratorsQuery(ledgerId);
    return <div>collaborators-section</div>;
  },
}));

const publicLedger = {
  id: "ledger-1",
  name: "example",
  fullName: "open_ledger/example",
  private: false,
} as const;

describe("LedgerSettingsContent collaborator gating", () => {
  it("does not mount CollaboratorsSection for a non-admin public reader", () => {
    permissionState.isAdmin = false;
    listCollaboratorsQuery.mockClear();

    render(
      <LedgerSettingsContent
        ledger={publicLedger as never}
        ledgerId="open_ledger/example"
      />,
    );

    expect(screen.queryByText("collaborators-section")).not.toBeInTheDocument();
    expect(listCollaboratorsQuery).not.toHaveBeenCalled();
    expect(screen.getByText("visibility-section")).toBeInTheDocument();
    expect(screen.getByText("beancount-options")).toBeInTheDocument();
  });

  it("mounts CollaboratorsSection for an eligible admin", () => {
    permissionState.isAdmin = true;
    listCollaboratorsQuery.mockClear();

    render(
      <LedgerSettingsContent
        ledger={publicLedger as never}
        ledgerId="open_ledger/example"
      />,
    );

    expect(screen.getByText("collaborators-section")).toBeInTheDocument();
    expect(listCollaboratorsQuery).toHaveBeenCalledWith("open_ledger/example");
    expect(screen.getByText("danger-zone")).toBeInTheDocument();
  });
});
