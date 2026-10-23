import { computeDomain } from "../line-chart-domain";

/** How much of the plot's height the series' move takes. */
const share = (values: number[]) => {
  const [bottom, top] = computeDomain(values);
  return (Math.max(...values) - Math.min(...values)) / (top - bottom);
};

// w21/751: the domain was the move itself, padded, so a move the header calls
// flat fell or rose the plot's full height.
describe("computeDomain", () => {
  it("draws a rounds-to-flat move flat", () => {
    // w21/237's −$12 on $2.5M, and +$0.01 on $15,000.
    expect(share([2500000, 2499988]) < 0.01).toBe(true);
    expect(share([15000, 15000.01]) < 0.01).toBe(true);
  });

  it("still fills the plot with a real move", () => {
    expect(computeDomain([251635, 640480])).toEqual([
      251635 - 38884.5,
      640480 + 38884.5,
    ]);
    // A tenth of a percent is a real move, padded a tenth either side.
    expect(share([100000, 100100])).toBeCloseTo(1 / 1.2, 6);
    expect(share([-76, 1347])).toBeCloseTo(1 / 1.2, 6);
  });

  it("keeps an unmoved series centred, as before", () => {
    expect(computeDomain([5, 5])).toEqual([4.5, 5.5]);
    expect(computeDomain([0, 0])).toEqual([-1, 1]);
  });
});
