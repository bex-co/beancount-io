import { ClientOnly, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQuery } from "@apollo/client/react";
import { GetCurrentUserDocument } from "@/graphql/definitions";
import { Authenticated } from "@/common/components/authenticated";
import { AnalyticsEnabled } from "./analytics-enabled";
import { trackRouteView, setUserId } from "./track";

/** Fires a custom route_view event on mount and on every SPA navigation. */
const PageViewTracker = () => {
  // Select from s.matches (not s.location.href) — matches update only when
  // navigation fully resolves, so the pattern is always in sync with the page.
  const routePattern = useRouterState({
    select: (s) => {
      const leaf = s.matches[s.matches.length - 1];
      const routeId: string = leaf?.routeId ?? s.location.pathname;
      return routeId
        .replace(/\/\$$/, "/*") // trailing "$" catch-all -> "*"
        .replace(/\$([A-Za-z0-9_]+)/g, ":$1"); // "$param" -> ":param"
    },
  });

  const lastPatternRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastPatternRef.current === routePattern) return;
    lastPatternRef.current = routePattern;
    trackRouteView({ route_pattern: routePattern });
  }, [routePattern]);

  return null;
};

/**
 * Associates the authenticated user's id with GA4 once it is available. Only
 * mounts inside <Authenticated>, so the user query never runs for anonymous
 * visitors.
 */
const UserIdTracker = () => {
  const { data } = useQuery(GetCurrentUserDocument);

  useEffect(() => {
    if (data?.userProfile?.id) {
      setUserId(data.userProfile.id);
    }
  }, [data?.userProfile?.id]);

  return null;
};

/**
 * Single mount point for all client-side analytics tracking (page views +
 * user identity). Renders nothing unless analytics is enabled for the
 * environment. Mount once near the app root.
 */
export const AnalyticsProvider = () => {
  return (
    <AnalyticsEnabled>
      <ClientOnly>
        <PageViewTracker />
        <Authenticated>
          <UserIdTracker />
        </Authenticated>
      </ClientOnly>
    </AnalyticsEnabled>
  );
};
