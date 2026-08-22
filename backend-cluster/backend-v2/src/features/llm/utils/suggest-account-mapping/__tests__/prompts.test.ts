import { buildAccountMappingPrompt } from "../prompts";
import { type BankAccountToMap } from "../../../types";

const accounts: BankAccountToMap[] = [
  {
    accountId: "pacc_1",
    accountName: "USD account",
    accountType: "depository",
    accountSubtype: "checking",
  },
];

describe("buildAccountMappingPrompt", () => {
  it("defaults to requiring an existing account when autoAccounts is omitted", () => {
    const prompt = buildAccountMappingPrompt({
      institutionName: "Test Bank",
      accounts,
      existingAccounts: ["Assets:Checking"],
    });

    expect(prompt).toContain(
      "MUST ONLY suggest an account from the existing accounts list",
    );
    expect(prompt).not.toContain(
      "suggest a NEW account following Beancount conventions",
    );
  });

  it("forbids suggesting a new account when autoAccounts is false", () => {
    const prompt = buildAccountMappingPrompt({
      institutionName: "Test Bank",
      accounts,
      existingAccounts: ["Assets:Checking"],
      autoAccounts: false,
    });

    expect(prompt).toContain(
      "MUST ONLY suggest an account from the existing accounts list",
    );
    expect(prompt).toContain(
      "every bank account must receive a suggestion from the existing accounts list",
    );
    expect(prompt).not.toContain(
      "suggest a NEW account following Beancount conventions",
    );
  });

  it("allows suggesting a new account when autoAccounts is true", () => {
    const prompt = buildAccountMappingPrompt({
      institutionName: "Test Bank",
      accounts,
      existingAccounts: ["Assets:Checking"],
      autoAccounts: true,
    });

    expect(prompt).toContain(
      "suggest a NEW account following Beancount conventions",
    );
    expect(prompt).toContain("Assets:Test Bank:{name-or-currency}");
    expect(prompt).not.toContain(
      "MUST ONLY suggest an account from the existing accounts list",
    );
  });
});
