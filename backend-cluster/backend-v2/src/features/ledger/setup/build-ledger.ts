import { ValidationError } from "@/shared/errors";
import {
  isSupportedCurrency,
  moduleById,
  presetById,
  setupCatalog,
  type CapabilityState,
  type ModuleId,
  type OpeningState,
  type PresetId,
} from "./index";

interface SetupAccountSelection {
  name: string;
  currency?: string;
  openingState?: OpeningState;
  /** Decimal string, required when `openingState` is "known". */
  amount?: string;
}

interface SetupModuleSelection {
  id: ModuleId;
  /** `rental-property@1` only: the property's account component. */
  propertyName?: string;
}

export interface LedgerSetup {
  preset: PresetId;
  /** Personal-only account groups (ADR026 personal modules). */
  modules?: SetupModuleSelection[];
  title?: string;
  operatingCurrency?: string;
  historyStart?: string;
  capabilities?: Record<string, CapabilityState>;
  accounts?: SetupAccountSelection[];
}

/** Longest ledger title a setup may carry, on every surface (w21/203). */
export const SETUP_TITLE_MAX = 200;
/** Bounds of a ledger-creation `requestId`, on every surface (w21/203). */
export const CREATE_REQUEST_ID_MAX = 200;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const AMOUNT_PATTERN = /^[+-]?\d+(\.\d+)?$/;
const OPENING_EQUITY = "Equity:OpeningBalances";
/**
 * An account a new ledger can open: one of Beancount's five default roots,
 * then components that start with an uppercase letter, a digit, or a
 * non-ASCII letter. Interpolated unchecked, a `blank@1` name carrying a
 * newline wrote whole directives into `main.bean` (w23/049).
 */
const ACCOUNT_PATTERN =
  /^(?:Assets|Liabilities|Equity|Income|Expenses)(?::[\p{Lu}\p{N}\P{ASCII}][\p{L}\p{N}\P{ASCII}-]*)+$/u;
const NOT_IN_A_NAME = /[\s\p{C}]/u;

const fail = (message: string): never => {
  throw new ValidationError("setup", message);
};

const dayBefore = (date: string): string => {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return parsed.toISOString().slice(0, 10);
};

export interface LedgerSetupPreview {
  preset: string;
  operatingCurrency: string;
  historyStart: string;
  accounts: string[];
  files: Record<string, string>;
}

/** bean-check's verdict on the files a setup would create (ADR026, w23/048). */
export interface LedgerSetupValidation {
  ok: boolean;
  errors: { message: string; source?: string }[];
}

export function buildLedgerFiles(
  setup: LedgerSetup,
  today: string = new Date().toISOString().slice(0, 10),
): Record<string, string> {
  return previewLedgerSetup(setup, today).files;
}

/**
 * A real `YYYY-MM-DD` day. `Date.parse` rolls `2026-04-31` over to 1 May, so
 * an impossible date passed and was written into the ledger's `open` lines
 * (w21/107); round-tripping the parts through UTC catches it.
 */
function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  // `Date.UTC` maps years 0-99 to 1900-1999, which refused every valid
  // 0001-0099 date (w21/548); setUTCFullYear keeps the year. Year 0000 is not a
  // Beancount date and stays refused.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    year >= 1 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * The ledger's sign for an opening amount. An explicit sign, `-` or `+`, is the
 * ledger's own and is written as given (`+50` on a card is 50 in credit). An
 * unsigned positive on a liability keeps the legacy reading: a customer states
 * what a credit card or loan is owed as a positive number, and ADR026 stores
 * what they owe as the negative posting; written verbatim, a 500 card balance
 * raised net worth by 500 (w21/104), and saved app builds and agents still send
 * it unsigned. Every other account keeps its amount (w21/549).
 */
function ledgerOpeningAmount(account: string, amount: string): string {
  if (amount.startsWith("+")) return amount.slice(1);
  const owed =
    account.startsWith("Liabilities:") &&
    !amount.startsWith("-") &&
    /[1-9]/.test(amount);
  return owed ? `-${amount}` : amount;
}

/**
 * The setup with every explicit `null` taken as an omitted field. GraphQL marks
 * `title`, `currency`, `amount` and other fields nullable and passes a client's
 * `null` through unchanged, where REST and MCP (`.optional()`) never carry one:
 * `title: null` was a TypeError, and `amount: null` or `currency: null` was
 * refused as a value (w21/552).
 */
function omitNulls<T>(value: T): T {
  if (Array.isArray(value)) return value.map(omitNulls) as T;
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, field]) => field !== null)
        .map(([key, field]) => [key, omitNulls(field)]),
    ) as T;
  }
  return value;
}

/**
 * The accounts the selected modules open, each with its booking method. A
 * module is accepted only with a preset it lists, once, and a parameter only
 * on the module that declares it (ADR026); every refusal creates nothing.
 */
