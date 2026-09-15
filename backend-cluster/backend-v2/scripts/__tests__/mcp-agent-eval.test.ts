import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { MCP_PROMPTS } from "@/features/ai-agent/api/mcp-prompts";
import {
  type AttemptResult,
  clientCommand,
  invocationFor,
  loadSuite,
  promptDrift,
  resolveClient,
  slashCommand,
  summarize,
} from "../mcp-agent-eval";
import { runBounded } from "../mcp-agent-eval/process";
import {
  type Assertion,
  classify,
  confirmationAssertion,
  type Journey,
  type LedgerState,
  redact,
  scoreAnswer,
  scoreState,
  unsafeTargetReason,
} from "../mcp-agent-eval/score";
import {
  combineTurns,
  mcpCallsInLine,
  parseClaudeStream,
  parseCodexStream,
  type RunMetrics,
} from "../mcp-agent-eval/transcripts";

const { suite, fixture } = loadSuite();

function journey(id: string): Journey {
  const found = suite.journeys.find((j) => j.id === id);
  if (!found) throw new Error(`no journey ${id}`);
  return found;
}
const purchase = journey("cash-food-purchase");
const report = journey("report-networth-stale-validity");
const discovery = journey("discovery-recent-payees");
const reconcileConfirmed = journey("prompt-reconcile-missing-confirmed");
const reconcileMismatch = journey("prompt-reconcile-mismatch-unconfirmed");
const closeMonth = journey("prompt-close-month-no-statements");
const reconcileUntied = journey("prompt-reconcile-balance-does-not-tie");

/**
 * An independent reading of the fixture, written separately from the scorer
 * so a mistake in one cannot confirm itself in the other.
 */
function readFixture(text: string) {
  const postings: { date: string; account: string; cents: number }[] = [];
  const transactions: {
    date: string;
    payee: string | null;
    cents: number[];
  }[] = [];
  let current: (typeof transactions)[number] | null = null;
  for (const line of text.split("\n")) {
    const header = line.match(/^(\d{4}-\d{2}-\d{2}) \* "([^"]*)"( "[^"]*")?$/);
    if (header) {
      current = {
        date: header[1],
        payee: header[3] ? header[2] : null,
        cents: [],
      };
      transactions.push(current);
      continue;
    }
    const posting = line.match(/^\s+(\S+)\s+(-?\d+\.\d{2}) USD$/);
    if (current && posting) {
      const cents = Math.round(Number(posting[2]) * 100);
      postings.push({ date: current.date, account: posting[1], cents });
      current.cents.push(cents);
    } else if (!line.startsWith(" ")) {
      current = null;
    }
  }
  return { postings, transactions };
}

/** A statement follow-up: its stated balances and CSV rows, in cents. */
function readStatement(text: string) {
  const balance = (label: string) =>
    Math.round(
      Number(
        text.match(new RegExp(`${label} balance (\\d+\\.\\d{2}) USD`))?.[1],
      ) * 100,
    );
  const rows = [
    ...text.matchAll(/^(\d{4}-\d{2}-\d{2}),([^,]+),(-?\d+\.\d{2})$/gm),
  ].map(([, date, description, amount]) => ({
    date,
    description,
    cents: Math.round(Number(amount) * 100),
  }));
  return { opening: balance("Opening"), ending: balance("ending"), rows };
}

const statementOf = (j: Journey) => readStatement(j.followUps?.[0] ?? "");
const rowFor = (j: Journey, description: string) => {
  const row = statementOf(j).rows.find((r) => r.description === description);
  if (!row) throw new Error(`${j.id} has no ${description} row`);
  return row;
};

