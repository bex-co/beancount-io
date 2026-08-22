#!/usr/bin/env npx tsx
import { configDotenv } from "dotenv";
const _envIdx = process.argv.indexOf("--env");
const _env = _envIdx !== -1 ? process.argv[_envIdx + 1] : (process.env["LEDGER_ENV"] ?? "prod");
configDotenv({ path: `.env.${_env}` });

import { Command } from "commander";
import { makeClient } from "./client.js";

function out(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

function getClient(opts: { baseUrl: string; token: string }) {
  if (!opts.token) {
    console.error("Error: admin token required (--token or LEDGER_ADMIN_TOKEN)");
    process.exit(1);
  }
  return makeClient(opts.baseUrl, opts.token);
}

const program = new Command("ledger")
  .description("Beancount.io ledger service admin CLI")
  .option("--env <env>", "environment to use: prod | dev (default: prod)")
  .option(
    "--base-url <url>",
    "base URL of the ledger service",
    process.env["LEDGER_BASE_URL"] ?? "http://localhost:8000",
  )
  .option(
    "--token <token>",
    "admin token (Authorization header)",
    process.env["LEDGER_ADMIN_TOKEN"] ?? "",
  );

program
  .command("health")
  .description("health check")
  .action(async () => {
    const { baseUrl } = program.opts<{ baseUrl: string; token: string }>();
    const res = await fetch(`${baseUrl}/healthz`);
    out(res.ok ? { status: "ok" } : { status: "error", code: res.status });
  });

// --- Admin: ledgers ---

program
  .command("get-ledger-by-id <id>")
  .description("get a ledger by its Gitea repository ID")
  .action(async (id: string) => {
    const client = getClient(program.opts());
    out(await client.get("/admin/ledgers/{id}", { id }));
  });

// --- Admin: users ---

program
  .command("create-user")
  .description("create a new user in the ledger service")
  .requiredOption("--username <username>", "login username")
  .requiredOption("--email <email>", "user email")
  .requiredOption("--password <password>", "user password")
  .option("--source-id <id>", "source ID (e.g. legacy user ID)")
  .action(async (opts: { username: string; email: string; password: string; sourceId?: string }) => {
    const client = getClient(program.opts());
    out(
      await client.post("/admin/users", {
        username: opts.username,
        email: opts.email,
        password: opts.password,
        ...(opts.sourceId ? { source_id: opts.sourceId } : {}),
      }),
    );
  });

program
  .command("delete-user <username>")
  .description("delete a user from the ledger service")
  .action(async (username: string) => {
    const client = getClient(program.opts());
    out(await client.delete("/admin/users/{username}", { username }));
  });

// --- Ledgers ---

program
  .command("list-ledgers")
  .description("list all ledgers (optionally filter by owner username)")
  .option("--owner <username>", "filter by owner username")
  .option("--q <query>", "search query")
  .action(async (opts: { owner?: string; q?: string }) => {
    const client = getClient(program.opts());
    if (opts.owner) {
      out(await client.get("/ledgers/users/{username}", { username: opts.owner }));
    } else if (opts.q) {
      out(await client.get("/ledgers/search", undefined, { q: opts.q }));
    } else {
      out(await client.get("/ledgers"));
    }
  });

program
  .command("get-ledger <owner> <repo>")
  .description("get a specific ledger by owner and repo name")
  .action(async (owner: string, repo: string) => {
    const client = getClient(program.opts());
    out(await client.get("/ledgers/{owner}/{repo_name}", { owner, repo_name: repo }));
  });

program
  .command("delete-ledger <owner> <repo>")
  .description("delete a ledger (irreversible)")
  .action(async (owner: string, repo: string) => {
    const client = getClient(program.opts());
    out(await client.delete("/ledgers/{owner}/{repo_name}", { owner, repo_name: repo }));
  });

// --- Reports ---

program
  .command("overview <owner> <repo>")
  .description("get overview report for a ledger")
  .action(async (owner: string, repo: string) => {
    const client = getClient(program.opts());
    out(await client.get("/reports/{owner}/{repo_name}/overview", { owner, repo_name: repo }));
  });

program
  .command("balance-sheet <owner> <repo>")
  .description("get balance sheet report for a ledger")
  .option("--operating-currency <currency>", "operating currency (e.g. USD)")
  .action(async (owner: string, repo: string, opts: { operatingCurrency?: string }) => {
    const client = getClient(program.opts());
    const query = opts.operatingCurrency ? { operating_currency: opts.operatingCurrency } : undefined;
    out(await client.get("/reports/{owner}/{repo_name}/balance-sheet", { owner, repo_name: repo }, query));
  });

program
  .command("income-statement <owner> <repo>")
  .description("get income statement report for a ledger")
  .option("--operating-currency <currency>", "operating currency (e.g. USD)")
  .action(async (owner: string, repo: string, opts: { operatingCurrency?: string }) => {
    const client = getClient(program.opts());
    const query = opts.operatingCurrency ? { operating_currency: opts.operatingCurrency } : undefined;
    out(await client.get("/reports/{owner}/{repo_name}/income-statement", { owner, repo_name: repo }, query));
  });

program
  .command("trial-balance <owner> <repo>")
  .description("get trial balance report for a ledger")
  .option("--operating-currency <currency>", "operating currency (e.g. USD)")
  .action(async (owner: string, repo: string, opts: { operatingCurrency?: string }) => {
    const client = getClient(program.opts());
    const query = opts.operatingCurrency ? { operating_currency: opts.operatingCurrency } : undefined;
    out(await client.get("/reports/{owner}/{repo_name}/trial-balance", { owner, repo_name: repo }, query));
  });

program
  .command("errors <owner> <repo>")
  .description("get beancount validation errors for a ledger")
  .action(async (owner: string, repo: string) => {
    const client = getClient(program.opts());
    out(await client.get("/reports/{owner}/{repo_name}/errors", { owner, repo_name: repo }));
  });

program
  .command("accounts <owner> <repo>")
  .description("list all accounts in a ledger")
  .action(async (owner: string, repo: string) => {
    const client = getClient(program.opts());
    out(await client.get("/reports/{owner}/{repo_name}/accounts", { owner, repo_name: repo }));
  });

// --- Journal ---

program
  .command("journal <owner> <repo>")
  .description("get journal entries for a ledger")
  .option("--account <account>", "filter by account")
  .action(async (owner: string, repo: string, opts: { account?: string }) => {
    const client = getClient(program.opts());
    const query = opts.account ? { account: opts.account } : undefined;
    out(await client.get("/journal/{owner}/{repo_name}", { owner, repo_name: repo }, query));
  });

// --- Repo ---

program
  .command("commits <owner> <repo>")
  .description("get git commit history for a ledger")
  .action(async (owner: string, repo: string) => {
    const client = getClient(program.opts());
    out(await client.get("/repo/{owner}/{repo_name}/commits", { owner, repo_name: repo }));
  });

program.parseAsync().catch((err: unknown) => {
  console.error((err as Error).message ?? err);
  process.exit(1);
});
