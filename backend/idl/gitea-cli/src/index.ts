#!/usr/bin/env npx tsx
import { configDotenv } from "dotenv";
const _envIdx = process.argv.indexOf("--env");
const _env = _envIdx !== -1 ? process.argv[_envIdx + 1] : (process.env["GITEA_ENV"] ?? "prod");
configDotenv({ path: `.env.${_env}` });

import { Command } from "commander";
import { makeClient } from "./client.js";

function out(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

function getClient(opts: { baseUrl: string; token: string }) {
  if (!opts.token) {
    console.error("Error: Gitea token required (--token or GITEA_TOKEN)");
    process.exit(1);
  }
  return makeClient(opts.baseUrl, opts.token);
}

const program = new Command("gitea")
  .description("Web Beancount Gitea admin CLI")
  .option("--env <env>", "environment to use: prod | dev (default: prod)")
  .option(
    "--base-url <url>",
    "base URL of the Gitea instance",
    process.env["GITEA_BASE_URL"] ?? "https://git.v3.beancount.io",
  )
  .option(
    "--token <token>",
    "Gitea API token",
    process.env["GITEA_TOKEN"] ?? "",
  );

program
  .command("health")
  .description("check Gitea service health")
  .action(async () => {
    const { baseUrl } = program.opts<{ baseUrl: string; token: string }>();
    const res = await fetch(`${baseUrl}/api/v1/version`);
    out(res.ok ? await res.json() : { status: "error", code: res.status });
  });

// --- Admin: users ---

program
  .command("list-users")
  .description("list all users (admin)")
  .option("--limit <n>", "max results", "50")
  .option("--page <n>", "page number", "1")
  .action(async (opts: { limit: string; page: string }) => {
    const client = getClient(program.opts());
    out(await client.get("/admin/users", undefined, { limit: opts.limit, page: opts.page }));
  });

program
  .command("create-user")
  .description("create a new Gitea user (admin)")
  .requiredOption("--login <login>", "login username")
  .requiredOption("--email <email>", "user email")
  .requiredOption("--password <password>", "user password")
  .option("--source-id <n>", "authentication source ID", "0")
  .option("--login-name <name>", "login name (defaults to --login)")
  .action(async (opts: { login: string; email: string; password: string; sourceId: string; loginName?: string }) => {
    const client = getClient(program.opts());
    out(
      await client.post("/admin/users", {
        login_name: opts.loginName ?? opts.login,
        username: opts.login,
        email: opts.email,
        password: opts.password,
        source_id: parseInt(opts.sourceId, 10),
        must_change_password: false,
      }),
    );
  });

program
  .command("delete-user <username>")
  .description("delete a Gitea user (admin) — purges all repos")
  .option("--purge", "purge all user repositories", false)
  .action(async (username: string, opts: { purge: boolean }) => {
    const client = getClient(program.opts());
    const query = opts.purge ? { purge: "true" } : undefined;
    const path = `/admin/users/${encodeURIComponent(username)}${query ? `?purge=true` : ""}`;
    const { baseUrl, token } = program.opts<{ baseUrl: string; token: string }>();
    const res = await fetch(`${baseUrl}/api/v1${path}`, {
      method: "DELETE",
      headers: { Authorization: `token ${token}` },
    });
    out(res.status === 204 ? { ok: true } : { status: "error", code: res.status });
  });

// --- Users ---

program
  .command("get-user <username>")
  .description("get info for a Gitea user")
  .action(async (username: string) => {
    const client = getClient(program.opts());
    out(await client.get(`/users/${username}`));
  });

program
  .command("search-users <keyword>")
  .description("search Gitea users by keyword")
  .option("--limit <n>", "max results", "20")
  .action(async (keyword: string, opts: { limit: string }) => {
    const client = getClient(program.opts());
    out(await client.get("/users/search", undefined, { q: keyword, limit: opts.limit }));
  });

// --- Repositories ---

program
  .command("get-repo <owner> <repo>")
  .description("get info for a Gitea repository")
  .action(async (owner: string, repo: string) => {
    const client = getClient(program.opts());
    out(await client.get(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`));
  });

program
  .command("delete-repo <owner> <repo>")
  .description("delete a Gitea repository (irreversible)")
  .action(async (owner: string, repo: string) => {
    const client = getClient(program.opts());
    out(await client.delete(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`));
  });

program
  .command("list-repos <owner>")
  .description("list repositories for a user")
  .option("--limit <n>", "max results", "50")
  .option("--page <n>", "page number", "1")
  .action(async (owner: string, opts: { limit: string; page: string }) => {
    const client = getClient(program.opts());
    out(await client.get(`/repos/search`, undefined, { q: "", uid: "0", limit: opts.limit, page: opts.page, owner }));
  });

program
  .command("search-repos <query>")
  .description("search Gitea repositories")
  .option("--limit <n>", "max results", "20")
  .action(async (query: string, opts: { limit: string }) => {
    const client = getClient(program.opts());
    out(await client.get("/repos/search", undefined, { q: query, limit: opts.limit }));
  });

program
  .command("list-commits <owner> <repo>")
  .description("list commits for a repository")
  .option("--sha <sha>", "branch/tag/commit SHA to start from")
  .option("--limit <n>", "max results", "20")
  .action(async (owner: string, repo: string, opts: { sha?: string; limit: string }) => {
    const client = getClient(program.opts());
    const query: Record<string, string> = { limit: opts.limit };
    if (opts.sha) query["sha"] = opts.sha;
    out(
      await client.get(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits`,
        undefined,
        query,
      ),
    );
  });

program.parseAsync().catch((err: unknown) => {
  console.error((err as Error).message ?? err);
  process.exit(1);
});
