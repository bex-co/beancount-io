import { z } from "zod";
import {
  createViewSearchSchema,
  isOneOfViews,
} from "@/common/lib/navigation/view-search";

/** How the Net Worth card presents its figures. */
export const NET_WORTH_VIEWS = ["chart", "table"] as const;

export type NetWorthView = (typeof NET_WORTH_VIEWS)[number];

export const DEFAULT_NET_WORTH_VIEW: NetWorthView = "chart";

/**
 * The overview returns a spinner while loading and deliberately keeps no prior
 * cards, so this choice cannot live in the card's own state: a shared
 * account/filter/time edit would flip it back to the chart.
 */
const netWorthSearchSchema = createViewSearchSchema(NET_WORTH_VIEWS);

/**
 * What the Money movement module shows under its month cards: where the
 * month's money went, by default, since the page header's timeline already
 * draws the months' history; or Income vs Expenses side by side.
 */
export const MONEY_MOVEMENT_VIEWS = ["flow", "trend"] as const;

export type MoneyMovementView = (typeof MONEY_MOVEMENT_VIEWS)[number];

export const DEFAULT_MONEY_MOVEMENT_VIEW: MoneyMovementView = "flow";

/**
 * Each Overview view has its own search parameter. The stepped month is
 * independent of the ledger's shared `time` filter.
 */
export const overviewSearchSchema = z
  .object({
    movement: z.unknown().optional(),
    month: z
      .string()
      .regex(/^\d{4}-(?:0[1-9]|1[0-2])$/)
      .optional()
      .catch(undefined),
  })
  .passthrough()
  .transform(
    (
      search,
    ): z.output<typeof netWorthSearchSchema> & {
      movement?: MoneyMovementView;
      month?: string;
    } => ({
      ...netWorthSearchSchema.parse(search),
      month: search.month,
      movement: isOneOfViews(MONEY_MOVEMENT_VIEWS, search.movement)
        ? search.movement
        : undefined,
    }),
  );
