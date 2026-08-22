import type { User } from "@/features/gitea/client/gitea-api";

/**
 * Python `UserPublic` (`app/schemas/user.py`) — every field serializes, unset
 * fields as null. Subset constructors in admin routes deliberately set only
 * some fields; the rest stay null (pydantic keeps defaulted Nones).
 */
export interface UserPublic {
  id: number | null;
  login: string | null;
  full_name: string | null;
  login_name: string | null;
  email: string | null;
  active: boolean | null;
  is_admin: boolean | null;
  created: string | null;
  last_login: string | null;
  source_id: number | null;
  visibility: string | null;
  restricted: boolean | null;
  prohibit_login: boolean | null;
  description: string | null;
}

export const EMPTY_USER_PUBLIC: UserPublic = {
  id: null,
  login: null,
  full_name: null,
  login_name: null,
  email: null,
  active: null,
  is_admin: null,
  created: null,
  last_login: null,
  source_id: null,
  visibility: null,
  restricted: null,
  prohibit_login: null,
  description: null,
};

/** Full model_validate(user) — all fields taken from the Gitea user. */
export function toUserPublic(user: User): UserPublic {
  const u = user as Record<string, unknown>;
  return {
    id: (u.id as number) ?? null,
    login: (u.login as string) ?? null,
    full_name: (u.full_name as string) ?? null,
    login_name: (u.login_name as string) ?? null,
    email: (u.email as string) ?? null,
    active: (u.active as boolean) ?? null,
    is_admin: (u.is_admin as boolean) ?? null,
    created: (u.created as string) ?? null,
    last_login: (u.last_login as string) ?? null,
    source_id: (u.source_id as number) ?? null,
    visibility: (u.visibility as string) ?? null,
    restricted: (u.restricted as boolean) ?? null,
    prohibit_login: (u.prohibit_login as boolean) ?? null,
    description: (u.description as string) ?? null,
  };
}
