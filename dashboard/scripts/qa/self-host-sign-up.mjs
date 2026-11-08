/**
 * Smoke test for a self-hosted stack (SELF_HOST=true): can a stranger sign up,
 * land signed in, keep the session, and create ledgers beyond the Free tier?
 *
 *   const result = await selfHostSignUp(page, { baseURL: "https://dashboard.example.com" });
 *
 * Takes any Playwright `page` (see run-self-host-sign-up.mjs for a standalone
 * runner). It creates a throwaway account with a random address and password,
 * so nothing is hard-coded, and deletes that account again unless `keep` is set.
 *
 * It judges what a deployment can get wrong and unit tests cannot see: the
 * cookie the browser accepts, the page it lands on, the session surviving a
 * reload, and a ledger actually being created through the backend and Gitea.
 *
 * A stack that verifies email shows a code page instead of signing the visitor
 * in. That is not a failure of this check, so it reports "skipped" (or fails,
 * with `requireSelfHost`, for a pipeline that expects SELF_HOST).
 */
import { randomBytes } from "node:crypto";

export const AUTH_COOKIE = "authSess:beancount.io";

/** A fresh, unguessable account; the password shares nothing with the address. */
export function makeAccount(random = (n) => randomBytes(n).toString("hex")) {
  const tag = random(5);
  return {
    firstName: "Smoke",
    lastName: "Test",
    email: `smoke-${tag}@example.com`,
    username: `smoke_${tag}`,
    password: `${random(12)}-${random(12)}`,
    ledger: `smoke-books-${tag}`,
  };
}

/** The checks a sign-in cookie has to pass for the browser to keep the session. */
export function judgeCookie(cookies, baseURL) {
  const url = new URL(baseURL);
  const cookie = cookies.find((c) => c.name === AUTH_COOKIE);
  if (!cookie)
    return { ok: false, detail: `no ${AUTH_COOKIE} cookie was stored` };
  const problems = [];
  if (!cookie.httpOnly) problems.push("not HttpOnly");
  if (url.protocol === "https:" && !cookie.secure) problems.push("not Secure");
  const domain = cookie.domain.replace(/^\./, "");
  if (domain !== url.hostname && !url.hostname.endsWith(`.${domain}`)) {
    problems.push(`domain ${cookie.domain} does not cover ${url.hostname}`);
  }
  return problems.length
    ? { ok: false, detail: problems.join(", ") }
    : {
        ok: true,
        detail: `${cookie.domain}, HttpOnly${cookie.secure ? ", Secure" : ""}`,
      };
}

const VERIFY_PAGE = /verify your email|\b\d-digit code\b/i;

export default async function selfHostSignUp(
  page,
  { baseURL, keep = false, requireSelfHost = false, timeoutMs = 30000 },
) {
  const account = makeAccount();
  const checks = [];
  const record = (name, ok, detail = "") => {
    checks.push({ name, ok, detail });
    return ok;
  };
  const at = (path) => new URL(path, baseURL).href;
  const result = (extra = {}) => ({
    checks,
    account: { email: account.email, username: account.username },
    ...extra,
  });

  const consoleErrors = [];
  page.on?.(
    "console",
    (m) => m.type() === "error" && consoleErrors.push(m.text()),
  );

  await page.goto(at("/auth/sign-up"), { waitUntil: "networkidle" });
  const formReady = await page
    .locator("#email")
    .waitFor({ timeout: timeoutMs })
    .then(
      () => true,
      () => false,
    );
  if (
    !record(
      "the sign-up form renders",
      formReady,
      formReady ? "" : "no #email field",
    )
  )
    return result();

  await page.locator("#firstName").fill(account.firstName);
  await page.locator("#lastName").fill(account.lastName);
  await page.locator("#email").fill(account.email);
  await page.locator("#username").fill(account.username);
  await page.locator("#password").fill(account.password);
  await page.locator("#confirmPassword").fill(account.password);
  await page.locator("button[type=submit]").click();

  const left = await page
    .waitForURL((u) => !u.pathname.startsWith("/auth/sign-up"), {
      timeout: timeoutMs,
    })
    .then(
      () => true,
      () => false,
    );
  const text = await page.locator("body").innerText();
  if (!left && VERIFY_PAGE.test(text)) {
    const message =
      "this stack verifies email: it sent a code instead of signing the visitor in";
    return requireSelfHost
      ? (record("signs the visitor in without an email step", false, message),
        result())
      : result({ skipped: message });
  }
  if (
    !record("sign-up lands on a signed-in page", left, `now at ${page.url()}`)
  )
    return result();
  record("no verification page was shown", !VERIFY_PAGE.test(text));

  const cookie = judgeCookie(await page.context().cookies(baseURL), baseURL);
  record("the browser keeps the sign-in cookie", cookie.ok, cookie.detail);

  await page.reload({ waitUntil: "networkidle" });
  record(
    "a reload keeps the session",
    !new URL(page.url()).pathname.startsWith("/auth/login"),
    `at ${page.url()}`,
  );

  const name = page.getByPlaceholder("Enter ledger name");
  const formFound = await name.waitFor({ timeout: 10000 }).then(
    () => true,
    () => false,
  );
  if (record("the first-ledger form is offered", formFound)) {
    await name.fill(account.ledger);
    await page.getByRole("button", { name: /^save$/i }).click();
    const made = await page
      .waitForURL(/\/ledger\//, { timeout: timeoutMs })
      .then(
        () => true,
        () => false,
      );
    record("a ledger is created", made, `now at ${page.url()}`);
  }

  // The Free tier allows one ledger; a self-hosted stack lifts that.
  const extra = await page.evaluate(async (ledger) => {
    const response = await fetch("/api-gateway/", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operationName: "CreateLedger",
        query:
          "mutation CreateLedger($name:String!){ createLedger(name:$name){ fullName } }",
        variables: { name: `${ledger}-2` },
      }),
    });
    const body = await response.json();
    return {
      status: response.status,
      error: body.errors?.[0]?.message,
      created: body.data?.createLedger?.fullName,
    };
  }, account.ledger);
  record(
    "a second ledger is allowed (no plan limit)",
    Boolean(extra.created),
    extra.error ?? extra.created ?? "",
  );

  record(
    "no console errors",
    consoleErrors.length === 0,
    consoleErrors.slice(0, 2).join(" | "),
  );

  if (!keep) {
    const gone = await page.evaluate(async () => {
      const response = await fetch("/api-gateway/", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operationName: "DeleteAccount",
          query: "mutation DeleteAccount { deleteAccount }",
        }),
      });
      const body = await response.json();
      return body.data?.deleteAccount === true;
    });
    record(
      "the throwaway account is deleted",
      gone,
      gone ? "" : `delete it by hand: ${account.email}`,
    );
  }
  return result();
}
