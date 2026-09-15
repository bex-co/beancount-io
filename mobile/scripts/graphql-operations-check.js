#!/usr/bin/env node
/**
 * GraphQL operation documents nothing consumes. `yarn lint:deadcode` runs this
 * after knip, which does not read `.graphql` files and rightly exempts the
 * generated hooks (`knip.jsonc`), so an operation no screen calls would pass.
 *
 * An operation is consumed when code outside `src/generated-graphql/` and tests
 * names its generated hook or `Document`. Deliberate exceptions live in
 * `graphql-operations-allowlist.json` with the reason each stays; an entry that
 * no longer matches a finding is reported, so the list cannot rot.
 */
const fs = require("fs");
const path = require("path");

const ALLOWLIST = "scripts/graphql-operations-allowlist.json";
const HOOK_SUFFIXES = [
  "Query",
  "LazyQuery",
  "SuspenseQuery",
  "Mutation",
  "Subscription",
];

/** Every file under `dir`, skipping dependencies and dot-directories. */
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const relative = (root, file) =>
  path.relative(root, file).split(path.sep).join("/");

/** Every identifier production code names: `src` and `app`, minus generated code and tests. */
function productionIdentifiers(root) {
  const identifiers = new Set();
  for (const file of ["src", "app"].flatMap((dir) =>
    walk(path.join(root, dir)),
  )) {
    const rel = relative(root, file);
    if (
      !/\.(?:ts|tsx|js)$/.test(rel) ||
      rel.startsWith("src/generated-graphql/") ||
      /(^|\/)__tests__\//.test(rel) ||
      /\.test\.tsx?$/.test(rel)
    ) {
      continue;
    }
    for (const word of fs.readFileSync(file, "utf8").match(/[A-Za-z_]\w*/g) ??
      []) {
      identifiers.add(word);
    }
  }
  return identifiers;
}

/**
 * The PascalCase name codegen gives an operation's hook and Document:
 * `mutation addEntries` becomes `useAddEntriesMutation` and `AddEntriesDocument`.
 */
const generatedName = (name) => name[0].toUpperCase() + name.slice(1);

/** Queries, mutations and subscriptions no production code consumes. */
function unconsumedOperations(root) {
  const identifiers = productionIdentifiers(root);
  return walk(path.join(root, "src/common/graphql"))
    .filter((file) => file.endsWith(".graphql"))
    .flatMap((file) =>
      Array.from(
        fs
          .readFileSync(file, "utf8")
          .matchAll(/^\s*(?:query|mutation|subscription)\s+([A-Za-z_]\w*)/gm),
        (match) => ({ name: match[1], file: relative(root, file) }),
      ),
    )
    .filter(({ name }) => {
      const generated = generatedName(name);
      return (
        !identifiers.has(`${generated}Document`) &&
        !HOOK_SUFFIXES.some((suffix) =>
          identifiers.has(`use${generated}${suffix}`),
        )
      );
    });
}

/** Unused operations after the allowlist, and allowlist entries matching none. */
function operationsReport(root, allowlist = {}) {
  const found = unconsumedOperations(root);
  return {
    unused: found.filter(({ name }) => !(name in allowlist)),
    stale: Object.keys(allowlist).filter(
      (name) => !found.some((operation) => operation.name === name),
    ),
  };
}

function main() {
  const root = path.resolve(__dirname, "..");
  const allowlist = JSON.parse(
    fs.readFileSync(path.join(root, ALLOWLIST), "utf8"),
  );
  const { unused, stale } = operationsReport(root, allowlist);
  const messages = [
    ...unused.map(
      ({ name, file }) =>
        `Unused GraphQL operation ${name} (${file}): nothing uses its hook or ${generatedName(name)}Document. Delete the document and regenerate, or allowlist it in ${ALLOWLIST} with the reason it stays.`,
    ),
    ...stale.map(
      (name) =>
        `Stale entry ${name} in ${ALLOWLIST}: it is no longer an unused operation. Remove it.`,
    ),
  ];
  for (const message of messages) console.error(message);
  if (messages.length > 0) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { operationsReport };
