import type { SearchUser } from "@/graphql/definitions";

export type CollaboratorPermissionType = "read" | "write" | "admin";

export type HandleInviteFunc = (
  users: SearchUser[],
  permission: CollaboratorPermissionType,
) => Promise<void>;
