import { describe, expect, it } from "vitest";
import frAccounts from "@/features/ledger-data/accounts/locales/fr";
import caAccounts from "@/features/ledger-data/accounts/locales/ca";
import ukAccounts from "@/features/ledger-data/accounts/locales/uk";
import enAccounts from "@/features/ledger-data/accounts/locales/en";

describe("open account validation locales", () => {
  it("localizes required and prefix messages in fr, ca, and uk", () => {
    expect(frAccounts["page.accounts.accountMustStartWith"].message).not.toBe(
      enAccounts["page.accounts.accountMustStartWith"].message,
    );
    expect(frAccounts["page.accounts.accountMustStartWith"].message).toContain(
      "{prefixes}",
    );
    expect(caAccounts["page.accounts.accountMustStartWith"].message).not.toBe(
      enAccounts["page.accounts.accountMustStartWith"].message,
    );
    expect(caAccounts["page.accounts.accountMustStartWith"].message).toContain(
      "{prefixes}",
    );
    expect(ukAccounts["page.accounts.accountNameRequired"].message).not.toBe(
      enAccounts["page.accounts.accountNameRequired"].message,
    );
  });
});
