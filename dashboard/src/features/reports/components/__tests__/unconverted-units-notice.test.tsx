import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UnconvertedUnitsNotice } from "../unconverted-units-notice";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
  }),
}));

describe("UnconvertedUnitsNotice", () => {
  it("renders nothing when there are no residual units", () => {
    const { container } = render(
      <UnconvertedUnitsNotice currency="USD" units={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("discloses the residual units under the presentation currency", () => {
    render(<UnconvertedUnitsNotice currency="USD" units={["TRX", "BTC"]} />);

    expect(
      screen.getByText("reports.unconvertedUnits", { exact: false }),
    ).toHaveTextContent("TRX, BTC");
  });
});
