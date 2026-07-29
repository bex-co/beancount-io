import { getClient } from "@/common/apollo/client";
import {
  GetCurrentUserDocument,
  type GetCurrentUserQuery,
} from "@/graphql/definitions";

export type UserProfile = NonNullable<GetCurrentUserQuery["userProfile"]>;

export async function fetchUserProfile(
  defaultClient?: ReturnType<typeof getClient>,
): Promise<UserProfile | null> {
  const client = defaultClient ?? getClient();
  try {
    const result = await client.query({
      query: GetCurrentUserDocument,
      fetchPolicy: "network-only",
    });
    return result.data?.userProfile ?? null;
  } catch {
    return null;
  }
}
