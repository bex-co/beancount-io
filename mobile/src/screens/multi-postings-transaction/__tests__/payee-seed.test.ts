import fs from "fs";
import path from "path";
import { deriveTwoPostingSuggestions } from "../../../common/suggestion-utils";
import {
  createInitialPostings,
  updatePostingAccount,
  updatePostingAmount,
} from "../postings-utils";
import { NO_PAYEE_HISTORY, seedPostingsFromPayee } from "../payee-seed";

// Picking a known payee in New Transaction left the default accounts, so every
// repeat entry needed two account picks; the keypad flow it replaced used to
// prefill them (w21/023).
const txn = (payee: string, from: string, to: string, amount = "42.10") => ({
  type: "Transaction",
  payee,
  postings: [
    { account: from, units: { number: `-${amount}`, currency: "USD" } },
    { account: to, units: { number: amount, currency: "USD" } },
  ],
});
const JOURNAL = [
  txn("TRADER JOES", "Liabilities:CreditCard:Visa", "Expenses:Food:Groceries"),
  txn("TRADER JOES", "Liabilities:CreditCard:Visa", "Expenses:Food:Groceries"),
  txn("CITY BUS", "Assets:Cash", "Expenses:Transport", "2.75"),
];
const history = (payee: string) =>
  deriveTwoPostingSuggestions(JOURNAL as never, payee);
const opened = () =>
  createInitialPostings("Assets:Bank:Checking", "Expenses:Food:Groceries");
const accounts = (postings: { account: string }[] | null) =>
  postings?.map((p) => p.account) ?? null;

describe("seedPostingsFromPayee", () => {
  it("brings a known payee's usual accounts into an untouched form", () => {
    const initial = opened();
    expect(
      accounts(seedPostingsFromPayee(initial, initial, history("TRADER JOES"))),
    ).toEqual(["Liabilities:CreditCard:Visa", "Expenses:Food:Groceries"]);
    expect(
      accounts(seedPostingsFromPayee(initial, initial, history("CITY BUS"))),
    ).toEqual(["Assets:Cash", "Expenses:Transport"]);
  });

  it("leaves accounts the user already changed", () => {
    const initial = opened();
    const picked = updatePostingAccount(initial, 0, "Assets:Cash");
    expect(seedPostingsFromPayee(picked, initial, history("TRADER JOES"))).toBe(
      null,
    );
  });

  // w21/729: typing the amount before choosing the first payee kept the
  // default accounts, where payee-then-amount filled the payee's.
  it("fills a first payee's accounts after an amount, keeping the amount", () => {
    const initial = opened();
    const typed = updatePostingAmount(initial, 0, "4");
    const seeded = seedPostingsFromPayee(typed, initial, history("CITY BUS"));
    expect(accounts(seeded)).toEqual(["Assets:Cash", "Expenses:Transport"]);
    expect(seeded?.map((p) => p.amountInput)).toEqual(
      typed.map((p) => p.amountInput),
    );
  });

  it("leaves the defaults for a new payee", () => {
    const initial = opened();
    expect(seedPostingsFromPayee(initial, initial, history("NEW CAFE"))).toBe(
      null,
    );
  });

  it("never touches the amounts", () => {
    const initial = opened();
    const seeded = seedPostingsFromPayee(
      initial,
      initial,
      history("TRADER JOES"),
    )!;
    expect(seeded.map((p) => p.amountInput)).toEqual(
      initial.map((p) => p.amountInput),
    );
  });

  it("is applied when the payee is picked, unless a receipt set the accounts", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "multi-postings-transaction-screen.tsx"),
      "utf8",
    );
    expect(source.includes("setSeedPayee(v);")).toBe(true);
    expect(
      source.includes("if (!prefillSourceAccount && !prefillTargetAccount) {"),
    ).toBe(true);
    expect(source.includes("seedPostingsFromPayee(")).toBe(true);
  });
});

