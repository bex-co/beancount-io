import type { SearchUser } from "@/graphql/definitions";

export type CollaboratorPermissionType = "read" | "write" | "admin";

export interface InviteFailure {
  username: string;
  reason: string;
}

export type HandleInviteFunc = (
  users: SearchUser[],
  permission: CollaboratorPermissionType,
) => Promise<InviteFailure[]>;
