import { tools } from "../src/features/awesome-plain-text-accounting/catalog";

const REQUEST_TIMEOUT_MS = 15_000;
const CONCURRENCY = 6;

interface LinkResult {
  name: string;
  href: string;
  status?: number;
  finalUrl?: string;
  error?: string;
}

async function request(href: string, method: "HEAD" | "GET") {
  return fetch(href, {
    method,
    redirect: "follow",
    headers: {
      "user-agent": "beancount-io-awesome-pta-link-check/1.0",
      accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

async function checkLink(tool: (typeof tools)[number]): Promise<LinkResult> {
  try {
    let response = await request(tool.href, "HEAD");
    if ([403, 405, 501].includes(response.status) || !response.ok) {
      response = await request(tool.href, "GET");
    }

    return {
      name: tool.name,
      href: tool.href,
      status: response.status,
      finalUrl: response.url,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      name: tool.name,
      href: tool.href,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const results: LinkResult[] = [];

  for (let index = 0; index < tools.length; index += CONCURRENCY) {
    results.push(
      ...(await Promise.all(
        tools.slice(index, index + CONCURRENCY).map(checkLink),
      )),
    );
  }

  for (const result of results) {
    const detail = result.error
      ? `FAIL ${result.error}`
      : `OK ${result.status}${
          result.finalUrl && result.finalUrl !== result.href
            ? ` → ${result.finalUrl}`
            : ""
        }`;
    console.log(`${detail}\t${result.name}\t${result.href}`);
  }

  const failures = results.filter((result) => result.error);
  if (failures.length > 0) {
    throw new Error(`${failures.length} Awesome PTA destination(s) failed`);
  }
}

await main();
