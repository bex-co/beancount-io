/**
 * Idempotent seeder for the parity Gitea. Creates a deterministic user and
 * fixture repos so both services answer the same requests over the same data:
 *
 *   book        — the shadow-corpus fixture repo (shared, read suites)
 *   fixture-py  — per-target copy for write suites (Python service)
 *   fixture-v2  — per-target copy for write suites (this service)
 *   book-large  — a bean-example book, when BEAN_EXAMPLE_FILE is provided
 *
 * Run: yarn ts-node -r tsconfig-paths/register --transpile-only parity/seed.ts
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const GITEA = process.env.PARITY_GITEA_URL || "http://localhost:13801";
const ADMIN_USER = process.env.PARITY_ADMIN_USER || "parityadmin";
const ADMIN_PASSWORD = process.env.PARITY_ADMIN_PASSWORD || "parityadmin123";

export const PARITY_USER = "parityuser";
export const PARITY_PASSWORD = "parityuser-pw-123";

const FIXTURES_DIR = resolve(
  __dirname,
  "../scripts/rustledger-shadow/fixtures",
);

function basic(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

async function api(
  method: string,
  path: string,
  auth: string,
  body?: unknown,
): Promise<Response> {
  return fetch(`${GITEA}/api/v1${path}`, {
    method,
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function ensureUser(): Promise<void> {
  const res = await api(
    "POST",
    "/admin/users",
    basic(ADMIN_USER, ADMIN_PASSWORD),
    {
      username: PARITY_USER,
      email: `${PARITY_USER}@example.com`,
      password: PARITY_PASSWORD,
      must_change_password: false,
    },
  );
  if (res.ok) {
    console.log(`created user ${PARITY_USER}`);
  } else if (res.status === 422 || res.status === 400 || res.status === 409) {
    console.log(`user ${PARITY_USER} already exists`);
  } else {
    throw new Error(`ensureUser failed: ${res.status} ${await res.text()}`);
  }
}

const userAuth = () => basic(PARITY_USER, PARITY_PASSWORD);

async function ensureRepo(name: string): Promise<void> {
  const res = await api("POST", "/user/repos", userAuth(), {
    name,
    private: true,
    auto_init: false,
    default_branch: "main",
  });
  if (res.ok) {
    console.log(`created repo ${name}`);
  } else if (res.status === 409) {
    console.log(`repo ${name} already exists`);
  } else {
    throw new Error(
      `ensureRepo(${name}) failed: ${res.status} ${await res.text()}`,
    );
  }
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

async function ensureFile(
  repo: string,
  repoPath: string,
  contentB64: string,
): Promise<void> {
  const res = await api(
    "POST",
    `/repos/${PARITY_USER}/${repo}/contents/${repoPath}`,
    userAuth(),
    { content: contentB64, message: `seed ${repoPath}` },
  );
  if (res.ok) {
    console.log(`  ${repo}/${repoPath} seeded`);
  } else if (res.status === 422) {
    // already exists — idempotent re-run
  } else {
    throw new Error(
      `ensureFile(${repo}, ${repoPath}) failed: ${res.status} ${await res.text()}`,
    );
  }
}

export async function seedFixtureRepo(repo: string): Promise<void> {
  await ensureRepo(repo);
  for (const file of walk(FIXTURES_DIR)) {
    const repoPath = relative(FIXTURES_DIR, file).split("\\").join("/");
    await ensureFile(repo, repoPath, readFileSync(file).toString("base64"));
  }
}

const PLUGIN_BOOK_MAIN = `option "title" "Plugin parity book"
option "operating_currency" "USD"
plugin "fava.plugins.forecast"
plugin "fava.plugins.amortize_over"
plugin "fava.plugins.link_documents"
plugin "fava.plugins.tag_discovered_documents"

2024-01-01 open Assets:Cash USD
2024-01-01 open Assets:Bank USD
2024-01-01 open Expenses:Insurance USD
2024-01-01 open Expenses:Utilities USD
2024-01-01 open Income:Salary USD

2024-01-15 * "Employer" "Salary"
  Assets:Bank  2500.00 USD
  Income:Salary  -2500.00 USD

2024-02-05 # "Electricity bill [MONTHLY REPEAT 3 TIMES]"
  Expenses:Utilities  85.00 USD
  Assets:Cash  -85.00 USD

2024-03-01 * "Insurer" "Amortize car insurance"
  amortize_months: 3
  Expenses:Insurance  300.00 USD
  Assets:Bank  -300.00 USD

2024-04-10 document Assets:Bank "receipts/invoice.pdf"

2024-04-10 * "Utility Co" "Pay invoice"
  document: "invoice.pdf"
  Assets:Bank  -50.00 USD
  Expenses:Utilities  50.00 USD
`;

/** Seed the plugin-behavior book (all four fava.plugins.* enabled). */
export async function seedPluginBook(repo: string): Promise<void> {
  await ensureRepo(repo);
  await ensureFile(
    repo,
    "main.bean",
    Buffer.from(PLUGIN_BOOK_MAIN, "utf8").toString("base64"),
  );
  // any binary works — the document check only needs the blob to exist
  const pdf = readFileSync(join(FIXTURES_DIR, "receipts/lunch.pdf"));
  await ensureFile(repo, "receipts/invoice.pdf", pdf.toString("base64"));
}

const AUTOACCT_MAIN = `plugin "beancount.plugins.auto_accounts"

2024-01-01 * "Shop" "No opens anywhere"
  Expenses:Misc  10.00 USD
  Assets:Cash  -10.00 USD
`;

const IMPLPRICE_MAIN = `plugin "beancount.plugins.implicit_prices"

2024-01-01 open Assets:Cash USD
2024-01-01 open Assets:Stock STK

2024-02-01 * "Buy" "stock"
  Assets:Stock  2 STK @ 50.00 USD
  Assets:Cash  -100.00 USD
`;

const UNKNOWNPLUG_MAIN = `plugin "some.nonexistent.plugin"

2024-01-01 open Assets:Cash USD
`;

/** Single-file probe books for builtin/unknown plugin behavior. */
export async function seedProbeBooks(): Promise<void> {
  for (const [repo, main] of [
    ["autoacct-book", AUTOACCT_MAIN],
    ["implprice-book", IMPLPRICE_MAIN],
    ["unknownplug-book", UNKNOWNPLUG_MAIN],
  ] as const) {
    await ensureRepo(repo);
    await ensureFile(
      repo,
      "main.bean",
      Buffer.from(main, "utf8").toString("base64"),
    );
  }
}

async function main(): Promise<void> {
  await ensureUser();
  await seedFixtureRepo("book");
  await seedFixtureRepo("fixture-py");
  await seedFixtureRepo("fixture-v2");
  await seedPluginBook("plugin-book");
  await seedProbeBooks();

  const beanExample = process.env.BEAN_EXAMPLE_FILE;
  if (beanExample && existsSync(beanExample)) {
    await ensureRepo("book-large");
    await ensureFile(
      "book-large",
      "main.bean",
      readFileSync(beanExample).toString("base64"),
    );
  } else {
    console.log("BEAN_EXAMPLE_FILE not provided — skipping book-large");
  }
  console.log("seed complete");
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
