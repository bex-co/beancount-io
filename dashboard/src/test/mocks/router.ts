import { createElement } from "react";
import type { ComponentProps, MouseEvent } from "react";

/** The page a prompt under test is on, as the router state reports it. */
export const TEST_LOCATION_HREF = "/ledger/alice/books?view=journal";

type MockLinkProps = Omit<ComponentProps<"a">, "href" | "onClick"> & {
  to: string;
  search?: Record<string, string | undefined>;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * A `<Link>` stand-in whose `href` carries `search` the way the router
 * serializes a flat object, so a test can assert the whole destination.
 */
function MockLink({ to, search, onClick, ...props }: MockLinkProps) {
  const query = new URLSearchParams(
    Object.entries(search ?? {}).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  ).toString();
  return createElement("a", {
    ...props,
    href: query ? `${to}?${query}` : to,
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      onClick?.(event);
    },
  });
}

/** `vi.mock("@tanstack/react-router", async () => (await import(…)).routerMock)` */
export const routerMock = {
  Link: MockLink,
  // Entry Context's history guard mounts only inside a router (w4/1063).
  useRouter: () => ({}),
  useBlocker: () => ({ status: "idle", reset: () => {}, proceed: () => {} }),
  // Tests render after hydration; SSR-gated controls are already live.
  useHydrated: () => true,
  useRouterState: <T>({
    select,
  }: {
    select: (state: { location: { href: string } }) => T;
  }) => select({ location: { href: TEST_LOCATION_HREF } }),
};
