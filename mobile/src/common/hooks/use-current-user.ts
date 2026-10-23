import { useReactiveVar } from "@apollo/client";
import { sessionVar } from "@/common/vars";
import {
  useCurrentUserAvatarQuery,
  useCurrentUserQuery,
} from "@/generated-graphql/graphql";
import { userDisplayName } from "@/common/user-display";
import { isUnsupportedDocumentError } from "@/common/graphql-unsupported";

// Servers whose schema rejected `avatarUrl`. A rejected query is never
// cached, so without this every mount would ask again and fail again.
const serversWithoutAvatars = new Set<string>();

/** The signed-in account's profile, shared by the drawer, Settings and the
 * Profile screen through one cached query. */
export function useCurrentUser() {
  const session = useReactiveVar(sessionVar);
  // Legacy sessions predate per-session servers and use the default one.
  const server = session?.serverUrl ?? "";
  const { data, loading, error, refetch } = useCurrentUserQuery({
    skip: !session,
  });
  // Best effort: on a server without `avatarUrl` this fails on its own and
  // the avatar falls back to initials.
  const { data: avatarData } = useCurrentUserAvatarQuery({
    skip: !session || serversWithoutAvatars.has(server),
    onError: (avatarError) => {
      // Only a schema that rejects the field means "unsupported": a network
      // failure, or a GraphQL-wrapped outage or rate limit, may pass, where
      // one of those turned photos off until a restart (w21/803).
      if (session && isUnsupportedDocumentError(avatarError)) {
        serversWithoutAvatars.add(server);
      }
    },
  });
  const profile = data?.userProfile ?? null;
  const user = profile
    ? { ...profile, avatarUrl: avatarData?.userProfile?.avatarUrl ?? null }
    : null;
  return {
    user,
    displayName: profile ? userDisplayName(profile) : "",
    loading: loading && !profile,
    error,
    refetch,
  };
}
