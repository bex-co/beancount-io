// Mock the harness ESM value-imports: the workflow module imports
// @ai-sdk/harness-claude-code at top level, whose `import.meta.url` breaks Jest's
// CommonJS transform. This suite tests only the pure buildAuthenticatedCloneUrl.
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-claude-code", () => ({
  createClaudeCode: () => ({}),
}));

import { buildAuthenticatedCloneUrl } from "../ask-agent-workflow";
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
