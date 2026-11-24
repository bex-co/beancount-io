import "reflect-metadata";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { MCP_TOOLS } from "../mcp-tools";
import type { McpError } from "@modelcontextprotocol/sdk/types.js";
import { MCP_RESOURCES, RESOURCE_SCHEME } from "../mcp-resources";
import { JSON_RPC_INVALID_PARAMS, JSON_RPC_NOT_FOUND } from "../mcp-errors";
import { ForbiddenError } from "@/shared/errors";
import { ARGUMENT_LIMITS } from "@/shared/argument-limits";
import type { AppConfig } from "@/config/config";
import type { ToolContext } from "../../tools/types";
import type { McpRequestContext } from "../mcp-context";

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
    },
    ledgerId: LEDGER,
    llmService: {},
    ledgerReceiptWorkflow: {},
  } as unknown as McpRequestContext;
}

async function connect(toolCtx: McpRequestContext) {
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
    ).rejects.toThrow(/ledger restriction/);

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

describe("MCP per-call ledger selection", () => {
  it.each([
    [LEDGER, undefined, LEDGER],
    [LEDGER, LEDGER, LEDGER],
    [undefined, "bob/books", "bob/books"],
  ])(
    "selects target for pin %s and argument %s",
    async (pin, ledger, expected) => {
      const queryShellText = jest
        .fn()
        .mockResolvedValue({ text: "Assets:Cash 42 USD" });
      const context: McpRequestContext = {
        ...ctx(contentOf("main.beancount", "")),
        ledgerId: undefined,
      };
      context.identity = { ...context.identity, ledgerScope: pin };
      context.services = {
        ...context.services,
        ledgerShell: {
          queryShellText,
        } as unknown as ToolContext["services"]["ledgerShell"],
      };
      const { client, close } = await connect(context);
      try {
        const result = await client.callTool({
          name: "runBqlQuery",
          arguments: { query: "BALANCES", ...(ledger ? { ledger } : {}) },
        });
        expect(result.isError).not.toBe(true);
        expect(result.structuredContent).toMatchObject({
          ok: true,
          result: "Assets:Cash 42 USD",
        });
        expect(queryShellText).toHaveBeenCalledWith({
          identity: context.identity,
          ledgerId: expected,
          query: "BALANCES",
        });
        expect(context.identity.ledgerScope).toBe(pin);
      } finally {
        await close();
      }
    },
  );

  it.each([
    [LEDGER, "bob/books"],
    [undefined, undefined],
    [undefined, "alice/main/extra"],
    [undefined, "alice/%2Fmain"],
    [undefined, ""],
  ])(
    "refuses invalid selection before domain work (%s, %s)",
    async (pin, ledger) => {
      const queryShellText = jest.fn();
      const context: McpRequestContext = {
        ...ctx(contentOf("main.beancount", "")),
        ledgerId: undefined,
      };
      context.identity = { ...context.identity, ledgerScope: pin };
      context.services = {
        ...context.services,
        ledgerShell: {
          queryShellText,
        } as unknown as ToolContext["services"]["ledgerShell"],
      };
      const { client, close } = await connect(context);
      try {
        const result = await client.callTool({
          name: "runBqlQuery",
          arguments: {
            query: "BALANCES",
            ...(ledger === undefined ? {} : { ledger }),
          },
        });
        expect(result.isError).toBe(true);
        expect(queryShellText).not.toHaveBeenCalled();
      } finally {
        await close();
      }
    },
  );

  it("allows account tools and URI-selected reads without a ledger default", async () => {
    const getFilesContent = contentOf(
      "main.beancount",
      "2026-01-01 open Assets:Cash",
    );
    const listLedgers = jest.fn().mockResolvedValue([]);
    const context: McpRequestContext = {
      ...ctx(getFilesContent),
      ledgerId: undefined,
    };
    context.identity = { ...context.identity, ledgerScope: undefined };
    context.ledgerWorkflow = {
      ...context.ledgerWorkflow,
      listLedgers,
    } as unknown as McpRequestContext["ledgerWorkflow"];
    const { client, close } = await connect(context);
    try {
      const ledgers = await client.callTool({
        name: "listLedgers",
        arguments: {},
      });
      expect(ledgers.isError).not.toBe(true);
      expect(listLedgers).toHaveBeenCalledWith(
        expect.objectContaining({ identity: context.identity }),
      );
      const file = await client.readResource({ uri: FILE_URI });
      expect(file.contents[0]).toMatchObject({
        text: "2026-01-01 open Assets:Cash",
      });
      expect(getFilesContent).toHaveBeenCalledWith(
        expect.objectContaining({ ledgerId: LEDGER }),
      );
    } finally {
      await close();
    }
  });
});

