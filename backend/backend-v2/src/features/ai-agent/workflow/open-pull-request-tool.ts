/**
 * `openPullRequest` — a host tool for the harness agent's edit/AGENT mode
 * (ADR 0005 / m17, t009). Claude Code, running in the sandbox, commits its
 * change on a new branch and pushes it (git in the container authenticates with
 * the ledger user's credentials, and the main-only proxy rule forces a
 * non-`main` branch). This tool then opens the PR against `main` on the host,
 * where the Gitea API and the user's credentials live — preserving the
 * propose-then-approve contract (a human gates the merge).
 */

import { tool } from "ai";
import { z } from "zod";
import { logger } from "@/shared/logger";
import type { GiteaConfig } from "@/config/config";

const prLogger = logger.child({ module: "open-pull-request-tool" });

export interface OpenPullRequestToolDeps {
  gitea: GiteaConfig;
  ledgerOwner: string;
  ledgerName: string;
  ledgerUsername: string;
  ledgerPassword: string;
}

const inputSchema = z.object({
  title: z.string().min(1).describe("Pull request title."),
  body: z
    .string()
    .default("")
    .describe("Pull request description (Markdown)."),
  head: z
    .string()
    .min(1)
    .describe("The branch the change was pushed to (never `main`)."),
  base: z
    .string()
    .default("main")
    .describe("Target branch. Defaults to main."),
});

const outputSchema = z.object({
  ok: z.boolean(),
  prNumber: z.number().optional(),
  prUrl: z.string().optional(),
  error: z.string().optional(),
});

// Internal Gitea base for host→Gitea API calls (inside the compose network).
function internalGiteaBase(gitea: GiteaConfig): string {
  return `http://${gitea.internalHostname}:${gitea.httpPort}`;
}

// External base for the human-clickable PR URL.
function externalGiteaBase(gitea: GiteaConfig): string {
  const isLocal =
    gitea.hostname === "localhost" ||
    gitea.hostname === "gitea" ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(gitea.hostname);
  const protocol = isLocal ? "http" : "https";
  const standardPort = isLocal ? 80 : 443;
  const portSuffix =
    gitea.externalHttpPort === standardPort
      ? ""
      : `:${gitea.externalHttpPort}`;
  return `${protocol}://${gitea.hostname}${portSuffix}`;
}

export async function openPullRequest(
  deps: OpenPullRequestToolDeps,
  input: { title: string; body: string; head: string; base: string },
): Promise<z.infer<typeof outputSchema>> {
  const { gitea, ledgerOwner, ledgerName, ledgerUsername, ledgerPassword } =
    deps;
  const url = `${internalGiteaBase(gitea)}/api/v1/repos/${ledgerOwner}/${ledgerName}/pulls`;
  const auth = Buffer.from(`${ledgerUsername}:${ledgerPassword}`).toString(
    "base64",
  );

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        title: input.title,
        body: input.body,
        head: input.head,
        base: input.base,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      prLogger.warn("Gitea PR creation failed", {
        status: res.status,
        body: text.slice(0, 200),
      });
      return {
        ok: false,
        error: `Gitea returned ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    const pr = (await res.json()) as { number: number };
    const prUrl = `${externalGiteaBase(gitea)}/${ledgerOwner}/${ledgerName}/pulls/${pr.number}`;
    prLogger.info("Opened PR", { ledgerOwner, ledgerName, prNumber: pr.number });
    return { ok: true, prNumber: pr.number, prUrl };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export function createOpenPullRequestTool(deps: OpenPullRequestToolDeps) {
  return tool({
    description:
      "Open a Gitea pull request from a pushed branch against main, after committing and pushing the change inside the sandbox. Returns the PR number and URL.",
    inputSchema,
    outputSchema,
    execute: async ({ title, body, head, base }) =>
      openPullRequest(deps, { title, body, head, base }),
  });
}
