import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { MCP_TOOLS } from "../mcp-tools";
import { RESOURCE_SCHEME } from "../mcp-resources";
import { ForbiddenError } from "@/shared/errors";
import type { AppConfig } from "@/config/config";
import type { ToolContext } from "../../tools/types";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;

const LEDGER = "alice/main";
const FILE_URI = `${RESOURCE_SCHEME}://alice/main/files/main.beancount`;

function ctx(
  getFilesContent: unknown,
  ledgerScope: string | undefined = LEDGER,
) {
  return {
    services: { ledgerShell: {}, ledgerRepo: { getFilesContent }, apiKey: {} },
    identity: {
      userId: "usr_1",
      method: "oauth",
      scopes: new Set(["ledger.read", "ledger.write"]),
      tokenId: "tok_1",
      ledgerScope,
      capabilityExempt: false,
    },
    ledgerId: LEDGER,
    llmService: {},
    ledgerReceiptWorkflow: {},
  } as unknown as ToolContext;
}

async function connect(toolCtx: ToolContext) {
  const server = assembleMcpRegistry(toolCtx, config);
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "1.0.0" });
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

const contentOf = (path: string, content: string) =>
  jest.fn().mockResolvedValue([{ path, content, sha: "abc" }]);

/**
 * ADR 0008 D2 — reads reach MCP as resources rather than tools, because a
 * resource does not compete for the model's tool selection. These assert what a
 * client actually receives, since the registry could register a template that
 * the SDK never publishes.
 */
describe("MCP resources", () => {
  it("advertises the resources capability", async () => {
    const { client, close } = await connect(
      ctx(contentOf("main.beancount", "")),
    );
    expect(client.getServerCapabilities()?.resources).toBeDefined();
    await close();
  });

  it("publishes the ledger-file template", async () => {
    const { client, close } = await connect(
      ctx(contentOf("main.beancount", "")),
    );

    const { resourceTemplates } = await client.listResourceTemplates();
    const template = resourceTemplates.find((t) => t.name === "ledgerFile");

    expect(template?.uriTemplate).toBe(
      `${RESOURCE_SCHEME}://{owner}/{name}/files/{+path}`,
    );
    await close();
  });

  it("reads a file through the same service the tool uses", async () => {
    const getFilesContent = contentOf(
      "main.beancount",
      "2024-01-01 open Assets:Cash\n",
    );
    const { client, close } = await connect(ctx(getFilesContent));

    const result = await client.readResource({ uri: FILE_URI });

    expect(result.contents[0]).toMatchObject({
      uri: FILE_URI,
      mimeType: "text/plain",
      text: "2024-01-01 open Assets:Cash\n",
    });
    expect(getFilesContent).toHaveBeenCalledWith(
      expect.objectContaining({ ledgerId: LEDGER, paths: ["main.beancount"] }),
    );
    await close();
  });

  /**
   * The property a resource layer is most likely to lose. Authorizing once when
   * the template list is built, then serving reads cheaply, is the obvious
   * implementation and it silently undoes ADR 0006 D4/D9 — the reason MCP stopped
   * authorizing per session in the first place. Revoke between two reads: the
   * second must fail.
   */
  it("refuses a read on the call after access is revoked", async () => {
    let granted = true;
    const getFilesContent = jest.fn().mockImplementation(async () => {
      if (!granted) throw new ForbiddenError("You no longer have access");
      return [{ path: "main.beancount", content: "ok", sha: "abc" }];
    });
    const { client, close } = await connect(ctx(getFilesContent));

    await expect(client.readResource({ uri: FILE_URI })).resolves.toMatchObject(
      {
        contents: [expect.objectContaining({ text: "ok" })],
      },
    );

    granted = false;

    await expect(client.readResource({ uri: FILE_URI })).rejects.toThrow(
      /no longer have access/i,
    );
    expect(getFilesContent).toHaveBeenCalledTimes(2);
    await close();
  });

  /**
   * ADR 0007 D11 lets a credential reach several ledgers, so the URI names one.
   * A pin must still win — otherwise a URI would be a way to widen a credential,
   * which is precisely what the pin exists to prevent.
   */
  it("refuses a URI naming a ledger the credential is not pinned to", async () => {
    const getFilesContent = contentOf("main.beancount", "ok");
    const { client, close } = await connect(ctx(getFilesContent));

    await expect(
      client.readResource({
        uri: `${RESOURCE_SCHEME}://bob/secret/files/main.beancount`,
      }),
    ).rejects.toThrow(/bound to alice\/main/);

    expect(getFilesContent).not.toHaveBeenCalled();
    await close();
  });

  it("does not grow the tool list", async () => {
    const { client, close } = await connect(
      ctx(contentOf("main.beancount", "")),
    );

    const { tools } = await client.listTools();

    expect(tools).toHaveLength(MCP_TOOLS.length);
    await close();
  });
});
