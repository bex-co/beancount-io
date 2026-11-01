import { commitLedgerFiles } from "@/features/ledger/operations/commit-ledger-files";
import { isGiteaWriteConflict } from "@/features/gitea/utils/gitea-error";
import { ServiceUnavailableError } from "@/shared/errors";

/**
 * w23/017. Two writers committing to one ledger at once: Gitea answers the
 * loser with a 500 carrying the git ref-lock failure, which was not treated as
 * a lost race, so the loser got SERVICE_UNAVAILABLE instead of the promised
 * re-read and retry. The message is the one Gitea 1.24.7 sends.
 */
const LOST_RACE = Object.assign(new Error("HTTP 500"), {
  status: 500,
  error: {
    message:
      "PushRejected Error: exit status 1 - remote: error: cannot lock ref 'refs/heads/main': is at 4085f06db372af62c83154b02aa901ca653899e1 but expected d3b78fe4ac8de769260553468d2d6f96093ea773\nTo /data/gitea-repositories/alice/books.git\n ! [remote rejected] HEAD -> main (failed to update ref)",
  },
});

describe("a commit that loses the race for the branch ref", () => {
  it("is recognized as a lost race", () => {
    expect(isGiteaWriteConflict(LOST_RACE)).toBe(true);
    expect(
      isGiteaWriteConflict(
        Object.assign(new Error("HTTP 500"), {
          status: 500,
          error: { message: "PushOutOfDate Error: exit status 1" },
        }),
      ),
    ).toBe(true);
  });

  it("does not retry a push a hook declined, or an unrelated failure", () => {
    for (const message of [
      "PushRejected Error: exit status 1 - remote: pre-receive hook declined",
      "internal error",
    ])
      expect(
        isGiteaWriteConflict(
          Object.assign(new Error("HTTP 500"), {
            status: 500,
            error: { message },
          }),
        ),
      ).toBe(false);
  });

  it("re-reads and lands its edit beside the concurrent one", async () => {
    let remote = "; a\n; b\n";
    let attempts = 0;
    const client = {
      repos: {
        repoGetContents: jest.fn(async () => ({
          data: {
            content: Buffer.from(remote).toString("base64"),
            encoding: "base64",
            sha: `blob-${remote}`,
          },
        })),
        repoChangeFiles: jest.fn(
          async (
            _o: string,
            _r: string,
            body: { files: Array<{ content: string }> },
          ) => {
            attempts += 1;
            if (attempts === 1) {
              // The other writer's edit lands first; this commit loses.
              remote = remote.replace("; a\n", "; 0\n");
              throw LOST_RACE;
            }
            remote = Buffer.from(body.files[0]!.content, "base64").toString(
              "utf8",
            );
          },
        ),
      },
    };

    await commitLedgerFiles(
      client as never,
      "alice",
      "books",
      new Map([
        [
          "race.bean",
          (content: string | null) => (content ?? "").replace("; b\n", "; 1\n"),
        ],
      ]),
      "edit 1",
      { directiveLimit: { exempt: true } },
    );

    expect(attempts).toBe(2);
    expect(remote).toBe("; 0\n; 1\n");
  });

  // w23/m1: the production lost-race 500 (w23/072) matches no conflict rule,
  // so no retry fires — but the failure must read retryable, never
  // "not allowed" for an authorized credential.
  it("reports an unrecognized commit 500 as retryable without retrying", async () => {
    let attempts = 0;
    const client = {
      repos: {
        repoGetContents: jest.fn(async () => ({
          data: {
            content: Buffer.from("; a\n").toString("base64"),
            encoding: "base64",
            sha: "blob-a",
          },
        })),
        repoChangeFiles: jest.fn(async () => {
          attempts += 1;
          throw Object.assign(new Error("HTTP 500"), {
            status: 500,
            error: { message: "internal error" },
          });
        }),
      },
    };

    await expect(
      commitLedgerFiles(
        client as never,
        "alice",
        "books",
        new Map([
          ["race.bean", (content: string | null) => `${content ?? ""}; b\n`],
        ]),
        "edit",
        { directiveLimit: { exempt: true } },
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);
    expect(attempts).toBe(1);
  });

  // w23/072: production's loser answers with a status or text no rule knows.
  // The file's content tells what happened, whatever the failure says.
  describe("a commit that fails with a signature nothing recognizes", () => {
    const UNKNOWN = Object.assign(new Error("HTTP 500"), {
      status: 500,
      error: { message: "" },
    });

    function remoteWith(
      initial: string,
      onCommit: (call: number, body: string) => string | void,
    ) {
      let remote = initial;
      let calls = 0;
      let shaCounter = 0;
      const shas = new Map<string, string>();
      const shaOf = (text: string) => {
        if (!shas.has(text)) shas.set(text, `blob-${(shaCounter += 1)}`);
        return shas.get(text)!;
      };
      const client = {
        repos: {
          repoGetContents: jest.fn(async () => ({
            data: {
              content: Buffer.from(remote).toString("base64"),
              encoding: "base64",
              sha: shaOf(remote),
            },
          })),
          repoChangeFiles: jest.fn(
            async (
              _o: string,
              _r: string,
              body: { files: Array<{ content: string }> },
            ) => {
              calls += 1;
              const sent = Buffer.from(
                body.files[0]!.content,
                "base64",
              ).toString("utf8");
              const next = onCommit(calls, sent);
              if (next !== undefined) remote = next;
              else remote = sent;
              return undefined;
            },
          ),
        },
      };
      return {
        client,
        calls: () => calls,
        remote: () => remote,
        setRemote: (text: string) => {
          remote = text;
        },
      };
    }

    const append = (text: string) => (content: string | null) =>
      `${content ?? ""}${text}`;
    const run = (client: unknown, text: string) =>
      commitLedgerFiles(
        client as never,
        "alice",
        "books",
        new Map([["race.bean", append(text)]]),
        "edit",
        { directiveLimit: { exempt: true } },
      );

    it("retries when another commit changed the file under it", async () => {
      const fixture = remoteWith("; a\n", (call, sent) => {
        if (call === 1) {
          // The other writer's commit wins; this one is refused unexplained.
          fixture.setRemote("; a\n; theirs\n");
          throw UNKNOWN;
        }
        return sent;
      });
      await run(fixture.client, "; mine\n");
      expect(fixture.calls()).toBe(2);
      expect(fixture.remote()).toBe("; a\n; theirs\n; mine\n");
    });

    it("does not write again when the commit had landed and only its answer was lost", async () => {
      const fixture = remoteWith("; a\n", (_call, sent) => {
        fixture.setRemote(sent);
        throw UNKNOWN;
      });
      await run(fixture.client, "; mine\n");
      expect(fixture.calls()).toBe(1);
      expect(fixture.remote()).toBe("; a\n; mine\n");
    });

    it("still reports a failure that left the file alone as retryable, once", async () => {
      const fixture = remoteWith("; a\n", () => {
        throw UNKNOWN;
      });
      await expect(run(fixture.client, "; mine\n")).rejects.toBeInstanceOf(
        ServiceUnavailableError,
      );
      expect(fixture.calls()).toBe(1);
    });
  });
});
