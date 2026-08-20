import { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";
import Animated, {
  SharedValue,
  useAnimatedProps,
} from "react-native-reanimated";
import { sankey, type SankeyLink, type SankeyNode } from "d3-sankey";
import { ColorTheme } from "@/types/theme-props";
import { fontSizes, gutter, space, useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { ScreenWidth } from "@/common/screen-util";
import { LTR_PLOT } from "@/common/rtl";
import { LoadingTile } from "@/components/loading-tile";
import type { AccountNode } from "@/components/account-list/select-account-list";
import {
  ChartErrorBoundary,
  ChartLegend,
  ChartPlaceholder,
  LEGEND_HEIGHT,
  LegendItem,
} from "@/common/d3/chart-chrome";
import { useEntranceProgress } from "@/common/d3/use-entrance-progress";
import {
  type SankeyNodeDatum,
  transformToSankeyData,
  truncateSankeyLabel,
  sankeyColorForRole,
} from "../selectors/sankey-data";

/** Plot height; the skeleton is this plus the legend so the card does not jump. */
export const SANKEY_HEIGHT = 280;

const NODE_WIDTH = 16;
const NODE_PADDING = 10;
const LABEL_COL = 72;
const PLOT_PAD = 8;
const LABEL_GAP = 4;
/** Resting ribbon opacity — named so the draw-in worklet does not inline a literal. */
const RIBBON_OPACITY = 0.35;
const RIBBON_DIM_OPACITY = 0.1;

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

/**
 * Extra properties d3-sankey attaches *onto* its own link shape. `SankeyLinkDatum`
 * already has `source`/`target` as strings (the transformer's output); putting
 * that type in the second generic collapses the post-layout union to `string`
 * and the laid-out node objects become unusable.
 */
type LinkExtra = object;
type LayoutNode = SankeyNode<SankeyNodeDatum, LinkExtra>;
type LayoutLink = SankeyLink<SankeyNodeDatum, LinkExtra>;

function isLayoutNode(end: LayoutLink["source"]): end is LayoutNode {
  return typeof end === "object" && end !== null;
}

function nodeBox(
  node: LayoutNode,
): { x0: number; y0: number; x1: number; y1: number } | null {
  if (
    node.x0 == null ||
    node.y0 == null ||
    node.x1 == null ||
    node.y1 == null
  ) {
    return null;
  }
  return { x0: node.x0, y0: node.y0, x1: node.x1, y1: node.y1 };
}

/**
 * Closed ribbon for a laid-out link.
 *
 * `sankeyLinkHorizontal` only returns the centerline — meant to be drawn with
 * `strokeWidth = link.width`. On react-native-svg that stroke is centered on
 * the path, so the bottom outflow spills past the hub and the top one eats
 * into the node above. Drawing the ribbon as a filled area between the four
 * corners keeps every edge flush with its node. Edges are also clamped to the
 * source/target node boxes so float rounding cannot push a ribbon past a node.
 */
function sankeyRibbonPath(link: LayoutLink): string | null {
  if (!isLayoutNode(link.source) || !isLayoutNode(link.target)) {
    return null;
  }
  const width = link.width ?? 0;
  if (width <= 0 || link.y0 == null || link.y1 == null) {
    return null;
  }
  const source = link.source;
  const target = link.target;
  if (
    source.x1 == null ||
    source.y0 == null ||
    source.y1 == null ||
    target.x0 == null ||
    target.y0 == null ||
    target.y1 == null
  ) {
    return null;
  }
  const half = width / 2;
  const x0 = source.x1;
  const x1 = target.x0;
  const sy0 = Math.max(source.y0, link.y0 - half);
  const sy1 = Math.min(source.y1, link.y0 + half);
  const ty0 = Math.max(target.y0, link.y1 - half);
  const ty1 = Math.min(target.y1, link.y1 + half);
  if (sy1 - sy0 < 0.5 || ty1 - ty0 < 0.5) {
    return null;
  }
  const xi = (x0 + x1) / 2;
  return [
    `M${x0},${sy0}`,
    `C${xi},${sy0} ${xi},${ty0} ${x1},${ty0}`,
    `L${x1},${ty1}`,
    `C${xi},${ty1} ${xi},${sy1} ${x0},${sy1}`,
    "Z",
  ].join(" ");
}

type CashFlowSankeyProps = {
  income: AccountNode[];
  expenses: AccountNode[];
};

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    plot: {
      ...LTR_PLOT,
    },
    skeleton: {
      height: SANKEY_HEIGHT + LEGEND_HEIGHT,
      backgroundColor: theme.controlFill,
      paddingHorizontal: gutter,
      justifyContent: "center",
    },
    skeletonRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: space.md,
    },
    skeletonCol: {
      justifyContent: "center",
    },
    skeletonHub: {
      alignItems: "center",
    },
    skeletonTile: {
      marginBottom: space.sm,
    },
  });

const SKELETON_LEFT = [88, 64, 72, 52];
const SKELETON_RIGHT = [96, 70, 80, 60];

function AnimatedRibbon({
  d,
  color,
  progress,
  dimmed,
  onPressIn,
  onPressOut,
}: {
  d: string;
  color: string;
  progress: SharedValue<number>;
  dimmed: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}): JSX.Element {
  const rest = dimmed ? RIBBON_DIM_OPACITY : RIBBON_OPACITY;
  const animatedProps = useAnimatedProps(() => ({
    opacity: rest * progress.value,
  }));
  return (
    <AnimatedPath
      d={d}
      fill={color}
      animatedProps={animatedProps}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    />
  );
}

