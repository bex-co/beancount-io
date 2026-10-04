import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GeneralSettingsSection } from "../general-settings-section";
import { VisibilitySection } from "../visibility-section";

const permission = vi.hoisted(() => ({ isAdmin: false }));

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({
    isAdmin: permission.isAdmin,
    canWrite: permission.isAdmin,
    canRead: true,
  }),
}));

vi.mock("@/common/components/ledger-permission/admin", () => ({
  LedgerAdminPermission: ({ children }: { children: ReactNode }) =>
    permission.isAdmin ? <>{children}</> : null,
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => (err: unknown) => String(err),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@apollo/client/react", () => ({
  useMutation: () => [vi.fn(), { loading: false }],
}));

const ledger = {
  id: "ledger-1",
  name: "example",
  fullName: "open_ledger/example",
  description: "Sample books",
  private: false,
} as never;

describe("ledger settings for viewers without admin rights", () => {
  beforeEach(() => {
    permission.isAdmin = false;
  });

  it("shows read-only name and description with viewer copy and no save", async () => {
    const user = userEvent.setup();
    render(<GeneralSettingsSection ledger={ledger} ledgerId="ledger-1" />);

    const name = screen.getByLabelText("page.dashboard.ledgerName");
    const description = screen.getByLabelText("page.settings.description");
    expect(name).toHaveAttribute("readonly");
    expect(description).toHaveAttribute("readonly");
    await user.type(name, "renamed");
    expect(name).toHaveValue("example");
    expect(
      screen.getByText("page.settings.generalSettingsDescriptionReadOnly"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("page.settings.generalSettingsDescription"),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /common.save/ })).toBeNull();
  });

  it("describes visibility to the viewer rather than as their own ledger", () => {
    render(<VisibilitySection ledger={ledger} ledgerId="ledger-1" />);

    expect(
      screen.getByText("page.settings.visibilityDescriptionReadOnly"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("page.settings.publicLedgerDescriptionReadOnly"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("page.settings.visibilityDescription"),
    ).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
  });
});

describe("ledger settings for admins", () => {
  beforeEach(() => {
    permission.isAdmin = true;
  });

  it("keeps editable fields, owner copy and the save flow", async () => {
    const user = userEvent.setup();
    render(<GeneralSettingsSection ledger={ledger} ledgerId="ledger-1" />);

    const name = screen.getByLabelText("page.dashboard.ledgerName");
    expect(name).not.toHaveAttribute("readonly");
    await user.type(name, "-2");
    expect(name).toHaveValue("example-2");
    expect(
      screen.getByText("page.settings.generalSettingsDescription"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /common.save/ })).toBeEnabled();
  });

  it("keeps the admin visibility copy and switch", () => {
    render(<VisibilitySection ledger={ledger} ledgerId="ledger-1" />);

    expect(
      screen.getByText("page.settings.visibilityDescription"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("page.settings.publicLedgerDescription"),
    ).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });
});
