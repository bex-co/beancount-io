import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthFeaturePanel } from "../index";

const deployment = vi.hoisted(() => ({ selfHost: false }));

vi.mock("@/common/hooks/use-deployment-info", () => ({
  useDeploymentInfo: () => deployment,
}));

// The column beside every sign-in, sign-up and consent form. The hosted
// service's claims about itself must not appear on a copy someone else runs.

describe("AuthFeaturePanel", () => {
  it("makes the hosted service's claims on the hosted service", () => {
    deployment.selfHost = false;
    render(<AuthFeaturePanel />);

    expect(screen.getByRole("complementary")).toBeInTheDocument();
    expect(screen.getByText(/enterprise-grade security/)).toBeInTheDocument();
    expect(screen.getByText(/Join thousands/)).toBeInTheDocument();
    expect(screen.queryByText("Self-hosted")).not.toBeInTheDocument();
  });

  it("says who runs a self-hosted copy instead, and none of the hosted claims", () => {
    deployment.selfHost = true;
    render(<AuthFeaturePanel />);

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      "Self-hosted",
      "Real-time Insights",
      "Plain-text books",
    ]);
    expect(screen.getByText(/run by its owner/)).toBeInTheDocument();
    expect(screen.getByText(/Git repository/)).toBeInTheDocument();
    expect(screen.queryByText(/enterprise-grade/)).not.toBeInTheDocument();
    expect(screen.queryByText(/thousands/)).not.toBeInTheDocument();
  });
});
