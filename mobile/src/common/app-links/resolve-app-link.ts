import { Href } from "expo-router";

/** Hosted production origin — always accepted by the resolver. */
export const HOSTED_APP_ORIGIN = "https://beancount.io";

export type AppLinkTarget = {
  ledgerFullName: string;
  href: Href;
};

export type ResolveAppLinkOptions = {
  /** Selected server origin (with or without trailing slash). */
  serverUrl?: string;
  /** Always-accepted hosted origin. Defaults to beancount.io. */
  hostedOrigin?: string;
};

export function normalizeOrigin(url: string): string {
  return url.replace(/\/+$/, "");
}

function hostFromOrigin(origin: string): string | null {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function allowedHosts(options: ResolveAppLinkOptions): Set<string> {
  const hosts = new Set<string>();
  const hosted = normalizeOrigin(options.hostedOrigin ?? HOSTED_APP_ORIGIN);
  const hostedHost = hostFromOrigin(hosted);
  if (hostedHost) hosts.add(hostedHost);
  if (options.serverUrl) {
    const serverHost = hostFromOrigin(normalizeOrigin(options.serverUrl));
    if (serverHost) hosts.add(serverHost);
  }
  return hosts;
}

/**
 * Map a dashboard ledger URL to an Expo Router href + ledger identity.
 * Returns null for foreign hosts and non-ledger paths (gallery, settings, auth).
 */
export function resolveAppLink(
  url: string,
  options: ResolveAppLinkOptions = {},
): AppLinkTarget | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  if (!allowedHosts(options).has(host)) {
    return null;
  }

  const segments = parsed.pathname
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });

  if (segments[0] !== "ledger" || segments.length < 3) {
    return null;
  }

  const owner = segments[1];
  const name = segments[2];
  if (!owner || !name) {
    return null;
  }

  const ledgerFullName = `${owner}/${name}`;
  const rest = segments.slice(3);

  // Prefer public pathnames (no group segments). NativeTabs + Universal Links
  // cold-start reliably honor `/reports` etc.; `/(app)/(tabs)/reports` can lose
  // the race against the tabs initial route and leave the user on Home.
  if (rest.length === 0 || (rest.length === 1 && rest[0] === "overview")) {
    return { ledgerFullName, href: "/" };
  }

  const [head, ...tail] = rest;

  switch (head) {
    case "account": {
      if (tail.length !== 1 || !tail[0]) {
        return { ledgerFullName, href: "/" };
      }
      return {
        ledgerFullName,
        href: {
          pathname: "/account-detail",
          // `ledger` binds the entry to the link's ledger: `openAppLinkTarget`
          // replaces only the current history entry, so without it a Back tap
          // could revive this account under whatever ledger is selected then.
          params: { account: tail[0], ledger: ledgerFullName },
        },
      };
    }
    case "journal":
      return { ledgerFullName, href: "/transactions" };
    case "commit": {
      if (tail.length !== 1 || !tail[0]) {
        return { ledgerFullName, href: "/" };
      }
      return {
        ledgerFullName,
        href: {
          pathname: "/commit-detail",
          params: { sha: tail[0] },
        },
      };
    }
    case "files": {
      // /files/blob/$branch/$path... — mobile editor takes the path only.
      if (tail[0] !== "blob" || tail.length < 3) {
        return { ledgerFullName, href: "/" };
      }
      const path = tail.slice(2).join("/");
      if (!path) {
        return { ledgerFullName, href: "/" };
      }
      return {
        ledgerFullName,
        href: {
          pathname: "/ledger-file-editor",
          params: { path },
        },
      };
    }
    case "income-statement":
    case "balance-sheet":
      return { ledgerFullName, href: "/reports" };
    case "budget":
      return { ledgerFullName, href: "/budget" };
    case "entry": {
      if (tail.length !== 1 || !tail[0]) {
        return { ledgerFullName, href: "/" };
      }
      return {
        ledgerFullName,
        href: {
          pathname: "/transaction-detail",
          params: { entry_hash: tail[0] },
        },
      };
    }
    default:
      return { ledgerFullName, href: "/" };
  }
}