// w21/045: a payee whose usual card was paid off and closed autofilled that
// card, and the save was refused.
describe("seedPostingsFromPayee: closed usual accounts", () => {
  const closedCard = (account: string) =>
    account !== "Liabilities:CreditCard:Visa";

  it("keeps the default on a side whose usual account is closed", () => {
    const initial = opened();
    expect(
      accounts(
        seedPostingsFromPayee(
          initial,
          initial,
          history("TRADER JOES"),
          closedCard,
        ),
      ),
    ).toEqual(["Assets:Bank:Checking", "Expenses:Food:Groceries"]);
  });

  // w21/834: the closed side keeps the form's account, which equalled the fill.
  it("never ends with the same account on both sides after a closed fallback", () => {
    const initial = createInitialPostings(
      "Assets:Bank:Checking",
      "Expenses:Clothing",
    );
    const usual = {
      from: { autoFill: "Expenses:Clothing" },
      to: { autoFill: "Liabilities:OldVisa" },
    };
    expect(
      seedPostingsFromPayee(
        initial,
        initial,
        usual,
        (account) => account !== "Liabilities:OldVisa",
      ),
    ).toBe(null);
    // The same, after another payee filled the form: the earlier fill goes
    // back to the opening accounts rather than staying (w21/922).
    const filled = createInitialPostings(
      "Assets:Bank:Checking",
      "Liabilities:Visa",
    );
    expect(
      accounts(
        seedPostingsFromPayee(
          filled,
          initial,
          {
            from: { autoFill: "Liabilities:Visa" },
            to: { autoFill: "Expenses:OldHobby" },
          },
          (account) => account !== "Expenses:OldHobby",
          ["Assets:Bank:Checking", "Liabilities:Visa"],
        ),
      ),
    ).toEqual(accounts(initial));
  });

  it("changes nothing when both usual accounts are closed", () => {
    const initial = opened();
    expect(
      seedPostingsFromPayee(initial, initial, history("CITY BUS"), () => false),
    ).toBe(null);
  });
});

