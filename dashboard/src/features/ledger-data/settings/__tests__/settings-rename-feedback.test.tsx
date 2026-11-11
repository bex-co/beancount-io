import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { GeneralSettingsSection } from "../general-settings-section";

const { updateLedger } = vi.hoisted(() => ({ updateLedger: vi.fn() }));

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ isAdmin: true, canWrite: true, canRead: true }),
}));

vi.mock("@/common/components/ledger-permission/admin", () => ({
  LedgerAdminPermission: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key} ${Object.values(params).join(" ")}` : key,
    i18n: { language: "en" },
  }),
}));

vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => () => "generic",
}));

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("@apollo/client/react", () => ({
  useMutation: () => [updateLedger, { loading: false }],
  // The owner's other ledgers; another owner's "budget" must not count.
  useQuery: () => ({
    data: {
      listLedgers: [
        { name: "example", fullName: "alice/example" },
        { name: "my-book2", fullName: "alice/my-book2" },
        { name: "budget", fullName: "bob/budget" },
      ],
    },
  }),
}));

const ledger = {
  id: "alice/example",
  name: "example",
  fullName: "alice/example",
  description: "",
  private: true,
} as never;

const renderSettings = () =>
  render(<GeneralSettingsSection ledger={ledger} ledgerId="alice/example" />);
const nameField = () => screen.getByLabelText("page.dashboard.ledgerName");
const save = () => screen.getByRole("button", { name: /common\.save/ });

async function rename(value: string) {
  const user = userEvent.setup();
  await user.clear(nameField());
  await user.type(nameField(), value);
  return user;
}

describe("Ledger Settings rename feedback (w3/566)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateLedger.mockResolvedValue({
      data: { updateLedger: { id: "alice/my-books", name: "my-books" } },
    });
  });

  it("previews the slug a name becomes", async () => {
    renderSettings();
    await rename("ünï");

    expect(screen.getByText("n", { selector: "code" })).toBeInTheDocument();
    expect(save()).toBeEnabled();
  });

  it("refuses a name with no usable characters", async () => {
    renderSettings();
    await rename("üü");

    expect(screen.getByText("page.dashboard.nameInvalid")).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it("refuses a name longer than the service allows", async () => {
    renderSettings();
    await rename("a".repeat(120));

    expect(
      screen.getByText("page.dashboard.nameMaxLength"),
    ).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it("refuses the name of another ledger the owner has", async () => {
    renderSettings();
    await rename("My-Book2");

    expect(
      screen.getByText("page.settings.ledgerNameTaken my-book2"),
    ).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it("does not count another owner's ledger, or the same name restyled", async () => {
    renderSettings();
    await rename("budget");
    expect(save()).toBeEnabled();

    await rename("EXAMPLE");
    // Slugs to the current name: nothing to rename.
    expect(save()).toBeDisabled();
  });

  it("saves the slug, not the typed text", async () => {
    renderSettings();
    const user = await rename("My Books");
    expect(
      screen.getByText("my-books", { selector: "code" }),
    ).toBeInTheDocument();

    await user.click(save());

    await waitFor(() => expect(updateLedger).toHaveBeenCalledTimes(1));
    expect(updateLedger.mock.calls[0]![0].variables).toEqual({
      ledgerId: "alice/example",
      name: "my-books",
    });
  });

  it("names the server's duplicate-name refusal instead of a generic error", async () => {
    updateLedger.mockRejectedValue(
      new CombinedGraphQLErrors({
        errors: [
          {
            message:
              "A ledger with the name 'my-books' already exists. Please choose a different name.",
            extensions: { code: "BAD_USER_INPUT" },
          },
        ],
      }),
    );
    renderSettings();
    const user = await rename("My Books");

    await user.click(save());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "page.settings.ledgerNameTaken my-books",
      ),
    );
  });

  // The service judges the slug, so does the form (w2/130).
  it.each(["___", "-_-"])(
    "refuses %s, whose slug has no letter or digit",
    async (name) => {
      renderSettings();
      await rename(name);

      expect(
        screen.getByText("page.dashboard.nameInvalid"),
      ).toBeInTheDocument();
      expect(save()).toBeDisabled();
    },
  );

  it("renames to a 100-character slug typed with trailing punctuation", async () => {
    renderSettings();
    const user = await rename(`${"a".repeat(100)}!!`);

    expect(screen.queryByText("page.dashboard.nameMaxLength")).toBeNull();
    await user.click(save());
    await waitFor(() => expect(updateLedger).toHaveBeenCalledTimes(1));
    expect(updateLedger.mock.calls[0]![0].variables.name).toBe("a".repeat(100));
  });

  it("caps the description at the service's 2048 characters, with a count near it", () => {
    renderSettings();
    const description = screen.getByLabelText("page.settings.description");
    expect(description).toHaveAttribute("maxLength", "2048");

    fireEvent.change(description, { target: { value: "d".repeat(1800) } });
    expect(screen.queryByText(/ \/ 2,048$/)).toBeNull();

    fireEvent.change(description, { target: { value: "d".repeat(2040) } });
    expect(screen.getByText("2,040 / 2,048")).toBeInTheDocument();
    expect(save()).toBeEnabled();

    // A paste maxLength does not stop, such as a prefilled value.
    fireEvent.change(description, { target: { value: "d".repeat(2049) } });
    expect(
      screen.getByText("page.dashboard.descriptionMaxLength"),
    ).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });
});
