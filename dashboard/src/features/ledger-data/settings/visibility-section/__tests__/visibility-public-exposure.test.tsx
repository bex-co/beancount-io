import type { ReactNode } from "react";
import { render as renderComponent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { VisibilitySection } from "../index";

/**
 * "History" did not tell an owner that a public ledger shows every earlier
 * version of each file and each commit's author name and email, which the API
 * preview says since w23/241 (w2/131). The real catalogs render here.
 */
vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");
vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => (err: unknown) => String(err),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@apollo/client/react", () => ({
  useMutation: () => [vi.fn(), { loading: false }],
}));
vi.mock("@/common/components/ledger-permission/admin", () => ({
  LedgerAdminPermission: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ isAdmin: true, canWrite: true, canRead: true }),
}));

const catalogs = import.meta.glob<{
  default: Record<string, { message: string }>;
}>("../locales/*.ts", { eager: true });

function render(element: ReactElement) {
  return renderComponent(element, {
    wrapper: ({ children }) => (
      <LocalizationProvider localization={createLocalization()}>
        {children}
      </LocalizationProvider>
    ),
  });
}

const ledger = (isPrivate: boolean) =>
  ({
    id: "ledger-1",
    name: "books",
    fullName: "alice/books",
    private: isPrivate,
  }) as never;

/** How each catalog names an email address. */
const EMAIL: Record<string, RegExp> = {
  bg: /имейл/,
  ca: /correu electrònic/,
  de: /E-Mail/,
  en: /email/,
  es: /correo electrónico/,
  fa: /ایمیل/,
  fr: /e-mail/,
  ja: /メールアドレス/,
  ko: /이메일/,
  nl: /e-mailadres/,
  pt: /e-mail/,
  ru: /электронной почты/,
  sk: /e-mailovej/,
  uk: /електронної пошти/,
  zh: /邮箱/,
};

describe("making a ledger public names what its history exposes", () => {
  it("says, before publishing, that earlier versions and commit authors go public", async () => {
    render(<VisibilitySection ledger={ledger(true)} ledgerId="alice/books" />);
    await userEvent.click(screen.getByRole("switch"));

    expect(
      await screen.findByText(
        "Anyone with the link, and search engines, will be able to see this ledger's transactions, balances, files and full commit history — including every earlier version of each file, and each commit's author name and email.",
      ),
    ).toBeInTheDocument();
  });

  it("says it again under a public ledger", () => {
    render(<VisibilitySection ledger={ledger(false)} ledgerId="alice/books" />);

    expect(
      screen.getByText(
        "Your ledger is public. Anyone with the link can view it, including its full commit history: every earlier version of each file, and each commit's author name and email.",
      ),
    ).toBeInTheDocument();
  });

  it.each(Object.keys(EMAIL))("names commit authors' email in %s", (lang) => {
    const catalog = catalogs[`../locales/${lang}.ts`]!.default;
    for (const key of [
      "page.settings.makePublicDescription",
      "page.settings.publicLedgerDescription",
    ]) {
      expect(catalog[key]!.message).toMatch(EMAIL[lang]!);
    }
  });
});
