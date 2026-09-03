import "reflect-metadata";

// The ai-agent fragment transitively loads the harness ESM packages, whose
// `import.meta.url` Jest's CommonJS transform cannot evaluate. Nothing here
// calls them.
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { isObjectType } from "graphql";
import { ForbiddenError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";
import type { IContext } from "../context";
import { graphqlLedgerPinMiddleware } from "../ledger-pin-middleware";
import { buildGraphqlSchema } from "../api-gateway";

/**
 * The per-credential ledger pin on the GraphQL surface (ADR 0006 D5).
 *
 * A credential confined to one ledger reached every ledger its user could:
 * `LedgerWorkflow` and `LedgerCollaboratorsWorkflow` take a caller-supplied
 * `ledgerId` straight to `getPublicApiClient`, and neither ever consulted
 * `Identity.ledgerScope`. These cover the middleware that closes that, plus
 * the guard that keeps a new ledger-addressed field from slipping past it.
 */

const pinned: Identity = {
  userId: "usr_1",
  method: "apikey",
  scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
  ledgerScope: "alice/main",
  tokenId: "akey_1",
};

const unpinned: Identity = {
  userId: "usr_1",
  method: "oauth",
  scopes: new Set(["ledger.read"]),
  tokenId: "tok_1",
};

const session: Identity = {
  userId: "usr_1",
  method: "session",
  scopes: new Set(),
};

async function drive(
  identity: Identity | undefined,
  args: Record<string, unknown>,
  operation: { parent: "Query" | "Mutation"; field: string } = {
    parent: "Mutation",
    field: "legacyLedgerOperation",
  },
): Promise<{ error?: unknown; reached: boolean }> {
  let reached = false;
  try {
    await graphqlLedgerPinMiddleware()(
      {
        context: { identity } as IContext,
        args,
        info: {
          parentType: { name: operation.parent },
          fieldName: operation.field,
        },
      } as never,
      async () => {
        reached = true;
        return undefined;
      },
    );
  } catch (error) {
    return { error, reached };
  }
  return { reached };
}

describe("graphqlLedgerPinMiddleware", () => {
  it("refuses a pinned credential naming another ledger", async () => {
    const { error, reached } = await drive(pinned, {
      ledgerId: "alice/secret",
    });
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(reached).toBe(false);
  });

  it("admits a pinned credential naming its own ledger", async () => {
    expect(await drive(pinned, { ledgerId: "alice/main" })).toEqual({
      reached: true,
    });
  });

  it("refuses the split owner/name spelling the pull-request family uses", async () => {
    const { error, reached } = await drive(pinned, {
      ledgerOwner: "alice",
      ledgerName: "secret",
      prNumber: 1,
    });
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(reached).toBe(false);

    expect(
      await drive(pinned, {
        ledgerOwner: "alice",
        ledgerName: "main",
        prNumber: 1,
      }),
    ).toEqual({ reached: true });
  });

  it("leaves an unpinned credential, a session, and an anonymous caller alone", async () => {
    for (const identity of [unpinned, session, undefined]) {
      expect(await drive(identity, { ledgerId: "alice/secret" })).toEqual({
        reached: true,
      });
    }
  });

  it("passes a field that names no ledger", async () => {
    // The legacy verbs declare `ledgerId` nullable and resolve a default
    // themselves, so an absent or null argument is not a refusal here — it is
    // `BaseLedgerResolver.resolveLedgerId`'s to answer.
    for (const args of [
      {},
      { ledgerId: null },
      { ledgerId: "" },
      { ledgerId: undefined },
      { ledgerOwner: "alice" },
      { ledgerName: "main" },
    ]) {
      expect(await drive(pinned, args)).toEqual({ reached: true });
    }
  });

  it("ignores a non-string ledger argument rather than coercing one", async () => {
    // `getLedgerAssetDownloadUrl` takes a numeric `ledgerRepoId`; only an admin
    // lookup turns that into a ledger id, so its pin lives in
    // LedgerAssetService. Nothing here should invent a ledger id from a number.
    expect(await drive(pinned, { ledgerId: 42 })).toEqual({ reached: true });
  });

  it("defers migrated ledger operations to the shared PDP", async () => {
    expect(
      await drive(
        pinned,
        { ledgerId: "alice/secret" },
        { parent: "Query", field: "getLedger" },
      ),
    ).toEqual({ reached: true });
  });
});

describe("ledger-addressed fields are named the way the middleware reads them", () => {
  /**
   * The middleware is keyed on argument NAMES, which is only safe while the
   * schema keeps using the two it knows. This walks the built schema and fails
   * on a third spelling, so a new field that addresses a ledger some other way
   * shows up here rather than as a silent hole in the pin.
   *
   * `ledgerRepoId` and `ledgerAccount` are listed as known-and-not-a-ledger-id:
   * the first is resolved and authorized inside LedgerAssetService, the second
   * is an account name on a field that also carries `ledgerId`.
   */
  const READ_BY_MIDDLEWARE = new Set(["ledgerId", "ledgerOwner", "ledgerName"]);
  const KNOWN_OTHER = new Set([
    "ledgerRepoId",
    "ledgerAccount",
    "withDefaultLedger",
  ]);

  it("uses only ledgerId or the ledgerOwner/ledgerName pair", async () => {
    const schema = await buildGraphqlSchema();
    const unknown: string[] = [];
    const pinnedFields: string[] = [];

    for (const type of Object.values(schema.getTypeMap())) {
      if (!isObjectType(type) || type.name.startsWith("__")) continue;
      for (const field of Object.values(type.getFields())) {
        const names = field.args.map((arg) => arg.name);
        for (const name of names) {
          if (!/ledger/i.test(name)) continue;
          if (READ_BY_MIDDLEWARE.has(name)) continue;
          if (KNOWN_OTHER.has(name)) continue;
          unknown.push(`${type.name}.${field.name}(${name})`);
        }
        if (names.some((name) => READ_BY_MIDDLEWARE.has(name))) {
          pinnedFields.push(`${type.name}.${field.name}`);
        }
      }
    }

    expect(unknown).toEqual([]);
    // A floor, not a count to keep updated: it fails if the middleware stops
    // seeing the ledger surface wholesale, without churning on every new field.
    expect(pinnedFields.length).toBeGreaterThan(80);
  });

  it("covers the verbs the finding named", async () => {
    const schema = await buildGraphqlSchema();
    const named = [
      ["Query", "getLedgerFile"],
      ["Query", "getLedgerDirContent"],
      ["Query", "listLedgerCollaborators"],
      ["Query", "getLedgerCollaboratorPermission"],
      ["Mutation", "updateLedgerFile"],
      ["Mutation", "deleteLedgerFile"],
      ["Mutation", "renameLedgerFile"],
      ["Mutation", "deleteLedger"],
      ["Mutation", "addOrUpdateLedgerCollaborator"],
      ["Mutation", "deleteLedgerCollaborator"],
      ["Mutation", "approvePullRequest"],
      ["Mutation", "rejectPullRequest"],
    ] as const;

    for (const [parent, fieldName] of named) {
      const field = schema.getType(parent);
      if (!field || !isObjectType(field)) throw new Error(`no ${parent}`);
      const args = field.getFields()[fieldName]?.args;
      expect(args).toBeDefined();
      expect(
        args!.map((a) => a.name).some((n) => READ_BY_MIDDLEWARE.has(n)),
      ).toBe(true);
    }
  });
});