function AnimatedNodeRect({
  x,
  y,
  width,
  height,
  fill,
  progress,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  progress: SharedValue<number>;
}): JSX.Element {
  const animatedProps = useAnimatedProps(() => ({
    opacity: progress.value,
  }));
  return (
    <AnimatedRect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={2}
      fill={fill}
      animatedProps={animatedProps}
    />
  );
}

function CashFlowSankeyPlot({
  income,
  expenses,
}: CashFlowSankeyProps): JSX.Element {
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const [width, setWidth] = useState(ScreenWidth - gutter * 2);
  const [pressed, setPressed] = useState<string | null>(null);

  const data = useMemo(
    () =>
      transformToSankeyData({
        income,
        expenses,
        otherLabel: t("other"),
        cashFlowLabel: t("cashFlow"),
        savingsLabel: t("savings"),
      }),
    [income, expenses, t],
  );

  const ready = data.links.length > 0;
  const entrance = useEntranceProgress(ready);

  const graph = useMemo(() => {
    if (!ready || width < LABEL_COL * 2 + NODE_WIDTH) {
      return null;
    }
    const layout = sankey<SankeyNodeDatum, LinkExtra>()
      .nodeId((d) => d.id)
      .nodeWidth(NODE_WIDTH)
      .nodePadding(NODE_PADDING)
      .iterations(0)
      .extent([
        [LABEL_COL, PLOT_PAD],
        [width - LABEL_COL, SANKEY_HEIGHT - PLOT_PAD],
      ]);
    return layout({
      nodes: data.nodes.map((node) => ({ ...node })),
      links: data.links.map((link) => ({ ...link })),
    });
  }, [data, ready, width]);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next > 0 && next !== width) {
      setWidth(next);
    }
  };

  if (!ready) {
    return (
      <ChartPlaceholder height={SANKEY_HEIGHT} label={t("cashFlowEmpty")} />
    );
  }

  const nodeColor = (node: LayoutNode) => sankeyColorForRole(node.role, theme);

  return (
    <View style={styles.plot} onLayout={onLayout}>
      <Svg width={width} height={SANKEY_HEIGHT}>
        {graph?.links.map((link, index) => {
          if (!isLayoutNode(link.source) || !isLayoutNode(link.target)) {
            return null;
          }
          const d = sankeyRibbonPath(link);
          if (!d) {
            return null;
          }
          const colorNode =
            link.target.role !== "hub" ? link.target : link.source;
          const key = `${link.source.id}->${link.target.id}`;
          return (
            <AnimatedRibbon
              key={`link-${index}`}
              d={d}
              color={nodeColor(colorNode)}
              progress={entrance}
              dimmed={pressed !== null && pressed !== key}
              onPressIn={() => setPressed(key)}
              onPressOut={() => setPressed(null)}
            />
          );
        })}
        {graph?.nodes.map((node) => {
          const box = nodeBox(node);
          if (!box) {
            return null;
          }
          return (
            <AnimatedNodeRect
              key={`node-${node.id}`}
              x={box.x0}
              y={box.y0}
              width={Math.max(0, box.x1 - box.x0)}
              height={Math.max(0, box.y1 - box.y0)}
              fill={nodeColor(node)}
              progress={entrance}
            />
          );
        })}
        {graph?.nodes.map((node) => {
          if (node.role === "hub") {
            return null;
          }
          const box = nodeBox(node);
          if (!box) {
            return null;
          }
          // A node shorter than one line of label text can't host a readable
          // caption — drawing one just stacks "Health" / "Transport" on top
          // of each other when the range is long and the tail is thin.
          if (box.y1 - box.y0 < fontSizes.xs) {
            return null;
          }
          const isSource = (node.targetLinks?.length ?? 0) === 0;
          const x = isSource ? box.x0 - LABEL_GAP : box.x1 + LABEL_GAP;
          const y = (box.y0 + box.y1) / 2;
          return (
            <SvgText
              key={`label-${node.id}`}
              x={x}
              y={y}
              fontSize={fontSizes.xs}
              fill={theme.text01}
              textAnchor={isSource ? "end" : "start"}
              alignmentBaseline="middle"
            >
              {truncateSankeyLabel(node.label)}
            </SvgText>
          );
        })}
      </Svg>
      <ChartLegend>
        <LegendItem color={theme.success} label={t("income")} />
        <LegendItem color={theme.error} label={t("expenses")} />
        {data.nodes.some((node) => node.role === "savings") ? (
          <LegendItem color={theme.information} label={t("savings")} />
        ) : null}
      </ChartLegend>
    </View>
  );
}

/** First-load skeleton sized to the plot + legend so the card does not jump. */
export function CashFlowSankeySkeleton(): JSX.Element {
  const styles = useThemeStyle(getStyles);
  return (
    <View style={styles.skeleton}>
      {SKELETON_LEFT.map((left, index) => (
        <View key={index} style={styles.skeletonRow}>
          <View style={styles.skeletonCol}>
            <LoadingTile width={left} height={14} style={styles.skeletonTile} />
          </View>
          <View style={styles.skeletonHub}>
            {index === 1 ? <LoadingTile width={12} height={48} /> : null}
          </View>
          <View style={styles.skeletonCol}>
            <LoadingTile
              width={SKELETON_RIGHT[index]}
              height={14}
              style={styles.skeletonTile}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

export const CashFlowSankey = (props: CashFlowSankeyProps): JSX.Element => (
  <ChartErrorBoundary>
    <CashFlowSankeyPlot {...props} />
  </ChartErrorBoundary>
);
