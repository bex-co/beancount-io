import {
  DirectiveType,
  JournalOpenPublic,
  JournalClosePublic,
  FavaApiClient,
  unwrapFavaResponse,
} from "@/foundation/fava";

const PAGE_SIZE = 1000;

async function fetchAllByDirectiveType<T>(
  client: FavaApiClient,
  owner: string,
  repoName: string,
  directiveType: DirectiveType.Open | DirectiveType.Close,
): Promise<T[]> {
  const { items, total } = await unwrapFavaResponse(
    client.journal.getJournal(owner, repoName, {
      directive_types: [directiveType],
      limit: PAGE_SIZE,
      offset: 0,
    }),
    `fetch ${directiveType} entries`,
  );
  const allItems = [...items] as T[];

  if (total <= PAGE_SIZE) {
    return allItems;
  }

  const remainingPages = Math.ceil((total - PAGE_SIZE) / PAGE_SIZE);
  const additionalPages = await Promise.all(
    Array.from({ length: remainingPages }, (_, i) =>
      unwrapFavaResponse(
        client.journal.getJournal(owner, repoName, {
          directive_types: [directiveType],
          limit: PAGE_SIZE,
          offset: (i + 1) * PAGE_SIZE,
        }),
        `fetch ${directiveType} entries (paginated)`,
      ),
    ),
  );

  for (const page of additionalPages) {
    allItems.push(...(page.items as T[]));
  }

  return allItems;
}

export async function getAllOpenEntries(
  client: FavaApiClient,
  owner: string,
  repoName: string,
): Promise<JournalOpenPublic[]> {
  return fetchAllByDirectiveType<JournalOpenPublic>(
    client,
    owner,
    repoName,
    DirectiveType.Open,
  );
}

export async function getAllCloseEntries(
  client: FavaApiClient,
  owner: string,
  repoName: string,
): Promise<JournalClosePublic[]> {
  return fetchAllByDirectiveType<JournalClosePublic>(
    client,
    owner,
    repoName,
    DirectiveType.Close,
  );
}

export async function getAccountEntryCounts(
  client: FavaApiClient,
  owner: string,
  repoName: string,
): Promise<Map<string, number>> {
  const response = await client.shell.queryShell(owner, repoName, {
    query: "SELECT account, count(account) ORDER BY account",
  });

  const result = response.data?.data?.result;
  if (!result || !("rows" in result)) {
    return new Map();
  }

  return new Map(
    result.rows.map(([account, count]) => [String(account), Number(count)]),
  );
}
