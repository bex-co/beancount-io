import type { getClient } from "@/common/apollo/client";
import type { UserProfile } from "@/common/server-fn/user";

export type RouterContext = {
  client: ReturnType<typeof getClient>;
  userProfile?: UserProfile | null;
};
