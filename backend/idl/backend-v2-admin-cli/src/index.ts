#!/usr/bin/env npx tsx
import { configDotenv } from "dotenv";
const _envIdx = process.argv.indexOf("--env");
const _env = _envIdx !== -1 ? process.argv[_envIdx + 1] : (process.env["BV2_ENV"] ?? "prod");
configDotenv({ path: `.env.${_env}` });

import { Command } from "commander";
import { makeClient } from "./client.js";

function out(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

function getClient(opts: { baseUrl: string; token: string }) {
  if (!opts.token) {
    console.error("Error: admin token required (--token or BV2_ADMIN_TOKEN)");
    process.exit(1);
  }
  return makeClient(opts.baseUrl, opts.token);
}

const program = new Command("bv2-admin")
  .description("Beancount.io backend-v2 admin CLI")
  .option("--env <env>", "environment to use: prod | dev (default: prod)")
  .option(
    "--base-url <url>",
    "base URL of the backend API",
    process.env["BV2_BASE_URL"] ?? "https://api.v3.beancount.io",
  )
  .option(
    "--token <token>",
    "admin token (x-admin-token)",
    process.env["BV2_ADMIN_TOKEN"] ?? "",
  );

program
  .command("health")
  .description("deep health check (PostgreSQL, Redis, Ledger, Gitea, AI feature)")
  .action(async () => {
    const { baseUrl } = program.opts<{ baseUrl: string; token: string }>();
    const res = await fetch(`${baseUrl}/healthz`);
    out(await res.json());
  });

program
  .command("run-migrations")
  .description("apply all pending Drizzle database migrations")
  .action(async () => {
    const client = getClient(program.opts());
    out(await client.post("/api/admin/run-migrations"));
  });

program
  .command("prune-inactive-users")
  .description("block inactive users (no activation, short ledger, >3 months old)")
  .action(async () => {
    const client = getClient(program.opts());
    out(await client.post("/api/admin/prune-inactive-users"));
  });

program
  .command("login-as <email>")
  .description("generate JWT auth token for a user by email (admin impersonation)")
  .action(async (email: string) => {
    const client = getClient(program.opts());
    out(await client.post("/api/admin/login-as", { email }));
  });

program
  .command("unblock-user <email>")
  .description("unblock a user by email")
  .action(async (email: string) => {
    const client = getClient(program.opts());
    out(await client.post("/api/admin/unblock-user", { email }));
  });

program
  .command("delete-user <email>")
  .description("permanently delete a user and all associated data by email (GDPR / irreversible)")
  .action(async (email: string) => {
    const client = getClient(program.opts());
    out(await client.post("/api/admin/delete-user", { email }));
  });

program.parseAsync().catch((err: unknown) => {
  console.error((err as Error).message ?? err);
  process.exit(1);
});
