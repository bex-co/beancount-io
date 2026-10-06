export type UserIdentity = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
};

/** The name a person recognizes as theirs: their full name, else their
 * username, else the part of their email before the `@`. */
export function userDisplayName(user: UserIdentity): string {
  const fullName = [user.firstName, user.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return fullName || user.username?.trim() || user.email.split("@")[0];
}

/** Up to two letters for an avatar placeholder: first and last word of the
 * name, or the first character alone for single-word and CJK names. */
export function userInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = Array.from(words[0])[0];
  if (words.length === 1) return first.toUpperCase();
  const last = Array.from(words[words.length - 1])[0];
  return `${first}${last}`.toUpperCase();
}

/** Gravatar serves a generic logo for addresses without a picture; `d=404`
 * makes it fail instead so the avatar can fall back to initials. The size is
 * requested in device pixels so the image stays sharp at the drawn size. */
export function avatarImageUri(
  url: string | null | undefined,
  pixelSize: number,
): string | undefined {
  if (!url) return undefined;
  const absolute = url.startsWith("//") ? `https:${url}` : url;
  if (!isGravatarUrl(absolute)) return absolute;
  // String surgery rather than `URL`: React Native's URL has no searchParams.
  const [base, query = ""] = absolute.split("?");
  const kept = query
    .split("&")
    .filter((pair) => pair && !/^(size|s|d|default)=/.test(pair));
  return `${base}?${[...kept, `s=${Math.round(pixelSize)}`, "d=404"].join("&")}`;
}

export function isGravatarUrl(url: string | null | undefined): boolean {
  return /^(https?:)?\/\/([a-z0-9-]+\.)?gravatar\.com\//i.test(url ?? "");
}
