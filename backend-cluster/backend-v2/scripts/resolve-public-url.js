/**
 * Work out this deployment's public address at container start, for platforms
 * that assign hostnames (bex): the operator cannot write the address into the
 * Blueprint, and a second deployer of the same Blueprint is given a different
 * one when the first choice is taken.
 *
 * The dashboard is the one public entry point and knows its own address. When
 * `PUBLIC_URL_FROM` names an endpoint that returns it, this asks once (with
 * retries, because both services start together) and prints shell `export`
 * lines for the variables the API needs:
 *
 *   DASHBOARD_URL          the OAuth issuer and every link the API builds
 *   AUTH_COOKIE_DOMAIN     that host alone, never a shared parent domain
 *   EXTRA_ALLOWED_ORIGINS  that origin, for the API's origin check
 *
 * Anything the operator already set is left alone, so a custom domain or a
 * non-bex deployment is unaffected. With `PUBLIC_URL_FROM` unset this prints
 * nothing at all. When it is set but the address cannot be learned, this exits
 * non-zero: the API's own default for DASHBOARD_URL is beancount.io's, and
 * starting with that would silently point the OAuth issuer at the wrong site.
 *
 * Plain CommonJS on purpose — it runs with bare `node`, like migrate-deploy.js.
 * Use it as: `out=$(node scripts/resolve-public-url.js) && eval "$out"`.
 */

const RETRY_DELAY_MS = 2000;
const GIVE_UP_AFTER_MS = 5 * 60 * 1000;

/** The origin of an https URL, or throws. Paths and trailing slashes are dropped. */
function publicOrigin(value) {
  let url;
  try {
    url = new URL(String(value).trim());
  } catch {
    throw new Error("the public URL is not an absolute URL");
  }
  if (url.protocol !== "https:") throw new Error("the public URL must use https");
  if (url.username || url.password) {
    throw new Error("the public URL must not contain credentials");
  }
  return url.origin;
}

/** `export NAME='value'` for each variable that is not already set. */
function exportLines(origin, env) {
  const host = new URL(origin).host;
  const wanted = {
    DASHBOARD_URL: origin,
    AUTH_COOKIE_DOMAIN: host,
    EXTRA_ALLOWED_ORIGINS: origin,
  };
  return Object.entries(wanted)
    .filter(([name]) => !(env[name] && env[name].trim()))
    .map(([name, value]) => `export ${name}='${value}'`);
}

async function learnOrigin(from, { fetchImpl, sleep, now }) {
  const startedAt = now();
  let lastError;
  for (;;) {
    try {
      const response = await fetchImpl(from);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return publicOrigin(await response.text());
    } catch (error) {
      lastError = error;
      if (now() - startedAt >= GIVE_UP_AFTER_MS) break;
      await sleep(RETRY_DELAY_MS);
    }
  }
  throw new Error(
    `could not learn the public URL from PUBLIC_URL_FROM (${lastError.message})`,
  );
}

async function resolvePublicEnv(env, deps) {
  const from = (env.PUBLIC_URL_FROM || "").trim();
  if (!from) return [];
  // An address the operator wrote down wins; the rest follow from it.
  const explicit = (env.DASHBOARD_URL || "").trim();
  const origin = explicit
    ? publicOrigin(explicit)
    : await learnOrigin(from, deps);
  return exportLines(origin, env);
}

if (require.main === module) {
  resolvePublicEnv(process.env, {
    fetchImpl: (url) => fetch(url),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: Date.now,
  }).then(
    (lines) => {
      if (lines.length) console.log(lines.join("\n"));
    },
    (error) => {
      console.error(`resolve-public-url: ${error.message}`);
      process.exit(1);
    },
  );
}

module.exports = { publicOrigin, exportLines, resolvePublicEnv };
