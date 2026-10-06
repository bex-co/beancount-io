/** The `extensions.code` of every GraphQL error an Apollo error carries. */
export function graphQLErrorCodes(err: unknown): string[] {
  if (typeof err !== "object" || err === null) return [];
  const gqlErrors = (err as { graphQLErrors?: unknown }).graphQLErrors;
  if (!Array.isArray(gqlErrors)) return [];
  return gqlErrors
    .map((e) => {
      const code = (e as { extensions?: { code?: unknown } })?.extensions?.code;
      return typeof code === "string" ? code : undefined;
    })
    .filter((c): c is string => c !== undefined);
}
