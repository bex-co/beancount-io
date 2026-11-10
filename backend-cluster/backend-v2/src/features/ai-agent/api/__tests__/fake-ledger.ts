import { createHash } from "node:crypto";
import { posix } from "node:path";

/**
 * A ledger repository for tests that run the real workflows (w23/m39, m42).
 *
 * It is the ledger service and the git host in one: a chain of commits, each a
 * snapshot of every file, behind the calls `LedgerWorkflow` and
 * `LedgerRepoService` make. A write applies its operations and appends a
 * commit, answering with its sha as the ledger service does. bean-check is a
 * rule instead of an engine: a line reading `BAD` is an error in any file the
 * include graph from `main.bean` reaches, and an include naming no file is one
 * too. That is enough to tell a preview's verdict from a commit's, and nothing
 * more; what the real engine decides (balance assertions, lot matching) is not
 * modeled.
 */
export type Snapshot = Record<string, string>;

/** The blob sha the fake gives a file: equal content, equal sha, as in git. */
export function blobSha(content: string): string {
  return `blob-${createHash("sha1").update(content).digest("hex").slice(0, 12)}`;
}

const decode = (content: string) =>
  Buffer.from(content.replace(/\s/g, ""), "base64").toString("utf-8");
const encode = (content: string) =>
  Buffer.from(content, "utf-8").toString("base64");

/** What an `include` line names, resolved from the file that declares it. */
function includedBy(path: string, line: string): string | undefined {
  const target = /^include\s+"([^"]+)"/.exec(line)?.[1];
  return target && posix.normalize(posix.join(posix.dirname(path), target));
}

/** The files bean-check loads: `main.bean` and what its includes reach. */
function loadedFiles(files: ReadonlyMap<string, string>): string[] {
  const loaded: string[] = [];
  const visit = (path: string) => {
    if (loaded.includes(path) || !files.has(path)) return;
    loaded.push(path);
    for (const line of (files.get(path) ?? "").split("\n")) {
      const resolved = includedBy(path, line);
      if (!resolved) continue;
      if (resolved.includes("*")) {
        const pattern = new RegExp(
          `^${resolved.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*")}$`,
        );
        for (const candidate of files.keys()) {
          if (pattern.test(candidate)) visit(candidate);
        }
      } else {
        visit(resolved);
      }
    }
  };
  visit("main.bean");
  return loaded;
}

const ERROR_MESSAGE = "Account Expenses:Nope was never opened";

/** The ledger service's `errors`: a `BAD` line, or an include that names nothing. */
function errorsOf(files: ReadonlyMap<string, string>) {
  const errors: {
    message: string;
    source: { filename: string; lineno: number };
  }[] = [];
  for (const path of loadedFiles(files)) {
    (files.get(path) ?? "").split("\n").forEach((line, index) => {
      const source = { filename: path, lineno: index + 1 };
      if (line.includes("BAD")) errors.push({ message: ERROR_MESSAGE, source });
      const resolved = includedBy(path, line);
      if (resolved && !resolved.includes("*") && !files.has(resolved)) {
        errors.push({ message: `File "${resolved}" does not exist`, source });
      }
    });
  }
  return errors;
}

type Commit = {
  sha: string;
  parent: string | undefined;
  message: string;
  files: Map<string, string>;
};

const envelope = (data: unknown) => ({ data: { success: true, data } });
const notFound = () => new Response(null, { status: 404 });

/**
 * `history` is the repository's commits, oldest first; the last is the head.
 * Commit shas are `c0`, `c1`, … and a branch name (`main`) names the head.
 */
