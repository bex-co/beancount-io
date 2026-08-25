import { z } from "@/shared/zod-openapi-setup";
import { ledgerIdOf, ledgerPathSchema } from "./schemas";
import { v1Route } from "@/server/rest/v1-route";
import type { Identity } from "@/server/api/identity";
import type { ILedgerDataService } from "@/features/ledger/service/ledger-data-service";

/**
 * The ledger's own vocabulary: what it already contains.
 *
 * Payees, currencies, tags, links, narrations, years, commodities, events,
 * errors, attributes — the facts a caller needs *before* it can write a correct
 * entry. Without them a client has to reconstruct the ledger's vocabulary from
 * BQL on every session, which is what "already reachable through `runBqlQuery`"
 * excused for as long as these were absent.
 *
 * All ten previously carried `R.dashboardShaped` — "assembled for one screen".
 * That is true of `accountHierarchy` and `homeCharts`, which the category was
 * written for, and false of a `string[]` of payees. The category outran its
 * argument, which is the failure ADR 0008 D7 is the mechanical half of, and it
 * is why this family was invisible.
 *
 * Ported to REST and MCP in one pass (`mcp-resources.ts` holds the templates),
 * over the same `ILedgerDataService` methods the GraphQL resolvers call — two
 * adapters over one service, so no third behaviour can appear between them.
 */

/** One vocabulary read: a name, what it returns, and the service call behind it. */
interface VocabularyRead {
  readonly segment: string;
  readonly summary: string;
  readonly description: string;
  readonly schema: z.ZodTypeAny;
  /**
   * Narrowed to the one service it needs, rather than taking `AppLayers`.
   * Both surfaces hold that service and neither holds the same wrapper around
   * it, so a wider parameter would have forced one of them to fake the shape.
   */
  readonly fetch: (
    data: ILedgerDataService,
    params: { ledgerId: string; identity: Identity | undefined },
  ) => Promise<unknown>;
}

const stringList = z.array(z.string());

/**
 * Kept as data rather than ten hand-written route blocks.
 *
 * The ten differ only in a path segment and which service method they call, so
 * writing them out longhand would be ten chances to make nine of them agree and
 * one of them not. The MCP side reads the same list, which is what makes "the
 * two surfaces call one service" structural instead of a promise.
 */
export const VOCABULARY_READS: readonly VocabularyRead[] = [
  {
    segment: "payees",
    summary: "List payees used in the ledger",
    description:
      "Every payee that appears on a transaction. The list a client should reconcile against before inventing a new payee string.",
    schema: stringList,
    fetch: (data, p) => data.getPayees(p),
  },
  {
    segment: "narrations",
    summary: "List narrations used in the ledger",
    description: "Every narration string that appears on a transaction.",
    schema: stringList,
    fetch: (data, p) => data.getNarrations(p),
  },
  {
    segment: "currencies",
    summary: "List currencies used in the ledger",
    description:
      "Every currency the ledger's postings are denominated in. Writing an entry in a currency absent from this list is usually a typo.",
    schema: stringList,
    fetch: (data, p) => data.getCurrencies(p),
  },
  {
    segment: "tags",
    summary: "List tags used in the ledger",
    description: "Every `#tag` that appears on a directive.",
    schema: stringList,
    fetch: (data, p) => data.getTags(p),
  },
  {
    segment: "links",
    summary: "List links used in the ledger",
    description: "Every `^link` that appears on a directive.",
    schema: stringList,
    fetch: (data, p) => data.getLinks(p),
  },
  {
    segment: "years",
    summary: "List years the ledger covers",
    description:
      "Every year that has at least one directive — the ledger's span, without reading it.",
    schema: stringList,
    fetch: (data, p) => data.getYears(p),
  },
  {
    segment: "commodities",
    summary: "List commodities and their price pairs",
    description:
      "Commodity pairs held in the ledger, with the prices recorded for them.",
    schema: z.array(z.unknown()),
    fetch: (data, p) => data.getCommodities(p),
  },
  {
    segment: "events",
    summary: "List event directives",
    description: "Every `event` directive in the ledger, in date order.",
    schema: z.array(z.unknown()),
    fetch: (data, p) => data.getEvents(p),
  },
  {
    segment: "errors",
    summary: "List the ledger's parse and validation errors",
    description:
      "What `bean-check` reports for this ledger. An empty list means the ledger is currently valid.",
    schema: z.array(z.unknown()),
    fetch: (data, p) => data.getErrors(p),
  },
  {
    segment: "attributes",
    summary: "Get the ledger's attributes",
    description:
      "Accounts, currencies, payees, and links as one document — the summary the other endpoints break out individually.",
    schema: z.unknown(),
    fetch: (data, p) => data.getAttributes(p),
  },
];

export const VOCABULARY_ROUTES = VOCABULARY_READS.map((read) =>
  v1Route({
    method: "get",
    path: `/api-gateway/v1/ledgers/{owner}/{name}/${read.segment}`,
    summary: read.summary,
    description: read.description,
    params: ledgerPathSchema,
    responses: {
      200: {
        description: read.summary,
        content: { "application/json": { schema: read.schema } },
      },
    },
    handler: async ({ layers }, { identity, params }) =>
      read.fetch(layers.services.ledgerData, {
        ledgerId: ledgerIdOf(params),
        identity,
      }),
  }),
);
