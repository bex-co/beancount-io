import { lexesAsAccount } from "@/features/ledger/utils/account-matcher";
import { assertSafeRepoPath } from "@/features/ledger/utils/safe-repo-path";
import { BadUserInputError } from "@/shared/errors";
import { assertBankIds } from "./assert-bank-id";

interface BankTransactionSubmissionInput {
  transactionId: string;
  targetAccount: string;
  sourceAccount?: string;
}

const TARGET_ACCOUNT_HINT =
  'Pass a colon-separated Beancount account name such as "Expenses:Food:Groceries".';
const SOURCE_ACCOUNT_HINT =
  'Pass a colon-separated Beancount account name such as "Assets:Bank:Checking".';
const LEDGER_ACCOUNT_HINT =
  'Pass a colon-separated Beancount account name such as "Assets:Bank:Checking" or "Liabilities:CreditCard:Visa".';
const TARGET_FILENAME_HINT =
  'Pass an existing relative ledger file path for filename such as "bank/2026.bean", or omit filename to write to main.bean.';

function assertBankAccountName(
  account: string,
  field: "ledgerAccount" | "targetAccount" | "sourceAccount",
  hint: string,
): void {
  if (!lexesAsAccount(account)) {
    throw new BadUserInputError(
      `${field} ${JSON.stringify(account)} is not a valid Beancount account name`,
      field,
      hint,
    );
  }
}

export function assertBankLedgerAccount(ledgerAccount: string): void {
  assertBankAccountName(ledgerAccount, "ledgerAccount", LEDGER_ACCOUNT_HINT);
}

function assertBankTargetFilename(filename: string): void {
  if (filename.trim() === "") {
    throw new BadUserInputError(
      "File path must not be empty",
      "filename",
      TARGET_FILENAME_HINT,
    );
  }
  try {
    assertSafeRepoPath(filename, "filename");
  } catch (error) {
    if (error instanceof BadUserInputError) {
      throw new BadUserInputError(
        error.message,
        "filename",
        TARGET_FILENAME_HINT,
      );
    }
    throw error;
  }
}

/**
 * Validate a bank-transaction submission payload before authorization, Fava
 * ledger lookup, or Postgres reads (w31/052).
 */
export function assertValidBankTransactionSubmission(
  transactionInputs: readonly BankTransactionSubmissionInput[],
  filename?: string,
): void {
  if (transactionInputs.length === 0) {
    throw new BadUserInputError("No transactions provided");
  }
  assertBankIds(
    transactionInputs.map((input) => input.transactionId),
    "transactionIds",
  );
  for (const input of transactionInputs) {
    assertBankAccountName(
      input.targetAccount,
      "targetAccount",
      TARGET_ACCOUNT_HINT,
    );
    if (input.sourceAccount !== undefined) {
      assertBankAccountName(
        input.sourceAccount,
        "sourceAccount",
        SOURCE_ACCOUNT_HINT,
      );
    }
  }
  if (filename !== undefined) {
    assertBankTargetFilename(filename);
  }
}
