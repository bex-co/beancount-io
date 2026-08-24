// Mock the harness ESM value-imports: the workflow module imports
// @ai-sdk/harness-acp at top level, whose `import.meta.url` breaks Jest's
// CommonJS transform. This suite tests only the pure buildAuthenticatedCloneUrl.
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({
  createACP: () => ({}),
}));

import {
  ACP_PERMISSION_MODES,
  buildAuthenticatedCloneUrl,
} from "../ask-agent-workflow";
import type { GiteaConfig } from "@/config/config";

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

  it("keeps AGENT on a mode that still gates edits, and ASK unrestricted", () => {
    // AGENT edits the user's books, so it must NOT land on bypassPermissions.
    expect(ACP_PERMISSION_MODES["allow-edits"].modeId).not.toBe(
      "bypassPermissions",
    );
    // ASK is read-only in a throwaway clone; approval prompts would just stall
    // a UI that has nowhere to show them.
    expect(ACP_PERMISSION_MODES["allow-all"].modeId).toBe("bypassPermissions");
  });
});
