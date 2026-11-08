import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { splitToolFailure } from "@/features/ai-agent/api/mcp-errors";
import { runToolSafely } from "@/features/ai-agent/utils/run-tool";

import { NotFoundError } from "../domain-errors";
import { BANK_NOT_FOUND_HINT } from "../lookup-hints";

/**
 * Audit of the NOT_FOUND throw sites an MCP caller can reach.
 *
 * The MCP category fallback for NOT_FOUND points at ledgers, files and entry
 * hashes (`mcp-errors.ts`). A miss on anything else (a bank connection, a pull
 * request, a commit, a user) must say where its id comes from, or an agent is
 * sent to the wrong list. The audit scans the source, so a new site cannot slip
 * in without one.
 */
const FEATURES = path.resolve(__dirname, "../../../features");

/** Features with no MCP tool or resource: their NOT_FOUND never reaches an agent. */
const NOT_ON_MCP = new Set(["auth", "oauth", "stripe", "admin", "sitemap"]);

/** Resources the fallback already describes (`listLedgers`, `listLedgerFiles`, `listLedgerEntries`). */
const FALLBACK_FITS = new Set(["Ledger", "File", "Entry"]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory())
      return name === "__tests__" ? [] : sourceFiles(full);
    return name.endsWith(".ts") && !name.endsWith(".test.ts") ? [full] : [];
  });
}

/** Top-level arguments of the call that opens at `open` (the `(`), skipping strings and nested brackets. */
export function callArguments(text: string, open: number): string[] {
  const args: string[] = [];
  let depth = 0;
  let quote = "";
  let start = open + 1;
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if ("([{".includes(ch)) depth += 1;
    else if (")]}".includes(ch)) {
      depth -= 1;
      if (depth === 0) {
        const last = text.slice(start, i).trim();
        if (last) args.push(last);
        return args;
      }
    } else if (ch === "," && depth === 1) {
      args.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  throw new Error("unbalanced call");
}

describe("callArguments", () => {
  it("splits on top-level commas only", () => {
    const text = 'new NotFoundError("A, b", f(1, 2), `x${y}`, { k: [1, 2] },)';
    expect(callArguments(text, text.indexOf("("))).toEqual([
      '"A, b"',
      "f(1, 2)",
      "`x${y}`",
      "{ k: [1, 2] }",
    ]);
  });

  it("counts a call with no arguments as none", () => {
    const text = "new NotFoundError()";
    expect(callArguments(text, text.indexOf("("))).toEqual([]);
  });
});

describe("NOT_FOUND hints on MCP-reachable paths", () => {
  const sites = readdirSync(FEATURES)
    .filter((feature) => !NOT_ON_MCP.has(feature))
    .flatMap((feature) => sourceFiles(path.join(FEATURES, feature)))
    .flatMap((file) => {
      const text = readFileSync(file, "utf8");
      return [...text.matchAll(/new NotFoundError\(/g)].map((match) => {
        const args = callArguments(text, match.index + match[0].length - 1);
        return {
          where: `${path.relative(FEATURES, file)}:${text.slice(0, match.index).split("\n").length}`,
          resource: args[0],
          hint: args[2],
        };
      });
    });

  it("finds the throw sites it is meant to audit", () => {
    expect(sites.length).toBeGreaterThan(15);
    expect(sites.map((s) => s.where).join("\n")).toContain(
      "plaid-item-service",
    );
  });

  it("gives every site outside ledgers, files and entries its own hint", () => {
    const missing = sites
      .filter((s) => !s.hint)
      .filter(
        (s) =>
          !FALLBACK_FITS.has(s.resource?.replace(/^["']|["']$/g, "") ?? ""),
      )
      // A computed resource name is a directory or file miss that carries its own hint.
      .map((s) => `${s.where} ${s.resource}`);
    expect(missing).toEqual([]);
  });

  it("reaches an MCP caller in place of the ledger-and-file fallback", async () => {
    const logger = { warn: jest.fn(), error: jest.fn() } as never;
    const failed = await runToolSafely({
      logger,
      message: "x",
      execute: async () => {
        throw new NotFoundError(
          "Bank connection",
          undefined,
          BANK_NOT_FOUND_HINT,
        );
      },
    });
    const { envelope } = splitToolFailure(failed as Record<string, unknown>);
    expect(envelope.code).toBe("NOT_FOUND");
    expect(envelope.hint).toBe(BANK_NOT_FOUND_HINT);

    // Without its own hint the same miss gets the fallback that names ledgers.
    const bare = await runToolSafely({
      logger,
      message: "x",
      execute: async () => {
        throw new NotFoundError("Bank connection");
      },
    });
    expect(
      splitToolFailure(bare as Record<string, unknown>).envelope.hint,
    ).toMatch(/listLedgers/);
  });

  it("keeps each hint free of an internal path or a stack frame", () => {
    expect(BANK_NOT_FOUND_HINT).not.toMatch(/src\/|\.ts\b|at .*\(/);
  });
});
