import { forwardRef } from "react";
import type { EChartsProps, EChartsRef } from "./types";

/**
 * Server-side placeholder for ReactECharts.
 * Renders a plain div with the same style/className so layout is preserved
 * during SSR before the client chart hydrates.
 */
export const ReactEChartsServer = forwardRef<EChartsRef, EChartsProps>(
  ({ style = { height: "250px" }, className }, ref) => {
    void ref;
    return <div className={className} style={style} />;
  },
);

ReactEChartsServer.displayName = "ReactEChartsServer";
