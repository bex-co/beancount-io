/**
 * Helpers for `GET /ledgers/search`. Gitea's repo search matches the typed text
 * as ONE substring of the repository name (or description), so "crypto example"
 * never matched `crypto-example`, and an owner matched only through a
 * description (w21/245). The ledger service reads a query as words instead.
 */

/** The words of a query: split on whitespace, empty parts dropped. */
export function searchTerms(q: string | undefined): string[] {
  return (q ?? "").split(/\s+/).filter(Boolean);
}

/** Lower-cased, with the characters a ledger name is hyphenated with as spaces. */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .split(/[\s\-_/.]+/)
    .filter(Boolean)
    .join(" ");
}

/**
 * Whether a repository's `owner/name` or description contains `term`, the way
 * a person reads it: "example" is in `open_ledger/crypto-example`, and so is
 * "ledger crypto".
 */
export function repoMatchesTerm(
  repo: { full_name?: string; description?: string | null },
  term: string,
): boolean {
  const wanted = normalizeSearchText(term);
  if (!wanted) return true;
  return normalizeSearchText(
    `${repo.full_name ?? ""} ${repo.description ?? ""}`,
  ).includes(wanted);
}

/**
 * Whether `term` can be a Gitea user or organization name. Only these are
 * looked up as an owner, so a word like "my book" or a path never costs a
 * request.
 */
export function mightBeOwnerName(term: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,38}$/.test(term);
}

/** Keeps the first of repeated ids, in order. */
function dedupeById<T extends { id?: number }>(repos: T[]): T[] {
  const seen = new Set<number | undefined>();
  const out: T[] = [];
  for (const repo of repos) {
    if (repo.id !== undefined && seen.has(repo.id)) continue;
    seen.add(repo.id);
    out.push(repo);
  }
  return out;
}

/** One page of an upstream repository search. */
export interface SearchPage<T> {
  ok: boolean | null;
  data: T[];
}

/**
 * The first `wanted` matches of several upstream searches taken in order:
 * every repository of the first search, then those of the next, repeats
 * dropped and `keep` applied. Each search is read `pageSize` at a time, at
 * most `maxPages` pages.
 *
 * Only the pages the wanted matches can come from are read, and the pages a
 * round needs are requested together rather than one after another. Signed
 * in, Gitea takes about 0.7 s to answer a page of 50 repositories, so reading
 * every page of an owner's ledgers in turn made a search for `open_ledger`
 * take 3–5 s whatever page was asked for (w2/135).
 */
export async function readMatches<T extends { id?: number }>(
  searches: number,
  readPage: (search: number, page: number) => Promise<SearchPage<T>>,
  {
    keep,
    wanted,
    pageSize,
    maxPages,
  }: {
    keep: (repo: T) => boolean;
    wanted: number;
    pageSize: number;
    maxPages: number;
  },
): Promise<{ matches: T[]; ok: boolean | null }> {
  const read = Array.from({ length: searches }, () => ({
    repos: [] as T[],
    pages: 0,
    done: false,
    ok: null as boolean | null,
  }));
  const pagesFor = (count: number) => Math.max(1, Math.ceil(count / pageSize));

  const readMore = async (search: number, count: number): Promise<void> => {
    const state = read[search];
    const first = state.pages + 1;
    const last = Math.min(maxPages, state.pages + count);
    const pages = await Promise.all(
      Array.from({ length: last - first + 1 }, (_, i) =>
        readPage(search, first + i),
      ),
    );
    for (const page of pages) {
      // A short page is the last one; anything read past it is not.
      if (state.done) break;
      state.ok ??= page.ok;
      state.repos.push(...page.data);
      state.pages += 1;
      state.done = page.data.length < pageSize || state.pages >= maxPages;
    }
  };

  // A later search's repositories follow all of an earlier one's, so they
  // count only once every earlier search has been read to its end.
  const matchesSoFar = (): T[] => {
    const repos: T[] = [];
    for (const state of read) {
      repos.push(...state.repos);
      if (!state.done) break;
    }
    return dedupeById(repos).filter(keep);
  };

  await Promise.all(
    read.map((_, search) => readMore(search, pagesFor(wanted))),
  );
  let matches = matchesSoFar();
  while (matches.length < wanted) {
    const search = read.findIndex((state) => !state.done);
    if (search < 0) break;
    await readMore(search, pagesFor(wanted - matches.length));
    matches = matchesSoFar();
  }
  return { matches, ok: read.find((state) => state.ok !== null)?.ok ?? null };
}
