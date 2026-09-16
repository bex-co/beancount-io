/** Build the post-login return URL for Ask, omitting auto-submit `q`. */
export function buildAgentLoginNextUrl(
  pathname: string,
  search: string,
): string {
  const params = new URLSearchParams(search);
  params.delete("q");
  const nextSearch = params.toString();
  return nextSearch ? `${pathname}?${nextSearch}` : pathname;
}