function moduleAccounts(
  presetId: string,
  modules: SetupModuleSelection[],
): Map<string, string | undefined> {
  const accounts = new Map<string, string | undefined>();
  const seen = new Set<string>();
  for (const selection of modules) {
    const module =
      moduleById(selection.id) ?? fail(`Unknown module "${selection.id}"`);
    if (!module.allowedPresets.includes(presetId)) {
      fail(
        `Module "${module.id}" is accepted only with preset ${module.allowedPresets.map((id) => `"${id}"`).join(", ")}, not "${presetId}"`,
      );
    }
    if (seen.has(module.id)) {
      fail(`Module "${module.id}" is selected more than once`);
    }
    seen.add(module.id);
    const property = module.parameters.find(
      (parameter) => parameter.id === "propertyName",
    );
    if (selection.propertyName !== undefined && !property) {
      fail(`Module "${module.id}" takes no propertyName`);
    }
    let nameOf = (account: string) => account;
    if (property) {
      const name = selection.propertyName ?? property.default;
      if (!new RegExp(property.pattern).test(name)) {
        fail(
          `Property name ${JSON.stringify(name)} for "${module.id}" is not valid: ${property.description}`,
        );
      }
      nameOf = (account) => account.replaceAll(property.placeholder, name);
    }
    for (const account of module.accounts) {
      accounts.set(nameOf(account.name), account.booking);
    }
  }
  return accounts;
}

/**
 * Pure builder: turns a setup specification (ADR026) into the files it
 * would create plus their summary, without creating anything. Throws
 * `ValidationError` for any invalid explicit value.
 */