// w21/411: after the first payee filled the accounts they no longer equalled the
// form's opening postings, so the next payee was treated as if the user had
// edited them and kept the first payee's card and category.
describe("picking a second payee", () => {
  const first = () => {
    const initial = opened();
    const filled = seedPostingsFromPayee(
      initial,
      initial,
      history("TRADER JOES"),
    )!;
    return {
      initial,
      filled,
      seed: filled.map((p) => p.account),
    };
  };

  it("replaces the first payee's accounts", () => {
    const { initial, filled, seed } = first();
    expect(
      accounts(
        seedPostingsFromPayee(
          filled,
          initial,
          history("CITY BUS"),
          () => true,
          seed,
        ),
      ),
    ).toEqual(["Assets:Cash", "Expenses:Transport"]);
  });

  it("does so after an amount was typed, which is not an account edit", () => {
    const { initial, filled, seed } = first();
    const typed = updatePostingAmount(filled, 0, "12.50");
    expect(
      accounts(
        seedPostingsFromPayee(
          typed,
          initial,
          history("CITY BUS"),
          () => true,
          seed,
        ),
      ),
    ).toEqual(["Assets:Cash", "Expenses:Transport"]);
  });

  it("leaves an account the user changed after the fill alone", () => {
    const { initial, filled, seed } = first();
    const edited = updatePostingAccount(filled, 1, "Expenses:Gifts");
    expect(
      seedPostingsFromPayee(
        edited,
        initial,
        history("CITY BUS"),
        () => true,
        seed,
      ),
    ).toBe(null);
  });

  it("is what the screen passes, and keeps the last fill", () => {
    const src = fs
      .readFileSync(
        path.join(__dirname, "..", "multi-postings-transaction-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(src.includes("lastPayeeSeedRef.current,);")).toBe(true);
    expect(
      src.includes(
        "lastPayeeSeedRef.current=filled?seededPostings.map((p)=>p.account):null;",
      ),
    ).toBe(true);
  });
});

// w21/412: FROM and TO were ranked separately, so the filled pair could be one
// never used together, even the same account twice.
describe("a payee's usual pair", () => {
  const paypal = [
    txn("PAYPAL", "Assets:Bank:Checking", "Assets:PayPal", "25"),
    txn("PAYPAL", "Assets:Bank:Checking", "Assets:PayPal", "40"),
    txn("PAYPAL", "Assets:Bank:Checking", "Assets:PayPal", "10"),
    txn("PAYPAL", "Assets:PayPal", "Expenses:Shopping", "25"),
    txn("PAYPAL", "Assets:PayPal", "Expenses:Games", "12"),
    txn("PAYPAL", "Assets:PayPal", "Expenses:Books", "8"),
    txn("PAYPAL", "Assets:PayPal", "Expenses:Music", "5"),
  ];
  const suggest = (entries: unknown[], payee: string) =>
    deriveTwoPostingSuggestions(entries as never, payee);

  it("fills the most common pair, not the most common side of each", () => {
    const { from, to } = suggest(paypal, "PAYPAL");
    // Sides alone: FROM = PayPal (4), TO = PayPal (3): the same account twice.
    expect([from.autoFill, to.autoFill]).toEqual([
      "Assets:Bank:Checking",
      "Assets:PayPal",
    ]);
  });

  it("keeps a pair that occurs together, with the other accounts as chips", () => {
    const entries = [
      txn("AMAZON", "Liabilities:Card", "Expenses:Shopping"),
      txn("AMAZON", "Liabilities:Card", "Expenses:Shopping"),
      txn("AMAZON", "Assets:Checking", "Expenses:Subscriptions"),
      txn("AMAZON", "Assets:Checking", "Expenses:Subscriptions"),
      txn("AMAZON", "Assets:Checking", "Expenses:Subscriptions"),
    ];
    const { from, to } = suggest(entries, "AMAZON");
    expect([from.autoFill, to.autoFill]).toEqual([
      "Assets:Checking",
      "Expenses:Subscriptions",
    ]);
    expect(from.chips.map((c) => c.account)).toEqual(["Liabilities:Card"]);
    expect(to.chips.map((c) => c.account)).toEqual(["Expenses:Shopping"]);
  });

  it("breaks a tie toward the pair seen first, and ignores a self-transfer in history", () => {
    const tied = [
      txn("A", "Assets:X", "Expenses:Y"),
      txn("A", "Assets:P", "Expenses:Q"),
    ];
    expect(suggest(tied, "A").from.autoFill).toBe("Assets:X");
    const loops = [
      txn("B", "Assets:Z", "Assets:Z"),
      txn("B", "Assets:Z", "Assets:Z"),
    ];
    expect(suggest(loops, "B").from.autoFill).toBe("Assets:Z");
  });

  it("never seeds the same account on both sides", () => {
    const initial = opened();
    expect(
      seedPostingsFromPayee(initial, initial, {
        from: { autoFill: "Assets:PayPal" },
        to: { autoFill: "Assets:PayPal" },
      }),
    ).toBe(null);
  });
});

// w21/922: a payee with no history, or a cleared one, kept the previous payee's
// card and category, and the entry saved against them.
describe("a payee with nothing to fill", () => {
  const initial = opened();
  const filled = () => {
    const seeded = seedPostingsFromPayee(
      initial,
      initial,
      history("TRADER JOES"),
    )!;
    return { seeded, lastSeed: accounts(seeded)! };
  };

  it("puts the opening accounts back for a payee with no history", () => {
    const { seeded, lastSeed } = filled();
    const next = seedPostingsFromPayee(
      seeded,
      initial,
      history("Corner Deli"),
      undefined,
      lastSeed,
    );
    expect(accounts(next)).toEqual(accounts(initial));
  });

  it("puts them back when the payee is cleared", () => {
    const { seeded, lastSeed } = filled();
    expect(
      accounts(
        seedPostingsFromPayee(
          seeded,
          initial,
          NO_PAYEE_HISTORY,
          undefined,
          lastSeed,
        ),
      ),
    ).toEqual(accounts(initial));
  });

  it("keeps the amounts typed since the fill", () => {
    const { seeded, lastSeed } = filled();
    const typed = updatePostingAmount(seeded, 0, "-9.00");
    const next = seedPostingsFromPayee(
      typed,
      initial,
      NO_PAYEE_HISTORY,
      undefined,
      lastSeed,
    )!;
    expect(accounts(next)).toEqual(accounts(initial));
    expect(next[0]!.amount).toBe(typed[0]!.amount);
  });

  it("keeps an account the user edited after the fill", () => {
    const { seeded, lastSeed } = filled();
    const edited = updatePostingAccount(seeded, 1, "Expenses:Gifts");
    expect(
      seedPostingsFromPayee(
        edited,
        initial,
        history("Corner Deli"),
        undefined,
        lastSeed,
      ),
    ).toBe(null);
  });

  it("changes nothing on a form that was never filled", () => {
    expect(
      seedPostingsFromPayee(initial, initial, history("Corner Deli")),
    ).toBe(null);
    expect(
      seedPostingsFromPayee(
        initial,
        initial,
        NO_PAYEE_HISTORY,
        undefined,
        null,
      ),
    ).toBe(null);
  });

  it("also resets when the payee's usual accounts are both closed", () => {
    const { seeded, lastSeed } = filled();
    const next = seedPostingsFromPayee(
      seeded,
      initial,
      history("CITY BUS"),
      () => false,
      lastSeed,
    );
    expect(accounts(next)).toEqual(accounts(initial));
  });
});
