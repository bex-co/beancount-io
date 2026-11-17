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
 * reload, a ledger actually being created through the backend and Gitea, sign-up
 * closing behind the first account, clone addresses that name this stack and
 * lead to a Git host, and an OAuth sign-in (the mobile app's, an MCP client's)
 * that is discovered on this host and redirects the browser.
 *
 * A stack that verifies email shows a code page instead of signing the visitor
 * in. That is not a failure of this check, so it reports "skipped" (or fails,
 * with `requireSelfHost`, for a pipeline that expects SELF_HOST).
 *
 * A self-hosted stack closes sign-up once its first account exists, and sends a
 * visitor who asks for the sign-up page to sign in instead. That is the stack
 * working as designed, not a failure, so it reports "skipped" too: run this
 * against a fresh deploy, before anyone has signed up.
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

/** True for the hosted service's own addresses, which a self-hosted stack must never hand out. */
const isHostedAddress = (address) => {
  if (!address) return false;
  // An SSH address has no scheme: git@host:owner/name.git.
  const host = /^[a-z][a-z0-9+.-]*:\/\//i.test(address)
    ? new URL(address).hostname
    : address.replace(/^[^@]*@/, "").split(/[:/]/)[0];
  return host === "beancount.io" || host.endsWith(".beancount.io");
};

/**
 * What the stack says about itself once the first account exists: sign-up is
 * closed behind it, and every ledger's clone address names this stack.
 */
export function judgeContract({ deployment, ledgers = [], error }) {
  if (error || !deployment) {
    return [
      {
        name: "the stack reports its deployment and ledgers",
        ok: false,
        detail: error ?? "no deploymentInfo in the response",
      },
    ];
  }
  const hosted = ledgers
    .flatMap((l) => [l.httpUrl, l.sshUrl])
    .filter(isHostedAddress);
  return [
    {
      name: "sign-up is closed behind the first account",
      ok: deployment.selfHost === true && deployment.signUpOpen === false,
      detail: `selfHost ${deployment.selfHost}, signUpOpen ${deployment.signUpOpen}`,
    },
    {
      name: "ledger clone addresses name this stack, not beancount.io",
      ok: ledgers.length > 0 && hosted.length === 0,
      detail: hosted[0] ?? ledgers[0]?.httpUrl ?? "no ledger to read",
    },
  ];
}

/**
 * What an OAuth client (the mobile app, an MCP client) needs from the stack: a
 * discovery document that names this host, and an authorization endpoint that
 * sends the browser on to sign in. `authorize` is the status and Location of an
 * authorization request made without following redirects.
 */
export function judgeOAuth({ metadata, authorize, error }, baseURL) {
  const origin = new URL(baseURL).origin;
  if (error || !metadata) {
    return [
      {
        name: "OAuth discovery names this stack",
        ok: false,
        detail: error ?? "no discovery document",
      },
    ];
  }
  const endpoints = [
    metadata.issuer,
    metadata.authorization_endpoint,
    metadata.token_endpoint,
  ];
  const elsewhere = endpoints.find(
    (url) => !url || new URL(url).origin !== origin,
  );
  const redirected =
    authorize?.status >= 300 &&
    authorize.status < 400 &&
    Boolean(authorize.location);
  return [
    {
      name: "OAuth discovery names this stack",
      ok: endpoints.every(Boolean) && elsewhere === undefined,
      detail: elsewhere ?? metadata.issuer ?? "an endpoint is missing",
    },
    {
      name: "the authorization endpoint sends the browser on to sign in",
      ok: redirected,
      detail: redirected
        ? `${authorize.status} to ${new URL(authorize.location).pathname}`
        : `answered ${authorize?.status ?? "nothing"} with no redirect: a proxy in front of the API is following it`,
    },
  ];
}

/** Ask the stack for its OAuth discovery document and start an authorization, as the mobile app does. */
async function probeOAuth(request, baseURL, timeout) {
  try {
    const discovery = await request.get(
      new URL("/.well-known/oauth-authorization-server", baseURL).href,
      { timeout },
    );
    const metadata = await discovery.json();
    if (!metadata.authorization_endpoint) return { metadata };
    const url = new URL(metadata.authorization_endpoint);
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: "beancount-mobile",
      redirect_uri: "io.beancount.ios:/oauth/callback",
      scope: "openid",
      state: "smoke",
      // The S256 challenge of RFC 7636's example verifier; no code is redeemed.
      code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
      code_challenge_method: "S256",
    });
    const response = await request.get(url.href, { maxRedirects: 0, timeout });
    return {
      metadata,
      authorize: {
        status: response.status(),
        location: response.headers().location,
      },
    };
  } catch (error) {
    return { error: String(error.message ?? error) };
  }
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
  if (!new URL(page.url()).pathname.startsWith("/auth/sign-up")) {
    return result({
      skipped:
        "this stack takes no more sign-ups: a self-hosted stack closes sign-up once its first account exists, so there is nothing to try",
    });
  }
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
    // By test id, not by label: the button's text changes with the form's mode
    // and the visitor's language. A failure here is a failed check, never a
    // thrown error, because the account made above still has to be deleted:
    // left behind, it closes sign-up on the stack under test.
    const made = await page
      .getByTestId("ledger-form-submit")
      .click({ timeout: timeoutMs })
      .then(() => page.waitForURL(/\/ledger\//, { timeout: timeoutMs }))
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

  const contract = await page.evaluate(async () => {
    const response = await fetch("/api-gateway/", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operationName: "SelfHostContract",
        query:
          "query SelfHostContract { deploymentInfo { selfHost signUpOpen } listLedgers { fullName httpUrl sshUrl } }",
      }),
    });
    const body = await response.json();
    return {
      deployment: body.data?.deploymentInfo,
      ledgers: body.data?.listLedgers,
      error: body.errors?.[0]?.message,
    };
  });
  for (const check of judgeContract(contract))
    record(check.name, check.ok, check.detail);

  // A private ledger's address must be a Git host that asks who is cloning. A
  // 404 or a page of HTML means the address leads nowhere a `git clone` works.
  const cloneUrl = contract.ledgers?.[0]?.httpUrl;
  if (cloneUrl && page.request) {
    const status = await page.request
      .get(`${cloneUrl}/info/refs?service=git-upload-pack`, {
        timeout: timeoutMs,
      })
      .then(
        (response) => response.status(),
        (error) => String(error.message ?? error),
      );
    record(
      "the clone address is a Git host that asks for credentials",
      status === 401,
      `${cloneUrl} answered ${status}`,
    );
  }

  if (page.request) {
    const oauth = await probeOAuth(page.request, baseURL, timeoutMs);
    for (const check of judgeOAuth(oauth, baseURL))
      record(check.name, check.ok, check.detail);
  }

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