export function previewLedgerSetup(
  input: LedgerSetup,
  today: string = new Date().toISOString().slice(0, 10),
): LedgerSetupPreview {
  const setup = omitNulls(input);
  const preset =
    presetById(setup.preset) ?? fail(`Unknown preset "${setup.preset}"`);

  if (setup.title !== undefined && setup.title.length > SETUP_TITLE_MAX) {
    fail(`Title must be at most ${SETUP_TITLE_MAX} characters`);
  }
  // A line break or other control character in a Beancount string is never
  // what a title meant (w23/049).
  if (setup.title !== undefined && /\p{Cc}/u.test(setup.title)) {
    fail("Title must not contain line breaks or other control characters");
  }

  const operatingCurrency = setup.operatingCurrency ?? "USD";
  if (!isSupportedCurrency(operatingCurrency)) {
    fail(`Unsupported operating currency "${operatingCurrency}"`);
  }

  const historyStart = setup.historyStart ?? today;
  if (!isCalendarDate(historyStart)) {
    fail(`Invalid history start "${historyStart}"`);
  }

  const capabilities = setup.capabilities ?? {};
  for (const [id, state] of Object.entries(capabilities)) {
    if (!setupCatalog.capabilityStates.includes(state)) {
      fail(`Invalid capability state "${state}" for "${id}"`);
    }
    if (!preset.optionalQuestions.some((question) => question.id === id)) {
      fail(`Preset "${preset.id}" has no capability "${id}"`);
    }
  }

  const enabledAccounts = new Set<string>();
  for (const question of preset.optionalQuestions) {
    if (capabilities[question.id] === "enabled") {
      for (const name of question.enablesAccounts) enabledAccounts.add(name);
    }
  }

  const modules = moduleAccounts(preset.id, setup.modules ?? []);
  const moduleNames = [...modules.keys()];
  const booking = new Map<string, string | undefined>([
    ...preset.accounts.map(
      (account) => [account.name, account.booking] as const,
    ),
    ...modules,
  ]);

  const allowed = new Set<string>([
    ...preset.accounts.map((account) => account.name),
    ...enabledAccounts,
    ...moduleNames,
  ]);
  const isBlank = preset.id === "blank@1";

  // Preset accounts are opened with no balance claim: only an account the
  // customer explicitly selected carries an opening state, so an opened
  // account never reads as a verified zero the customer did not confirm.
  const selected = new Map<string, SetupAccountSelection>();
  for (const account of preset.accounts) {
    selected.set(account.name, { name: account.name });
  }
  for (const name of [...enabledAccounts, ...moduleNames]) {
    if (!selected.has(name)) selected.set(name, { name });
  }
  // A repeat overwrote the earlier entry, so a known opening listed again as
  // zero dropped its balance without a word (w1/214).
  const listed = new Set<string>();
  for (const selection of setup.accounts ?? []) {
    if (
      typeof selection.name !== "string" ||
      NOT_IN_A_NAME.test(selection.name) ||
      !ACCOUNT_PATTERN.test(selection.name)
    ) {
      fail(
        `Account ${JSON.stringify(selection.name)} is not a Beancount account name: it starts with Assets, Liabilities, Equity, Income or Expenses, each further part starts with a capital letter or a digit, and it holds no spaces`,
      );
    }
    if (listed.has(selection.name)) {
      fail(`Account "${selection.name}" is listed more than once`);
    }
    listed.add(selection.name);
    if (!isBlank && !allowed.has(selection.name)) {
      fail(
        `Account "${selection.name}" is not part of preset "${preset.id}", an enabled capability, or a selected module`,
      );
    }
    const openingState = selection.openingState ?? "unknown";
    if (!setupCatalog.openingStates.includes(openingState)) {
      fail(`Invalid opening state "${openingState}" for "${selection.name}"`);
    }
    if (openingState === "known") {
      // It is the other side of every known opening, so a known balance of
      // its own had no transaction to post and failed its assertion (w23/048).
      if (selection.name === OPENING_EQUITY) {
        fail(
          `"${OPENING_EQUITY}" balances the other opening balances and cannot have a known opening of its own`,
        );
      }
      if (!selection.amount || !AMOUNT_PATTERN.test(selection.amount)) {
        fail(
          `Account "${selection.name}" needs a decimal amount for a known opening balance`,
        );
      }
    } else if (selection.amount !== undefined) {
      fail(
        `Account "${selection.name}" must not carry an amount unless its opening state is "known"`,
      );
    }
    if (
      selection.currency !== undefined &&
      selection.currency !== operatingCurrency
    ) {
      if (!isSupportedCurrency(selection.currency)) {
        fail(
          `Unsupported currency "${selection.currency}" for "${selection.name}"`,
        );
      }
    }
    selected.set(selection.name, { ...selection, openingState });
  }

  // A known opening posts the day before the history boundary and asserts
  // on the boundary, so the accounts must already be open then: when any
  // known opening exists, every account opens the day before the boundary.
  const hasKnownOpening = [...selected.values()].some(
    (account) => account.openingState === "known",
  );
  const openDate = hasKnownOpening ? dayBefore(historyStart) : historyStart;

  const openingStatusKey = setupCatalog.metadataKeys.openingBalanceStatus;
  const lines: string[] = [
    // Escaped, not stripped: quotes vanished from the title, and a trailing
    // backslash escaped the closing quote and broke the file (w23/049).
    `option "title" "${(setup.title ?? preset.title).replace(/[\\"]/g, "\\$&")}"`,
    `option "operating_currency" "${operatingCurrency}"`,
    `option "inferred_tolerance_default" "*:0.001"`,
    "",
  ];

  const openings: string[] = [];
  const assertions: string[] = [];
  const accounts = [...selected.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const opened = new Set<string>();
  // The counter account takes openings in every currency the accounts use, so
  // it carries no currency constraint once any opening posts to it; opened
  // with the first account's currency, a second currency's opening failed
  // (w23/048).
  // Nor does any other account take a constraint from the operating currency,
  // which "neither converts amounts nor prohibits other currencies" (ADR026):
  // Portfolio's holdings refused their own first share purchase, and a euro
  // lunch in a dollar ledger failed bean-check (w21/687). Only a currency the
  // account was set up with restricts it.
  // A catalog booking method (the investments module's FIFO brokerage) ends
  // the line, after any currency.
  const openLine = (name: string, constraint?: string) => {
    const method = booking.get(name);
    return [
      `${openDate} open ${name}`,
      name === OPENING_EQUITY && hasKnownOpening ? undefined : constraint,
      method && `"${method}"`,
    ]
      .filter(Boolean)
      .join(" ");
  };
  for (const account of accounts) {
    // Already opened as the counter of an earlier known opening: a second
    // `open` made the new ledger fail bean-check (w23/048).
    if (opened.has(account.name)) continue;
    const currency = account.currency ?? operatingCurrency;
    lines.push(openLine(account.name, account.currency));
    opened.add(account.name);
    if (account.openingState === "unknown") {
      lines.push(`  ${openingStatusKey}: "unknown"`);
    } else if (account.openingState === "zero") {
      lines.push(`  ${openingStatusKey}: "zero"`);
    }
    if (account.openingState === "known" && account.amount) {
      const amount = ledgerOpeningAmount(account.name, account.amount);
      if (!opened.has(OPENING_EQUITY)) {
        lines.push(openLine(OPENING_EQUITY));
        opened.add(OPENING_EQUITY);
      }
      const negated = amount.startsWith("-") ? amount.slice(1) : `-${amount}`;
      openings.push(
        `${dayBefore(historyStart)} * "Opening balance"`,
        `  ${account.name} ${amount} ${currency}`,
        `  ${OPENING_EQUITY} ${negated} ${currency}`,
        "",
      );
      assertions.push(
        `${historyStart} balance ${account.name} ${amount} ${currency}`,
      );
    }
  }

  if (openings.length > 0) {
    lines.push("", ...openings);
  }
  if (assertions.length > 0) {
    lines.push(...assertions, "");
  }

  const openedAccounts = [...opened].sort();
  return {
    preset: preset.id,
    operatingCurrency,
    historyStart,
    accounts: openedAccounts,
    files: { "main.bean": `${lines.join("\n")}\n` },
  };
}
