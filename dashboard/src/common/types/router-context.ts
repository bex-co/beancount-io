import type { Localization } from "@/i18n/init";
import type { getClient } from "@/common/apollo/client";
import type { UserProfile } from "@/common/server-fn/user";

export type RouterContext = {
  localization: Localization;
  client: ReturnType<typeof getClient>;
  userProfile?: UserProfile | null;
};
