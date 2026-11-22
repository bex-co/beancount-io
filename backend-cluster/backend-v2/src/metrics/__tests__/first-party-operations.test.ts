import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Kind, parse } from "graphql";
import { FIRST_PARTY_OPERATION_NAMES } from "../first-party-operations";

/**
 * Every operation the dashboard and mobile app define is a first-party name,
 * so its traffic is recorded under that name rather than its root field.
 *
 * The scan reads the documents each client's codegen compiles
 * (`dashboard/codegen.ts`, `mobile/codegen.ts`) and the inline `gql` documents
 * in their source. CI (backend parity) also runs when those documents change.
 * When this fails, add the operation to `CURRENT_OPERATIONS` in
 * `src/metrics/first-party-operations.ts`.
 */
// __tests__ → metrics → src → backend-v2 → backend-cluster → repository root
const REPO_ROOT = path.resolve(__dirname, "../../../../..");
const CLIENT_SOURCE_DIRS = ["dashboard/src", "mobile/src"];
const SKIPPED_DIRS = new Set([
  "node_modules",
  "__tests__",
  "generated-graphql",
]);

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) yield* sourceFiles(full);
    } else if (
      /\.(graphql|ts|tsx)$/.test(entry.name) &&
      !/\.test\.tsx?$/.test(entry.name)
    ) {
      yield full;
    }
  }
}

/** The GraphQL documents in one source file. */
function documentsIn(file: string): string[] {
  const source = readFileSync(file, "utf8");
  if (file.endsWith(".graphql")) return [source];
  return [...source.matchAll(/gql`([^`]*)`/g)].map((match) =>
    // Interpolated fragments are defined elsewhere; drop the placeholders.
    match[1].replace(/\$\{[^}]*\}/g, ""),
  );
}

/** Each named operation the client documents define, with one file defining it. */
function clientOperations(client: string): Map<string, string> {
  const operations = new Map<string, string>();
  for (const file of sourceFiles(path.join(REPO_ROOT, client))) {
    for (const document of documentsIn(file)) {
      for (const definition of parse(document).definitions) {
        if (definition.kind === Kind.OPERATION_DEFINITION && definition.name) {
          operations.set(definition.name.value, path.relative(REPO_ROOT, file));
        }
      }
    }
  }
  return operations;
}

describe("first-party operation names", () => {
  it.each(CLIENT_SOURCE_DIRS)(
    "include every operation %s defines",
    (client) => {
      const operations = clientOperations(client);
      // A moved client directory must fail here, not pass with nothing to check.
      expect(operations.size).toBeGreaterThan(20);

      const missing = [...operations]
        .filter(([name]) => !FIRST_PARTY_OPERATION_NAMES.has(name))
        .map(([name, file]) => `${name} (${file})`);
      expect(missing).toEqual([]);
    },
  );
});
