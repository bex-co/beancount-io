import { NetworkStatus } from "@apollo/client";
import { forgetDepth, initialDepthState, planDepth } from "../loaded-depth";

/**
 * w21/526: a foreground refresh or a write re-runs a paged list's first page,
 * which dropped 60 rows back to 20 and left a stale "Couldn't load more".
 */
const { ready, refetch, fetchMore, error } = NetworkStatus;
const input = (count: number, total: number, networkStatus: NetworkStatus) => ({
  listKey: "L",
  count,
  total,
  networkStatus,
});

describe("planDepth", () => {
  it("remembers paged depth and asks for the rows a refetch dropped", () => {
    let s = initialDepthState("L");
    s = planDepth(s, input(20, 100, ready)).state;
    s = planDepth(s, input(40, 100, ready)).state;
    s = planDepth(s, input(60, 100, ready)).state;
    s = planDepth(s, input(60, 100, refetch)).state;
    const back = planDepth(s, input(20, 100, ready));
    expect(back.reloaded).toBe(true);
    expect(back.restoreLimit).toBe(40);
  });

  it("restores nothing while the refetch is in flight or a page loads", () => {
    let s = initialDepthState("L");
    s = planDepth(s, input(60, 100, ready)).state;
    expect(planDepth(s, input(20, 100, refetch)).restoreLimit).toBe(null);
    expect(planDepth(s, input(20, 100, fetchMore)).restoreLimit).toBe(null);
  });

  it("does not repeat a restore that returned nothing", () => {
    let s = initialDepthState("L");
    s = planDepth(s, input(60, 100, ready)).state;
    const first = planDepth(s, input(20, 100, ready));
    expect(first.restoreLimit).toBe(40);
    expect(planDepth(first.state, input(20, 100, ready)).restoreLimit).toBe(
      null,
    );
  });

  it("clamps to the new total after a delete", () => {
    let s = initialDepthState("L");
    s = planDepth(s, input(60, 60, ready)).state;
    const back = planDepth(s, input(20, 59, ready));
    expect(back.restoreLimit).toBe(39);
  });

  it("caps one restore and continues as rows arrive", () => {
    let s = initialDepthState("L");
    s = planDepth(s, input(300, 400, ready)).state;
    const a = planDepth(s, input(20, 400, ready));
    expect(a.restoreLimit).toBe(100);
    expect(planDepth(a.state, input(120, 400, ready)).restoreLimit).toBe(100);
  });

  it("starts clean for another list", () => {
    let s = initialDepthState("L");
    s = planDepth(s, input(60, 100, ready)).state;
    const other = planDepth(s, { ...input(20, 100, ready), listKey: "M" });
    expect(other.restoreLimit).toBe(null);
  });

  it("a pull to refresh returns to the first page without restoring", () => {
    let s = initialDepthState("L");
    s = planDepth(s, input(60, 100, ready)).state;
    s = forgetDepth(s);
    s = planDepth(s, input(60, 100, refetch)).state;
    const back = planDepth(s, input(20, 100, ready));
    expect(back.reloaded).toBe(true);
    expect(back.restoreLimit).toBe(null);
    expect(planDepth(back.state, input(20, 100, ready)).restoreLimit).toBe(
      null,
    );
  });

  it("a failed pull to refresh stops forgetting", () => {
    let s = initialDepthState("L");
    s = planDepth(s, input(60, 100, ready)).state;
    s = forgetDepth(s);
    s = planDepth(s, input(60, 100, refetch)).state;
    s = planDepth(s, input(60, 100, error)).state;
    expect(s.forgetting).toBe(false);
  });

  it("reports a reload even when the list was only one page", () => {
    let s = initialDepthState("L");
    s = planDepth(s, input(20, 20, ready)).state;
    s = planDepth(s, input(20, 20, refetch)).state;
    expect(planDepth(s, input(20, 20, ready)).reloaded).toBe(true);
  });
});