export function createFakeLedger(history: Snapshot[]) {
  const commits: Commit[] = [];
  const push = (files: Map<string, string>, message: string) => {
    commits.push({
      sha: `c${commits.length}`,
      parent: commits.at(-1)?.sha,
      message,
      files,
    });
  };
  history.forEach((snapshot, index) =>
    push(new Map(Object.entries(snapshot)), `Commit ${index}`),
  );
  const head = () => commits.at(-1)!;
  const plain = () => new Map(head().files);
  const withOverlays = (
    overlays: { path: string; content: string | null }[],
  ) => {
    const projected = plain();
    for (const overlay of overlays) {
      if (overlay.content === null) projected.delete(overlay.path);
      else projected.set(overlay.path, decode(overlay.content));
    }
    return projected;
  };
  const toPublic = (path: string) => {
    const content = head().files.get(path);
    if (content === undefined) return null;
    return {
      name: path.split("/").pop(),
      path,
      type: "file",
      sha: blobSha(content),
      size: content.length,
      content,
      encoding: null,
    };
  };

  const change = jest.fn(
    async (
      _owner: string,
      _name: string,
      options: {
        files: { operation: string; path: string; content?: string | null }[];
        message?: string;
      },
    ) => {
      const next = plain();
      for (const op of options.files) {
        if (op.operation === "delete") next.delete(op.path);
        else next.set(op.path, decode(op.content ?? ""));
      }
      push(next, options.message ?? "Change files");
      return envelope({ commit: head().sha });
    },
  );

  const fava = {
    getAdminClient: () => ({
      ledgers: { getLedger: async () => envelope({ id: 42, private: true }) },
    }),
    getApiContext: async () => ({
      favaApiClient: {
        collaborators: {
          getLedgerCollaboratorPermission: async () =>
            envelope({ permission: "write" }),
        },
      },
    }),
    getPublicApiClient: async () => ({
      reports: {
        checkProjectedErrors: async (
          _o: string,
          _n: string,
          body: { files: { path: string; content: string | null }[] },
        ) => envelope(errorsOf(withOverlays(body.files))),
        getProjectedSourceFiles: async (
          _o: string,
          _n: string,
          body: { files: { path: string; content: string | null }[] },
        ) => envelope(loadedFiles(withOverlays(body.files))),
      },
      ledgers: {
        changeLedgerFiles: change,
        getLedgerFile: async (_o: string, _n: string, q: { path: string }) =>
          envelope(toPublic(q.path)),
        getLedgerFilesContent: async (
          _o: string,
          _n: string,
          body: { files: string[] },
        ) => envelope(body.files.map(toPublic).filter(Boolean)),
        getLedgerDirContent: async (
          _o: string,
          _n: string,
          query?: { dir_path?: string | null },
        ) => {
          const prefix = query?.dir_path ? `${query.dir_path}/` : "";
          const seen = new Map<
            string,
            { type: string; path: string; name: string }
          >();
          for (const path of head().files.keys()) {
            if (!path.startsWith(prefix)) continue;
            const rest = path.slice(prefix.length);
            const slash = rest.indexOf("/");
            if (slash === -1) {
              seen.set(path, { type: "file", path, name: rest });
            } else {
              const sub = prefix + rest.slice(0, slash);
              seen.set(sub, {
                type: "dir",
                path: sub,
                name: rest.slice(0, slash),
              });
            }
          }
          return envelope([...seen.values()]);
        },
      },
    }),
  };

  const commitAt = (rev: string | undefined) => {
    const found =
      rev === undefined || rev === "" || rev === "main"
        ? head()
        : commits.find((commit) => commit.sha === rev);
    if (!found) throw notFound();
    return found;
  };
  /** The git host's reads: a commit with its changed files, and a file at a revision. */
  const giteaClientFactory = {
    getUserApiClient: async () => ({
      repos: {
        repoGetAllCommits: async (
          _owner: string,
          _repo: string,
          query: { sha?: string; files?: boolean },
        ) => {
          const commit = commitAt(query.sha);
          const before =
            commits.find((c) => c.sha === commit.parent)?.files ??
            new Map<string, string>();
          const changed = [
            ...[...commit.files].flatMap(([path, content]) =>
              !before.has(path)
                ? [{ filename: path, status: "added" }]
                : before.get(path) !== content
                  ? [{ filename: path, status: "modified" }]
                  : [],
            ),
            ...[...before.keys()]
              .filter((path) => !commit.files.has(path))
              .map((path) => ({ filename: path, status: "removed" })),
          ];
          return {
            data: [
              {
                sha: commit.sha,
                commit: { message: commit.message },
                parents: commit.parent ? [{ sha: commit.parent }] : [],
                ...(query.files && { files: changed }),
              },
            ],
          };
        },
        repoGetContents: async (
          _owner: string,
          _repo: string,
          filepath: string,
          query?: { ref?: string },
        ) => {
          const path = filepath.split("/").map(decodeURIComponent).join("/");
          const content = commitAt(query?.ref).files.get(path);
          if (content === undefined) throw notFound();
          return {
            data: {
              sha: blobSha(content),
              content: encode(content),
              encoding: "base64",
            },
          };
        },
      },
    }),
  };

  return {
    fava,
    giteaClientFactory,
    /** The head's files. */
    snapshot: (): Snapshot => Object.fromEntries(head().files),
    /** bean-check's errors over the head, as the ledger service reports them. */
    errors: () => errorsOf(plain()),
    /** The shas of every commit, oldest first. */
    shas: () => commits.map((commit) => commit.sha),
  };
}
