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
 * `?view=` is the Net Worth card's and `?movement=` the Money movement
 * module's, for the same reason: a shared scope edit unmounts the page. An
 * unknown value of either falls back to the default.
 */
export const overviewSearchSchema = z
  .object({ movement: z.unknown().optional() })
  .passthrough()
  .transform(
    (
      search,
    ): z.output<typeof netWorthSearchSchema> & {
      movement?: MoneyMovementView;
    } => ({
      ...netWorthSearchSchema.parse(search),
      movement: isOneOfViews(MONEY_MOVEMENT_VIEWS, search.movement)
        ? search.movement
        : undefined,
    }),
  );