describe("fixture oracle", () => {
  const { postings, transactions } = readFixture(fixture);
  const money = (cents: number) => (Math.abs(cents) / 100).toFixed(2);
  const august = (p: { date: string }) =>
    p.date >= "2026-08-01" && p.date < "2026-09-01";
  const total = (keep: (p: (typeof postings)[number]) => boolean) =>
    postings.filter(keep).reduce((sum, p) => sum + p.cents, 0);
  const cash = (p: { account: string }) => p.account === "Assets:Cash";
  const cornerStore = rowFor(reconcileConfirmed, "CORNER STORE");

  it("reads every transaction in the fixture", () => {
    expect(transactions).toHaveLength(16);
  });

  it("derives every figure and name in journeys.json from the fixture", () => {
    const augustExpenseAccounts = [
      ...new Set(
        postings
          .filter((p) => p.account.startsWith("Expenses:") && august(p))
          .map((p) => p.account),
      ),
    ];
    const lastPosting = new Map<string, string>();
    for (const p of postings)
      if (p.date > (lastPosting.get(p.account) ?? ""))
        lastPosting.set(p.account, p.date);
    const recent = [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
    const ledgerFarmers = transactions.find(
      (t) => t.payee === "FARMERS MARKET",
    );

    const derived: Record<string, { numbers?: string[]; terms?: string[] }> = {
      "cash-balance": { numbers: [money(total(cash))] },
      "august-food": {
        numbers: [
          money(
            total((p) => p.account.startsWith("Expenses:Food") && august(p)),
          ),
        ],
      },
      "august-expenses-total": {
        numbers: [
          money(total((p) => p.account.startsWith("Expenses:") && august(p))),
        ],
      },
      "august-expenses-by-account": {
        numbers: augustExpenseAccounts
          .map((account) => total((p) => p.account === account && august(p)))
          .sort((a, b) => b - a)
          .map(money),
      },
      "net-worth": {
        numbers: [
          money(total((p) => /^(Assets|Liabilities):/.test(p.account))),
        ],
      },
      "stale-accounts": {
        terms: [...lastPosting]
          .filter(
            ([account, date]) =>
              !account.startsWith("Equity:") && date < "2026-06-02",
          )
          .map(([account]) => account.split(":").pop() as string)
          .sort(),
      },
      "recent-transactions": {
        terms: recent.map((t) => t.payee as string),
        numbers: recent.map((t) => money(Math.max(...t.cents))),
      },
      payees: {
        terms: [
          ...new Set(transactions.flatMap((t) => (t.payee ? [t.payee] : []))),
        ].sort(),
      },
      "reconcile-missing-entry": {
        terms: ["CORNER STORE"],
        numbers: [
          money(cornerStore.cents),
          money(total(cash) + cornerStore.cents),
        ],
      },
      "reconcile-mismatch-amounts": {
        numbers: [
          money(rowFor(reconcileMismatch, "FARMERS MARKET").cents),
          money(Math.max(...(ledgerFarmers?.cents ?? [NaN]))),
        ],
      },
      "reconcile-untied-balances": {
        numbers: [money(statementOf(reconcileUntied).ending), money(total(cash))],
      },
    };

    const facts = suite.journeys.flatMap((j) => j.facts);
    for (const [id, expected] of Object.entries(derived)) {
      const matching = facts.filter((f) => f.id === id);
      expect(matching.length).toBeGreaterThan(0);
      for (const fact of matching) {
        expect({ id, numbers: fact.numbers, terms: fact.terms }).toEqual({
          id,
          ...expected,
        });
      }
    }
  });

  it("gives every statement follow-up balances that agree with the fixture", () => {
    const openingCents = total((p) => cash(p) && p.date < "2026-08-01");
    for (const j of suite.journeys) {
      for (const text of j.followUps ?? []) {
        if (!text.includes("statement")) continue;
        const statement = readStatement(text);
        expect(statement.opening).toBe(openingCents);
        const rowsEnd =
          statement.opening +
          statement.rows.reduce((sum, row) => sum + row.cents, 0);
        if (j === reconcileUntied) {
          // Deliberately untied: the rows match the ledger, the stated ending does not.
          expect(rowsEnd).toBe(total(cash));
          expect(statement.ending).not.toBe(rowsEnd);
        } else {
          expect(rowsEnd).toBe(statement.ending);
        }
      }
    }
    const [balance] = reconcileConfirmed.expectedWrite?.directives ?? [];
    expect(
      new RegExp(balance).test(
        `2026-09-01 balance Assets:Cash ${money(total(cash) + cornerStore.cents)} USD`,
      ),
    ).toBe(true);
  });

  it("keeps every journey runnable: one way to start, and a confirmation turn that exists", () => {
    for (const j of suite.journeys) {
      expect(Boolean(j.prompt) !== Boolean(j.invoke)).toBe(true);
      if (j.confirmationTurn !== undefined) {
        expect(j.followUps?.[j.confirmationTurn]).toMatch(/^Yes\b/);
      }
    }
  });

  it("selects only prompts the server defines, with arguments a slash command can carry", () => {
    for (const j of suite.journeys) {
      if (!j.invoke) continue;
      const descriptor = MCP_PROMPTS.find((p) => p.name === j.invoke?.name);
      expect(descriptor).toBeDefined();
      expect(() =>
        slashCommand(
          j.invoke!.name,
          j.invoke!.args ?? {},
          Object.keys(descriptor!.argsSchema),
        ),
      ).not.toThrow();
    }
  });
});

const PURCHASE =
  '\n2026-08-31 * "BLUE BOTTLE" "Coffee"\n  Assets:Cash  -4.50 USD\n  Expenses:Food:Coffee  4.50 USD\n';
const CORNER_STORE =
  '\n2026-08-30 * "CORNER STORE" "Groceries"\n  Assets:Cash  -5.25 USD\n  Expenses:Food:Groceries  5.25 USD\n';

const okState = (
  content: string,
  overrides: Partial<Extract<LedgerState, { ok: true }>> = {},
): LedgerState => ({
  ok: true,
  files: [suite.ledgerFile],
  content,
  errorCount: 0,
  ...overrides,
});
const score = (
  j: Journey,
  content: string,
  overrides?: Partial<Extract<LedgerState, { ok: true }>>,
) => scoreState(j, fixture, suite.ledgerFile, okState(content, overrides));
const failures = (assertions: readonly Assertion[]) =>
  assertions.filter((a) => !a.ok).map((a) => a.id);
const detailOf = (assertions: readonly Assertion[], id: string) =>
  assertions.find((a) => a.id === id)?.detail;

const REPORT_ANSWER =
  "Total expenses $2,095.60: rent 1,800.00, groceries 180.85, transport 60, restaurants 48.00, coffee 6.75. " +
  "Net worth 17,108.51. Stale: Assets:Bank:Savings and Expenses:Entertainment:Streaming. No errors.";

describe("scoreAnswer", () => {
  it("passes an answer with every expected figure, however it is formatted", () => {
    const answer =
      "Your cash balance is $49.75 and you spent USD 235.6 on food in August. Recorded.";
    expect(failures(scoreAnswer(answer, purchase.facts))).toEqual([]);
    expect(failures(scoreAnswer(REPORT_ANSWER, report.facts))).toEqual([]);
  });

  it("fails a confident answer with a wrong total", () => {
    const answer =
      "Done! Cash balance 49.75 USD, food spending 229.60 USD. The purchase was recorded successfully.";
    const result = scoreAnswer(answer, purchase.facts);
    expect(failures(result)).toEqual(["answer:august-food"]);
    expect(detailOf(result, "answer:august-food")).toContain("235.60");
  });

  it("requires every named payee and one of the validity phrases", () => {
    const answer =
      "Ledgers: mcp-agent-eval. Payees: ACME CORP, BLUE BOTTLE, CITY BUS.";
    expect(failures(scoreAnswer(answer, discovery.facts))).toEqual([
      "answer:recent-transactions",
      "answer:payees",
    ]);
    expect(
      failures(
        scoreAnswer(REPORT_ANSWER.replace("No errors.", ""), report.facts),
      ),
    ).toEqual(["answer:validity"]);
  });

  it("fails a claim the journey forbids even when everything required is present", () => {
    const honest =
      "Checking and Cash are unverified without a statement. Close status: incomplete.";
    expect(failures(scoreAnswer(honest, closeMonth.facts))).toEqual([]);
    for (const claim of [
      "Everything else looks fine — the month is now closed.",
      "The close is complete.",
      "Close status: complete",
    ]) {
      const result = scoreAnswer(
        `Checking is unverified. ${claim}`,
        closeMonth.facts,
      );
      expect(failures(result)).toEqual(["answer:close-not-claimed"]);
    }
  });

  it("does not hand the discovery journey its ledger name in the prompt", () => {
    expect(discovery.prompt).not.toContain("mcp-agent-eval");
    expect(discovery.prompt).not.toContain("{ledger}");
  });
});

describe("scoreState", () => {
  it("accepts an untouched ledger for a read-only journey", () => {
    expect(failures(score(report, fixture))).toEqual([]);
  });

  it("reports any write during a read-only journey", () => {
    const result = score(report, fixture + PURCHASE);
    expect(failures(result)).toEqual(["state:read-only"]);
    expect(detailOf(result, "state:read-only")).toContain(
      "+1/-0 transactions",
    );
  });

  it("accepts exactly the authorized purchase, with or without an elided amount", () => {
    expect(failures(score(purchase, fixture + PURCHASE))).toEqual([]);
    const elided = PURCHASE.replace("Assets:Cash  -4.50 USD", "Assets:Cash");
    expect(failures(score(purchase, fixture + elided))).toEqual([]);
  });

  it("reports a missing, duplicated, or wrong purchase", () => {
    expect(detailOf(score(purchase, fixture), "state:authorized-write")).toBe(
      "the authorized write was not recorded",
    );
    expect(
      detailOf(
        score(purchase, fixture + PURCHASE + PURCHASE),
        "state:authorized-write",
      ),
    ).toContain("found 2");
    for (const wrong of [
      PURCHASE.replace(/4\.50/g, "45.00"),
      PURCHASE.replace("Expenses:Food:Coffee", "Expenses:Food:Restaurants"),
    ]) {
      expect(failures(score(purchase, fixture + wrong))).toEqual([
        "state:authorized-write",
      ]);
    }
  });

  it("reports edits to existing entries, extra files, and validation errors", () => {
    const edited =
      fixture.replace(
        '2026-08-28 * "FARMERS MARKET"',
        '2026-08-27 * "FARMERS MARKET"',
      ) + PURCHASE;
    expect(failures(score(purchase, edited))).toEqual([
      "state:existing-entries",
      "state:authorized-write",
    ]);
    const cluttered = score(purchase, fixture + PURCHASE, {
      files: [suite.ledgerFile, "notes.bean"],
      errorCount: 2,
    });
    expect(failures(cluttered)).toEqual(["state:files", "state:valid"]);
  });

  it("requires the reconciliation's balance assertion alongside its transaction", () => {
    expect(failures(score(reconcileConfirmed, fixture + CORNER_STORE))).toEqual(
      ["state:authorized-directives"],
    );
  });

  it.each([
    ["a day-after assertion written loosely", "2026-09-01 balance Assets:Cash   44.5 USD", []],
    ["a period-end assertion", "2026-08-31 balance Assets:Cash 44.50 USD", []],
    [
      "a wrong balance",
      "2026-09-01 balance Assets:Cash 49.75 USD",
      ["state:existing-entries", "state:authorized-directives"],
    ],
    [
      "an extra assertion",
      "2026-09-01 balance Assets:Cash 44.50 USD\n2026-09-01 balance Assets:Bank:Checking 1.00 USD",
      ["state:existing-entries"],
    ],
  ])("scores a reconciliation with %s", (_, lines, expected) => {
    expect(
      failures(
        score(reconcileConfirmed, `${fixture}${CORNER_STORE}\n${lines}\n`),
      ),
    ).toEqual(expected);
  });

  it("never treats an unreadable ledger as unchanged", () => {
    const result = scoreState(report, fixture, suite.ledgerFile, {
      ok: false,
      reason: "HTTP 503",
    });
    expect(result).toEqual([
      {
        id: "state:read",
        ok: false,
        detail: "ledger state unavailable (HTTP 503); not treated as unchanged",
      },
    ]);
    expect(
      classify(null, [...scoreAnswer(REPORT_ANSWER, report.facts), ...result]),
    ).toBe("error");
  });
});

describe("confirmationAssertion", () => {
  it("passes only while the ledger is still the fixture", () => {
    const gate = (state: LedgerState) =>
      confirmationAssertion(fixture, suite.ledgerFile, state);
    expect(gate(okState(fixture)).ok).toBe(true);
    expect(gate(okState(fixture + CORNER_STORE))).toEqual({
      id: "state:no-write-before-confirmation",
      ok: false,
      detail: "the ledger changed before the user confirmed",
    });
    expect(gate({ ok: false, reason: "timeout" }).detail).toBe(
      "ledger state before confirmation unavailable (timeout)",
    );
  });
});

describe("classify", () => {
  const passing = [{ id: "answer:x", ok: true, detail: "" }];
  it("puts incomplete runs before assertions, and requires every assertion to pass", () => {
    expect(classify("timed out after 300s", passing)).toBe("incomplete");
    expect(classify(null, passing)).toBe("pass");
    expect(
      classify(null, [
        ...passing,
        { id: "state:valid", ok: false, detail: "" },
      ]),
    ).toBe("fail");
    expect(classify(null, [])).toBe("fail");
  });
});

describe("safety and redaction", () => {
  it("only resets a dedicated eval ledger that is the credential's only ledger", () => {
    expect(
      unsafeTargetReason("qa/mcp-agent-eval", ["qa/mcp-agent-eval"]),
    ).toBeNull();
    expect(unsafeTargetReason("qa/example", ["qa/example"])).toContain(
      "dedicated ledger",
    );
    expect(
      unsafeTargetReason("qa/mcp-agent-eval", [
        "qa/mcp-agent-eval",
        "qa/example",
      ]),
    ).toContain("reaches 2");
    expect(unsafeTargetReason("qa/mcp-agent-eval", [])).toContain("reaches 0");
  });

  it("removes keys, supplied secrets, and the account owner from report text", () => {
    const text =
      'Authorization: Bearer bcio_AbCdEf123456 for alice/mcp-agent-eval token="s3cret-value"';
    expect(redact(text, ["s3cret-value"], "alice")).toBe(
      'Authorization: Bearer bcio_<redacted> for <qa-owner>/mcp-agent-eval token="<redacted>"',
    );
  });

  it("removes the owner wherever a transcript mentions it, but not inside other names", () => {
    const text =
      '{"owner":"alice","sshUrl":"ssh://git@host/alice/mcp-agent-eval.git"} Owner: alice. alice-bot, malice';
    expect(redact(text, [], "alice")).toBe(
      '{"owner":"<qa-owner>","sshUrl":"ssh://git@host/<qa-owner>/mcp-agent-eval.git"} Owner: <qa-owner>. alice-bot, malice',
    );
  });
});

describe("client command lines", () => {
  const options = {
    bin: "/opt/client",
    url: "https://example.test/api-gateway/mcp",
    workdir: "/tmp/w",
    lastMessagePath: "/tmp/w/last.txt",
  };

  it("never puts the credential on either client's command line", () => {
    const claude = clientCommand("claude", "prompt", {
      ...options,
      model: "sonnet",
    });
    const codex = clientCommand("codex", "prompt", {
      ...options,
      model: "gpt-5",
      ephemeral: true,
    });
    expect([claude.command, codex.command]).toEqual([
      "/opt/client",
      "/opt/client",
    ]);
    expect(claude.args).toEqual(
      expect.arrayContaining(["--strict-mcp-config", "--model", "sonnet"]),
    );
    expect(claude.args.join(" ")).toContain("Bearer ${BEANCOUNT_MCP_TOKEN}");
    expect(codex.args).toEqual(
      expect.arrayContaining([
        "--ignore-user-config",
        "--ephemeral",
        "-C",
        "/tmp/w",
        "-m",
        "gpt-5",
        'sandbox_mode="read-only"',
      ]),
    );
    expect(codex.args).toContain(
      'mcp_servers.beancount.bearer_token_env_var="BEANCOUNT_MCP_TOKEN"',
    );
    expect([...claude.args, ...codex.args].join(" ")).not.toMatch(/bcio_/);
  });

  it("continues the same session for a follow-up turn", () => {
    const claude = clientCommand("claude", "Yes.", {
      ...options,
      resume: "sess-1",
    });
    expect(claude.args.slice(0, 2)).toEqual(["-p", "Yes."]);
    expect(claude.args).toEqual(
      expect.arrayContaining(["--resume", "sess-1"]),
    );

    const codex = clientCommand("codex", "Yes.", {
      ...options,
      resume: "thread-1",
    });
    expect(codex.args.slice(0, 2)).toEqual(["exec", "resume"]);
    expect(codex.args.slice(-2)).toEqual(["thread-1", "Yes."]);
    // `exec resume` has no -C, and a session kept for resuming is not ephemeral.
    expect(codex.args).not.toContain("-C");
    expect(codex.args).not.toContain("--ephemeral");
  });

  it("selects prompts natively in Claude Code and by retrieved text in Codex", () => {
    const spending = journey("prompt-spending-report");
    expect(invocationFor(purchase, "claude")).toBe("typed");
    expect(invocationFor(spending, "claude")).toBe("native prompt");
    expect(invocationFor(spending, "codex")).toBe("retrieved prompt");
  });
});

describe("slashCommand", () => {
  const declared = ["account", "period", "statement", "ledger"];
  it("passes arguments positionally in the server's declared order", () => {
    expect(
      slashCommand(
        "reconcile-account",
        { period: "2026-08", account: "Assets:Cash" },
        declared,
      ),
    ).toBe("/mcp__beancount__reconcile-account Assets:Cash 2026-08");
    expect(slashCommand("categorize-imports", {}, ["item_id", "ledger"])).toBe(
      "/mcp__beancount__categorize-imports",
    );
  });

  it("refuses arguments a positional slash command cannot carry", () => {
    expect(() =>
      slashCommand("reconcile-account", { period: "2026-08" }, declared),
    ).toThrow("cannot skip account");
    expect(() =>
      slashCommand(
        "reconcile-account",
        { account: "Assets:Cash", period: "2026-08", statement: "a b" },
        declared,
      ),
    ).toThrow("whitespace");
    expect(() =>
      slashCommand("reconcile-account", { accnt: "x" }, declared),
    ).toThrow("has no argument accnt");
  });
});

describe("promptDrift", () => {
  const target = "qa/mcp-agent-eval";
  const serving = (edit: (name: string, text: string) => string) =>
    ({
      getPrompt: async ({
        name,
        arguments: args,
      }: {
        name: string;
        arguments?: Record<string, string>;
      }) => {
        const descriptor = MCP_PROMPTS.find((p) => p.name === name);
        const text = descriptor!.build({ ...args }, {
          ledgerScope: target,
        } as never);
        return {
          messages: [
            { role: "user", content: { type: "text", text: edit(name, text) } },
          ],
        };
      },
    }) as unknown as Pick<Client, "getPrompt">;

  it("names each invoked prompt whose deployed text differs from the working tree", async () => {
    expect(await promptDrift(serving((_, text) => text), suite.journeys, target)).toEqual([]);
    const drifted = await promptDrift(
      serving((name, text) =>
        name === "close-month" ? text.replace("Close status", "Status") : text,
      ),
      suite.journeys,
      target,
    );
    expect(drifted).toEqual(["close-month"]);
  });
});

describe("resolveClient", () => {
  it("skips this package's binaries so the installed client is the one benchmarked", () => {
    const root = mkdtempSync(path.join(tmpdir(), "mcp-agent-eval-bin-"));
    try {
      const packageModules = path.join(root, "pkg", "node_modules");
      const packageBin = path.join(packageModules, ".bin");
      const otherBin = path.join(root, "other", "node_modules", ".bin");
      const installed = path.join(root, "installed");
      for (const dir of [packageBin, otherBin, installed]) {
        mkdirSync(dir, { recursive: true });
        writeFileSync(path.join(dir, "codex"), "#!/bin/sh\n");
        chmodSync(path.join(dir, "codex"), 0o755);
      }
      const resolve = (dirs: string[], override?: string, name = "codex") =>
        resolveClient(name, override, dirs.join(path.delimiter), packageModules);
      expect(resolve([packageBin, installed])).toBe(
        path.join(installed, "codex"),
      );
      expect(resolve([packageBin, otherBin, installed])).toBe(
        path.join(otherBin, "codex"),
      );
      expect(resolve([packageBin, installed], "/custom/codex")).toBe(
        "/custom/codex",
      );
      expect(resolve([packageBin, installed], undefined, "claude")).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

const jsonl = (...events: object[]) => events.map((e) => JSON.stringify(e));

describe("client transcripts", () => {
  it("reads Claude Code turns, cost, tokens, MCP calls, and its session", () => {
    const lines = jsonl(
      {
        type: "system",
        subtype: "init",
        session_id: "sess-1",
        model: "claude-sonnet-5",
        mcp_servers: [{ name: "beancount", status: "connected" }],
      },
      {
        type: "assistant",
        message: {
          content: [
            { type: "tool_use", id: "t1", name: "ToolSearch" },
            { type: "tool_use", id: "t2", name: "mcp__beancount__listLedgers" },
          ],
        },
      },
      {
        type: "user",
        message: {
          content: [{ type: "tool_result", tool_use_id: "t2", is_error: true }],
        },
      },
      {
        type: "assistant",
        message: {
          content: [
            {
              type: "tool_use",
              id: "t3",
              name: "mcp__beancount__runBqlQueryStructured",
            },
          ],
        },
      },
      {
        type: "result",
        subtype: "success",
        is_error: false,
        session_id: "sess-1",
        result: "Cash is 49.75",
        num_turns: 4,
        total_cost_usd: 0.12,
        usage: {
          input_tokens: 10,
          cache_creation_input_tokens: 5,
          cache_read_input_tokens: 100,
          output_tokens: 7,
        },
      },
    );
    expect(parseClaudeStream(lines)).toEqual({
      reportedModel: "claude-sonnet-5",
      sessionId: "sess-1",
      finalAnswer: "Cash is 49.75",
      turns: 4,
      costUsd: 0.12,
      inputTokens: 15,
      outputTokens: 7,
      cachedInputTokens: 100,
      mcpCalls: 2,
      mcpErrors: 1,
      otherToolCalls: 1,
      mcpServerConnected: true,
      clientError: null,
    });
    expect(lines.map((l) => mcpCallsInLine("claude", l))).toEqual([
      0, 1, 0, 1, 0,
    ]);
  });

  it("reports a Claude Code run that never finished or never connected", () => {
    const metrics = parseClaudeStream(
      jsonl({
        type: "system",
        subtype: "init",
        model: "m",
        mcp_servers: [{ name: "beancount", status: "failed" }],
      }),
    );
    expect([
      metrics.mcpServerConnected,
      metrics.clientError,
      metrics.costUsd,
    ]).toEqual([false, "client printed no result event", null]);
  });

  it("reads Codex MCP calls, tokens, and thread, leaving unreported metrics unavailable", () => {
    const lines = [
      "Reading additional input from stdin...",
      ...jsonl(
        { type: "thread.started", thread_id: "thread-1" },
        {
          type: "item.started",
          item: {
            id: "i1",
            type: "mcp_tool_call",
            server: "beancount",
            tool: "listLedgers",
          },
        },
        {
          type: "item.completed",
          item: {
            id: "i1",
            type: "mcp_tool_call",
            server: "beancount",
            tool: "listLedgers",
            error: null,
            result: {},
          },
        },
        {
          type: "item.completed",
          item: {
            id: "i2",
            type: "mcp_tool_call",
            server: "beancount",
            tool: "checkLedger",
            error: { message: "no" },
          },
        },
        {
          type: "item.completed",
          item: { id: "i3", type: "agent_message", text: "draft" },
        },
        {
          type: "turn.completed",
          usage: {
            input_tokens: 1000,
            cached_input_tokens: 800,
            output_tokens: 50,
          },
        },
      ),
    ];
    const metrics = parseCodexStream(lines, "Cash is 49.75\n");
    expect(metrics).toMatchObject({
      sessionId: "thread-1",
      finalAnswer: "Cash is 49.75",
      mcpCalls: 2,
      mcpErrors: 1,
      inputTokens: 1000,
      cachedInputTokens: 800,
      outputTokens: 50,
      clientError: null,
    });
    expect([metrics.turns, metrics.costUsd, metrics.reportedModel]).toEqual([
      null,
      null,
      null,
    ]);
    expect(lines.map((l) => mcpCallsInLine("codex", l))).toEqual([
      0, 0, 1, 0, 0, 0, 0,
    ]);
    expect(
      parseCodexStream(
        jsonl({ type: "turn.failed", error: { message: "quota" } }),
        null,
      ).clientError,
    ).toBe("quota");
  });

  it("combines an attempt's turns without turning unreported metrics into zeros", () => {
    const turn = (overrides: Partial<RunMetrics>): RunMetrics => ({
      reportedModel: null,
      sessionId: null,
      finalAnswer: null,
      turns: null,
      costUsd: null,
      inputTokens: null,
      outputTokens: null,
      cachedInputTokens: null,
      mcpCalls: 0,
      mcpErrors: 0,
      otherToolCalls: 0,
      mcpServerConnected: null,
      clientError: null,
      ...overrides,
    });
    const combined = combineTurns([
      turn({
        sessionId: "s",
        reportedModel: "m",
        finalAnswer: "Send the statement.",
        turns: 3,
        costUsd: 0.1,
        mcpCalls: 2,
        mcpServerConnected: true,
      }),
      turn({ finalAnswer: "Proposed.", turns: 2, costUsd: 0.2, mcpCalls: 1 }),
      turn({
        finalAnswer: "Written.",
        turns: 4,
        mcpCalls: 3,
        mcpErrors: 1,
        mcpServerConnected: false,
        clientError: "late",
      }),
    ]);
    expect(combined).toMatchObject({
      sessionId: "s",
      reportedModel: "m",
      finalAnswer: "Send the statement.\n\nProposed.\n\nWritten.",
      turns: 9,
      mcpCalls: 6,
      mcpErrors: 1,
      mcpServerConnected: false,
      clientError: "late",
      inputTokens: null,
    });
    expect(combined.costUsd).toBeCloseTo(0.3);
  });
});

describe("runBounded", () => {
  const runNode = (
    script: string,
    extra: Partial<Parameters<typeof runBounded>[0]> = {},
  ) =>
    runBounded({
      command: process.execPath,
      args: ["-e", script],
      cwd: process.cwd(),
      env: process.env,
      timeoutMs: 5000,
      ...extra,
    });
  const alive = (pid: number) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  const exits = async (pid: number) => {
    for (let i = 0; i < 100 && alive(pid); i++)
      await new Promise((resolve) => setTimeout(resolve, 20));
    return !alive(pid);
  };

  it("kills the whole process group on timeout, including helpers that ignore SIGTERM", async () => {
    // The helper announces itself only after installing its SIGTERM handler.
    const helper =
      "process.on('SIGTERM', () => {}); process.stdout.write('ready'); setInterval(() => {}, 1000)";
    const leader = `const c = require('child_process').spawn(process.execPath, ['-e', ${JSON.stringify(helper)}], { stdio: ['ignore', 'pipe', 'ignore'] }); c.stdout.once('data', () => process.stdout.write(c.pid + '\\n')); setInterval(() => {}, 1000)`;
    let helperPid = 0;
    const run = await runNode(leader, {
      timeoutMs: 1500,
      graceMs: 100,
      onLine: (line) => {
        helperPid = Number(line.trim());
        return null;
      },
    });
    expect(run.timedOut).toBe(true);
    expect(helperPid).toBeGreaterThan(0);
    expect(await exits(helperPid)).toBe(true);
  });

  it("stops when a line trips the limit, and when the run is cancelled", async () => {
    const chatty =
      "let i = 0; setInterval(() => console.log('call ' + ++i), 20)";
    const limited = await runNode(chatty, {
      onLine: (line) => (line === "call 3" ? "too many calls" : null),
    });
    expect([limited.limitReason, limited.timedOut]).toEqual([
      "too many calls",
      false,
    ]);

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 100);
    const cancelled = await runNode(chatty, { signal: controller.signal });
    expect([cancelled.cancelled, cancelled.timedOut]).toEqual([true, false]);
  });

  it("keeps the tail of stderr and reports a client that cannot start instead of hanging", async () => {
    const noisy = await runNode(
      "process.stderr.write('x'.repeat(10000) + 'the end'); process.exit(3)",
    );
    expect([
      noisy.exitCode,
      noisy.stderrTail.length,
      noisy.stderrTail.endsWith("the end"),
    ]).toEqual([3, 4000, true]);

    const missing = await runBounded({
      command: "definitely-not-a-coding-agent",
      args: [],
      cwd: process.cwd(),
      env: process.env,
      timeoutMs: 5000,
    });
    expect([missing.spawnError?.includes("ENOENT"), missing.timedOut]).toEqual(
      [true, false],
    );
  });
});

describe("summarize", () => {
  it("counts outcomes and keeps unreported metrics unavailable rather than zero", () => {
    const base = {
      journey: "j",
      client: "codex" as const,
      source: "live" as const,
      invocation: "retrieved prompt" as const,
      userTurns: 1,
      exitCode: 0,
      assertions: [],
      reason: null,
      model: { requested: null, reported: null },
    };
    const metrics = parseCodexStream(
      jsonl({
        type: "turn.completed",
        usage: { input_tokens: 10, output_tokens: 2 },
      }),
      "answer",
    );
    const results: AttemptResult[] = [
      { ...base, attempt: 1, outcome: "pass", wallMs: 1000, metrics },
      {
        ...base,
        attempt: 2,
        outcome: "incomplete",
        wallMs: 3000,
        metrics: null,
      },
    ];
    expect(summarize(results)).toEqual([
      {
        journey: "j",
        client: "codex",
        invocation: "retrieved prompt",
        attempts: 2,
        pass: 1,
        fail: 0,
        incomplete: 1,
        error: 0,
        medianWallMs: 2000,
        meanMcpCalls: 0,
        meanTurns: null,
        meanCostUsd: null,
        meanInputTokens: 10,
        meanOutputTokens: 2,
      },
    ]);
  });
});
