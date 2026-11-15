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
import { DEFAULT_EXTERNAL_GITEA_HOST, type GiteaConfig } from "@/config/config";
import { isSelfHost } from "@/config/self-host";
import { externalGiteaBase } from "@/shared/gitea-utils";

const prLogger = logger.child({ module: "open-pull-request-tool" });

export interface OpenPullRequestToolDeps {
  gitea: GiteaConfig;
  ledgerOwner: string;
  ledgerName: string;
  ledgerUsername: string;
  ledgerPassword: string;
  /** Defaults to the SELF_HOST switch; a parameter so a test can set it. */
  selfHost?: boolean;
}

const inputSchema = z.object({
  title: z.string().min(1).describe("Pull request title."),
  body: z.string().default("").describe("Pull request description (Markdown)."),
  head: z
    .string()
    .min(1)
    .describe("The branch the change was pushed to (never `main`)."),
  base: z.string().default("main").describe("Target branch. Defaults to main."),
});

const outputSchema = z.object({
  ok: z.boolean(),
  prNumber: z.number().optional(),
  prUrl: z.string().optional(),
  error: z.string().optional(),
});

// Internal Gitea base for host→Gitea API calls (inside the compose network).
function internalGiteaBase(gitea: GiteaConfig): string {
  return gitea.internalBaseUrl;
}

/**
 * Whether a browser outside the deployment could open `url`.
 *
 * Gitea builds `html_url` from its own ROOT_URL. A Gitea that is a private
 * service has no public address, so that is its default `http://localhost:3000/`
 * or an internal service name (`gitea`, `beancount-gitea-x9k2`): loopback, or a
 * host with no dot. Handing one to a user is a dead link, so it counts as none.
 * An address on a private network by IP is kept: its own users can reach it.
 */
function isReachableByBrowser(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (host === "[::1]" || host === "[::]") return false;
  if (host === "0.0.0.0" || host.startsWith("127.")) return false;
  // An IPv6 literal keeps its brackets; anything else needs a dot to be more
  // than a name that only resolves inside the deployment.
  return host.startsWith("[") || host.includes(".");
}

/**
 * The link to hand back for a pull request just opened.
 *
 * The configured external host decides it, as it always has. The one exception
 * is a self-hosted stack that configured none: the built-in default is the
 * managed service's Git host, which is not theirs, so the address Gitea itself
 * returned (built from its own ROOT_URL) is used instead, and with none, or with
 * one no browser could open (see `isReachableByBrowser`), the link is left out
 * rather than pointing at somebody else's host or at nothing. The managed
 * service is never self-hosted, so it keeps its configured link.
 */
function pullRequestUrl(
  deps: OpenPullRequestToolDeps,
  pr: { number: number; html_url?: unknown },
): string | undefined {
  const { gitea, ledgerOwner, ledgerName } = deps;
  const configured = `${externalGiteaBase(gitea)}/${ledgerOwner}/${ledgerName}/pulls/${pr.number}`;
  // The address users clone from is this stack's Git proxy (`GIT_PUBLIC_URL`),
  // which forwards git's own requests and nothing else: Gitea has no public
  // address, so a pull request has no page to link to.
  if (gitea.cloneBaseIsGitProxy) return undefined;
  // A self-hosted stack that configured no host learned its address from Gitea
  // at start (`learnExternalGitHost` sets `externalBaseUrl` and moves `hostname`
  // off the built-in default, so the check below no longer sees an unconfigured
  // stack). A private Gitea reports a loopback or internal address there, and a
  // link built on it is dead: leave it out.
  if (gitea.externalBaseUrl) {
    return isReachableByBrowser(gitea.externalBaseUrl) ? configured : undefined;
  }
  const selfHost = deps.selfHost ?? isSelfHost();
  if (!selfHost || gitea.hostname !== DEFAULT_EXTERNAL_GITEA_HOST) {
    return configured;
  }
  return typeof pr.html_url === "string" &&
    /^https?:\/\//.test(pr.html_url) &&
    isReachableByBrowser(pr.html_url)
    ? pr.html_url
    : undefined;
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

    const pr = (await res.json()) as { number: number; html_url?: unknown };
    const prUrl = pullRequestUrl(deps, pr);
    prLogger.info("Opened PR", {
      ledgerOwner,
      ledgerName,
      prNumber: pr.number,
    });
    return { ok: true, prNumber: pr.number, ...(prUrl ? { prUrl } : {}) };
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