describe("resource path encoding", () => {
  it("decodes a nested file path exactly once", async () => {
    const path = "receipts/café 100%25.bean";
    const getFilesContent = contentOf(path, "ledger contents");
    const { client, close } = await connect(ctx(getFilesContent));
    try {
      const result = await client.readResource({
        uri: `beancount://alice/main/files/${path.split("/").map(encodeURIComponent).join("/")}`,
      });
      expect(result.contents[0]).toMatchObject({ text: "ledger contents" });
      expect(getFilesContent).toHaveBeenCalledWith(
        expect.objectContaining({ paths: [path] }),
      );
    } finally {
      await close();
    }
  });

  it("refuses malformed percent encoding before reading", async () => {
    const getFilesContent = contentOf("main.beancount", "");
    const { client, close } = await connect(ctx(getFilesContent));
    try {
      await expect(
        client.readResource({ uri: "beancount://alice/main/files/%ZZ" }),
      ).rejects.toThrow(/encoding/);
      expect(getFilesContent).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  // w31/069: resources/list must percent-encode each segment of files/{+path}
  // so every listed URI round-trips directly into resources/read.
  it("lists segment-encoded file URIs that round-trip through resources/read", async () => {
    const cases: ReadonlyArray<
      readonly [path: string, expectedEncoded: string]
    > = [
      ["main.bean", "main.bean"],
      ["2026/expenses.bean", "2026/expenses.bean"],
      ["qa-20261123-a#1.bean", "qa-20261123-a%231.bean"],
      ["2026/acct#1.bean", "2026/acct%231.bean"],
      ["q?v=1&b=2.bean", "q%3Fv%3D1%26b%3D2.bean"],
      ["tax 100%.bean", "tax%20100%25.bean"],
      ["literal%25.bean", "literal%2525.bean"],
      [
        "receipts/café 100%25 #1?a.bean",
        "receipts/caf%C3%A9%20100%2525%20%231%3Fa.bean",
      ],
    ];
    const contentsByPath = new Map(
      cases.map(([path]) => [path, `content:${path}`]),
    );
    const getFilesContent = jest.fn(async ({ paths }: { paths: string[] }) =>
      paths
        .filter((p) => contentsByPath.has(p))
        .map((p) => ({
          path: p,
          content: contentsByPath.get(p)!,
          sha: "abc",
        })),
    );
    const base = ctx(getFilesContent);
    const context: McpRequestContext = {
      ...base,
      services: {
        ...base.services,
        ledgerData: {
          getSourceFiles: jest
            .fn()
            .mockResolvedValue(cases.map(([path]) => path)),
        },
      } as unknown as McpRequestContext["services"],
    };
    const { client, close } = await connect(context);
    try {
      const { resources } = await client.listResources();
      const fileUris = resources
        .map((resource) => resource.uri)
        .filter((uri) =>
          uri.startsWith(`${RESOURCE_SCHEME}://${LEDGER}/files/`),
        );

      expect(fileUris).toEqual(
        cases.map(
          ([, encoded]) => `${RESOURCE_SCHEME}://${LEDGER}/files/${encoded}`,
        ),
      );

      for (let i = 0; i < cases.length; i += 1) {
        const [originalPath] = cases[i];
        const uri = fileUris[i];
        const result = await client.readResource({ uri });
        expect(result.contents[0]).toMatchObject({
          uri,
          text: `content:${originalPath}`,
        });
        expect(getFilesContent).toHaveBeenLastCalledWith(
          expect.objectContaining({
            ledgerId: LEDGER,
            paths: [originalPath],
          }),
        );
      }
    } finally {
      await close();
    }
  });
});

/**
 * w1/036. The SDK matches a URI before any read callback runs, so a malformed
 * one refused during matching could not be translated downstream: it arrived
 * as `-32603` with no `data`, which tells an agent to retry rather than to fix
 * the request.
 */
describe("a malformed resource URI", () => {
  const TRIAL = `${RESOURCE_SCHEME}://alice/main/trial-balance`;

  it.each([
    [`${TRIAL}?unknown=1`, "Unknown or repeated resource parameter: unknown"],
    [
      `${TRIAL}?time=2026&time=2025`,
      "Unknown or repeated resource parameter: time",
    ],
    [
      `${FILE_URI}?unknown=1`,
      "Unknown or repeated resource parameter: unknown",
    ],
    [
      `${RESOURCE_SCHEME}://alice/main/errors#qa`,
      "Resource fragments are not supported",
    ],
    // w31/063: WHATWG `new URL(...).hash` is `""` for a bare trailing `#`, so
    // an empty fragment bypassed `if (url.hash)` on every resource shape.
    [
      `${RESOURCE_SCHEME}://alice/main/errors#`,
      "Resource fragments are not supported",
    ],
    [`${TRIAL}?time=2026#`, "Resource fragments are not supported"],
    [`${FILE_URI}#`, "Resource fragments are not supported"],
    [
      `${RESOURCE_SCHEME}://configuration/health#`,
      "Resource fragments are not supported",
    ],
    [
      `${RESOURCE_SCHEME}://alice/main/files/%E0%A4`,
      "Invalid URI encoding in resource path",
    ],
    // w1/201: a query value kept its invalid `%XX` literally and answered an
    // empty success, where the same input in a path was refused.
    [`${TRIAL}?time=%ZZ`, "Invalid URI encoding in resource parameter time"],
    [
      `${RESOURCE_SCHEME}://alice/main/journal?account=%E0%A4%A`,
      "Invalid URI encoding in resource parameter account",
    ],
  ])("refuses %s as a coded, hinted BAD_USER_INPUT", async (uri, message) => {
    const getFilesContent = contentOf("main.beancount", "");
    const { client, close } = await connect(ctx(getFilesContent));
    try {
      const { resourceTemplates } = await client.listResourceTemplates();
      expect(
        resourceTemplates.some((t) =>
          t.uriTemplate.startsWith(
            `${RESOURCE_SCHEME}://{owner}/{name}/trial-balance{?`,
          ),
        ),
      ).toBe(true);
      const error = await client
        .readResource({ uri })
        .then(() => undefined)
        .catch((caught: unknown) => caught as McpError);
      expect(error?.code).toBe(JSON_RPC_INVALID_PARAMS);
      expect(error?.data).toMatchObject({
        code: "BAD_USER_INPUT",
        message,
        hint: expect.stringMatching(/\S/),
      });
      // One prefix — the client's own — then the lines a tool refusal
      // leads with, so a host that shows only the message reads the hint.
      expect(error?.message).toBe(
        `MCP error ${JSON_RPC_INVALID_PARAMS}: BAD_USER_INPUT: ${message}\nHint: ${(error?.data as { hint: string }).hint}`,
      );
      expect(getFilesContent).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  // w1/201: every template that reads a query refuses a value it cannot
  // decode — the matcher is shared, and this keeps it so for new templates.
  it.each(
    MCP_RESOURCES.filter((d) => (d.queryNames ?? []).length > 0).map((d) => [
      d.name,
      `${d.uriTemplate
        .replace("{owner}", "alice")
        .replace("{name}", "main")
        .replace(/\{[^}]+\}/g, "x")}?${d.queryNames![0]}=%ZZ`,
      d.queryNames![0],
    ]),
  )("refuses a malformed query value on %s", async (_name, uri, param) => {
    const { client, close } = await connect(
      ctx(contentOf("main.beancount", "")),
    );
    try {
      const error = await client
        .readResource({ uri })
        .then(() => undefined)
        .catch((caught: unknown) => caught as McpError);
      expect(error?.code).toBe(JSON_RPC_INVALID_PARAMS);
      expect(error?.data).toMatchObject({
        code: "BAD_USER_INPUT",
        message: `Invalid URI encoding in resource parameter ${param}`,
      });
    } finally {
      await close();
    }
  });

  it("names the parameters a template does accept", async () => {
    const { client, close } = await connect(
      ctx(contentOf("main.beancount", "")),
    );
    try {
      const error = await client
        .readResource({ uri: `${TRIAL}?unknown=1` })
        .then(() => undefined)
        .catch((caught: unknown) => caught as McpError);
      expect((error?.data as { hint: string }).hint).toContain("`time`");
    } finally {
      await close();
    }
  });

  it("allows percent-encoded %23 in resource paths and query parameters", async () => {
    const getFilesContent = contentOf("notes#1.beancount", "hash path ok");
    const getAssetDownloadUrl = jest
      .fn()
      .mockResolvedValue("https://cdn.example/receipt.pdf");
    const context: McpRequestContext = {
      ...ctx(getFilesContent),
      ledgerAssetService: {
        getAssetDownloadUrl,
      } as unknown as McpRequestContext["ledgerAssetService"],
    };
    const { client, close } = await connect(context);
    try {
      const file = await client.readResource({
        uri: `${RESOURCE_SCHEME}://alice/main/files/notes%231.beancount`,
      });
      expect(file.contents[0]).toMatchObject({ text: "hash path ok" });
      expect(getFilesContent).toHaveBeenCalledWith(
        expect.objectContaining({ paths: ["notes#1.beancount"] }),
      );

      const asset = await client.readResource({
        uri: `${RESOURCE_SCHEME}://assets/download-url?ledgerRepoId=42&filename=receipt%231.pdf`,
      });
      expect(asset.contents[0]).toMatchObject({
        text: JSON.stringify({
          downloadUrl: "https://cdn.example/receipt.pdf",
        }),
      });
      expect(getAssetDownloadUrl).toHaveBeenCalledWith(
        42,
        "receipt#1.pdf",
        context.identity,
      );
    } finally {
      await close();
    }
  });
});

/**
 * w1/187. A bare read of a template whose query name is required said what zod
 * says about nothing: "expected number, received NaN" for a coerced number and
 * "expected string, received undefined" for a string. It names the missing
 * name instead, as `temp-assets/download-url` already did.
 */
describe("a bare read of a required query name", () => {
  const reads = {
    getPullRequestDetails: jest.fn(),
    getCollaboratorPermission: jest.fn(),
    suggestCategories: jest.fn(),
  };
  const adminCtx = () => {
    const base = ctx(contentOf("main.beancount", ""));
    return {
      ...base,
      identity: {
        ...base.identity,
        scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
      },
      pullRequestWorkflow: reads,
      collaboratorsWorkflow: reads,
      llmService: reads,
    } as unknown as McpRequestContext;
  };
  afterEach(() => {
    // Every refusal lands before the read reaches its workflow.
    expect(reads.getPullRequestDetails).not.toHaveBeenCalled();
    expect(reads.getCollaboratorPermission).not.toHaveBeenCalled();
    expect(reads.suggestCategories).not.toHaveBeenCalled();
  });
  const refusalFor = async (uri: string) => {
    const { client, close } = await connect(adminCtx());
    try {
      return await client
        .readResource({ uri })
        .then(() => undefined)
        .catch((caught: unknown) => caught as McpError);
    } finally {
      await close();
    }
  };

  it.each([
    [`${RESOURCE_SCHEME}://alice/main/pull-request`, "prNumber is required"],
    [`${RESOURCE_SCHEME}://alice/main/commit-details`, "sha is required"],
    [
      `${RESOURCE_SCHEME}://alice/main/collaborators/permission`,
      "collaborator is required",
    ],
    [
      `${RESOURCE_SCHEME}://alice/main/narration-transactions`,
      "narration is required",
    ],
    [`${RESOURCE_SCHEME}://social/profile`, "username is required"],
    [
      `${RESOURCE_SCHEME}://alice/main/import/suggest-categories`,
      "transactions is required",
    ],
    [
      `${RESOURCE_SCHEME}://assets/download-url?filename=a.pdf`,
      "ledgerRepoId is required",
    ],
    [
      `${RESOURCE_SCHEME}://assets/download-url`,
      "ledgerRepoId, filename are required",
    ],
  ])("refuses %s naming the missing name", async (uri, message) => {
    const error = await refusalFor(uri);
    expect(error?.code).toBe(JSON_RPC_INVALID_PARAMS);
    expect(error?.data).toMatchObject({
      code: "BAD_USER_INPUT",
      message,
      hint: expect.stringContaining("resources/templates/list"),
    });
  });

  it("keeps zod's words for a name that is present but wrong", async () => {
    const error = await refusalFor(
      `${RESOURCE_SCHEME}://alice/main/pull-request?prNumber=abc`,
    );
    expect(error?.data).toMatchObject({
      code: "BAD_USER_INPUT",
      message: expect.stringMatching(/^prNumber: /),
    });
    expect((error?.data as { message: string }).message).not.toContain(
      "is required",
    );
  });
});

/**
 * w5/041. The SDK parsed the URI with `new URL()` before consulting any
 * template, so a string that is not a URI at all threw a bare `TypeError`:
 * `-32603 Invalid URL` with no `data`. A URI in another scheme parsed, matched
 * nothing — not even the `beancount://` catch-all — and got the SDK's own
 * uncoded "not found".
 */
describe("a resource URI the SDK refused before any template", () => {
  it.each(["not-a-uri", "", "beancount//alice/main/errors"])(
    "refuses the unparseable %j as a coded, hinted BAD_USER_INPUT",
    async (uri) => {
      const getFilesContent = contentOf("main.beancount", "");
      const { client, close } = await connect(ctx(getFilesContent));
      try {
        const error = await client
          .readResource({ uri })
          .then(() => undefined)
          .catch((caught: unknown) => caught as McpError);
        expect(error?.code).toBe(JSON_RPC_INVALID_PARAMS);
        expect(error?.data).toMatchObject({
          code: "BAD_USER_INPUT",
          hint: expect.stringContaining("resources/templates/list"),
        });
        // One prefix — the client's own — and not the SDK's "Invalid URL".
        expect(error?.message).toBe(
          `MCP error ${JSON_RPC_INVALID_PARAMS}: BAD_USER_INPUT: Not a resource URI: ${uri}\nHint: ${(error?.data as { hint: string }).hint}`,
        );
        expect(getFilesContent).not.toHaveBeenCalled();
      } finally {
        await close();
      }
    },
  );

  it("refuses a URI in another scheme as a coded NOT_FOUND", async () => {
    const { client, close } = await connect(
      ctx(contentOf("main.beancount", "")),
    );
    try {
      const error = await client
        .readResource({ uri: "https://example.com/alice/main/errors" })
        .then(() => undefined)
        .catch((caught: unknown) => caught as McpError);
      expect(error?.code).toBe(-32002);
      expect(error?.data).toMatchObject({
        code: "NOT_FOUND",
        hint: expect.stringContaining("resources/templates/list"),
      });
    } finally {
      await close();
    }
  });

  it("does not echo an oversized unparseable URI back in full", async () => {
    const { client, close } = await connect(
      ctx(contentOf("main.beancount", "")),
    );
    try {
      const error = await client
        .readResource({ uri: "x".repeat(5000) })
        .then(() => undefined)
        .catch((caught: unknown) => caught as McpError);
      expect((error?.data as { message: string }).message.length).toBeLessThan(
        200,
      );
    } finally {
      await close();
    }
  });
});

/**
 * w4/070. An unmatched `beancount://` URI was refused by the SDK before any
 * handler of ours ran, so it arrived as `-32602` with no `data.code`, no hint,
 * and `MCP error -32602:` stamped on twice — the exact dialect w2/m28:t003
 * replaced everywhere it could reach.
 */
describe("an unmatched resource URI", () => {
  const unmatched = [
    `${RESOURCE_SCHEME}://alice/main/nosuch`,
    // Shaped like a template but registered as none of them; this is the URI
    // the prompt-list guard was written for.
    `${RESOURCE_SCHEME}://alice/main/bank/list`,
  ];

  it.each(unmatched)("answers %s as a coded, hinted NOT_FOUND", async (uri) => {
    const { client, close } = await connect(
      ctx(contentOf("main.beancount", "")),
    );
    try {
      const error = await client
        .readResource({ uri })
        .then(() => undefined)
        .catch((caught: unknown) => caught as McpError);
      expect(error?.code).toBe(JSON_RPC_NOT_FOUND);
      expect(error?.data).toMatchObject({
        code: "NOT_FOUND",
        hint: expect.stringContaining("resources/templates/list"),
      });
      // Exactly one prefix: the client's own. A server that threw the SDK's
      // `McpError` would have stamped the first.
      expect(error?.message).toBe(
        `MCP error ${JSON_RPC_NOT_FOUND}: NOT_FOUND: Resource with ID '${uri}' not found\nHint: ${(error?.data as { hint: string }).hint}`,
      );
    } finally {
      await close();
    }
  });

  it("does not shadow a template that does match", async () => {
    const getFilesContent = contentOf("main.beancount", "contents");
    const { client, close } = await connect(ctx(getFilesContent));
    try {
      const result = await client.readResource({ uri: FILE_URI });
      expect(result.contents[0]).toMatchObject({ text: "contents" });
    } finally {
      await close();
    }
  });
});

/**
 * w31/065. Resource reads enforce the same argument limits as tools, REST and
 * GraphQL: raw/percent-encoded NUL, unpaired surrogates (refused before
 * `new URL` rewrites them to U+FFFD), over-limit URIs, and hostile values
 * inside `jsonQuery`-decoded JSON parameters.
 */
describe("argument limits on resource reads (w31/065)", () => {
  const services = () => {
    const getFilesContent = contentOf("main.beancount", "ok");
    const getNarrationTransactions = jest.fn();
    const getPayeeTransactions = jest.fn();
    const getPayeeAccounts = jest.fn();
    const getJournal = jest.fn();
    const suggestCategories = jest.fn();
    const base = ctx(getFilesContent);
    const context = {
      ...base,
      services: {
        ...base.services,
        ledgerData: {
          getNarrationTransactions,
          getPayeeTransactions,
          getPayeeAccounts,
        },
        ledgerJournal: { getJournal },
      },
      llmService: { suggestCategories },
    } as unknown as McpRequestContext;
    return {
      context,
      spies: {
        getFilesContent,
        getNarrationTransactions,
        getPayeeTransactions,
        getPayeeAccounts,
        getJournal,
        suggestCategories,
      },
    };
  };

  it.each([
    [
      "percent-encoded NUL in query parameter",
      `${RESOURCE_SCHEME}://alice/main/narration-transactions?narration=foo%00bar`,
      /narration.*NUL/,
    ],
    [
      "percent-encoded NUL in public config query parameter",
      `${RESOURCE_SCHEME}://configuration/feature-flags?userId=foo%00bar`,
      /userId.*NUL/,
    ],
    [
      "percent-encoded NUL in payee-transactions path parameter",
      `${RESOURCE_SCHEME}://alice/main/payee-transactions/foo%00bar`,
      /payee.*NUL/,
    ],
    [
      "percent-encoded NUL in payee-accounts path parameter",
      `${RESOURCE_SCHEME}://alice/main/payee-accounts/foo%00bar`,
      /payee.*NUL/,
    ],
    [
      "percent-encoded NUL in file path parameter",
      `${RESOURCE_SCHEME}://alice/main/files/a%00b.beancount`,
      /path.*NUL/,
    ],
    [
      "raw NUL in URI",
      `${RESOURCE_SCHEME}://alice/main/narration-transactions?narration=foo\u0000bar`,
      /uri.*NUL/,
    ],
    [
      "unpaired surrogate in raw URI (before new URL U+FFFD replacement)",
      `${RESOURCE_SCHEME}://alice/main/narration-transactions?narration=foo\ud800bar`,
      /uri.*unpaired surrogate/,
    ],
    [
      "over-limit URI",
      `${RESOURCE_SCHEME}://alice/main/narration-transactions?narration=${"a".repeat(ARGUMENT_LIMITS.maxStringLength + 1)}`,
      new RegExp(`uri.*${ARGUMENT_LIMITS.maxStringLength}`),
    ],
    [
      "JSON-escaped NUL inside suggest-categories transactions",
      `${RESOURCE_SCHEME}://alice/main/import/suggest-categories?transactions=${encodeURIComponent('[{"rowIndex":0,"date":"2026-01-01","payee":"foo\\u0000bar","description":"x","amount":1}]')}`,
      /transactions\[\]\.payee.*NUL/,
    ],
    [
      "JSON-escaped unpaired surrogate inside suggest-categories transactions",
      `${RESOURCE_SCHEME}://alice/main/import/suggest-categories?transactions=${encodeURIComponent('[{"rowIndex":0,"date":"2026-01-01","payee":"foo\\ud800bar","description":"x","amount":1}]')}`,
      /transactions\[\]\.payee.*unpaired surrogate/,
    ],
    [
      "JSON-escaped NUL inside journal directiveTypes",
      `${RESOURCE_SCHEME}://alice/main/journal?directiveTypes=${encodeURIComponent('["Trans\\u0000action"]')}`,
      /directiveTypes\[\].*NUL/,
    ],
    [
      "over-limit array inside journal directiveTypes",
      `${RESOURCE_SCHEME}://alice/main/journal?directiveTypes=${encodeURIComponent(JSON.stringify(new Array(ARGUMENT_LIMITS.maxArrayLength + 1).fill("a")))}`,
      new RegExp(`directiveTypes.*${ARGUMENT_LIMITS.maxArrayLength}`),
    ],
    [
      "over-depth JSON nesting inside journal directiveTypes",
      `${RESOURCE_SCHEME}://alice/main/journal?directiveTypes=${encodeURIComponent(
        `${"[".repeat(ARGUMENT_LIMITS.maxDepth + 1)}"x"${"]".repeat(ARGUMENT_LIMITS.maxDepth + 1)}`,
      )}`,
      new RegExp(`${ARGUMENT_LIMITS.maxDepth} levels deep`),
    ],
  ])(
    "refuses %s as BAD_USER_INPUT before any service",
    async (_label, uri, pattern) => {
      const { context, spies } = services();
      const { client, close } = await connect(context);
      try {
        const error = await client
          .readResource({ uri })
          .then(() => undefined)
          .catch((caught: unknown) => caught as McpError);
        expect(error?.code).toBe(JSON_RPC_INVALID_PARAMS);
        expect(error?.data).toMatchObject({
          code: "BAD_USER_INPUT",
          message: expect.stringMatching(pattern),
          hint: expect.stringContaining("resources/templates/list"),
        });
        expect((error?.data as { hint: string }).hint).not.toContain(
          "unknownResource",
        );
        for (const spy of Object.values(spies)) {
          expect(spy).not.toHaveBeenCalled();
        }
      } finally {
        await close();
      }
    },
  );

  it("still allows valid UTF-8 and paired surrogate emoji in paths and JSON query params", async () => {
    const path = "café ☕ 😀.beancount";
    const { context, spies } = services();
    spies.getFilesContent.mockResolvedValue([
      { path, content: "emoji ok", sha: "abc" },
    ]);
    spies.suggestCategories.mockResolvedValue([]);
    const { client, close } = await connect(context);
    try {
      const file = await client.readResource({
        uri: `${RESOURCE_SCHEME}://alice/main/files/${encodeURIComponent(path)}`,
      });
      expect(file.contents[0]).toMatchObject({ text: "emoji ok" });

      const suggestions = await client.readResource({
        uri: `${RESOURCE_SCHEME}://alice/main/import/suggest-categories?transactions=${encodeURIComponent(
          JSON.stringify([
            {
              rowIndex: 0,
              date: "2026-01-01",
              payee: "Café ☕ 😀",
              description: "Latte",
              amount: -5,
            },
          ]),
        )}`,
      });
      expect(suggestions.contents[0]).toMatchObject({ text: "[]" });
      expect(spies.suggestCategories).toHaveBeenCalledTimes(1);
    } finally {
      await close();
    }
  });
});

/**
 * w31/071. Numeric query parameters on MCP resources must accept only strict
 * base-10 integer strings — never silently coerce `""` / whitespace to `0` or
 * accept hex / binary / octal / scientific / float literals.
 */
describe("strict numeric query parameters on resource reads (w31/071)", () => {
  const makeContext = () => {
    const getJournal = jest.fn(async () => ({
      total: 0,
      data: [],
      is_empty: true,
    }));
    const plaintextJournal = jest.fn(async () => ({
      total: 0,
      truncated: false,
      text: "",
    }));
    const getAccountJournal = jest.fn(async () => ({
      total: 0,
      data: [],
      is_empty: true,
    }));
    const listCommits = jest.fn(async () => ({
      commits: [],
      total: 0,
      hasMore: false,
    }));
    const getFeed = jest.fn(async () => ({
      items: [],
      total: 0,
      hasMore: false,
    }));
    const listCollaborators = jest.fn(async () => []);
    const getUserFollowers = jest.fn(async () => ({ users: [], total: 0 }));
    const getAssetDownloadUrl = jest.fn(
      async () => "https://example.test/asset",
    );
    const getPullRequestDetails = jest.fn(async () => ({
      number: 42,
      title: "t",
      description: "d",
      state: "open",
      author: "alice",
      headBranch: "h",
      baseBranch: "main",
      files: [],
    }));
    const getUnsyncedTransactions = jest.fn(async () => []);
    const base = ctx(contentOf("main.beancount", "ok"), undefined);
    const context = {
      ...base,
      identity: {
        ...base.identity,
        scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
      },
      services: {
        ...base.services,
        ledgerJournal: { getJournal, plaintextJournal, getAccountJournal },
        plaidItem: { getUnsyncedTransactions },
      },
      commitsService: { listCommits },
      feedService: { getFeed },
      collaboratorsWorkflow: { listCollaborators },
      socialService: { getUserFollowers },
      ledgerAssetService: { getAssetDownloadUrl },
      pullRequestWorkflow: { getPullRequestDetails },
    } as unknown as McpRequestContext;
    return {
      context,
      spies: {
        getJournal,
        plaintextJournal,
        getAccountJournal,
        listCommits,
        getFeed,
        listCollaborators,
        getUserFollowers,
        getAssetDownloadUrl,
        getPullRequestDetails,
        getUnsyncedTransactions,
      },
    };
  };

  it.each([
    [
      "empty offset on journal",
      `${RESOURCE_SCHEME}://alice/main/journal?limit=2&offset=`,
    ],
    [
      "whitespace offset on journal",
      `${RESOURCE_SCHEME}://alice/main/journal?limit=2&offset=%20%20`,
    ],
    [
      "empty limit on journal",
      `${RESOURCE_SCHEME}://alice/main/journal?limit=`,
    ],
    [
      "padded limit on journal",
      `${RESOURCE_SCHEME}://alice/main/journal?limit=%202%20`,
    ],
    [
      "hex limit on journal",
      `${RESOURCE_SCHEME}://alice/main/journal?limit=0x2`,
    ],
    [
      "binary limit on journal",
      `${RESOURCE_SCHEME}://alice/main/journal?limit=0b10`,
    ],
    [
      "octal limit on journal",
      `${RESOURCE_SCHEME}://alice/main/journal?limit=0o10`,
    ],
    [
      "scientific notation limit on journal",
      `${RESOURCE_SCHEME}://alice/main/journal?limit=1e1`,
    ],
    [
      "float string limit on journal",
      `${RESOURCE_SCHEME}://alice/main/journal?limit=1.0`,
    ],
    [
      "empty offset on plaintext-journal",
      `${RESOURCE_SCHEME}://alice/main/plaintext-journal?limit=2&offset=`,
    ],
    [
      "empty offset on account-journal",
      `${RESOURCE_SCHEME}://alice/main/account-journal?account=Assets&limit=2&offset=`,
    ],
    [
      "empty offset on account/feed",
      `${RESOURCE_SCHEME}://account/feed?offset=`,
    ],
    [
      "hex page on commits",
      `${RESOURCE_SCHEME}://alice/main/commits?page=0x1&limit=2`,
    ],
    [
      "scientific page on collaborators",
      `${RESOURCE_SCHEME}://alice/main/collaborators?page=1e0`,
    ],
    [
      "hex page on social/followers",
      `${RESOURCE_SCHEME}://social/followers?username=alice&page=0x1`,
    ],
    [
      "scientific ledgerRepoId on assets/download-url",
      `${RESOURCE_SCHEME}://assets/download-url?ledgerRepoId=1e0&filename=x`,
    ],
    [
      "empty ledgerRepoId on assets/download-url",
      `${RESOURCE_SCHEME}://assets/download-url?ledgerRepoId=&filename=x`,
    ],
    [
      "scientific prNumber on pull-request",
      `${RESOURCE_SCHEME}://alice/main/pull-request?prNumber=1e0`,
    ],
    [
      "empty prNumber on pull-request",
      `${RESOURCE_SCHEME}://alice/main/pull-request?prNumber=`,
    ],
    [
      "hex page on bank-transactions/unsynced",
      `${RESOURCE_SCHEME}://alice/main/bank-transactions/unsynced?page=0x1`,
    ],
  ])(
    "refuses %s as BAD_USER_INPUT naming an invalid integer before any service",
    async (_label, uri) => {
      const { context, spies } = makeContext();
      const { client, close } = await connect(context);
      try {
        const error = await client
          .readResource({ uri })
          .then(() => undefined)
          .catch((caught: unknown) => caught as McpError);
        expect(error?.code).toBe(JSON_RPC_INVALID_PARAMS);
        expect(error?.data).toMatchObject({
          code: "BAD_USER_INPUT",
          message: expect.stringMatching(/invalid integer/i),
        });
        expect((error?.data as { message: string }).message).not.toMatch(
          /too small/i,
        );
        for (const spy of Object.values(spies)) {
          expect(spy).not.toHaveBeenCalled();
        }
      } finally {
        await close();
      }
    },
  );

  it("keeps omitted defaults and accepts canonical base-10 integers", async () => {
    const { context, spies } = makeContext();
    const { client, close } = await connect(context);
    try {
      await client.readResource({
        uri: `${RESOURCE_SCHEME}://alice/main/journal?limit=2&offset=0`,
      });
      expect(spies.getJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ limit: 2, offset: 0 }),
        }),
      );

      await client.readResource({ uri: `${RESOURCE_SCHEME}://account/feed` });
      expect(spies.getFeed).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0, limit: 10 }),
        expect.anything(),
      );

      await client.readResource({
        uri: `${RESOURCE_SCHEME}://alice/main/commits`,
      });
      expect(spies.listCommits).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 30 }),
      );

      await client.readResource({
        uri: `${RESOURCE_SCHEME}://alice/main/pull-request?prNumber=42`,
      });
      expect(spies.getPullRequestDetails).toHaveBeenCalledWith(
        "alice",
        "main",
        42,
        expect.anything(),
      );
    } finally {
      await close();
    }
  });
});
