import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Identity } from "@/server/api/identity";
import { MCP_PROMPTS } from "../mcp-prompts";
import { MCP_TOOLS } from "../mcp-tools";

/**
 * w23/m40 — the BQL the served text tells an agent to run is a checked list.
 *
 * `runBqlQuery` lists the columns and statement forms BQL has, and the
 * prompts name expressions ("use `sum(weight)`"). An agent acts on those
 * words, and one was wrong twice: a `change` column the engine does not have
 * (w1/226), and a spending total that came out in two currencies (w1/230).
 * This extracts every such claim from the served text and compares it with the
 * list the ledger package replays against its live engine
 * (`backend-cluster/ledger/scripts/served-bql/`, run by `yarn verify:rustledger`
 * in CI (ledger)). Change the served text and this fails until the list is
 * regenerated, which puts the new claim in front of the engine:
 *
 *   UPDATE_SERVED_BQL=1 yarn jest served-bql-claims
 *
 * The engine cannot load here (it needs `--experimental-vm-modules` and lives
 * in the ledger package), so the list is that package's input and this test is
 * the proof it matches the served text. CI (backend parity) also runs when the
 * list changes, so a hand edit of it cannot skip the comparison.
 */
const identity: Identity = {
  userId: "usr_1",
  method: "oauth",
  scopes: new Set(["ledger.read"]),
};
// __tests__ → api → ai-agent → features → src → backend-v2 → backend-cluster
const CLAIMS_FILE = path.resolve(
  __dirname,
  "../../../../../../ledger/scripts/served-bql/served-bql-claims.json",
);

/** The `runBqlQuery` description, and everything a client reads that speaks BQL. */
function servedBqlText() {
  const tools = MCP_TOOLS as unknown as { name: string; description: string }[];
  const description = tools.find(
    (tool) => tool.name === "runBqlQuery",
  )?.description;
  if (!description) throw new Error("runBqlQuery is no longer served");
  return {
    description,
    texts: [
      ...tools
        .filter((tool) => /^runBql/.test(tool.name))
        .map((tool) => tool.description),
      ...MCP_PROMPTS.map((prompt) => prompt.build({}, identity)),
    ],
  };
}

function extractClaims({
  description,
  texts,
}: ReturnType<typeof servedBqlText>) {
  // "BQL: SELECT cols [WHERE expr] … [LIMIT n] | JOURNAL | BALANCES. Columns: …"
  const [, grammar = ""] = /BQL: ([^.]+)\./.exec(description) ?? [];
  const [, ...forms] = grammar.split("|").map((form) => form.trim());
  const columns = (/Columns: ([^.]+)\./.exec(description)?.[1] ?? "")
    .split(",")
    .map((column) => column.trim())
    .filter(Boolean);
  // Every `fn(...)` code span, including one a prompt warns against: a
  // warning about an expression is wrong too if the engine refuses it.
  const expressions = new Set(
    texts.flatMap((text) =>
      [...text.matchAll(/`([a-z_]+\([^`]*\))`/g)].map((span) => span[1]),
    ),
  );
  return { columns, expressions: [...expressions].sort(), forms };
}

describe("the BQL claims in the served text", () => {
  const claims = extractClaims(servedBqlText());

  it("finds the columns, the statement forms and the expressions the text names", () => {
    expect(claims.columns).toEqual(
      expect.arrayContaining(["date", "account", "weight", "position"]),
    );
    expect(claims.forms).toEqual(["JOURNAL", "BALANCES"]);
    expect(claims.expressions).toContain("sum(weight)");
  });

  it("matches the list the ledger package replays against its engine (regenerate with UPDATE_SERVED_BQL=1)", () => {
    if (process.env.UPDATE_SERVED_BQL === "1") {
      writeFileSync(CLAIMS_FILE, `${JSON.stringify(claims, null, 2)}\n`);
    }
    expect(claims).toEqual(JSON.parse(readFileSync(CLAIMS_FILE, "utf8")));
  });
});
