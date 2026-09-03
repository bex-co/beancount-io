// Mock the harness ESM value-imports: the workflow module imports
// @ai-sdk/harness-acp at top level, whose `import.meta.url` breaks Jest's
// CommonJS transform. This suite tests only the pure buildAuthenticatedCloneUrl.
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({
  createACP: () => ({}),
}));

import {
  ACP_PERMISSION_MODES,
  AskAgentWorkflow,
  buildAuthenticatedCloneUrl,
  configureSandboxRemote,
} from "../ask-agent-workflow";
import type { GiteaConfig } from "@/config/config";
import {
  AUTHORIZATION_ACTIONS,
  AuthorizationUnavailableError,
} from "@/server/api/authorization";

describe("buildAuthenticatedCloneUrl", () => {
  const localGitea: GiteaConfig = {
    hostname: "192.168.4.49",
    internalHostname: "gitea",
    httpPort: 3000,
    externalHttpPort: 3701,
    sshPort: 2223,
  } as GiteaConfig;

  it("embeds URL-encoded credentials into the http clone URL", () => {
    const url = buildAuthenticatedCloneUrl(
      localGitea,
      "alice/default",
      "un_abc",
      "p@ss:word",
    );
    // http (IP host) with creds, special chars encoded
    expect(url).toBe(
      "http://un_abc:p%40ss%3Aword@192.168.4.49:3701/alice/default.git",
    );
  });

  it("uses https for a production hostname", () => {
    const prodGitea = {
      ...localGitea,
      hostname: "git.beancount.io",
      externalHttpPort: 443,
    } as GiteaConfig;
    const url = buildAuthenticatedCloneUrl(
      prodGitea,
      "bob/books",
      "user",
      "secret",
    );
    expect(url.startsWith("https://user:secret@git.beancount.io/")).toBe(true);
  });
});

describe("ACP_PERMISSION_MODES", () => {
  // The ASK/AGENT split is the product's trust boundary (ADR 0005 修订 A), and
  // the ACP mapping is the only thing carrying it to the agent now that the
  // driver is protocol-mediated. Pin every mode id: a silent rename upstream
  // would otherwise downgrade AGENT from human-gated edits to something else.
  it("maps every harness permission mode to a claude-agent-acp session mode", () => {
    expect(ACP_PERMISSION_MODES).toEqual({
      "allow-reads": { type: "session-mode", modeId: "default" },
      "allow-edits": { type: "session-mode", modeId: "acceptEdits" },
      "allow-all": { type: "session-mode", modeId: "bypassPermissions" },
    });
  });

  it("maps AGENT to edit approval and ASK to read-only permission", () => {
    // AGENT edits the user's books, so it must NOT land on bypassPermissions.
    expect(ACP_PERMISSION_MODES["allow-edits"].modeId).not.toBe(
      "bypassPermissions",
    );
    expect(ACP_PERMISSION_MODES["allow-reads"].modeId).toBe("default");
  });
});

describe("sandbox Git authority", () => {
  it("removes the authenticated remote from a read-only session", async () => {
    const run = jest.fn().mockResolvedValue({
      exitCode: 0,
      stdout: "",
      stderr: "",
    });

    await configureSandboxRemote({
      session: { run } as never,
      accessMode: "read",
      cloneUrl: "https://user:secret@git.example.test/alice/main.git",
    });

    expect(run).toHaveBeenCalledWith({
      command: "git remote remove origin >/dev/null 2>&1 || true",
      workingDirectory: "/workspace/repo",
    });
    expect(JSON.stringify(run.mock.calls)).not.toContain("secret");
  });

  it("retains an authenticated remote only for an authorized writer", async () => {
    const run = jest.fn().mockResolvedValue({
      exitCode: 0,
      stdout: "",
      stderr: "",
    });

    await configureSandboxRemote({
      session: { run } as never,
      accessMode: "write",
      cloneUrl: "https://user:secret@git.example.test/alice/main.git",
    });

    expect(run.mock.calls[0][0].command).toContain("remote set-url origin");
    expect(run.mock.calls[0][0].command).toContain("user:secret");
  });
});

describe("AskAgentWorkflow authorization boundary", () => {
  it.each(["ask", "agent"] as const)(
    "authorizes read access for %s before quota, sandbox, clone, or stream work",
    async (mode) => {
      const unavailable = new AuthorizationUnavailableError(
        AUTHORIZATION_ACTIONS.AI_LEDGER_ASK,
      );
      const authorization = {
        authorize: jest.fn(),
        authorizeOrThrow: jest.fn().mockRejectedValue(unavailable),
      };
      const workflow = new AskAgentWorkflow({
        controlPlaneUrl: "https://sandbox.example.test",
        adminToken: "test-token",
        gitea: {
          hostname: "git.example.test",
          internalHostname: "gitea",
          httpPort: 3000,
          externalHttpPort: 443,
          sshPort: 22,
        } as GiteaConfig,
        model: "test-model",
        authorization,
      });
      const assertQuotaAvailable = jest.fn();
      const identity = {
        userId: "usr_1",
        method: "oauth" as const,
        scopes: new Set(["ledger.write"]),
        ledgerScope: "alice/main",
        capabilityExempt: false,
      };

      await expect(
        workflow.streamAnswer({
          prompt: "hello",
          ledgerId: "alice/main",
          ledgerOwner: "alice",
          ledgerName: "main",
          ledgerUsername: "alice",
          ledgerPassword: "password",
          conversationId: "conv_1",
          mode,
          identity,
          assertQuotaAvailable,
        }),
      ).rejects.toBe(unavailable);
      expect(authorization.authorizeOrThrow).toHaveBeenCalledWith({
        principal: identity,
        action: AUTHORIZATION_ACTIONS.AI_LEDGER_ASK,
        resource: "ledger:alice/main",
      });
      expect(authorization.authorize).not.toHaveBeenCalled();
      expect(assertQuotaAvailable).not.toHaveBeenCalled();
    },
  );
});
