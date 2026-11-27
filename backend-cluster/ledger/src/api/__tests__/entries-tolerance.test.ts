import http from "node:http";
import Koa from "koa";
import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import { setEntriesHandler } from "@/api/entries";
import { restErrorMiddleware } from "@/server/error-middleware";

// w31/103: both engines honor `option "inferred_tolerance_default"` only in
// the entry point. The balance precheck read it only from the files a batch
// writes to, so an entry routed away from main.bean got no tolerance: the
// preview (which skips the precheck) said valid and the commit refused it
// UNBALANCED. The engine is scripted here (unit tests are WASM-free); what is
// under test is where the handler reads the option from.
const b64 = (text: string) => Buffer.from(text, "utf8").toString("base64");
const fromB64 = (text: string) => Buffer.from(text, "base64").toString("utf8");

const OPTION = 'option "inferred_tolerance_default" "USD:0.01"\n';
const OPENS =
  "2026-01-01 open Assets:Cash USD\n2026-01-01 open Expenses:Transport USD\n";

// The repository's files; a path missing here is a 404.
let repo = new Map<string, string>();
const committed: { files: { path: string; content: string }[] }[] = [];

jest.mock("@/server/auth", () => ({
  authMiddleware: async (_ctx: unknown, next: () => Promise<void>) => next(),
  directiveLimitExempt: () => true,
  giteaClientForRequest: () => ({
    repos: {
      repoGetContents: async (_owner: string, _repo: string, path: string) => {
        const content = repo.get(decodeURIComponent(path));
        if (content === undefined)
          throw Object.assign(new Error("404"), { status: 404 });
        return { data: { content: b64(content), sha: `sha-${path}` } };
      },
      repoChangeFiles: async (
        _owner: string,
        _repo: string,
        body: { files: { path: string; content: string }[] },
      ) => {
        committed.push(body);
        return { data: {} };
      },
    },
  }),
}));

jest.mock("@/core/directive-limit", () => ({
  checkDirectiveLimitForFileChanges: async () => undefined,
}));

jest.mock("../service-context", () => ({
  ...jest.requireActual("../service-context"),
  servicesForRequest: () => ({
    data: {
      getErrors: async () => [],
      checkProjectedErrors: async () => [],
      // The entry point and what its `include` lines name, as projected.
      projectedSourceFiles: async ({
        overlays,
      }: {
        overlays: { path: string; content: string }[];
      }) => {
        const overlay = overlays.find(({ path }) => path === "main.bean");
        const main = overlay ? fromB64(overlay.content) : repo.get("main.bean");
        if (main === undefined) return [];
        return [
          "main.bean",
          ...[...main.matchAll(/^include "([^"]+)"$/gm)].map((m) => m[1]),
        ];
      },
      projectedEntryIds: async ({ ranges }: { ranges: unknown[] }) =>
        ranges.map((_range, index) => `hash-${index}`),
    },
  }),
}));

async function listen(server: http.Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}

describe("bulk entries read the tolerance from the entry point", () => {
  let server: http.Server;
  let url: string;

  beforeAll(async () => {
    const app = new Koa();
    const router = new Router();
    setEntriesHandler(router);
    app.use(restErrorMiddleware());
    app.use(bodyParser());
    app.use(router.routes());
    server = http.createServer(app.callback());
    url = await listen(server);
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(() => {
    repo = new Map();
    committed.length = 0;
  });

  const post = (body: Record<string, unknown>) =>
    fetch(`${url}/entries/alice/books/bulk`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  // -10.00 against `paid`: 9.99 leaves -0.01 USD, inside USD:0.01.
  const fare = (paid: string, filename: string) => ({
    type: "transaction",
    filename,
    item: {
      date: "2026-08-30",
      flag: "*",
      narration: "fare",
      postings: [
        {
          account: "Assets:Cash",
          units: { number: "-10.00", currency: "USD" },
        },
        {
          account: "Expenses:Transport",
          units: { number: paid, currency: "USD" },
        },
      ],
    },
  });
  const committedFiles = () =>
    Object.fromEntries(
      committed[0]!.files.map(({ path, content }) => [path, fromB64(content)]),
    );

  it("applies main.bean's option to a batch routed to an included file", async () => {
    const main = `${OPTION}${OPENS}include "txns/2026.bean"\n`;
    repo.set("main.bean", main);
    repo.set("txns/2026.bean", "");

    const response = await post({ entries: [fare("9.99", "txns/2026.bean")] });

    expect(response.status).toBe(200);
    const files = committedFiles();
    // The entry point is read for its option, never rewritten.
    expect(Object.keys(files)).toEqual(["txns/2026.bean"]);
    expect(files["txns/2026.bean"]).toContain("Expenses:Transport");
  });

  // backend-v2's pre-write guard dry-runs before the routed file exists; the
  // commit runs after it created the file empty.
  it("applies main.bean's option to a batch routed to a file the write creates", async () => {
    repo.set("main.bean", `${OPTION}${OPENS}`);

    const preview = await post({
      entries: [fare("9.99", "txns/2026.bean")],
      dryRun: true,
    });
    const previewed = (await preview.json()) as Record<string, any>;
    expect(preview.status).toBe(200);
    expect(previewed.data.included_files).toEqual(["txns/2026.bean"]);
    expect(committed).toEqual([]);

    repo.set("txns/2026.bean", "");
    const response = await post({ entries: [fare("9.99", "txns/2026.bean")] });

    expect(response.status).toBe(200);
    const files = committedFiles();
    expect(files["main.bean"]).toBe(
      `${OPTION}${OPENS}include "txns/2026.bean"\n`,
    );
    expect(files["txns/2026.bean"]).toContain("Expenses:Transport");
  });

  // The engines ignore an option outside the entry point, so the check does too.
  it.each([false, true])(
    "ignores an option written only in the routed target (dryRun: %s)",
    async (dryRun) => {
      repo.set("main.bean", `${OPENS}include "txns/2026.bean"\n`);
      repo.set("txns/2026.bean", OPTION);

      const response = await post({
        entries: [fare("9.99", "txns/2026.bean")],
        dryRun,
      });
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(400);
      expect(body.code).toBe("UNBALANCED");
      expect(body.error).toBe(
        "entry 0: Transaction does not balance: residual -0.01 USD",
      );
      expect(committed).toEqual([]);
    },
  );

  it("still refuses a routed residual outside main.bean's tolerance", async () => {
    repo.set("main.bean", `${OPTION}${OPENS}include "txns/2026.bean"\n`);
    repo.set("txns/2026.bean", "");

    const response = await post({ entries: [fare("9.98", "txns/2026.bean")] });
    const body = (await response.json()) as Record<string, any>;

    expect(response.status).toBe(400);
    expect(body.code).toBe("UNBALANCED");
    expect(body.error).toBe(
      "entry 0: Transaction does not balance: residual -0.02 USD",
    );
    expect(committed).toEqual([]);
  });

  it("still reads the option when the batch writes to main.bean", async () => {
    repo.set("main.bean", `${OPTION}${OPENS}`);

    const response = await post({ entries: [fare("9.99", "main.bean")] });

    expect(response.status).toBe(200);
    expect(Object.keys(committedFiles())).toEqual(["main.bean"]);
  });
});
